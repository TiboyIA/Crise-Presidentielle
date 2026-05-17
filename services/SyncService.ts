/**
 * SyncService — cloud save sync with offline queue.
 *
 * Strategy: last-write-wins based on saved_at timestamp (server-assigned).
 * - After every local save → validate + upload to cloud (fire-and-forget).
 * - If offline or invalid → queue in AsyncStorage.
 * - On launch (auth ready) → retry pending upload, then check if cloud is newer.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PENDING_UPLOAD_KEY = "sync_pending_upload_v1";
const DEVICE_ID_KEY = "sync_device_id_v1";

// Must match MAX_SAVE_VERSION in save-sync Edge Function.
const SAVE_MAX_BYTES = 512_000;
const MIN_SAVE_VERSION = 1;
const MAX_SAVE_VERSION = 10;

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

// ── Save integrity (djb2, non-cryptographique) ────────────────────────────────
// Détecte la corruption accidentelle (écriture AsyncStorage incomplète, réseau
// tronqué). Le serveur recompute le même hash. Non secret — ne prouve pas
// l'authenticité des données, ne remplace pas les contrôles serveur.

function hashSave(saveData: unknown): string {
  const str = JSON.stringify(saveData);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── Client-side save validation (best-effort — not a security boundary) ───────
// Returns the serialized JSON string if valid, null otherwise.
// Never trust this on the server — server re-validates everything independently.

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function validateAndSerialize(saveData: unknown, saveVersion: number): string | null {
  if (saveData === null || typeof saveData !== "object" || Array.isArray(saveData)) return null;
  if (!Number.isInteger(saveVersion) || saveVersion < MIN_SAVE_VERSION || saveVersion > MAX_SAVE_VERSION) return null;
  for (const k of Object.keys(saveData as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(k)) return null;
  }
  try {
    const serialized = JSON.stringify(saveData);
    if (serialized.length > SAVE_MAX_BYTES) return null;
    return serialized;
  } catch {
    return null;
  }
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

async function uploadSaveWithToken(
  token: string,
  saveData: unknown,
  saveVersion: number,
  saveChecksum: string,
): Promise<boolean> {
  try {
    const res = await fetch(supabaseUrl("/save-sync"), {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ saveData, saveVersion, saveChecksum }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Called after every local save. Fire-and-forget — never blocks gameplay.
 * Validates the payload before uploading. If network fails, queues for next launch.
 */
export async function scheduleUpload(saveData: unknown, saveVersion: number): Promise<void> {
  const token = _accessToken;
  if (!token) return;

  const serialized = validateAndSerialize(saveData, saveVersion);
  if (!serialized) return; // client-side guard — skip invalid payloads silently

  const saveChecksum = hashSave(saveData);
  const ok = await uploadSaveWithToken(token, saveData, saveVersion, saveChecksum);
  if (!ok) {
    await AsyncStorage.setItem(
      PENDING_UPLOAD_KEY,
      JSON.stringify({ saveData, saveVersion, saveChecksum, queuedAt: Date.now() }),
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

export type ConflictResolution =
  | "local_newer"       // local timestamp clearly ahead — keep local
  | "cloud_newer"       // cloud timestamp clearly ahead — restore cloud
  | "conflict_detected" // timestamps within 5 s of each other — keep local (safer default)
  | "no_cloud_save";    // no cloud save exists yet

export interface SyncOnLaunchResult {
  /** Cloud save to restore, if cloud_newer. Null = keep local. */
  cloudSaveToRestore: unknown | null;
  conflictResolution: ConflictResolution;
}

/**
 * Run once after auth is ready.
 * 1. Retry any pending upload from a previous offline session.
 * 2. Fetch the cloud save and return it with an explicit conflict resolution.
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
      const pending = JSON.parse(raw) as {
        saveData: unknown;
        saveVersion: number;
        saveChecksum?: string;
      };
      const checksum = pending.saveChecksum ?? hashSave(pending.saveData);
      const ok = await uploadSaveWithToken(accessToken, pending.saveData, pending.saveVersion, checksum);
      if (ok) await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    }
  } catch {
    // Non-fatal — continue with download check
  }

  // Step 2 — compare timestamps and decide conflict resolution
  const cloud = await downloadSave(accessToken);
  if (!cloud || !cloud.savedAt) {
    return { cloudSaveToRestore: null, conflictResolution: "no_cloud_save" };
  }

  const cloudTs = new Date(cloud.savedAt).getTime();
  const diff = cloudTs - localSavedAt;

  if (diff > 5_000) {
    // Cloud is clearly newer — restore it
    return { cloudSaveToRestore: cloud.save, conflictResolution: "cloud_newer" };
  }
  if (diff < -5_000) {
    // Local is clearly newer — keep it
    return { cloudSaveToRestore: null, conflictResolution: "local_newer" };
  }
  // Timestamps within 5 s — ambiguous, keep local (fewer surprises)
  return { cloudSaveToRestore: null, conflictResolution: "conflict_detected" };
}
