-- Migration 017 — RLS security fixes
--
-- Gaps addressed:
--   1. chat_reports : enable SELECT for reporters (own reports only)
--   2. alliances    : explicit INSERT/UPDATE/DELETE block for direct client writes
--   3. alliance_actions : explicit INSERT/UPDATE/DELETE block for direct client writes
--
-- All writes to these tables must go through Edge Functions (service_role).
-- Direct client writes are blocked by the absence of permissive policies,
-- but we add explicit RESTRICTIVE policies to make the intent clear and
-- survive future RLS flag changes.

-- ── 1. chat_reports — reporters can read their own reports ────────────────────

create policy "reporters_read_own"
  on chat_reports
  for select
  using (auth.uid() = reporter_id);

-- ── 2. alliances — no direct client INSERT/UPDATE/DELETE ──────────────────────
-- Edge Functions use service_role which bypasses RLS.
-- These restrictive policies ensure no anon/authenticated client can write.

create policy "no_direct_insert"
  on alliances
  as restrictive
  for insert
  with check (false);

create policy "no_direct_update"
  on alliances
  as restrictive
  for update
  using (false);

create policy "no_direct_delete"
  on alliances
  as restrictive
  for delete
  using (false);

-- ── 3. alliance_actions — no direct client INSERT/UPDATE/DELETE ───────────────

create policy "no_direct_insert"
  on alliance_actions
  as restrictive
  for insert
  with check (false);

create policy "no_direct_update"
  on alliance_actions
  as restrictive
  for update
  using (false);

create policy "no_direct_delete"
  on alliance_actions
  as restrictive
  for delete
  using (false);
