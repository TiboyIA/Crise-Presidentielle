/**
 * complianceEngine.ts — Bureau de Conformité de l'État (MODE DELTA).
 *
 * complianceScore (0-100, composé) :
 *   procurementIntegrity  × 0.30  (haut = bien)
 *   emergencyPowersAbuse  × 0.25  (bas = bien)
 *   corruptionExposure    × 0.25  (bas = bien)
 *   legalRisk             × 0.20  (bas = bien)
 *
 * Bands :
 *   75-100 : conforme     — stabilité instit +, risque scandale -
 *   50-74  : surveillance — fonctionnement normal, pression latente
 *   25-49  : risque       — audits, fuites, annulation de réforme potentielle
 *   0-24   : crise        — commission d'enquête, légitimité en jeu
 *
 * Effets passifs :
 *   score < 25 (×3j) : scandalRisk +1, institutionalStability -1 (×4j), oppositionPower +1
 *   score < 50 (×5j) : mediaMood -1, oppositionPower +1
 *   score ≥ 75 (×5j) : eliteTrust +1, scandalRisk -1 (×6j)
 *   whistleblowerRisk ≥ 75 (×4j) : mediaMood -1
 */

import type { StrategyGameState } from "@/types/strategy";
import type { ComplianceBand, ComplianceBandInfo, ComplianceState } from "@/types/compliance";

export type { ComplianceBand, ComplianceBandInfo, ComplianceState };

export const DEFAULT_COMPLIANCE_STATE: ComplianceState = {
  complianceScore:      70,
  legalRisk:            20,
  auditPressure:        15,
  corruptionExposure:   10,
  procurementIntegrity: 75,
  emergencyPowersAbuse: 10,
  whistleblowerRisk:    15,
  lastAuditAt:          0,
};

const BANDS: { threshold: number; info: ComplianceBandInfo }[] = [
  {
    threshold: 75,
    info: {
      band: "conforme", label: "État conforme", color: "#4caf82",
      message: "Les procédures sont respectées, les marchés publics intègres. La confiance institutionnelle est préservée.",
    },
  },
  {
    threshold: 50,
    info: {
      band: "surveillance", label: "Sous surveillance", color: "#e8c44f",
      message: "Des irrégularités ponctuelles sont signalées. Les organes de contrôle exercent une pression croissante.",
    },
  },
  {
    threshold: 25,
    info: {
      band: "risque", label: "État à risque", color: "#e8864f",
      message: "Des audits sont en cours. Des fuites internes menacent l'image du gouvernement. Une réforme s'impose avant l'escalade.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "crise", label: "Crise institutionnelle", color: "#e54848",
      message: "Une commission d'enquête est probable. Les oppositions exploitent chaque faille. La légitimité de l'exécutif est en jeu.",
    },
  },
];

