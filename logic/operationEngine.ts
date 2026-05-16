import type {
  CountryRelation,
  OperationDef,
  OperationResult,
  OperationType,
  PlayerBuilding,
  StrategyResources,
} from "@/types/strategy";

export const OPERATIONS: Record<OperationType, OperationDef> = {
  espionage: {
    id: "espionage",
    name: "Espionnage",
    description: "Collecte des informations sur un pays cible. Risque faible, gain en renseignement.",
    icon: "🕵️",
    cost: { intelligence: 20 },
    cooldown: 300, // 5min
    isOffensive: false,
  },
  steal_intel: {
    id: "steal_intel",
    name: "Vol de renseignements",
    description: "Vole des données stratégiques. Nécessite un bon réseau de renseignement.",
    icon: "📁",
    cost: { intelligence: 50, technology: 20 },
    cooldown: 900, // 15min
    isOffensive: true,
    requiredBuilding: { id: "intelligence_ministry", level: 2 },
  },
  cyber_attack: {
    id: "cyber_attack",
    name: "Cyberattaque",
    description: "Déstabilise les infrastructures numériques adverses. Résultat variable.",
    icon: "💻",
    cost: { cyberDefense: 30, technology: 40 },
    cooldown: 1800, // 30min
    isOffensive: true,
    requiredBuilding: { id: "cyber_ministry", level: 1 },
  },
  influence_campaign: {
    id: "influence_campaign",
    name: "Campagne d'influence",
    description: "Améliore l'image de la France à l'international. Gagne en relations.",
    icon: "📣",
    cost: { influence: 40, money: 200 },
    cooldown: 600, // 10min
    isOffensive: false,
    maxRelationScore: 60,
  },
  sabotage: {
    id: "sabotage",
    name: "Sabotage",
    description: "Perturbe les opérations d'un pays adverse. Action clandestine risquée.",
    icon: "🔥",
    cost: { intelligence: 60, military: 20 },
    cooldown: 3600, // 1h
    isOffensive: true,
    requiredBuilding: { id: "military_hq", level: 1 },
  },
  sanction: {
    id: "sanction",
    name: "Sanction économique",
    description: "Impose des sanctions qui affaiblissent l'économie adverse.",
    icon: "📉",
    cost: { money: 500, influence: 30 },
    cooldown: 7200, // 2h
    isOffensive: true,
    requiredBuilding: { id: "diplomacy_ministry", level: 3 },
  },
  sign_treaty: {
    id: "sign_treaty",
    name: "Traité diplomatique",
    description: "Signe un accord de coopération. Améliore fortement les relations.",
    icon: "✍️",
    cost: { influence: 80, money: 300 },
    cooldown: 3600,
    isOffensive: false,
    maxRelationScore: 30,
  },
  diplomatic_aid: {
    id: "diplomatic_aid",
    name: "Aide diplomatique",
    description: "Envoie une aide qui renforce les liens bilatéraux.",
    icon: "🤝",
    cost: { money: 400, influence: 20 },
    cooldown: 1800,
    isOffensive: false,
    maxRelationScore: 50,
  },
  reinforce_cyber: {
    id: "reinforce_cyber",
    name: "Renforcement cyber",
    description: "Renforce les défenses cybernétiques nationales.",
    icon: "🛡️",
    cost: { technology: 50, money: 200 },
    cooldown: 600,
    isOffensive: false,
  },
  military_operation: {
    id: "military_operation",
    name: "Opération militaire limitée",
    description: "Opération de force limitée. Haut risque, haut rendement.",
    icon: "⚔️",
    cost: { military: 80, money: 800, energy: 40 },
    cooldown: 14400, // 4h
    isOffensive: true,
    requiredBuilding: { id: "military_hq", level: 3 },
    maxRelationScore: -20,
  },
};

export function resolveOperation(
  type: OperationType,
  relation: CountryRelation,
  buildings: PlayerBuilding[],
  researchCompleted: string[] = [],
): OperationResult {
  const op = OPERATIONS[type];
  const successRate = computeSuccessRate(type, relation, buildings, researchCompleted);
  const success = Math.random() < successRate;

  if (type === "espionage") {
    return {
      success: true,
      message: success
        ? "Mission de renseignement réussie. Informations collectées."
        : "Informations partielles obtenues.",
      rewards: { intelligence: success ? 60 : 20, technology: success ? 10 : 0 },
      relationDelta: -5,
      rankingPoints: success ? 15 : 5,
      xp: success ? 20 : 8,
    };
  }

  if (type === "steal_intel") {
    return {
      success,
      message: success
        ? "Documents confidentiels exfiltrés avec succès."
        : "Opération compromise. Équipe repliée.",
      rewards: success ? { intelligence: 120, technology: 50 } : { intelligence: 10 },
      relationDelta: success ? -15 : -8,
      rankingPoints: success ? 30 : 5,
      xp: success ? 40 : 10,
    };
  }

  if (type === "cyber_attack") {
    return {
      success,
      message: success
        ? "Cyberattaque réussie. Infrastructures adverses perturbées."
        : "Attaque neutralisée par la cyberdéfense adverse.",
      rewards: success ? { technology: 60, intelligence: 40 } : { technology: 25 },
      relationDelta: success ? -20 : -10,
      rankingPoints: success ? 50 : 5,
      xp: success ? 60 : 15,
    };
  }

  if (type === "influence_campaign") {
    return {
      success: true,
      message: "Campagne d'influence lancée. L'image de la France s'améliore.",
      rewards: { influence: 30 },
      relationDelta: 12,
      rankingPoints: 20,
      xp: 25,
    };
  }

  if (type === "sabotage") {
    return {
      success,
      message: success
        ? "Sabotage réussi. Opérations adverses perturbées."
        : "Opération de sabotage échouée. Équipe compromise.",
      rewards: success ? { intelligence: 80, money: 200 } : {},
      relationDelta: success ? -25 : -12,
      rankingPoints: success ? 60 : 5,
      xp: success ? 70 : 15,
    };
  }

  if (type === "sanction") {
    return {
      success: true,
      message: "Sanctions économiques imposées. Pression sur l'adversaire.",
      rewards: { influence: 40 },
      relationDelta: -20,
      rankingPoints: 35,
      xp: 40,
    };
  }

  if (type === "sign_treaty") {
    return {
      success: true,
      message: "Traité signé. Partenariat renforcé.",
      rewards: { influence: 50, money: 300 },
      relationDelta: 30,
      rankingPoints: 40,
      xp: 50,
    };
  }

  if (type === "diplomatic_aid") {
    return {
      success: true,
      message: "Aide diplomatique envoyée. Relations améliorées.",
      rewards: { influence: 20 },
      relationDelta: 15,
      rankingPoints: 20,
      xp: 25,
    };
  }

  if (type === "reinforce_cyber") {
    return {
      success: true,
      message: "Défenses cybernétiques renforcées.",
      rewards: { cyberDefense: 60, technology: 20 },
      relationDelta: 0,
      rankingPoints: 25,
      xp: 30,
    };
  }

  if (type === "military_operation") {
    return {
      success,
      message: success
        ? "Opération militaire réussie. Objectifs atteints."
        : "Opération militaire échouée. Retraite ordonnée.",
      rewards: success ? { military: 100, money: 500, influence: 60 } : { military: 10 },
      relationDelta: success ? -35 : -20,
      rankingPoints: success ? 100 : 10,
      xp: success ? 120 : 20,
    };
  }

  return { success: false, message: "Opération inconnue.", rewards: {}, relationDelta: 0, rankingPoints: 0, xp: 0 };
}

