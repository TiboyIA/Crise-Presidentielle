import type { NewsEvent } from "@/types/strategy";

/**
 * Rapports fictifs de la Cellule DIM Nationale.
 * Aucune donnée médicale réelle, aucune classification clinique,
 * aucun diagnostic. Pilotage administratif et statistique uniquement.
 */
export const MEDICAL_EVENTS: NewsEvent[] = [

  // ── Rapport 1 : Données alarmantes / critiques ─────────────────────────────
  {
    id: "medical_dim_alerte_donnees",
    title: "Alerte DIM — Données sanitaires contradictoires",
    source: "Cellule DIM Nationale / Inspection Générale des Affaires Sociales",
    type: "national",
    urgency: "forte",
    description: "La Cellule DIM nationale signale des incohérences majeures dans la consolidation des tableaux de bord sanitaires. Les remontées de données entre services présentent des écarts inexplicables. Des décisions stratégiques pourraient être prises sur des chiffres erronés.",
    isInteractive: true,
    conditionKey: "medical_quality_critical",
    minActionsGap: 18,
    choices: [
      {
        id: "dim_commission_enquete",
        label: "Lancer une commission d'enquête interministérielle",
        consequence: "Une cellule de crise interministérielle audite les systèmes de remontée. La transparence rassure les parties prenantes mais expose temporairement les failles.",
        effects: { money: -300, intelligence: 10 },
        indicatorEffects: { popularity: 2 },
        hiddenPoliticsEffects: { institutionalStability: 4, scandalRisk: -5, eliteTrust: 3 },
      },
      {
        id: "dim_ministre_communique",
        label: "Communiqué du ministre — rassurer sans divulguer",
        consequence: "Le ministre publie un communiqué mesuré. La communication contient la panique mais ne résout pas les défaillances systémiques.",
        effects: { influence: -8 },
        indicatorEffects: { popularity: -2 },
        hiddenPoliticsEffects: { mediaMood: 3, scandalRisk: 5 },
        pathologyDelta: { minimization: 8 },
      },
      {
        id: "dim_audit_technique",
        label: "Audit technique d'urgence des systèmes d'information",
        consequence: "Des experts en systèmes d'information sanitaire sont mandatés. La correction prend du temps mais renforce durablement la fiabilité.",
        effects: { money: -500, technology: 5, cyberDefense: 8 },
        hiddenPoliticsEffects: { institutionalStability: 6 },
      },
    ],
  },

  // ── Rapport 2 : Retards de remontée / dégradé ─────────────────────────────
  {
    id: "medical_dim_retard_remontee",
    title: "Cellule DIM — Retards de remontée des indicateurs sanitaires",
    source: "Cellule DIM Nationale",
    type: "national",
    urgency: "moyenne",
    description: "La Cellule DIM nationale signale des retards croissants dans la consolidation des tableaux de bord sanitaires régionaux. Certains indicateurs présentent un délai de 72 à 96 heures. Le pilotage en temps réel est partiellement compromis.",
    isInteractive: true,
    conditionKey: "medical_quality_degraded",
    minActionsGap: 22,
    choices: [
      {
        id: "dim_renforcer_systemes",
        label: "Renforcer les systèmes de collecte de données",
        consequence: "Des investissements ciblés accélèrent la modernisation des outils de remontée. La fiabilité s'améliore progressivement.",
        effects: { money: -400, technology: 6, cyberDefense: 5 },
        hiddenPoliticsEffects: { institutionalStability: 3 },
      },
      {
        id: "dim_equipe_terrain",
        label: "Déployer des équipes de coordination régionale",
        consequence: "Des coordinateurs régionaux remontent directement les données. Solution temporaire mais efficace à court terme.",
        effects: { money: -200, intelligence: 6 },
        hiddenPoliticsEffects: { institutionalStability: 2, eliteTrust: 2 },
      },
      {
        id: "dim_rapport_interim",
        label: "Accepter et publier un rapport intermédiaire partiel",
        consequence: "L'État assume publiquement les limites du système. La transparence est appréciée mais génère quelques inquiétudes médiatiques.",
        effects: { influence: -5 },
        indicatorEffects: { popularity: 3 },
        hiddenPoliticsEffects: { mediaMood: 4, scandalRisk: 3 },
        pathologyDelta: { technocraticColdness: 5 },
      },
    ],
  },

  // ── Rapport 3 : Qualité exemplaire / opportunité ───────────────────────────
  {
    id: "medical_dim_rapport_exemplaire",
    title: "Rapport DIM — Qualité des données sanitaires exemplaire",
    source: "Cellule DIM Nationale / Comité d'Évaluation des Systèmes de Santé",
    type: "national",
    urgency: "faible",
    description: "La Cellule DIM nationale publie un bilan positif. Les systèmes de remontée d'informations sanitaires atteignent un niveau de fiabilité élevé. Le tableau de bord national est consolidé en temps quasi-réel. Cette avance peut être valorisée.",
    isInteractive: true,
    conditionKey: "medical_quality_high",
    minActionsGap: 30,
    choices: [
      {
        id: "dim_capitaliser_rapport",
        label: "Valoriser le rapport — communication gouvernementale",
        consequence: "Le gouvernement publie les indicateurs de performance. La transparence renforce la confiance institutionnelle et l'image internationale.",
        effects: { influence: 10 },
        indicatorEffects: { popularity: 4 },
        hiddenPoliticsEffects: { eliteTrust: 5, mediaMood: 6 },
      },
      {
        id: "dim_preparer_crise",
        label: "Capitaliser pour la préparation aux crises",
        consequence: "La qualité des données est utilisée pour affiner les scénarios de crise et renforcer la capacité d'anticipation nationale.",
        effects: { intelligence: 12, technology: 3 },
        hiddenPoliticsEffects: { institutionalStability: 4 },
      },
    ],
  },

];
