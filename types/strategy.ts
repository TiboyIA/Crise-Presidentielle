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

export type GovernmentCultureId =
  | "discipline"
  | "innovation"
  | "transparence"
  | "loyaute"
  | "technocratie"
  | "urgence_permanente";

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

export type ConflictReason =
  | "domain_rivalry"
  | "ambition"
  | "loyalty_gap"
  | "doctrine_split"
  | "crisis_blame";

export interface CabinetConflict {
  id: string;
  ministerA: string;              // StrategyMinisterId
  ministerB: string;              // StrategyMinisterId
  intensity: number;              // 0-100
  reason: ConflictReason;
  createdAtAction: number;        // news.actionCount à la création
  expiresAfterActions: number;    // actionCount absolu d'expiration
}

export interface ActiveTraining {
  ministerId: string;
  programId: string;              // TrainingId
  startedAtAction: number;        // news.actionCount au lancement
  completesAtAction: number;      // news.actionCount à la complétion
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

// ── Fuite d'Indemnisation ─────────────────────────────────────────────────────

export type LeakageBand = "negligible" | "moderate" | "significant" | "critical";

// ── Passifs Longue Traîne ─────────────────────────────────────────────────────

export type LiabilityCategory =
  | "dette_cachee" | "infrastructure" | "sante" | "cyber" | "energie" | "social" | "diplomatie";

export type LiabilityDefId =
  | "fiscal_opacity"
  | "infrastructure_neglect"
  | "social_fracture"
  | "cyber_dependency"
  | "energy_vulnerability";

export interface LongTailLiability {
  id:                   string;
  defId:                LiabilityDefId;
  sourceDecision:       string;   // "eventId/choiceId"
  category:             LiabilityCategory;
  annualCost:           number;   // M€ par période (croît avec riskGrowth)
  initialCost:          number;   // référence pour le plafonnement
  riskGrowth:           number;   // % par période non traitée
  triggerAfterActions:  number;   // actionCount absolu de démarrage des coûts
  createdAtDay:         number;
  description:          string;
}

// ── Pool de Réassurance Alliée ────────────────────────────────────────────────

export interface ReinsurancePool {
  poolStress: number;
  lastClaimAt?: number;
}

// ── Franchise Politique des Crises ───────────────────────────────────────────

export type CostSharingStrategyId =
  | "etat" | "assurance" | "regions" | "entreprises" | "emprunt";

// ── Obligations Catastrophe ───────────────────────────────────────────────────

export type CatBondTypeId =
  | "cat_cyber"
  | "cat_climat"
  | "cat_energie"
  | "cat_infrastructure"
  | "cat_guerre_hybride";

export interface ActiveCatBond {
  typeId: CatBondTypeId;
  emittedAtAction: number;
  expiresAtAction: number;
  capitalRaised: number;   // capital effectif collecté (réduit si marchés méfiants)
  couponDue: number;       // coupon à payer si aucune crise ne survient
  triggered: boolean;      // true = le bond a été déclenché par une crise
}

export interface CatBondMarketState {
  totalIssuances: number;   // total d'émissions depuis le début du mandat
  marketSkepticism: number; // 0-100 — monte avec les émissions, baisse si bonds expirés sans crise
}

// ── Assurance Souveraine ──────────────────────────────────────────────────────

export type InsuranceProductId =
  | "cyber"
  | "climat"
  | "energie"
  | "dette"
  | "industrie"
  | "troubles_sociaux";

export interface InsurancePolicy {
  productId: InsuranceProductId;
  active: boolean;
  claimCount: number;
  activatedAtDay: number;
}

// ── Fonds National de Résilience ──────────────────────────────────────────────

export interface ResilienceFund {
  balance:              number;   // montant disponible dans la réserve
  monthlyContribution:  number;   // coût du dernier palier choisi (cosmétique)
  protectionLevel:      number;   // % de réduction (0-50) calculé depuis balance
  lastPayoutAt?:        number;   // mandateDay du dernier déblocage automatique
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
  /** Delta de confiance dans les alertes météo — positif = renforce la confiance, négatif = l'érode. */
  weatherAlertTrustDelta?: number;
  /** Formulation diplomatique — produit des effets sur les relations, la tension et l'opinion. */
  diplomaticWording?: DiplomaticWordingId;
  /** Thème de la déclaration publique — alimente la mémoire des contradictions. */
  declarationTheme?: ContradictionTheme;
  /** Position sur le thème : "pro" = pour, "contre" = contre. */
  declarationStance?: "pro" | "contre";
  /** Effets cosmiques V2 — appliqués au CosmicState lors de la résolution du choix. */
  cosmicEffects?: import("@/types/cosmic").CosmicStateEffects;
  /** Effets inertiels — fractionnés en immédiat + différé par inertiaEngine. */
  inertiaEffects?: Partial<Record<import("@/logic/inertiaEngine").InertiaDomain, number>>;
  /** Effets sur les chaînes d'approvisionnement — deltas appliqués aux secteurs stratégiques. */
  supplyChainEffects?: Partial<Record<import("@/data/strategicSectors").SectorId, Partial<import("@/logic/supplyChainEngine").SectorState>>>;
  /** Delta direct sur la confiance des investisseurs — appliqué immédiatement lors de la résolution du choix. */
  investorConfidenceDelta?: number;
  /** Delta direct sur la pression fiscale — appliqué immédiatement lors de la résolution du choix. */
  taxPressureDelta?: number;
  /** Delta direct sur l'efficacité fiscale — appliqué immédiatement lors de la résolution du choix. */
  taxEfficiencyDelta?: number;
  /** Delta direct sur le consentement fiscal — appliqué immédiatement lors de la résolution du choix. */
  fiscalConsentDelta?: number;
  /** Delta direct sur l'économie informelle — appliqué immédiatement lors de la résolution du choix. */
  shadowEconomyDelta?: number;
  /** Delta direct sur la balance commerciale — appliqué immédiatement lors de la résolution du choix. */
  tradeBalanceDelta?: number;
  /** Delta direct sur l'indice d'inégalités — appliqué immédiatement lors de la résolution du choix. */
  inequalityIndexDelta?: number;
  /** Delta direct sur la mobilité sociale — appliqué immédiatement lors de la résolution du choix. */
  socialMobilityDelta?: number;
  /** Delta direct sur la santé des PME — appliqué immédiatement lors de la résolution du choix. */
  smeHealthDelta?: number;
  /** Delta direct sur les champions industriels — appliqué immédiatement lors de la résolution du choix. */
  industrialChampionsDelta?: number;
  /** Delta direct sur l'écosystème startup — appliqué immédiatement lors de la résolution du choix. */
  startupEcosystemDelta?: number;
  /** Delta direct sur le commerce local — appliqué immédiatement lors de la résolution du choix. */
  localCommerceDelta?: number;
  /** Delta direct sur l'industrie stratégique — appliqué immédiatement lors de la résolution du choix. */
  strategicIndustryDelta?: number;
  /** Amortissement du choc économique externe lié à cet événement (réduit intensity + durée). */
  economicShockDamping?: number;
  /** Type de dépense budgétaire — déclenche un programme fiscalMultiplier lors de la résolution. */
  fiscalSpendingType?: import("@/logic/fiscalMultiplierEngine").SpendingType;
  /** Intensité du programme budgétaire (0-100). Par défaut 60 si non précisé. */
  fiscalSpendingIntensity?: number;
  /** Delta direct sur la crédibilité de la banque centrale fictive. */
  centralBankCredibilityDelta?: number;
  /** Delta direct sur la tension monétaire. */
  monetaryTensionDelta?: number;
  /** Change le profil du gouverneur — influe sur le comportement futur des taux directeurs. */
  centralBankProfileChange?: import("@/logic/centralBankEngine").CentralBankProfile;
  /** Amortissement des ondes de crise actives — réduit l'intensité de toutes les ondes. */
  waveDamping?: number;
  /** Réduction d'usure des infrastructures — appliquée à tous les bâtiments actifs. */
  wearReduction?: number;
  /** Réduction du stress thermique — appliquée au thermalStress de l'état. */
  thermalReduction?: number;
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
  /** Montant prélevé sur le Fonds de Résilience pour absorber le coût de cette crise. */
  resiliencePayout?: number;
  /** Indemnisation versée par une assurance souveraine lors de cette crise. */
  insurancePayout?: { productId: InsuranceProductId; amount: number };
  /** Absorption par un cat bond déclenché lors de cette crise. */
  catBondPayout?: { typeId: CatBondTypeId; amount: number };
  /** Absorption par le pool de réassurance alliée lors de cette crise. */
  reinsurancePayout?: { absorbed: number; membersCount: number };
  /** Passif longue traîne créé par ce choix — signalé discrètement dans le journal. */
  createdLiabilityId?: LiabilityDefId;
  /** Fuite d'indemnisation détectée lors du déploiement d'un plan d'urgence. */
  leakagePayout?: { rate: number; leaked: number; band: LeakageBand; controlApplied: boolean };
  /** Stratégie de partage du coût appliquée automatiquement pour les crises majeures éligibles. */
  costSharingPayout?: {
    strategyId: CostSharingStrategyId;
    label: string;
    description: string;
    moneyRecovered: number;
    debtAdded: number;
  };
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
  // Fonds National de Résilience — optional for backward compat
  resilienceFund?: ResilienceFund;
  // Assurance Souveraine — optional for backward compat
  insurancePolicies?: InsurancePolicy[];
  // Obligations Catastrophe — optional for backward compat
  activeCatBonds?: ActiveCatBond[];
  catBondMarket?: CatBondMarketState;
  // Pool de Réassurance Alliée — optional for backward compat
  reinsurancePool?: ReinsurancePool;
  // Passifs Longue Traîne — optional for backward compat
  longTailLiabilities?: LongTailLiability[];
  // Fatigue RH des ministres — optional for backward compat
  ministerFatigue?: Record<string, number>;
  // Moral de l'administration — optional for backward compat (default 60)
  administrationMorale?: number;
  // Conflits internes du cabinet — optional for backward compat
  cabinetConflicts?: CabinetConflict[];
  // Formations ministérielles en cours — optional for backward compat
  activeTrainings?: Record<string, ActiveTraining>; // keyed by ministerId
  // Culture de gouvernement — optional for backward compat (null = aucune)
  governmentCulture?: GovernmentCultureId;
  // Fuite des talents publics — optional for backward compat (default 15)
  talentDrainScore?: number;
  // Cellule de crise interministérielle — optional for backward compat
  lastStaffingAt?: number;    // news.actionCount de la dernière activation
  staffingUseCount?: number;  // total d'activations (dégrade les outcomes sur usage répété)
  // Prévisions météo incertaines — optional for backward compat
  lastForecastPreparedPeriod?: number;
  lastForecastAlertPeriod?: number;
  // Rapports de mission — optional for backward compat (max 50)
  missionReports?: import("@/types/missionReport").MissionReport[];
  // Rapports d'opérations adverses interceptées (max 50)
  enemyMissionReports?: import("@/types/missionReport").MissionReport[];
  lastEnemyOpAt?: number;
  // Météo agricole — indicateurs cumulatifs (MODE DELTA)
  agroWeather?: {
    soilMoisture:    number;   // humidité du sol 0-100
    cropStress:      number;   // stress des cultures 0-100
    harvestForecast: "bonne" | "moyenne" | "mauvaise";
    lastEventAt?:    number;   // mandateDay du dernier événement agricole déclenché
  };
  // Épisodes méditerranéens — anti-spam
  lastMediterraneanEventAt?: number;
  // Confiance dans les alertes météo — 0-100 (initial 60)
  weatherAlertTrust?: number;
  // Doctrine météo présidentielle
  weatherDoctrine?: import("@/logic/weatherDoctrineEngine").WeatherDoctrineId;
  // Fenêtre météo favorable — opportunité temporaire active
  weatherOpportunity?: {
    id:        import("@/logic/weatherOpportunityEngine").WeatherOpportunityId;
    spawnedAt: number;
    expiresAt: number;
  };
  // Nations de l'Espace — assemblée interstellaire observant l'humanité (optional pour backward compat)
  spaceNationsState?: import("@/logic/spaceNationsEngine").SpaceNationsState;
  // La Cité d'Orion — hub diplomatique interstellaire (optional pour backward compat)
  orionCityState?: import("@/logic/orionCityEngine").OrionCityState;
  // La Chambre du Seuil — négociation morale Aurora/Obscurium (optional pour backward compat)
  moralNegotiationState?: import("@/logic/moralNegotiationEngine").MoralNegotiationState;
  // Système Cosmique V2 — état unifié (remplace les trois états séparés ci-dessus)
  cosmicState?: import("@/types/cosmic").CosmicState;
  // Inertie physique de l'État — effets différés en file d'attente (optional pour backward compat)
  inertiaQueue?: import("@/logic/inertiaEngine").InertiaEffect[];
  // Stabilité du réseau électrique — indicateur physique discret 0-100 (optional pour backward compat)
  gridStability?: number;
  // Ondes de propagation des crises actives (optional pour backward compat)
  crisisWaves?: import("@/logic/crisisWaveEngine").CrisisWave[];
  // Usure physique des infrastructures — Record<BuildingId, 0-100> (optional pour backward compat)
  infrastructureWear?: Partial<Record<BuildingId, number>>;
  // Stress thermique des systèmes nationaux — 0-100 (optional pour backward compat)
  thermalStress?: number;
  // Fenêtre orbitale des satellites — état discret (optional pour backward compat)
  orbitalWindow?: import("@/logic/orbitalWindowEngine").OrbitalWindowState;
  // Tempête solaire active — crise physique rare (optional pour backward compat)
  solarStorm?: import("@/logic/solarStormEngine").SolarStormState;
  // Ratio signal/bruit du renseignement — 0-100 (optional pour backward compat)
  signalNoiseRatio?: number;
  // Note de pression conservée — court résumé du déplacement le plus récent (optional)
  recentPressureNote?: string;
  // Note de résonance sociale — description du dernier cas de résonance déclenché (optional)
  resonanceNote?: string;
  // Seuils de rupture des systèmes critiques — marges et statuts (optional pour backward compat)
  breakpoints?: import("@/logic/breakpointEngine").BreakpointState;
  // Qualité du système d'information sanitaire national — Cellule DIM (optional pour backward compat)
  medicalDataQuality?: number;
  // Qualité du codage médico-administratif hospitalier — MODE DELTA (optional pour backward compat)
  hospitalCodingQuality?: number;
  // Retard de remontée des données de santé — nombre d'actions (optional pour backward compat)
  healthReportingDelay?: number;
  // Pression sur le système de soins national — 0-100 (optional pour backward compat)
  hospitalPressure?: number;
  // Confiance dans les chiffres de santé officiels — 0-100 (optional pour backward compat)
  healthDataTrust?: number;
  // Dernier audit DIM lancé — actionCount (optional pour backward compat)
  lastDimAuditAt?: number;
  // Pression de sous-détection sanitaire cachée — 0-100 (optional pour backward compat)
  underDetectionPressure?: number;
  // Niveau de la cellule de veille sanitaire stratégique (optional pour backward compat)
  healthSurveillanceLevel?: import("@/logic/healthSurveillanceEngine").SurveillanceLevelId;
  // Pression de scandale statistique sanitaire — 0-100 (optional pour backward compat)
  statisticsScandalPressure?: number;
  // Interopérabilité des systèmes de santé — 0-100 (optional pour backward compat)
  healthInteroperability?: number;
  // Pression inflationniste nationale — 0-100 (optional pour backward compat)
  inflation?: number;
  // Pouvoir d'achat réel des ménages — 0-100 (optional pour backward compat)
  purchasingPower?: number;
  // Taux de chômage fictif — 0-100 (optional pour backward compat)
  unemployment?: number;
  // Qualité de l'emploi — 0-100 (optional pour backward compat)
  jobQuality?: number;
  // Chômage des jeunes — 0-100, structurellement plus élevé (optional pour backward compat)
  youthUnemployment?: number;
  // Pénurie de main-d'œuvre — 0-100 (optional pour backward compat)
  laborShortage?: number;
  // Productivité nationale — 0-100 (optional pour backward compat)
  productivity?: number;
  // Chaînes d'approvisionnement stratégiques — MODE DELTA (optional pour backward compat)
  supplyChain?: import("@/logic/supplyChainEngine").SupplyChainState;
  // Confiance des investisseurs — 0-100 (optional pour backward compat)
  investorConfidence?: number;
  // Pression fiscale nationale — 0-100 (optional pour backward compat)
  taxPressure?: number;
  // Efficacité du recouvrement fiscal — 0-100 (optional pour backward compat)
  taxEfficiency?: number;
  // Consentement fiscal de la population — 0-100 (optional pour backward compat)
  fiscalConsent?: number;
  // Économie informelle nationale — 0-100 (optional pour backward compat)
  shadowEconomy?: number;
  // Balance commerciale fictive — -100 à +100 (optional pour backward compat)
  tradeBalance?: number;
  // Indice d'inégalités sociales — 0-100 (optional pour backward compat)
  inequalityIndex?: number;
  // Mobilité sociale — 0-100 (optional pour backward compat)
  socialMobility?: number;
  // Tissu productif national — structure économique (optional pour backward compat)
  productiveFabric?: import("@/logic/productiveFabricEngine").ProductiveFabricState;
  // Chocs économiques externes actifs (optional pour backward compat)
  economicShocks?: import("@/logic/economicShockEngine").EconomicShock[];
  // Programmes budgétaires actifs — multiplicateur fiscal (optional pour backward compat)
  fiscalPrograms?: import("@/logic/fiscalMultiplierEngine").FiscalProgram[];
  // Banque centrale fictive — taux directeur abstrait 0-100 (optional pour backward compat)
  interestRate?: number;
  // Crédibilité de la banque centrale fictive 0-100 (optional pour backward compat)
  centralBankCredibility?: number;
  // Tension entre politique monétaire et budgétaire 0-100 (optional pour backward compat)
  monetaryTension?: number;
  // Profil du gouverneur de la banque centrale (optional pour backward compat)
  centralBankProfile?: import("@/logic/centralBankEngine").CentralBankProfile;
  // Indice composite de stagflation 0-100 (optional pour backward compat)
  stagflationIndex?: number;
  // Phase du cycle économique national (optional pour backward compat)
  businessCyclePhase?: import("@/logic/businessCycleEngine").BusinessCyclePhase;
  // Momentum du cycle économique 0-100 (optional pour backward compat)
  cycleMomentum?: number;
  // Conformité de l'État — Bureau de conformité (optional pour backward compat)
  complianceState?: import("@/types/compliance").ComplianceState;
}
