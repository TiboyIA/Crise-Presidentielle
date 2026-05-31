/**
 * covertOpsComplianceEngine.ts — Conformité des Opérations Sensibles (MODE DELTA).
 *
 * Évalue le profil de risque institutionnel d'une opération : pas de détail technique
 * offensif, pas de méthode réelle — uniquement la dimension politique et juridique fictive.
 *
 * Indicateurs (0-100) :
 *   attributionRisk      : probabilité que l'opération soit attribuée à l'État
 *   legalDefensibility   : capacité à se défendre juridiquement si exposé
 *   diplomaticExposure   : impact potentiel sur les relations si révélé
 *   evidenceTrail        : traces institutionnelles exploitables par des tiers
 *   oversightRisk        : probabilité d'enquête par les contre-pouvoirs
 *
 * Verdicts :
 *   exploitable                     — profil propre, risque maîtrisé
 *   tactical_success_political_risk — succès opérationnel, exposition politique réelle
 *   institutional_trace             — trace détectée dans les archives fictives
 *   leak_vulnerable                 — dossier exposé à une fuite interne
 */

import type { OperationType, StrategyGameState } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CovertOpsProfile {
  attributionRisk:    number; // 0-100
  legalDefensibility: number; // 0-100 (haut = défendable)
  diplomaticExposure: number; // 0-100
  evidenceTrail:      number; // 0-100 (traces laissées)
  oversightRisk:      number; // 0-100
}

export type CovertComplianceVerdict =
  | "exploitable"                    // risque maîtrisé
  | "tactical_success_political_risk" // succès tactique, risque politique
  | "institutional_trace"             // trace institutionnelle détectée
  | "leak_vulnerable";               // dossier vulnérable à une fuite

export interface CovertComplianceReport {
  profile:                CovertOpsProfile;
  verdict:                CovertComplianceVerdict;
  verdictLabel:           string;
  verdictColor:           string;
  riskScore:              number;  // 0-100 (score global de risque)
  scandalRiskContribution: number; // points de scandalRisk ajoutés si révélé
  notes:                  string[];
  isCovertOperation:      boolean; // true = opération sensible (hors diplomatique)
}

// ── Profils de base par type d'opération ─────────────────────────────────────
// (toutes valeurs 0-100 ; legalDefensibility HAUTE = bonne situation)

const BASE_PROFILES: Record<OperationType, CovertOpsProfile> = {
  // Opérations sensibles ─────────────────────────────────────────────────────
  espionage: {
    attributionRisk:    30, legalDefensibility: 55,
    diplomaticExposure: 25, evidenceTrail: 20, oversightRisk: 25,
  },
  steal_intel: {
    attributionRisk:    55, legalDefensibility: 30,
    diplomaticExposure: 45, evidenceTrail: 50, oversightRisk: 55,
  },
  cyber_attack: {
    attributionRisk:    40, legalDefensibility: 25,
    diplomaticExposure: 55, evidenceTrail: 40, oversightRisk: 50,
  },
  sabotage: {
    attributionRisk:    65, legalDefensibility: 20,
    diplomaticExposure: 70, evidenceTrail: 55, oversightRisk: 60,
  },
  military_operation: {
    attributionRisk:    90, legalDefensibility: 55,
    diplomaticExposure: 80, evidenceTrail: 85, oversightRisk: 65,
  },
  influence_campaign: {
    attributionRisk:    40, legalDefensibility: 65,
    diplomaticExposure: 30, evidenceTrail: 30, oversightRisk: 25,
  },
  // Opérations diplomatiques / publiques ────────────────────────────────────
  // Pas de problème de conformité secrète → profil sûr
  sanction: {
    attributionRisk:    95, legalDefensibility: 85,
    diplomaticExposure: 65, evidenceTrail: 90, oversightRisk: 15,
  },
  sign_treaty: {
    attributionRisk:    100, legalDefensibility: 95,
    diplomaticExposure: 15, evidenceTrail: 100, oversightRisk: 5,
  },
  diplomatic_aid: {
    attributionRisk:    100, legalDefensibility: 95,
    diplomaticExposure: 10, evidenceTrail: 100, oversightRisk: 5,
  },
  reinforce_cyber: {
    attributionRisk:    75, legalDefensibility: 90,
    diplomaticExposure: 10, evidenceTrail: 70, oversightRisk: 10,
  },
};

const COVERT_OP_TYPES: OperationType[] = [
  "espionage", "steal_intel", "cyber_attack", "sabotage", "military_operation", "influence_campaign",
];

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ── Évaluation principale ─────────────────────────────────────────────────────

