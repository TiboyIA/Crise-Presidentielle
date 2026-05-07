import type {
  DecisionLogEntry,
  Gauges,
  GameState,
  OppositionReaction,
  OppositionReactionAxis,
  OppositionStance,
} from "@/types/game";

/**
 * Chantier 1 — Opposition réactive entre tours.
 *
 * Pure deterministic function. Given the player's last decision and a
 * minimal slice of game state (current opposition score + hidden
 * opposition power), produce an opposition stance + a short FR line
 * that the dashboard renders under the latest log entry.
 *
 * NEVER references real political parties, real outlets or real public
 * figures (Apple App Store compliance + defamation risk).
 */

interface ReactionInput {
  effects: Partial<Gauges>;
  promisesFulfilledCount: number;
  promisesBrokenCount: number;
  scandalRevealed: boolean;
  isDelayedConsequence: boolean;
  oppositionPower: number;
  currentOpposition: number;
}

function buildInput(
  state: Pick<GameState, "opposition" | "hiddenGauges">,
  entry: Pick<
    DecisionLogEntry,
    | "effects"
    | "promisesFulfilled"
    | "promisesBroken"
    | "scandalRevealed"
    | "isDelayedConsequence"
  >,
): ReactionInput {
  return {
    effects: entry.effects,
    promisesFulfilledCount: entry.promisesFulfilled?.length ?? 0,
    promisesBrokenCount: entry.promisesBroken?.length ?? 0,
    scandalRevealed: !!entry.scandalRevealed,
    isDelayedConsequence: !!entry.isDelayedConsequence,
    oppositionPower: state.hiddenGauges.oppositionPower ?? 50,
    currentOpposition: state.opposition,
  };
}

function pickAxis(input: ReactionInput): OppositionReactionAxis {
  if (input.scandalRevealed) return "scandal";
  if (input.promisesBrokenCount >= 1) return "broken_promise";
  const e = input.effects;
  const damaging: Array<[OppositionReactionAxis, number]> = [
    ["popularity", e.popularity ?? 0],
    ["cohesion", e.cohesion ?? 0],
    ["security", e.security ?? 0],
    ["budget", e.budget ?? 0],
    ["authority", e.authority ?? 0],
    ["ecology", e.ecology ?? 0],
    ["diplomacy", e.diplomacy ?? 0],
  ];
  let worst: [OppositionReactionAxis, number] | null = null;
  for (const d of damaging) {
    if (d[1] < -3 && (!worst || d[1] < worst[1])) worst = d;
  }
  if (worst) return worst[0];
  if (input.promisesFulfilledCount >= 1) return "fulfilled";
  return "neutral";
}

function scoreReaction(input: ReactionInput): number {
  let score = 0;
  if (input.scandalRevealed) score -= 4;
  score -= input.promisesBrokenCount * 2;
  score += input.promisesFulfilledCount;
  const e = input.effects;
  if ((e.popularity ?? 0) <= -8) score -= 2;
  if ((e.popularity ?? 0) >= 6) score += 1;
  if ((e.cohesion ?? 0) <= -6) score -= 2;
  if ((e.security ?? 0) <= -6) score -= 2;
  if ((e.budget ?? 0) <= -8) score -= 1;
  if ((e.debt ?? 0) >= 6) score -= 1;
  if ((e.authority ?? 0) <= -6) score -= 1;
  if ((e.ecology ?? 0) <= -8) score -= 1;
  if ((e.diplomacy ?? 0) <= -6) score -= 1;
  // Climate: aggressive opposition is harder to please.
  if (input.currentOpposition > 70) score -= 1;
  else if (input.currentOpposition < 30) score += 1;
  if (input.oppositionPower > 60) score -= 1;
  // Delayed consequences: opposition tends to pile on.
  if (input.isDelayedConsequence) score -= 1;
  return score;
}

function stanceFromScore(score: number): OppositionStance {
  if (score <= -5) return "exploit";
  if (score <= -3) return "denounce";
  if (score <= -1) return "criticize";
  if (score <= 1) return "tolerate";
  return "approve";
}

const STANCE_EFFECTS: Record<
  OppositionStance,
  { oppositionDelta: number; mediaDelta: number }
> = {
  approve: { oppositionDelta: -2, mediaDelta: 1 },
  tolerate: { oppositionDelta: 0, mediaDelta: 0 },
  criticize: { oppositionDelta: 2, mediaDelta: 0 },
  denounce: { oppositionDelta: 4, mediaDelta: -1 },
  exploit: { oppositionDelta: 6, mediaDelta: -3 },
};

type LineMap = Partial<Record<OppositionReactionAxis, string>> & {
  neutral: string;
};

