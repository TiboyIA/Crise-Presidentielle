export type ResourceKey = keyof StrategyResources;

export interface StrategyResources {
  money: number;
  influence: number;
  energy: number;
  intelligence: number;
  technology: number;
  military: number;
  cyberDefense: number;
}

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  money: "Argent",
  influence: "Influence",
  energy: "Énergie",
  intelligence: "Renseignement",
  technology: "Technologie",
  military: "Militaire",
  cyberDefense: "Cyberdéfense",
};

export const RESOURCE_ICONS: Record<ResourceKey, string> = {
  money: "💰",
  influence: "🎭",
  energy: "⚡",
  intelligence: "🔍",
  technology: "🔬",
  military: "⚔️",
  cyberDefense: "🛡️",
};

export type BuildingId =
  | "presidential_palace"
  | "economy_ministry"
  | "defense_ministry"
  | "intelligence_ministry"
  | "cyber_ministry"
  | "energy_ministry"
  | "diplomacy_ministry"
  | "research_center"
  | "central_bank"
  | "media_agency"
  | "military_hq";

export interface BuildingLevel {
  cost: Partial<StrategyResources>;
  upgradeDuration: number; // seconds
  production: Partial<StrategyResources>; // per minute
  powerBonus: number;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  levels: BuildingLevel[]; // index i = level i+1
  unlockRequirement?: { buildingId: BuildingId; level: number };
}

export interface PlayerBuilding {
  id: BuildingId;
  level: number; // 0 = not built, 1-10 = active level
  /** Timestamp réel de début d'amélioration (ms). Conservé pour compatibilité. */
  upgradeStartTime: number | null;
  /** Timestamp réel de fin d'amélioration (ms). Conservé pour compatibilité. */
  upgradeEndTime: number | null;
  /**
   * Heure jeu absolue de fin d'amélioration (depuis state.startedAt).
   * Source de vérité quand défini.
   * Absent sur les anciennes sauvegardes (migration automatique au chargement).
   */
  upgradeEndsAtGameHour?: number | null;
}

export type CountryId =
  | "france"
  | "usa"
  | "china"
  | "russia"
  | "germany"
  | "uk"
  | "india"
  | "japan"
  | "brazil"
  | "turkey"
  | "iran"
  | "israel"
  | "south_korea"
  | "italy"
  | "saudi_arabia"
  | "australia"
  | "canada"
  | "north_korea"
  | "nigeria"
  | "pakistan";

export type RelationStatus = "allied" | "friendly" | "neutral" | "rival" | "hostile";

export interface CountryDef {
  id: CountryId;
  name: string;
  flag: string;
  region: string;
  basePower: number;
  economy: number;
  military: number;
  cyber: number;
  diplomacy: number;
  description: string;
}

export interface RevealedIntel {
  military: number;
  cyber: number;
  economy: number;
  stability: number;
  revealedAtAction: number;
}

export interface CountryRelation {
  countryId: CountryId;
  status: RelationStatus;
  score: number; // -100 to 100
  threatLevel: number; // 0-100
  operationCooldowns: Partial<Record<OperationType, number>>; // expiry timestamps
  revealedIntel?: RevealedIntel;
}

export type OperationType =
  | "espionage"
  | "steal_intel"
  | "cyber_attack"
  | "influence_campaign"
  | "sabotage"
  | "sanction"
  | "sign_treaty"
  | "diplomatic_aid"
  | "reinforce_cyber"
  | "military_operation";

export interface OperationDef {
  id: OperationType;
  name: string;
  description: string;
  icon: string;
  cost: Partial<StrategyResources>;
  cooldown: number; // seconds
  isOffensive: boolean;
  minRelationScore?: number; // min score to allow
  maxRelationScore?: number; // max score to allow
  requiredBuilding?: { id: BuildingId; level: number };
}

export interface OperationResult {
  success: boolean;
  message: string;
  rewards: Partial<StrategyResources>;
  relationDelta: number;
  rankingPoints: number;
  xp: number;
}

export type MissionType =
  | "upgrade_building"
  | "launch_operation"
  | "collect_resources"
  | "reach_power"
  | "spy_country"
  | "win_operation"
  | "reinforce_defense";

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  target: {
    amount?: number;
    buildingId?: BuildingId;
    minPower?: number;
    resourceKey?: ResourceKey;
    operationType?: OperationType;
  };
  reward: Partial<StrategyResources>;
  rewardPoints: number;
}

export interface PlayerMission {
  defId: string;
  completed: boolean;
  progress: number;
  target: number;
  assignedAt: number;
}

export interface BotPlayer {
  id: string;
  name: string;
  countryName: string;
  flag: string;
  startPower: number;
  growthPerHour: number;
  personality: "aggressive" | "defensive" | "diplomatic" | "economic";
}

