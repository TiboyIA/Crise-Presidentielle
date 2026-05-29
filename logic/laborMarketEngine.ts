/**
 * laborMarketEngine.ts — Marché du travail et emploi national (MODE DELTA).
 *
 * 4 indicateurs abstraits (0-100) :
 *   - unemployment      : chômage fictif. Haut = grave.
 *   - jobQuality        : qualité de l'emploi. Haut = bon.
 *   - youthUnemployment : chômage des jeunes. Structurellement plus élevé.
 *   - laborShortage     : pénurie de main-d'œuvre. Haut = économie à vide.
 *
 * Aucune simulation RH, aucune donnée sectorielle réelle,
 * aucun chiffre national officiel.
 *
 * Effets quotidiens :
 *   unemployment ≥ 60 : popularFatigue +1, cohésion -1
 *   unemployment ≥ 75 : économie -1 en plus
 *   jobQuality < 25   : popularFatigue +1, scandalRisk +1
 *   laborShortage ≥ 75 AND unemployment < 25 : économie -1 (pénurie freine la croissance)
 */

import type { StrategyGameState } from "@/types/strategy";

// ── Types publics ─────────────────────────────────────────────────────────────

export type UnemploymentBand = "plein_emploi" | "modere" | "eleve" | "crise";
export type JobQualityBand   = "excellent"    | "bon"    | "fragile" | "precaire";
export type LaborShortageBand = "negligeable" | "modere" | "forte"   | "critique";

export interface UnemploymentBandInfo {
  band:    UnemploymentBand;
  label:   string;
  color:   string;
  message: string;
}

export interface JobQualityBandInfo {
  band:    JobQualityBand;
  label:   string;
  color:   string;
  message: string;
}

export interface LaborShortageBandInfo {
  band:    LaborShortageBand;
  label:   string;
  color:   string;
  message: string;
}

// ── Valeurs par défaut ────────────────────────────────────────────────────────

export const DEFAULT_UNEMPLOYMENT       = 25;
export const DEFAULT_JOB_QUALITY        = 55;
export const DEFAULT_YOUTH_UNEMPLOYMENT = 35;
export const DEFAULT_LABOR_SHORTAGE     = 20;

// ── Bandes chômage (0 = excellent, 100 = crise) ───────────────────────────────

const UNEMPLOYMENT_BANDS: { threshold: number; info: UnemploymentBandInfo }[] = [
  {
    threshold: 60,
    info: {
      band: "crise", label: "Crise du chômage", color: "#e54848",
      message: "Le chômage atteint un niveau de crise. La cohésion sociale s'effrite, la contestation monte et l'économie se contracte.",
    },
  },
  {
    threshold: 40,
    info: {
      band: "eleve", label: "Chômage élevé", color: "#e8864f",
      message: "Le chômage est préoccupant. Des pans entiers de la population peinent à trouver un emploi. Des mesures de soutien s'imposent.",
    },
  },
  {
    threshold: 20,
    info: {
      band: "modere", label: "Chômage modéré", color: "#e8c44f",
      message: "Le chômage reste modéré. La situation est maîtrisée mais des disparités persistent selon les régions et les profils.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "plein_emploi", label: "Plein emploi", color: "#4caf82",
      message: "Le marché du travail est en tension favorable. Presque tout le monde qui cherche un emploi en trouve un.",
    },
  },
];

export function getUnemploymentBandInfo(value: number): UnemploymentBandInfo {
  return (UNEMPLOYMENT_BANDS.find((b) => value >= b.threshold) ?? UNEMPLOYMENT_BANDS[UNEMPLOYMENT_BANDS.length - 1]).info;
}

// ── Bandes qualité de l'emploi (100 = excellent) ─────────────────────────────

const JOB_QUALITY_BANDS: { threshold: number; info: JobQualityBandInfo }[] = [
  {
    threshold: 76,
    info: {
      band: "excellent", label: "Emploi de qualité", color: "#4caf82",
      message: "Les emplois disponibles offrent de bonnes conditions. Les travailleurs sont engagés et la productivité est élevée.",
    },
  },
  {
    threshold: 51,
    info: {
      band: "bon", label: "Emploi correct", color: "#60a5fa",
      message: "La qualité de l'emploi est satisfaisante. Des disparités existent mais la norme est acceptable.",
    },
  },
  {
    threshold: 26,
    info: {
      band: "fragile", label: "Emploi fragile", color: "#e8c44f",
      message: "De nombreux emplois sont précaires ou peu rémunérateurs. La satisfaction au travail baisse et la mobilité sociale se réduit.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "precaire", label: "Précarisation", color: "#e54848",
      message: "L'emploi est massivement précaire. Les contrats courts, le sous-emploi et les bas salaires dominent. La tension sociale est forte.",
    },
  },
];

export function getJobQualityBandInfo(value: number): JobQualityBandInfo {
  return (JOB_QUALITY_BANDS.find((b) => value >= b.threshold) ?? JOB_QUALITY_BANDS[JOB_QUALITY_BANDS.length - 1]).info;
}

