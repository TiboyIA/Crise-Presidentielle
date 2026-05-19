/**
 * Feature flags — compile-time constants, no remote config.
 *
 * All defaults are PRODUCTION-SAFE: they match what users see today.
 * To disable a module: set its flag to false and rebuild.
 *
 * Flags are read at module-load time. There is no runtime toggle — this is
 * intentional. For a remote-config layer, replace individual values with reads
 * from your config provider and wrap this object in a hook.
 */

export const FEATURES = {
  // ── Network-dependent multiplayer screens ────────────────────────────────────
  enableGlobalLeaderboard: true,  // Classement mondial async (Supabase)
  enableAlliances:         true,  // Alliances joueur-à-joueur
  enableSpyOps:            true,  // Opérations d'espionnage async
  enableCyberOps:          true,  // Opérations cyber async

  // ── Single-player modules ────────────────────────────────────────────────────
  enableEntities:          true,  // Écran Forces Cosmiques / Factions
  enableCrisisOverlay:     true,  // Overlay d'alerte crise en temps réel

  // ── Internal / instrumentation ───────────────────────────────────────────────
  enableDevStats:          __DEV__, // Écran stats dev — actif uniquement en mode développement
  enableTelemetryLocal:    true,  // Buffer local de télémétrie gameplay (AsyncStorage)
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Returns true if the given feature is currently enabled. */
export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
