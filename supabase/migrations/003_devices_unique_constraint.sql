-- Migration 003 — devices: enforce one record per player+platform

alter table public.devices
  add constraint devices_player_platform_unique unique (player_id, platform);
