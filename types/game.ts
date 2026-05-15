import { CrisisEvent } from "@/data/events";
import { Minister } from "@/data/ministers";
import { Region } from "@/data/regions";
import { PlayerPromise, PromiseTag } from "@/data/promises";
import { ElectionResult } from "@/logic/electionEngine";

export interface Gauges {
  popularity: number;
  economy: number;
  budget: number;
  debt: number;
  security: number;
  health: number;
  ecology: number;
  cohesion: number;
  diplomacy: number;
  regionalStability: number;
  authority: number;
}

export type GaugeKey = keyof Gauges;

/**
 * ─── LOT 18 — Ressources stockables ──────────────────────────────
 *
 * En complément des `Gauges` (état du pays en %), les `Resources`
 * sont des STOCKS absolus consommés par les recherches du tech-tree
 * et par certains choix de crise. Ils sont régénérés mensuellement
 * (revenus / dépenses) et bornés par `RESOURCE_MAX`.
 *
 *  - budgetNational : crédits d'État (gros nombres : 0..10 000)
 *  - politicalInfluence : capital politique (0..100)
 *  - intelligence : capacité de renseignement (0..100)
 *  - technology : avance technologique (0..100)
 *  - energy : marge énergétique du pays (0..100)
 *
 * À NE PAS confondre avec la jauge `Gauges.budget` qui devient
 * "Finances publiques" et représente l'équilibre budgétaire en %.
 */
export interface Resources {
  budgetNational: number;
  politicalInfluence: number;
  intelligence: number;
  technology: number;
  energy: number;
}

export type ResourceKey = keyof Resources;

/** Coût ou gain partiel — toutes les clés sont optionnelles. */
export type ResourceCosts = Partial<Resources>;

/**
 * Hidden meta-gauges. Never displayed by default — they influence drift
 * and event triggers, and are revealed to the player either explicitly
 * (via a choice's `revealsHiddenGauge`) or automatically when they cross
 * a critical threshold.
 */
export interface HiddenGauges {
  scandalRisk: number;
  peopleFatigue: number;
  radicalization: number;
  foreignDependence: number;
  cyberRisk: number;
  corruption: number;
  oppositionPower: number;
}

export type HiddenGaugeKey = keyof HiddenGauges;

export type Ideology =
  | "liberal"
  | "conservateur"
  | "socialiste"
  | "ecologiste"
  | "souverainiste";

export interface President {
  name: string;
  party: string;
  ideology: Ideology;
  age: number;
}

export type AIHeadlineTone =
  | "favorable"
  | "critique"
  | "neutre"
  | "alarmiste"
  | "sarcastique";

/**
 * Module IA 3 — fictional press headline generated in reaction to a
 * player decision. NEVER references real outlets, parties, or public
 * figures (Apple App Store compliance + defamation risk).
 *
 * Module 4 — depuis la mise en place des 4 médias fictifs
 * récurrents, `mediaId` identifie quel média parle (déterministe).
 * Les anciennes saves sans `mediaId` (générées par l'IA Module IA 3)
 * restent valides : le champ est optionnel et le composant
 * d'affichage retombe sur `outlet` quand il est absent.
 */
export interface AIHeadline {
  outlet: string;
  headline: string;
  snippet: string;
  tone: AIHeadlineTone;
  mediaId?: import("@/data/medias").MediaOutletId;
}

/**
 * Module IA 4 — Intelligent opposition.
 *
 * The deterministic analyzer (`lib/oppositionAnalysis.ts`) detects
 * which weaknesses the player is exposing (high debt, low security,
 * broken promises, etc.) and emits a list of `OppositionWeakness`
 * objects. The AI then writes one `OppositionAttack` per weakness for
 * the final televised debate.
 *
 * IMPORTANT: the AI ONLY writes the rhetoric. It NEVER decides the
 * election score — that stays 100% deterministic in
 * `logic/electionEngine.ts/computeElection()`.
 */
export type OppositionAngle =
  | "budget"
  | "security"
  | "ecology"
  | "cohesion"
  | "broken_promise"
  | "popularity"
  | "scandals"
  | "authority";

export type OppositionSeverity = "low" | "medium" | "high";

