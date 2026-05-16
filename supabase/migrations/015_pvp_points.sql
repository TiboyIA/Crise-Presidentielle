-- P6: Saisons PvP
-- Table pvp_stats + fonction atomique d'attribution de points.

create table if not exists public.pvp_stats (
  player_id         uuid not null references public.players(id) on delete cascade,
  season            int  not null,
  pvp_points        int  not null default 0,
  spy_ops_success   int  not null default 0,
  cyber_ops_success int  not null default 0,
  alliances_formed  int  not null default 0,
  primary key (player_id, season)
);

alter table public.pvp_stats enable row level security;

create policy "pvp_stats: public read"
  on public.pvp_stats for select
  using (true);

create index if not exists pvp_stats_season_points_idx
  on public.pvp_stats(season, pvp_points desc);

-- Upsert atomique — évite les races conditions sur les incréments
create or replace function public.award_pvp_points(
  p_player_id       uuid,
  p_season          int,
  p_points          int,
  p_spy             int default 0,
  p_cyber           int default 0,
  p_alliances       int default 0
) returns void language plpgsql security definer as $$
begin
  insert into public.pvp_stats
    (player_id, season, pvp_points, spy_ops_success, cyber_ops_success, alliances_formed)
  values
    (p_player_id, p_season, p_points, p_spy, p_cyber, p_alliances)
  on conflict (player_id, season) do update
    set pvp_points        = pvp_stats.pvp_points        + excluded.pvp_points,
        spy_ops_success   = pvp_stats.spy_ops_success   + excluded.spy_ops_success,
        cyber_ops_success = pvp_stats.cyber_ops_success + excluded.cyber_ops_success,
        alliances_formed  = pvp_stats.alliances_formed  + excluded.alliances_formed;
end;
$$;
