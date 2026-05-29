import type { NewsEvent } from "@/types/strategy";

export const CENTRAL_BANK_EVENTS: NewsEvent[] = [
  // ── Décision de taux : hausse ─────────────────────────────────────────────
  {
    id:            "cb_rate_hike",
    title:         "La banque centrale relève ses taux directeurs",
    source:        "Banque Centrale Nationale — Communiqué officiel",
    type:          "economie",
    urgency:       "forte",
    description:
      "La banque centrale annonce une hausse de ses taux directeurs en réponse aux pressions inflationnistes. La décision est conforme à son mandat de stabilité des prix, mais elle pèsera sur le crédit, l'investissement et la dynamique économique à court terme. Le gouvernement est attendu sur sa réaction.",
    isInteractive: true,
    minActionsGap: 22,
    conditionKey:  "cb_rate_hike",
    choices: [
      {
        id:          "cb_hike_respect",
        label:       "Saluer la décision et respecter l'indépendance",
        consequence:
          "Déclaration de soutien à l'indépendance de la banque centrale. Le marché interprète positivement la clarté du signal institutionnel. La crédibilité de l'institution est renforcée. La tension entre politique monétaire et budgétaire se détend.",
        effects:                    {},
        centralBankCredibilityDelta: 6,
        monetaryTensionDelta:       -8,
        investorConfidenceDelta:     2,
        hiddenPoliticsEffects:       { institutionalStability: 2 },
      },
      {
        id:          "cb_hike_criticize",
        label:       "Critiquer publiquement la hausse des taux",
        consequence:
          "La critique publique du gouvernement envers la banque centrale fragilise la perception de son indépendance. Les marchés notent la friction institutionnelle. Court terme : popularité auprès des emprunteurs. Long terme : crédibilité de l'institution érodée, tensions accentuées.",
        effects:                    {},
        centralBankCredibilityDelta: -9,
        monetaryTensionDelta:        12,
        indicatorEffects:            { popularity: 2 },
        hiddenPoliticsEffects:       { institutionalStability: -2 },
        queuesDelayedConsequence: {
          id:           "cb_hike_criticize_delayed",
          delayActions: 4,
          effectType:   "hidden_politics",
          payload:      { popularFatigue: 2 },
        },
      },
      {
        id:          "cb_hike_coordinate",
        label:       "Coordonner une réponse fiscale complémentaire",
        consequence:
          "Le gouvernement annonce des mesures fiscales ciblées pour atténuer l'impact de la hausse des taux sur les ménages et les entreprises vulnérables, sans contester la décision monétaire. La tension institutionnelle se réduit. La cohérence des politiques publiques rassure.",
        effects:                    { money: -1 },
        centralBankCredibilityDelta: 2,
        monetaryTensionDelta:       -10,
        fiscalSpendingType:          "emergency_aid",
        fiscalSpendingIntensity:     45,
        hiddenPoliticsEffects:       { popularFatigue: -2 },
      },
    ],
  },

  // ── Décision de taux : baisse ─────────────────────────────────────────────
  {
    id:            "cb_rate_cut",
    title:         "La banque centrale abaisse ses taux directeurs",
    source:        "Banque Centrale Nationale — Communiqué officiel",
    type:          "economie",
    urgency:       "forte",
    description:
      "Face au ralentissement économique, la banque centrale abaisse ses taux directeurs pour soutenir le crédit et l'activité. La décision soulage la pression sur les emprunteurs, mais des voix s'inquiètent d'un risque inflationniste si la stimulation est maintenue trop longtemps. La position du gouvernement est attendue.",
    isInteractive: true,
    minActionsGap: 22,
    conditionKey:  "cb_rate_cut",
    choices: [
      {
        id:          "cb_cut_welcome",
        label:       "Accueillir favorablement la décision",
        consequence:
          "Déclaration positive sans interférence dans la décision. L'opinion perçoit un gouvernement cohérent avec la politique monétaire. La crédibilité de la banque est préservée et la tension institutionnelle reste maîtrisée.",
        effects:                    {},
        centralBankCredibilityDelta: 4,
        monetaryTensionDelta:       -5,
        indicatorEffects:            { popularity: 1 },
      },
      {
        id:          "cb_cut_push_more",
        label:       "Appeler à des baisses plus agressives",
        consequence:
          "La pression publique pour accélérer les baisses de taux envoie un signal d'ingérence. Les marchés s'interrogent sur l'indépendance effective de la banque. Court terme : popularité auprès des acteurs économiques endettés. Long terme : crédibilité fragilisée.",
        effects:                    {},
        centralBankCredibilityDelta: -7,
        monetaryTensionDelta:        10,
        indicatorEffects:            { popularity: 2 },
        queuesDelayedConsequence: {
          id:           "cb_cut_push_delayed",
          delayActions: 5,
          effectType:   "indicator_effect",
          payload:      { economy: -1 },
        },
      },
      {
        id:          "cb_cut_stimulus_plan",
        label:       "Annoncer un plan de stimulation complémentaire",
        consequence:
          "Le gouvernement accompagne la décision monétaire d'un plan d'investissement coordonné. La convergence des politiques renforce le signal de soutien économique sans affaiblir la banque centrale. Risque : l'addition de stimuli pourrait raviver l'inflation.",
        effects:                    { money: -1 },
        centralBankCredibilityDelta: 3,
        monetaryTensionDelta:       -6,
        fiscalSpendingType:          "infrastructure",
        fiscalSpendingIntensity:     55,
      },
    ],
  },

  // ── Crise de crédibilité ──────────────────────────────────────────────────
  {
    id:            "cb_credibility_warning",
    title:         "La crédibilité de la banque centrale s'érode",
    source:        "Revue des marchés financiers — Rapport trimestriel",
    type:          "economie",
    urgency:       "critique",
    description:
      "Les analystes signalent une perte de confiance dans la banque centrale nationale. Les anticipations d'inflation se désancrent progressivement. L'institution est perçue comme soumise à des pressions politiques. Si la tendance n'est pas inversée, les effets se feront sentir sur les marchés, les taux longs et la stabilité financière.",
    isInteractive: true,
    minActionsGap: 28,
    conditionKey:  "cb_credibility_warning",
    choices: [
      {
        id:          "cb_cred_defend",
        label:       "Défendre publiquement l'indépendance de l'institution",
        consequence:
          "Déclaration présidentielle forte sur l'importance de l'indépendance de la banque centrale. Le signal est clair : aucune ingérence politique ne sera tolérée. La crédibilité remonte et la tension institutionnelle se détend.",
        effects:                    {},
        centralBankCredibilityDelta: 12,
        monetaryTensionDelta:       -12,
        hiddenPoliticsEffects:       { institutionalStability: 3 },
        investorConfidenceDelta:      3,
      },
      {
        id:          "cb_cred_reform",
        label:       "Proposer une réforme du cadre de gouvernance",
        consequence:
          "Le gouvernement propose de renforcer le cadre légal de l'indépendance de la banque centrale, avec plus de transparence et un mandat clair. Processus long, mais signal positif sur la volonté institutionnelle. Crédibilité partiellement restaurée.",
        effects:                    { influence: -1 },
        centralBankCredibilityDelta:  8,
        monetaryTensionDelta:        -8,
        hiddenPoliticsEffects:        { institutionalStability: 4 },
        indicatorEffects:             { popularity: 1 },
        queuesDelayedConsequence: {
          id:           "cb_reform_delayed",
          delayActions: 6,
          effectType:   "hidden_politics",
          payload:      { institutionalStability: 3 },
        },
      },
      {
        id:          "cb_cred_minimize",
        label:       "Minimiser les inquiétudes — la situation est sous contrôle",
        consequence:
          "Le gouvernement écarte les signaux d'alerte, estimant que la situation est maîtrisée. Les marchés ne sont pas convaincus. La crédibilité continue de se dégrader. La tension reste élevée. Court terme : évitement du débat. Long terme : aggravation du problème.",
        effects:                    {},
        centralBankCredibilityDelta: -6,
        monetaryTensionDelta:         5,
        hiddenPoliticsEffects:        { popularFatigue: 3 },
      },
    ],
  },

  // ── Nomination du gouverneur ──────────────────────────────────────────────
  {
    id:            "cb_governor_nomination",
    title:         "Nomination du gouverneur de la banque centrale",
    source:        "Élysée — Conseil des nominations économiques",
    type:          "economie",
    urgency:       "forte",
    description:
      "Le mandat du gouverneur de la banque centrale arrive à son terme. La nomination d'un successeur est une décision rare à fort impact à long terme : elle influe sur le biais de la politique monétaire pour les années à venir. Trois profils sont sur la table.",
    isInteractive: true,
    minActionsGap: 40,
    conditionKey:  "cb_governor_nomination",
    choices: [
      {
        id:             "cb_appoint_hawkish",
        label:          "Profil orthodoxe — priorité à la stabilité des prix",
        consequence:    "Nomination d'un gouverneur à profil hawkish. La banque maintiendra une politique restrictive, réagissant rapidement à toute poussée inflationniste. Les marchés apprécient la discipline affichée. Risque de ralentissement économique si les taux s'élèvent trop.",
        effects:                     { influence: -1 },
        centralBankCredibilityDelta:  10,
        monetaryTensionDelta:         4,
        investorConfidenceDelta:       3,
        centralBankProfileChange:     "hawkish",
      },
      {
        id:             "cb_appoint_balanced",
        label:          "Profil équilibré — mandat dual inflation/emploi",
        consequence:    "Nomination d'un gouverneur au profil équilibré. La banque prendra en compte à la fois l'inflation et l'emploi dans ses décisions. Approche prudente, bien reçue par les institutions internationales. Crédibilité maintenue sans biais marqué.",
        effects:                     {},
        centralBankCredibilityDelta:  6,
        monetaryTensionDelta:        -4,
        hiddenPoliticsEffects:        { institutionalStability: 2 },
        centralBankProfileChange:    "balanced",
      },
      {
        id:             "cb_appoint_dovish",
        label:          "Profil accommodant — priorité à la croissance et à l'emploi",
        consequence:    "Nomination d'un gouverneur à profil dovish. La banque favorisera des taux bas pour soutenir l'activité. Court terme : dynamisme économique. Long terme : risque inflationniste et possible perte de crédibilité si l'inflation déraille.",
        effects:                     {},
        centralBankCredibilityDelta: -2,
        monetaryTensionDelta:        -6,
        indicatorEffects:             { popularity: 2 },
        centralBankProfileChange:    "dovish",
      },
    ],
  },

  // ── Tension monétaire critique ────────────────────────────────────────────
  {
    id:            "cb_monetary_tension_crisis",
    title:         "Tension critique entre gouvernement et banque centrale",
    source:        "Observatoire des finances publiques",
    type:          "economie",
    urgency:       "critique",
    description:
      "La friction entre la politique budgétaire du gouvernement et la politique monétaire de la banque centrale atteint un niveau critique. Les médias évoquent une crise institutionnelle. Les marchés s'inquiètent d'une possible perte d'indépendance de la banque. La communauté financière internationale observe la situation.",
    isInteractive: true,
    minActionsGap: 25,
    conditionKey:  "cb_monetary_tension_crisis",
    choices: [
      {
        id:          "cb_tension_backdown",
        label:       "Reculer — accepter la politique monétaire en place",
        consequence:
          "Le gouvernement reconnaît publiquement le bien-fondé de la politique monétaire et retire ses critiques. Signal fort en faveur de l'indépendance institutionnelle. La crédibilité de la banque est restaurée et la tension se dissipe significativement. Coût politique à court terme.",
        effects:                    {},
        centralBankCredibilityDelta: 14,
        monetaryTensionDelta:       -18,
        hiddenPoliticsEffects:       { institutionalStability: 4 },
        investorConfidenceDelta:      4,
        indicatorEffects:            { popularity: -2 },
      },
      {
        id:          "cb_tension_maintain_pressure",
        label:       "Maintenir la pression sur la banque centrale",
        consequence:
          "Le gouvernement persiste dans ses critiques de la politique monétaire. Les marchés perçoivent une menace sérieuse sur l'indépendance de l'institution. La crédibilité plonge. L'investissement étranger recule. La crise institutionnelle s'aggrave.",
        effects:                    {},
        centralBankCredibilityDelta: -14,
        monetaryTensionDelta:        -3,
        investorConfidenceDelta:     -5,
        hiddenPoliticsEffects:       { institutionalStability: -4, popularFatigue: 4 },
        queuesDelayedConsequence: {
          id:           "cb_pressure_delayed",
          delayActions: 5,
          effectType:   "hidden_politics",
          payload:      { institutionalStability: -4 },
        },
      },
      {
        id:          "cb_tension_mediation",
        label:       "Proposer une médiation institutionnelle",
        consequence:
          "Le gouvernement demande une concertation formelle avec la banque centrale dans le cadre des instances prévues, sans pression publique. La démarche est perçue comme constructive, bien qu'incomplète. La tension diminue modérément. La crédibilité se stabilise.",
        effects:                    { influence: -1 },
        centralBankCredibilityDelta: -2,
        monetaryTensionDelta:       -12,
        hiddenPoliticsEffects:       { institutionalStability: 3 },
      },
    ],
  },
];
