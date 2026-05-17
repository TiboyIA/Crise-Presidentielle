/**
 * economyHealthEngine.ts — Indice de santé économique du jeu (lecture seule, dev only).
 *
 * 6 indices calculés depuis l'état courant + données statiques des buildings/units/missions.
 * Aucune modification de l'économie. Affiché uniquement dans dev-stats.tsx.
 *
 * Conventions d'échelle :
 *   - Tous les indices : 0–100
 *   - Production bâtiments : "par minute de jeu". 1 min réelle = 4 min jeu.
 *   - 1 jour de mandat = 360 min réelles.
 *   - levels[L] = données pour passer du niveau L au niveau L+1.
 *     → production à level L = levels[L-1].production
 */

import { BUILDINGS } from "@/data/buildings";
import { UNITS } from "@/data/units";
import { MISSION_POOL } from "@/data/missions";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import type { StrategyGameState, StrategyResources } from "@/types/strategy";
import type { StrategyResearchId } from "@/types/strategyResearch";

// ── Types publics ─────────────────────────────────────────────────────────────

export type EconomyDiagnosis =
  | "saine"
  | "trop_genereuse"
  | "trop_punitive"
  | "ressource_bloquante"
  | "progression_plate";

export const DIAGNOSIS_LABELS: Record<EconomyDiagnosis, string> = {
  saine:               "Économie saine",
  trop_genereuse:      "Trop généreuse",
  trop_punitive:       "Trop punitive",
  ressource_bloquante: "Ressource bloquante",
  progression_plate:   "Progression plate",
};

export const DIAGNOSIS_COLORS: Record<EconomyDiagnosis, string> = {
  saine:               "#3fbe7a",
  trop_genereuse:      "#f59a3a",
  trop_punitive:       "#e54848",
  ressource_bloquante: "#e8a93a",
  progression_plate:   "#7a8fb5",
};

export interface EconomyHealthIndices {
  /** Argent disponible vs coût médian des prochains upgrades. 0 = pénurie, 100 = excès. */
  moneyInflationIndex:   number;
  /** Rareté des ressources secondaires bloquant les upgrades. 0 = abondant, 100 = critique. */
  resourceScarcityIndex: number;
  /** Récompenses missions vs coûts d'upgrade. 0 = triviales, 100 = trop généreuses. */
  missionRewardPressure: number;
  /** Rentabilité des upgrades bâtiments (temps de retour). 0 = mauvais ROI, 100 = excellent. */
  buildingROI:           number;
  /** Entretien des unités vs revenus. 0 = gratuit, 100 = insoutenable. */
  unitUpkeepPressure:    number;
  /** Accessibilité des recherches strategiques. 0 = inabordable, 100 = trivial. */
  researchAffordability: number;
}

export interface EconomyHealthResult {
  indices:   EconomyHealthIndices;
  diagnosis: EconomyDiagnosis;
  detail:    string;
}

// ── Constantes temporelles ────────────────────────────────────────────────────

const GAME_MINS_PER_REAL_MIN  = 4;   // 1 min réelle = 4 min jeu
const REAL_MINS_PER_MANDATE_DAY = 360; // 1 jour mandat = 360 min réelles

// ── Utilitaires internes ──────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Production d'argent totale de tous les bâtiments (par minute réelle). */
function totalMoneyIncomePerRealMin(state: StrategyGameState): number {
  let total = 0;
  for (const b of state.buildings) {
    if (b.level === 0) continue;
    const prod = BUILDINGS[b.id]?.levels[b.level - 1]?.production.money ?? 0;
    total += prod * GAME_MINS_PER_REAL_MIN;
  }
  return total;
}

// ── Calcul des 6 indices ──────────────────────────────────────────────────────

