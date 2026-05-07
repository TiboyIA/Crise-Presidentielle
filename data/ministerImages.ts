import type { ImageSourcePropType } from "react-native";
import type { MinisterPosition } from "@/data/ministers";

export const MINISTER_PORTRAITS: Record<MinisterPosition, ImageSourcePropType> = {
  pm: require("@/assets/images/ministers/pm.png"),
  interior: require("@/assets/images/ministers/interior.png"),
  economy: require("@/assets/images/ministers/economy.png"),
  foreign: require("@/assets/images/ministers/foreign.png"),
  ecology: require("@/assets/images/ministers/ecology.png"),
  defense: require("@/assets/images/ministers/defense.png"),
};
