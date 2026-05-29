/**
 * taxPolicyEvents.ts — Événements MODE DELTA Fiscalité Dynamique.
 *
 * 6 événements :
 *   1. Alerte pression fiscale (interactive, forte)
 *   2. Crise d'évasion fiscale (interactive, critique)
 *   3. Fenêtre de réforme fiscale (interactive, moyenne)
 *   4. Pacte fiscal temporaire (interactive, forte)
 *   5. Pression populaire pour une baisse des impôts (interactive, moyenne)
 *   6. Économie informelle hors contrôle (interactive, critique)
 *
 * Aucun barème fiscal réel. Aucune loi de finances. Aucun conseil fiscal.
 * Les effets taxPressureDelta, taxEfficiencyDelta, fiscalConsentDelta
 * sont des deltas directs sur les indicateurs fictifs.
 */

import type { NewsEvent } from "@/types/strategy";

export const TAX_POLICY_EVENTS: NewsEvent[] = [
  // ── 1. Alerte pression fiscale ────────────────────────────────────────────────
  {
    id:          "tax_pressure_alert",
    title:       "La pression fiscale atteint un niveau critique",
    source:      "Observatoire National de la Fiscalité",
    type:        "economie",
    urgency:     "forte",
    description: "Les indicateurs fictifs de pression fiscale ont atteint un niveau qui inquiète les économistes du gouvernement. Les ménages modestes et les entreprises signalent des difficultés croissantes. La résistance à l'impôt s'organise. Le gouvernement doit arbitrer entre recettes de court terme et consentement fiscal à long terme.",
    isInteractive: true,
    conditionKey:  "tax_pressure_alert",
    minActionsGap: 12,
    choices: [
      {
        id:                  "alleger_pression_fiscale",
        label:               "Alléger la pression fiscale",
        consequence:         "La réduction de la pression fiscale est annoncée avec un plan d'économies compensatoires. Les ménages perçoivent un allègement immédiat. Le consentement fiscal se redresse.",
        effects:             { money: -200 },
        indicatorEffects:    {},
        taxPressureDelta:    -12,
        fiscalConsentDelta:  8,
      },
      {
        id:                  "renforcer_efficacite_recouvrement",
        label:               "Renforcer l'efficacité du recouvrement",
        consequence:         "Plutôt que d'ajuster les taux, le gouvernement investit dans la modernisation fiscale. Moins de fraude, plus de recettes à pression constante. Le consentement s'améliore légèrement.",
        effects:             { money: -100, technology: -10 },
        indicatorEffects:    {},
        taxEfficiencyDelta:  12,
        fiscalConsentDelta:  4,
      },
      {
        id:                  "maintenir_effort_fiscal",
        label:               "Maintenir et intensifier l'effort fiscal",
        consequence:         "Le gouvernement refuse de céder aux pressions et amplifie l'effort fiscal pour renflouer les caisses. Les recettes de court terme augmentent, mais la colère fiscale s'installe durablement.",
        effects:             {},
        indicatorEffects:    {},
        taxPressureDelta:    6,
        fiscalConsentDelta:  -10,
        queuesDelayedConsequence: {
          id:           "tax_pressure_backlash",
          delayActions: 8,
          effectType:   "indicator_effect",
          payload:      { popularity: -2 },
        },
      },
    ],
  },

  // ── 2. Crise d'évasion fiscale ────────────────────────────────────────────────
  {
    id:          "tax_evasion_crisis",
    title:       "Évasion fiscale massive — l'économie informelle explose",
    source:      "Cellule Anti-Fraude Fiscale",
    type:        "economie",
    urgency:     "critique",
    description: "La Direction Générale des Finances Publiques fictive rapporte une expansion inquiétante de l'économie informelle. Les recettes disparaissent dans des circuits parallèles. La fraude organisée gangrène le système fiscal. Des mesures d'urgence s'imposent avant que la situation ne devienne structurellement irréversible.",
    isInteractive: true,
    conditionKey:  "tax_evasion_crisis",
    minActionsGap: 8,
    choices: [
      {
        id:                  "offensive_anti_fraude",
        label:               "Offensive anti-fraude nationale",
        consequence:         "Une mobilisation exceptionnelle des services fiscaux fictifs est déclenchée. Les opérations de contrôle sont intensifiées. Les recettes récupérées redressent les comptes, mais la brutalité des contrôles froisse une partie de la population.",
        effects:             { money: -180, intelligence: -20 },
        indicatorEffects:    {},
        taxEfficiencyDelta:  10,
        fiscalConsentDelta:  12,
        queuesDelayedConsequence: {
          id:           "tax_crackdown_backlash",
          delayActions: 6,
          effectType:   "hidden_politics",
          payload:      { popularFatigue: 2 },
        },
      },
      {
        id:                  "amnistie_fiscale",
        label:               "Amnistie fiscale exceptionnelle",
        consequence:         "Le gouvernement offre une fenêtre de régularisation volontaire avec des pénalités allégées. Des milliards fictifs rentrent dans les caisses. Le consentement fiscal est restauré par la diplomatie plutôt que la contrainte.",
        effects:             { money: -80 },
        indicatorEffects:    {},
        fiscalConsentDelta:  18,
        taxPressureDelta:    -6,
      },
      {
        id:                  "ignorer_evasion",
        label:               "Ignorer et attendre un rééquilibrage naturel",
        consequence:         "Le gouvernement mise sur un rétablissement spontané. Cette inaction est perçue comme une faiblesse. L'économie informelle continue de croître. Les conséquences économiques se feront sentir durablement.",
        effects:             {},
        indicatorEffects:    {},
        queuesDelayedConsequence: {
          id:           "tax_evasion_worsens",
          delayActions: 10,
          effectType:   "indicator_effect",
          payload:      { economy: -2, popularity: -2 },
        },
      },
    ],
  },

  // ── 3. Fenêtre de réforme fiscale ─────────────────────────────────────────────
  {
    id:          "tax_reform_window",
    title:       "Fenêtre de réforme fiscale — les conditions sont favorables",
    source:      "Commission Nationale de la Simplification Fiscale",
    type:        "economie",
    urgency:     "moyenne",
    description: "Les experts fiscaux fictifs identifient une fenêtre d'opportunité : le consentement est suffisant et le système accuse des inefficacités structurelles. Une réforme maintenant serait moins douloureuse qu'une crise future. Le gouvernement doit choisir son levier d'action.",
    isInteractive: true,
    conditionKey:  "tax_reform_window",
    minActionsGap: 15,
    choices: [
      {
        id:                  "simplifier_fiscalite",
        label:               "Simplifier la fiscalité",
        consequence:         "Une réforme de simplification fiscale est engagée. Le nombre de prélèvements fictifs est réduit, le recouvrement devient plus lisible. Le consentement fiscal s'améliore nettement et l'efficacité administrative progresse.",
        effects:             { money: -100 },
        indicatorEffects:    {},
        taxEfficiencyDelta:  15,
        fiscalConsentDelta:  8,
      },
      {
        id:                  "credit_impot_investissement",
        label:               "Crédit d'impôt investissement",
        consequence:         "Un dispositif de crédit d'impôt pour l'investissement productif fictif est instauré. La pression globale baisse pour les entreprises, ce qui attire les acteurs économiques et redonne confiance aux marchés.",
        effects:             { money: -150 },
        indicatorEffects:    {},
        taxPressureDelta:    -6,
        taxEfficiencyDelta:  6,
        investorConfidenceDelta: 8,
      },
      {
        id:                  "reporter_reforme_fiscale",
        label:               "Reporter la réforme",
        consequence:         "Le gouvernement préfère attendre un contexte plus favorable. Cette temporisation est perçue comme une absence de cap. La fenêtre d'opportunité se referme et le système fiscal continue de se dégrader lentement.",
        effects:             {},
        indicatorEffects:    {},
        queuesDelayedConsequence: {
          id:           "tax_reform_delayed_cost",
          delayActions: 12,
          effectType:   "indicator_effect",
          payload:      { economy: -1 },
        },
      },
    ],
  },

  // ── 4. Pacte fiscal temporaire ────────────────────────────────────────────────
  {
    id:          "fiscal_compact",
    title:       "Pacte fiscal temporaire — appel à l'effort national",
    source:      "Ministère de l'Économie et des Finances",
    type:        "economie",
    urgency:     "forte",
    description: "Face à une dette qui s'alourdit et à des recettes insuffisantes, le gouvernement propose un pacte fiscal temporaire. L'effort est limité dans le temps et assorti de contreparties symboliques. L'enjeu : regagner la crédibilité budgétaire sans provoquer une fracture sociale.",
    isInteractive: true,
    conditionKey:  "fiscal_compact",
    minActionsGap: 12,
    choices: [
      {
        id:                  "adopter_pacte_collectif",
        label:               "Adopter le pacte — effort collectif",
        consequence:         "Le gouvernement présente le pacte comme un effort partagé et équitable. L'adhésion est réelle. Les recettes fictives progressent et la crédibilité budgétaire est restaurée.",
        effects:             {},
        indicatorEffects:    {},
        taxPressureDelta:    10,
        fiscalConsentDelta:  10,
        queuesDelayedConsequence: {
          id:           "fiscal_compact_revenue",
          delayActions: 8,
          effectType:   "indicator_effect",
          payload:      { publicBudget: 3 },
        },
      },
      {
        id:                  "pacte_cible_hauts_revenus",
        label:               "Pacte ciblé sur les hauts revenus",
        consequence:         "L'effort est concentré sur les catégories les plus aisées fictives. La mesure est populaire en bas de l'échelle, mais génère une résistance des élites économiques et financières.",
        effects:             {},
        indicatorEffects:    {},
        taxPressureDelta:    5,
        fiscalConsentDelta:  6,
        queuesDelayedConsequence: {
          id:           "fiscal_compact_elite_backlash",
          delayActions: 6,
          effectType:   "hidden_politics",
          payload:      { eliteTrust: -4 },
        },
      },
      {
        id:                  "refuser_pacte_fiscal",
        label:               "Refuser — pas de hausse d'impôts",
        consequence:         "Le gouvernement rejette tout nouvel effort fiscal. Ce choix est bien reçu à court terme mais sape la crédibilité budgétaire. Les marchés fictifs s'inquiètent. Le déficit se creuse.",
        effects:             {},
        indicatorEffects:    {},
        investorConfidenceDelta: -8,
        queuesDelayedConsequence: {
          id:           "fiscal_compact_deficit",
          delayActions: 10,
          effectType:   "indicator_effect",
          payload:      { publicBudget: -2 },
        },
      },
    ],
  },

  // ── 5. Pression populaire pour une baisse des impôts ─────────────────────────
  {
    id:          "tax_cut_pressure",
    title:       "Pression populaire pour une baisse des impôts",
    source:      "Sondage Économique National",
    type:        "social",
    urgency:     "moyenne",
    description: "Les sondages fictifs sont sans ambiguïté : une majorité de citoyens réclame un allègement fiscal immédiat. La pression politique monte. Céder renforce la popularité mais fragilise les finances. Résister préserve le cap mais amplifie la colère. Le gouvernement doit trancher.",
    isInteractive: true,
    conditionKey:  "tax_cut_pressure",
    minActionsGap: 15,
    choices: [
      {
        id:                  "baisser_impots_populaire",
        label:               "Baisser les impôts",
        consequence:         "Le gouvernement accède à la demande et annonce un allègement fiscal ciblé. La mesure est saluée. La popularité progresse, mais les caisses s'allègent en conséquence.",
        effects:             { money: -200 },
        indicatorEffects:    {},
        taxPressureDelta:    -10,
        fiscalConsentDelta:  8,
        queuesDelayedConsequence: {
          id:           "tax_cut_popularity_boost",
          delayActions: 6,
          effectType:   "indicator_effect",
          payload:      { popularity: 3 },
        },
      },
      {
        id:                  "promettre_reforme_moyen_terme",
        label:               "Promettre une réforme à moyen terme",
        consequence:         "Le gouvernement prend un engagement public sur une réforme fiscale dans les prochains mois. Le discours est bien calibré. Le consentement se redresse sans coût immédiat.",
        effects:             { influence: -10 },
        indicatorEffects:    {},
        fiscalConsentDelta:  8,
        taxEfficiencyDelta:  5,
      },
      {
        id:                  "tenir_cap_fiscal",
        label:               "Tenir le cap fiscal",
        consequence:         "Le gouvernement maintient sa position et assume l'impopularité. Les finances sont préservées, mais le mécontentement fiscal s'installe durablement dans une partie de la population.",
        effects:             {},
        indicatorEffects:    {},
        fiscalConsentDelta:  -5,
        queuesDelayedConsequence: {
          id:           "tax_cap_held_backlash",
          delayActions: 4,
          effectType:   "indicator_effect",
          payload:      { popularity: -2 },
        },
      },
    ],
  },

  // ── 6. Économie informelle hors contrôle ──────────────────────────────────────
  {
    id:          "informal_economy_surge",
    title:       "L'économie informelle dépasse les seuils critiques",
    source:      "Institut National de Statistiques Fictives",
    type:        "economie",
    urgency:     "critique",
    description: "Les modèles statistiques fictifs signalent que l'économie informelle a franchi un seuil critique. Une fraction importante de l'activité échappe désormais à la fiscalité. Les recettes manquantes creusent structurellement le déficit public. L'État perd en capacité d'action. Une intervention de fond s'impose d'urgence.",
    isInteractive: true,
    conditionKey:  "informal_economy_surge",
    minActionsGap: 6,
    choices: [
      {
        id:                  "plan_formalisation_nationale",
        label:               "Plan national de formalisation",
        consequence:         "Un plan d'accompagnement massif est lancé pour réintégrer l'économie informelle fictive dans le circuit légal. Les résultats demandent du temps, mais la trajectoire s'inverse. La confiance fiscale revient progressivement.",
        effects:             { money: -250 },
        indicatorEffects:    {},
        fiscalConsentDelta:  20,
        taxEfficiencyDelta:  10,
        queuesDelayedConsequence: {
          id:           "formalization_economy_boost",
          delayActions: 8,
          effectType:   "indicator_effect",
          payload:      { economy: 2 },
        },
      },
      {
        id:                  "reduction_drastique_pression",
        label:               "Réduire drastiquement la pression fiscale",
        consequence:         "Le gouvernement fait le choix de rendre la fiscalité fictive moins confiscatoire. En réduisant les taux, il espère réintégrer spontanément une partie de l'économie souterraine. La manœuvre est risquée mais libère la pression.",
        effects:             { money: -100 },
        indicatorEffects:    {},
        taxPressureDelta:    -15,
        fiscalConsentDelta:  15,
      },
      {
        id:                  "repression_fiscale_intensive",
        label:               "Répression fiscale intensive",
        consequence:         "Le gouvernement déploie l'arsenal coercitif de l'État pour forcer le retour dans la légalité. L'efficacité du recouvrement progresse, mais la brutalité de l'approche génère une nouvelle vague de ressentiment populaire.",
        effects:             {},
        indicatorEffects:    {},
        taxEfficiencyDelta:  5,
        fiscalConsentDelta:  -8,
        queuesDelayedConsequence: {
          id:           "fiscal_repression_backlash",
          delayActions: 5,
          effectType:   "hidden_politics",
          payload:      { popularFatigue: 4 },
        },
      },
    ],
  },
];
