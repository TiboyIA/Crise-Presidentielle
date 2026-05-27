import type { NewsEvent } from "@/types/strategy";

export const THERMAL_EVENTS: NewsEvent[] = [

  // ── Surchauffe critique — urgence immédiate ───────────────────────────────
  {
    id:          "thermal_surchauffe_critique",
    title:       "Surchauffe critique des systèmes nationaux",
    source:      "Cellule Technique Interministérielle",
    type:        "national",
    urgency:     "critique",
    description: "Les équipes techniques signalent une surchauffe généralisée des systèmes critiques. Datacenters, réseaux et équipements militaires sont en limite de tolérance. Une intervention d'urgence est indispensable.",
    isInteractive: true,
    conditionKey:  "thermal_critical_stress",
    minActionsGap: 8,
    choices: [
      {
        id:          "thermal_deploiement_urgence",
        label:       "Déploiement de refroidissement d'urgence",
        consequence: "Les équipes techniques déploient des systèmes de refroidissement en urgence. La charge thermique redescend significativement.",
        effects:          { money: -600 },
        thermalReduction: 35,
        hiddenPoliticsEffects: { institutionalStability: +3 },
      },
      {
        id:          "thermal_isolation_partielle",
        label:       "Isolation des systèmes les plus chargés",
        consequence: "Les systèmes non essentiels sont mis en veille. La surchauffe recule partiellement, mais des capacités opérationnelles sont temporairement réduites.",
        effects:          { money: -250 },
        indicatorEffects: { economy: -2 },
        thermalReduction: 18,
      },
    ],
  },

  // ── Tension thermique systémique — rapport préventif ─────────────────────
  {
    id:          "thermal_tension_systemique",
    title:       "Rapport technique : tension thermique sur les infrastructures critiques",
    source:      "Direction des Systèmes d'Information de l'État",
    type:        "national",
    urgency:     "forte",
    description: "Un rapport interministériel alerte sur une montée en charge thermique anormale. Sans action, les systèmes critiques risquent une dégradation progressive de leurs performances.",
    isInteractive: true,
    conditionKey:  "thermal_high_stress",
    minActionsGap: 20,
    choices: [
      {
        id:          "thermal_plan_refroidissement",
        label:       "Plan de refroidissement interministériel",
        consequence: "Un plan coordonné de réduction de charge est activé. La tension thermique recule de manière significative.",
        effects:          { money: -400 },
        thermalReduction: 20,
        hiddenPoliticsEffects: { institutionalStability: +2 },
      },
      {
        id:          "thermal_mesures_ciblees",
        label:       "Mesures ciblées sur les datacenters prioritaires",
        consequence: "Les nœuds critiques sont soulagés en priorité. Amélioration modérée mais ciblée.",
        effects:          { money: -180 },
        thermalReduction: 10,
      },
      {
        id:          "thermal_differer",
        label:       "Reporter à meilleure période",
        consequence: "Le rapport est classé. La tension thermique suit son évolution naturelle.",
        effects:          { money: 0 },
      },
    ],
  },

  // ── Fenêtre de refroidissement favorable ─────────────────────────────────
  {
    id:          "thermal_fenetre_refroidissement",
    title:       "Fenêtre technique favorable — modernisation thermique des systèmes",
    source:      "Agence Nationale des Infrastructures Numériques",
    type:        "national",
    urgency:     "moyenne",
    description: "Les systèmes nationaux sont dans un état thermique stable. C'est le moment idéal pour moderniser les équipements de refroidissement et améliorer l'efficacité énergétique des datacenters.",
    isInteractive: true,
    conditionKey:  "thermal_cooling_window",
    minActionsGap: 30,
    choices: [
      {
        id:          "thermal_modernisation",
        label:       "Modernisation des équipements de refroidissement",
        consequence: "Les nouveaux équipements améliorent durablement la dissipation thermique et l'efficacité des systèmes.",
        effects:          { money: -500, technology: +8 },
        thermalReduction: 15,
      },
      {
        id:          "thermal_entretien_preventif",
        label:       "Entretien préventif des systèmes existants",
        consequence: "Une révision standard stabilise les équipements. Gain modéré mais sans investissement lourd.",
        effects:          { money: -180 },
        thermalReduction: 8,
      },
      {
        id:          "thermal_passer",
        label:       "Laisser passer la fenêtre",
        consequence: "Aucune intervention. Les systèmes poursuivent leur cycle naturel.",
        effects:          { money: 0 },
      },
    ],
  },

];
