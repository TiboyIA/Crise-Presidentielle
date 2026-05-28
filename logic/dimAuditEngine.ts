/**
 * dimAuditEngine.ts — Audit DIM National.
 *
 * Action présidentielle : lancer un audit des données hospitalières.
 * Coût : argent + influence + fatigue administrative.
 *
 * Effets positifs :
 *   medicalDataQuality +, hospitalCodingQuality +, healthDataTrust +,
 *   scandalRisk - si audit rassurant.
 *
 * Risques :
 *   Découverte d'anomalies → scandalRisk +, mediaMood -, healthDataTrust -
 *   à court terme, avant que les corrections améliorent la qualité.
 *
 * 5 résultats possibles (probabilistes selon l'état du système de santé) :
 *   1. audit_rassurant      — tout est conforme, confiance renforcée
 *   2. corrections_mineures — ajustements appliqués, risque mineur
 *   3. anomalies_serieuses  — problèmes détectés, scandale modéré
 *   4. scandale_statistique — révélation publique, crise politique
 *   5. redressement_complet — restructuration totale, gain maximum
 *
 * Aucune procédure médicale réelle, aucune donnée personnelle.
 */

import type { StrategyGameState, NewsLogEntry } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { DEFAULT_HEALTH_DATA_TRUST } from "@/logic/healthDataTrustEngine";

export type DimAuditOutcome =
  | "audit_rassurant"
  | "corrections_mineures"
  | "anomalies_serieuses"
  | "scandale_statistique"
  | "redressement_complet";

export interface DimAuditOutcomeDef {
  outcome:               DimAuditOutcome;
  label:                 string;
  color:                 string;
  urgency:               "faible" | "moyenne" | "forte" | "critique";
  headline:              string;
  description:           string;
  medicalDataDelta:      number;
  hospitalCodingDelta:   number;
  healthDataTrustDelta:  number;
  scandalRiskDelta:      number;
  mediaMoodDelta:        number;
  popularityDelta:       number;
  institutionalDelta:    number;
  adminFatigueDelta:     number;
}

export const DIM_AUDIT_OUTCOMES: Record<DimAuditOutcome, DimAuditOutcomeDef> = {
  audit_rassurant: {
    outcome:               "audit_rassurant",
    label:                 "Audit rassurant",
    color:                 "#4caf82",
    urgency:               "faible",
    headline:              "Audit DIM national : données hospitalières conformes",
    description:           "L'audit confirme la fiabilité des données hospitalières. Les indicateurs sont cohérents et les procédures de codage respectent les normes. La confiance dans les chiffres officiels s'en trouve renforcée.",
    medicalDataDelta:      6,
    hospitalCodingDelta:   4,
    healthDataTrustDelta:  8,
    scandalRiskDelta:      -5,
    mediaMoodDelta:        2,
    popularityDelta:       0,
    institutionalDelta:    2,
    adminFatigueDelta:     0,
  },
  corrections_mineures: {
    outcome:               "corrections_mineures",
    label:                 "Corrections mineures",
    color:                 "#8bc34a",
    urgency:               "moyenne",
    headline:              "Audit DIM : corrections mineures appliquées sur les données hospitalières",
    description:           "L'audit a identifié des écarts de codage ponctuels et des délais de remontée non optimaux. Les corrections sont en cours d'application. La qualité du système s'améliore sans impact politique majeur.",
    medicalDataDelta:      9,
    hospitalCodingDelta:   8,
    healthDataTrustDelta:  4,
    scandalRiskDelta:      -2,
    mediaMoodDelta:        0,
    popularityDelta:       0,
    institutionalDelta:    1,
    adminFatigueDelta:     5,
  },
  anomalies_serieuses: {
    outcome:               "anomalies_serieuses",
    label:                 "Anomalies sérieuses",
    color:                 "#e8c44f",
    urgency:               "forte",
    headline:              "Audit DIM : anomalies sérieuses révélées dans le système de codage hospitalier",
    description:           "L'audit met en évidence des défaillances de codage systématiques et des sous-déclarations dans plusieurs établissements. Les corrections sont lancées mais la révélation fragilise temporairement la confiance dans les données officielles.",
    medicalDataDelta:      12,
    hospitalCodingDelta:   11,
    healthDataTrustDelta:  -6,
    scandalRiskDelta:      10,
    mediaMoodDelta:        -5,
    popularityDelta:       -1,
    institutionalDelta:    -1,
    adminFatigueDelta:     10,
  },
  scandale_statistique: {
    outcome:               "scandale_statistique",
    label:                 "Scandale statistique",
    color:                 "#e8864f",
    urgency:               "critique",
    headline:              "ALERTE — Audit DIM : scandale statistique sur les données de santé nationales",
    description:           "L'audit révèle des manipulations dans les séries statistiques hospitalières : sous-déclarations massives et corrections tardives occultées. La presse s'empare de l'affaire. Les corrections forcées améliorent le système mais le coût politique est immédiat.",
    medicalDataDelta:      15,
    hospitalCodingDelta:   13,
    healthDataTrustDelta:  -15,
    scandalRiskDelta:      20,
    mediaMoodDelta:        -10,
    popularityDelta:       -3,
    institutionalDelta:    -2,
    adminFatigueDelta:     15,
  },
  redressement_complet: {
    outcome:               "redressement_complet",
    label:                 "Redressement complet",
    color:                 "#3fbe7a",
    urgency:               "moyenne",
    headline:              "Audit DIM : redressement complet du système d'information sanitaire",
    description:           "L'audit aboutit à une restructuration complète du dispositif de codage et de remontée des données. Toutes les anomalies sont corrigées, le processus est normalisé et renforcé. Résultat exceptionnel pour la crédibilité des données de santé.",
    medicalDataDelta:      16,
    hospitalCodingDelta:   14,
    healthDataTrustDelta:  13,
    scandalRiskDelta:      -10,
    mediaMoodDelta:        5,
    popularityDelta:       1,
    institutionalDelta:    3,
    adminFatigueDelta:     0,
  },
};

