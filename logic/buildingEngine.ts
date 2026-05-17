import { BUILDINGS } from "@/data/buildings";
import type { BuildingId, PlayerBuilding, StrategyResources } from "@/types/strategy";
import {
  clockNow,
  gameHoursToRealMs,
  realMsUntilGameHour,
} from "@/logic/simulationClock";

export const MAX_OFFLINE_MINUTES = 24 * 60; // 24h max offline pour la production de ressources

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

/**
 * Démarre une amélioration de bâtiment.
 *
 * La durée (upgradeDuration) est en secondes JEU.
 * Elle est convertie en ms réels via gameHoursToRealMs() pour le compte à rebours.
 * La fin est aussi stockée en heure jeu absolue (upgradeEndsAtGameHour) pour
 * le système serveur-authoritative futur.
 *
 * @param gameHourNow  heure jeu courante depuis state.startedAt
 */
export function startUpgrade(
  buildings: PlayerBuilding[],
  id: BuildingId,
  gameHourNow: number,
): PlayerBuilding[] {
  return buildings.map((b) => {
    if (b.id !== id) return b;
    const def = BUILDINGS[id];
    const nextLevel = b.level + 1;
    if (nextLevel > def.maxLevel) return b;
    // upgradeDuration est en secondes jeu
    const durationGameSec   = def.levels[b.level]?.upgradeDuration ?? 60;
    const durationGameHours = durationGameSec / 3600;
    const now               = clockNow();
    return {
      ...b,
      upgradeStartTime:      now,
      upgradeEndTime:        now + gameHoursToRealMs(durationGameHours),
      upgradeEndsAtGameHour: gameHourNow + durationGameHours,
    };
  });
}

/**
 * Collecte les améliorations terminées et incrémente le niveau.
 *
 * Vérifie d'abord upgradeEndsAtGameHour (système nouveau) ;
 * repli sur upgradeEndTime (ms réels) pour les anciennes sauvegardes.
 *
 * @param gameHourNow  heure jeu courante depuis state.startedAt
 */
export function collectUpgrades(buildings: PlayerBuilding[], gameHourNow: number): PlayerBuilding[] {
  const now = clockNow();
  return buildings.map((b) => {
    if (!b.upgradeEndTime && !b.upgradeEndsAtGameHour) return b;
    const done =
      b.upgradeEndsAtGameHour != null
        ? gameHourNow >= b.upgradeEndsAtGameHour
        : now >= (b.upgradeEndTime ?? Infinity);
    if (done) {
      return {
        ...b,
        level:                 b.level + 1,
        upgradeStartTime:      null,
        upgradeEndTime:        null,
        upgradeEndsAtGameHour: null,
      };
    }
    return b;
  });
}

export function accumulateResources(
  buildings: PlayerBuilding[],
  resources: StrategyResources,
  lastTick: number,
  productionBonus = 0, // additive multiplier from alliances, e.g. 0.04 = +4%
): StrategyResources {
  // La production de ressources reste en temps réel (par minute réelle).
  const now           = clockNow();
  const elapsedMs     = now - lastTick;
  const elapsedMinutes = Math.min(elapsedMs / 60_000, MAX_OFFLINE_MINUTES);

  if (elapsedMinutes < 0.5) return resources;

  const next = { ...resources };
  const multiplier = 1 + Math.min(productionBonus, 0.06); // cap at 6%

  for (const building of buildings) {
    if (building.level === 0) continue;
    const def       = BUILDINGS[building.id];
    const levelData = def.levels[building.level - 1];
    if (!levelData) continue;

    for (const [key, rate] of Object.entries(levelData.production) as [keyof StrategyResources, number][]) {
      next[key] = Math.round((next[key] ?? 0) + rate * multiplier * elapsedMinutes);
    }
  }

  return next;
}

/**
 * Progression de l'amélioration (0..1).
 * Basé sur les timestamps réels (valides dans les deux systèmes).
 */
export function getUpgradeProgress(building: PlayerBuilding): number {
  if (!building.upgradeStartTime || !building.upgradeEndTime) return 0;
  const now     = clockNow();
  const total   = building.upgradeEndTime - building.upgradeStartTime;
  const elapsed = now - building.upgradeStartTime;
  return Math.min(1, elapsed / total);
}

/**
 * Millisecondes réelles restantes avant la fin de l'amélioration.
 *
 * Utilise upgradeEndsAtGameHour si disponible (précis) ;
 * repli sur upgradeEndTime (ms réels) pour les anciennes sauvegardes.
 *
 * @param startedAt  state.startedAt (requis pour le calcul en heures jeu)
 */
export function timeRemaining(building: PlayerBuilding, startedAt?: number): number {
  if (
    building.upgradeEndsAtGameHour != null &&
    startedAt !== undefined
  ) {
    return realMsUntilGameHour(building.upgradeEndsAtGameHour, startedAt);
  }
  if (!building.upgradeEndTime) return 0;
  return Math.max(0, building.upgradeEndTime - clockNow());
}

/**
 * Formate une durée en ms pour l'affichage.
 * Exemples : "30s" | "5min" | "4h" | "3j12h"
 */
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
