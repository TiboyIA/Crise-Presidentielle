import type { BuildingId, NationalIndicators, StrategyResources } from "@/types/strategy";

export type StrategyMinisterId =
  | "pm"
  | "economie"
  | "defense"
  | "affaires_etrangeres"
  | "ecologie"
  | "sante"
  | "cybersecurite"
  | "renseignement"
  | "interieur"
  | "industrie"
  | "communication";

// Which national indicator drives loyalty drift for this minister
export const MINISTER_INDICATOR: Record<StrategyMinisterId, keyof NationalIndicators> = {
  pm:                "popularity",
  economie:          "economy",
  defense:           "security",
  affaires_etrangeres: "cohesion",
  ecologie:          "ecology",
  sante:             "cohesion",
  cybersecurite:     "security",
  renseignement:     "security",
  interieur:         "popularity",
  industrie:         "economy",
  communication:     "popularity",
};

// Pool of replacements (2-3 per position) drawn when a minister is fired
export interface MinisterPoolEntry {
  name: string;
  loyalty: number;
  competence: number;
  scandalRisk: number;
}

export const MINISTER_POOL: Record<StrategyMinisterId, MinisterPoolEntry[]> = {
  pm: [
    { name: "Claire Dumont",   loyalty: 70, competence: 65, scandalRisk: 20 },
    { name: "Marc Lefebvre",   loyalty: 65, competence: 70, scandalRisk: 25 },
    { name: "Sophie Arnaud",   loyalty: 80, competence: 60, scandalRisk: 12 },
  ],
  economie: [
    { name: "Paul Bernard",    loyalty: 68, competence: 75, scandalRisk: 22 },
    { name: "Hélène Girard",   loyalty: 72, competence: 80, scandalRisk: 15 },
    { name: "Denis Moreau",    loyalty: 60, competence: 82, scandalRisk: 28 },
  ],
  defense: [
    { name: "Jean Perrin",     loyalty: 75, competence: 70, scandalRisk: 8  },
    { name: "Lucie Mercier",   loyalty: 68, competence: 78, scandalRisk: 14 },
    { name: "Robert Faure",    loyalty: 82, competence: 65, scandalRisk: 10 },
  ],
  affaires_etrangeres: [
    { name: "Anne Dupuis",     loyalty: 65, competence: 78, scandalRisk: 18 },
    { name: "Laurent Blanc",   loyalty: 70, competence: 74, scandalRisk: 16 },
    { name: "Marie Collet",    loyalty: 60, competence: 85, scandalRisk: 20 },
  ],
  ecologie: [
    { name: "Pierre Vidal",    loyalty: 58, competence: 68, scandalRisk: 16 },
    { name: "Nathalie Simon",  loyalty: 65, competence: 72, scandalRisk: 12 },
    { name: "Julien Roux",     loyalty: 70, competence: 65, scandalRisk: 18 },
  ],
  sante: [
    { name: "Caroline Dumas",  loyalty: 72, competence: 78, scandalRisk: 10 },
    { name: "Xavier Morel",    loyalty: 65, competence: 82, scandalRisk: 16 },
    { name: "Valérie Huet",    loyalty: 68, competence: 75, scandalRisk: 12 },
  ],
  cybersecurite: [
    { name: "Alexis Gauthier", loyalty: 70, competence: 85, scandalRisk: 8  },
    { name: "Laura Perrier",   loyalty: 62, competence: 90, scandalRisk: 14 },
    { name: "Samuel Aubry",    loyalty: 75, competence: 80, scandalRisk: 10 },
  ],
  renseignement: [
    { name: "Bernard Clément", loyalty: 78, competence: 80, scandalRisk: 12 },
    { name: "Christine Roy",   loyalty: 65, competence: 88, scandalRisk: 20 },
    { name: "Éric Bonnet",     loyalty: 72, competence: 76, scandalRisk: 15 },
  ],
  interieur: [
    { name: "Frédéric Colin",  loyalty: 68, competence: 72, scandalRisk: 22 },
    { name: "Martine Leconte", loyalty: 75, competence: 68, scandalRisk: 14 },
    { name: "Patrick Millet",  loyalty: 60, competence: 76, scandalRisk: 25 },
  ],
  industrie: [
    { name: "Gilles Renaud",   loyalty: 65, competence: 80, scandalRisk: 20 },
    { name: "Stéphanie Koch",  loyalty: 72, competence: 76, scandalRisk: 14 },
    { name: "Michel Gros",     loyalty: 58, competence: 84, scandalRisk: 28 },
  ],
  communication: [
    { name: "Julie Mercier",   loyalty: 70, competence: 70, scandalRisk: 18 },
    { name: "Benoît Laborde",  loyalty: 65, competence: 74, scandalRisk: 22 },
    { name: "Camille Pons",    loyalty: 78, competence: 68, scandalRisk: 12 },
  ],
};

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
  sante: {
    id: "sante",
    title: "Ministre de la Santé",
    name: "Élise Garnier",
    specialty: "Santé publique",
    specialtyColor: "#f472b6",
    defaultLoyalty: 68,
    defaultCompetence: 74,
    defaultScandalRisk: 10,
    indicatorBonus: { cohesion: 1, popularity: 1 },
    resourceBonus: {},
  },
  cybersecurite: {
    id: "cybersecurite",
    title: "Min. de la Cybersécurité",
    name: "Kevin Arnoux",
    specialty: "Cyber",
    specialtyColor: "#22d3ee",
    linkedBuildingId: "cyber_ministry",
    defaultLoyalty: 72,
    defaultCompetence: 82,
    defaultScandalRisk: 8,
    indicatorBonus: { security: 1 },
    resourceBonus: { cyberDefense: 10 },
  },
  renseignement: {
    id: "renseignement",
    title: "Directeur du Renseignement",
    name: "François Noel",
    specialty: "Renseignement",
    specialtyColor: "#818cf8",
    linkedBuildingId: "intelligence_ministry",
    defaultLoyalty: 76,
    defaultCompetence: 78,
    defaultScandalRisk: 12,
    indicatorBonus: {},
    resourceBonus: { intelligence: 10 },
  },
  interieur: {
    id: "interieur",
    title: "Ministre de l'Intérieur",
    name: "Olivier Bertrand",
    specialty: "Sécurité intérieure",
    specialtyColor: "#fb923c",
    defaultLoyalty: 65,
    defaultCompetence: 70,
    defaultScandalRisk: 20,
    indicatorBonus: { security: 1, popularity: 1 },
    resourceBonus: {},
  },
  industrie: {
    id: "industrie",
    title: "Ministre de l'Industrie",
    name: "Véronique Legrand",
    specialty: "Économie industrielle",
    specialtyColor: "#facc15",
    defaultLoyalty: 64,
    defaultCompetence: 76,
    defaultScandalRisk: 18,
    indicatorBonus: { economy: 1 },
    resourceBonus: { money: 15, technology: 5 },
  },
  communication: {
    id: "communication",
    title: "Min. de la Communication",
    name: "Aurélie Martin",
    specialty: "Médias",
    specialtyColor: "#f97316",
    defaultLoyalty: 70,
    defaultCompetence: 68,
    defaultScandalRisk: 16,
    indicatorBonus: { popularity: 2 },
    resourceBonus: { influence: 6 },
  },
};

export const MINISTER_LIST: StrategyMinisterDef[] = Object.values(STRATEGY_MINISTERS);
export const CABINET_PRIMARY: StrategyMinisterId[] = ["pm", "economie", "defense", "affaires_etrangeres", "ecologie"];
export const CABINET_SECONDARY: StrategyMinisterId[] = ["sante", "cybersecurite", "renseignement", "interieur", "industrie", "communication"];
