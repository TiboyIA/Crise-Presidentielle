// Re-export shim — canonical implementation is in @/logic/frustrationEngine.
// This file exists for backward compatibility with any future imports.
export type {
  FrustrationBand,
  FrustrationFactors,
  FrustrationResult,
  PlayerRecommendation,
} from "@/logic/frustrationEngine";
export {
  BAND_COLORS,
  BAND_LABELS,
  computeFrustration,
  getBand,
} from "@/logic/frustrationEngine";
