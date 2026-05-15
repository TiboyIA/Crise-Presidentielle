-- Migration 008 — devices: install_id + integrity_status
--                run_events: server_received_at (anti-cheat)
--                saves: slot_index (multi-slot)

-- ── devices: install_id ───────────────────────────────────────────────────────
-- UUID généré au premier lancement côté app, avant toute authentification.
-- Permet d'identifier un appareil indépendamment du compte.
alter table public.devices
  add column if not exists install_id text;

-- Remplir les lignes existantes avec un UUID temporaire (ne pas laisser NULL)
update public.devices
  set install_id = gen_random_uuid()::text
  where install_id is null;

alter table public.devices
  alter column install_id set not null;

create unique index if not exists devices_install_id_idx
  on public.devices(install_id);

-- ── devices: integrity_status ─────────────────────────────────────────────────
-- Résultat PlayIntegrity (Android) ou DeviceCheck/AppAttest (iOS).
-- Valeurs : 'unknown' | 'valid' | 'invalid' | 'rooted'
alter table public.devices
  add column if not exists integrity_status text not null default 'unknown'
    check (integrity_status in ('unknown', 'valid', 'invalid', 'rooted'));

-- ── devices: push_token ───────────────────────────────────────────────────────
alter table public.devices
  add column if not exists push_token text;

-- ── run_events: server_received_at ───────────────────────────────────────────
-- Horodatage serveur à la réception de l'événement.
-- Comparer avec elapsed_ms / mandate_day côté client pour détecter
-- les manipulations d'horloge et les replays.
alter table public.run_events
  add column if not exists server_received_at timestamptz not null default now();

-- ── saves: slot_index ────────────────────────────────────────────────────────
-- La table saves utilise player_id comme PK → une seule save par joueur.
-- On restructure pour supporter plusieurs slots.

-- 1. Supprimer l'ancienne contrainte PK
alter table public.saves
  drop constraint if exists saves_pkey;

-- 2. Ajouter un vrai id si absent
alter table public.saves
  add column if not exists id uuid not null default gen_random_uuid();

-- 3. Ajouter slot_index
alter table public.saves
  add column if not exists slot_index smallint not null default 0;

-- 4. Nouvelle PK sur id
alter table public.saves
  add primary key (id);

-- 5. Contrainte unique (player_id, slot_index)
alter table public.saves
  add constraint saves_player_slot_unique unique (player_id, slot_index);

create index if not exists saves_player_idx on public.saves(player_id);
