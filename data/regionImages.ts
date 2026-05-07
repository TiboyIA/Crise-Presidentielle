import type { ImageSourcePropType } from "react-native";
import { GAUGE_IMAGES } from "@/data/gaugeImages";
import type { RegionGaugeKey, RegionId } from "@/data/regions";
import type { Gauges } from "@/context/GameContext";

export const REGION_BANNERS: Record<RegionId, ImageSourcePropType> = {
  idf: require("@/assets/images/regions/idf.png"),
  paca: require("@/assets/images/regions/paca.png"),
  auvergne: require("@/assets/images/regions/auvergne.png"),
  hdf: require("@/assets/images/regions/hdf.png"),
  bretagne: require("@/assets/images/regions/bretagne.png"),
  occitanie: require("@/assets/images/regions/occitanie.png"),
  grand_est: require("@/assets/images/regions/grand_est.png"),
  outre_mer: require("@/assets/images/regions/outre_mer.png"),
};

export const REGIONS_HEADER: ImageSourcePropType = require("@/assets/images/screens/regions_header.png");

/**
 * Mapping : les 6 jauges régionales correspondent toutes à une jauge
 * nationale déjà illustrée. On réutilise GAUGE_IMAGES plutôt que
 * de regénérer 6 visuels redondants. Les 2 mappings sémantiques :
 *  - publicHealth → health (santé publique nationale)
 *  - socialStability → cohesion (cohésion sociale nationale)
 */
const REGION_TO_NATIONAL_GAUGE: Record<RegionGaugeKey, keyof Gauges> = {
  economy: "economy",
  security: "security",
  popularity: "popularity",
  ecology: "ecology",
  publicHealth: "health",
  socialStability: "cohesion",
};

export function getRegionGaugeImage(k: RegionGaugeKey): ImageSourcePropType {
  return GAUGE_IMAGES[REGION_TO_NATIONAL_GAUGE[k]];
}