function computeSuccessRate(
  type: OperationType,
  relation: CountryRelation,
  buildings: PlayerBuilding[],
  researchCompleted: string[] = [],
): number {
  const base: Record<OperationType, number> = {
    espionage: 0.85,
    steal_intel: 0.6,
    cyber_attack: 0.65,
    influence_campaign: 1,
    sabotage: 0.5,
    sanction: 1,
    sign_treaty: 1,
    diplomatic_aid: 1,
    reinforce_cyber: 1,
    military_operation: 0.55,
  };

  let rate = base[type] ?? 0.5;

  // Hostile countries are harder to operate against
  if (relation.status === "hostile") rate -= 0.15;
  if (relation.status === "rival") rate -= 0.08;
  if (relation.status === "allied") rate += 0.1;

  // Building bonuses
  const intel = buildings.find((b) => b.id === "intelligence_ministry")?.level ?? 0;
  const cyber = buildings.find((b) => b.id === "cyber_ministry")?.level ?? 0;
  const military = buildings.find((b) => b.id === "military_hq")?.level ?? 0;

  if (type === "espionage" || type === "steal_intel" || type === "sabotage") {
    rate += intel * 0.02;
  }
  if (type === "cyber_attack") {
    rate += cyber * 0.025;
  }
  if (type === "military_operation") {
    rate += military * 0.02;
  }

  // Research bonuses: each completed research that targets this operation adds +5%
  const RESEARCH_OP_MAP: Partial<Record<OperationType, string[]>> = {
    reinforce_cyber:    ["research_cybersec"],
    espionage:          ["research_drones"],
    steal_intel:        ["research_satellites"],
    military_operation: ["research_missile_defense", "research_missiles", "research_military_bases"],
    influence_campaign: ["research_infowar"],
  };
  const bonusResearches = RESEARCH_OP_MAP[type] ?? [];
  rate += bonusResearches.filter((r) => researchCompleted.includes(r)).length * 0.05;

  return Math.min(0.95, Math.max(0.05, rate));
}

export function updateRelationScore(
  current: number,
  delta: number,
): { score: number; status: CountryRelation["status"] } {
  const score = Math.max(-100, Math.min(100, current + delta));
  let status: CountryRelation["status"];
  if (score >= 60) status = "allied";
  else if (score >= 25) status = "friendly";
  else if (score >= -25) status = "neutral";
  else if (score >= -60) status = "rival";
  else status = "hostile";
  return { score, status };
}

export function canLaunchOperation(
  type: OperationType,
  relation: CountryRelation,
  buildings: PlayerBuilding[],
  resources: StrategyResources,
): { allowed: boolean; reason?: string } {
  const op = OPERATIONS[type];

  // Check cost
  for (const [key, amount] of Object.entries(op.cost) as [keyof StrategyResources, number][]) {
    if ((resources[key] ?? 0) < amount) {
      return { allowed: false, reason: `Ressources insuffisantes (${key})` };
    }
  }

  // Check required building
  if (op.requiredBuilding) {
    const b = buildings.find((b) => b.id === op.requiredBuilding!.id);
    if (!b || b.level < op.requiredBuilding.level) {
      return {
        allowed: false,
        reason: `Nécessite ${op.requiredBuilding.id} niveau ${op.requiredBuilding.level}`,
      };
    }
  }

  // Check relation constraints
  if (op.minRelationScore !== undefined && relation.score < op.minRelationScore) {
    return { allowed: false, reason: "Relations insuffisantes" };
  }
  if (op.maxRelationScore !== undefined && relation.score > op.maxRelationScore) {
    return { allowed: false, reason: "Relations déjà trop bonnes pour cette action" };
  }

  // Check cooldown
  const cooldownExpiry = relation.operationCooldowns[type];
  if (cooldownExpiry && Date.now() < cooldownExpiry) {
    return { allowed: false, reason: "Opération en cooldown" };
  }

  return { allowed: true };
}
