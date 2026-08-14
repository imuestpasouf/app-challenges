# Brief de build — App Challenges & Vie Partagée (V1 · PWA)

> Document destiné à Claude Code. Il consolide le cadrage, le modèle de données, les US et la spec visuelle.
> **À placer dans le repo avec** : `01-cadrage-v1.md`, `02-modele-donnees.md`, `03-user-stories.md`, `maquette-v3.html` (référence visuelle), `schema-supabase.sql`.

---

## 1. Objectif

Application mobile privée pour 2 utilisateurs (Nassim + Amâna), installable sur iPhone **en PWA** (sans compte développeur Apple), qu'ils remplissent au quotidien pendant ~3 mois. Suivi de challenges personnels configurables + modules de vie partagée (planning, courses, dépenses, chat).

**Contrainte d'architecture directrice :** l'app évoluera potentiellement vers du natif (React Native / Swift) en V2 pour débloquer HealthKit et l'Apple Watch. **Toute la logique métier doit donc être isolée de l'UI** pour être réutilisable lors de ce portage. Voir §4.

---

## 2. Stack technique

| Couche | Choix | Note |
|---|---|---|
| Langage | **TypeScript** | strict activé |
| Frontend | **React + Vite** | léger, build rapide, déploiement simple |
| PWA | **vite-plugin-pwa** | manifest + service worker + offline + install |
| Styling | **Tailwind CSS** avec tokens custom (voir §5) | reproduire fidèlement le look de `maquette-v3.html` |
| Data fetching | **@tanstack/react-query** | cache + invalidation |
| Backend | **Supabase** | Postgres + Auth + Realtime + Storage + Edge Functions |
| Client backend | **@supabase/supabase-js** | |
| Push | **Web Push (VAPID)** via service worker + Supabase Edge Function | subscriptions stockées en base |
| Hébergement | **Vercel** ou **Netlify** (gratuit) | build statique |
| Fonts | Archivo, Inter, Space Mono (Google Fonts) | |

---

## 3. Périmètre V1 & ordre de build recommandé

Construire dans cet ordre (chaque étape testable avant la suivante) :

1. **Setup** : projet Vite+React+TS, Tailwind avec tokens, structure de dossiers (§4), PWA de base (manifest + icônes + install), déploiement à blanc.
2. **Supabase + Auth** : exécuter `schema-supabase.sql`, brancher le client, écran de connexion (email/password), création des 2 comptes.
3. **Domain layer** : implémenter la logique pure (§6) avec tests unitaires (zone calorique, moyennes glissantes, éval milestones).
4. **Challenge générique** : création challenge → définition des champs → saisie quotidienne → détail/progression. (EPIC 1, US-010 à US-014)
5. **Écran Sport** (instance challenge "poids") : hero balance colorée + jauge de zones. C'est le cas d'usage principal de Nassim.
6. **Écran Historique** : mosaïque du mois + moyennes glissantes compactes + insight. (spec visuelle = `maquette-v3.html`)
7. **Accueil** : compteur d'objectifs du jour + alerte + liste des challenges.
8. **Notes & liens YouTube** (rattachés ou libres). (US-015)
9. **Modules partagés** : liste de courses (realtime) → planning → dépenses. (EPIC 2,3,4)
10. **Chat** temps réel. (EPIC 5)
11. **Notifications push** : subscription + Edge Function d'envoi + rappels de saisie. (EPIC 6)
12. **Milestones auto-validés** branchés sur la saisie. (US-013)

Détail fonctionnel et critères d'acceptation (Gherkin) : voir `03-user-stories.md`.

---

## 4. Architecture (clé pour la future migration native)

Séparation stricte en couches. **La couche `domain/` ne doit JAMAIS importer React, le DOM ou Supabase** — c'est du TypeScript pur, portable tel quel vers React Native ou via un bridge.

