import type { NewsLogEntry } from "@/types/strategy";

// ── Tiers de rareté ───────────────────────────────────────────────────────────

export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "strategic";

interface TierConfig {
  /**
   * Probabilité [0-1] de passer le gate de sélection à chaque cycle,
   * UNE FOIS le cooldown respecté.
   * Garantit que même un événement eligible n'est pas toujours déclenché.
   */
  baseProbability: number;
  /**
   * Nombre minimum d'entrées de journal entre deux déclenchements du même événement.
   * Sert de barrière dure : en dessous, l'événement n'est jamais candidat.
   */
  minLogEntries: number;
  /**
   * Bonus ajouté au score de sélection quand l'événement est eligible (cooldown OK).
   * Rend les événements rares plus proéminents quand ils deviennent disponibles —
   * leur apparition doit avoir l'air significative, pas anodine.
   */
  scoreBonus: number;
}

export const TIER_CONFIG: Record<RarityTier, TierConfig> = {
  //               prob   cooldown  bonus
  common:     { baseProbability: 1.00, minLogEntries:  0, scoreBonus:  0 },
  uncommon:   { baseProbability: 0.75, minLogEntries:  3, scoreBonus:  2 },
  rare:       { baseProbability: 0.45, minLogEntries:  8, scoreBonus:  5 },
  epic:       { baseProbability: 0.25, minLogEntries: 15, scoreBonus:  8 },
  strategic:  { baseProbability: 0.12, minLogEntries: 25, scoreBonus: 12 },
};

// ── Table de rareté des événements ───────────────────────────────────────────
//
// Seuls les événements non-communs sont listés ici.
// Tout événement absent de cette table est traité comme "common" (aucune restriction).
//
// Critères de classification :
//  strategic  — point de bascule du mandat, irréversible ou très forte portée mondiale
//  epic       — crise majeure, vote décisif, événement de pivot national
//  rare       — crise sectorielle grave, événement cascadé ou condition très spécifique
//  uncommon   — crise modérée récurrente, événement conditionnel courant

const RARITY_TABLE: Partial<Record<string, RarityTier>> = {

  // ── STRATEGIC ─────────────────────────────────────────────────────────────
  // Ces événements ne doivent apparaître qu'une ou deux fois par mandat au maximum.

  conseil_mondial_presidence: "strategic",  // offre de présidence du conseil mondial
  cosmic_auroria_signal:      "strategic",  // signal Auroria — événement cosmique positif
  cosmic_impossible_leak:     "strategic",  // fuite impossible — révélation secrète
  cosmic_auroria_assist:      "strategic",  // aide Auroria — intervention cosmique
  cosmic_obscurium_offer:     "strategic",  // offre Obscurium — tentation dangereuse
  doctrine_challenge:         "strategic",  // remise en cause de la doctrine nationale

  // ── EPIC ─────────────────────────────────────────────────────────────────
  // Événements à fort impact, rares mais pas uniques sur un mandat.

  motion_defiance:            "epic",  // motion de défiance — survie du gouvernement
  opposition_motion_censure:  "epic",  // motion de censure — vote de confiance
  industrial_disaster:        "epic",  // catastrophe industrielle majeure
  ecological_disaster:        "epic",  // désastre écologique national
  cosmic_obscurium_social:    "epic",  // Obscurium — manipulation sociale
  cosmic_tech_grid:           "epic",  // disruption tech de la grille mondiale
  chantage_energie_signal:    "epic",  // chantage énergétique (cible de cascade)
  conseil_mondial_sanction:   "epic",  // sanctions du conseil mondial

  // ── RARE ─────────────────────────────────────────────────────────────────
  // Événements sérieux mais pouvant survenir 2-3 fois sur un mandat long.

  debt_escalation:            "rare",  // escalade de dette (cible de cascade)
  scandal_erupts:             "rare",  // scandale gouvernemental majeur
  conseil_mondial_vote:       "rare",  // vote d'intervention au conseil mondial
  infrastructure_sabotage:    "rare",  // sabotage d'infrastructure critique
  energy_blackmail_crisis:    "rare",  // crise de chantage énergétique complète
  minister_scandal:           "rare",  // scandale d'un ministre
  desinformation_electorale:  "rare",  // désinformation lors d'élections
  satellites_intel_reveal:    "rare",  // révélation par satellites (recherche nécessaire)
  infowar_counter_success:    "rare",  // succès de contre-guerre informationnelle
  trade_route_attack:         "rare",  // attaque de route commerciale
  document_leak_crisis:       "rare",  // crise de fuite de documents
  social_manipulation_crisis: "rare",  // manipulation sociale massive

  // ── UNCOMMON ─────────────────────────────────────────────────────────────
  // Événements récurrents mais pas systématiques — rythment le mandat sans l'envahir.

  corruption_scandal:         "uncommon",  // scandale de corruption
  research_breakthrough:      "uncommon",  // percée technologique
  diplomatic_summit:          "uncommon",  // sommet diplomatique
  media_scandal:              "uncommon",  // scandale médiatique (cible de cascade)
  blackout_national:          "uncommon",  // blackout national (cible de cascade)
  hospital_collapse:          "uncommon",  // effondrement hospitalier
  institutional_fragility:    "uncommon",  // fragilité institutionnelle
  popular_fatigue_crisis:     "uncommon",  // crise de lassitude populaire
  opposition_rise:            "uncommon",  // montée de l'opposition (cible de cascade)
  debt_crisis_event:          "uncommon",  // événement de crise de dette
  popularity_collapse:        "uncommon",  // effondrement de popularité
  economic_recession:         "uncommon",  // récession économique
  security_vacuum:            "uncommon",  // vide sécuritaire
  elite_distrust:             "uncommon",  // méfiance des élites
  internal_leak:              "uncommon",  // fuite interne
  promise_under_pressure:     "uncommon",  // promesse sous pression
  limited_military_op_debate: "uncommon",  // débat sur opération militaire
};