export interface OppositionWeakness {
  angle: OppositionAngle;
  severity: OppositionSeverity;
  /** Short factual context the AI is allowed to quote (e.g. "Dette publique : 78/100"). */
  context: string;
  /**
   * Module 5 — pour les `broken_promise`, le tag de la promesse
   * concernée. Permet à `tickAttackLines` (logic/oppositionLines.ts)
   * de tracker une ligne d'attaque distincte par promesse trahie
   * plutôt que de les agréger sous un seul "broken_promise".
   */
  promiseTag?: import("@/data/promises").PromiseTag;
  /**
   * Module 5 — pour les `broken_promise`, le libellé court de la
   * promesse, prêt à être substitué dans `{label}` des slogans.
   */
  promiseLabel?: string;
}

export interface OppositionAttack {
  angle: OppositionAngle;
  line: string;
}

/**
 * Module 5 — Opposition intelligente, ligne d'attaque PERSISTANTE.
 *
 * Tant qu'une faiblesse (jauge basse, promesse trahie, scandales…)
 * dure, l'opposition garde son angle d'attaque ouvert et durcit le
 * ton avec le temps. Quand la faiblesse disparaît, la ligne se ferme.
 *
 * Identité de la ligne :
 *   - angle != "broken_promise"  → 1 ligne par angle
 *   - angle == "broken_promise"  → 1 ligne par promesse trahie,
 *                                  identifiée par `promiseTag`
 *
 * `id` est généré une seule fois à la création et reste stable tant
 * que la ligne vit, ce qui permet aux composants de la mémoïser.
 */
export interface OppositionAttackLineState {
  id: string;
  angle: OppositionAngle;
  severity: OppositionSeverity;
  /** Nb de tours consécutifs d'activité (incrémenté à chaque tick). */
  turnsActive: number;
  /** Tour où la ligne a démarré (sert d'affichage "depuis le tour N"). */
  firstTurn: number;
  /** Dernier tour où la ligne a été confirmée par les faits. */
  lastTurn: number;
  /** Slogan virulent piochée dans `data/oppositionSlogans.ts`. */
  slogan: string;
  /** Pour broken_promise uniquement — tag de la promesse trahie. */
  promiseTag?: import("@/data/promises").PromiseTag;
}

// ─── Module 6 — Guerre hybride & guerre conventionnelle ─────────────
//
// Un acteur étranger FICTIF persistant ("La Division Zéro") observe
// les vulnérabilités françaises et orchestre des opérations sur 9
// vecteurs de guerre hybride. Si on l'humilie ou si on ignore ses
// avertissements, son agressivité monte et il peut déclencher un
// ULTIMATUM, point d'entrée d'un mini-jeu de guerre conventionnelle.
//
// IMPORTANT — conformité Apple/Google : aucun pays, parti, dirigeant
// ou organisation réel·le ne doit jamais être nommé. La Division
// Zéro est l'unique acteur, totalement fictionnel.

/**
 * Les 9 vecteurs de guerre hybride. Chaque opération hostile
 * appartient à exactement un vecteur. Le tirage est dirigé par la
 * doctrine de l'acteur + l'état des jauges françaises.
 */
export type HybridOpVector =
  | "cyber"
  | "disinformation"
  | "espionage"
  | "energy_blackmail"
  | "industrial_sabotage"
  | "diplomatic_pressure"
  | "social_manipulation"
  | "document_leak"
  | "infrastructure_attack";

/**
 * L'unique acteur hostile. Persiste sur toute la partie ; ses
 * caractéristiques de doctrine pondèrent quels vecteurs il privilégie.
 * `aggression` est la jauge cachée principale (0-100). Au-delà de 80
 * et avec ≥ 2 opérations non-désamorcées, un ULTIMATUM est posé.
 */
export interface HostilePower {
  id: string;
  /** Nom affiché (FR) — TOUJOURS fictionnel. */
  name: string;
  /** Couleur d'identité visuelle (utilisée dans l'UI). */
  color: string;
  /** Description courte affichée à la première rencontre. */
  description: string;
  /** Pondération par vecteur (0-1 ; somme libre, normalisée à l'usage). */
  doctrine: Record<HybridOpVector, number>;
  /** 0-100. Drift +1 par tour, +N par humiliation, -N par concession. */
  aggression: number;
  /** Tour du dernier déclenchement (cooldown anti-spam, 0 = jamais). */
  lastOpTurn: number;
  /**
   * IDs des contre-mesures déjà appliquées dans ce mandat.
   * Empêche le rejouage abusif (sanctions / cyber-invest spammés
   * pour farmer authority ou casser l'aggression). Reset au 2nd
   * mandat. Optionnel pour rétro-compat saves antérieures.
   */
  usedCountermeasures?: string[];
}

