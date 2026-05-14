/**
 * SyncService — cloud save sync with offline queue.
 *
 * Strategy: last-write-wins based on saved_at timestamp.
 * - After every local save → try upload to cloud (fire-and-forget).
 * - If offline → queue in AsyncStorage.
 * - On launch (auth ready) → retry pending upload, then check if cloud is newer.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PENDING_UPLOAD_KEY = "sync_pending_upload_v1";
const DEVICE_ID_KEY = "sync_device_id_v1";

// ── Module-level token (set by AuthContext on auth state change) ──────────────

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── API helpers ───────────────────────────────────────────────────────────────

function supabaseUrl(path: string): string {
  return `${(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/functions/v1${path}`;
}

function headers(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

// ── Device registration ───────────────────────────────────────────────────────

export async function registerDevice(accessToken: string, appVersion: string): Promise<string | null> {
  const cached = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (cached) return cached;

  try {
    const res = await fetch(supabaseUrl("/device-register"), {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        appVersion,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { deviceId?: string };
    if (data.deviceId) {
      await AsyncStorage.setItem(DEVICE_ID_KEY, data.deviceId);
      return data.deviceId;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Cloud save upload ─────────────────────────────────────────────────────────

async function uploadSaveWithToken(token: string, saveData: unknown, saveVersion: number): Promise<boolean> {
  try {
    const res = await fetch(supabaseUrl("/save-sync"), {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ saveData, saveVersion }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Called after every local save. Fire-and-forget — never blocks gameplay.
 * If no token or network fails, queues the upload for next launch.
 */
export async function scheduleUpload(saveData: unknown, saveVersion: number): Promise<void> {
  const token = _accessToken;
  if (!token) return;

  const ok = await uploadSaveWithToken(token, saveData, saveVersion);
  if (!ok) {
    await AsyncStorage.setItem(
      PENDING_UPLOAD_KEY,
      JSON.stringify({ saveData, saveVersion, queuedAt: Date.now() }),
    );
  }
}

// ── Cloud save download ───────────────────────────────────────────────────────

export interface CloudSave {
  save: unknown;
  saveVersion: number;
  savedAt: string;
}

export async function downloadSave(accessToken: string): Promise<CloudSave | null> {
  try {
    const res = await fetch(supabaseUrl("/save-sync"), {
      method: "GET",
      headers: headers(accessToken),
    });
    if (!res.ok) return null;
    const data = await res.json() as { save?: unknown; saveVersion?: number; savedAt?: string };
    if (!data.save) return null;
    return { save: data.save, saveVersion: data.saveVersion ?? 1, savedAt: data.savedAt ?? "" };
  } catch {
    return null;
  }
}

// ── On-launch sync ────────────────────────────────────────────────────────────

export interface SyncOnLaunchResult {
  /** Cloud save to restore, if it is newer than the local save. Null = keep local. */
  cloudSaveToRestore: unknown | null;
}

/**
 * Run once after auth is ready.
 * 1. Retry any pending upload from a previous offline session.
 * 2. Fetch the cloud save and return it if it's newer than localSavedAt.
 *
 * @param localSavedAt  timestamp (Date.now()) of the current local save, or 0 if none.
 */
export async function syncOnLaunch(
  accessToken: string,
  localSavedAt: number,
): Promise<SyncOnLaunchResult> {
  // Step 1 — retry pending upload
  try {
    const raw = await AsyncStorage.getItem(PENDING_UPLOAD_KEY);
    if (raw) {
      const pending = JSON.parse(raw) as { saveData: unknown; saveVersion: number };
      const ok = await uploadSaveWithToken(accessToken, pending.saveData, pending.saveVersion);
      if (ok) await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    }
  } catch {
    // Non-fatal — continue with download check
  }

  // Step 2 — compare timestamps
  const cloud = await downloadSave(accessToken);
  if (!cloud) return { cloudSaveToRestore: null };

  const cloudTs = new Date(cloud.savedAt).getTime();
  if (cloudTs > localSavedAt + 5_000) {
    // Cloud is more than 5 seconds newer — restore it
    return { cloudSaveToRestore: cloud.save };
  }

  return { cloudSaveToRestore: null };
}
