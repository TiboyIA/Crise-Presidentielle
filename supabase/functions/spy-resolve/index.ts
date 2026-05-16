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

function scoreRange(score: number): { score_min: number; score_max: number } {
  return {
    score_min: Math.floor(score * 0.8 / 500) * 500,
    score_max: Math.ceil(score  * 1.2 / 500) * 500,
  };
}

function daysRange(days: number): { days_min: number; days_max: number } {
  return {
    days_min: Math.max(1, Math.floor(days * 0.8 / 5) * 5),
    days_max: Math.ceil(days * 1.2 / 5) * 5,
  };
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

    const { data: pending } = await service
      .from("spy_ops")
      .select("id, target_id, op_type, result_json")
      .eq("attacker_id", user.id)
      .eq("status", "pending")
      .lte("resolves_at", now);

    if (pending && pending.length > 0) {
      for (const op of pending) {
        const { data: entry } = await service
          .from("leaderboard_entries")
          .select("doctrine, country_id, score, mandate_days")
          .eq("player_id", op.target_id)
          .eq("season", season)
          .maybeSingle();

        const targetName = (op.result_json as { target_name?: string })?.target_name ?? "Anonyme";

        if (!entry) {
          await service.from("spy_ops").update({
            status: "blocked",
            result_json: { target_name: targetName, blocked_reason: "no-data-available" },
          }).eq("id", op.id);
          continue;
        }

        let result: Record<string, unknown> = { target_name: targetName };

        if (op.op_type === "intel_probe") {
          result = { ...result, country: entry.country_id, doctrine: entry.doctrine };
        } else if (op.op_type === "doctrine_scan") {
          result = { ...result, doctrine: entry.doctrine, ...daysRange(entry.mandate_days) };
        } else if (op.op_type === "score_range") {
          result = { ...result, country: entry.country_id, ...scoreRange(entry.score) };
        }

        await service.from("spy_ops").update({
          status: "resolved",
          result_json: result,
        }).eq("id", op.id);

        // Award PvP points for successful spy op
        await service.rpc("award_pvp_points", {
          p_player_id: user.id,
          p_season: season,
          p_points: 5,
          p_spy: 1,
        });
      }
    }

    const { data: allOps } = await service
      .from("spy_ops")
      .select("id, op_type, status, created_at, resolves_at, result_json")
      .eq("attacker_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return new Response(
      JSON.stringify({ ops: allOps ?? [] }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