/**
 * Une opération hybride orchestrée par l'acteur hostile, journalisée
 * sur l'état de jeu. La résolution proprement dite passe par un
 * `CrisisEvent` standard du catalogue (eventId), ce qui réutilise
 * tout le pipeline de choix / effets / cascades existant.
 *
 * `defused` passe à true quand le joueur a fait le bon choix sur
 * l'event lié (= choix qui réduit l'agressivité ou ne l'augmente pas).
 */
export interface HybridOperation {
  id: string;
  vector: HybridOpVector;
  turn: number;
  /** Référence à l'event qui a été tiré pour la matérialiser. */
  eventId: string;
  /** Sévérité initiale ("low"|"medium"|"high"). */
  severity: "low" | "medium" | "high";
  /** True si désamorcée par le bon choix joueur. */
  defused: boolean;
  /** True si l'event a été résolu (peu importe l'issue). */
  resolved: boolean;
}

/**
 * Niveau de menace global, calculé déterministiquement à partir de
 * `aggression` + nombre d'opérations actives + état de guerre.
 * Affiché en clair sur le dashboard et la page Front diplomatique.
 */
export type HybridThreatLevel =
  | "vigilance"
  | "tension"
  | "alerte"
  | "imminence";

/**
 * Statut du sous-jeu "guerre conventionnelle".
 * - "peace"     : pas d'état de guerre actif (par défaut)
 * - "ultimatum" : un ultimatum a été posé, le joueur doit choisir
 * - "war"       : guerre en cours, gameplay alterné (3-5 tours max)
 * - "victory"   : victoire militaire (paix triomphante)
 * - "defeat"    : défaite militaire (capitulation forcée)
 * - "truce"     : trêve négociée (paix grise, scores moyens)
 */
export type WarStatus =
  | "peace"
  | "ultimatum"
  | "war"
  | "victory"
  | "defeat"
  | "truce";

/**
 * État du mini-jeu de guerre conventionnelle. Présent uniquement à
 * partir de l'ultimatum ; quand `status === "peace"`, le champ peut
 * être absent du `GameState` (rétro-compat saves antérieures).
 *
 * Trois jauges propres à la guerre :
 *  - mobilization : capacité humaine et industrielle (0-100)
 *  - allies       : soutien international fictif (0-100)
 *  - supply       : ravitaillement et logistique (0-100)
 *
 * Le verdict (`judgeWar`) est rendu après `maxWarTurns` (3-5) en
 * fonction du SCORE = mobilization + allies + supply. Au-dessus
 * d'un seuil → victoire ; en dessous d'un autre → défaite ; sinon
 * → trêve.
 */
export interface WarState {
  status: WarStatus;
  /** Tour de jeu où l'ultimatum a été posé. */
  ultimatumTurn: number;
  /** Nombre de tours écoulés depuis le DÉBUT de la guerre. */
  warTurn: number;
  /** Tours maximums de guerre avant verdict automatique. */
  maxWarTurns: number;
  mobilization: number;
  allies: number;
  supply: number;
  /** Verdict une fois la guerre finie (sinon null). */
  outcome: "victory" | "defeat" | "truce" | null;
}

/**
 * Module IA 5 — Final presidential debate.
 *
 * At the end of the mandate, the game extracts the player's 5 most
 * impactful decisions, the AI writes a sharp opposition attack against
 * each one, and the player picks a rhetorical strategy per attack.
 *
 * Each strategy yields a DETERMINISTIC vote-share modifier (range
 * ±2.5 per pick, ±~10 cumulative). The modifier is applied on TOP of
 * the baseline `computeElection()` score via the pure function
 * `applyFinalDebateModifier()` in `lib/finalDebate.ts`. The AI is
 * still text-only — it never decides the vote.
 */
