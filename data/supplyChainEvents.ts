/**
 * supplyChainEvents.ts — Événements MODE DELTA Chaînes d'approvisionnement.
 *
 * 5 événements couvrant :
 *   1. Signal précoce de tensions (auto, journal discret)
 *   2. Vulnérabilité sectorielle (interactive, choix d'action)
 *   3. Rupture critique (interactive, crise majeure)
 *   4. Dépendance critique technologique (interactive, plan à long terme)
 *   5. Fenêtre de souveraineté industrielle (interactive, opportunité)
 *
 * Les effets supplyChainEffects sont des deltas appliqués aux champs SectorState.
 * Aucun pays nommé, aucun chiffre commercial réel.
 */

import type { NewsEvent } from "@/types/strategy";

export const SUPPLY_CHAIN_EVENTS: NewsEvent[] = [
  // ── 1. Signal précoce ────────────────────────────────────────────────────────
  {
    id:           "supply_chain_watch",
    title:        "Signal précoce de tensions sur les approvisionnements",
    source:       "Observatoire des Dépendances Stratégiques",
    type:         "economie",
    urgency:      "faible",
    description:  "Les indicateurs de tension sur plusieurs chaînes d'approvisionnement stratégiques sont en hausse. Aucune rupture imminente, mais les marges de sécurité s'amenuisent. Une surveillance accrue est recommandée.",
    isInteractive: false,
    autoEffects:  {},
    conditionKey: "supply_chain_watch",
    minActionsGap: 20,
  },

  // ── 2. Vulnérabilité sectorielle ─────────────────────────────────────────────
  {
    id:          "supply_sector_alert",
    title:       "Vulnérabilité d'un secteur stratégique confirmée",
    source:      "Comité de Veille Stratégique",
    type:        "economie",
    urgency:     "moyenne",
    description: "Le comité de veille confirme qu'un ou plusieurs secteurs stratégiques présentent une vulnérabilité structurelle aux ruptures d'approvisionnement. Des mesures préventives doivent être prises rapidement.",
    isInteractive: true,
    conditionKey: "supply_sector_alert",
    minActionsGap: 10,
    choices: [
      {
        id:          "constituer_stocks_urgence",
        label:       "Constituer des stocks d'urgence",
        consequence: "Des réserves stratégiques sont constituées sur les secteurs les plus exposés. Le coût immédiat est significatif, mais la résilience nationale est renforcée.",
        effects:     { money: -200 },
        indicatorEffects: {},
        supplyChainEffects: {
          semi_conducteurs:   { stockLevel: 12 },
          materiaux_critiques: { stockLevel: 10 },
          medicaments:         { stockLevel: 8 },
        },
      },
      {
        id:          "diversifier_fournisseurs",
        label:       "Diversifier les fournisseurs",
        consequence: "Des accords de diversification sont engagés. La dépendance aux importations technologiques se réduit progressivement au prix d'un effort diplomatique notable.",
        effects:     { money: -120, influence: -15 },
        indicatorEffects: {},
        supplyChainEffects: {
          semi_conducteurs: { dependencyLevel: -10 },
          medicaments:      { dependencyLevel: -6 },
        },
      },
      {
        id:          "attendre_evaluer",
        label:       "Surveiller sans agir",
        consequence: "L'administration choisit d'observer la situation avant d'engager des ressources. Cette posture prudente risque d'aggraver la vulnérabilité si la situation se dégrade.",
        effects:     {},
        indicatorEffects: {},
        queuesDelayedConsequence: {
          id:               "supply_watch_deferred",
          delayActions:     8,
          effectType:       "indicator_effect",
          payload:          { economy: -1 },
        },
      },
    ],
  },

  // ── 3. Rupture critique ───────────────────────────────────────────────────────
  {
    id:          "supply_rupture_crisis",
    title:       "Rupture d'approvisionnement — situation critique",
    source:      "Cellule Interministérielle Approvisionnements",
    type:        "economie",
    urgency:     "critique",
    description: "Une rupture d'approvisionnement est confirmée sur au moins un secteur stratégique. Les stocks existants ne suffisent plus à couvrir les besoins à court terme. La situation exige une réponse gouvernementale immédiate.",
    isInteractive: true,
    conditionKey: "supply_rupture_crisis",
    minActionsGap: 8,
    choices: [
      {
        id:          "plan_urgence_national",
        label:       "Plan d'urgence national",
        consequence: "Un plan d'urgence massif est déclenché. Des stocks de secours sont acheminés en priorité vers les secteurs en rupture. Coûteux, mais efficace à court terme.",
        effects:     { money: -400, influence: -10 },
        indicatorEffects: { popularity: 2 },
        hiddenPoliticsEffects: { institutionalStability: -2 },
        supplyChainEffects: {
          energie:     { stockLevel: 20, disruptionRisk: -15 },
          alimentation: { stockLevel: 15, disruptionRisk: -10 },
          medicaments:  { stockLevel: 12 },
        },
      },
      {
        id:          "accord_commercial_urgence",
        label:       "Accord commercial d'urgence",
        consequence: "Des accords d'approvisionnement d'urgence sont négociés en urgence. La dépendance reste élevée, mais le risque de rupture est temporairement contenu.",
        effects:     { money: -150, influence: -25 },
        indicatorEffects: {},
        supplyChainEffects: {
          semi_conducteurs:   { disruptionRisk: -18, dependencyLevel: -5 },
          materiaux_critiques: { disruptionRisk: -12 },
        },
      },
      {
        id:          "rationner_attendre",
        label:       "Rationner et gérer la pénurie",
        consequence: "Le gouvernement choisit de gérer la pénurie par des mesures de rationnement. L'économie ralentit et la contestation sociale monte, mais les finances publiques sont préservées à court terme.",
        effects:     {},
        indicatorEffects: { economy: -1, cohesion: -1 },
        hiddenPoliticsEffects: { popularFatigue: 3 },
        queuesDelayedConsequence: {
          id:               "supply_rupture_deferred",
          delayActions:     10,
          effectType:       "indicator_effect",
          payload:          { popularity: -4, economy: -2 },
        },
      },
    ],
  },

  // ── 4. Dépendance critique technologique ─────────────────────────────────────
  {
    id:          "supply_critical_dependency",
    title:       "Dépendance critique aux importations technologiques",
    source:      "Conseil Économique de Défense",
    type:        "economie",
    urgency:     "forte",
    description: "Le bilan stratégique révèle une dépendance critique aux importations technologiques, en particulier sur les semi-conducteurs et les matériaux critiques. Cette vulnérabilité structurelle expose l'économie nationale à des chocs extérieurs.",
    isInteractive: true,
    conditionKey: "supply_critical_dependency",
    minActionsGap: 15,
    choices: [
      {
        id:          "plan_relocalisation_industrielle",
        label:       "Lancer un plan de relocalisation industrielle",
        consequence: "Un plan ambitieux de réindustrialisation est lancé. La capacité de production nationale sur les secteurs technologiques augmente significativement à moyen terme.",
        effects:     { money: -450, technology: -10 },
        indicatorEffects: { economy: -1 },
        hiddenPoliticsEffects: { eliteTrust: 3 },
        supplyChainEffects: {
          semi_conducteurs:   { domesticCapacity: 15, dependencyLevel: -8 },
          materiaux_critiques: { domesticCapacity: 10, dependencyLevel: -5 },
        },
      },
      {
        id:          "accord_diversification_technologique",
        label:       "Accord de diversification technologique",
        consequence: "Des accords stratégiques de diversification sont signés avec plusieurs partenaires. La dépendance à un fournisseur unique se réduit progressivement.",
        effects:     { influence: -30 },
        indicatorEffects: {},
        supplyChainEffects: {
          semi_conducteurs: { dependencyLevel: -14 },
          defense:          { dependencyLevel: -6 },
        },
      },
      {
        id:          "investissement_partenarial",
        label:       "Investissement industriel partenarial",
        consequence: "L'État engage des co-investissements avec des partenaires industriels pour développer une filière nationale. Les effets se feront sentir progressivement.",
        effects:     { money: -250, influence: -15 },
        indicatorEffects: {},
        supplyChainEffects: {
          semi_conducteurs: { dependencyLevel: -6, domesticCapacity: 6 },
        },
        queuesDelayedConsequence: {
          id:               "supply_partnership_result",
          delayActions:     12,
          effectType:       "indicator_effect",
          payload:          { economy: 2 },
        },
      },
    ],
  },

  // ── 5. Fenêtre de souveraineté industrielle ───────────────────────────────────
  {
    id:          "supply_sovereignty_window",
    title:       "Fenêtre d'opportunité pour la souveraineté industrielle",
    source:      "Plan National de Réindustrialisation",
    type:        "economie",
    urgency:     "moyenne",
    description: "La combinaison d'une productivité nationale élevée et de recherches avancées crée une fenêtre d'opportunité unique pour renforcer la souveraineté industrielle. Le moment est propice pour des investissements structurants à long terme.",
    isInteractive: true,
    conditionKey: "supply_sovereignty_window",
    minActionsGap: 20,
    choices: [
      {
        id:          "accelerer_relocalisation",
        label:       "Accélérer la relocalisation",
        consequence: "Les capacités de production nationale sont renforcées en priorité sur les secteurs énergie et matériaux. La souveraineté s'affirme progressivement.",
        effects:     { money: -300 },
        indicatorEffects: { ecology: 2 },
        supplyChainEffects: {
          energie:             { domesticCapacity: 14 },
          materiaux_critiques: { domesticCapacity: 12 },
        },
      },
      {
        id:          "consolider_stocks_strategiques",
        label:       "Consolider les stocks stratégiques",
        consequence: "Des réserves stratégiques renforcées sont constituées sur les secteurs les plus vulnérables. Un choc d'approvisionnement sera mieux absorbé.",
        effects:     { money: -220 },
        indicatorEffects: {},
        supplyChainEffects: {
          energie:          { stockLevel: 18 },
          medicaments:      { stockLevel: 14 },
          semi_conducteurs: { stockLevel: 12 },
        },
      },
      {
        id:          "signer_accord_strategique",
        label:       "Signer un accord stratégique de long terme",
        consequence: "Des accords-cadres de long terme sont conclus pour réduire la dépendance structurelle. La souveraineté progresse par la coopération plutôt que par la substitution.",
        effects:     { influence: -20 },
        indicatorEffects: {},
        supplyChainEffects: {
          materiaux_critiques: { dependencyLevel: -12 },
          semi_conducteurs:    { dependencyLevel: -10 },
        },
      },
    ],
  },
];