export function getComplianceBandInfo(score: number): ComplianceBandInfo {
  return (BANDS.find((b) => score >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function drift(current: number, target: number, speed: number): number {
  if (current < target) return Math.min(target, current + speed);
  if (current > target) return Math.max(target, current - speed);
  return current;
}

function computeScore(c: Omit<ComplianceState, "complianceScore" | "lastAuditAt">): number {
  return clamp(
    c.procurementIntegrity    * 0.30 +
    (100 - c.emergencyPowersAbuse) * 0.25 +
    (100 - c.corruptionExposure)   * 0.25 +
    (100 - c.legalRisk)            * 0.20,
  );
}

function computeTargets(state: StrategyGameState, prev: ComplianceState): Omit<ComplianceState, "complianceScore" | "lastAuditAt"> {
  const hp              = state.hiddenPolitics;
  const scandalRisk     = hp?.scandalRisk ?? 20;
  const instStab        = hp?.institutionalStability ?? 70;
  const popularFatigue  = hp?.popularFatigue ?? 15;
  const debt            = state.nationalDebt ?? 0;
  const shadow          = state.shadowEconomy ?? 30;
  const doctrine        = state.governanceDoctrine ?? "democratique";
  const isAutocratic    = doctrine === "autoritaire" || doctrine === "securitaire";

  const legalRisk = clamp(
    scandalRisk * 0.45 +
    (debt > 300 ? 18 : debt > 200 ? 8 : 0) +
    (prev.emergencyPowersAbuse >= 60 ? 12 : 0),
  );

  const corruptionExposure = clamp(
    scandalRisk * 0.30 +
    shadow * 0.25 +
    (instStab < 40 ? 20 : instStab < 55 ? 8 : 0),
  );

  const riskSignal = (prev.legalRisk + prev.corruptionExposure) / 2;
  const auditPressure = clamp(
    riskSignal * 0.55 +
    (prev.complianceScore < 40 ? 20 : 0) +
    (prev.whistleblowerRisk >= 60 ? 10 : 0),
  );

  const procurementIntegrity = clamp(
    instStab * 0.55 +
    (100 - prev.corruptionExposure) * 0.35 +
    (state.nationalIndicators?.economy ?? 55) * 0.10,
  );

  const emergencyPowersAbuse = clamp(
    (isAutocratic ? 35 : 8) +
    (scandalRisk >= 55 ? 15 : 0) +
    popularFatigue * 0.15,
  );

  const whistleblowerRisk = clamp(
    prev.corruptionExposure * 0.35 +
    scandalRisk * 0.25 +
    (prev.complianceScore < 35 ? 15 : 0),
  );

  return { legalRisk, corruptionExposure, auditPressure, procurementIntegrity, emergencyPowersAbuse, whistleblowerRisk };
}

export function tickCompliance(state: StrategyGameState): StrategyGameState {
  const SPEED = 3;
  const prev    = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
  const targets = computeTargets(state, prev);

  const next: ComplianceState = {
    legalRisk:            clamp(drift(prev.legalRisk,            targets.legalRisk,            SPEED)),
    corruptionExposure:   clamp(drift(prev.corruptionExposure,   targets.corruptionExposure,   SPEED)),
    auditPressure:        clamp(drift(prev.auditPressure,        targets.auditPressure,        SPEED)),
    procurementIntegrity: clamp(drift(prev.procurementIntegrity, targets.procurementIntegrity, SPEED)),
    emergencyPowersAbuse: clamp(drift(prev.emergencyPowersAbuse, targets.emergencyPowersAbuse, SPEED)),
    whistleblowerRisk:    clamp(drift(prev.whistleblowerRisk,    targets.whistleblowerRisk,    SPEED)),
    lastAuditAt:          prev.lastAuditAt,
    complianceScore:      0,
  };
  next.complianceScore = computeScore(next);

  let s: StrategyGameState = { ...state, complianceState: next };
  const day   = s.mandateDay;
  const score = next.complianceScore;

  if (score < 25) {
    if (day % 3 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, scandalRisk: clamp((s.hiddenPolitics?.scandalRisk ?? 20) + 1) } };
    if (day % 4 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: clamp((s.hiddenPolitics?.institutionalStability ?? 70) - 1) } };
    if (day % 3 === 0) s = { ...s, oppositionPower: clamp((s.oppositionPower ?? 35) + 1) };
  } else if (score < 50) {
    if (day % 5 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, mediaMood: clamp((s.hiddenPolitics?.mediaMood ?? 55) - 1) } };
    if (day % 5 === 0) s = { ...s, oppositionPower: clamp((s.oppositionPower ?? 35) + 1) };
  } else if (score >= 75) {
    if (day % 5 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, eliteTrust: clamp((s.hiddenPolitics?.eliteTrust ?? 65) + 1) } };
    if (day % 6 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, scandalRisk: clamp((s.hiddenPolitics?.scandalRisk ?? 20) - 1) } };
  }

  if (next.whistleblowerRisk >= 75 && day % 4 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, mediaMood: clamp((s.hiddenPolitics?.mediaMood ?? 55) - 1) } };
  }

  return s;
}
