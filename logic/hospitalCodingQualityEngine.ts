/**
 * hospitalCodingQualityEngine.ts — Qualité du Codage Hospitalier.
 *
 * Indicateur abstrait de la fiabilité du codage médico-administratif national :
 * capacité des établissements de santé à produire des données structurées correctes
 * permettant à l'État de piloter les financements et d'anticiper les crises sanitaires.
 *
 * hospitalCodingQuality (0-100) dépend de :
 *   - Stabilité administrative (formation des agents de codage)
 *   - Cyberdéfense (intégrité des systèmes d'information hospitaliers)
 *   - Risque de scandale (pression sur les résultats, biais de codage)
 *   - Budget public (financement des formations et des outils)
 *   - Formations ministérielles actives (représentent la montée en compétences)
 *   - Surcharge de crises simultanées (saturation des équipes DIM)
 *   - Ruptures systémiques actives (dégradation des infrastructures support)
 *
 * Effets :
 *   ≥ 75 : données structurées précises → +1 medicalDataQuality/jour
 *   < 30 : erreurs de codage → +1 scandalRisk/jour
 *   < 15 : financement incorrect, aggravation des crises → -1 institutionalStability, +2 scandalRisk/jour
 *
 * Aucun code médical réel, aucune table PMSI, aucune donnée patient.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_SIGNAL_NOISE_RATIO } from "@/logic/signalNoiseEngine";

export type HospitalCodingBand =
  | "optimal"
  | "satisfaisant"
  | "dégradé"
  | "critique"
  | "alarmant";

export interface HospitalCodingBandInfo {
  band:    HospitalCodingBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_HOSPITAL_CODING_QUALITY = 55;

const BANDS: { threshold: number; info: HospitalCodingBandInfo }[] = [
  {
    threshold: 75,
    info: {
      band: "optimal", label: "Optimal", color: "#4caf82",
      message: "Le codage médico-administratif est fiable et exhaustif. Les données transmises au niveau national permettent une allocation précise des ressources et une anticipation des besoins hospitaliers.",
    },
  },
  {
    threshold: 50,
    info: {
      band: "satisfaisant", label: "Satisfaisant", color: "#8bc34a",
      message: "La qualité du codage hospitalier est correcte. Quelques erreurs ponctuelles sont signalées mais n'affectent pas significativement les décisions de financement.",
    },
  },
  {
    threshold: 30,
    info: {
      band: "dégradé", label: "Dégradé", color: "#e8c44f",
      message: "Des erreurs récurrentes dans le codage génèrent des biais dans les rapports d'activité. Les estimations budgétaires commencent à se dégrader.",
    },
  },
  {
    threshold: 15,
    info: {
      band: "critique", label: "Critique", color: "#e8864f",
      message: "Le codage hospitalier est défaillant. Les enveloppes budgétaires sont mal orientées. La Cour des comptes a signalé des anomalies persistantes dans plusieurs régions.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "alarmant", label: "Alarmant", color: "#e54848",
      message: "Le système de codage médico-administratif est en rupture. Les financements hospitaliers reposent sur des données erronées. Un scandale de gouvernance sanitaire est imminent.",
    },
  },
];

export function getHospitalCodingBandInfo(quality: number): HospitalCodingBandInfo {
  return (BANDS.find((b) => quality >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul du score cible ─────────────────────────────────────────────────────

export function computeHospitalCodingTarget(state: StrategyGameState): number {
  const hp  = state.hiddenPolitics;
  const ind = state.nationalIndicators;
  const res = state.resources;
  let score = 50;

  // Stabilité administrative — formation et continuité des agents de codage
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70) score += 8;
  else if (stability >= 50) score += 3;
  else if (stability < 30) score -= 10;
  else if (stability < 20) score -= 16;

  // Cyberdéfense — sécurité des systèmes d'information hospitaliers
  const cyber = res.cyberDefense;
  if (cyber >= 60) score += 8;
  else if (cyber >= 40) score += 4;
  else if (cyber < 25) score -= 10;
  else if (cyber < 15) score -= 16;

  // Risque de scandale — pression sur les résultats, biais de codage délibéré
  const scandal = hp?.scandalRisk ?? 20;
  if (scandal >= 65) score -= 10;
  else if (scandal >= 50) score -= 5;

  // Budget public — financement des formations et outils de codage
  const budget = ind?.publicBudget ?? 20;
  if (budget >= 10) score += 6;
  else if (budget < -50) score -= 8;
  else if (budget < -100) score -= 15;

  // Signal renseignement — capacité de détection des anomalies de codage
  const snr = state.signalNoiseRatio ?? DEFAULT_SIGNAL_NOISE_RATIO;
  if (snr >= 70) score += 5;
  else if (snr < 35) score -= 5;

  // Formations ministérielles actives — représentent la montée en compétences des agents DIM
  const trainings = Object.keys(state.activeTrainings ?? {}).length;
  if (trainings >= 1) score += 5;

  // Surcharge de crises — saturation des équipes DIM, déprioritisation du codage
  const pending = state.news.pendingIds.length;
  if (pending >= 4) score -= 10;
  else if (pending >= 2) score -= 5;

  // Ruptures systémiques — dégradation des systèmes support informatique
  const bpStatuses = state.breakpoints?.statuses ?? {};
  const activeRuptures = Object.values(bpStatuses).filter((s) => s === "rupture").length;
  if (activeRuptures >= 2) score -= 10;
  else if (activeRuptures === 1) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickHospitalCodingQuality(state: StrategyGameState): StrategyGameState {
  const current = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  const target  = computeHospitalCodingTarget(state);
  const drift   = 3;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, hospitalCodingQuality: next };

  // Codage précis → améliore la consolidation des données DIM
  if (next >= 75) {
    const mdq = s.medicalDataQuality;
    if (mdq !== undefined) {
      s = { ...s, medicalDataQuality: Math.min(100, mdq + 1) };
    }
  }

  // Erreurs récurrentes → tensions institutionnelles
  if (next < 30) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + 1),
      },
    };
  }

  // Rupture du codage → financement erroné, crise aggravée
  if (next < 15) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - 1),
        scandalRisk:            Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + 2),
      },
    };
  }

  return s;
}