export type FinalDebateStrategy =
  | "calm" // Riposte calme & posée — apaisement, gravité présidentielle
  | "aggressive" // Riposte agressive — autorité, contre-offensive directe
  | "ironic" // Riposte ironique — humour cinglant, déstabilisation
  | "factual" // Riposte factuelle — chiffres, contexte, démonstration
  | "emotional" // Riposte émotionnelle — sincérité, vulnérabilité assumée
  | "evasive"; // Esquive — détournement, refus de mordre à l'hameçon

/**
 * Anciens IDs (lots ≤ R7) — remplacés par les 6 stratégies ci-dessus.
 * Conservé uniquement pour migration des sauvegardes existantes :
 * `coerceStrategy()` dans `lib/finalDebate.ts` mappe ces valeurs vers
 * la nouvelle palette pour que les sauvegardes de joueurs ne crashent
 * pas après mise à jour.
 */
export type LegacyFinalDebateStrategy =
  | "assume"
  | "deny"
  | "explain"
  | "divert"
  | "counter";

export type DecisionSentiment = "positive" | "negative" | "neutral";

/** A player decision selected for the final debate. Pure data, no UI. */
export interface FinalDebateDecision {
  decisionId: string;
  turn: number;
  eventTitle: string;
  choiceLabel: string;
  consequence: string;
  /** Sum of |effects| (with debt sign-flipped) — proxy for "how big a deal was this?". */
  impactScore: number;
  /** Was the net effect of this decision good, bad, or mixed for the country? */
  sentiment: DecisionSentiment;
  hadBrokenPromise: boolean;
  hadScandal: boolean;
}

export interface FinalDebateAttack {
  decisionId: string;
  /** Opposition's accusation about THIS specific decision. */
  line: string;
}

export interface FinalDebatePack {
  decisions: FinalDebateDecision[];
  attacks: FinalDebateAttack[];
}

export interface FinalDebateChoice {
  decisionId: string;
  strategy: FinalDebateStrategy;
  /** Cached vote-share delta produced by computeStrategyModifier. */
  modifier: number;
}

/**
 * Chantier 1 — Opposition réactive entre tours.
 *
 * Stance + line generated by `lib/oppositionReaction.ts` from the
 * decision's effects, promise outcomes and delayed-consequence flag.
 * 100% deterministic, no AI involved.
 */
export type OppositionStance =
  | "approve"
  | "tolerate"
  | "criticize"
  | "denounce"
  | "exploit";

export type OppositionReactionAxis =
  | "scandal"
  | "broken_promise"
  | "popularity"
  | "cohesion"
  | "security"
  | "budget"
  | "authority"
  | "ecology"
  | "diplomacy"
  | "fulfilled"
  | "neutral";

export interface OppositionReaction {
  stance: OppositionStance;
  axis: OppositionReactionAxis;
  /** Short FR line read out under the dashboard's last decision. */
  line: string;
  /** Applied to state.opposition by the caller. */
  oppositionDelta: number;
  /** Applied to state.media by the caller. */
  mediaDelta: number;
}

export interface DecisionLogEntry {
  id: string;
  turn: number;
  eventTitle: string;
  choiceLabel: string;
  consequence: string;
  effects: Partial<Gauges>;
  timestamp: number;
  promisesFulfilled?: PromiseTag[];
  promisesBroken?: PromiseTag[];
  scandalRevealed?: string;
  isDelayedConsequence?: boolean;
  /**
   * Crises en cascade — when this log entry is the firing of a
   * scheduled cascade step, this carries the originating decision's
   * label so the UI can render "⚠️ Conséquence de : <sourceLabel>".
   */
  cascadeSource?: {
    sourceTurn: number;
    sourceChoiceLabel: string;
    sourceEventTitle: string;
  };
  /** Optional fictional press reaction generated by Module IA 3. */
  aiHeadline?: AIHeadline;
  /** Chantier 1 — opposition stance + line attached at resolve-time. */
  oppositionReaction?: OppositionReaction;
  /**
   * Module 3 — discriminator for log entries produced by the
   * minister-dynamics tick (`scandal_eruption` | `rival_emergence`).
   * Consumed by the AlertTicker so it can build SCANDALE/FRONDE
   * pills WITHOUT brittle string matching on `eventTitle`.
   */
  ministerEventKind?: "scandal_eruption" | "rival_emergence";
}

