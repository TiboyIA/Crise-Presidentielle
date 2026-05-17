import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_COUNTRY_IDS = new Set([
  "france", "usa", "china", "russia", "germany", "uk", "india", "japan",
  "brazil", "turkey", "iran", "israel", "south_korea", "italy", "saudi_arabia",
  "australia", "canada", "north_korea", "nigeria", "pakistan",
]);

const VALID_DOCTRINES = new Set([
  "democratique", "technocratique", "securitaire", "populiste", "autoritaire",
  "souverainiste", "ecologiste", "liberal",
]);

const MAX_RUNS_PER_HOUR = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Verify caller identity with anon key
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { countryId, doctrine, displayName } = body as {
      countryId?: string;
      doctrine?: string;
      displayName?: string;
    };

    if (!countryId || !VALID_COUNTRY_IDS.has(countryId)) {
      return new Response(JSON.stringify({ error: "invalid-country" }), { status: 400, headers: CORS });
    }
    if (!doctrine || !VALID_DOCTRINES.has(doctrine)) {
      return new Response(JSON.stringify({ error: "invalid-doctrine" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Upsert player profile
    await service.from("players").upsert(
      { id: user.id, display_name: (displayName ?? "Président").slice(0, 40) },
      { onConflict: "id" },
    );

    // Rate limit: max 10 runs per hour per player
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentRuns } = await service
      .from("ranked_runs")
      .select("*", { count: "exact", head: true })
      .eq("player_id", user.id)
      .gte("started_at", oneHourAgo);
    if ((recentRuns ?? 0) >= MAX_RUNS_PER_HOUR) {
      return new Response(JSON.stringify({ error: "rate-limited" }), { status: 429, headers: CORS });
    }

    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const { data: run, error: runError } = await service
      .from("ranked_runs")
      .insert({ player_id: user.id, seed, country_id: countryId, doctrine })
      .select("id")
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: "db-error", detail: runError?.message }),
        { status: 500, headers: CORS },
      );
    }

    return new Response(
      JSON.stringify({ runId: run.id, seed }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
  }
});
