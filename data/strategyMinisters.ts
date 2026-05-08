import type { BuildingId, NationalIndicators, StrategyResources } from "@/types/strategy";

export type StrategyMinisterId =
  | "pm"
  | "economie"
  | "defense"
  | "affaires_etrangeres"
  | "ecologie";

export interface StrategyMinisterDef {
  id: StrategyMinisterId;
  title: string;
  name: string;
  specialty: string;
  specialtyColor: string;
  linkedBuildingId?: BuildingId;
  // Default stats (can drift during gameplay)
  defaultLoyalty: number;
  defaultCompetence: number;
  defaultScandalRisk: number;
  // Bonus applied every 10 mandate days (competence/100 scaling)
  indicatorBonus: Partial<NationalIndicators>;
  resourceBonus: Partial<StrategyResources>;
}

export const STRATEGY_MINISTERS: Record<StrategyMinisterId, StrategyMinisterDef> = {
  pm: {
    id: "pm",
    title: "Premier Ministre",
    name: "Antoine Marquis",
    specialty: "Gouvernance",
    specialtyColor: "#c9a84c",
    linkedBuildingId: "presidential_palace",
    defaultLoyalty: 75,
    defaultCompetence: 72,
    defaultScandalRisk: 15,
    indicatorBonus: { popularity: 2, cohesion: 1 },
    resourceBonus: { influence: 8 },
  },
  economie: {
    id: "economie",
    title: "Ministre de l'Économie",
    name: "Sylvie Renard",
    specialty: "Économie",
    specialtyColor: "#3fbe7a",
    linkedBuildingId: "economy_ministry",
    defaultLoyalty: 70,
    defaultCompetence: 78,
    defaultScandalRisk: 18,
    indicatorBonus: { economy: 2 },
    resourceBonus: { money: 30 },
  },
  defense: {
    id: "defense",
    title: "Ministre de la Défense",
    name: "Gérard Vasseur",
    specialty: "Sécurité",
    specialtyColor: "#4a9fff",
    linkedBuildingId: "defense_ministry",
    defaultLoyalty: 80,
    defaultCompetence: 75,
    defaultScandalRisk: 10,
    indicatorBonus: { security: 2 },
    resourceBonus: { military: 8 },
  },
  affaires_etrangeres: {
    id: "affaires_etrangeres",
    title: "Min. des Affaires Étrangères",
    name: "Isabelle Fontaine",
    specialty: "Diplomatie",
    specialtyColor: "#a78bfa",
    linkedBuildingId: "diplomacy_ministry",
    defaultLoyalty: 68,
    defaultCompetence: 80,
    defaultScandalRisk: 12,
    indicatorBonus: { cohesion: 1 },
    resourceBonus: { influence: 10 },
  },
  ecologie: {
    id: "ecologie",
    title: "Ministre de l'Écologie",
    name: "Thomas Levert",
    specialty: "Écologie",
    specialtyColor: "#52c97a",
    linkedBuildingId: "energy_ministry",
    defaultLoyalty: 62,
    defaultCompetence: 70,
    defaultScandalRisk: 14,
    indicatorBonus: { ecology: 2 },
    resourceBonus: { energy: 15 },
  },
};

export const MINISTER_LIST: StrategyMinisterDef[] = Object.values(STRATEGY_MINISTERS);
