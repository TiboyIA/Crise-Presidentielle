/**
 * hospitalPressureEvents.ts — Événements liés à la saturation hospitalière stratégique.
 *
 * Aucun simulateur hospitalier, aucun lit, aucun flux patient réel.
 * Ces événements illustrent des enjeux de gouvernance, de budget et de logistique.
 */

import type { NewsEvent } from "@/types/strategy";

export const HOSPITAL_PRESSURE_EVENTS: NewsEvent[] = [
  // ── Crise hospitalière — seuil 81+ ───────────────────────────────────────────
  {
    id: "hospital_pressure_crisis",
    title: "Crise hospitalière : le système à bout de souffle",
    source: "Fédération Hospitalière de France",
    type: "social",
    urgency: "critique",
    description:
      "La FHF tire la sonnette d'alarme : le système de soins est en rupture de charge dans plusieurs régions. Des files d'attente inacceptables, des reports de prise en charge et un personnel en état d'épuisement extrême alimentent une colère sociale croissante. Des représentants soignants ont annoncé des actions coup-de-poing. La presse internationale commence à couvrir la situation.",
    isInteractive: true,
    conditionKey: "hospital_pressure_crisis",
    minActionsGap: 18,
    choices: [
      {
        id: "emergency_health_plan",
        label: "Décréter un plan d'urgence sanitaire national",
        consequence:
          "Des moyens exceptionnels sont débloqués. La pression commence à refluer mais le coût est majeur.",
        effects: { money: -800, influence: 8 },
        indicatorEffects: { popularity: 5, economy: -3 },
        hiddenPoliticsEffects: { scandalRisk: -12, institutionalStability: 5, eliteTrust: 4 },
        communicationRegister: "institutionnel",
        declarationTheme: "securite",
        declarationStance: "pro",
      },
      {
        id: "military_medical_support",
        label: "Déployer les équipes médicales militaires",
        consequence:
          "Une réponse rapide et visible. L'image de fermeté rassure à court terme, mais la mesure reste temporaire.",
        effects: { money: -400, military: -10, influence: 6 },
        indicatorEffects: { popularity: 3 },
        hiddenPoliticsEffects: { scandalRisk: -6, institutionalStability: 3 },
        communicationRegister: "martial",
      },
      {
        id: "blame_local_authorities",
        label: "Mettre en cause la gestion des collectivités locales",
        consequence:
          "Les présidents de région répliquent immédiatement. La polémique politique masque la crise sanitaire sans la résoudre.",
        effects: { influence: -8 },
        hiddenPoliticsEffects: { scandalRisk: 10, regionalTension: 12, mediaMood: -8 },
        pathologyDelta: { scapegoating: 14, doubleSpeak: 6 },
        communicationRegister: "offensif",
      },
    ],
  },

  // ── Saturation — seuil 61-80 ─────────────────────────────────────────────────
  {
    id: "hospital_pressure_saturation",
    title: "Les urgences sous haute tension : des délais records signalés",
    source: "Société Française de Médecine d'Urgence",
    type: "social",
    urgency: "forte",
    description:
      "La SFMU publie un état des lieux alarmant : les temps d'attente aux urgences atteignent des niveaux préoccupants dans plusieurs métropoles. Des équipes signalent une surcharge permanente et des conditions de travail qui se dégradent. Sans intervention, la situation pourrait rapidement dépasser les capacités d'absorption du système.",
    isInteractive: true,
    conditionKey: "hospital_pressure_saturation",
    minActionsGap: 20,
    choices: [
      {
        id: "reinforce_emergency_staff",
        label: "Activer les réservistes médicaux et paramédicaux",
        consequence:
          "Des renforts arrivent rapidement. La pression reflue partiellement. Le personnel apprécie la réactivité.",
        effects: { money: -350, influence: 4 },
        indicatorEffects: { popularity: 2 },
        hiddenPoliticsEffects: { institutionalStability: 4, eliteTrust: 3 },
        communicationRegister: "empathique",
      },
      {
        id: "open_emergency_credits",
        label: "Débloquer une enveloppe budgétaire d'urgence",
        consequence:
          "Les hôpitaux reçoivent des moyens supplémentaires. La marge de manœuvre se reconstitue progressivement.",
        effects: { money: -500 },
        indicatorEffects: { economy: -2 },
        hiddenPoliticsEffects: { institutionalStability: 5, mediaMood: 4 },
        communicationRegister: "institutionnel",
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
      },
      {
        id: "technocratic_taskforce",
        label: "Créer une task force de coordination interministérielle",
        consequence:
          "Une cellule de crise est installée. Les annonces sont nombreuses, les résultats concrets prendront du temps.",
        effects: { money: -120 },
        hiddenPoliticsEffects: { institutionalStability: 2 },
        communicationRegister: "technocratique",
      },
    ],
  },

  // ── Tension — seuil 40-61 ────────────────────────────────────────────────────
  {
    id: "hospital_pressure_warning",
    title: "Signaux d'alerte dans le système hospitalier",
    source: "Observatoire National des Systèmes de Santé",
    type: "social",
    urgency: "moyenne",
    description:
      "L'ONSS publie son rapport trimestriel : les indicateurs de charge du système de soins montrent une dégradation progressive. La marge d'absorption restante est jugée insuffisante pour faire face à un pic épidémique ou à une catastrophe soudaine. Des mesures préventives seraient souhaitables avant que la situation ne se dégrade davantage.",
    isInteractive: true,
    conditionKey: "hospital_pressure_tension",
    minActionsGap: 22,
    choices: [
      {
        id: "prevention_plan",
        label: "Lancer un plan de prévention et de préparation",
        consequence:
          "Des mesures d'anticipation sont prises. La pression ne baisse pas immédiatement mais les systèmes sont mieux préparés.",
        effects: { money: -200, technology: 4 },
        hiddenPoliticsEffects: { institutionalStability: 3, eliteTrust: 2 },
        communicationRegister: "scientifique",
      },
      {
        id: "optimize_logistics",
        label: "Réorganiser la logistique de soins",
        consequence:
          "Des gains d'efficacité sont identifiés. La pression diminue légèrement sans coût budgétaire majeur.",
        effects: { money: -80, technology: 2 },
        hiddenPoliticsEffects: { institutionalStability: 2 },
        communicationRegister: "technocratique",
      },
      {
        id: "wait_and_see",
        label: "Surveiller l'évolution avant d'agir",
        consequence:
          "L'ONSS prend note de l'attentisme présidentiel. La situation continue de dériver en l'absence de mesures.",
        effects: {},
        hiddenPoliticsEffects: { scandalRisk: 3, mediaMood: -3 },
        pathologyDelta: { minimization: 5 },
        communicationRegister: "populaire",
      },
    ],
  },

  // ── Opportunité — pression normale, investir pour consolider ─────────────────
  {
    id: "hospital_plan_opportunity",
    title: "Rapport : opportunité d'investissement dans la résilience hospitalière",
    source: "Haute Autorité de Santé",
    type: "social",
    urgency: "faible",
    description:
      "La HAS identifie une fenêtre favorable pour renforcer structurellement la résilience du système de soins avant la prochaine période de tension. Des investissements ciblés dans la formation, la numérisation et la logistique permettraient d'augmenter durablement la capacité d'absorption du système.",
    isInteractive: true,
    conditionKey: "hospital_plan_opportunity",
    minActionsGap: 30,
    choices: [
      {
        id: "invest_resilience",
        label: "Saisir l'opportunité : plan de résilience hospitalière",
        consequence:
          "Un programme structurel est lancé. La pression hospitalière diminue durablement.",
        effects: { money: -600, technology: 6 },
        indicatorEffects: { economy: -2 },
        hiddenPoliticsEffects: { institutionalStability: 6, eliteTrust: 5, scandalRisk: -4 },
        communicationRegister: "institutionnel",
      },
      {
        id: "partial_resilience_invest",
        label: "Investissement ciblé sur la numérisation",
        consequence:
          "Un effort partiel est consenti. Le système gagne en efficacité sans réforme structurelle.",
        effects: { money: -280, technology: 4 },
        hiddenPoliticsEffects: { institutionalStability: 3 },
        communicationRegister: "technocratique",
      },
      {
        id: "defer_investment",
        label: "Reporter l'investissement à la prochaine loi de finances",
        consequence:
          "La HAS publie un communiqué exprimant ses regrets. La fenêtre favorable se referme.",
        effects: {},
        hiddenPoliticsEffects: { eliteTrust: -3, mediaMood: -2 },
        pathologyDelta: { minimization: 4 },
        communicationRegister: "populaire",
      },
    ],
  },
];
