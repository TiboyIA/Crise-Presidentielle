/**
 * RankedService — manages the local decision journal and API calls for ranked mode.
 *
 * Flow:
 *   1. Player opts into ranked mode on the home screen.
 *   2. startRankedRun() → POST /ranked-start → saves { runId, seed } locally.
 *   3. During gameplay, StrategyContext calls recordEvent() on each key decision.
 *   4. At game end, submitRankedRun() → POST /ranked-submit → server validates + scores.
 *
 * If the network is unavailable at submission, the journal stays in AsyncStorage
 * and can be retried on next launch via retryPendingSubmission().
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const JOURNAL_KEY = "ranked_journal_v1";
const RUN_META_KEY = "ranked_run_meta_v1";
const PENDING_SUBMIT_KEY = "ranked_pending_submit_v1";

// In-memory flag — true when the player chose ranked mode for the current game.
// Survives navigation but resets on app restart (intentional).
let _rankedIntended = false;
export function setRankedIntended(v: boolean): void { _rankedIntended = v; }
export function isRankedIntended(): boolean { return _rankedIntended; }

// ── Types ─────────────────────────────────────────────────────────────────────

export type RankedEventType =
  | "crisis_choice"
  | "reform_launched"
  | "doctrine_set"
  | "military_op"
  | "game_over"
  | "mandate_end"
  | "building_upgrade_completed"   // bâtiment terminé — vérification durée minimale côté serveur
  | "research_completed"           // recherche terminée — contrôle durationDays minimal
  | "unit_training_completed"      // unités collectées — contrôle durée de formation
  | "resource_snapshot_periodic";  // snapshot 5 min — détecte accumulation impossible

export interface RunEvent {
  seq: number;
  event_type: RankedEventType;
  event_id: string;
  choice_id?: string;
  mandate_day: number;
  elapsed_ms: number;                                         // ms since run startedAt
  payload?: Record<string, number | string | boolean>;        // contexte structuré, aucune PII
}

interface RunMeta {
  runId: string;
  seed: string;
  startedAt: number;
}

interface PendingSubmit {
  runId: string;
  accessToken: string;
  events: RunEvent[];
  finalIndicators: FinalIndicators;
  mandateDays: number;
  deviceId?: string;
  appVersion?: string;
}

export interface FinalIndicators {
  popularity: number;
  economy: number;
  security: number;
  ecology: number;
  cohesion: number;
}

export interface SubmitResult {
  ok: boolean;
  score?: number;
  reason?: string;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

async function loadJournal(): Promise<RunEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    return raw ? (JSON.parse(raw) as RunEvent[]) : [];
  } catch {
    return [];
  }
}

async function appendEvent(event: RunEvent): Promise<void> {
  const journal = await loadJournal();
  journal.push(event);
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
}

async function loadMeta(): Promise<RunMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(RUN_META_KEY);
    return raw ? (JSON.parse(raw) as RunMeta) : null;
  } catch {
    return null;
  }
}

async function clearRun(): Promise<void> {
  await AsyncStorage.multiRemove([JOURNAL_KEY, RUN_META_KEY]);
}

// ── API helpers ───────────────────────────────────────────────────────────────

function supabaseUrl(path: string): string {
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/functions/v1${path}`;
}

function headers(accessToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
    "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Starts a ranked run on the server and saves the run metadata locally.
 * Must be called before the new game actually begins.
 */
export async function startRankedRun(
  accessToken: string,
  countryId: string,
  doctrine: string,
  displayName: string,
): Promise<{ runId: string; seed: string } | null> {
  try {
    const res = await fetch(supabaseUrl("/ranked-start"), {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({ countryId, doctrine, displayName }),
    });
    if (!res.ok) return null;

    const data = await res.json() as { runId: string; seed: string };
    const meta: RunMeta = { runId: data.runId, seed: data.seed, startedAt: Date.now() };
    await AsyncStorage.setItem(RUN_META_KEY, JSON.stringify(meta));
    await AsyncStorage.setItem(JOURNAL_KEY, "[]");
    return { runId: data.runId, seed: data.seed };
  } catch {
    return null;
  }
}

