/**
 * breakpointEngine.ts — Seuils de rupture des systèmes critiques.
 *
 * 7 systèmes suivis. Chaque système a :
 *   - un stress calculé depuis l'état courant (0-100)
 *   - un seuil de base (fixe)
 *   - une marge de sécurité (modifiée par investissements / crises répétées)
 *   - un statut : stable / tendu / critique / rupture
 *
 * Comportement :
 *   - Rupture : effets directs + alerte disponible dans le journal
 *   - Critique : dégradation lente de la marge (-1 par tick 10 jours)
 *   - Rupture :  dégradation forte (-5 par tick) + cooldown 20 actions
 *   - Stable   : récupération lente (+1 si marge < 0)
 *
 * Visibilité conditionnée au signalNoiseRatio (renseignement).
 * 5 systèmes disposent d'événements de rupture dans data/breakpointEvents.ts.
 */

import type { NewsChoice, StrategyGameState } from "@/types/strategy";
import { getAverageWear } from "@/logic/infrastructureWearEngine";
import { DEFAULT_SIGNAL_NOISE_RATIO } from "@/logic/signalNoiseEngine";

// ── Types exportés ────────────────────────────────────────────────────────────

export type BreakpointSystemId =
  | "grid"
  | "publicTrust"
  | "infrastructure"
  | "cyber"
  | "publicFinance"
  | "socialCohesion"
  | "militaryCommand";

export type BreakpointStatus = "stable" | "tendu" | "critique" | "rupture";

export interface SystemBreakpoint {
  id: BreakpointSystemId;
  label: string;
  stress: number;
  threshold: number;
  margin: number;
  status: BreakpointStatus;
  color: string;
}

export interface BreakpointState {
  margins:      Partial<Record<BreakpointSystemId, number>>;
  lastRuptureAt: Partial<Record<BreakpointSystemId, number>>;
  statuses:     Partial<Record<BreakpointSystemId, BreakpointStatus>>;
}

export const DEFAULT_BREAKPOINT_STATE: BreakpointState = {
  margins:       {},
  lastRuptureAt: {},
  statuses:      {},
};

// ── Définitions des systèmes ──────────────────────────────────────────────────

interface SystemDef {
  id: BreakpointSystemId;
  label: string;
  baseThreshold: number;
  computeStress: (s: StrategyGameState) => number;
  onRupture: (s: StrategyGameState) => StrategyGameState;
}

