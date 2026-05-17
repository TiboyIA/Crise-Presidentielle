import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ACTIVE_ALLIANCES = 3;
const ALLIANCE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const BREAK_COOLDOWN_MS    = 48 * 60 * 60 * 1000;

function currentSeason(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
}

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

    const { allianceId, action } = await req.json() as { allianceId?: string; action?: string };

    if (!allianceId || !action) {
      return new Response(JSON.stringify({ error: "missing-fields" }), { status: 400, headers: CORS });
    }
    if (!["accept", "reject", "break"].includes(action)) {
      return new Response(JSON.stringify({ error: "invalid-action" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: alliance } = await service
      .from("alliances")
      .select("id, initiator_id, target_id, status")
      .eq("id", allianceId)
      .maybeSingle();

    if (!alliance) {
      return new Response(JSON.stringify({ error: "not-found" }), { status: 404, headers: CORS });
    }

    const isInitiator = alliance.initiator_id === user.id;
    const isTarget    = alliance.target_id === user.id;
    if (!isInitiator && !isTarget) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: CORS });
    }

    if (action === "accept") {
      if (!isTarget) {
        return new Response(JSON.stringify({ error: "only-target-can-accept" }), { status: 403, headers: CORS });
      }
      if (alliance.status !== "pending") {
        return new Response(JSON.stringify({ error: "not-pending" }), { status: 409, headers: CORS });
      }
      const { count: asIni } = await service.from("alliances").select("*", { count: "exact", head: true })
        .eq("initiator_id", user.id).eq("status", "active");
      const { count: asTgt } = await service.from("alliances").select("*", { count: "exact", head: true })
        .eq("target_id", user.id).eq("status", "active");
      if (((asIni ?? 0) + (asTgt ?? 0)) >= MAX_ACTIVE_ALLIANCES) {
        return new Response(JSON.stringify({ error: "max-alliances-reached" }), { status: 429, headers: CORS });
      }
      const expiresAt = new Date(Date.now() + ALLIANCE_DURATION_MS).toISOString();
      await service.from("alliances").update({ status: "active", expires_at: expiresAt }).eq("id", allianceId);

      const season = currentSeason();
      const [{ data: accepter }, { data: initiatorPlayer }] = await Promise.all([
        service.from("players").select("display_name").eq("id", user.id).single(),
        service.from("players").select("push_token").eq("id", alliance.initiator_id).single(),
      ]);
      const accepterName = accepter?.display_name ?? "Un joueur";
      void sendPush(initiatorPlayer?.push_token, "Alliance acceptée", `${accepterName} a accepté votre invitation.`);

      // Award PvP points to both parties
      await Promise.all([
        service.rpc("award_pvp_points", {
          p_player_id: user.id,
          p_season: season,
          p_points: 10,
          p_alliances: 1,
        }),
        service.rpc("award_pvp_points", {
          p_player_id: alliance.initiator_id,
          p_season: season,
          p_points: 10,
          p_alliances: 1,
        }),
      ]);

      return new Response(
        JSON.stringify({ ok: true, status: "active" }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    if (action === "reject") {
      if (!isTarget) {
        return new Response(JSON.stringify({ error: "only-target-can-reject" }), { status: 403, headers: CORS });
      }
      if (alliance.status !== "pending") {
        return new Response(JSON.stringify({ error: "not-pending" }), { status: 409, headers: CORS });
      }
      await service.from("alliances").update({ status: "rejected" }).eq("id", allianceId);
      return new Response(
        JSON.stringify({ ok: true, status: "rejected" }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    if (alliance.status !== "active") {
      return new Response(JSON.stringify({ error: "not-active" }), { status: 409, headers: CORS });
    }
    const cooldownEnd = new Date(Date.now() + BREAK_COOLDOWN_MS).toISOString();
    await service.from("alliances").update({ status: "broken", expires_at: cooldownEnd }).eq("id", allianceId);
    return new Response(
      JSON.stringify({ ok: true, status: "broken" }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
  }
});
