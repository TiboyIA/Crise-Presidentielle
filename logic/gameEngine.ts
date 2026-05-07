import { Gauges, HiddenGauges, HiddenGaugeKey } from "@/types/game";

// Re-exports kept for backward compatibility — new code should import
// directly from the canonical modules below.
export { clamp, gaugeColor } from "@/logic/utils";
export {
  applyChoice,
  applyHiddenEffects,
  applyMinisterEffects,
  applyRegionEffects,
  applyPromiseChanges,
} from "@/logic/crisisEngine";
export type { PromiseChangeResult } from "@/logic/crisisEngine";
export {
  applyEndOfTurnDrift,
  revealScandal,
} from "@/logic/mediaEngine";
export type { DriftResult, ScandalRevealResult } from "@/logic/mediaEngine";
export { checkGameOver } from "@/logic/endings";
export type { GameOverResult } from "@/types/game";

export const INITIAL_GAUGES: Gauges = {
  popularity: 55,
  economy: 50,
  budget: 50,
  debt: 55,
  security: 60,
  health: 60,
  ecology: 45,
  cohesion: 55,
  diplomacy: 55,
  regionalStability: 60,
  authority: 60,
};

export const GAUGE_LABELS: Record<keyof Gauges, string> = {
  popularity: "Popularité",
  economy: "Économie",
  budget: "Finances publiques",
  debt: "Dette",
  security: "Sécurité",
  health: "Santé publique",
  ecology: "Écologie",
  cohesion: "Cohésion sociale",
  diplomacy: "Diplomatie",
  regionalStability: "Stabilité régionale",
  authority: "Autorité",
};

export const GAUGE_ICONS: Record<keyof Gauges, string> = {
  popularity: "users",
  economy: "trending-up",
  budget: "wallet",
  debt: "credit-card",
  security: "shield",
  health: "heart-pulse",
  ecology: "wind",
  cohesion: "handshake",
  diplomacy: "globe",
  regionalStability: "map",
  authority: "command",
};

/**
 * Set of gauge keys where a HIGH value is BAD (inverted semantics).
 * Used for color tone inversion in the UI and for game-over checks.
 * Currently only `debt` — high debt is dangerous; low debt is healthy.
 */
export const INVERTED_GAUGES: ReadonlySet<keyof Gauges> = new Set<keyof Gauges>(
  ["debt"],
);

export const INITIAL_HIDDEN_GAUGES: HiddenGauges = {
  scandalRisk: 15,
  peopleFatigue: 20,
  radicalization: 15,
  foreignDependence: 25,
  cyberRisk: 20,
  corruption: 10,
  oppositionPower: 30,
};

export const HIDDEN_GAUGE_LABELS: Record<HiddenGaugeKey, string> = {
  scandalRisk: "Risque de scandale",
  peopleFatigue: "Fatigue du peuple",
  radicalization: "Radicalisation",
  foreignDependence: "Dépendance étrangère",
  cyberRisk: "Risque cyber",
  corruption: "Corruption",
  oppositionPower: "Puissance de l'opposition",
};

export const HIDDEN_GAUGE_ICONS: Record<HiddenGaugeKey, string> = {
  scandalRisk: "alert-triangle",
  peopleFatigue: "battery-low",
  radicalization: "flame",
  foreignDependence: "anchor",
  cyberRisk: "wifi-off",
  corruption: "dollar-sign",
  oppositionPower: "swords",
};

/**
 * Threshold at which a hidden gauge auto-reveals to the player.
 * (Choices may also reveal earlier via `revealsHiddenGauge`.)
 */
export const HIDDEN_GAUGE_REVEAL_THRESHOLD = 75;
