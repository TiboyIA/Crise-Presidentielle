/**
 * Painterly navy+amber visuals for the home screen (`app/index.tsx`).
 * All assets respect the strict project guidelines:
 * NO faces, NO real flags, NO readable text/numbers, NO recognizable real geography.
 *
 * - SPLASH_BG: fullscreen background (presidential study at night).
 * - MANDATE_SEAL: 64px ornament beside the "REPRENDRE LE MANDAT" CTA.
 * - HOME_LINK_ICONS: small painterly icons replacing Feather glyphs in the
 *   bottom link row (COMMENT JOUER / STATISTIQUES / BOUTIQUE).
 */

export const SPLASH_BG: number = require(
  "../assets/images/splash_bg_v2.png",
) as number;

export const MANDATE_SEAL: number = require(
  "../assets/images/home/mandate_seal.png",
) as number;

export type HomeLinkKey = "play" | "stats" | "shop";

export const HOME_LINK_ICONS: Record<HomeLinkKey, number> = {
  play: require("../assets/images/home/link_play.png") as number,
  stats: require("../assets/images/home/link_stats.png") as number,
  shop: require("../assets/images/home/link_shop.png") as number,
};
