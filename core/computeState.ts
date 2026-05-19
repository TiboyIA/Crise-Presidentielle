import type { HiddenPolitics, NationalIndicators, StrategyResources } from "@/types/strategy";

// Pure state transform utilities — no React, Expo, AsyncStorage, or navigation.
// Extracted from StrategyContext so they can be tested and reused independently.

export function applyIndicatorEffects(
  indicators: NationalIndicators,
  effects: Partial<NationalIndicators>,
): NationalIndicators {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
  return {
    popularity:   clamp(indicators.popularity   + (effects.popularity   ?? 0), 0, 100),
    economy:      clamp(indicators.economy       + (effects.economy      ?? 0), 0, 100),
    security:     clamp(indicators.security      + (effects.security     ?? 0), 0, 100),
    ecology:      clamp(indicators.ecology       + (effects.ecology      ?? 0), 0, 100),
    cohesion:     clamp(indicators.cohesion      + (effects.cohesion     ?? 0), 0, 100),
    publicBudget: clamp(indicators.publicBudget  + (effects.publicBudget ?? 0), -150, 100),
  };
}

export function applyHiddenPoliticsEffects(
  hp: HiddenPolitics,
  effects: Partial<HiddenPolitics>,
): HiddenPolitics {
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
  return {
    eliteTrust:             clamp(hp.eliteTrust             + (effects.eliteTrust             ?? 0)),
    scandalRisk:            clamp(hp.scandalRisk            + (effects.scandalRisk            ?? 0)),
    mediaMood:              clamp(hp.mediaMood              + (effects.mediaMood              ?? 0)),
    popularFatigue:         clamp(hp.popularFatigue         + (effects.popularFatigue         ?? 0)),
    regionalTension:        clamp(hp.regionalTension        + (effects.regionalTension        ?? 0)),
    institutionalStability: clamp(hp.institutionalStability + (effects.institutionalStability ?? 0)),
  };
}

export function applyRewards(
  resources: StrategyResources,
  rewards: Partial<StrategyResources>,
): StrategyResources {
  const next = { ...resources };
  for (const [key, amount] of Object.entries(rewards) as [keyof StrategyResources, number][]) {
    next[key] = Math.round((next[key] ?? 0) + amount);
  }
  return next;
}
