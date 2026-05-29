import type { NewsEvent } from "@/types/strategy";

export const DEROGATION_EVENTS: NewsEvent[] = [

  // ── Événements créant une dérogation (choix du joueur) ───────────────────

  {
    id: "derogation_marche_urgence",
    title: "Pénurie critique — procédure d'achat simplifiée proposée",
    source: "Direction des Achats Publics",
    type: "national",
    urgency: "forte",
    conditionKey: "derogation_option_supply",
    isInteractive: true,
    description: "Une rupture critique dans les chaînes d'approvisionnement bloque l'approvisionnement d'urgence. L'administration propose de passer outre la procédure d'appel d'offres complet pour débloquer la situation en 48 heures. Cette dérogation d'urgence accélérera l'achat mais laissera une trace juridique.",
    choices: [
      {
        id: "appliquer_derogation",
        label: "Appliquer la dérogation d'urgence",
        consequence: "Achat réalisé en 48h. Un dossier de dérogation est ouvert — il devra être justifié ou audité.",
        effects: { money: -25 },
        indicatorEffects: { economy: 2 },
        hiddenPoliticsEffects: { institutionalStability: -2 },
        createsDerogation: {
          type: "emergency_procurement",
          reason: "Rupture critique des chaînes d'approvisionnement — délai incompatible avec appel d'offres.",
          benefit: "Déblocage immédiat de l'approvisionnement, économie stabilisée +2.",
          legalRisk: 38,
          durationActions: 28,
        },
      },
      {
        id: "respecter_procedure",
        label: "Respecter la procédure normale",
        consequence: "Appel d'offres lancé. Le délai allonge la pénurie de 3 semaines fictives.",
        effects: {},
        indicatorEffects: { economy: -3 },
      },
      {
        id: "marche_negocie",
        label: "Marché négocié restreint (compromis)",
        consequence: "Procédure allégée légalement tolérée — délai réduit, risque minimal.",
        effects: { money: -15, influence: -10 },
        indicatorEffects: { economy: 1 },
      },
    ],
  },

  {
    id: "derogation_mobilisation_securite",
    title: "Tensions régionales — mobilisation exceptionnelle demandée",
    source: "Préfecture Générale",
    type: "national",
    urgency: "forte",
    conditionKey: "derogation_option_security",
    isInteractive: true,
    description: "Des tensions régionales graves menacent l'ordre public dans plusieurs zones. Le préfet général demande une mobilisation exceptionnelle de moyens hors du cadre légal ordinaire, arguant que les procédures normales sont trop lentes face à l'urgence.",
    choices: [
      {
        id: "mobilisation_exceptionnelle",
        label: "Autoriser la mobilisation exceptionnelle",
        consequence: "Forces mobilisées immédiatement. Une dérogation au cadre légal ordinaire est ouverte.",
        effects: { military: -15 },
        indicatorEffects: { security: 6, cohesion: -2 },
        createsDerogation: {
          type: "exceptional_mobilization",
          reason: "Tensions régionales graves — délai procédural incompatible avec l'urgence sécuritaire.",
          benefit: "Sécurité renforcée +6, ordre public rétabli.",
          legalRisk: 45,
          durationActions: 22,
        },
      },
      {
        id: "cadre_legal",
        label: "Maintenir le cadre légal ordinaire",
        consequence: "Procédure normale maintenue. La réponse est plus lente mais sans risque juridique.",
        effects: { influence: -10 },
        indicatorEffects: { security: 2, cohesion: 1 },
      },
      {
        id: "secret_defense_localise",
        label: "Classer sous secret défense partiel",
        consequence: "Information contenue, mobilisation partielle sous protection légale exceptionnelle.",
        effects: { intelligence: -10 },
        indicatorEffects: { security: 3 },
        hiddenPoliticsEffects: { mediaMood: -3 },
        createsDerogation: {
          type: "defense_secrecy",
          reason: "Classification d'urgence pour gérer les tensions régionales sans exposition médiatique.",
          benefit: "Sécurité +3, information maîtrisée.",
          legalRisk: 28,
          durationActions: 30,
        },
      },
    ],
  },

  // ── Événements réactifs aux abus ──────────────────────────────────────────

  {
    id: "derogation_controle_conteste",
    title: "Organes de contrôle : les dérogations d'urgence contestées",
    source: "Conseil d'État fictif",
    type: "national",
    urgency: "moyenne",
    conditionKey: "derogation_active",
    minActionsGap: 12,
    isInteractive: true,
    description: "Les organes de contrôle institutionnel signalent des dérogations d'urgence non justifiées dans les registres présidentiels. Ils demandent une clarification formelle sur les conditions d'activation de ces procédures exceptionnelles.",
    choices: [
      {
        id: "collaborer_audit",
        label: "Collaborer — ouvrir un audit interne",
        consequence: "Audit interne ouvert. La transparence réduit la pression institutionnelle.",
        effects: { influence: -15 },
        hiddenPoliticsEffects: { institutionalStability: 4, scandalRisk: -6, mediaMood: 3 },
      },
      {
        id: "justifier_formellement",
        label: "Justifier formellement les décisions",
        consequence: "Mémoire justificatif transmis. Risque réduit, coût administratif.",
        effects: { influence: -20 },
        hiddenPoliticsEffects: { institutionalStability: 2, scandalRisk: -3 },
      },
      {
        id: "resister_controle",
        label: "Résister — invoquer la primauté de l'exécutif",
        consequence: "Le conflit s'intensifie. La pression institutionnelle monte.",
        effects: {},
        hiddenPoliticsEffects: { institutionalStability: -5, scandalRisk: 8, mediaMood: -4 },
        indicatorEffects: { popularity: -2 },
      },
    ],
  },

  {
    id: "derogation_abus_medias",
    title: "Médias : enquête sur les marchés publics d'urgence",
    source: "Presse d'Investigation",
    type: "national",
    urgency: "forte",
    conditionKey: "derogation_abuse_risk",
    minActionsGap: 15,
    isInteractive: true,
    description: "Des journalistes d'investigation ont obtenu des informations sur plusieurs dérogations d'urgence non justifiées dans les registres gouvernementaux. Ils préparent une publication sur les marchés publics contournant les procédures. L'Élysée peut encore agir avant la parution.",
    choices: [
      {
        id: "reconnaissance_proactive",
        label: "Reconnaître et annoncer un audit d'État",
        consequence: "Prise d'initiative. Le récit passe de 'scandale' à 'autocorrection responsable'.",
        effects: { influence: -25 },
        indicatorEffects: { popularity: -1 },
        hiddenPoliticsEffects: { scandalRisk: -10, mediaMood: 5, institutionalStability: 3 },
      },
      {
        id: "bloquer_publication",
        label: "Tenter de bloquer la publication",
        consequence: "Tentative de rétention. Si elle échoue, le scandale sera amplifié.",
        effects: { intelligence: -20 },
        hiddenPoliticsEffects: { mediaMood: -8, scandalRisk: 12, popularFatigue: 4 },
        indicatorEffects: { popularity: -3 },
      },
      {
        id: "commission_interne",
        label: "Lancer une commission d'enquête interne",
        consequence: "Commission discrète nommée. Délai gagné, crédibilité intermédiaire.",
        effects: { money: -20, influence: -15 },
        hiddenPoliticsEffects: { scandalRisk: -4, institutionalStability: 1 },
      },
    ],
  },

  {
    id: "derogation_scandale_public",
    title: "SCANDALE — Abus de dérogations d'urgence révélé",
    source: "AFP — ALERTE",
    type: "national",
    urgency: "critique",
    conditionKey: "derogation_scandal_eruption",
    minActionsGap: 20,
    isInteractive: true,
    description: "La presse révèle en une des marchés publics passés en procédure d'urgence sans justification sérieuse, et des réquisitions fictives confirmées par des sources internes. L'opposition demande une commission parlementaire d'enquête. La légitimité de l'exécutif est directement mise en cause.",
    choices: [
      {
        id: "assumer_reforme",
        label: "Assumer et annoncer une réforme immédiate",
        consequence: "Discours de transparence totale. Coût politique immédiat, crédibilité à long terme.",
        effects: { influence: -40 },
        indicatorEffects: { popularity: -4, cohesion: 1 },
        hiddenPoliticsEffects: { scandalRisk: -15, institutionalStability: 5, mediaMood: 4, eliteTrust: -3 },
      },
      {
        id: "bouc_emissaire",
        label: "Désigner un responsable — démission d'un ministre",
        consequence: "Un ministre sacrifié limite les dégâts politiques immédiats mais fragilise le cabinet.",
        effects: { influence: -20 },
        indicatorEffects: { popularity: -2 },
        hiddenPoliticsEffects: { scandalRisk: -5, mediaMood: 1, eliteTrust: -6 },
      },
      {
        id: "nier_attaquer",
        label: "Nier et contre-attaquer l'opposition",
        consequence: "La défense agressive aggrave l'image. Le scandale dure plus longtemps.",
        effects: {},
        indicatorEffects: { popularity: -5, cohesion: -3 },
        hiddenPoliticsEffects: { scandalRisk: 15, mediaMood: -10, popularFatigue: 6, institutionalStability: -4 },
      },
    ],
  },

];
