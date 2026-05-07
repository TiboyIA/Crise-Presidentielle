import { Minister } from "@/data/ministers";
import { GameOverResult, Gauges } from "@/types/game";

interface Ending {
  title: string;
  reason: string;
}

/**
 * Hard-coded ending payloads keyed by the gauge that collapsed.
 * Centralised so future endings can be added in one place.
 */
export const GAUGE_ENDINGS: Record<keyof Gauges, Ending> = {
  popularity: {
    title: "Destitution",
    reason:
      "Votre cote de popularité s'est effondrée. Le Parlement vote votre destitution. Vous quittez l'Élysée sous les huées.",
  },
  economy: {
    title: "Effondrement économique",
    reason:
      "L'économie s'effondre. Le FMI prend les commandes. Votre mandat se termine dans la honte.",
  },
  budget: {
    title: "Faillite de l'État",
    reason:
      "Les caisses sont vides. Plus de salaires, plus de pensions. L'État ne peut plus fonctionner.",
  },
  debt: {
    title: "Sous tutelle internationale",
    reason:
      "La dette explose, les marchés ferment leurs portes. Le pays est placé sous tutelle des créanciers.",
  },
  security: {
    title: "Chaos national",
    reason:
      "L'ordre public n'existe plus. L'armée prend le contrôle. Coup d'État.",
  },
  health: {
    title: "Effondrement sanitaire",
    reason:
      "Hôpitaux saturés, épidémies non maîtrisées. Le pays sombre dans la crise sanitaire.",
  },
  ecology: {
    title: "Catastrophe écologique",
    reason:
      "Les conséquences environnementales rattrapent le pays. Vous êtes désigné comme responsable.",
  },
  cohesion: {
    title: "Fracture de la nation",
    reason:
      "Le pays se déchire. Émeutes, sécessions, guerre civile larvée. Plus rien ne tient debout.",
  },
  diplomacy: {
    title: "Isolement total",
    reason:
      "La France est isolée sur la scène internationale. Sanctions et embargos en cascade.",
  },
  regionalStability: {
    title: "Régions en sécession",
    reason:
      "Plusieurs régions refusent désormais l'autorité de Paris. L'unité nationale est rompue.",
  },
  authority: {
    title: "Pouvoir vidé",
    reason:
      "Votre autorité est nulle. Vos ministres démissionnent en cascade. Vous démissionnez.",
  },
};

export const CABINET_COLLAPSE_ENDING: Ending = {
  title: "Effondrement gouvernemental",
  reason:
    "Vos ministres démissionnent les uns après les autres. Plus personne ne veut servir sous vos ordres.",
};

export const ELECTION_ENDING: Ending = {
  title: "Élection présidentielle",
  reason:
    "Cinq ans après votre élection, le pays vous juge dans les urnes.",
};

/**
 * Order in which non-inverted gauges are checked for collapse.
 * Inverted gauges (where high = bad) are checked separately below.
 */
const GAUGE_CHECK_ORDER: (keyof Gauges)[] = [
  "popularity",
  "economy",
  "budget",
  "security",
  "health",
  "authority",
  "cohesion",
  "diplomacy",
  "ecology",
  "regionalStability",
];

const GAUGE_DEATH_THRESHOLD = 5;
const DEBT_DEATH_THRESHOLD = 95;
const CABINET_LOYALTY_DEATH_THRESHOLD = 12;

/**
 * Determine whether the game should end this turn, and why.
 *
 * End-of-mandate election always takes precedence: a player who survived
 * the full term deserves the verdict of the ballot box rather than a
 * gauge-collapse death screen.
 */
export function checkGameOver(
  gauges: Gauges,
  turn: number,
  maxTurns: number,
  ministers: Minister[],
): GameOverResult {
  if (turn > maxTurns) {
    return {
      isOver: true,
      victory: false,
      title: ELECTION_ENDING.title,
      reason: ELECTION_ENDING.reason,
      triggeredElection: true,
    };
  }

  for (const key of GAUGE_CHECK_ORDER) {
    if (gauges[key] <= GAUGE_DEATH_THRESHOLD) {
      const ending = GAUGE_ENDINGS[key];
      return {
        isOver: true,
        victory: false,
        title: ending.title,
        reason: ending.reason,
      };
    }
  }

  // Inverted gauge: debt is fatal when too HIGH, not too low.
  if (gauges.debt >= DEBT_DEATH_THRESHOLD) {
    const ending = GAUGE_ENDINGS.debt;
    return {
      isOver: true,
      victory: false,
      title: ending.title,
      reason: ending.reason,
    };
  }

  const avgLoyalty =
    ministers.reduce((sum, m) => sum + m.loyalty, 0) /
    Math.max(1, ministers.length);
  if (avgLoyalty <= CABINET_LOYALTY_DEATH_THRESHOLD) {
    return {
      isOver: true,
      victory: false,
      title: CABINET_COLLAPSE_ENDING.title,
      reason: CABINET_COLLAPSE_ENDING.reason,
    };
  }

  return { isOver: false };
}
