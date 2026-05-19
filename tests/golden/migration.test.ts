import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateSave, isSaveCurrent, CURRENT_SAVE_VERSION } from "@/storage/saveMigrations";

const MIN_V1_SAVE = {
  playerName:         "TestPlayer",
  countryId:          "france",
  resources:          { money: 5000, influence: 200, energy: 100, intelligence: 30, technology: 20, military: 50, cyberDefense: 10 },
  buildings:          [],
  stats:              { globalPower: 50, presidentLevel: 1, presidentXP: 0, rankingPoints: 100, totalOperations: 0, operationsWon: 0, season: 1, seasonStartTime: 0 },
  relations:          [],
  missions:           [],
  news:               { log: [], seenIds: [], pendingIds: [], actionCount: 0, unreadCount: 0 },
  lastResourceTick:   0,
  lastBotUpdate:      0,
  ranking:            [],
  startedAt:          1_700_000_000_000,
  nationalIndicators: { popularity: 70, economy: 60, security: 55, ecology: 40, cohesion: 65, publicBudget: 15 },
  mandateDay:         10,
  lastPollShownAt:    0,
  lastBilanShownAt:   0,
  hiddenPolitics:     { eliteTrust: 65, scandalRisk: 20, mediaMood: 55, popularFatigue: 15, regionalTension: 30, institutionalStability: 70 },
};

test("migrateSave — returns null for non-object input", () => {
  assert.equal(migrateSave(null), null);
  assert.equal(migrateSave("string"), null);
  assert.equal(migrateSave(42), null);
  assert.equal(migrateSave([]), null);
});

test("migrateSave — migrates v1 save to current version", () => {
  const raw = { ...MIN_V1_SAVE, version: 1 };
  const result = migrateSave(raw);

  assert.ok(result, "result should not be null");
  assert.equal(result!.state.version, CURRENT_SAVE_VERSION);
  assert.equal(result!.migratedFrom, 1);
  assert.equal(result!.usedFallback, false);
  assert.ok(result!.warnings.length > 0, "should have migration warnings");
  assert.equal(result!.state.playerName, "TestPlayer");
  assert.equal(result!.state.mandateDay, 10);
});

test("migrateSave — migrates v0 (no version) save to current version", () => {
  const raw = { ...MIN_V1_SAVE }; // no version field
  const result = migrateSave(raw);

  assert.ok(result);
  assert.equal(result!.state.version, CURRENT_SAVE_VERSION);
  assert.equal(result!.migratedFrom, 0);
  assert.equal(result!.usedFallback, false);
  assert.equal(result!.state.playerName, "TestPlayer");
});

test("migrateSave — adds missing v2 fields (strategyResearch, reforms)", () => {
  const raw = { ...MIN_V1_SAVE, version: 1 };
  const result = migrateSave(raw);

  assert.ok(result);
  assert.ok(result!.state.strategyResearch, "strategyResearch added");
  assert.ok(Array.isArray(result!.state.reforms), "reforms added");
  assert.ok(Array.isArray(result!.state.achievements), "achievements added");
  assert.equal(typeof result!.state.nationalDebt, "number");
});

test("migrateSave — adds missing v3 fields (cosmicInfluence, dailyLoginReward)", () => {
  const raw = { ...MIN_V1_SAVE, version: 1 };
  const result = migrateSave(raw);

  assert.ok(result);
  assert.ok(result!.state.cosmicInfluence, "cosmicInfluence added");
  assert.ok(result!.state.dailyLoginReward, "dailyLoginReward added");
});

test("migrateSave — preserves existing good values during migration", () => {
  const raw = { ...MIN_V1_SAVE, version: 1 };
  const result = migrateSave(raw);

  assert.ok(result);
  assert.equal(result!.state.resources.money, 5000, "existing money preserved");
  assert.equal(result!.state.nationalIndicators.popularity, 70, "existing indicators preserved");
});

test("migrateSave — already-current save has no warnings from migrations", () => {
  const raw = {
    ...MIN_V1_SAVE,
    version:            CURRENT_SAVE_VERSION,
    governanceDoctrine: "democratique",
    reforms:            [],
    strategyMinisters:  [{ id: "premier_ministre", loyalty: 70, competence: 65, scandalRisk: 15 }],
    nationalDebt:       30,
    achievements:       [],
    publicMemory:       { traces: [] },
    oppositionPower:    35,
    realTime:           { lastTickAt: 0, mandateDayProgressMinutes: 0, lastKnownTime: 0 },
    strategyResearch:   { completed: [], inProgress: null },
    premiumGold:        0,
    playerUnits:        [],
    trainingQueue:      [],
    militaryDoctrine:   "defensive",
    campaignPromises:   { selected: ["securite"], progress: { securite: 0 }, status: { securite: "en cours" } },
    delayedConsequences: [],
    cosmicInfluence:    { auroria: 10, obscurium: 10, lastCosmicEventAt: 0, discovered: false },
    dailyLoginReward:   { lastLoginRewardAt: 0, currentStreak: 0, totalDaysClaimed: 0 },
  };
  const result = migrateSave(raw);

  assert.ok(result);
  assert.equal(result!.migratedFrom, CURRENT_SAVE_VERSION);
  // Migrations themselves don't add warnings — only sanitize might for corrupt values
  const migrationWarnings = result!.warnings.filter((w) => /v[0-9]→v[0-9]/.test(w));
  assert.equal(migrationWarnings.length, 0, "no migration warnings for current save");
});

test("migrateSave — sanitizes corrupt indicator values", () => {
  const raw = {
    ...MIN_V1_SAVE,
    version:            1,
    nationalIndicators: { popularity: 150, economy: -10, security: 50, ecology: 45, cohesion: 60, publicBudget: 20 },
  };
  const result = migrateSave(raw);

  assert.ok(result);
  assert.equal(result!.state.nationalIndicators.popularity, 100, "clamped to 100");
  assert.equal(result!.state.nationalIndicators.economy, 0, "clamped to 0");
});

test("isSaveCurrent — true only for current version", () => {
  assert.equal(isSaveCurrent({ version: CURRENT_SAVE_VERSION }), true);
  assert.equal(isSaveCurrent({ version: 1 }), false);
  assert.equal(isSaveCurrent({ version: 0 }), false);
  assert.equal(isSaveCurrent(null), false);
  assert.equal(isSaveCurrent("string"), false);
});
