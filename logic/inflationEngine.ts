/**
 * inflationEngine.ts — Pression inflationniste nationale (MODE DELTA).
 *
 * Jauge abstraite (0-100) de la tension inflationniste fictive.
 * Ne simule aucune politique monétaire réelle, aucun indice des prix réel,
 * aucune donnée économique personnelle.
 *
 * Augmente avec : énergie insuffisante, déficit budgétaire, crise agricole,
 *   tension thermique, ondes de crise, fatigue sociale, dette élevée.
 * Diminue avec : énergie stable, bonne productivité, budget maîtrisé,
 *   confiance des élites, recherches avancées.
 *
 * Seuils :
 *   0–30  : Prix stables
 *   31–60 : Pression inflationniste
 *   61–80 : Inflation forte
 *   81–100: Crise pouvoir d'achat
 *
 * Effets quotidiens :
 *   ≥ 70 : +1 popularFatigue, -1 popularité
 *   ≥ 85 : -1 économie en plus
 */

import type { StrategyGameState } from "@/types/strategy";

export type InflationBand = "stable" | "pression" | "forte" | "crise";

export interface InflationBandInfo {
  band:    InflationBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_INFLATION = 25;

const BANDS: { threshold: number; info: InflationBandInfo }[] = [
  {
    threshold: 81,
    info: {
      band: "crise", label: "Crise pouvoir d'achat", color: "#e54848",
      message: "L'inflation érode massivement le pouvoir d'achat. La contestation sociale est à son comble. Des troubles civils sont possibles.",
    },
  },
  {
    threshold: 61,
    info: {
      band: "forte", label: "Inflation forte", color: "#e8864f",
      message: "Les prix augmentent à un rythme préoccupant. Les ménages modestes sont les premiers touchés. Des mesures de soutien s'imposent.",
    },
  },
  {
    threshold: 31,
    info: {
      band: "pression", label: "Pression inflationniste", color: "#e8c44f",
      message: "Une légère hausse des prix est perceptible. Le panier moyen se creuse. La situation reste maîtrisable si traitée rapidement.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "stable", label: "Prix stables", color: "#4caf82",
      message: "L'environnement des prix est stable. Le pouvoir d'achat des ménages est préservé.",
    },
  },
];

export function getInflationBandInfo(value: number): InflationBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

export function computeInflationTarget(state: StrategyGameState): number {
  const res       = state.resources;
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];

  let target = 25;

  // Énergie — carburant de l'inflation des coûts de production
  if (res.energy < 50)        target += 12;
  else if (res.energy < 100)  target += 6;
  else if (res.energy >= 200) target -= 5;

  // Réseau électrique — logistique et chaîne d'approvisionnement
  const grid = state.gridStability ?? 72;
  if (grid < 30)        target += 8;
  else if (grid < 50)   target += 4;
  else if (grid >= 75)  target -= 4;

  // Budget public déficitaire — aides financées par endettement
  const budget = ind?.publicBudget ?? 20;
  if (budget < -75)     target += 9;
  else if (budget < -30) target += 5;
  else if (budget < 0)  target += 2;
  else if (budget >= 30) target -= 4;

  // Dette élevée — prime de risque et défiance des marchés
  const debt = state.nationalDebt ?? 0;
  if (debt > 350)       target += 7;
  else if (debt > 250)  target += 4;
  else if (debt < 100)  target -= 3;

  // Crise agricole — flambée des prix alimentaires
  const cropStress = state.agroWeather?.cropStress ?? 0;
  if (cropStress > 75)  target += 7;
  else if (cropStress > 50) target += 3;

  // Stress thermique — coûts de production sous chaleur extrême
  const thermal = state.thermalStress ?? 22;
  if (thermal > 70)     target += 5;
  else if (thermal > 45) target += 2;

  // Ondes de crise actives — chocs d'offre et de confiance
  const waveCount = (state.crisisWaves ?? []).filter((w) => w.intensity >= 40).length;
  if (waveCount >= 3)   target += 6;
  else if (waveCount >= 1) target += 3;

  // Tension sociale — spirale salaires-prix
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue > 70)     target += 5;
  else if (fatigue > 50) target += 2;

  // Confiance des élites — ancrage des anticipations inflationnistes
  const eliteTrust = hp?.eliteTrust ?? 65;
  if (eliteTrust > 70)  target -= 3;
  else if (eliteTrust < 30) target += 3;

  // Productivité / économie — capacité à absorber les chocs de coûts
  const economy = ind?.economy ?? 55;
  if (economy >= 75)    target -= 6;
  else if (economy >= 55) target -= 3;
  else if (economy < 30) target += 4;

  // Ruptures systémiques — disruptions majeures de l'offre
  const bpStatuses = state.breakpoints?.statuses ?? {};
  const ruptures = Object.values(bpStatuses).filter((s) => s === "rupture").length;
  if (ruptures >= 2)    target += 6;
  else if (ruptures >= 1) target += 3;

  // Pénurie de main-d'œuvre + plein emploi → spirale salaires-prix
  const laborShortage = state.laborShortage ?? 20;
  const unemployment  = state.unemployment  ?? 25;
  if (laborShortage > 60 && unemployment < 25) target += 6;
  else if (laborShortage > 40 && unemployment < 35) target += 3;

  // Recherches — souveraineté énergétique et numérique
  if (completed.includes("research_energy_sovereign"))       target -= 6;
  if (completed.includes("research_datacenter_cooling"))     target -= 3;
  if (completed.includes("research_digital_twin"))           target -= 2;

  // Productivité nationale — haute productivité absorbe les chocs de coûts
  const productivity = state.productivity ?? 50;
  if (productivity >= 75)      target -= 5;
  else if (productivity >= 60) target -= 3;
  else if (productivity <= 25) target += 5;
  else if (productivity <= 40) target += 3;

  return Math.max(0, Math.min(100, target));
}

export function tickInflation(state: StrategyGameState): StrategyGameState {
  const current = state.inflation ?? DEFAULT_INFLATION;
  const target  = computeInflationTarget(state);
  const drift   = 5;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, inflation: next };

  if (next >= 70) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        popularity: Math.max(0, (s.nationalIndicators?.popularity ?? 60) - 1),
      },
      hiddenPolitics: {
        ...s.hiddenPolitics,
        popularFatigue: Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + 1),
      },
    };
  }

  if (next >= 85) {
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
