import type { ImageSourcePropType } from "react-native";
import type { TechId } from "@/types/game";
import type { DoctrineId } from "@/data/techTree";

/* eslint-disable @typescript-eslint/no-require-imports */
export const RESEARCH_IMAGES: Record<TechId, ImageSourcePropType> = {
  cyber_security: require("@/assets/images/research/cyber_security.png"),
  electric_grid: require("@/assets/images/research/electric_grid.png"),
  surveillance_drones: require("@/assets/images/research/surveillance_drones.png"),
  smart_agriculture: require("@/assets/images/research/smart_agriculture.png"),
  admin_ai: require("@/assets/images/research/admin_ai.png"),
  digital_hospitals: require("@/assets/images/research/digital_hospitals.png"),
  sovereign_energy: require("@/assets/images/research/sovereign_energy.png"),
  antimissile_shield: require("@/assets/images/research/antimissile_shield.png"),
  science_education: require("@/assets/images/research/science_education.png"),
  strategic_industry: require("@/assets/images/research/strategic_industry.png"),
};

/**
 * Module 7.1 — Emblèmes des doctrines (sceaux 512×512 painterly).
 * Affichés dans la page /research au sommet de chaque branche
 * complétée, et utilisables comme illustration dans le journal.
 */
export const DOCTRINE_IMAGES: Record<DoctrineId, ImageSourcePropType> = {
  doctrine_forteresse: require("@/assets/images/research/doctrine_forteresse.png"),
  doctrine_autonomie: require("@/assets/images/research/doctrine_autonomie.png"),
  doctrine_resilience: require("@/assets/images/research/doctrine_resilience.png"),
  doctrine_savoir: require("@/assets/images/research/doctrine_savoir.png"),
};
