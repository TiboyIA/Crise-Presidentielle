import type { ImageSourcePropType } from "react-native";

/**
 * Painted icons for the "Climat politique" cards on the dashboard
 * (média sentiment, opposition pressure). Same painterly style as the
 * gauge icons — see `data/gaugeImages.ts`.
 */
export const META_IMAGES = {
  media: require("@/assets/images/meta/media.png") as ImageSourcePropType,
  opposition: require("@/assets/images/meta/opposition.png") as ImageSourcePropType,
};
