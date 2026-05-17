import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_LENGTH  = 200;
const MAX_PER_DAY = 10;
const COOLDOWN_MS = 30_000;

const BANNED = [
  "pute", "salope", "connard", "fdp", "ntm", "enculé", "encule",
  "batard", "bâtard", "pd ", " pd", "nique ta", "ta mère", "ta mere",
];

function currentSeason(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
}

function containsBanned(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED.some((w) => lower.includes(w));
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

    const { content } = await req.json() as { content?: string };
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "missing-content" }), { status: 400, headers: CORS });
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
      return new Response(JSON.stringify({ error: "invalid-length" }), { status: 400, headers: CORS });
    }
    if (containsBanned(trimmed)) {
      return new Response(JSON.stringify({ error: "content-blocked" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const season  = currentSeason();
    const dayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recent } = await service
      .from("chat_messages")
      .select("created_at")
      .eq("player_id", user.id)
      .eq("season", season)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(MAX_PER_DAY);

    if ((recent?.length ?? 0) >= MAX_PER_DAY) {
      return new Response(JSON.stringify({ error: "quota-exceeded" }), { status: 429, headers: CORS });
    }

    const lastMsg = recent?.[0];
    if (lastMsg && new Date(lastMsg.created_at).getTime() > Date.now() - COOLDOWN_MS) {
      return new Response(JSON.stringify({ error: "cooldown" }), { status: 429, headers: CORS });
    }

    const { data: inserted, error: insertError } = await service
      .from("chat_messages")
      .insert({ player_id: user.id, season, content: trimmed })
      .select("id, content, created_at")
      .single();

    if (insertError) throw insertError;

    const { data: playerRow } = await service
      .from("players")
      .select("display_name")
      .eq("id", user.id)
      .single();

    return new Response(
      JSON.stringify({
        ok: true,
        message: {
          id: inserted.id,
          player_id: user.id,
          display_name: playerRow?.display_name ?? "Joueur",
          content: inserted.content,
          created_at: inserted.created_at,
        },
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
  }
});