/**
 * Records one game event to the local journal.
 * No-op if there is no active ranked run.
 * payload : données structurées pour validation serveur — jamais de PII.
 */
export async function recordEvent(
  eventType: RankedEventType,
  eventId: string,
  mandateDay: number,
  choiceId?: string,
  payload?: Record<string, number | string | boolean>,
): Promise<void> {
  const meta = await loadMeta();
  if (!meta) return;

  const journal = await loadJournal();
  await appendEvent({
    seq: journal.length,
    event_type: eventType,
    event_id: eventId,
    choice_id: choiceId,
    mandate_day: mandateDay,
    elapsed_ms: Date.now() - meta.startedAt,
    ...(payload ? { payload } : {}),
  });
}

/**
 * Submits the full journal to the server at end of game.
 * On network failure, saves a pending submission for retry.
 */
export async function submitRankedRun(
  accessToken: string,
  finalIndicators: FinalIndicators,
  mandateDays: number,
): Promise<SubmitResult> {
  const meta = await loadMeta();
  if (!meta) return { ok: false, reason: "no-active-run" };

  const events = await loadJournal();
  const deviceId = await AsyncStorage.getItem("sync_device_id_v1").catch(() => null);
  const appVersion = (Constants.expoConfig?.version ?? "") as string;
  const payload = {
    runId: meta.runId, events, finalIndicators, mandateDays,
    ...(deviceId ? { deviceId } : {}),
    ...(appVersion ? { appVersion } : {}),
  };

  try {
    const res = await fetch(supabaseUrl("/ranked-submit"), {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify(payload),
    });
    const data = await res.json() as { ok?: boolean; score?: number; reason?: string; error?: string };

    if (res.ok && data.ok) {
      await clearRun();
      await AsyncStorage.removeItem(PENDING_SUBMIT_KEY);
      _rankedIntended = false;
      return { ok: true, score: data.score };
    }
    // Rejet définitif (run invalide ou déjà traitée) — nettoyer pour éviter les boucles
    if (res.status === 422 || res.status === 409) {
      await clearRun();
      _rankedIntended = false;
    }
    return { ok: false, reason: data.reason ?? data.error ?? "server-error" };
  } catch {
    // Save for retry on next launch
    const pending: PendingSubmit = { ...payload, accessToken };
    await AsyncStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify(pending));
    return { ok: false, reason: "network-unavailable" };
  }
}

/**
 * Retries a previously failed submission if one is stored.
 * Call this on app launch after auth is ready.
 */
export async function retryPendingSubmission(): Promise<SubmitResult | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SUBMIT_KEY);
    if (!raw) return null;

    const pending = JSON.parse(raw) as PendingSubmit;
    const res = await fetch(supabaseUrl("/ranked-submit"), {
      method: "POST",
      headers: headers(pending.accessToken),
      body: JSON.stringify({
        runId: pending.runId,
        events: pending.events,
        finalIndicators: pending.finalIndicators,
        mandateDays: pending.mandateDays,
        ...(pending.deviceId ? { deviceId: pending.deviceId } : {}),
        ...(pending.appVersion ? { appVersion: pending.appVersion } : {}),
      }),
    });
    const data = await res.json() as { ok?: boolean; score?: number; reason?: string };

    if (res.ok && data.ok) {
      await AsyncStorage.multiRemove([PENDING_SUBMIT_KEY, JOURNAL_KEY, RUN_META_KEY]);
      return { ok: true, score: data.score };
    }
    // If rejected by server, clear pending — no point retrying
    if (res.status === 422 || res.status === 409) {
      await AsyncStorage.removeItem(PENDING_SUBMIT_KEY);
    }
    return { ok: false, reason: data.reason ?? "server-error" };
  } catch {
    return null;
  }
}

