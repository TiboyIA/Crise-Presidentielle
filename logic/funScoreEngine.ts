/**
 * funScoreEngine.ts — Indicateur local de "fun statistique" (lecture seule, dev only).
 *
 * Mesure si la session en cours est engageante, à un instant T, uniquement depuis
 * l'état courant du jeu. Aucune donnée envoyée au serveur, aucune modification du gameplay.
 *
 * 7 composantes :
 *   progression      (0–25) — bâtiments en cours + recherche + rythme de niveaux
 *   recentRewards    (0–20) — missions à réclamer + taux de succès ops satisfaisant
 *   availableActions (0–20) — actions significatives disponibles maintenant
 *   activeCrisis     (0–15) — crises interactives en attente de résolution
 *   missionMomentum  (0–10) — missions proches d'être complétées
 *   activityVariety  (0–10) — diversité des types d'actions engagées dans ce mandat
 *   waitPressure     (0–15) — déduit : le joueur attend sans rien pouvoir faire
 *
 * Score final = somme des 6 positifs − waitPressure, borné [0, 100].
 */

import { BUILDINGS } from "@/data/buildings";
import { OPERATIONS } from "@/logic/operationEngine";
import { REFORMS } from "@/data/reforms";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import { canAfford, isUnlocked } from "@/logic/buildingEngine";
import { UNITS } from "@/data/units";
import type { StrategyGameState } from "@/types/strategy";
import type { StrategyResearchId } from "@/types/strategyResearch";

// ── Types publics ─────────────────────────────────────────────────────────────

export interface FunFactors {
  /** Momentum de progression : upgrades actifs, recherche, rythme niveaux/jour. */
  progression:      number; // 0–25
  /** Récompenses récentes : missions prêtes à collecter, taux de succès ops. */
  recentRewards:    number; // 0–20
  /** Actions utiles disponibles immédiatement. */
  availableActions: number; // 0–20
  /** Crise interactive en attente de résolution. */
  activeCrisis:     number; // 0–15
  /** Mission ≥ 75 % complète — tension de fin proche. */
  missionMomentum:  number; // 0–10
  /** Diversité des types d'activités engagées (anti-répétition). */
  activityVariety:  number; // 0–10
  /** Pénalité d'attente : tout en queue, aucune action possible. */
  waitPressure:     number; // 0–15 (déduit du score)
}

export type FunBand = "creux" | "terne" | "modere" | "engageant" | "optimal";

export const FUN_BAND_LABELS: Record<FunBand, string> = {
  creux:     "Session creuse",
  terne:     "Session terne",
  modere:    "Modérément engageant",
  engageant: "Session engageante",
  optimal:   "Session optimale",
};

export const FUN_BAND_COLORS: Record<FunBand, string> = {
  creux:     "#e54848",
  terne:     "#f59a3a",
  modere:    "#e8a93a",
  engageant: "#3fbe7a",
  optimal:   "#40e0a0",
};