export function evaluateCovertOpsCompliance(
  type: OperationType,
  success: boolean,
  state: StrategyGameState,
): CovertComplianceReport {
  const base      = { ...BASE_PROFILES[type] };
  const cs        = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
  const abuse     = state.abuseOfPowerState;
  const oversight = state.oversightState;
  const isCovert  = COVERT_OP_TYPES.includes(type);

  // ── Modificateurs d'état ────────────────────────────────────────────────

  let { attributionRisk, legalDefensibility, diplomaticExposure, evidenceTrail, oversightRisk } = base;

  // auditPressure élevée : opérations sensibles plus dangereuses
  if (cs.auditPressure >= 60) {
    oversightRisk    = clamp(oversightRisk    + 15);
    evidenceTrail    = clamp(evidenceTrail    + 10);
  }
  if (cs.auditPressure >= 80) {
    oversightRisk    = clamp(oversightRisk    + 10);
    legalDefensibility = clamp(legalDefensibility - 10);
  }

  // Conformité basse : défense juridique affaiblie
  if (cs.complianceScore < 40) {
    legalDefensibility = clamp(legalDefensibility - 15);
    oversightRisk      = clamp(oversightRisk      + 10);
  }

  // Exposition corruption : plus de traces laissées
  if (cs.corruptionExposure >= 60) {
    evidenceTrail = clamp(evidenceTrail + 15);
  }

  // Lanceurs d'alerte actifs : risque de fuite augmenté
  const alerts = state.whistleblowerAlerts ?? [];
  if (alerts.length >= 2) {
    evidenceTrail = clamp(evidenceTrail + 12);
    oversightRisk = clamp(oversightRisk +  8);
  }

  // Abus de pouvoir élevé : les contre-pouvoirs surveillent tout
  if (abuse && abuse.index >= 55) {
    oversightRisk   = clamp(oversightRisk   + 15);
    attributionRisk = clamp(attributionRisk + 10);
  }

  // Autorités indépendantes très actives : traces plus exposées
  if (oversight) {
    const activeInvs = oversight.investigations.filter((i) => !i.resolved).length;
    if (activeInvs >= 2) {
      oversightRisk = clamp(oversightRisk + 12);
      evidenceTrail = clamp(evidenceTrail + 8);
    }
  }

  // Succès : moins de traces, exécution plus propre
  if (success) {
    evidenceTrail    = clamp(evidenceTrail    - 10);
    attributionRisk  = clamp(attributionRisk  -  8);
  } else {
    // Échec : plus de traces laissées
    evidenceTrail    = clamp(evidenceTrail    + 12);
    diplomaticExposure = clamp(diplomaticExposure + 8);
  }

  const profile: CovertOpsProfile = {
    attributionRisk, legalDefensibility, diplomaticExposure, evidenceTrail, oversightRisk,
  };

  // ── Score global de risque ────────────────────────────────────────────────
  // legalDefensibility est inversée (haut = bien) → on prend son inverse
  const riskScore = clamp(Math.round(
    attributionRisk  * 0.25 +
    (100 - legalDefensibility) * 0.20 +
    diplomaticExposure * 0.20 +
    evidenceTrail    * 0.20 +
    oversightRisk    * 0.15,
  ));

  // ── Verdict ───────────────────────────────────────────────────────────────

  let verdict: CovertComplianceVerdict;

  if (!isCovert) {
    // Opérations publiques → toujours "exploitable" (pas de problème de conformité secrète)
    verdict = "exploitable";
  } else if (evidenceTrail >= 55 && oversightRisk >= 55) {
    verdict = "leak_vulnerable";
  } else if (legalDefensibility < 35 && attributionRisk >= 55) {
    verdict = "institutional_trace";
  } else if (attributionRisk >= 60 && success) {
    verdict = "tactical_success_political_risk";
  } else {
    verdict = "exploitable";
  }

  // ── Labels et couleurs ────────────────────────────────────────────────────

  const VERDICT_META: Record<CovertComplianceVerdict, { label: string; color: string }> = {
    exploitable:                     { label: "Opération exploitable",                   color: "#4caf82" },
    tactical_success_political_risk: { label: "Succès tactique, risque politique",        color: "#e8c44f" },
    institutional_trace:             { label: "Trace institutionnelle détectée",          color: "#e8864f" },
    leak_vulnerable:                 { label: "Dossier vulnérable à une fuite",           color: "#e54848" },
  };

  const meta = VERDICT_META[verdict];

  // ── Contribution au scandalRisk si révélé ─────────────────────────────────
  const scandalRiskContribution = isCovert ? Math.round(riskScore * 0.4) : 0;

  // ── Notes contextuelles ───────────────────────────────────────────────────

  const notes: string[] = [];

  if (attributionRisk >= 70 && isCovert) {
    notes.push("Profil d'attribution élevé — déni plausible difficile à maintenir.");
  }
  if (legalDefensibility < 35 && isCovert) {
    notes.push("Défensabilité juridique insuffisante — exposition en cas de procédure.");
  }
  if (evidenceTrail >= 60) {
    notes.push("Traces archivistiques exploitables détectées dans les systèmes fictifs.");
  }
  if (oversightRisk >= 65) {
    notes.push("Risque d'enquête par les autorités indépendantes élevé.");
  }
  if (cs.auditPressure >= 60 && isCovert) {
    notes.push("Contexte d'audit renforcé — tolérance institutionnelle réduite.");
  }
  if (!success && isCovert) {
    notes.push("Échec opérationnel : traces supplémentaires laissées à la disposition des analystes adverses.");
  }
  if (alerts.length >= 2) {
    notes.push("Environnement interne hostile — risque de fuite interne non négligeable.");
  }
  if (verdict === "exploitable" && isCovert) {
    notes.push("Dossier classifié — aucun signal institutionnel préoccupant identifié.");
  }

  return {
    profile,
    verdict,
    verdictLabel: meta.label,
    verdictColor: meta.color,
    riskScore,
    scandalRiskContribution,
    notes,
    isCovertOperation: isCovert,
  };
}

// ── Helpers d'affichage ───────────────────────────────────────────────────────

export function getRiskLabel(value: number): string {
  if (value >= 75) return "Critique";
  if (value >= 55) return "Élevé";
  if (value >= 35) return "Modéré";
  return "Faible";
}

export function getRiskColor(value: number): string {
  if (value >= 75) return "#e54848";
  if (value >= 55) return "#e8864f";
  if (value >= 35) return "#e8c44f";
  return "#4caf82";
}
