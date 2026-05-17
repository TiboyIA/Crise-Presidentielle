import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function currentSeason(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      return new Response(JSON.stringify({ error: "self-attack" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require 1 validated run
    const { count: validatedCount } = await service
      .from("ranked_runs")
      .select("*", { count: "exact", head: true })
      .eq("player_id", user.id)
      .eq("status", "validated");
    if ((validatedCount ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "no-validated-run" }), { status: 403, headers: CORS });
    }

    // Target exists
    const { data: target } = await service
      .from("players")
      .select("id, created_at")
      .eq("id", targetPlayerId)
      .maybeSingle();
    if (!target) {
      return new Response(JSON.stringify({ error: "target-not-found" }), { status: 404, headers: CORS });
    }

    // Target account age >= 14 days
    const targetAgeDays = (Date.now() - new Date(target.created_at).getTime()) / 86400000;
    if (targetAgeDays < 14) {
      return new Response(JSON.stringify({ error: "target-protected-new" }), { status: 403, headers: CORS });
    }

    const season = currentSeason();

    // Target must have a leaderboard entry this season with score >= 5000
    const { data: targetEntry } = await service
      .from("leaderboard_entries")
      .select("score")
      .eq("player_id", targetPlayerId)
      .eq("season", season)
      .maybeSingle();
    if (!targetEntry || targetEntry.score < 5000) {
      return new Response(JSON.stringify({ error: "target-no-score" }), { status: 403, headers: CORS });
    }

    // Proportionality: attacker must have a score this season
    const { data: attackerEntry } = await service
      .from("leaderboard_entries")
      .select("score")
      .eq("player_id", user.id)
      .eq("season", season)
      .maybeSingle();
    if (!attackerEntry) {
      return new Response(JSON.stringify({ error: "no-validated-run" }), { status: 403, headers: CORS });
    }
    // Target cannot be less than 30% of attacker score (no punching way down)
    if (targetEntry.score < attackerEntry.score * 0.3) {
      return new Response(JSON.stringify({ error: "proportionality-exceeded" }), { status: 403, headers: CORS });
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Attacker quota: max 1 cyber op per 24h
    const { count: attackerCount } = await service
      .from("cyber_ops")
      .select("*", { count: "exact", head: true })
      .eq("attacker_id", user.id)
      .gte("created_at", since24h);
    if ((attackerCount ?? 0) >= 1) {
      return new Response(JSON.stringify({ error: "quota-exceeded" }), { status: 429, headers: CORS });
    }

    // Target received quota: max 2 cyber ops per 24h
    const { count: targetCount } = await service
      .from("cyber_ops")
      .select("*", { count: "exact", head: true })
      .eq("target_id", targetPlayerId)
      .gte("created_at", since24h);
    if ((targetCount ?? 0) >= 2) {
      return new Response(JSON.stringify({ error: "target-protected-quota" }), { status: 429, headers: CORS });
    }

    const magnitude = 2 + Math.floor(Math.random() * 4); // 2–5
    const resolvesAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await service.from("cyber_ops").insert({
      attacker_id: user.id,
      target_id: targetPlayerId,
      status: "pending",
      magnitude,
      resolves_at: resolvesAt,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
    }

    return new Response(
      JSON.stringify({ ok: true, resolvesAt }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
  }
});
