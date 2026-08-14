# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A private PWA for 2 users (Nassim + Amâna) to track personal challenges (e.g. weight/calorie tracking) and shared-life modules (planning, shopping list, expenses, chat), used daily for ~3 months. Full functional spec, data model, and visual reference live in `brief-build-claude-code.md` — read it before doing any non-trivial feature work; it is the source of truth for business rules, not this file.

**Directing constraint:** the app may be ported to native (React Native/Swift) in V2 to unlock HealthKit/Apple Watch. This is why `src/domain/` is kept strictly pure (see Architecture below) — that layer is expected to survive the port unchanged.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # tsc -b (project references) then vite build
npm run lint      # eslint .
npm run preview   # preview a production build
```

There is no test runner configured yet (no test script in package.json, no test files present), despite the build brief calling for unit tests on the domain layer (calorie zones, rolling averages, milestone evaluation). If you add tests, set up the runner first and wire a `test` script.

## Architecture

Strict layering, enforced by convention (not by tooling/lint rules):

```
src/
  domain/     # pure TypeScript — NO React, NO DOM, NO Supabase imports. Portable to native as-is.
  api/        # Supabase access, isolated. Swappable without touching domain/.
  features/   # UI per module (React today, rewritten for native in V2).
  components/ # reusable UI (Card, Tile, Gauge, Mosaic, ...).
  lib/        # design tokens, generic hooks, push.
  app/        # routing, providers (react-query, auth).
```

The rule that matters: `domain/` must never import from React, the DOM, or `@supabase/supabase-js`. When native V2 happens, `features/` and `components/` get thrown away and rewritten; `domain/` is kept as-is; `api/` is rewritten only if the backend client changes.

### Domain layer — the business logic that matters

- `domain/calories.ts` — `zone(balance)`: maps a calorie balance (kcal ingested − kcal burned) to one of 4 zones (`green`/`amber`/`red`/`black`). This is the signature rule of the app (brief §6.2) — **do not "improve" the thresholds** without checking the brief; there's deliberately no floor on the deficit (bigger deficit = greener, by design).
- `domain/stats.ts` — rolling averages for the History screen: 7-day, 30-day, and since-challenge-start. Averages are computed on raw kcal balances first, then `zone()` is applied to the resulting number — never average the zone/color categories themselves.
- `domain/milestones.ts` — auto-validates a milestone (`field_id` + `target_value` + `comparison` + `target_date`) against new entries. No server-side job in V1: overdue milestones are flagged `manque` on app open, not via a cron.
- `domain/types.ts` — canonical types (`Challenge`, `ChallengeField`, `ChallengeEntry`, `ChallengeMilestone`, `Expense`, etc.), mirroring the Supabase schema in `schema-supabase.sql`.

### Backend

Supabase (Postgres + Auth + Realtime + Storage + Edge Functions). Schema lives in `schema-supabase.sql` — apply it directly in the Supabase SQL editor; there's no migration tool. Table names are snake_case (`challenge_entries`, `challenge_milestones`, `push_subscriptions`, ...) while `domain/types.ts` uses camelCase — mapping happens in `api/`.

Auth is email/password only, 2 manually-created accounts, no public sign-up. `src/api/supabase.ts` throws at import time if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing from `.env` (see `.env.example`).

### Design system

Tailwind v4 tokens are defined in `src/index.css` under `@theme` (colors, fonts, radii, shadows) — not in a `tailwind.config.js`. The 4 zone colors (`green`/`amber`/`red`/`black`, each with a `-bg` variant) plus `brand`/`brand-2` are the palette to reuse everywhere; don't introduce ad-hoc colors. Fonts: Archivo (headings/big numbers, `tabular-nums`), Inter (UI/body), Space Mono (technical labels/units). Visual reference for exact layouts (hero balance, zone gauge, month mosaic, rolling-average tiles) is `maquette-v3.html` if present in the repo, and is otherwise described in brief §5.

### PWA specifics

Configured via `vite-plugin-pwa` in `vite.config.ts` (manifest + service worker, `devOptions.enabled: true` for testing offline/install in dev). Supabase is the source of truth for data — don't rely on localStorage/IndexedDB beyond caching and preferences, since Safari iOS can purge storage. Web Push only works once the app is added to the iOS home screen (iOS 16.4+).
