export type FactionId = "auroria" | "obscurium";
export type FactionAlignment = "guardian" | "predator";
export type FactionStatus = "dormant" | "observateur" | "actif" | "intervention_imminente";

export interface FactionDef {
  id: FactionId;
  name: string;
  alignment: FactionAlignment;
  description: string;
  intelligenceLevel: string;
  powers: string[];
  weaknesses: string[];
  color: string;
  secondaryColor: string;
  doctrine: string;
  interventionConditions: string[];
  statusThresholds: { observateur: number; actif: number; imminente: number };
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  auroria: {
    id: "auroria",
    name: "République d'Auroria",
    alignment: "guardian",
    description:
      "Civilisation protectrice venue d'une galaxie lointaine. Gardienne de l'équilibre, de la résilience, de la vie et de la stabilité des civilisations.",
    intelligenceLevel:
      "Post-humaine. Anticipe les crises systémiques, détecte les manipulations et calcule les conséquences politiques à des horizons inaccessibles à l'humanité.",
    powers: [
      "Prescience stratégique limitée",
      "Protection énergétique d'urgence",
      "Bouclier cyber temporaire",
      "Stabilisation climatique locale",
      "Détection de mensonge politique",
      "Amplification de la cohésion sociale",
      "Neutralisation partielle de la désinformation",
      "Aide scientifique avancée",
    ],
    weaknesses: [
      "N'intervient qu'en présence de transparence et de stabilité institutionnelle",
      "Influence nulle si la cohésion est inférieure à 40",
      "Recule face à la corruption ou aux décisions autoritaires répétées",
    ],
    color: "#4a9fff",
    secondaryColor: "#c9a84c",
    doctrine:
      "Aucune civilisation ne mérite d'être abandonnée à sa propre destruction. Mais Auroria n'aide que celles qui choisissent la lumière.",
    interventionConditions: [
      "Cohésion sociale ≥ 60",
      "Peu de scandales actifs",
      "Stabilité institutionnelle ≥ 60",
      "Cyberdéfense ≥ 50",
      "Promesses tenues majoritairement",
    ],
    statusThresholds: { observateur: 20, actif: 45, imminente: 70 },
  },
  obscurium: {
    id: "obscurium",
    name: "Obscurium",
    alignment: "predator",
    description:
      "Entité sombre, ancienne, manipulatrice. Elle infiltre, corrompt, divise et pousse les civilisations à s'autodétruire depuis des millénaires.",
    intelligenceLevel:
      "Prédatrice. Exploite peur, orgueil, mensonge, fatigue sociale, corruption et soif de pouvoir. Identifie les failles avec une précision chirurgicale.",
    powers: [
      "Manipulation de masse",
      "Cyberattaques non attribuables",
      "Sabotage industriel silencieux",
      "Corruption de ministres vulnérables",
      "Chantage énergétique indirect",
      "Amplification des conflits sociaux",
      "Fuite de documents secrets",
      "Brouillage des renseignements",
      "Crises en cascade",
      "Influence sur institutions fragilisées",
    ],
    weaknesses: [
      "Recule si transparence et cohésion sont élevées",
      "Affaiblie par une cyberdéfense forte",
      "Perd de l'influence si la confiance populaire dépasse 75",
    ],
    color: "#9b59b6",
    secondaryColor: "#e54848",
    doctrine:
      "Toute civilisation porte en elle les germes de sa propre chute. Obscurium ne fait qu'accélérer ce qui était déjà écrit.",
    interventionConditions: [
      "Risque de scandale ≥ 50",
      "Mensonge public ou doctrine autoritaire",
      "Fatigue populaire ≥ 60",
      "Cyberdéfense ≤ 40",
      "Crises ignorées ou médias hostiles",
    ],
    statusThresholds: { observateur: 20, actif: 45, imminente: 70 },
  },
};

export function getFactionStatus(influenceScore: number): FactionStatus {
  if (influenceScore >= 70) return "intervention_imminente";
  if (influenceScore >= 45) return "actif";
  if (influenceScore >= 20) return "observateur";
  return "dormant";
}

export const FACTION_STATUS_LABELS: Record<FactionStatus, string> = {
  dormant: "Dormant",
  observateur: "Observateur",
  actif: "Actif",
  intervention_imminente: "Intervention imminente",
};

export const FACTION_STATUS_COLORS: Record<FactionStatus, string> = {
  dormant: "#5e6678",
  observateur: "#e8a93a",
  actif: "#4a9fff",
  intervention_imminente: "#e54848",
};