export interface DelayedEvent {
  eventId: string;
  triggerTurn: number;
}

/**
 * ─── Crises en cascade ────────────────────────────────────────────
 * A single decision can schedule a CHAIN of delayed consequences
 * spread across multiple turns, of three different kinds:
 *
 *  - "gauge"    a small gauge / hidden / media / opposition delta
 *               applied silently with a log entry attributing it
 *               to the originating choice.
 *  - "notice"   a pure narrative beat (no numerical effect) — used
 *               for "the markets are getting nervous…" beats that
 *               build dread before a real shock lands.
 *  - "event"    a follow-up event card to draw on a future turn.
 *               (Reuses the existing `delayedEvents` plumbing.)
 *
 * Each step is shown to the player BEFORE it triggers in the
 * dashboard's "CONSÉQUENCES À VENIR" panel, so they can see the
 * trap they set for themselves.
 */
export interface CascadeGaugeStep {
  kind: "gauge";
  /** Number of turns from the originating decision (must be >= 1). */
  delay: number;
  /** Short narrative line shown both in the upcoming panel and the log. */
  label: string;
  effects?: Partial<Gauges>;
  hiddenEffects?: Partial<HiddenGauges>;
  mediaEffect?: number;
  oppositionEffect?: number;
}

export interface CascadeNoticeStep {
  kind: "notice";
  delay: number;
  label: string;
}

export interface CascadeEventStep {
  kind: "event";
  delay: number;
  label: string;
  /** Existing event id to be drawn `delay` turns from now. */
  eventId: string;
}

export type CascadeStep =
  | CascadeGaugeStep
  | CascadeNoticeStep
  | CascadeEventStep;

/**
 * A cascade step queued on the live GameState, with absolute
 * trigger turn and full source attribution so the UI can say
 * "Conséquence de votre décision semaine 4 : Baisser les taxes
 *  carburant".
 */
export interface ScheduledConsequence {
  id: string;
  /** Absolute turn at which to fire (game.turn comparison). */
  triggerTurn: number;
  /** Turn at which the originating decision was taken. */
  sourceTurn: number;
  sourceEventTitle: string;
  sourceChoiceLabel: string;
  step: CascadeStep;
}

export interface HiddenScandal {
  id: string;
  title: string;
  popularityDamage: number;
  authorityDamage: number;
  mediaDamage: number;
  revealAt: number;
}

export interface GameOverResult {
  isOver: boolean;
  reason?: string;
  victory?: boolean;
  title?: string;
  triggeredElection?: boolean;
}

/**
 * Horloge de simulation — vocabulaire visible Saison / Jour / Heure.
 * Calculée depuis gameTime.currentMonth (mapping 1:1 mois → jour de jeu).
 * Voir logic/simulationClock.ts pour les constantes et fonctions de formatage.
 */
export interface SimulationClock {
  /** Numéro de saison en cours (1..5 pour un mandat de 60 jours / 5 saisons). */
  seasonNumber: number;
  /** Jour absolu en cours dans le mandat (1..60, = currentMonth interne). */
  currentGameDay: number;
  /** Sous-progression du jour courant en heures jeu (0..23). */
  currentGameHour: number;
  /** Ratio heures jeu / heure réelle (4 par défaut). */
  gameHoursPerRealHour: number;
  /** Jour de jeu du prochain événement majeur. */
  nextEventGameDay: number;
  /** Jour de jeu du prochain sondage (optionnel). */
  nextPollGameDay?: number;
  /** Jour de jeu de la prochaine crise majeure programmée (optionnel). */
  nextMajorCrisisGameDay?: number;
  /** Jour de jeu du prochain bilan (trimestriel ou annuel). */
  nextReportGameDay?: number;
}

