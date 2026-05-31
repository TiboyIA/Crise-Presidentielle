import type { NewsEvent } from "@/types/strategy";

export const ANTI_CORRUPTION_EVENTS: NewsEvent[] = [
  // ── Lancement du programme (niveau actif ou +) ────────────────────────────

  {
    id:            "acep_launch_actif",
    title:         "Lancement du programme anti-corruption",
    source:        "Direction des Affaires Intérieures",
    type:          "national",
    urgency:       "moyenne",
    description:
      "Le gouvernement annonce le lancement d'un programme anti-corruption structuré. Des contrôles internes réguliers seront mis en place dans l'ensemble des administrations.",
    isInteractive: true,
    conditionKey:  "acep_level_actif",
    choices: [
      {
        id:          "full_comms",
        label:       "Communication publique complète",
        consequence:
          "Une conférence de presse détaille les mécanismes. La presse salue l'initiative, les élites restent prudentes.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 8, eliteTrust: 3 },
        indicatorEffects: { popularity: 4 },
      },
      {
        id:          "discreet_launch",
        label:       "Mise en place discrète",
        consequence:
          "Le programme est lancé sans fanfare. Moins d'attentes à gérer, mais peu de bénéfices de communication.",
        effects:     {},
        hiddenPoliticsEffects: { eliteTrust: 5, scandalRisk: -3 },
      },
      {
        id:          "target_opponents",
        label:       "Cibler les secteurs problématiques",
        consequence:
          "Les contrôles sont concentrés sur des secteurs connus pour leurs irrégularités. Efficace, mais perçu comme sélectif.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: -4, eliteTrust: -5, scandalRisk: 6 },
        indicatorEffects: { popularity: -3 },
        abuseOfPowerIndexDelta: 5,
      },
    ],
  },

  // ── Phase initiale du programme renforcé ─────────────────────────────────

  {
    id:            "acep_audit_revelation",
    title:         "Audit interne : irrégularités détectées",
    source:        "Commission d'Audit Interne de l'État",
    type:          "national",
    urgency:       "forte",
    description:
      "La Commission d'Audit révèle des irrégularités dans plusieurs procédures administratives. Ces découvertes, directement liées au renforcement du programme, créent une tension politique immédiate.",
    isInteractive: true,
    conditionKey:  "acep_renforcé_initial",
    choices: [
      {
        id:          "publish_transparently",
        label:       "Publier les conclusions",
        consequence:
          "Le rapport est rendu public. La transparence est saluée, mais les adversaires politiques exploitent les révélations.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 6, eliteTrust: -5, institutionalStability: 4, scandalRisk: 8 },
        indicatorEffects: { popularity: -5 },
      },
      {
        id:          "internal_handling",
        label:       "Traiter en interne",
        consequence:
          "Les irrégularités sont corrigées discrètement. Le risque de fuite demeure, mais la tempête immédiate est évitée.",
        effects:     {},
        hiddenPoliticsEffects: { eliteTrust: 3, scandalRisk: 5 },
      },
      {
        id:          "prosecute_responsible",
        label:       "Engager des procédures disciplinaires",
        consequence:
          "Des agents sont sanctionnés. Le signal est fort mais crée des remous dans l'administration.",
        effects:     {},
        hiddenPoliticsEffects: {
          institutionalStability: -6, eliteTrust: -6, mediaMood: 5, scandalRisk: -5,
        },
        indicatorEffects: { popularity: 5 },
        abuseOfPowerIndexDelta: -5,
      },
    ],
  },

  // ── Programme indépendant : exposition d'un allié ─────────────────────────

  {
    id:            "acep_ally_exposure",
    title:         "Programme indépendant : un allié politique dans le viseur",
    source:        "Autorité Anti-Corruption Indépendante",
    type:          "national",
    urgency:       "critique",
    description:
      "L'Autorité Anti-Corruption Indépendante a ouvert une enquête sur un proche allié politique. L'indépendance du programme rend toute intervention directe impossible sans déclencher une crise constitutionnelle.",
    isInteractive: true,
    conditionKey:  "acep_ally_risk",
    choices: [
      {
        id:          "let_proceed",
        label:       "Laisser la procédure suivre son cours",
        consequence:
          "L'enquête se poursuit sans interférence. La crédibilité du programme est renforcée, mais un allié est fragilisé.",
        effects:     {},
        hiddenPoliticsEffects: {
          institutionalStability: 8, mediaMood: 6, eliteTrust: -10, scandalRisk: -5,
        },
        indicatorEffects: { popularity: 6 },
        abuseOfPowerIndexDelta: -8,
      },
      {
        id:          "pressure_discreetly",
        label:       "Exercer une pression discrète",
        consequence:
          "Des contacts informels sont établis pour ralentir la procédure. Cela compromet l'indépendance réelle du programme.",
        effects:     { influence: -15 },
        hiddenPoliticsEffects: { eliteTrust: 5, scandalRisk: 12, institutionalStability: -5 },
        abuseOfPowerIndexDelta: 12,
      },
      {
        id:          "suspend_program",
        label:       "Suspendre temporairement le programme",
        consequence:
          "Le programme est mis en pause. La presse dénonce un recul. L'allié est protégé mais la crédibilité s'effondre.",
        effects:     {},
        hiddenPoliticsEffects: {
          mediaMood: -12, eliteTrust: -8, institutionalStability: -8, scandalRisk: 15,
        },
        indicatorEffects: { popularity: -8, cohesion: -5 },
        abuseOfPowerIndexDelta: 18,
      },
      {
        id:          "public_support",
        label:       "Soutenir publiquement l'enquête",
        consequence:
          "Le gouvernement affirme son soutien à l'Autorité Indépendante. Coût politique immédiat, gain de crédibilité à long terme.",
        effects:     {},
        hiddenPoliticsEffects: {
          mediaMood: 10, institutionalStability: 10, eliteTrust: -12, scandalRisk: -8,
        },
        indicatorEffects: { popularity: 8, cohesion: 4 },
        abuseOfPowerIndexDelta: -12,
      },
    ],
  },

  // ── Résultats positifs (programme mature) ────────────────────────────────

  {
    id:            "acep_results_positive",
    title:         "Programme anti-corruption : premiers résultats probants",
    source:        "Rapport annuel de conformité institutionnelle",
    type:          "national",
    urgency:       "faible",
    description:
      "Le rapport annuel de conformité institutionnelle constate une amélioration significative de l'intégrité des procédures administratives. Le programme porte ses fruits.",
    isInteractive: false,
    conditionKey:  "acep_mature_results",
    autoEffects:   { influence: 10 },
  },

  // ── Absence de programme : risque croissant ───────────────────────────────

  {
    id:            "acep_absent_risk",
    title:         "Absence de dispositif anti-corruption : signal d'alarme",
    source:        "Observatoire de la Transparence Institutionnelle",
    type:          "national",
    urgency:       "forte",
    description:
      "L'Observatoire publie une note critique : l'absence de tout programme structuré crée un terreau favorable aux dérives. Des partenaires internationaux s'inquiètent publiquement.",
    isInteractive: true,
    conditionKey:  "acep_absent_risk",
    choices: [
      {
        id:          "announce_program",
        label:       "Annoncer un programme symbolique",
        consequence:
          "Une déclaration d'intention est publiée. L'Observatoire reste sceptique mais la pression médiatique retombe.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: 5, scandalRisk: -4 },
      },
      {
        id:          "dismiss_report",
        label:       "Contester les conclusions",
        consequence:
          "Le gouvernement rejette la note. La polémique amplifie le signal négatif à l'international.",
        effects:     {},
        hiddenPoliticsEffects: { mediaMood: -8, eliteTrust: -4, scandalRisk: 8 },
        indicatorEffects: { popularity: -4 },
        abuseOfPowerIndexDelta: 5,
      },
    ],
  },
];
