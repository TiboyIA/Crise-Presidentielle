import type { Gauges, HiddenGauges } from "@/types/game";

/**
 * Module 6 — Contre-mesures permanentes contre la guerre hybride.
 *
 * Ces actions sont disponibles depuis la page « Front diplomatique »
 * (route `/front`). Chaque utilisation a un effet immédiat et
 * déterministe sur :
 *   - la jauge `aggression` de l'acteur hostile
 *   - les jauges visibles (Gauges)
 *   - les jauges cachées (HiddenGauges) pertinentes (cyberRisk, etc.)
 *
 * Contraintes de conception :
 *   - Pas de cooldown explicite (mais coût en jauges → cooldown
 *     naturel : on ne peut pas spammer sans s'effondrer).
 *   - Effets visibles ET symboliques : chaque contre-mesure raconte
 *     un choix politique cohérent.
 *   - 4 contre-mesures, une par axe stratégique :
 *       cyber / diplomatie douce / sanctions / posture militaire.
 */

export type CountermeasureId =
  | "cm_cyber_invest"
  | "cm_de_escalation"
  | "cm_sanctions"
  | "cm_military_posture";

export interface CountermeasureDef {
  id: CountermeasureId;
  label: string;
  emoji: string;
  description: string;
  /** Texte court montré sous le bouton ("Coût : …"). */
  costSummary: string;
  /** Delta sur l'agressivité de l'acteur hostile (typiquement < 0). */
  aggressionDelta: number;
  /** Effets sur les jauges visibles. */
  effects: Partial<Gauges>;
  /** Effets sur les jauges cachées. */
  hiddenEffects: Partial<HiddenGauges>;
}

export const HYBRID_COUNTERMEASURES: CountermeasureDef[] = [
  {
    id: "cm_cyber_invest",
    label: "Investir en cybersécurité",
    emoji: "🛡",
    description:
      "Recrutement de l'ANSSI, durcissement des systèmes critiques, " +
      "audits massifs des opérateurs d'importance vitale.",
    costSummary: "Budget −5 · Cyber-risque −20 · Agressivité −5",
    aggressionDelta: -5,
    effects: { budget: -5, security: +3 },
    hiddenEffects: { cyberRisk: -20 },
  },
  {
    id: "cm_de_escalation",
    label: "Diplomatie de désescalade",
    emoji: "🕊",
    description:
      "Canal diplomatique discret, geste d'apaisement et offre " +
      "de dialogue. Calme le jeu mais peut être lu comme une " +
      "faiblesse à l'intérieur.",
    costSummary: "Autorité −4 · Diplomatie +5 · Agressivité −12",
    aggressionDelta: -12,
    effects: { authority: -4, diplomacy: +5 },
    hiddenEffects: {},
  },
  {
    id: "cm_sanctions",
    label: "Sanctions économiques ciblées",
    emoji: "⚖",
    description:
      "Gel d'avoirs, restrictions commerciales, coordination avec " +
      "les alliés. Affirme votre fermeté mais durcit l'adversaire.",
    costSummary: "Économie −4 · Diplomatie −2 · Agressivité +6",
    aggressionDelta: +6,
    effects: { economy: -4, diplomacy: -2, authority: +3 },
    hiddenEffects: { foreignDependence: -5 },
  },
  {
    id: "cm_military_posture",
    label: "Renforcer la posture militaire",
    emoji: "🎖",
    description:
      "Déploiement préventif, exercices de dissuasion, hausse du " +
      "budget des armées. Effet de long terme : moins d'agressions " +
      "à court terme, mais risque d'escalade.",
    costSummary: "Budget −7 · Sécurité +5 · Agressivité −8",
    aggressionDelta: -8,
    effects: { budget: -7, security: +5, debt: +3 },
    hiddenEffects: {},
  },
];

export function getCountermeasure(
  id: CountermeasureId,
): CountermeasureDef | null {
  return HYBRID_COUNTERMEASURES.find((c) => c.id === id) ?? null;
}