// ── Bandes pénurie de main-d'œuvre (0 = normale, 100 = critique) ──────────────

const LABOR_SHORTAGE_BANDS: { threshold: number; info: LaborShortageBandInfo }[] = [
  {
    threshold: 75,
    info: {
      band: "critique", label: "Pénurie critique", color: "#e54848",
      message: "L'économie est paralysée par le manque de main-d'œuvre. Les secteurs essentiels peinent à fonctionner. La croissance est freinée.",
    },
  },
  {
    threshold: 50,
    info: {
      band: "forte", label: "Pénurie forte", color: "#e8864f",
      message: "De nombreux secteurs peinent à recruter. Les salaires montent sous pression, alimentant l'inflation. Des goulots d'étranglement apparaissent.",
    },
  },
  {
    threshold: 25,
    info: {
      band: "modere", label: "Pénurie modérée", color: "#e8c44f",
      message: "Quelques secteurs signalent des difficultés de recrutement. La tension est localisée mais surveiller de près.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "negligeable", label: "Normale", color: "#4caf82",
      message: "Le marché du travail est équilibré. L'offre et la demande de main-d'œuvre sont en adéquation.",
    },
  },
];

export function getLaborShortageBandInfo(value: number): LaborShortageBandInfo {
  return (LABOR_SHORTAGE_BANDS.find((b) => value >= b.threshold) ?? LABOR_SHORTAGE_BANDS[LABOR_SHORTAGE_BANDS.length - 1]).info;
}

// ── Calcul des cibles ─────────────────────────────────────────────────────────

export function computeUnemploymentTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const res       = state.resources;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];

  let target = 25;

  // Économie nationale — premier moteur de l'emploi
  const economy = ind?.economy ?? 55;
  if (economy < 30)        target += 15;
  else if (economy < 45)   target += 8;
  else if (economy >= 65)  target -= 8;

  // Énergie — coût de production et activité industrielle
  if (res.energy < 50)     target += 6;
  else if (res.energy < 100) target += 3;
  else if (res.energy >= 180) target -= 3;

  // Réseau électrique — continuité de l'activité économique
  const grid = state.gridStability ?? 72;
  if (grid < 30)           target += 5;
  else if (grid < 50)      target += 2;

  // Budget public — soutien à l'emploi et investissement
  const budget = ind?.publicBudget ?? 20;
  if (budget < -50)        target += 4;
  else if (budget >= 20)   target -= 3;

  // Ondes de crise — destructions d'emploi massives
  const waveCount = (state.crisisWaves ?? []).filter((w) => w.intensity >= 40).length;
  if (waveCount >= 3)      target += 7;
  else if (waveCount >= 1) target += 3;

  // Stabilité institutionnelle — confiance des investisseurs
  const stability = hp?.institutionalStability ?? 70;
  if (stability < 35)      target += 4;
  else if (stability >= 70) target -= 2;

  // Confiance des élites — investissement et création d'activité
  const eliteTrust = hp?.eliteTrust ?? 65;
  if (eliteTrust < 30)     target += 3;
  else if (eliteTrust >= 70) target -= 3;

  // Stress agricole — pertes d'emploi en zones rurales
  const cropStress = state.agroWeather?.cropStress ?? 0;
  if (cropStress > 70)     target += 3;

  // Réformes complétées — effets positifs durables
  if (reforms.some((r) => r.id === "industrie" && r.applied))   target -= 5;
  if (reforms.some((r) => r.id === "education" && r.applied))   target -= 4;
  if (reforms.some((r) => r.id === "sociale"   && r.applied))   target -= 3;

  // Recherche — automatisation : effet ambigu selon le contexte
  if (completed.includes("research_digital_twin"))   target -= 3; // meilleure compétitivité
  if (completed.includes("research_admin_ai"))       target += 4; // automatisation sans requalification

  // Pénurie de main-d'œuvre — paradoxe : moins de chômage si trop peu de travailleurs
  const shortage = state.laborShortage ?? DEFAULT_LABOR_SHORTAGE;
  if (shortage > 60)       target -= 6;
  else if (shortage > 40)  target -= 3;

  return Math.max(0, Math.min(100, target));
}

