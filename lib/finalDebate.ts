import type { ElectionBlock, ElectionResult } from "@/logic/electionEngine";
import type {
  DecisionLogEntry,
  DecisionSentiment,
  FinalDebateChoice,
  FinalDebateDecision,
  FinalDebateStrategy,
  LegacyFinalDebateStrategy,
  GameState,
  Gauges,
} from "@/types/game";

/**
 * Module IA 5 — DETERMINISTIC final-debate logic.
 *
 * Pure functions only. NO AI here. The AI route only writes the
 * accusation lines; this module:
 *   1. Picks the 5 most impactful decisions from the player's log.
 *   2. Defines the 6 rhetorical strategy archetypes + per-pick modifier formulas.
 *   3. Applies the cumulative modifier on top of the baseline
 *      ElectionResult, returning a NEW result (the original is never
 *      mutated). `computeElection()` itself is intentionally untouched.
 *
 * LOT 7 (R7) refactor — the strategy palette went from the old
 * 5 (assume/deny/explain/divert/counter) to a richer 6
 * (calm/aggressive/ironic/factual/emotional/evasive). The legacy IDs
 * are still mapped via `coerceStrategy()` so existing player saves
 * keep working.
 */

// ----- Strategy metadata ------------------------------------------------

export const STRATEGIES: FinalDebateStrategy[] = [
  "calm",
  "aggressive",
  "ironic",
  "factual",
  "emotional",
  "evasive",
];

export interface StrategyMeta {
  label: string;
  short: string;
  /** Single short explainer shown next to the button. */
  hint: string;
}

export const STRATEGY_META: Record<FinalDebateStrategy, StrategyMeta> = {
  calm: {
    label: "Riposte calme",
    short: "Réponse calme et posée",
    hint:
      "Posture présidentielle. Apaise une crise sociale ou un scandale brûlant. Paraît distant si le pays va bien.",
  },
  aggressive: {
    label: "Riposte agressive",
    short: "Contre-attaquer frontalement",
    hint:
      "Posture offensive. Demande une autorité présidentielle solide. Suicide si vous êtes déjà disqualifié.",
  },
  ironic: {
    label: "Riposte ironique",
    short: "Trait d'esprit cinglant",
    hint:
      "Risqué : déstabilise une opposition affaiblie devant un public attentif. Cynique et glaçant face à un scandale frais.",
  },
  factual: {
    label: "Riposte factuelle",
    short: "Démontrer chiffres en main",
    hint:
      "Réponse mesurée. Efficace si la France vous écoute encore (cohésion, médias). Inutile si la popularité s'est effondrée.",
  },
  emotional: {
    label: "Riposte émotionnelle",
    short: "Assumer, sincère et touché",
    hint:
      "Sincérité assumée. Récompense les décisions populaires et les pays qui souffrent. Sanctionne les fiascos et scandales.",
  },
  evasive: {
    label: "Esquive",
    short: "Refuser le terrain proposé",
    hint:
      "Manœuvre. Marche contre une presse faible et une opposition fatiguée. Paraît coupable face à un scandale.",
  },
};

// ----- Legacy strategy migration ---------------------------------------

/**
 * Map the old 5-strategy IDs (used in saves from lots ≤ R7) to the
 * new 6-strategy palette so old player saves don't crash. Mapping
 * rationale:
 *   - assume   → emotional  (assumer = s'engager émotionnellement avec son choix)
 *   - counter  → aggressive (contre-attaquer = posture agressive directe)
 *   - explain  → factual    (expliquer = démonstration rationnelle)
 *   - divert   → evasive    (détourner = esquiver le sujet)
 *   - deny     → evasive    (nier ≈ esquiver la responsabilité)
 *
 * Unknown values default to "factual" — the safest middle option.
 */
const LEGACY_STRATEGY_MAP: Record<LegacyFinalDebateStrategy, FinalDebateStrategy> = {
  assume: "emotional",
  counter: "aggressive",
  explain: "factual",
  divert: "evasive",
  deny: "evasive",
};

const NEW_STRATEGY_SET = new Set<FinalDebateStrategy>(STRATEGIES);

