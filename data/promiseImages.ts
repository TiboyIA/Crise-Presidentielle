import type { ImageSourcePropType } from "react-native";
import type { PromiseTag } from "@/data/promises";

export const PROMISE_IMAGES: Record<PromiseTag, ImageSourcePropType> = {
  purchasing_power: require("@/assets/images/promises/purchasing_power.png"),
  security: require("@/assets/images/promises/security.png"),
  ecology: require("@/assets/images/promises/ecology.png"),
  industry: require("@/assets/images/promises/industry.png"),
  europe: require("@/assets/images/promises/europe.png"),
  secularism: require("@/assets/images/promises/secularism.png"),
  education: require("@/assets/images/promises/education.png"),
  tax_cut: require("@/assets/images/promises/tax_cut.png"),
  social_justice: require("@/assets/images/promises/social_justice.png"),
  sovereignty: require("@/assets/images/promises/sovereignty.png"),
};

export const PROMISES_EMPTY: ImageSourcePropType = require("@/assets/images/promises/empty_state.png");

export type PromiseStatusKey = "fulfilled" | "pending" | "broken";

export const PROMISE_STATUS_IMAGES: Record<PromiseStatusKey, ImageSourcePropType> = {
  fulfilled: require("@/assets/images/promises/status_fulfilled.png"),
  pending: require("@/assets/images/promises/status_pending.png"),
  broken: require("@/assets/images/promises/status_broken.png"),
};
