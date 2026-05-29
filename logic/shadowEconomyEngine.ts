/**
 * shadowEconomyEngine.ts — Économie informelle nationale (MODE DELTA).
 *
 * Jauge abstraite (0-100) représentant la part fictive de l'activité
 * économique qui échappe aux circuits formels. Ne simule aucune méthode
 * de fraude réelle, aucun conseil d'évasion, aucune comptabilité occulte.
 *
 * Augmente si : fiscalité perçue injuste, confiance institutionnelle faible,
 *   chômage élevé, inflation forte, administration défaillante, crise sociale,
 *   corruption perçue, emploi formel peu attractif.
 * Baisse si : simplification administrative, contrôle intelligent, stabilité
 *   économique, emploi formel attractif, consentement fiscal fort.
 *
 * Seuils :
 *   0–20  : Marginale      — circuits formels dominants, statistiques fiables
 *   21–40 : Significative  — pertes modérées, situation gérable
 *   41–65 : Préoccupante   — problème structurel, politiques moins efficaces
 *   66–100: Endémique      — crise systémique, recettes effondrées, fracture sociale
 *
 * Effets quotidiens :
 *   ≥ 50 tous les 3 j : publicBudget -1 (recettes manquantes)
 *   ≥ 65 tous les 3 j : scandalRisk +1 (corruption perçue)
 *   ≥ 70 tous les 4 j : économie -1 (statistiques moins fiables → politiques moins efficaces)
 *   ≥ 80 tous les 3 j : cohésion -1 (injustice perçue)
 *   ≤ 20 tous les 5 j : économie +1 (économie formelle forte)
 */

import type { StrategyGameState } from "@/types/strategy";

export type ShadowEconomyBand = "marginale" | "significative" | "preoccupante" | "endemique";

