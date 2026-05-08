import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BUILDINGS, INITIAL_BUILDINGS } from "@/data/buildings";
import { getInitialRelations } from "@/data/countries";
import { getInitialRanking } from "@/data/bots";
import { OPERATIONS, canLaunchOperation, resolveOperation, updateRelationScore } from "@/logic/operationEngine";
import { accumulateResources, canAfford, collectUpgrades, deductCost, isUnlocked, startUpgrade } from "@/logic/buildingEngine";
import { calculateGlobalPower, calculatePresidentXP, xpToLevel } from "@/logic/powerEngine";
import { updateBotRanking } from "@/logic/botEngine";
import { checkMissionProgress, generateDailyMissions, getCurrentDayIndex, missionsExpired } from "@/logic/missionEngine";
import { getMissionDef } from "@/logic/missionEngine";
import {
  DEFAULT_NEWS_STATE,
  applyAutoNews,
  applyInteractiveNews,
  dismissPendingNews,
  markAllRead,
  queueNews,
  selectNextNews,
  shouldTriggerInteractiveNews,
  shouldTriggerNews,
} from "@/logic/newsEngine";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { saveStrategy, loadStrategy } from "@/storage/strategyStorage";
import type {
  BuildingId,
  CampaignPromises,
  CountryId,
  DelayedConsequence,
  HiddenPolitics,
  NationalIndicators,
  OperationType,
  PlayerBuilding,
  PromiseDomain,
  StrategyGameState,
  StrategyResources,
} from "@/types/strategy";

const INITIAL_HIDDEN_POLITICS: HiddenPolitics = {
  eliteTrust: 65,
  scandalRisk: 20,
  mediaMood: 55,
  popularFatigue: 15,
  regionalTension: 30,
  institutionalStability: 70,
};

const PROMISE_DOMAINS: PromiseDomain[] = [
  "securite", "economie", "ecologie", "souverainete", "pouvoir_achat", "innovation", "diplomatie",
];

function buildInitialPromises(): CampaignPromises {
  const selected: PromiseDomain[] = PROMISE_DOMAINS.slice(0, 3);
  return {
    selected,
    progress: Object.fromEntries(selected.map((d) => [d, 0])) as CampaignPromises["progress"],
    status: Object.fromEntries(selected.map((d) => [d, "en cours" as const])) as CampaignPromises["status"],
  };
}

const INITIAL_INDICATORS: NationalIndicators = {
  popularity: 60,
  economy: 55,
  security: 50,
  ecology: 45,
  cohesion: 60,
  publicBudget: 20,
};

const INITIAL_RESOURCES: StrategyResources = {
  money: 2000,
  influence: 100,
  energy: 200,
  intelligence: 50,
  technology: 30,
  military: 80,
  cyberDefense: 40,
};

function buildInitialState(playerName: string): StrategyGameState {
  const buildings: PlayerBuilding[] = INITIAL_BUILDINGS.map((b) => ({
    id: b.id,
    level: b.level,
    upgradeStartTime: null,
    upgradeEndTime: null,
  }));

  const power = calculateGlobalPower(buildings, INITIAL_RESOURCES);
  const now = Date.now();
  const seasonStartTime = now;

  return {
    version: 1,
    playerName,
    countryId: "france",
    resources: { ...INITIAL_RESOURCES },
    buildings,
    stats: {
      globalPower: power,
      presidentLevel: 1,
      presidentXP: 0,
      rankingPoints: power * 2,
      totalOperations: 0,
      operationsWon: 0,
      season: 1,
      seasonStartTime,
    },
    relations: getInitialRelations("france"),
    missions: generateDailyMissions(getCurrentDayIndex()),
    news: { ...DEFAULT_NEWS_STATE },
    lastResourceTick: now,
    lastBotUpdate: now,
    ranking: getInitialRanking(power),
    startedAt: now,
    nationalIndicators: { ...INITIAL_INDICATORS },
    mandateDay: 0,
    lastPollShownAt: 0,
    lastBilanShownAt: 0,
    hiddenPolitics: { ...INITIAL_HIDDEN_POLITICS },
    delayedConsequences: [],
    campaignPromises: buildInitialPromises(),
  };
}

