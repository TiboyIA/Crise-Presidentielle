import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESOLVE_DELAY_MS  = 6 * 60 * 60 * 1000;   // 6h
const MAX_OPS_PER_DAY   = 2;
const TARGET_COOLDOWN_MS = 24 * 60 * 60 * 1000;  // 24h same target
const NEW_ACCOUNT_DAYS  = 7;

const VALID_OP_TYPES = new Set(["intel_probe", "doctrine_scan", "score_range"]);

function currentSeason(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
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

    const { targetPlayerId, opType } = await req.json() as {
      targetPlayerId?: string;
      opType?: string;
    };

    if (!targetPlayerId || !opType) {
      return new Response(JSON.stringify({ error: "missing-fields" }), { status: 400, headers: CORS });
    }
    if (!VALID_OP_TYPES.has(opType)) {
      return new Response(JSON.stringify({ error: "invalid-op-type" }), { status: 400, headers: CORS });
    }
    if (targetPlayerId === user.id) {
      return new Response(JSON.stringify({ error: "cannot-spy-self" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Must have at least 1 validated run
    const { count: validRuns } = await service
      .from("ranked_runs")
      .select("*", { count: "exact", head: true })
      .eq("player_id", user.id)
      .eq("status", "validated");
    if ((validRuns ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "no-validated-run" }), { status: 403, headers: CORS });
    }

    // Target must exist and not be a new account
    const { data: target } = await service
      .from("players")
      .select("id, display_name, created_at")
      .eq("id", targetPlayerId)
      .maybeSingle();
    if (!target) {
      return new Response(JSON.stringify({ error: "target-not-found" }), { status: 404, headers: CORS });
    }

    const accountAgeMs = Date.now() - new Date(target.created_at).getTime();
    if (accountAgeMs < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000) {
      return new Response(JSON.stringify({ error: "target-protected-new" }), { status: 403, headers: CORS });
    }

    // Target must have a leaderboard entry this season
    const { data: targetEntry } = await service
      .from("leaderboard_entries")
      .select("id, score")
      .eq("player_id", targetPlayerId)
      .eq("season", currentSeason())
      .maybeSingle();
    if (!targetEntry) {
      return new Response(JSON.stringify({ error: "target-no-score" }), { status: 403, headers: CORS });
    }

    // Max 2 ops per 24h (attacker quota)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentOps } = await service
      .from("spy_ops")
      .select("*", { count: "exact", head: true })
      .eq("attacker_id", user.id)
      .gte("created_at", since24h);
    if ((recentOps ?? 0) >= MAX_OPS_PER_DAY) {
      return new Response(JSON.stringify({ error: "quota-exceeded" }), { status: 429, headers: CORS });
    }

    // Same target cooldown 24h
    const { data: recentOnTarget } = await service
      .from("spy_ops")
      .select("id")
      .eq("attacker_id", user.id)
      .eq("target_id", targetPlayerId)
      .gte("created_at", since24h)
      .maybeSingle();
    if (recentOnTarget) {
      return new Response(JSON.stringify({ error: "target-cooldown" }), { status: 429, headers: CORS });
    }

    const resolvesAt = new Date(Date.now() + RESOLVE_DELAY_MS).toISOString();
    const { data: op, error: insertError } = await service
      .from("spy_ops")
      .insert({
        attacker_id: user.id,
        target_id: targetPlayerId,
        op_type: opType,
        status: "pending",
        resolves_at: resolvesAt,
        result_json: { target_name: target.display_name ?? "Anonyme" },
      })
      .select("id")
      .single();

    if (insertError || !op) {
      return new Response(
        JSON.stringify({ error: "db-error", detail: insertError?.message }),
        { status: 500, headers: CORS },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, opId: op.id, resolvesAt }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