function moneyInflationIndex(state: StrategyGameState): number {
  // Ratio argent actuel / coût médian des prochains upgrades (composante money uniquement).
  const costs: number[] = [];
  for (const b of state.buildings) {
    const def = BUILDINGS[b.id];
    if (!def || b.level >= def.maxLevel) continue;
    const c = def.levels[b.level]?.cost.money ?? 0;
    if (c > 0) costs.push(c);
  }
  if (costs.length === 0) return 100; // rien à upgrader → argent en excès relatif
  const med = median(costs);
  if (med === 0) return 100;

  // ratio < 0.1 → ≈ 3  |  ratio = 1 → 33  |  ratio = 3 → 100
  return clamp((state.resources.money / med) * 33);
}

function resourceScarcityIndex(state: StrategyGameState): number {
  // Pour chaque ressource secondaire demandée par les prochains upgrades :
  //   scarcity[r] = max(0, 1 − have/need), où need = coût minimal parmi les upgrades concernés.
  const secondaryKeys: (keyof StrategyResources)[] = [
    "influence", "energy", "intelligence", "technology", "military", "cyberDefense",
  ];
  const scarcities: number[] = [];

  for (const key of secondaryKeys) {
    const demands: number[] = [];
    for (const b of state.buildings) {
      const def = BUILDINGS[b.id];
      if (!def || b.level >= def.maxLevel) continue;
      const c = (def.levels[b.level]?.cost as Partial<StrategyResources>)[key] ?? 0;
      if (c > 0) demands.push(c);
    }
    if (demands.length === 0) continue;

    const minDemand = Math.min(...demands);
    const have = (state.resources as unknown as Record<string, number>)[key] ?? 0;
    scarcities.push(Math.max(0, 1 - have / minDemand));
  }

  if (scarcities.length === 0) return 0;
  const avg = scarcities.reduce((s, v) => s + v, 0) / scarcities.length;
  return clamp(avg * 100);
}

function missionRewardPressure(state: StrategyGameState): number {
  // Récompense médiane (argent) des missions vs coût médian des prochains upgrades.
  const rewards = MISSION_POOL.map((m) => m.reward.money ?? 0).filter((v) => v > 0);
  if (rewards.length === 0) return 0;

  const upgradeCosts: number[] = [];
  for (const b of state.buildings) {
    const def = BUILDINGS[b.id];
    if (!def || b.level >= def.maxLevel) continue;
    const c = def.levels[b.level]?.cost.money ?? 0;
    if (c > 0) upgradeCosts.push(c);
  }
  if (upgradeCosts.length === 0) return 50; // neutre si rien à upgrader

  const ratio = median(rewards) / median(upgradeCosts);
  // ratio = 0.02 → ≈ 1  |  0.5 → 25  |  1 → 50  |  2 → 100
  return clamp(ratio * 50);
}

function buildingROI(state: StrategyGameState): number {
  // Temps de retour médian (min réelles) des upgrades money-positifs.
  //   payback = cost.money / (prodDelta × 4)   [prodDelta en par-min-jeu]
  // Excellent (< 10 min) → ROI ≈ 94
  // Médiocre  (60 min)  → ROI ≈ 61
  // Mauvais  (> 130 min) → ROI ≈ 0
  const paybacks: number[] = [];

  for (const b of state.buildings) {
    const def = BUILDINGS[b.id];
    if (!def || b.level >= def.maxLevel) continue;

    const currentProd = (b.level > 0 ? def.levels[b.level - 1]?.production.money : 0) ?? 0;
    const nextProd    = def.levels[b.level]?.production.money ?? 0;
    const delta       = nextProd - currentProd;
    if (delta <= 0) continue; // pas de composante money

    const cost = def.levels[b.level]?.cost.money ?? 0;
    if (cost <= 0) continue;

    paybacks.push(cost / (delta * GAME_MINS_PER_REAL_MIN));
  }

  if (paybacks.length === 0) return 50; // neutre (bâtiments non-money uniquement)
  const med = median(paybacks);
  return clamp(100 - med * 0.65);
}