export interface GameState {
  president: President | null;
  gauges: Gauges;
  turn: number;
  maxTurns: number;
  currentEvent: CrisisEvent | null;
  log: DecisionLogEntry[];
  seenEventIds: string[];
  gameOver: GameOverResult;
  startedAt: number | null;
  ministers: Minister[];
  regions: Region[];
  media: number;
  opposition: number;
  promises: PlayerPromise[];
  delayedEvents: DelayedEvent[];
  /**
   * Crises en cascade — staggered consequences attached to past
   * decisions, fired at their `triggerTurn`. See CascadeStep.
   */
  scheduledConsequences: ScheduledConsequence[];
  hiddenScandals: HiddenScandal[];
  scandalsRevealed: number;
  electionResult: ElectionResult | null;
  /** Module IA 4 — fictional opposition attacks rendered on the
   *  election screen during the final debate. Persisted so reloading
   *  the screen doesn't regenerate them (and re-bill the API). */
  electionDebate?: OppositionAttack[] | null;
  /** Module IA 5 — the 5 selected decisions + AI attacks for the
   *  interactive final debate. Persisted so screen remounts don't
   *  re-bill the API. */
  finalDebatePack?: FinalDebatePack | null;
  /** Module IA 5 — the player's strategy picks (one per decision).
   *  Persisted so reloading the screen keeps the player's score. */
  finalDebateChoices?: FinalDebateChoice[] | null;
  hiddenGauges: HiddenGauges;
  revealedHiddenKeys: HiddenGaugeKey[];
  /**
   * Module 2 — Numéro du dernier tour où un évènement régional
   * (rgn_*) a été tiré. Sert de cooldown pour éviter qu'une région
   * ne sature le flux d'évènements. 0 = jamais.
   */
  lastRegionalEventTurn?: number;
  /**
   * Module 5 — Lignes d'attaque persistantes de l'opposition.
   * Recalculées à chaque tour à partir de
   * `analyzeOppositionWeaknesses` puis fusionnées avec l'état
   * précédent pour incrémenter `turnsActive` quand la faiblesse
   * persiste. Optionnel pour la rétro-compat avec les saves
   * antérieures (sera initialisé à [] au chargement).
   */
  attackLines?: OppositionAttackLineState[];
  /**
   * Module 6 — Acteur hostile fictif persistant (« La Division Zéro »).
   * Initialisé au démarrage d'une nouvelle partie ; absent dans les
   * saves antérieures (re-hydraté à `null`/factory au chargement).
   */
  hostilePower?: HostilePower | null;
  /**
   * Module 6 — Journal des opérations hybrides ATTRIBUÉES à l'acteur
   * hostile sur ce mandat. Plus on en accumule de non-désamorcées,
   * plus la menace monte. Optionnel pour rétro-compat.
   */
  hybridOps?: HybridOperation[];
  /**
   * Module 6 — État du mini-jeu de guerre conventionnelle. Absent
   * tant qu'aucun ultimatum n'a été posé (statut implicite "peace").
   */
  warState?: WarState | null;
  /**
   * Module 7 — Arbre technologique national. Optionnel pour
   * rétro-compat avec les saves antérieures (re-hydraté à
   * `{researched:[],inProgress:null}` au chargement).
   */
  tech?: TechState;
  /**
   * Module 8 — Horloge de mandat (60 mois = 5 ans). Optionnel
   * pour rétro-compat ; sanitize au chargement le crée si
   * absent. Voir `logic/timeEngine.ts`.
   */
  gameTime?: GameTime;
  /**
   * Horloge de simulation — vocabulaire Saison / Jour / Heure.
   * Calculée dynamiquement depuis gameTime.currentMonth (1:1 mapping).
   * Optionnel : absent dans les vieilles saves, calculé à l'affichage.
   */
  simulationClock?: SimulationClock;
  /**
   * LOT 15 — File des événements MINEURS en attente de traitement
   * sur le dashboard. Affichés via `MinorEventCard`. N'interrompent
   * pas le temps. Auto-expirés après quelques mois.
   */
  minorEventQueue?: MinorEventEntry[];
  /**
   * LOT 15 — File des NOTIFICATIONS fictives à diffuser dans
   * l'AlertTicker (info pure, pas de pause). Auto-expirées.
   */
  eventNotifications?: EventNotification[];
  /**
   * LOT 18 — Ressources stockables (Budget National absolu,
   * Influence Politique, Renseignements, Technologie, Énergie).
   * Optionnel pour rétro-compat avec les saves antérieures
   * (re-hydraté via `sanitizeResources` au chargement).
   */
  resources?: Resources;
}

