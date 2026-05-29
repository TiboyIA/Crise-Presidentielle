import type { NewsEvent } from "@/types/strategy";

// Résumés générés par getFiscalEffectSummary — maintenus synchronisés avec PROFILES
// emergency_aid  : "Court : popularité↑, fatigue-  /  Long : inflation↑ (coût durable)"
// infrastructure : "Court : cohésion↑  /  Long : commerce↑, chômage↓"
// research       : "Court : confiance marchés↑  /  Long : technologie↑ (durable)"
// security       : "Court : stabilité↑  /  Long : risque cohésion↓ si excès"
// health         : "Court : bien-être↑, cohésion↑  /  Long : emploi↑, attractivité↑"
// energy         : "Court : inflation↓  /  Long : inflation↓, stocks énergie↑"
// training       : "Court : cohésion↑  /  Long : chômage↓, qualité emploi↑"
// industry       : "Court : investisseurs↑, exports↑  /  Long : industrie↑, souveraineté↑"

export const FISCAL_MULTIPLIER_EVENTS: NewsEvent[] = [
  {
    id:            "fiscal_relance_budgetaire",
    title:         "Fenêtre de relance budgétaire",
    source:        "Ministère de l'Économie",
    type:          "economie",
    urgency:       "forte",
    description:
      "L'économie nationale montre des signes de ralentissement. Les marges budgétaires disponibles permettent un plan de relance ciblé. Le type d'investissement choisi déterminera les effets à court et long terme.",
    isInteractive: true,
    minActionsGap: 30,
    conditionKey:  "fiscal_relance_budgetaire",
    choices: [
      {
        id:          "relance_infrastructure",
        label:       "Plan d'infrastructure nationale",
        consequence:
          "Chantiers lancés sur l'ensemble du territoire. Court : cohésion renforcée par l'activité visible. Long : balance commerciale améliorée, chômage réduit par la création d'emplois durables. Risque gaspillage moyen — surveillance contractuelle nécessaire.",
        effects:     { money: -2 },
        fiscalSpendingType:      "infrastructure",
        fiscalSpendingIntensity: 65,
        indicatorEffects:        { economy: 1 },
      },
      {
        id:          "relance_formation",
        label:       "Programme de formation professionnelle",
        consequence:
          "Accords passés avec les organismes de formation. Court : cohésion sociale par l'investissement dans les travailleurs. Long : chômage structurel réduit, qualité d'emploi améliorée. Risque gaspillage moyen — efficacité variable selon les filières.",
        effects:     { money: -1 },
        fiscalSpendingType:      "training",
        fiscalSpendingIntensity: 60,
      },
      {
        id:          "relance_aide_urgence",
        label:       "Aide directe aux ménages",
        consequence:
          "Versements directs déployés rapidement. Court : popularité immédiate, fatigue populaire réduite, cohésion à court terme. Long : pression inflationniste durable. Risque gaspillage élevé — fuites et effets d'aubaine difficiles à contrôler.",
        effects:     { money: -1 },
        fiscalSpendingType:      "emergency_aid",
        fiscalSpendingIntensity: 70,
        indicatorEffects:        { popularity: 2 },
      },
    ],
  },

  {
    id:            "fiscal_relance_industrielle",
    title:         "Plan de relance industrielle",
    source:        "Ministère de l'Industrie",
    type:          "economie",
    urgency:       "forte",
    description:
      "La balance commerciale se dégrade durablement. Les entreprises industrielles nationales perdent du terrain à l'export. Une orientation budgétaire est attendue pour définir la stratégie productive du pays.",
    isInteractive: true,
    minActionsGap: 28,
    conditionKey:  "fiscal_relance_industrielle",
    choices: [
      {
        id:          "plan_industrie_nationale",
        label:       "Plan industriel souverain",
        consequence:
          "Commandes publiques orientées vers l'industrie nationale. Court : confiance des investisseurs, reprise des exportations. Long : champions industriels consolidés, industrie stratégique renforcée, balance commerciale durablement améliorée. Risque gaspillage moyen.",
        effects:     { money: -2, influence: -1 },
        fiscalSpendingType:      "industry",
        fiscalSpendingIntensity: 68,
        tradeBalanceDelta:       3,
        investorConfidenceDelta: 2,
      },
      {
        id:          "plan_energie_relance",
        label:       "Investissement dans la transition énergétique",
        consequence:
          "Financement massif des infrastructures énergétiques. Court : pression inflationniste réduite grâce aux coûts énergétiques maîtrisés. Long : inflation contenue sur la durée, stocks d'énergie renforcés, résilience des approvisionnements améliorée.",
        effects:     { money: -1, energy: 1 },
        fiscalSpendingType:      "energy",
        fiscalSpendingIntensity: 62,
      },
    ],
  },

  {
    id:            "fiscal_investissement_social",
    title:         "Investissement dans le capital humain",
    source:        "Élysée — Conseil de politique sociale",
    type:          "social",
    urgency:       "forte",
    description:
      "La fatigue populaire atteint un seuil critique. Le gouvernement doit choisir entre une réponse immédiate axée sur le bien-être ou un renforcement de la stabilité institutionnelle. Les deux options ont des conséquences budgétaires durables.",
    isInteractive: true,
    minActionsGap: 25,
    conditionKey:  "fiscal_investissement_social",
    choices: [
      {
        id:          "investissement_sante",
        label:       "Plan santé publique renforcé",
        consequence:
          "Moyens supplémentaires alloués au système de santé. Court : bien-être populaire amélioré, cohésion sociale renforcée par l'accès aux soins. Long : chômage réduit (retour à l'emploi facilité), attractivité économique accrue. Risque gaspillage faible.",
        effects:     { money: -1 },
        fiscalSpendingType:      "health",
        fiscalSpendingIntensity: 60,
        hiddenPoliticsEffects:   { popularFatigue: -4 },
      },
      {
        id:          "investissement_recherche",
        label:       "Grand plan de R&D national",
        consequence:
          "Dotations aux instituts de recherche et partenariats public-privé. Court : confiance des marchés dans les capacités technologiques du pays. Long : technologie nationale renforcée durablement — effets lents mais profonds. Risque gaspillage faible.",
        effects:     { money: -1, technology: 1 },
        fiscalSpendingType:      "research",
        fiscalSpendingIntensity: 65,
        investorConfidenceDelta: 2,
      },
      {
        id:          "investissement_securite",
        label:       "Renforcement de l'appareil sécuritaire",
        consequence:
          "Moyens accrus pour les forces de sécurité et le renseignement. Court : stabilité institutionnelle renforcée, sentiment d'ordre restauré. Long : risque de dérive si l'intensité est excessive — cohésion sociale peut se fragiliser. Risque gaspillage moyen.",
        effects:     { money: -1, military: 1 },
        fiscalSpendingType:      "security",
        fiscalSpendingIntensity: 55,
        hiddenPoliticsEffects:   { institutionalStability: 3 },
      },
    ],
  },
];
