-- Migration 016: Chat global de saison

create table if not exists public.chat_messages (
  id           uuid        primary key default gen_random_uuid(),
  player_id    uuid        not null references public.players(id) on delete cascade,
  season       int         not null,
  content      text        not null check (char_length(content) between 1 and 200),
  created_at   timestamptz not null default now(),
  is_deleted   boolean     not null default false,
  reported_count int       not null default 0
);

create index if not exists chat_messages_season_idx
  on public.chat_messages(season, created_at desc)
  where not is_deleted;

create table if not exists public.chat_reports (
  message_id  uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references public.players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (message_id, reporter_id)
);

alter table public.chat_messages enable row level security;
alter table public.chat_reports  enable row level security;

-- Public read of non-deleted messages
create policy "chat_messages_select" on public.chat_messages
  for select using (not is_deleted);

-- No direct client writes — all mutations go through edge functions (service role)
