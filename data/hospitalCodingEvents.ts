/**
 * hospitalCodingEvents.ts — Événements liés à la qualité du codage hospitalier.
 *
 * Aucun code médical réel, aucune table PMSI, aucune donnée patient.
 * Ces événements sont purement fictifs et illustrent des problèmes de gouvernance administrative.
 */

import type { NewsEvent } from "@/types/strategy";

export const HOSPITAL_CODING_EVENTS: NewsEvent[] = [
  // ── Erreur de codage massive ─────────────────────────────────────────────────
  {
    id: "hospital_coding_error",
    title: "Erreur de codage massive dans les hôpitaux publics",
    source: "Inspection Générale des Affaires Sociales",
    type: "social",
    urgency: "forte",
    description:
      "L'IGAS signale que des erreurs systématiques dans le codage des actes médicaux ont entraîné un écart de plusieurs centaines de millions d'euros entre les financements alloués et les besoins réels des établissements. Plusieurs régions sont particulièrement touchées. La presse spécialisée parle de « bombe à retardement budgétaire ».",
    isInteractive: true,
    conditionKey: "hospital_coding_critical",
    minActionsGap: 20,
    choices: [
      {
        id: "emergency_audit",
        label: "Diligenter un audit d'urgence national",
        consequence:
          "Un cabinet indépendant est missionné. Le coût est significatif mais l'image de rigueur est préservée.",
        effects: { money: -400, influence: 5 },
        indicatorEffects: { economy: -2 },
        hiddenPoliticsEffects: { scandalRisk: -8, institutionalStability: 3 },
        communicationRegister: "institutionnel",
        declarationTheme: "transparence",
        declarationStance: "pro",
      },
      {
        id: "reform_coding_systems",
        label: "Lancer une réforme des systèmes de codage",
        consequence:
          "La transition prend du temps. À court terme, la situation se stabilise mais les bénéfices sont différés.",
        effects: { money: -600, technology: 5 },
        indicatorEffects: { economy: -3 },
        hiddenPoliticsEffects: { institutionalStability: -2, eliteTrust: 4 },
        communicationRegister: "technocratique",
      },
      {
        id: "minimize_coding_issue",
        label: "Minimiser l'ampleur des erreurs",
        consequence:
          "La presse relaie des sources internes. Le risque de scandale s'envole. La crise couve.",
        effects: { influence: -10 },
        hiddenPoliticsEffects: { scandalRisk: 12, mediaMood: -8 },
        pathologyDelta: { minimization: 12, doubleSpeak: 6 },
        communicationRegister: "offensif",
      },
    ],
  },

  // ── Audit DIM national ───────────────────────────────────────────────────────
  {
    id: "hospital_dim_audit",
    title: "Résultats de l'audit DIM national : des marges de progrès identifiées",
    source: "Direction Générale de l'Offre de Soins",
    type: "social",
    urgency: "moyenne",
    description:
      "La DGOS publie son rapport annuel sur la qualité du codage dans les établissements de santé. Si la situation n'est pas alarmante, des défaillances structurelles sont identifiées dans 34 % des hôpitaux auditionnés : sous-codage des pathologies chroniques, erreurs de valorisation des GHS, retards de remontée. Des recommandations sont formulées.",
    isInteractive: true,
    conditionKey: "hospital_coding_audit",
    minActionsGap: 25,
    choices: [
      {
        id: "implement_recommendations",
        label: "Mettre en œuvre toutes les recommandations",
        consequence:
          "Un plan de formation est déployé. Les indicateurs commencent à s'améliorer dans les semaines suivantes.",
        effects: { money: -300, technology: 8 },
        hiddenPoliticsEffects: { institutionalStability: 5, eliteTrust: 4 },
        communicationRegister: "institutionnel",
        declarationTheme: "transparence",
        declarationStance: "pro",
      },
      {
        id: "selective_implementation",
        label: "Prioriser les recommandations les moins coûteuses",
        consequence:
          "Un progrès partiel est acté. La situation se stabilise sans s'améliorer réellement.",
        effects: { money: -120 },
        hiddenPoliticsEffects: { institutionalStability: 2 },
        communicationRegister: "technocratique",
      },
      {
        id: "classify_report",
        label: "Classer le rapport sans suite",
        consequence:
          "La DGOS s'étonne publiquement du silence présidentiel. La presse spécialisée commence à poser des questions.",
        effects: {},
        hiddenPoliticsEffects: { scandalRisk: 6, mediaMood: -5, eliteTrust: -5 },
        pathologyDelta: { minimization: 8 },
        communicationRegister: "populaire",
      },
    ],
  },
];
