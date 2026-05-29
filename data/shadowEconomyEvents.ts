/**
 * shadowEconomyEvents.ts — Événements MODE DELTA Économie Informelle.
 *
 * 4 événements :
 *   1. Note d'alerte — économie informelle en progression (auto, faible)
 *   2. Alerte structurelle — seuil d'alerte dépassé (interactive, forte)
 *   3. Crise de l'économie souterraine — seuil critique (interactive, critique)
 *   4. Fenêtre de formalisation — technologie disponible (interactive, moyenne)
 *
 * Aucune méthode de fraude réelle. Aucun conseil d'évasion fiscale.
 * Les effets shadowEconomyDelta sont des deltas sur l'indicateur abstrait.
 */

import type { NewsEvent } from "@/types/strategy";

export const SHADOW_ECONOMY_EVENTS: NewsEvent[] = [
  // ── 1. Note d'alerte — signal précoce ─────────────────────────────────────────
  {
    id:          "shadow_economy_watch",
    title:       "Note d'alerte — l'économie informelle progresse",
    source:      "Cellule d'Analyse Économique — Cabinet du Premier Ministre",
    type:        "economie",
    urgency:     "faible",
    description: "Les indicateurs fictifs de suivi de l'activité économique signalent une progression de la part informelle. Les recettes publiques affichent une sous-performance persistante non expliquée par les cycles économiques. Une vigilance accrue s'impose avant que le phénomène ne prenne une ampleur structurelle.",
    isInteractive: false,
    autoEffects:  {},
    conditionKey: "shadow_economy_watch",
    minActionsGap: 20,
  },

  // ── 2. Alerte structurelle ────────────────────────────────────────────────────
  {
    id:          "shadow_economy_alert",
    title:       "L'économie informelle dépasse les seuils d'alerte",
    source:      "Observatoire de l'Économie Nationale",
    type:        "economie",
    urgency:     "forte",
    description: "Les modèles fictifs de l'Observatoire confirment que l'économie informelle a franchi un seuil d'alerte. Une fraction significative de l'activité échappe aux circuits officiels. Les statistiques nationales perdent en fiabilité. L'efficacité des politiques publiques se dégrade. Le gouvernement doit choisir son approche.",
    isInteractive: true,
    conditionKey:  "shadow_economy_alert",
    minActionsGap: 12,
    choices: [
      {
        id:                  "controle_intelligent_cible",
        label:               "Contrôle intelligent et ciblé",
        consequence:         "Des outils d'analyse de données fictives sont déployés pour identifier et cibler les zones de sous-déclaration. L'approche chirurgicale produit des résultats sans provoquer de choc fiscal général.",
        effects:             { money: -150, intelligence: -15 },
        indicatorEffects:    {},
        shadowEconomyDelta:  -10,
        taxEfficiencyDelta:  6,
      },
      {
        id:                  "campagne_formalisation_economique",
        label:               "Campagne de formalisation économique",
        consequence:         "Une campagne nationale encourage les acteurs informels à régulariser leur situation. Des guichets simplifiés sont ouverts. L'accompagnement remplace la contrainte. Le consentement fiscal se redresse progressivement.",
        effects:             { money: -180 },
        indicatorEffects:    {},
        shadowEconomyDelta:  -8,
        fiscalConsentDelta:  8,
      },
      {
        id:                  "tolerance_temporaire",
        label:               "Tolérance temporaire — attendre le prochain bilan",
        consequence:         "Le gouvernement choisit de ne pas agir dans l'immédiat, espérant un rééquilibrage naturel. Cette attente laisse le phénomène s'enraciner. Les recettes fictives continuent de baisser.",
        effects:             {},
        indicatorEffects:    {},
        queuesDelayedConsequence: {
          id:           "shadow_watch_budget_loss",
          delayActions: 10,
          effectType:   "indicator_effect",
          payload:      { publicBudget: -2, economy: -1 },
        },
      },
    ],
  },

  // ── 3. Crise de l'économie souterraine ────────────────────────────────────────
  {
    id:          "shadow_economy_crisis",
    title:       "Crise de l'économie souterraine — seuil structurel franchi",
    source:      "Cellule de Crise Économique",
    type:        "economie",
    urgency:     "critique",
    description: "L'économie informelle a atteint un niveau structurel préoccupant. Les statistiques officielles ne reflètent plus la réalité économique du pays. La capacité de l'État à financer ses politiques publiques est compromise. Les inégalités entre acteurs formels et informels alimentent une fracture sociale croissante. Une intervention d'urgence est nécessaire.",
    isInteractive: true,
    conditionKey:  "shadow_economy_crisis",
    minActionsGap: 8,
    choices: [
      {
        id:                  "plan_formalisation_urgence",
        label:               "Plan national de formalisation d'urgence",
        consequence:         "Un plan massif de formalisation est déclenché : simplification des démarches, accompagnement renforcé, incitations temporaires. L'approche volontariste redresse la trajectoire. Les recettes publiques fictives repartent à la hausse.",
        effects:             { money: -300 },
        indicatorEffects:    { economy: 1 },
        shadowEconomyDelta:  -18,
        fiscalConsentDelta:  10,
      },
      {
        id:                  "reforme_fiscale_urgence",
        label:               "Réforme fiscale d'urgence — alléger pour formaliser",
        consequence:         "Le gouvernement réduit la pression fiscale sur les petits acteurs pour rendre l'économie formelle plus attractive. La décision est audacieuse. L'économie informelle recule à mesure que les circuits officiels redeviennent compétitifs.",
        effects:             { money: -200 },
        indicatorEffects:    {},
        shadowEconomyDelta:  -12,
        taxPressureDelta:    -10,
        taxEfficiencyDelta:  8,
      },
      {
        id:                  "repression_economique_intensive",
        label:               "Répression économique intensive",
        consequence:         "Des contrôles renforcés sont déployés massivement. L'économie informelle recule sous la contrainte, mais la brutalité de l'approche génère une vague de ressentiment. La confiance dans les institutions s'érode.",
        effects:             {},
        indicatorEffects:    {},
        shadowEconomyDelta:  -8,
        fiscalConsentDelta:  -8,
        queuesDelayedConsequence: {
          id:           "shadow_repression_backlash",
          delayActions: 6,
          effectType:   "indicator_effect",
          payload:      { popularity: -3 },
        },
      },
    ],
  },

  // ── 4. Fenêtre de formalisation technologique ─────────────────────────────────
  {
    id:          "shadow_economy_opportunity",
    title:       "Fenêtre de formalisation — la technologie change la donne",
    source:      "Direction Générale de la Modernisation de l'État",
    type:        "economie",
    urgency:     "moyenne",
    description: "Les recherches nationales fictives ont abouti à des outils permettant de simplifier radicalement les démarches de régularisation et d'améliorer la détection des circuits parallèles. Cette fenêtre technologique représente une opportunité unique de réduire l'économie informelle sans recourir à la coercition.",
    isInteractive: true,
    conditionKey:  "shadow_economy_opportunity",
    minActionsGap: 18,
    choices: [
      {
        id:                  "deployer_administration_numerique",
        label:               "Déployer l'administration numérique",
        consequence:         "Les outils numériques fictifs sont déployés à grande échelle. Les démarches de régularisation sont automatisées. La détection intelligente des anomalies réduit l'économie informelle sans friction sociale.",
        effects:             { technology: -20 },
        indicatorEffects:    {},
        shadowEconomyDelta:  -15,
        taxEfficiencyDelta:  12,
      },
      {
        id:                  "incitations_regularisation_volontaire",
        label:               "Incitations à la régularisation volontaire",
        consequence:         "Un dispositif d'accompagnement et d'incitations temporaires est lancé pour encourager les acteurs informels à rejoindre les circuits officiels. L'approche douce restaure le consentement fiscal.",
        effects:             { money: -150 },
        indicatorEffects:    {},
        shadowEconomyDelta:  -10,
        fiscalConsentDelta:  12,
      },
      {
        id:                  "reorientation_progressive",
        label:               "Réorientation progressive — pas à pas",
        consequence:         "Le gouvernement opte pour une transition douce. Les outils sont déployés par étapes, sans disruption. Les résultats sont modestes mais durables, et ne génèrent aucune résistance.",
        effects:             {},
        indicatorEffects:    {},
        shadowEconomyDelta:  -5,
        taxEfficiencyDelta:  5,
      },
    ],
  },
];