export function computeJobQualityTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];

  let target = 55;

  // Chômage élevé — les travailleurs acceptent de mauvaises conditions
  const unemp = state.unemployment ?? DEFAULT_UNEMPLOYMENT;
  if (unemp > 60)          target -= 15;
  else if (unemp > 40)     target -= 8;
  else if (unemp < 20)     target += 5; // plein emploi = pouvoir de négociation

  // Économie nationale — richesse distribuée et conditions de travail
  const economy = ind?.economy ?? 55;
  if (economy >= 65)       target += 8;
  else if (economy >= 55)  target += 3;
  else if (economy < 35)   target -= 10;

  // Pénurie main-d'œuvre — les travailleurs ont du pouvoir de négociation
  const shortage = state.laborShortage ?? DEFAULT_LABOR_SHORTAGE;
  if (shortage > 60)       target += 8;
  else if (shortage > 40)  target += 4;

  // Budget public — investissement dans les conditions de travail
  const budget = ind?.publicBudget ?? 20;
  if (budget >= 20)        target += 3;
  else if (budget < -50)   target -= 4;

  // Stabilité institutionnelle — respect du droit du travail
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70)     target += 5;
  else if (stability < 35) target -= 6;

  // Recherche — effets sur les conditions de travail
  if (completed.includes("research_digital_twin")) target += 5;  // meilleure ergonomie
  if (completed.includes("research_admin_ai"))     target -= 4;  // ubérisation / gig economy

  return Math.max(0, Math.min(100, target));
}

export function computeLaborShortageTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];

  let target = 20;

  // Chômage bas — moins de travailleurs disponibles
  const unemp = state.unemployment ?? DEFAULT_UNEMPLOYMENT;
  if (unemp < 15)          target += 20;
  else if (unemp < 25)     target += 12;
  else if (unemp < 35)     target += 5;
  else if (unemp > 55)     target -= 10; // chômage élevé = travailleurs disponibles

  // Économie en croissance — demande de travail plus forte
  const economy = ind?.economy ?? 55;
  if (economy >= 70)       target += 8;
  else if (economy >= 60)  target += 4;
  else if (economy < 35)   target -= 5;

  // Automatisation — réduit les besoins humains
  if (completed.includes("research_admin_ai"))       target -= 12;
  if (completed.includes("research_digital_twin"))   target -= 8;

  // Formation et éducation — adéquation offre/demande
  if (reforms.some((r) => r.id === "education" && r.applied)) target -= 6;
  if (reforms.some((r) => r.id === "industrie" && r.applied)) target -= 4;

  // Qualité de l'emploi — attire ou repousse les travailleurs
  const jq = state.jobQuality ?? DEFAULT_JOB_QUALITY;
  if (jq > 70)             target -= 5;
  else if (jq < 30)        target += 4; // mauvais emplois repoussent les candidats

  return Math.max(0, Math.min(100, target));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickLaborMarket(state: StrategyGameState): StrategyGameState {
  const currentUnemp   = state.unemployment       ?? DEFAULT_UNEMPLOYMENT;
  const currentJQ      = state.jobQuality         ?? DEFAULT_JOB_QUALITY;
  const currentYouth   = state.youthUnemployment  ?? DEFAULT_YOUTH_UNEMPLOYMENT;
  const currentShort   = state.laborShortage      ?? DEFAULT_LABOR_SHORTAGE;

  const targetUnemp    = computeUnemploymentTarget(state);
  const targetJQ       = computeJobQualityTarget(state);
  const targetShort    = computeLaborShortageTarget(state);
  // Chômage des jeunes : structurellement 1.5× le chômage général + facteurs additionnels
  const ind            = state.nationalIndicators;
  const reforms        = state.reforms ?? [];
  const economy        = ind?.economy ?? 55;
  let targetYouth      = Math.min(100, targetUnemp * 1.5);
  if (economy < 35)    targetYouth = Math.min(100, targetYouth + 10);
  if (reforms.some((r) => r.id === "education" && r.applied)) targetYouth = Math.max(0, targetYouth - 8);
  if ((state.jobQuality ?? DEFAULT_JOB_QUALITY) < 30)         targetYouth = Math.min(100, targetYouth + 6);

  const drift = 4;
  const clampDrift = (cur: number, tgt: number) =>
    cur < tgt ? Math.min(tgt, cur + drift) : Math.max(tgt, cur - drift);

  const nextUnemp  = clampDrift(currentUnemp, targetUnemp);
  const nextJQ     = clampDrift(currentJQ, targetJQ);
  const nextYouth  = clampDrift(currentYouth, targetYouth);
  const nextShort  = clampDrift(currentShort, targetShort);

  let s: StrategyGameState = {
    ...state,
    unemployment:      nextUnemp,
    jobQuality:        nextJQ,
    youthUnemployment: nextYouth,
    laborShortage:     nextShort,
  };

  // Effets passifs du chômage élevé
  if (nextUnemp >= 60) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        cohesion: Math.max(0, (s.nationalIndicators?.cohesion ?? 60) - 1),
      },
      hiddenPolitics: {
        ...s.hiddenPolitics,
        popularFatigue: Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + 1),
      },
    };
  }

  if (nextUnemp >= 75) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1),
      },
    };
  }

  // Effets passifs de la précarisation de l'emploi
  if (nextJQ < 25) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        popularFatigue: Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + 1),
        scandalRisk:    Math.min(100, (s.hiddenPolitics?.scandalRisk    ?? 20) + 1),
      },
    };
  }

  // Pénurie critique + plein emploi → frein économique (pénurie de croissance)
  if (nextShort >= 75 && nextUnemp < 25) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1),
      },
    };
  }

  return s;
}
