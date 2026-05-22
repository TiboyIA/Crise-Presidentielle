// ── Fuite d'Indemnisation et Fraude ──────────────────────────────────────────
// Lors du déploiement d'un plan d'aide massif, une partie du budget peut être
// détournée ou mal allouée selon l'état institutionnel du pays.
// Les fuites faibles restent silencieuses ; les fuites élevées génèrent un scandale.

import type { StrategyGameState } from "@/types/strategy";
import type { LeakageBand } from "@/types/strategy";

// ── Plans d'urgence éligibles ─────────────────────────────────────────────────
// Trois choix de crise qui déclenchent le calcul de fuite.

export const LEAKAGE_ELIGIBLE_CHOICES = new Set([
  "flood_army_rescue",          // Inondations massives — secours militaires (−500 M€)
  "emergency_hospital_funding", // Effondrement hospitalier — plan 2 Md€ (−800 M€)
  "green_emergency_plan",       // Catastrophe écologique — plan national (−400 M€)
]);

// ── Résultat du calcul ────────────────────────────────────────────────────────

export interface LeakageResult {
  rate:           number;       // fraction de l'aide perdue (0.0 – 0.45)
  leaked:         number;       // M€ effectivement détournés
  band:           LeakageBand;
  controlApplied: boolean;      // true si contrôle administratif fort (stability ≥ 70)
  scandalBoost:   number;       // points ajoutés à scandalRisk
}

// ── Formule de calcul ─────────────────────────────────────────────────────────

/**
 * Calcule le taux de fuite d'un plan d'urgence.
 *
 * Facteurs aggravants : corruption (scandalRisk), instabilité institutionnelle,
 * opacité (faible eliteTrust), urgence de la crise.
 * Facteur atténuant : compétence moyenne des ministres.
 */
export function computeLeakage(
  state:     StrategyGameState,
  urgency:   string,
  aidAmount: number,
): LeakageResult {
  const { scandalRisk, institutionalStability, eliteTrust } = state.hiddenPolitics;

  const ministers = state.strategyMinisters ?? [];
  const avgCompetence = ministers.length > 0
    ? ministers.reduce((sum, m) => sum + m.competence, 0) / ministers.length
    : 60;

  const base        = 0.05;
  const corruption  = (scandalRisk / 100) * 0.20;           // 0-20 %
  const instability = ((100 - institutionalStability) / 100) * 0.15; // 0-15 %
  const opacity     = ((100 - eliteTrust) / 100) * 0.10;    // 0-10 %
  const urgencyAdd  = urgency === "critique" ? 0.06 : urgency === "forte" ? 0.03 : 0;
  const competence  = (avgCompetence / 100) * 0.10;         // 0-10 % de réduction

  const rate = Math.min(0.45, Math.max(0.02,
    base + corruption + instability + opacity + urgencyAdd - competence,
  ));

  const band: LeakageBand =
    rate < 0.08 ? "negligible"  :
    rate < 0.18 ? "moderate"    :
    rate < 0.30 ? "significant" :
    "critical";

  const scandalBoost =
    band === "negligible"  ? 3  :
    band === "moderate"    ? 12 :
    band === "significant" ? 25 :
    40;

  return {
    rate,
    leaked:         Math.round(aidAmount * rate),
    band,
    controlApplied: institutionalStability >= 70,
    scandalBoost,
  };
}

// ── Labels et couleurs ────────────────────────────────────────────────────────

export const LEAKAGE_BAND_LABELS: Record<LeakageBand, string> = {
  negligible:  "Fuite marginale",
  moderate:    "Fuite modérée",
  significant: "Fuite significative",
  critical:    "Détournement critique",
};

export const LEAKAGE_BAND_COLORS: Record<LeakageBand, string> = {
  negligible:  "#3fbe7a",
  moderate:    "#e8a93a",
  significant: "#FF8040",
  critical:    "#e54848",
};

// ── Titres des actualités générées ────────────────────────────────────────────

export const LEAKAGE_NEWS_TITLE: Record<"significant" | "critical", string> = {
  significant: "Plans d'urgence : la Cour des Comptes soupçonne des irrégularités",
  critical:    "Détournements d'aides d'urgence : le scandale éclate",
};

export const LEAKAGE_NEWS_SOURCE: Record<"significant" | "critical", string> = {
  significant: "Cour des Comptes",
  critical:    "Médias Nationaux — ALERTE",
};
