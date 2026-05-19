/**
 * TelemetryService — télémétrie gameplay privacy-first.
 *
 * Principes :
 *  - Aucune donnée personnelle (pas d'email, nom, localisation, contacts).
 *  - Stockage local uniquement (AsyncStorage). Aucun envoi serveur automatique.
 *  - SessionId aléatoire par lancement — non persisté, non lié à un compte.
 *  - Buffer plafonné à MAX_BUFFER. Les anciens événements sont supprimés en premier.
 *  - Toutes les erreurs sont swallowed silencieusement : jamais de crash gameplay.
 *  - flushTelemetry() est un stub — prévu pour usage futur, non activé.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { FEATURES } from "@/config/features";

const STORAGE_KEY = "@telemetry_buffer_v1";
const MAX_BUFFER   = 200;

// ── Session ID ────────────────────────────────────────────────────────────────
// Généré une fois par lancement d'app. Pas persisté. Pas de PII.
let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  return _sessionId;
}

// ── App version ───────────────────────────────────────────────────────────────
// Lue depuis expo-constants (déjà installé). Pas de PII.
const APP_VERSION: string =
  (Constants.expoConfig?.version ?? (Constants.manifest as any)?.version ?? "1.0.0");

// ── Types ─────────────────────────────────────────────────────────────────────

export type TelemetryEventType =
  | "app_open"
  | "new_game_started"
  | "first_action_done"
  | "building_upgrade_started"
  | "research_started"
  | "unit_training_started"
  | "operation_launched"
  | "crisis_opened"
  | "crisis_choice_made"
  | "mission_completed"
  | "ranking_opened"
  | "alliance_invite_sent"
  | "spy_op_launched"
  | "cyber_op_launched"
  | "session_ended";

export interface TelemetryEvent {
  eventType: TelemetryEventType;
  timestamp: number;        // ms epoch — non lié à un utilisateur
  sessionId: string;        // aléatoire, par lancement
  appVersion: string;
  gameDay?: number;         // mandateDay courant si disponible
  elapsedTime?: number;     // ms depuis app_open si disponible
  metadata?: Record<string, string | number | boolean>;
}

// ── Buffer helpers ────────────────────────────────────────────────────────────

async function loadBuffer(): Promise<TelemetryEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

async function saveBuffer(buffer: TelemetryEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    // silencieux — télémétrie ne doit jamais casser le gameplay
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enregistre un événement gameplay dans le buffer local.
 * Fire-and-forget : appelez avec `void track(...)`, n'attendez pas.
 */
export async function track(
  eventType: TelemetryEventType,
  opts?: {
    gameDay?: number;
    elapsedTime?: number;
    metadata?: Record<string, string | number | boolean>;
  },
): Promise<void> {
  if (!FEATURES.enableTelemetryLocal) return;
  try {
    const event: TelemetryEvent = {
      eventType,
      timestamp:  Date.now(),
      sessionId:  getSessionId(),
      appVersion: APP_VERSION,
      ...(opts?.gameDay    !== undefined && { gameDay:     opts.gameDay }),
      ...(opts?.elapsedTime !== undefined && { elapsedTime: opts.elapsedTime }),
      ...(opts?.metadata   !== undefined && { metadata:    opts.metadata }),
    };

    const buffer  = await loadBuffer();
    const appended = [...buffer, event];
    // Supprime les plus anciens si le buffer dépasse la limite
    const trimmed = appended.length > MAX_BUFFER
      ? appended.slice(appended.length - MAX_BUFFER)
      : appended;
    await saveBuffer(trimmed);
  } catch {
    // silencieux
  }
}

/**
 * Stub — prévu pour un futur envoi serveur.
 * N'envoie rien pour l'instant. À activer manuellement après validation.
 */
export async function flushTelemetry(): Promise<void> {
  // TODO: implémenter l'envoi vers endpoint analytics interne
  // Exemple : POST /api/telemetry avec le buffer, puis clearTelemetry()
}

/** Lit le buffer local (debug / debug screen). */
export async function getTelemetryBuffer(): Promise<TelemetryEvent[]> {
  return loadBuffer();
}

/** Vide le buffer local (debug / RGPD effacement). */
export async function clearTelemetry(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}
