/**
 * simulationClock — horloge centrale de simulation du jeu.
 *
 * ── RATIO DE TEMPS ────────────────────────────────────────────────────────────
 *
 *   1 heure réelle = GAME_HOURS_PER_REAL_HOUR heures de jeu (= 4)
 *
 *   Conséquences :
 *     15 min réelles  =  1 heure jeu
 *     6 h réelles     =  1 jour jeu  (24 heures jeu)
 *     24 h réelles    =  4 jours jeu
 *     10 jours jeu    =  2 j 12 h réels
 *
 * ── VOCABULAIRE ───────────────────────────────────────────────────────────────
 *
 *   "heure jeu" (gameHour)   : unité interne du simulateur.
 *   "jour mandat"            : 24 heures jeu (progression du scénario politique).
 *   "temps réel" (real)      : ce que le joueur voit sur son écran.
 *   "epoch jeu" (startedAt)  : state.startedAt — timestamp réel du premier tick.
 *
 * ── COORDONNÉES ───────────────────────────────────────────────────────────────
 *
 *   gameHour = (realMs - startedAt) / REAL_MS_PER_GAME_HOUR
 *   realMs   = startedAt + gameHour  × REAL_MS_PER_GAME_HOUR
 *
 *   On stocke les fins de recherche / troupe / bâtiment en "heure jeu absolue"
 *   (depuis startedAt). L'affichage convertit vers le temps réel restant.
 *
 * ── ARCHITECTURE ──────────────────────────────────────────────────────────────
 *
 *   - Appeler clockNow() à la place de Date.now() partout dans le jeu.
 *   - Stocker les délais en heures jeu (endsAtGameHour, completedAtGameHour...).
 *   - Afficher via realMsUntilGameHour() → formatRealMs().
 *   - Futur serveur authoritative : remplacer clockNow() par l'offset serveur ;
 *     le serveur valide les completesAtGameHour côté back, le client n'affiche
 *     que le compte à rebours.
 */

// ── Ratio central ─────────────────────────────────────────────────────────────

/** Nombre d'heures de jeu par heure réelle. */
export const GAME_HOURS_PER_REAL_HOUR = 4;

/**
 * Durée réelle (ms) d'une heure de jeu.
 * 1 heure réelle / 4 = 15 minutes réelles par heure jeu.
 */
export const REAL_MS_PER_GAME_HOUR = (60 * 60 * 1000) / GAME_HOURS_PER_REAL_HOUR; // 900 000 ms

/**
 * Durée réelle (ms) d'un jour de jeu (24 heures jeu).
 * = 6 heures réelles.
 */
export const REAL_MS_PER_GAME_DAY = REAL_MS_PER_GAME_HOUR * 24; // 21 600 000 ms

/**
 * Minutes réelles par jour de mandat.
 * Utilisé par realTimeEngine pour cadencer l'avancée du mandateDay.
 * Valeur : 6 h × 60 = 360 minutes réelles.
 */
export const REAL_MINUTES_PER_MANDATE_DAY = REAL_MS_PER_GAME_DAY / 60_000; // 360

// ── Source unique de l'horloge ────────────────────────────────────────────────

/**
 * Point d'entrée unique pour lire l'heure courante dans tout le jeu.
 *
 * Avantages :
 *   - Permet de mocker l'horloge dans les tests.
 *   - Prépare l'injection d'un offset serveur (anti-triche avancé).
 *   - Aucun composant n'appelle Date.now() directement.
 */
export function clockNow(): number {
  return Date.now();
}

// ── Coordonnées game-time ─────────────────────────────────────────────────────

/**
 * Heure jeu actuelle depuis l'epoch de la partie.
 *
 * gameHour = (maintenant − startedAt) / REAL_MS_PER_GAME_HOUR
 *
 * @param startedAt  state.startedAt — timestamp réel du début de partie
 */
export function currentGameHour(startedAt: number): number {
  return (clockNow() - startedAt) / REAL_MS_PER_GAME_HOUR;
}

/**
 * Jour de mandat théorique d'après l'horloge murale (sans plafond offline).
 * Pour le jour "officiel" avec plafond, utiliser state.mandateDay.
 */
export function currentMandateDay(startedAt: number): number {
  return Math.floor(currentGameHour(startedAt) / 24);
}

// ── Conversions ───────────────────────────────────────────────────────────────

/** Convertit des heures jeu en millisecondes réelles. */
export function gameHoursToRealMs(gameHours: number): number {
  return gameHours * REAL_MS_PER_GAME_HOUR;
}

