# Notifications push — spec & implémentation (PWA iOS)

Complément au brief. L'app est installée sur l'écran d'accueil — le push iOS est possible (iOS 16.4+). Ce document couvre tout : pré-requis, delta SQL, clés VAPID, service worker, flux de permission, Edge Functions d'envoi, et les rappels programmés.

---

## 0. Rappels des contraintes iOS (à ne pas oublier)

- Push PWA **uniquement iOS 16.4+**, et **uniquement** si l'app est ajoutée à l'écran d'accueil (pas dans l'onglet Safari).
- La demande de permission **doit** être déclenchée par un geste utilisateur (clic sur un bouton), jamais au chargement.
- La souscription peut être invalidée (réinstall, purge Safari) — prévoir la **re-souscription** et le **nettoyage** des subscriptions mortes (410/404 à l'envoi → suppression en base).
- Web Push standard (VAPID). Pas besoin de compte Apple ni d'APNs directement : Safari route via Web Push.

---

## 1. Deux natures de notifications

| Type | Exemple | Déclencheur | Coût |
|---|---|---|---|
| **Événementielle** | Nouveau message d'Amâna, planning/courses modifiés, palier validé | Un événement dans l'app | Simple (Edge Function appelée à l'événement) |
| **Programmée** | "Tu n'as pas saisi tes calories" à 20h | Planificateur | + infra (pg_cron) |

Ordre conseillé : d'abord l'événementiel (chat surtout), puis les rappels programmés.

---

## 2. Delta SQL

La table `push_subscriptions` existe déjà (`user_id`, `endpoint` unique, `subscription` jsonb). On ajoute juste une table de préférences pour piloter quoi notifier et l'heure des rappels.

```sql
-- ========== NOTIFICATIONS ==========

-- Préférences de notification par utilisateur
create table public.notification_prefs (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  chat              boolean not null default true,   -- nouveaux messages
  shared_updates    boolean not null default true,   -- planning / courses / dépenses
  milestones        boolean not null default true,   -- paliers validés
  daily_reminder    boolean not null default true,   -- rappel de saisie
  reminder_time     time    not null default '20:00',-- heure du rappel
  updated_at        timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;
create policy "notif_prefs_self" on public.notification_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Création auto des prefs à l'inscription (complète le trigger handle_new_user)
-- Option simple : upsert des prefs au premier login côté app.
```

> Si tu veux créer les prefs automatiquement, ajoute dans la fonction `handle_new_user()` un `insert into public.notification_prefs(user_id) values (new.id);`. Sinon l'app fait un upsert au premier lancement.

---

## 3. Clés VAPID

Générées **une fois**. La **publique** va dans le front (`.env`, `VITE_VAPID_PUBLIC_KEY`), la **privée** reste **uniquement** côté Edge Function (secret Supabase, jamais dans le repo front).

```bash
npx web-push generate-vapid-keys
# -> Public Key  : (VITE_VAPID_PUBLIC_KEY, front)
# -> Private Key : (secret Edge Function)
```

Stocker côté Supabase :
```bash
supabase secrets set VAPID_PUBLIC_KEY=xxxx VAPID_PRIVATE_KEY=yyyy VAPID_SUBJECT="mailto:ton@email.com"
```

---

## 4. Service worker (réception du push)

Le service worker de la PWA (via `vite-plugin-pwa`) doit gérer les événements `push` et `notificationclick`. Avec `vite-plugin-pwa`, utiliser une stratégie **injectManifest** pour avoir un SW custom, ou ajouter ces handlers au SW généré.

```js
// dans le service worker
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const { title = 'Défis', body = '', url = '/', tag } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,                     // regroupe/écrase les notifs du même type
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c);
      return client ? client.focus() : self.clients.openWindow(url);
    })
  );
});
```

---

## 5. Flux de permission & souscription (front)

Un bouton **"Activer les notifications"** dans les réglages (ou un onboarding après install). Jamais au chargement.

```ts
// lib/push.ts (front)
export async function enablePush(supabase, userId, vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push non supporté sur cet appareil/navigateur');
  }
  const perm = await Notification.requestPermission();      // DOIT venir d'un clic
  if (perm !== 'granted') throw new Error('Permission refusée');

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = sub.toJSON();
  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    subscription: json,
  }, { onConflict: 'endpoint' });
}

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
```

---

## 6. Edge Function d'envoi (événementiel)

Une fonction générique `send-push` qui envoie à un utilisateur donné, en respectant ses préférences et en nettoyant les subscriptions mortes.

```ts
// supabase/functions/send-push/index.ts  (Deno)
import webpush from 'npm:web-push';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

// createClient avec la SERVICE ROLE key (côté serveur uniquement)
// payload attendu: { toUserId, kind, title, body, url }
Deno.serve(async (req) => {
  const { toUserId, kind, title, body, url } = await req.json();

  // 1) vérifier la préférence pour ce type
  const { data: prefs } = await supabase
    .from('notification_prefs').select('*').eq('user_id', toUserId).single();
  const allowed = { chat:'chat', shared:'shared_updates', milestone:'milestones', reminder:'daily_reminder' }[kind];
  if (prefs && allowed && prefs[allowed] === false) return new Response('skipped');

  // 2) récupérer les subscriptions de l'utilisateur
  const { data: subs } = await supabase
    .from('push_subscriptions').select('*').eq('user_id', toUserId);

  // 3) envoyer, nettoyer les mortes
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify({ title, body, url, tag: kind }));
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
  }));

  return new Response('ok');
});
```

**Où l'appeler** (côté serveur, jamais confier au client le choix du destinataire sans contrôle) :
- **Chat** : le plus fiable est un **trigger DB** `after insert on chat_messages` → appelle `send-push` pour l'autre utilisateur (via `pg_net`/webhook). Alternative plus simple à démarrer : appel depuis l'app juste après l'envoi du message (moins robuste si l'app est fermée, mais OK pour commencer).
- **Planning / courses / dépenses** : idem, sur `insert`/`update`, `kind='shared'`.
- **Palier validé** : dans la logique de validation du milestone, `kind='milestone'` vers soi-même (ou vers les deux pour se motiver).

---

## 7. Rappels programmés (fast-follow)

Rappel quotidien de saisie via **pg_cron** + Edge Function.

```sql
-- activer pg_cron (Supabase: Database -> Extensions -> pg_cron)
-- exécuter toutes les 15 min : la fonction filtrera selon reminder_time et l'absence de saisie du jour
select cron.schedule(
  'daily-entry-reminder',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://<projet>.functions.supabase.co/daily-reminder',
       headers := '{"Authorization":"Bearer <ANON_or_SERVICE>","Content-Type":"application/json"}'::jsonb
     ); $$
);
```

La fonction `daily-reminder` (Edge) : pour chaque utilisateur dont `daily_reminder = true` et `reminder_time` correspond au créneau courant (à son fuseau), qui a un challenge actif **sans entrée aujourd'hui**, appeler l'envoi avec `kind='reminder'`.

> Détail fuseau horaire : stocker/gérer l'heure en Europe/Paris pour la V1 (les 2 users y sont). Généraliser plus tard si besoin.

---

## 8. Ordre d'implémentation

1. Delta SQL §2 (prefs).
2. Générer VAPID, poser les secrets, `VITE_VAPID_PUBLIC_KEY` dans `.env`.
3. Service worker §4 (handlers push + click).
4. `lib/push.ts` + bouton "Activer les notifications" dans les réglages §5. **Tester la souscription sur l'iPhone installé.**
5. Edge Function `send-push` §6 + branchement **chat** d'abord (le plus utile).
6. Étendre aux updates partagées + paliers.
7. Rappels programmés §7.

---

## 9. Test sur ton iPhone

- Ouvre l'app **depuis l'icône de l'écran d'accueil** (pas Safari).
- Réglages → "Activer les notifications" → accepte la permission iOS.
- Depuis le compte d'Amâna (autre appareil ou navigateur), envoie un message → tu dois recevoir le push.
- Si rien : vérifier iOS ≥ 16.4, app bien lancée depuis l'icône, permission accordée (Réglages iOS → l'app → Notifications), et regarder les logs de l'Edge Function.

