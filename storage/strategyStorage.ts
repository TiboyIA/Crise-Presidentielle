import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StrategyGameState } from "@/types/strategy";
import { scheduleUpload } from "@/services/SyncService";
import { migrateSave, isSaveCurrent, CURRENT_SAVE_VERSION } from "@/storage/saveMigrations";
import { isValidStrategyGameState } from "@/utils/validators";

const KEY = "@strategy_v1";

export async function saveStrategy(state: StrategyGameState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
  scheduleUpload(state, state.version);
}

export interface LoadResult {
  state: StrategyGameState;
  /** True if the loaded save was an older version that was migrated. */
  wasMigrated: boolean;
  /** True if data was partially unrecoverable and a fallback was used. */
  usedFallback: boolean;
  /** Non-fatal issues fixed during migration (empty when save was already current). */
  warnings: string[];
}

export async function loadStrategy(): Promise<LoadResult | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn("[strategyStorage] save JSON is malformed — attempting recovery");
      parsed = {};
    }

    // Fast path: save is already at current version
    if (isSaveCurrent(parsed) && isValidStrategyGameState(parsed)) {
      return {
        state:        parsed as StrategyGameState,
        wasMigrated:  false,
        usedFallback: false,
        warnings:     [],
      };
    }

    // Migration path: upgrade from any older version
    const result = migrateSave(parsed);
    if (!result) {
      console.warn("[strategyStorage] save is not a recognisable object — discarding");
      return null;
    }

    if (result.warnings.length > 0) {
      console.info("[strategyStorage] migration warnings:", result.warnings.join("; "));
    }
    if (result.usedFallback) {
      console.warn("[strategyStorage] save was unrecoverable — recovery fallback used");
    }

    // Persist the migrated save immediately so next load is clean
    await saveStrategy(result.state);

    return {
      state:        result.state,
      wasMigrated:  result.migratedFrom < CURRENT_SAVE_VERSION,
      usedFallback: result.usedFallback,
      warnings:     result.warnings,
    };
  } catch {
    return null;
  }
}

export async function deleteStrategy(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function hasStrategy(state: StrategyGameState | null): state is StrategyGameState {
  return state !== null;
}