/**
 * Coerce any string (legacy or new) into a valid FinalDebateStrategy.
 * Use at every read boundary where data comes from persisted state
 * (e.g. `state.finalDebateChoices` loaded from AsyncStorage).
 */
export function coerceStrategy(s: string | null | undefined): FinalDebateStrategy {
  if (!s) return "factual";
  if (NEW_STRATEGY_SET.has(s as FinalDebateStrategy)) {
    return s as FinalDebateStrategy;
  }
  if (s in LEGACY_STRATEGY_MAP) {
    return LEGACY_STRATEGY_MAP[s as LegacyFinalDebateStrategy];
  }
  return "factual";
}

/** Lookup helper that survives legacy IDs gracefully. */
export function getStrategyMeta(s: string | null | undefined): StrategyMeta {
  return STRATEGY_META[coerceStrategy(s)];
}

// ----- Decision selection ----------------------------------------------

const SCANDAL_TITLE_MARKER = "📰";

/**
 * Sum of |gauge deltas| for a decision, with debt sign-flipped because
 * `debt` is the only inverted gauge (high = bad). A choice that
 * increases popularity by +5 and debt by +5 has the SAME magnitude as
 * one that increases popularity by +5 and debt by -5, but the
 * SENTIMENT differs — magnitude only measures "how much did this move
 * the needle?".
 */
function computeImpactMagnitude(effects: Partial<Gauges>): number {
  let mag = 0;
  for (const k of Object.keys(effects) as (keyof Gauges)[]) {
    const v = effects[k];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    mag += Math.abs(v);
  }
  return mag;
}

function computeSentiment(
  effects: Partial<Gauges>,
  hadBrokenPromise: boolean,
  hadScandal: boolean,
): DecisionSentiment {
  let net = 0;
  for (const k of Object.keys(effects) as (keyof Gauges)[]) {
    const v = effects[k];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    // `debt` is the only inverted gauge (high = bad). +5 debt is BAD.
    net += k === "debt" ? -v : v;
  }
  if (hadBrokenPromise) net -= 8;
  if (hadScandal) net -= 12;
  if (net > 6) return "positive";
  if (net < -6) return "negative";
  return "neutral";
}

/**
 * Pick the N most impactful player decisions for the debate.
 *
 *  - Skips auto-revealed scandals (system-generated entries that
 *    aren't player choices).
 *  - Scores each candidate by impact magnitude + bonuses (broken
 *    promise +12, scandal revealed by the choice +14, delayed
 *    consequence +6) so memorable debacles bubble up over routine
 *    decisions.
 *  - Sorts most-impactful first, then by most-recent for ties.
 *  - Returns up to N entries (fewer if the player hasn't made N
 *    decisions yet — the debate UI handles short lists gracefully).
 */
export function selectFinalDebateDecisions(
  state: GameState,
  n = 5,
): FinalDebateDecision[] {
  const scored = state.log
    // Skip the auto-revealed-scandal log entries (titled "📰 Scandale
    // révélé") — these aren't player choices, they're system events.
    .filter((e) => !e.eventTitle.startsWith(SCANDAL_TITLE_MARKER))
    .map((e) => {
      const hadBrokenPromise =
        Array.isArray(e.promisesBroken) && e.promisesBroken.length > 0;
      const hadScandal = Boolean(e.scandalRevealed);
      const baseMag = computeImpactMagnitude(e.effects ?? {});
      const promiseBonus = hadBrokenPromise ? 12 : 0;
      const scandalBonus = hadScandal ? 14 : 0;
      const delayedBonus = e.isDelayedConsequence ? 6 : 0;
      const fulfilledBonus =
        Array.isArray(e.promisesFulfilled) && e.promisesFulfilled.length > 0
          ? 6
          : 0;
      const impactScore =
        baseMag + promiseBonus + scandalBonus + delayedBonus + fulfilledBonus;
      const sentiment = computeSentiment(
        e.effects ?? {},
        hadBrokenPromise,
        hadScandal,
      );
      return { entry: e, impactScore, sentiment, hadBrokenPromise, hadScandal };
    });

  // Sort by impactScore desc; tie-break by most-recent (turn desc, timestamp desc).
  scored.sort((a, b) => {
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore;
    if (b.entry.turn !== a.entry.turn) return b.entry.turn - a.entry.turn;
    return b.entry.timestamp - a.entry.timestamp;
  });

  return scored.slice(0, n).map<FinalDebateDecision>((s) => ({
    decisionId: s.entry.id,
    turn: s.entry.turn,
    eventTitle: s.entry.eventTitle,
    choiceLabel: s.entry.choiceLabel,
    consequence: s.entry.consequence,
    impactScore: Math.round(s.impactScore),
    sentiment: s.sentiment,
    hadBrokenPromise: s.hadBrokenPromise,
    hadScandal: s.hadScandal,
  }));
}

