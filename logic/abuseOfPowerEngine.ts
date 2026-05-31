/**
 * abuseOfPowerEngine.ts — Indice d'Abus de Pouvoir (MODE DELTA).
 *
 * abuseOfPowerIndex (0-100) :
 *   Mesure la dérive autoritaire du dirigeant. Monte sous pression
 *   (dérogations, surveillance, étouffement de l'opposition, attaques médias,
 *   audits ignorés, décisions secrètes, pacte Obscurium). Baisse avec
 *   les contre-pouvoirs, la transparence et la coopération institutionnelle.
 *
 * Niveaux de risque :
 *   0-29   : stable   — démocratie fonctionnelle, pas d'effet
 *   30-54  : concern  — inquiétude : instabilité latente, légère érosion
 *   55-74  : crisis   — crise institutionnelle : effets marqués, événement possible
 *   75-100 : critical — dérive du pouvoir : événement garanti, sanctions institutionnelles
 *
 * Effets passifs :
 *   ≥ 30 (×6j) : institutionalStability -1
 *   ≥ 30 (×8j) : eliteTrust -1
 *   ≥ 55 (×4j) : institutionalStability -1 (en plus)
 *   ≥ 55 (×5j) : eliteTrust -1 (en plus), scandalRisk +1
 *   ≥ 75 (×3j) : popularFatigue +1, oppositionPower +1
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";
import { queueNews } from "@/logic/newsEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AbuseOfPowerState {
  index: number;           // 0-100
  lastDeriveAt: number;    // mandateDay du dernier événement "dérive du pouvoir"
}

export type AbuseRiskLevel = "stable" | "concern" | "crisis" | "critical";

export interface AbuseRiskInfo {
  level: AbuseRiskLevel;
  label: string;
  color: string;
  description: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

export const DEFAULT_ABUSE_STATE: AbuseOfPowerState = {
  index: 5,
  lastDeriveAt: -999,
};

const RISK_LEVELS: { threshold: number; info: AbuseRiskInfo }[] = [
  {
    threshold: 75,
    info: {
      level: "critical",
      label: "Dérive du pouvoir",
      color: "#e54848",
      description:
        "La concentration du pouvoir est jugée incompatible avec l'État de droit. Une crise constitutionnelle est imminente.",
    },
  },
  {
    threshold: 55,
    info: {
      level: "crisis",
      label: "Crise institutionnelle",
      color: "#e8864f",
      description:
        "Les institutions de contrôle tirent la sonnette d'alarme. La légitimité de l'exécutif est sérieusement remise en cause.",
    },
  },
  {
    threshold: 30,
    info: {
      level: "concern",
      label: "Inquiétude institutionnelle",
      color: "#e8c44f",
      description:
        "Des signaux préoccupants s'accumulent. Les contre-pouvoirs exercent une vigilance accrue sur les décisions de l'exécutif.",
    },
  },
  {
    threshold: 0,
    info: {
      level: "stable",
      label: "Démocratie stable",
      color: "#4caf82",
      description:
        "L'équilibre des pouvoirs est respecté. Les institutions fonctionnent normalement et la transparence est au rendez-vous.",
    },
  },
];

export function getAbuseRiskInfo(index: number): AbuseRiskInfo {
  return (RISK_LEVELS.find((r) => index >= r.threshold) ?? RISK_LEVELS[RISK_LEVELS.length - 1]).info;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function everyN(day: number, n: number): boolean {
  return day > 0 && day % n === 0;
}

// ── Tick ──────────────────────────────────────────────────────────────────────

export function tickAbuseOfPower(state: StrategyGameState): StrategyGameState {
  const day     = state.mandateDay;
  const hp      = state.hiddenPolitics;
  const cs      = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
  const abuse   = state.abuseOfPowerState ?? { ...DEFAULT_ABUSE_STATE };
  const cosmic  = state.cosmicState;
  const derog   = state.derogations ?? [];
  const oversight = state.oversightState;

  let delta = 0;

  // ── Pression (monte l'index) ─────────────────────────────────────────────

  // Dérogations non-justifiées : ≥ 3 actives
  const unreviewedDerog = derog.filter((d) => !d.reviewed).length;
  if (unreviewedDerog >= 3)                               delta += 0.8;
  if (unreviewedDerog >= 5)                               delta += 0.6;

  // Abus des pouvoirs d'exception
  if (cs.emergencyPowersAbuse >= 60 && everyN(day, 3))   delta += 0.6;
  if (cs.emergencyPowersAbuse >= 80 && everyN(day, 2))   delta += 0.5;

  // Opposition neutralisée brutalement
  if (hp.institutionalStability <= 30 && everyN(day, 4)) delta += 0.5;
  if (hp.institutionalStability <= 30 &&
      state.nationalIndicators.security >= 70 &&
      everyN(day, 3))                                     delta += 0.4;

  // Médias attaqués (humeur très basse)
  if (hp.mediaMood <= 20 && everyN(day, 3))              delta += 0.5;
  if (hp.mediaMood <= 10 && everyN(day, 2))              delta += 0.4;

  // Audits ignorés (pression haute + conformité basse)
  if (cs.auditPressure >= 65 && cs.complianceScore <= 40 && everyN(day, 3))  delta += 0.6;
  if (cs.legalRisk >= 70 && everyN(day, 3))              delta += 0.4;

  // Conflits d'intérêts ministériels ignorés
  const ministerConflicts = state.ministerConflicts;
  if (ministerConflicts) {
    const problematic = Object.values(ministerConflicts).filter(
      (p) => p.overallRisk >= 65 && p.disclosureStatus === "non déclaré",
    ).length;
    if (problematic >= 2 && everyN(day, 4))              delta += 0.5;
  }

  // Pacte obscurium actif (système cosmique)
  if (cosmic?.activePact === "obscurium" && everyN(day, 3))  delta += 0.6;
  if (cosmic?.obscuriumInfluence !== undefined &&
      cosmic.obscuriumInfluence >= 60 && everyN(day, 4))     delta += 0.4;

  // Confiance des autorités basse
  if (oversight) {
    const trustValues = Object.values(oversight.authorityTrust) as number[];
    const avgTrust = trustValues.length > 0
      ? trustValues.reduce((a, b) => a + b, 0) / trustValues.length
      : 60;
    if (avgTrust < 35 && everyN(day, 4))                 delta += 0.5;
  }

  // ── Réduction (baisse l'index) ────────────────────────────────────────────

  // Contrôle des autorités indépendantes (confiance haute)
  if (oversight) {
    const trustValues = Object.values(oversight.authorityTrust) as number[];
    const avgTrust = trustValues.length > 0
      ? trustValues.reduce((a, b) => a + b, 0) / trustValues.length
      : 60;
    if (avgTrust >= 60 && everyN(day, 4))               delta -= 0.4;
    if (avgTrust >= 75 && everyN(day, 3))               delta -= 0.3;
  }

  // Conformité haute (audits acceptés, transparence)
  if (cs.complianceScore >= 70 && everyN(day, 5))       delta -= 0.4;
  if (cs.complianceScore >= 85 && everyN(day, 4))       delta -= 0.3;

  // Médias sereins (liberté de presse)
  if (hp.mediaMood >= 65 && everyN(day, 6))             delta -= 0.3;

  // Stabilité institutionnelle haute
  if (hp.institutionalStability >= 65 && everyN(day, 5)) delta -= 0.2;

  // Risque juridique bas (état de droit respecté)
  if (cs.legalRisk <= 20 && everyN(day, 5))             delta -= 0.3;

  // Drift naturel vers 0 si index > 10
  if (abuse.index > 10 && everyN(day, 7))               delta -= 0.15;

  const newIndex = clamp(abuse.index + delta);

  // ── Effets passifs sur hiddenPolitics ─────────────────────────────────────

  let hp2 = { ...hp };

  if (newIndex >= 30) {
    if (everyN(day, 6)) hp2 = { ...hp2, institutionalStability: clamp(hp2.institutionalStability - 1) };
    if (everyN(day, 8)) hp2 = { ...hp2, eliteTrust: clamp(hp2.eliteTrust - 1) };
  }
  if (newIndex >= 55) {
    if (everyN(day, 4)) hp2 = { ...hp2, institutionalStability: clamp(hp2.institutionalStability - 1) };
    if (everyN(day, 5)) hp2 = { ...hp2, eliteTrust: clamp(hp2.eliteTrust - 1) };
    if (everyN(day, 4)) hp2 = { ...hp2, scandalRisk: clamp(hp2.scandalRisk + 1) };
  }
  if (newIndex >= 75) {
    if (everyN(day, 3)) hp2 = { ...hp2, popularFatigue: clamp(hp2.popularFatigue + 1) };
    // oppositionPower est dans nationalIndicators.security implicitement — on utilise hiddenPolitics
    if (everyN(day, 3)) hp2 = { ...hp2, scandalRisk: clamp(hp2.scandalRisk + 1) };
  }

  // ── Déclenchement "Dérive du pouvoir" ────────────────────────────────────

  const shouldTriggerDerive = newIndex >= 75 && day - abuse.lastDeriveAt >= 20;
  const news2 = shouldTriggerDerive
    ? queueNews(state.news, "abuse_derive_du_pouvoir")
    : state.news;

  const lastDeriveAt = shouldTriggerDerive ? day : abuse.lastDeriveAt;

  return {
    ...state,
    hiddenPolitics: hp2,
    news: news2,
    abuseOfPowerState: { index: newIndex, lastDeriveAt },
  };
}

// ── Bilan de Mandat ───────────────────────────────────────────────────────────

export interface AbuseBilanResult {
  index: number;
  level: AbuseRiskLevel;
  label: string;
  color: string;
  scorePenalty: number; // 0 à -20 points déduits du bilan global
  bilanText: string;
}

export function computeAbuseBilan(state: StrategyGameState): AbuseBilanResult {
  const abuse = state.abuseOfPowerState ?? DEFAULT_ABUSE_STATE;
  const info  = getAbuseRiskInfo(abuse.index);

  let scorePenalty = 0;
  let bilanText    = "";

  if (abuse.index >= 75) {
    scorePenalty = -20;
    bilanText = "Une dérive autoritaire significative a marqué ce mandat. Les institutions démocratiques ont été fragilisées.";
  } else if (abuse.index >= 55) {
    scorePenalty = -12;
    bilanText = "Des tensions institutionnelles persistantes ont terni le bilan démocratique de ce mandat.";
  } else if (abuse.index >= 30) {
    scorePenalty = -5;
    bilanText = "Quelques épisodes d'abus ont suscité l'inquiétude des contre-pouvoirs, sans provoquer de crise ouverte.";
  } else {
    scorePenalty = 0;
    bilanText = "L'équilibre des pouvoirs a été respecté tout au long du mandat. Un bilan démocratique satisfaisant.";
  }

  return {
    index: abuse.index,
    level: info.level,
    label: info.label,
    color: info.color,
    scorePenalty,
    bilanText,
  };
}
