import { NEWS_EVENTS } from "@/data/newsEvents";
import type { NewsEvent, NewsLogEntry, NewsState, StrategyGameState, StrategyResources } from "@/types/strategy";

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

  // Evaluate conditions
  const conditionResults = evaluateConditions(state);

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

  // Priority: conditional > interactive > urgency
  const sorted = candidates.sort((a, b) => {
    const aScore = urgencyScore(a) + (a.conditionKey ? 10 : 0) + (a.isInteractive ? 5 : 0);
    const bScore = urgencyScore(b) + (b.conditionKey ? 10 : 0) + (b.isInteractive ? 5 : 0);
    return bScore - aScore;
  });

  // Small random shuffle among top candidates of same tier
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
  const { resources, ranking, stats } = state;
  const playerRank = ranking.findIndex((r) => r.id === "player") + 1;
  return {
    low_money:    resources.money < 500,
    low_cyber:    resources.cyberDefense < 30,
    low_military: resources.military < 40,
    high_power:   stats.globalPower >= 200,
    rank_pressure: playerRank > ranking.length * 0.4,
    top5_rank:    playerRank <= 5,
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