// ----- Strategy modifier formula ---------------------------------------

/**
 * Compute the vote-share delta (in PERCENTAGE POINTS) produced by
 * applying `strategy` to `decision`, given the current `state`.
 *
 * Formulas are intentionally simple and transparent so that, after
 * playing once, the player can intuit which strategy fits which kind
 * of decision. Range: typically -2.5 to +2 per pick. Cumulative range
 * across 5 picks: roughly ±10 points.
 *
 * R7 refactor: 6 strategies. Legacy strategy IDs in saves are
 * coerced via `coerceStrategy()` before reaching this function so the
 * switch is exhaustive on the new palette only.
 */
export function computeStrategyModifier(
  decision: FinalDebateDecision,
  strategy: FinalDebateStrategy,
  state: GameState,
): number {
  const g = state.gauges;
  const media = state.media;
  const opposition = state.opposition;
  const oppositionPower = state.hiddenGauges.oppositionPower;
  let delta = 0;

  switch (strategy) {
    case "calm": {
      // Presidential gravitas — apaise une nation en crise mais paraît
      // déconnecté quand tout va bien. Sûr, modéré, jamais catastrophique.
      delta = 0.4;
      if (g.cohesion <= 40) delta += 0.8; // pays divisé : besoin d'apaisement
      if (g.security <= 40) delta += 0.5; // peur ambiante : besoin d'assurance
      if (decision.hadScandal) delta += 0.3; // calme face au scandale = posture
      if (g.popularity >= 65) delta -= 0.4; // déjà adulé : paraît distant
      if (decision.sentiment === "positive") delta += 0.3;
      break;
    }
    case "aggressive": {
      // Aggressive pivot. Demands real authority. Suicidal when you
      // have nothing left to attack from.
      delta = 0;
      if (g.authority >= 65) delta += 1.5;
      else if (g.authority >= 50) delta += 0.5;
      if (g.authority <= 30) delta -= 2.0;
      if (decision.hadBrokenPromise) delta -= 0.6; // can't moralise from a glass house
      if (state.scandalsRevealed >= 2) delta -= 0.6;
      break;
    }
    case "ironic": {
      // Sharp wit — déstabilise une opposition affaiblie devant un
      // public attentif. Cynique et glacial face à un scandale frais.
      delta = 0;
      if (opposition <= 35 || oppositionPower <= 35) delta += 1.0;
      if (media >= 50 && media <= 70) delta += 0.5; // public attentif mais pas hostile
      if (g.popularity >= 55) delta += 0.5; // crédit pour se le permettre
      if (media >= 75) delta -= 1.0; // presse virulente : ironie mal reçue
      if (decision.hadScandal) delta -= 1.5; // ironique face à scandale = cynique
      if (decision.hadBrokenPromise) delta -= 0.5;
      if (g.popularity <= 30) delta -= 0.8; // perdu, plus le droit de plaisanter
      break;
    }
    case "factual": {
      // Safe default. Rewarded by an attentive country (cohesion +
      // media). Wasted on a country that has stopped listening.
      delta = 0.3;
      if (g.cohesion >= 50) delta += 0.5;
      if (media >= 55) delta += 0.5;
      if (g.popularity <= 30) delta -= 0.6;
      if (decision.hadScandal) delta -= 0.5; // explanations alone don't bury a scandal
      break;
    }
    case "emotional": {
      // Assumer pleinement avec sincérité — récompense les décisions
      // populaires et les pays qui souffrent. Sanctionne les fiascos.
      delta = 0.5;
      if (decision.sentiment === "positive") delta += 1.5;
      else if (decision.sentiment === "negative") delta -= 1.0;
      if (decision.hadScandal) delta -= 1.5;
      if (decision.hadBrokenPromise) delta -= 1.0;
      if (g.popularity >= 60) delta += 0.5;
      if (g.cohesion <= 35) delta += 0.5; // pays qui souffre : sincérité paie
      break;
    }
    case "evasive": {
      // Rhetorical sleight of hand. Lands against a tired press and
      // weak opposition; backfires when adversaries are alert.
      delta = 0;
      if (media <= 35) delta += 1.0;
      if (opposition <= 35 || oppositionPower <= 35) delta += 0.5;
      if (media >= 65) delta -= 1.5;
      if (opposition >= 65 || oppositionPower >= 65) delta -= 1.0;
      if (decision.hadScandal) delta -= 1.0; // diverting from a scandal looks guilty
      break;
    }
  }

  // Clamp to a sane per-pick range so no single combo can warp the
  // outcome by more than 2.5 points.
  return Math.max(-2.5, Math.min(2.0, Math.round(delta * 10) / 10));
}

