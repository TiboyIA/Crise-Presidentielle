import { BUILDINGS } from "@/data/buildings";
import { startUpgrade, deductCost, canAfford } from "@/logic/buildingEngine";
import { resolveOperation, updateRelationScore } from "@/logic/operationEngine";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import { DEFAULT_RESEARCH_STATE } from "@/types/strategyResearch";
import type { BuildingId, CountryId, OperationType, StrategyGameState } from "@/types/strategy";
import type { StrategyResearchId } from "@/types/strategyResearch";
import { applyRewards } from "@/core/computeState";

// Pure state transforms for player actions — return a new StrategyGameState.
// No React, Expo, AsyncStorage, or navigation imports allowed here.

/** Start a building upgrade. Returns unchanged state if upgrade cannot start. */
export function applyBuildingUpgrade(
  state: StrategyGameState,
  buildingId: BuildingId,
  gameHourNow: number,
): StrategyGameState {
  const b = state.buildings.find((b) => b.id === buildingId);
  if (!b) return state;

  const nextLevel = b.level + 1;
  const def = BUILDINGS[buildingId];
  if (nextLevel > def.maxLevel) return state;

  const cost = def.levels[nextLevel - 1]?.cost ?? {};
  if (!canAfford(cost, state.resources)) return state;

  const resources = deductCost(cost, state.resources);
  const buildings = startUpgrade(state.buildings, buildingId, gameHourNow);

  return { ...state, buildings, resources };
}

/** Start a research project. Returns unchanged state if research cannot start. */
export function applyResearchStart(
  state: StrategyGameState,
  researchId: StrategyResearchId,
): StrategyGameState {
  const research = state.strategyResearch ?? { ...DEFAULT_RESEARCH_STATE };
  if (research.inProgress) return state;
  if (research.completed.includes(researchId)) return state;

  const def = STRATEGY_RESEARCH[researchId];
  if (!def) return state;

  const prereqsMet = def.prerequisites.every((p: StrategyResearchId) =>
    research.completed.includes(p),
  );
  if (!prereqsMet) return state;
  if (!canAfford(def.cost, state.resources)) return state;

  const resources = deductCost(def.cost, state.resources);
  const strategyResearch = {
    ...research,
    inProgress: {
      id: researchId,
      startedAtDay: state.mandateDay,
      completesAtDay: state.mandateDay + def.durationDays,
    },
  };

  return { ...state, resources, strategyResearch };
}

/** Apply the result of a completed operation to the game state. */
export function applyOperationResult(
  state: StrategyGameState,
  type: OperationType,
  targetCountryId: CountryId,
): StrategyGameState {
  const relation = state.relations.find((r) => r.countryId === targetCountryId);
  if (!relation) return state;

  const research = state.strategyResearch ?? DEFAULT_RESEARCH_STATE;
  const result = resolveOperation(type, relation, state.buildings, research.completed);

  const resources = applyRewards(state.resources, result.rewards ?? {});

  const relations = state.relations.map((r) => {
    if (r.countryId !== targetCountryId) return r;
    const updated = updateRelationScore(r.score, result.relationDelta ?? 0);
    return { ...r, score: updated.score, status: updated.status };
  });

  const stats = {
    ...state.stats,
    operationsWon: result.success ? state.stats.operationsWon + 1 : state.stats.operationsWon,
    presidentXP: state.stats.presidentXP + (result.xp ?? 0),
  };

  return { ...state, resources, relations, stats };
}
