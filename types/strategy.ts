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
  upgradeStartTime: number | null;
  upgradeEndTime: number | null;
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
  | "saudi_arabia";

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

export interface CountryRelation {
  countryId: CountryId;
  status: RelationStatus;
  score: number; // -100 to 100
  threatLevel: number; // 0-100
  operationCooldowns: Partial<Record<OperationType, number>>; // expiry timestamps
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

export interface NewsChoice {
  id: string;
  label: string;
  consequence: string;
  effects: Partial<StrategyResources>;
  rankingDelta?: number;
  relationDelta?: { countryId: CountryId; delta: number };
  indicatorEffects?: Partial<NationalIndicators>;
  hiddenPoliticsEffects?: Partial<HiddenPolitics>;
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
}
