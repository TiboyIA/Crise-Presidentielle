import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: authError } = await anon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json() as {
      platform?: string;
      osVersion?: string;
      appVersion?: string;
    };

    if (!body.platform) {
      return new Response(JSON.stringify({ error: "missing-platform" }), { status: 400, headers: CORS });
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Upsert player profile (in case first call)
    await svc.from("players").upsert(
      { id: user.id, display_name: "" },
      { onConflict: "id", ignoreDuplicates: true },
    );

    // Find existing device for this player+platform combo
    const { data: existing } = await svc
      .from("devices")
      .select("id")
      .eq("player_id", user.id)
      .eq("platform", body.platform)
      .maybeSingle();

    let deviceId: string;

    if (existing) {
      // Update last_seen + app_version
      await svc.from("devices").update({
        last_seen: new Date().toISOString(),
        app_version: body.appVersion ?? null,
        os_version: body.osVersion ?? null,
      }).eq("id", existing.id);
      deviceId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await svc
        .from("devices")
        .insert({
          player_id: user.id,
          platform: body.platform,
          os_version: body.osVersion ?? null,
          app_version: body.appVersion ?? null,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        return new Response(
          JSON.stringify({ error: "db-error", detail: insertError?.message }),
          { status: 500, headers: CORS },
        );
      }
      deviceId = inserted.id;
    }

    return new Response(
      JSON.stringify({ deviceId }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
