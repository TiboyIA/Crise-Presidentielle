/**
 * healthReportingEvents.ts — Événements liés au retard de remontée des données de santé.
 *
 * Aucune vraie épidémiologie, aucun code médical réel, aucune donnée patient.
 * Ces événements illustrent des problèmes de gouvernance informatique et administrative.
 */

import type { NewsEvent } from "@/types/strategy";

export const HEALTH_REPORTING_EVENTS: NewsEvent[] = [
  // ── Trou noir dans les données de santé ──────────────────────────────────────
  {
    id: "health_reporting_blackout",
    title: "Trou noir dans les données de santé : l'État aveugle pendant des semaines",
    source: "Commission Nationale de l'Informatique de Santé",
    type: "social",
    urgency: "forte",
    description:
      "La CNIS révèle que les tableaux de bord sanitaires de l'État présentaient des données vieilles de plusieurs semaines au moment de plusieurs décisions gouvernementales récentes. Des dysfonctionnements cumulés — surcharge des équipes, systèmes dégradés, retards de transmission — ont créé un angle mort durable dans le pilotage de la politique de santé. Des parlementaires de l'opposition demandent des comptes.",
    isInteractive: true,
    conditionKey: "health_delay_critical",
    minActionsGap: 22,
    choices: [
      {
        id: "emergency_health_it",
        label: "Lancer un plan d'urgence numérique santé",
        consequence:
          "Des ressources sont déployées immédiatement pour rétablir les flux de données. Le délai diminue mais le coût est élevé.",
        effects: { money: -500, technology: 10, cyberDefense: 5 },
        hiddenPoliticsEffects: { scandalRisk: -10, institutionalStability: 4 },
        communicationRegister: "institutionnel",
        declarationTheme: "transparence",
        declarationStance: "pro",
      },
      {
        id: "commission_inquiry",
        label: "Créer une commission d'enquête parlementaire",
        consequence:
          "La transparence affichée calme l'opposition. Les résultats arriveront dans plusieurs mois. Le problème reste entier.",
        effects: { influence: 8, money: -150 },
        hiddenPoliticsEffects: { scandalRisk: -5, mediaMood: 5 },
        communicationRegister: "institutionnel",
        declarationTheme: "transparence",
        declarationStance: "pro",
      },
      {
        id: "deny_blackout",
        label: "Contester publiquement les chiffres de la CNIS",
        consequence:
          "La presse publie les données brutes. Le scandale s'emballe. La crédibilité de l'État sur les sujets de santé est sévèrement atteinte.",
        effects: { influence: -12 },
        hiddenPoliticsEffects: { scandalRisk: 15, mediaMood: -10, eliteTrust: -8 },
        pathologyDelta: { doubleSpeak: 12, contradictionRisk: 8 },
        communicationRegister: "offensif",
      },
    ],
  },

  // ── Alerte retards anormaux ───────────────────────────────────────────────────
  {
    id: "health_reporting_lag",
    title: "Délais anormaux signalés dans la remontée des indicateurs sanitaires",
    source: "Agence Nationale d'Appui à la Performance",
    type: "social",
    urgency: "moyenne",
    description:
      "L'ANAP signale des retards croissants dans la transmission des données entre les établissements de santé et les services centraux. Les causes identifiées sont multiples : logiciels vieillissants, équipes en sous-effectif, procédures mal standardisées. Si rien n'est fait, la situation pourrait dégénérer en véritable trou noir informatique.",
    isInteractive: true,
    conditionKey: "health_delay_high",
    minActionsGap: 20,
    choices: [
      {
        id: "digitalize_reporting",
        label: "Accélérer la numérisation des remontées",
        consequence:
          "Un programme de modernisation est lancé. Les retards commencent à se résorber progressivement.",
        effects: { money: -350, technology: 8 },
        hiddenPoliticsEffects: { institutionalStability: 4 },
        communicationRegister: "technocratique",
      },
      {
        id: "reinforce_dim_teams",
        label: "Renforcer les équipes DIM dans les hôpitaux",
        consequence:
          "Des postes sont créés. La remontée s'améliore mais l'effet est lent à se manifester.",
        effects: { money: -250 },
        hiddenPoliticsEffects: { institutionalStability: 3, eliteTrust: 3 },
        communicationRegister: "empathique",
      },
      {
        id: "ignore_lag_signal",
        label: "Considérer ces retards comme marginaux",
        consequence:
          "L'ANAP publie une note de relance. Les délais continuent d'augmenter discrètement.",
        effects: {},
        hiddenPoliticsEffects: { scandalRisk: 4, institutionalStability: -2 },
        pathologyDelta: { minimization: 8 },
        communicationRegister: "populaire",
      },
    ],
  },
];