// ── Lecture de la rareté ──────────────────────────────────────────────────────

export function getRarity(eventId: string): RarityTier {
  return RARITY_TABLE[eventId] ?? "common";
}

export function getTierConfig(tier: RarityTier): TierConfig {
  return TIER_CONFIG[tier];
}

// ── Mémoire de session ────────────────────────────────────────────────────────
//
// Singleton module-level pour les contextes HORS journal de crise
// (opérations, unités spéciales, récompenses de saison).
// Stocke le numéro d'action ou le timestamp au moment du dernier déclenchement.
// Réinitialisé à chaque rechargement — suffisant pour la protection intra-session.

const _sessionTriggers = new Map<string, number>();

/**
 * Enregistre un déclenchement dans la mémoire de session.
 * @param id  Identifiant de l'item (événement, unité, opération…)
 * @param tick  Valeur d'horloge : numéro d'action ou Date.now()
 */
export function recordTrigger(id: string, tick: number): void {
  _sessionTriggers.set(id, tick);
}

export function getLastTrigger(id: string): number | undefined {
  return _sessionTriggers.get(id);
}

// ── Gate pour le journal de crise ─────────────────────────────────────────────

/**
 * Compte le nombre d'entrées de journal apparues DEPUIS le dernier déclenchement
 * de cet événement. Retourne Infinity si l'événement n'a jamais été vu.
 */
function logEntriesSinceLastTrigger(eventId: string, log: NewsLogEntry[]): number {
  const lastIdx = [...log].reverse().findIndex((e) => e.eventId === eventId);
  if (lastIdx === -1) return Infinity;
  return lastIdx; // position depuis la fin = nb d'entrées depuis ce déclenchement
}

/**
 * Détermine si un événement peut être candidat à la sélection.
 *
 *  1. Cooldown : le nombre d'entrées de journal depuis le dernier déclenchement
 *     doit être ≥ minLogEntries.
 *  2. Probabilité : même si le cooldown est respecté, un tirage aléatoire doit
 *     passer le seuil baseProbability.
 *
 * Pour "common" : retourne toujours true (aucune restriction).
 * Si l'événement est le seul candidat possible, la probabilité est bypassée.
 */