function unitUpkeepPressure(state: StrategyGameState): number {
  // Rapport entretien journalier (argent) / revenus journaliers.
  let totalUpkeepPerDay = 0;
  for (const pu of state.playerUnits) {
    const def = UNITS[pu.unitId];
    if (!def) continue;
    totalUpkeepPerDay += (def.upkeepPerDay.money ?? 0) * pu.quantity;
  }
  if (totalUpkeepPerDay === 0) return 0;

  const incomePerDay = totalMoneyIncomePerRealMin(state) * REAL_MINS_PER_MANDATE_DAY;
  if (incomePerDay <= 0) return 100;

  return clamp((totalUpkeepPerDay / incomePerDay) * 100);
}

function researchAffordability(state: StrategyGameState): number {
  // Jours nécessaires pour financer la recherche la moins chère restante.
  const completed = state.strategyResearch?.completed ?? [];
  const remainingCosts = Object.entries(STRATEGY_RESEARCH)
    .filter(([id]) => !completed.includes(id as StrategyResearchId))
    .map(([, def]) => def.cost.money ?? 0)
    .filter((v) => v > 0);

  if (remainingCosts.length === 0) return 100;

  const minCost = Math.min(...remainingCosts);
  if (state.resources.money >= minCost) return 100;

  const incomePerDay = totalMoneyIncomePerRealMin(state) * REAL_MINS_PER_MANDATE_DAY;
  if (incomePerDay <= 0) return 0;

  const shortfall    = minCost - state.resources.money;
  const daysToSave   = shortfall / incomePerDay;
  // 0 jours → 100  |  1 jour → ≈ 93  |  5 jours → ≈ 67  |  15 jours → 0
  return clamp(100 - daysToSave * 6.5);
}

// ── Diagnostic ────────────────────────────────────────────────────────────────

function diagnose(i: EconomyHealthIndices): { diagnosis: EconomyDiagnosis; detail: string } {
  // Priorité décroissante : trop_punitive → ressource_bloquante → trop_genereuse → progression_plate → saine

  if (i.moneyInflationIndex < 20 && i.buildingROI < 30) {
    return {
      diagnosis: "trop_punitive",
      detail:    `Inflation ${i.moneyInflationIndex} · ROI ${i.buildingROI} — coûts d'upgrade non rentabilisés.`,
    };
  }

  if (i.resourceScarcityIndex > 65) {
    return {
      diagnosis: "ressource_bloquante",
      detail:    `Rareté ressources ${i.resourceScarcityIndex} — une ou plusieurs ressources secondaires bloquent la progression.`,
    };
  }

  if (i.moneyInflationIndex > 70 && i.missionRewardPressure > 65) {
    return {
      diagnosis: "trop_genereuse",
      detail:    `Inflation ${i.moneyInflationIndex} · missions ${i.missionRewardPressure} — l'argent s'accumule trop rapidement.`,
    };
  }

  if (i.buildingROI < 35 && i.missionRewardPressure < 30) {
    return {
      diagnosis: "progression_plate",
      detail:    `ROI ${i.buildingROI} · missions ${i.missionRewardPressure} — aucun levier n'incite fortement à progresser.`,
    };
  }

  return {
    diagnosis: "saine",
    detail:    `Inflation ${i.moneyInflationIndex} · rareté ${i.resourceScarcityIndex} · ROI ${i.buildingROI} — équilibre nominal.`,
  };
}

// ── API publique ──────────────────────────────────────────────────────────────

export function computeEconomyHealth(state: StrategyGameState): EconomyHealthResult {
  const indices: EconomyHealthIndices = {
    moneyInflationIndex:   moneyInflationIndex(state),
    resourceScarcityIndex: resourceScarcityIndex(state),
    missionRewardPressure: missionRewardPressure(state),
    buildingROI:           buildingROI(state),
    unitUpkeepPressure:    unitUpkeepPressure(state),
    researchAffordability: researchAffordability(state),
  };
  const { diagnosis, detail } = diagnose(indices);
  return { indices, diagnosis, detail };
}
