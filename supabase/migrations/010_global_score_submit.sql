-- Migration 010 — soumission de score légère (sans journal)
--
-- Permet d'insérer dans leaderboard_entries sans run_id (mode classement mondial light).
-- Ajoute global_power et rank_title pour enrichir l'affichage du classement.
-- Ajoute une contrainte unique (player_id, season) pour l'upsert côté Edge Function.

-- run_id devient nullable : les soumissions légères n'ont pas de ranked_run associé.
alter table public.leaderboard_entries
  alter column run_id drop not null;

-- Colonnes additionnelles pour le classement mondial léger.
alter table public.leaderboard_entries
  add column if not exists global_power integer not null default 0,
  add column if not exists rank_title   text    not null default '';

-- Contrainte unique : un seul score actif par joueur par saison (le meilleur).
-- Remplace l'upsert manuel dans ranked-submit.
alter table public.leaderboard_entries
  drop constraint if exists leaderboard_entries_player_season_unique;

alter table public.leaderboard_entries
  add constraint leaderboard_entries_player_season_unique
  unique (player_id, season);
