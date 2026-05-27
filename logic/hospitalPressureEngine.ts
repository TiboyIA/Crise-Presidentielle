/**
 * hospitalPressureEngine.ts — Saturation Hospitalière Stratégique.
 *
 * Jauge abstraite de la pression sur le système de soins national.
 * Mesure la capacité de l'État à absorber les demandes sans rupture
 * — sans simuler aucun hôpital réel, aucun flux patient, aucun lit.
 *
 * hospitalPressure (0-100) augmente avec :
 *   - Crises sanitaires / catastrophes météo (surcharge soudaine)
 *   - Crise sociale et fatigue de la population
 *   - Coupures d'énergie (blocage logistique)
 *   - Faible budget public santé
 *   - Fatigue administrative (personnel épuisé)
 *   - Données médicales dégradées (retards de remontée)
 *   - Ruptures systémiques actives
 *
 * hospitalPressure diminue avec :
 *   - Bon budget public (plan hôpital)
 *   - Stabilité institutionnelle forte (renforts, logistique)
 *   - Énergie stable
 *   - Données médicales fiables
 *   - Modernisation numérique (prévention, anticipation)
 *   - Bonne cohésion nationale
 *
 * Seuils :
 *   0–30   : Normal — le système absorbe normalement les demandes
 *   31–60  : Tension — le système est sous pression perceptible
 *   61–80  : Saturation — les capacités d'absorption sont dépassées
 *   81–100 : Crise hospitalière — rupture imminente ou effective
 *
 * Effets :
 *   ≥ 61 : -1 popularité/jour, +1 scandalRisk/jour
 *   ≥ 81 : -2 popularité/jour, -1 économie/jour, +2 scandalRisk/jour, -1 eliteTrust/jour
 *
 * Aucun simulateur hospitalier, aucun lit, aucun flux patient réel.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";

export type HospitalPressureBand =
  | "normal"
  | "tension"
  | "saturation"
  | "crise";

export interface HospitalPressureBandInfo {
  band:    HospitalPressureBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_HOSPITAL_PRESSURE = 30;

const BANDS: { threshold: number; info: HospitalPressureBandInfo }[] = [
  {
    threshold: 81,
    info: {
      band: "crise", label: "Crise hospitalière", color: "#e54848",
      message: "Le système de soins est en rupture. Les équipes sont débordées, les délais de prise en charge explosent. La pression politique est maximale et le risque de scandale est critique.",
    },
  },
  {
    threshold: 61,
    info: {
      band: "saturation", label: "Saturation", color: "#e8864f",
      message: "Les capacités d'absorption sont dépassées. Des tensions majeures apparaissent dans les prises en charge. Chaque nouvelle crise aggrave la situation de manière disproportionnée.",
    },
  },
  {
    threshold: 31,
    info: {
      band: "tension", label: "Tension", color: "#e8c44f",
      message: "Le système hospitalier est sous pression. La marge d'absorption se réduit. Une crise supplémentaire pourrait faire basculer la situation.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "normal", label: "Normal", color: "#4caf82",
      message: "Le système de soins fonctionne dans des conditions acceptables. La marge de manœuvre est suffisante pour absorber une crise modérée.",
    },
  },
];

export function getHospitalPressureBandInfo(pressure: number): HospitalPressureBandInfo {
  return (BANDS.find((b) => pressure >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeHospitalPressureTarget(state: StrategyGameState): number {
  const hp  = state.hiddenPolitics;
  const ind = state.nationalIndicators;
  const res = state.resources;
  const completed = state.strategyResearch?.completed ?? [];
  let pressure = 30;

  // Crise sociale — afflux des populations fragilisées
  const cohesion = ind?.cohesion ?? 60;
  if (cohesion < 30) pressure += 12;
  else if (cohesion < 45) pressure += 6;
  else if (cohesion >= 65) pressure -= 4;

  // Fatigue populaire — épuisement du tissu social
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue > 70) pressure += 6;
  else if (fatigue > 50) pressure += 3;

  // Catastrophes météo — crue, canicule, tempête (stress thermique et agricole)
  const thermal = state.thermalStress ?? 22;
  if (thermal > 75) pressure += 7;
  else if (thermal > 50) pressure += 4;

  const cropStress = state.agroWeather?.cropStress ?? 0;
  if (cropStress > 70) pressure += 5;
  else if (cropStress > 45) pressure += 2;

  // Blackout électrique — blocage logistique et chaîne du froid médicale
  const grid = state.gridStability ?? 72;
  if (grid < 25) pressure += 9;
  else if (grid < 45) pressure += 5;
  else if (grid >= 70) pressure -= 4;

  // Budget public santé — sous-financement chronique
  const budget = ind?.publicBudget ?? 20;
  if (budget < -75) pressure += 8;
  else if (budget < -25) pressure += 4;
  else if (budget < 0) pressure += 2;
  else if (budget >= 20) pressure -= 5;

  // Fatigue administrative — personnel soignant épuisé, absentéisme
  const adminMorale = state.administrationMorale ?? 60;
  if (adminMorale < 30) pressure += 6;
  else if (adminMorale < 50) pressure += 3;

  // Données médicales dégradées — retards dans la remontée sanitaire
  const delay = state.healthReportingDelay ?? DEFAULT_HEALTH_REPORTING_DELAY;
  if (delay >= 20) pressure += 5;
  else if (delay >= 12) pressure += 2;

  // Saturation des crises simultanées — surcharge de l'appareil d'État
  const pending = state.news.pendingIds.length;
  if (pending >= 5) pressure += 8;
  else if (pending >= 3) pressure += 4;

  // Ruptures systémiques — dégradation des systèmes support
  const bpStatuses = state.breakpoints?.statuses ?? {};
  const activeRuptures = Object.values(bpStatuses).filter((s) => s === "rupture").length;
  if (activeRuptures >= 2) pressure += 7;
  else if (activeRuptures === 1) pressure += 3;

  // Stabilité institutionnelle — renforts, plan hôpital, logistique
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70) pressure -= 5;
  else if (stability >= 55) pressure -= 2;
  else if (stability < 30) pressure += 4;

  // Données médicales fiables — anticipation, prévention, bonne orientation
  const mdq = state.medicalDataQuality ?? DEFAULT_MEDICAL_DATA_QUALITY;
  if (mdq >= 75) pressure -= 5;
  else if (mdq >= 55) pressure -= 2;

  // Codage hospitalier précis — meilleure gestion des ressources
  const coding = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  if (coding >= 75) pressure -= 3;

  // Modernisation numérique — prévention et logistique améliorées
  if (completed.includes("research_admin_ai"))       pressure -= 4;
  if (completed.includes("research_digital_twin"))   pressure -= 3;
  if (completed.includes("research_self_healing_materials")) pressure -= 2;

  return Math.max(0, Math.min(100, pressure));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickHospitalPressure(state: StrategyGameState): StrategyGameState {
  const current = state.hospitalPressure ?? DEFAULT_HOSPITAL_PRESSURE;
  const target  = computeHospitalPressureTarget(state);
  const drift   = 4;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, hospitalPressure: next };
  const hp = s.hiddenPolitics;
  const ind = s.nationalIndicators;

  if (next >= 61) {
    // Saturation — popularité chute, scandale monte
    s = {
      ...s,
      nationalIndicators: {
        ...ind,
        popularity: Math.max(0, (ind?.popularity ?? 60) - 1),
      },
      hiddenPolitics: {
        ...hp,
        scandalRisk: Math.min(100, (hp?.scandalRisk ?? 20) + 1),
      },
    };
  }

  if (next >= 81) {
    // Crise hospitalière — effets amplifiés sur tous les vecteurs
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        popularity: Math.max(0, (s.nationalIndicators?.popularity ?? 60) - 1),
        economy:    Math.max(0, (s.nationalIndicators?.economy    ?? 55) - 1),
      },
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + 2),
        eliteTrust:  Math.max(0,   (s.hiddenPolitics?.eliteTrust  ?? 65) - 1),
      },
    };
  }

  return s;
}
