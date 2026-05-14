-- Migration 005 — data retention policy via pg_cron
--
-- run_events  : supprimés 90 jours après la clôture du run (validé ou rejeté)
-- purchases   : conservés 730 jours (2 ans, conformité comptable)
--
-- Nécessite pg_cron (activé par défaut sur Supabase Pro+).
-- Sur le plan Free : activer manuellement dans Dashboard > Extensions.

create extension if not exists pg_cron with schema extensions;

-- ── Fonctions de nettoyage ────────────────────────────────────────────────────

create or replace function public.cleanup_old_run_events()
returns void
language sql
security definer
as $$
  delete from public.run_events
  where run_id in (
    select id
    from public.ranked_runs
    where status in ('validated', 'rejected')
      and submitted_at < now() - interval '90 days'
  );
$$;

create or replace function public.cleanup_old_purchases()
returns void
language sql
security definer
as $$
  delete from public.purchases
  where created_at < now() - interval '730 days';
$$;

-- ── Jobs planifiés — 03h00 UTC chaque nuit ───────────────────────────────────

select cron.schedule(
  'cleanup-run-events',
  '0 3 * * *',
  'select public.cleanup_old_run_events()'
);

select cron.schedule(
  'cleanup-purchases',
  '0 3 * * *',
  'select public.cleanup_old_purchases()'
);
