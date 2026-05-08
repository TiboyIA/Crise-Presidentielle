import { BUILDINGS } from "@/data/buildings";
import type { PlayerBuilding, StrategyResources } from "@/types/strategy";

const BUILDING_WEIGHTS: Record<string, number> = {
  presidential_palace: 20,
  economy_ministry: 15,
  defense_ministry: 18,
  intelligence_ministry: 12,
  cyber_ministry: 14,
  energy_ministry: 11,
  diplomacy_ministry: 10,
  research_center: 16,
  central_bank: 22,
  media_agency: 9,
  military_hq: 25,
};

const RESOURCE_WEIGHTS: Partial<Record<keyof StrategyResources, number>> = {
  money: 0.01,
  influence: 0.3,
  military: 0.5,
  cyberDefense: 0.4,
  technology: 0.35,
  intelligence: 0.2,
  energy: 0.15,
};

export function calculateGlobalPower(
  buildings: PlayerBuilding[],
  resources: StrategyResources,
): number {
  let power = 0;

  for (const b of buildings) {
    if (b.level === 0) continue;
    const weight = BUILDING_WEIGHTS[b.id] ?? 10;
    power += weight * b.level * 1.5;
  }

  for (const [key, weight] of Object.entries(RESOURCE_WEIGHTS) as [keyof StrategyResources, number][]) {
    power += (resources[key] ?? 0) * weight;
  }

  return Math.round(power);
}

export function calculatePresidentXP(
  buildings: PlayerBuilding[],
  operationsWon: number,
): number {
  const buildingXP = buildings.reduce((sum, b) => sum + b.level * 10, 0);
  const opXP = operationsWon * 25;
  return buildingXP + opXP;
}

export function xpToLevel(xp: number): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= levelThreshold(level)) {
    remaining -= levelThreshold(level);
    level++;
  }
  return { level, xpInLevel: remaining, xpToNext: levelThreshold(level) };
}

function levelThreshold(level: number): number {
  return Math.round(100 * Math.pow(1.4, level - 1));
}

export function getBuildingPowerBonus(buildings: PlayerBuilding[]): number {
  return buildings.reduce((sum, b) => {
    if (b.level === 0) return sum;
    const def = BUILDINGS[b.id];
    const levelData = def.levels[b.level - 1];
    return sum + (levelData?.powerBonus ?? 0);
  }, 0);
}