// ----- Apply modifier to baseline result -------------------------------

/**
 * Apply the cumulative debate modifier to the baseline ElectionResult
 * computed by `computeElection()`. Returns a NEW result object (the
 * input is not mutated). Adds a "Performance au débat final" block to
 * the breakdown so the player can see exactly how the debate moved
 * the needle.
 *
 * If `choices` is empty or undefined, returns the baseline unchanged.
 */
export function applyFinalDebateModifier(
  baseline: ElectionResult,
  choices: FinalDebateChoice[] | null | undefined,
): ElectionResult {
  if (!choices || choices.length === 0) return baseline;

  const totalDelta = choices.reduce((sum, c) => sum + (c.modifier ?? 0), 0);
  const rounded = Math.round(totalDelta * 10) / 10;
  if (rounded === 0) {
    // Still surface the block so the player understands the debate
    // didn't shift anything net (counterbalanced picks).
    const block: ElectionBlock = {
      label: "Performance au débat final",
      delta: 0,
      detail: `${choices.length} riposte(s) — bilan neutre.`,
    };
    return { ...baseline, blocks: [...baseline.blocks, block] };
  }

  const newVoteShareRaw = baseline.voteShare + rounded;
  const newVoteShare = Math.max(5, Math.min(95, Math.round(newVoteShareRaw)));
  const newReElected = newVoteShare >= 50;

  const positive = rounded > 0;
  const block: ElectionBlock = {
    label: "Performance au débat final",
    delta: rounded,
    detail: `${choices.length} riposte(s) ${positive ? "convaincante(s)" : "ratée(s)"}.`,
  };

  // Recompute headline + summary to match the new score band so a
  // narrow win flipped to a narrow loss (or vice-versa) reads coherent.
  let headline = baseline.headline;
  let summary = baseline.summary;
  if (newVoteShare >= 65) {
    headline = "Réélection triomphale";
    summary =
      "Vous écrasez vos adversaires au second tour. Une vague historique vous porte pour cinq nouvelles années.";
  } else if (newVoteShare >= 55) {
    headline = "Réélection nette";
    summary =
      "Le pays vous accorde un second mandat clair. La République continue.";
  } else if (newVoteShare >= 50) {
    headline = "Réélection serrée";
    summary =
      "Une victoire à l'arraché. Vous gardez l'Élysée mais sans mandat fort.";
  } else if (newVoteShare >= 42) {
    headline = "Défaite honorable";
    summary =
      "Vous perdez de peu. Votre bilan a divisé. Vous quittez l'Élysée la tête haute, mais battu.";
  } else if (newVoteShare >= 30) {
    headline = "Défaite cinglante";
    summary =
      "L'opposition rafle la mise. La France tourne la page de votre mandat.";
  } else {
    headline = "Désaveu national";
    summary =
      "Le pays vous rejette massivement. Votre mandat entre dans l'Histoire comme un échec.";
  }

  return {
    voteShare: newVoteShare,
    reElected: newReElected,
    blocks: [...baseline.blocks, block],
    headline,
    summary,
  };
}
