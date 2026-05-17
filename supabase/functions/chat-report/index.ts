import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUTO_DELETE_THRESHOLD = 3;

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

    const { messageId } = await req.json() as { messageId?: string };
    if (!messageId) {
      return new Response(JSON.stringify({ error: "missing-message-id" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: msg } = await service
      .from("chat_messages")
      .select("id, player_id, is_deleted, reported_count")
      .eq("id", messageId)
      .maybeSingle();

    if (!msg) {
      return new Response(JSON.stringify({ error: "not-found" }), { status: 404, headers: CORS });
    }
    if (msg.player_id === user.id) {
      return new Response(JSON.stringify({ error: "cannot-report-own" }), { status: 400, headers: CORS });
    }
    if (msg.is_deleted) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const { error: reportError } = await service
      .from("chat_reports")
      .insert({ message_id: messageId, reporter_id: user.id });

    // 23505 = unique_violation (already reported)
    if (reportError && reportError.code !== "23505") throw reportError;

    const newCount = msg.reported_count + 1;
    const update: Record<string, unknown> = { reported_count: newCount };
    if (newCount >= AUTO_DELETE_THRESHOLD) {
      update.is_deleted = true;
    }
    await service.from("chat_messages").update(update).eq("id", messageId);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "server-error" }), { status: 500, headers: CORS });
  }
});
