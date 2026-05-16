import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DEBUFF_PCT = 20;

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

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();
    const season = currentSeason();

    const { data: pendingOps } = await service
      .from("cyber_ops")
      .select("id, attacker_id, target_id, magnitude")
      .eq("status", "pending")
      .lte("resolves_at", now)
      .or(`attacker_id.eq.${user.id},target_id.eq.${user.id}`);

    for (const op of (pendingOps ?? [])) {
      const { data: claimed } = await service
        .from("cyber_ops")
        .update({ status: "resolved" })
        .eq("id", op.id)
        .eq("status", "pending")
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const { data: targetPlayer } = await service
        .from("players")
        .select("pending_debuff, push_token")
        .eq("id", op.target_id)
        .single();

      const existing = (targetPlayer?.pending_debuff as { score_penalty_pct?: number } | null)
        ?.score_penalty_pct ?? 0;
      const newPct = Math.min(MAX_DEBUFF_PCT, existing + op.magnitude);

      await service
        .from("players")
        .update({ pending_debuff: { score_penalty_pct: newPct } })
        .eq("id", op.target_id);

      void sendPush(
        targetPlayer?.push_token,
        "Cyberattaque subie",
        `Votre infrastructure a été compromise. Malus −${op.magnitude}% appliqué à votre prochain score classé.`,
      );

      // Award PvP points to attacker
      void service.rpc("award_pvp_points", {
        p_player_id: op.attacker_id,
        p_season: season,
        p_points: 15,
        p_cyber: 1,
      });
    }

    const [{ data: sentOps }, { data: receivedOps }] = await Promise.all([
      service
        .from("cyber_ops")
        .select("id, attacker_id, target_id, status, magnitude, created_at, resolves_at")
        .eq("attacker_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
      service
        .from("cyber_ops")
        .select("id, attacker_id, target_id, status, magnitude, created_at, resolves_at")
        .eq("target_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const playerIds = new Set<string>();
    for (const op of [...(sentOps ?? []), ...(receivedOps ?? [])]) {
      playerIds.add(op.target_id);
      playerIds.add(op.attacker_id);
    }
    playerIds.delete(user.id);

    const nameMap: Record<string, string> = {};
    if (playerIds.size > 0) {
      const { data: players } = await service
        .from("players")
        .select("id, display_name")
        .in("id", Array.from(playerIds));
      for (const p of (players ?? [])) {
        nameMap[p.id] = p.display_name ?? "Anonyme";
      }
    }

    const sent = (sentOps ?? []).map((op) => ({
      ...op,
      target_name: nameMap[op.target_id] ?? "Anonyme",
    }));
    const received = (receivedOps ?? []).map((op) => ({
      ...op,
      attacker_name: nameMap[op.attacker_id] ?? "Anonyme",
    }));

    const { data: me } = await service
      .from("players")
      .select("pending_debuff")
      .eq("id", user.id)
      .single();
    const pendingDebuffPct =
      (me?.pending_debuff as { score_penalty_pct?: number } | null)?.score_penalty_pct ?? null;

    return new Response(
      JSON.stringify({ sent, received, pending_debuff_pct: pendingDebuffPct }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