export interface FunScoreResult {
  score:   number;
  band:    FunBand;
  factors: FunFactors;
  note:    string;
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

// ── Composantes ───────────────────────────────────────────────────────────────

function computeProgression(state: StrategyGameState): number {
  const upgradingCount  = state.buildings.filter((b) => b.upgradeEndTime !== null).length;
  const researchActive  = state.strategyResearch?.inProgress != null ? 1 : 0;
  const totalLevels     = state.buildings.reduce((s, b) => s + b.level, 0);
  const levelsPerDay    = state.mandateDay > 0 ? totalLevels / state.mandateDay : 0;

  return clamp(
    upgradingCount * 5 + researchActive * 8 + Math.min(12, levelsPerDay * 3),
    0, 25,
  );
}

function computeRecentRewards(state: StrategyGameState): number {
  const missionsPending = state.missions.filter((m) => m.completed).length;
  const totalOps = state.stats.totalOperations;
  const winRatio = totalOps > 0 ? state.stats.operationsWon / totalOps : 0;
  const winSatisfaction = totalOps >= 5 && winRatio >= 0.5
    ? 6
    : totalOps >= 3 && winRatio >= 0.6
    ? 4
    : 0;

  return clamp(missionsPending * 8 + winSatisfaction, 0, 20);
}

function computeAvailableActions(state: StrategyGameState): number {
  const now = Date.now();
  let count = 0;

  // Bâtiments : upgrades abordables, non en cours, déverrouillés
  for (const b of state.buildings) {
    const def = BUILDINGS[b.id];
    if (!def || b.level >= def.maxLevel || b.upgradeEndTime !== null) continue;
    if (!isUnlocked(b, state.buildings)) continue;
    const levelCost = def.levels[b.level]?.cost;
    if (levelCost && canAfford(levelCost, state.resources)) count++;
  }

  // Opérations : abordables + bâtiment requis + au moins un pays hors cooldown
  for (const op of Object.values(OPERATIONS)) {
    if (!canAfford(op.cost, state.resources)) continue;
    if (op.requiredBuilding) {
      const b = state.buildings.find((x) => x.id === op.requiredBuilding!.id);
      if (!b || b.level < op.requiredBuilding.level) continue;
    }
    const anyAvailable = state.relations.some((r) => {
      const expiry = r.operationCooldowns[op.id];
      return !expiry || now >= expiry;
    });
    if (anyAvailable) count++;
  }

  // Recherche : pas en cours, prérequis remplis, abordable
  if (!state.strategyResearch?.inProgress) {
    const completed = (state.strategyResearch?.completed ?? []) as StrategyResearchId[];
    for (const [id, def] of Object.entries(STRATEGY_RESEARCH)) {
      if (completed.includes(id as StrategyResearchId)) continue;
      if (!def.prerequisites.every((p) => completed.includes(p))) continue;
      if (canAfford(def.cost, state.resources)) { count += 2; break; } // +2 car décision importante
    }
  }

  // Réformes : non lancées, abordables
  for (const [id, def] of Object.entries(REFORMS)) {
    if (state.reforms.some((r) => r.id === id)) continue;
    if (canAfford(def.cost, state.resources)) { count++; break; } // compter max 1
  }

  // Entraînement d'unités : au moins une unité abordable
  for (const def of Object.values(UNITS)) {
    if (canAfford(def.baseCost, state.resources)) { count++; break; }
  }

  return clamp(count * 3, 0, 20);
}

function computeActiveCrisis(state: StrategyGameState): number {
  const pending = state.news.pendingIds.length;
  return clamp(pending * 10, 0, 15);
}

function computeMissionMomentum(state: StrategyGameState): number {
  const nearDone = state.missions.filter(
    (m) => !m.completed && m.target > 0 && m.progress / m.target >= 0.75,
  ).length;
  return clamp(nearDone * 7, 0, 10);
}

function computeActivityVariety(state: StrategyGameState): number {
  const crisisHandled = state.news.log.filter((e) => e.choiceId).length;
  const types = [
    state.stats.totalOperations > 0,
    state.reforms.length > 0,
    (state.strategyResearch?.completed.length ?? 0) > 0,
    (state.playerUnits?.length ?? 0) > 0,
    crisisHandled > 0,
  ].filter(Boolean).length;

  return clamp(types * 2, 0, 10);
}

function computeWaitPressure(
  state: StrategyGameState,
  availableActions: number,
  activeCrisis: number,
  missionMomentum: number,
): number {
  const hasAnything = availableActions > 0 || activeCrisis > 0 || missionMomentum > 0;
  if (hasAnything) return 0;

  // Joueur bloqué avec des queues actives = attente passive
  const anythingQueued =
    state.buildings.some((b) => b.upgradeEndTime !== null)
    || state.strategyResearch?.inProgress != null
    || (state.trainingQueue?.some((e) => e.status === "training") ?? false);

  if (!anythingQueued) return 0;
  return 12;
}

// ── Bande et note ─────────────────────────────────────────────────────────────

function getBand(score: number): FunBand {
  if (score >= 80) return "optimal";
  if (score >= 60) return "engageant";
  if (score >= 40) return "modere";
  if (score >= 20) return "terne";
  return "creux";
}

function buildNote(f: FunFactors, score: number): string {
  if (f.waitPressure >= 12 && score < 40) {
    return "Toutes les files sont actives mais aucune action n'est disponible — attente passive.";
  }
  if (f.activeCrisis >= 10) {
    return "Crise(s) en attente de résolution — décision à fort impact disponible.";
  }
  if (f.missionMomentum >= 7) {
    return "Mission(s) proches d'être terminées — tension de progression.";
  }
  if (f.progression >= 20) {
    return "Forte dynamique : upgrades et recherche en cours simultanément.";
  }
  if (f.availableActions >= 12) {
    return "Nombreuses actions utiles disponibles maintenant.";
  }
  if (f.recentRewards >= 12) {
    return "Récompenses de missions en attente — pic de satisfaction prévisible.";
  }
  if (f.activityVariety <= 2 && score < 50) {
    return "Activité peu variée — envisager une opération, réforme ou recherche.";
  }
  if (score >= 70) {
    return "Session bien équilibrée — progression, récompenses et choix présents.";
  }
  return "Session calme — peu de stimuli immédiats.";
}

// ── API publique ──────────────────────────────────────────────────────────────

export function computeFunScore(state: StrategyGameState): FunScoreResult {
  const progression      = computeProgression(state);
  const recentRewards    = computeRecentRewards(state);
  const availableActions = computeAvailableActions(state);
  const activeCrisis     = computeActiveCrisis(state);
  const missionMomentum  = computeMissionMomentum(state);
  const activityVariety  = computeActivityVariety(state);
  const waitPressure     = computeWaitPressure(state, availableActions, activeCrisis, missionMomentum);

  const factors: FunFactors = {
    progression,
    recentRewards,
    availableActions,
    activeCrisis,
    missionMomentum,
    activityVariety,
    waitPressure,
  };

  const raw   = progression + recentRewards + availableActions + activeCrisis + missionMomentum + activityVariety - waitPressure;
  const score = clamp(raw, 0, 100);

  return { score, band: getBand(score), factors, note: buildNote(factors, score) };
}
