import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyIndicatorEffects,
  applyHiddenPoliticsEffects,
  applyRewards,
} from "@/core/computeState";

const BASE_INDICATORS = {
  popularity:   60,
  economy:      55,
  security:     50,
  ecology:      45,
  cohesion:     60,
  publicBudget: 20,
};

const BASE_HP = {
  eliteTrust:             65,
  scandalRisk:            20,
  mediaMood:              55,
  popularFatigue:         15,
  regionalTension:        30,
  institutionalStability: 70,
};

const BASE_RESOURCES = {
  money:        2000,
  influence:    100,
  energy:       200,
  intelligence: 50,
  technology:   30,
  military:     80,
  cyberDefense: 40,
};

test("applyIndicatorEffects — applies deltas and clamps to 0-100", () => {
  const result = applyIndicatorEffects(BASE_INDICATORS, { popularity: 10, economy: -20 });
  assert.equal(result.popularity, 70);
  assert.equal(result.economy, 35);
  assert.equal(result.security, 50);
  assert.equal(result.ecology, 45);
  assert.equal(result.cohesion, 60);
  assert.equal(result.publicBudget, 20);
});

test("applyIndicatorEffects — clamps at upper bound 100", () => {
  const result = applyIndicatorEffects({ ...BASE_INDICATORS, popularity: 95 }, { popularity: 20 });
  assert.equal(result.popularity, 100);
});

test("applyIndicatorEffects — clamps at lower bound 0", () => {
  const result = applyIndicatorEffects({ ...BASE_INDICATORS, security: 10 }, { security: -50 });
  assert.equal(result.security, 0);
});

test("applyIndicatorEffects — publicBudget clamps to -150..100", () => {
  const r1 = applyIndicatorEffects(BASE_INDICATORS, { publicBudget: 200 });
  assert.equal(r1.publicBudget, 100);
  const r2 = applyIndicatorEffects(BASE_INDICATORS, { publicBudget: -200 });
  assert.equal(r2.publicBudget, -150);
});

test("applyIndicatorEffects — rounds fractional results", () => {
  const result = applyIndicatorEffects(BASE_INDICATORS, { popularity: 0.7 });
  assert.equal(result.popularity, 61);
});

test("applyHiddenPoliticsEffects — applies deltas and clamps 0-100", () => {
  const result = applyHiddenPoliticsEffects(BASE_HP, { scandalRisk: 30 });
  assert.equal(result.scandalRisk, 50);
  assert.equal(result.eliteTrust, 65);
  assert.equal(result.mediaMood, 55);
});

test("applyHiddenPoliticsEffects — clamps at 100", () => {
  const result = applyHiddenPoliticsEffects(BASE_HP, { eliteTrust: 50 });
  assert.equal(result.eliteTrust, 100);
});

test("applyHiddenPoliticsEffects — clamps at 0", () => {
  const result = applyHiddenPoliticsEffects(BASE_HP, { popularFatigue: -50 });
  assert.equal(result.popularFatigue, 0);
});

test("applyRewards — adds reward amounts to resources", () => {
  const result = applyRewards(BASE_RESOURCES, { money: 500, influence: 25 });
  assert.equal(result.money, 2500);
  assert.equal(result.influence, 125);
  assert.equal(result.energy, 200);
});

test("applyRewards — rounds fractional amounts", () => {
  const result = applyRewards(BASE_RESOURCES, { money: 0.7 });
  assert.equal(result.money, 2001);
});

test("applyRewards — handles empty rewards", () => {
  const result = applyRewards(BASE_RESOURCES, {});
  assert.deepEqual(result, BASE_RESOURCES);
});
