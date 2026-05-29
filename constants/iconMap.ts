// Mapping centralisé : domaine de jeu → icône MaterialCommunityIcons.
//
// Remplace tous les emojis utilisés comme pictogrammes fonctionnels par des
// icônes vectorielles professionnelles homogènes (même bibliothèque, même
// logique visuelle). Aucun emoji ne doit subsister dans l'UI.
//
// Les valeurs sont des noms d'icônes @expo/vector-icons/MaterialCommunityIcons.

import type { ResourceKey } from "@/types/strategy";

/** Ressources stratégiques — remplace RESOURCE_ICONS (emojis). */
export const RESOURCE_MCI: Record<ResourceKey, string> = {
  money:        "cash-multiple",
  influence:    "bullhorn-outline",
  energy:       "flash",
  intelligence: "eye-outline",
  technology:   "flask-outline",
  military:     "shield-star-outline",
  cyberDefense: "shield-lock-outline",
};

/** Doctrines de gouvernance — remplace les emojis de l'écran d'investiture. */
export const DOCTRINE_MCI: Record<string, string> = {
  democratique:   "scale-balance",
  securitaire:    "shield-check-outline",
  technocratique: "office-building-outline",
  populiste:      "bullhorn-outline",
  souverainiste:  "flag-variant-outline",
  ecologiste:     "leaf",
  liberal:        "trending-up",
  autoritaire:    "gavel",
};

/** Types d'actualité du Journal de Crise — remplace typeIcon (emojis). */
export const NEWS_TYPE_MCI: Record<string, string> = {
  national:       "bank-outline",
  economie:       "chart-line-variant",
  social:         "account-group-outline",
  cyber:          "shield-lock-outline",
  diplomatie:     "earth",
  guerre_hybride: "radar",
  monde:          "map-outline",
  classement:     "trophy-outline",
};

/** Niveaux d'urgence — icône + couleur portée par uiTokens. */
export const URGENCY_MCI: Record<string, string> = {
  faible:   "information-outline",
  moyenne:  "alert-circle-outline",
  forte:    "alert-octagon-outline",
  critique: "alert-decagram-outline",
};

/** Actions / éléments d'interface génériques — remplace les emojis de menus. */
export const UI_MCI = {
  settings:   "cog-outline",
  saves:      "content-save-outline",
  shop:       "shopping-outline",
  tutorial:   "book-open-variant",
  locked:     "lock-outline",
  check:      "check",
  uncheck:    "circle-outline",
  back:       "chevron-left",
  forward:    "chevron-right",
  crest:      "shield-crown-outline",
  alert:      "alert-octagon-outline",
  health:     "heart-pulse",
  weather:    "weather-partly-cloudy",
  defense:    "shield-star-outline",
  economy:    "chart-line-variant",
  energy:     "transmission-tower",
  cyber:      "shield-lock-outline",
  diplomacy:  "earth",
  trophy:     "trophy-outline",
} as const;

/** Helper : retourne l'icône d'une ressource (fallback neutre). */
export function resourceIcon(key: ResourceKey): string {
  return RESOURCE_MCI[key] ?? "circle-outline";
}
