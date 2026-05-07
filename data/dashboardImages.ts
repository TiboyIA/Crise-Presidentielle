import type { ImageSourcePropType } from "react-native";

export const DASHBOARD_SECTION_IMAGES: Record<
  "carte" | "indicateurs" | "climat" | "panelistes" | "acces",
  ImageSourcePropType
> = {
  carte: require("../assets/images/dashboard/section_carte.png"),
  indicateurs: require("../assets/images/dashboard/section_indicateurs.png"),
  climat: require("../assets/images/dashboard/section_climat.png"),
  panelistes: require("../assets/images/dashboard/section_panelistes.png"),
  acces: require("../assets/images/dashboard/section_acces.png"),
};

export const DASHBOARD_ICON_IMAGES: Record<
  | "intel"
  | "diplomatique"
  | "recherche"
  | "decision"
  | "briefingEmpty"
  | "director",
  ImageSourcePropType
> = {
  intel: require("../assets/images/dashboard/icon_intel.png"),
  diplomatique: require("../assets/images/dashboard/icon_diplomatique.png"),
  recherche: require("../assets/images/dashboard/icon_recherche.png"),
  decision: require("../assets/images/dashboard/icon_decision.png"),
  briefingEmpty: require("../assets/images/dashboard/icon_briefing_empty.png"),
  director: require("../assets/images/dashboard/icon_director.png"),
};

export const DASHBOARD_ACTION_IMAGES: Record<
  "criseSuivante" | "criseIA",
  ImageSourcePropType
> = {
  criseSuivante: require("../assets/images/dashboard/action_crise_suivante.png"),
  criseIA: require("../assets/images/dashboard/action_crise_ia.png"),
};

export const DASHBOARD_HERO: ImageSourcePropType = require("../assets/images/dashboard/dashboard_hero.png");
