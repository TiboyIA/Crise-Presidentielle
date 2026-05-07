import type { ImageSourcePropType } from "react-native";
import type { President } from "@/context/GameContext";

export const IDEOLOGY_IMAGES: Record<President["ideology"], ImageSourcePropType> = {
  liberal: require("@/assets/images/ideologies/liberal.png"),
  conservateur: require("@/assets/images/ideologies/conservateur.png"),
  socialiste: require("@/assets/images/ideologies/socialiste.png"),
  ecologiste: require("@/assets/images/ideologies/ecologiste.png"),
  souverainiste: require("@/assets/images/ideologies/souverainiste.png"),
};
