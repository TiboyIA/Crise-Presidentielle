/**
 * healthSurveillanceEngine.ts — Cellule de Veille Sanitaire Stratégique.
 *
 * Action présidentielle : définir le niveau de surveillance sanitaire nationale.
 * Le niveau de veille améliore la détection des crises, réduit les retards
 * de remontée et améliore la précision des briefings DIM.
 *
 * 4 niveaux :
 *   faible     — surveillance minimale, coût nul
 *   standard   — veille de base, 3 M€/jour
 *   renforcee  — veille active, 8 M€/jour
 *   crise      — dispositif maximal, 18 M€/jour
 *
 * Effets par niveau (appliqués dans les engines dépendants) :
 *   standard   : delayTarget -3 · mdqTarget +6  · underDetTarget -5
 *   renforcee  : delayTarget -6 · mdqTarget +12 · underDetTarget -12
 *   crise      : delayTarget -10 · mdqTarget +18 · underDetTarget -20
 *
 * Si le budget devient insuffisant, le niveau redescend automatiquement.
 *
 * Aucune collecte réelle. Aucun tracking joueur. Aucune vraie santé publique.
 */

import type { StrategyGameState } from "@/types/strategy";

export type SurveillanceLevelId = "faible" | "standard" | "renforcee" | "crise";

export interface SurveillanceLevelDef {
  id:              SurveillanceLevelId;
  label:           string;
  color:           string;
  description:     string;
  dailyCostMoney:  number;
  upgradeCostMoney:    number;  // coût pour passer à ce niveau
  upgradeCostInfluence: number;
  // Bonus appliqués dans les engines dépendants
  delayReduction:         number;  // soustrait au target de healthReportingDelay
  mdqBonus:               number;  // ajouté au target de medicalDataQuality
  underDetReduction:      number;  // soustrait au target de underDetectionPressure
}

export const SURVEILLANCE_LEVELS: Record<SurveillanceLevelId, SurveillanceLevelDef> = {
  faible: {
    id:                   "faible",
    label:                "Faible",
    color:                "#8a8a9a",
    description:          "Surveillance minimale — aucune capacité d'anticipation. Les signaux faibles ne sont pas détectés.",
    dailyCostMoney:       0,
    upgradeCostMoney:     0,
    upgradeCostInfluence: 0,
    delayReduction:       0,
    mdqBonus:             0,
    underDetReduction:    0,
  },
  standard: {
    id:                   "standard",
    label:                "Standard",
    color:                "#4a9fff",
    description:          "Veille de base — consolidation des données sanitaires, détection améliorée des anomalies courantes.",
    dailyCostMoney:       3,
    upgradeCostMoney:     80,
    upgradeCostInfluence: 8,
    delayReduction:       3,
    mdqBonus:             6,
    underDetReduction:    5,
  },
  renforcee: {
    id:                   "renforcee",
    label:                "Renforcée",
    color:                "#8bc34a",
    description:          "Veille active — analyse croisée des flux sanitaires, réduction des délais de remontée, détection précoce des crises.",
    dailyCostMoney:       8,
    upgradeCostMoney:     200,
    upgradeCostInfluence: 18,
    delayReduction:       6,
    mdqBonus:             12,
    underDetReduction:    12,
  },
  crise: {
    id:                   "crise",
    label:                "Crise",
    color:                "#e8864f",
    description:          "Dispositif maximal — mobilisation de toutes les ressources DIM, briefings en temps réel, sous-détection quasi nulle.",
    dailyCostMoney:       18,
    upgradeCostMoney:     400,
    upgradeCostInfluence: 35,
    delayReduction:       10,
    mdqBonus:             18,
    underDetReduction:    20,
  },
};

export const SURVEILLANCE_ORDER: SurveillanceLevelId[] = ["faible", "standard", "renforcee", "crise"];

export const DEFAULT_SURVEILLANCE_LEVEL: SurveillanceLevelId = "faible";

// ── Accès rapide aux bonus ────────────────────────────────────────────────────

