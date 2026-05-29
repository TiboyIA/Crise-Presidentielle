import type { NewsEvent } from "@/types/strategy";

/**
 * Événements liés au marché du travail, au chômage et à l'emploi des jeunes.
 * Aucune donnée RH réelle. Aucun chiffre national officiel.
 * Pilotage présidentiel fictif uniquement.
 */
export const LABOR_MARKET_EVENTS: NewsEvent[] = [

  // ── Hausse du chômage — alerte sociale (moyenne, interactive) ─────────────
  {
    id: "unemployment_rising",
    title: "Hausse du chômage — alerte sociale",
    source: "Bureau National de l'Emploi / Observatoire Social",
    type: "social",
    urgency: "moyenne",
    description:
      "Les derniers relevés du Bureau National de l'Emploi signalent une progression préoccupante du chômage. Des secteurs entiers réduisent leurs effectifs. Les centres d'accueil des demandeurs d'emploi sont saturés. Le gouvernement est interpellé sur sa stratégie pour l'emploi.",
    isInteractive: true,
    conditionKey: "unemployment_rising",
    minActionsGap: 18,
    choices: [
      {
        id: "unemp_formation",
        label: "Plan national de formation professionnelle",
        consequence:
          "Le gouvernement lance un dispositif massif de requalification des demandeurs d'emploi. Les effets prendront du temps mais la démarche est saluée par les partenaires sociaux et renforce la confiance dans l'avenir.",
        effects: { money: -400, technology: 3 },
        indicatorEffects: { economy: 2, cohesion: 2 },
        hiddenPoliticsEffects: { institutionalStability: 3, eliteTrust: 2, mediaMood: 4 },
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
        communicationRegister: "institutionnel",
        queuesDelayedConsequence: {
          id: "unemp_formation_delayed",
          delayActions: 14,
          effectType: "indicator_effect",
          payload: { economy: 3, cohesion: 2 },
        },
      },
      {
        id: "unemp_subventions",
        label: "Subventions à l'embauche — soutien aux entreprises",
        consequence:
          "Des aides directes à l'embauche sont déployées pour inciter les entreprises à recruter. La mesure produit des effets rapides mais son coût pèse sur le budget et son efficacité à long terme reste limitée.",
        effects: { money: -600 },
        indicatorEffects: { popularity: 2, economy: 2 },
        hiddenPoliticsEffects: { popularFatigue: -3, eliteTrust: 4, mediaMood: 3 },
        communicationRegister: "populaire",
        declarationTheme: "fiscalite",
        declarationStance: "pro",
      },
      {
        id: "unemp_reforme",
        label: "Réforme du marché du travail — flexibilisation",
        consequence:
          "Le gouvernement engage une réforme structurelle visant à assouplir certaines règles du marché du travail. La mesure divise : les entreprises y voient un levier, les syndicats dénoncent une précarisation.",
        effects: { influence: -12 },
        indicatorEffects: { economy: 3 },
        hiddenPoliticsEffects: { institutionalStability: 3, eliteTrust: 3, scandalRisk: 4, popularFatigue: 2 },
        pathologyDelta: { technocraticColdness: 5 },
        communicationRegister: "institutionnel",
        declarationTheme: "depenses_publiques",
        declarationStance: "contre",
      },
    ],
  },

  // ── Crise du chômage — explosion sociale (critique, interactive) ──────────
  {
    id: "unemployment_crisis",
    title: "Crise du chômage — explosion sociale",
    source: "Secrétariat Général de l'Élysée / Observatoire National du Travail",
    type: "social",
    urgency: "critique",
    description:
      "Le chômage atteint un seuil critique. Des manifestations éclatent dans les grandes villes. Des syndicats appellent à une grève nationale. Les indicateurs de cohésion sociale s'effondrent. La présidence est en première ligne : l'inaction n'est plus tenable.",
    isInteractive: true,
    conditionKey: "unemployment_crisis",
    minActionsGap: 22,
    choices: [
      {
        id: "unemp_crise_plan_emploi",
        label: "Plan Marshall pour l'emploi — investissement massif",
        consequence:
          "Le gouvernement déploie un plan d'urgence inédit : investissements dans les secteurs porteurs, soutien direct aux demandeurs d'emploi et formation accélérée. Le coût est considérable mais le signal envoyé stabilise la situation sociale.",
        effects: { money: -1200, technology: 4 },
        indicatorEffects: { popularity: 4, economy: 3, cohesion: 3 },
        hiddenPoliticsEffects: { popularFatigue: -6, scandalRisk: -4, mediaMood: 6, institutionalStability: 3 },
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
        communicationRegister: "empathique",
      },
      {
        id: "unemp_crise_cellule",
        label: "Cellule interministérielle d'urgence emploi",
        consequence:
          "Une cellule de crise réunit ministres, partenaires sociaux et experts. Le dialogue restaure une dynamique de confiance et produit un plan coordonné. La résolution est plus lente mais durable.",
        effects: { influence: -15 },
        indicatorEffects: { popularity: 1, cohesion: 2 },
        hiddenPoliticsEffects: { institutionalStability: 6, eliteTrust: 4, mediaMood: 5 },
        communicationRegister: "diplomatique",
      },
      {
        id: "unemp_crise_promesse",
        label: "Discours national — promesse de retour au plein emploi",
        consequence:
          "Le Président prononce un discours fort promettant des mesures rapides. L'effet de souffle est immédiat mais fragile : si les chiffres ne s'améliorent pas, le discours se retournera contre lui.",
        effects: { influence: -8 },
        indicatorEffects: { popularity: 3 },
        hiddenPoliticsEffects: { mediaMood: 6, scandalRisk: 8 },
        pathologyDelta: { minimization: 6, doubleSpeak: 4 },
        communicationRegister: "populaire",
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
        queuesDelayedConsequence: {
          id: "unemp_promesse_delayed",
          delayActions: 18,
          effectType: "hidden_politics",
          payload: { scandalRisk: 8, mediaMood: -5 },
        },
      },
    ],
  },

  // ── Pénurie de main-d'œuvre — l'économie tourne à vide (forte, interactive) ──
  {
    id: "labor_shortage_alert",
    title: "Pénurie de main-d'œuvre — l'économie tourne à vide",
    source: "Fédération des Entreprises Nationales / Bureau de l'Emploi",
    type: "economie",
    urgency: "forte",
    description:
      "Paradoxe économique : le chômage est bas mais les entreprises peinent à recruter dans de nombreux secteurs essentiels. Des postes restent vacants pendant des mois. La croissance est bridée par ce manque de main-d'œuvre qualifiée. Les salaires montent, alimentant l'inflation.",
    isInteractive: true,
    conditionKey: "labor_shortage_alert",
    minActionsGap: 20,
    choices: [
      {
        id: "shortage_formation",
        label: "Programme de formation accélérée dans les secteurs en tension",
        consequence:
          "Des formations courtes et ciblées sont lancées dans les métiers les plus demandés. L'effet sera visible à moyen terme. Les partenaires professionnels sont mobilisés autour d'une logique de co-investissement.",
        effects: { money: -400, technology: 4 },
        indicatorEffects: { economy: 2 },
        hiddenPoliticsEffects: { institutionalStability: 3, eliteTrust: 3 },
        communicationRegister: "institutionnel",
        queuesDelayedConsequence: {
          id: "shortage_formation_delayed",
          delayActions: 12,
          effectType: "indicator_effect",
          payload: { economy: 3, cohesion: 1 },
        },
      },
      {
        id: "shortage_attractivite",
        label: "Plan d'attractivité des métiers — revalorisation salariale fictive",
        consequence:
          "Des campagnes de valorisation et des incitations fictives sont mises en place pour attirer des candidats vers les secteurs en pénurie. La mesure améliore l'image des métiers concernés et réduit partiellement les tensions.",
        effects: { influence: -10 },
        indicatorEffects: { economy: 2 },
        hiddenPoliticsEffects: { eliteTrust: 4, mediaMood: 4, popularFatigue: -2 },
        communicationRegister: "populaire",
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
      },
      {
        id: "shortage_automatisation",
        label: "Accélérer l'automatisation des postes non pourvus",
        consequence:
          "Le gouvernement pousse les secteurs en pénurie à investir dans l'automatisation. La solution est efficace à court terme pour combler les besoins, mais soulève des questions sur l'avenir des emplois de ces secteurs.",
        effects: { money: -600, technology: 8 },
        indicatorEffects: { economy: 4 },
        hiddenPoliticsEffects: { eliteTrust: 3, scandalRisk: 4 },
        pathologyDelta: { technocraticColdness: 6 },
        communicationRegister: "technocratique",
        queuesDelayedConsequence: {
          id: "shortage_auto_delayed",
          delayActions: 16,
          effectType: "hidden_politics",
          payload: { popularFatigue: 4, regionalTension: 3 },
        },
      },
    ],
  },

  // ── Chômage des jeunes — génération sacrifiée (moyenne, interactive) ──────
  {
    id: "youth_unemployment_high",
    title: "Chômage des jeunes — une génération à la dérive",
    source: "Secrétariat d'État à la Jeunesse / Bureau National de l'Emploi",
    type: "social",
    urgency: "moyenne",
    description:
      "Les indicateurs de l'emploi des jeunes atteignent un niveau critique. Une part importante des 18-25 ans se retrouve sans emploi ni formation. La déscolarisation progresse et les perspectives d'insertion se dégradent. Ce phénomène creuse durablement les inégalités et alimente le mécontentement d'une génération entière.",
    isInteractive: true,
    conditionKey: "youth_unemployment_high",
    minActionsGap: 20,
    choices: [
      {
        id: "youth_plan_stages",
        label: "Plan jeunes — garantie d'emploi ou de formation",
        consequence:
          "Le gouvernement s'engage à offrir à chaque jeune demandeur un stage ou une formation dans les 4 mois suivant sa demande. Le coût est significatif mais l'effet sur la cohésion sociale est immédiat et durable.",
        effects: { money: -300, technology: 2 },
        indicatorEffects: { popularity: 2, cohesion: 3 },
        hiddenPoliticsEffects: { popularFatigue: -4, mediaMood: 5, institutionalStability: 2 },
        communicationRegister: "empathique",
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
      },
      {
        id: "youth_apprentissage",
        label: "Réforme de l'apprentissage — alliance école-entreprise",
        consequence:
          "Le gouvernement renforce les dispositifs d'apprentissage en lien avec les entreprises. Les effets seront progressifs mais structurels : des filières nouvelles ouvrent des débouchés durables pour les jeunes.",
        effects: { influence: -10, technology: 3 },
        indicatorEffects: { economy: 2 },
        hiddenPoliticsEffects: { institutionalStability: 4, eliteTrust: 3 },
        communicationRegister: "institutionnel",
        declarationTheme: "fiscalite",
        declarationStance: "pro",
      },
      {
        id: "youth_inaction",
        label: "Priorité à la crise générale — la jeunesse peut attendre",
        consequence:
          "Le gouvernement ne prend aucune mesure spécifique pour les jeunes, arguant que les mesures économiques générales profiteront à tous. La décision est perçue comme du mépris par les nouvelles générations.",
        effects: {},
        indicatorEffects: { cohesion: -2 },
        hiddenPoliticsEffects: { popularFatigue: 3, scandalRisk: 4, mediaMood: -3 },
        pathologyDelta: { minimization: 6, technocraticColdness: 4 },
        communicationRegister: "technocratique",
      },
    ],
  },

  // ── Qualité de l'emploi en crise — précarisation (forte, interactive) ─────
  {
    id: "job_quality_crisis",
    title: "Précarisation — la qualité de l'emploi s'effondre",
    source: "Observatoire National des Conditions de Travail",
    type: "social",
    urgency: "forte",
    description:
      "Un rapport de l'Observatoire National des Conditions de Travail dresse un tableau alarmant : multiplication des contrats courts, explosion du sous-emploi, stagnation des revenus réels. L'emploi existe, mais dans des conditions de plus en plus dégradées. La colère des travailleurs précaires monte.",
    isInteractive: true,
    conditionKey: "job_quality_crisis",
    minActionsGap: 20,
    choices: [
      {
        id: "jq_protections",
        label: "Renforcement des protections sociales des travailleurs précaires",
        consequence:
          "Le gouvernement élargit les droits des travailleurs en contrats courts : accès à la formation, couverture sociale améliorée, revenus minimum garantis. La mesure coûte mais restaure la dignité du travail et la cohésion sociale.",
        effects: { money: -500 },
        indicatorEffects: { cohesion: 4, popularity: 2 },
        hiddenPoliticsEffects: { popularFatigue: -4, scandalRisk: -3, mediaMood: 5 },
        declarationTheme: "depenses_publiques",
        declarationStance: "pro",
        communicationRegister: "empathique",
      },
      {
        id: "jq_dialogue",
        label: "Grand dialogue social — vers une charte nationale de l'emploi",
        consequence:
          "Le gouvernement organise une conférence nationale réunissant employeurs et syndicats pour élaborer une charte sur la qualité de l'emploi. Le processus prend du temps mais crée un cadre légitime et partagé.",
        effects: { influence: -12 },
        indicatorEffects: { cohesion: 2 },
        hiddenPoliticsEffects: { institutionalStability: 5, eliteTrust: 4, mediaMood: 4 },
        communicationRegister: "diplomatique",
      },
      {
        id: "jq_deregulation",
        label: "Dérégulation assumée — laisser le marché s'autoréguler",
        consequence:
          "Le gouvernement refuse d'intervenir, estimant que la flexibilité est une force économique. La décision plaît aux milieux d'affaires mais durcit les tensions sociales et expose à un retour de bâton politique.",
        effects: { money: 200 },
        indicatorEffects: { economy: 3 },
        hiddenPoliticsEffects: { eliteTrust: -5, scandalRisk: 6, popularFatigue: 4, regionalTension: 3 },
        pathologyDelta: { technocraticColdness: 8, fearSpeech: 3 },
        communicationRegister: "technocratique",
        declarationTheme: "fiscalite",
        declarationStance: "contre",
      },
    ],
  },

  // ── Plein emploi — opportunité à saisir (faible, interactive) ─────────────
  {
    id: "employment_boom",
    title: "Plein emploi — une opportunité historique à saisir",
    source: "Bureau National de l'Emploi / Conseil Économique",
    type: "economie",
    urgency: "faible",
    description:
      "Le Bureau National de l'Emploi publie des données exceptionnelles : le chômage est à son plus bas niveau depuis le début du mandat. Le marché du travail est en tension favorable. Cette fenêtre d'opportunité est rare — le gouvernement peut en tirer un avantage politique et structurel durable.",
    isInteractive: true,
    conditionKey: "employment_boom",
    minActionsGap: 30,
    choices: [
      {
        id: "boom_capitaliser",
        label: "Capitaliser — communication sur l'excellence économique",
        consequence:
          "Le gouvernement valorise ce succès dans une communication offensive. L'image internationale de la Nation s'améliore et la confiance des investisseurs se renforce.",
        effects: { influence: 10 },
        indicatorEffects: { popularity: 3 },
        hiddenPoliticsEffects: { eliteTrust: 5, mediaMood: 6 },
        communicationRegister: "institutionnel",
        declarationTheme: "fiscalite",
        declarationStance: "pro",
      },
      {
        id: "boom_anticiper",
        label: "Anticiper les tensions — plan de qualification avancée",
        consequence:
          "Conscient que cette situation de plein emploi génère une pénurie de main-d'œuvre, le gouvernement lance un plan de formation pour maintenir l'adéquation offre/demande sur le long terme.",
        effects: { money: -300, technology: 4 },
        indicatorEffects: { economy: 2 },
        hiddenPoliticsEffects: { institutionalStability: 4, eliteTrust: 3 },
        communicationRegister: "institutionnel",
        queuesDelayedConsequence: {
          id: "boom_anticipation_delayed",
          delayActions: 12,
          effectType: "indicator_effect",
          payload: { economy: 3, cohesion: 2 },
        },
      },
    ],
  },

];
