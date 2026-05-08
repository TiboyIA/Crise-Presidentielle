import type { MissionDef } from "@/types/strategy";

export const MISSION_POOL: MissionDef[] = [
  {
    id: "upgrade_any_building",
    title: "Modernisation nationale",
    description: "Améliorez l'un de vos bâtiments.",
    type: "upgrade_building",
    target: { amount: 1 },
    reward: { money: 500, influence: 20 },
    rewardPoints: 50,
  },
  {
    id: "upgrade_economy",
    title: "Réforme économique",
    description: "Améliorez le Ministère de l'Économie.",
    type: "upgrade_building",
    target: { amount: 1, buildingId: "economy_ministry" },
    reward: { money: 800, influence: 30 },
    rewardPoints: 80,
  },
  {
    id: "upgrade_defense",
    title: "Renforcement militaire",
    description: "Améliorez le Ministère de la Défense.",
    type: "upgrade_building",
    target: { amount: 1, buildingId: "defense_ministry" },
    reward: { military: 50, money: 400 },
    rewardPoints: 80,
  },
  {
    id: "spy_operation",
    title: "Opération de renseignement",
    description: "Espionnez un pays adverse.",
    type: "spy_country",
    target: { amount: 1 },
    reward: { intelligence: 80, technology: 20 },
    rewardPoints: 60,
  },
  {
    id: "win_cyber",
    title: "Cyber-offensive",
    description: "Lancez une cyberattaque réussie.",
    type: "win_operation",
    target: { amount: 1, operationType: "cyber_attack" },
    reward: { cyberDefense: 50, technology: 40 },
    rewardPoints: 100,
  },
  {
    id: "collect_money",
    title: "Revenus fiscaux",
    description: "Accumulez 2 000 d'argent.",
    type: "collect_resources",
    target: { amount: 2000, resourceKey: "money" },
    reward: { influence: 40, technology: 15 },
    rewardPoints: 40,
  },
  {
    id: "collect_intel",
    title: "Réseau de renseignement",
    description: "Accumulez 200 de renseignement.",
    type: "collect_resources",
    target: { amount: 200, resourceKey: "intelligence" },
    reward: { money: 300, influence: 25 },
    rewardPoints: 45,
  },
  {
    id: "reach_power_200",
    title: "Montée en puissance",
    description: "Atteignez une puissance globale de 200.",
    type: "reach_power",
    target: { minPower: 200 },
    reward: { money: 1000, influence: 50 },
    rewardPoints: 120,
  },
  {
    id: "influence_campaign",
    title: "Diplomatie active",
    description: "Lancez une campagne d'influence.",
    type: "launch_operation",
    target: { amount: 1, operationType: "influence_campaign" },
    reward: { influence: 100, money: 200 },
    rewardPoints: 70,
  },
  {
    id: "reinforce_defense",
    title: "Bouclier cyber",
    description: "Renforcez votre cyberdéfense.",
    type: "reinforce_defense",
    target: { amount: 1 },
    reward: { cyberDefense: 80, technology: 30 },
    rewardPoints: 60,
  },
  {
    id: "sign_treaty",
    title: "Alliance stratégique",
    description: "Signez un traité avec un pays.",
    type: "launch_operation",
    target: { amount: 1, operationType: "sign_treaty" },
    reward: { influence: 120, money: 300 },
    rewardPoints: 90,
  },
  {
    id: "collect_energy",
    title: "Autonomie énergétique",
    description: "Accumulez 300 d'énergie.",
    type: "collect_resources",
    target: { amount: 300, resourceKey: "energy" },
    reward: { money: 400, military: 20 },
    rewardPoints: 40,
  },
];

export function pickDailyMissions(seed: number): MissionDef[] {
  const shuffled = [...MISSION_POOL].sort((a, b) => {
    const ha = hash(a.id + seed);
    const hb = hash(b.id + seed);
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}
