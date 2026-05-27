import type { NewsEvent } from "@/types/strategy";

export const WEAR_EVENTS: NewsEvent[] = [

  // ── Rupture critique — un bâtiment atteint l'état d'urgence ──────────────
  {
    id:          "infra_rupture_critique",
    title:       "Rupture structurelle : un ministère en état d'urgence technique",
    source:      "Services Techniques Interministériels",
    type:        "national",
    urgency:     "critique",
    description: "Les équipes d'inspection signalent une dégradation critique d'au moins un bâtiment ministériel. Les risques de panne généralisée augmentent. Une intervention immédiate est indispensable.",
    isInteractive: true,
    conditionKey:  "infra_critical_wear",
    minActionsGap: 10,
    choices: [
      {
        id:          "wear_reparation_urgence",
        label:       "Réparation d'urgence tous azimuts",
        consequence: "Les équipes de maintenance sont déployées en urgence. L'état des infrastructures s'améliore sensiblement.",
        effects:          { money: -1500 },
        hiddenPoliticsEffects: { institutionalStability: +5 },
        wearReduction:    40,
      },
      {
        id:          "wear_securisation_minimum",
        label:       "Sécurisation minimale des accès",
        consequence: "Les zones critiques sont isolées. La situation se stabilise partiellement, mais des risques subsistent.",
        effects:          { money: -400 },
        indicatorEffects: { economy: -3 },
        wearReduction:    15,
      },
    ],
  },

  // ── Rapport d'inspection — usure généralisée détectée ────────────────────
  {
    id:          "infra_inspection_rapport",
    title:       "Rapport d'inspection : état préoccupant des infrastructures nationales",
    source:      "Inspection Générale des Services Publics",
    type:        "national",
    urgency:     "forte",
    description: "Un audit interministériel révèle une usure généralisée des bâtiments institutionnels. Sans plan de réhabilitation, la productivité administrative risque de se dégrader durablement.",
    isInteractive: true,
    conditionKey:  "infra_high_wear",
    minActionsGap: 25,
    choices: [
      {
        id:          "wear_plan_rehabilitation",
        label:       "Plan de réhabilitation interministériel",
        consequence: "Un plan pluriannuel est lancé. Les infrastructures retrouvent progressivement leur capacité nominale.",
        effects:          { money: -1000 },
        hiddenPoliticsEffects: { institutionalStability: +4 },
        wearReduction:    25,
      },
      {
        id:          "wear_partenariat_prive",
        label:       "Partenariat public-privé ciblé",
        consequence: "Des entreprises privées prennent en charge les rénovations prioritaires. Efficace, mais coûteux en influence.",
        effects:          { money: -500, influence: -12 },
        wearReduction:    12,
      },
      {
        id:          "wear_reporter",
        label:       "Différer la réhabilitation",
        consequence: "Le rapport est classé. L'état des bâtiments continuera de se dégrader progressivement.",
        effects:          { money: 0 },
        indicatorEffects: { economy: +1 },
      },
    ],
  },

  // ── Fenêtre favorable — maintenance préventive recommandée ────────────────
  {
    id:          "infra_fenetre_maintenance",
    title:       "Fenêtre de maintenance favorable — services techniques en alerte préventive",
    source:      "Direction des Affaires Logistiques",
    type:        "national",
    urgency:     "moyenne",
    description: "Les services techniques signalent une fenêtre propice pour des opérations de maintenance préventive. Agir maintenant éviterait une usure critique à court terme.",
    isInteractive: true,
    conditionKey:  "infra_maintenance_due",
    minActionsGap: 20,
    choices: [
      {
        id:          "wear_maintenance_globale",
        label:       "Maintenance préventive globale",
        consequence: "Toutes les infrastructures font l'objet d'une révision. L'usure recule significativement.",
        effects:          { money: -800 },
        hiddenPoliticsEffects: { institutionalStability: +2 },
        wearReduction:    20,
      },
      {
        id:          "wear_maintenance_partielle",
        label:       "Maintenance ciblée sur les bâtiments prioritaires",
        consequence: "Les bâtiments les plus usés sont traités en priorité. Gain modéré mais ciblé.",
        effects:          { money: -350 },
        wearReduction:    10,
      },
      {
        id:          "wear_ignorer",
        label:       "Reporter à meilleur moment",
        consequence: "La fenêtre de maintenance passe sans intervention. L'usure suit son cours.",
        effects:          { money: 0 },
      },
    ],
  },
];
