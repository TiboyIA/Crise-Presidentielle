import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FinalDebateStrategy } from "@/types/game";
import { coerceStrategy } from "@/lib/finalDebate";

/**
 * Chantier 2 — Persistent cross-game telemetry.
 *
 * Lightweight, AsyncStorage-only stats: totals, victory rate, defeat
 * causes, average turns survived, vote-share, debate strategy use.
 * Stored under its OWN key so it survives a save reset and never
 * clutters the GameState payload.
 */

const STATS_KEY = "etat_de_crise_stats_v1";

export type DefeatReason =
  | "popularity_collapse"
  | "cohesion_collapse"
  | "authority_collapse"
  | "security_collapse"
  | "budget_collapse"
  | "debt_explosion"
  | "lost_election"
  | "max_turns"
  | "other";

export interface GameStats {
  totalGames: number;
  victories: number;
  defeats: number;
  defeatReasons: Record<DefeatReason, number>;
  /** Sum of all "turn at which the run ended". Average = sum / totalGames. */
  turnsSum: number;
  /** Cumulative vote-share across all elections played. */
  voteShareSum: number;
  voteShareCount: number;
  strategyPicks: Record<FinalDebateStrategy, number>;
  lastUpdated: number;
  /**
   * Persistent dedupe: the mandate key (`name_startedAt`) of the LAST
   * recorded run. If the player reloads a finished game, we skip the
   * record because this key already matches. Set inside record* APIs.
   */
  lastRecordedMandateKey: string | null;
}

const EMPTY_STATS: GameStats = {
  totalGames: 0,
  victories: 0,
  defeats: 0,
  defeatReasons: {
    popularity_collapse: 0,
    cohesion_collapse: 0,
    authority_collapse: 0,
    security_collapse: 0,
    budget_collapse: 0,
    debt_explosion: 0,
    lost_election: 0,
    max_turns: 0,
    other: 0,
  },
  turnsSum: 0,
  voteShareSum: 0,
  voteShareCount: 0,
  strategyPicks: {
    calm: 0,
    aggressive: 0,
    ironic: 0,
    factual: 0,
    emotional: 0,
    evasive: 0,
  },
  lastUpdated: 0,
  lastRecordedMandateKey: null,
};

function deepEmpty(): GameStats {
  return {
    ...EMPTY_STATS,
    defeatReasons: { ...EMPTY_STATS.defeatReasons },
    strategyPicks: { ...EMPTY_STATS.strategyPicks },
  };
}

/**
 * R7 migration — anciens IDs (assume/deny/explain/divert/counter)
 * vers les nouveaux 6 (calm/aggressive/ironic/factual/emotional/evasive).
 * Préserve les compteurs accumulés dans les sauvegardes pré-R7.
 */
const LEGACY_PICK_MAP: Record<string, FinalDebateStrategy> = {
  assume: "emotional",
  counter: "aggressive",
  explain: "factual",
  divert: "evasive",
  deny: "evasive",
};

function migrateStrategyPicks(
  raw: unknown,
  base: Record<FinalDebateStrategy, number>,
): Record<FinalDebateStrategy, number> {
  const out = { ...base };
  if (!raw || typeof raw !== "object") return out;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof val === "number" && Number.isFinite(val) ? val : 0;
    if (key in out) {
      out[key as FinalDebateStrategy] += n;
    } else if (key in LEGACY_PICK_MAP) {
      out[LEGACY_PICK_MAP[key]!] += n;
    }
  }
  return out;
}

function mergeWithDefaults(raw: unknown): GameStats {
  const base = deepEmpty();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<GameStats>;
  return {
    totalGames: typeof r.totalGames === "number" ? r.totalGames : 0,
    victories: typeof r.victories === "number" ? r.victories : 0,
    defeats: typeof r.defeats === "number" ? r.defeats : 0,
    defeatReasons: { ...base.defeatReasons, ...(r.defeatReasons ?? {}) },
    turnsSum: typeof r.turnsSum === "number" ? r.turnsSum : 0,
    voteShareSum: typeof r.voteShareSum === "number" ? r.voteShareSum : 0,
    voteShareCount: typeof r.voteShareCount === "number" ? r.voteShareCount : 0,
    strategyPicks: migrateStrategyPicks(r.strategyPicks, base.strategyPicks),
    lastUpdated: typeof r.lastUpdated === "number" ? r.lastUpdated : 0,
    lastRecordedMandateKey:
      typeof r.lastRecordedMandateKey === "string"
        ? r.lastRecordedMandateKey
        : null,
  };
}

