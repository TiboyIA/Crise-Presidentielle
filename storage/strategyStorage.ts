import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StrategyGameState } from "@/types/strategy";

const KEY = "@strategy_v1";
const CURRENT_VERSION = 1;

export async function saveStrategy(state: StrategyGameState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function loadStrategy(): Promise<StrategyGameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StrategyGameState;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
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
