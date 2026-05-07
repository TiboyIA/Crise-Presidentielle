import type { ImageSourcePropType } from "react-native";

export const CABINET_HEADER: ImageSourcePropType = require("@/assets/images/screens/cabinet_header.png");

export type MinisterBadgeKey = "rival" | "risk" | "scandal" | "dismiss";

/**
 * Micro-illustrations painterly servant de glyphes pour les badges
 * d'état d'un ministre :
 *  - rival   : drapeau de fronde déchiré (frondeur·euse déclaré·e)
 *  - risk    : œil dans la brume (rumeurs, scandale latent ≥60)
 *  - scandal : encre noire qui coule (compteur de scandales avérés)
 *  - dismiss : siège vide (action « démettre & remplacer »)
 */
export const MINISTER_BADGE_IMAGES: Record<MinisterBadgeKey, ImageSourcePropType> = {
  rival: require("@/assets/images/cabinet/badge_rival.png"),
  risk: require("@/assets/images/cabinet/badge_risk.png"),
  scandal: require("@/assets/images/cabinet/badge_scandal.png"),
  dismiss: require("@/assets/images/cabinet/badge_dismiss.png"),
};
