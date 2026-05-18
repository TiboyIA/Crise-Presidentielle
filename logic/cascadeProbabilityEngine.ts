import type {
  DelayedConsequence,
  HiddenPolitics,
  NationalIndicators,
  NewsChoice,
  NewsEvent,
  StrategyGameState,
} from "@/types/strategy";

// ── Modèle d'une règle de cascade ────────────────────────────────────────────

interface CascadeRule {
  id: string;
  /**
   * Détermine si cette règle doit être évaluée pour cet événement/choix.
   * Filtre de pertinence — évite des calculs inutiles et des cascades hors-contexte.
   */
  shouldConsider: (
    state: StrategyGameState,
    event: NewsEvent,
    choice: NewsChoice | undefined,
  ) => boolean;
  /**
   * Calcule la probabilité [0-1] de déclenchement.
   * Toujours bornée entre MIN_PROB et MAX_PROB après application.
   */
  rawProbability: (state: StrategyGameState) => number;
  /**
   * Nombre d'actions joueur avant déclenchement.
   * Délai fixe pour la prévisibilité — pas de randomness sur le timing.
   */
  delayActions: number;
  /** Type de conséquence différée à créer. */
  effectType: DelayedConsequence["effectType"];
  /** ID de l'événement si effectType === "news_event". */
  relatedNewsEventId?: string;
  /** Payload si effectType === "indicator_effect" | "hidden_politics". */
  payload?: Partial<NationalIndicators> | Partial<HiddenPolitics>;
}

// ── Bornes de probabilité ─────────────────────────────────────────────────────

const MIN_PROB = 0.05; // jamais < 5 % : même une situation idéale garde un risque résiduel
const MAX_PROB = 0.65; // jamais > 65 % : la cascade n'est jamais une certitude

function clampProb(p: number): number {
  return Math.max(MIN_PROB, Math.min(MAX_PROB, p));
}

// ── Table des règles de cascade ───────────────────────────────────────────────
//
// Chaque règle modélise un enchaînement logique entre types de crises.
// La probabilité dépend exclusivement de l'état courant — jamais du hasard pur.
// Les commentaires expliquent la relation causale et le calcul.

const CASCADE_RULES: CascadeRule[] = [

  // ── 1. Cyberattaque → Blackout national ─────────────────────────────────────
  // Une attaque cyber sur les infrastructures critiques fragilise le réseau électrique.
  // Plus la cyberdéfense est faible, plus l'infrastructure est vulnérable à l'effet de bord.
  {
    id: "cyber_to_blackout",
    shouldConsider: (state, event, choice) =>
      event.type === "cyber" &&
      state.resources.cyberDefense < 60 &&
      ((choice?.effects.cyberDefense ?? 0) < 0 || (choice?.effects.military ?? 0) < 0),
    rawProbability: (state) => {
      const gap = Math.max(0, 60 - state.resources.cyberDefense);
      // 0.05 base + jusqu'à 0.40 selon l'écart par rapport au seuil de 60
      return 0.05 + (gap / 60) * 0.40;
    },
    delayActions: 4,
    effectType: "news_event",
    relatedNewsEventId: "blackout_national",
  },

  // ── 2. Cyber / Économie + Cohésion fragile → Crise sociale ──────────────────
  // Les chocs économiques ou cyber dans une société peu soudée provoquent des mouvements sociaux.
  // La cohésion est le tampon principal : plus elle est basse, plus la fissure est probable.
  {
    id: "shock_to_social_unrest",
    shouldConsider: (state, event) =>
      (event.type === "cyber" || event.type === "economie") &&
      state.nationalIndicators.cohesion < 50,
    rawProbability: (state) => {
      const gap = Math.max(0, 50 - state.nationalIndicators.cohesion);
      // 0.05 base + jusqu'à 0.30 selon l'écart par rapport au seuil de 50
      return 0.05 + (gap / 50) * 0.30;
    },
    delayActions: 5,
    effectType: "news_event",
    relatedNewsEventId: "social_unrest",
  },

  // ── 3. Dette élevée + Choc économique → Pression des marchés ────────────────
  // Un choc budgétaire quand la dette est déjà haute alerte les marchés et créanciers.
  // La probabilité croît de façon non-linéaire : la dette au-delà de 350 signale une crise imminente.
  {
    id: "debt_to_market_pressure",
    shouldConsider: (state, event, choice) =>
      state.nationalDebt > 200 &&
      (event.type === "economie" || (choice?.indicatorEffects?.publicBudget ?? 0) < -4),
    rawProbability: (state) => {
      const excess = Math.max(0, state.nationalDebt - 200);
      // 0.05 base + jusqu'à 0.45 pour une dette à 500 (plafond)
      return 0.05 + (excess / 300) * 0.45;
    },
    delayActions: 8,
    effectType: "news_event",
    relatedNewsEventId: "debt_escalation",
  },

  // ── 4. Scandale élevé → Fuite médiatique ────────────────────────────────────
  // Au-dessus d'un certain niveau de scandalRisk, une crise déclenche des révélations.
  // Les médias saisissent le moment de vulnérabilité politique pour publier ce qu'ils ont.
  {
    id: "scandal_to_media_leak",
    shouldConsider: (state, event) =>
      state.hiddenPolitics.scandalRisk > 55 &&
      (event.type === "national" || event.type === "social" ||
       (event.type === "cyber" && state.hiddenPolitics.mediaMood < 45)),
    rawProbability: (state) => {
      const excess = Math.max(0, state.hiddenPolitics.scandalRisk - 55);
      // 0.05 base + jusqu'à 0.35 pour scandalRisk à 100
      return 0.05 + (excess / 45) * 0.35;
    },
    delayActions: 3,
    effectType: "news_event",
    relatedNewsEventId: "media_scandal",
  },

  // ── 5. Crise sociale + Opposition forte → Montée de l'opposition ─────────────
  // Une crise sociale dans un contexte d'opposition déjà musclée renforce les adversaires.
  // L'opposition saisit chaque mouvement de rue pour consolider sa position.
  {
    id: "social_to_opposition_rise",
    shouldConsider: (state, event) =>
      event.type === "social" &&
      (state.oppositionPower ?? 35) > 45,
    rawProbability: (state) => {
      const excess = Math.max(0, (state.oppositionPower ?? 35) - 45);
      // 0.05 base + jusqu'à 0.35 pour une opposition à 100
      return 0.05 + (excess / 55) * 0.35;
    },
    delayActions: 6,
    effectType: "news_event",
    relatedNewsEventId: "opposition_rise",
  },

  // ── 6. Énergie basse → Chantage énergétique ─────────────────────────────────
  // Un acteur hostile ou un partenaire commercial profite d'une dépendance énergétique exposée.
  // La probabilité est proportionnelle à l'écart par rapport au seuil de sécurité (120 unités).
  {
    id: "energy_low_to_blackmail",
    shouldConsider: (state, event, choice) =>
      state.resources.energy < 120 &&
      ((choice?.effects.energy ?? 0) < 0 || event.type === "guerre_hybride"),
    rawProbability: (state) => {
      const gap = Math.max(0, 120 - state.resources.energy);
      // 0.05 base + jusqu'à 0.40 pour énergie = 0
      return 0.05 + (gap / 120) * 0.40;
    },
    delayActions: 6,
    effectType: "news_event",
    relatedNewsEventId: "chantage_energie_signal",
  },

  // ── 7. Stabilité institutionnelle basse + Crise → Fatigue populaire ──────────
  // Un État fragilisé ne peut pas amortir les chocs : les citoyens s'épuisent plus vite.
  // Effet indicateur (pas d'événement) — plus silencieux mais cumulatif.
  {
    id: "instability_to_fatigue",
    shouldConsider: (state, event) =>
      state.hiddenPolitics.institutionalStability < 45 &&
      (event.urgency === "critique" || event.urgency === "forte"),
    rawProbability: (state) => {
      const gap = Math.max(0, 45 - state.hiddenPolitics.institutionalStability);
      // 0.08 base + jusqu'à 0.30 pour stabilité = 0
      return 0.08 + (gap / 45) * 0.30;
    },
    delayActions: 7,
    effectType: "hidden_politics",
    payload: { popularFatigue: 4, mediaMood: -3 } satisfies Partial<HiddenPolitics>,
  },

];

