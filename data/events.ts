import type {
  CascadeStep,
  Gauges,
  HiddenGauges,
  HiddenGaugeKey,
} from "@/types/game";
import { MinisterPosition } from "@/data/ministers";
import { RegionId } from "@/data/regions";
import { PromiseTag } from "@/data/promises";
import type { ReformKind } from "@/logic/regionDynamics";

// Re-export for downstream code that already imports `ReformKind`
// from `@/data/events` for symmetry with the other choice fields.
export type { ReformKind };

/**
 * v1.1 — DLC packs. Events with `pack` set are only served to players
 * who own the matching entitlement (RevenueCat). Events with no `pack`
 * are part of the free core game.
 */
export type EventPack = "climate" | "guerre_hybride" | "cyber";

export type EventCategory =
  | "social"
  | "economy"
  | "security"
  | "diplomacy"
  | "ecology"
  | "scandal"
  | "media"
  | "opposition"
  | "regional"
  | "delayed"
  | "cyber"
  | "health"
  | "energy"
  | "agriculture"
  | "hybrid_warfare";

export interface MinisterEffect {
  position: MinisterPosition;
  loyalty?: number;
  competence?: number;
  scandals?: number;
  fire?: boolean;
}

export interface RegionEffect {
  region: RegionId;
  tension?: number;
  /**
   * Per-region gauge deltas (v0.3). All optional. Each delta is added
   * to the corresponding gauge of the named region and clamped to 0-100.
   * Note: if `tension` is also provided, it is automatically mirrored
   * inversely onto `socialStability` (high tension = lower stability).
   */
  economy?: number;
  security?: number;
  popularity?: number;
  ecology?: number;
  publicHealth?: number;
  socialStability?: number;
}

export interface DelayedSchedule {
  eventId: string;
  delay: number;
}

export interface HiddenScandalSpec {
  title: string;
  popularityDamage: number;
  authorityDamage?: number;
  mediaDamage?: number;
  revealIn: number;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  effects: Partial<Gauges>;
  /**
   * Effects on hidden meta-gauges (scandalRisk, peopleFatigue, etc.).
   * Applied silently unless the corresponding gauge has been revealed
   * to the player.
   */
  hiddenEffects?: Partial<HiddenGauges>;
  /**
   * If set, this choice immediately reveals the named hidden gauge to
   * the player (e.g. "Une fuite révèle l'ampleur de la corruption").
   */
  revealsHiddenGauge?: HiddenGaugeKey;
  consequence: string;
  ministerEffects?: MinisterEffect[];
  regionEffects?: RegionEffect[];
  mediaEffect?: number;
  oppositionEffect?: number;
  fulfillsPromise?: PromiseTag[];
  breaksPromise?: PromiseTag[];
  schedulesEvent?: DelayedSchedule;
  hidesScandal?: HiddenScandalSpec;
  /**
   * Crises en cascade — chain of staggered consequences this choice
   * triggers. Each step carries its own delay (in turns) from this
   * decision, narrative label, and effect payload. See `CascadeStep`
   * in `types/game.ts` for the variants.
   *
   * The UI surfaces this on the choice card ("⚠️ X conséquences à
   * venir") so the player knows they're setting a trap for
   * themselves before they tap.
   */
  cascade?: CascadeStep[];
  /**
   * Module 2 — Tagger un choix comme "réforme" d'un certain type
   * permet aux régions politiquement opposées (et déjà tendues) de
   * s'y opposer : la résistance régionale réduit popularité/autorité
   * et tend les régions résistantes. Voir `applyReformResistance`
   * dans `logic/regionDynamics.ts`.
   */
  reform?: ReformKind;
  /**
   * Module 7 — Si défini, ce choix n'est affiché au joueur QUE si
   * la techno correspondante a été acquise (état `tech.researched`).
   * Sert à matérialiser les options stratégiques débloquées par la
   * R&D nationale (cybersécurité, hôpitaux numériques, etc.). Le
   * filtre se fait au rendu dans `EventModal`.
   */
  requiresTech?: import("@/types/game").TechId;
}

export interface CrisisEvent {
  id: string;
  category: EventCategory;
  title: string;
  context: string;
  source: string;
  choices: EventChoice[];
  isDelayedConsequence?: boolean;
  /**
   * If set, this event belongs to a paid DLC pack. Only served to
   * players who own the matching entitlement (`unlockedPacks`).
   */
  pack?: EventPack;
  /**
   * LOT 15 — Niveau de présence narrative imposé. Si absent, le moteur
   * infère la sévérité via `logic/eventSeverity.ts:inferEventSeverity`
   * à partir de l'amplitude des effets, des cascades et de la catégorie.
   *
   *   - "major"        : décision plein écran avec pause auto (cooldown
   *                      2-4 mois imposé entre deux majeurs).
   *   - "minor"        : carte rapide sur le dashboard, pas de pause.
   *   - "notification" : ligne d'AlertTicker, info pure, pas de pause.
   */
  severity?: import("@/logic/eventSeverity").EventSeverity;
}