/**
 * ─── Module 7 — Arbre technologique national ──────────────────────
 *
 * 10 axes de R&D civils et militaires. Chaque axe coûte du budget
 * (one-shot, prélevé au démarrage de la recherche) et prend N tours
 * à se compléter. Une SEULE recherche peut être en cours à la fois
 * (force des choix stratégiques sur un mandat de 20 tours).
 *
 * Une fois acquise, une techno débloque une option supplémentaire
 * sur certains événements de crise (`EventChoice.requiresTech`).
 *
 * Tout le moteur (`logic/techTree.ts`) est pur et déterministe : la
 * complétion est calculée par comparaison `turn >= completedTurn`.
 */
export type TechId =
  | "cyber_security"
  | "electric_grid"
  | "surveillance_drones"
  | "smart_agriculture"
  | "admin_ai"
  | "digital_hospitals"
  | "sovereign_energy"
  | "antimissile_shield"
  | "science_education"
  | "strategic_industry";

export interface TechResearchInProgress {
  /** Identifiant de la techno en cours. */
  id: TechId;
  /** Tour auquel le projet a été lancé (budget déjà débité). */
  startedTurn: number;
  /** Tour auquel le projet sera marqué comme acquis (>= startedTurn + duration). */
  completedTurn: number;
  /** Jour de jeu (simulationClock) auquel la recherche a démarré. Migration progressive. */
  startedAtGameDay?: number;
  /** Jour de jeu (simulationClock) auquel la recherche sera acquise. Migration progressive. */
  completedAtGameDay?: number;
}

export interface TechState {
  /** IDs des technos acquises (ordre = ordre d'acquisition). */
  researched: TechId[];
  /** Recherche en cours, ou null. Une seule à la fois. */
  inProgress: TechResearchInProgress | null;
  /**
   * Module 7.1 — Doctrines actives. Une doctrine est activée
   * automatiquement quand TOUS les axes de sa branche sont acquis.
   * Reste actif jusqu'à la fin du mandat. Reset au 2nd mandat.
   * Optionnel pour rétro-compat saves antérieures (re-hydraté à []).
   */
  activeDoctrines?: import("@/data/techTree").DoctrineId[];
  /**
   * Module 7.1 — Compteur d'usages restants du bouclier "Forteresse
   * numérique" (initialisé à 2 lors de l'activation, décrémenté à
   * chaque attaque cyber/hybride neutralisée). 0 = bouclier épuisé.
   * Optionnel : absent si la doctrine n'a jamais été activée.
   */
  cyberShieldUsesRemaining?: number;
}

/**
 * ─── Module 8 — Horloge de mandat (Année / Mois) ────────────────────
 *
 * Le mandat dure 5 ans = 60 mois fictifs. L'horloge avance en continu
 * via un `setInterval` piloté par `speed` (0=pause / 1 / 2 / 4). À
 * chaque mois écoulé, le moteur peut :
 *   - tirer un événement quand `currentMonth >= nextEventMonth` (et
 *     repasser en pause auto pour laisser le joueur décider),
 *   - déclencher un bilan trimestriel (mois %3, hors %12),
 *   - déclencher un bilan annuel (mois 12/24/36/48),
 *   - déclencher l'élection finale au mois 60.
 *
 * IMPORTANT — aucun calendrier réel : on parle UNIQUEMENT en
 * « Année X — Mois Y du mandat ». Pas de dates JJ/MM/AAAA, conforme
 * au cahier des charges.
 *
 * `state.turn` reste l'index interne de DÉCISIONS (1..20). Une
 * décision ≈ 3 mois. Toute la balance moteur (ministres, opposition,
 * IA hybride, drift) reste calibrée sur ce compteur.
 */
/**
 * LOT 17 — Vitesses étendues : 0=pause, 0.5=lent (observation
 * tranquille du pays), 1=normal (ralenti par rapport au LOT 8),
 * 2=accélération modérée, 4=accélération rapide.
 */
export type TimeSpeed = 0 | 0.5 | 1 | 2 | 4;

export type MandateReportKind = "quarter" | "year";

