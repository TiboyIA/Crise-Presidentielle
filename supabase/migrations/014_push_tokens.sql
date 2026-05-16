-- P5: Push notifications
-- Adds push_token column to players for Expo push delivery.

alter table public.players
  add column if not exists push_token text;
