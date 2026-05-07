import type { ImageSourcePropType } from "react-native";
import type { Gauges } from "@/context/GameContext";

export const GAUGE_IMAGES: Record<keyof Gauges, ImageSourcePropType> = {
  popularity: require("@/assets/images/gauges/popularity.png"),
  economy: require("@/assets/images/gauges/economy.png"),
  budget: require("@/assets/images/gauges/budget.png"),
  debt: require("@/assets/images/gauges/debt.png"),
  security: require("@/assets/images/gauges/security.png"),
  health: require("@/assets/images/gauges/health.png"),
  ecology: require("@/assets/images/gauges/ecology.png"),
  cohesion: require("@/assets/images/gauges/cohesion.png"),
  diplomacy: require("@/assets/images/gauges/diplomacy.png"),
  regionalStability: require("@/assets/images/gauges/regionalStability.png"),
  authority: require("@/assets/images/gauges/authority.png"),
};
