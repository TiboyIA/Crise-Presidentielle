import type { NewsEvent } from "@/types/strategy";

export const ABUSE_EVENTS: NewsEvent[] = [
  // ── Niveau "concern" ──────────────────────────────────────────────────────

  {
    id:            "abuse_concern_oversight",
    title:         "Inquiétude des contre-pouvoirs",
    source:        "Observatoire des Libertés Institutionnelles",
    type:          "national",
    urgency:       "forte",
    description:   "Plusieurs organismes de contrôle signalent une accumulation de décisions prises sans consultation préalable. La concentration des pouvoirs dans l'exécutif inquiète les contre-pouvoirs.",
    isInteractive: true,
    conditionKey:  "abuse_concern",
    choices: [
      {
        id:          "reassure",
        label:       "Rassurer publiquement",
        consequence: "Le gouvernement déclare publiquement son attachement à l'équilibre des pouvoirs. Les contre-pouvoirs accueillent favorablement le signal.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 5, eliteTrust: 4 },
        abuseOfPowerIndexDelta: -6,
      },
      {
        id:          "open_parliamentary",
        label:       "Ouvrir un débat parlementaire",
        consequence: "Une session spéciale clarifie les attributions de l'exécutif. La transparence du processus rassure les institutions.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: 8, eliteTrust: 5 },
        indicatorEffects: { popularity: 3 },
        abuseOfPowerIndexDelta: -10,
      },
      {
        id:          "minimize",
        label:       "Minimiser les critiques",
        consequence: "Le gouvernement qualifie les inquiétudes de manœuvres politiques sans fondement. Les médias s'emballent.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: -6, eliteTrust: -4 },
        abuseOfPowerIndexDelta: 5,
      },
    ],
  },

  // ── Niveau "crisis" ───────────────────────────────────────────────────────

  {
    id:            "abuse_crisis_institutions",
    title:         "Crise institutionnelle — surconcentration du pouvoir",
    source:        "Rapport conjoint des autorités indépendantes",
    type:          "national",
    urgency:       "critique",
    description:   "Un rapport conjoint de trois autorités indépendantes pointe une surconcentration des décisions dans un cercle restreint. L'opposition exige une réforme constitutionnelle d'urgence.",
    isInteractive: true,
    conditionKey:  "abuse_crisis",
    choices: [
      {
        id:          "accept_audit",
        label:       "Accepter un audit indépendant",
        consequence: "Une commission parlementaire audite le processus décisionnel. La démarche est saluée comme un acte fort de respect des institutions.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: 10, eliteTrust: 8, scandalRisk: -8 },
        indicatorEffects: { popularity: -4 },
        abuseOfPowerIndexDelta: -15,
      },
      {
        id:          "partial_reform",
        label:       "Proposer une réforme partielle",
        consequence: "Des ajustements de procédure sont annoncés. Les oppositions jugent la réponse insuffisante, mais la pression diminue.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 4, institutionalStability: 4 },
        abuseOfPowerIndexDelta: -7,
      },
      {
        id:          "dismiss_report",
        label:       "Contester la légitimité du rapport",
        consequence: "Le gouvernement met en cause la neutralité des autorités signataires. La controverse décuple la couverture médiatique.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: -10, eliteTrust: -8, institutionalStability: -6, scandalRisk: 10 },
        indicatorEffects: { popularity: -6, cohesion: -4 },
        abuseOfPowerIndexDelta: 12,
      },
      {
        id:          "limit_powers_voluntarily",
        label:       "Limitation volontaire des pouvoirs",
        consequence: "L'exécutif renonce publiquement à certaines prérogatives d'urgence. Le geste est unanimement salué comme un acte démocratique exemplaire.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: 15, eliteTrust: 10, mediaMood: 8, scandalRisk: -10 },
        indicatorEffects: { popularity: 6, cohesion: 5 },
        abuseOfPowerIndexDelta: -20,
      },
    ],
  },

  // ── Niveau "critical" — dérive du pouvoir ─────────────────────────────────

  {
    id:            "abuse_derive_du_pouvoir",
    title:         "Dérive du pouvoir — alerte constitutionnelle",
    source:        "Conseil d'État fictif — Chambre Constitutionnelle",
    type:          "national",
    urgency:       "critique",
    description:   "Le Conseil d'État fictif saisit d'urgence la Chambre Constitutionnelle. Un rapport indépendant qualifie la gouvernance actuelle de « dérive autoritaire systémique ». Des manifestations spontanées éclatent dans plusieurs capitales régionales.",
    isInteractive: true,
    conditionKey:  "abuse_critical",
    choices: [
      {
        id:          "full_submission",
        label:       "Soumettre au contrôle constitutionnel",
        consequence: "L'exécutif accepte intégralement la supervision de la Chambre Constitutionnelle. La crise se résorbe dans l'ordre institutionnel.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: 12, eliteTrust: 10, scandalRisk: -15 },
        indicatorEffects: { popularity: 5 },
        abuseOfPowerIndexDelta: -25,
      },
      {
        id:          "negotiate_terms",
        label:       "Négocier les modalités de contrôle",
        consequence: "Un encadrement partiel est accepté. Les institutions conservent une vigilance accrue mais la confrontation directe est évitée.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: 5, eliteTrust: 3, scandalRisk: -5 },
        abuseOfPowerIndexDelta: -10,
      },
      {
        id:          "attack_source",
        label:       "Attaquer la source",
        consequence: "Le gouvernement discrédite les auteurs du rapport. La réponse aggrave la crise et provoque une onde de choc internationale.",
        effects:     {},
        hiddenPoliticsEffects: { institutionalStability: -20, eliteTrust: -15, scandalRisk: 25, mediaMood: -15 },
        indicatorEffects: { popularity: -10, cohesion: -10, security: -5 },
        abuseOfPowerIndexDelta: 15,
      },
    ],
  },

  // ── Retour à la normale ────────────────────────────────────────────────────

  {
    id:            "abuse_restored",
    title:         "Rétablissement de l'équilibre institutionnel",
    source:        "Observatoire des Libertés Institutionnelles",
    type:          "national",
    urgency:       "faible",
    description:   "Les autorités indépendantes saluent les efforts du gouvernement pour restaurer les contre-pouvoirs. L'indice d'abus de pouvoir est revenu à un niveau acceptable.",
    isInteractive: false,
    conditionKey:  "abuse_stable",
    autoEffects:   {},
  },
];
