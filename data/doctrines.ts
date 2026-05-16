import type { GovernanceDoctrine, HiddenPolitics, NationalIndicators, StrategyResources } from "@/types/strategy";

export interface GovernanceDef {
  id: GovernanceDoctrine;
  name: string;
  icon: string;    // MaterialCommunityIcons name
  color: string;
  description: string;
  slogan: string;
  // Passive effects applied every 10 mandate days
  indicatorDrift: Partial<NationalIndicators>;
  hiddenDrift: Partial<HiddenPolitics>;
  resourceBonus: Partial<StrategyResources>;
  // One-time cost to switch doctrine
  switchCost: Partial<StrategyResources>;
  risks: string;
}

export const DOCTRINES: Record<GovernanceDoctrine, GovernanceDef> = {
  democratique: {
    id: "democratique",
    name: "Démocratie libérale",
    icon: "vote-outline",
    color: "#4a9fff",
    description: "Institutions fortes, libertés garanties, consensus social et médiatique.",
    slogan: "La force par le consensus",
    indicatorDrift: { popularity: 1, cohesion: 1 },
    hiddenDrift: { mediaMood: 2, eliteTrust: 1 },
    resourceBonus: { influence: 5 },
    switchCost: { influence: 50 },
    risks: "Lenteur décisionnelle, vulnérable aux populistes",
  },
  technocratique: {
    id: "technocratique",
    name: "Technocratie",
    icon: "cog-outline",
    color: "#3fbe7a",
    description: "Gouvernance par les experts. Efficience économique et technologique prioritaire.",
    slogan: "La compétence avant tout",
    indicatorDrift: { economy: 2, ecology: 1, popularity: -1 },
    hiddenDrift: { eliteTrust: 3, popularFatigue: 1 },
    resourceBonus: { technology: 3, money: 10 },
    switchCost: { money: 300, technology: 30 },
    risks: "Déconnexion populaire, faible popularité si résultats tardent",
  },
  securitaire: {
    id: "securitaire",
    name: "État sécuritaire",
    icon: "shield-lock-outline",
    color: "#ff8040",
    description: "Priorité absolue à la sécurité nationale, à la défense et à l'ordre public.",
    slogan: "Ordre et protection avant tout",
    indicatorDrift: { security: 2, cohesion: -1 },
    hiddenDrift: { institutionalStability: 2, popularFatigue: 1, mediaMood: -1 },
    resourceBonus: { military: 5, cyberDefense: 3 },
    switchCost: { money: 200, military: 30 },
    risks: "Restrictions civiles, tension avec médias et opposition",
  },
  populiste: {
    id: "populiste",
    name: "Populisme national",
    icon: "account-voice",
    color: "#c9a84c",
    description: "Le peuple avant tout — discours direct, réformes rapides, anti-élites.",
    slogan: "Le peuple décide, nous exécutons",
    indicatorDrift: { popularity: 3, cohesion: -2, economy: -1 },
    hiddenDrift: { mediaMood: -2, eliteTrust: -3, scandalRisk: 2 },
    resourceBonus: { influence: 8 },
    switchCost: { money: 150, influence: 30 },
    risks: "Instabilité institutionnelle, crises médiatiques fréquentes",
  },
  autoritaire: {
    id: "autoritaire",
    name: "Régime autoritaire",
    icon: "gavel",
    color: "#e8a93a",
    description: "Contrôle centralisé absolu. Décisions rapides, opposition neutralisée.",
    slogan: "Efficacité sans compromis",
    indicatorDrift: { security: 1, cohesion: -3, ecology: -1, popularity: -2 },
    hiddenDrift: { eliteTrust: -4, mediaMood: -5, institutionalStability: -2, scandalRisk: 3 },
    resourceBonus: { military: 8, money: 15 },
    switchCost: { money: 100, military: 50 },
    risks: "Isolement diplomatique, crises internes graves, scandales élevés",
  },
  souverainiste: {
    id: "souverainiste",
    name: "Souveraineté nationale",
    icon: "flag-outline",
    color: "#6b8cce",
    description: "Primauté de l'intérêt national. Méfiance envers le multilatéralisme, renforcement des frontières.",
    slogan: "La France d'abord, toujours",
    indicatorDrift: { security: 1, cohesion: 1, economy: -1 },
    hiddenDrift: { institutionalStability: 2, eliteTrust: -2, mediaMood: -1 },
    resourceBonus: { influence: 6, intelligence: 3 },
    switchCost: { money: 200, influence: 40 },
    risks: "Isolement diplomatique, tensions avec partenaires européens",
  },
  ecologiste: {
    id: "ecologiste",
    name: "Transition verte",
    icon: "leaf-outline",
    color: "#4caf50",
    description: "Sobriété, énergies renouvelables et critères environnementaux au cœur des décisions.",
    slogan: "Gouverner pour les générations futures",
    indicatorDrift: { ecology: 3, popularity: 1, economy: -1 },
    hiddenDrift: { mediaMood: 2, popularFatigue: -1, scandalRisk: -1 },
    resourceBonus: { energy: 5, influence: 3 },
    switchCost: { money: 250, energy: 20 },
    risks: "Résistance industrielle, coûts de transition élevés à court terme",
  },
  liberal: {
    id: "liberal",
    name: "Libéralisme économique",
    icon: "chart-line",
    color: "#26c6da",
    description: "Marché libre, attractivité étrangère, privatisations ciblées et compétitivité.",
    slogan: "La croissance libère tout le reste",
    indicatorDrift: { economy: 3, cohesion: -2, ecology: -1 },
    hiddenDrift: { eliteTrust: 4, popularFatigue: 2, scandalRisk: 1 },
    resourceBonus: { money: 20, technology: 2 },
    switchCost: { money: 350 },
    risks: "Creusement des inégalités, tensions sociales",
  },
};

export const DOCTRINE_LIST: GovernanceDef[] = Object.values(DOCTRINES);
