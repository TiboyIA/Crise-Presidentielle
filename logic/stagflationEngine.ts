/**
 * stagflationEngine.ts — Détecteur de stagflation (MODE DELTA).
 *
 * stagflationIndex (0-100) — indice composite mesurant la simultanéité de :
 *   Pilier 1 : inflation élevée        (0-30 pts)
 *   Pilier 2 : chômage élevé           (0-25 pts)
 *   Pilier 3 : économie faible         (0-20 pts)
 *   Amplificateurs : énergie instable, productivité dégradée, taux restrictifs  (+23 max)
 *
 * L'indice ne monte significativement que si inflation ET chômage sont
 * simultanément élevés. Sans les deux piliers principaux, il est plafonné à 22.
 *
 * Les choix du joueur n'agissent pas directement sur l'indice — ils modifient
 * les conditions sous-jacentes (inflation, chômage, économie, énergie) qui le
 * font dériver naturellement.
 *
 * Bands :
 *   0–25  : Situation maîtrisée
 *   26–50 : Pressions stagflationnistes
 *   51–75 : Stagflation avérée
 *   76–100: Stagflation sévère
 *
 * Effets quotidiens :
 *   index ≥ 55 (×4j) : investorConfidence -1
 *   index ≥ 60 (×3j) : popularFatigue +1
 *   index ≥ 65 (×3j) : oppositionPower +1
 *   index ≥ 75 (×2j) : popularFatigue +1 supplémentaire
 *   index ≥ 80 (×3j) : cohésion -1
 */

import type { StrategyGameState } from "@/types/strategy";

export type StagflationBand = "maitrisee" | "pressions" | "averee" | "severe";

export interface StagflationBandInfo {
  band:    StagflationBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_STAGFLATION_INDEX = 0;

const BANDS: { threshold: number; info: StagflationBandInfo }[] = [
  {
    threshold: 76,
    info: {
      band: "severe", label: "Stagflation sévère", color: "#e54848",
      message: "La conjonction de l'inflation et du chômage atteint un niveau critique. Les politiques habituelles sont inopérantes. Chaque remède aggrave l'un des deux maux.",
    },
  },
  {
    threshold: 51,
    info: {
      band: "averee", label: "Stagflation avérée", color: "#e8864f",
      message: "L'inflation et le chômage progressent simultanément malgré les politiques correctrices. Le piège de la stagflation est confirmé. Des réformes structurelles profondes sont nécessaires.",
    },
  },
  {
    threshold: 26,
    info: {
      band: "pressions", label: "Pressions stagflationnistes", color: "#e8c44f",
      message: "Des signaux préoccupants émergent : l'inflation persiste malgré la faiblesse économique. Les arbitrages entre stabilité des prix et soutien à l'emploi deviennent difficiles.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "maitrisee", label: "Situation maîtrisée", color: "#4caf82",
      message: "Aucune pression stagflationniste détectée. Les conditions de prix et d'emploi ne montrent pas de conjonction critique.",
    },
  },
];

export function getStagflationBandInfo(value: number): StagflationBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

function computeStagflationTarget(state: StrategyGameState): number {
  const inflation    = state.inflation ?? 25;
  const unemployment = state.unemployment ?? 25;
  const economy      = state.nationalIndicators?.economy ?? 55;
  const jobQuality   = state.jobQuality ?? 55;

  // Pilier 1 — inflation (0-30)
  let inflationScore = 0;
  if (inflation >= 65)       inflationScore = 30;
  else if (inflation >= 50)  inflationScore = 20;
  else if (inflation >= 40)  inflationScore = 10;
  else if (inflation >= 35)  inflationScore =  5;

  // Pilier 2 — chômage (0-25)
  let unemploymentScore = 0;
  if (unemployment >= 45)       unemploymentScore = 25;
  else if (unemployment >= 35)  unemploymentScore = 16;
  else if (unemployment >= 28)  unemploymentScore =  8;
  else if (unemployment >= 23)  unemploymentScore =  3;

  // Pilier 3 — économie faible (0-20)
  let stagnationScore = 0;
  if (economy < 30)       stagnationScore = 20;
  else if (economy < 40)  stagnationScore = 13;
  else if (economy < 50)  stagnationScore =  6;

  let score = inflationScore + unemploymentScore + stagnationScore;

  // Sans les deux piliers principaux, l'indice reste en zone basse (pas de vraie stagflation)
  if (inflationScore === 0 || unemploymentScore === 0) {
    score = Math.min(score, 22);
  }

  // Amplificateur — instabilité énergétique (+10 max)
  const sc = state.supplyChain;
  if (sc) {
    if (sc.energie.disruptionRisk >= 60)       score += 10;
    else if (sc.energie.disruptionRisk >= 40)  score +=  5;
  }

  // Amplificateur — dégradation de la qualité d'emploi / productivité (+8 max)
  if (jobQuality <= 30)       score += 8;
  else if (jobQuality <= 45)  score += 4;

  // Amplificateur — taux restrictifs en contexte de chômage élevé (+5)
  const interestRate = state.interestRate ?? 30;
  if (interestRate >= 60 && unemploymentScore > 0) score += 5;

  return Math.max(0, Math.min(100, score));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickStagflation(state: StrategyGameState): StrategyGameState {
  const current = state.stagflationIndex ?? DEFAULT_STAGFLATION_INDEX;
  const drift   = 4;
  const target  = computeStagflationTarget(state);

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);
  next = Math.round(next);

  let s: StrategyGameState = { ...state, stagflationIndex: next };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;

  // Marchés — perte de confiance dans la capacité des politiques à sortir du piège
  if (next >= 55 && day % 4 === 0) {
    s = { ...s, investorConfidence: Math.max(0, (s.investorConfidence ?? 55) - 1) };
  }

  // Tension sociale — prix qui montent + emploi qui ne repart pas = lassitude
  if (next >= 60 && day % 3 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1) } };
  }

  // Opposition — capitalise sur l'incapacité économique perçue
  if (next >= 65 && day % 3 === 0) {
    s = { ...s, oppositionPower: Math.min(100, (s.oppositionPower ?? 35) + 1) };
  }

  // Détresse sociale aggravée — stagnation dure épuise la résilience populaire
  if (next >= 75 && day % 2 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + 1) } };
  }

  // Fracture sociale — stagflation sévère divise entre ceux qui survivent et les autres
  if (next >= 80 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.max(0, (s.nationalIndicators?.cohesion ?? 60) - 1) } };
  }

  return s;
}
