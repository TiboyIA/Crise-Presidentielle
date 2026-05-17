import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Must match SAVE_MAX_BYTES / MAX_SAVE_VERSION in SyncService.ts.
const SAVE_MAX_BYTES = 512_000;
const MAX_SAVE_VERSION = 10;
const MIN_SAVE_VERSION = 1;
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// ── Notes serveur save-sync : validation et sécurité ─────────────────────────
//
// 1. AUTHENTIFICATION
//    JWT validé via anonClient.auth.getUser(). user.id = player_id.
//    Le client ne peut jamais écrire pour le compte d'un autre joueur.
//
// 2. TAILLE MAX (500 KB)
//    Rejet si JSON.stringify(saveData).length > 512_000 → 413.
//    Cette limite protège la table `saves` d'enregistrements anormalement volumineux.
//
// 3. VERSION SUPPORTÉE
//    saveVersion doit être un entier entre 1 et MAX_SAVE_VERSION.
//    Permet de détecter les clients trop anciens ou des payloads malformés → 400.
//
// 4. TYPE saveData
//    Doit être un objet JSON (ni string, ni array, ni null) → 400.
//    Rejet si clé __proto__ / constructor / prototype (prototype pollution) → 400.
//
// 5. TIMESTAMP SERVEUR PRIORITAIRE
//    saved_at = new Date().toISOString() — toujours assigné côté serveur.
//    Le client ne peut pas falsifier l'horodatage de la sauvegarde.
//
// 6. CHECKSUM NON SECRET (détection de corruption — pas une preuve de sécurité)
//    Client envoie saveChecksum = djb2(JSON.stringify(saveData)).
//    Serveur recompute. Mismatch → flag "checksum_mismatch" dans la réponse,
//    mais pas rejet (corruption accidentelle ≠ attaque).
//    Le score classé n'est JAMAIS validé à partir de cette donnée.
//
// 7. RATE LIMIT
//    Max 1 POST / 5 min par account → 429.
//
// 8. SCORE CLASSÉ — ISOLATION ABSOLUE
//    Le cloud save n'est JAMAIS utilisé comme source de vérité pour le classement.
//    Tout score passe par ranked-submit → journal d'événements → recalcul serveur.
//
// 9. STRATÉGIE DE CONFLIT (décidée côté client, pour info)
//    cloud_newer     : cloudTs > localSavedAt + 5 s  → client restore cloud
//    local_newer     : localSavedAt > cloudTs + 5 s  → client conserve local
//    conflict_detected : |diff| ≤ 5 s                → client conserve local

// ── Auth helpers ──────────────────────────────────────────────────────────────

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

// ── djb2 hash (same algorithm as SyncService.ts) ─────────────────────────────

function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const { user } = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
  }

  // ── GET — download latest cloud save ──────────────────────────────────────

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

  // ── POST — upload / upsert save ───────────────────────────────────────────

  if (req.method === "POST") {
    let body: { saveData?: unknown; saveVersion?: unknown; saveChecksum?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid-json" }), { status: 400, headers: CORS });
    }

    // saveData must be a plain object (not string, array, or null)
    const { saveData, saveVersion, saveChecksum } = body;
    if (saveData === null || typeof saveData !== "object" || Array.isArray(saveData)) {
      return new Response(JSON.stringify({ error: "invalid-save-data" }), { status: 400, headers: CORS });
    }

    // Prototype pollution guard
    for (const k of Object.keys(saveData as Record<string, unknown>)) {
      if (DANGEROUS_KEYS.has(k)) {
        return new Response(JSON.stringify({ error: "invalid-save-data" }), { status: 400, headers: CORS });
      }
    }

    // Version range check
    const version = typeof saveVersion === "number" ? saveVersion : 1;
    if (!Number.isInteger(version) || version < MIN_SAVE_VERSION || version > MAX_SAVE_VERSION) {
      return new Response(JSON.stringify({ error: "unsupported-version" }), { status: 400, headers: CORS });
    }

    // Size limit: 500 KB
    const serialized = JSON.stringify(saveData);
    if (serialized.length > SAVE_MAX_BYTES) {
      return new Response(JSON.stringify({ error: "save-too-large" }), { status: 413, headers: CORS });
    }

    // Rate limit: max 1 POST per 5 minutes
    const svc = service();
    const since5min = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentSave } = await svc
      .from("saves")
      .select("saved_at")
      .eq("player_id", user.id)
      .gte("saved_at", since5min)
      .maybeSingle();
    if (recentSave) {
      return new Response(JSON.stringify({ error: "rate-limited" }), { status: 429, headers: CORS });
    }

    // Checksum verification (corruption detection — not a security proof)
    const serverChecksum = djb2Hash(serialized);
    const checksumMatch = typeof saveChecksum === "string" && saveChecksum === serverChecksum;

    // saved_at is always assigned server-side — client cannot spoof timestamp
    const savedAt = new Date().toISOString();
    const { error: upsertError } = await svc
      .from("saves")
      .upsert(
        {
          player_id: user.id,
          save_data: saveData,
          save_version: version,
          saved_at: savedAt,
        },
        { onConflict: "player_id" },
      );

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: "server-error" }),
        { status: 500, headers: CORS },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        savedAt,
        ...(checksumMatch ? {} : { warning: "checksum_mismatch" }),
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ error: "method-not-allowed" }), { status: 405, headers: CORS });
});