export interface ShadowEconomyBandInfo {
  band:    ShadowEconomyBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_SHADOW_ECONOMY = 30;

const BANDS: { threshold: number; info: ShadowEconomyBandInfo }[] = [
  {
    threshold: 66,
    info: {
      band: "endemique", label: "Endémique", color: "#e54848",
      message: "L'économie souterraine est devenue structurelle. Les recettes publiques s'effondrent et l'État perd sa capacité d'action. La fracture entre citoyens contribuables et non-contribuables s'aggrave.",
    },
  },
  {
    threshold: 41,
    info: {
      band: "preoccupante", label: "Préoccupante", color: "#e8864f",
      message: "L'économie informelle constitue un problème structurel. Les statistiques officielles sont de moins en moins fiables. L'efficacité des politiques publiques se dégrade progressivement.",
    },
  },
  {
    threshold: 21,
    info: {
      band: "significative", label: "Significative", color: "#e8c44f",
      message: "Une fraction notable de l'activité échappe aux circuits formels. Les recettes subissent des pertes modérées. La situation reste gérable si des mesures sont prises rapidement.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "marginale", label: "Marginale", color: "#4caf82",
      message: "L'économie informelle reste contenue. L'essentiel de l'activité économique transite par les circuits officiels. Les recettes et les statistiques nationales sont fiables.",
    },
  },
];

export function getShadowEconomyBandInfo(value: number): ShadowEconomyBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeShadowEconomyTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];
  let target = 30;

  // Consentement fiscal — déterminant principal (fiscalité perçue injuste → fuite vers l'informel)
  const consent = state.fiscalConsent ?? 62;
  if (consent <= 25)       target += 16;
  else if (consent <= 40)  target +=  9;
  else if (consent <= 55)  target +=  3;
  else if (consent >= 75)  target -=  8;
  else if (consent >= 60)  target -=  4;

  // Pression fiscale — niveau de résistance formelle
  const taxPressure = state.taxPressure ?? 42;
  if (taxPressure >= 75)       target +=  8;
  else if (taxPressure >= 62)  target +=  4;
  else if (taxPressure <= 28)  target -=  4;

  // Chômage — sans emploi formel, les actifs se tournent vers l'informel
  const unemployment = state.unemployment ?? 25;
  if (unemployment >= 60)      target += 10;
  else if (unemployment >= 45) target +=  6;
  else if (unemployment >= 30) target +=  3;
  else if (unemployment <= 12) target -=  5;

  // Qualité de l'emploi — emploi formel attractif retient dans les circuits légaux
  const jobQuality = state.jobQuality ?? 55;
  if (jobQuality >= 70)        target -=  7;
  else if (jobQuality >= 55)   target -=  3;
  else if (jobQuality <= 30)   target +=  6;
  else if (jobQuality <= 45)   target +=  3;

  // Inflation — coût de la vie pousse vers les alternatives informelles
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)         target +=  8;
  else if (inflation >= 55)    target +=  4;
  else if (inflation >= 40)    target +=  2;
  else if (inflation <= 20)    target -=  3;

  // Efficacité du recouvrement fiscal — contrôle intelligent
  const taxEfficiency = state.taxEfficiency ?? 50;
  if (taxEfficiency >= 70)     target -=  9;
  else if (taxEfficiency >= 55) target -= 4;
  else if (taxEfficiency <= 30) target += 8;
  else if (taxEfficiency <= 45) target += 4;

  // Stabilité institutionnelle — confiance dans les institutions formelles
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 75)         target -=  6;
  else if (stability >= 60)    target -=  2;
  else if (stability < 40)     target +=  8;
  else if (stability < 55)     target +=  4;

  // Moral de l'administration — faible morale = contrôle laxiste
  const adminMorale = state.administrationMorale ?? 60;
  if (adminMorale >= 70)       target -=  4;
  else if (adminMorale <= 35)  target +=  7;
  else if (adminMorale <= 50)  target +=  3;

  // Fatigue populaire — crise sociale pousse vers les circuits alternatifs
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue >= 70)           target +=  7;
  else if (fatigue >= 55)      target +=  3;
  else if (fatigue < 20)       target -=  3;

  // Risque de scandale / corruption perçue — érode la légitimité de l'État
  const scandalRisk = hp?.scandalRisk ?? 20;
  if (scandalRisk >= 65)       target +=  7;
  else if (scandalRisk >= 45)  target +=  3;
  else if (scandalRisk < 15)   target -=  3;

  // Dynamisme économique — prospérité rend l'emploi formel plus attractif
  const economy = ind?.economy ?? 55;
  if (economy >= 70)           target -=  6;
  else if (economy >= 55)      target -=  2;
  else if (economy < 30)       target +=  7;
  else if (economy < 45)       target +=  3;

  // Pathologies du discours — incohérence gouvernementale érode la légitimité fiscale
  const pathology = state.discoursePathology;
  if (pathology) {
    if (pathology.doubleSpeak > 70 || pathology.scapegoating > 70) target += 5;
    else if (pathology.doubleSpeak > 45 || pathology.scapegoating > 45) target += 2;
  }

  // Recherches — modernisation et simplification administrative
  if (completed.includes("research_admin_ai"))     target -= 10;
  if (completed.includes("research_digital_twin")) target -=  6;

  return Math.max(0, Math.min(100, target));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickShadowEconomy(state: StrategyGameState): StrategyGameState {
  const current = state.shadowEconomy ?? DEFAULT_SHADOW_ECONOMY;
  const target  = computeShadowEconomyTarget(state);
  const drift   = 3;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, shadowEconomy: Math.round(next) };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;
  const ind = s.nationalIndicators;

  // Recettes publiques manquantes — pertes fiscales structurelles (tous les 3 j)
  if (next >= 50 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, publicBudget: Math.max(-150, (ind?.publicBudget ?? 20) - 1) } };
  }

  // Corruption perçue — scandale latent lié à l'impunité (tous les 3 j)
  if (next >= 65 && day % 3 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, scandalRisk: Math.min(100, (hp?.scandalRisk ?? 20) + 1) } };
  }

  // Statistiques peu fiables → politiques publiques moins efficaces (tous les 4 j)
  if (next >= 70 && day % 4 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1) } };
  }

  // Injustice perçue — fracture sociale entre contribuables et non-contribuables (tous les 3 j)
  if (next >= 80 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.max(0, (s.nationalIndicators?.cohesion ?? 60) - 1) } };
  }

  // Économie formelle forte — cercle vertueux de la confiance (tous les 5 j)
  if (next <= 20 && day % 5 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.min(100, (s.nationalIndicators?.economy ?? 55) + 1) } };
  }

  return s;
}
