import type { StrategyResources } from "@/types/strategy";

export type UnitId =
  | "infantry_mechanized"
  | "special_forces"
  | "battle_tank"
  | "long_range_artillery"
  | "military_drone"
  | "multirole_fighter"
  | "attack_helicopter"
  | "frigate"
  | "submarine"
  | "cyber_unit";

export type UnitBranch = "land" | "air" | "naval" | "support";
export type UnitRole = "assault" | "defense" | "reconnaissance" | "cyber" | "support" | "deterrence" | "special_operation";
export type UnitRarity = "common" | "uncommon" | "rare" | "epic" | "strategic";
export type MilitaryDoctrineId = "defensive" | "offensive" | "hybrid" | "air_supremacy" | "naval_control" | "deterrence";

export interface UnitDef {
  id: UnitId;
  name: string;
  branch: UnitBranch;
  roles: UnitRole[];
  rarity: UnitRarity;
  description: string;
  unlockRequirement?: { buildingId: string; level: number };
  baseCost: Partial<StrategyResources>;
  trainingTimeSec: number;
  maxLevel: number;
  // Base stats (level 1)
  power: number;
  attack: number;
  defense: number;
  speed: number;
  stealth: number;
  range: number;
  upkeepPerDay: Partial<StrategyResources>;
  strengths: string[];
  weaknesses: string[];
  tags: string[];
}

export interface MilitaryDoctrineDef {
  id: MilitaryDoctrineId;
  name: string;
  icon: string;
  color: string;
  description: string;
  attackBonus: number;      // multiplier delta (0.15 = +15%)
  defenseBonus: number;
  operationBonus: Record<string, number>; // operationType → success rate bonus
  upkeepMod: number;        // multiplier delta on upkeep
  scandalRiskDelta: number;
  switchCost: Partial<StrategyResources>;
}

export interface PlayerUnit {
  unitId: UnitId;
  level: number;   // 1-10
  quantity: number;
}

export interface TrainingQueueEntry {
  id: string;
  unitId: UnitId;
  quantity: number;
  /** Timestamp réel de début (ms). Conservé pour compatibilité sauvegardes. */
  startedAt: number;
  /** Timestamp réel de fin (ms). Conservé pour compatibilité sauvegardes. */
  endsAt: number;
  /**
   * Heure jeu absolue de fin (depuis state.startedAt).
   * Source de vérité quand défini — le serveur validera cette valeur.
   * Absent sur les anciennes sauvegardes (migration automatique au chargement).
   */
  endsAtGameHour?: number;
  /**
   * Durée totale de la mission en heures jeu.
   * = def.trainingTimeSec / 3600 × quantity
   */
  durationGameHours?: number;
  status: "training" | "completed";
}

export interface MilitaryPower {
  total: number;
  land: number;
  air: number;
  naval: number;
  support: number;
}

// Scaling: +15% per level above 1
export function scaleUnitStat(base: number, level: number): number {
  return Math.round(base * (1 + (level - 1) * 0.15));
}