const SYSTEMS: SystemDef[] = [
  {
    id: "grid",
    label: "Réseau électrique",
    baseThreshold: 70,
    computeStress: (s) => Math.max(0, Math.min(100, 100 - (s.gridStability ?? 60))),
    onRupture: (s) => ({
      ...s,
      resources: {
        ...s.resources,
        energy:      Math.max(0, s.resources.energy - 200),
        cyberDefense: Math.max(0, s.resources.cyberDefense - 15),
      },
      nationalIndicators: {
        ...s.nationalIndicators,
        popularity: Math.max(0, s.nationalIndicators.popularity - 5),
      },
    }),
  },
  {
    id: "publicTrust",
    label: "Confiance publique",
    baseThreshold: 65,
    computeStress: (s) => Math.max(0, Math.min(100,
      (100 - s.nationalIndicators.popularity) * 0.5 +
      (s.hiddenPolitics?.popularFatigue ?? 15) * 0.5,
    )),
    onRupture: (s) => ({
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        popularity: Math.max(0, s.nationalIndicators.popularity - 10),
      },
      hiddenPolitics: {
        ...s.hiddenPolitics,
        eliteTrust: Math.max(0, (s.hiddenPolitics?.eliteTrust ?? 65) - 10),
        mediaMood:   Math.max(0, (s.hiddenPolitics?.mediaMood   ?? 55) -  8),
      },
    }),
  },
  {
    id: "infrastructure",
    label: "Infrastructures",
    baseThreshold: 75,
    computeStress: (s) => Math.max(0, Math.min(100, getAverageWear(s))),
    onRupture: (s) => ({
      ...s,
      resources: {
        ...s.resources,
        energy: Math.max(0, s.resources.energy - 120),
      },
      hiddenPolitics: {
        ...s.hiddenPolitics,
        institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - 12),
      },
    }),
  },
  {
    id: "cyber",
    label: "Cyberdéfense",
    baseThreshold: 65,
    computeStress: (s) => Math.max(0, Math.min(100, 90 - s.resources.cyberDefense)),
    onRupture: (s) => ({
      ...s,
      resources: {
        ...s.resources,
        intelligence: Math.max(0, s.resources.intelligence - 30),
        cyberDefense: Math.max(0, s.resources.cyberDefense - 20),
      },
    }),
  },
  {
    id: "publicFinance",
    label: "Finances publiques",
    baseThreshold: 70,
    computeStress: (s) => Math.max(0, Math.min(100,
      (s.nationalDebt ?? 30) * 0.6 +
      Math.max(0, -(s.nationalIndicators.publicBudget ?? 20)) * 0.5,
    )),
    onRupture: (s) => ({
      ...s,
      resources: {
        ...s.resources,
        money: Math.max(0, s.resources.money - 1000),
      },
      hiddenPolitics: {
        ...s.hiddenPolitics,
        institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - 10),
      },
    }),
  },
  {
    id: "socialCohesion",
    label: "Cohésion sociale",
    baseThreshold: 65,
    computeStress: (s) => Math.max(0, Math.min(100,
      (100 - s.nationalIndicators.cohesion) * 0.6 +
      (s.hiddenPolitics?.popularFatigue ?? 15) * 0.4,
    )),
    onRupture: (s) => ({
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        cohesion:   Math.max(0, s.nationalIndicators.cohesion - 8),
        popularity: Math.max(0, s.nationalIndicators.popularity - 5),
      },
    }),
  },
  {
    id: "militaryCommand",
    label: "Commandement militaire",
    baseThreshold: 70,
    computeStress: (s) => Math.max(0, Math.min(100,
      (100 - Math.min(100, s.resources.military * 0.5)) * 0.5 +
      (100 - (s.hiddenPolitics?.institutionalStability ?? 70)) * 0.5,
    )),
    onRupture: (s) => ({
      ...s,
      resources: {
        ...s.resources,
        military:     Math.max(0, s.resources.military - 30),
        intelligence: Math.max(0, s.resources.intelligence - 20),
      },
    }),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(stress: number, effectiveThreshold: number): BreakpointStatus {
  if (stress >= effectiveThreshold)          return "rupture";
  if (stress >= effectiveThreshold * 0.83)   return "critique";
  if (stress >= effectiveThreshold * 0.65)   return "tendu";
  return "stable";
}

function statusColor(status: BreakpointStatus): string {
  switch (status) {
    case "rupture":  return "#e54848";
    case "critique": return "#e8864f";
    case "tendu":    return "#e8c44f";
    default:         return "#4caf82";
  }
}

// ── Calcul des breakpoints ────────────────────────────────────────────────────

export function computeBreakpoints(state: StrategyGameState): SystemBreakpoint[] {
  const bp = state.breakpoints ?? DEFAULT_BREAKPOINT_STATE;
  return SYSTEMS.map((def) => {
    const margin    = bp.margins[def.id] ?? 0;
    const threshold = Math.max(40, def.baseThreshold + margin);
    const stress    = def.computeStress(state);
    const status    = getStatus(stress, threshold);
    return { id: def.id, label: def.label, stress, threshold, margin, status, color: statusColor(status) };
  });
}

// ── Visibilité conditionnée au renseignement ──────────────────────────────────

export function getVisibleBreakpoints(state: StrategyGameState): SystemBreakpoint[] {
  const all = computeBreakpoints(state);
  const snr = state.signalNoiseRatio ?? DEFAULT_SIGNAL_NOISE_RATIO;
  if (snr >= 60) return all;
  if (snr >= 40) return all.filter((b) => b.status === "critique" || b.status === "rupture");
  return all.filter((b) => b.status === "rupture");
}

// ── Tick (par 10 jours) ───────────────────────────────────────────────────────

const RUPTURE_COOLDOWN = 20;

export function tickBreakpoints(state: StrategyGameState): StrategyGameState {
  const bp          = state.breakpoints ?? DEFAULT_BREAKPOINT_STATE;
  const actionCount = state.news.actionCount;
  const breakpoints = computeBreakpoints(state);

  let next = state;
  const newMargins   = { ...bp.margins };
  const newLastRup   = { ...bp.lastRuptureAt };
  const newStatuses: Partial<Record<BreakpointSystemId, BreakpointStatus>> = {};

  for (const bk of breakpoints) {
    const def          = SYSTEMS.find((d) => d.id === bk.id)!;
    const lastRup      = bp.lastRuptureAt[bk.id] ?? -999;
    const cooldownOk   = actionCount - lastRup >= RUPTURE_COOLDOWN;

    newStatuses[bk.id] = bk.status;

    if (bk.status === "rupture" && cooldownOk) {
      next              = def.onRupture(next);
      newMargins[bk.id] = Math.max(-20, (newMargins[bk.id] ?? 0) - 5);
      newLastRup[bk.id] = actionCount;
    } else if (bk.status === "critique") {
      newMargins[bk.id] = Math.max(-20, (newMargins[bk.id] ?? 0) - 1);
    } else if (bk.status === "stable") {
      const cur = newMargins[bk.id] ?? 0;
      if (cur < 0) newMargins[bk.id] = Math.min(0, cur + 1);
    }
  }

  return {
    ...next,
    breakpoints: { margins: newMargins, lastRuptureAt: newLastRup, statuses: newStatuses },
  };
}

// ── Renforcement des marges par les bons investissements ──────────────────────

export function reinforceBreakpointMargins(
  state: StrategyGameState,
  choice: NewsChoice,
): StrategyGameState {
  const bp      = state.breakpoints ?? DEFAULT_BREAKPOINT_STATE;
  const margins = { ...bp.margins };
  let changed   = false;

  const boost = (id: BreakpointSystemId, delta: number) => {
    margins[id] = Math.min(30, (margins[id] ?? 0) + delta);
    changed = true;
  };

  if ((choice.effects?.energy      ?? 0) >= 80)  boost("grid",            3);
  if ((choice.effects?.energy      ?? 0) >= 150) boost("grid",            2); // cumule
  if ((choice.effects?.cyberDefense ?? 0) >= 15) boost("cyber",           4);
  if ((choice.wearReduction        ?? 0) >= 10)  boost("infrastructure",  3);
  if ((choice.effects?.technology  ?? 0) >= 8)   boost("infrastructure",  2);
  if ((choice.indicatorEffects?.popularity ?? 0) >= 4)  boost("publicTrust",   3);
  if ((choice.hiddenPoliticsEffects?.eliteTrust  ?? 0) >= 5)  boost("publicTrust", 2);
  if ((choice.indicatorEffects?.cohesion ?? 0) >= 3)    boost("socialCohesion", 3);
  if ((choice.hiddenPoliticsEffects?.popularFatigue ?? 0) <= -4) boost("socialCohesion", 2);
  if ((choice.effects?.military    ?? 0) >= 20)  boost("militaryCommand", 3);
  if ((choice.hiddenPoliticsEffects?.institutionalStability ?? 0) >= 5) boost("militaryCommand", 2);
  if (
    (choice.effects?.money ?? 0) >= 400 &&
    (choice.indicatorEffects?.publicBudget ?? 0) >= 2
  ) boost("publicFinance", 3);

  if (!changed) return state;
  return { ...state, breakpoints: { ...bp, margins } };
}
