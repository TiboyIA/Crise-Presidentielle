import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBuildingUpgrade } from "@/core/applyAction";
import { canStartBuildingUpgrade } from "@/core/gameRules";
import { makeMinimalState } from "./fixtures";

// economy_ministry level 0→1: cost = { money: 300, influence: 20 }
// (genLevels baseCost * pow(1.8, 0) = baseCost * 1)

test("applyBuildingUpgrade — deducts cost and starts upgrade", () => {
  const state = makeMinimalState({
    resources: {
      money: 1000, influence: 100, energy: 200,
      intelligence: 50, technology: 30, military: 80, cyberDefense: 40,
    },
  });

  const next = applyBuildingUpgrade(state, "economy_ministry", 0);

  assert.equal(next.resources.money, 700, "money deducted by 300");
  assert.equal(next.resources.influence, 80, "influence deducted by 20");

  const building = next.buildings.find((b) => b.id === "economy_ministry")!;
  assert.equal(building.level, 0, "level stays 0 during upgrade");
  assert.ok(building.upgradeStartTime !== null, "upgradeStartTime set");
  assert.ok(building.upgradeEndTime !== null && building.upgradeEndTime > 0, "upgradeEndTime set");
});

test("applyBuildingUpgrade — returns unchanged state when insufficient resources", () => {
  const state = makeMinimalState({
    resources: {
      money: 100, influence: 5, energy: 0,
      intelligence: 0, technology: 0, military: 0, cyberDefense: 0,
    },
  });

  const next = applyBuildingUpgrade(state, "economy_ministry", 0);
  assert.equal(next, state, "state reference unchanged when cannot afford");
});

test("applyBuildingUpgrade — returns unchanged state for unknown building id", () => {
  const state = makeMinimalState();
  const next = applyBuildingUpgrade(state, "unknown_building" as any, 0);
  assert.equal(next, state);
});

test("canStartBuildingUpgrade — allowed when affordable and not upgrading", () => {
  const state = makeMinimalState({
    resources: {
      money: 1000, influence: 100, energy: 200,
      intelligence: 50, technology: 30, military: 80, cyberDefense: 40,
    },
  });
  const result = canStartBuildingUpgrade(state, "economy_ministry");
  assert.equal(result.allowed, true);
  assert.equal(result.reason, undefined);
});

test("canStartBuildingUpgrade — blocked when insufficient money", () => {
  const state = makeMinimalState({
    resources: {
      money: 50, influence: 100, energy: 200,
      intelligence: 50, technology: 30, military: 80, cyberDefense: 40,
    },
  });
  const result = canStartBuildingUpgrade(state, "economy_ministry");
  assert.equal(result.allowed, false);
  assert.ok(result.reason);
});

test("canStartBuildingUpgrade — blocked when upgrade already in progress", () => {
  const state = makeMinimalState({
    resources: {
      money: 1000, influence: 100, energy: 200,
      intelligence: 50, technology: 30, military: 80, cyberDefense: 40,
    },
    buildings: [
      { id: "presidential_palace",   level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "economy_ministry",      level: 0, upgradeStartTime: Date.now(), upgradeEndTime: Date.now() + 99_999_999 },
      { id: "defense_ministry",      level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "intelligence_ministry", level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "energy_ministry",       level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "diplomacy_ministry",    level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "research_center",       level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "cyber_ministry",        level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "central_bank",          level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "media_agency",          level: 0, upgradeStartTime: null,    upgradeEndTime: null },
      { id: "military_hq",           level: 0, upgradeStartTime: null,    upgradeEndTime: null },
    ],
  });
  const result = canStartBuildingUpgrade(state, "economy_ministry");
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /en cours/);
});

test("canStartBuildingUpgrade — blocked when locked (cyber_ministry needs intelligence_ministry lvl 2)", () => {
  const state = makeMinimalState({
    resources: {
      money: 9999, influence: 9999, energy: 9999,
      intelligence: 9999, technology: 9999, military: 9999, cyberDefense: 9999,
    },
  });
  const result = canStartBuildingUpgrade(state, "cyber_ministry");
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /verrouillé/);
});
