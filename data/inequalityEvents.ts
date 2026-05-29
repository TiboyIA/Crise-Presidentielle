/**
 * inequalityEvents.ts — Événements MODE DELTA Inégalités et Fracture Sociale.
 *
 * 5 événements :
 *   1. Signal d'alerte — inégalités en progression (auto, faible)
 *   2. Alerte fracture — seuil critique d'inégalité (interactive, forte)
 *   3. Crise des inégalités — fracture structurelle grave (interactive, critique)
 *   4. Effondrement de la mobilité — ascenseur social bloqué (interactive, forte)
 *   5. Fenêtre de cohésion — opportunité de réforme sociale (interactive, moyenne)
 *
 * Aucun débat politique réel. Aucune morale imposée. Aucun système partisan.
 */

import type { NewsEvent } from "@/types/strategy";

export const INEQUALITY_EVENTS: NewsEvent[] = [
  // ── 1. Signal d'alerte — diagnostic précoce ──────────────────────────────────
  {
    id:          "inequality_signal",
    title:       "Rapport d'analyse — les inégalités sociales progressent",
    source:      "Observatoire National de la Cohésion Sociale",
    type:        "social",
    urgency:     "faible",
    description: "Les indicateurs fictifs de suivi de la cohésion sociale signalent une progression des inégalités. Les écarts de revenus et d'accès aux opportunités se creusent discrètement. La mobilité sociale montre des signes d'essoufflement dans plusieurs segments de la population. Une intervention préventive permettrait d'éviter l'aggravation.",
    isInteractive: false,
    autoEffects:   {},
    conditionKey:  "inequality_signal",
    minActionsGap: 20,
  },

  // ── 2. Alerte fracture — seuil d'alerte dépassé ──────────────────────────────
  {
    id:          "inequality_alert",
    title:       "Alerte fracture sociale — les inégalités franchissent un seuil critique",
    source:      "Cellule d'Analyse Sociale — Cabinet du Premier Ministre",
    type:        "social",
    urgency:     "forte",
    description: "Les modèles fictifs confirment que l'indice d'inégalité a franchi un seuil préoccupant. L'accès aux services, à l'emploi de qualité et aux perspectives d'avancement se dégrade pour une part croissante de la population. Le sentiment d'injustice se diffuse. L'opposition politique commence à en exploiter la dynamique.",
    isInteractive: true,
    conditionKey:  "inequality_alert",
    minActionsGap: 12,
    choices: [
      {
        id:                    "plan_redistribution_cible",
        label:                 "Plan de redistribution ciblée",
        consequence:           "Des dispositifs fictifs de soutien ciblé sont déployés vers les populations les plus fragilisées. Les transferts sociaux sont renforcés de manière chirurgicale. Les indicateurs d'inégalité amorcent un recul progressif sans pression fiscale généralisée.",
        effects:               { money: -200 },
        indicatorEffects:      {},
        inequalityIndexDelta:  -10,
        socialMobilityDelta:   6,
      },
      {
        id:                    "reforme_acces_emploi",
        label:                 "Réforme de l'accès à l'emploi de qualité",
        consequence:           "Le gouvernement lance une politique fictive d'amélioration de l'accès à l'emploi qualifié : formation, reconversion, accompagnement des actifs précaires. La mobilité sociale se redresse. L'inégalité recule progressivement.",
        effects:               { money: -180, technology: -10 },
        indicatorEffects:      {},
        inequalityIndexDelta:  -7,
        socialMobilityDelta:   10,
      },
      {
        id:                    "attentisme_social",
        label:                 "Maintien du cap — gérer les tensions sans réforme",
        consequence:           "Le gouvernement préfère stabiliser les tensions immédiates sans engager de réforme structurelle. À court terme la situation se calme, mais la dynamique de fond continue de creuser les écarts.",
        effects:               {},
        indicatorEffects:      {},
        queuesDelayedConsequence: {
          id:           "inequality_attentisme_backlash",
          delayActions: 12,
          effectType:   "indicator_effect",
          payload:      { cohesion: -2, popularity: -1 },
        },
      },
    ],
  },

  // ── 3. Crise des inégalités — fracture structurelle grave ─────────────────────
  {
    id:          "inequality_fracture",
    title:       "Crise des inégalités — fracture sociale structurelle",
    source:      "Cellule de Crise Sociale",
    type:        "social",
    urgency:     "critique",
    description: "Les inégalités ont atteint un niveau déstabilisateur. La fracture sociale est désormais visible dans l'espace public. Les écarts d'accès aux soins, à l'éducation et à l'emploi se sont institutionnalisés. La défiance envers les pouvoirs publics grimpe. L'opposition politique exploite ouvertement la situation. Une réponse de fond s'impose.",
    isInteractive: true,
    conditionKey:  "inequality_fracture",
    minActionsGap: 8,
    choices: [
      {
        id:                    "pacte_solidarite_nationale",
        label:                 "Pacte de solidarité nationale",
        consequence:           "Un pacte fictif de solidarité nationale est proclamé : réorientation budgétaire massive vers les services publics, renforcement des transferts sociaux, programme d'accès universel aux soins et à la formation. La fracture recule significativement.",
        effects:               { money: -350 },
        indicatorEffects:      { cohesion: 2 },
        inequalityIndexDelta:  -18,
        socialMobilityDelta:   12,
      },
      {
        id:                    "reforme_mobilite_sociale",
        label:                 "Grande réforme de la mobilité sociale",
        consequence:           "Le gouvernement engage une réforme structurelle de l'ascenseur social : refonte fictive des systèmes de formation, d'accès au logement et d'accompagnement des jeunes. Les effets sont durables mais progressifs.",
        effects:               { money: -250 },
        indicatorEffects:      {},
        inequalityIndexDelta:  -12,
        socialMobilityDelta:   18,
      },
      {
        id:                    "communication_solidarite",
        label:                 "Discours de solidarité — sans réforme immédiate",
        consequence:           "Le gouvernement adopte un discours fort sur la cohésion nationale, sans engager de réforme structurelle. L'effet symbolique est réel à court terme. Mais la dynamique de fond n'est pas enrayée, et la désillusion risque d'aggraver la défiance.",
        effects:               {},
        indicatorEffects:      {},
        inequalityIndexDelta:  -3,
        queuesDelayedConsequence: {
          id:           "inequality_comm_backlash",
          delayActions: 8,
          effectType:   "indicator_effect",
          payload:      { popularity: -2, cohesion: -1 },
        },
      },
    ],
  },

  // ── 4. Effondrement de la mobilité — ascenseur social bloqué ─────────────────
  {
    id:          "social_mobility_collapse",
    title:       "Effondrement de la mobilité sociale — l'ascenseur est en panne",
    source:      "Institut National des Dynamiques Sociales",
    type:        "social",
    urgency:     "forte",
    description: "Les données fictives de l'Institut confirment que la mobilité sociale a atteint un niveau critique. Le chômage des jeunes, la précarisation des emplois et la saturation des voies d'accès traditionnelles bloquent les perspectives d'avancement. La population la plus jeune perçoit l'avenir comme fermé. La défiance intergénérationnelle progresse.",
    isInteractive: true,
    conditionKey:  "social_mobility_collapse",
    minActionsGap: 12,
    choices: [
      {
        id:                    "programme_ascenseur_social",
        label:                 "Programme national d'ascenseur social",
        consequence:           "Un programme fictif d'envergure est lancé : accès accéléré à la formation qualifiante, mentorat, accompagnement des jeunes actifs. Les résultats sont progressifs mais structurellement solides.",
        effects:               { money: -220 },
        indicatorEffects:      {},
        socialMobilityDelta:   14,
        inequalityIndexDelta:  -6,
      },
      {
        id:                    "investissement_jeunesse",
        label:                 "Investissement massif dans la jeunesse",
        consequence:           "Le gouvernement concentre ses ressources fictives sur l'insertion professionnelle des jeunes : stages garantis, formations accélérées, primes à l'embauche. La mobilité repart progressivement, mais les segments plus âgés restent exposés.",
        effects:               { money: -180 },
        indicatorEffects:      {},
        socialMobilityDelta:   10,
        fiscalConsentDelta:    4,
      },
      {
        id:                    "commission_etude_mobilite",
        label:                 "Commission d'étude — diagnositc avant action",
        consequence:           "Une commission fictive est mandatée pour établir un diagnostic approfondi. Le processus prend du temps. La situation ne s'améliore pas immédiatement, mais les recommandations futures pourront être plus ciblées.",
        effects:               {},
        indicatorEffects:      {},
        queuesDelayedConsequence: {
          id:           "mobility_commission_delay",
          delayActions: 15,
          effectType:   "indicator_effect",
          payload:      { cohesion: -1 },
        },
      },
    ],
  },

  // ── 5. Fenêtre de cohésion — opportunité de réforme sociale ──────────────────
  {
    id:          "social_cohesion_window",
    title:       "Fenêtre de cohésion — conditions réunies pour une réforme sociale",
    source:      "Conseil National de la Cohésion et de l'Égalité des Chances",
    type:        "social",
    urgency:     "moyenne",
    description: "Les conditions fictives sont exceptionnellement favorables : la mobilité sociale remonte, les inégalités restent contenues, et le contexte politique offre une marge d'action. Cette fenêtre permet d'engager des réformes structurelles de long terme avec un coût politique réduit. Une opportunité à ne pas laisser passer.",
    isInteractive: true,
    conditionKey:  "social_cohesion_window",
    minActionsGap: 18,
    choices: [
      {
        id:                    "reforme_structurelle_cohesion",
        label:                 "Réforme structurelle de cohésion",
        consequence:           "Le gouvernement saisit la fenêtre pour engager une réforme fictive de fond : refonte des mécanismes de redistribution, investissement dans les services publics universels. Les effets sont durables et renforcent l'image d'un gouvernement responsable.",
        effects:               { money: -250 },
        indicatorEffects:      { cohesion: 3 },
        inequalityIndexDelta:  -8,
        socialMobilityDelta:   10,
      },
      {
        id:                    "consolidation_acquis_sociaux",
        label:                 "Consolidation des acquis — pérenniser les progrès",
        consequence:           "Plutôt que d'élargir le périmètre des réformes, le gouvernement choisit de consolider et pérenniser les progrès acquis. L'approche prudente préserve les gains sans prendre de risques supplémentaires.",
        effects:               { money: -120 },
        indicatorEffects:      {},
        inequalityIndexDelta:  -4,
        socialMobilityDelta:   5,
      },
      {
        id:                    "capitaliser_communication",
        label:                 "Valoriser les résultats — capital politique",
        consequence:           "Le gouvernement choisit de capitaliser sur les bons chiffres plutôt que de réformer davantage. La popularité en bénéficie à court terme. Mais sans consolidation structurelle, les acquis risquent de s'éroder progressivement.",
        effects:               {},
        indicatorEffects:      { popularity: 2 },
        socialMobilityDelta:   2,
      },
    ],
  },
];
