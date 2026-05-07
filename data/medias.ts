/**
 * Module 4 — Médias & réseaux sociaux.
 *
 * Quatre médias FICTIFS (aucun nom réel — Apple Store + diffamation)
 * avec une identité narrative reconnaissable. Chaque média :
 *   - a un focus thématique (les jauges qu'il « suit » de près) ;
 *   - a un ton de prédilection (alarmiste / institutionnel / etc.) ;
 *   - dispose de pools de templates par tonalité dans lesquels le
 *     moteur déterministe (`logic/mediaNarrative.ts`) tire une "une"
 *     après chaque décision du joueur.
 *
 * Pourquoi déterministe et pas IA : la voix doit être RECONNAISSABLE
 * de tour en tour pour qu'on s'attache (ou se méfie) du média. C'est
 * aussi gratuit, instantané et hors-ligne.
 */
import type { GaugeKey } from "@/types/game";
import type { EventCategory } from "@/data/events";

export type MediaOutletId = "clairon" | "marches" | "republique" | "reseau";

/**
 * Tonalité d'une "une" donnée. La même tonalité se traduit par des
 * effets différents selon le média (voir `mediaImpact` dans le moteur).
 */
export type MediaTone = "favorable" | "critique" | "alarmiste" | "neutre";

/**
 * Variables substituables dans les templates de unes.
 *
 *   {president}       — nom complet du/de la président·e en exercice.
 *   {eventTitle}      — titre court de la décision en cours.
 *   {gaugeUp}         — libellé FR de la jauge qui a le plus monté
 *                        ("la sécurité", "le climat social"…).
 *   {gaugeDown}       — libellé FR de la jauge qui a le plus baissé.
 *   {biggestDelta}    — entier signé du plus gros mouvement (ex "+8").
 */
export type MediaTemplateVar =
  | "{president}"
  | "{eventTitle}"
  | "{gaugeUp}"
  | "{gaugeDown}"
  | "{biggestDelta}";

export interface MediaOutlet {
  id: MediaOutletId;
  /** Nom complet imprimé sur la une. */
  name: string;
  /** Slogan court affiché en sous-titre du bandeau. */
  tagline: string;
  /** Couleur dominante du bandeau (hex). */
  color: string;
  /** Icône Feather utilisée dans le bandeau. */
  icon: "users" | "trending-up" | "shield" | "zap";
  /**
   * Jauges suivies de près. Si la décision affecte fortement une
   * de ces jauges, ce média est plus susceptible de prendre la
   * parole. Premier élément = jauge la plus "à cœur" pour ce média.
   */
  focusGauges: GaugeKey[];
  /**
   * Catégories d'événements qui motivent ce média à parler en
   * priorité. Bonus de score quand l'event est dans cette liste.
   */
  focusCategories: EventCategory[];
  /**
   * Bonus déclenché par un scandale révélé / un frondeur émergeant.
   * Réseau Libre adore ça, Canal République déteste ça.
   */
  scandalAffinity: number;
  /**
   * Bonus de "fond de score" appliqué à chaque décision. Permet à
   * un média sous-utilisé de rester présent (Canal République parle
   * souvent même quand rien ne brûle). 0-3.
   */
  baselineWeight: number;
  /**
   * Pools de templates par tonalité. Le moteur tire dans le bon pool
   * selon le bilan des effets de la décision pour CE média.
   * Chaque entrée est une phrase complète, gabarit avec variables.
   */
  templates: Record<MediaTone, string[]>;
}

/**
 * ─── LE CLAIRON POPULAIRE ──────────────────────────────────────────
 * Ton : populaire, colérique, quotidien, indigné. Couvre la vie des
 * gens — pouvoir d'achat, santé, retraites, services publics.
 * Tend à l'alarmisme dès que la popularité ou la cohésion vacille.
 */
