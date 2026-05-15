-- Migration 007 — player_entitlements : état courant des droits par joueur
--
-- La table purchases (migration 002) conserve l'historique complet des événements.
-- Cette table maintient l'état courant (is_active) pour chaque entitlement,
-- mise à jour par le webhook webhook-revenuecat à chaque événement RevenueCat.
-- L'app ne doit JAMAIS écrire dans cette table — uniquement service_role via webhook.

create table public.player_entitlements (
  player_id       uuid        not null references public.players(id) on delete cascade,
  entitlement_id  text        not null,
  is_active       boolean     not null default true,
  product_id      text        not null,
  activated_at    timestamptz not null default now(),
  expires_at      timestamptz,              -- null = achat définitif (non-renouvelable)
  updated_at      timestamptz not null default now(),
  primary key (player_id, entitlement_id)
);

alter table public.player_entitlements enable row level security;

-- Joueurs : lecture de leurs propres droits uniquement
create policy "player_entitlements: own read"
  on public.player_entitlements for select
  using (auth.uid() = player_id);

-- Aucune écriture directe côté client (service_role bypass RLS)
create policy "player_entitlements: no direct insert"
  on public.player_entitlements for insert
  with check (false);

create policy "player_entitlements: no direct update"
  on public.player_entitlements for update
  using (false);

create policy "player_entitlements: no direct delete"
  on public.player_entitlements for delete
  using (false);

create index player_entitlements_player_idx  on public.player_entitlements(player_id);
create index player_entitlements_active_idx  on public.player_entitlements(player_id, is_active);

comment on table public.player_entitlements is
  'État courant des droits RevenueCat par joueur. '
  'Mis à jour uniquement par le webhook webhook-revenuecat via service_role. '
  'Ne jamais écrire depuis le client. '
  'Source de vérité pour la fonction player-entitlements.';
