import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import type { StrategyGameState, StrategyMinister } from "@/types/strategy";

// ── Seuils & tiers ────────────────────────────────────────────────────────────

export type FatigueTier = "normal" | "tension" | "risque" | "burnout";

export interface FatigueTierInfo {
  tier: FatigueTier;
  label: string;
  color: string;
}

export function getFatigueTier(fatigue: number): FatigueTierInfo {
  if (fatigue > 80) return { tier: "burnout", label: "Épuisement",       color: "#e54848" };
  if (fatigue > 60) return { tier: "risque",  label: "Risque d'erreur",  color: "#f59a3a" };
  if (fatigue > 30) return { tier: "tension", label: "En tension",       color: "#e8a93a" };
  return               { tier: "normal",  label: "Normal",          color: "#3fbe7a" };
}

// ── Calcul du delta par ministre ──────────────────────────────────────────────

function countCrisesByUrgency(pendingIds: string[]): { critical: number; high: number } {
  let critical = 0, high = 0;
  for (const id of pendingIds) {
    const ev = NEWS_EVENT_MAP[id];
    if (!ev) continue;
    if (ev.urgency === "critique") critical++;
    else if (ev.urgency === "forte") high++;
  }
  return { critical, high };
}

function computeFatigueDelta(
  minister: StrategyMinister,
  critical: number,
  high: number,
): number {
  // Période calme → récupération naturelle
  if (critical === 0 && high === 0) {
    return minister.loyalty >= 70 ? -3 : -2;
  }

  // Charge de crise — capped pour éviter les pics impossibles
  const criticalLoad = Math.min(critical, 3) * 3;    // max +9
  const highLoad     = Math.min(high, 3) * 1.5;      // max +4.5
  const rawLoad      = criticalLoad + highLoad;

  // Compétence élevée = meilleure absorption de la charge
  const modifier =
    minister.competence >= 70 ? 0.60 :
    minister.competence >= 50 ? 0.80 : 1.00;

  return Math.round(rawLoad * modifier);
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickMinisterFatigue(
  state: StrategyGameState,
): StrategyGameState {
  const { critical, high } = countCrisesByUrgency(state.news.pendingIds);
  const current = state.ministerFatigue ?? {};
  const next: Record<string, number> = {};

  for (const minister of state.strategyMinisters) {
    const prev  = current[minister.id] ?? 0;
    const delta = computeFatigueDelta(minister, critical, high);
    next[minister.id] = Math.min(100, Math.max(0, prev + delta));
  }

  return { ...state, ministerFatigue: next };
}

// ── Actions du joueur ─────────────────────────────────────────────────────────

/** Repos politique : -25 de fatigue. */
export function applyRestAction(
  state: StrategyGameState,
  ministerId: string,
): StrategyGameState {
  const prev = (state.ministerFatigue ?? {})[ministerId] ?? 0;
  return {
    ...state,
    ministerFatigue: {
      ...(state.ministerFatigue ?? {}),
      [ministerId]: Math.max(0, prev - 25),
    },
  };
}

/** Déléguer : -15 de fatigue. */
export function applyDelegateAction(
  state: StrategyGameState,
  ministerId: string,
): StrategyGameState {
  const prev = (state.ministerFatigue ?? {})[ministerId] ?? 0;
  return {
    ...state,
    ministerFatigue: {
      ...(state.ministerFatigue ?? {}),
      [ministerId]: Math.max(0, prev - 15),
    },
  };
}

// ── Effet sur la probabilité de gaffe ─────────────────────────────────────────

/** Bonus de probabilité de gaffe dû à la fatigue (+0 / +4 / +9). */
export function fatigueToProbabilityBonus(fatigue: number): number {
  if (fatigue > 80) return 9;
  if (fatigue > 60) return 4;
  return 0;
}
