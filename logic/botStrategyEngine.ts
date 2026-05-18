import { BOTS } from "@/data/bots";
import type { BotPlayer, CountryRelation, RankEntry } from "@/types/strategy";

// ── Profil stratégique ────────────────────────────────────────────────────────
//
// 8 dimensions [0-100] définissent la personnalité complète d'un bot.
// Dérivées du champ `personality` existant — aucune modification de schéma.

export interface BotProfile {
  riskTolerance: number;  // 0-100  accepte-t-il les actions risquées ?
  aggression:    number;  // 0-100  préfère-t-il les actions offensives ?
  cooperation:   number;  // 0-100  valorise-t-il les alliances ?
  retaliation:   number;  // 0-100  répond-il aux hostilités ?
  opportunism:   number;  // 0-100  exploite-t-il les faiblesses adverses ?
  economyFocus:  number;  // 0-100  priorité à la croissance économique ?
  militaryFocus: number;  // 0-100  priorité à la puissance militaire ?
  cyberFocus:    number;  // 0-100  priorité aux opérations cyber ?
}

// Mappage des personnalités existantes vers les 8 dimensions.
// Chaque profil est calibré pour des comportements distinctement différents.

const PERSONALITY_PROFILES: Record<BotPlayer["personality"], BotProfile> = {
  aggressive: {
    riskTolerance: 82, aggression: 90, cooperation: 18, retaliation: 88,
    opportunism: 78, economyFocus: 28, militaryFocus: 88, cyberFocus: 62,
  },
  defensive: {
    riskTolerance: 28, aggression: 18, cooperation: 62, retaliation: 38,
    opportunism: 28, economyFocus: 52, militaryFocus: 72, cyberFocus: 68,
  },
  diplomatic: {
    riskTolerance: 48, aggression: 22, cooperation: 88, retaliation: 18,
    opportunism: 62, economyFocus: 68, militaryFocus: 28, cyberFocus: 38,
  },
  economic: {
    riskTolerance: 55, aggression: 28, cooperation: 72, retaliation: 28,
    opportunism: 82, economyFocus: 95, militaryFocus: 22, cyberFocus: 48,
  },
};

// ── Actions possibles ─────────────────────────────────────────────────────────

export type BotAction =
  | "reinforce_defense"   // renforcement défensif interne
  | "seek_alliance"       // recherche d'alliance avec le joueur
  | "launch_influence"    // opération d'influence internationale
  | "sanction"            // pression diplomatique / sanctions
  | "espionage"           // collecte de renseignement sur le joueur
  | "cyber_attack"        // opération cyber offensive
  | "wait";               // consolidation interne, pas d'action

export interface BotDecision {
  botId:        string;
  botName:      string;
  action:       BotAction;
  /** Multiplicateur à appliquer sur growthPerHour ce cycle. */
  growthMult:   number;
  /** Texte de flaveur pour l'affichage dans le classement. */
  label:        string;
  /** Score d'utilité calculé [0-100] — utile pour le debug. */
  utilityScore: number;
}

// ── Métadonnées des actions ───────────────────────────────────────────────────

interface ActionMeta {
  label:              string;
  baseGrowthMult:     number;  // effet sur la croissance bot
  baseProbability:    number;  // probabilité de succès de base
  baseUtility:        number;  // gain de base si succès
  baseCost:           number;  // perte de base si échec
  // Dimensions de personnalité qui amplifient cette action
  alignedWith:        (keyof BotProfile)[];
  // Dimensions qui réduisent l'attrait de cette action
  contraWith:         (keyof BotProfile)[];
}

