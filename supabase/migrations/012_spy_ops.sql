-- Migration 012 — opérations d'espionnage entre joueurs (palier 3)

create table if not exists public.spy_ops (
  id           uuid        primary key default gen_random_uuid(),
  attacker_id  uuid        not null references public.players(id) on delete cascade,
  target_id    uuid        not null references public.players(id) on delete cascade,
  op_type      text        not null check (op_type in ('intel_probe', 'doctrine_scan', 'score_range')),
  status       text        not null default 'pending'
                             check (status in ('pending', 'resolved', 'blocked')),
  created_at   timestamptz not null default now(),
  resolves_at  timestamptz not null,
  result_json  jsonb,
  constraint spy_ops_no_self check (attacker_id <> target_id)
);

alter table public.spy_ops enable row level security;

-- Seul l'attaquant peut lire ses propres opérations
create policy "spy_ops: attacker read"
  on public.spy_ops for select
  using (auth.uid() = attacker_id);

create index if not exists spy_ops_attacker_idx on public.spy_ops(attacker_id, created_at desc);
create index if not exists spy_ops_target_idx   on public.spy_ops(target_id);
create index if not exists spy_ops_pending_idx  on public.spy_ops(status, resolves_at)
  where status = 'pending';
