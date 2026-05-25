/**
 * Moteur du bac à sable développeur.
 * Fonctions pures : chaque mutation retourne un nouvel état sans effets de bord.
 * Ne jamais appeler ces fonctions depuis le code de production.
 */

import type { StrategyGameState, ResourceKey } from "@/types/strategy";
import { BUILDINGS } from "@/data/buildings";
import { STRATEGY_RESEARCH_LIST } from "@/data/strategyResearch";
import { NEWS_EVENTS } from "@/data/newsEvents";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Temps ─────────────────────────────────────────────────────────────────────

export function advanceDays(state: StrategyGameState, days: number): StrategyGameState {
  return { ...state, mandateDay: state.mandateDay + days };
}

export function advanceActions(state: StrategyGameState, n: number): StrategyGameState {
  return {
    ...state,
    news: { ...state.news, actionCount: state.news.actionCount + n },
  };
}

// ── Ressources ────────────────────────────────────────────────────────────────

export function addResource(
  state: StrategyGameState,
  key: ResourceKey,
  amount: number,
): StrategyGameState {
  return {
    ...state,
    resources: {
      ...state.resources,
      [key]: Math.max(0, (state.resources[key] ?? 0) + amount),
    },
  };
}

export function maxAllResources(state: StrategyGameState): StrategyGameState {
  const MAX = 99_999;
  return {
    ...state,
    resources: {
      money:        MAX,
      influence:    MAX,
      energy:       MAX,
      intelligence: MAX,
      technology:   MAX,
      military:     MAX,
      cyberDefense: MAX,
    },
  };
}

// ── Indicateurs nationaux ─────────────────────────────────────────────────────

type IndicatorKey = keyof StrategyGameState["nationalIndicators"];

export function setIndicator(
  state: StrategyGameState,
  key: IndicatorKey,
  value: number,
): StrategyGameState {
  return {
    ...state,
    nationalIndicators: {
      ...state.nationalIndicators,
      [key]: clamp(value, -150, 100),
    },
  };
}

export function maxAllIndicators(state: StrategyGameState): StrategyGameState {
  const ind = state.nationalIndicators;
  const maxed: typeof ind = {} as typeof ind;
  for (const k of Object.keys(ind) as IndicatorKey[]) {
    maxed[k] = 100;
  }
  return { ...state, nationalIndicators: maxed };
}

// ── Bâtiments ─────────────────────────────────────────────────────────────────

export function unlockAllBuildings(state: StrategyGameState): StrategyGameState {
  return {
    ...state,
    buildings: state.buildings.map((b) => {
      const def = BUILDINGS[b.id as keyof typeof BUILDINGS];
      const maxLevel = def?.maxLevel ?? b.level;
      return {
        ...b,
        level: maxLevel,
        upgradeEndTime:        null,
        upgradeStartTime:      null,
        upgradeEndsAtGameHour: null,
      };
    }),
  };
}

export function completeAllTimers(state: StrategyGameState): StrategyGameState {
  return {
    ...state,
    buildings: state.buildings.map((b) => ({
      ...b,
      upgradeEndTime:        null,
      upgradeStartTime:      null,
      upgradeEndsAtGameHour: null,
    })),
  };
}

// ── Recherche ─────────────────────────────────────────────────────────────────

export function completeAllResearch(state: StrategyGameState): StrategyGameState {
  const allIds = STRATEGY_RESEARCH_LIST.map((r) => r.id);
  const existing = state.strategyResearch ?? { completed: [], inProgress: null };
  return {
    ...state,
    strategyResearch: { ...existing, completed: allIds, inProgress: null },
  };
}

// ── Unités ────────────────────────────────────────────────────────────────────

export function completeAllTraining(state: StrategyGameState): StrategyGameState {
  return {
    ...state,
    trainingQueue: state.trainingQueue.map((t) => ({
      ...t,
      status: "completed" as const,
    })),
  };
}

// ── Crises ────────────────────────────────────────────────────────────────────

type CrisisUrgency = "faible" | "moyenne" | "forte" | "critique";

export function triggerCrisis(
  state: StrategyGameState,
  urgency: CrisisUrgency,
): StrategyGameState {
  const pending = new Set(state.news.pendingIds);
  const seen    = new Set(state.news.seenIds);
  const candidate = NEWS_EVENTS.find(
    (e) => e.urgency === urgency && !pending.has(e.id) && !seen.has(e.id),
  );
  if (!candidate) return state;
  return {
    ...state,
    news: {
      ...state.news,
      pendingIds:  [...state.news.pendingIds, candidate.id],
      unreadCount: state.news.unreadCount + 1,
    },
  };
}

export function triggerInteractiveCrisis(state: StrategyGameState): StrategyGameState {
  const pending = new Set(state.news.pendingIds);
  const seen    = new Set(state.news.seenIds);
  const candidate = NEWS_EVENTS.find(
    (e) => e.isInteractive && !pending.has(e.id) && !seen.has(e.id),
  );
  if (!candidate) return state;
  return {
    ...state,
    news: {
      ...state.news,
      pendingIds:  [...state.news.pendingIds, candidate.id],
      unreadCount: state.news.unreadCount + 1,
    },
  };
}

export function clearPendingCrises(state: StrategyGameState): StrategyGameState {
  return {
    ...state,
    news: {
      ...state.news,
      seenIds:     [...state.news.seenIds, ...state.news.pendingIds],
      pendingIds:  [],
      unreadCount: 0,
    },
  };
}

// ── Multijoueur / Diplomatie ───────────────────────────────────────────────────

export function simulateAllianceInvitation(state: StrategyGameState): StrategyGameState {
  let changed = false;
  return {
    ...state,
    relations: state.relations.map((r) => {
      if (!changed && r.status === "neutral") {
        changed = true;
        return { ...r, status: "friendly" as const };
      }
      return r;
    }),
  };
}

export function simulateActiveAlliance(state: StrategyGameState): StrategyGameState {
  let changed = false;
  return {
    ...state,
    relations: state.relations.map((r) => {
      if (!changed && (r.status === "neutral" || r.status === "friendly")) {
        changed = true;
        return { ...r, status: "allied" as const };
      }
      return r;
    }),
  };
}

export function simulateSpyResult(
  state: StrategyGameState,
  result: "success" | "blocked" | "failed",
): StrategyGameState {
  // TODO: écrire dans le journal spy-ops officiel quand la structure sera stable
  const label =
    result === "success"
      ? "Espionnage réussi [SANDBOX]"
      : result === "blocked"
        ? "Espionnage bloqué [SANDBOX]"
        : "Espionnage échoué [SANDBOX]";

  const entry = {
    id:        `sandbox_spy_${Date.now()}`,
    type:      "intelligence",
    title:     label,
    body:      `Simulation bac à sable — résultat : ${result}.`,
    timestamp: Date.now(),
    read:      false,
  };

  return {
    ...state,
    news: {
      ...state.news,
      log: [entry as never, ...state.news.log],
    },
  };
}
