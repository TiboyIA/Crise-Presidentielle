import type { NewsEvent } from "@/types/strategy";

/**
 * Événements liés à l'inflation et au pouvoir d'achat.
 * Aucune donnée économique réelle. Aucun chiffre officiel réel.
 * Pilotage présidentiel fictif uniquement.
 */
export const INFLATION_EVENTS: NewsEvent[] = [

  // ── Signal — premier signe d'inflation (faible, auto) ─────────────────────
  {
    id: "inflation_signal",
    title: "Premiers signaux d'inflation — hausse des prix à la consommation",
    source: "Bureau National des Indicateurs Économiques",
    type: "economie",
    urgency: "faible",
    description:
      "Les remontées des indicateurs économiques signalent une hausse progressive des prix à la consommation. Les produits de première nécessité sont en première ligne. Le phénomène reste modéré mais son évolution mérite une surveillance accrue.",
    isInteractive: false,
    conditionKey: "inflation_signal",
    minActionsGap: 20,
    autoEffects: {},
  },

  // ── Alerte inflation (forte, interactive) ─────────────────────────────────
  {
    id: "inflation_alert",
    title: "Alerte gouvernementale — inflation préoccupante",
    source: "Conseil Économique National / Bureau des Indicateurs",
    type: "economie",
    urgency: "forte",
    description:
      "Les indicateurs économiques signalent une accélération de la hausse des prix. Le pouvoir d'achat des ménages se contracte de manière visible. Les partenaires sociaux exigent une réponse présidentielle. Le gouvernement doit se positionner.",
    isInteractive: true,
    conditionKey: "inflation_alert",
    minActionsGap: 18,
    choices: [
      {
        id: "inflation_plan_soutien",
        label: "Lancer un plan de soutien ciblé aux ménages modestes",
        consequence:
          "Un dispositif d'aide directe est mis en place. Le soutien rassure la population mais creuse le budget. Le signal est positif pour la cohésion sociale.",
        effects: { money: -800 },
        indicatorEffects: { popularity: 3, cohesion: 2 },
        hiddenPoliticsEffects: { popularFatigue: -5, mediaMood: 4, scandalRisk: -3 },
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
        communicationRegister: "empathique",
      },
      {
        id: "inflation_communication",
        label: "Discours de confiance — rassurer sans mesures immédiates",
        consequence:
          "Le gouvernement publie un message de fermeté. La communication contient l'inquiétude à court terme mais n'apporte pas de solution concrète. Le risque d'un retournement médiatique reste élevé.",
        effects: { influence: -8 },
        indicatorEffects: { popularity: -2 },
        hiddenPoliticsEffects: { mediaMood: 5, scandalRisk: 4 },
        pathologyDelta: { minimization: 8 },
        communicationRegister: "institutionnel",
        declarationTheme: "fiscalite",
        declarationStance: "pro",
      },
      {
        id: "inflation_rigueur",
        label: "Politique de rigueur budgétaire — freiner les dépenses",
        consequence:
          "Le gouvernement opte pour une politique de maîtrise des dépenses. La discipline budgétaire rassure les marchés et contient l'inflation à moyen terme mais pèse sur la popularité immédiate.",
        effects: { money: 200 },
        indicatorEffects: { popularity: -3, economy: 2 },
        hiddenPoliticsEffects: { eliteTrust: 5, institutionalStability: 3, popularFatigue: 2 },
        declarationTheme: "depenses_publiques",
        declarationStance: "contre",
        communicationRegister: "technocratique",
      },
    ],
  },

  // ── Crise du pouvoir d'achat (critique, interactive) ──────────────────────
  {
    id: "inflation_crisis",
    title: "Crise du pouvoir d'achat — contestation sociale",
    source: "Observatoire Social National / Secrétariat Général de l'Élysée",
    type: "social",
    urgency: "critique",
    description:
      "L'inflation atteint un niveau critique. Des manifestations spontanées éclatent dans plusieurs villes. Des syndicats appellent à une journée nationale de mobilisation. Le gouvernement est sous pression maximale : chaque décision peut amplifier ou freiner la crise.",
    isInteractive: true,
    conditionKey: "inflation_crisis",
    minActionsGap: 22,
    choices: [
      {
        id: "inflation_urgence_sociale",
        label: "Plan d'urgence sociale — bouclier de pouvoir d'achat",
        consequence:
          "Un plan massif est déployé : aides directes, plafonnement des prix fictifs et soutien aux plus fragiles. Le coût est élevé mais la mobilisation sociale retombe. Le signal est fort et la confiance populaire se stabilise.",
        effects: { money: -1500 },
        indicatorEffects: { popularity: 5, cohesion: 4 },
        hiddenPoliticsEffects: { popularFatigue: -8, scandalRisk: -5, mediaMood: 6 },
        communicationRegister: "empathique",
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
      },
      {
        id: "inflation_dialogue",
        label: "Appel au dialogue — table ronde nationale",
        consequence:
          "Le Président convoque une table ronde associant syndicats, patronat et élus. Le processus désamorce les tensions immédiates et mobilise les partenaires sociaux. La solution prend du temps mais renforce la légitimité institutionnelle.",
        effects: { influence: -15 },
        indicatorEffects: { popularity: 1 },
        hiddenPoliticsEffects: { institutionalStability: 5, eliteTrust: 4, mediaMood: 5, regionalTension: -4 },
        communicationRegister: "diplomatique",
      },
      {
        id: "inflation_encadrement",
        label: "Mesures d'encadrement autoritaire des prix",
        consequence:
          "Le gouvernement impose un blocage administratif des prix fictifs. La mesure est populiste mais génère des tensions avec les acteurs économiques et aggrave les pénuries latentes. Le risque de retournement est élevé.",
        effects: { influence: -10 },
        indicatorEffects: { popularity: 2, economy: -3 },
        hiddenPoliticsEffects: { eliteTrust: -5, scandalRisk: 6, regionalTension: 5 },
        pathologyDelta: { fearSpeech: 8, scapegoating: 6 },
        communicationRegister: "populaire",
      },
    ],
  },

  // ── Pouvoir d'achat en chute — enquête nationale (moyenne, interactive) ───
  {
    id: "purchasing_power_low",
    title: "Pouvoir d'achat en chute — enquête nationale",
    source: "Observatoire du Niveau de Vie / Institut Fictif des Sondages",
    type: "social",
    urgency: "moyenne",
    description:
      "Une enquête nationale révèle une dégradation significative du niveau de vie des ménages. Une large proportion de la population déclare avoir réduit ses dépenses sur des postes essentiels. Le rapport interpelle directement la présidence sur sa capacité à répondre à l'urgence sociale.",
    isInteractive: true,
    conditionKey: "purchasing_power_low",
    minActionsGap: 20,
    choices: [
      {
        id: "ppa_cheque",
        label: "Chèque pouvoir d'achat — aide directe aux ménages",
        consequence:
          "Un versement direct est accordé aux ménages les plus exposés. L'impact est immédiat sur le terrain et visiblement ressenti. Le geste est apprécié mais son financement creuse le déficit.",
        effects: { money: -600 },
        indicatorEffects: { popularity: 4, cohesion: 2 },
        hiddenPoliticsEffects: { popularFatigue: -4, mediaMood: 5 },
        communicationRegister: "populaire",
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
      },
      {
        id: "ppa_commission",
        label: "Commission parlementaire — diagnostic approfondi",
        consequence:
          "Une commission est chargée d'établir un diagnostic complet et de proposer des réformes structurelles. La démarche rassure par sa rigueur mais sa lenteur frustre ceux qui attendent des résultats concrets.",
        effects: { intelligence: 6 },
        indicatorEffects: { popularity: -1 },
        hiddenPoliticsEffects: { eliteTrust: 4, mediaMood: 3, institutionalStability: 3 },
        pathologyDelta: { technocraticColdness: 6 },
        communicationRegister: "institutionnel",
        queuesDelayedConsequence: {
          id: "ppa_commission_delayed",
          delayActions: 12,
          effectType: "indicator_effect",
          payload: { economy: 2, cohesion: 1 },
        },
      },
      {
        id: "ppa_reforme",
        label: "Réforme structurelle — marché du travail et compétitivité",
        consequence:
          "Le gouvernement engage une réforme en profondeur pour améliorer la productivité et l'emploi. L'effet sera durable mais les résistances sociales immédiates sont importantes.",
        effects: { influence: -12, technology: 4 },
        indicatorEffects: { economy: 3 },
        hiddenPoliticsEffects: { institutionalStability: 4, eliteTrust: 3, popularFatigue: 3 },
        declarationTheme: "fiscalite",
        declarationStance: "pro",
        communicationRegister: "technocratique",
      },
    ],
  },

  // ── Risque de stagnation économique (faible, interactive) ──────────────────
  {
    id: "economic_stagnation",
    title: "Risque de stagnation — l'économie au point mort",
    source: "Conseil Économique National",
    type: "economie",
    urgency: "faible",
    description:
      "Les indicateurs économiques révèlent une situation paradoxale : l'inflation est basse mais la croissance est absente. L'économie nationale tourne au ralenti. Les experts parlent de risque de déflation et de trappe à stagnation. Une relance ciblée pourrait inverser la tendance.",
    isInteractive: true,
    conditionKey: "economic_stagnation",
    minActionsGap: 25,
    choices: [
      {
        id: "stag_relance",
        label: "Plan de relance — investissements stratégiques ciblés",
        consequence:
          "Le gouvernement injecte des fonds dans des secteurs stratégiques : infrastructure numérique, formation et innovation. La relance génère des effets positifs à moyen terme sur l'emploi et la productivité.",
        effects: { money: -800, technology: 5 },
        indicatorEffects: { economy: 4, cohesion: 1 },
        hiddenPoliticsEffects: { institutionalStability: 3, eliteTrust: 2 },
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
        communicationRegister: "institutionnel",
      },
      {
        id: "stag_attendre",
        label: "Attendre une reprise naturelle — prudence budgétaire",
        consequence:
          "Le gouvernement choisit de ne pas intervenir et de laisser l'économie se rééquilibrer seule. La posture conservatrice préserve les finances mais retarde la reprise et laisse une fenêtre à l'opposition.",
        effects: {},
        indicatorEffects: { economy: -2 },
        hiddenPoliticsEffects: { mediaMood: -3, scandalRisk: 3 },
        pathologyDelta: { minimization: 5, technocraticColdness: 4 },
        communicationRegister: "technocratique",
        queuesDelayedConsequence: {
          id: "stag_attendre_delayed",
          delayActions: 15,
          effectType: "hidden_politics",
          payload: { scandalRisk: 5, popularFatigue: 3 },
        },
      },
    ],
  },

];
