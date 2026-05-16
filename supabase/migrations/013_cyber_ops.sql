-- P4: Cyberattaques différées
-- Adds pending_debuff to players and creates cyber_ops table.

alter table public.players
  add column if not exists pending_debuff jsonb;

create table if not exists public.cyber_ops (
  id           uuid        primary key default gen_random_uuid(),
  attacker_id  uuid        not null references public.players(id) on delete cascade,
  target_id    uuid        not null references public.players(id) on delete cascade,
  status       text        not null default 'pending'
                           check (status in ('pending', 'resolved', 'blocked')),
  magnitude    int         not null check (magnitude between 2 and 5),
  created_at   timestamptz not null default now(),
  resolves_at  timestamptz not null,
  constraint cyber_ops_no_self check (attacker_id <> target_id)
);

create index if not exists cyber_ops_attacker_idx on public.cyber_ops(attacker_id, created_at desc);
create index if not exists cyber_ops_target_idx   on public.cyber_ops(target_id,   created_at desc);
create index if not exists cyber_ops_pending_idx  on public.cyber_ops(status, resolves_at) where status = 'pending';

alter table public.cyber_ops enable row level security;

create policy "attacker reads own sent"
  on public.cyber_ops for select
  using (attacker_id = auth.uid());

create policy "target reads own received"
  on public.cyber_ops for select
  using (target_id = auth.uid());