export const EVENTS: CrisisEvent[] = [
  {
    id: "ev_strike_general",
    category: "social",
    title: "Grève générale dans tout le pays",
    context:
      "Les principaux syndicats appellent à un blocage total. Les transports sont paralysés, les raffineries menacent de fermer.",
    source: "Note du Ministère de l'Intérieur",
    choices: [
      {
        id: "a",
        label: "Négocier avec les syndicats",
        description: "Ouvrir un dialogue social et concéder des hausses.",
        effects: {
          popularity: 8,
          economy: -10,
          authority: -5,
          budget: -6,
          debt: 3,
          cohesion: 4,
        },
        hiddenEffects: { peopleFatigue: -8, oppositionPower: -4 },
        consequence: "Les syndicats acceptent un compromis fragile.",
        mediaEffect: 4,
        oppositionEffect: -3,
        fulfillsPromise: ["purchasing_power", "social_justice"],
      },
      {
        id: "b",
        label: "Réquisitionner les services essentiels",
        description: "Imposer la reprise du travail par décret.",
        effects: {
          popularity: -12,
          economy: 5,
          authority: 10,
          security: 4,
          cohesion: -8,
        },
        hiddenEffects: {
          radicalization: 12,
          peopleFatigue: 8,
          oppositionPower: 6,
        },
        consequence: "La rue gronde, mais le pays redémarre.",
        mediaEffect: -10,
        oppositionEffect: 8,
        regionEffects: [
          { region: "idf", tension: 12 },
          { region: "hdf", tension: 10 },
          { region: "paca", tension: 8 },
        ],
        schedulesEvent: { eventId: "ev_delayed_riot", delay: 2 },
      },
      {
        id: "c",
        label: "Ne rien faire publiquement",
        description: "Laisser pourrir, attendre l'essoufflement.",
        effects: {
          popularity: -6,
          economy: -8,
          authority: -3,
          budget: -3,
          cohesion: -4,
        },
        hiddenEffects: {
          peopleFatigue: 10,
          scandalRisk: 6,
          radicalization: 4,
        },
        consequence: "Le mouvement s'étend, l'opinion vous trouve absent.",
        mediaEffect: -6,
        oppositionEffect: 4,
      },
    ],
  },
  {
    id: "ev_cyberattack",
    category: "cyber",
    title: "Cyberattaque sur les hôpitaux",
    context:
      "Un groupe non identifié paralyse 40% des hôpitaux publics. Les blocs opératoires tournent au ralenti, des patients sont transférés en urgence. Une rançon de 200M€ est exigée sous 72h.",
    source: "ANSSI — Niveau d'alerte ROUGE",
    choices: [
      {
        id: "a",
        label: "Mobiliser le commandement cyber militaire",
        description:
          "L'armée prend la main : riposte numérique souveraine, ANSSI en appui.",
        effects: {
          security: 10,
          authority: 5,
          budget: -8,
          health: -4,
        },
        hiddenEffects: { cyberRisk: -8 },
        consequence:
          "L'attaque est contenue par nos propres moyens. Plusieurs jours de chaos hospitalier, mais la souveraineté numérique tient.",
        ministerEffects: [
          { position: "defense", loyalty: 6, competence: 4 },
        ],
        fulfillsPromise: ["sovereignty"],
      },
      {
        id: "b",
        label: "Confier la riposte à une entreprise étrangère",
        description:
          "Un géant américain de la cybersécurité offre une remédiation en 24h.",
        effects: {
          security: 15,
          budget: -15,
          debt: 4,
          health: -2,
          authority: -3,
        },
        hiddenEffects: { foreignDependence: 10, cyberRisk: -10 },
        consequence:
          "Les hôpitaux redémarrent dès le lendemain. La France dépend désormais d'un opérateur étranger pour son cœur numérique.",
        breaksPromise: ["sovereignty"],
        ministerEffects: [{ position: "defense", loyalty: -4 }],
      },
      {
        id: "d",
        label: "Activer la cellule cyber souveraine et patcher en 6h",
        description:
          "Notre commandement cyber national pré-positionné neutralise la menace, sans rançon ni dépendance étrangère.",
        effects: {
          security: 18,
          authority: 8,
          health: 2,
          popularity: 5,
          budget: -2,
        },
        hiddenEffects: { cyberRisk: -14, scandalRisk: -4 },
        consequence:
          "Riposte exemplaire : hôpitaux rétablis sous une journée, attribution publique de l'attaque, aucune dépendance créée. Le pays démontre sa résilience.",
        ministerEffects: [
          { position: "defense", loyalty: 6, competence: 5 },
        ],
        fulfillsPromise: ["sovereignty", "industry"],
        requiresTech: "cyber_security",
      },
      {
        id: "c",
        label: "Minimiser et garder le silence",
        description:
          "Demander aux médias de ne pas relayer, gérer en interne sans payer.",
        effects: {
          popularity: 0,
          health: -6,
          authority: -2,
        },
        hiddenEffects: { scandalRisk: 25, peopleFatigue: 4, cyberRisk: 6 },
        consequence:
          "L'affaire reste discrète… pour l'instant. Plusieurs décès évitables sont attribués à la panne. Une bombe à retardement médiatique.",
        mediaEffect: -4,
        hidesScandal: {
          title: "Scandale : la cyberattaque hôpitaux étouffée",
          popularityDamage: 18,
          authorityDamage: 8,
          mediaDamage: 14,
          revealIn: 6,
        },
      },
    ],
  },
  {
    id: "ev_drought",
    category: "ecology",
    title: "Sécheresse historique",
    context:
      "Le sud du pays manque d'eau potable. Les agriculteurs sont au bord de la faillite.",
    source: "Météo-France & Ministère de l'Agriculture",
    choices: [
      {
        id: "a",
        label: "Plan d'urgence eau de 5 milliards",
        description: "Aides massives, restrictions strictes.",
        effects: {
          popularity: 6,
          ecology: 10,
          economy: -8,
          budget: -10,
          debt: 4,
          regionalStability: 4,
        },
        hiddenEffects: { peopleFatigue: -4 },
        consequence: "L'opinion salue la réactivité. Le déficit se creuse.",
        ministerEffects: [{ position: "ecology", loyalty: 8 }],
        regionEffects: [
          { region: "paca", tension: -8 },
          { region: "occitanie", tension: -6 },
        ],
        fulfillsPromise: ["ecology"],
        mediaEffect: 5,
      },
      {
        id: "b",
        label: "Autoriser le forage profond exceptionnel",
        description: "Soulager les agriculteurs immédiatement.",
        effects: {
          popularity: 4,
          ecology: -10,
          economy: 4,
          health: -2,
        },
        hiddenEffects: { scandalRisk: 8, radicalization: 4 },
        consequence: "Court terme sauvé, nappes menacées à long terme.",
        ministerEffects: [{ position: "ecology", loyalty: -10 }],
        breaksPromise: ["ecology"],
        schedulesEvent: { eventId: "ev_delayed_water_crisis", delay: 3 },
      },
      {
        id: "c",
        label: "Appeler à la solidarité citoyenne",
        description: "Discours présidentiel, pas de mesures fortes.",
        effects: {
          popularity: -4,
          ecology: -2,
          authority: -3,
          regionalStability: -3,
        },
        hiddenEffects: { peopleFatigue: 6, oppositionPower: 4 },
        consequence: "Le pays trouve la réponse insuffisante.",
        mediaEffect: -5,
        regionEffects: [{ region: "paca", tension: 6 }],
      },
    ],
  },
  {
    id: "ev_diplomatic_incident",
    category: "diplomacy",
    title: "Incident diplomatique avec la Chine",
    context:
      "Pékin convoque l'ambassadeur français après un vote au Parlement européen sur Taïwan.",
    source: "Quai d'Orsay — Câble urgent",
    choices: [
      {
        id: "a",
        label: "Tenir une ligne ferme",
        description: "Réaffirmer la position européenne publiquement.",
        effects: {
          diplomacy: -8,
          authority: 8,
          economy: -6,
          popularity: 4,
          budget: -4,
        },
        hiddenEffects: { foreignDependence: -6 },
        consequence: "Pékin gèle plusieurs contrats. L'opinion approuve.",
        ministerEffects: [{ position: "foreign", competence: 4 }],
        fulfillsPromise: ["sovereignty"],
      },
      {
        id: "b",
        label: "Désamorcer en coulisses",
        description: "Envoyer un émissaire discret.",
        effects: {
          diplomacy: 6,
          authority: -2,
          economy: 3,
        },
        hiddenEffects: { foreignDependence: 5, scandalRisk: 4 },
        consequence: "La crise s'éteint. Certains parlent de capitulation.",
        ministerEffects: [{ position: "foreign", competence: 6 }],
      },
      {
        id: "c",
        label: "Convoquer un sommet européen",
        description: "Faire bloc avec Berlin et Rome.",
        effects: {
          diplomacy: 4,
          authority: 4,
          economy: -2,
        },
        hiddenEffects: { foreignDependence: -2 },
        consequence: "L'Europe parle d'une voix. Lentement.",
        fulfillsPromise: ["europe"],
      },
    ],
  },
  {
    id: "ev_inflation",
    category: "economy",
    title: "Inflation à 9%",
    context:
      "Les prix de l'alimentation ont bondi. Les banques alimentaires sont saturées.",
    source: "INSEE — rapport mensuel",
    choices: [
      {
        id: "a",
        label: "Bloquer les prix de 50 produits",
        description: "Mesure populiste, effet immédiat.",
        effects: {
          popularity: 12,
          economy: -10,
          authority: 4,
          budget: -8,
          debt: 3,
        },
        hiddenEffects: { peopleFatigue: -6, foreignDependence: 4 },
        consequence:
          "Les rayons se vident par endroits. Les gens vous remercient.",
        fulfillsPromise: ["purchasing_power"],
        oppositionEffect: -4,
      },
      {
        id: "b",
        label: "Chèque alimentaire de 200€",
        description: "Aide ciblée aux ménages modestes.",
        effects: {
          popularity: 8,
          economy: -6,
          budget: -10,
          debt: 4,
          cohesion: 3,
        },
        hiddenEffects: { peopleFatigue: -4 },
        consequence: "Les classes moyennes se sentent oubliées.",
        fulfillsPromise: ["social_justice"],
      },
      {
        id: "c",
        label: "Laisser le marché s'ajuster",
        description: "Doctrine libérale assumée.",
        effects: {
          popularity: -10,
          economy: 4,
          authority: -2,
          cohesion: -5,
        },
        hiddenEffects: {
          peopleFatigue: 10,
          radicalization: 6,
          oppositionPower: 6,
        },
        consequence: "Manifestations spontanées dans plusieurs villes.",
        breaksPromise: ["purchasing_power", "social_justice"],
        regionEffects: [
          { region: "hdf", tension: 8 },
          { region: "occitanie", tension: 6 },
        ],
      },
    ],
  },
  {
    id: "ev_terror_threat",
    category: "security",
    title: "Menace terroriste imminente",
    context:
      "Les services renseignent qu'un attentat est en préparation pour la fête nationale.",
    source: "DGSI — note classifiée",
    choices: [
      {
        id: "a",
        label: "Annuler les célébrations",
        description: "Précaution maximale.",
        effects: {
          security: 10,
          popularity: -8,
          authority: -4,
          cohesion: -3,
        },
        hiddenEffects: { peopleFatigue: 4 },
        consequence: "Pas d'attentat. L'opinion vous trouve faible.",
      },
      {
        id: "b",
        label: "Maintenir et renforcer la sécurité",
        description: "Déployer 30 000 militaires.",
        effects: {
          security: 6,
          authority: 8,
          economy: -4,
          popularity: 4,
          budget: -6,
        },
        consequence: "La fête a lieu sous tension. Aucun incident.",
        ministerEffects: [{ position: "interior", competence: 6 }],
        fulfillsPromise: ["security"],
        reform: "security",
      },
      {
        id: "c",
        label: "Frappe préventive sur la cellule",
        description: "Opération spéciale immédiate.",
        effects: {
          security: 8,
          authority: 10,
          diplomacy: -6,
          popularity: 2,
        },
        hiddenEffects: { scandalRisk: 14, radicalization: 6 },
        consequence:
          "Cellule neutralisée. Bavure possible révélée plus tard.",
        ministerEffects: [{ position: "defense", loyalty: 8 }],
        hidesScandal: {
          title: "Bavure de l'opération anti-terroriste",
          popularityDamage: 10,
          mediaDamage: 8,
          revealIn: 3,
        },
      },
    ],
  },
  {
    id: "ev_minister_scandal",
    category: "scandal",
    title: "Un ministre mis en examen",
    context:
      "Votre ministre de l'Économie est mis en examen pour conflit d'intérêts. La presse s'enflamme.",
    source: "Le Monde — édition spéciale",
    choices: [
      {
        id: "a",
        label: "Le démettre immédiatement",
        description: "Couper court à la polémique.",
        effects: { popularity: 6, authority: -2 },
        hiddenEffects: { corruption: -8, scandalRisk: -10 },
        consequence: "L'opinion approuve. Votre majorité grogne.",
        ministerEffects: [{ position: "economy", fire: true }],
        mediaEffect: 4,
      },
      {
        id: "b",
        label: "Le défendre publiquement",
        description: "Présomption d'innocence.",
        effects: { popularity: -10, authority: 6 },
        hiddenEffects: {
          corruption: 10,
          scandalRisk: 14,
          oppositionPower: 6,
        },
        revealsHiddenGauge: "corruption",
        consequence:
          "Les médias vous accusent de protéger les vôtres. La rumeur d'un système de copinage prend corps.",
        ministerEffects: [
          { position: "economy", loyalty: 14, scandals: 1 },
        ],
        mediaEffect: -12,
        oppositionEffect: 6,
      },
      {
        id: "c",
        label: "Réorganiser tout le gouvernement",
        description: "Diversion par remaniement total.",
        effects: { popularity: 2, authority: 4, economy: -3 },
        hiddenEffects: { corruption: -4, scandalRisk: -6, peopleFatigue: 4 },
        consequence:
          "La presse change de sujet. L'instabilité inquiète les marchés.",
        ministerEffects: [
          { position: "economy", fire: true },
          { position: "interior", fire: true },
        ],
      },
    ],
  },
  {
    id: "ev_climate_summit",
    category: "ecology",
    title: "Sommet mondial sur le climat",
    context:
      "La France doit annoncer de nouveaux engagements de réduction d'émissions.",
    source: "Élysée — agenda international",
    choices: [
      {
        id: "a",
        label: "Engagement -55% d'ici 2030",
        description: "Position ambitieuse et radicale.",
        effects: {
          ecology: 12,
          diplomacy: 8,
          economy: -8,
          popularity: -2,
          budget: -6,
        },
        hiddenEffects: { foreignDependence: -6 },
        consequence: "Salué à l'étranger. Industrie en colère.",
        ministerEffects: [
          { position: "ecology", loyalty: 10 },
          { position: "economy", loyalty: -6 },
        ],
        fulfillsPromise: ["ecology"],
        breaksPromise: ["industry"],
        mediaEffect: 6,
        reform: "ecology",
      },
      {
        id: "b",
        label: "Position pragmatique -25%",
        description: "Tenir une ligne réaliste.",
        effects: { ecology: 4, diplomacy: 2, economy: 2 },
        hiddenEffects: { peopleFatigue: 2 },
        consequence: "Peu de bruit. Peu d'effet.",
      },
      {
        id: "c",
        label: "Refuser tout engagement chiffré",
        description: "Souveraineté avant tout.",
        effects: {
          ecology: -8,
          diplomacy: -10,
          popularity: -4,
          authority: 4,
        },
        hiddenEffects: { radicalization: 4, foreignDependence: 4 },
        consequence: "La France est marginalisée au sommet.",
        breaksPromise: ["ecology", "europe"],
        fulfillsPromise: ["sovereignty"],
        mediaEffect: -6,
      },
    ],
  },
  {
    id: "ev_riots",
    category: "social",
    title: "Émeutes urbaines",
    context:
      "Trois nuits de violences dans les banlieues après un contrôle qui a mal tourné.",
    source: "Préfecture de Police",
    choices: [
      {
        id: "a",
        label: "État d'urgence",
        description: "Couvre-feu, blindés, restriction des libertés.",
        effects: {
          security: 8,
          authority: 10,
          popularity: -6,
          diplomacy: -4,
          cohesion: -8,
        },
        hiddenEffects: {
          radicalization: 14,
          peopleFatigue: 6,
          oppositionPower: 4,
        },
        consequence:
          "Le calme revient en 48h. Les images choquent à l'étranger.",
        regionEffects: [
          { region: "idf", tension: -10 },
          { region: "hdf", tension: -6 },
          { region: "paca", tension: -6 },
        ],
        fulfillsPromise: ["security"],
        mediaEffect: -8,
      },
      {
        id: "b",
        label: "Plan banlieues de 3 milliards",
        description: "Apaiser par l'investissement.",
        effects: {
          popularity: 6,
          economy: -8,
          security: -2,
          budget: -8,
          debt: 3,
          cohesion: 5,
        },
        hiddenEffects: { peopleFatigue: -6, radicalization: -6 },
        consequence: "Calme progressif. La droite vous attaque.",
        regionEffects: [
          { region: "idf", tension: -6 },
          { region: "hdf", tension: -4 },
        ],
        fulfillsPromise: ["social_justice"],
        oppositionEffect: 6,
      },
      {
        id: "c",
        label: "Discours d'unité nationale",
        description: "Appeler au calme depuis l'Élysée.",
        effects: {
          popularity: 2,
          authority: -2,
          security: -4,
          cohesion: 4,
        },
        hiddenEffects: { peopleFatigue: 2 },
        consequence: "Les violences s'épuisent d'elles-mêmes.",
        regionEffects: [{ region: "idf", tension: 4 }],
      },
    ],
  },
  {
    id: "ev_pension_reform",
    category: "social",
    title: "Réforme des retraites bloquée",
    context:
      "Le projet de loi est bloqué au Parlement. La rue est mobilisée.",
    source: "Présidence de l'Assemblée",
    choices: [
      {
        id: "a",
        label: "Passer en force par décret",
        description: "Article 49.3 de la Constitution.",
        effects: {
          authority: 8,
          popularity: -14,
          economy: 6,
          budget: 8,
          debt: -4,
          cohesion: -6,
        },
        hiddenEffects: {
          peopleFatigue: 12,
          radicalization: 8,
          oppositionPower: 12,
        },
        consequence: "La loi passe. Motion de censure déposée.",
        oppositionEffect: 14,
        mediaEffect: -10,
        breaksPromise: ["social_justice"],
        schedulesEvent: { eventId: "ev_delayed_no_confidence", delay: 1 },
        reform: "social",
      },
      {
        id: "b",
        label: "Retirer le projet",
        description: "Reculer pour mieux sauter.",
        effects: {
          popularity: 8,
          authority: -10,
          economy: -4,
          budget: -4,
          debt: 2,
        },
        hiddenEffects: { peopleFatigue: -8, oppositionPower: -4 },
        consequence: "Les syndicats jubilent. Bruxelles s'inquiète.",
        oppositionEffect: -4,
        ministerEffects: [{ position: "pm", loyalty: -8 }],
      },
      {
        id: "c",
        label: "Référendum populaire",
        description: "Trancher par les urnes.",
        effects: {
          popularity: 4,
          authority: 2,
          economy: -2,
          cohesion: 3,
        },
        hiddenEffects: { oppositionPower: -6, peopleFatigue: -2 },
        consequence: "Campagne longue et incertaine en perspective.",
        mediaEffect: 4,
      },
    ],
  },
  {
    id: "ev_ai_regulation",
    category: "economy",
    title: "Régulation de l'IA",
    context:
      "Une IA générale a remplacé 800 000 emplois en six mois. Les syndicats réclament un moratoire.",
    source: "Conseil National du Numérique",
    choices: [
      {
        id: "a",
        label: "Taxe robots de 30%",
        description: "Faire financer la transition par les entreprises.",
        effects: {
          popularity: 10,
          economy: -8,
          authority: 4,
          budget: 6,
          debt: -3,
        },
        hiddenEffects: { peopleFatigue: -6, foreignDependence: 4 },
        consequence: "Les startups françaises délocalisent.",
        breaksPromise: ["industry"],
        fulfillsPromise: ["social_justice"],
      },
      {
        id: "b",
        label: "Plan de reconversion massif",
        description: "Investir 10 milliards dans la formation.",
        effects: {
          popularity: 6,
          economy: -6,
          budget: -12,
          debt: 5,
          cohesion: 4,
        },
        hiddenEffects: { peopleFatigue: -4 },
        consequence: "Effets visibles dans 3-5 ans.",
        fulfillsPromise: ["education"],
      },
      {
        id: "c",
        label: "Laisser faire le marché",
        description: "Ne pas freiner l'innovation.",
        effects: {
          economy: 8,
          popularity: -10,
          authority: -4,
          cohesion: -8,
        },
        hiddenEffects: {
          radicalization: 10,
          peopleFatigue: 12,
          foreignDependence: 12,
          cyberRisk: 6,
        },
        consequence: "Les bénéfices explosent. La fracture sociale aussi.",
        breaksPromise: ["social_justice"],
        regionEffects: [
          { region: "hdf", tension: 6 },
          { region: "grand_est", tension: 6 },
        ],
      },
    ],
  },
  {
    id: "ev_war_threat",
    category: "diplomacy",
    title: "Conflit ouvert en Méditerranée",
    context:
      "Deux États riverains entrent en guerre. Des ressortissants français sont coincés.",
    source: "Cellule de crise — Quai d'Orsay",
    choices: [
      {
        id: "a",
        label: "Intervention militaire d'évacuation",
        description: "Envoyer le porte-avions Charles de Gaulle.",
        effects: {
          authority: 10,
          security: 6,
          economy: -10,
          diplomacy: 4,
          budget: -14,
          debt: 6,
        },
        hiddenEffects: { foreignDependence: -6 },
        consequence: "Opération réussie. Coût élevé.",
        ministerEffects: [
          { position: "defense", loyalty: 10, competence: 6 },
        ],
        fulfillsPromise: ["sovereignty"],
        mediaEffect: 8,
      },
      {
        id: "b",
        label: "Évacuation diplomatique négociée",
        description: "Travailler avec l'ONU.",
        effects: {
          diplomacy: 8,
          authority: -2,
          popularity: 2,
        },
        hiddenEffects: { foreignDependence: 4 },
        consequence: "Lent mais sans victime.",
        fulfillsPromise: ["europe"],
      },
      {
        id: "c",
        label: "Ne pas s'engager",
        description: "Laisser les ressortissants se débrouiller.",
        effects: {
          popularity: -16,
          authority: -8,
          economy: 2,
          cohesion: -6,
        },
        hiddenEffects: {
          scandalRisk: 18,
          peopleFatigue: 10,
          oppositionPower: 8,
        },
        consequence: "Scandale national. Démission de plusieurs ministres.",
        ministerEffects: [
          { position: "foreign", fire: true },
          { position: "defense", loyalty: -20 },
        ],
        mediaEffect: -16,
        oppositionEffect: 10,
      },
    ],
  },
  {
    id: "ev_media_pressure",
    category: "media",
    title: "Une enquête accablante en couverture",
    context:
      "Mediapart publie 80 pages sur les marchés publics du quinquennat. Tous les médias reprennent.",
    source: "Salle de presse de l'Élysée",
    choices: [
      {
        id: "a",
        label: "Conférence de presse de transparence",
        description: "Répondre point par point pendant 2 heures.",
        effects: { popularity: 4, authority: 2 },
        hiddenEffects: { scandalRisk: -10, corruption: -4 },
        consequence: "L'image présidentielle se redresse partiellement.",
        mediaEffect: 12,
      },
      {
        id: "b",
        label: "Attaquer la presse en diffamation",
        description: "Faire intervenir vos avocats.",
        effects: { authority: 4, popularity: -6 },
        hiddenEffects: {
          scandalRisk: 12,
          corruption: 6,
          oppositionPower: 8,
        },
        consequence: "Les rédactions se braquent durablement.",
        mediaEffect: -18,
        oppositionEffect: 6,
      },
      {
        id: "c",
        label: "Garder le silence",
        description: "Ne pas commenter, attendre que ça passe.",
        effects: { popularity: -4, authority: -2 },
        hiddenEffects: { scandalRisk: 8, peopleFatigue: 4 },
        consequence: "Le silence est interprété comme un aveu.",
        mediaEffect: -8,
      },
    ],
  },
  {
    id: "ev_no_confidence",
    category: "opposition",
    title: "Motion de censure déposée",
    context:
      "L'opposition parlementaire dépose une motion de censure pour faire tomber votre gouvernement.",
    source: "Bureau de l'Assemblée nationale",
    choices: [
      {
        id: "a",
        label: "Affronter le vote, jouer la majorité",
        description: "Compter sur la discipline de votre majorité.",
        effects: { authority: 6, popularity: -2 },
        hiddenEffects: { oppositionPower: -6 },
        consequence:
          "La motion est rejetée à 6 voix près. Frayeur historique.",
        ministerEffects: [
          { position: "pm", loyalty: 8, competence: 4 },
        ],
        oppositionEffect: -4,
      },
      {
        id: "b",
        label: "Remanier en urgence",
        description: "Sacrifier votre Premier ministre pour calmer le jeu.",
        effects: { popularity: 4, authority: -4 },
        hiddenEffects: { oppositionPower: -10, scandalRisk: -4 },
        consequence: "Matignon change. La motion est retirée.",
        ministerEffects: [{ position: "pm", fire: true }],
        oppositionEffect: -10,
      },
      {
        id: "c",
        label: "Dissoudre l'Assemblée",
        description: "Convoquer des législatives anticipées.",
        effects: {
          authority: 10,
          popularity: -6,
          economy: -4,
          cohesion: -3,
        },
        hiddenEffects: {
          oppositionPower: 10,
          peopleFatigue: 6,
          radicalization: 4,
        },
        consequence: "La France replonge en campagne. Issue incertaine.",
        mediaEffect: -6,
        oppositionEffect: 4,
      },
    ],
  },
  {
    id: "ev_regional_revolt",
    category: "regional",
    title: "Révolte régionale en Outre-mer",
    context:
      "Émeutes massives dans plusieurs territoires d'Outre-mer suite à la flambée des prix.",
    source: "Préfectures d'Outre-mer",
    choices: [
      {
        id: "a",
        label: "Plan d'aide spécifique de 2 Md€",
        description: "Subventions, baisse des taxes locales.",
        effects: {
          popularity: 4,
          economy: -6,
          budget: -8,
          debt: 3,
          regionalStability: 8,
          cohesion: 4,
        },
        hiddenEffects: { peopleFatigue: -4, radicalization: -4 },
        consequence: "L'Outre-mer respire. Le déficit aussi.",
        regionEffects: [{ region: "outre_mer", tension: -25 }],
        fulfillsPromise: ["social_justice"],
      },
      {
        id: "b",
        label: "Envoi de gendarmes mobiles",
        description: "Rétablir l'ordre par la force.",
        effects: {
          security: 6,
          popularity: -4,
          authority: 6,
          regionalStability: -4,
          cohesion: -4,
        },
        hiddenEffects: { radicalization: 12, peopleFatigue: 6 },
        consequence: "Calme apparent. Rancœur durable.",
        regionEffects: [{ region: "outre_mer", tension: -12 }],
        mediaEffect: -6,
      },
      {
        id: "c",
        label: "Promettre un référendum d'autonomie",
        description: "Pari politique audacieux.",
        effects: {
          popularity: 2,
          authority: -8,
          regionalStability: -6,
        },
        hiddenEffects: { oppositionPower: 8 },
        consequence: "Apaisement immédiat, fronde dans la majorité.",
        regionEffects: [{ region: "outre_mer", tension: -18 }],
        ministerEffects: [{ position: "interior", loyalty: -10 }],
      },
    ],
  },
  {
    id: "ev_pm_betrayal",
    category: "scandal",
    title: "Votre Premier ministre vous trahit",
    context:
      "Votre Premier ministre laisse fuiter à la presse vos désaccords sur la stratégie.",
    source: "Le Canard Enchaîné",
    choices: [
      {
        id: "a",
        label: "Démettre Matignon sur-le-champ",
        description: "Couper la tête du serpent.",
        effects: { authority: 8, popularity: -2 },
        hiddenEffects: { oppositionPower: 4, scandalRisk: -4 },
        consequence: "Matignon est vacant. Intérim assuré.",
        ministerEffects: [{ position: "pm", fire: true }],
        mediaEffect: -4,
      },
      {
        id: "b",
        label: "Le maintenir, faire profil bas",
        description: "Cohabitation interne.",
        effects: { authority: -8, popularity: -4 },
        hiddenEffects: {
          scandalRisk: 12,
          corruption: 6,
          oppositionPower: 8,
        },
        consequence: "Les fuites continuent. L'État se grippe.",
        ministerEffects: [{ position: "pm", loyalty: -20 }],
        oppositionEffect: 4,
      },
      {
        id: "c",
        label: "Le promouvoir pour l'éteindre",
        description: "Lui offrir un poste honorifique.",
        effects: { authority: 2, popularity: 0 },
        hiddenEffects: { corruption: 8, scandalRisk: 6 },
        consequence: "Il accepte. Mais l'opinion vous trouve faible.",
        ministerEffects: [{ position: "pm", fire: true }],
        mediaEffect: -4,
      },
    ],
  },
  {
    id: "ev_industrial_closure",
    category: "economy",
    title: "Fermeture surprise d'une grande usine",
    context:
      "Un grand groupe annonce la fermeture d'un site emblématique du Nord. 4 200 emplois menacés.",
    source: "Préfecture des Hauts-de-France",
    choices: [
      {
        id: "a",
        label: "Nationaliser temporairement",
        description: "L'État reprend l'usine pour 18 mois.",
        effects: {
          popularity: 10,
          economy: -10,
          authority: 4,
          budget: -12,
          debt: 5,
          cohesion: 4,
        },
        hiddenEffects: { foreignDependence: -8, peopleFatigue: -6 },
        consequence:
          "Sauvetage spectaculaire. Bruxelles fronce les sourcils.",
        regionEffects: [{ region: "hdf", tension: -18 }],
        fulfillsPromise: ["industry", "social_justice"],
        breaksPromise: ["europe"],
      },
      {
        id: "b",
        label: "Plan de reclassement de 500M€",
        description: "Accompagner sans nationaliser.",
        effects: {
          popularity: 4,
          economy: -4,
          budget: -5,
          debt: 2,
        },
        hiddenEffects: { peopleFatigue: -2 },
        consequence: "Aide ciblée. Insuffisante pour beaucoup.",
        regionEffects: [{ region: "hdf", tension: -8 }],
      },
      {
        id: "c",
        label: "Laisser le marché trancher",
        description: "Pas d'intervention de l'État.",
        effects: {
          popularity: -12,
          economy: 4,
          authority: -4,
          cohesion: -6,
          regionalStability: -4,
        },
        hiddenEffects: {
          radicalization: 10,
          peopleFatigue: 10,
          oppositionPower: 6,
        },
        consequence:
          "La région se sent abandonnée. La région se radicalise.",
        regionEffects: [{ region: "hdf", tension: 18 }],
        breaksPromise: ["industry", "social_justice"],
      },
    ],
  },

  // ============================================================
  // ÉCONOMIE — 10 nouveaux
  // ============================================================
  {
    id: "ev_eu_wealth_tax",
    category: "economy",
    title: "Taxe européenne sur les ultra-riches",
    context:
      "Bruxelles propose une taxe coordonnée à 2% sur les patrimoines >50M€. Plusieurs milliardaires français menacent de partir.",
    source: "Commission européenne — proposition COM(2035) 412",
    choices: [
      {
        id: "a",
        label: "Soutenir et co-piloter avec l'Allemagne",
        description: "Faire de la France le moteur du dossier.",
        effects: { popularity: 8, economy: -3, budget: 6, cohesion: 5, diplomacy: 4 },
        hiddenEffects: { peopleFatigue: -4, oppositionPower: -3, corruption: -3 },
        consequence: "L'opinion populaire applaudit, les patrons grognent.",
        fulfillsPromise: ["social_justice", "europe"],
        ministerEffects: [{ position: "economy", loyalty: -3 }],
        mediaEffect: 5,
      },
      {
        id: "b",
        label: "Bloquer au Conseil européen",
        description: "Préserver l'attractivité fiscale française.",
        effects: { popularity: -10, economy: 5, authority: -2, cohesion: -4, diplomacy: -3 },
        hiddenEffects: { scandalRisk: 6, peopleFatigue: 6, oppositionPower: 5, corruption: 5 },
        consequence: "Les ONG dénoncent un sabotage. Les marchés saluent.",
        breaksPromise: ["social_justice", "tax_cut"],
        oppositionEffect: 5,
      },
      {
        id: "c",
        label: "Version française seule, plus douce (1%)",
        description: "Voie médiane assumée.",
        effects: { popularity: 3, budget: 3, economy: -2, cohesion: 2 },
        hiddenEffects: { foreignDependence: 3, oppositionPower: -1 },
        consequence: "Personne n'est ravi, mais personne ne s'embrase.",
      },
    ],
  },
  {
    id: "ev_air_france_collapse",
    category: "economy",
    title: "Air France-KLM au bord de la faillite",
    context:
      "La compagnie réclame 4Mds€ de garanties d'État sous 30 jours. 28 000 emplois en jeu, dont la moitié en France.",
    source: "Bercy — note confidentielle",
    choices: [
      {
        id: "a",
        label: "Nationalisation partielle (25%)",
        description: "L'État entre au capital pour stabiliser.",
        effects: { popularity: 6, economy: 3, authority: 5, budget: -10, debt: 5, cohesion: 4 },
        hiddenEffects: { foreignDependence: -4, peopleFatigue: -3, oppositionPower: -2 },
        consequence: "Bruxelles fronce les sourcils, les pilotes vous remercient.",
        fulfillsPromise: ["industry", "sovereignty"],
        regionEffects: [{ region: "idf", tension: -4 }],
      },
      {
        id: "b",
        label: "Garantir un prêt sans entrer au capital",
        description: "Aide ciblée, pas d'ingérence.",
        effects: { popularity: 2, economy: 2, budget: -6, debt: 3 },
        hiddenEffects: { corruption: 4, scandalRisk: 5 },
        consequence: "La compagnie respire, les conditions restent floues.",
      },
      {
        id: "c",
        label: "Laisser la restructuration au privé",
        description: "Lufthansa propose un rachat hostile.",
        effects: { popularity: -12, economy: 4, authority: -6, cohesion: -5 },
        hiddenEffects: { foreignDependence: 12, radicalization: 5, oppositionPower: 6 },
        consequence: "Le drapeau allemand flotte sur Roissy. Manifestations.",
        breaksPromise: ["sovereignty", "industry"],
        regionEffects: [{ region: "idf", tension: 8 }],
      },
    ],
  },
  {
    id: "ev_smic_2000",
    category: "economy",
    title: "Pétition pour un SMIC à 2000€",
    context:
      "2,1M de signatures réclament un SMIC net à 2000€. Le MEDEF parle de 800 000 emplois détruits.",
    source: "Conseil économique, social et environnemental",
    choices: [
      {
        id: "a",
        label: "Acter la hausse en deux ans",
        description: "Coup de pouce immédiat de 8%.",
        effects: { popularity: 14, economy: -8, budget: -6, debt: 3, cohesion: 6, authority: 3 },
        hiddenEffects: { peopleFatigue: -10, oppositionPower: -5, radicalization: -4 },
        consequence: "Les classes populaires exultent, les PME paniquent.",
        fulfillsPromise: ["purchasing_power", "social_justice"],
        oppositionEffect: -4,
      },
      {
        id: "b",
        label: "Hausse symbolique (+1.5%)",
        description: "Le minimum légal.",
        effects: { popularity: -2, economy: 1, cohesion: -2 },
        hiddenEffects: { peopleFatigue: 5, oppositionPower: 3 },
        consequence: "Personne n'est dupe. La grogne reste.",
      },
      {
        id: "c",
        label: "Prime de pouvoir d'achat exonérée",
        description: "Solution à coût nul pour l'État.",
        effects: { popularity: 6, economy: -2, budget: -2, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -4, corruption: 3 },
        consequence: "Les patrons jouent le jeu. À court terme.",
        fulfillsPromise: ["purchasing_power"],
      },
    ],
  },
  {
    id: "ev_recession",
    category: "economy",
    title: "Récession technique confirmée",
    context:
      "Deuxième trimestre consécutif de croissance négative. Le chômage repart à la hausse.",
    source: "INSEE — comptes nationaux",
    choices: [
      {
        id: "a",
        label: "Plan de relance par l'investissement (30Mds)",
        description: "Infrastructures, transition, IA souveraine.",
        effects: { popularity: 6, economy: 6, budget: -15, debt: 8, ecology: 4, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -5, oppositionPower: -3, corruption: 4 },
        consequence: "Les marchés saluent, la dette s'envole.",
        fulfillsPromise: ["industry", "ecology"],
      },
      {
        id: "b",
        label: "Choc de simplification et baisses d'impôts",
        description: "Pari libéral assumé.",
        effects: { popularity: -2, economy: 4, budget: -8, debt: 5, cohesion: -3 },
        hiddenEffects: { corruption: 5, oppositionPower: 5 },
        consequence: "Les chefs d'entreprise applaudissent. La gauche hurle.",
        fulfillsPromise: ["tax_cut"],
        breaksPromise: ["social_justice"],
        // Cascade emblématique : la baisse d'impôts ouvre un trou
        // budgétaire qui se creuse tour après tour, attire la
        // défiance des marchés, puis force un choix douloureux.
        cascade: [
          {
            kind: "gauge",
            delay: 2,
            label: "Les recettes fiscales s'effondrent",
            effects: { budget: -6, debt: 4 },
          },
          {
            kind: "gauge",
            delay: 4,
            label: "Le coût de la dette grimpe sur les marchés",
            effects: { debt: 6, economy: -3 },
            mediaEffect: -4,
          },
          {
            kind: "notice",
            delay: 5,
            label: "Les agences de notation menacent de dégrader la France",
          },
          {
            kind: "event",
            delay: 6,
            label: "Choc de marchés sur la dette française",
            eventId: "ev_delayed_debt_crisis",
          },
        ],
      },
      {
        id: "c",
        label: "Austérité budgétaire ciblée",
        description: "Couper -3% sur tous les ministères sauf défense.",
        effects: { popularity: -14, economy: -2, budget: 12, debt: -4, cohesion: -8, health: -5 },
        hiddenEffects: { peopleFatigue: 12, radicalization: 8, oppositionPower: 10 },
        consequence: "Bruxelles félicite. Le pays bouillonne.",
        breaksPromise: ["purchasing_power", "social_justice"],
        regionEffects: [{ region: "hdf", tension: 6 }],
        // Cascade : l'austérité fait baisser la colère lentement,
        // la radicalisation grimpe, puis tout explose à la fin.
        cascade: [
          {
            kind: "notice",
            delay: 2,
            label: "Les associations alertent : la précarité explose",
          },
          {
            kind: "gauge",
            delay: 3,
            label: "Les services publics craquent dans les régions",
            effects: { health: -3, cohesion: -3 },
            hiddenEffects: { radicalization: 5 },
          },
          {
            kind: "event",
            delay: 5,
            label: "Mouvement social majeur déclenché par l'austérité",
            eventId: "ev_strike_general",
          },
        ],
      },
    ],
  },
  {
    id: "ev_global_min_tax",
    category: "economy",
    title: "OCDE : impôt mondial à 25% sur les multinationales",
    context:
      "L'accord est sur la table. Berlin et Madrid valident, Washington tergiverse.",
    source: "OCDE — secrétariat fiscal",
    choices: [
      {
        id: "a",
        label: "Signer immédiatement",
        description: "Première grande puissance à valider.",
        effects: { popularity: 4, budget: 8, diplomacy: 6, cohesion: 3 },
        hiddenEffects: { corruption: -6, foreignDependence: -3 },
        consequence: "Les GAFAM grognent, le Trésor se frotte les mains.",
        fulfillsPromise: ["social_justice", "europe", "sovereignty"],
      },
      {
        id: "b",
        label: "Conditionner à l'accord US",
        description: "Pas de bond en avant solo.",
        effects: { economy: 2, diplomacy: -2 },
        hiddenEffects: { foreignDependence: 4, peopleFatigue: 3 },
        consequence: "On gagne du temps. Personne ne sait pour quoi.",
      },
    ],
  },
  {
    id: "ev_gilet_jaunes_v2",
    category: "social",
    title: "Retour des Gilets Jaunes — saison 2",
    context:
      "L'augmentation surprise des taxes sur le diesel rallume une colère qu'on croyait éteinte. Les ronds-points se reforment.",
    source: "Préfectures — bulletin coordonné",
    choices: [
      {
        id: "a",
        label: "Suspendre la hausse et ouvrir un grand débat",
        description: "Geste d'apaisement comme en 2018.",
        effects: { popularity: 8, authority: -5, budget: -4, cohesion: 5, ecology: -3 },
        hiddenEffects: { peopleFatigue: -8, radicalization: -4, oppositionPower: -3 },
        consequence: "Les ronds-points se vident en deux semaines.",
        fulfillsPromise: ["purchasing_power"],
        breaksPromise: ["ecology"],
      },
      {
        id: "b",
        label: "Maintenir la hausse, dialogue ferme",
        description: "Position de fermeté écologique.",
        effects: { popularity: -10, authority: 4, ecology: 5, cohesion: -4 },
        hiddenEffects: { peopleFatigue: 10, radicalization: 8, oppositionPower: 5 },
        consequence: "La mobilisation s'enracine. Les violences reprennent.",
        regionEffects: [
          { region: "hdf", tension: 6 },
          { region: "occitanie", tension: 5 },
        ],
        fulfillsPromise: ["ecology"],
        // Cascade : la fermeté nourrit la radicalisation, puis le
        // mouvement durcit, puis tout déborde.
        cascade: [
          {
            kind: "gauge",
            delay: 2,
            label: "Les ronds-points s'organisent en réseaux",
            effects: { cohesion: -3 },
            hiddenEffects: { radicalization: 6, peopleFatigue: 5 },
          },
          {
            kind: "notice",
            delay: 3,
            label: "Premiers heurts violents devant les préfectures",
          },
          {
            kind: "gauge",
            delay: 4,
            label: "Vague de défiance : -3 popularité, -3 autorité",
            effects: { popularity: -3, authority: -3 },
            mediaEffect: -5,
          },
        ],
      },
      {
        id: "c",
        label: "Maintenir + redistribuer la recette aux ménages",
        description: "Chèque vert ciblé.",
        effects: { popularity: 4, budget: -6, ecology: 4, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -3, corruption: 3 },
        consequence: "Solution technocratique appréciée à moitié.",
        fulfillsPromise: ["ecology", "purchasing_power"],
      },
    ],
  },
  {
    id: "ev_pension_fund",
    category: "economy",
    title: "Lancement d'un fonds de pension à la française",
    context:
      "Bercy propose un fonds public-privé pour compléter les retraites. Les syndicats parlent de privatisation rampante.",
    source: "Direction du Trésor",
    choices: [
      {
        id: "a",
        label: "Lancer avec garantie d'État",
        description: "Adossé à la Caisse des Dépôts.",
        effects: { popularity: -2, economy: 5, budget: -3, authority: 3 },
        hiddenEffects: { foreignDependence: -3, corruption: 4, oppositionPower: 4 },
        consequence: "Les marchés français gagnent en profondeur.",
        ministerEffects: [{ position: "economy", competence: 5, loyalty: 4 }],
      },
      {
        id: "b",
        label: "Renoncer après pression syndicale",
        description: "Retrait pur et simple.",
        effects: { popularity: 4, authority: -6, economy: -3, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -4, oppositionPower: -3 },
        consequence: "Vu comme une victoire syndicale, perçu comme une faiblesse.",
        fulfillsPromise: ["social_justice"],
      },
    ],
  },
  {
    id: "ev_paris_finance_hub",
    category: "economy",
    title: "Bataille pour devenir le hub financier européen",
    context:
      "Francfort et Paris se disputent les activités de la City post-Brexit. Une banque US veut 4 000 traders.",
    source: "Place financière de Paris",
    choices: [
      {
        id: "a",
        label: "Avantages fiscaux ciblés expatriés",
        description: "Forfait 30% pendant 8 ans.",
        effects: { economy: 8, budget: -3, popularity: -6, cohesion: -4 },
        hiddenEffects: { corruption: 6, oppositionPower: 5, foreignDependence: 4 },
        consequence: "Paris attire 3 200 cadres. Polémique sur la justice fiscale.",
        breaksPromise: ["social_justice"],
        fulfillsPromise: ["industry", "tax_cut"],
        regionEffects: [{ region: "idf", tension: -3 }],
      },
      {
        id: "b",
        label: "Refuser, miser sur l'industrie",
        description: "Pas de cadeau aux banques.",
        effects: { popularity: 5, economy: -3, cohesion: 4, authority: 3 },
        hiddenEffects: { foreignDependence: -4, corruption: -4 },
        consequence: "Francfort rafle la mise. La gauche vous remercie.",
        fulfillsPromise: ["industry", "social_justice"],
      },
      {
        id: "c",
        label: "Pacte donnant-donnant : taxe verte sur trades",
        description: "Innovation européenne assumée.",
        effects: { economy: 3, budget: 4, ecology: 3, diplomacy: 3 },
        hiddenEffects: { corruption: -3 },
        consequence: "Bruxelles applaudit, Wall Street bougonne.",
        fulfillsPromise: ["europe", "ecology"],
      },
    ],
  },
  {
    id: "ev_tax_evasion_leak",
    category: "scandal",
    title: "Leak fiscal : 80 ministres et députés cités",
    context:
      "Un consortium de journalistes publie 11M de documents. Plusieurs membres de la majorité y figurent.",
    source: "ICIJ — France Leaks",
    choices: [
      {
        id: "a",
        label: "Commission d'enquête parlementaire indépendante",
        description: "Transparence totale, présidence à l'opposition.",
        effects: { popularity: 6, authority: -3, cohesion: 5 },
        hiddenEffects: { corruption: -10, scandalRisk: -8, oppositionPower: -3 },
        consequence: "Quelques têtes tombent. La crédibilité grimpe.",
        fulfillsPromise: ["social_justice"],
        revealsHiddenGauge: "corruption",
        mediaEffect: 6,
      },
      {
        id: "b",
        label: "Renvoyer dos à dos, minimiser",
        description: "« Documents anciens, contexte différent. »",
        effects: { popularity: -10, authority: -6, cohesion: -6 },
        hiddenEffects: { corruption: 12, scandalRisk: 18, oppositionPower: 10 },
        consequence: "L'opinion vous trouve complice. La presse ne lâche rien.",
        breaksPromise: ["social_justice"],
        mediaEffect: -8,
        oppositionEffect: 8,
      },
      {
        id: "c",
        label: "Loi anti-évasion express en 30 jours",
        description: "Peines doublées, déclaration mondiale.",
        effects: { popularity: 10, authority: 5, budget: 6, cohesion: 6, economy: -4, diplomacy: -3 },
        hiddenEffects: { corruption: -8, oppositionPower: -4, foreignDependence: 4, scandalRisk: 3 },
        consequence: "Vous reprenez l'initiative. Quelques fortunes filent en Suisse.",
        fulfillsPromise: ["social_justice"],
        breaksPromise: ["tax_cut"],
      },
    ],
  },
  {
    id: "ev_eu_dereg_banks",
    category: "economy",
    title: "Dérégulation bancaire post-Bâle IV",
    context:
      "Bruxelles pousse à alléger les ratios prudentiels pour relancer le crédit. ONG et économistes alertent.",
    source: "Commission européenne",
    choices: [
      {
        id: "a",
        label: "Soutenir la dérégulation",
        description: "Crédit dopé, banques plus rentables.",
        effects: { economy: 6, budget: 2, authority: -2, cohesion: -3 },
        hiddenEffects: { scandalRisk: 8, corruption: 6, oppositionPower: 4 },
        consequence: "Le Cac 40 jubile. Les régulateurs s'inquiètent.",
        fulfillsPromise: ["industry"],
      },
      {
        id: "b",
        label: "S'opposer fermement",
        description: "Maintenir les exigences strictes.",
        effects: { economy: -2, popularity: 4, diplomacy: -3, cohesion: 3 },
        hiddenEffects: { corruption: -5, scandalRisk: -4 },
        consequence: "Berlin vous suit. Bruxelles vous tient rigueur.",
        fulfillsPromise: ["sovereignty"],
      },
    ],
  },

  // ============================================================
  // DETTE — 8 nouveaux (catégorie "economy")
  // ============================================================
  {
    id: "ev_moodys_downgrade",
    category: "economy",
    title: "Moody's dégrade la France de Aa2 à Aa3",
    context:
      "L'agence pointe le déficit chronique et l'instabilité politique. Les taux se tendent.",
    source: "Moody's Analytics — communiqué",
    choices: [
      {
        id: "a",
        label: "Plan d'économies de 25Mds annoncé sous 48h",
        description: "Geler postes, réformer aides.",
        effects: { popularity: -10, economy: 3, budget: 12, debt: -6, cohesion: -6, health: -3 },
        hiddenEffects: { peopleFatigue: 10, oppositionPower: 6, radicalization: 4 },
        consequence: "Les marchés se calment. Le pays trime.",
        breaksPromise: ["social_justice", "purchasing_power"],
      },
      {
        id: "b",
        label: "Discours souverainiste : « Nos titres restent sûrs »",
        description: "Dénoncer une attaque idéologique.",
        effects: { popularity: 4, economy: -4, debt: 4, authority: 4, diplomacy: -3 },
        hiddenEffects: { foreignDependence: -3, scandalRisk: 4, oppositionPower: 3 },
        consequence: "Vos partisans applaudissent. Les taux montent encore.",
      },
      {
        id: "c",
        label: "Plan mixte : 12Mds économies + investissement vert",
        description: "Voie médiane crédible.",
        effects: { popularity: -3, economy: 3, budget: 6, debt: -2, ecology: 4 },
        hiddenEffects: { peopleFatigue: 4, oppositionPower: 2 },
        consequence: "Bruxelles approuve, l'opinion accepte à reculons.",
        fulfillsPromise: ["ecology"],
      },
    ],
  },
  {
    id: "ev_bond_attack",
    category: "economy",
    title: "Attaque coordonnée sur la dette française",
    context:
      "Plusieurs hedge funds vendent à découvert l'OAT 10 ans. Spread vs Bund explose à 220 points.",
    source: "Agence France Trésor",
    choices: [
      {
        id: "a",
        label: "Demander l'intervention de la BCE",
        description: "Activer le mécanisme TPI.",
        effects: { economy: 4, budget: 3, debt: -3, diplomacy: 4 },
        hiddenEffects: { foreignDependence: 8, oppositionPower: 3 },
        consequence: "Francfort rachète. La pression se relâche, à un prix.",
        fulfillsPromise: ["europe"],
      },
      {
        id: "b",
        label: "Émission obligataire patriote citoyenne",
        description: "Appel à l'épargne française à 4%.",
        effects: { popularity: 8, budget: 4, debt: -2, cohesion: 5, authority: 4 },
        hiddenEffects: { foreignDependence: -8, peopleFatigue: -3 },
        consequence: "12Mds collectés en 3 semaines. Geste fort.",
        fulfillsPromise: ["sovereignty"],
      },
      {
        id: "c",
        label: "Ne pas réagir publiquement",
        description: "Laisser les marchés respirer.",
        effects: { economy: -5, debt: 5, authority: -4 },
        hiddenEffects: { scandalRisk: 5, oppositionPower: 5 },
        consequence: "L'attaque s'amplifie. Bercy passe deux nuits blanches.",
      },
    ],
  },
  {
    id: "ev_imf_audit",
    category: "economy",
    title: "Le FMI propose un « audit de soutenabilité »",
    context:
      "Le directeur général appelle au téléphone. Une mission d'évaluation veut s'installer à Bercy.",
    source: "FMI — communication confidentielle",
    choices: [
      {
        id: "a",
        label: "Accepter, montrer patte blanche",
        description: "Transparence totale.",
        effects: { economy: 4, debt: -2, diplomacy: 5, authority: -6 },
        hiddenEffects: { foreignDependence: 10, scandalRisk: 6, oppositionPower: 6 },
        consequence: "Les taux baissent. La presse parle de « tutelle ».",
        breaksPromise: ["sovereignty"],
        revealsHiddenGauge: "foreignDependence",
      },
      {
        id: "b",
        label: "Refuser publiquement",
        description: "« La France n'est pas la Grèce. »",
        effects: { popularity: 6, authority: 8, economy: -4, debt: 4, diplomacy: -4 },
        hiddenEffects: { foreignDependence: -8, peopleFatigue: -3 },
        consequence: "Geste de fierté. Les agences de notation s'agitent.",
        fulfillsPromise: ["sovereignty"],
      },
      {
        id: "c",
        label: "Audit interne mené par la Cour des Comptes",
        description: "Compromis crédible.",
        effects: { economy: 2, budget: 2, authority: 3, cohesion: 3 },
        hiddenEffects: { corruption: -4, scandalRisk: -2 },
        consequence: "Solution intermédiaire bien accueillie.",
      },
    ],
  },
  {
    id: "ev_bce_rate_hike",
    category: "economy",
    title: "La BCE remonte ses taux à 5,5%",
    context:
      "Décision surprise contre une inflation qui résiste. Le coût de la dette française flambe.",
    source: "BCE — conférence Lagarde",
    choices: [
      {
        id: "a",
        label: "Critiquer publiquement Francfort",
        description: "Briser le tabou de l'indépendance.",
        effects: { popularity: 4, authority: 5, economy: -4, debt: 4, diplomacy: -8 },
        hiddenEffects: { foreignDependence: -4, oppositionPower: 4 },
        consequence: "Berlin vous reproche. Vos électeurs apprécient.",
        breaksPromise: ["europe"],
      },
      {
        id: "b",
        label: "Soutenir et durcir le budget en conséquence",
        description: "Discipline européenne assumée.",
        effects: { popularity: -8, economy: 2, budget: 5, debt: -2, cohesion: -3 },
        hiddenEffects: { peopleFatigue: 6, oppositionPower: 4 },
        consequence: "Berlin vous félicite. La gauche fulmine.",
        fulfillsPromise: ["europe"],
      },
    ],
  },
  {
    id: "ev_deficit_6pct",
    category: "economy",
    title: "Déficit public dépasse 6% du PIB",
    context:
      "Bruxelles déclenche la procédure pour déficit excessif.",
    source: "Eurostat — chiffres trimestriels",
    choices: [
      {
        id: "a",
        label: "Plan crédible 4 ans pour revenir à 3%",
        description: "Trajectoire négociée avec la Commission.",
        effects: { popularity: -6, economy: 3, budget: 8, debt: -3, cohesion: -4 },
        hiddenEffects: { peopleFatigue: 5, oppositionPower: 3 },
        consequence: "Crédit politique européen restauré, pays sous tension.",
        fulfillsPromise: ["europe"],
        reform: "economy",
      },
      {
        id: "b",
        label: "Demander une exception « investissement vert »",
        description: "Sortir le climat des règles budgétaires.",
        effects: { popularity: 4, ecology: 6, debt: 2, diplomacy: -2 },
        hiddenEffects: { peopleFatigue: -3, foreignDependence: 3 },
        consequence: "L'Europe écoute, ne dit ni oui ni non.",
        fulfillsPromise: ["ecology"],
      },
      {
        id: "c",
        label: "Ignorer la procédure",
        description: "Laisser pourrir, on verra dans 3 ans.",
        effects: { economy: -3, debt: 6, diplomacy: -8, authority: -4 },
        hiddenEffects: { scandalRisk: 6, foreignDependence: 5, oppositionPower: 5 },
        consequence: "Une crise est en germe. Ce sera pour plus tard.",
        schedulesEvent: { eventId: "ev_delayed_debt_crisis", delay: 4 },
      },
    ],
  },
  {
    id: "ev_germany_bailout",
    category: "diplomacy",
    title: "Berlin propose un mécanisme d'aide « solidaire »",
    context:
      "Le chancelier offre 30Mds à conditions strictes : surveillance accrue, réforme retraites.",
    source: "Élysée — appel direct du chancelier",
    choices: [
      {
        id: "a",
        label: "Accepter publiquement",
        description: "Acter la solidarité européenne.",
        effects: { economy: 5, budget: 6, debt: -4, diplomacy: 8, authority: -6 },
        hiddenEffects: { foreignDependence: 14, oppositionPower: 8, scandalRisk: 4 },
        consequence: "Les taux respirent. La France devient « la nouvelle Grèce ».",
        breaksPromise: ["sovereignty"],
        revealsHiddenGauge: "foreignDependence",
      },
      {
        id: "b",
        label: "Refuser, faire seul",
        description: "Affirmer la souveraineté budgétaire.",
        effects: { popularity: 8, authority: 10, economy: -6, debt: 6, diplomacy: -6 },
        hiddenEffects: { foreignDependence: -8, peopleFatigue: -3 },
        consequence: "Geste de fierté. Bercy travaille double.",
        fulfillsPromise: ["sovereignty"],
      },
    ],
  },
  {
    id: "ev_gold_sale",
    category: "economy",
    title: "Vendre 200t d'or de la Banque de France ?",
    context:
      "L'idée circule pour combler une partie du déficit. Les puristes hurlent.",
    source: "Note interne BdF",
    choices: [
      {
        id: "a",
        label: "Vendre — produit estimé 14Mds",
        description: "Recette one-shot pour soulager le budget.",
        effects: { popularity: -8, budget: 10, debt: -3, authority: -4 },
        hiddenEffects: { foreignDependence: 8, scandalRisk: 6, oppositionPower: 6 },
        consequence: "Les marchés saluent. La presse parle de « bijoux de famille ».",
        breaksPromise: ["sovereignty"],
      },
      {
        id: "b",
        label: "Refuser catégoriquement",
        description: "L'or reste un trésor stratégique.",
        effects: { popularity: 6, authority: 5, debt: 2, cohesion: 3 },
        hiddenEffects: { foreignDependence: -3, peopleFatigue: -2 },
        consequence: "Geste symbolique apprécié.",
        fulfillsPromise: ["sovereignty"],
      },
    ],
  },
  {
    id: "ev_pension_age_67",
    category: "social",
    title: "Conseil d'orientation : reculer l'âge à 67 ans",
    context:
      "Pour stabiliser la dette publique, le COR propose un nouveau report. Les syndicats appellent à la grève générale.",
    source: "Conseil d'orientation des retraites",
    choices: [
      {
        id: "a",
        label: "Reculer l'âge par 49.3",
        description: "Décision rapide, passage en force.",
        effects: { popularity: -16, economy: 4, authority: 6, budget: 10, debt: -5, cohesion: -10 },
        hiddenEffects: { peopleFatigue: 14, radicalization: 10, oppositionPower: 12 },
        consequence: "Le pays se fige. La cote chute brutalement.",
        breaksPromise: ["social_justice"],
        regionEffects: [
          { region: "hdf", tension: 8 },
          { region: "occitanie", tension: 6 },
        ],
        oppositionEffect: 10,
        schedulesEvent: { eventId: "ev_delayed_riot", delay: 2 },
        reform: "social",
      },
      {
        id: "b",
        label: "Référendum",
        description: "Faire trancher les Français.",
        effects: { popularity: 4, authority: 3, cohesion: 3, debt: 3 },
        hiddenEffects: { peopleFatigue: -3, oppositionPower: -3 },
        consequence: "Démocratie directe. Issue incertaine.",
        fulfillsPromise: ["social_justice"],
      },
      {
        id: "c",
        label: "Renoncer, étudier d'autres pistes",
        description: "Cotisations + lutte évasion.",
        effects: { popularity: 8, economy: -3, budget: -4, debt: 3, cohesion: 5 },
        hiddenEffects: { peopleFatigue: -5, oppositionPower: -3 },
        consequence: "Dossier enterré. Le déficit reste.",
        fulfillsPromise: ["social_justice"],
      },
    ],
  },

  // ============================================================
  // CYBER — 10 nouveaux
  // ============================================================
  {
    id: "ev_ransomware_cities",
    category: "cyber",
    title: "Rançongiciel paralyse 200 mairies",
    context:
      "État civil, cantines, urbanisme : tout est bloqué. Les hackers réclament 80M€ en cryptos.",
    source: "ANSSI — niveau orange",
    choices: [
      {
        id: "a",
        label: "Cellule nationale d'urgence + remédiation gratuite",
        description: "L'État met l'ANSSI à disposition.",
        effects: { popularity: 6, security: 6, authority: 4, budget: -5, cohesion: 4 },
        hiddenEffects: { cyberRisk: -10, foreignDependence: -3 },
        consequence: "98% des mairies restaurées en deux semaines.",
        ministerEffects: [{ position: "interior", competence: 5, loyalty: 4 }],
      },
      {
        id: "b",
        label: "Laisser chaque commune se débrouiller",
        description: "Décentralisation assumée.",
        effects: { popularity: -10, authority: -5, cohesion: -6, regionalStability: -6 },
        hiddenEffects: { cyberRisk: 8, peopleFatigue: 8, oppositionPower: 5 },
        consequence: "Petites communes paralysées des mois.",
        regionEffects: [
          { region: "auvergne", tension: 5 },
          { region: "bretagne", tension: 4 },
        ],
      },
      {
        id: "c",
        label: "Payer une partie de la rançon en sous-main",
        description: "Solution rapide mais immorale.",
        effects: { security: 4, budget: -8, authority: -3 },
        hiddenEffects: { scandalRisk: 18, corruption: 10, cyberRisk: 6 },
        consequence: "Les services repartent. Une fuite est inévitable.",
        hidesScandal: {
          title: "Scandale : l'État a payé les hackers",
          popularityDamage: 16,
          authorityDamage: 8,
          mediaDamage: 12,
          revealIn: 5,
        },
      },
    ],
  },
  {
    id: "ev_deepfake_president",
    category: "cyber",
    title: "Deepfake : « le président annonce la guerre à la Russie »",
    context:
      "Une vidéo ultra-réaliste circule sur tous les réseaux. La Bourse plonge en quelques minutes.",
    source: "Cellule contre-influence — DGSI",
    choices: [
      {
        id: "a",
        label: "Démenti immédiat en direct",
        description: "Apparition à l'Élysée dans l'heure.",
        effects: { popularity: 4, authority: 6, security: 4, economy: 3 },
        hiddenEffects: { cyberRisk: 4, scandalRisk: -4 },
        consequence: "Vous reprenez la main. La crise dure 6 heures.",
        mediaEffect: 4,
      },
      {
        id: "b",
        label: "Loi-cadre IA d'urgence + sanctions plateformes",
        description: "Riposte régulatoire majeure.",
        effects: { popularity: 8, authority: 8, security: 6, cohesion: 5, diplomacy: -3 },
        hiddenEffects: { cyberRisk: -8, foreignDependence: -4, oppositionPower: -3 },
        consequence: "Bruxelles veut copier votre texte.",
        fulfillsPromise: ["security", "sovereignty", "europe"],
      },
      {
        id: "c",
        label: "Ne rien dire, attendre que ça passe",
        description: "Pari du silence.",
        effects: { popularity: -10, authority: -8, economy: -5, cohesion: -4 },
        hiddenEffects: { cyberRisk: 10, scandalRisk: 8, oppositionPower: 6 },
        consequence: "La rumeur vit sa vie pendant 36h. Marchés cassés.",
      },
    ],
  },
  {
    id: "ev_secu_data_leak",
    category: "cyber",
    title: "Fuite massive : données médicales de 50M de Français",
    context:
      "Numéros de sécu, pathologies, traitements en clair sur le darknet.",
    source: "CNIL — alerte rouge",
    choices: [
      {
        id: "a",
        label: "Indemnisation et notification de chaque citoyen",
        description: "Plan transparence + 100€ symboliques.",
        effects: { popularity: 4, budget: -8, authority: 3, health: -3, cohesion: 3 },
        hiddenEffects: { cyberRisk: -6, scandalRisk: -8, peopleFatigue: -3 },
        consequence: "5Mds de coût mais la confiance se reconstruit.",
        revealsHiddenGauge: "cyberRisk",
      },
      {
        id: "b",
        label: "Limogeage du directeur de la Sécu",
        description: "Faire un exemple.",
        effects: { popularity: 4, authority: 4, cohesion: 2 },
        hiddenEffects: { scandalRisk: -3, peopleFatigue: 3 },
        consequence: "Bouc émissaire trouvé. Système toujours fragile.",
      },
      {
        id: "c",
        label: "Minimiser, parler de « cyberattaque étatique »",
        description: "Attribution à un acteur étranger.",
        effects: { popularity: -6, security: 3, diplomacy: -4 },
        hiddenEffects: { scandalRisk: 12, cyberRisk: 6, foreignDependence: 4 },
        consequence: "Le récit tient deux semaines.",
        hidesScandal: {
          title: "Scandale : la fuite Sécu n'avait rien d'étatique",
          popularityDamage: 14,
          authorityDamage: 6,
          mediaDamage: 10,
          revealIn: 4,
        },
      },
      {
        id: "d",
        label: "Re-chiffrer, isoler, traquer la fuite à la source",
        description:
          "Notre architecture cyber permet de tracer l'origine, colmater, et certifier publiquement le nouveau périmètre en 48h.",
        effects: {
          popularity: 8,
          security: 12,
          authority: 6,
          cohesion: 4,
          budget: -3,
        },
        hiddenEffects: { cyberRisk: -12, scandalRisk: -10, peopleFatigue: -4 },
        consequence:
          "L'auteur est identifié, les fichiers retirés des darknets, la confiance restaurée. Démonstration de souveraineté numérique.",
        revealsHiddenGauge: "cyberRisk",
        fulfillsPromise: ["sovereignty"],
        requiresTech: "cyber_security",
      },
    ],
  },
  {
    id: "ev_nuclear_intrusion",
    category: "cyber",
    title: "Intrusion détectée dans le réseau d'une centrale nucléaire",
    context:
      "Pas de prise de contrôle, mais un accès au système de supervision a été acquis. Origine probable : Chine.",
    source: "EDF + ANSSI — note classifiée",
    choices: [
      {
        id: "a",
        label: "Fermer temporairement les 4 réacteurs concernés",
        description: "Précaution maximale, perte d'électricité.",
        effects: { security: 8, popularity: -4, economy: -6, budget: -4, ecology: 3 },
        hiddenEffects: { cyberRisk: -10, foreignDependence: 4 },
        consequence: "Coupures localisées. Geste salué par les experts.",
      },
      {
        id: "b",
        label: "Maintenir + audit cyber complet en marche",
        description: "Opération en parallèle de la production.",
        effects: { security: 4, economy: 2, authority: 3 },
        hiddenEffects: { cyberRisk: 4, scandalRisk: 4 },
        consequence: "Pari assumé. Les ingénieurs dorment mal.",
      },
      {
        id: "c",
        label: "Riposte cyber offensive contre les serveurs identifiés",
        description: "Réponse asymétrique dissuasive.",
        effects: { security: 10, authority: 8, diplomacy: -10 },
        hiddenEffects: { cyberRisk: -6, foreignDependence: -4, scandalRisk: 8 },
        consequence: "Pékin proteste. Les experts vous applaudissent.",
        fulfillsPromise: ["sovereignty", "security"],
      },
    ],
  },
  {
    id: "ev_telecom_outage",
    category: "cyber",
    title: "Panne géante : Orange et SFR HS pendant 12h",
    context:
      "Origine technique ou attaque : flou. Les hôpitaux et urgences fonctionnent en mode dégradé.",
    source: "Arcep — communication d'urgence",
    choices: [
      {
        id: "a",
        label: "Réquisitionner le réseau militaire pour les services vitaux",
        description: "Continuité de l'État absolue.",
        effects: { security: 6, authority: 6, health: 4, budget: -3 },
        hiddenEffects: { cyberRisk: -4, foreignDependence: -3 },
        consequence: "Solution efficace, débat sur militarisation.",
      },
      {
        id: "b",
        label: "Infliger 500M€ d'amende à Orange",
        description: "Sanction financière exemplaire.",
        effects: { popularity: 4, budget: 5, economy: -3, authority: 3 },
        hiddenEffects: { corruption: -4, scandalRisk: -2 },
        consequence: "Les opérateurs comprennent le message.",
      },
    ],
  },
  {
    id: "ev_gps_jamming",
    category: "cyber",
    title: "Brouillage GPS persistant en Méditerranée",
    context:
      "Les navires civils sont déroutés. Les pêcheurs corses sont en colère, les ferries annulés.",
    source: "Marine nationale — bulletin opérationnel",
    choices: [
      {
        id: "a",
        label: "Déployer Galileo militaire renforcé",
        description: "Activer le service public chiffré européen.",
        effects: { security: 8, diplomacy: 5, budget: -5 },
        hiddenEffects: { foreignDependence: -8, cyberRisk: -5 },
        consequence: "La navigation reprend. Bruxelles applaudit.",
        fulfillsPromise: ["sovereignty", "europe"],
      },
      {
        id: "b",
        label: "Plainte ONU et sanctions diplomatiques",
        description: "Voie pacifique, lente.",
        effects: { diplomacy: 3, authority: -3 },
        hiddenEffects: { peopleFatigue: 4, oppositionPower: 3 },
        consequence: "L'ONU promet une enquête sous 6 mois.",
      },
      {
        id: "c",
        label: "Riposte cyber sur les émetteurs identifiés",
        description: "Action discrète, irréversible.",
        effects: { security: 10, authority: 6, diplomacy: -8 },
        hiddenEffects: { cyberRisk: -8, scandalRisk: 8 },
        consequence: "Les brouilleurs s'éteignent. Personne ne saura officiellement.",
      },
    ],
  },
  {
    id: "ev_elysee_breach",
    category: "cyber",
    title: "Intrusion dans le réseau de l'Élysée",
    context:
      "Plusieurs notes confidentielles sur la stratégie indo-pacifique ont fuité. APT chinois suspecté.",
    source: "DGSI — rapport flash",
    choices: [
      {
        id: "a",
        label: "Audit cyber complet + isolement du réseau",
        description: "Reconstruction de zéro pendant 90 jours.",
        effects: { security: 8, authority: 4, budget: -6 },
        hiddenEffects: { cyberRisk: -12, scandalRisk: -4 },
        consequence: "L'Élysée tourne en mode dégradé deux mois.",
      },
      {
        id: "b",
        label: "Convoquer l'ambassadeur de Chine",
        description: "Officialiser l'incident.",
        effects: { authority: 5, diplomacy: -8 },
        hiddenEffects: { foreignDependence: -3 },
        consequence: "Pékin nie en bloc. La presse spécule.",
      },
      {
        id: "c",
        label: "Étouffer l'incident",
        description: "Aucune communication.",
        effects: { authority: -2 },
        hiddenEffects: { cyberRisk: 10, scandalRisk: 14, corruption: 5 },
        consequence: "L'incident reviendra. Forcément.",
        hidesScandal: {
          title: "Scandale : l'Élysée piraté en silence",
          popularityDamage: 12,
          authorityDamage: 10,
          mediaDamage: 8,
          revealIn: 5,
        },
      },
    ],
  },
  {
    id: "ev_election_meddling",
    category: "cyber",
    title: "Ingérence dans les élections municipales",
    context:
      "Bots et faux comptes ont saturé les réseaux pendant 10 jours. 3 grandes villes ont basculé.",
    source: "Viginum — rapport public",
    choices: [
      {
        id: "a",
        label: "Annuler les élections concernées",
        description: "Décision sans précédent.",
        effects: { popularity: -8, authority: 8, security: 5, cohesion: -8 },
        hiddenEffects: { oppositionPower: 8, scandalRisk: 6 },
        consequence: "Crise constitutionnelle ouverte.",
      },
      {
        id: "b",
        label: "Bloquer les plateformes responsables 30 jours",
        description: "Sanction technique.",
        effects: { popularity: 4, authority: 6, security: 4, diplomacy: -3 },
        hiddenEffects: { cyberRisk: -5, foreignDependence: -3 },
        consequence: "Les utilisateurs grognent, l'idée fait école.",
        fulfillsPromise: ["security", "sovereignty"],
      },
      {
        id: "c",
        label: "Loi anti-ingérence + Viginum renforcé",
        description: "Cadre stable, action ciblée.",
        effects: { popularity: 6, authority: 5, security: 8, cohesion: 4 },
        hiddenEffects: { cyberRisk: -8, oppositionPower: -3 },
        consequence: "Cadre juridique adopté en 6 mois.",
        fulfillsPromise: ["security"],
      },
    ],
  },
  {
    id: "ev_quantum_break",
    category: "cyber",
    title: "Rumeur : un acteur chinois a cassé RSA",
    context:
      "Si confirmé, toute la cryptographie mondiale s'effondre. Les banques et l'État sont vulnérables.",
    source: "INRIA + DGSE",
    choices: [
      {
        id: "a",
        label: "Plan post-quantique d'urgence (10Mds)",
        description: "Migrer toutes les infrastructures critiques.",
        effects: { security: 10, authority: 6, budget: -15, debt: 5 },
        hiddenEffects: { cyberRisk: -15, foreignDependence: -8 },
        consequence: "Effort historique. La France devient référence.",
        fulfillsPromise: ["sovereignty", "security", "industry"],
      },
      {
        id: "b",
        label: "Attendre la confirmation scientifique",
        description: "Pari du temps.",
        effects: { economy: 2, security: -3 },
        hiddenEffects: { cyberRisk: 12, scandalRisk: 5 },
        consequence: "Les semaines passent. L'inquiétude monte.",
      },
    ],
  },
  {
    id: "ev_ai_news_factory",
    category: "media",
    title: "Découverte d'une usine de fake news IA",
    context:
      "300 sites pro-Kremlin générés automatiquement, 8M de vues mensuelles, basés en Roumanie.",
    source: "Viginum + Reporters sans frontières",
    choices: [
      {
        id: "a",
        label: "Saisir Bruxelles : sanctions paneuropéennes",
        description: "Approche multilatérale.",
        effects: { popularity: 4, security: 5, diplomacy: 6, cohesion: 3 },
        hiddenEffects: { cyberRisk: -6, oppositionPower: -3 },
        consequence: "L'UE bouge en 4 mois. Le réseau est démantelé.",
        fulfillsPromise: ["europe", "security"],
      },
      {
        id: "b",
        label: "Bloquer les sites au niveau DNS français",
        description: "Solution rapide, juridiquement risquée.",
        effects: { popularity: 6, authority: 5, security: 6 },
        hiddenEffects: { cyberRisk: -4, scandalRisk: 4 },
        consequence: "Court-circuit immédiat. Procès en vue.",
      },
      {
        id: "c",
        label: "Contre-offensive informationnelle française",
        description: "Créer son propre réseau pro-français.",
        effects: { security: 4, authority: 4, diplomacy: -3 },
        hiddenEffects: { scandalRisk: 12, cyberRisk: 4, corruption: 6 },
        consequence: "Vous jouez avec le feu. La presse vous traque.",
        hidesScandal: {
          title: "Scandale : la France a sa propre ferme à trolls",
          popularityDamage: 18,
          authorityDamage: 8,
          mediaDamage: 14,
          revealIn: 6,
        },
      },
    ],
  },

  // ============================================================
  // CLIMAT / ÉCOLOGIE — 10 nouveaux
  // ============================================================
  {
    id: "ev_heatwave_50",
    category: "ecology",
    title: "Canicule historique : 50°C à Toulouse",
    context:
      "11 jours consécutifs au-dessus de 42°C. Les morgues sont saturées dans 4 départements.",
    source: "Santé publique France",
    choices: [
      {
        id: "a",
        label: "Plan canicule de guerre : armée + climatiseurs publics",
        description: "Mobilisation nationale, écoles fermées.",
        effects: { popularity: 8, health: 8, ecology: -3, budget: -8, authority: 5 },
        hiddenEffects: { peopleFatigue: -5, scandalRisk: -4 },
        consequence: "Le bilan reste lourd, mais l'État a tenu.",
        regionEffects: [
          { region: "occitanie", tension: -5 },
          { region: "paca", tension: -5 },
        ],
        fulfillsPromise: ["ecology"],
      },
      {
        id: "b",
        label: "Limiter à des consignes individuelles",
        description: "Discours d'autoresponsabilité.",
        effects: { popularity: -12, health: -8, authority: -5, cohesion: -6 },
        hiddenEffects: { peopleFatigue: 8, radicalization: 5, oppositionPower: 6 },
        consequence: "Bilan : 12 000 morts. La presse ne pardonne pas.",
        regionEffects: [{ region: "paca", tension: 8 }],
      },
      {
        id: "c",
        label: "Plan + accélération de la rénovation thermique",
        description: "Réponse de fond + court terme.",
        effects: { popularity: 6, health: 4, ecology: 6, economy: 3, budget: -10, debt: 4 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Investissement massif. La France s'arme pour l'avenir.",
        fulfillsPromise: ["ecology", "industry"],
      },
    ],
  },
  {
    id: "ev_landes_fires",
    category: "ecology",
    title: "Méga-feu dans les Landes : 80 000 hectares partis",
    context:
      "Le plus grand incendie depuis 1949. Les renforts européens arrivent au compte-gouttes.",
    source: "SDIS Gironde + Sécurité civile",
    choices: [
      {
        id: "a",
        label: "Réquisitionner Canadairs étrangers",
        description: "Appel direct à Madrid, Athènes, Rome.",
        effects: { popularity: 8, security: 4, ecology: 5, diplomacy: 4, budget: -3 },
        hiddenEffects: { foreignDependence: 4, peopleFatigue: -4 },
        consequence: "20 Canadairs supplémentaires. Le feu est maîtrisé.",
        fulfillsPromise: ["europe", "ecology"],
      },
      {
        id: "b",
        label: "Plan Canadairs souverain (12 appareils en 5 ans)",
        description: "Annonce de long terme, financement à trouver.",
        effects: { popularity: 4, ecology: 6, budget: -10, debt: 4, authority: 4 },
        hiddenEffects: { foreignDependence: -8, oppositionPower: -3 },
        consequence: "Geste structurant. Le feu, lui, brûle encore.",
        fulfillsPromise: ["sovereignty", "ecology", "industry"],
      },
      {
        id: "c",
        label: "Moyens existants seulement",
        description: "« Faisons confiance à nos pompiers. »",
        effects: { popularity: -10, ecology: -8, security: -4, regionalStability: -5 },
        hiddenEffects: { peopleFatigue: 8, oppositionPower: 5 },
        consequence: "Les villages tombent un par un. Image catastrophique.",
        regionEffects: [{ region: "occitanie", tension: 6 }],
      },
    ],
  },
  {
    id: "ev_camargue_flood",
    category: "ecology",
    title: "Submersion marine en Camargue",
    context:
      "Une tempête couplée à une marée historique inonde 30 km². Les rizières sont perdues.",
    source: "Préfecture Bouches-du-Rhône",
    choices: [
      {
        id: "a",
        label: "Plan digues + relocalisation volontaire",
        description: "10 ans de chantier.",
        effects: { popularity: 5, ecology: 6, economy: -3, budget: -12, debt: 5, regionalStability: 5 },
        hiddenEffects: { peopleFatigue: -3, oppositionPower: -3 },
        consequence: "Investissement structurant.",
        fulfillsPromise: ["ecology"],
        regionEffects: [{ region: "paca", tension: -4 }],
      },
      {
        id: "b",
        label: "Indemnisation ponctuelle, on attend la prochaine",
        description: "Doctrine du « cas par cas ».",
        effects: { popularity: -6, budget: -4, regionalStability: -6 },
        hiddenEffects: { peopleFatigue: 6, oppositionPower: 4 },
        consequence: "Les habitants se sentent abandonnés.",
        regionEffects: [{ region: "paca", tension: 6 }],
      },
    ],
  },
  {
    id: "ev_glacier_collapse",
    category: "ecology",
    title: "Effondrement d'un sérac sur le Mont-Blanc",
    context:
      "8 alpinistes morts. Un nouveau pan menace de tomber sur la vallée.",
    source: "PGHM Chamonix",
    choices: [
      {
        id: "a",
        label: "Évacuation préventive de la vallée + interdiction du massif",
        description: "Précaution maximale.",
        effects: { popularity: 3, security: 6, ecology: 4, economy: -5, regionalStability: -3 },
        hiddenEffects: { peopleFatigue: 3, scandalRisk: -3 },
        consequence: "Les communes touristiques pleurent.",
        regionEffects: [{ region: "auvergne", tension: 4 }],
      },
      {
        id: "b",
        label: "Étude scientifique, accès maintenu",
        description: "Liberté individuelle.",
        effects: { popularity: -4, security: -3, economy: 2 },
        hiddenEffects: { scandalRisk: 8, peopleFatigue: 3 },
        consequence: "Risque assumé. Les guides sont divisés.",
      },
    ],
  },
  {
    id: "ev_vine_frost",
    category: "agriculture",
    title: "Gel tardif : 60% des vignobles touchés",
    context:
      "Bordeaux, Bourgogne, Champagne décimés. Les viticulteurs réclament l'état de catastrophe naturelle.",
    source: "FNSEA + Comité interprofessionnel",
    choices: [
      {
        id: "a",
        label: "Calamité agricole : 1,2Md€ d'aides",
        description: "Soutien massif et rapide.",
        effects: { popularity: 5, economy: -2, budget: -8, debt: 3, regionalStability: 5 },
        hiddenEffects: { peopleFatigue: -3, corruption: 3 },
        consequence: "La filière respire.",
        regionEffects: [
          { region: "auvergne", tension: -3 },
          { region: "grand_est", tension: -3 },
        ],
        fulfillsPromise: ["industry"],
      },
      {
        id: "b",
        label: "Aides ciblées + accélérer assurance climat",
        description: "Court terme + structure.",
        effects: { popularity: 3, ecology: 3, budget: -4, regionalStability: 3 },
        hiddenEffects: { peopleFatigue: -2 },
        consequence: "Solution durable, accueil mitigé.",
        fulfillsPromise: ["ecology"],
      },
      {
        id: "c",
        label: "Refus : « le marché s'adapte »",
        description: "Doctrine libérale.",
        effects: { popularity: -10, economy: 2, cohesion: -5, regionalStability: -8 },
        hiddenEffects: { radicalization: 6, peopleFatigue: 8, oppositionPower: 6 },
        consequence: "Tracteurs sur les ronds-points sous 48h.",
        breaksPromise: ["industry"],
        regionEffects: [
          { region: "grand_est", tension: 6 },
          { region: "auvergne", tension: 5 },
        ],
      },
    ],
  },
  {
    id: "ev_cop31",
    category: "ecology",
    title: "COP31 à Brasilia — jeux décisifs",
    context:
      "Engagements de réduction à -65% en 2035. La France doit prendre position.",
    source: "Quai d'Orsay + Ministère de la Transition",
    choices: [
      {
        id: "a",
        label: "S'engager au-delà : -70% d'ici 2035",
        description: "Leadership climatique radical.",
        effects: { popularity: 6, ecology: 12, economy: -6, diplomacy: 8, budget: -8, debt: 4 },
        hiddenEffects: { peopleFatigue: 5, oppositionPower: 4 },
        consequence: "Standing ovation à Brasilia. Industrie hostile.",
        fulfillsPromise: ["ecology", "europe"],
      },
      {
        id: "b",
        label: "Aligner sur l'UE (-60%)",
        description: "Pas de zèle.",
        effects: { ecology: 5, diplomacy: 3, economy: -2 },
        hiddenEffects: { foreignDependence: 3 },
        consequence: "Position prudente, conforme.",
        fulfillsPromise: ["europe"],
      },
      {
        id: "c",
        label: "Saboter l'accord en coulisse",
        description: "Protéger l'industrie nationale.",
        effects: { popularity: -6, economy: 5, ecology: -10, diplomacy: -10 },
        hiddenEffects: { scandalRisk: 12, corruption: 8, oppositionPower: 6 },
        consequence: "Greenpeace publie les notes confidentielles 6 mois plus tard.",
        breaksPromise: ["ecology", "europe"],
        hidesScandal: {
          title: "Scandale : la France a torpillé la COP31",
          popularityDamage: 16,
          authorityDamage: 8,
          mediaDamage: 14,
          revealIn: 6,
        },
      },
    ],
  },
  {
    id: "ev_germany_coal",
    category: "ecology",
    title: "L'Allemagne relance ses centrales charbon",
    context:
      "Pénurie de gaz oblige Berlin à rouvrir 12 centrales. La France subit le panache de pollution.",
    source: "Quai d'Orsay",
    choices: [
      {
        id: "a",
        label: "Saisir la CJUE pour pollution transfrontière",
        description: "Bras de fer juridique.",
        effects: { popularity: 5, ecology: 4, diplomacy: -8, authority: 5 },
        hiddenEffects: { foreignDependence: -3 },
        consequence: "Berlin furieux. Procédure de 3 ans.",
        fulfillsPromise: ["ecology", "sovereignty"],
      },
      {
        id: "b",
        label: "Proposer électricité nucléaire bon marché",
        description: "Solution coopérative.",
        effects: { economy: 5, ecology: 6, diplomacy: 6, budget: -3 },
        hiddenEffects: { foreignDependence: 3, oppositionPower: -3 },
        consequence: "Berlin accepte sous conditions.",
        fulfillsPromise: ["europe", "industry"],
      },
      {
        id: "c",
        label: "Ne pas s'en mêler",
        description: "Ce n'est pas notre problème.",
        effects: { ecology: -3, health: -3, popularity: -3 },
        hiddenEffects: { peopleFatigue: 4 },
        consequence: "Les associations climat fulminent.",
      },
    ],
  },
  {
    id: "ev_caribbean_hurricane",
    category: "ecology",
    title: "Cyclone catégorie 5 sur la Guadeloupe",
    context:
      "L'île est dévastée. 40% de la population sans toit. Réseau électrique HS.",
    source: "Préfecture Guadeloupe",
    choices: [
      {
        id: "a",
        label: "Plan d'urgence + reconstruction (3,5Mds)",
        description: "Engagement républicain total.",
        effects: { popularity: 8, authority: 6, budget: -15, debt: 6, regionalStability: 6, cohesion: 5 },
        hiddenEffects: { peopleFatigue: -5, oppositionPower: -3, radicalization: -3 },
        consequence: "Geste de la République salué.",
        regionEffects: [{ region: "outre_mer", tension: -10 }],
        fulfillsPromise: ["sovereignty", "social_justice"],
      },
      {
        id: "b",
        label: "Aide minimale, dépendance des assurances",
        description: "Logique strictement budgétaire.",
        effects: { popularity: -14, authority: -6, regionalStability: -10, cohesion: -6 },
        hiddenEffects: { peopleFatigue: 12, radicalization: 10, oppositionPower: 8 },
        consequence: "Indignation. L'idée d'indépendance regagne du terrain.",
        regionEffects: [{ region: "outre_mer", tension: 14 }],
      },
    ],
  },
  {
    id: "ev_paris_smog",
    category: "ecology",
    title: "Pic de pollution historique sur Paris",
    context:
      "PM2.5 à 280 µg/m³, hospitalisations en hausse. La ZFE est saturée.",
    source: "AirParif + ARS Île-de-France",
    choices: [
      {
        id: "a",
        label: "Circulation alternée + transports gratuits",
        description: "Mesure forte sous 24h.",
        effects: { popularity: 4, ecology: 6, health: 5, economy: -3, budget: -3 },
        hiddenEffects: { peopleFatigue: -3, oppositionPower: -3 },
        consequence: "L'air respire en 4 jours.",
        regionEffects: [{ region: "idf", tension: -3 }],
        fulfillsPromise: ["ecology"],
      },
      {
        id: "b",
        label: "Recommandations seulement",
        description: "Communication sans contrainte.",
        effects: { popularity: -3, health: -4, ecology: -3, cohesion: -3 },
        hiddenEffects: { peopleFatigue: 4, oppositionPower: 3 },
        consequence: "L'air reste irrespirable une semaine.",
      },
    ],
  },
  {
    id: "ev_alpine_landslide",
    category: "ecology",
    title: "Glissement de terrain massif dans les Alpes",
    context:
      "Un village de 600 habitants menacé. 12 morts déjà recensés.",
    source: "Préfecture des Hautes-Alpes",
    choices: [
      {
        id: "a",
        label: "Évacuation totale + reconstruction ailleurs",
        description: "Décision difficile mais responsable.",
        effects: { popularity: 3, security: 4, ecology: 3, budget: -8, regionalStability: 3 },
        hiddenEffects: { peopleFatigue: 3, oppositionPower: 3 },
        consequence: "Les habitants pleurent leur village.",
        regionEffects: [{ region: "auvergne", tension: -3 }],
      },
      {
        id: "b",
        label: "Confortement + retour rapide",
        description: "Pari technique.",
        effects: { popularity: 5, security: -3, budget: -4, regionalStability: 4 },
        hiddenEffects: { scandalRisk: 6, peopleFatigue: -3 },
        consequence: "Les habitants reviennent. Pari risqué.",
      },
    ],
  },

  // ============================================================
  // SANTÉ — 10 nouveaux
  // ============================================================
  {
    id: "ev_respiratory_outbreak",
    category: "health",
    title: "Épidémie respiratoire d'origine inconnue",
    context:
      "1 200 cas en 10 jours, 14 décès. L'OMS n'identifie pas encore le pathogène.",
    source: "Santé publique France + OMS",
    choices: [
      {
        id: "a",
        label: "Confinement régional + masque obligatoire",
        description: "Doctrine prudente Covid-style.",
        effects: { popularity: -10, health: 8, economy: -8, authority: 4, cohesion: -5 },
        hiddenEffects: { peopleFatigue: 12, oppositionPower: 8, radicalization: 5 },
        consequence: "L'épidémie est endiguée. Le pays craque.",
        regionEffects: [{ region: "grand_est", tension: 5 }],
      },
      {
        id: "b",
        label: "Mesures ciblées + recherche accélérée",
        description: "Approche scientifique pondérée.",
        effects: { popularity: 4, health: 5, economy: -3, budget: -6 },
        hiddenEffects: { peopleFatigue: -3, scandalRisk: 3 },
        consequence: "Vaccin identifié en 4 semaines.",
        fulfillsPromise: ["industry"],
      },
      {
        id: "c",
        label: "Minimiser, parler de « grippe saisonnière »",
        description: "Éviter la panique.",
        effects: { popularity: 3, health: -10, authority: -3 },
        hiddenEffects: { scandalRisk: 18, peopleFatigue: 6 },
        consequence: "L'épidémie s'étend. Le déni se retournera contre vous.",
        hidesScandal: {
          title: "Scandale : l'épidémie minimisée",
          popularityDamage: 18,
          authorityDamage: 8,
          mediaDamage: 14,
          revealIn: 4,
        },
      },
      {
        id: "d",
        label: "Bascule télé-soins immédiate via les hôpitaux numériques",
        description:
          "Le dossier patient unifié + télémédecine permet le triage à distance et libère les urgences sans confinement général.",
        effects: {
          popularity: 7,
          health: 12,
          authority: 5,
          economy: -1,
          budget: -3,
          cohesion: 3,
        },
        hiddenEffects: { peopleFatigue: -4, scandalRisk: -6 },
        consequence:
          "L'épidémie est circonscrite sans paralyser le pays. Démonstration éclatante de l'investissement sanitaire numérique.",
        fulfillsPromise: ["industry"],
        requiresTech: "digital_hospitals",
      },
    ],
  },
  {
    id: "ev_drug_shortage",
    category: "health",
    title: "Pénurie : 240 médicaments essentiels en rupture",
    context:
      "Antibiotiques, anticancéreux, traitements pédiatriques. La dépendance asiatique éclate au grand jour.",
    source: "ANSM",
    choices: [
      {
        id: "a",
        label: "Plan de relocalisation pharmaceutique (5Mds)",
        description: "Subventions massives, usines françaises.",
        effects: { popularity: 8, health: 6, economy: 5, budget: -10, debt: 4 },
        hiddenEffects: { foreignDependence: -10, oppositionPower: -3 },
        consequence: "5 ans avant les premiers effets. Geste structurant.",
        fulfillsPromise: ["sovereignty", "industry"],
      },
      {
        id: "b",
        label: "Réquisitionner les stocks privés",
        description: "État garde-stocks.",
        effects: { popularity: 4, health: 4, authority: 5, economy: -3 },
        hiddenEffects: { corruption: 4, scandalRisk: 4 },
        consequence: "Solution rapide, controversée juridiquement.",
      },
      {
        id: "c",
        label: "Rien : « les laboratoires gèrent »",
        description: "Confiance au marché.",
        effects: { popularity: -10, health: -8, cohesion: -5 },
        hiddenEffects: { foreignDependence: 8, peopleFatigue: 8, oppositionPower: 6 },
        consequence: "Les patients meurent par manque d'accès.",
      },
    ],
  },
  {
    id: "ev_er_closures",
    category: "health",
    title: "30 services d'urgences ferment cet été",
    context:
      "Manque de médecins. Les transferts deviennent vitaux.",
    source: "Fédération hospitalière de France",
    choices: [
      {
        id: "a",
        label: "Prime de garde +50% + réquisition d'internes",
        description: "Réponse massive.",
        effects: { popularity: 4, health: 6, budget: -8, authority: 4 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Tensions hospitalières apaisées 6 mois.",
      },
      {
        id: "b",
        label: "Régulation par téléphone d'abord, urgences au tri",
        description: "Lissage de la demande.",
        effects: { popularity: -3, health: -3, budget: 2 },
        hiddenEffects: { scandalRisk: 5, peopleFatigue: 4 },
        consequence: "Désorganisation. Un drame médiatisé arrive.",
      },
      {
        id: "c",
        label: "Loi obligeant les libéraux à des gardes",
        description: "Mesure très impopulaire chez les médecins.",
        effects: { popularity: 6, health: 8, economy: -3, authority: 5, cohesion: -4 },
        hiddenEffects: { oppositionPower: 5 },
        consequence: "Les médecins menacent de déconventionnement massif.",
      },
    ],
  },
  {
    id: "ev_intern_strike",
    category: "health",
    title: "Grève illimitée des internes en médecine",
    context:
      "Salaires, conditions de travail. Les hôpitaux fonctionnent en mode dégradé.",
    source: "ISNI + Inter-Syndicat National des Internes",
    choices: [
      {
        id: "a",
        label: "Hausse salariale + plafonnement temps de travail",
        description: "Concession majeure.",
        effects: { popularity: 6, health: 5, budget: -6, cohesion: 4, authority: -3 },
        hiddenEffects: { peopleFatigue: -5, oppositionPower: -4 },
        consequence: "Reprise du travail en 10 jours.",
        fulfillsPromise: ["social_justice"],
      },
      {
        id: "b",
        label: "Réquisition légale",
        description: "Imposer la fin de grève par décret.",
        effects: { popularity: -10, health: 4, authority: 8, cohesion: -8 },
        hiddenEffects: { peopleFatigue: 8, radicalization: 6, oppositionPower: 6 },
        consequence: "Les internes obtempèrent. Démissions massives à venir.",
      },
    ],
  },
  {
    id: "ev_implant_scandal",
    category: "scandal",
    title: "Scandale prothèses : 80 000 patientes affectées",
    context:
      "Implants défectueux d'un fabricant français. Le ministère savait depuis 2 ans.",
    source: "Le Monde + ANSM",
    choices: [
      {
        id: "a",
        label: "Enquête indépendante + retrait immédiat",
        description: "Transparence et action.",
        effects: { popularity: 5, health: 6, authority: 4, budget: -6, cohesion: 4 },
        hiddenEffects: { corruption: -8, scandalRisk: -10, peopleFatigue: -3 },
        consequence: "Crédibilité préservée. Bilan financier lourd.",
        fulfillsPromise: ["social_justice"],
        revealsHiddenGauge: "corruption",
      },
      {
        id: "b",
        label: "Ministre de la Santé en bouclier",
        description: "Renvoyer la pression.",
        effects: { popularity: -8, authority: -5, cohesion: -4, health: -3 },
        hiddenEffects: { scandalRisk: 14, corruption: 6, oppositionPower: 8 },
        consequence: "L'opinion vous trouve cynique.",
        breaksPromise: ["social_justice"],
      },
    ],
  },
  {
    id: "ev_medical_desert",
    category: "health",
    title: "10M de Français sans médecin traitant",
    context:
      "Le désert médical s'étend, particulièrement en zones rurales.",
    source: "DREES + Cour des Comptes",
    choices: [
      {
        id: "a",
        label: "Conventionnement régulé : interdiction d'installation en zone dense",
        description: "Mesure radicale anti-désert.",
        effects: { popularity: 6, health: 8, regionalStability: 5, authority: 5, cohesion: 4 },
        hiddenEffects: { oppositionPower: 4 },
        consequence: "Médecins libéraux protestent. Zones rurales gagnent.",
        fulfillsPromise: ["social_justice"],
        regionEffects: [{ region: "auvergne", tension: -5 }],
      },
      {
        id: "b",
        label: "Salariat hospitalier dans les déserts",
        description: "Embauches publiques massives.",
        effects: { popularity: 5, health: 5, budget: -10, debt: 4, regionalStability: 4 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Effort budgétaire considérable.",
        fulfillsPromise: ["social_justice", "industry"],
      },
      {
        id: "c",
        label: "Téléconsultation et bus médicaux",
        description: "Solutions techniques.",
        effects: { popularity: 2, health: 3, budget: -3 },
        hiddenEffects: { foreignDependence: 3 },
        consequence: "Mesure modeste mais visible.",
      },
    ],
  },
  {
    id: "ev_youth_suicide",
    category: "health",
    title: "Vague de suicides chez les adolescents",
    context:
      "+38% en 18 mois. Lien direct avec les réseaux sociaux selon experts.",
    source: "INSERM + Pédopsychiatres",
    choices: [
      {
        id: "a",
        label: "Interdire TikTok et Snap aux moins de 15 ans",
        description: "Mesure radicale, applicabilité difficile.",
        effects: { popularity: 6, health: 6, authority: 6, diplomacy: -3, cohesion: 4 },
        hiddenEffects: { foreignDependence: -3, oppositionPower: -3, cyberRisk: -4 },
        consequence: "Bruxelles intéressée. Les ados contournent.",
        fulfillsPromise: ["security", "education"],
      },
      {
        id: "b",
        label: "Plan santé mentale jeunes (4Mds)",
        description: "Effort de fond, recrutement de pédopsy.",
        effects: { popularity: 4, health: 8, budget: -10, debt: 4, cohesion: 5 },
        hiddenEffects: { peopleFatigue: -4 },
        consequence: "Premiers résultats dans 3 ans.",
        fulfillsPromise: ["social_justice", "education"],
      },
      {
        id: "c",
        label: "Campagne publique de sensibilisation",
        description: "Mesure légère.",
        effects: { popularity: -3, health: -3, cohesion: -3 },
        hiddenEffects: { peopleFatigue: 4, scandalRisk: 5 },
        consequence: "Les associations vous accusent d'inaction.",
      },
    ],
  },
  {
    id: "ev_vax_mandate",
    category: "health",
    title: "Vaccin obligatoire pour nouvel agent pathogène",
    context:
      "L'OMS recommande la vaccination universelle. La France hésite.",
    source: "Conseil scientifique",
    choices: [
      {
        id: "a",
        label: "Vaccination obligatoire par décret",
        description: "Doctrine 1902 réactivée.",
        effects: { popularity: -8, health: 10, authority: 6, cohesion: -6 },
        hiddenEffects: { radicalization: 10, peopleFatigue: 8, oppositionPower: 6 },
        consequence: "Couverture vaccinale 92%. Manifestations anti-vax.",
        regionEffects: [{ region: "occitanie", tension: 5 }],
      },
      {
        id: "b",
        label: "Recommandation forte sans obligation",
        description: "Liberté préservée.",
        effects: { popularity: 4, health: 4, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Couverture 68%. Position équilibrée.",
      },
      {
        id: "c",
        label: "Ne rien faire",
        description: "Question individuelle.",
        effects: { popularity: -3, health: -8, authority: -4 },
        hiddenEffects: { scandalRisk: 8, peopleFatigue: 5 },
        consequence: "Couverture 30%. Le pathogène circule.",
      },
    ],
  },
  {
    id: "ev_ai_diagnosis",
    category: "health",
    title: "IA diagnostic : 200 erreurs médicales recensées",
    context:
      "L'IA française MED-7 a fait 200 erreurs sur 4M de diagnostics. 23 décès liés.",
    source: "HAS + Ordre des médecins",
    choices: [
      {
        id: "a",
        label: "Suspendre MED-7 le temps d'un audit",
        description: "Précaution maximale.",
        effects: { popularity: 4, health: 4, economy: -3, budget: -2 },
        hiddenEffects: { cyberRisk: -5, scandalRisk: -6, foreignDependence: 5 },
        consequence: "Les hôpitaux reviennent au manuel. Délais explosent.",
      },
      {
        id: "b",
        label: "Maintenir avec contrôle médecin obligatoire",
        description: "IA en assistance, pas en décision.",
        effects: { popularity: 3, health: 5, economy: 3, authority: 4 },
        hiddenEffects: { cyberRisk: -3, scandalRisk: -3 },
        consequence: "Doctrine équilibrée. L'IA continue d'apprendre.",
        fulfillsPromise: ["industry", "sovereignty"],
      },
    ],
  },
  {
    id: "ev_mental_health_youth",
    category: "health",
    title: "Étude : 1 jeune sur 3 en détresse psychologique",
    context:
      "L'étude DREES alerte sur une génération en souffrance.",
    source: "DREES — étude longitudinale",
    choices: [
      {
        id: "a",
        label: "Mon Soutien Psy renforcé : 30 séances gratuites",
        description: "Doublement du dispositif.",
        effects: { popularity: 6, health: 6, budget: -8, debt: 3, cohesion: 4 },
        hiddenEffects: { peopleFatigue: -5 },
        consequence: "Demande explose. Délais corrects.",
        fulfillsPromise: ["social_justice", "education"],
      },
      {
        id: "b",
        label: "Prévention via éducation nationale",
        description: "Cours obligatoires de bien-être.",
        effects: { popularity: 3, health: 3, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Mesure structurelle, sans coût immédiat.",
        fulfillsPromise: ["education"],
      },
    ],
  },

  // ============================================================
  // ÉNERGIE — 8 nouveaux (catégorie "energy")
  // ============================================================
  {
    id: "ev_edf_winter_blackout",
    category: "energy",
    title: "EDF prévient : risque de blackout cet hiver",
    context:
      "Plusieurs réacteurs en maintenance prolongée. Le réseau pourrait manquer 8 GW au pic.",
    source: "RTE — bulletin Ecowatt rouge",
    choices: [
      {
        id: "a",
        label: "Coupures programmées par rotation",
        description: "Plan de délestage assumé.",
        effects: { popularity: -10, economy: -6, authority: 4, cohesion: -5 },
        hiddenEffects: { peopleFatigue: 8, oppositionPower: 6 },
        consequence: "Les Français pestent, la grille tient.",
      },
      {
        id: "b",
        label: "Importer électricité allemande à prix d'or",
        description: "Solution rapide, coûteuse, dépendante.",
        effects: { economy: 3, budget: -10, debt: 4, diplomacy: 3 },
        hiddenEffects: { foreignDependence: 12, scandalRisk: 4 },
        consequence: "Pas de coupures. La facture explose.",
        breaksPromise: ["sovereignty"],
      },
      {
        id: "c",
        label: "Plan sobriété + bonus chauffage à 19°",
        description: "Mobilisation citoyenne.",
        effects: { popularity: 5, ecology: 5, economy: -2, cohesion: 5 },
        hiddenEffects: { peopleFatigue: 3, oppositionPower: -3 },
        consequence: "Consommation -7%. Fierté nationale.",
        fulfillsPromise: ["ecology", "sovereignty"],
      },
    ],
  },
  {
    id: "ev_elec_price_spike",
    category: "energy",
    title: "Prix de l'électricité : +30% pour les ménages",
    context:
      "La hausse arrive en hiver. Une famille moyenne perd 600€ sur l'année.",
    source: "CRE — délibération",
    choices: [
      {
        id: "a",
        label: "Bouclier tarifaire prolongé (8Mds)",
        description: "Subvention massive de l'État.",
        effects: { popularity: 12, economy: 3, budget: -12, debt: 5, cohesion: 6 },
        hiddenEffects: { peopleFatigue: -8, corruption: 4, oppositionPower: -5 },
        consequence: "Les ménages soulagés, le déficit grossit.",
        fulfillsPromise: ["purchasing_power"],
      },
      {
        id: "b",
        label: "Chèque énergie ciblé (200€) pour 8M de ménages",
        description: "Aide ciblée modeste.",
        effects: { popularity: 4, budget: -4, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Mesure équilibrée, accueil tiède.",
        fulfillsPromise: ["social_justice"],
      },
      {
        id: "c",
        label: "Sortir de l'ARENH, libérer le marché",
        description: "Doctrine libérale.",
        effects: { popularity: -16, economy: 4, cohesion: -8, authority: -5 },
        hiddenEffects: { peopleFatigue: 12, radicalization: 8, oppositionPower: 10 },
        consequence: "Colère noire. Mouvements sociaux durables.",
        breaksPromise: ["purchasing_power", "social_justice"],
      },
    ],
  },
  {
    id: "ev_breton_dam",
    category: "energy",
    title: "Méga-barrage hydroélectrique en Bretagne",
    context:
      "Projet pour 800 MW. Les ZAD se forment, 6 communes contre.",
    source: "Préfecture Finistère",
    choices: [
      {
        id: "a",
        label: "Maintenir le projet, évacuer la ZAD",
        description: "Force publique mobilisée.",
        effects: { popularity: -6, ecology: -3, economy: 5, authority: 6, cohesion: -6, regionalStability: -6 },
        hiddenEffects: { radicalization: 8, oppositionPower: 5, peopleFatigue: 5 },
        consequence: "Affrontements. Le barrage avance.",
        regionEffects: [{ region: "bretagne", tension: 10 }],
        fulfillsPromise: ["industry"],
      },
      {
        id: "b",
        label: "Concertation publique, projet redessiné",
        description: "Voie démocratique longue.",
        effects: { popularity: 5, ecology: 3, cohesion: 4, regionalStability: 3 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Projet réduit à 400 MW. Bretagne apaisée.",
        regionEffects: [{ region: "bretagne", tension: -4 }],
        fulfillsPromise: ["ecology"],
      },
      {
        id: "c",
        label: "Abandonner",
        description: "Reculer face aux opposants.",
        effects: { popularity: 3, economy: -3, authority: -6 },
        hiddenEffects: { oppositionPower: 5, radicalization: -3 },
        consequence: "Les ZAD savourent leur victoire.",
        breaksPromise: ["industry"],
      },
    ],
  },
  {
    id: "ev_russian_gas_cut",
    category: "energy",
    title: "Moscou coupe le robinet de gaz",
    context:
      "Coupure brutale via Yamal. Les stocks tiennent 6 semaines.",
    source: "Kremlin — communiqué officiel",
    choices: [
      {
        id: "a",
        label: "Activer plan GNL : tankers américains et qataris",
        description: "Solution chère mais rapide.",
        effects: { economy: -3, budget: -10, debt: 4, security: 4, diplomacy: 3 },
        hiddenEffects: { foreignDependence: 8, peopleFatigue: 3 },
        consequence: "Gaz garanti, dépendance USA/Qatar accrue.",
      },
      {
        id: "b",
        label: "Sobriété énergétique massive",
        description: "Communication + restrictions.",
        effects: { popularity: 4, ecology: 6, economy: -4, cohesion: 4 },
        hiddenEffects: { foreignDependence: -5, peopleFatigue: 3 },
        consequence: "Consommation -12%. Fierté française.",
        fulfillsPromise: ["sovereignty", "ecology"],
      },
      {
        id: "c",
        label: "Négocier discrètement avec Moscou",
        description: "Concessions diplomatiques en échange.",
        effects: { economy: 4, diplomacy: -10, security: -5, authority: -6 },
        hiddenEffects: { scandalRisk: 14, foreignDependence: 10, corruption: 6 },
        consequence: "Le gaz revient. La presse et l'opposition vous attendent.",
        breaksPromise: ["sovereignty"],
        hidesScandal: {
          title: "Scandale : accord gazier secret avec Moscou",
          popularityDamage: 18,
          authorityDamage: 12,
          mediaDamage: 14,
          revealIn: 5,
        },
      },
    ],
  },
  {
    id: "ev_smr_breakthrough",
    category: "energy",
    title: "Percée des mini-réacteurs SMR français",
    context:
      "Nuward annonce un prototype validé. 6 sites possibles, 10Mds d'investissement.",
    source: "EDF + CEA",
    choices: [
      {
        id: "a",
        label: "Plan SMR national : 8 sites en 10 ans",
        description: "Pari industriel majeur.",
        effects: { popularity: 6, economy: 6, ecology: 5, budget: -12, debt: 6, authority: 5 },
        hiddenEffects: { foreignDependence: -10, oppositionPower: -3 },
        consequence: "L'industrie française renaît. Coût massif.",
        fulfillsPromise: ["sovereignty", "industry", "ecology"],
      },
      {
        id: "b",
        label: "Pilote unique en Bretagne",
        description: "Prudence industrielle.",
        effects: { economy: 3, ecology: 3, budget: -3 },
        hiddenEffects: { foreignDependence: -3 },
        consequence: "1 site validé. Lancement prudent.",
        regionEffects: [{ region: "bretagne", tension: 3 }],
      },
      {
        id: "c",
        label: "Vendre la techno à Westinghouse",
        description: "Recettes immédiates.",
        effects: { economy: 4, budget: 8, authority: -8 },
        hiddenEffects: { foreignDependence: 12, scandalRisk: 8 },
        consequence: "Cash immédiat, savoir-faire perdu.",
        breaksPromise: ["sovereignty", "industry"],
      },
    ],
  },
  {
    id: "ev_wind_referendum",
    category: "energy",
    title: "Référendum éolien : oui ou non aux nouveaux parcs ?",
    context:
      "Initiative parlementaire. Les opposants menacent de boycotter.",
    source: "Parlement — proposition de loi",
    choices: [
      {
        id: "a",
        label: "Organiser le référendum",
        description: "Démocratie directe, issue incertaine.",
        effects: { popularity: 4, authority: -3, cohesion: 3, budget: -3, economy: -3 },
        hiddenEffects: { peopleFatigue: -3, oppositionPower: 4, scandalRisk: 3 },
        consequence: "La campagne s'embrase, les investisseurs gèlent les projets ENR.",
        fulfillsPromise: ["ecology"],
      },
      {
        id: "b",
        label: "Bloquer la proposition",
        description: "Garder la main parlementaire.",
        effects: { popularity: -5, authority: 3, cohesion: -4, ecology: 3, economy: 2 },
        hiddenEffects: { peopleFatigue: 5, oppositionPower: 6 },
        consequence: "Accusations d'antidémocratisme. Les éoliennes avancent.",
        fulfillsPromise: ["industry"],
      },
    ],
  },
  {
    id: "ev_oil_strike",
    category: "energy",
    title: "Grève des raffineries : pénurie carburant",
    context:
      "8 raffineries sur 8 à l'arrêt. 1 station sur 3 est sèche.",
    source: "Ministère de l'Énergie",
    choices: [
      {
        id: "a",
        label: "Réquisition immédiate",
        description: "Décret + force publique.",
        effects: { popularity: -3, economy: 4, authority: 8, cohesion: -5 },
        hiddenEffects: { radicalization: 6, peopleFatigue: 4, oppositionPower: 5 },
        consequence: "Les pompes coulent. Les syndicats fulminent.",
        regionEffects: [{ region: "hdf", tension: 5 }],
        // Cascade : la réquisition tient à court terme mais grave
        // une rancœur syndicale qui va pourrir plusieurs secteurs.
        cascade: [
          {
            kind: "notice",
            delay: 2,
            label: "Les syndicats appellent à l'unité contre l'exécutif",
          },
          {
            kind: "gauge",
            delay: 3,
            label: "Grèves de solidarité dans les transports et l'énergie",
            effects: { economy: -4, cohesion: -3, popularity: -3 },
            hiddenEffects: { peopleFatigue: 5 },
          },
          {
            kind: "gauge",
            delay: 5,
            label: "Le procès des décrets de réquisition s'ouvre",
            effects: { authority: -4 },
            mediaEffect: -3,
          },
        ],
      },
      {
        id: "b",
        label: "Médiation et hausse salariale",
        description: "Accord syndical en 5 jours.",
        effects: { popularity: 6, economy: -3, budget: -3, cohesion: 4 },
        hiddenEffects: { peopleFatigue: -4 },
        consequence: "Reprise rapide. Le coût va sur les patrons.",
        fulfillsPromise: ["social_justice"],
      },
    ],
  },
  {
    id: "ev_hydrogen_subsidy",
    category: "energy",
    title: "Méga-subvention hydrogène (12Mds) ?",
    context:
      "L'Allemagne et la Chine investissent massivement. La France hésite encore.",
    source: "Bercy + Ministère Énergie",
    choices: [
      {
        id: "a",
        label: "Lancer le plan, gigafactories sur 4 sites",
        description: "Pari industriel décennal.",
        effects: { popularity: 5, economy: 5, ecology: 5, budget: -15, debt: 6 },
        hiddenEffects: { foreignDependence: -8 },
        consequence: "Première gigafactory en chantier 18 mois.",
        fulfillsPromise: ["industry", "ecology", "sovereignty"],
      },
      {
        id: "b",
        label: "Co-investissement européen avec Berlin",
        description: "Mutualiser les risques.",
        effects: { economy: 4, ecology: 4, budget: -8, diplomacy: 5 },
        hiddenEffects: { foreignDependence: 4 },
        consequence: "Projet partagé. Progrès plus lent.",
        fulfillsPromise: ["europe", "ecology"],
      },
      {
        id: "c",
        label: "Reporter, attendre la maturité tech",
        description: "Prudence budgétaire.",
        effects: { economy: -2, budget: 3 },
        hiddenEffects: { foreignDependence: 6, oppositionPower: 4 },
        consequence: "Train manqué. La concurrence avance.",
        breaksPromise: ["industry"],
      },
    ],
  },

  // ============================================================
  // AGRICULTURE — 8 nouveaux (catégorie "agriculture")
  // ============================================================
  {
    id: "ev_fnsea_blockade",
    category: "agriculture",
    title: "FNSEA bloque Paris avec 5 000 tracteurs",
    context:
      "Revendications : prix planchers, baisse normes, baisse charges. Marché de Rungis paralysé.",
    source: "Préfecture de Police de Paris",
    choices: [
      {
        id: "a",
        label: "Concessions massives : pause normes + 1Md aides",
        description: "Cession aux syndicats agricoles.",
        effects: { popularity: 4, ecology: -8, economy: 3, budget: -8, debt: 3, regionalStability: 6 },
        hiddenEffects: { peopleFatigue: -3, oppositionPower: -3, scandalRisk: 5 },
        consequence: "Tracteurs partent. ONG environnementales hurlent.",
        breaksPromise: ["ecology"],
        fulfillsPromise: ["industry", "purchasing_power"],
      },
      {
        id: "b",
        label: "Évacuation forcée + médiation",
        description: "Maintien de l'ordre prioritaire.",
        effects: { popularity: -8, authority: 6, cohesion: -6, regionalStability: -8 },
        hiddenEffects: { radicalization: 8, peopleFatigue: 6, oppositionPower: 6 },
        consequence: "Affrontements à Bobigny. Image dégradée.",
        regionEffects: [{ region: "idf", tension: 6 }],
      },
      {
        id: "c",
        label: "Loi Egalim 4 : prix garantis",
        description: "Réforme structurelle, lente.",
        effects: { popularity: 6, economy: -2, regionalStability: 4, cohesion: 4 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Effet visible dans 2 ans.",
        fulfillsPromise: ["industry", "social_justice"],
      },
    ],
  },
  {
    id: "ev_glyphosate_ban",
    category: "agriculture",
    title: "Glyphosate : interdiction européenne dans 3 ans",
    context:
      "Bruxelles tranche. La FNSEA proteste, les écolos exultent.",
    source: "Commission européenne",
    choices: [
      {
        id: "a",
        label: "Plan transition + 3Mds pour l'agro-écologie",
        description: "Accompagnement massif.",
        effects: { popularity: 5, ecology: 8, economy: -3, budget: -8, debt: 3, regionalStability: 4 },
        hiddenEffects: { peopleFatigue: -3, oppositionPower: -3 },
        consequence: "Filière conversion lancée.",
        fulfillsPromise: ["ecology"],
      },
      {
        id: "b",
        label: "Demander un report de 5 ans",
        description: "Sauver l'agriculture conventionnelle.",
        effects: { popularity: -3, ecology: -8, economy: 4, diplomacy: -3 },
        hiddenEffects: { corruption: 5, oppositionPower: 4 },
        consequence: "Bruxelles refuse. Vous donnez du grain à moudre aux écolos.",
        breaksPromise: ["ecology"],
      },
      {
        id: "c",
        label: "Maintenir au niveau national malgré l'UE",
        description: "Non-respect du droit européen.",
        effects: { popularity: -6, authority: 3, ecology: -10, diplomacy: -10 },
        hiddenEffects: { scandalRisk: 12, foreignDependence: -3 },
        consequence: "Procédure d'infraction lancée.",
        breaksPromise: ["ecology", "europe"],
      },
    ],
  },
  {
    id: "ev_pig_disease",
    category: "agriculture",
    title: "Peste porcine : élevages décimés en Bretagne",
    context:
      "Foyer confirmé. 12 000 porcs abattus, embargo russe et chinois.",
    source: "ANSES + DGAL",
    choices: [
      {
        id: "a",
        label: "Cordon sanitaire + indemnisation 100%",
        description: "Endiguement total.",
        effects: { popularity: 4, health: 5, economy: -3, budget: -8, regionalStability: 4 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Foyer contenu. La filière respire.",
        regionEffects: [{ region: "bretagne", tension: -3 }],
      },
      {
        id: "b",
        label: "Mesures locales seulement",
        description: "Action minimaliste.",
        effects: { popularity: -8, health: -8, regionalStability: -6 },
        hiddenEffects: { scandalRisk: 8, peopleFatigue: 5 },
        consequence: "Le foyer s'étend à 4 départements.",
        regionEffects: [{ region: "bretagne", tension: 8 }],
      },
    ],
  },
  {
    id: "ev_gmo_authorize",
    category: "agriculture",
    title: "Bruxelles autorise les NBT (nouveaux OGM)",
    context:
      "La France peut s'aligner ou pas. Société partagée 50/50.",
    source: "EFSA + Commission",
    choices: [
      {
        id: "a",
        label: "Autoriser sans étiquetage spécifique",
        description: "Position pro-industrie.",
        effects: { popularity: -8, economy: 5, ecology: -6, cohesion: -5 },
        hiddenEffects: { corruption: 6, oppositionPower: 6, scandalRisk: 5 },
        consequence: "Greenpeace en campagne. Industrie soulagée.",
        fulfillsPromise: ["industry"],
        breaksPromise: ["ecology"],
      },
      {
        id: "b",
        label: "Autoriser avec étiquetage strict",
        description: "Voie médiane française.",
        effects: { popularity: 3, economy: 2, ecology: -2, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -2 },
        consequence: "Compromis assumé.",
      },
      {
        id: "c",
        label: "Maintenir le moratoire",
        description: "Position prudente.",
        effects: { popularity: 5, economy: -3, ecology: 5, diplomacy: -3 },
        hiddenEffects: { foreignDependence: 4 },
        consequence: "Bruxelles mécontent. Écolos contents.",
        fulfillsPromise: ["ecology"],
      },
    ],
  },
  {
    id: "ev_bee_collapse",
    category: "agriculture",
    title: "Effondrement des populations d'abeilles : -40%",
    context:
      "L'INRA confirme. La pollinisation des cultures est en danger.",
    source: "INRAE — rapport",
    choices: [
      {
        id: "a",
        label: "Interdire 12 pesticides supplémentaires",
        description: "Position radicale écologique.",
        effects: { popularity: 4, ecology: 10, economy: -4, budget: -3, regionalStability: -3 },
        hiddenEffects: { oppositionPower: 4, peopleFatigue: -3 },
        consequence: "Les abeilles respirent. Les agriculteurs grognent.",
        fulfillsPromise: ["ecology"],
      },
      {
        id: "b",
        label: "Plan national pollinisateurs (500M)",
        description: "Soutien sans interdiction.",
        effects: { popularity: 3, ecology: 5, budget: -3 },
        hiddenEffects: { peopleFatigue: -2 },
        consequence: "Mesure équilibrée, effets lents.",
        fulfillsPromise: ["ecology"],
      },
      {
        id: "c",
        label: "Négocier avec les industriels",
        description: "Accord volontaire de réduction.",
        effects: { popularity: -3, ecology: 2, economy: 2 },
        hiddenEffects: { corruption: 5, scandalRisk: 4 },
        consequence: "Engagements flous. Greenpeace dénonce.",
      },
    ],
  },
  {
    id: "ev_milk_price",
    category: "agriculture",
    title: "Le lait payé sous le coût de production",
    context:
      "Les éleveurs perdent 4ct/litre. La filière s'effondre.",
    source: "Confédération paysanne + FNSEA",
    choices: [
      {
        id: "a",
        label: "Prix plancher légal pour le lait",
        description: "Mesure interventionniste.",
        effects: { popularity: 6, economy: -3, regionalStability: 6, cohesion: 4, authority: 4 },
        hiddenEffects: { peopleFatigue: -3, oppositionPower: -3 },
        consequence: "Bruxelles s'inquiète. Les éleveurs sauvés.",
        fulfillsPromise: ["industry", "social_justice"],
      },
      {
        id: "b",
        label: "Aide ponctuelle (300M) sans réforme",
        description: "Pansement budgétaire.",
        effects: { popularity: 3, budget: -3, regionalStability: 3 },
        hiddenEffects: { peopleFatigue: -2 },
        consequence: "Les éleveurs reviendront dans 6 mois.",
      },
      {
        id: "c",
        label: "Laisser faire le marché",
        description: "Sortie naturelle des éleveurs en faillite.",
        effects: { popularity: -10, economy: 3, regionalStability: -8, cohesion: -6 },
        hiddenEffects: { radicalization: 6, peopleFatigue: 8, oppositionPower: 6 },
        consequence: "1 200 fermes ferment en 18 mois. Désertification rurale.",
        breaksPromise: ["industry"],
        regionEffects: [{ region: "auvergne", tension: 6 }],
      },
    ],
  },
  {
    id: "ev_mercosur_deal",
    category: "agriculture",
    title: "Ratification de l'accord UE-Mercosur",
    context:
      "Le vote final approche. Bœuf brésilien et poulet argentin menacent les éleveurs français.",
    source: "Quai d'Orsay + DG Trade",
    choices: [
      {
        id: "a",
        label: "Bloquer la ratification",
        description: "Veto français au Conseil.",
        effects: { popularity: 8, ecology: 5, economy: -3, regionalStability: 5, diplomacy: -8 },
        hiddenEffects: { peopleFatigue: -4, oppositionPower: -3 },
        consequence: "Berlin furieux. Les éleveurs vous embrassent.",
        fulfillsPromise: ["industry", "sovereignty", "ecology"],
        breaksPromise: ["europe"],
      },
      {
        id: "b",
        label: "Ratifier avec clauses miroirs",
        description: "Importer = mêmes normes.",
        effects: { popularity: 3, economy: 2, ecology: 3, diplomacy: 3 },
        hiddenEffects: { foreignDependence: 3 },
        consequence: "Compromis salué par Bruxelles.",
        fulfillsPromise: ["europe", "ecology"],
      },
      {
        id: "c",
        label: "Ratifier sans condition",
        description: "Position pro-libre-échange.",
        effects: { popularity: -10, economy: 5, ecology: -8, regionalStability: -8, diplomacy: 5 },
        hiddenEffects: { radicalization: 6, oppositionPower: 6 },
        consequence: "FNSEA en révolte.",
        breaksPromise: ["industry", "ecology"],
      },
    ],
  },
  {
    id: "ev_china_buys_land",
    category: "agriculture",
    title: "Un fonds chinois rachète 1 700 ha dans l'Allier",
    context:
      "Cession discrète révélée par Mediapart. La SAFER alerte.",
    source: "Mediapart + SAFER",
    choices: [
      {
        id: "a",
        label: "Loi anti-rachat étranger des terres agricoles",
        description: "Réforme de fond rapide.",
        effects: { popularity: 8, authority: 5, regionalStability: 4, cohesion: 4, economy: -3, diplomacy: -5, budget: -3 },
        hiddenEffects: { foreignDependence: -10, oppositionPower: -3, corruption: 3 },
        consequence: "Cession bloquée. Standing ovation rurale, Pékin proteste.",
        fulfillsPromise: ["sovereignty"],
        breaksPromise: ["europe"],
        regionEffects: [{ region: "auvergne", tension: -5 }],
      },
      {
        id: "b",
        label: "Cession validée, contrôle SAFER renforcé",
        description: "Position de compromis.",
        effects: { popularity: -3, regionalStability: -3, economy: 3, budget: 2, diplomacy: 2 },
        hiddenEffects: { foreignDependence: 5, scandalRisk: 4 },
        consequence: "Les ruraux se sentent floués. Capital étranger préservé.",
      },
      {
        id: "c",
        label: "Laisser faire",
        description: "Liberté du marché.",
        effects: { popularity: -10, authority: -5, regionalStability: -6, cohesion: -5 },
        hiddenEffects: { foreignDependence: 12, scandalRisk: 8, oppositionPower: 8 },
        consequence: "Les fermes voisines sont rachetées en cascade.",
        breaksPromise: ["sovereignty"],
        regionEffects: [{ region: "auvergne", tension: 8 }],
      },
    ],
  },

  // ============================================================
  // MÉDIAS — 8 nouveaux
  // ============================================================
  {
    id: "ev_journalist_killed",
    category: "media",
    title: "Une éditorialiste assassinée à Marseille",
    context:
      "Spécialisée dans le narcotrafic. Aucune interpellation à 72h.",
    source: "Police Judiciaire de Marseille",
    choices: [
      {
        id: "a",
        label: "Cellule d'enquête nationale + protection des journalistes",
        description: "Engagement régalien fort.",
        effects: { popularity: 6, security: 8, authority: 6, budget: -3, cohesion: 5 },
        hiddenEffects: { scandalRisk: -6, peopleFatigue: -3 },
        consequence: "Image de fermeté. La presse vous remercie.",
        fulfillsPromise: ["security"],
        regionEffects: [{ region: "paca", tension: -3 }],
      },
      {
        id: "b",
        label: "Hommage présidentiel sans plus",
        description: "Geste symbolique.",
        effects: { popularity: -3, security: -3, cohesion: -3 },
        hiddenEffects: { scandalRisk: 5, peopleFatigue: 4 },
        consequence: "La presse trouve la réponse faible.",
      },
    ],
  },
  {
    id: "ev_viral_fakenews",
    category: "media",
    title: "Fake news virale : « le président est mort »",
    context:
      "8M de vues en 4h. Bourse en chute libre. Marchés en panique.",
    source: "Cellule contre-influence + Viginum",
    choices: [
      {
        id: "a",
        label: "Apparition immédiate en direct, démenti calme",
        description: "Réassurance professionnelle.",
        effects: { popularity: 6, authority: 8, economy: 4, security: 4 },
        hiddenEffects: { cyberRisk: -4, scandalRisk: -3 },
        consequence: "Crise dissipée en 90 minutes. Bourse rebondit.",
      },
      {
        id: "b",
        label: "Plainte pénale + sanctions plateformes",
        description: "Riposte juridique.",
        effects: { popularity: 4, authority: 4, security: 5 },
        hiddenEffects: { cyberRisk: -4 },
        consequence: "Procédures longues, message envoyé.",
        fulfillsPromise: ["security"],
      },
      {
        id: "c",
        label: "Ne rien faire, attendre",
        description: "« On ne va pas dignifier ça. »",
        effects: { popularity: -5, economy: -5, authority: -3 },
        hiddenEffects: { cyberRisk: 8, scandalRisk: 4, peopleFatigue: 4 },
        consequence: "La rumeur dure 18h. Marchés en sang.",
      },
    ],
  },
  {
    id: "ev_journalist_arrested",
    category: "media",
    title: "Journaliste interpellée en garde à vue",
    context:
      "Notes confidentielles sur les ventes d'armes. La profession s'embrase.",
    source: "Préfecture + Reporters Sans Frontières",
    choices: [
      {
        id: "a",
        label: "Libération immédiate + excuses publiques",
        description: "Geste fort de l'État.",
        effects: { popularity: 4, authority: -4, cohesion: 5, security: -3 },
        hiddenEffects: { scandalRisk: -6, oppositionPower: -3 },
        consequence: "RSF salue. Les services en colère.",
        fulfillsPromise: ["secularism"],
      },
      {
        id: "b",
        label: "Maintenir la procédure",
        description: "Justice indépendante.",
        effects: { popularity: -8, authority: 4, cohesion: -5 },
        hiddenEffects: { scandalRisk: 10, oppositionPower: 6 },
        consequence: "Mobilisation médiatique, image dégradée.",
      },
    ],
  },
  {
    id: "ev_billionaire_buys",
    category: "media",
    title: "Un milliardaire rachète Le Monde",
    context:
      "Inquiétudes sur la pluralité. La rédaction menace de partir en bloc.",
    source: "AMF + ARCOM",
    choices: [
      {
        id: "a",
        label: "Loi anti-concentration médias express",
        description: "Plafond capital + transparence.",
        effects: { popularity: 6, authority: 5, cohesion: 5, economy: -3 },
        hiddenEffects: { corruption: -8, scandalRisk: -5, oppositionPower: -3 },
        consequence: "ARCOM gagne en pouvoir. Les milliardaires se replient.",
        fulfillsPromise: ["secularism", "social_justice"],
        mediaEffect: 8,
      },
      {
        id: "b",
        label: "Bloquer le rachat via examen ARCOM",
        description: "Action ciblée.",
        effects: { popularity: 4, authority: 4, economy: -2 },
        hiddenEffects: { corruption: -4, oppositionPower: -2 },
        consequence: "Rachat retardé 18 mois. Autres groupes dissuadés.",
      },
      {
        id: "c",
        label: "Laisser faire le marché",
        description: "Liberté économique.",
        effects: { popularity: -8, cohesion: -5 },
        hiddenEffects: { corruption: 10, scandalRisk: 6, oppositionPower: 6 },
        consequence: "Le rachat se fait. La rédaction démissionne en bloc.",
        breaksPromise: ["secularism"],
      },
    ],
  },
  {
    id: "ev_state_tv_collapse",
    category: "media",
    title: "Audiences France TV en chute libre",
    context:
      "-22% en un an. Le service public est en danger.",
    source: "Médiamétrie + ARCOM",
    choices: [
      {
        id: "a",
        label: "Réforme : fusion FTV-Radio France-INA",
        description: "Plan ambitieux unifié.",
        effects: { popularity: 4, authority: 4, budget: 3, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Restructuration sur 3 ans, syndicats inquiets.",
        fulfillsPromise: ["industry"],
        mediaEffect: 4,
      },
      {
        id: "b",
        label: "Augmentation budget de 800M€",
        description: "Refinancement massif.",
        effects: { popularity: -3, budget: -8, debt: 3 },
        hiddenEffects: { oppositionPower: 4 },
        consequence: "Les chaînes privées hurlent au gaspillage.",
      },
      {
        id: "c",
        label: "Privatisation de France 4 et France Ô",
        description: "Coupes ciblées.",
        effects: { popularity: -10, budget: 4, cohesion: -6, regionalStability: -6 },
        hiddenEffects: { peopleFatigue: 6, oppositionPower: 6, foreignDependence: 4 },
        consequence: "Manifestations devant FTV. Outre-mer indignée.",
        breaksPromise: ["secularism"],
        regionEffects: [{ region: "outre_mer", tension: 8 }],
      },
    ],
  },
  {
    id: "ev_afp_strike",
    category: "media",
    title: "Grève illimitée à l'AFP",
    context:
      "Salaires, suppressions de postes. Une dépêche n'est plus envoyée depuis 7 jours.",
    source: "Direction AFP",
    choices: [
      {
        id: "a",
        label: "Médiation + financement public renforcé",
        description: "Sauver le pavillon AFP.",
        effects: { popularity: 4, budget: -3, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -3 },
        consequence: "Reprise en 5 jours. AFP renforcée.",
        fulfillsPromise: ["sovereignty", "social_justice"],
      },
      {
        id: "b",
        label: "Privatisation partielle",
        description: "Faire entrer un actionnaire privé.",
        effects: { popularity: -8, budget: 5, cohesion: -5 },
        hiddenEffects: { foreignDependence: 8, scandalRisk: 5 },
        consequence: "Reuters intéressé. La presse française inquiète.",
        breaksPromise: ["sovereignty"],
      },
    ],
  },
  {
    id: "ev_conspiracy_podcast",
    category: "media",
    title: "Un podcast complotiste atteint 1M d'auditeurs hebdo",
    context:
      "Climat, vaccins, élections : tout y passe. L'animateur appelle au boycott des élections.",
    source: "Viginum + ARCOM",
    choices: [
      {
        id: "a",
        label: "Déférer ARCOM, demander suspension plateforme",
        description: "Action légale.",
        effects: { popularity: 3, authority: 4, security: 4, cohesion: 3 },
        hiddenEffects: { radicalization: -4, oppositionPower: -3 },
        consequence: "Le podcast suspendu, accusations de censure.",
      },
      {
        id: "b",
        label: "Programme de fact-checking massif",
        description: "Réponse pédagogique.",
        effects: { popularity: 4, cohesion: 4 },
        hiddenEffects: { radicalization: -3 },
        consequence: "Effort utile, mais lent.",
        fulfillsPromise: ["education"],
      },
      {
        id: "c",
        label: "Ignorer",
        description: "« La liberté d'expression d'abord. »",
        effects: { popularity: -3, cohesion: -5, security: -3 },
        hiddenEffects: { radicalization: 8, peopleFatigue: 4, oppositionPower: 4 },
        consequence: "Le podcast double son audience en 2 mois.",
      },
    ],
  },
  {
    id: "ev_press_freedom_drop",
    category: "media",
    title: "RSF : la France chute à la 38e place mondiale",
    context:
      "Pressions, concentrations, agressions de journalistes. Le classement annuel pique.",
    source: "Reporters Sans Frontières",
    choices: [
      {
        id: "a",
        label: "Loi pour protection des sources renforcée",
        description: "Engagement républicain.",
        effects: { popularity: 4, authority: 3, cohesion: 4 },
        hiddenEffects: { corruption: -5, scandalRisk: -4 },
        consequence: "RSF salue. La presse vous remercie.",
        fulfillsPromise: ["secularism", "social_justice"],
        mediaEffect: 6,
      },
      {
        id: "b",
        label: "Critiquer le rapport publiquement",
        description: "Contestation politique.",
        effects: { popularity: -6, authority: 4, diplomacy: -3 },
        hiddenEffects: { scandalRisk: 6, oppositionPower: 5 },
        consequence: "Vous donnez raison à RSF, en miroir.",
      },
    ],
  },

  // ============================================================
  // GUERRE HYBRIDE — 10 nouveaux (catégorie "hybrid_warfare")
  // ============================================================
  {
    id: "ev_russian_drones",
    category: "hybrid_warfare",
    title: "Drones russes franchissent l'espace OTAN",
    context:
      "3 drones interceptés en Pologne. L'Article 4 est demandé. Réunion d'urgence à Bruxelles.",
    source: "OTAN — communication d'urgence",
    choices: [
      {
        id: "a",
        label: "Déployer la patrouille air française",
        description: "Solidarité OTAN active.",
        effects: { popularity: 4, security: 8, diplomacy: 6, budget: -5, authority: 6 },
        hiddenEffects: { foreignDependence: -3, oppositionPower: -3 },
        consequence: "Geste fort salué par Varsovie.",
        fulfillsPromise: ["security", "europe", "sovereignty"],
        ministerEffects: [{ position: "defense", loyalty: 6, competence: 4 }],
      },
      {
        id: "b",
        label: "Soutien diplomatique seulement",
        description: "Communiqué et sanctions.",
        effects: { diplomacy: 3, security: -3 },
        hiddenEffects: { foreignDependence: 4, scandalRisk: 4 },
        consequence: "Position prudente, jugée timide.",
      },
      {
        id: "c",
        label: "Neutralité prudente",
        description: "Éviter l'escalade.",
        effects: { popularity: -8, diplomacy: -8, authority: -6, cohesion: -4 },
        hiddenEffects: { radicalization: 5, oppositionPower: 6, foreignDependence: 6 },
        consequence: "Berlin et Varsovie nous reprochent. Pari isolationniste.",
        breaksPromise: ["security", "europe"],
      },
    ],
  },
  {
    id: "ev_atlantic_cables",
    category: "hybrid_warfare",
    title: "Sabotage de câbles sous-marins en Atlantique",
    context:
      "3 câbles télécoms majeurs sectionnés. Origine : navire russe ou chinois ?",
    source: "Marine nationale + ANSSI",
    choices: [
      {
        id: "a",
        label: "Activer protection sous-marine permanente",
        description: "Pari capacitaire majeur.",
        effects: { security: 10, authority: 6, budget: -10, debt: 4 },
        hiddenEffects: { foreignDependence: -5, cyberRisk: -5 },
        consequence: "Marine renforcée. Coût considérable.",
        fulfillsPromise: ["sovereignty", "security", "industry"],
      },
      {
        id: "b",
        label: "Coopération européenne renforcée",
        description: "Mutualisation des moyens.",
        effects: { security: 5, diplomacy: 5, budget: -3 },
        hiddenEffects: { foreignDependence: 3 },
        consequence: "Belle initiative, lente à monter.",
        fulfillsPromise: ["europe"],
      },
      {
        id: "c",
        label: "Riposter par sabotage similaire",
        description: "Loi du talion silencieuse.",
        effects: { security: 8, authority: 8, diplomacy: -10 },
        hiddenEffects: { scandalRisk: 12, cyberRisk: -3 },
        consequence: "L'autre camp comprend. La presse ignore.",
        hidesScandal: {
          title: "Scandale : la France a saboté en mer Baltique",
          popularityDamage: 14,
          authorityDamage: 8,
          mediaDamage: 12,
          revealIn: 6,
        },
      },
    ],
  },
  {
    id: "ev_sahel_mercenaries",
    category: "hybrid_warfare",
    title: "Mercenaires russes au Sahel : 4 ressortissants français retenus",
    context:
      "Wagner Africa Corps détient 4 humanitaires. Demande : retrait OTAN, levée sanctions.",
    source: "Quai d'Orsay — cellule de crise",
    choices: [
      {
        id: "a",
        label: "Opération militaire de récupération",
        description: "COS engagé sous 72h.",
        effects: { popularity: 5, security: 6, authority: 8, budget: -6, diplomacy: -5 },
        hiddenEffects: { foreignDependence: -3, scandalRisk: 6 },
        consequence: "3 sur 4 récupérés. Un mort. Image de force.",
        fulfillsPromise: ["security", "sovereignty"],
        ministerEffects: [{ position: "defense", competence: 6 }],
      },
      {
        id: "b",
        label: "Négocier discrètement",
        description: "Échange + concessions.",
        effects: { popularity: 3, authority: -3, diplomacy: -3 },
        hiddenEffects: { scandalRisk: 10, foreignDependence: 5 },
        consequence: "Otages libérés en 6 semaines. Concessions cachées.",
        hidesScandal: {
          title: "Scandale : la France a payé Wagner",
          popularityDamage: 16,
          authorityDamage: 10,
          mediaDamage: 12,
          revealIn: 5,
        },
      },
      {
        id: "c",
        label: "Refuser tout dialogue, sanctions max",
        description: "Position de fermeté.",
        effects: { popularity: -3, authority: 5, diplomacy: 4, security: -3 },
        hiddenEffects: { peopleFatigue: 5, scandalRisk: 4 },
        consequence: "Otages détenus longtemps. Image dure.",
      },
    ],
  },
  {
    id: "ev_baltic_exercise",
    category: "hybrid_warfare",
    title: "Manœuvres OTAN provocantes en Baltique",
    context:
      "L'Estonie demande la participation française. Moscou menace.",
    source: "EMA + OTAN HQ",
    choices: [
      {
        id: "a",
        label: "Envoyer une frégate FREMM",
        description: "Geste fort.",
        effects: { popularity: 3, security: 6, diplomacy: 4, budget: -4, authority: 5 },
        hiddenEffects: { foreignDependence: -3 },
        consequence: "Tallinn ravi. Moscou furieux.",
        fulfillsPromise: ["europe", "security", "sovereignty"],
      },
      {
        id: "b",
        label: "Participation symbolique avec un patrouilleur",
        description: "Présence sans escalade.",
        effects: { security: 3, diplomacy: 3 },
        consequence: "Visibilité minimale. Moscou apaisé.",
      },
      {
        id: "c",
        label: "Refuser",
        description: "Pas d'escalade.",
        effects: { popularity: -3, diplomacy: -8, authority: -5 },
        hiddenEffects: { foreignDependence: 6, oppositionPower: 4 },
        consequence: "L'OTAN nous lâche. Moscou réjoui.",
        breaksPromise: ["europe"],
      },
    ],
  },
  {
    id: "ev_spy_network",
    category: "hybrid_warfare",
    title: "DGSI démantèle un réseau d'espionnage chinois",
    context:
      "12 agents identifiés, dont 2 dans des labos d'IA. Expulsions à acter.",
    source: "DGSI — note officielle",
    choices: [
      {
        id: "a",
        label: "Expulser publiquement les 12",
        description: "Geste de fermeté.",
        effects: { popularity: 5, security: 8, authority: 6, diplomacy: -8 },
        hiddenEffects: { foreignDependence: -5, cyberRisk: -3 },
        consequence: "Pékin furieux. La presse vous applaudit.",
        fulfillsPromise: ["sovereignty", "security"],
      },
      {
        id: "b",
        label: "Expulsion silencieuse + canaux diplomatiques",
        description: "Discret et efficace.",
        effects: { security: 5, authority: 3, diplomacy: -3 },
        hiddenEffects: { foreignDependence: -3, scandalRisk: 3 },
        consequence: "Pékin remarque. La presse ignore.",
      },
      {
        id: "c",
        label: "Convertir en agents doubles",
        description: "Pari du long terme.",
        effects: { security: 8, authority: 5 },
        hiddenEffects: { cyberRisk: -8, foreignDependence: -5, scandalRisk: 6 },
        consequence: "DGSE jubile. Risque d'éclatement.",
      },
    ],
  },
  {
    id: "ev_belarus_migrants",
    category: "hybrid_warfare",
    title: "Faux migrants envoyés par la Biélorussie",
    context:
      "5 000 personnes embarquées vers Calais en 10 jours. Le Royaume-Uni accuse Paris.",
    source: "OFII + Préfecture du Pas-de-Calais",
    choices: [
      {
        id: "a",
        label: "Accord franco-britannique sur expulsions rapides",
        description: "Coopération renforcée.",
        effects: { popularity: 4, security: 5, diplomacy: 5, cohesion: 3 },
        hiddenEffects: { peopleFatigue: -3, scandalRisk: 3 },
        consequence: "Londres satisfait. Les associations protestent.",
        fulfillsPromise: ["security"],
        regionEffects: [{ region: "hdf", tension: -3 }],
      },
      {
        id: "b",
        label: "Sanctions UE contre Minsk",
        description: "Voie diplomatique européenne.",
        effects: { security: 3, diplomacy: 4, budget: -2 },
        hiddenEffects: { foreignDependence: -3 },
        consequence: "Minsk ne s'incline pas. UE active mais lente.",
        fulfillsPromise: ["europe"],
      },
      {
        id: "c",
        label: "Asile examiné individuellement",
        description: "Position humaniste.",
        effects: { popularity: -8, security: -5, cohesion: -5, regionalStability: -5 },
        hiddenEffects: { radicalization: 8, peopleFatigue: 6, oppositionPower: 6 },
        consequence: "Les arrivées continuent. Tension à Calais.",
        regionEffects: [{ region: "hdf", tension: 6 }],
      },
    ],
  },
  {
    id: "ev_chemical_alert",
    category: "hybrid_warfare",
    title: "Alerte arme chimique en Champagne",
    context:
      "Conteneur suspect découvert près de Reims. Première analyse positive au novitchok.",
    source: "DGSI + ANSES",
    choices: [
      {
        id: "a",
        label: "Évacuation totale + équipes NRBC",
        description: "Doctrine maximale.",
        effects: { popularity: 4, security: 8, health: 4, budget: -5, authority: 6 },
        hiddenEffects: { peopleFatigue: 4, scandalRisk: -3 },
        consequence: "Aucun blessé. Image de maîtrise.",
        regionEffects: [{ region: "grand_est", tension: -3 }],
      },
      {
        id: "b",
        label: "Étouffer l'incident pour éviter la panique",
        description: "Communication discrète.",
        effects: { popularity: 2, health: -3, authority: -3 },
        hiddenEffects: { scandalRisk: 16, peopleFatigue: 4, cyberRisk: 0 },
        consequence: "L'info fuitera tôt ou tard.",
        hidesScandal: {
          title: "Scandale : alerte chimique étouffée",
          popularityDamage: 16,
          authorityDamage: 12,
          mediaDamage: 14,
          revealIn: 4,
        },
      },
    ],
  },
  {
    id: "ev_mali_recall",
    category: "hybrid_warfare",
    title: "Mali demande le retrait définitif des derniers conseillers",
    context:
      "Bamako accuse la France d'ingérence. La fin de la présence française au Sahel.",
    source: "Quai d'Orsay",
    choices: [
      {
        id: "a",
        label: "Retrait ordonné en 60 jours",
        description: "Sortie professionnelle.",
        effects: { popularity: 6, diplomacy: -3, authority: -3, security: -3 },
        hiddenEffects: { peopleFatigue: -3, foreignDependence: 3 },
        consequence: "Fin d'une époque assumée.",
      },
      {
        id: "b",
        label: "Reconfigurer en partenariat avec Côte d'Ivoire et Sénégal",
        description: "Pivot stratégique.",
        effects: { security: 4, diplomacy: 5, authority: 4, budget: -3 },
        hiddenEffects: { foreignDependence: -3 },
        consequence: "Nouvelle architecture régionale.",
        fulfillsPromise: ["sovereignty"],
      },
      {
        id: "c",
        label: "Refuser, maintenir la présence",
        description: "Position de force.",
        effects: { popularity: -6, security: -3, diplomacy: -10, authority: 4 },
        hiddenEffects: { radicalization: 5, scandalRisk: 6 },
        consequence: "Tensions diplomatiques majeures. Risque d'incident.",
      },
    ],
  },
  {
    id: "ev_munich_conf",
    category: "hybrid_warfare",
    title: "Conférence de Munich : discours attendu de la France",
    context:
      "Allié réticent ou pivot stratégique : il faut choisir une ligne.",
    source: "Élysée — préparation du discours",
    choices: [
      {
        id: "a",
        label: "Discours pro-OTAN renforcé : « +0,5% PIB défense »",
        description: "Engagement budgétaire majeur.",
        effects: { popularity: -3, security: 8, diplomacy: 8, budget: -10, debt: 5, authority: 6 },
        hiddenEffects: { foreignDependence: 3, oppositionPower: 4 },
        consequence: "Les alliés vous applaudissent. Bercy dépressif.",
        fulfillsPromise: ["security", "europe"],
      },
      {
        id: "b",
        label: "Discours autonomie stratégique européenne",
        description: "Vision gaullienne.",
        effects: { popularity: 6, security: 5, diplomacy: 4, authority: 5 },
        hiddenEffects: { foreignDependence: -8, oppositionPower: -3 },
        consequence: "Berlin sceptique, Madrid intéressé.",
        fulfillsPromise: ["sovereignty", "europe"],
      },
      {
        id: "c",
        label: "Discours équilibré sans engagement chiffré",
        description: "Diplomatie classique.",
        effects: { diplomacy: 2, authority: -2 },
        hiddenEffects: { peopleFatigue: 3 },
        consequence: "Discours oublié dans la semaine.",
      },
    ],
  },
  {
    id: "ev_nato_article4",
    category: "hybrid_warfare",
    title: "Article 4 OTAN invoqué par la Lettonie",
    context:
      "Cyberattaques massives + menaces frontalières. Réunion d'urgence à Bruxelles.",
    source: "OTAN HQ",
    choices: [
      {
        id: "a",
        label: "Soutien total + déploiement de cyberdéfense française",
        description: "Solidarité active.",
        effects: { popularity: 4, security: 8, diplomacy: 6, budget: -5, authority: 6 },
        hiddenEffects: { cyberRisk: -8, foreignDependence: -3 },
        consequence: "Riga reconnaissante. Standing fort.",
        fulfillsPromise: ["europe", "security", "sovereignty"],
        ministerEffects: [{ position: "defense", loyalty: 5, competence: 4 }],
      },
      {
        id: "b",
        label: "Soutien diplomatique seulement",
        description: "Pas de moyens militaires.",
        effects: { diplomacy: 3, security: -3 },
        hiddenEffects: { foreignDependence: 4 },
        consequence: "Soutien de façade.",
      },
      {
        id: "c",
        label: "Position de retrait",
        description: "« Pas notre flanc. »",
        effects: { popularity: -8, diplomacy: -10, authority: -6, security: -5 },
        hiddenEffects: { foreignDependence: 8, oppositionPower: 5 },
        consequence: "L'Alliance ébranlée. Riga isolée.",
        breaksPromise: ["europe", "security"],
      },
    ],
  },
];

export const DELAYED_EVENTS: CrisisEvent[] = [
  {
    id: "ev_delayed_riot",
    category: "delayed",
    title: "Onde de choc : émeutes après la réquisition",
    context:
      "La réquisition d'il y a quelques mois a profondément marqué les esprits. Une étincelle suffit, et les banlieues s'embrasent.",
    source: "Conséquence retardée",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Couvre-feu national",
        description: "Mobiliser l'armée dans les villes.",
        effects: {
          security: 6,
          authority: 8,
          popularity: -10,
          diplomacy: -4,
          cohesion: -6,
        },
        hiddenEffects: { radicalization: 14, peopleFatigue: 8 },
        consequence: "L'ordre revient au prix d'une fracture profonde.",
        regionEffects: [
          { region: "idf", tension: -8 },
          { region: "hdf", tension: -6 },
        ],
        mediaEffect: -10,
      },
      {
        id: "b",
        label: "Reconnaître publiquement l'erreur",
        description: "Excuses officielles + plan de réconciliation.",
        effects: {
          popularity: 8,
          authority: -10,
          cohesion: 6,
        },
        hiddenEffects: { peopleFatigue: -10, radicalization: -6 },
        consequence: "Les violences s'éteignent. Votre majorité vous lâche.",
        regionEffects: [{ region: "idf", tension: -12 }],
      },
      {
        id: "c",
        label: "Désigner des boucs émissaires",
        description: "Accuser des activistes étrangers.",
        effects: {
          popularity: -4,
          authority: 4,
          cohesion: -4,
        },
        hiddenEffects: {
          radicalization: 8,
          scandalRisk: 8,
          oppositionPower: 6,
        },
        consequence: "Le pays reste divisé. Le climat se tend.",
        oppositionEffect: 8,
        mediaEffect: -6,
      },
    ],
  },
  {
    id: "ev_delayed_water_crisis",
    category: "delayed",
    title: "Catastrophe : nappes phréatiques épuisées",
    context:
      "L'autorisation de forage massif a vidé les nappes. Plusieurs villes du sud sont en rationnement extrême.",
    source: "Conséquence retardée",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Plan d'urgence dessalement",
        description: "Construire 6 stations de dessalement.",
        effects: {
          ecology: 6,
          economy: -10,
          popularity: 4,
          budget: -12,
          debt: 5,
          health: 3,
        },
        hiddenEffects: { peopleFatigue: -4 },
        consequence: "Solution coûteuse mais réelle.",
        regionEffects: [{ region: "paca", tension: -10 }],
        ministerEffects: [{ position: "ecology", loyalty: 8 }],
      },
      {
        id: "b",
        label: "Accuser le dérèglement climatique",
        description: "Discours victimaire, pas de solution.",
        effects: {
          popularity: -8,
          ecology: -4,
          authority: -4,
          health: -4,
          regionalStability: -4,
        },
        hiddenEffects: {
          peopleFatigue: 12,
          radicalization: 8,
          oppositionPower: 6,
        },
        consequence: "Le sud du pays explose de colère.",
        regionEffects: [
          { region: "paca", tension: 14 },
          { region: "occitanie", tension: 10 },
        ],
        mediaEffect: -10,
      },
      {
        id: "c",
        label: "Restrictions très strictes",
        description: "Coupures, amendes, contrôles.",
        effects: {
          popularity: -4,
          ecology: 4,
          authority: 4,
          health: -2,
        },
        hiddenEffects: { peopleFatigue: 6 },
        consequence: "Mesures impopulaires mais nécessaires.",
        regionEffects: [{ region: "paca", tension: 4 }],
      },
    ],
  },
  {
    id: "ev_delayed_no_confidence",
    category: "delayed",
    title: "Conséquence : motion de censure suite au 49.3",
    context:
      "Le passage en force ouvre la voie à un vote de défiance organisé par toute l'opposition.",
    source: "Conséquence retardée",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Appeler à la discipline de majorité",
        description: "Tout miser sur le whip.",
        effects: { authority: 6, popularity: -4 },
        hiddenEffects: { oppositionPower: -4 },
        consequence: "La motion échoue à 4 voix.",
        oppositionEffect: -6,
        ministerEffects: [{ position: "pm", loyalty: 6 }],
      },
      {
        id: "b",
        label: "Sacrifier le Premier ministre",
        description: "Remaniement choc avant le vote.",
        effects: { popularity: 4, authority: -4 },
        hiddenEffects: { oppositionPower: -8 },
        consequence: "Matignon change. La motion tombe.",
        ministerEffects: [{ position: "pm", fire: true }],
        oppositionEffect: -10,
      },
      {
        id: "c",
        label: "Dissoudre l'Assemblée avant le vote",
        description: "Coup de poker constitutionnel.",
        effects: {
          authority: 12,
          popularity: -8,
          economy: -6,
          cohesion: -4,
        },
        hiddenEffects: {
          peopleFatigue: 8,
          oppositionPower: 8,
          radicalization: 4,
        },
        consequence: "Législatives anticipées. Issue très incertaine.",
        mediaEffect: -4,
      },
    ],
  },
  {
    id: "ev_delayed_debt_crisis",
    category: "delayed",
    title: "Onde de choc : crise de la dette à retardement",
    context:
      "L'absence de réaction au déficit excessif rattrape la France. Les marchés exigent du sang neuf à Bercy, le spread OAT-Bund explose à 280 points.",
    source: "Conséquence retardée",
    choices: [
      {
        id: "a",
        label: "Plan choc : 35Mds d'économies en 18 mois",
        description: "Austérité sévère pour rassurer les marchés.",
        effects: {
          popularity: -16,
          economy: 3,
          budget: 14,
          debt: -8,
          cohesion: -10,
          health: -5,
          authority: 4,
        },
        hiddenEffects: {
          peopleFatigue: 14,
          radicalization: 10,
          oppositionPower: 10,
        },
        consequence:
          "Les taux refluent. Le pays craque socialement.",
        breaksPromise: ["social_justice", "purchasing_power"],
        regionEffects: [
          { region: "hdf", tension: 6 },
          { region: "occitanie", tension: 5 },
        ],
        mediaEffect: -4,
        oppositionEffect: 6,
      },
      {
        id: "b",
        label: "Demander aide BCE / mécanisme TPI",
        description: "Acter la mise sous tutelle douce.",
        effects: {
          popularity: -8,
          economy: 4,
          budget: 4,
          debt: -4,
          authority: -10,
          diplomacy: 3,
        },
        hiddenEffects: {
          foreignDependence: 16,
          scandalRisk: 6,
          oppositionPower: 8,
        },
        consequence:
          "Francfort intervient. La France perd son aura souveraine.",
        breaksPromise: ["sovereignty"],
        revealsHiddenGauge: "foreignDependence",
      },
      {
        id: "c",
        label: "Discours de défi : « les marchés se trompent »",
        description: "Résister par la communication.",
        effects: {
          popularity: 4,
          economy: -8,
          debt: 8,
          authority: 6,
          cohesion: 3,
          diplomacy: -4,
        },
        hiddenEffects: {
          foreignDependence: -3,
          scandalRisk: 8,
          oppositionPower: 5,
        },
        consequence:
          "Vos partisans applaudissent. Les taux flambent. La crise s'aggrave.",
        fulfillsPromise: ["sovereignty"],
      },
    ],
  },
  // ─── Chantier 1 — Cascade events (NOT random-pickable). ──────────
  // Triggered exclusively by `lib/socialCascade.ts` when the player's
  // last decision crosses a social tipping point. Same shape as any
  // other event so the regular EventModal can render them.
  {
    id: "ev_cascade_protests",
    category: "delayed",
    title: "Cascade : la rue répond à votre décision",
    context:
      "Les réseaux sociaux s'embrasent depuis votre dernière annonce. Plusieurs rassemblements spontanés se forment dans les grandes villes.",
    source: "Conséquence en cascade",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Recevoir les organisateurs",
        description: "Inviter les porte-paroles à l'Élysée pour un dialogue.",
        effects: { popularity: 4, authority: -3, cohesion: 4 },
        hiddenEffects: { peopleFatigue: -6, oppositionPower: -3 },
        consequence: "Le geste est noté. La pression baisse d'un cran.",
        mediaEffect: 3,
      },
      {
        id: "b",
        label: "Encadrer les manifestations",
        description: "Interdire les cortèges sauvages, déployer la police.",
        effects: { security: 3, authority: 5, popularity: -6, cohesion: -4 },
        hiddenEffects: { radicalization: 8, peopleFatigue: 4 },
        consequence:
          "L'ordre tient mais l'amertume monte. Quelques bavures en images.",
        mediaEffect: -4,
        oppositionEffect: 4,
        regionEffects: [
          { region: "idf", tension: 6 },
          { region: "paca", tension: 4 },
        ],
      },
      {
        id: "c",
        label: "Ignorer le mouvement",
        description: "Laisser passer l'orage médiatique.",
        effects: { popularity: -4, authority: -2, cohesion: -3 },
        hiddenEffects: { peopleFatigue: 8, oppositionPower: 5 },
        consequence: "Le mouvement enfle. Les médias parlent de mépris.",
        mediaEffect: -6,
        oppositionEffect: 5,
      },
    ],
  },
  {
    id: "ev_cascade_demonstration",
    category: "delayed",
    title: "Cascade : marée humaine sur les Champs",
    context:
      "Avec une popularité au plancher, plusieurs millions de Français descendent dans la rue à l'appel de collectifs citoyens hétéroclites.",
    source: "Conséquence en cascade",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Discours solennel à la Nation",
        description: "Annoncer un changement de cap depuis l'Élysée.",
        effects: { popularity: 6, authority: 3, cohesion: 4 },
        hiddenEffects: { peopleFatigue: -8 },
        consequence:
          "Le ton grave et l'admission d'erreurs apaisent partiellement.",
        mediaEffect: 5,
      },
      {
        id: "b",
        label: "Promettre un référendum",
        description: "Annoncer une consultation populaire dans 6 mois.",
        effects: { popularity: 8, authority: -4, cohesion: 6 },
        hiddenEffects: { oppositionPower: -4 },
        consequence:
          "Coup politique salué, mais l'exécutif paraît fragilisé.",
        mediaEffect: 6,
        oppositionEffect: -3,
      },
      {
        id: "c",
        label: "Refuser tout dialogue",
        description: "« La rue ne gouverne pas. »",
        effects: { popularity: -10, authority: 4, cohesion: -8 },
        hiddenEffects: { radicalization: 10, peopleFatigue: 10 },
        consequence:
          "Le clash est total. La République se polarise davantage.",
        mediaEffect: -8,
        oppositionEffect: 8,
      },
    ],
  },
  {
    id: "ev_cascade_communautaire",
    category: "delayed",
    title: "Cascade : tensions communautaires en banlieue",
    context:
      "La cohésion nationale fracture. Des affrontements éclatent entre quartiers, attisés par des groupes organisés sur les messageries.",
    source: "Conséquence en cascade",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Plan de cohésion républicaine",
        description: "Mobiliser élus, associations, services publics.",
        effects: { cohesion: 8, popularity: 3, budget: -5 },
        hiddenEffects: { radicalization: -6, peopleFatigue: -3 },
        consequence:
          "Le terrain reprend espoir. Les violences refluent en quelques semaines.",
        mediaEffect: 4,
        regionEffects: [
          { region: "idf", tension: -6 },
          { region: "hdf", tension: -4 },
        ],
      },
      {
        id: "b",
        label: "État d'urgence ciblé",
        description: "Déployer la gendarmerie mobile, couvre-feu local.",
        effects: { security: 5, authority: 4, cohesion: -6, popularity: -4 },
        hiddenEffects: { radicalization: 8 },
        consequence:
          "L'ordre revient, le ressentiment aussi. Plusieurs blessés.",
        mediaEffect: -4,
        regionEffects: [{ region: "idf", tension: 4 }],
      },
      {
        id: "c",
        label: "Désigner des coupables",
        description: "Discours sur « certains quartiers ».",
        effects: { popularity: 2, cohesion: -10, authority: 2 },
        hiddenEffects: {
          radicalization: 12,
          oppositionPower: 6,
          scandalRisk: 6,
        },
        consequence:
          "Un coup à droite, un fossé à gauche. La République se déchire.",
        mediaEffect: -3,
        oppositionEffect: 6,
      },
    ],
  },
  {
    id: "ev_cascade_motion_censure",
    category: "delayed",
    title: "Cascade : motion de censure déposée",
    context:
      "L'accumulation de promesses brisées donne à l'opposition l'occasion qu'elle attendait. Une motion de censure est déposée à l'Assemblée.",
    source: "Conséquence en cascade",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Discours de défense au Parlement",
        description:
          "Le Premier ministre vient s'expliquer point par point.",
        effects: { authority: 4, popularity: 2, cohesion: 2 },
        hiddenEffects: { oppositionPower: -4 },
        consequence:
          "Le PM tient son rang. La motion est rejetée à quelques voix.",
        mediaEffect: 2,
        ministerEffects: [{ position: "pm", competence: 3, loyalty: 4 }],
      },
      {
        id: "b",
        label: "Remanier le gouvernement",
        description: "Sacrifier deux ministres pour calmer le jeu.",
        effects: { popularity: 4, authority: -3, cohesion: 0 },
        hiddenEffects: { oppositionPower: -2 },
        consequence:
          "Le remaniement absorbe le choc. Mais l'image d'instabilité s'installe.",
        mediaEffect: 0,
        ministerEffects: [
          { position: "interior", fire: true },
          { position: "ecology", fire: true },
        ],
      },
      {
        id: "c",
        label: "Engager le 49.3 sur le budget",
        description: "Forcer le passage et défier l'opposition.",
        effects: {
          authority: 6,
          popularity: -8,
          cohesion: -6,
          budget: 4,
        },
        hiddenEffects: {
          peopleFatigue: 8,
          oppositionPower: 8,
          radicalization: 6,
        },
        consequence:
          "La loi passe. La légitimité s'érode dans la durée.",
        mediaEffect: -6,
        oppositionEffect: 8,
      },
    ],
  },
  {
    id: "ev_cascade_emeutes_regions",
    category: "delayed",
    title: "Cascade : régions au bord de l'embrasement",
    context:
      "Plusieurs régions cumulent les tensions sociales, économiques et sécuritaires. Préfets et maires appellent à l'aide.",
    source: "Conséquence en cascade",
    isDelayedConsequence: true,
    choices: [
      {
        id: "a",
        label: "Plan d'urgence territorial",
        description:
          "Débloquer des fonds, dépêcher des renforts ciblés région par région.",
        effects: {
          regionalStability: 8,
          budget: -6,
          popularity: 3,
        },
        hiddenEffects: { peopleFatigue: -4 },
        consequence:
          "Les préfets respirent. La situation se stabilise localement.",
        mediaEffect: 3,
        regionEffects: [
          { region: "idf", tension: -6 },
          { region: "paca", tension: -6 },
          { region: "occitanie", tension: -5 },
          { region: "auvergne", tension: -5 },
        ],
      },
      {
        id: "b",
        label: "Décréter l'état d'urgence",
        description: "Mobilisation militaire, couvre-feux, contrôles renforcés.",
        effects: {
          security: 6,
          authority: 5,
          regionalStability: 4,
          popularity: -7,
          cohesion: -4,
        },
        hiddenEffects: { radicalization: 8, peopleFatigue: 6 },
        consequence:
          "L'ordre revient brutalement. Plusieurs interpellations contestées.",
        mediaEffect: -5,
        oppositionEffect: 5,
      },
      {
        id: "c",
        label: "Renvoyer la balle aux régions",
        description: "« Aux exécutifs locaux de prendre leurs responsabilités. »",
        effects: {
          regionalStability: -8,
          authority: -4,
          popularity: -3,
        },
        hiddenEffects: { peopleFatigue: 8, oppositionPower: 6 },
        consequence:
          "Les élus locaux dénoncent l'abandon de l'État. La crise s'enkyste.",
        mediaEffect: -6,
        oppositionEffect: 6,
        regionEffects: [
          { region: "idf", tension: 4 },
          { region: "auvergne", tension: 4 },
        ],
      },
    ],
  },
];

