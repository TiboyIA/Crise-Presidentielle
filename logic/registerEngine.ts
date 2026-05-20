/**
 * registerEngine.ts — Registres de langage stratégiques
 *
 * Chaque choix présidentiel peut être associé à un registre de communication.
 * Le registre produit des effets additifs selon la nature de la crise :
 * l'empathique rassure en crise sociale, le martial stabilise en crise militaire,
 * etc. En dehors de leur contexte naturel, certains registres génèrent des
 * frictions légères mais visibles.
 *
 * Effets définis par la spec :
 *   crise sociale     + empathique   → popularité +, cohésion +, fatigue −
 *   crise militaire   + martial      → sécurité +, cohésion + (réduit cohésion hors contexte)
 *   crise économique  + technocratique → économie +, médiaMood + (fatigue le peuple hors contexte)
 *   crise diplomatique + diplomatique → médiaMood +, eliteTrust +
 *   crise cyber       + scientifique  → institutionalStability + (conditionnel : cyberDéfense forte)
 */

import type { CommunicationRegister, HiddenPolitics, NationalIndicators, NewsType } from "@/types/strategy";

export type { CommunicationRegister } from "@/types/strategy";

// ── Labels et couleurs ────────────────────────────────────────────────────────

export const REGISTER_LABELS: Record<CommunicationRegister, string> = {
  populaire:      "Populaire",
  institutionnel: "Institutionnel",
  technocratique: "Technocratique",
  martial:        "Martial",
  empathique:     "Empathique",
  diplomatique:   "Diplomatique",
  scientifique:   "Scientifique",
  offensif:       "Offensif",
};

export const REGISTER_COLORS: Record<CommunicationRegister, string> = {
  populaire:      "#e8a93a",  // or/ambre
  institutionnel: "#4a9fff",  // bleu
  technocratique: "#3fbe7a",  // vert
  martial:        "#e54848",  // rouge
  empathique:     "#a78bfa",  // violet
  diplomatique:   "#52c97a",  // teal
  scientifique:   "#38bdf8",  // bleu clair
  offensif:       "#FF8040",  // orange
};

// ── Types de résultat ─────────────────────────────────────────────────────────

export interface RegisterEffectsResult {
  indicatorEffects:    Partial<NationalIndicators>;
  hiddenPoliticsEffects: Partial<HiddenPolitics>;
}

// ── Seuil cyberDéfense "forte" ────────────────────────────────────────────────
// cyberDefense est une ressource brute (démarre à 40, peut monter > 100)
const CYBER_STRONG_THRESHOLD = 100;

// ── Calcul des effets ─────────────────────────────────────────────────────────

/**
 * Retourne les effets additifs du registre selon le type de crise.
 * @param cyberDefense  Niveau de ressource cyberdéfense (optionnel, utilisé pour scientifique).
 */
export function computeRegisterEffects(
  register:     CommunicationRegister,
  newsType:     NewsType,
  cyberDefense?: number,
): RegisterEffectsResult {
  const ind:    Partial<NationalIndicators> = {};
  const hidden: Partial<HiddenPolitics>    = {};

  switch (register) {
    case "empathique":
      if (newsType === "social") {
        ind.popularity = 4; ind.cohesion = 3; hidden.popularFatigue = -3;
      } else {
        ind.cohesion = 1;
      }
      break;

    case "martial":
      if (newsType === "guerre_hybride") {
        ind.security = 5; ind.cohesion = 2;
      } else {
        ind.cohesion = -2;  // rassure la sécurité mais peut fracturer en dehors du contexte
      }
      break;

    case "technocratique":
      if (newsType === "economie") {
        ind.economy = 3; hidden.mediaMood = 4;
      } else {
        hidden.popularFatigue = 2;  // "fatigue le peuple" hors crise économique
      }
      break;

    case "diplomatique":
      if (newsType === "diplomatie") {
        hidden.mediaMood = 3; hidden.eliteTrust = 2;
      } else {
        ind.cohesion = 1;
      }
      break;

    case "scientifique":
      if (newsType === "cyber") {
        const strong = (cyberDefense ?? 0) >= CYBER_STRONG_THRESHOLD;
        if (strong) {
          hidden.institutionalStability = 5; hidden.mediaMood = 2;
        } else {
          hidden.mediaMood = -2;  // la crédibilité scientifique s'effondre si les défenses sont faibles
        }
      } else {
        hidden.mediaMood = 1;
      }
      break;

    case "populaire":
      // Toujours un léger gain de popularité ; plus fort en crise sociale
      ind.popularity = newsType === "social" ? 4 : 2;
      break;

    case "institutionnel":
      // Neutre-positif en toutes circonstances — renforce les élites
      hidden.eliteTrust = 2;
      break;

    case "offensif":
      // Diviseur systématique : bonne posture pour attaquer, mauvaise pour rassembler
      ind.cohesion = -2; hidden.eliteTrust = -2;
      break;
  }

  return { indicatorEffects: ind, hiddenPoliticsEffects: hidden };
}