export function isNewsEventAllowed(
  eventId: string,
  log: NewsLogEntry[],
  isSoleCandidate = false,
): boolean {
  const tier   = getRarity(eventId);
  const config = TIER_CONFIG[tier];

  if (tier === "common") return true;

  // 1. Cooldown dur
  const entriesSince = logEntriesSinceLastTrigger(eventId, log);
  if (entriesSince < config.minLogEntries) return false;

  // 2. Probabilité — bypassée si c'est le seul candidat (évite de bloquer le jeu)
  if (isSoleCandidate) return true;
  return Math.random() < config.baseProbability;
}

/**
 * Bonus de score à ajouter pour cet événement dans le moteur de sélection.
 * Rend les événements rares bien visibles quand ils deviennent enfin éligibles.
 * Retourner 0 si l'événement n'est pas encore eligible (cooldown non respecté).
 */
export function rarityScoreBonus(eventId: string, log: NewsLogEntry[]): number {
  const tier   = getRarity(eventId);
  const config = TIER_CONFIG[tier];
  if (tier === "common") return 0;
  const entriesSince = logEntriesSinceLastTrigger(eventId, log);
  return entriesSince >= config.minLogEntries ? config.scoreBonus : 0;
}

/**
 * Filtre une liste de candidats : retire ceux dont le cooldown n'est pas respecté.
 * La vérification de probabilité est laissée à isNewsEventAllowed (appelée séparément).
 *
 * Garantie : si le filtre élimine tous les candidats non-communs mais qu'il reste
 * des candidats communs, ceux-ci ne sont pas touchés.
 */
export function applyCooldownFilter(
  candidateIds: string[],
  log: NewsLogEntry[],
): string[] {
  const filtered = candidateIds.filter((id) => {
    const tier   = getRarity(id);
    if (tier === "common") return true;
    const entriesSince = logEntriesSinceLastTrigger(id, log);
    return entriesSince >= TIER_CONFIG[tier].minLogEntries;
  });

  // Ne jamais retourner un tableau vide si des candidats existaient au départ.
  // Si tous ont été filtrés (tous en cooldown), on retourne les non-common uniquement.
  if (filtered.length === 0 && candidateIds.length > 0) {
    return candidateIds.filter((id) => getRarity(id) === "common");
  }

  return filtered;
}

// ── API générique (hors journal) ──────────────────────────────────────────────

/**
 * Gate de rareté générique pour les opérations, unités et récompenses.
 *
 * @param id    Identifiant de l'item
 * @param tier  Rareté déclarée
 * @param currentTick  Valeur d'horloge actuelle (actionCount ou timestamp)
 * @param ticksPerLogEntry  Combien de ticks = 1 "entrée de journal" (facteur de conversion)
 *
 * Retourne true si l'item peut être proposé, false sinon.
 * Si le gate passe, enregistre automatiquement le déclenchement dans la mémoire de session.
 */
export function checkGenericRarity(
  id: string,
  tier: RarityTier,
  currentTick: number,
  ticksPerLogEntry = 1,
): boolean {
  const config     = TIER_CONFIG[tier];
  const lastTrigger = _sessionTriggers.get(id);

  if (lastTrigger !== undefined) {
    const elapsed = (currentTick - lastTrigger) / ticksPerLogEntry;
    if (elapsed < config.minLogEntries) return false;
  }

  if (Math.random() >= config.baseProbability) return false;

  _sessionTriggers.set(id, currentTick);
  return true;
}

// ── Diagnostic ────────────────────────────────────────────────────────────────

export interface RarityStatus {
  eventId:      string;
  tier:         RarityTier;
  entriesSince: number;
  cooldownMet:  boolean;
  scoreBonus:   number;
}

/**
 * Retourne le statut de rareté de tous les événements non-communs.
 * Utile pour un écran de debug ou vérifier la cadence des événements rares.
 */
export function getRarityDiagnostic(log: NewsLogEntry[]): RarityStatus[] {
  return Object.entries(RARITY_TABLE).map(([eventId, tier]) => {
    const config      = TIER_CONFIG[tier!];
    const entriesSince = logEntriesSinceLastTrigger(eventId, log);
    const cooldownMet  = entriesSince >= config.minLogEntries;
    return {
      eventId,
      tier: tier!,
      entriesSince: entriesSince === Infinity ? -1 : entriesSince,
      cooldownMet,
      scoreBonus: cooldownMet ? config.scoreBonus : 0,
    };
  });
}
