import type { ImageSourcePropType } from "react-native";

export const SHOP_HERO: ImageSourcePropType = require("../assets/images/shop/shop_hero.png");

export const SHOP_PACK_BANNERS: Record<
  "climate" | "cyber",
  ImageSourcePropType
> = {
  climate: require("../assets/images/shop/pack_climate_banner.png"),
  cyber: require("../assets/images/shop/pack_cyber_banner.png"),
};

export type ClimateBulletKey =
  | "canicule"
  | "crue"
  | "megafeu"
  | "revolte"
  | "penurie"
  | "migration";

export const SHOP_BULLET_THUMBS: Record<ClimateBulletKey, ImageSourcePropType> = {
  canicule: require("../assets/images/shop/bullet_canicule.png"),
  crue: require("../assets/images/shop/bullet_crue.png"),
  megafeu: require("../assets/images/shop/bullet_megafeu.png"),
  revolte: require("../assets/images/shop/bullet_revolte.png"),
  penurie: require("../assets/images/shop/bullet_penurie.png"),
  migration: require("../assets/images/shop/bullet_migration.png"),
};

export const SHOP_ICONS: Record<
  "gift" | "check" | "unlock",
  ImageSourcePropType
> = {
  gift: require("../assets/images/shop/icon_gift.png"),
  check: require("../assets/images/shop/icon_check.png"),
  unlock: require("../assets/images/shop/icon_unlock.png"),
};