export function getSurveillanceDef(state: StrategyGameState): SurveillanceLevelDef {
  const level = state.healthSurveillanceLevel ?? DEFAULT_SURVEILLANCE_LEVEL;
  return SURVEILLANCE_LEVELS[level];
}

// ── Vérification de faisabilité ───────────────────────────────────────────────

export interface SurveillanceCheck {
  ok:      boolean;
  reason?: string;
}

export function canSetSurveillanceLevel(
  state: StrategyGameState,
  targetLevel: SurveillanceLevelId,
): SurveillanceCheck {
  const current = state.healthSurveillanceLevel ?? DEFAULT_SURVEILLANCE_LEVEL;
  if (targetLevel === current) return { ok: false, reason: "Niveau déjà actif." };

  const currentIdx = SURVEILLANCE_ORDER.indexOf(current);
  const targetIdx  = SURVEILLANCE_ORDER.indexOf(targetLevel);

  // Downgrade — toujours gratuit
  if (targetIdx < currentIdx) return { ok: true };

  // Upgrade — vérifier les ressources
  const def = SURVEILLANCE_LEVELS[targetLevel];
  if (state.resources.money < def.upgradeCostMoney) {
    return { ok: false, reason: `Budget insuffisant — ${def.upgradeCostMoney} M€ requis.` };
  }
  if (state.resources.influence < def.upgradeCostInfluence) {
    return { ok: false, reason: `Influence insuffisante — ${def.upgradeCostInfluence} requis.` };
  }

  return { ok: true };
}

// ── Application du changement de niveau ──────────────────────────────────────

export function setHealthSurveillanceLevel(
  state: StrategyGameState,
  targetLevel: SurveillanceLevelId,
): { newState: StrategyGameState; failReason?: string } {
  const check = canSetSurveillanceLevel(state, targetLevel);
  if (!check.ok) return { newState: state, failReason: check.reason };

  const current    = state.healthSurveillanceLevel ?? DEFAULT_SURVEILLANCE_LEVEL;
  const currentIdx = SURVEILLANCE_ORDER.indexOf(current);
  const targetIdx  = SURVEILLANCE_ORDER.indexOf(targetLevel);
  const def        = SURVEILLANCE_LEVELS[targetLevel];

  let resources = { ...state.resources };

  // Déduction du coût d'upgrade uniquement (downgrade gratuit)
  if (targetIdx > currentIdx) {
    resources = {
      ...resources,
      money:     Math.max(0, resources.money     - def.upgradeCostMoney),
      influence: Math.max(0, resources.influence - def.upgradeCostInfluence),
    };
  }

  return {
    newState: {
      ...state,
      resources,
      healthSurveillanceLevel: targetLevel,
    },
  };
}

// ── Tick (per-day) — coût journalier + auto-downgrade ────────────────────────

export function tickHealthSurveillance(state: StrategyGameState): StrategyGameState {
  const current = state.healthSurveillanceLevel ?? DEFAULT_SURVEILLANCE_LEVEL;
  const def     = SURVEILLANCE_LEVELS[current];

  if (def.dailyCostMoney === 0) return state; // faible — rien à faire

  // Vérifier si le budget couvre le coût journalier
  if (state.resources.money >= def.dailyCostMoney) {
    return {
      ...state,
      resources: {
        ...state.resources,
        money: Math.max(0, state.resources.money - def.dailyCostMoney),
      },
    };
  }

  // Budget insuffisant — downgrade automatique d'un cran
  const currentIdx   = SURVEILLANCE_ORDER.indexOf(current);
  const downgradedLevel = SURVEILLANCE_ORDER[currentIdx - 1] ?? "faible";
  const downgradedDef   = SURVEILLANCE_LEVELS[downgradedLevel];

  const resources = {
    ...state.resources,
    money: Math.max(0, state.resources.money - downgradedDef.dailyCostMoney),
  };

  return {
    ...state,
    resources,
    healthSurveillanceLevel: downgradedLevel,
    // Note dans hiddenPolitics : l'appareil d'État détecte la réduction
    hiddenPolitics: {
      ...state.hiddenPolitics,
      institutionalStability: Math.max(0, (state.hiddenPolitics?.institutionalStability ?? 70) - 1),
    },
  };
}
