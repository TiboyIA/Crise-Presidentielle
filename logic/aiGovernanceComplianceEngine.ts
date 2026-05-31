/**
 * aiGovernanceComplianceEngine.ts — Conformité de l'IA Gouvernementale (MODE DELTA).
 *
 * Gouvernance fictive des systèmes d'aide à la décision automatisés.
 * Pas de réglementation réelle, pas de conseil juridique — uniquement la
 * dimension politique et institutionnelle fictive du déploiement de l'IA d'État.
 *
 * Indicateurs (0-100) :
 *   aiTransparency       : niveau de transparence algorithmique publique
 *   humanOversight       : degré de supervision humaine effective
 *   algorithmicRisk      : risque de dérive ou d'erreur algorithmique
 *   publicTrustAI        : confiance publique dans les systèmes d'IA d'État
 *   automationAbuseRisk  : risque d'abus dans l'automatisation (scoring, surveillance)
 *
 * Déclencheurs d'activation :
 *   • research_admin_ai complété → initialise l'état, algorithmicRisk démarre à 30
 *   • research_digital_twin complété → automationAbuseRisk démarre à 25
 *   • research_digital_hospitals complété → secteur santé numérique actif
 *
 * Niveaux de risque :
 *   0-25  : safe     — gouvernance maîtrisée
 *   26-50 : watch    — signaux d'alerte latents
 *   51-70 : concern  — dérives institutionnelles visibles
 *   71+   : crisis   — crise de légitimité algorithmique
 */

import type { StrategyGameState } from "@/types/strategy";
import type { StrategyResearchId } from "@/types/strategyResearch";
import { queueNews } from "@/logic/newsEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIGovernanceState {
  aiTransparency:      number; // 0-100 (haut = transparent)
  humanOversight:      number; // 0-100 (haut = supervisé)
  algorithmicRisk:     number; // 0-100 (haut = risqué)
  publicTrustAI:       number; // 0-100 (haut = confiance)
  automationAbuseRisk: number; // 0-100 (haut = abus possible)
  lastEventAt:         number; // mandateDay du dernier événement IA
  activeDeployments:   AIDeploymentId[]; // systèmes déployés
  hiddenErrors:        number; // erreurs IA dissimulées (compteur)
}

export type AIDeploymentId =
  | "admin_ai"          // IA administrative
  | "digital_hospitals" // santé numérique
  | "digital_twin"      // jumeau numérique
  | "justice_ai"        // justice automatisée fictive
  | "social_scoring"    // scoring citoyen fictif
  | "surveillance_auto"; // surveillance automatisée

export const AI_DEPLOYMENT_LABELS: Record<AIDeploymentId, string> = {
  admin_ai:          "IA administrative",
  digital_hospitals: "Santé numérique",
  digital_twin:      "Jumeau numérique",
  justice_ai:        "Justice automatisée",
  social_scoring:    "Scoring citoyen",
  surveillance_auto: "Surveillance automatisée",
};

export type AIRiskLevel = "safe" | "watch" | "concern" | "crisis";

export interface AIRiskInfo {
  level:       AIRiskLevel;
  label:       string;
  color:       string;
  description: string;
}

export const DEFAULT_AI_GOVERNANCE_STATE: AIGovernanceState = {
  aiTransparency:      30,
  humanOversight:      60,
  algorithmicRisk:     10,
  publicTrustAI:       55,
  automationAbuseRisk: 5,
  lastEventAt:         0,
  activeDeployments:   [],
  hiddenErrors:        0,
};

// ── Correspondance recherche → déploiement ────────────────────────────────────

