# Prompt Claude Code — Refonte visuelle V7 (Liquid Glass)

> Copie tout ce document dans Claude Code, avec `maquette-v7-voile-blanc.html` et `maquette-chat-v7.html` dans le repo.

---

## Mission

Refondre entièrement le visuel de l'app selon les deux maquettes de référence, **au pixel près** :
- `maquette-v7-voile-blanc.html` — Accueil, Sport, Historique, tab bar
- `maquette-chat-v7.html` — Chat

**Règle absolue :** ne pas réinterpréter, ne pas "améliorer", ne pas simplifier. Les valeurs ci-dessous sont exactes et doivent être reprises telles quelles. En cas de doute, ouvrir la maquette et copier la valeur.

Ce qui ne change pas : la logique métier (`src/domain/`), les règles de couleur calorique (seuils −1000 / 0 / +500), le modèle de données, les appels API. **C'est une refonte purement visuelle.**

---

## 1. Fond de l'application (obligatoire, à faire en premier)

Sans ce fond, tout l'effet de verre tombe à plat. C'est un composant `<AppBackground>` rendu **une seule fois**, en position fixed, `z-index: 0`, derrière tout le contenu.

Structure exacte :

```
Couche 1 (base)     : linear-gradient(165deg, #0B2530 0%, #0C1626 46%, #0A1020 100%)
Couche 2 (blobs)    : 5 ellipses floutées en dérive lente (voir tableau)
Couche 3 (voile)    : rgba(255,255,255,.70)   — LE voile blanc, ne pas modifier cette valeur
```

Le conteneur des blobs a `inset: -12%` et chaque blob : `position:absolute; border-radius:50%; filter:blur(58px); will-change:transform`.

| Blob | Taille | Position | Couleur | Opacité | Animation |
|---|---|---|---|---|---|
| b1 | 66% × 40% | left:-8%, top:-4% | `#1B4D5C` | .95 | `d1 22s ease-in-out infinite` |
| b2 | 58% × 34% | right:-8%, top:12% | `#2B3D6B` | .90 | `d2 26s` |
| b3 | 70% × 40% | right:-10%, top:46% | `#15414A` | .90 | `d3 24s` |
| b4 | 64% × 36% | left:-10%, bottom:-4% | `#243158` | .90 | `d4 28s` |
| b5 | 50% × 28% | left:24%, top:32% | `#1E5F63` | .70 | `d2 30s` |

```css
@keyframes d1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(10%,8%) scale(1.12)}}
@keyframes d2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-9%,10%) scale(1.1)}}
@keyframes d3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-11%,-7%) scale(1.14)}}
@keyframes d4{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(9%,-8%) scale(1.1)}}
```

---

## 2. Tokens (dans `src/index.css`, bloc `@theme` Tailwind v4)

```css
/* Statut calorique — versions mode clair */
--green:#1DA65A;  --amber:#D9930B;  --orange:#D9770B;  --red:#E03127;
/* zone "black" (gros surplus) en JS : #2B3440 */

/* Marque */
--brand:#4C5BD4;  --brand-2:#8B5CD6;
/* Accent Amâna (avatar chat) */
--her:#E0457B;    --her-2:#E07A45;

/* Texte */
--text:#0E1A22;
--text-2:rgba(20,40,52,.66);
--text-3:rgba(20,40,52,.44);

/* Remplissage du verre */
--fill:rgba(255,255,255,.34);
--fill-2:rgba(255,255,255,.46);
--fill-3:rgba(255,255,255,.60);

/* Flou */
--blur:saturate(170%) blur(22px);
--blur-hi:saturate(190%) blur(34px);

/* Ressort — utilisé par TOUTES les transitions d'interface */
--spring:cubic-bezier(.34,1.56,.64,1);

/* Ombre portée */
--drop:0 14px 34px -16px rgba(10,35,50,.42);
```

### Le rim light (élément signature — c'est ce qui "dessine" le verre)

Quatre `inset` qui simulent la tranche d'une pièce de verre : lumineux en haut, atténué en bas, moyen sur les flancs.