export interface RankEntry {
  id: string; // "player" or bot id
  name: string;
  flag: string;
  power: number;
  points: number;
  trend: "up" | "down" | "stable";
}

export interface NationalStats {
  globalPower: number;
  presidentLevel: number;
  presidentXP: number;
  rankingPoints: number;
  totalOperations: number;
  operationsWon: number;
  season: number;
  seasonStartTime: number;
}

// ── Journal de Crise ──────────────────────────────────────────
export type NewsType =
  | "national"
  | "economie"
  | "social"
  | "cyber"
  | "diplomatie"
  | "guerre_hybride"
  | "monde"
  | "classement";

export type NewsUrgency = "faible" | "moyenne" | "forte" | "critique";

export type MisinterpretationType = "distorted" | "polemic" | "rumor" | "trust_crisis";

export type GaffeType =
  | "condescendance"
  | "contradiction"
  | "minimisation"
  | "chiffre_faux"
  | "attaque_maladroite"
  | "silence_embarrassant";

export interface MinisterGaffeEntry {
  ministerId:   string;
  ministerName: string;
  gaffeType:    GaffeType;
  quote:        string;
}

export type GovernanceDoctrine =
  | "democratique" | "technocratique" | "securitaire" | "populiste" | "autoritaire"
  | "souverainiste" | "ecologiste" | "liberal";

export type ReformId =
  | "fiscal" | "securite" | "energie" | "industrie"
  | "cyber" | "diplomatique" | "sociale" | "education";

export interface PlayerReform {
  id: ReformId;
  launchedAtDay: number;
  completesAtDay: number;
  applied: boolean;
}

// ── Mémoire du peuple ─────────────────────────────────────────
export type DecisionTraceType =
  | "promise_kept"
  | "promise_broken"
  | "crisis_handled"
  | "crisis_mishandled"
  | "scandal_ignored"
  | "reform_courageous"
  | "reform_unjust"
  | "authoritarian_decision"
  | "military_op_contested"
  | "excessive_spending"
  | "public_lie"
  | "transparency_praised"
  | "debt_assumed"
  | "scandal_revealed";

export interface DecisionTrace {
  id: string;
  type: DecisionTraceType;
  title: string;
  description: string;
  createdAtDay: number;
  severity: "low" | "medium" | "high" | "critical";
  politicalImpact: number;  // negative = bad for player
  canResurface: boolean;
  resurfacedCount: number;
  tags: string[];
}

export interface PublicMemory {
  traces: DecisionTrace[];
}

export type AchievementId =
  | "premier_serment"
  | "premiere_reforme"
  | "top3_mondial"
  | "economie_forte"
  | "securite_max"
  | "cyberbouclier"
  | "diplomate_etoile"
  | "bilan_excellent"
  | "reformateur_senior"
  | "endurance"
  | "grande_puissance"
  | "populaire";

export interface StrategyMinister {
  id: string;          // matches StrategyMinisterId
  name?: string;       // overrides def.name when replaced from pool
  loyalty: number;     // 0-100, can drift
  competence: number;  // 0-100
  scandalRisk: number; // 0-100, can increase
}

export interface HiddenPolitics {
  eliteTrust: number;              // 0-100 — confiance des élites / hauts fonctionnaires
  scandalRisk: number;             // 0-100 — probabilité qu'un scandale éclate
  mediaMood: number;               // 0-100 — humeur des médias (0=hostile, 100=favorable)
  popularFatigue: number;          // 0-100 — lassitude de la population
  regionalTension: number;         // 0-100 — tensions territoriales / collectivités
  institutionalStability: number;  // 0-100 — stabilité de l'appareil d'État
}

export type PromiseDomain =
  | "securite" | "economie" | "ecologie"
  | "souverainete" | "pouvoir_achat" | "innovation" | "diplomatie";

export type PromiseClarityLevel = "floue" | "mesurable" | "risquée";

export type CommunicationRegister =
  | "populaire" | "institutionnel" | "technocratique" | "martial"
  | "empathique" | "diplomatique" | "scientifique" | "offensif";

export type DiplomaticWordingId =
  | "exprimer_inquietude"
  | "appeler_au_calme"
  | "condamner_fermement"
  | "accuser_publiquement"
  | "menacer_sanctions"
  | "proposer_mediation"
  | "garder_silence";

export type ContradictionTheme =
  | "fiscalite"
  | "securite"
  | "ecologie"
  | "transparence"
  | "depenses_publiques"
  | "liberte_civile"
  | "relations_internationales";

export interface PendingDeclaration {
  theme:          ContradictionTheme;
  stance:         "pro" | "contre";
  statementLabel: string;
  eventId:        string;
  actionCount:    number;
}

