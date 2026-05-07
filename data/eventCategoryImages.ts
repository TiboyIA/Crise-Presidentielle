import type { ImageSourcePropType } from "react-native";
import type { EventCategory } from "@/data/events";

/**
 * LOT 2 / LOT 3 — Une illustration en bandeau 16:9 par catégorie
 * d'événement. Affichée en haut du `EventModal` pour donner une
 * identité visuelle forte à chaque type de crise, plutôt qu'un mur
 * de texte.
 *
 * Catégories non couvertes ici (volontairement) :
 *  - `delayed` : c'est un effet retardé, pas une thématique propre.
 *    Le bandeau reprend l'image de la catégorie d'origine si possible,
 *    sinon le modal s'affiche sans image.
 *
 * Le bandeau `hybrid_warfare` est ajouté par le LOT 3 — il pointe
 * sur l'image dédiée du module 6 (`assets/images/hybrid/`).
 */
export const EVENT_CATEGORY_IMAGES: Partial<
  Record<EventCategory, ImageSourcePropType>
> = {
  social: require("@/assets/images/events/event_social.png"),
  economy: require("@/assets/images/events/event_economy.png"),
  security: require("@/assets/images/events/event_security.png"),
  diplomacy: require("@/assets/images/events/event_diplomacy.png"),
  ecology: require("@/assets/images/events/event_ecology.png"),
  scandal: require("@/assets/images/events/event_scandal.png"),
  media: require("@/assets/images/events/event_media.png"),
  opposition: require("@/assets/images/events/event_opposition.png"),
  regional: require("@/assets/images/events/event_regional.png"),
  cyber: require("@/assets/images/events/event_cyber.png"),
  health: require("@/assets/images/events/event_health.png"),
  energy: require("@/assets/images/events/event_energy.png"),
  agriculture: require("@/assets/images/events/event_agriculture.png"),
  hybrid_warfare: require("@/assets/images/hybrid/hybrid_warfare.png"),
};
