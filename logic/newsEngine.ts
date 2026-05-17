import { NEWS_EVENTS } from "@/data/newsEvents";
import type { NewsEvent, NewsLogEntry, NewsState, StrategyGameState, StrategyResources } from "@/types/strategy";

// ── Profil de faiblesses joueur ───────────────────────────────────────────────
//
// Utilisé pour pondérer légèrement la sélection des crises sans la forcer.
// Les seuils sont intentionnellement larges (ex. cyberDefense < 50, pas < 30)
// pour détecter les faiblesses "en voie de", pas seulement les situations
// critiques déjà capturées par evaluateConditions().
//
// La pondération (weaknessWeight) ajoute au plus +8 au score d'un événement.
// Le bonus conditionKey existant (+10) reste dominant : un événement déclenché
// par une condition explicite prend toujours le dessus. Le pool aléatoire (top-5)
// est conservé pour garantir la variété et éviter une sélection 100% déterministe.

export interface WeaknessProfile {
  cyber: boolean;       // cyberDefense < 50
  money: boolean;       // money < 1 500
  security: boolean;    // indicators.security < 45
  highDebt: boolean;    // nationalDebt > 250
  cohesion: boolean;    // indicators.cohesion < 45
  diplomacy: boolean;   // influence < 200
  energy: boolean;      // resources.energy < 100
  opposition: boolean;  // oppositionPower >= 50
}

export function computePlayerWeaknessProfile(state: StrategyGameState): WeaknessProfile {
  const r   = state.resources;
  const ind = state.nationalIndicators ?? { popularity: 60, economy: 55, security: 50, ecology: 45, cohesion: 60, publicBudget: 20 };
  return {
    cyber:      r.cyberDefense < 50,
    money:      r.money < 1_500,
    security:   ind.security < 45,
    highDebt:   (state.nationalDebt ?? 0) > 250,
    cohesion:   ind.cohesion < 45,
    diplomacy:  r.influence < 200,
    energy:     r.energy < 100,
    opposition: (state.oppositionPower ?? 35) >= 50,
  };
}

// Retourne un bonus de pertinence (0–8) pour un événement donné vis-à-vis du
// profil de faiblesses. Plafonné à 8 pour rester sous le bonus conditionKey (+10).
function weaknessWeight(event: NewsEvent, profile: WeaknessProfile): number {
  let bonus = 0;

  // Bonus par type d'événement ─────────────────────────────────────
  if (profile.cyber      && event.type === "cyber")          bonus += 4;
  if (profile.money      && event.type === "economie")       bonus += 4;
  if (profile.cohesion   && event.type === "social")         bonus += 4;
  if (profile.diplomacy  && event.type === "diplomatie")     bonus += 4;
  if (profile.security   && event.type === "guerre_hybride") bonus += 3;
  if (profile.energy     && event.type === "guerre_hybride") bonus += 2;
  if (profile.opposition && event.type === "national")       bonus += 2;

  // Bonus par conditionKey spécifique (cumule avec le type) ─────────
  if (profile.highDebt   && event.conditionKey === "budget_crisis")        bonus += 3;
  if (profile.security   && event.conditionKey === "low_security")         bonus += 3;
  if (profile.opposition && event.conditionKey === "high_opposition")      bonus += 3;
  if (profile.energy     && event.conditionKey === "no_energy_sovereign")  bonus += 3;
  if (profile.cyber      && event.conditionKey === "low_cyber")            bonus += 3;
  if (profile.money      && event.conditionKey === "low_money")            bonus += 3;
  if (profile.cohesion   && event.conditionKey === "low_cohesion")         bonus += 3;

  return Math.min(bonus, 8);
}

const MINOR_NEWS_EVERY = 4;   // non-interactive every N actions
const MAJOR_NEWS_EVERY = 12;  // interactive every N actions
const MAX_LOG = 30;           // keep last N in log

export function shouldTriggerNews(news: NewsState, actionCount: number): boolean {
  return actionCount - news.lastNewsAction >= MINOR_NEWS_EVERY;
}

export function shouldTriggerInteractiveNews(news: NewsState, actionCount: number): boolean {
  return actionCount - news.lastNewsAction >= MAJOR_NEWS_EVERY;
}