/** Returns true if there is an active ranked run locally. */
export async function hasActiveRun(): Promise<boolean> {
  return (await loadMeta()) !== null;
}

/** Returns true if a submission is queued for retry (network was unavailable). */
export async function hasPendingSubmission(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SUBMIT_KEY);
    return raw !== null;
  } catch {
    return false;
  }
}

/** Abandons the current run locally without notifying the server. */
export async function abandonRun(): Promise<void> {
  await clearRun();
}

// ── Notes serveur : validation anti-triche (ranked-submit) ───────────────────
//
// Le serveur reçoit { runId, events: RunEvent[], finalIndicators, mandateDays,
// deviceId?, appVersion? }. Aucune validation définitive côté client.
// Toute run rejetée retourne HTTP 422 ; suspecte retourne 200 ok:true + flag
// "suspect:true" pour revue manuelle. Ne pas bannir automatiquement.
//
// 1. DURÉE MINIMALE PLAUSIBLE
//    elapsed_ms du dernier événement doit être ≥ mandateDays × REAL_MS_PER_GAME_DAY
//    (REAL_MS_PER_GAME_DAY = 6h = 21 600 000 ms côté serveur).
//    Tolérance : −20 % pour les dérives d'horloge mobile.
//    Seuil de rejet dur : elapsed_ms < mandateDays × 21_600_000 × 0.8
//
// 2. ACTIONS PAR MINUTE
//    Calculer nb_events / (elapsed_ms / 60_000).
//    Seuil d'alerte : > 3 events/min en moyenne sur plus de 10 min.
//    Seuil de rejet : > 8 events/min (impossible humainement).
//    Ne pas compter les "resource_snapshot_periodic" dans ce ratio.
//
// 3. PROGRESSION BÂTIMENTS IMPOSSIBLE
//    Pour chaque "building_upgrade_completed", lire payload.level et l'elapsed_ms.
//    Le niveau L d'un bâtiment a une upgradeDuration minimale connue côté serveur
//    (table UPGRADE_DURATIONS_SEC : [60,300,1200,3600,14400,28800,57600,115200,172800,259200] sec jeu).
//    Vérifier que l'écart en elapsed_ms entre le start et la completion de niveau L
//    est ≥ UPGRADE_DURATIONS_SEC[L-1] × (1000/240) × 0.85 (tolérance 15 %).
//    Si plusieurs niveaux max en moins de 10 min réelles → marquer suspect.
//
// 4. ACCUMULATION DE RESSOURCES INCOHÉRENTE
//    Comparer les snapshots "resource_snapshot_periodic" successifs.
//    Le gain max théorique entre deux snapshots (5 min = 300 000 ms) est :
//      max_money_per_min ≈ 250 (central_bank lvl 10 + economy_ministry lvl 10)
//      → gain_5min ≤ 250 × 5 = 1 250
//    Si money augmente de plus de 2× le maximum théorique entre deux snapshots
//    sans building_upgrade_completed ni crisis_choice dans l'intervalle → rejet.
//    Même logique pour influence, military, cyberDefense.
//
// 5. SÉQUENCE IMPOSSIBLE
//    "research_completed" sans "research_started" connu (non présent dans le journal
//    car launchStrategyResearch ne fait pas encore rankRecord — à ajouter si besoin).
//    "building_upgrade_completed" avec payload.level qui régresse → rejet.
//    mandate_day qui régresse entre deux événements consécutifs → rejet.
//
// 6. POLITIQUE DE TRAITEMENT
//    - Rejet dur (422) : durée impossible, actions/min > seuil dur, ressources × 10 max théorique.
//    - Marquage suspect (200 + suspect:true) : accumulation 2×, séquence atypique, device récidiviste.
//    - Ne pas bannir côté client. Le compte reste jouable en mode non classé.
//    - Conserver les runs suspectes 30 jours pour revue manuelle.
//    - Implémenter un rate-limit : max 1 soumission toutes les 23h par compte.