interface StrategyContextValue {
  state: StrategyGameState | null;
  loaded: boolean;
  shouldShowPoll: boolean;
  shouldShowBilan: boolean;
  startNewGame: (playerName: string) => void;
  upgradeBuilding: (id: BuildingId) => { success: boolean; reason?: string };
  launchOperation: (type: OperationType, targetCountryId: CountryId) => { success: boolean; message: string };
  collectMissionReward: (defId: string) => void;
  resolveInteractiveNews: (eventId: string, choiceId: string) => void;
  dismissNews: (eventId: string) => void;
  markNewsRead: () => void;
  acknowledgePoll: () => void;
  startNewMandate: () => void;
  tick: () => void;
}

const StrategyContext = createContext<StrategyContextValue | null>(null);

export function StrategyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StrategyGameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadStrategy().then((saved) => {
      if (saved) {
        setState({
          ...saved,
          news: saved.news ?? { ...DEFAULT_NEWS_STATE },
          nationalIndicators: saved.nationalIndicators ?? { ...INITIAL_INDICATORS },
          mandateDay: saved.mandateDay ?? 0,
          lastPollShownAt: saved.lastPollShownAt ?? 0,
          lastBilanShownAt: saved.lastBilanShownAt ?? 0,
          hiddenPolitics: saved.hiddenPolitics ?? { ...INITIAL_HIDDEN_POLITICS },
          delayedConsequences: saved.delayedConsequences ?? [],
          campaignPromises: saved.campaignPromises ?? buildInitialPromises(),
        });
      }
      setLoaded(true);
    });
  }, []);

  const scheduleSave = useCallback((s: StrategyGameState) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveStrategy(s), 1000);
  }, []);

  const update = useCallback(
    (updater: (prev: StrategyGameState) => StrategyGameState) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const startNewGame = useCallback((playerName: string) => {
    const initial = buildInitialState(playerName);
    setState(initial);
    saveStrategy(initial);
  }, []);

  const tick = useCallback(() => {
    update((prev) => {
      const now = Date.now();

      // Collect completed upgrades
      const buildings = collectUpgrades(prev.buildings);

      // Accumulate offline resources
      const resources = accumulateResources(buildings, prev.resources, prev.lastResourceTick);

      // Update bots (only if > 5min since last update)
      const shouldUpdateBots = now - prev.lastBotUpdate > 300000;
      const power = calculateGlobalPower(buildings, resources);
      const xpResult = xpToLevel(calculatePresidentXP(buildings, prev.stats.operationsWon));

      let ranking = prev.ranking;
      let lastBotUpdate = prev.lastBotUpdate;
      if (shouldUpdateBots) {
        ranking = updateBotRanking(prev.ranking, power, prev.stats.rankingPoints, prev.lastBotUpdate);
        lastBotUpdate = now;
      }

      // Process delayed consequences
      const actionCount = prev.news.actionCount;
      const triggered = prev.delayedConsequences.filter((c) => actionCount >= c.triggerAfterActions);
      const remaining = prev.delayedConsequences.filter((c) => actionCount < c.triggerAfterActions);
      let ds: StrategyGameState = { ...prev, delayedConsequences: remaining };
      for (const c of triggered) {
        if (c.effectType === "news_event" && c.relatedNewsEventId) {
          ds = { ...ds, news: queueNews(ds.news, c.relatedNewsEventId) };
        } else if (c.effectType === "indicator_effect" && c.payload) {
          ds = { ...ds, nationalIndicators: applyIndicatorEffects(ds.nationalIndicators, c.payload as Partial<NationalIndicators>) };
        } else if (c.effectType === "hidden_politics" && c.payload) {
          ds = { ...ds, hiddenPolitics: applyHiddenPoliticsEffects(ds.hiddenPolitics, c.payload as Partial<HiddenPolitics>) };
        }
      }

      // Refresh missions if expired
      let missions = prev.missions;
      if (missionsExpired(missions)) {
        missions = generateDailyMissions(getCurrentDayIndex());
      }

      // Check resource-based mission progress
      missions = checkMissionProgress(missions, resources, buildings, power);

      return {
        ...ds,
        buildings,
        resources,
        stats: {
          ...prev.stats,
          globalPower: power,
          presidentLevel: xpResult.level,
          presidentXP: xpResult.xpInLevel,
          rankingPoints: Math.max(prev.stats.rankingPoints, power * 2),
        },
        ranking,
        missions,
        lastResourceTick: now,
        lastBotUpdate,
      };
    });
  }, [update]);

  // Auto-tick every 60 seconds
  useEffect(() => {
    if (!loaded) return;
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [loaded, tick]);

  const upgradeBuilding = useCallback(
    (id: BuildingId): { success: boolean; reason?: string } => {
      if (!state) return { success: false, reason: "Jeu non initialisé" };

      const building = state.buildings.find((b) => b.id === id);
      if (!building) return { success: false, reason: "Bâtiment introuvable" };
      if (building.upgradeEndTime !== null) return { success: false, reason: "Amélioration déjà en cours" };

      const def = BUILDINGS[id];
      if (building.level >= def.maxLevel) return { success: false, reason: "Niveau maximum atteint" };
      if (!isUnlocked(building, state.buildings)) return { success: false, reason: "Bâtiment verrouillé" };

      const levelData = def.levels[building.level];
      if (!canAfford(levelData.cost, state.resources)) return { success: false, reason: "Ressources insuffisantes" };

      update((prev) => {
        const resources = deductCost(levelData.cost, prev.resources);
        const buildings = startUpgrade(prev.buildings, id);
        const missions = checkMissionProgress(prev.missions, resources, buildings, prev.stats.globalPower, {
          type: "upgrade_building",
          buildingId: id,
        });
        return withNews({ ...prev, resources, buildings, missions, mandateDay: prev.mandateDay + 1 });
      });

      return { success: true };
    },
    [state, update],
  );

  const launchOperation = useCallback(
    (type: OperationType, targetCountryId: CountryId): { success: boolean; message: string } => {
      if (!state) return { success: false, message: "Jeu non initialisé" };

      const relation = state.relations.find((r) => r.countryId === targetCountryId);
      if (!relation) return { success: false, message: "Pays introuvable" };

      const check = canLaunchOperation(type, relation, state.buildings, state.resources);
      if (!check.allowed) return { success: false, message: check.reason ?? "Impossible" };

      const op = OPERATIONS[type];
      const result = resolveOperation(type, relation, state.buildings);

      update((prev) => {
        const resources = deductCost(op.cost, prev.resources);
        const rewardedResources = applyRewards(resources, result.rewards);

        const relations = prev.relations.map((r) => {
          if (r.countryId !== targetCountryId) return r;
          const { score, status } = updateRelationScore(r.score, result.relationDelta);
          const cooldowns = { ...r.operationCooldowns, [type]: Date.now() + op.cooldown * 1000 };
          return { ...r, score, status, operationCooldowns: cooldowns };
        });

        const power = calculateGlobalPower(prev.buildings, rewardedResources);
        const xpGain = prev.stats.presidentXP + result.xp;
        const xpResult = xpToLevel(xpGain);

        const missions = checkMissionProgress(prev.missions, rewardedResources, prev.buildings, power, {
          type: result.success ? "win_operation" : "launch_operation",
          operationType: type,
        });

        const spyMissions = type === "espionage"
          ? checkMissionProgress(missions, rewardedResources, prev.buildings, power, { type: "spy_country" })
          : missions;

        return withNews({
          ...prev,
          resources: rewardedResources,
          relations,
          stats: {
            ...prev.stats,
            globalPower: power,
            presidentLevel: xpResult.level,
            presidentXP: xpResult.xpInLevel,
            rankingPoints: prev.stats.rankingPoints + result.rankingPoints,
            totalOperations: prev.stats.totalOperations + 1,
            operationsWon: prev.stats.operationsWon + (result.success ? 1 : 0),
          },
          missions: spyMissions,
          mandateDay: prev.mandateDay + (result.success ? 1 : 0),
        });
      });

      return { success: result.success, message: result.message };
    },
    [state, update],
  );

  const resolveInteractiveNews = useCallback(
    (eventId: string, choiceId: string) => {
      update((prev) => {
        const event = NEWS_EVENT_MAP[eventId];
        if (!event) return prev;
        const { news, resources } = applyInteractiveNews(prev, event, choiceId);

        const choice = event.choices?.find((c) => c.id === choiceId);

        const nationalIndicators = choice?.indicatorEffects
          ? applyIndicatorEffects(prev.nationalIndicators, choice.indicatorEffects)
          : prev.nationalIndicators;

        const hiddenPolitics = choice?.hiddenPoliticsEffects
          ? applyHiddenPoliticsEffects(prev.hiddenPolitics, choice.hiddenPoliticsEffects)
          : prev.hiddenPolitics;

        const relations = choice?.relationDelta
          ? prev.relations.map((r) => {
              if (r.countryId !== choice.relationDelta!.countryId) return r;
              const { score, status } = updateRelationScore(r.score, choice.relationDelta!.delta);
              return { ...r, score, status };
            })
          : prev.relations;

        let delayedConsequences = prev.delayedConsequences;
        if (choice?.queuesDelayedConsequence) {
          const q = choice.queuesDelayedConsequence;
          const newConsequence: DelayedConsequence = {
            id: q.id,
            source: event.id,
            triggerAfterActions: prev.news.actionCount + q.delayActions,
            effectType: q.effectType,
            relatedNewsEventId: q.relatedNewsEventId,
            payload: q.payload,
          };
          delayedConsequences = [...delayedConsequences, newConsequence];
        }

        return { ...prev, news, resources, nationalIndicators, hiddenPolitics, relations, delayedConsequences, mandateDay: prev.mandateDay + 2 };
      });
    },
    [update],
  );

  const dismissNews = useCallback(
    (eventId: string) => {
      update((prev) => ({ ...prev, news: dismissPendingNews(prev.news, eventId) }));
    },
    [update],
  );

  const markNewsRead = useCallback(() => {
    update((prev) => ({ ...prev, news: markAllRead(prev.news) }));
  }, [update]);

  const collectMissionReward = useCallback(
    (defId: string) => {
      update((prev) => {
        const mission = prev.missions.find((m) => m.defId === defId && m.completed);
        if (!mission) return prev;

        const def = getMissionDef(defId);
        if (!def) return prev;

        const resources = applyRewards(prev.resources, def.reward);
        const missions = prev.missions.filter((m) => m.defId !== defId);

        return {
          ...prev,
          resources,
          missions,
          stats: {
            ...prev.stats,
            rankingPoints: prev.stats.rankingPoints + def.rewardPoints,
          },
          mandateDay: prev.mandateDay + 1,
        };
      });
    },
    [update],
  );

  const acknowledgePoll = useCallback(() => {
    update((prev) => ({ ...prev, lastPollShownAt: prev.mandateDay }));
  }, [update]);

  const startNewMandate = useCallback(() => {
    update((prev) => {
      const score = computeMandateScore(prev.nationalIndicators);
      const bonusResources = score >= 80
        ? { money: 1000, influence: 100 }
        : score >= 60
        ? { money: 500, influence: 50 }
        : score >= 40
        ? { money: 200, influence: 25 }
        : {};
      return {
        ...prev,
        lastBilanShownAt: prev.mandateDay,
        resources: applyRewards(prev.resources, bonusResources),
        stats: {
          ...prev.stats,
          rankingPoints: prev.stats.rankingPoints + Math.round(score / 2),
        },
      };
    });
  }, [update]);

  const shouldShowPoll =
    state !== null &&
    state.mandateDay > 0 &&
    Math.floor(state.mandateDay / 10) > Math.floor(state.lastPollShownAt / 10);

  const shouldShowBilan =
    state !== null &&
    state.mandateDay >= 100 &&
    state.mandateDay - state.lastBilanShownAt >= 100;

  const value = useMemo<StrategyContextValue>(
    () => ({
      state, loaded, shouldShowPoll, shouldShowBilan,
      startNewGame, upgradeBuilding, launchOperation,
      collectMissionReward, resolveInteractiveNews, dismissNews, markNewsRead,
      acknowledgePoll, startNewMandate, tick,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, loaded, shouldShowPoll, shouldShowBilan, startNewGame, upgradeBuilding, launchOperation,
      collectMissionReward, resolveInteractiveNews, dismissNews, markNewsRead,
      acknowledgePoll, startNewMandate, tick],
  );

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
}

export function useStrategy(): StrategyContextValue {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error("useStrategy must be used within StrategyProvider");
  return ctx;
}

function withNews(state: StrategyGameState): StrategyGameState {
  const newCount = state.news.actionCount + 1;
  const newsState = { ...state.news, actionCount: newCount };
  const stateWithCount = { ...state, news: newsState };

  if (shouldTriggerInteractiveNews(newsState, newCount)) {
    const event = selectNextNews(stateWithCount, true);
    if (event) return { ...stateWithCount, news: queueNews(newsState, event.id) };
  }

  if (shouldTriggerNews(newsState, newCount)) {
    const event = selectNextNews(stateWithCount, false);
    if (event) {
      const { news, resources } = applyAutoNews(stateWithCount, event);
      return { ...stateWithCount, news, resources };
    }
  }

  return stateWithCount;
}

function applyHiddenPoliticsEffects(
  hp: HiddenPolitics,
  effects: Partial<HiddenPolitics>,
): HiddenPolitics {
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
  return {
    eliteTrust:              clamp(hp.eliteTrust              + (effects.eliteTrust              ?? 0)),
    scandalRisk:             clamp(hp.scandalRisk             + (effects.scandalRisk             ?? 0)),
    mediaMood:               clamp(hp.mediaMood               + (effects.mediaMood               ?? 0)),
    popularFatigue:          clamp(hp.popularFatigue          + (effects.popularFatigue          ?? 0)),
    regionalTension:         clamp(hp.regionalTension         + (effects.regionalTension         ?? 0)),
    institutionalStability:  clamp(hp.institutionalStability  + (effects.institutionalStability  ?? 0)),
  };
}

function applyIndicatorEffects(
  indicators: NationalIndicators,
  effects: Partial<NationalIndicators>,
): NationalIndicators {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
  return {
    popularity:   clamp(indicators.popularity   + (effects.popularity   ?? 0), 0, 100),
    economy:      clamp(indicators.economy       + (effects.economy      ?? 0), 0, 100),
    security:     clamp(indicators.security      + (effects.security     ?? 0), 0, 100),
    ecology:      clamp(indicators.ecology       + (effects.ecology      ?? 0), 0, 100),
    cohesion:     clamp(indicators.cohesion      + (effects.cohesion     ?? 0), 0, 100),
    publicBudget: clamp(indicators.publicBudget  + (effects.publicBudget ?? 0), -150, 100),
  };
}

export function computeMandateScore(ind: NationalIndicators): number {
  return Math.round(
    ind.popularity * 0.35 +
    ind.economy    * 0.25 +
    ind.security   * 0.15 +
    ind.ecology    * 0.10 +
    ind.cohesion   * 0.15,
  );
}

function applyRewards(resources: StrategyResources, rewards: Partial<StrategyResources>): StrategyResources {
  const next = { ...resources };
  for (const [key, amount] of Object.entries(rewards) as [keyof StrategyResources, number][]) {
    next[key] = Math.round((next[key] ?? 0) + amount);
  }
  return next;
}