export interface MandateReport {
  /** Type de bilan affiché (trimestriel ou annuel). */
  kind: MandateReportKind;
  /** Mois auquel le bilan est tombé (3, 6, 9, 12, ...). */
  month: number;
  /** Snapshot des jauges au début de la période bilan. */
  prevGauges: Gauges;
  /** Jauges actuelles, pour calcul des deltas dans la modale. */
  gauges: Gauges;
}

export interface GameTime {
  /** Mois courant 1..60 (1 = « Année 1 — Mois 1 »). */
  currentMonth: number;
  /** Vitesse de défilement : 0=pause, 1=x1, 2=x2, 4=x4. */
  speed: TimeSpeed;
  /**
   * Dernière vitesse non-zéro choisie par le joueur, mémorisée pour
   * pouvoir reprendre la lecture après une pause auto (événement
   * majeur ou bilan modal).
   */
  speedBeforePause: Exclude<TimeSpeed, 0>;
  /** Mois auquel le prochain événement se déclenchera (borné 60). */
  nextEventMonth: number;
  /** Dernier mois (3/6/9/15/...) où un bilan trimestriel a été affiché. */
  lastReportedQuarter: number;
  /** Dernier mois (12/24/36/48) où un bilan annuel a été affiché. */
  lastReportedYear: number;
  /** Snapshot des jauges au dernier bilan, pour calcul des deltas. */
  lastSnapshotGauges: Gauges;
  /** Bilan en attente d'affichage. Null = aucun bilan à montrer. */
  pendingReport: MandateReport | null;
  /**
   * LOT 15 — Mois (1..60) où le DERNIER événement majeur a été
   * présenté au joueur. Sert de pivot pour le cooldown : aucun
   * nouvel événement majeur ne peut s'ouvrir avant `currentMonth -
   * lastMajorEventMonth >= MIN_MONTHS_BETWEEN_MAJOR`. 0 = jamais.
   */
  lastMajorEventMonth?: number;
  /**
   * LOT 16 — Mois (1..60) où la DERNIÈRE crise rare (scandale,
   * guerre hybride, crise diplomatique) a été présentée. Cooldown
   * propre, plus long que celui des majors : `currentMonth -
   * lastRareEventMonth >= MIN_MONTHS_BETWEEN_RARE`. 0 = jamais.
   */
  lastRareEventMonth?: number;
  /**
   * LOT 17 — Sous-compteur de SEMAINE dans le mois courant (1..4).
   * Conservé pour compat des saves ; le nouveau système temps-réel
   * l'ignore (progression calculée depuis seasonStartedAtRealMs).
   */
  weekInMonth?: number;
  /**
   * Timestamp réel (ms depuis epoch) du début de la saison / du mandat.
   * Ancre du calcul temps-réel : chaque jour de jeu = 6 heures réelles.
   * Initialisé à Date.now() au démarrage d'une nouvelle partie.
   * Absent dans les vieilles saves (GameContext l'initialise au premier tick).
   */
  seasonStartedAtRealMs?: number;
}

/**
 * LOT 15 — Entrée d'un événement mineur en attente de traitement
 * sur le dashboard. La carte n'interrompt pas le temps : le joueur
 * peut la traiter, l'ignorer, ou laisser l'auto-dismiss expirer.
 */
export interface MinorEventEntry {
  /** id du `CrisisEvent` correspondant (catalogue ou régional). */
  eventId: string;
  /** Mois où l'événement est apparu (pour expiration). */
  appearedMonth: number;
  /** Mois au-delà duquel la carte disparaît automatiquement. */
  expiresMonth: number;
}

/**
 * LOT 15 — Notification fictive (info pure) injectée dans le
 * AlertTicker. Pas d'interaction, pas d'effet sur les jauges :
 * uniquement de la couleur narrative.
 */
export interface EventNotification {
  /** id unique (souvent `notif_<eventId>_<month>`). */
  id: string;
  /** Catégorie pour colorimétrie de l'AlertTicker (FLASH, INFO…). */
  kind: "FLASH" | "INFO";
  /** Texte court à afficher dans le bandeau (≤ 90 chars conseillé). */
  text: string;
  /** Mois où la notification a été créée. */
  createdMonth: number;
  /** Mois au-delà duquel la notification disparaît du ticker. */
  expiresMonth: number;
}
