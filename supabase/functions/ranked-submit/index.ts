import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Whitelists ────────────────────────────────────────────────────────────────

const KNOWN_EVENT_IDS = new Set([
  // Cyber
  "cyber_power_grid", "cyber_espionage_detected", "disinformation_wave", "cyber_banking",
  // Économie
  "debt_crisis", "trade_deal", "inflation_spike", "housing_crisis", "debt_crisis_event",
  "economic_recession", "debt_escalation",
  // Social
  "social_unrest", "artisan_revolt", "transport_strike", "popular_fatigue_crisis",
  "hospital_collapse", "agricultural_crisis", "heatwave_crisis", "ecological_disaster",
  "inondations_massives",
  // National
  "corruption_scandal", "admin_reform", "research_breakthrough", "media_scandal",
  "blackout_national", "fuel_shortage", "industrial_disaster", "motion_defiance",
  "institutional_fragility", "promise_under_pressure", "popularity_collapse",
  "security_vacuum", "minister_scandal",
  // Diplomatie / Monde
  "border_exercise", "arms_deal", "diplomatic_summit", "diplomatic_incident",
  "world_russia_cyber", "world_usa_ranking", "world_china_africa", "world_nato_expansion",
  "world_tech_race", "world_energy_crisis", "world_cyber_forum", "world_pandemic_alert",
  "world_climate_summit", "world_spy_network_busted",
  "conseil_mondial_sanction", "conseil_mondial_vote", "conseil_mondial_presidence",
  // Guerre hybride
  "hybrid_propaganda", "sabotage_infrastructure", "intel_leak",
  "infrastructure_sabotage", "document_leak_crisis", "social_manipulation_crisis",
  "trade_route_attack", "energy_blackmail_crisis", "desinformation_electorale",
  // Hidden politics
  "elite_distrust", "internal_leak", "scandal_erupts", "media_hostile_wave",
  "regional_anger",
  // Opposition
  "opposition_rise", "opposition_motion_censure", "opposition_media_offensive", "opposition_weakened",
  // Classement
  "rank_challenger", "rank_milestone_power", "rank_top5", "doctrine_challenge",
  // Militaire
  "military_modernization_debate", "drone_program_leak", "naval_deployment_tension",
  "military_budget_media", "allies_salute_defense", "limited_military_op_debate",
  // Operations (military ops logged as events)
  "espionage", "steal_intel", "cyber_attack", "influence_campaign", "sabotage",
  "sanction", "sign_treaty", "diplomatic_aid", "reinforce_cyber", "military_operation",
  // Reforms
  "fiscal", "securite", "energie", "industrie", "cyber", "diplomatique", "sociale", "education",
  // Lifecycle
  "game_over", "mandate_end",
]);

const VALID_EVENT_TYPES = new Set([
  "crisis_choice", "reform_launched", "doctrine_set",
  "military_op", "game_over", "mandate_end",
]);

// ── Score weights ─────────────────────────────────────────────────────────────

const EVENT_WEIGHTS: Record<string, number> = {
  crisis_choice: 50,
  reform_launched: 80,
  military_op: 30,
  mandate_end: 200,
  doctrine_set: 20,
  game_over: 0,
};

// ── Indicator coherence ───────────────────────────────────────────────────────
// Starting values: pop=60 eco=55 sec=50 ecol=45 coh=60 (sum=270).
// Each event/reform/doctrine cycle adds ~5-15 pts across all indicators.
// These thresholds represent physically impossible combinations.

function validateIndicators(
  ind: Partial<FinalIndicators>,
  events: RunEvent[],
  mandateDays: number,
): { ok: boolean; reason?: string; flag?: boolean } {
  const values = [
    Math.max(0, Math.min(100, ind.popularity ?? 50)),
    Math.max(0, Math.min(100, ind.economy    ?? 50)),
    Math.max(0, Math.min(100, ind.security   ?? 50)),
    Math.max(0, Math.min(100, ind.ecology    ?? 50)),
    Math.max(0, Math.min(100, ind.cohesion   ?? 50)),
  ];
  const sum = values.reduce((a, b) => a + b, 0);
  const perfectCount = values.filter((v) => v >= 99).length;

  // All five indicators at 100 — mathematically impossible in normal play
  if (perfectCount === 5) {
    return { ok: false, reason: "indicators-all-perfect" };
  }

  // High aggregate unreachable with so few events (starting sum=270, ~10pt gain/event max)
  if (sum > 430 && events.length < 5) {
    return { ok: false, reason: "indicators-unreachable" };
  }

  // High aggregate unreachable in so few mandate days
  if (sum > 440 && mandateDays < 20) {
    return { ok: false, reason: "indicators-too-fast" };
  }

  // Near-perfect (4+ at 99+) or very high sum — flag for review but don't reject
  if (perfectCount >= 4 || sum > 450) {
    return { ok: true, flag: true };
  }

  return { ok: true };
}

// ── Version helpers ───────────────────────────────────────────────────────────

