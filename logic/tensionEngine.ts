import type { StrategyGameState } from "@/types/strategy";

export type TensionLevel = "stable" | "pression" | "risque" | "explosive";

// Combines 7 state signals into a 0–100 hidden index.
// Raw contributions sum to max 110 (debt 25 + fatigue 20 + cohesion 15 +
// security 10 + scandal 15 + opposition 10 + instability 15), normalised to 100.
export function computeNationalTension(state: StrategyGameState): number {
  const ind  = state.nationalIndicators;
  const hp   = state.hiddenPolitics;
  const debt = Math.min(state.nationalDebt ?? 0, 500);
  const opp  = state.oppositionPower ?? 35;

  const raw =
    debt / 500 * 25 +
    hp.popularFatigue / 100 * 20 +
    (100 - ind.cohesion) / 100 * 15 +
    (100 - ind.security) / 100 * 10 +
    hp.scandalRisk / 100 * 15 +
    opp / 100 * 10 +
    (100 - hp.institutionalStability) / 100 * 15;

  return Math.round(Math.min(raw / 110 * 100, 100));
}

export function getTensionLevel(tension: number): TensionLevel {
  if (tension < 30) return "stable";
  if (tension < 60) return "pression";
  if (tension < 80) return "risque";
  return "explosive";
}

export function getTensionLabel(level: TensionLevel): string {
  switch (level) {
    case "stable":    return "Tension stable";
    case "pression":  return "Pression politique";
    case "risque":    return "Risque de crise";
    case "explosive": return "Situation explosive";
  }
}

export function getTensionColor(level: TensionLevel): string {
  switch (level) {
    case "stable":    return "#3fbe7a";
    case "pression":  return "#FFB020";
    case "risque":    return "#FF8040";
    case "explosive": return "#FF3040";
  }
}
