import type { CrisisEvent } from "@/data/events";

/**
 * Module 6C — Mini-jeu de guerre conventionnelle.
 *
 * Catalogue d'événements EXCLUSIVEMENT tirés pendant l'état de
 * guerre. L'`ev_ultimatum` est la porte d'entrée : posé par le
 * moteur de guerre hybride dès que l'agressivité de l'acteur
 * dépasse 80 et qu'au moins 2 opérations n'ont pas été désamorcées.
 *
 * Chaque choix peut affecter les jauges visibles (Gauges) ET les
 * trois mini-jauges de guerre (mobilization/allies/supply). Les
 * deltas de mini-jauges sont déclarés séparément dans
 * `WAR_CHOICE_DELTAS` pour éviter de polluer l'interface
 * `EventChoice` qui n'est consommée que par 5 événements.
 *
 * Conformité Apple/Google : tout adversaire et tout allié sont
 * fictionnels. On parle de « la Division Zéro », de « nos alliés »
 * et de « notre coalition » sans nommer aucun pays réel.
 */

export type WarMetricKey = "mobilization" | "allies" | "supply";

export type WarChoiceDeltas = Partial<Record<WarMetricKey, number>>;

/**
 * Patch déterministe à appliquer sur warState quand le joueur
 * confirme le choix correspondant. Clé = `${eventId}#${choiceId}`.
 */
export const WAR_CHOICE_DELTAS: Record<string, WarChoiceDeltas> = {
  // ─── ULTIMATUM ────────────────────────────────────────────────
  "ev_ultimatum#a": {}, // capituler — handled séparément (forfait)
  "ev_ultimatum#b": {}, // négocier — n'entre pas en guerre
  "ev_ultimatum#c": { mobilization: 0 }, // mobiliser — entre en guerre

  // ─── OFFENSIVE ADVERSE ────────────────────────────────────────
  "ev_war_eastern_push#a": { mobilization: -10, supply: -8 }, // contre-offensive
  "ev_war_eastern_push#b": { mobilization: -3, supply: -2 }, // tenir les lignes
  "ev_war_eastern_push#c": { mobilization: -2, allies: +6 }, // appeler la coalition

  // ─── BLACKOUT CYBER MILITAIRE ────────────────────────────────
  "ev_war_cyber_blackout#a": { supply: -6, mobilization: +3 }, // basculer en manuel
  "ev_war_cyber_blackout#b": { supply: -10, mobilization: -4 }, // attendre ANSSI
  "ev_war_cyber_blackout#c": { allies: +4, supply: -3 }, // demander relais alliés

  // ─── APPEL DE LA COALITION ───────────────────────────────────
  "ev_war_allies_call#a": { allies: +12, supply: +6 }, // accepter aide pleine
  "ev_war_allies_call#b": { allies: -2 }, // refuser pour souveraineté
  "ev_war_allies_call#c": { allies: +5 }, // accepter conditionnellement

  // ─── CRISE DE RAVITAILLEMENT ─────────────────────────────────
  "ev_war_supply_crisis#a": { supply: +10, mobilization: -3 }, // réquisitionner industrie
  "ev_war_supply_crisis#b": { supply: -6, mobilization: -5 }, // rationner
  "ev_war_supply_crisis#c": { supply: +6, allies: -3 }, // emprunter aux alliés

  // ─── OFFRE DE TRÊVE ADVERSE ──────────────────────────────────
  "ev_war_truce_offer#a": {}, // accepter trêve — handled (force outcome=truce)
  "ev_war_truce_offer#b": { mobilization: +4, allies: -2 }, // refuser et continuer
  "ev_war_truce_offer#c": { mobilization: -2, allies: +3 }, // négocier conditions
};

// ────────────────────────────────────────────────────────────────
// EVENTS
// ────────────────────────────────────────────────────────────────

