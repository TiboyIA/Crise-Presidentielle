import type { HybridOpVector } from "@/types/game";

/**
 * Module 6 — Définition des 9 vecteurs de guerre hybride.
 *
 * Chaque vecteur a :
 *  - un libellé FR pour l'UI (ALL CAPS pour les badges)
 *  - une description courte (1 phrase) pour la page Front diplomatique
 *  - un emoji pour les listes / badges
 *  - une couleur d'accent
 *  - un pool d'IDs d'événements EXISTANTS du catalogue qui peuvent
 *    matérialiser le vecteur. Le moteur (`tickHostilePower`) tire
 *    déterministiquement un eventId du pool, en filtrant les events
 *    déjà vus dans la partie en cours pour favoriser la diversité.
 *
 * IMPORTANT : on N'AJOUTE PAS de nouveaux events ici — on RÉUTILISE
 * ceux qui existent déjà dans `data/events.ts` (catégories `cyber`,
 * `hybrid_warfare`, `diplomacy`). Cela garantit qu'on ne duplique
 * pas le contenu et que tout passe par le pipeline standard
 * (effets / cascades / scandales / médias).
 *
 * Si un vecteur n'a aucun event candidat dans le catalogue à un
 * tour donné (tous déjà vus), le moteur saute simplement le tirage
 * de ce tour — c'est intentionnel.
 */

export interface HybridVectorDef {
  vector: HybridOpVector;
  label: string;
  description: string;
  emoji: string;
  color: string;
  /** IDs d'événements existants pouvant matérialiser ce vecteur. */
  eventPool: string[];
}

export const HYBRID_VECTORS: Record<HybridOpVector, HybridVectorDef> = {
  cyber: {
    vector: "cyber",
    label: "CYBERATTAQUE",
    description:
      "Attaque informatique sur des systèmes critiques (hôpitaux, " +
      "réseaux, télécoms).",
    emoji: "💻",
    color: "#6366f1",
    // Compliance Apple/Google : on retire `ev_quantum_break` et
    // `ev_nuclear_intrusion` qui désignent explicitement la Chine
    // dans leur narratif (incohérent avec un acteur fictif).
    eventPool: [
      "ev_cyberattack",
      "ev_ransomware_cities",
      "ev_telecom_outage",
      "ev_gps_jamming",
    ],
  },
  disinformation: {
    vector: "disinformation",
    label: "DÉSINFORMATION",
    description:
      "Campagne d'intoxication massive : deepfakes, faux comptes, " +
      "manipulation de l'information.",
    emoji: "📡",
    color: "#a855f7",
    // Compliance : retiré `ev_deepfake_president` (cite la Russie).
    eventPool: ["ev_election_meddling"],
  },
  espionage: {
    vector: "espionage",
    label: "ESPIONNAGE",
    description:
      "Réseau d'agents infiltrés visant l'État, les industries " +
      "stratégiques ou les centres de recherche.",
    emoji: "🕵",
    color: "#0ea5e9",
    // Compliance : `ev_spy_network` et `ev_elysee_breach` désignent
    // explicitement la Chine — pool laissé vide, le moteur skip.
    eventPool: [],
  },
  energy_blackmail: {
    vector: "energy_blackmail",
    label: "CHANTAGE ÉNERGÉTIQUE",
    description:
      "Pression sur les approvisionnements énergétiques pour " +
      "obtenir des concessions politiques.",
    emoji: "⚡",
    color: "#f59e0b",
    // Compliance : `ev_diplomatic_incident` mentionne Chine/Pékin/
    // Taïwan — pool vide.
    eventPool: [],
  },
  industrial_sabotage: {
    vector: "industrial_sabotage",
    label: "SABOTAGE INDUSTRIEL",
    description:
      "Destruction physique d'infrastructures industrielles ou " +
      "logistiques (câbles, usines, oléoducs).",
    emoji: "🏭",
    color: "#dc2626",
    // Compliance : `ev_atlantic_cables` mentionne Russie/Chine —
    // pool vide.
    eventPool: [],
  },
  diplomatic_pressure: {
    vector: "diplomatic_pressure",
    label: "PRESSION DIPLOMATIQUE",
    description:
      "Manœuvres pour isoler la nation sur la scène internationale " +
      "et fragiliser ses alliances.",
    emoji: "🌐",
    color: "#0891b2",
    // Compliance : `ev_diplomatic_incident` mentionne Chine/Taïwan
    // — retiré. `ev_war_threat` reste : décrit "deux États riverains"
    // sans nom propre.
    eventPool: ["ev_war_threat"],
  },
  social_manipulation: {
    vector: "social_manipulation",
    label: "MANIPULATION SOCIALE",
    description:
      "Mouvements sociaux artificiellement amplifiés ou " +
      "instrumentalisés depuis l'étranger.",
    emoji: "🧨",
    color: "#ef4444",
    // Compliance : `ev_belarus_migrants` cite la Biélorussie.
    // Pool vide — `tickHostilePower` saute le tour.
    eventPool: [],
  },
  document_leak: {
    vector: "document_leak",
    label: "FUITE DE DOCUMENTS",
    description:
      "Publication massive de documents confidentiels visant " +
      "à humilier l'État et à révéler ses secrets.",
    emoji: "📂",
    color: "#a16207",
    eventPool: ["ev_secu_data_leak"],
  },
  infrastructure_attack: {
    vector: "infrastructure_attack",
    label: "ATTAQUE INFRASTRUCTURE",
    description:
      "Frappe directe ou suspicion d'attaque sur des " +
      "infrastructures vitales (énergie, transport, défense).",
    emoji: "🛢",
    color: "#b91c1c",
    // Compliance : `ev_chemical_alert` cite "novitchok" (signature
    // d'un État réel), `ev_atlantic_cables` cite Russie/Chine, et
    // `ev_russian_drones` cite la Russie. Pool vide.
    eventPool: [],
  },
};

export const HYBRID_VECTOR_KEYS: HybridOpVector[] = Object.keys(
  HYBRID_VECTORS,
) as HybridOpVector[];

/**
 * Liste plate de tous les eventIds gérés par le module 6, utile pour
 * détecter au resolveChoice si un choix vient de désamorcer une
 * opération en cours.
 */
export const ALL_HYBRID_EVENT_IDS: string[] = Array.from(
  new Set(
    HYBRID_VECTOR_KEYS.flatMap((k) => HYBRID_VECTORS[k].eventPool),
  ),
);

/** Mapping inverse eventId → vecteur (premier vecteur trouvé). */
export const EVENT_ID_TO_VECTOR: Record<string, HybridOpVector> = (() => {
  const m: Record<string, HybridOpVector> = {};
  for (const k of HYBRID_VECTOR_KEYS) {
    for (const id of HYBRID_VECTORS[k].eventPool) {
      if (!(id in m)) m[id] = k;
    }
  }
  return m;
})();
