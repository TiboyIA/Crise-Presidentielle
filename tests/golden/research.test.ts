import { test } from "node:test";
import assert from "node:assert/strict";
import { applyResearchStart } from "@/core/applyAction";
import { canStartResearch } from "@/core/gameRules";
import { makeMinimalState } from "./fixtures";

// research_cybersec: { cost: {money:600, technology:20}, durationDays:2, prerequisites:[] }
// research_drones:   { prerequisites: ["research_cybersec"] }

test("applyResearchStart — deducts cost and sets inProgress", () => {
  const state = makeMinimalState({
    mandateDay: 5,
    resources: {
      money: 2000, influence: 100, energy: 200,
      intelligence: 50, technology: 50, military: 80, cyberDefense: 40,
    },
  });

  const next = applyResearchStart(state, "research_cybersec");

  assert.equal(next.resources.money, 1400, "money deducted by 600");
  assert.equal(next.resources.technology, 30, "technology deducted by 20");
  assert.ok(next.strategyResearch?.inProgress, "inProgress is set");
  assert.equal(next.strategyResearch?.inProgress?.id, "research_cybersec");
  assert.equal(next.strategyResearch?.inProgress?.startedAtDay, 5);
  assert.equal(next.strategyResearch?.inProgress?.completesAtDay, 7);
});

test("applyResearchStart — returns unchanged state when insufficient resources", () => {
  const state = makeMinimalState({
    resources: {
      money: 100, influence: 100, energy: 200,
      intelligence: 50, technology: 5, military: 80, cyberDefense: 40,
    },
  });
  const next = applyResearchStart(state, "research_cybersec");
  assert.equal(next, state);
});

test("applyResearchStart — returns unchanged state when research already in progress", () => {
  const state = makeMinimalState({
    resources: {
      money: 2000, influence: 100, energy: 200,
      intelligence: 50, technology: 50, military: 80, cyberDefense: 40,
    },
    strategyResearch: {
      completed: [],
      inProgress: { id: "research_power_grid", startedAtDay: 1, completesAtDay: 7 },
    },
  });
  const next = applyResearchStart(state, "research_cybersec");
  assert.equal(next, state);
});

test("applyResearchStart — returns unchanged state when already completed", () => {
  const state = makeMinimalState({
    resources: {
      money: 2000, influence: 100, energy: 200,
      intelligence: 50, technology: 50, military: 80, cyberDefense: 40,
    },
    strategyResearch: {
      completed: ["research_cybersec"],
      inProgress: null,
    },
  });
  const next = applyResearchStart(state, "research_cybersec");
  assert.equal(next, state);
});

test("canStartResearch — blocked when prerequisite not completed", () => {
  const state = makeMinimalState({
    resources: {
      money: 9999, influence: 9999, energy: 9999,
      intelligence: 9999, technology: 9999, military: 9999, cyberDefense: 9999,
    },
  });
  // research_drones requires research_cybersec
  const result = canStartResearch(state, "research_drones");
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /[Pp]rérequis/);
});

test("canStartResearch — allowed when prerequisites met and affordable", () => {
  const state = makeMinimalState({
    resources: {
      money: 9999, influence: 9999, energy: 9999,
      intelligence: 9999, technology: 9999, military: 9999, cyberDefense: 9999,
    },
    strategyResearch: {
      completed: ["research_cybersec"],
      inProgress: null,
    },
  });
  const result = canStartResearch(state, "research_drones");
  assert.equal(result.allowed, true);
});

test("canStartResearch — no prerequisites, just needs funds", () => {
  const state = makeMinimalState({
    resources: {
      money: 9999, influence: 9999, energy: 9999,
      intelligence: 9999, technology: 9999, military: 9999, cyberDefense: 9999,
    },
  });
  const result = canStartResearch(state, "research_cybersec");
  assert.equal(result.allowed, true);
});
