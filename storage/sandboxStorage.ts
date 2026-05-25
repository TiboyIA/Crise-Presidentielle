/**
 * Stockage isolé du bac à sable développeur.
 * Clés séparées de la sauvegarde normale — ne pollue jamais la partie réelle.
 * Ne pas utiliser en production (protégé par isDevSandboxEnabled côté UI).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StrategyGameState } from "@/types/strategy";

const SANDBOX_KEY        = "strategy_sandbox_save_v1";
const SNAPSHOT_KEY       = "strategy_sandbox_snapshot_v1";
const SANDBOX_ACTIVE_KEY = "strategy_sandbox_active_v1";

export async function loadSandboxState(): Promise<StrategyGameState | null> {
  try {
    const json = await AsyncStorage.getItem(SANDBOX_KEY);
    if (!json) return null;
    return JSON.parse(json) as StrategyGameState;
  } catch {
    return null;
  }
}

export async function saveSandboxState(state: StrategyGameState): Promise<void> {
  try {
    await AsyncStorage.setItem(SANDBOX_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[SANDBOX] Save failed:", e);
  }
}

export async function deleteSandboxState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SANDBOX_KEY, SNAPSHOT_KEY]);
  } catch (e) {
    console.warn("[SANDBOX] Delete failed:", e);
  }
}

export async function saveSandboxSnapshot(state: StrategyGameState): Promise<void> {
  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[SANDBOX] Snapshot save failed:", e);
  }
}

export async function loadSandboxSnapshot(): Promise<StrategyGameState | null> {
  try {
    const json = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!json) return null;
    return JSON.parse(json) as StrategyGameState;
  } catch {
    return null;
  }
}

// ── Flag de persistance du mode sandbox ───────────────────────────────────────

export async function getSandboxActiveFlag(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SANDBOX_ACTIVE_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function setSandboxActiveFlag(active: boolean): Promise<void> {
  try {
    if (active) {
      await AsyncStorage.setItem(SANDBOX_ACTIVE_KEY, "1");
    } else {
      await AsyncStorage.removeItem(SANDBOX_ACTIVE_KEY);
    }
  } catch (e) {
    console.warn("[SANDBOX] Flag save failed:", e);
  }
}

export async function deleteSandboxAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SANDBOX_KEY, SNAPSHOT_KEY, SANDBOX_ACTIVE_KEY]);
  } catch (e) {
    console.warn("[SANDBOX] Full delete failed:", e);
  }
}