export const WAR_EVENTS: CrisisEvent[] = [
  {
    id: "ev_ultimatum",
    category: "hybrid_warfare",
    title: "ULTIMATUM : la Division Zéro pose ses conditions",
    context:
      "Après plusieurs mois d'opérations hybrides non-désamorcées, " +
      "la Division Zéro publie un message diffusé sur tous les réseaux. " +
      "Elle exige des concessions immédiates ou « les hostilités " +
      "passeront à un autre niveau ». L'État-major demande une " +
      "réponse dans les 24 heures.",
    source: "Bureau de crise du Quai d'Orsay",
    choices: [
      {
        id: "a",
        label: "Capituler aux exigences",
        description:
          "Accepter les conditions humiliantes pour éviter le pire. " +
          "Démission probable du gouvernement.",
        effects: {
          popularity: -25,
          authority: -30,
          diplomacy: -10,
          cohesion: -10,
        },
        consequence:
          "La République plie. La Division Zéro savoure publiquement " +
          "votre humiliation. Votre légitimité s'effondre.",
      },
      {
        id: "b",
        label: "Négocier sans concession majeure",
        description:
          "Tenter de gagner du temps par la diplomatie sans céder " +
          "le fond. Risqué : peut être perçu comme de la faiblesse.",
        effects: {
          authority: -8,
          diplomacy: +6,
          popularity: -3,
        },
        consequence:
          "Vous gagnez quelques semaines de répit. La Division Zéro " +
          "reste menaçante mais n'a pas franchi le pas militaire.",
      },
      {
        id: "c",
        label: "Mobilisation générale",
        description:
          "Décréter l'état de guerre. Convoquer les réservistes, " +
          "alerter la coalition. Sans retour en arrière possible.",
        effects: {
          authority: +10,
          security: +5,
          economy: -8,
          budget: -10,
          debt: +6,
        },
        consequence:
          "L'état de guerre est décrété. La Nation entre dans un " +
          "régime exceptionnel. Le sort du conflit dépend désormais " +
          "de votre conduite militaire.",
      },
    ],
  },
  {
    id: "ev_war_eastern_push",
    category: "hybrid_warfare",
    title: "Front Est : poussée adverse au-delà des lignes",
    context:
      "Les forces de la Division Zéro et de ses supplétifs progressent " +
      "rapidement sur un saillant inattendu. L'État-major demande " +
      "des ordres immédiats.",
    source: "État-major des Armées",
    choices: [
      {
        id: "a",
        label: "Lancer une contre-offensive",
        description:
          "Engager une opération de reconquête. Coûteuse en hommes " +
          "et en logistique mais peut briser l'élan adverse.",
        effects: { authority: +6, popularity: -3 },
        consequence:
          "L'opération est lancée. Les pertes sont lourdes mais " +
          "l'avancée adverse est ralentie.",
      },
      {
        id: "b",
        label: "Tenir les lignes défensives",
        description:
          "Sécuriser le terrain acquis et économiser les forces.",
        effects: { authority: -2 },
        consequence:
          "Les lignes tiennent, mais l'opinion accuse l'exécutif de " +
          "passivité.",
      },
      {
        id: "c",
        label: "Appeler la coalition en renfort",
        description:
          "Activer les protocoles d'assistance avec nos alliés. " +
          "Solidifie l'alliance mais aliène une partie de l'opinion.",
        effects: { diplomacy: +6, popularity: -2, authority: -2 },
        consequence:
          "La coalition mobilise des moyens. L'opinion débat de " +
          "votre dépendance.",
      },
    ],
  },
  {
    id: "ev_war_cyber_blackout",
    category: "hybrid_warfare",
    title: "Blackout des systèmes de commandement",
    context:
      "Une attaque cyber d'une sophistication inédite paralyse les " +
      "systèmes de commandement et de logistique de plusieurs régions " +
      "militaires.",
    source: "ANSSI / Cyber-commandement",
    choices: [
      {
        id: "a",
        label: "Basculer en commandement manuel",
        description:
          "Reprendre les opérations sans appui numérique. Lent mais " +
          "résilient.",
        effects: { authority: +4 },
        consequence: "Les unités opèrent à l'ancienne. Lent, mais en marche.",
      },
      {
        id: "b",
        label: "Attendre la restauration ANSSI",
        description:
          "Suspendre les opérations le temps de récupérer les systèmes.",
        effects: { authority: -5, security: -4 },
        consequence:
          "Le commandement attend. La fenêtre tactique se referme.",
      },
      {
        id: "c",
        label: "Demander un relais aux alliés",
        description:
          "Faire transiter le commandement par nos alliés le temps de " +
          "la remise en route.",
        effects: { diplomacy: +4, authority: -3 },
        consequence: "Solution de survie. Notre dépendance fait jaser.",
      },
    ],
  },
  {
    id: "ev_war_allies_call",
    category: "hybrid_warfare",
    title: "Offre de soutien plein de la coalition",
    context:
      "Nos principaux alliés proposent un soutien complet : matériel, " +
      "renseignement, troupes. Mais ils demandent une coordination " +
      "intégrée — autrement dit, une partie du commandement.",
    source: "Quai d'Orsay",
    choices: [
      {
        id: "a",
        label: "Accepter pleinement",
        description:
          "Intégrer la coalition. Maximum de soutien, perte d'autonomie.",
        effects: { diplomacy: +8, authority: -8, popularity: -3 },
        consequence: "La coalition prend ses quartiers. La nation soulagée mais inquiète.",
      },
      {
        id: "b",
        label: "Refuser pour souveraineté",
        description:
          "Sauvegarder l'indépendance opérationnelle. On se débrouille seuls.",
        effects: { authority: +6, diplomacy: -5 },
        consequence:
          "Choix patriote, conséquences lourdes : la coalition prend ses distances.",
      },
      {
        id: "c",
        label: "Accepter conditionnellement",
        description:
          "Accepter le soutien matériel, refuser le commandement intégré.",
        effects: { diplomacy: +3, authority: -2 },
        consequence: "Compromis. Les alliés acceptent à contre-cœur.",
      },
    ],
  },
  {
    id: "ev_war_supply_crisis",
    category: "hybrid_warfare",
    title: "Crise de ravitaillement aux fronts",
    context:
      "Les stocks de munitions, carburant et pièces critiques sont " +
      "au plus bas. Sans décision rapide, plusieurs unités seront " +
      "inopérantes en quelques jours.",
    source: "Direction générale de l'armement",
    choices: [
      {
        id: "a",
        label: "Réquisitionner l'industrie civile",
        description:
          "Décret de réquisition immédiate. Brutal mais efficace.",
        effects: { economy: -8, authority: +5, popularity: -5 },
        consequence:
          "Les usines tournent jour et nuit pour l'effort de guerre. " +
          "Mécontentement chez les patrons.",
      },
      {
        id: "b",
        label: "Rationner et patienter",
        description:
          "Tenir avec les stocks existants en rationnant l'usage.",
        effects: { authority: -4, security: -3 },
        consequence:
          "Les unités économisent. L'efficacité opérationnelle baisse.",
      },
      {
        id: "c",
        label: "Emprunter aux alliés",
        description:
          "Demander un transfert d'urgence à la coalition. Coûteux " +
          "diplomatiquement.",
        effects: { diplomacy: -2, debt: +5 },
        consequence:
          "Les alliés livrent. Vous serez attendu·e au tournant.",
      },
    ],
  },
  {
    id: "ev_war_truce_offer",
    category: "hybrid_warfare",
    title: "La Division Zéro propose une trêve",
    context:
      "Par canaux discrets, la Division Zéro fait passer une offre " +
      "de trêve. Conditions : gel des positions, levée mutuelle des " +
      "sanctions, reconnaissance partielle.",
    source: "Renseignement extérieur",
    choices: [
      {
        id: "a",
        label: "Accepter la trêve",
        description:
          "Mettre fin aux hostilités. Pas une victoire, pas une défaite.",
        effects: { popularity: +4, authority: -4, diplomacy: +3 },
        consequence:
          "Les armes se taisent. Le pays souffle, l'Histoire jugera.",
      },
      {
        id: "b",
        label: "Refuser et continuer",
        description:
          "Pousser jusqu'à la victoire. Tout ou rien.",
        effects: { authority: +5, popularity: -3, economy: -4 },
        consequence:
          "Le combat continue. La Nation espère une issue éclatante.",
      },
      {
        id: "c",
        label: "Négocier des conditions plus dures",
        description:
          "Accepter la trêve mais sur nos conditions : retrait, " +
          "réparations.",
        effects: { authority: +3, diplomacy: -2 },
        consequence:
          "La Division Zéro temporise. Les négociations se poursuivent.",
      },
    ],
  },
];

/**
 * IDs des events de guerre tirables PENDANT la guerre (hors ultimatum).
 */
export const WAR_LOOP_EVENT_IDS: string[] = [
  "ev_war_eastern_push",
  "ev_war_cyber_blackout",
  "ev_war_allies_call",
  "ev_war_supply_crisis",
  "ev_war_truce_offer",
];

/** Map id → event pour résolution rapide. */
export const WAR_EVENTS_BY_ID: Record<string, CrisisEvent> = WAR_EVENTS.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<string, CrisisEvent>,
);
