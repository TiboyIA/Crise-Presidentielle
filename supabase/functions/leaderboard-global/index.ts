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

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));
  const seasonParam = url.searchParams.get("season");
  const season = seasonParam ? parseInt(seasonParam) : currentSeason();
  const countryFilter = url.searchParams.get("country_id");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  let query = supabase
    .from("leaderboard_entries")
    .select("id, player_id, display_name, country_id, doctrine, score, mandate_days, created_at, season, rank_title, global_power")
    .eq("season", season)
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (countryFilter) {
    query = query.eq("country_id", countryFilter);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: CORS },
    );
  }

  return new Response(
    JSON.stringify({ entries: data ?? [], season, limit, offset }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
