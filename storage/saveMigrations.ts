/**
 * saveMigrations.ts — Versioned save migration system.
 *
 * Rules:
 * - Never crash, never delete data. Every path returns something usable.
 * - Each migration only adds missing fields — never overwrites existing values.
 * - The sanitize pass fixes corrupt values after all migrations run.
 * - Bump CURRENT_SAVE_VERSION when adding new required fields to StrategyGameState.
 *
 * Version history:
 *   v1 — Original save format (shipped)
 *   v2 — Added: reforms, ministers, achievements, publicMemory, oppositionPower,
 *               realTime, strategyResearch, premiumGold, playerUnits, militaryDoctrine
 *   v3 — Added: cosmicInfluence, dailyLoginReward
 *   v4 — Added: spaceNationsState
 *   v5 — Added: orionCityState
 */

import { DEFAULT_NEWS_STATE } from "@/logic/newsEngine";
import { DEFAULT_REALTIME_STATE } from "@/logic/realTimeEngine";
import { DEFAULT_RESEARCH_STATE } from "@/types/strategyResearch";
import { MINISTER_LIST } from "@/data/strategyMinisters";
import type { StrategyGameState } from "@/types/strategy";

export const CURRENT_SAVE_VERSION = 5;

export interface MigrationResult {
  state: StrategyGameState;
  /** Version the save was at before migration (0 = no version field). */
  migratedFrom: number;
  /** Non-fatal issues discovered and repaired during migration. */
  warnings: string[];
  /** True if the original data was unrecoverable and a safe fallback was used. */
  usedFallback: boolean;
}

// ── Default values used during migration ─────────────────────────────────────

const DEFAULT_INDICATORS = {
  popularity:   60,
  economy:      55,
  security:     50,
  ecology:      45,
  cohesion:     60,
  publicBudget: 20,
};

const DEFAULT_HIDDEN_POLITICS = {
  eliteTrust:             65,
  scandalRisk:            20,
  mediaMood:              55,
  popularFatigue:         15,
  regionalTension:        30,
  institutionalStability: 70,
};

const DEFAULT_RESOURCES = {
  money:        2000,
  influence:    100,
  energy:       200,
  intelligence: 50,
  technology:   30,
  military:     80,
  cyberDefense: 40,
};

const DEFAULT_STATS = {
  globalPower:     100,
  presidentLevel:  1,
  presidentXP:     0,
  rankingPoints:   200,
  totalOperations: 0,
  operationsWon:   0,
  season:          1,
  seasonStartTime: 0,
};

function defaultMinisters() {
  return MINISTER_LIST.map((def) => ({
    id: def.id,
    loyalty: def.defaultLoyalty,
    competence: def.defaultCompetence,
    scandalRisk: def.defaultScandalRisk,
  }));
}

function defaultPromises() {
  const selected = ["securite", "economie", "ecologie"] as const;
  return {
    selected: [...selected],
    progress: { securite: 0, economie: 0, ecologie: 0 },
    status:   { securite: "en cours", economie: "en cours", ecologie: "en cours" },
  };
}

// ── Type alias for raw (unknown-shape) save objects ──────────────────────────

type Raw = Record<string, unknown>;

function isObject(v: unknown): v is Raw {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function safeArray<T>(v: unknown, fallback: T[] = []): T[] {
  return Array.isArray(v) ? (v as T[]) : fallback;
}

function safeNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && isFinite(v)) return v;
  return fallback;
}

