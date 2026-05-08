import type { BuildingDef, BuildingId, BuildingLevel, StrategyResources } from "@/types/strategy";

const UPGRADE_DURATIONS = [60, 300, 1200, 3600, 14400, 43200, 86400, 172800, 259200, 432000];
// 1min, 5min, 20min, 1h, 4h, 12h, 24h, 48h, 72h, 120h

function genLevels(
  baseCost: Partial<StrategyResources>,
  baseProduction: Partial<StrategyResources>,
  basePower: number,
): BuildingLevel[] {
  return Array.from({ length: 10 }, (_, i) => {
    const costFactor = Math.pow(2.2, i);
    const prodFactor = Math.pow(1.6, i);

    const cost: Partial<StrategyResources> = {};
    for (const [k, v] of Object.entries(baseCost) as [keyof StrategyResources, number][]) {
      cost[k] = Math.round(v * costFactor);
    }

    const production: Partial<StrategyResources> = {};
    for (const [k, v] of Object.entries(baseProduction) as [keyof StrategyResources, number][]) {
      production[k] = Math.round(v * prodFactor);
    }

    return {
      cost,
      upgradeDuration: UPGRADE_DURATIONS[i],
      production,
      powerBonus: Math.round(basePower * (i + 1) * 1.3),
    };
  });
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  presidential_palace: {
    id: "presidential_palace",
    name: "Palais Présidentiel",
    description: "Centre du pouvoir. Débloque les opérations avancées et augmente le prestige national.",
    icon: "🏛️",
    maxLevel: 10,
    levels: genLevels(
      { money: 500, influence: 50 },
      { influence: 2, money: 10 },
      20,
    ),
  },
  economy_ministry: {
    id: "economy_ministry",
    name: "Ministère de l'Économie",
    description: "Génère des revenus et renforce la stabilité financière nationale.",
    icon: "📊",
    maxLevel: 10,
    levels: genLevels(
      { money: 300, influence: 20 },
      { money: 30, influence: 2 },
      15,
    ),
  },
  defense_ministry: {
    id: "defense_ministry",
    name: "Ministère de la Défense",
    description: "Renforce la puissance militaire et la capacité de dissuasion.",
    icon: "🛡️",
    maxLevel: 10,
    levels: genLevels(
      { money: 400, military: 10 },
      { military: 8, energy: 2 },
      18,
    ),
  },
  intelligence_ministry: {
    id: "intelligence_ministry",
    name: "Ministère du Renseignement",
    description: "Collecte des informations stratégiques sur les pays adverses.",
    icon: "🔍",
    maxLevel: 10,
    levels: genLevels(
      { money: 250, influence: 15 },
      { intelligence: 6, technology: 2 },
      12,
    ),
  },
  cyber_ministry: {
    id: "cyber_ministry",
    name: "Ministère de la Cyberdéfense",
    description: "Protège les infrastructures numériques et permet les opérations cyber offensives.",
    icon: "💻",
    maxLevel: 10,
    levels: genLevels(
      { money: 350, technology: 20 },
      { cyberDefense: 7, intelligence: 3 },
      14,
    ),
    unlockRequirement: { buildingId: "intelligence_ministry", level: 2 },
  },
  energy_ministry: {
    id: "energy_ministry",
    name: "Ministère de l'Énergie",
    description: "Sécurise l'approvisionnement énergétique et réduit la dépendance étrangère.",
    icon: "⚡",
    maxLevel: 10,
    levels: genLevels(
      { money: 280, energy: 20 },
      { energy: 10, money: 15 },
      13,
    ),
  },
  diplomacy_ministry: {
    id: "diplomacy_ministry",
    name: "Ministère de la Diplomatie",
    description: "Améliore les relations internationales et l'influence géopolitique.",
    icon: "🤝",
    maxLevel: 10,
    levels: genLevels(
      { money: 200, influence: 30 },
      { influence: 5, money: 10 },
      11,
    ),
  },
  research_center: {
    id: "research_center",
    name: "Centre de Recherche",
    description: "Développe des technologies avancées qui améliorent toutes les capacités nationales.",
    icon: "🔬",
    maxLevel: 10,
    levels: genLevels(
      { money: 400, technology: 30 },
      { technology: 5, intelligence: 2 },
      16,
    ),
  },
  central_bank: {
    id: "central_bank",
    name: "Banque Centrale",
    description: "Génère d'importants revenus financiers et stabilise l'économie.",
    icon: "🏦",
    maxLevel: 10,
    levels: genLevels(
      { money: 800, influence: 40 },
      { money: 80, influence: 3 },
      22,
    ),
    unlockRequirement: { buildingId: "economy_ministry", level: 2 },
  },
  media_agency: {
    id: "media_agency",
    name: "Agence des Médias",
    description: "Contrôle le narratif national et projette l'influence à l'international.",
    icon: "📡",
    maxLevel: 10,
    levels: genLevels(
      { money: 220, influence: 25 },
      { influence: 6, money: 8 },
      10,
    ),
    unlockRequirement: { buildingId: "diplomacy_ministry", level: 2 },
  },
  military_hq: {
    id: "military_hq",
    name: "Quartier Général Militaire",
    description: "Coordonne les forces armées et débloque les opérations militaires avancées.",
    icon: "⚔️",
    maxLevel: 10,
    levels: genLevels(
      { money: 600, military: 30 },
      { military: 12, energy: 4 },
      25,
    ),
    unlockRequirement: { buildingId: "defense_ministry", level: 2 },
  },
};

export const BUILDING_LIST = Object.values(BUILDINGS);

export const INITIAL_BUILDINGS: Array<{ id: BuildingId; level: number }> = [
  { id: "presidential_palace", level: 1 },
  { id: "economy_ministry", level: 1 },
  { id: "defense_ministry", level: 1 },
  { id: "intelligence_ministry", level: 1 },
  { id: "energy_ministry", level: 1 },
  { id: "diplomacy_ministry", level: 1 },
  { id: "research_center", level: 1 },
  // These start locked (level 0) until unlock requirements met
  { id: "cyber_ministry", level: 0 },
  { id: "central_bank", level: 0 },
  { id: "media_agency", level: 0 },
  { id: "military_hq", level: 0 },
];
