import type { ImageSourcePropType } from "react-native";

/**
 * LOT 14 — Micro-illustrations painterly utilisées dans la chrome
 * du `EventModal` (en complément des bandeaux par catégorie de
 * `eventCategoryImages.ts` et des micro-icônes de ton de
 * `eventToneImages.ts`).
 *
 *  - `EVENT_BADGE_ALERT`  : sceau de cire ambre fraîchement ouvert,
 *    léger filet de fumée. Affiché en lieu et place du dot rouge
 *    de la barre "ALERTE — CATÉGORIE".
 *  - `CONFIRM_SEAL`       : sceau de cire ambre frappé fraîchement.
 *    Remplace le `<Feather check-circle>` du bouton "VALIDER LA
 *    DÉCISION" pour cohérence avec la métaphore officielle (chaque
 *    décision présidentielle est scellée).
 */
export const EVENT_BADGE_ALERT: ImageSourcePropType = require("@/assets/images/events/event_badge_alert.png");

export const CONFIRM_SEAL: ImageSourcePropType = require("@/assets/images/events/confirm_seal.png");