---

## 10. Prompt Claude Code

```
On branche les notifications push (voir notifications-push.md). L'app est déjà
installée sur mon écran d'accueil (iOS).

1. Applique le delta SQL §2 (table notification_prefs) — guide-moi, je le colle
   dans le SQL editor Supabase.
2. Aide-moi à générer les clés VAPID et à poser les secrets Supabase ; ajoute
   VITE_VAPID_PUBLIC_KEY à .env (et .env.example).
3. Passe le service worker en injectManifest (vite-plugin-pwa) et ajoute les
   handlers push + notificationclick (§4).
4. Crée lib/push.ts (souscription + upsert dans push_subscriptions) et un bouton
   "Activer les notifications" dans un écran Réglages (§5).
5. Crée l'Edge Function send-push (§6) et branche-la sur le chat en premier
   (nouveau message -> push à l'autre). Nettoie les subscriptions mortes (410/404).
6. On testera ensemble entre mes 2 comptes avant d'étendre aux updates partagées
   et aux paliers. Les rappels programmés (pg_cron) viendront après.
```

---

## Hors périmètre (pour l'instant)
- Rich notifications (images, actions custom) — basique d'abord.
- Fuseaux multiples — Europe/Paris only en V1.
- Regroupement avancé / centre de notifs in-app.