export function selectNextNews(
  state: StrategyGameState,
  forceInteractive = false,
): NewsEvent | null {
  const { news, stats, ranking } = state;
  const seenSet = new Set(news.seenIds);

  // Evaluate explicit conditions and player weakness profile
  const conditionResults = evaluateConditions(state);
  const weakProfile = computePlayerWeaknessProfile(state);

  // Filter candidates
  const candidates = NEWS_EVENTS.filter((e) => {
    if (seenSet.has(e.id)) return false;
    if (e.conditionKey && !conditionResults[e.conditionKey]) return false;
    if (forceInteractive && !e.isInteractive) return false;
    return true;
  });

  if (candidates.length === 0) {
    // Fallback: reset seen and try again (excluding log entries from last session)
    const recentSeen = new Set(news.log.slice(-10).map((l) => l.eventId));
    const fallback = NEWS_EVENTS.filter(
      (e) => !recentSeen.has(e.id) && (!forceInteractive || e.isInteractive),
    );
    return fallback[0] ?? null;
  }

  // Priority: conditional (+10) > interactive (+5) > urgency (1–4)
  // + weakness tilt (+0–8, always below conditionKey bonus to avoid forcing worst events)
  const sorted = candidates.sort((a, b) => {
    const aScore = urgencyScore(a) + (a.conditionKey ? 10 : 0) + (a.isInteractive ? 5 : 0) + weaknessWeight(a, weakProfile);
    const bScore = urgencyScore(b) + (b.conditionKey ? 10 : 0) + (b.isInteractive ? 5 : 0) + weaknessWeight(b, weakProfile);
    return bScore - aScore;
  });

  // Random pick among top-5 preserves variety and prevents fully deterministic selection
  const top = sorted.slice(0, Math.min(5, sorted.length));
  return top[Math.floor(Math.random() * top.length)];
}

function urgencyScore(e: NewsEvent): number {
  switch (e.urgency) {
    case "critique": return 4;
    case "forte":    return 3;
    case "moyenne":  return 2;
    case "faible":   return 1;
  }
}

function evaluateConditions(state: StrategyGameState): Record<string, boolean> {
  const { resources, ranking, stats, nationalIndicators: ind } = state;
  const playerRank = ranking.findIndex((r) => r.id === "player") + 1;
  const indicators = ind ?? { popularity: 60, economy: 55, security: 50, ecology: 45, cohesion: 60, publicBudget: 20 };
  const hp = state.hiddenPolitics ?? { eliteTrust: 65, scandalRisk: 20, mediaMood: 55, popularFatigue: 15, regionalTension: 30, institutionalStability: 70 };
  return {
    low_money:                resources.money < 500,
    low_cyber:                resources.cyberDefense < 30,
    low_military:             resources.military < 40,
    high_power:               stats.globalPower >= 200,
    rank_pressure:            playerRank > ranking.length * 0.4,
    top5_rank:                playerRank <= 5,
    low_popularity:           indicators.popularity < 30,
    low_ind_economy:          indicators.economy < 25,
    low_security:             indicators.security < 25,
    low_ecology:              indicators.ecology < 25,
    low_cohesion:             indicators.cohesion < 25,
    budget_crisis:            indicators.publicBudget < -80,
    low_elite_trust:          hp.eliteTrust < 35,
    high_scandal_risk:        hp.scandalRisk > 65,
    low_media_mood:           hp.mediaMood < 30,
    high_popular_fatigue:     hp.popularFatigue > 65,
    high_regional_tension:    hp.regionalTension > 65,
    low_institutional_stability: hp.institutionalStability < 35,
    high_debt:                   (state.nationalDebt ?? 0) > 350,
    minister_scandal_risk:       state.strategyMinisters?.some((m) => m.scandalRisk > 70) ?? false,
    high_opposition:             (state.oppositionPower ?? 35) >= 65,
    low_opposition:              (state.oppositionPower ?? 35) < 30,
    no_energy_sovereign:         !(state.strategyResearch?.completed ?? []).includes("research_energy_sovereign"),
    has_satellites:              (state.strategyResearch?.completed ?? []).includes("research_satellites"),
    has_infowar:                 (state.strategyResearch?.completed ?? []).includes("research_infowar"),
    cosmic_auroria_eligible:     indicators.cohesion >= 50 && hp.institutionalStability >= 55 && hp.scandalRisk < 50,
    cosmic_obscurium_active:     hp.scandalRisk > 40 || resources.cyberDefense < 40 || hp.popularFatigue > 55,
  };
}