export const DIM_AUDIT_COST_MONEY     = 30;
export const DIM_AUDIT_COST_INFLUENCE = 25;
export const DIM_AUDIT_ADMIN_BASE     = 8;
export const DIM_AUDIT_COOLDOWN       = 18;

// ── Conditions ────────────────────────────────────────────────────────────────

export interface DimAuditCheck {
  ok:      boolean;
  reason?: string;
}

export function canLaunchDimAudit(state: StrategyGameState): DimAuditCheck {
  const lastAt       = state.lastDimAuditAt ?? -99;
  const cooldownLeft = DIM_AUDIT_COOLDOWN - (state.news.actionCount - lastAt);
  if (cooldownLeft > 0) {
    return { ok: false, reason: `Audit en récupération — disponible dans ${cooldownLeft} action${cooldownLeft > 1 ? "s" : ""}.` };
  }
  if (state.resources.money < DIM_AUDIT_COST_MONEY) {
    return { ok: false, reason: `Budget insuffisant — ${DIM_AUDIT_COST_MONEY} M€ requis.` };
  }
  if (state.resources.influence < DIM_AUDIT_COST_INFLUENCE) {
    return { ok: false, reason: `Influence insuffisante — ${DIM_AUDIT_COST_INFLUENCE} requis.` };
  }
  return { ok: true };
}

// ── Calcul probabiliste ───────────────────────────────────────────────────────

function computeProbabilities(state: StrategyGameState): [number, number, number, number, number] {
  // [rassurant, corrections, anomalies, scandale, redressement]
  let p = [20, 30, 25, 15, 10];

  const coding    = state.hospitalCodingQuality  ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  const mdq       = state.medicalDataQuality      ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const trust     = state.healthDataTrust         ?? DEFAULT_HEALTH_DATA_TRUST;
  const scandal   = state.hiddenPolitics?.scandalRisk ?? 20;
  const stability = state.hiddenPolitics?.institutionalStability ?? 70;

  if      (coding >= 70) { p[0] += 12; p[4] += 6; p[2] -= 10; p[3] -= 8; }
  else if (coding >= 50) { p[1] += 6;  p[0] += 4; }
  else if (coding <  30) { p[2] += 12; p[3] += 8; p[0] -= 10; p[4] -= 6; p[1] -= 4; }
  else if (coding <  45) { p[2] += 6;  p[3] += 3; p[0] -= 5; }

  if      (mdq >= 70) { p[0] += 8; p[4] += 5; p[3] -= 6; p[2] -= 5; }
  else if (mdq <  30) { p[3] += 8; p[2] += 5; p[0] -= 8; p[4] -= 3; }
  else if (mdq <  50) { p[2] += 4; p[0] -= 3; }

  if      (trust >= 70) { p[0] += 5; p[4] += 3; }
  else if (trust <  35) { p[3] += 6; p[2] += 3; p[0] -= 4; }

  if      (scandal >= 60) { p[3] += 10; p[0] -= 8; p[4] -= 5; }
  else if (scandal >= 40) { p[2] += 5;  p[3] += 3; p[0] -= 4; }
  else if (scandal <  15) { p[0] += 5;  p[4] += 4; p[3] -= 4; }

  if      (stability >= 70) { p[0] += 5; p[4] += 4; p[3] -= 4; }
  else if (stability <  35) { p[3] += 6; p[2] += 4; p[0] -= 5; }

  const norm  = p.map((v) => Math.max(1, v));
  const total = norm.reduce((a, b) => a + b, 0);
  return norm.map((v) => v / total) as [number, number, number, number, number];
}

