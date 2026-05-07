/**
 * Debug utilities for development and testing.
 * Only active in development mode (__DEV__).
 */

import Constants from "expo-constants";
import { Gauges, HiddenGauges, Resources, GameState } from "@/types/game";

/**
 * Check if debug mode is enabled (only in development).
 */
export function isDebugMode(): boolean {
  return __DEV__;
}

/**
 * Log a debug message (only in development).
 */
export function debugLog(category: string, message: string, data?: any): void {
  if (!isDebugMode()) return;
  const timestamp = new Date().toISOString();
  console.log(
    `[DEBUG ${timestamp}] ${category}: ${message}`,
    data ? `\n${JSON.stringify(data, null, 2)}` : "",
  );
}

/**
 * Log a warning in debug mode.
 */
export function debugWarn(category: string, message: string, data?: any): void {
  if (!isDebugMode()) return;
  const timestamp = new Date().toISOString();
  console.warn(
    `[DEBUG WARN ${timestamp}] ${category}: ${message}`,
    data ? `\n${JSON.stringify(data, null, 2)}` : "",
  );
}

/**
 * Log an error in debug mode.
 */
export function debugError(
  category: string,
  message: string,
  error?: Error | any,
): void {
  if (!isDebugMode()) return;
  const timestamp = new Date().toISOString();
  console.error(
    `[DEBUG ERROR ${timestamp}] ${category}: ${message}`,
    error ? `\n${JSON.stringify(error, null, 2)}` : "",
  );
}

/**
 * Validate game state integrity (debug only).
 */
export function validateGameStateIntegrity(state: GameState): {
  isValid: boolean;
  errors: string[];
} {
  if (!isDebugMode()) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];

  // Check gauges are in range [0, 100]
  Object.entries(state.gauges).forEach(([key, value]) => {
    if (value < 0 || value > 100) {
      errors.push(`Gauge "${key}" out of range: ${value}`);
    }
  });

  // Check hidden gauges are in range [0, 100]
  Object.entries(state.hiddenGauges).forEach(([key, value]) => {
    if (value < 0 || value > 100) {
      errors.push(`Hidden gauge "${key}" out of range: ${value}`);
    }
  });

  // Check resources are non-negative
  if (state.resources) {
    Object.entries(state.resources).forEach(([key, value]) => {
      if ((value as number) < 0) {
        errors.push(`Resource "${key}" is negative: ${value}`);
      }
    });
  }

  // Check ministers count
  if (state.ministers.length === 0) {
    errors.push("No ministers found");
  }

  // Check regions count
  if (state.regions.length === 0) {
    errors.push("No regions found");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a debug state snapshot.
 */
export function createDebugSnapshot(state: GameState, label: string): string {
  if (!isDebugMode()) return "";

  let gameTimeStr = "unknown";
  if (state.gameTime) {
    const currentMonth = state.gameTime.currentMonth ?? 1;
    const year = Math.floor((currentMonth - 1) / 12) + 1;
    const month = ((currentMonth - 1) % 12) + 1;
    gameTimeStr = `Y${year}M${month}`;
  }

  const snapshot = {
    label,
    timestamp: new Date().toISOString(),
    gameTime: gameTimeStr,
    turn: state.turn,
    gauges: { ...state.gauges },
    hiddenGauges: { ...state.hiddenGauges },
    resources: state.resources ? { ...state.resources } : {},
    ministersCount: state.ministers.length,
    regionsCount: state.regions.length,
  };

  debugLog("SNAPSHOT", label, snapshot);
  return JSON.stringify(snapshot);
}

/**
 * Dump full game state to console (debug only).
 */
export function dumpGameState(state: GameState): void {
  if (!isDebugMode()) return;
  console.log(
    "%c=== FULL GAME STATE ===",
    "color: red; font-size: 16px; font-weight: bold;",
  );
  console.log(state);
}

/**
 * List all available debug commands.
 */
export function printDebugHelp(): void {
  if (!isDebugMode()) return;
  console.log(
    "%c=== DEBUG COMMANDS ===",
    "color: blue; font-size: 14px; font-weight: bold;",
  );
  console.log("debugLog(category, message, data?)");
  console.log("debugWarn(category, message, data?)");
  console.log("debugError(category, message, error?)");
  console.log("validateGameStateIntegrity(state)");
  console.log("createDebugSnapshot(state, label)");
  console.log("dumpGameState(state)");
  console.log("printDebugHelp()");
}

/**
 * Attach debug utilities to globalThis for console access.
 * Call this once at app startup (in development).
 */
export function attachDebugToGlobal(): void {
  if (!isDebugMode()) return;

  (globalThis as any).debugLog = debugLog;
  (globalThis as any).debugWarn = debugWarn;
  (globalThis as any).debugError = debugError;
  (globalThis as any).validateGameStateIntegrity = validateGameStateIntegrity;
  (globalThis as any).createDebugSnapshot = createDebugSnapshot;
  (globalThis as any).dumpGameState = dumpGameState;
  (globalThis as any).printDebugHelp = printDebugHelp;

  console.log(
    "%c✓ Debug utilities attached to globalThis",
    "color: green; font-weight: bold;",
  );
  printDebugHelp();
}