function parseVersion(v: string): [number, number, number] {
  const parts = v.split(".").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function versionGte(a: string, b: string): boolean {
  const [aMaj, aMin, aPatch] = parseVersion(a);
  const [bMaj, bMin, bPatch] = parseVersion(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPatch >= bPatch;
}

// ── Season helpers ────────────────────────────────────────────────────────────
// Season = YYYYMM (e.g. 202605 for May 2026). Resets every calendar month.
function currentSeason(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
}

// ── Validation limits ─────────────────────────────────────────────────────────

const MIN_ELAPSED_BETWEEN_EVENTS_MS = 500;
const MAX_EVENTS_PER_DAY = 50;
const MAX_MANDATE_DAYS = 1825; // 5 years
const MAX_JOURNAL_SIZE = 2000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunEvent {
  seq: number;
  event_type: string;
  event_id: string;
  choice_id?: string;
  mandate_day: number;
  elapsed_ms: number;
}

interface FinalIndicators {
  popularity: number;
  economy: number;
  security: number;
  ecology: number;
  cohesion: number;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateJournal(events: RunEvent[]): { ok: boolean; reason?: string } {
  if (!Array.isArray(events)) return { ok: false, reason: "invalid-journal" };
  if (events.length === 0) return { ok: false, reason: "empty-journal" };
  if (events.length > MAX_JOURNAL_SIZE) return { ok: false, reason: "journal-too-large" };

  const eventsPerDay = new Map<number, number>();

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (typeof ev !== "object" || ev === null) return { ok: false, reason: `bad-event-at-${i}` };

    if (ev.seq !== i) return { ok: false, reason: `seq-gap-at-${i}` };

    if (!VALID_EVENT_TYPES.has(ev.event_type)) {
      return { ok: false, reason: `unknown-event-type-${ev.event_type}` };
    }
    if (!KNOWN_EVENT_IDS.has(ev.event_id)) {
      return { ok: false, reason: `unknown-event-id-${ev.event_id}` };
    }

    if (typeof ev.mandate_day !== "number" || ev.mandate_day < 0) {
      return { ok: false, reason: `invalid-mandate-day-at-${i}` };
    }
    if (ev.mandate_day > MAX_MANDATE_DAYS) return { ok: false, reason: "mandate-days-exceeded" };

    if (i > 0) {
      const prev = events[i - 1];
      if (ev.mandate_day < prev.mandate_day) return { ok: false, reason: `day-regression-at-${i}` };
      if (ev.elapsed_ms < prev.elapsed_ms) return { ok: false, reason: `elapsed-regression-at-${i}` };
      if (ev.elapsed_ms - prev.elapsed_ms < MIN_ELAPSED_BETWEEN_EVENTS_MS) {
        return { ok: false, reason: `events-too-fast-at-${i}` };
      }
    }

    const count = (eventsPerDay.get(ev.mandate_day) ?? 0) + 1;
    eventsPerDay.set(ev.mandate_day, count);
    if (count > MAX_EVENTS_PER_DAY) return { ok: false, reason: `too-many-events-day-${ev.mandate_day}` };
  }

  return { ok: true };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function computeScore(events: RunEvent[], mandateDays: number, ind: Partial<FinalIndicators>): number {
  let score = mandateDays * 100;

  for (const ev of events) {
    score += EVENT_WEIGHTS[ev.event_type] ?? 0;
  }

  const indSum =
    clamp(ind.popularity ?? 50) +
    clamp(ind.economy ?? 50) +
    clamp(ind.security ?? 50) +
    clamp(ind.ecology ?? 50) +
    clamp(ind.cohesion ?? 50);

  score += Math.round(indSum * 10);
  return Math.max(0, score);
}

// ── Handler ───────────────────────────────────────────────────────────────────

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

    const body = await req.json();
    const { runId, events, finalIndicators, mandateDays, deviceId, appVersion } = body as {
      runId?: string;
      events?: RunEvent[];
      finalIndicators?: Partial<FinalIndicators>;
      mandateDays?: number;
      deviceId?: string;
      appVersion?: string;
    };

    if (!runId || !events || mandateDays == null) {
      return new Response(JSON.stringify({ error: "missing-fields" }), { status: 400, headers: CORS });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify run ownership
    const { data: run } = await service
      .from("ranked_runs")
      .select("id, player_id, status, country_id, doctrine")
      .eq("id", runId)
      .single();

    if (!run) {
      return new Response(JSON.stringify({ error: "run-not-found" }), { status: 404, headers: CORS });
    }
    if (run.player_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: CORS });
    }
    if (run.status !== "in_progress") {
      return new Response(JSON.stringify({ error: "run-already-closed" }), { status: 409, headers: CORS });
    }

    // Block players with an active ban
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

    // Version blocklist — reject runs from outdated clients
    const minVersion = Deno.env.get("MIN_APP_VERSION");
    if (minVersion && appVersion && !versionGte(appVersion, minVersion)) {
      return new Response(JSON.stringify({ error: "version-blocked" }), { status: 403, headers: CORS });
    }

    // Device suspicion — flag web platform or emulator signatures for review
    if (deviceId) {
      const { data: device } = await service
        .from("devices")
        .select("platform, os_version")
        .eq("id", deviceId)
        .maybeSingle();

      const isWebPlatform = device?.platform === "web";
      const osV = (device?.os_version ?? "").toLowerCase();
      const isEmulator = ["emulator", "generic", "sdk_gphone", "android sdk"].some((s) => osV.includes(s));

      if (isWebPlatform || isEmulator) {
        await service.from("sanctions").insert({
          player_id: user.id,
          run_id: runId,
          reason: `device-suspicion: platform=${device?.platform ?? "unknown"} os=${device?.os_version ?? "unknown"}`,
          severity: "flag",
        });
      }
    }

    const validation = validateJournal(events);
    if (!validation.ok) {
      await service.from("ranked_runs").update({
        status: "rejected",
        reject_reason: validation.reason,
        submitted_at: new Date().toISOString(),
      }).eq("id", runId);

      await service.from("sanctions").insert({
        player_id: user.id,
        run_id: runId,
        reason: `run-rejected: ${validation.reason}`,
        severity: "warn",
      });

      const { count: warnCount } = await service
        .from("sanctions")
        .select("*", { count: "exact", head: true })
        .eq("player_id", user.id)
        .eq("severity", "warn");

      if ((warnCount ?? 0) >= 3) {
        await service.from("sanctions").insert({
          player_id: user.id,
          reason: "auto-ban: 3 validation violations",
          severity: "ban",
        });
      }

      return new Response(
        JSON.stringify({ ok: false, reason: validation.reason }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Indicator coherence check
    const indCheck = validateIndicators(finalIndicators ?? {}, events, mandateDays);
    if (!indCheck.ok) {
      await service.from("ranked_runs").update({
        status: "rejected",
        reject_reason: indCheck.reason,
        submitted_at: new Date().toISOString(),
      }).eq("id", runId);

      await service.from("sanctions").insert({
        player_id: user.id,
        run_id: runId,
        reason: `indicators-rejected: ${indCheck.reason}`,
        severity: "warn",
      });

      const { count: warnCount } = await service
        .from("sanctions")
        .select("*", { count: "exact", head: true })
        .eq("player_id", user.id)
        .eq("severity", "warn");

      if ((warnCount ?? 0) >= 3) {
        await service.from("sanctions").insert({
          player_id: user.id,
          reason: "auto-ban: 3 validation violations",
          severity: "ban",
        });
      }

      return new Response(
        JSON.stringify({ ok: false, reason: indCheck.reason }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    if (indCheck.flag) {
      await service.from("sanctions").insert({
        player_id: user.id,
        run_id: runId,
        reason: "indicators-suspicious: near-perfect or very high sum",
        severity: "flag",
      });
    }

    const score = computeScore(events, mandateDays, finalIndicators ?? {});

    const { data: player } = await service
      .from("players")
      .select("display_name, pending_debuff")
      .eq("id", user.id)
      .single();

    // Apply any active cyber debuff
    const debuff = player?.pending_debuff as { score_penalty_pct?: number } | null;
    const penaltyPct = Math.max(0, Math.min(20, debuff?.score_penalty_pct ?? 0));
    const finalScore = penaltyPct > 0 ? Math.round(score * (1 - penaltyPct / 100)) : score;
    if (penaltyPct > 0) {
      await service.from("players").update({ pending_debuff: null }).eq("id", user.id);
    }

    // Bulk insert events
    if (events.length > 0) {
      await service.from("run_events").insert(
        events.map((ev) => ({
          run_id: runId,
          seq: ev.seq,
          event_type: ev.event_type,
          event_id: ev.event_id,
          choice_id: ev.choice_id ?? null,
          mandate_day: ev.mandate_day,
          elapsed_ms: ev.elapsed_ms,
        })),
      );
    }

    await service.from("ranked_runs").update({
      status: "validated",
      submitted_at: new Date().toISOString(),
      score,
      mandate_days: mandateDays,
      ...(deviceId ? { device_id: deviceId } : {}),
      ...(appVersion ? { app_version: appVersion } : {}),
    }).eq("id", runId);

    const season = currentSeason();

    // Upsert: keep only best score per player per season
    const { data: existing } = await service
      .from("leaderboard_entries")
      .select("id, score")
      .eq("player_id", user.id)
      .eq("season", season)
      .maybeSingle();

    if (!existing || finalScore > existing.score) {
      if (existing) {
        await service.from("leaderboard_entries")
          .update({ run_id: runId, display_name: player?.display_name ?? "Président", country_id: run.country_id, doctrine: run.doctrine, score: finalScore, mandate_days: mandateDays })
          .eq("id", existing.id);
      } else {
        await service.from("leaderboard_entries").insert({
          run_id: runId,
          player_id: user.id,
          display_name: player?.display_name ?? "Président",
          country_id: run.country_id,
          doctrine: run.doctrine,
          score: finalScore,
          mandate_days: mandateDays,
          season,
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, score: finalScore, ...(penaltyPct > 0 ? { penaltyPct } : {}) }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
