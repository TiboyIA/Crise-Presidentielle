import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ACTIVE_ALLIANCES = 3;
const MAX_DAILY_INVITES    = 10;
const INVITE_TTL_MS        = 7 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sendPush(token: string | null | undefined, title: string, body: string): Promise<void> {
  if (!token?.startsWith("ExponentPushToken[")) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ to: token, title, body, sound: "default" }),
  }).catch(() => {});
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
    }

    const { targetPlayerId } = await req.json() as { targetPlayerId?: string };

    if (!targetPlayerId || !UUID_RE.test(targetPlayerId)) {
      return new Response(JSON.stringify({ error: "invalid-target" }), { status: 400, headers: CORS });
    }
    if (targetPlayerId === user.id) {
      return new Response(JSON.stringify({ error: "cannot-invite-self" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Must have at least 1 validated run (anti-throwaway)
    const { count: validRuns } = await service
      .from("ranked_runs")
      .select("*", { count: "exact", head: true })
      .eq("player_id", user.id)
      .eq("status", "validated");
    if ((validRuns ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "no-validated-run" }), { status: 403, headers: CORS });
    }

    // Daily invite quota: max 10 invitations per 24h regardless of outcome
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyInvites } = await service
      .from("alliances")
      .select("*", { count: "exact", head: true })
      .eq("initiator_id", user.id)
      .gte("created_at", since24h);
    if ((dailyInvites ?? 0) >= MAX_DAILY_INVITES) {
      return new Response(JSON.stringify({ error: "quota-exceeded" }), { status: 429, headers: CORS });
    }

    // Target must exist; fetch push_token in same query
    const { data: target } = await service
      .from("players").select("id, push_token").eq("id", targetPlayerId).maybeSingle();
    if (!target) {
      return new Response(JSON.stringify({ error: "target-not-found" }), { status: 404, headers: CORS });
    }

    // Check existing alliance in either direction
    const { data: existing } = await service
      .from("alliances")
      .select("id, status, expires_at")
      .or(`and(initiator_id.eq.${user.id},target_id.eq.${targetPlayerId}),and(initiator_id.eq.${targetPlayerId},target_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending" || existing.status === "active") {
        return new Response(
          JSON.stringify({ error: "alliance-already-exists", status: existing.status }),
          { status: 409, headers: CORS },
        );
      }
      if (existing.status === "broken") {
        const cooldownEnd = existing.expires_at ? new Date(existing.expires_at) : null;
        if (cooldownEnd && cooldownEnd > new Date()) {
          return new Response(JSON.stringify({ error: "cooldown-active" }), { status: 429, headers: CORS });
        }
      }
      // rejected or broken with elapsed cooldown — delete old record
      await service.from("alliances").delete().eq("id", existing.id);
    }

    // Max 3 active alliances (count both directions)
    const { count: asInitiator } = await service
      .from("alliances").select("*", { count: "exact", head: true })
      .eq("initiator_id", user.id).eq("status", "active");
    const { count: asTarget } = await service
      .from("alliances").select("*", { count: "exact", head: true })
      .eq("target_id", user.id).eq("status", "active");
    if (((asInitiator ?? 0) + (asTarget ?? 0)) >= MAX_ACTIVE_ALLIANCES) {
      return new Response(JSON.stringify({ error: "max-alliances-reached" }), { status: 429, headers: CORS });
    }

    // Fetch initiator display name for notification
    const { data: initiator } = await service
      .from("players").select("display_name").eq("id", user.id).single();
    const initiatorName = initiator?.display_name ?? "Un joueur";

    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const { data: alliance, error: insertError } = await service
      .from("alliances")
      .insert({ initiator_id: user.id, target_id: targetPlayerId, status: "pending", expires_at: expiresAt })
      .select("id").single();

    if (insertError || !alliance) {
      return new Response(
        JSON.stringify({ error: "server-error" }),
        { status: 500, headers: CORS },
      );
    }

    // Fire-and-forget push notification to target
    void sendPush(target.push_token, "Alliance diplomatique", `${initiatorName} vous propose une alliance.`);

    return new Response(
      JSON.stringify({ ok: true, allianceId: alliance.id }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
  }
});
