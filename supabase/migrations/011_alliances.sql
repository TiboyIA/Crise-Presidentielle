-- Migration 011 — alliances asynchrones (palier 2)

-- ── alliances ─────────────────────────────────────────────────────────────────
create table if not exists public.alliances (
  id            uuid        primary key default gen_random_uuid(),
  initiator_id  uuid        not null references public.players(id) on delete cascade,
  target_id     uuid        not null references public.players(id) on delete cascade,
  status        text        not null default 'pending'
                              check (status in ('pending', 'active', 'rejected', 'broken')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,
  constraint alliances_no_self check (initiator_id <> target_id),
  unique (initiator_id, target_id)
);

alter table public.alliances enable row level security;

-- Participants lisent leurs propres alliances; service_role écrit tout
create policy "alliances: participants read"
  on public.alliances for select
  using (auth.uid() = initiator_id or auth.uid() = target_id);

create index if not exists alliances_initiator_idx on public.alliances(initiator_id);
create index if not exists alliances_target_idx    on public.alliances(target_id);
create index if not exists alliances_status_idx    on public.alliances(status, expires_at);

-- ── alliance_actions ──────────────────────────────────────────────────────────
create table if not exists public.alliance_actions (
  id           uuid        primary key default gen_random_uuid(),
  alliance_id  uuid        not null references public.alliances(id) on delete cascade,
  actor_id     uuid        not null references public.players(id) on delete cascade,
  action_type  text        not null check (action_type in ('diplomacy_boost', 'intel_share')),
  created_at   timestamptz not null default now()
);

alter table public.alliance_actions enable row level security;

create policy "alliance_actions: participants read"
  on public.alliance_actions for select
  using (
    exists (
      select 1 from public.alliances a
      where a.id = alliance_id
        and (a.initiator_id = auth.uid() or a.target_id = auth.uid())
    )
  );

create index if not exists alliance_actions_alliance_idx on public.alliance_actions(alliance_id);
create index if not exists alliance_actions_actor_idx   on public.alliance_actions(actor_id, created_at desc);
