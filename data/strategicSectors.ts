/**
 * strategicSectors.ts — Définitions statiques des 8 secteurs stratégiques (MODE DELTA).
 *
 * Chaque secteur a des poids d'impact, des icônes d'affichage
 * et des valeurs initiales de départ.
 *
 * Aucune donnée réelle de commerce international.
 * Aucun pays nommé comme fournisseur ou concurrent.
 */

export type SectorId =
  | "energie"
  | "alimentation"
  | "medicaments"
  | "semi_conducteurs"
  | "defense"
  | "telecommunications"
  | "transport"
  | "materiaux_critiques";

export const SECTOR_IDS: SectorId[] = [
  "energie",
  "alimentation",
  "medicaments",
  "semi_conducteurs",
  "defense",
  "telecommunications",
  "transport",
  "materiaux_critiques",
];

export interface SectorDef {
  id:              SectorId;
  name:            string;
  icon:            string;   // MaterialCommunityIcons name
  inflationWeight: number;   // 0-1 — amplification inflation lors d'une rupture
  economyWeight:   number;   // 0-1 — impact économique lors d'une rupture
  initialDependency:  number;   // 0-100 — dépendance initiale aux importations
  initialStock:       number;   // 0-100 — réserves stratégiques initiales
  initialCapacity:    number;   // 0-100 — capacité de production nationale initiale
  initialDisruption:  number;   // 0-100 — risque de rupture initial
}

export const STRATEGIC_SECTORS: Record<SectorId, SectorDef> = {
  energie: {
    id: "energie", name: "Énergie", icon: "flash",
    inflationWeight: 0.9, economyWeight: 0.8,
    initialDependency: 45, initialStock: 55, initialCapacity: 50, initialDisruption: 25,
  },
  alimentation: {
    id: "alimentation", name: "Alimentation", icon: "food-apple",
    inflationWeight: 0.7, economyWeight: 0.5,
    initialDependency: 30, initialStock: 60, initialCapacity: 65, initialDisruption: 15,
  },
  medicaments: {
    id: "medicaments", name: "Médicaments", icon: "pill",
    inflationWeight: 0.4, economyWeight: 0.35,
    initialDependency: 55, initialStock: 50, initialCapacity: 35, initialDisruption: 30,
  },
  semi_conducteurs: {
    id: "semi_conducteurs", name: "Semi-conducteurs", icon: "cpu-64-bit",
    inflationWeight: 0.5, economyWeight: 0.9,
    initialDependency: 70, initialStock: 40, initialCapacity: 20, initialDisruption: 40,
  },
  defense: {
    id: "defense", name: "Défense", icon: "shield-half-full",
    inflationWeight: 0.2, economyWeight: 0.4,
    initialDependency: 35, initialStock: 65, initialCapacity: 55, initialDisruption: 20,
  },
  telecommunications: {
    id: "telecommunications", name: "Télécommunications", icon: "wifi",
    inflationWeight: 0.3, economyWeight: 0.6,
    initialDependency: 40, initialStock: 55, initialCapacity: 45, initialDisruption: 22,
  },
  transport: {
    id: "transport", name: "Transport", icon: "truck-outline",
    inflationWeight: 0.6, economyWeight: 0.6,
    initialDependency: 25, initialStock: 50, initialCapacity: 70, initialDisruption: 15,
  },
  materiaux_critiques: {
    id: "materiaux_critiques", name: "Matériaux critiques", icon: "cube-outline",
    inflationWeight: 0.5, economyWeight: 0.7,
    initialDependency: 65, initialStock: 35, initialCapacity: 25, initialDisruption: 38,
  },
};
