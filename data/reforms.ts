import type { HiddenPolitics, NationalIndicators, ReformId, StrategyResources } from "@/types/strategy";

export type ReformCategory = "economique" | "sociale" | "securite" | "technologique" | "diplomatique";

export interface ReformDef {
  id: ReformId;
  name: string;
  icon: string;    // MaterialCommunityIcons name
  category: ReformCategory;
  description: string;
  durationDays: number;  // mandate days to complete
  cost: Partial<StrategyResources>;
  // One-time boost applied when reform completes
  indicatorBoost: Partial<NationalIndicators>;
  hiddenEffect: Partial<HiddenPolitics>;
  resourceBoost: Partial<StrategyResources>;
  tension: string;  // displayed negative side effect
}

export const REFORMS: Record<ReformId, ReformDef> = {
  fiscal: {
    id: "fiscal",
    name: "Réforme fiscale",
    icon: "bank-outline",
    category: "economique",
    description: "Restructuration de la fiscalité nationale pour stimuler la croissance et réduire les inégalités.",
    durationDays: 15,
    cost: { money: 500, influence: 30 },
    indicatorBoost: { economy: 8, publicBudget: 15, popularity: -3 },
    hiddenEffect: { eliteTrust: 5, popularFatigue: 3 },
    resourceBoost: { money: 200 },
    tension: "Opposition des classes moyennes, risque de conflit social",
  },
  securite: {
    id: "securite",
    name: "Réforme sécuritaire",
    icon: "shield-check",
    category: "securite",
    description: "Renforcement des capacités policières, judiciaires et de renseignement national.",
    durationDays: 12,
    cost: { money: 400, military: 20 },
    indicatorBoost: { security: 10, cohesion: -2 },
    hiddenEffect: { institutionalStability: 5, popularFatigue: 2 },
    resourceBoost: { military: 30 },
    tension: "Tensions civiles, critiques des ONG et de l'opposition",
  },
  energie: {
    id: "energie",
    name: "Réforme énergétique",
    icon: "lightning-bolt",
    category: "technologique",
    description: "Transition vers une production d'énergie souveraine, durable et stratégiquement indépendante.",
    durationDays: 20,
    cost: { money: 600, technology: 40 },
    indicatorBoost: { ecology: 10, economy: 3, publicBudget: -10 },
    hiddenEffect: { mediaMood: 5, eliteTrust: 2 },
    resourceBoost: { energy: 100, technology: 20 },
    tension: "Coût budgétaire élevé, transition industrielle difficile",
  },
  industrie: {
    id: "industrie",
    name: "Réforme industrielle",
    icon: "factory",
    category: "economique",
    description: "Relocalisation industrielle massive et soutien aux filières stratégiques nationales.",
    durationDays: 25,
    cost: { money: 800, energy: 50 },
    indicatorBoost: { economy: 12, cohesion: 4, ecology: -5 },
    hiddenEffect: { eliteTrust: 3, popularFatigue: -3 },
    resourceBoost: { money: 400 },
    tension: "Tensions écologiques, pression des lobbies internationaux",
  },
  cyber: {
    id: "cyber",
    name: "Réforme cyber-sécurité",
    icon: "shield-bug",
    category: "technologique",
    description: "Modernisation en profondeur des défenses numériques et des systèmes d'information critiques.",
    durationDays: 10,
    cost: { money: 300, technology: 30 },
    indicatorBoost: { security: 5, economy: 2 },
    hiddenEffect: { institutionalStability: 3 },
    resourceBoost: { cyberDefense: 40, technology: 15 },
    tension: "Résistance des opérateurs privés, coût de migration",
  },
  diplomatique: {
    id: "diplomatique",
    name: "Réforme diplomatique",
    icon: "handshake",
    category: "diplomatique",
    description: "Repositionnement stratégique de la politique étrangère et restructuration des alliances.",
    durationDays: 18,
    cost: { money: 350, influence: 60 },
    indicatorBoost: { cohesion: 3, economy: 4 },
    hiddenEffect: { eliteTrust: 4, mediaMood: 3 },
    resourceBoost: { influence: 80 },
    tension: "Frictions avec les alliés traditionnels",
  },
  sociale: {
    id: "sociale",
    name: "Réforme sociale",
    icon: "account-group",
    category: "sociale",
    description: "Renforcement des services publics, de la protection sociale et du pacte national.",
    durationDays: 15,
    cost: { money: 500, influence: 40 },
    indicatorBoost: { popularity: 8, cohesion: 6, publicBudget: -20 },
    hiddenEffect: { popularFatigue: -5, mediaMood: 4 },
    resourceBoost: {},
    tension: "Déficit budgétaire accru, opposition fiscale des entreprises",
  },
  education: {
    id: "education",
    name: "Réforme éducative",
    icon: "school-outline",
    category: "sociale",
    description: "Modernisation du système éducatif national pour préparer les générations futures.",
    durationDays: 20,
    cost: { money: 450, technology: 20 },
    indicatorBoost: { cohesion: 5, economy: 3, ecology: 2 },
    hiddenEffect: { eliteTrust: 3, popularFatigue: -2 },
    resourceBoost: { technology: 30 },
    tension: "Résistance syndicale, transition longue et complexe",
  },
};

export const REFORM_LIST: ReformDef[] = Object.values(REFORMS);

export const CATEGORY_COLOR: Record<ReformCategory, string> = {
  economique:    "#3fbe7a",
  sociale:       "#a78bfa",
  securite:      "#4a9fff",
  technologique: "#52c97a",
  diplomatique:  "#c9a84c",
};
