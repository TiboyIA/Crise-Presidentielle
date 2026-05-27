import type { StrategyResources } from "./strategy";

export type StrategyResearchId =
  | "research_cybersec"
  | "research_power_grid"
  | "research_drones"
  | "research_smart_agriculture"
  | "research_admin_ai"
  | "research_digital_hospitals"
  | "research_energy_sovereign"
  | "research_missile_defense"
  | "research_science_education"
  | "research_strategic_industry"
  | "research_satellites"
  | "research_missiles"
  | "research_military_bases"
  | "research_trade_routes"
  | "research_infowar"
  // ── MODE DELTA — Physiques avancées ──────────────────────────────────────────
  | "research_inertial_storage"
  | "research_self_healing_materials"
  | "research_datacenter_cooling"
  | "research_adaptive_orbits"
  | "research_em_shielding"
  | "research_quantum_sensors"
  | "research_superconducting_grid"
  | "research_digital_twin";

export type StrategyResearchCategory =
  | "cyber"
  | "energy"
  | "military"
  | "economy"
  | "society";

export interface StrategyResearchDef {
  id: StrategyResearchId;
  name: string;
  description: string;
  icon: string;
  category: StrategyResearchCategory;
  cost: Partial<StrategyResources>;
  durationDays: number;
  prerequisites: StrategyResearchId[];
  bonusLabel: string;
  reducesHybridThreat?: string[];
  operationBonus?: string;
  mapLayer?: string;
}

export interface StrategyResearchProgress {
  id: StrategyResearchId;
  startedAtDay: number;
  completesAtDay: number;
}

export interface StrategyResearchState {
  completed: StrategyResearchId[];
  inProgress: StrategyResearchProgress | null;
}

export const DEFAULT_RESEARCH_STATE: StrategyResearchState = {
  completed: [],
  inProgress: null,
};
