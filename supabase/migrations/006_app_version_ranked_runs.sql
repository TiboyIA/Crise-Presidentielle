-- Migration 006 — add app_version to ranked_runs for version tracking and blocklist enforcement
alter table public.ranked_runs
  add column app_version text;
