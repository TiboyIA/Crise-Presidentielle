-- Migration 008 — devices: install_id + integrity_status
--                run_events: server_received_at (anti-cheat)
--                saves: slot_index (multi-slot)

-- ── devices: install_id ───────────────────────────────────────────────────────
alter table public.devices
  add column if not exists install_id text;

update public.devices
  set install_id = gen_random_uuid()::text
  where install_id is null;

alter table public.devices
  alter column install_id set not null;

create unique index if not exists devices_install_id_idx
  on public.devices(install_id);

-- ── devices: integrity_status ─────────────────────────────────────────────────
alter table public.devices
  add column if not exists integrity_status text not null default 'unknown'
    check (integrity_status in ('unknown', 'valid', 'invalid', 'rooted'));

-- ── devices: push_token ───────────────────────────────────────────────────────
alter table public.devices
  add column if not exists push_token text;

-- ── run_events: server_received_at ───────────────────────────────────────────
alter table public.run_events
  add column if not exists server_received_at timestamptz not null default now();

-- ── saves: slot_index ────────────────────────────────────────────────────────

alter table public.saves
  drop constraint if exists saves_pkey;

alter table public.saves
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.saves
  add column if not exists slot_index smallint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saves_pkey2'
      or (conname = 'saves_id_pkey')
  ) then
    begin
      alter table public.saves add primary key (id);
    exception when others then null;
    end;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saves_player_slot_unique'
  ) then
    alter table public.saves
      add constraint saves_player_slot_unique unique (player_id, slot_index);
  end if;
end $$;

create index if not exists saves_player_idx on public.saves(player_id);