/** Convertit des millisecondes réelles en heures jeu. */
export function realMsToGameHours(ms: number): number {
  return ms / REAL_MS_PER_GAME_HOUR;
}

/**
 * Millisecondes réelles restantes jusqu'à une heure jeu cible.
 * Retourne 0 si l'heure est déjà passée.
 *
 * @param targetGameHour  heure jeu absolue de fin (stockée dans endsAtGameHour etc.)
 * @param startedAt       state.startedAt
 */
export function realMsUntilGameHour(targetGameHour: number, startedAt: number): number {
  return Math.max(0, (targetGameHour - currentGameHour(startedAt)) * REAL_MS_PER_GAME_HOUR);
}

// ── Migration des sauvegardes existantes ─────────────────────────────────────

/**
 * Convertit un ancien timestamp réel (ms) en heure jeu absolue.
 * Utilisé lors du chargement de sauvegardes créées avant la refonte de l'horloge.
 *
 * Principe : on préserve le temps réel restant.
 * Un joueur qui avait 1 h réelle restante continuera à attendre 1 h réelle —
 * mais le système stockera désormais cette fin en heures jeu.
 *
 * @param endRealMs  ancien timestamp réel de fin (ex: entry.endsAt)
 * @param startedAt  state.startedAt
 */
export function migrateRealMsTimestamp(endRealMs: number, startedAt: number): number {
  const remainingRealMs = Math.max(0, endRealMs - clockNow());
  return currentGameHour(startedAt) + realMsToGameHours(remainingRealMs);
}

// ── Formatage pour l'affichage ────────────────────────────────────────────────

/**
 * Formate des millisecondes réelles restantes en chaîne lisible.
 *
 * Exemples : "45s" | "7min" | "2h15min" | "3j6h"
 *
 * Note : on affiche toujours du temps RÉEL au joueur, jamais des "heures jeu"
 * brutes. Ainsi "dans 1h" signifie toujours 1 heure sur l'horloge murale.
 */
