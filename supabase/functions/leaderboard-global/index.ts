import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("id, display_name, country_id, doctrine, score, mandate_days, created_at")
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: CORS },
    );
  }

  return new Response(
    JSON.stringify({ entries: data ?? [], limit, offset }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
