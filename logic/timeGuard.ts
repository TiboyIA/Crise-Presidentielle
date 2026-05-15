/**
 * timeGuard — Garde-fou contre l'avancement non intentionnel du temps.
 *
 * Règle UX absolue : le temps ne doit avancer que dans 3 cas explicites.
 * Ce module centralise la validation + le logging dev pour identifier tout
 * déclenchement parasite.
 *
 * Raisons autorisées :
 *   explicit_play  — joueur appuie sur Play dans la TimeBar
 *   explicit_skip  — joueur appuie sur "Sauter jusqu'au prochain événement"
 *   server_sync    — horloge serveur authoritative (futur)
 *   debug          — mode dev / debug uniquement
 *
 * Toute autre raison est bloquée et loggée.
 */

export type TimeAdvanceReason =
  | "explicit_play"   // Play pressé dans TimeBar
  | "explicit_skip"   // Skip pressé dans TimeBar
  | "server_sync"     // Future synchronisation serveur
  | "debug";          // Débogage uniquement

const ALLOWED_REASONS: ReadonlySet<TimeAdvanceReason> = new Set([
  "explicit_play",
  "explicit_skip",
  "server_sync",
  "debug",
]);

/**
 * Vérifie si l'avancement du temps est autorisé pour la raison donnée.
 * En dev, console.warn si la raison n'est pas autorisée.
 */
export function canAdvanceTime(reason: TimeAdvanceReason | string): boolean {
  const ok = ALLOWED_REASONS.has(reason as TimeAdvanceReason);
  if (!ok && __DEV__) {
    console.warn(`[TIME_GUARD] ❌ Avancement bloqué — raison non autorisée: "${reason}"`);
  }
  return ok;
}

/**
 * Log de chaque avancement effectif du temps (dev uniquement).
 * Appeler juste AVANT d'appliquer le changement de mois/jour.
 */
export function logTimeAdvance(
  reason: TimeAdvanceReason,
  previousDay: number,
  nextDay: number,
  source: string,
): void {
  if (__DEV__) {
    console.log("[TIME_ADVANCE]", {
      reason,
      previousDay,
      nextDay,
      delta: nextDay - previousDay,
      source,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Log d'une reprise automatique bloquée (dev uniquement).
 * Appeler quand on remplace un auto-resume par speed=0.
 */
export function logAutoResumePrevented(source: string, wouldHaveSpeed: number): void {
  if (__DEV__) {
    console.log("[TIME_GUARD] ✅ Auto-resume bloqué →", {
      source,
      wouldHaveSpeed,
      newSpeed: 0,
    });
  }
}
