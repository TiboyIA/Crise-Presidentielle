import type { NewsEvent } from "@/types/strategy";

export const AI_GOVERNANCE_EVENTS: NewsEvent[] = [
  // ── Notification de déploiement IA administratif ──────────────────────────

  {
    id:            "ai_deploy_notification",
    title:         "Déploiement de l'IA administrative : premiers retours",
    source:        "Comité de Gouvernance Numérique de l'État",
    type:          "national",
    urgency:       "moyenne",
    description:
      "L'IA administrative est opérationnelle dans 12 ministères fictifs. Le Comité de Gouvernance Numérique de l'État demande une décision sur l'encadrement du déploiement.",
    isInteractive: true,
    conditionKey:  "ai_deployed",
    choices: [
      {
        id:          "fast_deploy",
        label:       "Déployer sans restriction",
        consequence:
          "Le déploiement s'accélère sur l'ensemble des administrations. Les gains d'efficacité sont immédiats mais les contrôles humains sont allégés.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 5 },
        indicatorEffects: { popularity: 3, economy: 4 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: 15, humanOversightDelta: -12,
          publicTrustAIDelta: -5, aiTransparencyDelta: -8,
        },
      },
      {
        id:          "independent_audit",
        label:       "Commander un audit indépendant",
        consequence:
          "Un cabinet indépendant analyse les biais et risques du système. Le déploiement ralentit mais la confiance augmente.",
        effects:     { money: -400 },
        hiddenPoliticsEffects: { eliteTrust: 6, institutionalStability: 4 },
        indicatorEffects: { popularity: 2 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -10, humanOversightDelta: 8,
          publicTrustAIDelta: 10, aiTransparencyDelta: 12,
        },
      },
      {
        id:          "human_supervision",
        label:       "Imposer la supervision humaine systématique",
        consequence:
          "Toute décision algorithmique doit être validée par un agent humain. Lent mais sûr.",
        effects:     { influence: -10 },
        hiddenPoliticsEffects: { institutionalStability: 8, eliteTrust: 4 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -12, humanOversightDelta: 20,
          publicTrustAIDelta: 8, automationAbuseRiskDelta: -10,
        },
      },
      {
        id:          "limit_usage",
        label:       "Limiter aux tâches non-sensibles",
        consequence:
          "L'IA est cantonnée à la gestion administrative de bas niveau. Efficacité moindre mais risques minimisés.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 3 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -8, automationAbuseRiskDelta: -12,
          humanOversightDelta: 10, publicTrustAIDelta: 5,
        },
      },
    ],
  },

  // ── Erreur algorithmique dissimulée ──────────────────────────────────────

  {
    id:            "ai_error_hidden",
    title:         "Erreur algorithmique détectée en interne",
    source:        "Cellule de Veille Algorithmique — Usage Restreint",
    type:          "national",
    urgency:       "forte",
    description:
      "Une erreur systématique a été détectée dans les décisions algorithmiques : des milliers de dossiers fictifs ont été traités avec un biais non documenté. L'information n'a pas encore filtré à l'extérieur.",
    isInteractive: true,
    conditionKey:  "ai_risk_elevated",
    choices: [
      {
        id:          "hide_error",
        label:       "Contenir l'information",
        consequence:
          "L'erreur est corrigée discrètement sans communication publique. Le calme est préservé — pour l'instant.",
        effects:     {},
        hiddenPoliticsEffects: { scandalRisk: 15, eliteTrust: -5 },
        abuseOfPowerIndexDelta: 6,
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -5, publicTrustAIDelta: -8,
          aiTransparencyDelta: -10, hideError: true,
        },
      },
      {
        id:          "publish_transparency",
        label:       "Publier un rapport de transparence",
        consequence:
          "L'erreur est reconnu publiquement avec un plan de correction. Choc médiatique court terme, crédibilité long terme.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 8, eliteTrust: 5, scandalRisk: -5 },
        indicatorEffects: { popularity: -5 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -10, publicTrustAIDelta: 12,
          aiTransparencyDelta: 15, humanOversightDelta: 8,
        },
      },
      {
        id:          "internal_correction",
        label:       "Corriger sans communication",
        consequence:
          "La procédure est corrigée en interne. Moins de risque de fuite que la dissimulation totale, mais sans bénéfice de transparence.",
        effects:     { money: -200 },
        hiddenPoliticsEffects: { scandalRisk: 6 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -8, publicTrustAIDelta: -3,
          aiTransparencyDelta: 3,
        },
      },
    ],
  },

  // ── Biais dans la justice automatisée fictive ─────────────────────────────

  {
    id:            "ai_justice_bias",
    title:         "Biais dans la justice automatisée fictive",
    source:        "Commission Parlementaire — Droits Numériques",
    type:          "national",
    urgency:       "critique",
    description:
      "La Commission Parlementaire sur les Droits Numériques révèle qu'un algorithme fictif d'aide à la décision judiciaire présente des biais systématiques selon des critères non justifiés. Une explosion médiatique s'ensuit.",
    isInteractive: true,
    conditionKey:  "ai_justice_active",
    choices: [
      {
        id:          "suspend_system",
        label:       "Suspendre le système immédiatement",
        consequence:
          "Le déploiement est suspendu le temps d'une refonte. La crédibilité est préservée mais la continuité perturbée.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: 8, mediaMood: 6, scandalRisk: -10 },
        indicatorEffects: { popularity: 5 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -15, humanOversightDelta: 12,
          publicTrustAIDelta: 8, aiTransparencyDelta: 10,
        },
      },
      {
        id:          "defend_system",
        label:       "Défendre le système publiquement",
        consequence:
          "Le gouvernement conteste les biais identifiés. La confrontation aggrave la crise médiatique.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: -12, institutionalStability: -6, scandalRisk: 18 },
        indicatorEffects: { popularity: -8, cohesion: -5 },
        abuseOfPowerIndexDelta: 10,
        aiGovernanceDeltas: {
          algorithmicRiskDelta: 8, publicTrustAIDelta: -15,
          aiTransparencyDelta: -8,
        },
      },
      {
        id:          "commission_review",
        label:       "Commander une revue indépendante",
        consequence:
          "Une commission indépendante est saisie. Le système continue sous supervision renforcée le temps de l'expertise.",
        effects:     { money: -600 },
        hiddenPoliticsEffects: { institutionalStability: 5, mediaMood: 4, scandalRisk: -5 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -8, humanOversightDelta: 15,
          publicTrustAIDelta: 6, aiTransparencyDelta: 8,
        },
      },
    ],
  },

  // ── Scoring citoyen fictif mis en lumière ─────────────────────────────────

  {
    id:            "ai_social_scoring",
    title:         "Révélation : scoring citoyen fictif actif",
    source:        "Collectif pour les Libertés Numériques",
    type:          "national",
    urgency:       "critique",
    description:
      "Le Collectif pour les Libertés Numériques révèle l'existence d'un système fictif de notation des comportements citoyens, alimenté par les données croisées des administrations. Le parlement exige des explications.",
    isInteractive: true,
    conditionKey:  "ai_social_risk",
    choices: [
      {
        id:          "deny_and_dismantle",
        label:       "Nier puis démanteler discrètement",
        consequence:
          "Le gouvernement nie publiquement l'existence du système tout en le démantelant. La vérité risque d'émerger ultérieurement.",
        effects:     {},
        hiddenPoliticsEffects: { scandalRisk: 20, eliteTrust: -8, mediaMood: -5 },
        abuseOfPowerIndexDelta: 12,
        aiGovernanceDeltas: {
          automationAbuseRiskDelta: -10, publicTrustAIDelta: -12,
          aiTransparencyDelta: -15, hideError: true,
        },
      },
      {
        id:          "acknowledge_reform",
        label:       "Reconnaître et réformer",
        consequence:
          "Le gouvernement admet l'existence du système, le suspend, et propose un cadre éthique fictif. Coût politique immédiat.",
        effects:     {},
        hiddenPoliticsEffects: {
          institutionalStability: 10, mediaMood: 6, eliteTrust: 4, scandalRisk: -8,
        },
        indicatorEffects: { popularity: -6, cohesion: 4 },
        aiGovernanceDeltas: {
          automationAbuseRiskDelta: -20, publicTrustAIDelta: 10,
          aiTransparencyDelta: 18, humanOversightDelta: 10,
        },
      },
      {
        id:          "justify_security",
        label:       "Justifier au nom de la sécurité",
        consequence:
          "Le gouvernement présente le scoring comme un outil de prévention des risques. Une partie de l'opinion accepte, l'autre se radicalise contre.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: -8, scandalRisk: 10, popularFatigue: 5 },
        indicatorEffects: { security: 5, cohesion: -8 },
        abuseOfPowerIndexDelta: 8,
        aiGovernanceDeltas: {
          automationAbuseRiskDelta: 5, publicTrustAIDelta: -10,
          aiTransparencyDelta: -5,
        },
      },
    ],
  },

  // ── Crise algorithmique grave ─────────────────────────────────────────────

  {
    id:            "ai_crisis_drift",
    title:         "Dérive algorithmique systémique — alerte nationale",
    source:        "Conseil d'État fictif — Section Numérique",
    type:          "national",
    urgency:       "critique",
    description:
      "Le Conseil d'État fictif émet une alerte : la multiplication des systèmes automatisés sans supervision adéquate a produit des effets croisés non prévus dans plusieurs administrations. La confiance publique s'effondre.",
    isInteractive: true,
    conditionKey:  "ai_crisis",
    choices: [
      {
        id:          "emergency_oversight",
        label:       "Supervision d'urgence — tous systèmes",
        consequence:
          "Un comité de crise prend le contrôle de tous les systèmes algorithmiques. Paralysie partielle, mais risques contenus.",
        effects:     { money: -800 },
        hiddenPoliticsEffects: {
          institutionalStability: 12, eliteTrust: 8, scandalRisk: -12, mediaMood: 5,
        },
        indicatorEffects: { popularity: 5 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -20, humanOversightDelta: 25,
          automationAbuseRiskDelta: -15, publicTrustAIDelta: 10,
          aiTransparencyDelta: 15,
        },
      },
      {
        id:          "partial_shutdown",
        label:       "Suspendre les systèmes les plus risqués",
        consequence:
          "Les systèmes les plus exposés sont mis hors ligne. L'impact est limité mais la crise reste partiellement ouverte.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: 6, scandalRisk: -6 },
        aiGovernanceDeltas: {
          algorithmicRiskDelta: -12, automationAbuseRiskDelta: -10,
          humanOversightDelta: 12, publicTrustAIDelta: 5,
        },
      },
      {
        id:          "blame_external",
        label:       "Attribuer la dérive à des facteurs externes",
        consequence:
          "Le gouvernement rejette la responsabilité sur des acteurs extérieurs. Le narratif ne tient pas longtemps face aux preuves.",
        effects:     {},
        hiddenPoliticsEffects: {
          mediaMood: -15, institutionalStability: -10, scandalRisk: 20, eliteTrust: -10,
        },
        indicatorEffects: { popularity: -10, cohesion: -8 },
        abuseOfPowerIndexDelta: 15,
        aiGovernanceDeltas: {
          algorithmicRiskDelta: 5, publicTrustAIDelta: -15,
          aiTransparencyDelta: -12,
        },
      },
    ],
  },

  // ── Rapport de transparence volontaire ────────────────────────────────────

  {
    id:            "ai_transparency_report",
    title:         "Publication du rapport de transparence algorithmique",
    source:        "Secrétariat d'État au Numérique de l'État",
    type:          "national",
    urgency:       "faible",
    description:
      "Le Secrétariat d'État publie le premier rapport public de transparence sur l'utilisation des algorithmes dans les administrations. L'initiative est saluée par les observateurs.",
    isInteractive: false,
    conditionKey:  "ai_transparency_action",
    autoEffects:   { influence: 8 },
  },
];
