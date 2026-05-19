import { calculateGlobalPower } from "@/logic/powerEngine";
import { canLaunchOperation, OPERATIONS } from "@/logic/operationEngine";
import { canAfford, isUnlocked } from "@/logic/buildingEngine";
import { BUILDINGS } from "@/data/buildings";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import { DEFAULT_RESEARCH_STATE } from "@/types/strategyResearch";
import type { CampaignPromises, NationalIndicators, OperationType, PlayerBuilding, StrategyGameState } from "@/types/strategy";
import { computePromiseBilanBonus } from "@/logic/promiseQualityEngine";
import type { StrategyResearchId } from "@/types/strategyResearch";

// Pure read-only selectors — derive values from state, no side effects.

export function computeMandateScore(ind: NationalIndicators, promises?: CampaignPromises): number {
  const base = Math.round(
    ind.popularity * 0.35 +
    ind.economy    * 0.25 +
    ind.security   * 0.15 +
    ind.ecology    * 0.10 +
    ind.cohesion   * 0.15,
  );
  const promiseBonus = computePromiseBilanBonus(promises).total;
  return Math.max(0, Math.min(100, base + promiseBonus));
}

export function computeGlobalPower(
  buildings: PlayerBuilding[],
  resources: StrategyGameState["resources"],
): number {
  return calculateGlobalPower(buildings, resources);
}

export interface AvailableActions {
  canUpgradeBuildings: boolean;
  canStartResearch: boolean;
  canLaunchAnyOperation: boolean;
  canAffordAnyOperation: boolean;
  blockedReason?: string;
}

export function computeAvailableActions(state: StrategyGameState): AvailableActions {
  const { buildings, resources, relations } = state;
  const research = state.strategyResearch ?? DEFAULT_RESEARCH_STATE;

  // Building upgrade: any building affordable and not currently upgrading
  const canUpgradeBuildings = buildings.some((b) => {
    if (b.upgradeEndTime && Date.now() < b.upgradeEndTime) return false;
    if (!isUnlocked(b, buildings)) return false;
    const def = BUILDINGS[b.id];
    const nextLevel = b.level + 1;
    if (nextLevel > def.maxLevel) return false;
    const levelDef = def.levels[nextLevel - 1];
    return canAfford(levelDef?.cost ?? {}, resources);
  });

  // Research: no current research in progress, at least one affordable + prereqs met
  const canStartResearch = !research.inProgress && Object.values(STRATEGY_RESEARCH).some((def) => {
    if (research.completed.includes(def.id)) return false;
    const prereqsMet = def.prerequisites.every((p: StrategyResearchId) => research.completed.includes(p));
    return prereqsMet && canAfford(def.cost, resources);
  });

  // Operations: any relation with at least one operation allowed
  const canLaunchAnyOperation = relations.some((relation) =>
    (Object.keys(OPERATIONS) as OperationType[]).some(
      (type) => canLaunchOperation(type, relation, buildings, resources).allowed,
    ),
  );

  const canAffordAnyOperation = relations.some((relation) =>
    (Object.keys(OPERATIONS) as OperationType[]).some((type) =>
      canAfford(OPERATIONS[type].cost, resources),
    ),
  );

  return {
    canUpgradeBuildings,
    canStartResearch,
    canLaunchAnyOperation,
    canAffordAnyOperation,
  };
}
