import type { NewsEvent } from "@/types/strategy";

export const ORBITAL_EVENTS: NewsEvent[] = [

  // ── Tempête solaire — alerte critique ────────────────────────────────────
  {
    id:          "orbital_tempete_solaire_alerte",
    title:       "Alerte : tempête solaire — satellites et communications dégradés",
    source:      "Agence Spatiale Nationale",
    type:        "national",
    urgency:     "critique",
    description: "Une éruption solaire majeure perturbe les satellites et les réseaux de communication sécurisés. La cyberdéfense est vulnérable. Une mise en protection immédiate peut limiter les dommages.",
    isInteractive: true,
    conditionKey:  "orbital_tempete_solaire",
    minActionsGap: 10,
    choices: [
      {
        id:          "orbital_protection_urgence",
        label:       "Mise en protection des systèmes critiques",
        consequence: "Les équipes techniques sécurisent les canaux prioritaires. La tempête cause moins de dégâts sur les réseaux.",
        effects:          { money: -400 },
        hiddenPoliticsEffects: { institutionalStability: +3 },
      },
      {
        id:          "orbital_reroutage_sol",
        label:       "Réacheminement par relais terrestres",
        consequence: "Les communications sont reroutées vers des relais au sol. Moins efficace, mais fonctionnel.",
        effects:          { money: -150 },
        indicatorEffects: { economy: -1 },
      },
      {
        id:          "orbital_subir_tempete",
        label:       "Attendre la fin de la tempête",
        consequence: "Aucune action. La tempête suit son cours et les pertes sont absorbées passivement.",
        effects:          { money: 0 },
      },
    ],
  },

  // ── Fenêtre favorable — opportunité renseignement ────────────────────────
  {
    id:          "orbital_fenetre_favorable",
    title:       "Fenêtre orbitale favorable — opportunité de surveillance stratégique",
    source:      "Direction du Renseignement Satellitaire",
    type:        "national",
    urgency:     "moyenne",
    description: "Les satellites sont en position optimale. Une fenêtre rare s'ouvre pour intensifier la collecte de renseignements ou établir un contact sur des fréquences peu ordinaires.",
    isInteractive: true,
    conditionKey:  "orbital_window_favorable",
    minActionsGap: 25,
    choices: [
      {
        id:          "orbital_surge_renseignement",
        label:       "Intensification de la collecte de renseignements",
        consequence: "Les équipes exploitent la fenêtre au maximum. Les capacités de surveillance sont temporairement décuplées.",
        effects:          { money: -300, intelligence: +25 },
      },
      {
        id:          "orbital_contact_cosmique",
        label:       "Écoute sur fréquences non conventionnelles",
        consequence: "Quelque chose dans le signal… Un contact inhabituel laisse entrevoir une présence attentive.",
        effects:          { money: -100 },
        cosmicEffects:    { auroraSupportDelta: +5, councilAttentionDelta: +3 },
      },
      {
        id:          "orbital_surveillance_routine",
        label:       "Maintenir la surveillance standard",
        consequence: "La fenêtre est utilisée pour les opérations habituelles. Aucun effort supplémentaire.",
        effects:          { money: 0 },
      },
    ],
  },

  // ── Perturbation — communications dégradées ───────────────────────────────
  {
    id:          "orbital_perturbation_comm",
    title:       "Signal dégradé — communications satellites interrompues",
    source:      "Centre National de Surveillance Orbitale",
    type:        "national",
    urgency:     "forte",
    description: "Une zone d'interférence perturbe les transmissions satellitaires. Les opérations de renseignement et de surveillance militaire sont temporairement compromises.",
    isInteractive: true,
    conditionKey:  "orbital_window_perturbee",
    minActionsGap: 20,
    choices: [
      {
        id:          "orbital_protocole_secours",
        label:       "Déploiement du protocole de secours",
        consequence: "Les canaux de secours prennent le relai. Les communications sont rétablies à capacité réduite.",
        effects:          { money: -250 },
        hiddenPoliticsEffects: { institutionalStability: +2 },
      },
      {
        id:          "orbital_pause_diplomatique",
        label:       "Pause des opérations sensibles",
        consequence: "Les opérations critiques sont suspendues le temps de la perturbation. Perte d'influence, mais sécurité maintenue.",
        effects:          { influence: -15 },
        indicatorEffects: { security: +2 },
      },
      {
        id:          "orbital_continuer_malgre",
        label:       "Poursuivre les opérations malgré le signal dégradé",
        consequence: "Les opérations continuent dans des conditions dégradées. Risques accrus de fuite ou d'erreur.",
        effects:          { intelligence: -8, military: -5 },
      },
    ],
  },

];