```
src/
  domain/                 # TS PUR — portable natif. AUCUNE dépendance UI/réseau.
    types.ts              # Challenge, Field, Entry, Milestone, Expense, etc.
    calories.ts           # zone(balance) -> couleur+label  (LA règle, voir §6)
    stats.ts              # moyennes glissantes 7j/30j/total, séries
    milestones.ts         # évaluation auto d'un milestone vs une entry
  api/                    # accès Supabase (isolé). Remplaçable sans toucher au domain.
    supabase.ts           # client
    challenges.ts, entries.ts, chat.ts, expenses.ts, ...
  features/               # UI par module (React aujourd'hui, à réécrire en natif plus tard)
    home/ sport/ history/ challenges/ chat/ planning/ shopping/ expenses/
  components/             # UI réutilisable (Card, Tile, Gauge, Mosaic, ...)
  lib/                    # design tokens, hooks génériques, push
  app/                    # routing, providers (react-query, auth)
```

Règle : quand la V2 native arrivera, on jette `features/` + `components/` (UI), on garde `domain/` (logique) et on réécrit `api/` seulement si le client change. Le backend Supabase, lui, ne bouge pas.

---

## 5. Design system (reproduire le look de `maquette-v3.html`)

Direction : **"carnet d'athlète"** — clair, coloré, avec des accents typographiques mono pour le côté technique. Le système de couleur calorique est l'élément signature.

### Tokens de couleur
```
/* Statut calorique (héros de l'app) */
green:  #12B76A   green-bg:  #E7F8F0
amber:  #F59E0B   amber-bg:  #FEF3DA
red:    #F0433A   red-bg:    #FDE6E4
black:  #1A1D2B   black-bg:  #E7E3F0

/* Marque / accents */
brand:  #5B6CFF   brand-2:   #8B5CF6   brand-bg: #EAECFF

/* Neutres */
bg:     #F4F6FB   card:      #FFFFFF
line:   #E6EAF2   line-2:    #EDF0F7
ink:    #141A2A   muted:     #6B7488   muted-2: #9AA2B4
empty:  #EAEEF6   (cases vides mosaïque)
```

### Typographie
- **Archivo** (700–900) : titres, gros chiffres. Chiffres en `tabular-nums`.
- **Inter** (400–700) : UI et corps.
- **Space Mono** : labels techniques, plages de dates, unités (le petit côté "log").

### Radii & ombres
- Cartes : 20–28px · tuiles : 14–15px · cases mosaïque : 8px
- `shadow-sm`: `0 6px 16px -8px rgba(41,54,104,.22)`
- `shadow`: `0 14px 34px -14px rgba(41,54,104,.28)`

### Éléments signature à reproduire
- **Compteur d'objectifs** (Accueil) : carte en dégradé `brand → brand-2`, anneau de progression blanc.
- **Hero balance** (Sport) : carte qui se **remplit de la couleur de la zone du jour**, gros chiffre blanc, chip VERT/JAUNE/ROUGE/NOIR.
- **Jauge de zones** (Sport) : barre segmentée aux 4 zones + marqueur positionné sur la balance du jour.
- **Mosaïque du mois** (Historique) : grille type "contributions" — colonnes = semaines, lignes = jours (L M M J V S D), chaque case dans sa couleur, aujourd'hui cerclé de `brand`.
- **Moyennes glissantes** (Historique) : 3 petites tuiles fines (7j / 30j / total), valeur colorée + liseré coloré en bas.
- **Insight perso** (Historique) : carte sombre (`#111726→#1E2740`) avec la meilleure série verte.

---

## 6. Logique métier critique (à implémenter en pur dans `domain/`)

### 6.1 Balance calorique
`balance = calories_ingérées − calories_brûlées` (kcal). Négatif = déficit.