const ACTION_META: Record<BotAction, ActionMeta> = {
  reinforce_defense: {
    label:          "renforce ses défenses",
    baseGrowthMult: 0.82,
    baseProbability:0.90,
    baseUtility:    18,
    baseCost:       5,
    alignedWith:    ["militaryFocus", "cyberFocus"],
    contraWith:     ["economyFocus", "opportunism"],
  },
  seek_alliance: {
    label:          "propose une alliance",
    baseGrowthMult: 1.06,
    baseProbability:0.75,
    baseUtility:    22,
    baseCost:       8,
    alignedWith:    ["cooperation", "economyFocus"],
    contraWith:     ["aggression", "retaliation"],
  },
  launch_influence: {
    label:          "projette son influence internationale",
    baseGrowthMult: 1.14,
    baseProbability:0.60,
    baseUtility:    30,
    baseCost:       15,
    alignedWith:    ["opportunism", "economyFocus", "riskTolerance"],
    contraWith:     ["militaryFocus"],
  },
  sanction: {
    label:          "impose des sanctions économiques",
    baseGrowthMult: 0.92,
    baseProbability:0.65,
    baseUtility:    20,
    baseCost:       18,
    alignedWith:    ["aggression", "retaliation"],
    contraWith:     ["cooperation", "economyFocus"],
  },
  espionage: {
    label:          "mène une opération de renseignement",
    baseGrowthMult: 1.02,
    baseProbability:0.70,
    baseUtility:    16,
    baseCost:       10,
    alignedWith:    ["cyberFocus", "opportunism", "riskTolerance"],
    contraWith:     ["cooperation"],
  },
  cyber_attack: {
    label:          "conduit une offensive cyber",
    baseGrowthMult: 1.0,
    baseProbability:0.45,
    baseUtility:    35,
    baseCost:       25,
    alignedWith:    ["cyberFocus", "aggression", "riskTolerance"],
    contraWith:     ["cooperation", "economyFocus"],
  },
  wait: {
    label:          "consolide sa position",
    baseGrowthMult: 1.00,
    baseProbability:1.00,
    baseUtility:    10,
    baseCost:       0,
    alignedWith:    ["economyFocus"],
    contraWith:     ["aggression", "opportunism"],
  },
};

// ── Mapping bot → pays ────────────────────────────────────────────────────────
// Permet de récupérer le score de relation joueur-bot depuis state.relations.

const BOT_TO_COUNTRY: Record<string, string> = {
  bot_usa:     "usa",    bot_china:  "china",  bot_russia: "russia",
  bot_germany: "germany",bot_uk:     "uk",     bot_india:  "india",
  bot_israel:  "israel", bot_japan:  "japan",  bot_brazil: "brazil",
  bot_turkey:  "turkey",
};

// ── Calcul de l'utilité espérée ───────────────────────────────────────────────
//
// Fonction d'utilité inspirée de la théorie des jeux :
//   U = successProb × gain − (1 − successProb) × cost + alignBonus + contextModifier
//
// successProb est ajustée par :
//  - Le ratio de puissance (bot / joueur)
//  - L'alignement de personnalité (bonus ±20 %)
//  - La relation diplomatique actuelle (hostile → action offensive plus facile)

function computeUtility(
  profile: BotProfile,
  action: BotAction,
  meta: ActionMeta,
  powerRatio: number,          // botPower / playerPower — 1.0 = parité
  relationScore: number,       // -100 à 100 (relation joueur-bot)
): number {
  // Bonus d'alignement personnalité : +20 max si très aligné, -20 si contra
  const alignSum = meta.alignedWith.reduce((s, k) => s + profile[k], 0);
  const contraSum = meta.contraWith.reduce((s, k) => s + profile[k], 0);
  const alignBonus = (alignSum / (meta.alignedWith.length * 100)) * 20
    - (contraSum / (meta.contraWith.length * 100)) * 20;

  // Probabilité de succès ajustée selon le ratio de puissance
  // powerRatio > 1 → bot plus fort → actions plus probables
  const powerMod = Math.max(0.5, Math.min(1.5, powerRatio));
  const successProb = Math.max(0.1, Math.min(0.95, meta.baseProbability * powerMod));

  // Modificateur contextuel selon la relation diplomatique
  // Si hostile (<-30) → actions agressives préférées
  // Si allié (>40)   → actions coopératives préférées
  let contextMod = 0;
  const isAggressive = meta.alignedWith.includes("aggression") || meta.alignedWith.includes("retaliation");
  const isCooperative = meta.alignedWith.includes("cooperation");
  if (relationScore < -30 && isAggressive) contextMod += 12;
  if (relationScore > 40  && isCooperative) contextMod += 12;
  if (relationScore > 40  && isAggressive) contextMod -= 15;

  const expectedValue = successProb * meta.baseUtility - (1 - successProb) * meta.baseCost;
  return expectedValue + alignBonus + contextMod;
}

// ── Décision d'un bot ─────────────────────────────────────────────────────────