export interface ContradictionRecord {
  id:                 string;
  theme:              ContradictionTheme;
  pastStatement:      string;
  pastEventId:        string;
  pastActionCount:    number;
  currentStatement:   string;
  currentEventId:     string;
  currentActionCount: number;
  mediaRisk:          number;
  surfaced:           boolean;
  surfacedAtAction?:  number;
}

export type PromiseStatus = "tenue" | "partielle" | "trahie" | "en cours";

export interface CampaignPromises {
  selected: PromiseDomain[];
  progress: Partial<Record<PromiseDomain, number>>;
  status: Partial<Record<PromiseDomain, PromiseStatus>>;
}

export interface DelayedConsequence {
  id: string;
  source: string;
  triggerAfterActions: number;
  effectType: "news_event" | "indicator_effect" | "hidden_politics";
  relatedNewsEventId?: string;
  payload?: Partial<NationalIndicators> | Partial<HiddenPolitics>;
}

export interface NationalIndicators {
  popularity: number;    // 0-100
  economy: number;       // 0-100
  security: number;      // 0-100
  ecology: number;       // 0-100
  cohesion: number;      // 0-100
  publicBudget: number;  // -150 to +100
}

// ── Contamination sémantique ──────────────────────────────────────────────────

export interface ToxicKeyword {
  keyword: string;              // label affiché (ex: "Réforme")
  themeKey: string;             // identifiant interne (ex: "reforme")
  toxicity: number;             // 0-100
  source: "media" | "opposition" | "obscurium" | "crisis";
  expiresAfterActions: number;  // actionCount absolu à partir duquel le mot-clé n'est plus actif
}

export type SemanticContaminationState = ToxicKeyword[];

// ── Pathologies du discours politique ────────────────────────────────────────

/** Six déformations rhétoriques accumulées au fil des choix présidentiels (0-100 chacune). */
export interface DiscoursePathology {
  doubleSpeak:          number;
  fearSpeech:           number;
  minimization:         number;
  scapegoating:         number;
  technocraticColdness: number;
  contradictionRisk:    number;
}

/** Deltas appliqués à DiscoursePathology par un choix de crise. */
export type PathologyDelta = Partial<DiscoursePathology>;

// ── Indice de Clarté Présidentielle ──────────────────────────────────────────

/** Profil statique de clarté d'un message présidentiel, défini par choix dans newsEvents.ts. */
export interface ClarityProfile {
  /** Cohérence interne — 0 (contradictoire) à 10 (parfaitement cohérent). */
  coherence:    number;
  /** Précision des termes — 0 (vague) à 10 (précis et factuel). */
  precision:    number;
  /** Transparence — 0 (opaque) à 10 (pleinement transparent). */
  transparency: number;
  /** Niveau de jargon — 0 (accessible) à 10 (incompréhensible). Pénalise le score. */
  jargon:       number;
  /** Niveau d'évitement — 0 (direct) à 10 (esquive totale). Pénalise le score. */
  evasion:      number;
}

/** Contexte de crise transmis à computePresidentialClarity. */
export interface ClarityContext {
  urgency: NewsUrgency;
  newsType?: NewsType;
}

/** Résultat complet retourné par computePresidentialClarity. */
export interface ClarityResult {
  clarityScore:          number;               // 0-100
  band:                  "clear" | "ambiguous" | "confused";
  label:                 string;               // ex. "Message clair"
  color:                 string;               // hex PALETTE
  hiddenPoliticsEffects: Partial<HiddenPolitics>;
}

export interface NewsChoice {
  id: string;
  label: string;
  consequence: string;
  effects: Partial<StrategyResources>;
  rankingDelta?: number;
  relationDelta?: { countryId: CountryId; delta: number };
  indicatorEffects?: Partial<NationalIndicators>;
  hiddenPoliticsEffects?: Partial<HiddenPolitics>;
  /** Profil de clarté optionnel — active l'Indice de Clarté Présidentielle pour ce choix. */
  clarityProfile?: ClarityProfile;
  /** Delta de pathologies rhétoriques — accumulé discrètement, affecte hiddenPolitics sur seuil. */
  pathologyDelta?: PathologyDelta;
  /** Registre de communication — produit des effets supplémentaires selon le type de crise. */
  communicationRegister?: CommunicationRegister;
  /** Thèmes sémantiques du choix — utilisés pour détecter une contamination active. */
  semanticThemes?: string[];
  /** Formulation diplomatique — produit des effets sur les relations, la tension et l'opinion. */
  diplomaticWording?: DiplomaticWordingId;
  /** Thème de la déclaration publique — alimente la mémoire des contradictions. */
  declarationTheme?: ContradictionTheme;
  /** Position sur le thème : "pro" = pour, "contre" = contre. */
  declarationStance?: "pro" | "contre";
  queuesDelayedConsequence?: {
    id: string;
    delayActions: number;
    effectType: "news_event" | "indicator_effect" | "hidden_politics";
    relatedNewsEventId?: string;
    payload?: Partial<NationalIndicators> | Partial<HiddenPolitics>;
  };
}

