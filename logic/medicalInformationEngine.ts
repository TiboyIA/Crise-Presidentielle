/**
 * medicalInformationEngine.ts — Cellule DIM Nationale.
 *
 * Indicateur abstrait de qualité du système d'information sanitaire national :
 * capacité de l'État à collecter, consolider et interpréter les données de santé
 * publique pour piloter les décisions présidentielles en crise.
 *
 * medicalDataQuality (0-100) dépend de :
 *   - Stabilité administrative (remontée des données)
 *   - Cyberdéfense (intégrité et sécurité des systèmes)
 *   - Confiance institutionnelle (coopération des acteurs)
 *   - Qualité du signal renseignement (capacité d'analyse)
 *   - Budget public (financement des infrastructures)
 *   - Surcharge de crises simultanées
 *   - Risque de scandale (biais de reporting)
 *
 * Effets :
 *   ≥ 75 : détection précoce améliorée, -1 scandalRisk/jour
 *   < 30 : chiffres retardés, -1 institutionalStability/jour
 *   < 15 : risque de scandale statistique, +3 scandalRisk/jour
 *
 * Aucune donnée patient, aucune classification médicale réelle.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_SIGNAL_NOISE_RATIO } from "@/logic/signalNoiseEngine";
import { DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";

export type MedicalQualityBand =
  | "optimal"
  | "satisfaisant"
  | "dégradé"
  | "critique"
  | "alarmant";

export interface MedicalBandInfo {
  band:    MedicalQualityBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_MEDICAL_DATA_QUALITY = 50;

const BANDS: { threshold: number; info: MedicalBandInfo }[] = [
  {
    threshold: 75,
    info: {
      band: "optimal", label: "Optimal", color: "#4caf82",
      message: "Les systèmes de remontée sanitaire fonctionnent correctement. La Cellule DIM transmet des données fiables et consolidées en temps réel.",
    },
  },
  {
    threshold: 50,
    info: {
      band: "satisfaisant", label: "Satisfaisant", color: "#8bc34a",
      message: "La qualité des données sanitaires est acceptable. Quelques retards de remontée sont signalés mais n'affectent pas les décisions stratégiques.",
    },
  },
  {
    threshold: 30,
    info: {
      band: "dégradé", label: "Dégradé", color: "#e8c44f",
      message: "Des incohérences apparaissent dans les tableaux de bord sanitaires. Certains indicateurs présentent des délais de mise à jour significatifs.",
    },
  },
  {
    threshold: 15,
    info: {
      band: "critique", label: "Critique", color: "#e8864f",
      message: "La fiabilité des données sanitaires est sérieusement compromise. Des chiffres contradictoires circulent entre les services. Risque de mauvaise décision élevé.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "alarmant", label: "Alarmant", color: "#e54848",
      message: "Le système d'information sanitaire est en rupture. L'État navigue à l'aveugle. Un scandale statistique est imminent.",
    },
  },
];

export function getMedicalBandInfo(quality: number): MedicalBandInfo {
  return (BANDS.find((b) => quality >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul du score cible ─────────────────────────────────────────────────────

export function computeMedicalQualityTarget(state: StrategyGameState): number {
  const hp  = state.hiddenPolitics;
  const ind = state.nationalIndicators;
  const res = state.resources;
  let score = 50;

  // Stabilité administrative — qualité de codage et remontée des données
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70) score += 8;
  else if (stability >= 50) score += 4;
  else if (stability < 30) score -= 10;
  else if (stability < 20) score -= 18;

  // Cyberdéfense — sécurité et intégrité des systèmes d'information
  const cyber = res.cyberDefense;
  if (cyber >= 60) score += 8;
  else if (cyber >= 40) score += 4;
  else if (cyber < 25) score -= 8;
  else if (cyber < 15) score -= 14;

  // Confiance institutionnelle — coopération des acteurs de santé publique
  const trust = hp?.eliteTrust ?? 65;
  if (trust >= 65) score += 6;
  else if (trust < 35) score -= 8;

  // Budget public — financement des infrastructures de données
  const budget = ind?.publicBudget ?? 20;
  if (budget >= 20) score += 5;
  else if (budget < 0) score -= 5;
  else if (budget < -50) score -= 10;

  // Qualité du signal renseignement — capacité d'analyse transversale
  const snr = state.signalNoiseRatio ?? DEFAULT_SIGNAL_NOISE_RATIO;
  if (snr >= 70) score += 8;
  else if (snr < 40) score -= 8;

  // Risque de scandale — biais de reporting et autocensure
  const scandal = hp?.scandalRisk ?? 20;
  if (scandal >= 65) score -= 8;
  else if (scandal >= 50) score -= 4;

  // Surcharge de crises simultanées — saturation des capacités d'analyse
  const pending = state.news.pendingIds.length;
  if (pending >= 4) score -= 8;
  else if (pending >= 2) score -= 4;

  // Ruptures systémiques actives — dégradation des systèmes support
  const bpStatuses = state.breakpoints?.statuses ?? {};
  const activeRuptures = Object.values(bpStatuses).filter((s) => s === "rupture").length;
  if (activeRuptures >= 2) score -= 10;
  else if (activeRuptures === 1) score -= 5;

  // Qualité du codage hospitalier — précision des données remontées à la Cellule DIM
  const coding = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  if (coding >= 75) score += 6;
  else if (coding >= 50) score += 2;
  else if (coding < 30) score -= 6;
  else if (coding < 15) score -= 12;

  return Math.max(0, Math.min(100, score));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickMedicalDataQuality(state: StrategyGameState): StrategyGameState {
  const current = state.medicalDataQuality ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const target  = computeMedicalQualityTarget(state);
  const drift   = 3;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, medicalDataQuality: next };

  // Effets sur l'état
  if (next >= 75 && (s.hiddenPolitics?.scandalRisk ?? 0) > 0) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: Math.max(0, (s.hiddenPolitics?.scandalRisk ?? 20) - 1),
      },
    };
  }
  if (next < 30) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - 1),
      },
    };
  }
  if (next < 15) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + 3),
      },
    };
  }

  return s;
}