function decideBotAction(
  bot: BotPlayer,
  botPower: number,
  playerPower: number,
  relationScore: number,
  seed: number,             // déterministe sur un cycle mais différent par bot
): BotDecision {
  const profile    = PERSONALITY_PROFILES[bot.personality];
  const powerRatio = botPower / Math.max(playerPower, 1);
  const actions    = Object.keys(ACTION_META) as BotAction[];

  // Calcul d'utilité pour chaque action + bruit borné par riskTolerance
  const scored = actions.map((action) => {
    const meta    = ACTION_META[action];
    const utility = computeUtility(profile, action, meta, powerRatio, relationScore);
    // Bruit aléatoire : les bots prudents (faible riskTolerance) varient peu
    const noiseRange = (profile.riskTolerance / 100) * 12;
    const noise = (seededRandom(seed + action.charCodeAt(0)) - 0.5) * noiseRange;
    return { action, utility: utility + noise };
  });

  scored.sort((a, b) => b.utility - a.utility);
  const chosen   = scored[0];
  const meta     = ACTION_META[chosen.action];
  const normScore = Math.min(100, Math.max(0, Math.round((chosen.utility / 50) * 100)));

  return {
    botId:        bot.id,
    botName:      bot.name,
    action:       chosen.action,
    growthMult:   meta.baseGrowthMult,
    label:        `${bot.name} (${bot.countryName}) ${meta.label}.`,
    utilityScore: normScore,
  };
}

// ── Générateur pseudo-aléatoire déterministe ─────────────────────────────────
//
// Même seed → même décision pour un cycle donné.
// Évite que les bots "changent d'avis" à chaque render.

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10_000;
  return x - Math.floor(x);
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Calcule les décisions stratégiques de tous les bots pour le cycle courant.
 *
 * @param ranking         Classement actuel (contient botPower).
 * @param playerPower     Puissance du joueur.
 * @param playerRelations Relations diplomatiques du joueur (state.relations).
 * @param cycleTimestamp  Horodatage du cycle — seed pour la reproductibilité.
 *
 * Aucune triche : les bots n'accèdent pas directement aux ressources du joueur.
 * Leur décision ne fait que modifier leur propre growthPerHour ce cycle.
 */
export function computeBotDecisions(
  ranking: RankEntry[],
  playerPower: number,
  playerRelations: CountryRelation[],
  cycleTimestamp: number,
): BotDecision[] {
  const decisions: BotDecision[] = [];
  const cycleSeed = Math.floor(cycleTimestamp / 60_000); // résolution 1 minute

  for (const bot of BOTS) {
    const rankEntry = ranking.find((e) => e.id === bot.id);
    if (!rankEntry) continue;

    const countryId     = BOT_TO_COUNTRY[bot.id];
    const relation      = playerRelations.find((r) => r.countryId === countryId);
    const relationScore = relation?.score ?? 0;
    const botSeed       = cycleSeed + bot.id.charCodeAt(4); // unique par bot

    decisions.push(decideBotAction(
      bot,
      rankEntry.power,
      playerPower,
      relationScore,
      botSeed,
    ));
  }

  return decisions;
}

/**
 * Applique les multiplicateurs de croissance des décisions stratégiques
 * sur les entrées de classement. Retourne un nouveau tableau de RankEntry.
 *
 * Conçu pour s'insérer dans la chaîne de `updateBotRanking`.
 */
export function applyStrategyGrowthMults(
  ranking: RankEntry[],
  decisions: BotDecision[],
  baseGrowthPerHour: Map<string, number>,  // botId → growthPerHour de base
  elapsedHours: number,
): RankEntry[] {
  return ranking.map((entry) => {
    if (entry.id === "player") return entry;
    const decision = decisions.find((d) => d.botId === entry.id);
    if (!decision) return entry;
    const base   = baseGrowthPerHour.get(entry.id) ?? 5;
    const growth = base * decision.growthMult * elapsedHours;
    const newPower = Math.round(entry.power + growth);
    return {
      ...entry,
      power:  newPower,
      points: newPower * 2,
      trend:  newPower > entry.power ? "up" : "stable",
    };
  });
}

/**
 * Retourne les 3 décisions les plus intéressantes à afficher au joueur.
 * Filtre les "wait" (peu informatif) et garde les actions à forte utilité.
 */
export function getNotableDecisions(decisions: BotDecision[], count = 3): BotDecision[] {
  return decisions
    .filter((d) => d.action !== "wait")
    .sort((a, b) => b.utilityScore - a.utilityScore)
    .slice(0, count);
}

export { PERSONALITY_PROFILES };
