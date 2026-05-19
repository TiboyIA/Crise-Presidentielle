import type { StrategyGameState, PlayerBuilding, StrategyResources } from "@/types/strategy";
import { DEFAULT_RESEARCH_STATE } from "@/types/strategyResearch";

export const BASE_RESOURCES: StrategyResources = {
  money:        2000,
  influence:    100,
  energy:       200,
  intelligence: 50,
  technology:   30,
  military:     80,
  cyberDefense: 40,
};

export const BASE_BUILDINGS: PlayerBuilding[] = [
  { id: "presidential_palace",  level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "economy_ministry",     level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "defense_ministry",     level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "intelligence_ministry",level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "energy_ministry",      level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "diplomacy_ministry",   level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "research_center",      level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "cyber_ministry",       level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "central_bank",         level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "media_agency",         level: 0, upgradeStartTime: null, upgradeEndTime: null },
  { id: "military_hq",          level: 0, upgradeStartTime: null, upgradeEndTime: null },
];

export function makeMinimalState(overrides: Partial<StrategyGameState> = {}): StrategyGameState {
  const now = 1_700_000_000_000;
  return {
    version:            3,
    playerName:         "Test",
    countryId:          "france",
    resources:          { ...BASE_RESOURCES },
    buildings:          BASE_BUILDINGS.map((b) => ({ ...b })),
    stats: {
      globalPower:     0,
      presidentLevel:  1,
      presidentXP:     0,
      rankingPoints:   0,
      totalOperations: 0,
      operationsWon:   0,
      season:          1,
      seasonStartTime: now,
    },
    relations:          [],
    missions:           [],
    news:               { log: [], seenIds: [], pendingIds: [], actionCount: 0, unreadCount: 0, lastNewsAction: 0 },
    lastResourceTick:   now,
    lastBotUpdate:      now,
    ranking:            [],
    startedAt:          now,
    nationalIndicators: { popularity: 60, economy: 55, security: 50, ecology: 45, cohesion: 60, publicBudget: 20 },
    mandateDay:         0,
    lastPollShownAt:    0,
    lastBilanShownAt:   0,
    hiddenPolitics:     { eliteTrust: 65, scandalRisk: 20, mediaMood: 55, popularFatigue: 15, regionalTension: 30, institutionalStability: 70 },
    delayedConsequences:  [],
    campaignPromises: {
      selected: ["securite", "economie", "ecologie"],
      progress: { securite: 0, economie: 0, ecologie: 0 },
      status:   { securite: "en cours", economie: "en cours", ecologie: "en cours" },
    },
    governanceDoctrine:   "democratique",
    reforms:              [],
    strategyMinisters:    [],
    nationalDebt:         30,
    achievements:         [],
    playerUnits:          [],
    trainingQueue:        [],
    militaryDoctrine:     "defensive",
    premiumGold:          0,
    publicMemory:         { traces: [] },
    oppositionPower:      35,
    realTime: {
      lastTickAt:                now,
      mandateDayProgressMinutes: 0,
      lastKnownTime:             now,
    },
    strategyResearch:     { ...DEFAULT_RESEARCH_STATE },
    dailyLoginReward:     { lastLoginRewardAt: 0, currentStreak: 0, totalDaysClaimed: 0 },
    cosmicInfluence:      { auroria: 10, obscurium: 10, lastCosmicEventAt: 0, discovered: false },
    ...overrides,
  };
}
