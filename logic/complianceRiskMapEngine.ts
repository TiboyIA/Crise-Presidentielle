/**
 * complianceRiskMapEngine.ts — Cartographie des Risques Conformité (MODE DELTA).
 *
 * Agrège les données des 9 systèmes MODE DELTA en une vue consolidée.
 * Chaque catégorie de risque est évaluée sur 4 dimensions :
 *   probability  — probabilité qu'un incident survienne (0-100)
 *   severity     — gravité potentielle si incident (0-100)
 *   exposure     — exposition publique / institutionnelle actuelle (0-100)
 *   control      — efficacité des contrôles existants (0-100, haut = bien)
 *
 * Niveaux (partagés) :
 *   0-25  : faible           (#4caf82)
 *   26-50 : sous surveillance (#e8c44f)
 *   51-75 : élevé            (#e8864f)
 *   76+   : critique         (#e54848)
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";
import { getActiveUnreviewed } from "@/logic/emergencyDerogationEngine";
import { computeAIRiskScore } from "@/logic/aiGovernanceComplianceEngine";
import { DEFAULT_AI_GOVERNANCE_STATE } from "@/logic/aiGovernanceComplianceEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = "faible" | "sous surveillance" | "élevé" | "critique";

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  "faible":            "#4caf82",
  "sous surveillance": "#e8c44f",
  "élevé":            "#e8864f",
  "critique":          "#e54848",
};

export interface RiskCategory {
  id:                string;
  label:             string;
  icon:              string;            // MaterialCommunityIcons name
  probability:       RiskLevel;
  severity:          RiskLevel;
  exposure:          RiskLevel;
  control:           RiskLevel;         // haut = contrôle fort = vert
  overallLevel:      RiskLevel;         // niveau synthétique
  recommendedAction: string;
  detail:            string;            // phrase contextuelle courte
}

export interface ComplianceRiskMap {
  categories:    RiskCategory[];
  overallScore:  number;                // 0-100 (score de risque agrégé)
  criticalCount: number;
  elevatedCount: number;
  generatedAtDay: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function level(v: number): RiskLevel {
  if (v >= 76) return "critique";
  if (v >= 51) return "élevé";
  if (v >= 26) return "sous surveillance";
  return "faible";
}

function controlLevel(v: number): RiskLevel {
  // Inverse : contrôle fort (haut) = vert (faible risque)
  if (v >= 75) return "faible";
  if (v >= 50) return "sous surveillance";
  if (v >= 25) return "élevé";
  return "critique";
}

function overallFrom(prob: RiskLevel, sev: RiskLevel, exp: RiskLevel, ctrl: RiskLevel): RiskLevel {
  const ORDER: RiskLevel[] = ["faible", "sous surveillance", "élevé", "critique"];
  const idx = (l: RiskLevel) => ORDER.indexOf(l);
  // Contrôle faible (critique) aggrave, contrôle fort (faible) atténue
  const ctrlMalus = idx(ctrl) === 3 ? 1 : idx(ctrl) === 2 ? 0 : -1;
  const raw = Math.round((idx(prob) + idx(sev) + idx(exp)) / 3) + ctrlMalus;
  return ORDER[Math.max(0, Math.min(3, raw))] ?? "faible";
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ── Calcul des 9 catégories ───────────────────────────────────────────────────

export function computeComplianceRiskMap(state: StrategyGameState): ComplianceRiskMap {
  const cs      = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
  const hp      = state.hiddenPolitics;
  const abuse   = state.abuseOfPowerState;
  const ag      = state.aiGovernanceState ?? DEFAULT_AI_GOVERNANCE_STATE;
  const derog   = state.derogations ?? [];
  const mconfl  = state.ministerConflicts ?? {};
  const oversight = state.oversightState;
  const proc    = state.procurementState;
  const wb      = state.whistleblowerAlerts ?? [];
  const reports = state.missionReports ?? [];
  const acep    = state.antiCorruptionState;
  const completed = state.strategyResearch?.completed ?? [];

  // Contrôle anti-corruption : niveau du programme
  const acepCtrl = acep
    ? acep.level === "indépendant" ? 90 : acep.level === "renforcé" ? 75 : acep.level === "actif" ? 55 : acep.level === "symbolique" ? 30 : 10
    : 10;

  // Contrôle oversightAuthorities : confiance moyenne
  const avgTrust = oversight
    ? Object.values(oversight.authorityTrust).reduce((a: number, b: unknown) => a + (b as number), 0) /
      Math.max(1, Object.values(oversight.authorityTrust).length)
    : 50;

  // Conflits ministériels : nb problématiques
  const problematicMinisters = Object.values(mconfl).filter(
    (p) => p.overallRisk >= 60 || p.disclosureStatus === "problématique",
  ).length;

  // Opérations secrètes : score de risque moyen des 3 derniers rapports sensibles
  const covertReports = reports.filter((r) => r.covertCompliance?.isCovertOperation).slice(0, 3);
  const avgCovertRisk = covertReports.length > 0
    ? covertReports.reduce((a, r) => a + (r.covertCompliance?.riskScore ?? 0), 0) / covertReports.length
    : 0;

  const categories: RiskCategory[] = [
    // ── 1. CORRUPTION ──────────────────────────────────────────────────────
    {
      id:    "corruption",
      label: "Corruption",
      icon:  "cash-remove",
      probability:  level(cs.corruptionExposure),
      severity:     level(cs.corruptionExposure >= 60 ? 75 : cs.corruptionExposure),
      exposure:     level(wb.length > 2 ? 70 : wb.length > 0 ? 45 : cs.corruptionExposure * 0.6),
      control:      controlLevel(acepCtrl),
      overallLevel: "faible", // calculé après
      recommendedAction: cs.corruptionExposure >= 60
        ? "Lancer un audit interne prioritaire ou renforcer le programme anti-corruption."
        : "Maintenir les contrôles existants et surveiller les indicateurs de dérive.",
      detail: `Exposition : ${cs.corruptionExposure} · Lanceurs d'alerte actifs : ${wb.length}`,
    },
    // ── 2. MARCHÉS PUBLICS ─────────────────────────────────────────────────
    {
      id:    "marches_publics",
      label: "Marchés publics",
      icon:  "handshake-outline",
      probability:  level(proc ? (proc.vendorConcentration + proc.conflictOfInterestRisk) / 2 : cs.auditPressure * 0.5),
      severity:     level(proc ? 100 - proc.procurementIntegrity : 50),
      exposure:     level(cs.auditPressure >= 60 ? cs.auditPressure : cs.auditPressure * 0.7),
      control:      controlLevel(proc ? proc.procurementIntegrity : 50),
      overallLevel: "faible",
      recommendedAction: proc && proc.procurementIntegrity < 45
        ? "Appels d'offres complets obligatoires sur les marchés stratégiques."
        : "Poursuivre les procédures standard avec audit périodique.",
      detail: `Intégrité marchés : ${proc ? proc.procurementIntegrity : "—"} · Audit pression : ${cs.auditPressure}`,
    },
    // ── 3. POUVOIRS D'URGENCE ──────────────────────────────────────────────
    {
      id:    "pouvoirs_urgence",
      label: "Pouvoirs d'urgence",
      icon:  "gavel",
      probability:  level(cs.emergencyPowersAbuse),
      severity:     level(abuse ? abuse.index : cs.emergencyPowersAbuse),
      exposure:     level(getActiveUnreviewed(state).length * 20),
      control:      controlLevel(100 - clamp(getActiveUnreviewed(state).length * 15)),
      overallLevel: "faible",
      recommendedAction: cs.emergencyPowersAbuse >= 55 || (abuse && abuse.index >= 40)
        ? "Justifier ou auditer les dérogations non-révisées. Réduire l'indice d'abus."
        : "Maintenir un suivi régulier des dérogations actives.",
      detail: `Abus pouvoirs : ${cs.emergencyPowersAbuse} · Dérogations non-justifiées : ${getActiveUnreviewed(state).length} · Indice abus : ${abuse?.index ?? 0}`,
    },
    // ── 4. DONNÉES CIVIQUES ────────────────────────────────────────────────
    {
      id:    "donnees_civiques",
      label: "Données civiques",
      icon:  "account-eye-outline",
      probability:  level(ag.automationAbuseRisk),
      severity:     level(ag.activeDeployments.includes("social_scoring") ? 80 : ag.automationAbuseRisk),
      exposure:     level(ag.aiTransparency < 30 ? 70 : ag.aiTransparency < 50 ? 45 : 20),
      control:      controlLevel(ag.humanOversight),
      overallLevel: "faible",
      recommendedAction: ag.automationAbuseRisk >= 55
        ? "Limiter l'automatisation dans les secteurs sensibles et renforcer la supervision humaine."
        : "Maintenir la transparence algorithmique et les audits périodiques.",
      detail: `Risque abus auto. : ${ag.automationAbuseRisk} · Supervision : ${ag.humanOversight} · Transparence : ${ag.aiTransparency}`,
    },
    // ── 5. OPÉRATIONS SECRÈTES ────────────────────────────────────────────
    {
      id:    "operations_secretes",
      label: "Opérations secrètes",
      icon:  "eye-off-outline",
      probability:  level(avgCovertRisk),
      severity:     level(covertReports.some((r) => r.covertCompliance?.verdict === "leak_vulnerable") ? 75 : avgCovertRisk),
      exposure:     level(avgCovertRisk * 0.8),
      control:      controlLevel(covertReports.length > 0
        ? covertReports.reduce((a, r) => a + (r.covertCompliance?.profile.legalDefensibility ?? 50), 0) / covertReports.length
        : 60),
      overallLevel: "faible",
      recommendedAction: avgCovertRisk >= 55
        ? "Passer en revue les opérations récentes à risque d'attribution ou de fuite."
        : "Maintenir les protocoles de conformité opérationnelle existants.",
      detail: `Score risque moyen (3 dernières op.) : ${Math.round(avgCovertRisk)} · Opérations évaluées : ${covertReports.length}`,
    },
    // ── 6. CONFLITS D'INTÉRÊTS ────────────────────────────────────────────
    {
      id:    "conflits_interets",
      label: "Conflits d'intérêts",
      icon:  "account-tie-outline",
      probability:  level(problematicMinisters * 22 + cs.corruptionExposure * 0.3),
      severity:     level(problematicMinisters >= 3 ? 75 : problematicMinisters * 25),
      exposure:     level(cs.whistleblowerRisk >= 50 ? cs.whistleblowerRisk : cs.whistleblowerRisk * 0.8),
      control:      controlLevel(Object.values(mconfl).filter((p) => p.disclosureStatus === "audité" || p.disclosureStatus === "déclaré").length * 20),
      overallLevel: "faible",
      recommendedAction: problematicMinisters >= 2
        ? "Demander des déclarations publiques ou lancer des audits éthiques sur les ministres à risque."
        : "Maintenir les déclarations à jour et surveiller les risques de pantouflage.",
      detail: `Ministres à risque élevé : ${problematicMinisters} · Risque lanceurs : ${cs.whistleblowerRisk}`,
    },
    // ── 7. IA GOUVERNEMENTALE ─────────────────────────────────────────────
    {
      id:    "ia_gouvernementale",
      label: "IA gouvernementale",
      icon:  "robot-outline",
      probability:  level(ag.algorithmicRisk),
      severity:     level(computeAIRiskScore(ag)),
      exposure:     level(ag.hiddenErrors * 20 + (ag.aiTransparency < 40 ? 30 : 0)),
      control:      controlLevel(Math.round((ag.humanOversight + ag.aiTransparency) / 2)),
      overallLevel: "faible",
      recommendedAction: computeAIRiskScore(ag) >= 55
        ? "Commander un audit des systèmes IA et renforcer la supervision humaine sur les décisions sensibles."
        : completed.includes("research_admin_ai")
          ? "Surveiller les dérives algorithmiques et maintenir les contrôles humains actifs."
          : "Aucun système IA actif — risque résiduel faible.",
      detail: `Score risque IA : ${computeAIRiskScore(ag)} · Erreurs dissimulées : ${ag.hiddenErrors} · Déploiements : ${ag.activeDeployments.length}`,
    },
    // ── 8. LIBERTÉS PUBLIQUES ─────────────────────────────────────────────
    {
      id:    "libertes_publiques",
      label: "Libertés publiques",
      icon:  "scale-balance",
      probability:  level(abuse ? abuse.index : hp.scandalRisk * 0.5),
      severity:     level(hp.institutionalStability < 35 ? 80 : hp.institutionalStability < 55 ? 50 : 25),
      exposure:     level(hp.mediaMood < 30 ? 70 : hp.mediaMood < 50 ? 40 : 20),
      control:      controlLevel(Math.round((avgTrust + hp.institutionalStability) / 2)),
      overallLevel: "faible",
      recommendedAction: (abuse?.index ?? 0) >= 45 || hp.institutionalStability < 40
        ? "Réduire l'indice d'abus de pouvoir. Coopérer avec les autorités indépendantes."
        : "Maintenir l'équilibre institutionnel et la transparence décisionnelle.",
      detail: `Indice abus : ${abuse?.index ?? 0} · Stabilité instit. : ${hp.institutionalStability} · Confiance autorités : ${Math.round(avgTrust)}`,
    },
    // ── 9. SANCTIONS INTERNATIONALES ──────────────────────────────────────
    {
      id:    "sanctions_internationales",
      label: "Sanctions internationales",
      icon:  "earth-remove",
      probability:  level(cs.legalRisk >= 60 ? cs.legalRisk : cs.legalRisk * 0.7),
      severity:     level(cs.legalRisk >= 70 ? 80 : cs.legalRisk >= 50 ? 55 : 30),
      exposure:     level(state.nationalIndicators.economy < 40 ? 60 : cs.legalRisk * 0.6),
      control:      controlLevel(Math.min(90, state.nationalIndicators.security + state.nationalIndicators.economy) / 2),
      overallLevel: "faible",
      recommendedAction: cs.legalRisk >= 60
        ? "Réduire l'exposition juridique et améliorer la conformité internationale fictive."
        : "Maintenir le dialogue diplomatique et surveiller les signaux d'alerte précoce.",
      detail: `Risque juridique : ${cs.legalRisk} · Économie : ${state.nationalIndicators.economy} · Sécurité : ${state.nationalIndicators.security}`,
    },
  ];

  // Calcul du niveau global pour chaque catégorie
  const resolved = categories.map((c) => ({
    ...c,
    overallLevel: overallFrom(c.probability, c.severity, c.exposure, c.control),
  }));

  const ORDER: RiskLevel[] = ["faible", "sous surveillance", "élevé", "critique"];
  const levelScore = (l: RiskLevel) => ORDER.indexOf(l) * 33;

  const criticalCount = resolved.filter((c) => c.overallLevel === "critique").length;
  const elevatedCount = resolved.filter((c) => c.overallLevel === "élevé").length;

  const overallScore = clamp(Math.round(
    resolved.reduce((s, c) => s + levelScore(c.overallLevel), 0) / resolved.length,
  ));

  return {
    categories:     resolved,
    overallScore,
    criticalCount,
    elevatedCount,
    generatedAtDay: state.mandateDay,
  };
}

export function getOverallRiskInfo(score: number): { label: string; color: string } {
  if (score >= 76) return { label: "Exposition critique",       color: "#e54848" };
  if (score >= 51) return { label: "Risques significatifs",    color: "#e8864f" };
  if (score >= 26) return { label: "Sous surveillance active", color: "#e8c44f" };
  return               { label: "Profil conforme",              color: "#4caf82" };
}
