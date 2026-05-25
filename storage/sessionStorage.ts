import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@session_v2";

export interface SessionData {
  sessionStartedAt: number;
  lastPauseSuggestedAt: number;
  backgroundAt: number | null;
  backgroundResources: Record<string, number> | null;
}

const DEFAULT: SessionData = {
  sessionStartedAt: 0,
  lastPauseSuggestedAt: 0,
  backgroundAt: null,
  backgroundResources: null,
};

export async function loadSessionData(): Promise<SessionData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<SessionData>;
    return {
      sessionStartedAt:      p.sessionStartedAt      ?? 0,
      lastPauseSuggestedAt:  p.lastPauseSuggestedAt  ?? 0,
      backgroundAt:          p.backgroundAt          ?? null,
      backgroundResources:   p.backgroundResources   ?? null,
    };
  } catch {
    return DEFAULT;
  }
}

export async function saveSessionData(data: SessionData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
