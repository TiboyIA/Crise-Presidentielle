-- Migration 002 — saves, purchases, devices, sanctions

-- ── devices ───────────────────────────────────────────────────────────────────
create table public.devices (
  id           uuid        primary key default uuid_generate_v4(),
  player_id    uuid        not null references public.players(id) on delete cascade,
  platform     text        not null,
  os_version   text,
  app_version  text,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);

alter table public.devices enable row level security;

create policy "devices: own rows"
  on public.devices for all
  using (auth.uid() = player_id);

create index devices_player_idx on public.devices(player_id);

-- Add device reference to ranked_runs
alter table public.ranked_runs
  add column device_id uuid references public.devices(id);

-- ── saves ─────────────────────────────────────────────────────────────────────
create table public.saves (
  player_id    uuid        primary key references public.players(id) on delete cascade,
  save_data    jsonb       not null,
  save_version integer     not null default 1,
  saved_at     timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "saves: own row"
  on public.saves for all
  using (auth.uid() = player_id);

-- ── purchases ─────────────────────────────────────────────────────────────────
create table public.purchases (
  id                  uuid        primary key default uuid_generate_v4(),
  player_id           uuid        references public.players(id),
  revenuecat_user_id  text        not null,
  product_id          text        not null,
  event_type          text        not null,
  entitlement_ids     text[]      not null default '{}',
  purchased_at        timestamptz not null,
  raw_event           jsonb       not null,
  created_at          timestamptz not null default now()
);

alter table public.purchases enable row level security;

-- Purchases are written only by server (service_role via webhook)
create policy "purchases: no direct client write"
  on public.purchases for insert
  with check (false);

-- Players can read their own purchases
create policy "purchases: own read"
  on public.purchases for select
  using (auth.uid() = player_id);

create index purchases_player_idx on public.purchases(player_id);
create index purchases_revenuecat_idx on public.purchases(revenuecat_user_id);

-- ── sanctions ─────────────────────────────────────────────────────────────────
create type public.sanction_severity as enum ('warn', 'flag', 'ban');

create table public.sanctions (
  id         uuid                     primary key default uuid_generate_v4(),
  player_id  uuid                     not null references public.players(id),
  run_id     uuid                     references public.ranked_runs(id),
  reason     text                     not null,
  severity   public.sanction_severity not null default 'warn',
  created_at timestamptz              not null default now()
);

alter table public.sanctions enable row level security;

-- Sanctions written only by server
create policy "sanctions: no direct write"
  on public.sanctions for insert
  with check (false);

-- Players can read their own sanctions
create policy "sanctions: own read"
  on public.sanctions for select
  using (auth.uid() = player_id);

create index sanctions_player_idx on public.sanctions(player_id);