// ── Fonction principale ───────────────────────────────────────────────────────

let _cascadeIdSeq = 0;
function newId(ruleId: string): string {
  _cascadeIdSeq += 1;
  return `cascade_${ruleId}_${Date.now()}_${_cascadeIdSeq}`;
}

/**
 * Évalue les règles de cascade probabilistes après une décision interactive
 * et retourne les `DelayedConsequence` à ajouter à l'état.
 *
 * Garanties :
 *  - Probabilité bornée entre 5 % et 65 % par règle.
 *  - Un événement déjà en attente (même `relatedNewsEventId`) n'est pas re-déclenché.
 *  - Ne modifie jamais l'état directement — pure function, retourne un tableau.
 *  - Le tirage aléatoire n'est jamais la seule cause : il faut que la règle soit
 *    pertinente ET que l'état rende la cascade plausible.
 */
export function rollCascades(
  state: StrategyGameState,
  event: NewsEvent,
  choice: NewsChoice | undefined,
  currentActionCount: number,
  existingDelayed: DelayedConsequence[],
  probabilityMultiplier = 1.0,
): DelayedConsequence[] {
  const added: DelayedConsequence[] = [];

  for (const rule of CASCADE_RULES) {
    // Filtre de pertinence contextuelle
    if (!rule.shouldConsider(state, event, choice)) continue;

    // Déduplication pour les news_event : si l'événement est déjà en attente, on n'en requeue pas un second
    if (rule.effectType === "news_event" && rule.relatedNewsEventId) {
      const alreadyPending = existingDelayed.some(
        (d) => d.relatedNewsEventId === rule.relatedNewsEventId,
      );
      if (alreadyPending) continue;
    }

    // Calcul et tirage probabiliste (probabilityMultiplier = chaos boost en tension explosive)
    const probability = clampProb(rule.rawProbability(state) * probabilityMultiplier);
    if (Math.random() >= probability) continue;

    added.push({
      id:                  newId(rule.id),
      source:              event.id,
      triggerAfterActions: currentActionCount + rule.delayActions,
      effectType:          rule.effectType,
      relatedNewsEventId:  rule.relatedNewsEventId,
      payload:             rule.payload,
    });
  }

  return added;
}

/**
 * Calcule les probabilités de toutes les cascades applicables sans les déclencher.
 * Utile pour le débogage et l'affichage éventuel dans l'interface de développement.
 */
export function previewCascadeProbabilities(
  state: StrategyGameState,
  event: NewsEvent,
  choice: NewsChoice | undefined,
): Array<{ id: string; probability: number; eligible: boolean }> {
  return CASCADE_RULES.map((rule) => ({
    id:          rule.id,
    eligible:    rule.shouldConsider(state, event, choice),
    probability: clampProb(rule.rawProbability(state)),
  }));
}
