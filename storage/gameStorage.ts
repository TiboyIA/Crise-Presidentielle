import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState } from "@/context/GameContext";

const SAVE_KEY = "etat_de_crise_save_v4";
const LEGACY_KEYS = [
  "etat_de_crise_save_v1",
  "etat_de_crise_save_v2",
  "etat_de_crise_save_v3",
];

export async function saveGame(state: GameState): Promise<void> {
  try {
    const json = JSON.stringify(state);
    await AsyncStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.warn("Save failed:", e);
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    let json = await AsyncStorage.getItem(SAVE_KEY);
    let migratedFromLegacy = false;
    // If no v4 save, walk the legacy keys (most recent first) and adopt
    // the first one we find. The GameContext merge layer will inject any
    // schema fields that are missing on the loaded payload.
    if (!json) {
      for (let i = LEGACY_KEYS.length - 1; i >= 0; i--) {
        const k = LEGACY_KEYS[i]!;
        const legacy = await AsyncStorage.getItem(k);
        if (legacy) {
          json = legacy;
          migratedFromLegacy = true;
          break;
        }
      }
    }
    // Best-effort cleanup of legacy keys regardless of outcome.
    for (const k of LEGACY_KEYS) {
      AsyncStorage.removeItem(k).catch(() => {});
    }
    if (!json) return null;
    if (migratedFromLegacy) {
      // Persist under the current key immediately so we don't lose the
      // migration if the user closes the app before the next save tick.
      AsyncStorage.setItem(SAVE_KEY, json).catch(() => {});
    }
    return JSON.parse(json) as GameState;
  } catch (e) {
    console.warn("Load failed:", e);
    return null;
  }
}

export async function deleteGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn("Delete failed:", e);
  }
}
