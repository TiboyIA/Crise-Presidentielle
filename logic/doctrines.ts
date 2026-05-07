import type {
  DecisionLogEntry,
  Gauges,
  HiddenGauges,
  TechState,
} from "@/types/game";
import type { CrisisEvent, EventChoice } from "@/data/events";
import { DOCTRINES, type DoctrineId } from "@/data/techTree";
import { EVENT_ID_TO_VECTOR } from "@/data/hybridVectors";
import {
  CYBER_SHIELD_INITIAL_USES,
  getActiveDoctrines,
  hasDoctrine,
} from "@/logic/techTree";
import { clamp } from "@/logic/utils";

/**
 * Module 7.1 — Application des effets de doctrines pendant la
 * résolution d'une crise.
 *
 * Toutes les fonctions sont PURES : elles n'utilisent ni Date.now(),
 * ni Math.random(), ni effet de bord. Elles retournent toujours un
 * NOUVEL objet (pas de mutation in-place) pour respecter le pattern
 * "moteur pur ↔ application immuable" du reste du projet.
 *
 * Hiérarchie des modificateurs (appliqués en cascade) :
 *  1. Bouclier "Forteresse numérique" : si l'event résolu est de
 *     vecteur "cyber" et qu'il reste des charges, ANNULE tous les
 *     effets négatifs du choix et décrémente le compteur. C'est le
 *     plus fort — il s'applique en premier.
 *  2. "Autonomie stratégique" : ajoute +1 économie et +1 budget à
 *     chaque choix résolu.
 *  3. "République résiliente" : ajoute +1 popularité et +1 santé à
 *     chaque choix résolu.
 *
 * Le retour expose `interceptedByShield` pour permettre au caller
 * d'écrire une entrée de journal explicite quand le bouclier joue.
 */

export interface DoctrineModifierResult {
  /** Effets transformés à appliquer au lieu de `choice.effects`. */
  effects: Partial<Gauges>;
  /** Idem pour les hidden gauges (rejouent les mêmes règles cyber). */
  hiddenEffects: Partial<HiddenGauges>;
  /** True si le bouclier cyber a annulé l'attaque. */
  interceptedByShield: boolean;
  /** Nouvelles charges restantes (= ancien − 1 si interception). */
  shieldUsesRemainingAfter: number;
}

/**
 * Vrai si l'event résolu est une attaque cyber/hybride contre laquelle
 * le bouclier "Forteresse numérique" peut intervenir.
 *
 * Choix de design : on accepte les 4 vecteurs hybrides à composante
 * "informationnelle/numérique" (cyber, disinformation, document_leak,
 * infrastructure_attack). Pour le reste — pression diplomatique,
 * espionnage humain, sabotage industriel… — la doctrine ne s'applique
 * pas (ces situations ne sont pas du ressort d'un bouclier
 * informatique). L'event de catégorie "cyber" non-hybride est aussi
 * couvert via la category de l'event.
 */
export function isShieldableAttack(event: CrisisEvent): boolean {
  if (event.category === "cyber") return true;
  const vector = EVENT_ID_TO_VECTOR[event.id];
  if (!vector) return false;
  return (
    vector === "cyber" ||
    vector === "disinformation" ||
    vector === "document_leak" ||
    vector === "infrastructure_attack"
  );
}

/**
 * Annule tous les effets STRICTEMENT NÉGATIFS d'un choix (sur les
 * gauges principales et cachées), tout en CONSERVANT les effets
 * positifs (bonus volontaire d'un bon choix). Utilisé par le bouclier.
 */
function neutralizeNegativeEffects(
  effects: Partial<Gauges>,
): Partial<Gauges> {
  const out: Partial<Gauges> = {};
  for (const [k, v] of Object.entries(effects)) {
    if (typeof v === "number" && v > 0) {
      (out as Record<string, number>)[k] = v;
    }
  }
  return out;
}

