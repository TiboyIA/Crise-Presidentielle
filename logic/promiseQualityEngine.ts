/**
 * promiseQualityEngine.ts — Impact des promesses au Bilan de Mandat
 *
 * Calcule le bonus/malus apporté par chaque promesse de campagne selon :
 *   1. Sa qualité linguistique (floue / mesurable / risquée)
 *   2. Son statut final (tenue / partielle / trahie / en cours)
 *   3. L'intensité de l'attente publique (publicExpectation — amplifie tout)
 *
 * Design intentionnel :
 *   - Promesse floue tenue   → petit bonus (populaire mais peu mémorable)
 *   - Promesse mesurable tenue → vrai crédit politique (preuve concrète)
 *   - Promesse risquée tenue  → exploit, fort bonus
 *   - Promesse risquée trahie → scandale, gros malus
 *
 * Le total est capé à ±15 pts pour ne pas écraser le score des indicateurs.
 */

import type { CampaignPromises, PromiseClarityLevel, PromiseStatus } from "@/types/strategy";
import { PROMISE_QUALITY } from "@/data/promiseQuality";

// Bonus de base par (clarityLevel × status) — avant pondération par publicExpectation
const BASE_BONUS: Record<PromiseClarityLevel, Record<PromiseStatus, number>> = {
  floue:     { tenue: 4,  partielle: 1,  trahie: -6,  "en cours": 0  },
  mesurable: { tenue: 9,  partielle: 3,  trahie: -12, "en cours": 0  },
  risquée:   { tenue: 16, partielle: 5,  trahie: -20, "en cours": -1 },
};

export interface PromiseBilanItem {
  domain:       string;
  label:        string;
  clarityLevel: PromiseClarityLevel;
  status:       PromiseStatus;
  bonus:        number;
}

export interface PromiseBilanResult {
  total:     number;         // capé à [-15, +15]
  breakdown: PromiseBilanItem[];
}

/**
 * Retourne le bonus total + le détail par promesse sélectionnée.
 * Rétrocompatible : si promises est undefined, retourne { total: 0, breakdown: [] }.
 */
export function computePromiseBilanBonus(
  promises: CampaignPromises | undefined,
): PromiseBilanResult {
  if (!promises || promises.selected.length === 0) {
    return { total: 0, breakdown: [] };
  }

  const breakdown: PromiseBilanItem[] = [];
  let rawTotal = 0;

  for (const domain of promises.selected) {
    const quality  = PROMISE_QUALITY[domain];
    const status   = promises.status[domain] ?? "en cours";
    const base     = BASE_BONUS[quality.clarityLevel][status];

    // publicExpectation amplifie : attente haute → succès plus visible, échec plus douloureux
    const expectFactor = 0.5 + (quality.publicExpectation / 200); // 0.50–1.00
    const bonus = base === 0 ? 0 : Math.round(base * expectFactor);

    rawTotal += bonus;
    breakdown.push({ domain, label: domain, clarityLevel: quality.clarityLevel, status, bonus });
  }

  return {
    total: Math.max(-15, Math.min(15, rawTotal)),
    breakdown,
  };
}
