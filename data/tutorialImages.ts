import type { ImageSourcePropType } from "react-native";

export type TutorialStepKey = "gauges" | "consequences" | "election";

export const TUTORIAL_IMAGES: Record<TutorialStepKey, ImageSourcePropType> = {
  gauges: require("@/assets/images/tutorial/step_gauges.png"),
  consequences: require("@/assets/images/tutorial/step_consequences.png"),
  election: require("@/assets/images/tutorial/step_election.png"),
};

export const CREATE_HERO_IMAGE: ImageSourcePropType = require("@/assets/images/create/hero_investiture.png");
