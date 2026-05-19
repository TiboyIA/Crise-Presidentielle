import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMandateScore, computeGlobalPower } from "@/core/gameSelectors";
import type { PlayerBuilding, StrategyResources } from "@/types/strategy";

test("computeMandateScore — golden value for initial indicators", () => {
  // 60*0.35 + 55*0.25 + 50*0.15 + 45*0.10 + 60*0.15 = 55.75 → 56
  const score = computeMandateScore({
    popularity:   60,
    economy:      55,
    security:     50,
    ecology:      45,
    cohesion:     60,
    publicBudget: 20,
  });
  assert.equal(score, 56);
});

test("computeMandateScore — all 100 gives 100", () => {
  const score = computeMandateScore({
    popularity: 100, economy: 100, security: 100,
    ecology: 100, cohesion: 100, publicBudget: 100,
  });
  assert.equal(score, 100);
});

test("computeMandateScore — all 0 gives 0", () => {
  const score = computeMandateScore({
    popularity: 0, economy: 0, security: 0,
    ecology: 0, cohesion: 0, publicBudget: 0,
  });
  assert.equal(score, 0);
});

test("computeGlobalPower — level-0 buildings contribute nothing", () => {
  const buildings: PlayerBuilding[] = [
    { id: "presidential_palace", level: 0, upgradeStartTime: null, upgradeEndTime: null },
    { id: "economy_ministry",    level: 0, upgradeStartTime: null, upgradeEndTime: null },
  ];
  const resources: StrategyResources = {
    money: 0, influence: 0, energy: 0,
    intelligence: 0, technology: 0, military: 0, cyberDefense: 0,
  };
  assert.equal(computeGlobalPower(buildings, resources), 0);
});

test("computeGlobalPower — level-1 economy_ministry contributes 23", () => {
  // weight=15, level=1: 15 * 1 * 1.5 = 22.5 → round → 23
  const buildings: PlayerBuilding[] = [
    { id: "economy_ministry", level: 1, upgradeStartTime: null, upgradeEndTime: null },
  ];
  const resources: StrategyResources = {
    money: 0, influence: 0, energy: 0,
    intelligence: 0, technology: 0, military: 0, cyberDefense: 0,
  };
  assert.equal(computeGlobalPower(buildings, resources), 23);
});

test("computeGlobalPower — resources contribute proportionally", () => {
  const buildings: PlayerBuilding[] = [];
  const resources: StrategyResources = {
    money: 1000, influence: 0, energy: 0,
    intelligence: 0, technology: 0, military: 0, cyberDefense: 0,
  };
  // money: 1000 * 0.01 = 10
  assert.equal(computeGlobalPower(buildings, resources), 10);
});