function safeString(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

// ── Migration steps ───────────────────────────────────────────────────────────

/**
 * V0 → V1
 * Handles saves that predate versioning or have no version field.
 * Ensures the basic top-level shape is present before further migrations.
 */
function migrateV0ToV1(raw: Raw, warnings: string[]): Raw {
  if (!raw.playerName) {
    warnings.push("v0→v1: playerName missing, defaulted to 'Président'");
  }
  if (!isObject(raw.resources)) {
    warnings.push("v0→v1: resources missing, using defaults");
  }
  if (!Array.isArray(raw.buildings)) {
    warnings.push("v0→v1: buildings missing, using empty array");
  }

  return {
    ...raw,
    version:            1,
    playerName:         safeString(raw.playerName, "Président"),
    countryId:          safeString(raw.countryId, "france"),
    resources:          isObject(raw.resources) ? raw.resources : { ...DEFAULT_RESOURCES },
    buildings:          safeArray(raw.buildings),
    stats:              isObject(raw.stats) ? raw.stats : { ...DEFAULT_STATS },
    relations:          safeArray(raw.relations),
    missions:           safeArray(raw.missions),
    news:               isObject(raw.news) ? raw.news : { ...DEFAULT_NEWS_STATE },
    lastResourceTick:   safeNumber(raw.lastResourceTick, 0),
    lastBotUpdate:      safeNumber(raw.lastBotUpdate, 0),
    ranking:            safeArray(raw.ranking),
    startedAt:          safeNumber(raw.startedAt, Date.now()),
    nationalIndicators: isObject(raw.nationalIndicators) ? raw.nationalIndicators : { ...DEFAULT_INDICATORS },
    mandateDay:         safeNumber(raw.mandateDay, 0),
    lastPollShownAt:    safeNumber(raw.lastPollShownAt, 0),
    lastBilanShownAt:   safeNumber(raw.lastBilanShownAt, 0),
    hiddenPolitics:     isObject(raw.hiddenPolitics) ? raw.hiddenPolitics : { ...DEFAULT_HIDDEN_POLITICS },
  };
}

/**
 * V1 → V2
 * Adds all systems introduced after the initial v1 release without a version bump:
 * governance, reforms, ministers, research, military units, public memory, real-time engine.
 * Existing values are never overwritten — only missing fields are patched.
 */
function migrateV1ToV2(s: Raw, warnings: string[]): Raw {
  const patched: Raw = { ...s };

  if (!patched.governanceDoctrine) {
    patched.governanceDoctrine = "democratique";
    warnings.push("v1→v2: governanceDoctrine defaulted to 'democratique'");
  }
  if (!Array.isArray(patched.reforms)) {
    patched.reforms = [];
    warnings.push("v1→v2: reforms defaulted to []");
  }
  if (!Array.isArray(patched.strategyMinisters) || (patched.strategyMinisters as unknown[]).length === 0) {
    patched.strategyMinisters = defaultMinisters();
    warnings.push("v1→v2: strategyMinisters defaulted to initial cabinet");
  }
  if (typeof patched.nationalDebt !== "number") {
    patched.nationalDebt = 30;
    warnings.push("v1→v2: nationalDebt defaulted to 30");
  }
  if (!Array.isArray(patched.achievements)) {
    patched.achievements = [];
    warnings.push("v1→v2: achievements defaulted to []");
  }
  if (!isObject(patched.publicMemory)) {
    patched.publicMemory = { traces: [] };
    warnings.push("v1→v2: publicMemory defaulted to {traces:[]}");
  }
  if (typeof patched.oppositionPower !== "number") {
    patched.oppositionPower = 35;
    warnings.push("v1→v2: oppositionPower defaulted to 35");
  }
  if (!isObject(patched.realTime)) {
    patched.realTime = { ...DEFAULT_REALTIME_STATE };
    warnings.push("v1→v2: realTime defaulted");
  }
  if (!isObject(patched.strategyResearch)) {
    patched.strategyResearch = { ...DEFAULT_RESEARCH_STATE };
    warnings.push("v1→v2: strategyResearch defaulted");
  }
  if (typeof patched.premiumGold !== "number") {
    patched.premiumGold = 0;
    warnings.push("v1→v2: premiumGold defaulted to 0");
  }
  if (!Array.isArray(patched.playerUnits)) {
    patched.playerUnits = [];
    warnings.push("v1→v2: playerUnits defaulted to []");
  }
  if (!Array.isArray(patched.trainingQueue)) {
    patched.trainingQueue = [];
    warnings.push("v1→v2: trainingQueue defaulted to []");
  }
  if (!patched.militaryDoctrine) {
    patched.militaryDoctrine = "defensive";
    warnings.push("v1→v2: militaryDoctrine defaulted to 'defensive'");
  }
  if (!isObject(patched.campaignPromises)) {
    patched.campaignPromises = defaultPromises();
    warnings.push("v1→v2: campaignPromises defaulted");
  }
  if (!Array.isArray(patched.delayedConsequences)) {
    patched.delayedConsequences = [];
    warnings.push("v1→v2: delayedConsequences defaulted to []");
  }

  return { ...patched, version: 2 };
}

/**
 * V2 → V3
 * Adds cosmicInfluence and dailyLoginReward (optional but expected by the engine).
 */
function migrateV2ToV3(s: Raw, warnings: string[]): Raw {
  const patched: Raw = { ...s };

  if (!isObject(patched.cosmicInfluence)) {
    patched.cosmicInfluence = { auroria: 10, obscurium: 10, lastCosmicEventAt: 0, discovered: false };
    warnings.push("v2→v3: cosmicInfluence defaulted");
  }
  if (!isObject(patched.dailyLoginReward)) {
    patched.dailyLoginReward = { lastLoginRewardAt: 0, currentStreak: 0, totalDaysClaimed: 0 };
    warnings.push("v2→v3: dailyLoginReward defaulted");
  }

  return { ...patched, version: 3 };
}

/**
 * V3 → V4
 * Adds spaceNationsState (Nations de l'Espace layer).
 */
function migrateV3ToV4(s: Raw, warnings: string[]): Raw {
  const patched: Raw = { ...s };

  if (!isObject(patched.spaceNationsState)) {
    patched.spaceNationsState = {
      cosmicCredibility:   20,
      auroraSupport:       15,
      obscuriumCorruption: 10,
      councilAttention:    0,
      lastCouncilVoteAt:   0,
      discovered:          false,
      discoveryStage:      "hidden",
    };
    warnings.push("v3→v4: spaceNationsState defaulted");
  }

  return { ...patched, version: 4 };
}

/**
 * V4 → V5
 * Adds orionCityState (La Cité d'Orion layer).
 */
function migrateV4ToV5(s: Raw, warnings: string[]): Raw {
  const patched: Raw = { ...s };

  if (!isObject(patched.orionCityState)) {
    patched.orionCityState = {
      discovered:         false,
      orionStanding:      0,
      accessLevel:        "inconnu",
      auroraEmbassyTrust: 10,
      obscuriumTrace:     0,
      lastVisitAt:        0,
      knownDistricts:     [],
    };
    warnings.push("v4→v5: orionCityState defaulted");
  }

  return { ...patched, version: 5 };
}

// ── Sanitize pass ─────────────────────────────────────────────────────────────
// Runs after all migrations to fix corrupt numeric values and repair sub-objects.
// Never resets a field to zero if it had a plausible value.

function sanitize(s: Raw, warnings: string[]): Raw {
  const patched: Raw = { ...s };

  // Resources: ensure all keys are finite non-negative numbers
  if (isObject(patched.resources)) {
    const res = { ...(patched.resources as Record<string, unknown>) };
    for (const key of Object.keys(DEFAULT_RESOURCES) as (keyof typeof DEFAULT_RESOURCES)[]) {
      if (typeof res[key] !== "number" || !isFinite(res[key] as number) || (res[key] as number) < 0) {
        warnings.push(`sanitize: resources.${key} was corrupt, reset to 0`);
        res[key] = 0;
      }
    }
    patched.resources = res;
  }

  // National indicators: clamp to valid ranges
  if (isObject(patched.nationalIndicators)) {
    const ind = { ...(patched.nationalIndicators as Record<string, unknown>) };
    const clamp01 = (v: unknown, d: number) =>
      typeof v === "number" && isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : d;
    ind.popularity   = clamp01(ind.popularity,   DEFAULT_INDICATORS.popularity);
    ind.economy      = clamp01(ind.economy,       DEFAULT_INDICATORS.economy);
    ind.security     = clamp01(ind.security,      DEFAULT_INDICATORS.security);
    ind.ecology      = clamp01(ind.ecology,       DEFAULT_INDICATORS.ecology);
    ind.cohesion     = clamp01(ind.cohesion,      DEFAULT_INDICATORS.cohesion);
    // publicBudget: -150 to +100
    ind.publicBudget = typeof ind.publicBudget === "number" && isFinite(ind.publicBudget)
      ? Math.min(100, Math.max(-150, Math.round(ind.publicBudget)))
      : DEFAULT_INDICATORS.publicBudget;
    patched.nationalIndicators = ind;
  }

  // Hidden politics: clamp 0-100
  if (isObject(patched.hiddenPolitics)) {
    const hp = { ...(patched.hiddenPolitics as Record<string, unknown>) };
    for (const key of Object.keys(DEFAULT_HIDDEN_POLITICS) as (keyof typeof DEFAULT_HIDDEN_POLITICS)[]) {
      if (typeof hp[key] !== "number" || !isFinite(hp[key] as number)) {
        warnings.push(`sanitize: hiddenPolitics.${key} was corrupt, reset to default`);
        hp[key] = DEFAULT_HIDDEN_POLITICS[key];
      } else {
        hp[key] = Math.min(100, Math.max(0, Math.round(hp[key] as number)));
      }
    }
    patched.hiddenPolitics = hp;
  }

  // News: ensure log, seenIds, pendingIds are arrays
  if (isObject(patched.news)) {
    const news = { ...(patched.news as Record<string, unknown>) };
    if (!Array.isArray(news.log))        { news.log = []; warnings.push("sanitize: news.log reset"); }
    if (!Array.isArray(news.seenIds))    news.seenIds = [];
    if (!Array.isArray(news.pendingIds)) news.pendingIds = [];
    if (typeof news.actionCount !== "number" || !isFinite(news.actionCount)) news.actionCount = 0;
    if (typeof news.unreadCount !== "number" || !isFinite(news.unreadCount)) news.unreadCount = 0;
    patched.news = news;
  }

  // Relations: ensure each entry has operationCooldowns
  if (Array.isArray(patched.relations)) {
    patched.relations = (patched.relations as unknown[]).map((r) => {
      if (!isObject(r as unknown)) return r;
      const rel = r as Raw;
      if (!isObject(rel.operationCooldowns)) {
        return { ...rel, operationCooldowns: {} };
      }
      return rel;
    });
  }

  // mandateDay / nationalDebt: can't be negative or non-finite
  if (typeof patched.mandateDay !== "number" || !isFinite(patched.mandateDay)) patched.mandateDay = 0;
  patched.mandateDay = Math.max(0, Math.round(patched.mandateDay as number));

  if (typeof patched.nationalDebt !== "number" || !isFinite(patched.nationalDebt)) patched.nationalDebt = 30;
  patched.nationalDebt = Math.min(500, Math.max(0, Math.round(patched.nationalDebt as number)));

  if (typeof patched.oppositionPower !== "number" || !isFinite(patched.oppositionPower)) patched.oppositionPower = 35;
  patched.oppositionPower = Math.min(100, Math.max(0, Math.round(patched.oppositionPower as number)));

  return patched;
}

// ── Recovery fallback ─────────────────────────────────────────────────────────
// Builds the safest possible minimal state from whatever partial data we have.
// Used only when the save is unrecoverable (missing playerName, resources, etc.)

function buildRecoveryFallback(raw: unknown): StrategyGameState {
  const partial = isObject(raw) ? raw : {};
  const now = Date.now();
  return {
    version:            CURRENT_SAVE_VERSION,
    playerName:         safeString(partial.playerName, "Président"),
    countryId:          "france" as const,
    resources:          { ...DEFAULT_RESOURCES },
    buildings:          [],
    stats:              { ...DEFAULT_STATS, seasonStartTime: now },
    relations:          [],
    missions:           [],
    news:               { ...DEFAULT_NEWS_STATE },
    lastResourceTick:   now,
    lastBotUpdate:      now,
    ranking:            [],
    startedAt:          safeNumber(partial.startedAt, now),
    nationalIndicators: { ...DEFAULT_INDICATORS },
    mandateDay:         safeNumber(partial.mandateDay, 0),
    lastPollShownAt:    0,
    lastBilanShownAt:   0,
    hiddenPolitics:     { ...DEFAULT_HIDDEN_POLITICS },
    delayedConsequences:  [],
    campaignPromises:     defaultPromises() as StrategyGameState["campaignPromises"],
    governanceDoctrine:   "democratique",
    reforms:              [],
    strategyMinisters:    defaultMinisters(),
    nationalDebt:         30,
    achievements:         [],
    playerUnits:          [],
    trainingQueue:        [],
    militaryDoctrine:     "defensive",
    premiumGold:          0,
    publicMemory:         { traces: [] },
    oppositionPower:      35,
    realTime:             { ...DEFAULT_REALTIME_STATE },
    strategyResearch:     { ...DEFAULT_RESEARCH_STATE },
    dailyLoginReward:     { lastLoginRewardAt: 0, currentStreak: 0, totalDaysClaimed: 0 },
    cosmicInfluence:      { auroria: 10, obscurium: 10, lastCosmicEventAt: 0, discovered: false },
    spaceNationsState:    { cosmicCredibility: 20, auroraSupport: 15, obscuriumCorruption: 10, councilAttention: 0, lastCouncilVoteAt: 0, discovered: false, discoveryStage: "hidden" },
    orionCityState:       { discovered: false, orionStanding: 0, accessLevel: "inconnu", auroraEmbassyTrust: 10, obscuriumTrace: 0, lastVisitAt: 0, knownDistricts: [] },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Migrates any save — old, partial, or corrupt — to CURRENT_SAVE_VERSION.
 *
 * @returns MigrationResult with warnings and usedFallback flag.
 *          Never throws. Returns null only if `raw` is not even a JSON object.
 */
export function migrateSave(raw: unknown): MigrationResult | null {
  if (!isObject(raw)) return null;

  const warnings: string[] = [];
  const startVersion = typeof raw.version === "number" ? raw.version : 0;

  try {
    let s: Raw = { ...raw };

    // Step through the migration chain
    if (startVersion < 1) s = migrateV0ToV1(s, warnings);
    if ((s.version as number) < 2) s = migrateV1ToV2(s, warnings);
    if ((s.version as number) < 3) s = migrateV2ToV3(s, warnings);
    if ((s.version as number) < 4) s = migrateV3ToV4(s, warnings);
    if ((s.version as number) < 5) s = migrateV4ToV5(s, warnings);

    // Sanitize pass — fix corrupt values without resetting good data
    s = sanitize(s, warnings);
    s.version = CURRENT_SAVE_VERSION;

    return {
      state:        s as unknown as StrategyGameState,
      migratedFrom: startVersion,
      warnings,
      usedFallback: false,
    };
  } catch (err) {
    // Something catastrophic — build a recovery state
    warnings.push(`Migration failed (${(err as Error)?.message ?? "unknown error"}). Using recovery fallback.`);
    return {
      state:        buildRecoveryFallback(raw),
      migratedFrom: startVersion,
      warnings,
      usedFallback: true,
    };
  }
}

/**
 * True if the save version is current and no migration is needed.
 * Use as a fast path before calling migrateSave.
 */
export function isSaveCurrent(raw: unknown): boolean {
  return isObject(raw) && raw.version === CURRENT_SAVE_VERSION;
}
