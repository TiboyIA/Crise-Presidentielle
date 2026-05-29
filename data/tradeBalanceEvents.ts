/**
 * tradeBalanceEvents.ts — Événements MODE DELTA Commerce Extérieur.
 *
 * 5 événements :
 *   1. Briefing commerce extérieur — point de situation (auto, faible)
 *   2. Le déficit commercial se creuse (interactive, forte)
 *   3. Crise de souveraineté économique — déficit structurel (interactive, critique)
 *   4. Excédent commercial — fenêtre d'opportunité (interactive, moyenne)
 *   5. Disruption logistique — chaînes commerciales menacées (interactive, forte)
 *
 * Aucune devise réelle. Aucun pays réel obligatoire. Aucun calcul macroéconomique.
 * Les effets tradeBalanceDelta sont des deltas directs sur l'indicateur fictif.
 */

import type { NewsEvent } from "@/types/strategy";

export const TRADE_BALANCE_EVENTS: NewsEvent[] = [
  // ── 1. Briefing — point de situation commerce extérieur ───────────────────────
  {
    id:          "trade_briefing",
    title:       "Commerce extérieur — le déficit commence à peser",
    source:      "Direction Générale du Trésor — Synthèse Commerciale",
    type:        "economie",
    urgency:     "faible",
    description: "La balance commerciale fictive enregistre un déficit croissant. Les importations dépassent les exportations sur la période. Les analystes notent une dépendance structurelle à des secteurs non maîtrisés domestiquement. Sans correction de trajectoire, la pression sur le budget et l'inflation importée va s'accentuer.",
    isInteractive: false,
    autoEffects:  {},
    conditionKey: "trade_briefing",
    minActionsGap: 20,
  },

  // ── 2. Déficit commercial en hausse ───────────────────────────────────────────
  {
    id:          "trade_deficit_alert",
    title:       "Le déficit commercial se creuse — action requise",
    source:      "Observatoire du Commerce Extérieur",
    type:        "economie",
    urgency:     "forte",
    description: "Les chiffres fictifs du commerce extérieur sont préoccupants. Le déficit s'est creusé de manière continue sur les dernières périodes. Les importations fictives augmentent plus vite que les exportations. La pression sur la balance des paiements et sur le budget public s'intensifie. Une réorientation stratégique s'impose.",
    isInteractive: true,
    conditionKey:  "trade_deficit_alert",
    minActionsGap: 12,
    choices: [
      {
        id:                  "politique_industrielle_export",
        label:               "Politique industrielle d'appui aux exportations",
        consequence:         "Un plan de soutien à la compétitivité des secteurs exportateurs fictifs est lancé. Les entreprises bénéficient d'un cadre favorable. La balance commerciale s'améliore progressivement.",
        effects:             { money: -200 },
        indicatorEffects:    {},
        tradeBalanceDelta:   14,
      },
      {
        id:                  "accords_commerciaux_urgence",
        label:               "Accords commerciaux d'urgence",
        consequence:         "Le gouvernement mobilise son capital diplomatique pour ouvrir de nouveaux débouchés fictifs à ses exportations. Les négociations aboutissent à des accords qui rééquilibrent la balance.",
        effects:             { influence: -20 },
        indicatorEffects:    {},
        tradeBalanceDelta:   10,
      },
      {
        id:                  "mesures_protectionnistes",
        label:               "Mesures protectionnistes temporaires",
        consequence:         "Des barrières commerciales temporaires sont mises en place pour limiter les importations fictives et protéger l'industrie nationale. La balance s'améliore à court terme mais l'efficacité économique recule.",
        effects:             {},
        indicatorEffects:    { economy: -1 },
        tradeBalanceDelta:   8,
      },
    ],
  },

  // ── 3. Crise de souveraineté économique ───────────────────────────────────────
  {
    id:          "trade_sovereignty_crisis",
    title:       "Crise de souveraineté économique — déficit structurel critique",
    source:      "Cellule de Crise Économique",
    type:        "economie",
    urgency:     "critique",
    description: "Le déficit commercial a atteint un niveau structurel alarmant. Le pays fictif importe massivement ce qu'il ne produit plus. La dépendance extérieure fragilise les fondements de l'économie nationale. Les recettes budgétaires souffrent, la cohésion sociale se fissure face au sentiment de perte de souveraineté économique. Une intervention d'urgence est impérative.",
    isInteractive: true,
    conditionKey:  "trade_sovereignty_crisis",
    minActionsGap: 8,
    choices: [
      {
        id:                  "plan_reindustrialisation_urgence",
        label:               "Plan de réindustrialisation d'urgence",
        consequence:         "Un plan massif et urgent de réindustrialisation est déclenché. Des secteurs stratégiques fictifs sont identifiés et soutenus pour reconquérir des parts de marché à l'export. L'effort est coûteux mais la trajectoire s'inverse.",
        effects:             { money: -350 },
        indicatorEffects:    { economy: 1 },
        tradeBalanceDelta:   22,
      },
      {
        id:                  "appel_partenaires_fictifs",
        label:               "Appel aux partenaires diplomatiques",
        consequence:         "Le gouvernement sollicite ses alliés fictifs pour des accords de réciprocité et de soutien commercial. L'aide extérieure permet de rééquilibrer partiellement la balance sans effort industriel immédiat.",
        effects:             { influence: -30 },
        indicatorEffects:    {},
        hiddenPoliticsEffects: { institutionalStability: 4 },
        tradeBalanceDelta:   15,
      },
      {
        id:                  "austerite_commerciale",
        label:               "Austérité commerciale d'urgence",
        consequence:         "Le gouvernement impose une cure d'austérité sur les importations. Les restrictions sont dures. La balance s'améliore mais au prix d'une récession de la consommation et d'une impopularité croissante.",
        effects:             {},
        indicatorEffects:    { economy: -2, popularity: -2 },
        tradeBalanceDelta:   12,
      },
    ],
  },

  // ── 4. Excédent commercial — opportunité ──────────────────────────────────────
  {
    id:          "trade_surplus_opportunity",
    title:       "Excédent commercial — fenêtre d'opportunité stratégique",
    source:      "Comité Stratégique de l'Économie Nationale",
    type:        "economie",
    urgency:     "moyenne",
    description: "La balance commerciale fictive affiche un excédent notable. Les exportations nationales surpassent les importations. Ce moment favorable doit être saisi pour consolider les secteurs porteurs, constituer des réserves fictives ou approfondir les partenariats commerciaux.",
    isInteractive: true,
    conditionKey:  "trade_surplus_opportunity",
    minActionsGap: 18,
    choices: [
      {
        id:                  "reinvestir_excedent_industrie",
        label:               "Réinvestir dans l'industrie nationale",
        consequence:         "L'excédent commercial fictif est réinvesti dans le renforcement des capacités industrielles. La dynamique vertueuse se poursuit et la position concurrentielle s'améliore durablement.",
        effects:             {},
        indicatorEffects:    { economy: 2 },
        hiddenPoliticsEffects: { institutionalStability: 3 },
      },
      {
        id:                  "renforcer_reserves_fictives",
        label:               "Renforcer les réserves de stabilité",
        consequence:         "L'excédent est converti en réserves fictives de stabilité. Le budget public bénéficie d'une marge de manœuvre supplémentaire pour absorber les chocs futurs.",
        effects:             {},
        indicatorEffects:    {},
        queuesDelayedConsequence: {
          id:           "trade_surplus_budget_reserve",
          delayActions: 6,
          effectType:   "indicator_effect",
          payload:      { publicBudget: 2 },
        },
      },
      {
        id:                  "intensifier_diplomatie_commerciale",
        label:               "Intensifier la diplomatie commerciale",
        consequence:         "Le gouvernement capitalise sur sa position favorable pour négocier de nouveaux accords fictifs. L'ouverture de nouveaux marchés consolide l'excédent sur le long terme.",
        effects:             { influence: -10 },
        indicatorEffects:    {},
        tradeBalanceDelta:   8,
      },
    ],
  },

  // ── 5. Disruption logistique ──────────────────────────────────────────────────
  {
    id:          "trade_disruption_alert",
    title:       "Disruption logistique — les chaînes commerciales sont menacées",
    source:      "Cellule de Surveillance des Échanges Extérieurs",
    type:        "economie",
    urgency:     "forte",
    description: "Des perturbations majeures dans les chaînes logistiques fictives menacent les flux commerciaux nationaux. Les ruptures dans les secteurs de l'énergie et du transport pèsent directement sur la capacité d'exportation et le coût des importations. Un déficit commercial se forme ou s'aggrave. Le gouvernement doit réagir rapidement.",
    isInteractive: true,
    conditionKey:  "trade_disruption_alert",
    minActionsGap: 10,
    choices: [
      {
        id:                  "diversifier_routes_commerciales",
        label:               "Diversifier les routes commerciales",
        consequence:         "Le gouvernement identifie et active des routes commerciales alternatives pour contourner les disruptions logistiques. Les flux reprennent progressivement. La balance s'améliore.",
        effects:             { influence: -15 },
        indicatorEffects:    {},
        supplyChainEffects:  { transport: { stockLevel: 12, disruptionRisk: -8 } },
        tradeBalanceDelta:   10,
      },
      {
        id:                  "renforcer_production_locale",
        label:               "Renforcer la production locale d'urgence",
        consequence:         "Face à la disruption des circuits d'importation, le gouvernement soutient en urgence la production nationale pour substituer les biens manquants. La dépendance extérieure recule.",
        effects:             { money: -180 },
        indicatorEffects:    {},
        tradeBalanceDelta:   8,
        shadowEconomyDelta:  -4,
      },
      {
        id:                  "absorber_couts_transitoirement",
        label:               "Absorber les coûts transitoirement",
        consequence:         "Le gouvernement choisit d'attendre que les disruptions se résorbent naturellement. Cette passivité coûte en termes de recettes fictives et creuse le déficit budgétaire à court terme.",
        effects:             {},
        indicatorEffects:    {},
        queuesDelayedConsequence: {
          id:           "trade_disruption_budget_cost",
          delayActions: 8,
          effectType:   "indicator_effect",
          payload:      { publicBudget: -2 },
        },
      },
    ],
  },
];
