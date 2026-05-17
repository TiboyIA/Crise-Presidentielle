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
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const season = currentSeason();

    const { data: messages } = await service
      .from("chat_messages")
      .select("id, player_id, content, created_at")
      .eq("season", season)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50);

    const playerIds = [...new Set((messages ?? []).map((m) => m.player_id))];
    const nameMap: Record<string, string> = {};

    if (playerIds.length > 0) {
      const { data: players } = await service
        .from("players")
        .select("id, display_name")
        .in("id", playerIds);
      for (const p of (players ?? [])) {
        nameMap[p.id] = p.display_name ?? "Joueur";
      }
    }

    const result = (messages ?? [])
      .map((m) => ({ ...m, display_name: nameMap[m.player_id] ?? "Joueur" }))
      .reverse();

    return new Response(
      JSON.stringify({ messages: result, season }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
  }
});
