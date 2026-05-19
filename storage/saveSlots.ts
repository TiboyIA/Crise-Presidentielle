import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StrategyGameState } from "@/types/strategy";
import { migrateSave, isSaveCurrent } from "@/storage/saveMigrations";

export type SlotNumber = 1 | 2 | 3 | 4 | 5 | 6;
/** Base slots — always available. */
export const SLOT_NUMBERS: SlotNumber[] = [1, 2, 3];
/** Bonus slots — unlocked by purchase. */
export const BONUS_SLOT_NUMBERS: SlotNumber[] = [4, 5, 6];

export interface SaveSlotMeta {
  slot: SlotNumber;
  playerName: string;
  mandateDay: number;
  savedAt: number;
}

interface SlotData {
  meta: SaveSlotMeta;
  state: StrategyGameState;
}

function slotKey(slot: SlotNumber): string {
  return `@strategy_slot_${slot}_v1`;
}

export async function saveToSlot(slot: SlotNumber, state: StrategyGameState): Promise<void> {
  const data: SlotData = {
    meta: {
      slot,
      playerName: state.playerName,
      mandateDay: state.mandateDay,
      savedAt: Date.now(),
    },
    state,
  };
  await AsyncStorage.setItem(slotKey(slot), JSON.stringify(data));
}

export async function loadFromSlot(slot: SlotNumber): Promise<StrategyGameState | null> {
  try {
    const raw = await AsyncStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SlotData>;
    const rawState = data.state;
    if (!rawState) return null;
    if (isSaveCurrent(rawState)) return rawState;
    const result = migrateSave(rawState);
    return result ? result.state : null;
  } catch {
    return null;
  }
}

export async function deleteSlot(slot: SlotNumber): Promise<void> {
  await AsyncStorage.removeItem(slotKey(slot));
}

export async function readSlotMeta(slot: SlotNumber): Promise<SaveSlotMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SlotData>;
    return data.meta ?? null;
  } catch {
    return null;
  }
}

export async function readAllSlotMetas(): Promise<(SaveSlotMeta | null)[]> {
  return Promise.all(SLOT_NUMBERS.map(readSlotMeta));
}