const CLAIRON_POPULAIRE: MediaOutlet = {
  id: "clairon",
  name: "LE CLAIRON POPULAIRE",
  tagline: "La voix qui ne s'éteint pas",
  color: "#c0392b",
  icon: "users",
  focusGauges: ["popularity", "cohesion", "health", "economy"],
  focusCategories: ["social", "economy"],
  scandalAffinity: 1,
  baselineWeight: 1,
  templates: {
    favorable: [
      "« {president} entend enfin la rue » — {gaugeUp} en hausse, soulagement dans les quartiers populaires.",
      "Un répit pour les Français : {gaugeUp} progresse de {biggestDelta} points.",
      "Geste fort de l'Élysée : « {eventTitle} », et la rue respire un peu.",
      "« On verra bien si ça dure » — accueil prudent mais favorable dans les classes populaires.",
    ],
    critique: [
      "{president} déconnecté·e ? La rue s'inquiète : {gaugeDown} décroche encore.",
      "« Encore une promesse en l'air » — {gaugeDown} en chute libre après « {eventTitle} ».",
      "Pendant que l'Élysée parle, les Français comptent : {gaugeDown} {biggestDelta} points.",
      "Colère sourde dans les territoires : « {eventTitle} » mal vécu sur le terrain.",
    ],
    alarmiste: [
      "EXPLOSIF : {gaugeDown} s'effondre ({biggestDelta}) — la cocotte-minute siffle.",
      "« {president}, démission ? » — la rue gronde, {gaugeDown} en chute libre.",
      "Crise sociale en vue : {gaugeDown} dévisse de {biggestDelta} points en un trimestre.",
      "ULTIMATUM : les syndicats appellent à la mobilisation après « {eventTitle} ».",
    ],
    neutre: [
      "« {eventTitle} » : la rue attend de voir.",
      "Décision prise par {president} — accueil mitigé dans les quartiers.",
      "Vie quotidienne : pas de bouleversement majeur après « {eventTitle} ».",
    ],
  },
};

/**
 * ─── MARCHÉS & POUVOIR ─────────────────────────────────────────────
 * Ton : économique, froid, technocratique. Couvre la dette, le budget,
 * les marchés, les investisseurs. Critique la dépense, salue la
 * rigueur. Insensible aux scandales ou à l'humeur de la rue.
 */
const MARCHES_POUVOIR: MediaOutlet = {
  id: "marches",
  name: "MARCHÉS & POUVOIR",
  tagline: "L'économie, sans concession",
  color: "#2c8c4d",
  icon: "trending-up",
  focusGauges: ["economy", "budget", "debt", "diplomacy"],
  focusCategories: ["economy", "diplomacy"],
  scandalAffinity: -1,
  baselineWeight: 1,
  templates: {
    favorable: [
      "Confiance restaurée : {gaugeUp} progresse de {biggestDelta} points, les marchés saluent.",
      "Cap stratégique tenu — « {eventTitle} » bien accueilli par les investisseurs.",
      "{president} rassure : {gaugeUp} en hausse, le spread se détend.",
      "Geste de rigueur attendu : {gaugeUp} {biggestDelta} pts, signal positif pour les agences.",
    ],
    critique: [
      "Inquiétude des marchés : {gaugeDown} recule de {biggestDelta} pts après « {eventTitle} ».",
      "{president} cède à la facilité — {gaugeDown} en repli, les analystes alertent.",
      "Décision politique, addition économique : {gaugeDown} {biggestDelta} pts.",
      "Les investisseurs froncent les sourcils : « {eventTitle} » fait grimper la prime de risque.",
    ],
    alarmiste: [
      "DÉCROCHAGE : {gaugeDown} chute de {biggestDelta} pts — les agences de notation s'agitent.",
      "Signal rouge sur la dette française après « {eventTitle} » : {gaugeDown} en chute libre.",
      "Les marchés sanctionnent {president} — {gaugeDown} {biggestDelta}, le scénario noir se précise.",
      "Décrochage budgétaire : « {eventTitle} » coûte cher, très cher.",
    ],
    neutre: [
      "« {eventTitle} » : impact économique limité à ce stade.",
      "Marchés en attente : pas de réaction notable à la décision de {president}.",
      "Statu quo budgétaire après « {eventTitle} » — les analystes restent prudents.",
    ],
  },
};

/**
 * ─── CANAL RÉPUBLIQUE ──────────────────────────────────────────────
 * Ton : institutionnel, posé, presque officiel. Insiste sur la
 * stabilité, le respect des institutions, la sécurité. Tendance à
 * mettre en valeur l'action gouvernementale. Très allergique au
 * désordre (scandales, frondes, tensions régionales).
 */