export function applyAutoNews(
  state: StrategyGameState,
  event: NewsEvent,
): { news: NewsState; resources: StrategyResources } {
  const logEntry: NewsLogEntry = {
    eventId: event.id,
    title: event.title,
    source: event.source,
    type: event.type,
    urgency: event.urgency,
    timestamp: Date.now(),
    effects: event.autoEffects ?? {},
  };

  const resources = applyEffects(state.resources, event.autoEffects ?? {});

  const news: NewsState = {
    ...state.news,
    log: [...state.news.log.slice(-MAX_LOG + 1), logEntry],
    seenIds: [...state.news.seenIds, event.id],
    unreadCount: state.news.unreadCount + 1,
    lastNewsAction: state.news.actionCount,
  };

  return { news, resources };
}

export function applyInteractiveNews(
  state: StrategyGameState,
  event: NewsEvent,
  choiceId: string,
): { news: NewsState; resources: StrategyResources } {
  const choice = event.choices?.find((c) => c.id === choiceId);
  if (!choice) return { news: state.news, resources: state.resources };

  const logEntry: NewsLogEntry = {
    eventId: event.id,
    title: event.title,
    source: event.source,
    type: event.type,
    urgency: event.urgency,
    timestamp: Date.now(),
    choiceId: choice.id,
    choiceLabel: choice.label,
    consequence: choice.consequence,
    effects: choice.effects,
  };

  const resources = applyEffects(state.resources, choice.effects);

  const news: NewsState = {
    ...state.news,
    log: [...state.news.log.slice(-MAX_LOG + 1), logEntry],
    seenIds: [...state.news.seenIds, event.id],
    pendingIds: state.news.pendingIds.filter((id) => id !== event.id),
    unreadCount: Math.max(0, state.news.unreadCount - 1),
    lastNewsAction: state.news.actionCount,
  };

  return { news, resources };
}

export function queueNews(state: NewsState, eventId: string): NewsState {
  if (state.pendingIds.includes(eventId)) return state;
  return {
    ...state,
    pendingIds: [...state.pendingIds, eventId],
    seenIds: [...state.seenIds, eventId],
    unreadCount: state.unreadCount + 1,
    lastNewsAction: state.actionCount,
  };
}

export function dismissPendingNews(state: NewsState, eventId: string): NewsState {
  return {
    ...state,
    pendingIds: state.pendingIds.filter((id) => id !== eventId),
    unreadCount: Math.max(0, state.unreadCount - 1),
  };
}

export function markAllRead(state: NewsState): NewsState {
  return { ...state, unreadCount: 0 };
}

function applyEffects(
  resources: StrategyResources,
  effects: Partial<StrategyResources>,
): StrategyResources {
  const next = { ...resources };
  for (const [key, val] of Object.entries(effects) as [keyof StrategyResources, number][]) {
    next[key] = Math.max(0, Math.round(next[key] + val));
  }
  return next;
}

export const DEFAULT_NEWS_STATE: NewsState = {
  log: [],
  seenIds: [],
  pendingIds: [],
  actionCount: 0,
  lastNewsAction: 0,
  unreadCount: 0,
};

export function urgencyColor(urgency: NewsEvent["urgency"]): string {
  switch (urgency) {
    case "critique": return "#FF3040";
    case "forte":    return "#FF8040";
    case "moyenne":  return "#FFB020";
    case "faible":   return "#60A0FF";
  }
}

export function typeIcon(type: NewsEvent["type"]): string {
  switch (type) {
    case "cyber":         return "💻";
    case "economie":      return "📊";
    case "social":        return "👥";
    case "diplomatie":    return "🤝";
    case "guerre_hybride": return "⚠️";
    case "monde":         return "🌍";
    case "classement":    return "🏆";
    case "national":      return "🏛️";
  }
}