function neutralizeNegativeHidden(
  effects: Partial<HiddenGauges>,
): Partial<HiddenGauges> {
  const out: Partial<HiddenGauges> = {};
  // Pour les hidden gauges, "négatif pour le joueur" = augmentation
  // de cyberRisk / scandalRisk / radicalization / corruption / etc.
  // Le bouclier annule donc les DELTAS POSITIFS sur ces métriques
  // de risque (qui sont mauvais pour le joueur), mais conserve les
  // baisses (qui sont bonnes).
  for (const [k, v] of Object.entries(effects)) {
    if (typeof v === "number" && v < 0) {
      (out as Record<string, number>)[k] = v;
    }
  }
  return out;
}

/**
 * Ajoute un delta fixe `bonus` à chaque gauge listée. Si la gauge
 * n'avait pas de delta initial, on en crée un. Doctrine = bonus
 * lisible et prévisible — on évite la mécanique "halve negatives"
 * qui fonctionne mal en présence de choix neutres ou positifs.
 */
function addToKeys(
  effects: Partial<Gauges>,
  keys: ReadonlyArray<keyof Gauges>,
  bonus: number,
): Partial<Gauges> {
  const out: Partial<Gauges> = { ...effects };
  for (const k of keys) {
    const prev = typeof out[k] === "number" ? (out[k] as number) : 0;
    out[k] = prev + bonus;
  }
  return out;
}

/**
 * Applique en cascade les modificateurs de doctrine au choix résolu.
 * NE MUTE PAS les arguments. Retourne effets transformés + flag
 * d'interception.
 */
export function applyDoctrineModifiersToChoice(
  choice: EventChoice,
  event: CrisisEvent,
  tech: TechState,
): DoctrineModifierResult {
  let effects: Partial<Gauges> = { ...choice.effects };
  let hiddenEffects: Partial<HiddenGauges> = { ...(choice.hiddenEffects ?? {}) };
  let interceptedByShield = false;
  let shieldUsesRemainingAfter = tech.cyberShieldUsesRemaining ?? 0;

  // 1) Bouclier "Forteresse numérique" — priorité haute.
  if (
    hasDoctrine(tech, "doctrine_forteresse") &&
    shieldUsesRemainingAfter > 0 &&
    isShieldableAttack(event)
  ) {
    effects = neutralizeNegativeEffects(effects);
    hiddenEffects = neutralizeNegativeHidden(hiddenEffects);
    interceptedByShield = true;
    shieldUsesRemainingAfter -= 1;
  }

  // 2) Autonomie stratégique — +1 économie / +1 budget par choix.
  if (hasDoctrine(tech, "doctrine_autonomie")) {
    effects = addToKeys(effects, ["economy", "budget"], 1);
  }

  // 3) République résiliente — +1 popularité / +1 santé par choix.
  if (hasDoctrine(tech, "doctrine_resilience")) {
    effects = addToKeys(effects, ["popularity", "health"], 1);
  }

  return {
    effects,
    hiddenEffects,
    interceptedByShield,
    shieldUsesRemainingAfter,
  };
}

/**
 * Bonus passifs appliqués À CHAQUE TOUR à l'état post-résolution :
 *  - République savante : +1 médias/tour
 *
 * (Autonomie est volontairement passée en bonus PAR-CHOIX dans
 * `applyDoctrineModifiersToChoice` — voir la cascade ci-dessus —
 * pour rester additive et lisible côté joueur.)
 *
 * Retourne les nouvelles valeurs (pas de mutation) + flag pour le
 * caller s'il veut journaliser.
 */
export function applyPerTurnDoctrineBonuses(
  tech: TechState,
  gauges: Gauges,
  media: number,
): { gauges: Gauges; media: number; appliedBonuses: DoctrineId[] } {
  const applied: DoctrineId[] = [];
  const nextGauges = gauges;
  let nextMedia = media;
  if (hasDoctrine(tech, "doctrine_savoir")) {
    nextMedia = clamp(nextMedia + 1);
    applied.push("doctrine_savoir");
  }
  return { gauges: nextGauges, media: nextMedia, appliedBonuses: applied };
}

