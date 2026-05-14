-- Migration 004 — auto-reconcile orphaned purchases when a player is created

create or replace function public.reconcile_purchases_on_player_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.purchases
  set player_id = new.id
  where revenuecat_user_id = new.id::text
    and player_id is null;
  return new;
end;
$$;

create trigger trg_reconcile_purchases
  after insert on public.players
  for each row execute function public.reconcile_purchases_on_player_insert();