export function formatRealMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m > 0 ? `${h}h${m}min` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}j${rh}h` : `${d}j`;
}

/**
 * Formate des heures jeu restantes en temps réel lisible.
 * C'est toujours le temps réel qui est affiché — jamais les heures jeu brutes.
 *
 * Exemple : 4 heures jeu restantes → affiché "1h" (= 60 min réelles).
 */
export function formatRemainingGameHours(gameHoursRemaining: number): string {
  return formatRealMs(gameHoursToRealMs(Math.max(0, gameHoursRemaining)));
}

// ── Système Jour / Saison ─────────────────────────────────────────────────────

// ── Ratios saison réelle ──────────────────────────────────────────────────────

/** Jours de jeu produits par jour réel (1 jour réel = 4 jours jeu). */
export const GAME_DAYS_PER_REAL_DAY = 4;

/** Durée d'une saison en jours réels (= 1 mois réel). */
export const REAL_DAYS_PER_SEASON = 30;

/** Durée d'une saison en jours de jeu (= GAME_DAYS_PER_REAL_DAY × REAL_DAYS_PER_SEASON). */
export const GAME_DAYS_PER_SEASON = GAME_DAYS_PER_REAL_DAY * REAL_DAYS_PER_SEASON; // 120

/** Durée réelle d'une saison en millisecondes (30 jours réels). */
export const REAL_MS_PER_SEASON = REAL_DAYS_PER_SEASON * 24 * 60 * 60 * 1000; // 2 592 000 000 ms

/**
 * Nombre de jours de jeu par saison pour les calculs d'affichage.
 * 1 saison = 30 jours réels = 120 jours de jeu = le mandat complet.
 */
export const DAYS_PER_SEASON = GAME_DAYS_PER_SEASON; // 120

/** Durée d'une saison (alias explicite pour les constantes de config). */
export const DEFAULT_SEASON_LENGTH_DAYS = DAYS_PER_SEASON;

/** Durée totale du mandat en jours de jeu (= 1 saison réelle = 30 jours réels). */
export const TOTAL_GAME_DAYS = GAME_DAYS_PER_SEASON; // 120

/**
 * Décompose un numéro de jour absolu (1..60) en saison + jour dans la saison.
 *
 * Correspondance directe avec l'ancienne numérotation mois → jour :
 *   ancien "Année 1 — Mois 3"  ↔  "Saison 1 — Jour 3"
 *   ancien "Année 2 — Mois 1"  ↔  "Saison 2 — Jour 1"
 */
export function computeGameDayDisplay(gameDay: number): {
  seasonNumber: number;
  dayInSeason: number;
} {
  const d = Math.max(1, Math.min(TOTAL_GAME_DAYS, Math.floor(gameDay)));
  return {
    seasonNumber: Math.floor((d - 1) / DAYS_PER_SEASON) + 1,
    dayInSeason: ((d - 1) % DAYS_PER_SEASON) + 1,
  };
}

/**
 * Libellé long pour les écrans principaux.
 * Exemple : gameDay=15 → "SAISON 2 — JOUR 3"
 */
export function formatGameDayLabel(gameDay: number): string {
  const { seasonNumber, dayInSeason } = computeGameDayDisplay(gameDay);
  return `Saison ${seasonNumber} — Jour ${dayInSeason}`;
}

/**
 * Libellé compact pour les bandeaux secondaires.
 * Exemple : gameDay=15 → "S2 J3"
 */
export function formatGameDayShort(gameDay: number): string {
  const { seasonNumber, dayInSeason } = computeGameDayDisplay(gameDay);
  return `S${seasonNumber} J${dayInSeason}`;
}

/**
 * Compte à rebours en jours de jeu pour l'affichage des événements futurs.
 * Exemple : 0 → "imminent" | 1 → "dans 1 jour de jeu" | 5 → "dans 5 jours de jeu"
 */
export function formatCountdownDays(gameDaysRemaining: number): string {
  if (gameDaysRemaining <= 0) return "imminent";
  const d = Math.ceil(gameDaysRemaining);
  return d === 1 ? "dans 1 jour de jeu" : `dans ${d} jours de jeu`;
}

/**
 * Compte à rebours réel estimé basé sur la vitesse du ticker (tick-based).
 * @deprecated Utiliser formatSeasonCountdown() à la place pour le nouveau système.
 */
export function formatCountdownRealTime(
  gameDaysRemaining: number,
  tickMsPerWeek: number,
  weeksPerDay: number,
): string | null {
  if (gameDaysRemaining <= 0) return null;
  if (tickMsPerWeek <= 0) return null;
  const ms = gameDaysRemaining * tickMsPerWeek * weeksPerDay;
  return formatRealMs(ms);
}

// ── Horloge temps réel — ancre saison ────────────────────────────────────────

/**
 * Calcule l'état courant de l'horloge de mandat depuis l'ancre réelle.
 *
 * Formule :
 *   elapsedRealMs    = nowMs − seasonStartedAtRealMs
 *   elapsedRealHours = elapsedRealMs / 3 600 000
 *   elapsedGameHours = elapsedRealHours × GAME_HOURS_PER_REAL_HOUR (= 4)
 *   absoluteGameDay  = floor(elapsedGameHours / 24)   ← 0-indexé
 *   currentGameHour  = floor(elapsedGameHours % 24)   ← 0..23
 *
 * @param seasonStartedAtRealMs  Timestamp réel (ms) du début du mandat/saison.
 */
export function computeSeasonClock(seasonStartedAtRealMs: number): {
  /** Jour de jeu absolu depuis le début du mandat (0-indexé). */
  absoluteGameDay: number;
  /** Heure de jeu dans le jour courant (0..23). */
  currentGameHour: number;
  /** Timestamp réel (ms) de fin de la saison courante. */
  seasonEndsAtRealMs: number;
} {
  const nowMs = clockNow();
  const elapsedRealMs = Math.max(0, nowMs - seasonStartedAtRealMs);
  const elapsedRealHours = elapsedRealMs / 3_600_000;
  const elapsedGameHours = elapsedRealHours * GAME_HOURS_PER_REAL_HOUR;
  const absoluteGameDay = Math.floor(elapsedGameHours / 24);
  const currentGameHour = Math.floor(elapsedGameHours % 24);
  const seasonEndsAtRealMs = seasonStartedAtRealMs + REAL_MS_PER_SEASON;
  return { absoluteGameDay, currentGameHour, seasonEndsAtRealMs };
}

/**
 * Formate le compte à rebours jusqu'à la fin de la saison en cours.
 * Exemple : "Fin de saison : dans 29j23h réels"
 *
 * @param seasonEndsAtRealMs  Timestamp réel (ms) de fin de saison (issu de computeSeasonClock).
 */
export function formatSeasonCountdown(seasonEndsAtRealMs: number): string {
  const msRemaining = Math.max(0, seasonEndsAtRealMs - clockNow());
  if (msRemaining <= 0) return "Fin de saison imminente";
  return `Fin de saison : dans ${formatRealMs(msRemaining)} réels`;
}
