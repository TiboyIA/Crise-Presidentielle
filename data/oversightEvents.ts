import type { NewsEvent } from "@/types/strategy";

export const OVERSIGHT_EVENTS: NewsEvent[] = [
  // ── H.A.I.P. ─────────────────────────────────────────────────────────────────
  {
    id:            "oversight_haip_inquiry",
    title:         "HAIP : enquête sur l'intégrité publique",
    source:        "Haute Autorité d'Intégrité Publique",
    type:          "national",
    urgency:       "forte",
    description:   "La Haute Autorité d'Intégrité Publique ouvre une enquête formelle sur des soupçons de corruption dans l'administration et des risques liés à des lanceurs d'alerte potentiels.",
    isInteractive: true,
    conditionKey:  "oversight_haip_active",
    choices: [
      {
        id:          "haip_cooperate",
        label:       "Coopérer pleinement",
        consequence: "L'exécutif ouvre ses archives à l'HAIP et nomme un référent dédié. L'autorité salue la transparence.",
        effects:     { influence: -10 },
        hiddenPoliticsEffects: {
          institutionalStability: 6,
          eliteTrust:             4,
          scandalRisk:            -10,
        },
      },
      {
        id:          "haip_justify",
        label:       "Fournir un rapport de justification",
        consequence: "L'administration transmet un dossier documenté. La pression diminue sans résolution complète.",
        effects:     { influence: -5 },
        hiddenPoliticsEffects: {
          institutionalStability: 3,
          scandalRisk:            -5,
        },
      },
      {
        id:          "haip_contest",
        label:       "Contester la procédure",
        consequence: "Le gouvernement remet en cause la compétence de l'HAIP. La confrontation attise les médias.",
        effects:     {},
        hiddenPoliticsEffects: {
          scandalRisk: 10,
          eliteTrust:  -5,
          mediaMood:   -8,
        },
      },
    ],
  },

  // ── C.M.S. ───────────────────────────────────────────────────────────────────
  {
    id:            "oversight_cms_audit",
    title:         "CMS : audit des marchés publics",
    source:        "Commission des Marchés Stratégiques",
    type:          "national",
    urgency:       "forte",
    description:   "La Commission des Marchés Stratégiques demande l'accès à l'ensemble des dossiers d'appels d'offres stratégiques des 60 derniers jours, pointant des conflits d'intérêts non déclarés.",
    isInteractive: true,
    conditionKey:  "oversight_cms_active",
    choices: [
      {
        id:          "cms_open",
        label:       "Ouvrir tous les dossiers",
        consequence: "La transparence totale désarme la CMS. L'intégrité des marchés est reconnue.",
        effects:     { influence: -8 },
        procurementIntegrityDelta:   10,
        conflictOfInterestRiskDelta: -12,
        hiddenPoliticsEffects: {
          institutionalStability: 5,
          eliteTrust:             3,
        },
      },
      {
        id:          "cms_summary",
        label:       "Fournir un rapport synthétique",
        consequence: "Un rapport sélectif est transmis. La CMS suspend l'enquête sans la clore.",
        effects:     { influence: -4 },
        procurementIntegrityDelta:   4,
        conflictOfInterestRiskDelta: -5,
        hiddenPoliticsEffects: {
          scandalRisk: -3,
        },
      },
      {
        id:          "cms_contest",
        label:       "Contester la légitimité",
        consequence: "Le gouvernement remet en cause les prérogatives de la CMS. La presse s'empare du dossier.",
        effects:     {},
        conflictOfInterestRiskDelta: 8,
        hiddenPoliticsEffects: {
          mediaMood:   -8,
          eliteTrust:  -5,
          scandalRisk: 6,
        },
      },
    ],
  },

  // ── C.L.P. ───────────────────────────────────────────────────────────────────
  {
    id:            "oversight_clp_alert",
    title:         "CLP : alerte sur les libertés fondamentales",
    source:        "Conseil des Libertés Publiques",
    type:          "national",
    urgency:       "forte",
    description:   "Le Conseil des Libertés Publiques publie une mise en garde officielle sur l'accumulation des dérogations d'urgence et leur impact présumé sur les droits civils des citoyens.",
    isInteractive: true,
    conditionKey:  "oversight_clp_active",
    choices: [
      {
        id:          "clp_renounce",
        label:       "Renoncer à certaines dérogations",
        consequence: "Le gouvernement suspend plusieurs dérogations non essentielles. Le CLP salue la réactivité.",
        effects:     { influence: -8 },
        hiddenPoliticsEffects: {
          institutionalStability: 6,
          eliteTrust:             4,
          popularFatigue:         -4,
        },
      },
      {
        id:          "clp_dialogue",
        label:       "Ouvrir un dialogue avec le Conseil",
        consequence: "Un comité de suivi conjoint est créé. La tension diminue sans abandon des mesures d'urgence.",
        effects:     { influence: -5 },
        hiddenPoliticsEffects: {
          institutionalStability: 3,
          mediaMood:              5,
        },
      },
      {
        id:          "clp_defend",
        label:       "Défendre le cadre d'urgence",
        consequence: "Le gouvernement affirme la nécessité absolue des dérogations. L'opposition s'engouffre dans la brèche.",
        effects:     {},
        hiddenPoliticsEffects: {
          scandalRisk:            8,
          institutionalStability: -5,
        },
        indicatorEffects: { cohesion: -4 },
      },
    ],
  },

  // ── C.C.N. ───────────────────────────────────────────────────────────────────
  {
    id:            "oversight_ccn_report",
    title:         "CCN : rapport accablant sur les finances",
    source:        "Cour des Comptes Nationale",
    type:          "economie",
    urgency:       "forte",
    description:   "La Cour des Comptes Nationale présente un rapport pointant une trajectoire budgétaire insoutenable : dette en accélération et déficit chronique mettant en péril la crédibilité financière de l'État.",
    isInteractive: true,
    conditionKey:  "oversight_ccn_active",
    choices: [
      {
        id:          "ccn_plan",
        label:       "Présenter un plan de redressement",
        consequence: "Le gouvernement s'engage sur une trajectoire de retour à l'équilibre. Les marchés respirent.",
        effects:     { influence: -8 },
        indicatorEffects: { economy: 4 },
        hiddenPoliticsEffects: {
          institutionalStability: 5,
          eliteTrust:             3,
        },
        investorConfidenceDelta: 8,
      },
      {
        id:          "ccn_contest",
        label:       "Contester les hypothèses",
        consequence: "Le gouvernement remet en cause la méthodologie de la CCN. La confiance des élites se fissure.",
        effects:     {},
        hiddenPoliticsEffects: {
          eliteTrust:  -4,
          scandalRisk: 5,
          mediaMood:   -5,
        },
        investorConfidenceDelta: -5,
      },
      {
        id:          "ccn_defer",
        label:       "Reconnaître et reporter",
        consequence: "Le gouvernement reconnaît les problèmes sans calendrier d'action. La pression s'allège à court terme.",
        effects:     { influence: -3 },
        hiddenPoliticsEffects: {
          scandalRisk:            3,
          institutionalStability: -2,
        },
      },
    ],
  },

  // ── C.C.P.U. ─────────────────────────────────────────────────────────────────
  {
    id:            "oversight_ccpu_challenge",
    title:         "CCPU : mise en cause des pouvoirs d'urgence",
    source:        "Comité de Contrôle des Pouvoirs d'Urgence",
    type:          "national",
    urgency:       "critique",
    description:   "Le Comité de Contrôle des Pouvoirs d'Urgence émet un avis négatif sur les conditions d'exercice des pouvoirs exceptionnels, dénonçant leur extension au-delà du cadre constitutionnel fictif.",
    isInteractive: true,
    conditionKey:  "oversight_ccpu_active",
    choices: [
      {
        id:          "ccpu_reduce",
        label:       "Réduire les pouvoirs d'urgence",
        consequence: "Le gouvernement lève la majorité des mesures exceptionnelles. Le CCPU valide la démarche.",
        effects:     { influence: -12 },
        hiddenPoliticsEffects: {
          institutionalStability: 8,
          eliteTrust:             5,
          scandalRisk:            -10,
        },
        indicatorEffects: { cohesion: 5 },
      },
      {
        id:          "ccpu_justify",
        label:       "Justifier l'état d'urgence",
        consequence: "Le gouvernement soumet un dossier de justification circonstancié. Le CCPU suspend son avis.",
        effects:     { influence: -8 },
        hiddenPoliticsEffects: {
          institutionalStability: 3,
          scandalRisk:            -5,
        },
      },
      {
        id:          "ccpu_resist",
        label:       "Ignorer l'avis du Comité",
        consequence: "Le gouvernement refuse de se soumettre au contrôle. La crise constitutionnelle fictive s'emballe.",
        effects:     {},
        hiddenPoliticsEffects: {
          scandalRisk:            15,
          eliteTrust:             -8,
          institutionalStability: -10,
        },
        indicatorEffects:    { cohesion: -8, popularity: -5 },
      },
    ],
  },

  // ── Toutes autorités satisfaites ─────────────────────────────────────────────
  {
    id:            "oversight_all_cleared",
    title:         "Bilan positif des autorités de contrôle",
    source:        "Rapport conjoint des autorités indépendantes",
    type:          "national",
    urgency:       "faible",
    description:   "L'ensemble des autorités de contrôle indépendantes publie un avis positif sur la gouvernance publique. L'intégrité institutionnelle est saluée.",
    isInteractive: false,
    conditionKey:  "oversight_all_clear",
    autoEffects:   { influence: 20 },
  },
];
