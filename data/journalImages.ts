/**
 * Module 7 — Mapping des visuels painterly du journal des décisions.
 *
 * Charge les illustrations affichées sur la page `/journal` :
 *   - le hero header (kiosque painterly) ;
 *   - les 4 emblèmes des médias fictifs (clairon, marchés, république,
 *     réseau libre) — utilisés dans la une attachée à chaque décision ;
 *   - les 4 vignettes de tonalité (favorable, critique, alarmiste,
 *     neutre) — affichées à côté du nom du média ;
 *   - l'emblème "OPPOSITION" générique pour la réaction de l'opposition.
 *
 * Style : painterly oil, navy+ambre, NO faces, NO real flags, NO text.
 * Toutes les illustrations sont des CDM 1024x1024 (ou 1024x686 trim
 * pour le hero).
 */
import type { ImageSourcePropType } from "react-native";
import type { MediaOutletId } from "@/data/medias";
import type { AIHeadlineTone } from "@/types/game";

/* eslint-disable @typescript-eslint/no-require-imports */

// Note : on type le hero en `number` (le type effectif de `require()`
// d'un PNG via Metro) plutôt qu'en `ImageSourcePropType`, car
// `ScreenHeroHeader` attend explicitement `source: number`.
export const JOURNAL_HEADER: number = require("@/assets/images/journal/journal_header.png");

/**
 * Emblèmes painterly par média fictif. Le mapping est garanti
 * exhaustif sur `MediaOutletId` (Record obligatoire).
 */
export const MEDIA_LOGOS: Record<MediaOutletId, ImageSourcePropType> = {
  clairon: require("@/assets/images/journal/media_clairon.png"),
  marches: require("@/assets/images/journal/media_marches.png"),
  republique: require("@/assets/images/journal/media_republique.png"),
  reseau: require("@/assets/images/journal/media_reseau.png"),
};

/**
 * Vignettes painterly par tonalité. Couvre les 4 tonalités
 * principales du moteur déterministe. La tonalité "sarcastique"
 * (rare, exclusive aux unes IA) retombe sur "critique" via le
 * helper `getToneVignette`.
 */
const TONE_VIGNETTES_BASE = {
  favorable: require("@/assets/images/journal/tone_favorable.png"),
  critique: require("@/assets/images/journal/tone_critique.png"),
  alarmiste: require("@/assets/images/journal/tone_alarmiste.png"),
  neutre: require("@/assets/images/journal/tone_neutre.png"),
} as const;

/* eslint-enable @typescript-eslint/no-require-imports */

export function getToneVignette(tone: AIHeadlineTone): ImageSourcePropType {
  if (tone === "sarcastique") return TONE_VIGNETTES_BASE.critique;
  return TONE_VIGNETTES_BASE[tone];
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const OPPOSITION_EMBLEM: ImageSourcePropType = require("@/assets/images/journal/opposition_emblem.png");

/**
 * Helper : retrouve un logo painterly à partir du nom textuel d'une
 * une (`outlet` du type `AIHeadline`). Utilisé en fallback quand le
 * champ `mediaId` est absent (anciennes saves IA).
 *
 * Le matching est insensible à la casse / aux accents, et accepte
 * une sous-chaîne distinctive de chacun des 4 noms officiels.
 *
 * Retourne `null` si aucun match — l'appelant doit alors masquer le
 * visuel (pas de fallback générique pour ne pas mentir sur l'auteur).
 */
export function getMediaLogoFromOutletName(
  outlet: string,
): ImageSourcePropType | null {
  const norm = outlet
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (norm.includes("clairon")) return MEDIA_LOGOS.clairon;
  if (norm.includes("marche") || norm.includes("pouvoir"))
    return MEDIA_LOGOS.marches;
  if (norm.includes("republique") || norm.includes("canal"))
    return MEDIA_LOGOS.republique;
  if (norm.includes("reseau") || norm.includes("libre"))
    return MEDIA_LOGOS.reseau;
  return null;
}
