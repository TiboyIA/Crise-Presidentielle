/**
 * purchasingPowerEngine.ts — Pouvoir d'achat réel des ménages (MODE DELTA).
 *
 * Jauge abstraite (0-100) de la capacité des ménages fictifs à maintenir
 * leur niveau de vie. Ne simule aucun salaire réel, aucun panier de biens,
 * aucune donnée personnelle ou sectorielle.
 *
 * Diminue avec : inflation élevée, économie nationale faible, fatigue sociale.
 * Augmente avec : économie saine, budget équilibré, cohésion, stabilité.
 *
 * Seuils :
 *   0–25  : Crise pouvoir d'achat
 *   26–50 : Tension sociale
 *   51–70 : Stable
 *   71–100: Confort économique
 *
 * Effets quotidiens :
 *   < 30 : -1 popularité, +1 popularFatigue
 *   < 15 : -1 cohésion, -1 eliteTrust en plus
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_INFLATION } from "@/logic/inflationEngine";

export type PurchasingPowerBand = "confort" | "stable" | "tension" | "crise";

export interface PurchasingPowerBandInfo {
  band:    PurchasingPowerBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_PURCHASING_POWER = 60;

const BANDS: { threshold: number; info: PurchasingPowerBandInfo }[] = [
  {
    threshold: 71,
    info: {
      band: "confort", label: "Confort économique", color: "#4caf82",
      message: "Le niveau de vie des ménages est préservé. La consommation intérieure soutient la croissance.",
    },
  },
  {
    threshold: 51,
    info: {
      band: "stable", label: "Stable", color: "#60a5fa",
      message: "Le pouvoir d'achat est maintenu. Quelques tensions localisées mais rien d'alarmant pour l'instant.",
    },
  },
  {
    threshold: 26,
    info: {
      band: "tension", label: "Tension sociale", color: "#e8c44f",
      message: "Le pouvoir d'achat s'érode. Des segments de la population peinent à couvrir leurs besoins essentiels. Le mécontentement monte.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "crise", label: "Crise pouvoir d'achat", color: "#e54848",
      message: "Le pouvoir d'achat est en chute libre. La contestation sociale s'intensifie. Des troubles civils sont possibles si aucune mesure n'est prise.",
    },
  },
];

export function getPurchasingPowerBandInfo(value: number): PurchasingPowerBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

export function computePurchasingPowerTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const inflation = state.inflation ?? DEFAULT_INFLATION;

  let target = 60;

  // Inflation — premier facteur de destruction du pouvoir d'achat
  if (inflation >= 85)      target -= 30;
  else if (inflation >= 70) target -= 20;
  else if (inflation >= 55) target -= 12;
  else if (inflation >= 40) target -= 6;
  else if (inflation < 20)  target += 5;

  // Économie nationale — productivité et emploi
  const economy = ind?.economy ?? 55;
  if (economy >= 75)       target += 10;
  else if (economy >= 55)  target += 4;
  else if (economy < 35)   target -= 10;
  else if (economy < 45)   target -= 5;

  // Budget public — aides sociales et mesures de soutien
  const budget = ind?.publicBudget ?? 20;
  if (budget >= 30)        target += 6;
  else if (budget >= 0)    target += 2;
  else if (budget < -50)   target -= 6;

  // Cohésion sociale — solidarité et filets de sécurité
  const cohesion = ind?.cohesion ?? 60;
  if (cohesion >= 65)      target += 4;
  else if (cohesion < 35)  target -= 5;

  // Fatigue populaire — résignation et déclin du moral collectif
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue > 70)        target -= 6;
  else if (fatigue > 50)   target -= 3;

  // Stabilité institutionnelle — confiance dans les allocations et aides
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70)     target += 3;
  else if (stability < 35) target -= 4;

  // Productivité nationale — richesse créée et distribuée aux ménages
  const productivity = state.productivity ?? 50;
  if (productivity >= 75)      target += 6;
  else if (productivity >= 60) target += 3;
  else if (productivity <= 25) target -= 6;
  else if (productivity <= 40) target -= 3;

  return Math.max(0, Math.min(100, target));
}

export function tickPurchasingPower(state: StrategyGameState): StrategyGameState {
  const current = state.purchasingPower ?? DEFAULT_PURCHASING_POWER;
  const target  = computePurchasingPowerTarget(state);
  const drift   = 4;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, purchasingPower: next };

  if (next < 30) {
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

  if (next < 15) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        cohesion: Math.max(0, (s.nationalIndicators?.cohesion ?? 60) - 1),
      },
      hiddenPolitics: {
        ...s.hiddenPolitics,
        eliteTrust: Math.max(0, (s.hiddenPolitics?.eliteTrust ?? 65) - 1),
      },
    };
  }

  return s;
}
