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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await anonClient.auth.getUser();

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const season = currentSeason();

    // Top 100 by pvp_points this season
    const { data: topStats } = await service
      .from("pvp_stats")
      .select("player_id, pvp_points, spy_ops_success, cyber_ops_success, alliances_formed")
      .eq("season", season)
      .order("pvp_points", { ascending: false })
      .limit(100);

    // Enrich with display names
    const playerIds = (topStats ?? []).map((s) => s.player_id);
    const nameMap: Record<string, string> = {};
    if (playerIds.length > 0) {
      const { data: players } = await service
        .from("players")
        .select("id, display_name")
        .in("id", playerIds);
      for (const p of (players ?? [])) {
        nameMap[p.id] = p.display_name ?? "Anonyme";
      }
    }

    const entries = (topStats ?? []).map((s, i) => ({
      rank: i + 1,
      player_id: s.player_id,
      display_name: nameMap[s.player_id] ?? "Anonyme",
      pvp_points: s.pvp_points,
      spy_ops_success: s.spy_ops_success,
      cyber_ops_success: s.cyber_ops_success,
      alliances_formed: s.alliances_formed,
    }));

    // Current user's own stats (may not be in top 100)
    let myStats = null;
    if (user) {
      const { data } = await service
        .from("pvp_stats")
        .select("pvp_points, spy_ops_success, cyber_ops_success, alliances_formed")
        .eq("player_id", user.id)
        .eq("season", season)
        .maybeSingle();
      myStats = data;
    }

    return new Response(
      JSON.stringify({ entries, my_stats: myStats, season }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
