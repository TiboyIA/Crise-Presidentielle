import { BUILDINGS } from "@/data/buildings";
import type { BuildingId, PlayerBuilding, StrategyResources } from "@/types/strategy";

export const MAX_OFFLINE_MINUTES = 24 * 60; // 24h max offline accumulation

export function canAfford(
  cost: Partial<StrategyResources>,
  resources: StrategyResources,
): boolean {
  for (const [key, amount] of Object.entries(cost) as [keyof StrategyResources, number][]) {
    if ((resources[key] ?? 0) < amount) return false;
  }
  return true;
}

export function deductCost(
  cost: Partial<StrategyResources>,
  resources: StrategyResources,
): StrategyResources {
  const next = { ...resources };
  for (const [key, amount] of Object.entries(cost) as [keyof StrategyResources, number][]) {
    next[key] = Math.max(0, next[key] - amount);
  }
  return next;
}

export function isUnlocked(building: PlayerBuilding, allBuildings: PlayerBuilding[]): boolean {
  const def = BUILDINGS[building.id];
  if (!def.unlockRequirement) return true;
  const req = def.unlockRequirement;
  const dep = allBuildings.find((b) => b.id === req.buildingId);
  return (dep?.level ?? 0) >= req.level;
}

export function startUpgrade(
  buildings: PlayerBuilding[],
  id: BuildingId,
): PlayerBuilding[] {
  return buildings.map((b) => {
    if (b.id !== id) return b;
    const def = BUILDINGS[id];
    const nextLevel = b.level + 1;
    if (nextLevel > def.maxLevel) return b;
    const duration = def.levels[b.level]?.upgradeDuration ?? 60;
    const now = Date.now();
    return { ...b, upgradeStartTime: now, upgradeEndTime: now + duration * 1000 };
  });
}

export function collectUpgrades(buildings: PlayerBuilding[]): PlayerBuilding[] {
  const now = Date.now();
  return buildings.map((b) => {
    if (b.upgradeEndTime !== null && now >= b.upgradeEndTime) {
      return { ...b, level: b.level + 1, upgradeStartTime: null, upgradeEndTime: null };
    }
    return b;
  });
}

export function accumulateResources(
  buildings: PlayerBuilding[],
  resources: StrategyResources,
  lastTick: number,
): StrategyResources {
  const now = Date.now();
  const elapsedMs = now - lastTick;
  const elapsedMinutes = Math.min(elapsedMs / 60000, MAX_OFFLINE_MINUTES);

  if (elapsedMinutes < 0.5) return resources;

  const next = { ...resources };

  for (const building of buildings) {
    if (building.level === 0) continue;
    const def = BUILDINGS[building.id];
    const levelData = def.levels[building.level - 1];
    if (!levelData) continue;

    for (const [key, rate] of Object.entries(levelData.production) as [keyof StrategyResources, number][]) {
      next[key] = Math.round((next[key] ?? 0) + rate * elapsedMinutes);
    }
  }

  return next;
}

export function getUpgradeProgress(building: PlayerBuilding): number {
  if (!building.upgradeStartTime || !building.upgradeEndTime) return 0;
  const now = Date.now();
  const total = building.upgradeEndTime - building.upgradeStartTime;
  const elapsed = now - building.upgradeStartTime;
  return Math.min(1, elapsed / total);
}

export function timeRemaining(building: PlayerBuilding): number {
  if (!building.upgradeEndTime) return 0;
  return Math.max(0, building.upgradeEndTime - Date.now());
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours < 24) return remainMinutes > 0 ? `${hours}h${remainMinutes}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}j${remainHours}h` : `${days}j`;
}