function drawOutcome(probs: [number, number, number, number, number]): DimAuditOutcome {
  const r = Math.random();
  let acc = 0;
  const keys: DimAuditOutcome[] = [
    "audit_rassurant", "corrections_mineures", "anomalies_serieuses",
    "scandale_statistique", "redressement_complet",
  ];
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i]!;
    if (r < acc) return keys[i]!;
  }
  return "corrections_mineures";
}

// ── Application ───────────────────────────────────────────────────────────────

export interface DimAuditResult {
  outcome:  DimAuditOutcome;
  def:      DimAuditOutcomeDef;
  logEntry: NewsLogEntry;
}

export function launchDimAudit(state: StrategyGameState): {
  result:     DimAuditResult | null;
  newState:   StrategyGameState;
  failReason?: string;
} {
  const check = canLaunchDimAudit(state);
  if (!check.ok) return { result: null, newState: state, failReason: check.reason };

  const probs   = computeProbabilities(state);
  const outcome = drawOutcome(probs);
  const def     = DIM_AUDIT_OUTCOMES[outcome];
  const clamp01 = (v: number) => Math.max(0, Math.min(100, v));

  const resources = {
    ...state.resources,
    money:     Math.max(0, state.resources.money     - DIM_AUDIT_COST_MONEY),
    influence: Math.max(0, state.resources.influence - DIM_AUDIT_COST_INFLUENCE),
  };

  const medicalDataQuality    = clamp01((state.medicalDataQuality    ?? DEFAULT_MEDICAL_DATA_QUALITY)    + def.medicalDataDelta);
  const hospitalCodingQuality = clamp01((state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY) + def.hospitalCodingDelta);
  const healthDataTrust       = clamp01((state.healthDataTrust       ?? DEFAULT_HEALTH_DATA_TRUST)       + def.healthDataTrustDelta);

  const nationalIndicators = {
    ...state.nationalIndicators,
    popularity: clamp01(state.nationalIndicators.popularity + def.popularityDelta),
  };

  const hp = state.hiddenPolitics;
  const hiddenPolitics = {
    ...hp,
    scandalRisk:            clamp01(hp.scandalRisk            + def.scandalRiskDelta),
    mediaMood:              clamp01(hp.mediaMood              + def.mediaMoodDelta),
    institutionalStability: clamp01(hp.institutionalStability + def.institutionalDelta),
  };

  const administrationMorale = Math.max(0, (state.administrationMorale ?? 60) - DIM_AUDIT_ADMIN_BASE - def.adminFatigueDelta);

  const logEntry: NewsLogEntry = {
    eventId:     `dim_audit_${state.news.actionCount}`,
    title:       def.headline,
    source:      "Cellule DIM Nationale",
    type:        "national",
    urgency:     def.urgency,
    timestamp:   state.news.actionCount,
    effects:     { money: -DIM_AUDIT_COST_MONEY, influence: -DIM_AUDIT_COST_INFLUENCE },
    consequence: def.description,
  };

  const newState: StrategyGameState = {
    ...state,
    resources,
    medicalDataQuality,
    hospitalCodingQuality,
    healthDataTrust,
    nationalIndicators,
    hiddenPolitics,
    administrationMorale,
    lastDimAuditAt: state.news.actionCount,
    news: {
      ...state.news,
      log: [logEntry, ...state.news.log],
    },
  };

  return { result: { outcome, def, logEntry }, newState };
}
