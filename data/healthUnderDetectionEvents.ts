/**
 * healthUnderDetectionEvents.ts — Événements de sous-détection sanitaire.
 *
 * Ces événements se déclenchent lorsque la pression de sous-détection
 * (underDetectionPressure) franchit des seuils successifs. Ils représentent
 * l'escalade d'une crise sanitaire restée invisible trop longtemps.
 *
 * Aucune maladie nommée. Aucun conseil médical. Aucune simulation épidémiologique.
 */

import type { NewsEvent } from "@/types/strategy";

export const HEALTH_UNDERDETECTION_EVENTS: NewsEvent[] = [
  // ── Palier 1 : Signal faible — seuil 35+ ─────────────────────────────────────
  {
    id:          "underdetection_signal_faible",
    title:       "Signal statistique anormal dans les données hospitalières",
    source:      "Observatoire de la Statistique Sanitaire",
    type:        "national",
    urgency:     "faible",
    description:
      "L'OSS signale discrètement une anomalie dans les séries de données hospitalières : certains indicateurs présentent une incohérence modérée avec les tendances attendues. Les données restent exploitables mais la qualité du signal mérite attention. Aucune alerte publique n'est envisagée à ce stade.",
    isInteractive: false,
    conditionKey:  "underdetection_signal",
    minActionsGap: 20,
    autoEffects: { money: 0 },
  },

  // ── Palier 2 : Données incohérentes — seuil 60+ ───────────────────────────────
  {
    id:          "underdetection_donnees_incoherentes",
    title:       "Données sanitaires incohérentes : la cellule DIM demande une investigation",
    source:      "Cellule DIM Nationale",
    type:        "national",
    urgency:     "forte",
    description:
      "La cellule DIM remonte une alerte interne : plusieurs établissements présentent des écarts significatifs entre les données transmises et les tendances réelles estimées par recoupement. La sous-déclaration de certains indicateurs est probable. La crise pourrait être plus grave que ce que les chiffres officiels laissent paraître. Une décision s'impose.",
    isInteractive: true,
    conditionKey:  "underdetection_incoherent",
    minActionsGap: 25,
    choices: [
      {
        id:          "underdetection_inspection_surprise",
        label:       "Diligenter une inspection surprise des établissements concernés",
        consequence:
          "Des inspecteurs sont dépêchés immédiatement. Les corrections sont douloureuses à court terme mais le système gagne en fiabilité. La transparence renforce progressivement la confiance.",
        effects:               { money: -180, influence: -12 },
        indicatorEffects:      { cohesion: 1 },
        hiddenPoliticsEffects: { scandalRisk: 5, institutionalStability: 4, mediaMood: -3 },
        communicationRegister: "institutionnel",
        declarationTheme:      "transparence",
        declarationStance:     "pro",
      },
      {
        id:          "underdetection_rapport_interne",
        label:       "Commander un rapport d'analyse interne confidentiel",
        consequence:
          "Un rapport est commandé, en interne. L'investigation est discrète et prend davantage de temps. Les incohérences persistent partiellement en attendant les conclusions.",
        effects:               { money: -80 },
        hiddenPoliticsEffects: { institutionalStability: 2, scandalRisk: 2 },
        communicationRegister: "technocratique",
      },
      {
        id:          "underdetection_minimiser",
        label:       "Attribuer les écarts à des erreurs de saisie ponctuelles",
        consequence:
          "Le gouvernement minimise publiquement l'alerte. La DIM prend note de la réponse. Les données continuent de diverger sans correction. Le risque d'une révélation ultérieure augmente.",
        effects:               {},
        hiddenPoliticsEffects: { scandalRisk: 12, mediaMood: -5, institutionalStability: -2 },
        pathologyDelta:        { minimization: 10, doubleSpeak: 5 },
        communicationRegister: "populaire",
        declarationTheme:      "transparence",
        declarationStance:     "contre",
      },
    ],
  },

  // ── Palier 3 : Crise révélée tardivement — seuil 85+ ─────────────────────────
  {
    id:          "underdetection_crise_revelee",
    title:       "ALERTE — Crise sanitaire révélée tardivement : les données officielles sous-estimaient la réalité",
    source:      "Agence Nationale de Sécurité Sanitaire",
    type:        "national",
    urgency:     "critique",
    description:
      "L'ANSS publie un rapport d'urgence : les données sanitaires officielles ont systématiquement sous-estimé la réalité de la situation pendant plusieurs semaines. Des anomalies de codage, des retards de remontée et une qualité insuffisante des systèmes d'information ont contribué à masquer l'ampleur réelle de la situation. La presse s'empare de l'affaire. La crédibilité de l'État sur les données de santé est directement engagée.",
    isInteractive: true,
    conditionKey:  "underdetection_crisis",
    minActionsGap: 22,
    choices: [
      {
        id:          "underdetection_transparence_totale",
        label:       "Conférence de presse d'urgence : transparence totale sur les lacunes du système",
        consequence:
          "Le gouvernement assume publiquement les défaillances du système d'information. Le choc est immédiat mais la prise de responsabilité stabilise la situation à moyen terme. La confiance dans les données peut se reconstruire.",
        effects:               { money: -250, influence: -15 },
        indicatorEffects:      { popularity: -2, cohesion: 3 },
        hiddenPoliticsEffects: { scandalRisk: -10, institutionalStability: 6, mediaMood: 4, eliteTrust: 3 },
        communicationRegister: "empathique",
        declarationTheme:      "transparence",
        declarationStance:     "pro",
      },
      {
        id:          "underdetection_reforme_urgence",
        label:       "Décréter une réforme d'urgence du système d'information sanitaire",
        consequence:
          "Un plan de redressement complet est annoncé. Le coût budgétaire est significatif mais l'engagement politique atténue la crise. La reconstruction du système prendra plusieurs semaines.",
        effects:               { money: -600, technology: 8, influence: -10 },
        indicatorEffects:      { economy: -2 },
        hiddenPoliticsEffects: { scandalRisk: -5, institutionalStability: 8, eliteTrust: 5 },
        communicationRegister: "institutionnel",
        declarationTheme:      "securite",
        declarationStance:     "pro",
      },
      {
        id:          "underdetection_nier",
        label:       "Contester les conclusions de l'ANSS et mettre en cause sa méthodologie",
        consequence:
          "Le gouvernement entre en confrontation ouverte avec l'agence sanitaire. La polémique enfle. Les médias et l'opposition amplifient la crise. Le scandale politique devient incontrôlable.",
        effects:               { influence: -5 },
        indicatorEffects:      { popularity: -5, cohesion: -3 },
        hiddenPoliticsEffects: { scandalRisk: 28, mediaMood: -15, eliteTrust: -8, institutionalStability: -5 },
        pathologyDelta:        { doubleSpeak: 18, scapegoating: 12, minimization: 8 },
        communicationRegister: "offensif",
        declarationTheme:      "transparence",
        declarationStance:     "contre",
      },
    ],
  },
];
