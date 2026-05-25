export type TrainingId =
  | "training_crisis"
  | "training_cyber"
  | "training_communication"
  | "training_coordination"
  | "training_budget";

export interface TrainingEffect {
  competenceDelta?: number;   // positif, plafonné à 90 à l'application
  loyaltyDelta?: number;      // positif, plafonné à 90
  scandalRiskDelta?: number;  // négatif (réduction), plancher à 5
}

export interface TrainingProgram {
  id: TrainingId;
  name: string;
  description: string;
  targetSkill: string;
  costMoney?: number;
  costInfluence?: number;
  durationActions: number;   // nombre d'actions joueur avant complétion
  fatigueCost: number;       // fatigue immédiate à l'inscription (points)
  effect: TrainingEffect;
  prerequisite?: {
    minCompetence?: number;
    maxScandalRisk?: number;
  };
}

export const TRAINING_PROGRAMS: Record<TrainingId, TrainingProgram> = {
  training_crisis: {
    id: "training_crisis",
    name: "Gestion de crise",
    description: "Améliore la réactivité et l'absorption des crises majeures.",
    targetSkill: "Compétence crise",
    costMoney: 90,
    durationActions: 10,
    fatigueCost: 25,
    effect: { competenceDelta: 6 },
  },
  training_cyber: {
    id: "training_cyber",
    name: "Cybersécurité",
    description: "Réduit la vulnérabilité personnelle aux incidents numériques.",
    targetSkill: "Résilience cyber",
    costMoney: 70,
    durationActions: 8,
    fatigueCost: 20,
    effect: { competenceDelta: 4, scandalRiskDelta: -3 },
  },
  training_communication: {
    id: "training_communication",
    name: "Communication publique",
    description: "Réduit le risque de gaffes et d'erreurs médiatiques.",
    targetSkill: "Maîtrise médias",
    costInfluence: 45,
    durationActions: 7,
    fatigueCost: 15,
    effect: { scandalRiskDelta: -10 },
  },
  training_coordination: {
    id: "training_coordination",
    name: "Coordination interministérielle",
    description: "Renforce l'alignement et réduit les tensions internes au cabinet.",
    targetSkill: "Cohésion équipe",
    costInfluence: 35,
    durationActions: 8,
    fatigueCost: 18,
    effect: { loyaltyDelta: 8 },
  },
  training_budget: {
    id: "training_budget",
    name: "Gestion budgétaire",
    description: "Améliore la maîtrise des enjeux économiques du portefeuille.",
    targetSkill: "Efficacité économique",
    costMoney: 75,
    durationActions: 9,
    fatigueCost: 22,
    effect: { competenceDelta: 5 },
  },
};

export const TRAINING_LIST: TrainingProgram[] = Object.values(TRAINING_PROGRAMS);
