import type { ImageSourcePropType } from "react-native";
import type { EventChoice } from "@/data/events";

/**
 * LOT 14 — "Ton" inféré d'un choix de crise. Sert à donner une
 * personnalité visuelle immédiate à chaque option dans `EventModal`,
 * via une micro-illustration painterly 28-32px à gauche du label.
 *
 * Heuristique 2 passes :
 *  1. mots-clés FR sur (label + description) — la signature lexicale
 *     domine quand elle est présente (ex. "négocier" → diplomatic
 *     même si les effets penchent ailleurs).
 *  2. fallback sur la signature des effets numériques (security >=,
 *     popularity >=, etc.).
 *
 * Aucune annotation manuelle requise sur les ~hundreds d'événements
 * existants : l'inférence est entièrement automatique et stable.
 */
export type ChoiceTone =
  | "firm"
  | "diplomatic"
  | "popular"
  | "technocratic"
  | "cautious";

export const TONE_IMAGES: Record<ChoiceTone, ImageSourcePropType> = {
  firm: require("@/assets/images/events/tone_firm.png"),
  diplomatic: require("@/assets/images/events/tone_diplomatic.png"),
  popular: require("@/assets/images/events/tone_popular.png"),
  technocratic: require("@/assets/images/events/tone_technocratic.png"),
  cautious: require("@/assets/images/events/tone_cautious.png"),
};

export const TONE_LABEL: Record<ChoiceTone, string> = {
  firm: "FERME",
  diplomatic: "DIPLOMATIQUE",
  popular: "POPULAIRE",
  technocratic: "TECHNOCRATIQUE",
  cautious: "PRUDENT",
};

// Mots-clés FR pour l'inférence lexicale (passe 1)
const FIRM_WORDS =
  /(réprim|interdi|expuls|réquisitionn|décret|évacu|sanctionn|état d'urgence|dissoud|arrêt|forces de l'ordre|mobiliser l'armée|loi martiale|bloqu|ferm[eé]|durc|sévér|fer-de-lance|coercit)/i;
const DIPLO_WORDS =
  /(négoci|dialogu|consult|table ronde|médiation|écouter|concert|sommet|rencontr|conciliat|discut|apais|tendre la main|ouvrir le dialogue)/i;
const POP_WORDS =
  /(annonc|promett|distribu|prime exception|chèque|baisse d'imp|gratuit|cadeau|aide d'urgence|allocation|geste fort|grand discours|relance massiv)/i;
const TECH_WORDS =
  /(commission|rapport|étude|expert|audit|réforme structurel|plan technique|optimis|réguler|législ|mission|cadre|encadr|modernis|protocole)/i;
const PASSIVE_WORDS =
  /(ignor|report|temporis|attendre|laisser|ne rien|aucune action|silence|patient|observ|garder le silence|laisser pourrir|ne pas réagir)/i;

/**
 * Infère le ton d'un choix de crise depuis son texte et ses effets.
 * Stable, déterministe, sans état.
 */
export function inferChoiceTone(c: EventChoice): ChoiceTone {
  const txt = `${c.label} ${c.description}`;

  // Passe 1 — signature lexicale dominante
  if (PASSIVE_WORDS.test(txt)) return "cautious";
  if (FIRM_WORDS.test(txt)) return "firm";
  if (DIPLO_WORDS.test(txt)) return "diplomatic";
  if (POP_WORDS.test(txt)) return "popular";
  if (TECH_WORDS.test(txt)) return "technocratic";

  // Passe 2 — fallback via la signature des effets sur jauges
  const ef = c.effects ?? {};
  const sec = ef.security ?? 0;
  const pop = ef.popularity ?? 0;
  const eco = ef.economy ?? 0;
  const aut = ef.authority ?? 0;
  const coh = ef.cohesion ?? 0;

  if (sec >= 5 || (sec >= 3 && pop < 0)) return "firm";
  if (pop >= 6 && eco <= 0) return "popular";
  if (eco >= 4 || aut >= 5) return "technocratic";
  if (coh >= 3) return "diplomatic";
  if (Math.abs(pop) <= 2 && Math.abs(sec) <= 2 && Math.abs(eco) <= 2) {
    return "cautious";
  }
  // Dernier recours
  return "diplomatic";
}
