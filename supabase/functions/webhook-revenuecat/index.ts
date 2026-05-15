import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set via: supabase secrets set REVENUECAT_WEBHOOK_SECRET=xxx
const WEBHOOK_SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";

// Events that activate/renew an entitlement
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "TRANSFER",
]);

// Events that deactivate an entitlement
const REVOKE_EVENTS = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
]);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method-not-allowed" }), { status: 405 });
  }

  // Verify bearer token sent by RevenueCat
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid-json" }), { status: 400 });
  }

  const event = body.event as Record<string, unknown> | undefined;
  if (!event) {
    return new Response(JSON.stringify({ error: "missing-event" }), { status: 400 });
  }

  const eventType      = event.type as string | undefined;
  const rcUserId       = event.app_user_id as string | undefined;
  const productId      = event.product_id as string | undefined;
  const entitlementIds = (event.entitlement_ids as string[] | undefined) ?? [];
  const purchasedAt    = event.purchased_at_ms
    ? new Date(event.purchased_at_ms as number).toISOString()
    : new Date().toISOString();
  const expiresAt      = event.expiration_at_ms
    ? new Date(event.expiration_at_ms as number).toISOString()
    : null;

  if (!rcUserId || !productId || !eventType) {
    return new Response(JSON.stringify({ error: "missing-fields" }), { status: 400 });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Convention: the app sets RevenueCat appUserID = Supabase auth.uid()
  const { data: player } = await svc
    .from("players")
    .select("id")
    .eq("id", rcUserId)
    .maybeSingle();

  // 1. Log the raw event in purchases (full audit trail)
  await svc.from("purchases").insert({
    player_id:          player?.id ?? null,
    revenuecat_user_id: rcUserId,
    product_id:         productId,
    event_type:         eventType,
    entitlement_ids:    entitlementIds,
    purchased_at:       purchasedAt,
    raw_event:          event,
  });

  // 2. Maintain current entitlement state in player_entitlements
  // Only possible when the player_id is known (RC user ID matched a player row).
  if (player?.id && entitlementIds.length > 0) {
    const now = new Date().toISOString();

    if (GRANT_EVENTS.has(eventType)) {
      for (const entitlementId of entitlementIds) {
        await svc.from("player_entitlements").upsert(
          {
            player_id:      player.id,
            entitlement_id: entitlementId,
            is_active:      true,
            product_id:     productId,
            activated_at:   purchasedAt,
            expires_at:     expiresAt,
            updated_at:     now,
          },
          { onConflict: "player_id,entitlement_id" },
        );
      }
    } else if (REVOKE_EVENTS.has(eventType)) {
      for (const entitlementId of entitlementIds) {
        await svc.from("player_entitlements").upsert(
          {
            player_id:      player.id,
            entitlement_id: entitlementId,
            is_active:      false,
            product_id:     productId,
            expires_at:     expiresAt ?? now,
            updated_at:     now,
          },
          { onConflict: "player_id,entitlement_id" },
        );
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
