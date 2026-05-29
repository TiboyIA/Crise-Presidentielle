/**
 * healthInteroperabilityEvents.ts — Événements d'interopérabilité des systèmes de santé.
 *
 * 3 événements : dégradation des échanges · crise d'information médicale · opportunité d'investissement.
 *
 * Aucun système informatique réel. Aucune donnée patient réelle.
 */

import type { NewsEvent } from "@/types/strategy";

export const HEALTH_INTEROPERABILITY_EVENTS: NewsEvent[] = [
  // ── Dégradation — seuil < 35 ─────────────────────────────────────────────────
  {
    id:          "interop_degraded",
    title:       "Dégradation des échanges entre systèmes de santé : les données s'accumulent en silos",
    source:      "Direction du Numérique en Santé",
    type:        "national",
    urgency:     "forte",
    description:
      "La Direction du Numérique en Santé publie un bilan technique : l'interopérabilité entre les systèmes d'information des établissements de santé et les plateformes nationales de consolidation s'est significativement dégradée. Des données ne circulent plus correctement entre les différents niveaux du système. Des doublons et des lacunes statistiques compromettent la fiabilité des indicateurs sanitaires utilisés pour la décision.",
    isInteractive: true,
    conditionKey:  "interop_degraded",
    minActionsGap: 22,
    choices: [
      {
        id:          "interop_plan_modernisation",
        label:       "Lancer un plan de modernisation des interfaces de données sanitaires",
        consequence:
          "Un programme structurel est mis en place pour uniformiser et automatiser les échanges entre systèmes. Le chantier est long mais les bases sont solides.",
        effects:               { money: -400, technology: 8 },
        hiddenPoliticsEffects: { institutionalStability: 4, eliteTrust: 3 },
        communicationRegister: "technocratique",
        declarationTheme:      "depenses_publiques",
        declarationStance:     "pro",
      },
      {
        id:          "interop_circulaire_admin",
        label:       "Imposer une standardisation par circulaire administrative",
        consequence:
          "Une réponse rapide et peu coûteuse. Les résistances institutionnelles sont nombreuses et la qualité de l'implémentation variable selon les établissements. Un gain partiel est attendu.",
        effects:               { money: -80, influence: -8 },
        hiddenPoliticsEffects: { institutionalStability: 2, scandalRisk: 3 },
        communicationRegister: "institutionnel",
      },
      {
        id:          "interop_attente_refonte",
        label:       "Attendre une refonte globale du système numérique de santé",
        consequence:
          "Aucune action à court terme. La situation continue de se dégrader. La Direction du Numérique publie un avertissement sur les risques de perte de données.",
        effects:               {},
        hiddenPoliticsEffects: { institutionalStability: -2, scandalRisk: 4, mediaMood: -3 },
        pathologyDelta:        { minimization: 6, technocraticColdness: 4 },
        communicationRegister: "populaire",
      },
    ],
  },

  // ── Crise d'information médicale — seuil < 20 ────────────────────────────────
  {
    id:          "interop_crisis",
    title:       "Crise d'information médicale : les systèmes de santé ne communiquent plus",
    source:      "Agence du Numérique en Santé",
    type:        "national",
    urgency:     "critique",
    description:
      "L'Agence du Numérique en Santé déclare une crise d'interopérabilité de niveau maximal. Les systèmes d'information des établissements de santé fonctionnent en silos complets. Les données nationales consolidées sont largement incomplètes. Des décisions importantes ont déjà été prises sur la base d'indicateurs erronés. Des responsables de terrain signalent une confusion croissante dans la remontée des informations. La situation exige une intervention d'urgence.",
    isInteractive: true,
    conditionKey:  "interop_crisis",
    minActionsGap: 25,
    choices: [
      {
        id:          "interop_cellule_urgence",
        label:       "Activer une cellule de crise technique interministérielle",
        consequence:
          "Une intervention d'urgence mobilise les équipes techniques. Les systèmes les plus critiques sont stabilisés en priorité. La crise est partiellement contenue mais le coût est élevé.",
        effects:               { money: -500, technology: 5, influence: -10 },
        hiddenPoliticsEffects: { institutionalStability: 5, scandalRisk: -6, mediaMood: 3 },
        communicationRegister: "institutionnel",
      },
      {
        id:          "interop_acteurs_prives",
        label:       "Faire appel à des prestataires privés pour une remédiation d'urgence",
        consequence:
          "Les équipes privées interviennent rapidement. L'efficacité est au rendez-vous mais la dépendance externe et le coût budgétaire alimentent une polémique sur la privatisation des systèmes critiques.",
        effects:               { money: -350, technology: 4 },
        hiddenPoliticsEffects: { scandalRisk: 8, mediaMood: -4, institutionalStability: 3 },
        queuesDelayedConsequence: {
          id:           "interop_prive_retour",
          delayActions: 12,
          effectType:   "hidden_politics",
          payload:      { scandalRisk: 5, mediaMood: -6 },
        },
        communicationRegister: "technocratique",
      },
      {
        id:          "interop_moratoire",
        label:       "Décréter un moratoire sur les échanges non essentiels pour sécuriser les données critiques",
        consequence:
          "Une mesure conservatoire qui isole le problème. Les statistiques nationales sont suspendues temporairement. La pression sur le système diminue mais la visibilité sur la situation sanitaire est nulle pendant plusieurs jours.",
        effects:               { influence: -8 },
        hiddenPoliticsEffects: { institutionalStability: 3, scandalRisk: 5, mediaMood: -5 },
        pathologyDelta:        { technocraticColdness: 6 },
        queuesDelayedConsequence: {
          id:           "interop_moratoire_levee",
          delayActions: 10,
          effectType:   "hidden_politics",
          payload:      { institutionalStability: 4, scandalRisk: -3 },
        },
        communicationRegister: "institutionnel",
      },
    ],
  },

  // ── Opportunité d'investissement — seuil >= 70 ────────────────────────────────
  {
    id:          "interop_opportunity",
    title:       "Rapport : fenêtre d'investissement pour atteindre l'excellence en interopérabilité",
    source:      "Direction du Numérique en Santé",
    type:        "national",
    urgency:     "faible",
    description:
      "La DNS identifie une fenêtre favorable pour faire franchir au système de santé un palier d'interopérabilité supplémentaire. Les indicateurs techniques sont au vert. Un investissement ciblé dans les standards d'échange, la formation des équipes et l'automatisation des flux permettrait d'atteindre une intégration de niveau optimal avant la prochaine période de tension.",
    isInteractive: true,
    conditionKey:  "interop_opportunity",
    minActionsGap: 30,
    choices: [
      {
        id:          "interop_excellence",
        label:       "Investir pour atteindre l'excellence : programme complet d'intégration",
        consequence:
          "Un engagement ambitieux. L'ensemble des interfaces est modernisé, les standards sont harmonisés et les équipes sont formées. L'interopérabilité atteint son niveau optimal.",
        effects:               { money: -500, technology: 10 },
        hiddenPoliticsEffects: { institutionalStability: 6, eliteTrust: 5, scandalRisk: -4 },
        communicationRegister: "technocratique",
        declarationTheme:      "depenses_publiques",
        declarationStance:     "pro",
      },
      {
        id:          "interop_consolider",
        label:       "Consolider les acquis : investissement ciblé sur les interfaces critiques",
        consequence:
          "Un effort mesuré et pragmatique. Les points de fragilité les plus importants sont traités sans budget excessif.",
        effects:               { money: -220, technology: 4 },
        hiddenPoliticsEffects: { institutionalStability: 3, eliteTrust: 2 },
        communicationRegister: "institutionnel",
      },
      {
        id:          "interop_utiliser_ailleurs",
        label:       "Réorienter les ressources vers des priorités immédiates",
        consequence:
          "La fenêtre d'opportunité se referme. La DNS publie un rapport regrettant l'arbitrage. Le niveau actuel se maintient sans progression.",
        effects:               {},
        hiddenPoliticsEffects: { eliteTrust: -3, scandalRisk: 2 },
        pathologyDelta:        { minimization: 3 },
        communicationRegister: "populaire",
      },
    ],
  },
];
