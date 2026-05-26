/**
 * data/moralNegotiations.ts — La Chambre du Seuil.
 *
 * Données statiques : types de négociation, labels d'équilibre moral,
 * descriptions des pactes et de leurs conditions.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivePact = "none" | "aurora" | "obscurium" | "neutral";

export type NegotiationType =
  | "aurora_protection"
  | "aurora_counsel"
  | "aurora_technology"
  | "obscurium_quick_fix"
  | "obscurium_sabotage"
  | "obscurium_media"
  | "refuse_both"
  | "sovereignty";

// ── Labels d'équilibre moral ──────────────────────────────────────────────────

export function getMoralBalanceLabel(balance: number): string {
  if (balance >= 70)  return "Alignement Aurora";
  if (balance >= 40)  return "Confiance construite";
  if (balance >= 15)  return "Humanité souveraine";
  if (balance >= -15) return "Équilibre instable";
  if (balance >= -40) return "Influence Obscurium";
  if (balance >= -70) return "Dette obscure élevée";
  return "Dépendance critique";
}

export function getMoralBalanceColor(balance: number): string {
  if (balance >= 40)  return "#7ec8f7";   // bleu Aurora
  if (balance >= 10)  return "#4caf82";   // vert souveraineté
  if (balance >= -10) return "#e8c44f";   // jaune neutre
  if (balance >= -40) return "#e07840";   // orange dette
  return "#9b6fd4";                        // violet Obscurium profond
}

// ── Labels de confiance Aurora ─────────────────────────────────────────────────

export function getAuroraTrustLabel(trust: number): string {
  if (trust >= 75) return "Aurora vous observe avec bienveillance";
  if (trust >= 50) return "Aurora maintient un canal ouvert";
  if (trust >= 30) return "Aurora vous surveille";
  if (trust >= 15) return "Aurora doute de vous";
  return "Aurora a détourné son regard";
}

// ── Labels de dette Obscurium ──────────────────────────────────────────────────

export function getObscuriumDebtLabel(debt: number): string {
  if (debt <= 5)   return "Aucune dette connue";
  if (debt <= 20)  return "Trace discrète";
  if (debt <= 40)  return "Obscurium attend son dû";
  if (debt <= 65)  return "Dette active — les conséquences approchent";
  return "Dépendance critique — l'addition sera lourde";
}

// ── Labels de pacte ───────────────────────────────────────────────────────────

export const PACT_LABELS: Record<ActivePact, string> = {
  none:      "Aucun pacte actif",
  aurora:    "Pacte en cours — Aurora",
  obscurium: "Engagement en cours — Obscurium",
  neutral:   "Position neutre assumée",
};

export const PACT_DESCRIPTIONS: Record<ActivePact, string> = {
  none:
    "La Chambre du Seuil est silencieuse. Les deux forces attendent.",
  aurora:
    "Vous avez accepté l'aide d'Aurora sous conditions. Respectez-les — chaque manquement est noté.",
  obscurium:
    "Vous avez accepté l'aide d'Obscurium. L'effet est réel. La dette aussi.",
  neutral:
    "Vous avez refusé les deux forces. La Cité d'Orion enregistre cette décision comme un acte de souveraineté.",
};

// ── Conditions du pacte Aurora ────────────────────────────────────────────────
//
// Aurora impose des contraintes pendant la durée du pacte.
// Si ces seuils sont franchis, le pacte est considéré rompu.

export const AURORA_PACT_THRESHOLDS = {
  maxScandalRisk:            55,  // scandalRisk ne doit pas dépasser ce seuil
  minInstitutionalStability: 40,  // institutionalStability ne doit pas tomber en dessous
  maxObscuriumDebt:          30,  // obscuriumDebt ne doit pas dépasser ce seuil pendant le pacte
  pactDurationActions:       18,  // durée en actions de Journal
} as const;
