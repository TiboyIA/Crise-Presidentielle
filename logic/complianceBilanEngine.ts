/**
 * complianceBilanEngine.ts — Bilan Conformité de Mandat (MODE DELTA).
 *
 * Synthèse de la performance institutionnelle sur l'ensemble du mandat.
 * Agrège les données de tous les engines MODE DELTA en un rapport final.
 *
 * 6 verdicts (du meilleur au pire) :
 *   exemplaire     — conformité haute, abus minimal, institutions solides
 *   sous_controle  — bonne maîtrise globale, quelques tensions résiduelles
 *   sous_tension   — pressions visibles, gouvernance fragilisée
 *   efficace_expose — résultats obtenus mais exposition institutionnelle réelle
 *   derive         — dérives marquées, institutions affaiblies
 *   rattrapé       — gouvernement fragilisé par ses propres pratiques
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";
import { DEFAULT_AI_GOVERNANCE_STATE, computeAIRiskScore } from "@/logic/aiGovernanceComplianceEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComplianceBilanVerdict =
  | "exemplaire"
  | "sous_controle"
  | "sous_tension"
  | "efficace_expose"
  | "derive"
  | "rattrapé";

export interface ComplianceBilanResult {
  // Indicateurs clés
  complianceScore:          number; // score final conformité
  scandalesDeclenches:      number; // événements scandales dans le journal
  auditsAcceptes:           number; // dérogations révisées + enquêtes cooperées
  auditsIgnores:            number; // dérogations non-révisées
  conflitsInterets:         number; // ministres problématiques en fin de mandat
  abusPouvoirsUrgence:      number; // emergencyPowersAbuse final
  reputationInstitutionnelle: number; // 0-100 composite
  abuseOfPowerFinal:        number; // indice abus de pouvoir final
  aiRiskFinal:              number; // risque IA gouvernementale final

  // Verdict
  verdict:       ComplianceBilanVerdict;
  verdictTitle:  string;
  verdictColor:  string;
  verdictSubtitle: string;

  // Impact sur le score de bilan
  scorePenalty:  number; // 0 à -25 pts
}

// ── Verdicts ──────────────────────────────────────────────────────────────────

const VERDICTS: Record<ComplianceBilanVerdict, { title: string; color: string; subtitle: string }> = {
  exemplaire: {
    title:    "Mandat exemplaire",
    color:    "#4caf82",
    subtitle: "Les institutions ont fonctionné dans le plein respect de l'État de droit fictif.",
  },
  sous_controle: {
    title:    "État sous contrôle",
    color:    "#4a9fff",
    subtitle: "La gouvernance a été maîtrisée avec quelques tensions bien gérées.",
  },
  sous_tension: {
    title:    "République sous tension",
    color:    "#e8c44f",
    subtitle: "Les contre-pouvoirs ont été mis à rude épreuve. La démocratie a tenu, non sans effort.",
  },
  efficace_expose: {
    title:    "Pouvoir efficace mais exposé",
    color:    "#e8864f",
    subtitle: "Des résultats ont été obtenus, mais au prix d'une exposition institutionnelle significative.",
  },
  derive: {
    title:    "Dérive institutionnelle",
    color:    "#e54848",
    subtitle: "Des dérives répétées ont fragilisé les fondements institutionnels du mandat.",
  },
  rattrapé: {
    title:    "Gouvernement rattrapé par ses propres méthodes",
    color:    "#9b1c1c",
    subtitle: "Les pratiques de gouvernance ont finalement retourné contre l'exécutif lui-même.",
  },
};

// ── Calcul ────────────────────────────────────────────────────────────────────

export function computeComplianceBilan(state: StrategyGameState): ComplianceBilanResult {
  const cs      = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
  const hp      = state.hiddenPolitics;
  const abuse   = state.abuseOfPowerState;
  const ag      = state.aiGovernanceState ?? DEFAULT_AI_GOVERNANCE_STATE;
  const derog   = state.derogations ?? [];
  const mconfl  = state.ministerConflicts ?? {};
  const oversight = state.oversightState;
  const log     = state.news.log;

  // Scandales déclenchés — entrées journal urgence critique
  const scandalesDeclenches = log.filter(
    (e) => e.urgency === "critique" && (
      e.eventId.includes("scandal") ||
      e.eventId.includes("scandal") ||
      e.eventId.includes("derive") ||
      e.eventId.includes("whistleblower_national") ||
      e.eventId.includes("ai_crisis") ||
      e.eventId.includes("abuse_derive") ||
      e.eventId.includes("acep_ally")
    ),
  ).length;

  // Audits acceptés = dérogations révisées + enquêtes coopérées
  const auditsAcceptes =
    derog.filter((d) => d.reviewed).length +
    (oversight ? oversight.totalInvestigations - oversight.investigations.filter((i) => !i.resolved).length : 0);

  // Audits ignorés = dérogations actives non-révisées
  const auditsIgnores = derog.filter((d) => !d.reviewed).length;

  // Conflits d'intérêts problématiques en fin de mandat
  const conflitsInterets = Object.values(mconfl).filter(
    (p) => p.overallRisk >= 60 || p.disclosureStatus === "problématique",
  ).length;

  // Abus de pouvoirs d'urgence
  const abusPouvoirsUrgence = cs.emergencyPowersAbuse;

  // Réputation institutionnelle — composite 0-100
  const reputationInstitutionnelle = Math.max(0, Math.min(100, Math.round(
    hp.institutionalStability * 0.40 +
    hp.eliteTrust             * 0.30 +
    (100 - hp.scandalRisk)    * 0.30,
  )));

  const abuseOfPowerFinal = abuse?.index ?? 0;
  const aiRiskFinal       = computeAIRiskScore(ag);

  // ── Score de conformité normalisé (0-100, haut = bien) ────────────────────
  // On utilise cs.complianceScore comme base, mais on le nuance avec les autres indicateurs
  const complianceScore = Math.max(0, Math.min(100, Math.round(
    cs.complianceScore  * 0.35 +
    reputationInstitutionnelle * 0.25 +
    (100 - abuseOfPowerFinal)  * 0.25 +
    (100 - aiRiskFinal)        * 0.15,
  )));

  // ── Sélection du verdict ──────────────────────────────────────────────────

  let verdict: ComplianceBilanVerdict;

  if (
    complianceScore < 30 ||
    abuseOfPowerFinal >= 70 ||
    scandalesDeclenches >= 3
  ) {
    verdict = "rattrapé";
  } else if (
    complianceScore < 45 ||
    abuseOfPowerFinal >= 55 ||
    (conflitsInterets >= 3 && auditsIgnores >= 3)
  ) {
    verdict = "derive";
  } else if (
    complianceScore >= 70 &&
    abuseOfPowerFinal < 20 &&
    hp.scandalRisk < 25 &&
    reputationInstitutionnelle >= 70
  ) {
    verdict = "exemplaire";
  } else if (
    complianceScore >= 58 &&
    abuseOfPowerFinal < 35 &&
    reputationInstitutionnelle >= 55
  ) {
    verdict = "sous_controle";
  } else if (
    // Bons résultats nationaux mais exposition élevée
    state.nationalIndicators.economy >= 55 &&
    state.nationalIndicators.security >= 55 &&
    (cs.auditPressure >= 50 || cs.legalRisk >= 50 || abuseOfPowerFinal >= 35)
  ) {
    verdict = "efficace_expose";
  } else {
    verdict = "sous_tension";
  }

  // ── Pénalité sur score de bilan ───────────────────────────────────────────

  const PENALTY: Record<ComplianceBilanVerdict, number> = {
    exemplaire:      0,
    sous_controle:   0,
    sous_tension:   -5,
    efficace_expose: -8,
    derive:         -15,
    rattrapé:       -25,
  };

  const { title, color, subtitle } = VERDICTS[verdict];

  return {
    complianceScore,
    scandalesDeclenches,
    auditsAcceptes,
    auditsIgnores,
    conflitsInterets,
    abusPouvoirsUrgence,
    reputationInstitutionnelle,
    abuseOfPowerFinal,
    aiRiskFinal,
    verdict,
    verdictTitle:    title,
    verdictColor:    color,
    verdictSubtitle: subtitle,
    scorePenalty:    PENALTY[verdict],
  };
}
