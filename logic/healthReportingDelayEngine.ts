/**
 * healthReportingDelayEngine.ts — Retard de Remontée des Données de Santé.
 *
 * Modélise le délai entre la réalité sanitaire sur le terrain et
 * les données effectivement reçues par l'État pour orienter ses décisions.
 *
 * healthReportingDelay (0-30 actions) dépend de :
 *   - Saturation hospitalière (files d'attente de crises)
 *   - Cyberdéfense (intégrité et disponibilité des systèmes)
 *   - Qualité du codage hospitalier (fiabilité de la remontée structurée)
 *   - Qualité de la Cellule DIM (consolidation des données)
 *   - Stabilité administrative (continuité des agents de remontée)
 *   - Stabilité du réseau électrique (infrastructure numérique)
 *   - Cohésion nationale (tensions perturbant les flux administratifs)
 *   - Ruptures systémiques actives
 *
 * Effets :
 *   ≤ 5  : alerte rapide, +1 medicalDataQuality/jour
 *   ≥ 18 : crise détectée trop tard, +1 scandalRisk/jour
 *   ≥ 24 : scandale politique, -1 institutionalStability, +2 scandalRisk/jour
 *
 * Aucune vraie épidémiologie, aucune API réelle, aucun détail médical technique.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";

export type HealthReportingBand =
  | "fraiches"
  | "retardees_legeres"
  | "retardees"
  | "incertaines"
  | "critique";

export interface HealthReportingBandInfo {
  band:    HealthReportingBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_HEALTH_REPORTING_DELAY = 8;

const BANDS: { threshold: number; info: HealthReportingBandInfo }[] = [
  {
    threshold: 0,
    info: {
      band: "fraiches", label: "Fraîches", color: "#4caf82",
      message: "Les données de santé remontent en temps quasi réel. L'État dispose d'une vision précise de la situation sanitaire nationale et peut anticiper les crises.",
    },
  },
  {
    threshold: 6,
    info: {
      band: "retardees_legeres", label: "Légèrement retardées", color: "#8bc34a",
      message: "Quelques délais mineurs sont constatés dans la remontée des données. La prise de décision reste globalement fiable mais des écarts ponctuels peuvent apparaître.",
    },
  },
  {
    threshold: 12,
    info: {
      band: "retardees", label: "Retardées", color: "#e8c44f",
      message: "Des retards significatifs s'accumulent dans la transmission des indicateurs sanitaires. L'État pilote avec des données partiellement obsolètes. L'incertitude sur la situation réelle augmente.",
    },
  },
  {
    threshold: 18,
    info: {
      band: "incertaines", label: "Incertaines", color: "#e8864f",
      message: "Les données de santé sont sévèrement retardées. Des crises sanitaires peuvent se développer sans que l'État en soit informé à temps. Le risque de mauvaise décision est élevé.",
    },
  },
  {
    threshold: 24,
    info: {
      band: "critique", label: "Critique", color: "#e54848",
      message: "Le système de remontée des données sanitaires est en rupture. L'État navigue à l'aveugle. Des crises majeures ont pu se déclarer sans détection. Un scandale politique est imminent.",
    },
  },
];

export function getHealthReportingBandInfo(delay: number): HealthReportingBandInfo {
  const match = [...BANDS].reverse().find((b) => delay >= b.threshold);
  return (match ?? BANDS[0]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeHealthReportingDelayTarget(state: StrategyGameState): number {
  const hp  = state.hiddenPolitics;
  const res = state.resources;
  const ind = state.nationalIndicators;
  const completed = state.strategyResearch?.completed ?? [];
  let delay = 8;

  // Qualité du codage hospitalier — précision de la remontée structurée
  const coding = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  if (coding < 30) delay += 5;
  else if (coding < 50) delay += 2;
  else if (coding >= 85) delay -= 5;
  else if (coding >= 70) delay -= 3;

  // Cyberdéfense — intégrité et disponibilité des systèmes d'information
  const cyber = res.cyberDefense;
  if (cyber < 25) delay += 5;
  else if (cyber < 40) delay += 2;
  else if (cyber >= 80) delay -= 5;
  else if (cyber >= 60) delay -= 3;

  // Cellule DIM — consolidation nationale des données
  const mdq = state.medicalDataQuality ?? DEFAULT_MEDICAL_DATA_QUALITY;
  if (mdq < 30) delay += 4;
  else if (mdq < 50) delay += 2;
  else if (mdq >= 85) delay -= 5;
  else if (mdq >= 70) delay -= 3;

  // Stabilité administrative — continuité des agents de remontée
  const stability = hp?.institutionalStability ?? 70;
  if (stability < 30) delay += 4;
  else if (stability < 50) delay += 2;
  else if (stability >= 70) delay -= 2;

  // Réseau électrique — infrastructure numérique de base
  const grid = state.gridStability ?? 72;
  if (grid < 30) delay += 3;
  else if (grid < 50) delay += 1;

  // Cohésion nationale — tensions qui perturbent les flux administratifs
  const cohesion = ind?.cohesion ?? 60;
  if (cohesion < 35) delay += 3;
  else if (cohesion < 50) delay += 1;

  // Surcharge de crises — saturation des équipes de remontée
  const pending = state.news.pendingIds.length;
  if (pending >= 4) delay += 4;
  else if (pending >= 2) delay += 2;
  else if (pending === 0) delay -= 1;

  // Ruptures systémiques — dégradation des infrastructures support
  const bpStatuses = state.breakpoints?.statuses ?? {};
  const activeRuptures = Object.values(bpStatuses).filter((s) => s === "rupture").length;
  if (activeRuptures >= 2) delay += 4;
  else if (activeRuptures === 1) delay += 2;

  // Modernisation numérique — réduction structurelle du délai
  if (completed.includes("research_digital_twin"))      delay -= 3;
  if (completed.includes("research_datacenter_cooling")) delay -= 2;
  if (completed.includes("research_quantum_sensors"))    delay -= 1;

  // Cellule de veille sanitaire — détection et remontée accélérées
  const surveillance = state.healthSurveillanceLevel ?? "faible";
  if      (surveillance === "crise")     delay -= 10;
  else if (surveillance === "renforcee") delay -= 6;
  else if (surveillance === "standard")  delay -= 3;

  return Math.max(0, Math.min(30, delay));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickHealthReportingDelay(state: StrategyGameState): StrategyGameState {
  const current = state.healthReportingDelay ?? DEFAULT_HEALTH_REPORTING_DELAY;
  const target  = computeHealthReportingDelayTarget(state);
  const drift   = 2;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, healthReportingDelay: next };

  // Données fraîches — meilleure anticipation
  if (next <= 5) {
    const mdq = s.medicalDataQuality;
    if (mdq !== undefined) {
      s = { ...s, medicalDataQuality: Math.min(100, mdq + 1) };
    }
  }

  // Crise détectée trop tard — pression politique
  if (next >= 18) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + 1),
      },
    };
  }

  // Rupture de la remontée — scandale politique
  if (next >= 24) {
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
