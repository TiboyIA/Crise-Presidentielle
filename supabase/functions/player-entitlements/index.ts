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
  return { user: error ? null : user };
}

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method-not-allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { user } = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await service()
    .from("player_entitlements")
    .select("entitlement_id")
    .eq("player_id", user.id)
    .eq("is_active", true);

  if (error) {
    return new Response(JSON.stringify({ error: "server-error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const entitlements = (data ?? []).map((row: { entitlement_id: string }) => row.entitlement_id);

  return new Response(
    JSON.stringify({ entitlements }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
