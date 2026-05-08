import type { UnitDef, UnitId } from "@/types/units";

export const UNITS: Record<UnitId, UnitDef> = {
  infantry_mechanized: {
    id: "infantry_mechanized",
    name: "Infanterie mécanisée",
    branch: "land",
    roles: ["defense", "assault"],
    rarity: "common",
    description: "Unité terrestre de base, polyvalente, utile pour sécuriser le territoire et soutenir les opérations limitées.",
    baseCost: { money: 150, military: 5 },
    trainingTimeSec: 1800,      // 30 min
    maxLevel: 10,
    power: 10, attack: 8, defense: 12, speed: 8, stealth: 2, range: 2,
    upkeepPerDay: { money: 5 },
    strengths: ["Peu chère", "Rapide à former", "Défense intérieure"],
    weaknesses: ["Faible contre chars", "Faible contre aviation"],
    tags: ["land", "light", "versatile"],
  },

  special_forces: {
    id: "special_forces",
    name: "Forces spéciales",
    branch: "land",
    roles: ["special_operation", "reconnaissance"],
    rarity: "rare",
    description: "Unité d'élite utilisée pour les opérations discrètes, le renseignement et les missions sensibles.",
    unlockRequirement: { buildingId: "intelligence_ministry", level: 2 },
    baseCost: { money: 500, military: 20, intelligence: 15 },
    trainingTimeSec: 7200,      // 2h
    maxLevel: 10,
    power: 25, attack: 20, defense: 12, speed: 16, stealth: 20, range: 4,
    upkeepPerDay: { money: 20, intelligence: 5 },
    strengths: ["Forte en opérations secrètes", "Bonne furtivité", "Missions de renseignement"],
    weaknesses: ["Coûteuse", "Faible en guerre conventionnelle massive"],
    tags: ["land", "elite", "stealth", "espionage"],
  },

  battle_tank: {
    id: "battle_tank",
    name: "Char de combat",
    branch: "land",
    roles: ["assault", "deterrence"],
    rarity: "uncommon",
    description: "Unité lourde de projection terrestre, efficace pour la dissuasion et les opérations de force.",
    unlockRequirement: { buildingId: "defense_ministry", level: 2 },
    baseCost: { money: 800, military: 35, energy: 10 },
    trainingTimeSec: 10800,     // 3h
    maxLevel: 10,
    power: 35, attack: 35, defense: 30, speed: 6, stealth: 1, range: 4,
    upkeepPerDay: { money: 25, energy: 5 },
    strengths: ["Attaque élevée", "Défense élevée", "Intimidation diplomatique"],
    weaknesses: ["Cher", "Lent", "Vulnérable aux drones et aviation"],
    tags: ["land", "heavy", "armored"],
  },

  long_range_artillery: {
    id: "long_range_artillery",
    name: "Artillerie longue portée",
    branch: "land",
    roles: ["deterrence", "support"],
    rarity: "uncommon",
    description: "Système d'appui capable de renforcer la pression militaire et la défense stratégique.",
    unlockRequirement: { buildingId: "defense_ministry", level: 3 },
    baseCost: { money: 700, military: 25, technology: 10 },
    trainingTimeSec: 9600,      // 2h40
    maxLevel: 10,
    power: 30, attack: 32, defense: 12, speed: 3, stealth: 1, range: 10,
    upkeepPerDay: { money: 20, energy: 3 },
    strengths: ["Portée élevée", "Bonus défense régionale", "Soutien opérations"],
    weaknesses: ["Faible mobilité", "Nécessite protection"],
    tags: ["land", "ranged", "support"],
  },

  military_drone: {
    id: "military_drone",
    name: "Drone militaire",
    branch: "air",
    roles: ["reconnaissance", "support"],
    rarity: "uncommon",
    description: "Drone de surveillance et d'appui, utile pour espionnage, reconnaissance et opérations hybrides.",
    unlockRequirement: { buildingId: "cyber_ministry", level: 1 },
    baseCost: { money: 450, technology: 15, cyberDefense: 5 },
    trainingTimeSec: 6000,      // 1h40
    maxLevel: 10,
    power: 22, attack: 10, defense: 8, speed: 18, stealth: 14, range: 8,
    upkeepPerDay: { money: 12, technology: 2 },
    strengths: ["Reconnaissance", "Coût raisonnable", "Augmente chance espionnage"],
    weaknesses: ["Vulnérable cyberdéfense", "Vulnérable anti-aérien"],
    tags: ["air", "unmanned", "recon", "cyber"],
  },

  multirole_fighter: {
    id: "multirole_fighter",
    name: "Chasseur multirôle",
    branch: "air",
    roles: ["assault", "defense"],
    rarity: "rare",
    description: "Avion de combat moderne utilisé pour supériorité aérienne, dissuasion et projection de puissance.",
    unlockRequirement: { buildingId: "military_hq", level: 2 },
    baseCost: { money: 1400, military: 50, energy: 25, technology: 20 },
    trainingTimeSec: 18000,     // 5h
    maxLevel: 10,
    power: 50, attack: 48, defense: 28, speed: 25, stealth: 8, range: 9,
    upkeepPerDay: { money: 50, energy: 15, military: 5 },
    strengths: ["Attaque élevée", "Défense aérienne", "Forte puissance globale"],
    weaknesses: ["Cher", "Long à former", "Entretien élevé"],
    tags: ["air", "fighter", "deterrence"],
  },

  attack_helicopter: {
    id: "attack_helicopter",
    name: "Hélicoptère d'attaque",
    branch: "air",
    roles: ["support", "assault"],
    rarity: "uncommon",
    description: "Unité mobile utile pour soutien rapide, crise intérieure, catastrophe et opération limitée.",
    unlockRequirement: { buildingId: "military_hq", level: 1 },
    baseCost: { money: 850, military: 30, energy: 20 },
    trainingTimeSec: 10800,     // 3h
    maxLevel: 10,
    power: 32, attack: 28, defense: 16, speed: 18, stealth: 4, range: 5,
    upkeepPerDay: { money: 30, energy: 8 },
    strengths: ["Rapide", "Utile en crise nationale", "Bon soutien terrestre"],
    weaknesses: ["Vulnérable anti-aérien", "Puissance moyenne"],
    tags: ["air", "rotary", "support", "crisis"],
  },

  frigate: {
    id: "frigate",
    name: "Frégate",
    branch: "naval",
    roles: ["defense", "deterrence"],
    rarity: "rare",
    description: "Navire polyvalent capable de protéger les routes maritimes, projeter de la puissance et soutenir la diplomatie navale.",
    unlockRequirement: { buildingId: "diplomacy_ministry", level: 2 },
    baseCost: { money: 1800, military: 60, energy: 35, technology: 20 },
    trainingTimeSec: 25200,     // 7h
    maxLevel: 10,
    power: 55, attack: 38, defense: 45, speed: 10, stealth: 4, range: 12,
    upkeepPerDay: { money: 60, energy: 12, military: 5 },
    strengths: ["Défense maritime", "Dissuasion", "Influence diplomatique"],
    weaknesses: ["Chère", "Dépend des infrastructures navales"],
    tags: ["naval", "surface", "deterrence"],
  },

  submarine: {
    id: "submarine",
    name: "Sous-marin",
    branch: "naval",
    roles: ["deterrence", "reconnaissance"],
    rarity: "epic",
    description: "Unité discrète de dissuasion et de renseignement maritime, puissante mais coûteuse.",
    unlockRequirement: { buildingId: "military_hq", level: 3 },
    baseCost: { money: 2600, military: 75, technology: 40, energy: 30 },
    trainingTimeSec: 36000,     // 10h
    maxLevel: 10,
    power: 70, attack: 55, defense: 35, speed: 8, stealth: 30, range: 14,
    upkeepPerDay: { money: 80, energy: 20, technology: 5 },
    strengths: ["Furtivité maximale", "Dissuasion stratégique", "Renseignement maritime"],
    weaknesses: ["Très cher", "Lent à former", "Entretien élevé"],
    tags: ["naval", "submarine", "stealth", "deterrence"],
  },

  cyber_unit: {
    id: "cyber_unit",
    name: "Unité cyber offensive",
    branch: "support",
    roles: ["cyber", "support"],
    rarity: "rare",
    description: "Cellule spécialisée dans les opérations numériques, la neutralisation d'infrastructures et la guerre hybride.",
    unlockRequirement: { buildingId: "cyber_ministry", level: 2 },
    baseCost: { money: 1000, intelligence: 50, technology: 35, cyberDefense: 20 },
    trainingTimeSec: 14400,     // 4h
    maxLevel: 10,
    power: 40, attack: 35, defense: 10, speed: 20, stealth: 25, range: 20,
    upkeepPerDay: { money: 35, technology: 8, cyberDefense: 5 },
    strengths: ["Cyberattaque", "Sabotage numérique", "Soutien opérations secrètes"],
    weaknesses: ["Faible en combat conventionnel", "Risque diplomatique et scandale"],
    tags: ["support", "cyber", "stealth", "hybrid"],
  },
};

export const UNIT_LIST: UnitDef[] = Object.values(UNITS);

export const BRANCH_ORDER = ["land", "air", "naval", "support"] as const;

export const BRANCH_LABELS: Record<string, string> = {
  land: "Terre", air: "Air", naval: "Mer", support: "Soutien",
};

export const BRANCH_COLORS: Record<string, string> = {
  land:    "#c9a84c",
  air:     "#4a9fff",
  naval:   "#52c97a",
  support: "#a78bfa",
};

export const RARITY_COLORS: Record<string, string> = {
  common:    "#9aa3b5",
  uncommon:  "#4a9fff",
  rare:      "#a78bfa",
  epic:      "#f59a3a",
  strategic: "#c9a84c",
};

export const RARITY_LABELS: Record<string, string> = {
  common:    "Commune",
  uncommon:  "Peu commune",
  rare:      "Rare",
  epic:      "Épique",
  strategic: "Stratégique",
};
