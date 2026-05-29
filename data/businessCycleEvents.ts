import type { NewsEvent } from "@/types/strategy";

export const BUSINESS_CYCLE_EVENTS: NewsEvent[] = [
  // ── Expansion ─────────────────────────────────────────────────────────────
  {
    id:            "cycle_expansion_opportunity",
    title:         "Phase d'expansion — fenêtre d'opportunité économique",
    source:        "Conseil économique national",
    type:          "economie",
    urgency:       "moyenne",
    description:
      "L'économie nationale est entrée en phase d'expansion. La croissance s'accélère, l'emploi progresse et la confiance des acteurs économiques est au beau fixe. Cette fenêtre est rare : les marges de manœuvre budgétaire existent. Les choix faits maintenant détermineront la trajectoire des années à venir.",
    isInteractive: true,
    minActionsGap: 20,
    conditionKey:  "cycle_expansion_opportunity",
    choices: [
      {
        id:          "cycle_expand_invest",
        label:       "Accélérer l'investissement structurel",
        consequence:
          "Lancement d'un programme d'infrastructure et industriel ambitieux. L'expansion sert à construire les capacités de demain. Court terme : dynamisme. Long terme : risque de surchauffe si l'investissement alimente trop la demande.",
        effects:                  { money: -2 },
        fiscalSpendingType:       "infrastructure",
        fiscalSpendingIntensity:  65,
        investorConfidenceDelta:  2,
      },
      {
        id:          "cycle_expand_consolidate",
        label:       "Consolider les finances publiques",
        consequence:
          "Profiter de la conjoncture favorable pour reconstituer les marges budgétaires et réduire les tensions fiscales. Les marchés apprécient la discipline. La banque centrale est moins sollicitée. Moindre momentum à court terme, plus grande résilience aux crises futures.",
        effects:                   { money: 1 },
        investorConfidenceDelta:    3,
        centralBankCredibilityDelta: 3,
        monetaryTensionDelta:       -5,
        hiddenPoliticsEffects:      { institutionalStability: 2 },
      },
      {
        id:          "cycle_expand_redistribute",
        label:       "Redistribuer les fruits de la croissance",
        consequence:
          "Plan de réduction des inégalités et d'amélioration de la mobilité sociale profitant de la conjoncture favorable. La cohésion sociale se renforce. L'expansion est ressentie par le plus grand nombre. Coût politique modéré, effet durable sur la stabilité.",
        effects:                  { money: -1 },
        inequalityIndexDelta:     -7,
        socialMobilityDelta:       5,
        hiddenPoliticsEffects:    { popularFatigue: -4 },
        indicatorEffects:         { popularity: 2 },
      },
    ],
  },

  // ── Surchauffe ────────────────────────────────────────────────────────────
  {
    id:            "cycle_surchauffe_warning",
    title:         "Surchauffe économique — signaux d'alerte",
    source:        "Observatoire conjoncturel — Note trimestrielle",
    type:          "economie",
    urgency:       "forte",
    description:
      "L'économie tourne au-delà de ses capacités optimales. L'inflation accélère, les tensions sur le marché du travail s'intensifient et la banque centrale envoie des signaux de prudence. Sans intervention, la surchauffe se transformera en correction brutale. La décision du gouvernement aura des conséquences durables.",
    isInteractive: true,
    minActionsGap: 22,
    conditionKey:  "cycle_surchauffe_warning",
    choices: [
      {
        id:          "cycle_surchauffe_brake",
        label:       "Freiner la demande — rigueur budgétaire",
        consequence:
          "Réduction des dépenses publiques et signal de discipline fiscale. La surchauffe est contenue. Les marchés rassurent, la banque centrale allège la pression monétaire. Court terme : impopularité. Long terme : atterrissage en douceur au lieu d'un crash.",
        effects:                   { money: 1 },
        centralBankCredibilityDelta: 5,
        monetaryTensionDelta:       -7,
        hiddenPoliticsEffects:      { popularFatigue: 4, institutionalStability: 2 },
        indicatorEffects:           { popularity: -2 },
      },
      {
        id:          "cycle_surchauffe_coordinate",
        label:       "Piloter un atterrissage coordonné",
        consequence:
          "Dialogue avec la banque centrale et les acteurs économiques pour ralentir progressivement sans casser la croissance. Réorientation de la dépense vers la formation et la productivité plutôt que la stimulation de la demande.",
        effects:                   { money: -1, influence: -1 },
        fiscalSpendingType:        "training",
        fiscalSpendingIntensity:   55,
        centralBankCredibilityDelta: 3,
        monetaryTensionDelta:       -5,
      },
      {
        id:          "cycle_surchauffe_ignore",
        label:       "Maintenir le cap — la croissance se régulera seule",
        consequence:
          "Le gouvernement fait le pari que la croissance se maintiendra sans correction. Court terme : popularité préservée. Mais l'inflation continue de progresser, et le cycle se rapproche d'un retournement brutal. La facture sera payée plus tard.",
        effects:                    {},
        indicatorEffects:           { popularity: 2 },
        queuesDelayedConsequence: {
          id:           "surchauffe_ignore_delayed",
          delayActions: 6,
          effectType:   "hidden_politics",
          payload:      { popularFatigue: 6 },
        },
      },
    ],
  },

  // ── Ralentissement ────────────────────────────────────────────────────────
  {
    id:            "cycle_ralentissement_signal",
    title:         "Ralentissement économique — premières turbulences",
    source:        "Ministère de l'Économie — Synthèse mensuelle",
    type:          "economie",
    urgency:       "forte",
    description:
      "Les indicateurs avancés confirment le ralentissement de l'activité. Les embauches marquent le pas, l'investissement privé recule, et les carnets de commandes se vident progressivement. Ce n'est pas encore la récession, mais l'inflexion est là. Le gouvernement peut encore agir pour amortir la trajectoire.",
    isInteractive: true,
    minActionsGap: 22,
    conditionKey:  "cycle_ralentissement_signal",
    choices: [
      {
        id:          "cycle_ralen_sme_support",
        label:       "Soutien ciblé aux PME et à l'emploi local",
        consequence:
          "Plan d'urgence pour les petites et moyennes entreprises, principales victimes des ralentissements conjoncturels. Formations, allègements ciblés, simplification. Les PME tiennent le tissu économique local. Effet modéré mais lisible.",
        effects:                  { money: -1 },
        fiscalSpendingType:       "training",
        fiscalSpendingIntensity:  60,
        smeHealthDelta:            6,
        localCommerceDelta:        4,
      },
      {
        id:          "cycle_ralen_stability",
        label:       "Stabilisation fiscale — préserver la confiance",
        consequence:
          "Signal fort aux marchés : le gouvernement ne laissera pas le ralentissement dégénérer. Engagement de soutien mesuré et crédible. La confiance des investisseurs se stabilise. Pas de grand plan, mais une posture rassurante.",
        effects:                   {},
        investorConfidenceDelta:    4,
        centralBankCredibilityDelta: 2,
        hiddenPoliticsEffects:      { institutionalStability: 2 },
      },
      {
        id:          "cycle_ralen_reform",
        label:       "Engager des réformes structurelles préventives",
        consequence:
          "Le ralentissement est une opportunité de conduire des réformes que la croissance rendait politiquement difficiles. Innovation, productivité, simplification. Aucun effet visible à court terme — mais la reprise future sera plus solide.",
        effects:                  { money: -1, influence: -1 },
        fiscalSpendingType:       "research",
        fiscalSpendingIntensity:  62,
        startupEcosystemDelta:     4,
        strategicIndustryDelta:    3,
      },
    ],
  },

  // ── Récession ─────────────────────────────────────────────────────────────
  {
    id:            "cycle_recession_crisis",
    title:         "Récession — contraction économique confirmée",
    source:        "Institut national de statistique — Bulletin de conjoncture",
    type:          "economie",
    urgency:       "critique",
    description:
      "L'économie nationale est officiellement en récession. La contraction de l'activité s'installe. Les recettes fiscales diminuent, le chômage progresse et les tensions sociales s'intensifient. L'opposition capitalise sur la détresse économique. Chaque décision aura des conséquences durables sur la trajectoire de sortie de crise.",
    isInteractive: true,
    minActionsGap: 25,
    conditionKey:  "cycle_recession_crisis",
    choices: [
      {
        id:          "cycle_recession_relance",
        label:       "Plan de relance budgétaire — stimuler l'économie",
        consequence:
          "Dépenses publiques massives pour relancer l'activité et l'emploi. Le pari : la demande publique compense le retrait du secteur privé. Les marchés sont partagés. Coût budgétaire élevé. L'efficacité dépend de la capacité de l'économie à absorber l'injection.",
        effects:                  { money: -3 },
        fiscalSpendingType:       "industry",
        fiscalSpendingIntensity:  75,
        indicatorEffects:         { popularity: 2 },
        investorConfidenceDelta:  -2,
      },
      {
        id:          "cycle_recession_social",
        label:       "Filet social d'urgence — soutenir les ménages",
        consequence:
          "Extension des dispositifs de soutien social, chômage partiel, aides ciblées. La détresse humaine est la priorité. L'économie ne redémarre pas pour autant, mais la fracture sociale est contenue. La confiance populaire résiste mieux que dans un scénario d'abandon.",
        effects:                  { money: -2 },
        fiscalSpendingType:       "emergency_aid",
        fiscalSpendingIntensity:  65,
        hiddenPoliticsEffects:    { popularFatigue: -6, institutionalStability: 2 },
        inequalityIndexDelta:     -5,
      },
      {
        id:          "cycle_recession_unity",
        label:       "Appel à l'unité nationale — pacte de sortie de crise",
        consequence:
          "Le gouvernement réunit syndicats, patronat et représentants civils autour d'un pacte de sortie de crise. Aucun plan spectaculaire — mais une légitimité retrouvée pour gouverner dans l'adversité. La cohésion sociale résiste. La confiance institutionnelle se restaure.",
        effects:                    { influence: -2 },
        hiddenPoliticsEffects:      { institutionalStability: 5, popularFatigue: -4 },
        inequalityIndexDelta:       -4,
        centralBankCredibilityDelta: 2,
        indicatorEffects:           { popularity: 2 },
      },
    ],
  },

  // ── Reprise ───────────────────────────────────────────────────────────────
  {
    id:            "cycle_reprise_window",
    title:         "Reprise économique — fenêtre de reconstruction",
    source:        "Conseil économique national",
    type:          "economie",
    urgency:       "forte",
    description:
      "Les premiers signaux de reprise sont là. La confiance revient progressivement. Les marchés reprennent des couleurs. Mais la reprise reste fragile : une erreur de politique pourrait replonger l'économie dans la récession. Le gouvernement doit choisir comment ancrer cette dynamique naissante.",
    isInteractive: true,
    minActionsGap: 20,
    conditionKey:  "cycle_reprise_window",
    choices: [
      {
        id:          "cycle_reprise_invest",
        label:       "Saisir la fenêtre — investissement stratégique",
        consequence:
          "La reprise offre une opportunité rare : investir dans la recherche et l'innovation pendant que l'économie se reconstruit. Les gains de productivité prépareront la prochaine expansion sur des bases plus solides.",
        effects:                  { money: -1 },
        fiscalSpendingType:       "research",
        fiscalSpendingIntensity:  62,
        investorConfidenceDelta:   4,
        industrialChampionsDelta:  3,
      },
      {
        id:          "cycle_reprise_secure",
        label:       "Sécuriser la reprise — pas de précipitation",
        consequence:
          "Le gouvernement adopte une posture prudente : pas de grand plan qui risquerait de fragiliser les équilibres retrouvés. Dialogue avec la banque centrale pour aligner les politiques. La reprise avance lentement mais sûrement.",
        effects:                   {},
        centralBankCredibilityDelta: 4,
        monetaryTensionDelta:       -6,
        hiddenPoliticsEffects:      { institutionalStability: 3 },
        investorConfidenceDelta:     2,
      },
    ],
  },
];