// v1.1 — append the Climate Crisis DLC events to the main catalog.
// They carry `pack: "climate"` and are filtered out by `pickRandomEvent`
// unless the player owns the matching entitlement.
import { CLIMATE_EVENTS } from "@/data/climateEvents";
EVENTS.push(...CLIMATE_EVENTS);

const ALL_EVENTS = [...EVENTS, ...DELAYED_EVENTS];

export function getEventById(id: string): CrisisEvent | undefined {
  return ALL_EVENTS.find((e) => e.id === id);
}

/**
 * Filter helper: an event is playable iff it is part of the free core
 * (no `pack`) OR its pack is in `unlockedPacks`.
 */
function isPlayable(e: CrisisEvent, unlockedPacks: ReadonlySet<EventPack>): boolean {
  return e.pack === undefined || unlockedPacks.has(e.pack);
}

export function pickRandomEvent(
  excludeIds: string[] = [],
  preferredCategories: EventCategory[] = [],
  unlockedPacks: ReadonlySet<EventPack> = new Set(),
): CrisisEvent {
  const playable = EVENTS.filter((e) => isPlayable(e, unlockedPacks));
  const pool = playable.filter((e) => !excludeIds.includes(e.id));
  // Defensive: if a future config tags every event with an unowned
  // pack, `playable` could be empty. Falling back to the full catalog
  // guarantees we never return undefined, even if it briefly serves a
  // pack-tagged event (better than crashing the game loop).
  const source = pool.length > 0 ? pool : playable.length > 0 ? playable : EVENTS;
  // Module IA 2: 70% of the time, if the director suggested categories
  // and at least one event in those categories is still available,
  // pick from that biased subset. The remaining 30% (or 100% if no
  // director signal) keep the catalog feeling varied.
  if (preferredCategories.length > 0 && Math.random() < 0.7) {
    const biased = source.filter((e) => preferredCategories.includes(e.category));
    if (biased.length > 0) {
      return biased[Math.floor(Math.random() * biased.length)]!;
    }
  }
  const idx = Math.floor(Math.random() * source.length);
  return source[idx]!;
}
