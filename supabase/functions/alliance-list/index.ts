import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { data: alliances, error } = await service
      .from("alliances")
      .select("id, initiator_id, target_id, status, created_at, expires_at")
      .or(`initiator_id.eq.${user.id},target_id.eq.${user.id}`)
      .not("status", "eq", "rejected")
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
    }

    if (!alliances || alliances.length === 0) {
      return new Response(
        JSON.stringify({ alliances: [] }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Batch-fetch partner display names in one query
    const partnerIds = new Set<string>();
    for (const a of alliances) {
      partnerIds.add(a.initiator_id === user.id ? a.target_id : a.initiator_id);
    }

    const { data: players } = await service
      .from("players").select("id, display_name").in("id", [...partnerIds]);

    const nameMap = new Map<string, string>();
    for (const p of players ?? []) nameMap.set(p.id, p.display_name ?? "Anonyme");

    const enriched = alliances.map((a) => {
      const partnerId = a.initiator_id === user.id ? a.target_id : a.initiator_id;
      return {
        id: a.id,
        status: a.status,
        created_at: a.created_at,
        expires_at: a.expires_at,
        is_initiator: a.initiator_id === user.id,
        partner_id: partnerId,
        partner_name: nameMap.get(partnerId) ?? "Anonyme",
      };
    });

    return new Response(
      JSON.stringify({ alliances: enriched }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
