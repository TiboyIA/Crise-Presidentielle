-- Migration 001 — ranked mode schema
-- Run this in Supabase SQL editor or via: supabase db push

create extension if not exists "uuid-ossp";

-- ── players ──────────────────────────────────────────────────────────────────
create table public.players (
  id           uuid        primary key references auth.users(id) on delete cascade,
  display_name text        not null default '',
  created_at   timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "players: own row only"
  on public.players for all
  using (auth.uid() = id);

-- ── ranked_runs ───────────────────────────────────────────────────────────────
create type public.run_status as enum (
  'in_progress', 'submitted', 'validated', 'rejected'
);

create table public.ranked_runs (
  id            uuid            primary key default uuid_generate_v4(),
  player_id     uuid            not null references public.players(id) on delete cascade,
  seed          text            not null,
  country_id    text            not null,
  doctrine      text            not null,
  started_at    timestamptz     not null default now(),
  submitted_at  timestamptz,
  status        public.run_status not null default 'in_progress',
  score         integer,
  mandate_days  integer,
  reject_reason text
);

alter table public.ranked_runs enable row level security;

create policy "ranked_runs: own rows"
  on public.ranked_runs for all
  using (auth.uid() = player_id);

create index ranked_runs_player_idx on public.ranked_runs(player_id);
create index ranked_runs_status_idx on public.ranked_runs(status);

-- ── run_events ────────────────────────────────────────────────────────────────
create table public.run_events (
  id          uuid    primary key default uuid_generate_v4(),
  run_id      uuid    not null references public.ranked_runs(id) on delete cascade,
  seq         integer not null,
  event_type  text    not null,
  event_id    text    not null,
  choice_id   text,
  mandate_day integer not null,
  elapsed_ms  bigint  not null,
  unique (run_id, seq)
);

alter table public.run_events enable row level security;

create policy "run_events: via run ownership"
  on public.run_events for all
  using (
    exists (
      select 1 from public.ranked_runs r
      where r.id = run_id and r.player_id = auth.uid()
    )
  );

create index run_events_run_idx on public.run_events(run_id);

-- ── leaderboard_entries ───────────────────────────────────────────────────────
create table public.leaderboard_entries (
  id           uuid        primary key default uuid_generate_v4(),
  run_id       uuid        not null references public.ranked_runs(id),
  player_id    uuid        not null references public.players(id),
  display_name text        not null,
  country_id   text        not null,
  doctrine     text        not null,
  score        integer     not null,
  mandate_days integer     not null,
  created_at   timestamptz not null default now()
);

alter table public.leaderboard_entries enable row level security;

-- Public read
create policy "leaderboard: public read"
  on public.leaderboard_entries for select
  using (true);

-- Direct inserts from clients are blocked; edge functions use service_role which bypasses RLS
create policy "leaderboard: no direct write"
  on public.leaderboard_entries for insert
  with check (false);

create index leaderboard_score_idx on public.leaderboard_entries(score desc);
create index leaderboard_player_idx on public.leaderboard_entries(player_id);
