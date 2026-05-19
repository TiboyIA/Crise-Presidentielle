import { canAfford, isUnlocked } from "@/logic/buildingEngine";
import { BUILDINGS } from "@/data/buildings";
import { canLaunchOperation, OPERATIONS } from "@/logic/operationEngine";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import { DEFAULT_RESEARCH_STATE } from "@/types/strategyResearch";
import type { BuildingId, CountryId, OperationType, StrategyGameState } from "@/types/strategy";
import type { StrategyResearchId } from "@/types/strategyResearch";

// Pure validation predicates — return booleans or structured results, never modify state.

export function canStartBuildingUpgrade(
  state: StrategyGameState,
  buildingId: BuildingId,
): { allowed: boolean; reason?: string } {
  const b = state.buildings.find((b) => b.id === buildingId);
  if (!b) return { allowed: false, reason: "Bâtiment introuvable" };

  if (b.upgradeEndTime && Date.now() < b.upgradeEndTime) {
    return { allowed: false, reason: "Amélioration déjà en cours" };
  }

  if (!isUnlocked(b, state.buildings)) {
    return { allowed: false, reason: "Bâtiment verrouillé" };
  }

  const nextLevel = b.level + 1;
  const def = BUILDINGS[buildingId];
  if (nextLevel > def.maxLevel) {
    return { allowed: false, reason: "Niveau maximum atteint" };
  }

  const cost = def.levels[nextLevel - 1]?.cost ?? {};
  if (!canAfford(cost, state.resources)) {
    return { allowed: false, reason: "Ressources insuffisantes" };
  }

  return { allowed: true };
}

export function canStartResearch(
  state: StrategyGameState,
  researchId: StrategyResearchId,
): { allowed: boolean; reason?: string } {
  const research = state.strategyResearch ?? { ...DEFAULT_RESEARCH_STATE };

  if (research.inProgress) {
    return { allowed: false, reason: "Une recherche est déjà en cours" };
  }
  if (research.completed.includes(researchId)) {
    return { allowed: false, reason: "Recherche déjà complétée" };
  }

  const def = STRATEGY_RESEARCH[researchId];
  if (!def) return { allowed: false, reason: "Recherche inconnue" };

  const missing = def.prerequisites.filter((p: StrategyResearchId) => !research.completed.includes(p));
  if (missing.length > 0) {
    return { allowed: false, reason: `Prérequis manquants : ${missing.join(", ")}` };
  }

  if (!canAfford(def.cost, state.resources)) {
    return { allowed: false, reason: "Ressources insuffisantes" };
  }

  return { allowed: true };
}

export function canLaunchOp(
  state: StrategyGameState,
  type: OperationType,
  targetCountryId: CountryId,
): { allowed: boolean; reason?: string } {
  const relation = state.relations.find((r) => r.countryId === targetCountryId);
  if (!relation) return { allowed: false, reason: "Pays introuvable" };
  return canLaunchOperation(type, relation, state.buildings, state.resources);
}

/** True if the player can afford a given resource cost map. */
export function canAffordCost(
  cost: Partial<StrategyGameState["resources"]>,
  state: StrategyGameState,
): boolean {
  return canAfford(cost, state.resources);
}

/** True if the player has access to a given operation type for any country. */
export function hasAnyValidTarget(
  state: StrategyGameState,
  type: OperationType,
): boolean {
  return state.relations.some(
    (r) => canLaunchOperation(type, r, state.buildings, state.resources).allowed,
  );
}
