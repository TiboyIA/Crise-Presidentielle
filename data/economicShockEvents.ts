/**
 * economicShockEvents.ts — Chocs économiques externes (MODE DELTA).
 *
 * 10 événements rares représentant des perturbations fictives d'origine externe.
 * Chaque événement crée un choc actif dans l'état du jeu. Les choix présidentiels
 * amortissent le choc (economicShockDamping) en plus d'effets directs sur les
 * indicateurs nationaux.
 *
 * Aucun pays réel contraint. Aucune crise réelle reproduite.
 * Aucune simulation boursière.
 */

import type { NewsEvent } from "@/types/strategy";

export const ECONOMIC_SHOCK_EVENTS: NewsEvent[] = [
  // ── 1. Flambée des prix de l'énergie ─────────────────────────────────────────
  {
    id:          "shock_energy_price_spike",
    title:       "Flambée des prix de l'énergie — choc externe majeur",
    source:      "Agence Nationale de l'Énergie",
    type:        "economie",
    urgency:     "critique",
    description: "Les marchés fictifs de l'énergie subissent une flambée brutale des prix. Les causes sont multiples : tensions géopolitiques dans des régions productrices fictives, réduction des capacités d'extraction et spéculation sur les contrats à terme. La facture énergétique nationale s'envole. L'inflation des coûts de production se propage à l'ensemble de l'économie. Chaque jour d'inaction aggrave la pression inflationniste.",
    isInteractive: true,
    conditionKey:  "shock_energy_price_spike",
    minActionsGap: 30,
    choices: [
      {
        id:                   "bouclier_energetique_urgence",
        label:                "Bouclier énergétique d'urgence",
        consequence:          "Le gouvernement active un mécanisme fictif de plafonnement des prix de l'énergie financé par des réserves stratégiques. Le choc est massivement amorti. Les ménages et les entreprises sont protégés. Le coût budgétaire est élevé mais l'effet stabilisateur est immédiat.",
        effects:              { money: -400, energy: 50 },
        indicatorEffects:     {},
        economicShockDamping: 35,
      },
      {
        id:                   "acceleration_souverainete_energetique",
        label:                "Accélération de la souveraineté énergétique",
        consequence:          "Le gouvernement mobilise les ressources disponibles pour accélérer le déploiement des sources d'énergie nationales fictives. Le choc est partiellement amorti. Les effets à long terme sur l'autonomie énergétique compensent progressivement la flambée actuelle.",
        effects:              { money: -280, energy: 30 },
        indicatorEffects:     {},
        economicShockDamping: 20,
      },
      {
        id:                   "absorber_hausse_structurelle",
        label:                "Absorber la hausse — ajustement structurel",
        consequence:          "Le gouvernement laisse les mécanismes de marché fictifs opérer. Les prix s'ajustent progressivement. L'inflation gagne du terrain. Certains secteurs s'adaptent. La pression populaire monte.",
        effects:              {},
        indicatorEffects:     {},
        economicShockDamping: 8,
        queuesDelayedConsequence: {
          id:           "energy_spike_no_action",
          delayActions: 8,
          effectType:   "indicator_effect",
          payload:      { popularity: -2, publicBudget: -1 },
        },
      },
    ],
  },

  // ── 2. Rupture d'approvisionnement stratégique ────────────────────────────────
  {
    id:          "shock_supply_rupture",
    title:       "Rupture d'approvisionnement stratégique — alerte critique",
    source:      "Cellule de Veille des Chaînes Critiques",
    type:        "economie",
    urgency:     "critique",
    description: "Un fournisseur fictif majeur de matières premières critiques a suspendu ses livraisons. La rupture touche plusieurs secteurs stratégiques simultanément. Les stocks nationaux s'épuisent. Les entreprises dépendantes ralentissent leur production. La pression sur les chaînes logistiques fictives se propage en amont et en aval.",
    isInteractive: true,
    conditionKey:  "shock_supply_rupture",
    minActionsGap: 28,
    choices: [
      {
        id:                   "diversification_urgence_fournisseurs",
        label:                "Diversification d'urgence des fournisseurs",
        consequence:          "Le gouvernement mobilise les services diplomatiques fictifs pour identifier et sécuriser de nouveaux fournisseurs en urgence. Le coût est élevé. La rupture est partiellement comblée. Les chaînes d'approvisionnement se restabilisent progressivement.",
        effects:              { money: -350, influence: -20 },
        indicatorEffects:     {},
        economicShockDamping: 30,
        supplyChainEffects:   {
          materiaux_critiques: { stockLevel: 20 },
          energie:             { stockLevel: 10 },
        },
      },
      {
        id:                   "mobilisation_reserves_nationales",
        label:                "Mobilisation des réserves nationales",
        consequence:          "Les stocks stratégiques fictifs sont mobilisés pour compenser la rupture. L'effet immédiat est stabilisateur. Les réserves s'épuisent cependant, ce qui crée une vulnérabilité à moyen terme.",
        effects:              { money: -200 },
        indicatorEffects:     {},
        economicShockDamping: 18,
        supplyChainEffects:   {
          materiaux_critiques: { stockLevel: 15 },
        },
      },
      {
        id:                   "rationalisation_production",
        label:                "Rationalisation de la production nationale",
        consequence:          "Le gouvernement impose une allocation prioritaire fictive des matières premières disponibles aux secteurs essentiels. La rupture est gérée, non résolue. L'économie ralentit mais tient.",
        effects:              {},
        indicatorEffects:     { economy: -1 },
        economicShockDamping: 10,
      },
    ],
  },

  // ── 3. Crise financière internationale fictive ────────────────────────────────
  {
    id:          "shock_financial_crisis",
    title:       "Crise financière internationale — onde de choc systémique",
    source:      "Observatoire de la Stabilité Financière Mondiale",
    type:        "economie",
    urgency:     "critique",
    description: "Une crise financière fictive d'ampleur systémique ébranle les marchés internationaux. L'onde de choc se propage à travers les circuits fictifs de financement, de change et de confiance. Les investisseurs se replient sur les valeurs sûres. Les financements se raréfient. La récession mondiale menace. Le pays doit gérer les effets de contagion sans en être l'origine.",
    isInteractive: true,
    conditionKey:  "shock_financial_crisis",
    minActionsGap: 35,
    choices: [
      {
        id:                   "coordination_internationale_fictive",
        label:                "Coordination internationale de réponse",
        consequence:          "Le gouvernement prend l'initiative d'une coordination fictive avec ses alliés économiques. Un plan de réponse coordonné est négocié. La confiance des investisseurs se stabilise plus rapidement que prévu. L'onde de choc est partiellement amortie.",
        effects:              { money: -300, influence: -25 },
        indicatorEffects:     {},
        economicShockDamping: 30,
      },
      {
        id:                   "plan_stabilisation_national",
        label:                "Plan de stabilisation économique national",
        consequence:          "Le gouvernement déploie un plan fictif de soutien aux acteurs économiques exposés : garanties fictives, soutien à la liquidité, protection des dépôts. L'impact interne est amorti. La dépendance aux marchés internationaux n'est pas traitée.",
        effects:              { money: -400 },
        indicatorEffects:     {},
        economicShockDamping: 22,
      },
      {
        id:                   "gestion_defensive",
        label:                "Posture défensive — protéger les réserves",
        consequence:          "Le gouvernement choisit de protéger les réserves fictives et d'éviter toute dépense non essentielle. L'économie nationale absorbe le choc sans soutien actif. La contraction est plus profonde mais les marges budgétaires sont préservées.",
        effects:              {},
        indicatorEffects:     {},
        economicShockDamping: 8,
        queuesDelayedConsequence: {
          id:           "financial_crisis_passive",
          delayActions: 10,
          effectType:   "indicator_effect",
          payload:      { economy: -2, popularity: -1 },
        },
      },
    ],
  },

  // ── 4. Recul du commerce mondial ─────────────────────────────────────────────
  {
    id:          "shock_trade_contraction",
    title:       "Recul du commerce mondial — contraction des échanges",
    source:      "Direction Générale du Commerce Extérieur",
    type:        "economie",
    urgency:     "forte",
    description: "Le volume des échanges commerciaux mondiaux fictifs se contracte significativement. La demande extérieure s'effondre. Les industries exportatrices nationales sont directement exposées. La balance commerciale se dégrade. Les perspectives de croissance sont révisées à la baisse. Le chômage structurel dans les secteurs exposés commence à progresser.",
    isInteractive: true,
    conditionKey:  "shock_trade_contraction",
    minActionsGap: 25,
    choices: [
      {
        id:                   "pivot_marche_interieur",
        label:                "Pivot stratégique vers le marché intérieur",
        consequence:          "Le gouvernement oriente les ressources vers la stimulation de la demande intérieure fictive. Les entreprises exportatrices cherchent des débouchés nationaux. La reconversion est partielle mais rapide.",
        effects:              { money: -250 },
        indicatorEffects:     { economy: 1 },
        economicShockDamping: 20,
        smeHealthDelta:       8,
        localCommerceDelta:   10,
      },
      {
        id:                   "negociation_acces_marches",
        label:                "Négociation d'accès préférentiels aux marchés",
        consequence:          "La diplomatie économique fictive est mobilisée pour négocier des accords d'accès préférentiels avec des partenaires. Les exportations trouvent de nouveaux débouchés. Le recul commercial est partiellement compensé.",
        effects:              { money: -180, influence: -15 },
        indicatorEffects:     {},
        economicShockDamping: 15,
        tradeBalanceDelta:    8,
      },
      {
        id:                   "soutien_secteurs_exposes",
        label:                "Soutien ciblé aux secteurs exposés",
        consequence:          "Les secteurs les plus exposés reçoivent un soutien fictif d'urgence pour maintenir l'emploi. La contraction est amortie socialement mais pas économiquement. La balance commerciale continue de se dégrader.",
        effects:              { money: -180 },
        indicatorEffects:     {},
        economicShockDamping: 10,
      },
    ],
  },

  // ── 5. Panique sur les investissements ────────────────────────────────────────
  {
    id:          "shock_investment_panic",
    title:       "Panique des investisseurs — fuite des capitaux fictifs",
    source:      "Banque Centrale Fictive",
    type:        "economie",
    urgency:     "critique",
    description: "Une panique fictive s'est emparée des circuits d'investissement. Les capitaux fuient vers des valeurs refuges. Les financements de projet se tarissent brutalement. Les taux fictifs s'envolent. Les entreprises en croissance ne peuvent plus lever les fonds nécessaires. La dynamique économique nationale risque de s'interrompre si le mouvement n'est pas enrayé rapidement.",
    isInteractive: true,
    conditionKey:  "shock_investment_panic",
    minActionsGap: 28,
    choices: [
      {
        id:                   "declaration_stabilite_institutionnelle",
        label:                "Déclaration de stabilité institutionnelle forte",
        consequence:          "Le gouvernement publie une déclaration fictive de stabilité, soutenue par les institutions clés. La panique se calme progressivement. La confiance se reconstitue. L'effet communication est réel mais requiert du suivi.",
        effects:              {},
        indicatorEffects:     { popularity: 1 },
        economicShockDamping: 25,
      },
      {
        id:                   "garanties_investissement_public",
        label:                "Garanties publiques d'investissement",
        consequence:          "Le gouvernement active des garanties fictives pour les projets d'investissement privés. La fuite des capitaux ralentit. Les projets prioritaires sont protégés. Le coût budgétaire est significatif.",
        effects:              { money: -300 },
        indicatorEffects:     {},
        economicShockDamping: 28,
      },
      {
        id:                   "restructuration_budgetaire_urgence",
        label:                "Restructuration budgétaire d'urgence — signal de rigueur",
        consequence:          "Le gouvernement envoie un signal de rigueur budgétaire pour rassurer les investisseurs fictifs sur la soutenabilité des finances publiques. La panique se calme partiellement. L'économie réelle souffre de l'ajustement.",
        effects:              {},
        indicatorEffects:     { economy: -1, popularity: -1 },
        economicShockDamping: 15,
        queuesDelayedConsequence: {
          id:           "investment_panic_austerity",
          delayActions: 6,
          effectType:   "indicator_effect",
          payload:      { publicBudget: 2 },
        },
      },
    ],
  },

  // ── 6. Crise alimentaire importée ─────────────────────────────────────────────
  {
    id:          "shock_food_crisis",
    title:       "Crise alimentaire importée — flambée des prix fictifs",
    source:      "Ministère de l'Agriculture et de la Souveraineté Alimentaire",
    type:        "social",
    urgency:     "forte",
    description: "Une perturbation fictive des circuits d'approvisionnement alimentaire international provoque une flambée des prix de denrées essentielles. Les ménages modestes sont les premiers touchés. Le panier fictif de la ménagère explose. La fatigue populaire monte. Des tensions sociales émergent dans les quartiers les plus fragiles. La souveraineté alimentaire nationale est en question.",
    isInteractive: true,
    conditionKey:  "shock_food_crisis",
    minActionsGap: 25,
    choices: [
      {
        id:                   "bouclier_alimentaire",
        label:                "Bouclier alimentaire — protection des prix de base",
        consequence:          "Un mécanisme fictif de plafonnement des prix de denrées essentielles est activé. Les ménages modestes sont protégés. Le coût est partagé entre État et distributeurs fictifs. La pression sociale se calme.",
        effects:              { money: -280 },
        indicatorEffects:     { popularity: 1 },
        economicShockDamping: 28,
      },
      {
        id:                   "souverainete_alimentaire_urgence",
        label:                "Plan d'urgence de souveraineté alimentaire",
        consequence:          "Le gouvernement engage des ressources pour accélérer la production fictive locale et diversifier les fournisseurs. L'effet est progressif mais structurel. Le choc est partiellement amorti.",
        effects:              { money: -220 },
        indicatorEffects:     {},
        economicShockDamping: 18,
        supplyChainEffects:   { alimentation: { stockLevel: 18, dependencyLevel: -10 } },
      },
      {
        id:                   "aide_cibelee_menages_vulnerables",
        label:                "Aide ciblée aux ménages vulnérables",
        consequence:          "Le gouvernement concentre l'aide sur les ménages fictifs les plus exposés. La crise est gérée socialement, pas économiquement. Les prix restent élevés. La pression inflationniste persiste.",
        effects:              { money: -150 },
        indicatorEffects:     {},
        economicShockDamping: 10,
        socialMobilityDelta:  5,
      },
    ],
  },

  // ── 7. Blocage maritime fictif ────────────────────────────────────────────────
  {
    id:          "shock_maritime_blockade",
    title:       "Blocage maritime fictif — perturbation du commerce international",
    source:      "Agence de Sécurité Maritime Nationale",
    type:        "economie",
    urgency:     "forte",
    description: "Un blocage fictif d'une voie maritime commerciale essentielle paralyse le transit de marchandises. Les délais de livraison explosent. Les chaînes logistiques mondiales fictives s'embourbent. Le coût du fret s'envole. Les secteurs dépendants des importations sont directement exposés. La balance commerciale se dégrade à mesure que les échanges se bloquent.",
    isInteractive: true,
    conditionKey:  "shock_maritime_blockade",
    minActionsGap: 30,
    choices: [
      {
        id:                   "routes_alternatives_urgence",
        label:                "Ouverture de routes alternatives d'urgence",
        consequence:          "La diplomatie fictive négocie des accords de transit alternatifs. Les coûts supplémentaires sont absorbés en partie par le budget national. Le blocage est contourné progressivement. La pression sur les chaînes logistiques se relâche.",
        effects:              { money: -250, influence: -15 },
        indicatorEffects:     {},
        economicShockDamping: 28,
        supplyChainEffects:   { transport: { disruptionRisk: -15, stockLevel: 12 } },
      },
      {
        id:                   "stockage_strategique_accelere",
        label:                "Stockage stratégique accéléré",
        consequence:          "Le gouvernement mobilise des fonds fictifs pour accélérer la constitution de stocks stratégiques avant que le blocage ne s'aggrave. L'effet est préventif. Les secteurs les plus exposés sont protégés à court terme.",
        effects:              { money: -200 },
        indicatorEffects:     {},
        economicShockDamping: 15,
        supplyChainEffects:   {
          transport:   { stockLevel: 10 },
          alimentation:{ stockLevel: 10 },
          energie:     { stockLevel: 8 },
        },
      },
      {
        id:                   "ajustement_importations",
        label:                "Rationalisation des importations non essentielles",
        consequence:          "Le gouvernement priorise les capacités de transit restantes vers les importations essentielles. Des quotas fictifs sont mis en place. La vie économique continue à un rythme réduit. La balance commerciale se stabilise partiellement.",
        effects:              {},
        indicatorEffects:     {},
        economicShockDamping: 10,
      },
    ],
  },

  // ── 8. Guerre commerciale fictive ─────────────────────────────────────────────
  {
    id:          "shock_trade_war",
    title:       "Guerre commerciale fictive — escalade des barrières",
    source:      "Direction des Relations Économiques Extérieures",
    type:        "economie",
    urgency:     "forte",
    description: "Une escalade fictive des barrières commerciales entre puissances économiques mondiales frappe le pays en plein milieu de ses échanges. Les droits de douane fictifs s'accumulent. Les débouchés export se ferment. Les fournisseurs fictifs habituels se raréfient. Cette guerre commerciale, dont le pays n'est pas l'instigateur, s'impose comme un choc durable sur la compétitivité nationale.",
    isInteractive: true,
    conditionKey:  "shock_trade_war",
    minActionsGap: 28,
    choices: [
      {
        id:                   "neutralite_strategique",
        label:                "Neutralité stratégique — se positionner comme médiateur",
        consequence:          "Le gouvernement refuse de choisir son camp et se positionne comme médiateur fictif neutre. Les échanges bilatéraux avec les deux blocs sont préservés partiellement. La guerre commerciale dure mais le pays est partiellement épargné.",
        effects:              { influence: -10 },
        indicatorEffects:     {},
        economicShockDamping: 22,
      },
      {
        id:                   "alliances_commerciales_alternatives",
        label:                "Construction d'alliances commerciales alternatives",
        consequence:          "Le gouvernement tisse rapidement des liens fictifs avec des partenaires non impliqués dans le conflit commercial. De nouveaux débouchés émergent. La transition est coûteuse mais structurellement solide.",
        effects:              { money: -200, influence: -20 },
        indicatorEffects:     {},
        economicShockDamping: 18,
        tradeBalanceDelta:    10,
        industrialChampionsDelta: 6,
      },
      {
        id:                   "protection_reciprocite",
        label:                "Mesures de réciprocité — protéger les secteurs exposés",
        consequence:          "Le gouvernement adopte des mesures fictives de protection ciblée des secteurs menacés. Les échanges sont partiellement préservés, mais la posture protectionniste dégrade les relations diplomatiques.",
        effects:              { money: -180 },
        indicatorEffects:     {},
        economicShockDamping: 12,
      },
    ],
  },

  // ── 9. Pénurie de composants ──────────────────────────────────────────────────
  {
    id:          "shock_component_shortage",
    title:       "Pénurie mondiale de composants — paralysie de la production",
    source:      "Fédération Nationale de l'Industrie Technologique",
    type:        "economie",
    urgency:     "forte",
    description: "Un déséquilibre fictif entre l'offre et la demande mondiale de composants électroniques stratégiques provoque une pénurie structurelle. Les industries nationales dépendantes des semiconducteurs et des circuits intégrés fictifs doivent réduire leur production. La livraison de produits finis est retardée. La productivité nationale recule. Les délais de commande s'allongent à l'international.",
    isInteractive: true,
    conditionKey:  "shock_component_shortage",
    minActionsGap: 28,
    choices: [
      {
        id:                   "plan_composants_souverains",
        label:                "Plan de souveraineté sur les composants",
        consequence:          "Le gouvernement lance un programme fictif d'urgence pour développer des capacités nationales de production de composants. L'investissement est lourd et les résultats progressifs, mais la dépendance future est réduite.",
        effects:              { money: -300, technology: -20 },
        indicatorEffects:     {},
        economicShockDamping: 25,
        supplyChainEffects:   { semi_conducteurs: { stockLevel: 15, dependencyLevel: -12 } },
        strategicIndustryDelta: 10,
      },
      {
        id:                   "approvisionnement_alternatif",
        label:                "Approvisionnement alternatif d'urgence",
        consequence:          "La diplomatie économique fictive identifie des fournisseurs alternatifs. Les coûts sont élevés. Les délais sont raccourcis. La pénurie est partiellement comblée mais la dépendance structurelle persiste.",
        effects:              { money: -220, influence: -10 },
        indicatorEffects:     {},
        economicShockDamping: 18,
        supplyChainEffects:   { semi_conducteurs: { stockLevel: 12 } },
      },
      {
        id:                   "reconversion_production",
        label:                "Reconversion vers des technologies moins dépendantes",
        consequence:          "Les industries nationales fictives pivotent partiellement vers des technologies moins dépendantes des composants rares. La transition est douloureuse à court terme mais renforce la résilience structurelle.",
        effects:              { money: -160 },
        indicatorEffects:     { economy: -1 },
        economicShockDamping: 12,
        startupEcosystemDelta: 6,
      },
    ],
  },

  // ── 10. Bulle technologique qui éclate ────────────────────────────────────────
  {
    id:          "shock_tech_bubble",
    title:       "Éclatement d'une bulle technologique — contagion financière fictive",
    source:      "Observatoire de la Stabilité Financière",
    type:        "economie",
    urgency:     "critique",
    description: "Une bulle technologique fictive, alimentée par des valorisations déconnectées des fondamentaux, vient d'éclater. L'effondrement touche d'abord les startups les plus fragiles, puis se propage aux fonds d'investissement fictifs exposés. La confiance dans les actifs technologiques s'évapore. Les projets d'innovation voient leurs financements coupés. La contagion aux marchés réels est une menace sérieuse.",
    isInteractive: true,
    conditionKey:  "shock_tech_bubble",
    minActionsGap: 32,
    choices: [
      {
        id:                   "filet_securite_innovation",
        label:                "Filet de sécurité pour l'innovation stratégique",
        consequence:          "Le gouvernement déploie un programme fictif de protection des projets d'innovation à valeur stratégique avérée. Les startups survivantes sont consolidées. Le secteur technologique se restructure plus sainement.",
        effects:              { money: -300, technology: -10 },
        indicatorEffects:     {},
        economicShockDamping: 30,
        startupEcosystemDelta: 12,
      },
      {
        id:                   "regularisation_marches_technos",
        label:                "Régulation renforcée des marchés technologiques",
        consequence:          "Le gouvernement saisit l'occasion pour encadrer davantage les valorisations fictives et les mécanismes spéculatifs. La réglementation fictive protège le système. L'écosystème innovation souffre à court terme mais se stabilise.",
        effects:              { money: -150, technology: -5 },
        indicatorEffects:     {},
        economicShockDamping: 20,
        investorConfidenceDelta: 5,
      },
      {
        id:                   "laisser_marche_purger",
        label:                "Laisser le marché se purger — discipline de marché",
        consequence:          "Le gouvernement refuse d'intervenir, considérant que la correction fictive est nécessaire pour éliminer les excès spéculatifs. L'économie absorbe la correction. Les projets viables survivent, les bulles éclatent.",
        effects:              {},
        indicatorEffects:     {},
        economicShockDamping: 5,
        queuesDelayedConsequence: {
          id:           "tech_bubble_purge",
          delayActions: 8,
          effectType:   "indicator_effect",
          payload:      { economy: -2 },
        },
      },
    ],
  },
];