```css
--rim:
  inset 0 1px 0 rgba(255,255,255,.95),
  inset 0 -.8px 0 rgba(255,255,255,.35),
  inset .8px 0 0 rgba(255,255,255,.6),
  inset -.8px 0 0 rgba(255,255,255,.6),
  inset 0 0 0 .5px rgba(255,255,255,.45);

--rim-strong:
  inset 0 1.2px 0 rgba(255,255,255,1),
  inset 0 -1px 0 rgba(255,255,255,.45),
  inset 1px 0 0 rgba(255,255,255,.7),
  inset -1px 0 0 rgba(255,255,255,.7),
  inset 0 0 0 .5px rgba(255,255,255,.55);
```

`--rim-strong` est réservé aux éléments flottants : tab bar, pastille active, composer du chat, pastilles de réaction, sélecteur de réactions.

### Typographie

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
             system-ui, "Segoe UI", sans-serif;
```
Pas de Google Font. Sur iPhone, ça donne la vraie SF Pro. Tous les chiffres : `font-variant-numeric: tabular-nums`.

Titres de page (large title) : `33px / 700 / letter-spacing:-.035em / line-height:1.05`, précédés d'un sur-titre `13px / 600 / var(--text-2)`.

### Rayons

| Élément | Rayon |
|---|---|
| Cartes standard | 32px |
| Hero (Sport) | 40px |
| Compteur d'objectifs | 38px |
| Tab bar / composer | 35px / 34px |
| Bulles de chat | 26px (coin côté expéditeur : 9px) |
| Lignes internes de liste | 24–26px |
| Tuiles mosaïque | 10px |
| Icônes rondes, avatars, boutons | 50% |

---

## 3. Composant `<Glass>` (à créer, réutilisé partout)

```css
.glass{
  position:relative; overflow:hidden;
  background:var(--fill);
  -webkit-backdrop-filter:var(--blur); backdrop-filter:var(--blur);
  box-shadow:var(--rim), var(--drop);
  border-radius:32px;
  transition:transform .5s var(--spring), background .3s;
}
/* ::before — reflet spéculaire mobile (piloté par --sx/--sy, cf. §4) */
.glass::before{
  content:""; position:absolute; inset:-50%; pointer-events:none; z-index:0;
  background:radial-gradient(closest-side,
    rgba(255,255,255,.55), rgba(255,255,255,.14) 45%, transparent 72%);
  transform:translate(var(--sx,0px), var(--sy,0px));
  transition:transform .55s cubic-bezier(.2,.7,.3,1);
}
/* ::after — surbrillance de tranche en diagonale */
.glass::after{
  content:""; position:absolute; inset:0; pointer-events:none; z-index:1;
  border-radius:inherit;
  background:linear-gradient(140deg,
    rgba(255,255,255,.5) 0%, transparent 28%, transparent 74%, rgba(255,255,255,.2) 100%);
}
.glass > *{position:relative; z-index:2}
.glass.press{transform:scale(.968)}
```

⚠️ Ne pas utiliser `border` sur le verre — c'est le `box-shadow: inset` qui fait le contour. Un `border` casse l'effet.

---

## 4. Motion — spec exacte

### 4.1 Reflet spéculaire (gyroscope + souris)
Deux variables CSS globales `--sx` / `--sy` sur `:root`, consommées par tous les `.glass::before` et `.bubble::before`.

```js
function setLight(nx, ny) { // nx, ny normalisés dans [-1, 1]
  document.documentElement.style.setProperty('--sx', (nx * 95).toFixed(1) + 'px');
  document.documentElement.style.setProperty('--sy', (ny * 95).toFixed(1) + 'px');
}
```
- **Souris (desktop)** : position relative au conteneur → `(x/w)*2-1`, `(y/h)*2-1`.
- **Gyroscope (iPhone)** : `deviceorientation` → `gamma/45` et `(beta-45)/45`, clampés à [-1,1].
- iOS exige `DeviceOrientationEvent.requestPermission()` **sur un geste utilisateur** — l'attacher au premier tap (`{once:true}`), en try/catch silencieux.

### 4.2 Pastille de tab bar qui glisse
Une `.pill` absolue dans la tab bar, `top:9px; height:52px; border-radius:26px; background:rgba(255,255,255,.75)`, `box-shadow: var(--rim-strong), 0 4px 12px -4px rgba(10,35,50,.3)`.
Au changement d'onglet, on mesure le bouton cible et on applique `left` et `width` avec `transition: left .55s var(--spring), width .55s var(--spring)`.
Recalculer au `load`, après 60ms, et au `resize`.

### 4.3 Rebond au tap
`pointerdown` global — si la cible est dans un `.glass` (hors tab bar), ajouter `.press` puis la retirer après **190ms**.
Boutons circulaires : `:active{transform:scale(.88)}`. Onglets : `scale(.9)`. Bulles : `scale(.96)`.

### 4.4 Entrée de page
```css
@keyframes enter{
  from{opacity:0; transform:translateY(16px) scale(.97); filter:blur(6px)}
  to{opacity:1; transform:none; filter:none}
}
.page.on{animation:enter .55s var(--spring)}
```

### 4.5 Animations au montage
- **Anneau de progression** : `stroke-dasharray:239`, `stroke-dashoffset` de 239 → valeur cible, `1.6s var(--spring) .3s forwards`.
- **Barres** : `width` de 0 → cible, `1.1s var(--spring) .35s`.
- **Marqueur de jauge** : `left` animé après 280ms, `transition: left 1.2s var(--spring)`.
- **Tuiles de mosaïque** : chacune `opacity:0; transform:scale(.5)` → `pop .5s var(--spring) forwards`, avec `animation-delay = index * 11ms` (effet cascade).

### 4.6 Chat
- **Nouveau message** : `pop .5s var(--spring)` (`from{opacity:0; translateY(14px) scale(.94)}`).
- **Bouton envoyer** : `scale(0)/opacity 0` → `scale(1)` dès qu'il y a du texte, `transition: transform .45s var(--spring), opacity .3s`.
- **Réaction posée** : `rpop .45s var(--spring)` (`from{scale(.3) translateY(6px)}`).
- **Sélecteur de réactions** : `pick .45s var(--spring)`, apparaît 52px au-dessus de la bulle.
- **Bandeau emoji** : `max-height 0 → 64px`, `.45s var(--spring)`.
- **Indicateur de frappe** : 3 points, `bnc 1.3s infinite`, délais 0 / .18s / .36s.
- **Accusé de lecture** : "Envoyé" (`--text-3`) → "Vu HH:MM" (`--brand`) après 1500ms.

### 4.7 Accessibilité
```css
@media (prefers-reduced-motion:reduce){ *{animation:none!important; transition:none!important} }
```

---

## 5. Chat — spécificités visuelles

- **Bulle reçue** : `background: var(--fill-2)`, `box-shadow: var(--rim), var(--drop)`, texte `var(--text)`, rayon `26px 26px 26px 9px`.
- **Bulle envoyée** : `linear-gradient(135deg, rgba(76,91,212,.82), rgba(139,92,214,.72))`, texte blanc, `box-shadow: var(--rim), 0 12px 28px -12px rgba(76,91,212,.6)`, rayon `26px 26px 9px 26px`.
- Les deux ont `backdrop-filter: var(--blur)` et le même `::before`/`::after` que `.glass` (le fond doit transparaître même dans la bulle teintée).
- **Header et composer flottent** : marges latérales de 14px, jamais collés aux bords, `--rim-strong`.
- **Avatar Amâna** : dégradé `--her → --her-2`, pastille verte de présence bordée de blanc.
- **Photos** : 212×152, `object-fit:cover`, rayon 21px, dans une bulle à `padding:6px`.

---

## 6. Ordre de travail

1. `<AppBackground>` (§1) + tokens (§2) — vérifier que le fond s'affiche partout.
2. Composant `<Glass>` (§3) + hook du reflet `--sx/--sy` (§4.1).
3. Tab bar avec pastille glissante (§4.2).
4. Écran par écran : Accueil → Sport → Historique → Chat, en comparant à la maquette ouverte à côté.
5. Animations de montage (§4.5) et micro-interactions (§4.3).
6. `prefers-reduced-motion` (§4.7).

## 7. Performance

`backdrop-filter` coûte cher. Ne pas empiler plus de ~10 surfaces de verre simultanément à l'écran ; sur les listes longues (fil de chat, historique), n'appliquer le flou qu'aux éléments visibles si des ralentissements apparaissent sur iPhone. `will-change:transform` uniquement sur les blobs et les éléments réellement animés.

## 8. Vérification finale

Ouvrir la maquette et l'app côte à côte et confirmer : voile blanc identique, contour lumineux visible sur chaque bloc, rayons identiques, le reflet suit la souris/le gyroscope, la pastille glisse avec rebond, la mosaïque apparaît en cascade, les bulles entrent avec ressort.