const CANAL_REPUBLIQUE: MediaOutlet = {
  id: "republique",
  name: "CANAL RÉPUBLIQUE",
  tagline: "L'information de référence",
  color: "#2c5aa0",
  icon: "shield",
  focusGauges: ["security", "authority", "diplomacy", "regionalStability"],
  focusCategories: ["security", "diplomacy", "regional"],
  scandalAffinity: -2,
  baselineWeight: 2,
  templates: {
    favorable: [
      "L'État tient le cap — « {eventTitle} » salué par les observateurs.",
      "{president} consolide l'autorité de l'État : {gaugeUp} en hausse de {biggestDelta} points.",
      "Stabilité institutionnelle : la décision de l'Élysée fait consensus.",
      "Réponse à la hauteur : {gaugeUp} progresse, la République est ferme.",
    ],
    critique: [
      "L'autorité de l'État questionnée après « {eventTitle} » — {gaugeDown} en repli.",
      "Doutes dans les rangs : {president} sous le feu des critiques institutionnelles.",
      "Le pacte républicain à l'épreuve : {gaugeDown} {biggestDelta} pts.",
      "Voix discordantes au sein de l'appareil d'État après « {eventTitle} ».",
    ],
    alarmiste: [
      "Crise institutionnelle : {gaugeDown} s'effondre de {biggestDelta} points.",
      "L'État vacille — « {eventTitle} » ouvre une brèche grave dans le pacte républicain.",
      "{president} face au précipice : {gaugeDown} en chute, la République sous tension.",
      "Alerte démocratique : la décision « {eventTitle} » fragilise les équilibres.",
    ],
    neutre: [
      "« {eventTitle} » : décision conforme à l'usage républicain.",
      "L'Élysée applique sa feuille de route — pas de remous institutionnel.",
      "Communiqué officiel : {president} acte la décision « {eventTitle} ».",
    ],
  },
};

/**
 * ─── RÉSEAU LIBRE ──────────────────────────────────────────────────
 * Ton : rumeur, scandale, polarisation, viralité. C'est le média des
 * réseaux sociaux — il adore les scandales, les frondeurs, les
 * conspirations. Dur·e avec tout le monde, surtout l'establishment.
 * Quand un scandale éclate, c'est lui qui parle.
 */
const RESEAU_LIBRE: MediaOutlet = {
  id: "reseau",
  name: "RÉSEAU LIBRE",
  tagline: "Ce qu'on ne vous dit pas",
  color: "#7d3c98",
  icon: "zap",
  focusGauges: ["popularity", "authority", "cohesion"],
  focusCategories: ["scandal", "media", "opposition", "cyber"],
  scandalAffinity: 4,
  baselineWeight: 0,
  templates: {
    favorable: [
      "Surprise : « {eventTitle} » fait l'unanimité même chez les plus critiques.",
      "Le buzz qu'on n'attendait pas : {gaugeUp} flambe, {president} tient ses promesses.",
      "Twitter en feu (positif !) — « {eventTitle} » devient virale.",
    ],
    critique: [
      "RÉVÉLATION : derrière « {eventTitle} », des questions qui dérangent. {gaugeDown} {biggestDelta} pts.",
      "Le pouvoir tente de noyer le poisson, on remet l'église au milieu du village.",
      "Threads viraux : « {eventTitle} », vraiment ? {gaugeDown} en repli, les internautes ne sont pas dupes.",
      "Un fil de discussion va vous faire changer d'avis sur « {eventTitle} ».",
    ],
    alarmiste: [
      "🚨 SCANDALE : ce que {president} ne voulait surtout pas que vous sachiez sur « {eventTitle} ».",
      "VIRAL : « {gaugeDown} en chute libre {biggestDelta} pts » — le hashtag #DémissionMaintenant explose.",
      "BOMBE : « {eventTitle} » déclenche une tempête politique. Tout le monde en parle.",
      "Le pouvoir vacille : {gaugeDown} s'effondre, et personne dans les médias mainstream n'en parle.",
    ],
    neutre: [
      "« {eventTitle} » fait débat sur les réseaux. Affaire à suivre.",
      "Communication soignée de l'Élysée — un peu trop, justement ?",
      "On vous laisse vous faire votre propre opinion sur « {eventTitle} ».",
    ],
  },
};

export const MEDIA_OUTLETS: Record<MediaOutletId, MediaOutlet> = {
  clairon: CLAIRON_POPULAIRE,
  marches: MARCHES_POUVOIR,
  republique: CANAL_REPUBLIQUE,
  reseau: RESEAU_LIBRE,
};

export const MEDIA_OUTLET_LIST: MediaOutlet[] = [
  CLAIRON_POPULAIRE,
  MARCHES_POUVOIR,
  CANAL_REPUBLIQUE,
  RESEAU_LIBRE,
];

/** Libellés FR des jauges pour substitution dans les templates. */
export const GAUGE_LABELS_FR: Record<GaugeKey, string> = {
  popularity: "la popularité",
  economy: "l'économie",
  budget: "le budget",
  debt: "la dette",
  security: "la sécurité",
  health: "la santé",
  ecology: "l'environnement",
  cohesion: "la cohésion sociale",
  diplomacy: "la diplomatie",
  regionalStability: "la stabilité régionale",
  authority: "l'autorité de l'État",
};