export async function loadStats(): Promise<GameStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (!raw) return deepEmpty();
    return mergeWithDefaults(JSON.parse(raw));
  } catch (e) {
    console.warn("Stats load failed:", e);
    return deepEmpty();
  }
}

async function persist(stats: GameStats): Promise<void> {
  try {
    stats.lastUpdated = Date.now();
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("Stats save failed:", e);
  }
}

export async function recordDefeat(
  reason: DefeatReason,
  turn: number,
  mandateKey: string,
): Promise<GameStats> {
  const stats = await loadStats();
  // Cross-reload dedupe: if the same finished mandate was already
  // persisted (e.g. the player just reopened the app on a game-over
  // save), skip the increment.
  if (stats.lastRecordedMandateKey === mandateKey) return stats;
  stats.totalGames += 1;
  stats.defeats += 1;
  stats.defeatReasons[reason] = (stats.defeatReasons[reason] ?? 0) + 1;
  stats.turnsSum += Math.max(0, turn);
  stats.lastRecordedMandateKey = mandateKey;
  await persist(stats);
  return stats;
}

export async function recordElection(opts: {
  reElected: boolean;
  voteShare: number;
  strategies: FinalDebateStrategy[];
  turn: number;
  mandateKey: string;
}): Promise<GameStats> {
  const stats = await loadStats();
  if (stats.lastRecordedMandateKey === opts.mandateKey) return stats;
  stats.totalGames += 1;
  if (opts.reElected) stats.victories += 1;
  else {
    stats.defeats += 1;
    stats.defeatReasons.lost_election =
      (stats.defeatReasons.lost_election ?? 0) + 1;
  }
  stats.turnsSum += Math.max(0, opts.turn);
  if (Number.isFinite(opts.voteShare)) {
    stats.voteShareSum += opts.voteShare;
    stats.voteShareCount += 1;
  }
  for (const s of opts.strategies) {
    const key = coerceStrategy(s);
    stats.strategyPicks[key] = (stats.strategyPicks[key] ?? 0) + 1;
  }
  stats.lastRecordedMandateKey = opts.mandateKey;
  await persist(stats);
  return stats;
}

export async function resetStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_KEY);
  } catch (e) {
    console.warn("Stats reset failed:", e);
  }
}

/**
 * Map a `gameOver.reason` string from `endings.ts` to a DefeatReason.
 * Heuristic — if no match, falls back to "other".
 */
export function inferDefeatReason(reason?: string): DefeatReason {
  if (!reason) return "other";
  const r = reason.toLowerCase();
  if (r.includes("popularité") || r.includes("popularite")) {
    return "popularity_collapse";
  }
  if (r.includes("cohésion") || r.includes("cohesion")) {
    return "cohesion_collapse";
  }
  if (r.includes("autorité") || r.includes("autorite")) {
    return "authority_collapse";
  }
  if (r.includes("sécurité") || r.includes("securite")) {
    return "security_collapse";
  }
  if (r.includes("budget") || r.includes("faillite")) {
    return "budget_collapse";
  }
  if (r.includes("dette")) return "debt_explosion";
  if (r.includes("élection") || r.includes("election")) return "lost_election";
  if (r.includes("mandat") || r.includes("fin")) return "max_turns";
  return "other";
}

export const DEFEAT_REASON_LABELS: Record<DefeatReason, string> = {
  popularity_collapse: "Popularité effondrée",
  cohesion_collapse: "Cohésion brisée",
  authority_collapse: "Autorité perdue",
  security_collapse: "Sécurité effondrée",
  budget_collapse: "Faillite budgétaire",
  debt_explosion: "Dette hors de contrôle",
  lost_election: "Battu aux urnes",
  max_turns: "Fin de mandat",
  other: "Autre",
};

export const STRATEGY_LABELS: Record<FinalDebateStrategy, string> = {
  calm: "Calme",
  aggressive: "Agressive",
  ironic: "Ironique",
  factual: "Factuelle",
  emotional: "Émotionnelle",
  evasive: "Esquive",
};
