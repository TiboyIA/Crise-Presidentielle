/**
 * discoursePathologyEngine.ts — Pathologies du discours politique
 *
 * Suivi discret de 6 déformations rhétoriques accumulées au fil des choix.
 * Aucune moralisation : le joueur n'est pas bloqué, aucune stratégie n'est
 * systématiquement mauvaise. Les pathologies montent lentement, décroissent
 * avec le temps, et créent des frictions politiques invisibles quand elles
 * dépassent des seuils.
 *
 * Seuils (basés sur la valeur maximale parmi les 6 scores) :
 *   > 60 : médias progressivement hostiles   → mediaMood -3
 *   > 75 : pression sur la confiance          → mediaMood -5, popularFatigue +3, eliteTrust -3
 *   > 90 : scandale de communication          → mediaMood -8, scandalRisk +8, popularFatigue +6
 *
 * Décroissance naturelle : -2 par tranche de 10 jours de mandat (dans advanceMandateDay).
 */

import type { DiscoursePathology, PathologyDelta } from "@/types/strategy";
import type { HiddenPolitics } from "@/types/strategy";

export type { DiscoursePathology, PathologyDelta } from "@/types/strategy";

export const PATHOLOGY_LABELS: Record<keyof DiscoursePathology, string> = {
  doubleSpeak:          "Double discours",
  fearSpeech:           "Discours de la peur",
  minimization:         "Minimisation",
  scapegoating:         "Bouc émissaire",
  technocraticColdness: "Froideur technocratique",
  contradictionRisk:    "Risque de contradiction",
};

export const DEFAULT_PATHOLOGY: DiscoursePathology = {
  doubleSpeak:          0,
  fearSpeech:           0,
  minimization:         0,
  scapegoating:         0,
  technocraticColdness: 0,
  contradictionRisk:    0,
};

/**
 * Applique un delta de pathologies, clamp 0-100.
 * contradictionRisk croît automatiquement quand doubleSpeak ou minimization augmentent :
 * le mensonge répété crée des contradictions internes difficiles à gérer.
 */
export function applyPathologyDelta(
  p: DiscoursePathology,
  delta: PathologyDelta,
): DiscoursePathology {
  const next = { ...p };
  for (const key of Object.keys(delta) as (keyof DiscoursePathology)[]) {
    const d = delta[key] ?? 0;
    next[key] = Math.min(100, Math.max(0, next[key] + d));
  }

  // contradictionRisk dérivé : monte quand on minimise ou double-parle
  const contradictionDrift = Math.floor(((delta.doubleSpeak ?? 0) + (delta.minimization ?? 0)) * 0.35);
  if (contradictionDrift > 0) {
    next.contradictionRisk = Math.min(100, next.contradictionRisk + contradictionDrift);
  }

  return next;
}

/**
 * Effets sur hiddenPolitics basés sur le score de pathologie maximal.
 * Les seuils sont exclusifs par palier (seul le palier le plus élevé s'applique).
 */
export function computePathologyThresholdEffects(
  p: DiscoursePathology,
): Partial<HiddenPolitics> {
  const maxScore = Math.max(
    p.doubleSpeak, p.fearSpeech, p.minimization,
    p.scapegoating, p.technocraticColdness, p.contradictionRisk,
  );

  if (maxScore > 90) {
    return { mediaMood: -8, scandalRisk: 8, popularFatigue: 6 };
  }
  if (maxScore > 75) {
    return { mediaMood: -5, eliteTrust: -3, popularFatigue: 3 };
  }
  if (maxScore > 60) {
    return { mediaMood: -3 };
  }
  return {};
}

/**
 * Décroissance naturelle — à appeler tous les 10 jours de mandat.
 * Toutes les pathologies diminuent de `amount` (floor à 0).
 */
export function decayPathologies(
  p: DiscoursePathology,
  amount: number = 2,
): DiscoursePathology {
  const next = { ...p };
  for (const key of Object.keys(next) as (keyof DiscoursePathology)[]) {
    next[key] = Math.max(0, next[key] - amount);
  }
  return next;
}
