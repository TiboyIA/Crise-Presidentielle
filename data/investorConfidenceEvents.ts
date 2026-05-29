/**
 * investorConfidenceEvents.ts — Événements MODE DELTA Confiance des Investisseurs.
 *
 * 5 événements :
 *   1. Briefing neutre "Les investisseurs attendent un signal clair" (auto)
 *   2. Défiance croissante (interactive, forte)
 *   3. Fuite des capitaux fictive (interactive, critique)
 *   4. Signal de confiance — opportunité (interactive, faible)
 *   5. Fenêtre de crédibilité post-réforme (interactive, moyenne)
 *
 * Aucun conseil financier réel. Aucun trading. Aucune bourse simulée.
 * Les effets investorConfidenceDelta sont des deltas directs sur l'indicateur.
 */

import type { NewsEvent } from "@/types/strategy";

export const INVESTOR_CONFIDENCE_EVENTS: NewsEvent[] = [
  // ── 1. Briefing — signal d'attente ───────────────────────────────────────────
  {
    id:          "investor_signal_weak",
    title:       "Les investisseurs attendent un signal clair",
    source:      "Note d'Analyse — Direction du Trésor",
    type:        "economie",
    urgency:     "faible",
    description: "Les indicateurs de confiance des marchés fictifs signalent une posture d'attente prudente. Les acteurs économiques hésitent à s'engager à long terme faute de visibilité sur la trajectoire gouvernementale. Un signal fort — réforme crédible, stabilité budgétaire ou geste institutionnel — est attendu.",
    isInteractive: false,
    autoEffects:  {},
    conditionKey: "investor_signal_weak",
    minActionsGap: 20,
  },

  // ── 2. Défiance croissante ────────────────────────────────────────────────────
  {
    id:          "investor_defiance_rising",
    title:       "Défiance croissante des investisseurs",
    source:      "Baromètre Économique National",
    type:        "economie",
    urgency:     "forte",
    description: "La confiance des acteurs économiques fictifs est en recul marqué. Les projets d'investissement sont gelés, les engagements différés. Le gouvernement doit envoyer un signal de stabilité convaincant avant que la tendance ne se transforme en désinvestissement structurel.",
    isInteractive: true,
    conditionKey: "investor_defiance_rising",
    minActionsGap: 10,
    choices: [
      {
        id:                    "plan_stabilisation_economique",
        label:                 "Plan de stabilisation économique",
        consequence:           "Un plan de stabilisation crédible est annoncé. La visibilité sur la politique budgétaire rassure les acteurs économiques fictifs. La confiance remonte nettement.",
        effects:               { money: -150 },
        indicatorEffects:      {},
        hiddenPoliticsEffects: { institutionalStability: 4 },
        investorConfidenceDelta: 12,
      },
      {
        id:                    "annonce_reformes_credibles",
        label:                 "Annonce de réformes crédibles",
        consequence:           "Le gouvernement annonce un calendrier de réformes précis et engageant. Les marchés fictifs interprètent le geste positivement. La confiance se redresse progressivement.",
        effects:               { influence: -12 },
        indicatorEffects:      { economy: 2 },
        investorConfidenceDelta: 9,
      },
      {
        id:                    "silence_attentiste",
        label:                 "Maintenir la discrétion",
        consequence:           "Le gouvernement choisit de ne pas répondre aux signaux des marchés. Cette posture est interprétée comme un manque de cap. La tendance négative se poursuit et risque de s'aggraver.",
        effects:               {},
        indicatorEffects:      {},
        hiddenPoliticsEffects: { scandalRisk: 4 },
        queuesDelayedConsequence: {
          id:               "investor_inaction_consequence",
          delayActions:     8,
          effectType:       "indicator_effect",
          payload:          { economy: -2, popularity: -3 },
        },
      },
    ],
  },

  // ── 3. Fuite des capitaux ─────────────────────────────────────────────────────
  {
    id:          "investor_capital_flight",
    title:       "Fuite des capitaux fictive — crise de confiance majeure",
    source:      "Cellule Économique de Crise",
    type:        "economie",
    urgency:     "critique",
    description: "La confiance des investisseurs fictifs s'est effondrée. Un désinvestissement massif est en cours. Les projets stratégiques sont annulés, les capitaux se relocalisent fictivment vers des zones perçues comme plus stables. Sans intervention rapide et crédible, l'économie nationale risque une contraction prolongée.",
    isInteractive: true,
    conditionKey: "investor_capital_flight",
    minActionsGap: 8,
    choices: [
      {
        id:                    "plan_urgence_confiance",
        label:                 "Plan d'urgence économique",
        consequence:           "Un plan d'urgence massif est déclenché avec des engagements institutionnels forts. L'annonce stoppe l'hémorragie fictive et redonne de la visibilité aux acteurs économiques. La confiance remonte significativement.",
        effects:               { money: -400 },
        indicatorEffects:      { economy: -1 },
        hiddenPoliticsEffects: { institutionalStability: 6, popularFatigue: 2 },
        investorConfidenceDelta: 22,
      },
      {
        id:                    "garanties_internationales",
        label:                 "Solliciter des garanties internationales",
        consequence:           "Des engagements d'États partenaires fictifs sont obtenus pour sécuriser les investissements stratégiques. La confiance se redresse, mais la dépendance extérieure s'accroît.",
        effects:               { influence: -30 },
        indicatorEffects:      {},
        hiddenPoliticsEffects: { institutionalStability: 3 },
        investorConfidenceDelta: 16,
      },
      {
        id:                    "deni_attentisme_fuite",
        label:                 "Nier et attendre",
        consequence:           "Le gouvernement choisit de minimiser la gravité de la crise. Cette posture aggrave la perception des marchés. Les conséquences économiques se feront sentir dans les prochaines semaines.",
        effects:               {},
        indicatorEffects:      { economy: -1 },
        hiddenPoliticsEffects: { scandalRisk: 6, mediaMood: -5 },
        queuesDelayedConsequence: {
          id:               "investor_flight_deferred",
          delayActions:     10,
          effectType:       "indicator_effect",
          payload:          { popularity: -5, economy: -3 },
        },
      },
    ],
  },

  // ── 4. Signal de confiance — opportunité ──────────────────────────────────────
  {
    id:          "investor_confidence_boom",
    title:       "Signal de confiance des marchés — fenêtre d'opportunité",
    source:      "Baromètre Économique National",
    type:        "economie",
    urgency:     "faible",
    description: "Les indicateurs fictifs de confiance des investisseurs atteignent un niveau élevé. Les acteurs économiques envoient des signaux positifs. Ce moment favorable représente une fenêtre pour consolider les acquis ou accélérer des investissements stratégiques.",
    isInteractive: true,
    conditionKey: "investor_confidence_boom",
    minActionsGap: 20,
    choices: [
      {
        id:                    "capitaliser_sur_confiance",
        label:                 "Capitaliser sur la confiance",
        consequence:           "Le gouvernement saisit l'opportunité pour accélérer les réformes structurelles. Le signal positif est amplifié et la dynamique favorable se renforce.",
        effects:               {},
        indicatorEffects:      { economy: 2 },
        investorConfidenceDelta: 8,
      },
      {
        id:                    "attirer_investissements_strategiques",
        label:                 "Attirer des investissements stratégiques",
        consequence:           "Le gouvernement mobilise son capital diplomatique pour attirer des projets d'investissement fictifs dans des secteurs stratégiques. L'économie en bénéficie directement.",
        effects:               { influence: -10 },
        indicatorEffects:      { economy: 3 },
        investorConfidenceDelta: 5,
      },
      {
        id:                    "consolider_acquis",
        label:                 "Consolider sans prendre de risques",
        consequence:           "Le gouvernement adopte une posture prudente, préférant stabiliser les acquis plutôt qu'accélérer. La dynamique se maintient mais sans gain significatif.",
        effects:               {},
        indicatorEffects:      {},
        investorConfidenceDelta: 3,
      },
    ],
  },

  // ── 5. Fenêtre de crédibilité post-réforme ────────────────────────────────────
  {
    id:          "investor_reform_signal",
    title:       "Fenêtre de crédibilité — les réformes rassurent les marchés",
    source:      "Comité d'Évaluation Économique",
    type:        "economie",
    urgency:     "moyenne",
    description: "Les réformes engagées envoient un signal positif aux acteurs économiques fictifs. La confiance est en zone d'amélioration. Ce moment charnière doit être exploité pour ancrer définitivement la crédibilité du gouvernement auprès des investisseurs.",
    isInteractive: true,
    conditionKey: "investor_reform_signal",
    minActionsGap: 15,
    choices: [
      {
        id:                    "communiquer_reforme_publique",
        label:                 "Communication publique sur les réformes",
        consequence:           "Une communication offensive sur les résultats des réformes renforce le signal de crédibilité. La confiance des marchés fictifs s'améliore nettement.",
        effects:               { influence: -10 },
        indicatorEffects:      {},
        investorConfidenceDelta: 13,
      },
      {
        id:                    "engagement_institutionnel_investisseurs",
        label:                 "Engagement institutionnel direct",
        consequence:           "Des engagements formels auprès des acteurs économiques fictifs sont pris. La stabilité réglementaire est garantie. La confiance s'ancre durablement.",
        effects:               { money: -100 },
        indicatorEffects:      {},
        hiddenPoliticsEffects: { institutionalStability: 5 },
        investorConfidenceDelta: 9,
      },
      {
        id:                    "attendre_resultats_concrets",
        label:                 "Laisser les résultats parler",
        consequence:           "Le gouvernement préfère que les chiffres parlent d'eux-mêmes plutôt que de communiquer activement. La progression de la confiance est plus lente mais plus solide.",
        effects:               {},
        indicatorEffects:      {},
        investorConfidenceDelta: 4,
        queuesDelayedConsequence: {
          id:               "investor_reform_results",
          delayActions:     10,
          effectType:       "indicator_effect",
          payload:          { economy: 1 },
        },
      },
    ],
  },
];
