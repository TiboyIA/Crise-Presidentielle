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
import { useAuth } from "@/context/AuthContext";
import { fetchAlliances, computeAllianceBonuses } from "@/services/AllianceService";
import {
  saveToSlot as storageSaveToSlot,
  loadFromSlot as storageLoadFromSlot,
  deleteSlot as storageDeleteSlot,
  type SlotNumber,
} from "@/storage/saveSlots";
import {
  isDailyRewardReady,
  getNextReward,
  getNextStreak,
} from "@/data/dailyRewards";
import { COUNTRY_RESOURCE_BONUS } from "@/data/countryPacks";
import { DOCTRINES } from "@/data/doctrines";
import { REFORMS } from "@/data/reforms";
import { STRATEGY_MINISTERS, MINISTER_LIST, MINISTER_POOL, MINISTER_INDICATOR } from "@/data/strategyMinisters";
import type { StrategyMinisterId } from "@/data/strategyMinisters";
import { ACHIEVEMENTS } from "@/data/achievements";
import { UNITS } from "@/data/units";
import { MILITARY_DOCTRINES } from "@/data/militaryDoctrines";
import { calculateMilitaryPower, getOperationUnitBonus, calculateDailyUpkeep } from "@/logic/militaryEngine";
import { computeRealTimeAdvance, initRealTime } from "@/logic/realTimeEngine";
import {
  clockNow,
  currentGameHour,
  gameHoursToRealMs,
  realMsToGameHours,
  migrateRealMsTimestamp,
} from "@/logic/simulationClock";
import type { MilitaryDoctrineId, PlayerUnit, TrainingQueueEntry, UnitId } from "@/types/units";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import { DEFAULT_RESEARCH_STATE } from "@/types/strategyResearch";
import type { StrategyResearchId, StrategyResearchState } from "@/types/strategyResearch";
import { trackGameStarted, trackCrisisResolved, trackActionUsed } from "@/storage/balanceStorage";
import { track as telemetry } from "@/services/TelemetryService";
import { COUNTRIES } from "@/data/countries";
import { computeCrossImpacts } from "@/logic/crossImpactEngine";
import { rollCascades } from "@/logic/cascadeProbabilityEngine";
import {
  applyHiddenPoliticsEffects,
  applyIndicatorEffects,
  applyRewards,
} from "@/core/computeState";
import { computeMandateScore } from "@/core/gameSelectors";
import { computeNationalTension, getTensionLevel } from "@/logic/tensionEngine";
import { computeChaosModifier } from "@/logic/chaosAmplifier";
import { computePresidentialClarity } from "@/logic/discourseEngine";
import {
  computeMisinterpretationRisk,
  generateMisinterpretation,
} from "@/logic/mediaMisinterpretationEngine";
import { computeRegisterEffects } from "@/logic/registerEngine";
import {
  checkChoiceContamination,
  computeContaminationEffects,
  decayContamination,
  generateContaminationFromEvent,
} from "@/logic/semanticContaminationEngine";
import {
  DEFAULT_PATHOLOGY,
  applyPathologyDelta,
  computePathologyThresholdEffects,
  decayPathologies,
} from "@/logic/discoursePathologyEngine";
import { recordEvent as rankRecord, isRankedIntended } from "@/services/RankedService";
import type {
  AchievementId,
  BuildingId,
  CampaignPromises,
  CountryId,
  DecisionTrace,
  DelayedConsequence,
  GovernanceDoctrine,
  HiddenPolitics,
  NationalIndicators,
  OperationType,
  PlayerBuilding,
  PlayerReform,
  PromiseDomain,
  ReformId,
  StrategyGameState,
  StrategyMinister,
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

function buildInitialMinisters(): StrategyMinister[] {
  return MINISTER_LIST.map((def) => ({
    id: def.id,
    loyalty: def.defaultLoyalty,
    competence: def.defaultCompetence,
    scandalRisk: def.defaultScandalRisk,
  }));
}

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

function buildInitialState(
  playerName: string,
  doctrine: GovernanceDoctrine = "democratique",
  countryId: CountryId = "france",
): StrategyGameState {
  const buildings: PlayerBuilding[] = INITIAL_BUILDINGS.map((b) => ({
    id: b.id,
    level: b.level,
    upgradeStartTime: null,
    upgradeEndTime: null,
  }));

  const bonus = COUNTRY_RESOURCE_BONUS[countryId] ?? {};
  const resources: StrategyResources = {
    ...INITIAL_RESOURCES,
    ...Object.fromEntries(
      (Object.entries(bonus) as [keyof StrategyResources, number][]).map(
        ([k, v]) => [k, INITIAL_RESOURCES[k] + v],
      ),
    ),
  };

  const power           = calculateGlobalPower(buildings, resources);
  const now             = clockNow();
  const seasonStartTime = now;

  return {
    version: 1,
    playerName,
    countryId,
    resources,
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
    relations: getInitialRelations(countryId),
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
    governanceDoctrine: doctrine,
    reforms: [],
    strategyMinisters: buildInitialMinisters(),
    nationalDebt: 30,
    achievements: [],
    playerUnits: [],
    trainingQueue: [],
    militaryDoctrine: "defensive",
    premiumGold: 0,
    publicMemory: { traces: [] },
    oppositionPower: 35,
    realTime: initRealTime(now),
    strategyResearch: { ...DEFAULT_RESEARCH_STATE },
    cosmicInfluence: { auroria: 10, obscurium: 10, lastCosmicEventAt: 0, discovered: false },
    discoursePathology: { ...DEFAULT_PATHOLOGY },
    semanticContamination: [],
  };
}

export type SaveStatus = "ok" | "migrated" | "recovered";

interface StrategyContextValue {
  state: StrategyGameState | null;
  loaded: boolean;
  saveStatus: SaveStatus;
  saveWarnings: string[];
  shouldShowPoll: boolean;
  shouldShowBilan: boolean;
  startNewGame: (playerName: string, doctrine?: GovernanceDoctrine, countryId?: CountryId) => void;
  upgradeBuilding: (id: BuildingId) => { success: boolean; reason?: string };
  launchOperation: (type: OperationType, targetCountryId: CountryId) => { success: boolean; message: string };
  collectMissionReward: (defId: string) => void;
  resolveInteractiveNews: (eventId: string, choiceId: string) => void;
  dismissNews: (eventId: string) => void;
  markNewsRead: () => void;
  acknowledgePoll: () => void;
  startNewMandate: () => void;
  adoptDoctrine: (id: GovernanceDoctrine) => { success: boolean; reason?: string };
  launchReform: (id: ReformId) => { success: boolean; reason?: string };
  fireMinister: (id: string) => void;
  trainUnit: (unitId: UnitId, quantity: number) => { success: boolean; reason?: string };
  collectTraining: () => void;
  setMilitaryDoctrine: (id: MilitaryDoctrineId) => { success: boolean; reason?: string };
  launchStrategyResearch: (id: StrategyResearchId) => { success: boolean; reason?: string };
  tick: () => void;
  saveToSlot: (slot: SlotNumber) => Promise<void>;
  loadFromSlot: (slot: SlotNumber) => Promise<boolean>;
  deleteSlot: (slot: SlotNumber) => Promise<void>;
  claimDailyReward: () => void;
}

const StrategyContext = createContext<StrategyContextValue | null>(null);

export function StrategyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StrategyGameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("ok");
  const [saveWarnings, setSaveWarnings] = useState<string[]>([]);
  const auth = useAuth();
  const allianceBonusRef = useRef(0);
  // Refs pour détection de complétion côté classé (comparaison inter-render)
  const stateRef            = useRef<StrategyGameState | null>(null);
  const prevBuildingsRef    = useRef<StrategyGameState["buildings"]>([]);
  const prevResearchRef     = useRef<StrategyGameState["strategyResearch"]>(undefined);

  useEffect(() => {
    if (!auth.isEnabled || !auth.accessToken) { allianceBonusRef.current = 0; return; }
    const run = async () => {
      const list = await fetchAlliances(auth.accessToken!);
      allianceBonusRef.current = computeAllianceBonuses(list).rate;
    };
    void run();
    const id = setInterval(() => void run(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [auth.isEnabled, auth.accessToken]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadStrategy().then((result) => {
      if (result) {
        // Migration runs in loadStrategy — state already has all fields filled.
        // Keep ?? guards here only as a final safety net against future schema changes.
        const saved = result.state;
        const merged: StrategyGameState = {
          ...saved,
          news:                saved.news                ?? { ...DEFAULT_NEWS_STATE },
          nationalIndicators:  saved.nationalIndicators  ?? { ...INITIAL_INDICATORS },
          mandateDay:          saved.mandateDay          ?? 0,
          lastPollShownAt:     saved.lastPollShownAt     ?? 0,
          lastBilanShownAt:    saved.lastBilanShownAt    ?? 0,
          hiddenPolitics:      saved.hiddenPolitics      ?? { ...INITIAL_HIDDEN_POLITICS },
          delayedConsequences: saved.delayedConsequences ?? [],
          campaignPromises:    saved.campaignPromises    ?? buildInitialPromises(),
          governanceDoctrine:  saved.governanceDoctrine  ?? "democratique",
          reforms:             saved.reforms             ?? [],
          strategyMinisters:   saved.strategyMinisters   ?? buildInitialMinisters(),
          nationalDebt:        saved.nationalDebt        ?? 30,
          achievements:        saved.achievements        ?? [],
          playerUnits:         saved.playerUnits         ?? [],
          trainingQueue:       saved.trainingQueue       ?? [],
          militaryDoctrine:    saved.militaryDoctrine    ?? "defensive",
          premiumGold:         saved.premiumGold         ?? 0,
          publicMemory:        saved.publicMemory        ?? { traces: [] },
          oppositionPower:     saved.oppositionPower     ?? 35,
          realTime:            saved.realTime            ?? initRealTime(clockNow()),
          strategyResearch:    saved.strategyResearch    ?? { ...DEFAULT_RESEARCH_STATE },
          cosmicInfluence:     saved.cosmicInfluence     ?? { auroria: 10, obscurium: 10, lastCosmicEventAt: 0, discovered: false },
        };
        // ── Migration simulationClock ──────────────────────────────────────────
        // Convertit les anciens timestamps réels (ms) en heures jeu absolues.
        // Préserve le temps réel restant : un joueur qui attendait 1 h réelle
        // continuera à attendre 1 h réelle — mais stocké en heures jeu désormais.
        const startedAt = merged.startedAt;
        setState({
          ...merged,
          trainingQueue: merged.trainingQueue.map((entry) => {
            if (entry.endsAtGameHour !== undefined) return entry; // déjà migré
            return {
              ...entry,
              endsAtGameHour:    migrateRealMsTimestamp(entry.endsAt, startedAt),
              durationGameHours: realMsToGameHours(entry.endsAt - entry.startedAt),
            };
          }),
          buildings: merged.buildings.map((b) => {
            if (!b.upgradeEndTime || b.upgradeEndsAtGameHour !== undefined) return b;
            return {
              ...b,
              upgradeEndsAtGameHour: migrateRealMsTimestamp(b.upgradeEndTime, startedAt),
            };
          }),
        });
        // Reflect migration status in context so recovery screen can act on it
        if (result.usedFallback) {
          setSaveStatus("recovered");
          setSaveWarnings(result.warnings);
        } else if (result.wasMigrated) {
          setSaveStatus("migrated");
        }
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
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

  const startNewGame = useCallback((playerName: string, doctrine?: GovernanceDoctrine, countryId?: CountryId) => {
    const initial = buildInitialState(playerName, doctrine, countryId);
    setState(initial);
    saveStrategy(initial);
    void trackGameStarted();
    void telemetry("new_game_started", { metadata: { doctrine: doctrine ?? "democratique", countryId: countryId ?? "france" } });
  }, []);

  const saveToSlotFn = useCallback(async (slot: SlotNumber) => {
    if (!state) return;
    await storageSaveToSlot(slot, state);
  }, [state]);

  const loadFromSlotFn = useCallback(async (slot: SlotNumber): Promise<boolean> => {
    const saved = await storageLoadFromSlot(slot);
    if (!saved) return false;
    const merged: StrategyGameState = {
      ...saved,
      news:                saved.news                ?? { ...DEFAULT_NEWS_STATE },
      nationalIndicators:  saved.nationalIndicators  ?? { ...INITIAL_INDICATORS },
      mandateDay:          saved.mandateDay          ?? 0,
      lastPollShownAt:     saved.lastPollShownAt     ?? 0,
      lastBilanShownAt:    saved.lastBilanShownAt    ?? 0,
      hiddenPolitics:      saved.hiddenPolitics      ?? { ...INITIAL_HIDDEN_POLITICS },
      delayedConsequences: saved.delayedConsequences ?? [],
      campaignPromises:    saved.campaignPromises    ?? buildInitialPromises(),
      governanceDoctrine:  saved.governanceDoctrine  ?? "democratique",
      reforms:             saved.reforms             ?? [],
      strategyMinisters:   saved.strategyMinisters   ?? buildInitialMinisters(),
      nationalDebt:        saved.nationalDebt        ?? 30,
      achievements:        saved.achievements        ?? [],
      playerUnits:         saved.playerUnits         ?? [],
      trainingQueue:       saved.trainingQueue       ?? [],
      militaryDoctrine:    saved.militaryDoctrine    ?? "defensive",
      premiumGold:         saved.premiumGold         ?? 0,
      publicMemory:        saved.publicMemory        ?? { traces: [] },
      oppositionPower:     saved.oppositionPower     ?? 35,
      realTime:            saved.realTime            ?? initRealTime(clockNow()),
      strategyResearch:    saved.strategyResearch    ?? { ...DEFAULT_RESEARCH_STATE },
    };
    const startedAt = merged.startedAt;
    const ready: StrategyGameState = {
      ...merged,
      trainingQueue: merged.trainingQueue.map((entry) => {
        if (entry.endsAtGameHour !== undefined) return entry;
        return {
          ...entry,
          endsAtGameHour:    migrateRealMsTimestamp(entry.endsAt, startedAt),
          durationGameHours: realMsToGameHours(entry.endsAt - entry.startedAt),
        };
      }),
      buildings: merged.buildings.map((b) => {
        if (!b.upgradeEndTime || b.upgradeEndsAtGameHour !== undefined) return b;
        return { ...b, upgradeEndsAtGameHour: migrateRealMsTimestamp(b.upgradeEndTime, startedAt) };
      }),
    };
    setState(ready);
    saveStrategy(ready);
    return true;
  }, []);

  const deleteSlotFn = useCallback(async (slot: SlotNumber) => {
    await storageDeleteSlot(slot);
  }, []);

  const claimDailyReward = useCallback(() => {
    update((prev) => {
      if (!isDailyRewardReady(prev.dailyLoginReward)) return prev;
      const reward = getNextReward(prev.dailyLoginReward);
      const newStreak = getNextStreak(prev.dailyLoginReward);
      const resources = { ...prev.resources };
      for (const [key, val] of Object.entries(reward.effects) as [keyof StrategyResources, number][]) {
        resources[key] = Math.min(resources[key] + val, 9999);
      }
      return {
        ...prev,
        resources,
        dailyLoginReward: {
          lastLoginRewardAt: Date.now(),
          currentStreak: newStreak,
          totalDaysClaimed: (prev.dailyLoginReward?.totalDaysClaimed ?? 0) + 1,
        },
      };
    });
  }, [update]);

  // ── Anti-triche classé : collecte d'événements côté client ──────────────────
  // Aucune validation ici — les données sont envoyées au serveur à la soumission.

  // Maintient stateRef à jour pour les intervalles sans recréer leur closure.
  useEffect(() => { stateRef.current = state; }, [state]);

  // Détecte les améliorations de bâtiments terminées (upgradeEndTime null → level++).
  useEffect(() => {
    if (!state || !isRankedIntended()) { prevBuildingsRef.current = state?.buildings ?? []; return; }
    for (const b of state.buildings) {
      const prev = prevBuildingsRef.current.find((p) => p.id === b.id);
      if (prev && prev.upgradeEndTime !== null && b.upgradeEndTime === null && b.level > 0) {
        void rankRecord("building_upgrade_completed", b.id, state.mandateDay, undefined, {
          level:         b.level,
          durationRealMs: prev.upgradeStartTime ? Date.now() - prev.upgradeStartTime : 0,
        });
      }
    }
    prevBuildingsRef.current = state.buildings;
  }, [state?.buildings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Détecte les recherches terminées (inProgress → null + completed grandit).
  useEffect(() => {
    const curr = state?.strategyResearch;
    const prev = prevResearchRef.current;
    if (state && curr && isRankedIntended() && prev?.inProgress && !curr.inProgress) {
      const newlyDone = curr.completed.find((id) => !prev.completed.includes(id));
      if (newlyDone) void rankRecord("research_completed", newlyDone, state.mandateDay, undefined, {
        durationDays: prev.inProgress.completesAtDay - prev.inProgress.startedAtDay,
      });
    }
    prevResearchRef.current = curr;
  }, [state?.strategyResearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Snapshot de ressources toutes les 5 minutes (5 × 60 s) pour le mode classé.
  useEffect(() => {
    if (!loaded) return;
    let count = 0;
    const id = setInterval(() => {
      count++;
      if (count % 5 !== 0 || !isRankedIntended() || !stateRef.current) return;
      const s = stateRef.current;
      void rankRecord("resource_snapshot_periodic", "snapshot", s.mandateDay, undefined, {
        money:         Math.round(s.resources.money),
        influence:     Math.round(s.resources.influence),
        military:      Math.round(s.resources.military),
        cyberDefense:  Math.round(s.resources.cyberDefense),
        power:         s.stats.globalPower,
        rankingPoints: s.stats.rankingPoints,
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [loaded]);

  const tick = useCallback(() => {
    update((prev) => {
      const now         = clockNow();
      // Heure jeu courante — coordonnée centrale de cette frame
      const gameHourNow = currentGameHour(prev.startedAt);

      // Collect completed upgrades (vérifie upgradeEndsAtGameHour en priorité)
      const buildings = collectUpgrades(prev.buildings, gameHourNow);

      // Accumulate offline resources
      const resources = accumulateResources(buildings, prev.resources, prev.lastResourceTick, allianceBonusRef.current);

      // Update bots (only if > 5min since last update)
      const shouldUpdateBots = now - prev.lastBotUpdate > 300000;
      const power = calculateGlobalPower(buildings, resources);
      const xpResult = xpToLevel(calculatePresidentXP(buildings, prev.stats.operationsWon));

      let ranking = prev.ranking;
      let lastBotUpdate = prev.lastBotUpdate;
      if (shouldUpdateBots) {
        ranking = updateBotRanking(prev.ranking, power, prev.stats.rankingPoints, prev.lastBotUpdate, prev.relations);
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

      // Mark completed training queue entries
      // Vérifie endsAtGameHour (nouveau) en priorité, repli sur endsAt (ms réels)
      const trainingQueue = prev.trainingQueue.map((entry) => {
        if (entry.status === "completed") return entry;
        const done = entry.endsAtGameHour !== undefined
          ? gameHourNow >= entry.endsAtGameHour
          : now >= entry.endsAt;
        return done ? { ...entry, status: "completed" as const } : entry;
      });

      // Real-time mandate advancement (1 mandate day = 6 real hours = 24 game hours).
      // Player actions don't move the mandate forward anymore; the wall clock does.
      const rtAdvance = computeRealTimeAdvance(prev.realTime, now);
      let withMandate: StrategyGameState = { ...ds, realTime: rtAdvance.realTime };
      if (rtAdvance.daysToAdd > 0) {
        withMandate = advanceMandateDay(withMandate, rtAdvance.daysToAdd);
      }

      return {
        ...withMandate,
        trainingQueue,
        buildings,
        resources,
        stats: {
          ...withMandate.stats,
          globalPower: power,
          presidentLevel: xpResult.level,
          presidentXP: xpResult.xpInLevel,
          rankingPoints: Math.max(withMandate.stats.rankingPoints, power * 2),
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
        const resources    = deductCost(levelData.cost, prev.resources);
        const gameHourNow  = currentGameHour(prev.startedAt);
        const buildings    = startUpgrade(prev.buildings, id, gameHourNow);
        const missions     = checkMissionProgress(prev.missions, resources, buildings, prev.stats.globalPower, {
          type: "upgrade_building",
          buildingId: id,
        });
        return withNews(advanceMandateDay({ ...prev, resources, buildings, missions }, 0));
      });

      void telemetry("building_upgrade_started", {
        gameDay:  state.mandateDay,
        metadata: { buildingId: id, toLevel: building.level + 1 },
      });
      void rankRecord("building_upgrade_started", id, state.mandateDay, undefined, {
        targetLevel: building.level + 1,
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

      const mandateDaySnap = state.mandateDay;

      const op = OPERATIONS[type];
      const unitBonus = getOperationUnitBonus(type, state.playerUnits ?? [], state.militaryDoctrine ?? "defensive");
      // Unit bonus gives a second chance on failed ops
      const baseResult = resolveOperation(type, relation, state.buildings, state.strategyResearch?.completed ?? []);
      const result = (!baseResult.success && unitBonus > 0 && Math.random() < unitBonus)
        ? { ...baseResult, success: true, message: baseResult.message + " (unités mobilisées)" }
        : baseResult;

      update((prev) => {
        const resources = deductCost(op.cost, prev.resources);
        const rewardedResources = applyRewards(resources, result.rewards);

        const relations = prev.relations.map((r) => {
          if (r.countryId !== targetCountryId) return r;
          const { score, status } = updateRelationScore(r.score, result.relationDelta);
          const cooldowns = { ...r.operationCooldowns, [type]: clockNow() + op.cooldown * 1000 };
          const country = COUNTRIES[targetCountryId];
          const revealedIntel = (type === "espionage" && result.success)
            ? {
                military: Math.max(0, Math.min(100, country.military + Math.floor(Math.random() * 14) - 7)),
                cyber: Math.max(0, Math.min(100, country.cyber + Math.floor(Math.random() * 14) - 7)),
                economy: Math.max(0, Math.min(100, country.economy + Math.floor(Math.random() * 14) - 7)),
                stability: Math.max(0, Math.min(100, 50 + Math.floor(Math.random() * 40) - 10)),
                revealedAtAction: prev.news.actionCount,
              }
            : r.revealedIntel;
          return { ...r, score, status, operationCooldowns: cooldowns, revealedIntel };
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

        const baseOp = {
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
        };
        return withNews(advanceMandateDay(baseOp, 0));
      });

      rankRecord("military_op", type, mandateDaySnap, undefined, { success: result.success });
      void rankRecord("operation_result", type, mandateDaySnap, undefined, {
        success:         result.success,
        moneySpent:      op.cost.money ?? 0,
        influenceSpent:  op.cost.influence ?? 0,
        rankingGained:   result.rankingPoints,
      });
      void telemetry("operation_launched", {
        gameDay:  mandateDaySnap,
        metadata: { operationType: type, success: result.success },
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
        const choice = event.choices?.find((c) => c.id === choiceId);

        // Amplification chaotique — active uniquement sur forte/critique et après 15 actions.
        // Amplifie les effets négatifs (jusqu'à +15 %) et atténue les positifs (-5 %) selon la tension.
        const tensionLevel = getTensionLevel(computeNationalTension(prev));
        const chaos = computeChaosModifier(
          tensionLevel,
          event,
          prev.news.actionCount,
          choice?.effects ?? {},
          choice?.indicatorEffects ?? {},
          choice?.hiddenPoliticsEffects ?? {},
        );

        // Ressources de base (effets normaux du choix) + delta chaos appliqué séparément.
        const applied = applyInteractiveNews(prev, event, choiceId);
        let news = applied.news;
        let { resources } = applied;
        if (chaos.isActive) {
          for (const [key, delta] of Object.entries(chaos.resourceDelta) as [keyof typeof resources, number][]) {
            resources = { ...resources, [key]: Math.max(0, Math.round(resources[key] + delta)) };
          }
        }

        // Indicateurs et politique cachée : version amplifiée remplace l'originale.
        let nationalIndicators = Object.keys(chaos.indicatorEffects).length > 0
          ? applyIndicatorEffects(prev.nationalIndicators, chaos.indicatorEffects)
          : prev.nationalIndicators;

        let hiddenPolitics = Object.keys(chaos.hiddenEffects).length > 0
          ? applyHiddenPoliticsEffects(prev.hiddenPolitics, chaos.hiddenEffects)
          : prev.hiddenPolitics;

        // Effets croisés : conséquences secondaires basées sur l'état courant.
        // S'appliquent après les effets primaires (et après amplification), toujours dans [-3, +3] par jauge.
        const cross = computeCrossImpacts(prev, event, chaos.indicatorEffects, chaos.hiddenEffects);
        if (Object.keys(cross.indicatorEffects).length > 0) {
          nationalIndicators = applyIndicatorEffects(nationalIndicators, cross.indicatorEffects);
        }
        if (Object.keys(cross.hiddenEffects).length > 0) {
          hiddenPolitics = applyHiddenPoliticsEffects(hiddenPolitics, cross.hiddenEffects);
        }

        // Indice de Clarté Présidentielle — effets additifs sur hiddenPolitics uniquement si clarityProfile défini.
        let clarityScore: number | undefined;
        if (choice?.clarityProfile) {
          const clarity = computePresidentialClarity(
            choice.clarityProfile,
            { urgency: event.urgency, newsType: event.type },
            { hiddenPolitics, nationalIndicators, governanceDoctrine: prev.governanceDoctrine, mandateDay: prev.mandateDay },
          );
          clarityScore = clarity.clarityScore;
          if (Object.keys(clarity.hiddenPoliticsEffects).length > 0) {
            hiddenPolitics = applyHiddenPoliticsEffects(hiddenPolitics, clarity.hiddenPoliticsEffects);
          }
        }

        // Pathologies du discours — accumulation discrète + effets sur seuil.
        let discoursePathology = prev.discoursePathology ?? { ...DEFAULT_PATHOLOGY };
        if (choice?.pathologyDelta) {
          discoursePathology = applyPathologyDelta(discoursePathology, choice.pathologyDelta);
          const thresholdEffects = computePathologyThresholdEffects(discoursePathology);
          if (Object.keys(thresholdEffects).length > 0) {
            hiddenPolitics = applyHiddenPoliticsEffects(hiddenPolitics, thresholdEffects);
          }
        }

        // Registre de communication — effets additifs selon le type de crise.
        if (choice?.communicationRegister) {
          const regFx = computeRegisterEffects(choice.communicationRegister, event.type, prev.resources.cyberDefense);
          if (Object.keys(regFx.indicatorEffects).length > 0) {
            nationalIndicators = applyIndicatorEffects(nationalIndicators, regFx.indicatorEffects);
          }
          if (Object.keys(regFx.hiddenPoliticsEffects).length > 0) {
            hiddenPolitics = applyHiddenPoliticsEffects(hiddenPolitics, regFx.hiddenPoliticsEffects);
          }
        }

        // Contamination sémantique — mots-clés toxiques actifs détectés sur le choix ; génère un nouveau mot-clé si conditions remplies.
        const currentContamination = prev.semanticContamination ?? [];
        const activeContamination = decayContamination(currentContamination, prev.news.actionCount);
        const newContaminationKeyword = generateContaminationFromEvent(
          { newsType: event.type, nationalIndicators, hiddenPolitics, governanceDoctrine: prev.governanceDoctrine, actionCount: prev.news.actionCount },
          activeContamination,
        );
        const semanticContamination = newContaminationKeyword
          ? [...activeContamination, newContaminationKeyword]
          : activeContamination;
        const matchedContamination = checkChoiceContamination(choice?.semanticThemes ?? [], activeContamination);
        const contaminationFx = computeContaminationEffects(matchedContamination);
        if (Object.keys(contaminationFx).length > 0) {
          hiddenPolitics = applyHiddenPoliticsEffects(hiddenPolitics, contaminationFx);
        }
        if (matchedContamination.length > 0 && news.log.length > 0) {
          const lastIdx = news.log.length - 1;
          news = {
            ...news,
            log: news.log.map((e, i) =>
              i === lastIdx ? { ...e, contaminatedThemes: matchedContamination.map((k) => k.keyword) } : e,
            ),
          };
        }

        // Malentendu médiatique — titre alternatif fictif ajouté à l'entrée de log si risque suffisant.
        const anyPromiseBroken = Object.values(prev.campaignPromises.status).some((s) => s === "trahie");
        const misinRisk = computeMisinterpretationRisk({
          hiddenPolitics,
          urgency: event.urgency,
          clarityScore,
          anyPromiseBroken,
        });
        const misinterpretation = generateMisinterpretation(misinRisk, event.type);
        if (misinterpretation && news.log.length > 0) {
          const lastIdx = news.log.length - 1;
          const patchedLog = news.log.map((e, i) =>
            i === lastIdx
              ? { ...e, misinterpretedTitle: misinterpretation.headline, misinterpretationType: misinterpretation.type }
              : e,
          );
          news = { ...news, log: patchedLog };
        }

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

        const cascades = rollCascades(prev, event, choice, prev.news.actionCount, delayedConsequences, chaos.cascadeBoost);
        if (cascades.length > 0) {
          delayedConsequences = [...delayedConsequences, ...cascades];
        }

        return advanceMandateDay({ ...prev, news, resources, nationalIndicators, hiddenPolitics, relations, delayedConsequences, discoursePathology, semanticContamination }, 0);
      });
      rankRecord("crisis_choice", eventId, state?.mandateDay ?? 0, choiceId);
      void telemetry("crisis_choice_made", {
        gameDay:  state?.mandateDay,
        metadata: { eventId, choiceId },
      });
    },
    [state, update],
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

        return advanceMandateDay({
          ...prev,
          resources,
          missions,
          stats: {
            ...prev.stats,
            rankingPoints: prev.stats.rankingPoints + def.rewardPoints,
          },
        }, 0);
      });
      void telemetry("mission_completed", { gameDay: state?.mandateDay, metadata: { defId } });
    },
    [update, state],
  );

  const acknowledgePoll = useCallback(() => {
    update((prev) => ({ ...prev, lastPollShownAt: prev.mandateDay }));
  }, [update]);

  const adoptDoctrine = useCallback(
    (id: GovernanceDoctrine): { success: boolean; reason?: string } => {
      if (!state) return { success: false, reason: "Jeu non initialisé" };
      if (state.governanceDoctrine === id) return { success: false, reason: "Doctrine déjà active" };
      const def = DOCTRINES[id];
      if (!canAfford(def.switchCost, state.resources)) return { success: false, reason: "Ressources insuffisantes" };
      const mandateDaySnap = state.mandateDay;
      update((prev) => {
        const resources = deductCost(def.switchCost, prev.resources);
        let next = { ...prev, resources, governanceDoctrine: id };
        if (id === "autoritaire") {
          next = addDecisionTrace(next, {
            type: "authoritarian_decision",
            title: "Virage autoritaire",
            description: "Le gouvernement adopte une doctrine autoritaire, renforçant le contrôle de l'État.",
            createdAtDay: prev.mandateDay,
            severity: "high",
            politicalImpact: -15,
            canResurface: true,
            tags: ["doctrine", "autoritarisme"],
          });
        }
        return withNews(advanceMandateDay(next, 0));
      });
      rankRecord("doctrine_set", id, mandateDaySnap);
      return { success: true };
    },
    [state, update],
  );

  const launchReform = useCallback(
    (id: ReformId): { success: boolean; reason?: string } => {
      if (!state) return { success: false, reason: "Jeu non initialisé" };
      const def = REFORMS[id];
      if (!canAfford(def.cost, state.resources)) return { success: false, reason: "Ressources insuffisantes" };
      if (state.reforms.some((r) => r.id === id && !r.applied)) return { success: false, reason: "Réforme déjà en cours" };
      const mandateDaySnap = state.mandateDay;
      update((prev) => {
        const resources = deductCost(def.cost, prev.resources);
        const newReform: PlayerReform = {
          id,
          launchedAtDay: prev.mandateDay,
          completesAtDay: prev.mandateDay + def.durationDays,
          applied: false,
        };
        let next = { ...prev, resources, reforms: [...prev.reforms, newReform] };
        next = addDecisionTrace(next, {
          type: "reform_courageous",
          title: `Réforme lancée : ${def.name}`,
          description: `Le gouvernement a engagé la réforme ${def.name}.`,
          createdAtDay: prev.mandateDay,
          severity: "medium",
          politicalImpact: -5,
          canResurface: true,
          tags: ["reforme", id],
        });
        return withNews(advanceMandateDay(next, 0));
      });
      rankRecord("reform_launched", id, mandateDaySnap);
      return { success: true };
    },
    [state, update],
  );

  const trainUnit = useCallback(
    (unitId: UnitId, quantity: number): { success: boolean; reason?: string } => {
      if (!state) return { success: false, reason: "Jeu non initialisé" };
      const def = UNITS[unitId];
      if (!def) return { success: false, reason: "Unité introuvable" };
      const totalCost: Partial<StrategyResources> = {};
      for (const [k, v] of Object.entries(def.baseCost) as [keyof StrategyResources, number][]) {
        totalCost[k] = (totalCost[k] ?? 0) + v * quantity;
      }
      if (!canAfford(totalCost, state.resources)) return { success: false, reason: "Ressources insuffisantes" };
      // trainingTimeSec est en secondes jeu → convertir en heures jeu
      const durationGameHours = (def.trainingTimeSec * quantity) / 3600;
      update((prev) => {
        const resources   = deductCost(totalCost, prev.resources);
        const now         = clockNow();
        const gameHourNow = currentGameHour(prev.startedAt);
        const entry: TrainingQueueEntry = {
          id:               `${unitId}_${now}`,
          unitId,
          quantity,
          startedAt:        now,
          endsAt:           now + gameHoursToRealMs(durationGameHours),
          endsAtGameHour:   gameHourNow + durationGameHours,
          durationGameHours,
          status:           "training",
        };
        return withNews({ ...prev, resources, trainingQueue: [...prev.trainingQueue, entry] });
      });
      void rankRecord("unit_training_started", unitId, state.mandateDay, undefined, {
        quantity,
        durationGameHours,
      });
      return { success: true };
    },
    [state, update],
  );

  const collectTraining = useCallback(() => {
    // Ranked: enregistrer les unités collectées avant la mise à jour d'état
    if (isRankedIntended() && state) {
      for (const entry of state.trainingQueue.filter((e) => e.status === "completed")) {
        void rankRecord("unit_training_completed", entry.unitId, state.mandateDay, undefined, {
          quantity:         entry.quantity,
          durationGameHours: entry.durationGameHours ?? 0,
        });
      }
    }
    update((prev) => {
      const completed = prev.trainingQueue.filter((e) => e.status === "completed");
      if (completed.length === 0) return prev;
      const remaining = prev.trainingQueue.filter((e) => e.status !== "completed");
      let units = [...prev.playerUnits];
      for (const entry of completed) {
        const existing = units.find((u) => u.unitId === entry.unitId);
        if (existing) {
          units = units.map((u) => u.unitId === entry.unitId ? { ...u, quantity: u.quantity + entry.quantity } : u);
        } else {
          units = [...units, { unitId: entry.unitId, level: 1, quantity: entry.quantity }];
        }
      }
      return withNews(advanceMandateDay({ ...prev, trainingQueue: remaining, playerUnits: units }, 0));
    });
  }, [update, state]);

  const setMilitaryDoctrine = useCallback(
    (id: MilitaryDoctrineId): { success: boolean; reason?: string } => {
      if (!state) return { success: false, reason: "Jeu non initialisé" };
      if (state.militaryDoctrine === id) return { success: false, reason: "Doctrine déjà active" };
      const def = MILITARY_DOCTRINES[id];
      if (!canAfford(def.switchCost, state.resources)) return { success: false, reason: "Ressources insuffisantes" };
      update((prev) => {
        const resources = deductCost(def.switchCost, prev.resources);
        const hiddenPolitics = applyHiddenPoliticsEffects(prev.hiddenPolitics, { scandalRisk: def.scandalRiskDelta });
        return withNews(advanceMandateDay({ ...prev, resources, militaryDoctrine: id, hiddenPolitics }, 0));
      });
      return { success: true };
    },
    [state, update],
  );

  const fireMinister = useCallback(
    (id: string) => {
      update((prev) => {
        const pool = MINISTER_POOL[id as StrategyMinisterId];
        if (!pool) return prev;
        const replacement = pool[Math.floor(Math.random() * pool.length)];
        const strategyMinisters = prev.strategyMinisters.map((m) =>
          m.id === id
            ? { id, name: replacement.name, loyalty: replacement.loyalty, competence: replacement.competence, scandalRisk: replacement.scandalRisk }
            : m,
        );
        const hiddenPolitics = applyHiddenPoliticsEffects(prev.hiddenPolitics, { eliteTrust: -5 });
        const nationalIndicators = applyIndicatorEffects(prev.nationalIndicators, { popularity: -3 });
        let next = { ...prev, strategyMinisters, hiddenPolitics, nationalIndicators };
        const firedDef = STRATEGY_MINISTERS[id as StrategyMinisterId];
        next = addDecisionTrace(next, {
          type: "scandal_revealed",
          title: `Limogeage : ${firedDef?.title ?? id}`,
          description: `Le président a révoqué le ${firedDef?.title ?? "ministre"} en raison d'un manque de loyauté.`,
          createdAtDay: prev.mandateDay,
          severity: "medium",
          politicalImpact: -8,
          canResurface: true,
          tags: ["remaniement", id],
        });
        return advanceMandateDay(next, 0);
      });
    },
    [update],
  );

  const launchStrategyResearch = useCallback(
    (id: StrategyResearchId): { success: boolean; reason?: string } => {
      if (!state) return { success: false, reason: "Jeu non initialisé" };
      const def = STRATEGY_RESEARCH[id];
      if (!def) return { success: false, reason: "Recherche introuvable" };
      const research: StrategyResearchState = state.strategyResearch ?? { ...DEFAULT_RESEARCH_STATE };
      if (research.completed.includes(id)) return { success: false, reason: "Déjà complétée" };
      if (research.inProgress) return { success: false, reason: "Une recherche est déjà en cours" };
      // Check prerequisites
      for (const prereq of def.prerequisites) {
        if (!research.completed.includes(prereq)) {
          return { success: false, reason: `Prérequis manquant : ${STRATEGY_RESEARCH[prereq]?.name ?? prereq}` };
        }
      }
      if (!canAfford(def.cost, state.resources)) return { success: false, reason: "Ressources insuffisantes" };
      update((prev) => {
        const resources = deductCost(def.cost, prev.resources);
        const prevResearch: StrategyResearchState = prev.strategyResearch ?? { ...DEFAULT_RESEARCH_STATE };
        const strategyResearch: StrategyResearchState = {
          ...prevResearch,
          inProgress: {
            id,
            startedAtDay: prev.mandateDay,
            completesAtDay: prev.mandateDay + def.durationDays,
          },
        };
        return withNews(advanceMandateDay({ ...prev, resources, strategyResearch }, 0));
      });
      void trackActionUsed(`research_${id}`);
      void telemetry("research_started", { gameDay: state.mandateDay, metadata: { researchId: id } });
      void rankRecord("research_started", id, state.mandateDay, undefined, {
        durationDays: def.durationDays,
      });
      return { success: true };
    },
    [state, update],
  );

  const startNewMandate = useCallback(() => {
    const mandateDaySnap = state?.mandateDay ?? 0;
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
    rankRecord("mandate_end", "mandate_end", mandateDaySnap);
  }, [state, update]);

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
      state, loaded, saveStatus, saveWarnings, shouldShowPoll, shouldShowBilan,
      startNewGame, upgradeBuilding, launchOperation,
      collectMissionReward, resolveInteractiveNews, dismissNews, markNewsRead,
      acknowledgePoll, startNewMandate, adoptDoctrine, launchReform, fireMinister,
      trainUnit, collectTraining, setMilitaryDoctrine, launchStrategyResearch, tick,
      saveToSlot: saveToSlotFn, loadFromSlot: loadFromSlotFn, deleteSlot: deleteSlotFn,
      claimDailyReward,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, loaded, saveStatus, saveWarnings, shouldShowPoll, shouldShowBilan, startNewGame, upgradeBuilding, launchOperation,
      collectMissionReward, resolveInteractiveNews, dismissNews, markNewsRead,
      acknowledgePoll, startNewMandate, adoptDoctrine, launchReform, fireMinister,
      trainUnit, collectTraining, setMilitaryDoctrine, launchStrategyResearch, tick,
      saveToSlotFn, loadFromSlotFn, deleteSlotFn, claimDailyReward],
  );

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
}

export function useStrategy(): StrategyContextValue {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error("useStrategy must be used within StrategyProvider");
  return ctx;
}

function processResearchCompletion(state: StrategyGameState): StrategyGameState {
  const research: StrategyResearchState = state.strategyResearch ?? { ...DEFAULT_RESEARCH_STATE };
  const ip = research.inProgress;
  if (!ip || state.mandateDay < ip.completesAtDay) return state;
  if (research.completed.includes(ip.id)) {
    return { ...state, strategyResearch: { ...research, inProgress: null } };
  }
  return {
    ...state,
    strategyResearch: {
      completed: [...research.completed, ip.id],
      inProgress: null,
    },
  };
}

function processReformCompletions(state: StrategyGameState): StrategyGameState {
  if (!state.reforms.some((r) => !r.applied && state.mandateDay >= r.completesAtDay)) return state;
  let ind = state.nationalIndicators;
  let hp = state.hiddenPolitics;
  let res = state.resources;
  const reforms = state.reforms.map((r) => {
    if (r.applied || state.mandateDay < r.completesAtDay) return r;
    const def = REFORMS[r.id];
    ind = applyIndicatorEffects(ind, def.indicatorBoost);
    hp = applyHiddenPoliticsEffects(hp, def.hiddenEffect);
    res = applyRewards(res, def.resourceBoost);
    return { ...r, applied: true };
  });
  return { ...state, reforms, nationalIndicators: ind, hiddenPolitics: hp, resources: res };
}

function applyMinisterBonuses(state: StrategyGameState): StrategyGameState {
  let ind = state.nationalIndicators;
  let res = state.resources;
  let hp = state.hiddenPolitics;
  let ministers = state.strategyMinisters;
  let newsState = state.news;

  ministers = ministers.map((minister) => {
    const def = STRATEGY_MINISTERS[minister.id as StrategyMinisterId];
    if (!def) return minister;

    // Loyalty drift: linked indicator drives loyalty
    const linkedKey = MINISTER_INDICATOR[minister.id as StrategyMinisterId];
    const indicatorVal = ind[linkedKey] ?? 50;
    const loyaltyDrift = indicatorVal >= 60 ? 1 : indicatorVal <= 30 ? -2 : -1;
    const newLoyalty = Math.min(100, Math.max(0, minister.loyalty + loyaltyDrift));

    // Scandal risk escalates slowly for disloyal ministers
    const scandalRiskDelta = newLoyalty < 40 ? 2 : newLoyalty < 60 ? 1 : -1;
    const newScandalRisk = Math.min(100, Math.max(0, minister.scandalRisk + scandalRiskDelta));

    // Queue scandal event if risk crosses 85
    if (newScandalRisk >= 85 && minister.scandalRisk < 85) {
      newsState = queueNews(newsState, "minister_scandal");
    }

    return { ...minister, loyalty: newLoyalty, scandalRisk: newScandalRisk };
  });

  for (const minister of ministers) {
    const def = STRATEGY_MINISTERS[minister.id as StrategyMinisterId];
    if (!def) continue;
    const scale = minister.competence / 100;
    const scaledInd: Partial<NationalIndicators> = {};
    for (const [k, v] of Object.entries(def.indicatorBonus) as [keyof NationalIndicators, number][]) {
      scaledInd[k] = Math.round(v * scale);
    }
    const scaledRes: Partial<StrategyResources> = {};
    for (const [k, v] of Object.entries(def.resourceBonus) as [keyof StrategyResources, number][]) {
      scaledRes[k] = Math.round(v * scale);
    }
    ind = applyIndicatorEffects(ind, scaledInd);
    res = applyRewards(res, scaledRes);
  }

  return { ...state, nationalIndicators: ind, resources: res, hiddenPolitics: hp, strategyMinisters: ministers, news: newsState };
}

function advanceMandateDay(state: StrategyGameState, days: number): StrategyGameState {
  // Player actions call this with days = 0 just to refresh achievements;
  // the real mandate progression comes from realTimeEngine in tick().
  if (days <= 0) return withAchievements(state);

  const prevDay = state.mandateDay;
  const newDay = prevDay + days;
  let s = { ...state, mandateDay: newDay };

  // Check reform completions
  s = processReformCompletions(s);

  // Tick research completion
  s = processResearchCompletion(s);

  // Apply doctrine drift + minister bonuses + debt update every 10 days
  if (Math.floor(newDay / 10) > Math.floor(prevDay / 10)) {
    // Décroissance naturelle des pathologies discursives (-2 par palier de 10 jours)
    if (s.discoursePathology) {
      s = { ...s, discoursePathology: decayPathologies(s.discoursePathology, 2) };
    }

    const doctrineDef = DOCTRINES[s.governanceDoctrine];
    s = {
      ...s,
      nationalIndicators: applyIndicatorEffects(s.nationalIndicators, doctrineDef.indicatorDrift),
      hiddenPolitics: applyHiddenPoliticsEffects(s.hiddenPolitics, doctrineDef.hiddenDrift),
      resources: applyRewards(s.resources, doctrineDef.resourceBonus),
    };
    s = applyMinisterBonuses(s);

    // Debt: rises if budget is negative, falls if positive
    const budgetEffect = s.nationalIndicators.publicBudget;
    const debtDelta = budgetEffect < 0 ? Math.ceil(-budgetEffect / 10) : budgetEffect > 50 ? -2 : -1;
    s = { ...s, nationalDebt: Math.min(500, Math.max(0, s.nationalDebt + debtDelta)) };

    // Queue debt escalation event if high
    if (s.nationalDebt > 350 && state.nationalDebt <= 350) {
      s = { ...s, news: queueNews(s.news, "debt_escalation") };
    }

    // Update opposition pressure
    const newOpposition = evaluateOppositionPressure(s);
    if (newOpposition >= 70 && s.oppositionPower < 70) {
      s = { ...s, news: queueNews(s.news, "opposition_rise") };
    }
    s = { ...s, oppositionPower: newOpposition };
  }

  // Check achievements
  s = withAchievements(s);

  return s;
}

function withAchievements(state: StrategyGameState): StrategyGameState {
  const already = new Set(state.achievements);
  const gained: AchievementId[] = [];

  const check = (id: AchievementId, cond: boolean) => {
    if (!already.has(id) && cond) gained.push(id);
  };

  const ind = state.nationalIndicators;
  const playerRank = state.ranking.findIndex((r) => r.id === "player") + 1;
  const alliedCount = state.relations.filter((r) => r.status === "allied").length;
  const completedReforms = state.reforms.filter((r) => r.applied).length;

  check("premier_serment",   state.mandateDay >= 1);
  check("premiere_reforme",  completedReforms >= 1);
  check("top3_mondial",      playerRank >= 1 && playerRank <= 3);
  check("economie_forte",    ind.economy >= 80);
  check("securite_max",      ind.security >= 80);
  check("cyberbouclier",     state.resources.cyberDefense >= 80);
  check("diplomate_etoile",  alliedCount >= 3);
  check("reformateur_senior", completedReforms >= 4);
  check("endurance",         state.mandateDay >= 200);
  check("grande_puissance",  state.stats.globalPower >= 300);
  check("populaire",         ind.popularity >= 85);

  if (gained.length === 0) return state;
  return { ...state, achievements: [...state.achievements, ...gained] };
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


export { computeMandateScore } from "@/core/gameSelectors";

function evaluateOppositionPressure(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp = state.hiddenPolitics;
  let pressure = 35;

  pressure += (50 - ind.popularity) * 0.4;
  pressure += (50 - ind.cohesion) * 0.2;
  pressure += (50 - ind.economy) * 0.15;
  pressure += (100 - hp.institutionalStability) * 0.1;
  pressure += hp.popularFatigue * 0.1;
  pressure += (state.nationalDebt / 500) * 20;

  const badTraces = (state.publicMemory?.traces ?? []).filter((t) => t.politicalImpact < 0);
  pressure += Math.min(badTraces.length * 2, 20);

  if (state.governanceDoctrine === "autoritaire") pressure += 10;
  if (state.governanceDoctrine === "populiste") pressure += 5;

  return Math.min(100, Math.max(0, Math.round(pressure)));
}

function addDecisionTrace(
  state: StrategyGameState,
  partial: Omit<DecisionTrace, "id" | "resurfacedCount">,
): StrategyGameState {
  const trace: DecisionTrace = {
    ...partial,
    id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    resurfacedCount: 0,
  };
  const traces = [...(state.publicMemory?.traces ?? []), trace];
  return { ...state, publicMemory: { traces } };
}

