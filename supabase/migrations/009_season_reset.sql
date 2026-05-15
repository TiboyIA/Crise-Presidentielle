-- Migration 009 — reset saisonnier du classement
--
-- Stratégie :
--   - La colonne `season` sur leaderboard_entries contient YYYYMM (ex: 202605).
--   - Chaque entrée est déjà scopée à une saison via ranked-submit.
--   - Un job pg_cron tourne le 1er de chaque mois à 00:05 UTC pour archiver
--     le top 100 de la saison précédente dans leaderboard_archives, puis
--     supprimer les entrées de la saison précédente du classement actif.
--   - Le classement reste lisible par saison via ?season=YYYYMM sur l'edge function.

-- ── Colonne season sur leaderboard_entries ───────────────────────────────────
-- Format YYYYMM (ex: 202605). Rempli par ranked-submit à chaque soumission.
alter table public.leaderboard_entries
  add column if not exists season int not null default 0;

-- Backfill des entrées existantes avec la saison courante
update public.leaderboard_entries
  set season = extract(year from created_at)::int * 100
             + extract(month from created_at)::int
  where season = 0;

-- ── Index pour les requêtes par saison ───────────────────────────────────────
create index if not exists leaderboard_season_score_idx
  on public.leaderboard_entries(season, score desc);

create index if not exists leaderboard_season_country_idx
  on public.leaderboard_entries(season, country_id, score desc);

-- ── Table d'archives ──────────────────────────────────────────────────────────
create table if not exists public.leaderboard_archives (
  id           uuid        primary key default gen_random_uuid(),
  archived_at  timestamptz not null default now(),
  season       int         not null,
  rank         int         not null,
  player_id    uuid        references public.players(id) on delete set null,
  display_name text        not null,
  country_id   text        not null,
  doctrine     text        not null,
  score        int         not null,
  mandate_days int         not null
);

alter table public.leaderboard_archives enable row level security;

create policy "leaderboard_archives: public read"
  on public.leaderboard_archives for select
  using (true);

create policy "leaderboard_archives: no direct write"
  on public.leaderboard_archives for insert
  with check (false);

create index if not exists leaderboard_archives_season_idx
  on public.leaderboard_archives(season, rank);

-- ── Fonction de reset ─────────────────────────────────────────────────────────
create or replace function public.reset_leaderboard_season()
returns void
language plpgsql
security definer
as $$
declare
  prev_season int;
begin
  -- Saison précédente en YYYYMM
  prev_season := extract(year from (now() - interval '1 month'))::int * 100
               + extract(month from (now() - interval '1 month'))::int;

  -- Archiver le top 100 de la saison précédente
  insert into public.leaderboard_archives
    (season, rank, player_id, display_name, country_id, doctrine, score, mandate_days)
  select
    season,
    row_number() over (order by score desc) as rank,
    player_id,
    display_name,
    country_id,
    doctrine,
    score,
    mandate_days
  from public.leaderboard_entries
  where season = prev_season
  order by score desc
  limit 100;

  -- Supprimer les entrées archivées du classement actif
  delete from public.leaderboard_entries
  where season = prev_season;
end;
$$;

-- ── Job pg_cron : 1er du mois à 00:05 UTC ────────────────────────────────────
select cron.schedule(
  'season-reset',
  '5 0 1 * *',
  'select public.reset_leaderboard_season()'
);
