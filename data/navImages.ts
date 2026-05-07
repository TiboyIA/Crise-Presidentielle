import type { ImageSourcePropType } from "react-native";

/**
 * Painted icons for the dashboard's "ACCÈS RAPIDE" navigation cards.
 * Same painterly style family as `gaugeImages.ts` and `metaImages.ts`.
 */
export const NAV_IMAGES = {
  cabinet: require("@/assets/images/nav/cabinet.png") as ImageSourcePropType,
  regions: require("@/assets/images/nav/regions.png") as ImageSourcePropType,
  promises: require("@/assets/images/nav/promises.png") as ImageSourcePropType,
  journal: require("@/assets/images/nav/journal.png") as ImageSourcePropType,
};
