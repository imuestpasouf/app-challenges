-- ============================================================
-- Schéma Supabase — App Challenges & Vie Partagée (V1 · PWA)
-- À exécuter dans : Supabase → SQL Editor → New query → Run
-- ============================================================
-- Convention : "perso" = visible par son propriétaire uniquement.
--              "partagé" = visible/éditable par les 2 utilisateurs authentifiés.
--              (Ouvrir le perso au partenaire = changer les policies §RLS.)
-- ============================================================

-- ---------- ENUMS ----------
create type challenge_status as enum ('actif','termine','abandonne');
create type field_type       as enum ('number','text','boolean','duration');
create type milestone_status as enum ('en_attente','valide','manque');
create type comparison_op    as enum ('lte','gte','eq','lt','gt');

-- ---------- PROFILS (liés à auth.users) ----------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Création auto du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PERSO — système de challenge générique
-- ============================================================

create table public.challenges (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) >= 3),
  category   text not null,
  start_date date not null,
  end_date   date not null,
  status     challenge_status not null default 'actif',
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);
create index on public.challenges(owner_id);

create table public.challenge_fields (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  label         text not null,
  field_type    field_type not null default 'number',
  unit          text,
  is_required   boolean not null default true,
  display_order int not null default 0
);
create index on public.challenge_fields(challenge_id);

create table public.challenge_entries (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  field_id     uuid not null references public.challenge_fields(id) on delete cascade,
  entry_date   date not null,
  value        text,
  created_at   timestamptz not null default now(),
  unique (field_id, entry_date)          -- 1 valeur / champ / jour (upsert)
);
create index on public.challenge_entries(challenge_id, entry_date);

create table public.challenge_milestones (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  field_id     uuid not null references public.challenge_fields(id) on delete cascade,
  title        text not null,
  target_date  date not null,
  target_value numeric not null,
  comparison   comparison_op not null,
  status       milestone_status not null default 'en_attente',
  validated_at timestamptz
);
create index on public.challenge_milestones(challenge_id);

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete cascade,  -- null = note libre
  content      text,
  youtube_url  text,
  created_at   timestamptz not null default now()
);
create index on public.notes(owner_id);

-- ============================================================
-- PARTAGÉ — planning, courses, dépenses, chat
-- ============================================================

create table public.planning_events (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title      text not null,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  note       text,
  created_at timestamptz not null default now()
);

create table public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  checked    boolean not null default false,
  added_by   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  qty        text,
  checked_at timestamptz,
  checked_by uuid references public.profiles(id) on delete set null
);

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  amount       numeric(10,2) not null,
  category     text not null,
  paid_by      uuid references public.profiles(id) on delete set null,
  note         text,
  expense_date date not null default current_date,
  created_at   timestamptz not null default now(),
  label        text
);

-- ---------- COURSES & INVENTAIRE ----------
create table public.monthly_budgets (
  id          uuid primary key default gen_random_uuid(),
  year_month  text not null unique,            -- format 'YYYY-MM'
  amount      numeric(10,2) not null,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.inventory_items (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  icon        text,                             -- emoji
  quantity    numeric(10,2) not null default 0,
  unit        text,                             -- 'kg', 'paquets', 'L'...
  min_qty     numeric(10,2) not null default 1, -- seuil "stock bas"
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index on public.chat_messages(created_at);

-- ---------- PUSH (Web Push) ----------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REALTIME (modules temps réel)
-- ============================================================
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.planning_events;
alter publication supabase_realtime add table public.monthly_budgets;
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.expenses;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles             enable row level security;
alter table public.challenges           enable row level security;
alter table public.challenge_fields     enable row level security;
alter table public.challenge_entries    enable row level security;
alter table public.challenge_milestones enable row level security;
alter table public.notes                enable row level security;
alter table public.planning_events      enable row level security;
alter table public.shopping_items       enable row level security;
alter table public.expenses             enable row level security;
alter table public.monthly_budgets      enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.chat_messages        enable row level security;
alter table public.push_subscriptions   enable row level security;

-- ---- PROFILS : lisibles par les authentifiés, modifiables par soi ----
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- ---- PERSO : owner uniquement ----
create policy "challenges_owner_all" on public.challenges
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "fields_via_challenge" on public.challenge_fields
  for all
  using     (exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = auth.uid()));

create policy "entries_via_challenge" on public.challenge_entries
  for all
  using     (exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = auth.uid()));

create policy "milestones_via_challenge" on public.challenge_milestones
  for all
  using     (exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = auth.uid()));

create policy "notes_owner_all" on public.notes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---- PARTAGÉ : tous les authentifiés ----
create policy "planning_shared_all" on public.planning_events
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "shopping_shared_all" on public.shopping_items
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "expenses_shared_all" on public.expenses
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "budgets_shared" on public.monthly_budgets
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "inventory_shared" on public.inventory_items
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Chat : lecture pour les 2, insertion en tant que soi, update (read_at) pour les 2
create policy "chat_select" on public.chat_messages
  for select using (auth.uid() is not null);
create policy "chat_insert_self" on public.chat_messages
  for insert with check (sender_id = auth.uid());
create policy "chat_update" on public.chat_messages
  for update using (auth.uid() is not null);

-- ---- PUSH : soi uniquement ----
create policy "push_self_all" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- FIN — après exécution :
--  1) Authentication → Users → créer les 2 comptes (Nassim, Amâna)
--     (ou via l'app). Renseigner "name" dans user_metadata si possible.
--  2) (Optionnel) désactiver les inscriptions publiques.
--  3) Récupérer URL + anon key pour le .env de l'app.
-- ============================================================
