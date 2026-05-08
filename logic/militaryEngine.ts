import { UNITS } from "@/data/units";
import { MILITARY_DOCTRINES } from "@/data/militaryDoctrines";
import { scaleUnitStat } from "@/types/units";
import type { MilitaryPower, PlayerUnit, MilitaryDoctrineId, UnitBranch } from "@/types/units";
import type { OperationType, StrategyResources } from "@/types/strategy";

export { scaleUnitStat };

export function calculateMilitaryPower(
  playerUnits: PlayerUnit[],
  doctrineId: MilitaryDoctrineId,
): MilitaryPower {
  const doctrine = MILITARY_DOCTRINES[doctrineId];
  const branchMap: Record<UnitBranch, number> = { land: 0, air: 0, naval: 0, support: 0 };

  for (const pu of playerUnits) {
    const def = UNITS[pu.unitId];
    if (!def || pu.quantity <= 0) continue;
    const leveledPower = scaleUnitStat(def.power, pu.level);
    const branchMod =
      def.branch === "air"   && doctrineId === "air_supremacy"  ? 0.20 :
      def.branch === "naval" && doctrineId === "naval_control"  ? 0.20 :
      def.branch === "support" && doctrineId === "hybrid"       ? 0.15 :
      (doctrine.defenseBonus + doctrine.attackBonus) / 2;
    branchMap[def.branch] += leveledPower * pu.quantity * (1 + branchMod);
  }

  const rawTotal = branchMap.land + branchMap.air + branchMap.naval + branchMap.support;
  const deterrenceMod = doctrineId === "deterrence" ? 1.1 : 1;

  return {
    total:   Math.round(rawTotal * deterrenceMod),
    land:    Math.round(branchMap.land),
    air:     Math.round(branchMap.air),
    naval:   Math.round(branchMap.naval),
    support: Math.round(branchMap.support),
  };
}

// Returns a 0-0.25 bonus to add to operation success rate
export function getOperationUnitBonus(
  operationType: OperationType,
  playerUnits: PlayerUnit[],
  doctrineId: MilitaryDoctrineId,
): number {
  const doctrine = MILITARY_DOCTRINES[doctrineId];
  let bonus = doctrine.operationBonus[operationType] ?? 0;

  for (const pu of playerUnits) {
    if (pu.quantity <= 0) continue;
    const def = UNITS[pu.unitId];
    if (!def) continue;
    const qty = Math.min(pu.quantity, 10);

    switch (operationType) {
      case "espionage":
      case "steal_intel":
        if (def.tags.includes("espionage") || def.tags.includes("recon")) bonus += 0.01 * qty;
        if (def.tags.includes("stealth")) bonus += 0.005 * qty;
        break;
      case "cyber_attack":
        if (def.tags.includes("cyber")) bonus += 0.015 * qty;
        break;
      case "sabotage":
        if (def.tags.includes("elite") || def.tags.includes("stealth")) bonus += 0.01 * qty;
        break;
      case "military_operation":
        if (def.branch === "land" || def.branch === "air") bonus += 0.008 * qty;
        if (def.tags.includes("heavy") || def.tags.includes("armored")) bonus += 0.01 * qty;
        break;
    }
  }

  return Math.min(0.25, Math.round(bonus * 100) / 100);
}

// Daily upkeep totals across all units under doctrine modifier
export function calculateDailyUpkeep(
  playerUnits: PlayerUnit[],
  doctrineId: MilitaryDoctrineId,
): Partial<StrategyResources> {
  const doctrine = MILITARY_DOCTRINES[doctrineId];
  const mod = 1 + doctrine.upkeepMod;
  const totals: Partial<StrategyResources> = {};

  for (const pu of playerUnits) {
    const def = UNITS[pu.unitId];
    if (!def || pu.quantity <= 0) continue;
    for (const [key, val] of Object.entries(def.upkeepPerDay) as [keyof StrategyResources, number][]) {
      totals[key] = Math.round(((totals[key] ?? 0) + val * pu.quantity) * mod);
    }
  }
  return totals;
}