/**
 * Bonus IMMÉDIAT (one-shot) appliqué AU MOMENT de l'activation d'une
 * doctrine. Aujourd'hui seule "République résiliente" en a un :
 * +2 popularité au moment du déblocage. Retourne les gauges
 * modifiées et les doctrines qui ont effectivement appliqué un bonus
 * (pour journalisation).
 */
export function applyDoctrineActivationOneShots(
  gauges: Gauges,
  activated: DoctrineId[],
): { gauges: Gauges; appliedOneShots: DoctrineId[] } {
  let next = gauges;
  const applied: DoctrineId[] = [];
  if (activated.includes("doctrine_resilience")) {
    next = { ...next, popularity: clamp(next.popularity + 2) };
    applied.push("doctrine_resilience");
  }
  return { gauges: next, appliedOneShots: applied };
}

/**
 * Construit les entrées de journal annonçant l'activation des
 * doctrines. Une entrée par doctrine, marquée comme "ministre-event"
 * libre (kind absent) — c'est volontairement une entrée informative
 * sans dégâts ni effets associés (les effets sont déjà appliqués
 * par les fonctions ci-dessus).
 */
export function buildDoctrineActivationLogEntries(
  activated: DoctrineId[],
  turn: number,
): DecisionLogEntry[] {
  return activated.map((id, idx) => {
    const def = DOCTRINES[id];
    return {
      id: `doctrine-${turn}-${id}-${idx}`,
      turn,
      eventTitle: `🏛 Doctrine activée — ${def.label}`,
      choiceLabel: def.headline,
      consequence: def.summary,
      effects: id === "doctrine_resilience" ? { popularity: 2 } : {},
      timestamp: Date.now(),
    };
  });
}

/**
 * Construit l'entrée de journal lorsque le bouclier "Forteresse
 * numérique" intercepte une attaque cyber/hybride.
 */
export function buildShieldInterceptionLogEntry(
  event: CrisisEvent,
  turn: number,
  usesLeft: number,
): DecisionLogEntry {
  const remainingTxt =
    usesLeft <= 0
      ? " Le bouclier est désormais épuisé."
      : ` ${usesLeft} interception${usesLeft > 1 ? "s" : ""} restante${
          usesLeft > 1 ? "s" : ""
        } sur le mandat.`;
  return {
    id: `shield-${turn}-${event.id}`,
    turn,
    eventTitle: "🛡 Bouclier numérique — interception",
    choiceLabel: "Forteresse numérique",
    consequence:
      `Vos systèmes de défense ont neutralisé "${event.title}" avant ` +
      `qu'elle ne fasse de dégâts.` +
      remainingTxt,
    effects: {},
    timestamp: Date.now(),
  };
}

/**
 * "République savante" — un choix synthétique injecté dans EventModal
 * pour donner systématiquement au joueur une option supplémentaire :
 * "Consulter les laboratoires". Effets génériques mais réels (bonus
 * de fond + petit coût budgétaire).
 *
 * ID préfixé par `__doctrine_` pour qu'aucun event du catalogue ne
 * puisse entrer en collision (le catalogue utilise "a","b","c"…).
 */
export const SAVOIR_SYNTHETIC_CHOICE_ID = "__doctrine_savoir_choice__";

export function buildSavoirSyntheticChoice(): EventChoice {
  return {
    id: SAVOIR_SYNTHETIC_CHOICE_ID,
    label: "🎓 Consulter les laboratoires nationaux",
    description:
      "Mobiliser le réseau scientifique national pour proposer une " +
      "réponse innovante et étayée à la crise.",
    consequence:
      "Vos laboratoires mobilisent leurs équipes : la réponse est " +
      "plus mesurée, plus innovante, et soutenue par la communauté " +
      "scientifique.",
    effects: {
      economy: 2,
      health: 1,
      popularity: 1,
      budget: -2,
    },
  };
}

export function isSavoirSyntheticChoice(choice: EventChoice): boolean {
  return choice.id === SAVOIR_SYNTHETIC_CHOICE_ID;
}

/** Re-export pratique pour les call sites externes. */
export { CYBER_SHIELD_INITIAL_USES, getActiveDoctrines, hasDoctrine };
