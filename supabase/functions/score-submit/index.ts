import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SUBMIT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes entre soumissions

const VALID_COUNTRY_IDS = new Set([
  "france","usa","china","russia","germany","uk","india","japan","brazil",
  "turkey","iran","israel","south_korea","italy","saudi_arabia","australia",
  "canada","north_korea","nigeria","pakistan",
]);

const VALID_DOCTRINES = new Set([
  "democratique","securitaire","technocratique","populiste","autoritaire",
  "souverainiste","ecologiste","liberal",
]);

function currentSeason(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
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

    // Compte lié requis (pas anonyme seul)
    const identities = user.identities ?? [];
    const isLinked = identities.some((i: { provider: string }) => i.provider !== "anonymous");
    if (!isLinked) {
      return new Response(
        JSON.stringify({ error: "account-not-linked" }),
        { status: 403, headers: CORS },
      );
    }

    const body = await req.json() as {
      display_name?: string;
      score?: number;
      global_power?: number;
      rank_title?: string;
      country_id?: string;
      doctrine?: string;
      mandate_days?: number;
    };

    const { display_name, score, global_power, rank_title, country_id, doctrine, mandate_days } = body;

    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10_000_000) {
      return new Response(JSON.stringify({ error: "invalid-score" }), { status: 400, headers: CORS });
    }
    if (typeof mandate_days !== "number" || mandate_days < 1 || mandate_days > 1825) {
      return new Response(JSON.stringify({ error: "invalid-mandate-days" }), { status: 400, headers: CORS });
    }

    const safeDisplayName = (typeof display_name === "string" ? display_name.trim() : "Président").slice(0, 30) || "Président";
    const safeCountryId   = VALID_COUNTRY_IDS.has(country_id ?? "") ? (country_id as string) : "france";
    const safeDoctrine    = VALID_DOCTRINES.has(doctrine ?? "") ? (doctrine as string) : "democratique";
    const safeGlobalPower = typeof global_power === "number" ? Math.max(0, Math.min(10000, global_power)) : 0;
    const safeRankTitle   = typeof rank_title === "string" ? rank_title.slice(0, 50) : "";

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Vérification ban actif
    const { data: activeBan } = await service
      .from("sanctions")
      .select("id")
      .eq("player_id", user.id)
      .eq("severity", "ban")
      .limit(1)
      .maybeSingle();

    if (activeBan) {
      return new Response(JSON.stringify({ error: "player-banned" }), { status: 403, headers: CORS });
    }

    const season = currentSeason();

    // Entrée existante pour ce joueur cette saison
    const { data: existing } = await service
      .from("leaderboard_entries")
      .select("id, score, created_at")
      .eq("player_id", user.id)
      .eq("season", season)
      .maybeSingle();

    if (existing) {
      // Anti-spam : délai minimum entre soumissions
      const lastSubmit = new Date(existing.created_at).getTime();
      if (Date.now() - lastSubmit < MIN_SUBMIT_INTERVAL_MS) {
        return new Response(
          JSON.stringify({ error: "rate-limited", retry_after_ms: MIN_SUBMIT_INTERVAL_MS - (Date.now() - lastSubmit) }),
          { status: 429, headers: CORS },
        );
      }

      // Pas d'amélioration → retourne le score actuel sans écrire
      if (score <= existing.score) {
        return new Response(
          JSON.stringify({ ok: true, score: existing.score, improved: false }),
          { headers: { ...CORS, "Content-Type": "application/json" } },
        );
      }

      // Amélioration confirmée → mise à jour
      await service
        .from("leaderboard_entries")
        .update({
          display_name: safeDisplayName,
          country_id:   safeCountryId,
          doctrine:     safeDoctrine,
          score,
          mandate_days,
          global_power: safeGlobalPower,
          rank_title:   safeRankTitle,
          created_at:   new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Première soumission de la saison
      await service.from("leaderboard_entries").insert({
        player_id:    user.id,
        display_name: safeDisplayName,
        country_id:   safeCountryId,
        doctrine:     safeDoctrine,
        score,
        mandate_days,
        global_power: safeGlobalPower,
        rank_title:   safeRankTitle,
        season,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, score, improved: !existing || score > existing.score }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