const LINES: Record<OppositionStance, LineMap> = {
  approve: {
    neutral: "L'opposition reste silencieuse. Pour une fois, rien à reprocher.",
    fulfilled:
      "L'opposition concède du bout des lèvres : « Une promesse tenue, enfin. »",
    popularity:
      "L'opposition reconnaît un coup politique habile, sans l'applaudir.",
  },
  tolerate: {
    neutral: "L'opposition observe sans réagir. Elle attend la prochaine erreur.",
    fulfilled:
      "L'opposition relativise : « Une mesure cosmétique, rien de structurel. »",
    popularity:
      "L'opposition minimise : « Un effet d'annonce qui ne tiendra pas. »",
    cohesion:
      "L'opposition tempère : « Belle déclaration. Reste à voir les actes. »",
    security:
      "L'opposition prend acte sans concéder : « C'était la moindre des choses. »",
    budget:
      "L'opposition note l'effort budgétaire mais en doute la pérennité.",
    authority:
      "L'opposition observe : « Le pouvoir parle. Le pays attend. »",
  },
  criticize: {
    neutral: "L'opposition critique : « Encore une décision sans cap clair. »",
    popularity:
      "L'opposition déplore : « Le président perd pied dans l'opinion. »",
    cohesion:
      "L'opposition s'inquiète : « Cette mesure fracture davantage le pays. »",
    security:
      "L'opposition alerte : « La sécurité des Français recule, c'est inacceptable. »",
    budget:
      "L'opposition tacle : « Encore une dérive budgétaire que paieront nos enfants. »",
    authority:
      "L'opposition raille : « L'État vacille, le président hésite. »",
    ecology:
      "L'opposition dénonce : « Encore un recul écologique inadmissible. »",
    diplomacy:
      "L'opposition critique : « La voix de la France s'efface à l'international. »",
    fulfilled:
      "L'opposition relativise : « Belle promesse tenue… au prix de toutes les autres. »",
    broken_promise:
      "L'opposition rappelle : « Une promesse de plus, jetée aux orties. »",
  },
  denounce: {
    neutral:
      "L'opposition dénonce avec force une décision « contraire à l'intérêt national ».",
    popularity:
      "L'opposition assène : « Le président a perdu le pays. Qu'il en tire les conséquences. »",
    cohesion:
      "L'opposition gronde : « Cette politique brise la cohésion républicaine. »",
    security:
      "L'opposition tonne : « L'insécurité explose. Le pouvoir est défaillant. »",
    budget:
      "L'opposition fustige : « Une catastrophe budgétaire orchestrée. »",
    authority:
      "L'opposition assène : « L'autorité de l'État s'effondre sous nos yeux. »",
    ecology:
      "L'opposition s'indigne : « Crime contre les générations futures. »",
    diplomacy:
      "L'opposition dénonce : « La France humiliée sur la scène mondiale. »",
    broken_promise:
      "L'opposition martèle : « Trahison ! Le programme du président est en ruine. »",
  },
  exploit: {
    neutral:
      "L'opposition s'engouffre dans la brèche et exige des comptes immédiats.",
    scandal:
      "L'opposition exulte : « Le scandale est à la hauteur du système. Démission ! »",
    broken_promise:
      "L'opposition exploite la rupture : « Mensonges en série. Le pays mérite mieux. »",
    popularity:
      "L'opposition appelle au sursaut : « Un président rejeté ne peut plus gouverner. »",
    cohesion:
      "L'opposition exploite la fracture : « La République est à feu. Le président regarde brûler. »",
    security:
      "L'opposition exige : « Démission immédiate du ministre de l'Intérieur. »",
    budget:
      "L'opposition saisit la motion de censure : « Banqueroute morale et financière. »",
    authority:
      "L'opposition exige le retour aux urnes : « Plus personne ne respecte ce pouvoir. »",
  },
};

export function computeOppositionReaction(
  state: Pick<GameState, "opposition" | "hiddenGauges">,
  entry: Pick<
    DecisionLogEntry,
    | "effects"
    | "promisesFulfilled"
    | "promisesBroken"
    | "scandalRevealed"
    | "isDelayedConsequence"
  >,
): OppositionReaction {
  const input = buildInput(state, entry);
  const score = scoreReaction(input);
  const stance = stanceFromScore(score);
  const axis = pickAxis(input);
  const map = LINES[stance];
  const line = map[axis] ?? map.neutral;
  const { oppositionDelta, mediaDelta } = STANCE_EFFECTS[stance];
  return { stance, axis, line, oppositionDelta, mediaDelta };
}

export const OPPOSITION_STANCE_LABELS: Record<OppositionStance, string> = {
  approve: "Approuve",
  tolerate: "Tolère",
  criticize: "Critique",
  denounce: "Dénonce",
  exploit: "Exploite",
};
