/**
 * LOT 7 — visuels painterly navy+ambre pour l'écran /election.
 *
 * 4 visuels d'ambiance + 6 visuels stratégies de riposte.
 * Tous générés en cohérence DA avec les autres écrans (no human
 * faces, no real flags, no real political symbols).
 */
import type { ImageSourcePropType } from "react-native";
import type { FinalDebateStrategy } from "@/types/game";

export const ELECTION_IMAGES = {
  /** Hero du ScreenHeroHeader de /election : plateau de débat TV. */
  debateHero: require("@/assets/images/election/debate_stage_hero.png"),
  /** Visuel "verdict scellé" affiché tant que les ripostes ne sont pas toutes choisies. */
  verdictSealed: require("@/assets/images/election/verdict_sealed.png"),
  /** Cérémonie de victoire : Élysée doré, perspective triomphale. */
  victoryCeremony: require("@/assets/images/election/victory_ceremony.png"),
  /** Défaite électorale : couloir vide, chaise renversée. */
  defeatElectoral: require("@/assets/images/election/defeat_electoral.png"),
};

/** Mapping stratégie → illustration. Couvre les 6 nouvelles stratégies (R7). */
export const STRATEGY_IMAGES: Record<FinalDebateStrategy, ImageSourcePropType> = {
  calm: require("@/assets/images/election/strategy_calm.png"),
  aggressive: require("@/assets/images/election/strategy_aggressive.png"),
  ironic: require("@/assets/images/election/strategy_ironic.png"),
  factual: require("@/assets/images/election/strategy_factual.png"),
  emotional: require("@/assets/images/election/strategy_emotional.png"),
  evasive: require("@/assets/images/election/strategy_evasive.png"),
};
