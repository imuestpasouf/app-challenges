# Chat — logique & delta Supabase

Complément au brief. Le chat est un module **partagé** (2 utilisateurs, temps réel). Ce qu'on avait dans `schema-supabase.sql` (`chat_messages` avec `read_at`) couvre le texte + les accusés de lecture ; il faut ajouter les **photos** et les **réactions**.

---

## 1. Temps réel

Une seule conversation (le couple). Abonnement Supabase Realtime :

- S'abonner aux `INSERT`/`UPDATE`/`DELETE` sur `chat_messages` (déjà dans la publication realtime).
- À la réception d'un `INSERT` → ajouter la bulle. `UPDATE` → mettre à jour (ex: `read_at`). 
- S'abonner aussi à `message_reactions` (ajouté ci-dessous) pour voir les réactions arriver en direct.

Côté `api/chat.ts` : `sendMessage`, `subscribeMessages`, `markRead`, `setReaction`, `uploadPhoto`. La couche `domain/` n'intervient pas ici (pas de règle métier : le chat est du CRUD temps réel).

---

## 2. Accusés de lecture (déjà possible)

`chat_messages.read_at` suffit pour 2 personnes :

- Quand j'ouvre le chat → `update chat_messages set read_at = now() where sender_id <> moi and read_at is null`.
- Affichage : sous **mon dernier message qui a un `read_at`**, afficher `Vu HH:MM` (heure = `read_at`). Avant lecture : `Envoyé`.
- Comme c'est un couple (2 users), pas besoin d'une table de statuts par destinataire.

---

## 3. Photos

- **Stockage** : bucket Supabase Storage `chat-photos` (privé). On stocke le **chemin** du fichier dans `chat_messages.image_path`, pas l'image en base.
- **Envoi** : upload du fichier dans le bucket → récupérer le path → insérer un message avec `image_path` (et `content` = légende optionnelle).
- **Affichage** : générer une URL signée (bucket privé) pour afficher l'image.
- Un message peut être **photo seule** (sans texte) — il faut donc rendre `content` nullable (voir SQL).

---

## 4. Réactions emoji

- Nouvelle table `message_reactions` : **une réaction par utilisateur et par message** (comme Messenger/WhatsApp). Re-cliquer remplace, re-cliquer le même = retire.
- Affichage : petite pastille sur la bulle. → 2 users maximum, au plus 2 réactions par message.

---

## 5. Delta SQL à exécuter dans Supabase

```sql
-- ========== CHAT V1 : photos + réactions ==========

-- 5.1 Messages : autoriser photo seule + pièce jointe image
alter table public.chat_messages alter column content drop not null;
alter table public.chat_messages add column image_path text;
alter table public.chat_messages
  add constraint chat_content_or_image check (content is not null or image_path is not null);

-- 5.2 Réactions (1 par utilisateur par message)
create table public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);
create index on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;
create policy "reactions_select" on public.message_reactions
  for select using (auth.uid() is not null);
create policy "reactions_self_all" on public.message_reactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.message_reactions;

-- 5.3 Storage : bucket privé pour les photos du chat
insert into storage.buckets (id, name, public)
  values ('chat-photos', 'chat-photos', false)
  on conflict (id) do nothing;

create policy "chat_photos_read" on storage.objects
  for select using (bucket_id = 'chat-photos' and auth.uid() is not null);
create policy "chat_photos_write" on storage.objects
  for insert with check (bucket_id = 'chat-photos' and auth.uid() is not null);
```

---

## 6. Ajouts `domain/types.ts`

```ts
export interface ChatMessage {
  id: string;
  senderId: string;
  content: string | null;      // null si photo seule
  imagePath: string | null;    // chemin dans le bucket chat-photos
  createdAt: string;
  readAt: string | null;       // -> "Vu HH:MM"
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}
```

Rappel : `api/` fait le mapping snake_case (base) → camelCase (types).

---

## 7. Périmètre chat V1 (rappel des choix)

- ✅ Texte, photos, réactions emoji
- ✅ Accusés de lecture (`Vu HH:MM`)
- ❌ Pas de messages système (ex: "X a validé un palier") — reporté
- ❌ Pas de vocal, pas d'appel, pas de fils/threads
