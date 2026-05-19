/**
 * mediaMisinterpretationEngine.ts — Malentendu médiatique
 *
 * Calcule un risque de mauvaise interprétation après un choix présidentiel,
 * basé sur des facteurs politiques visibles et cachés. Quand le seuil est
 * dépassé, génère un titre alternatif fictif tel qu'une presse hostile
 * pourrait le publier.
 *
 * Résultats possibles :
 *   "distorted"    — titre légèrement déformé (risque 25-44)
 *   "polemic"      — polémique (risque 45-59)
 *   "rumor"        — rumeur amplifiée (risque 60-74)
 *   "trust_crisis" — crise de confiance médiatique (risque ≥ 75)
 *
 * Aucun nom de média réel. Aucun groupe politique réel ciblé.
 * N'affecte pas le gameplay directement : la distorsion est narrative,
 * visible uniquement dans les archives du Journal de Crise.
 */

import type { HiddenPolitics, MisinterpretationType, NewsType, NewsUrgency } from "@/types/strategy";

export type { MisinterpretationType } from "@/types/strategy";

export interface MisinterpretationResult {
  type:     MisinterpretationType;
  headline: string;
}

// ── 8 titres alternatifs fictifs (un par type d'actualité) ───────────────────

const ALTERNATIVE_HEADLINES: Partial<Record<NewsType, string>> & { _fallback: string } = {
  cyber:          "Des failles critiques délibérément dissimulées, nos sources l'affirment",
  economie:       "Le gouvernement préparerait une hausse d'impôts déguisée, selon des initiés",
  social:         "Tensions sociales sous-estimées : l'exécutif aurait menti sur l'ampleur réelle",
  diplomatie:     "Concessions secrètes : le discours officiel cacherait une capitulation diplomatique",
  national:       "Des conseillers anonymes confirment : la situation est bien pire que déclarée",
  guerre_hybride: "Opérations clandestines sans contrôle parlementaire — qui dirige vraiment ?",
  monde:          "Isolement diplomatique croissant : nos alliés s'inquiètent en coulisses",
  _fallback:      "Des sources au cœur du pouvoir évoquent une crise volontairement dissimulée",
};

// ── Calcul du risque (0-100) ─────────────────────────────────────────────────

export interface MisinterpretationRiskParams {
  hiddenPolitics:   HiddenPolitics;
  urgency:          NewsUrgency;
  /** Score de clarté présidentielle (0-100) — absent si le choix n'a pas de clarityProfile. */
  clarityScore?:    number;
  /** Vrai si au moins une promesse de campagne est marquée "trahie". */
  anyPromiseBroken?: boolean;
}

/**
 * Retourne un score de risque 0-100.
 * Facteurs cumulatifs — chaque facteur aggrave indépendamment le risque.
 */
export function computeMisinterpretationRisk(params: MisinterpretationRiskParams): number {
  const { hiddenPolitics: hp, urgency, clarityScore, anyPromiseBroken } = params;
  let risk = 0;

  // Clarté faible du message présidentiel
  if (clarityScore !== undefined) {
    if      (clarityScore < 40) risk += 25;
    else if (clarityScore < 60) risk += 12;
  }

  // Médias déjà hostiles
  if      (hp.mediaMood < 30) risk += 25;
  else if (hp.mediaMood < 50) risk += 12;

  // Contexte de scandale amplifie toute déformation
  if      (hp.scandalRisk > 70) risk += 20;
  else if (hp.scandalRisk > 50) risk += 10;

  // Public fatigué lit le pire dans tout communiqué
  if      (hp.popularFatigue > 65) risk += 15;
  else if (hp.popularFatigue > 50) risk +=  7;

  // Gravité de la crise attire plus de scrutin
  if      (urgency === "critique") risk += 10;
  else if (urgency === "forte")    risk +=  4;

  // Promesse contradictoire fragilise la crédibilité du message
  if (anyPromiseBroken) risk += 15;

  return Math.min(100, risk);
}

// ── Génération du malentendu ─────────────────────────────────────────────────

/**
 * Retourne un malentendu médiatique ou null si le risque est insuffisant (< 25).
 */
export function generateMisinterpretation(
  riskScore: number,
  eventType: NewsType,
): MisinterpretationResult | null {
  if (riskScore < 25) return null;

  const type: MisinterpretationType =
    riskScore >= 75 ? "trust_crisis" :
    riskScore >= 60 ? "rumor"        :
    riskScore >= 45 ? "polemic"      :
    "distorted";

  const headline =
    ALTERNATIVE_HEADLINES[eventType] ??
    ALTERNATIVE_HEADLINES._fallback;

  return { type, headline };
}