### 6.2 Règle de couleur (VALIDÉE — c'est LA règle de l'app)
```ts
type Zone = 'green' | 'amber' | 'red' | 'black';
function zone(balance: number): { zone: Zone; label: string } {
  if (balance <= -1000) return { zone: 'green', label: 'Excellent déficit' };
  if (balance <=     0) return { zone: 'amber', label: 'Déficit modéré' };
  if (balance <=   500) return { zone: 'red',   label: 'Surplus' };
  return                        { zone: 'black', label: 'Gros surplus' };
}
```
Pas de plancher de déficit : plus le déficit est grand, plus c'est vert (choix assumé de l'utilisateur).

### 6.3 Moyennes glissantes (Historique)
- Semaine glissante = moyenne des balances des **7 derniers jours**.
- Mois glissant = moyenne des **30 derniers jours**.
- Total = moyenne depuis le **début du challenge** jusqu'à aujourd'hui.
- Méthode : **moyenner les balances (kcal) puis appliquer `zone()`** au résultat. (Pas de moyenne de catégories de couleur.)

### 6.4 Milestones auto-validés (US-013)
Un milestone surveille un `field_id` numérique, avec `target_value`, `comparison` (lte/gte/eq/lt/gt) et `target_date`.
- À chaque nouvelle entry sur ce champ : si la condition est satisfaite avant l'échéance → `status = valide`, `validated_at = now()`, notification de félicitations.
- Si l'échéance passe sans validation → `status = manque` (vérifié à l'ouverture de l'app, pas besoin de job serveur en V1).

---

## 7. Spécificités PWA

- **Manifest** : nom, icônes (192/512 + maskable), `display: standalone`, `theme_color`, `background_color`.
- **Service worker** (vite-plugin-pwa) : cache de l'app shell pour usage offline ; les données passent par Supabase (online).
- **Install iOS** : documenter le geste "Partager → Sur l'écran d'accueil" dans un petit onboarding (Safari iOS ne propose pas de prompt d'install automatique).
- **Persistance** : ne pas se reposer sur le localStorage seul pour les données (Safari iOS peut purger) — source de vérité = Supabase. localStorage/IndexedDB seulement pour cache et préférences.
- **Push (iOS 16.4+)** : ne fonctionne QUE si l'app est ajoutée à l'écran d'accueil. Flow : demande de permission → `PushManager.subscribe` avec clé VAPID publique → stocker la subscription dans `push_subscriptions` → envoi via Edge Function `web-push`.

---

## 8. Auth

- Supabase Auth, **email/password**, 2 comptes créés manuellement (Nassim, Amâna).
- Un trigger crée automatiquement le `profile` à l'inscription (inclus dans le SQL).
- Pas d'inscription publique ouverte (app privée) — désactiver les sign-ups publics dans les settings Supabase après création des 2 comptes, ou garder simple si acceptable.

---

## 9. Déploiement

1. Créer le projet Supabase, exécuter `schema-supabase.sql`, créer les 2 comptes.
2. Renseigner `.env` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
3. Générer les clés VAPID (pour le push) ; clé privée côté Edge Function seulement.
4. Déployer sur Vercel/Netlify (build Vite statique).
5. Ouvrir l'URL sur l'iPhone dans Safari → Ajouter à l'écran d'accueil.

---

## 10. Hors périmètre V1 (renvoyé en V2)

- Récupération auto Apple Santé (calories brûlées, sommeil) — natif + compte dev.
- App / complication Apple Watch native (mais raccourci Shortcuts→webhook possible dès la V1 si souhaité).
- Toute IA / suggestions automatiques.

---

## 11. Démarrage avec Claude Code

Suggestion de première commande : « Lis ce brief, `02-modele-donnees.md`, `03-user-stories.md` et `schema-supabase.sql`. Ouvre `maquette-v3.html` comme référence visuelle. Puis initialise le projet (étape 1 du §3) : Vite+React+TS, Tailwind avec les tokens du §5, structure de dossiers du §4, PWA de base, et propose-moi un premier écran de connexion. »
