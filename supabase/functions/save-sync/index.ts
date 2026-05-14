import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getUser(req: Request) {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user }, error } = await sb.auth.getUser();
  return { user: error ? null : user, sb };
}

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const { user } = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
  }

  // GET — download latest cloud save
  if (req.method === "GET") {
    const { data, error } = await service()
      .from("saves")
      .select("save_data, save_version, saved_at")
      .eq("player_id", user.id)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ save: null }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ save: data.save_data, saveVersion: data.save_version, savedAt: data.saved_at }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // POST — upload / upsert save
  if (req.method === "POST") {
    const body = await req.json() as { saveData?: unknown; saveVersion?: number };
    if (!body.saveData) {
      return new Response(JSON.stringify({ error: "missing-save-data" }), { status: 400, headers: CORS });
    }

    const { error } = await service()
      .from("saves")
      .upsert(
        {
          player_id: user.id,
          save_data: body.saveData,
          save_version: body.saveVersion ?? 1,
          saved_at: new Date().toISOString(),
        },
        { onConflict: "player_id" },
      );

    if (error) {
      return new Response(
        JSON.stringify({ error: "db-error", detail: error.message }),
        { status: 500, headers: CORS },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ error: "method-not-allowed" }), { status: 405, headers: CORS });
});