const RESEARCH_TO_DEPLOYMENT: Partial<Record<StrategyResearchId, AIDeploymentId>> = {
  research_admin_ai:         "admin_ai",
  research_digital_hospitals: "digital_hospitals",
  research_digital_twin:     "digital_twin",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function everyN(day: number, n: number): boolean {
  return day > 0 && day % n === 0;
}

function isActive(ag: AIGovernanceState): boolean {
  return ag.activeDeployments.length > 0;
}

// ── Niveau de risque global ───────────────────────────────────────────────────
// Score = moyenne pondérée des indicateurs défavorables

export function computeAIRiskScore(ag: AIGovernanceState): number {
  return clamp(Math.round(
    ag.algorithmicRisk   * 0.35 +
    ag.automationAbuseRisk * 0.30 +
    (100 - ag.humanOversight)  * 0.20 +
    (100 - ag.publicTrustAI)   * 0.15,
  ));
}

const RISK_LEVELS: { threshold: number; info: AIRiskInfo }[] = [
  { threshold: 71, info: { level: "crisis",  label: "Crise algorithmique",        color: "#e54848", description: "Des dérives graves sont documentées. La légitimité des systèmes automatisés est en cause." } },
  { threshold: 51, info: { level: "concern", label: "Dérives institutionnelles",  color: "#e8864f", description: "Plusieurs signaux convergent vers une perte de contrôle algorithmique." } },
  { threshold: 26, info: { level: "watch",   label: "Vigilance renforcée",        color: "#e8c44f", description: "Des risques latents existent mais restent maîtrisés à ce stade." } },
  { threshold: 0,  info: { level: "safe",    label: "Gouvernance maîtrisée",      color: "#4caf82", description: "Les systèmes IA sont supervisés et conformes aux exigences institutionnelles." } },
];

export function getAIRiskInfo(score: number): AIRiskInfo {
  return (RISK_LEVELS.find((r) => score >= r.threshold) ?? RISK_LEVELS[RISK_LEVELS.length - 1]).info;
}

// ── Tick passif ───────────────────────────────────────────────────────────────

export function tickAIGovernance(state: StrategyGameState): StrategyGameState {
  const completed = state.strategyResearch?.completed ?? [];
  const day       = state.mandateDay;
  const cs        = state.complianceState;
  const hp        = state.hiddenPolitics;

  // Détection des recherches IA nouvellement complétées → activation des déploiements
  let ag = state.aiGovernanceState ?? { ...DEFAULT_AI_GOVERNANCE_STATE };
  let news = state.news;
  const newDeployments = [...ag.activeDeployments];
  let initBoost = false;

  for (const [resId, depId] of Object.entries(RESEARCH_TO_DEPLOYMENT) as [StrategyResearchId, AIDeploymentId][]) {
    if (completed.includes(resId) && !newDeployments.includes(depId)) {
      newDeployments.push(depId);
      initBoost = true;
      // Boosts initiaux selon le déploiement
      if (resId === "research_admin_ai") {
        ag = { ...ag, algorithmicRisk: clamp(ag.algorithmicRisk + 20), activeDeployments: newDeployments };
        news = queueNews(news, "ai_deploy_notification");
      } else if (resId === "research_digital_twin") {
        ag = { ...ag, automationAbuseRisk: clamp(ag.automationAbuseRisk + 15), activeDeployments: newDeployments };
      } else {
        ag = { ...ag, activeDeployments: newDeployments };
      }
    }
  }

  if (!initBoost) {
    ag = { ...ag, activeDeployments: newDeployments };
  }

  // Si aucun déploiement IA actif, pas d'effets
  if (!isActive(ag)) {
    return { ...state, aiGovernanceState: ag, news };
  }

  // ── Drifts passifs ─────────────────────────────────────────────────────────

  let { aiTransparency, humanOversight, algorithmicRisk, publicTrustAI, automationAbuseRisk } = ag;

  // algorithmicRisk monte passivement avec les déploiements (entropie naturelle)
  const depCount = ag.activeDeployments.length;
  if (depCount >= 1 && everyN(day, 3))  algorithmicRisk  = clamp(algorithmicRisk  + 1);
  if (depCount >= 3 && everyN(day, 4))  algorithmicRisk  = clamp(algorithmicRisk  + 1);

  // automationAbuseRisk monte avec les systèmes de surveillance / scoring
  if (ag.activeDeployments.includes("surveillance_auto") && everyN(day, 3))
    automationAbuseRisk = clamp(automationAbuseRisk + 1);
  if (ag.activeDeployments.includes("social_scoring") && everyN(day, 2))
    automationAbuseRisk = clamp(automationAbuseRisk + 2);

  // humanOversight dérive vers 40 si non entretenu (les humains délèguent progressivement)
  if (humanOversight > 40 && everyN(day, 6)) humanOversight = clamp(humanOversight - 1);
  if (humanOversight < 40 && everyN(day, 8)) humanOversight = clamp(humanOversight + 1);

  // Supervision élevée ↓ risque algorithmique
  if (humanOversight >= 70 && everyN(day, 4))  algorithmicRisk  = clamp(algorithmicRisk  - 1);
  if (humanOversight >= 70 && everyN(day, 5))  automationAbuseRisk = clamp(automationAbuseRisk - 1);

  // Transparence basse ↓ confiance publique
  if (aiTransparency < 30 && everyN(day, 4))   publicTrustAI    = clamp(publicTrustAI    - 1);
  if (aiTransparency >= 60 && everyN(day, 5))  publicTrustAI    = clamp(publicTrustAI    + 1);

  // Erreurs dissimulées : risque croissant
  if (ag.hiddenErrors >= 2 && everyN(day, 3))  algorithmicRisk  = clamp(algorithmicRisk  + 1);
  if (ag.hiddenErrors >= 4 && everyN(day, 2))  automationAbuseRisk = clamp(automationAbuseRisk + 2);

  // Pression d'audit élevée : visibilité des risques IA augmentée
  if (cs && cs.auditPressure >= 65 && everyN(day, 4)) algorithmicRisk = clamp(algorithmicRisk + 1);

  // ── Effets sur hiddenPolitics ─────────────────────────────────────────────

  let newHp = { ...hp };
  const riskScore = computeAIRiskScore({ ...ag, aiTransparency, humanOversight, algorithmicRisk, publicTrustAI, automationAbuseRisk });

  if (riskScore >= 51 && everyN(day, 4))  newHp = { ...newHp, scandalRisk: clamp(newHp.scandalRisk + 1) };
  if (riskScore >= 71 && everyN(day, 3))  newHp = { ...newHp, institutionalStability: clamp(newHp.institutionalStability - 1) };
  if (publicTrustAI >= 65 && everyN(day, 6)) newHp = { ...newHp, mediaMood: clamp(newHp.mediaMood + 1) };

  // ── Déclenchement événements automatiques ─────────────────────────────────

  if (riskScore >= 71 && day - ag.lastEventAt >= 15) {
    news   = queueNews(news, "ai_crisis_drift");
    ag     = { ...ag, lastEventAt: day };
  } else if (algorithmicRisk >= 65 && day - ag.lastEventAt >= 12) {
    news   = queueNews(news, "ai_error_hidden");
    ag     = { ...ag, lastEventAt: day };
  }

  return {
    ...state,
    hiddenPolitics:    newHp,
    news,
    aiGovernanceState: {
      ...ag,
      aiTransparency,
      humanOversight,
      algorithmicRisk,
      publicTrustAI,
      automationAbuseRisk,
    },
  };
}

// ── Actions sur l'état IA ─────────────────────────────────────────────────────
// Appelées depuis la résolution d'un NewsChoice via des deltas spécifiques

export interface AIGovernanceDeltas {
  aiTransparencyDelta?:      number;
  humanOversightDelta?:      number;
  algorithmicRiskDelta?:     number;
  publicTrustAIDelta?:       number;
  automationAbuseRiskDelta?: number;
  addDeployment?:            AIDeploymentId;
  hideError?:                boolean; // incrémente hiddenErrors
}

export function applyAIGovernanceDeltas(
  state: StrategyGameState,
  deltas: AIGovernanceDeltas,
): StrategyGameState {
  const ag = state.aiGovernanceState ?? { ...DEFAULT_AI_GOVERNANCE_STATE };
  const updated: AIGovernanceState = {
    ...ag,
    aiTransparency:      clamp(ag.aiTransparency      + (deltas.aiTransparencyDelta      ?? 0)),
    humanOversight:      clamp(ag.humanOversight       + (deltas.humanOversightDelta      ?? 0)),
    algorithmicRisk:     clamp(ag.algorithmicRisk      + (deltas.algorithmicRiskDelta     ?? 0)),
    publicTrustAI:       clamp(ag.publicTrustAI        + (deltas.publicTrustAIDelta       ?? 0)),
    automationAbuseRisk: clamp(ag.automationAbuseRisk  + (deltas.automationAbuseRiskDelta ?? 0)),
    hiddenErrors:        deltas.hideError
      ? ag.hiddenErrors + 1
      : ag.hiddenErrors,
    activeDeployments:   deltas.addDeployment && !ag.activeDeployments.includes(deltas.addDeployment)
      ? [...ag.activeDeployments, deltas.addDeployment]
      : ag.activeDeployments,
  };
  return { ...state, aiGovernanceState: updated };
}

// ── Helpers d'affichage ───────────────────────────────────────────────────────

export function getAITransparencyLabel(v: number): string {
  if (v >= 75) return "Transparence forte";
  if (v >= 50) return "Partiellement transparent";
  if (v >= 25) return "Opacité partielle";
  return "Opacité systémique";
}

export function getOversightLabel(v: number): string {
  if (v >= 75) return "Supervision active";
  if (v >= 50) return "Supervision partielle";
  if (v >= 25) return "Supervision affaiblie";
  return "Délégation totale";
}