export interface NewsEvent {
  id: string;
  title: string;
  source: string;
  type: NewsType;
  urgency: NewsUrgency;
  description: string;
  isInteractive: boolean;
  choices?: NewsChoice[];
  autoEffects?: Partial<StrategyResources>; // applied for non-interactive
  conditionKey?: string; // evaluated by newsEngine
  minActionsGap?: number; // min actions since last news
}

export interface NewsLogEntry {
  eventId: string;
  title: string;
  source: string;
  type: NewsType;
  urgency: NewsUrgency;
  timestamp: number;
  choiceId?: string;
  choiceLabel?: string;
  consequence?: string;
  effects: Partial<StrategyResources>;
  /** Titre alternatif généré par la presse hostile — absent si risque insuffisant. */
  misinterpretedTitle?: string;
  misinterpretationType?: MisinterpretationType;
  /** Thèmes sémantiques contaminés détectés lors du choix — affichés discrètement dans le journal. */
  contaminatedThemes?: string[];
  /** Gaffe ministérielle survenue après la résolution de la crise — rare. */
  ministerGaffe?: MinisterGaffeEntry;
  /** Formulation diplomatique utilisée — enregistrée dans le journal pour traçabilité. */
  diplomaticWording?: DiplomaticWordingId;
  /** Alerte contradiction — déclaration passée contredite par ce choix. */
  contradictionAlert?: { theme: ContradictionTheme; pastStatement: string };
}

export interface NewsState {
  log: NewsLogEntry[];
  seenIds: string[];
  pendingIds: string[];
  actionCount: number;
  lastNewsAction: number;
  unreadCount: number;
}

// ── Main state ────────────────────────────────────────────────
export interface DailyLoginRewardState {
  lastLoginRewardAt: number;
  currentStreak: number;
  totalDaysClaimed: number;
}

export interface CosmicInfluence {
  auroria: number;       // 0–100 base score
  obscurium: number;     // 0–100 base score
  lastCosmicEventAt: number; // mandateDay of last cosmic event
  discovered: boolean;
}

export interface StrategyGameState {
  version: number;
  playerName: string;
  countryId: CountryId;
  resources: StrategyResources;
  buildings: PlayerBuilding[];
  stats: NationalStats;
  relations: CountryRelation[];
  missions: PlayerMission[];
  news: NewsState;
  lastResourceTick: number;
  lastBotUpdate: number;
  ranking: RankEntry[];
  startedAt: number;
  nationalIndicators: NationalIndicators;
  mandateDay: number;
  lastPollShownAt: number;
  lastBilanShownAt: number;
  hiddenPolitics: HiddenPolitics;
  delayedConsequences: DelayedConsequence[];
  campaignPromises: CampaignPromises;
  governanceDoctrine: GovernanceDoctrine;
  reforms: PlayerReform[];
  strategyMinisters: StrategyMinister[];
  nationalDebt: number;
  achievements: AchievementId[];
  // Military units system
  playerUnits: import("@/types/units").PlayerUnit[];
  trainingQueue: import("@/types/units").TrainingQueueEntry[];
  militaryDoctrine: import("@/types/units").MilitaryDoctrineId;
  // SECURITY NOTE: premiumGold lives in AsyncStorage (unencrypted game save) and
  // can be modified on rooted devices. Any feature that consumes it MUST validate
  // the entitlement server-side (player-entitlements Edge Function) before granting
  // a gameplay advantage. Never gate a competitive benefit on this field alone.
  premiumGold: number;
  // Mémoire du peuple + opposition
  publicMemory: PublicMemory;
  oppositionPower: number; // 0-100
  // Real-time engine state — drives mandateDay from wall-clock time
  realTime: import("@/logic/realTimeEngine").RealTimeState;
  // Research tree (optional for backward compat)
  strategyResearch?: import("@/types/strategyResearch").StrategyResearchState;
  // Daily login reward — optional for backward compat
  dailyLoginReward?: DailyLoginRewardState;
  // Cosmic entities layer — optional for backward compat
  cosmicInfluence?: CosmicInfluence;
  // Pathologies du discours — optional for backward compat
  discoursePathology?: DiscoursePathology;
  // Contamination sémantique — optional for backward compat
  semanticContamination?: SemanticContaminationState;
  // Mémoire des contradictions — optional for backward compat
  pendingDeclarations?: PendingDeclaration[];
  contradictionHistory?: ContradictionRecord[];
}
