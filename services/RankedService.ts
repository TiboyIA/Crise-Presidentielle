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
  | "building_upgrade_started"     // horodatage de démarrage — pairing avec completed côté serveur
  | "building_upgrade_completed"   // bâtiment terminé — durée = elapsed_ms delta avec started
  | "research_started"             // horodatage de démarrage de recherche
  | "research_completed"           // recherche terminée — contrôle durationDays minimal
  | "unit_training_started"        // horodatage de démarrage de formation
  | "unit_training_completed"      // unités collectées — durée = elapsed_ms delta avec started
  | "resource_snapshot_periodic"   // snapshot 5 min — détecte accumulation impossible
  | "operation_result"             // résultat enrichi avec coûts/gains — cohérence ressources
  | "ranked_score_hint";           // résumé vérifiable juste avant soumission

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
  // accessToken intentionally omitted — never persist JWTs in AsyncStorage.
  // retryPendingSubmission() receives a fresh token from AuthContext on launch.
  events: RunEvent[];
  finalIndicators: FinalIndicators;
  mandateDays: number;
  journalHash: string;
  deviceId?: string;
  appVersion?: string;
}

export interface FinalIndicators {
  popularity:    number; // 0–100
  economy:       number; // 0–100
  security:      number; // 0–100
  ecology:       number; // 0–100
  cohesion:      number; // 0–100
  globalPower:   number; // 0–∞  — ajouté pour la formule de score robuste
  rankingPoints: number; // 0–∞  — cross-validation avec progression en jeu
  publicBudget:  number; // −150–100 — pénalise les mandats en déficit
}

export interface SubmitResult {
  ok: boolean;
  score?: number;
  reason?: string;
}

// ── Journal integrity hash (djb2, non-cryptographique) ────────────────────────
// Détecte la corruption accidentelle du journal local (écriture AsyncStorage
// incomplète, parse JSON tronqué). Le serveur recompute le même hash.
// Non secret : ne prouve pas l'authenticité des données, ne remplace pas
// les contrôles serveur. Ne pas l'exposer dans l'UI ni l'interpréter côté client.

function hashJournal(events: RunEvent[]): string {
  const str = JSON.stringify(events);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(16).padStart(8, "0");
}

// ── Storage helpers ───────────────────────────────────────────────────────────

async function loadJournal(): Promise<RunEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(JOURNAL_KEY);
      return [];
    }
    return parsed as RunEvent[];
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
  const journalHash = hashJournal(events);
  const deviceId = await AsyncStorage.getItem("sync_device_id_v1").catch(() => null);
  const appVersion = (Constants.expoConfig?.version ?? "") as string;
  const payload = {
    runId: meta.runId, events, finalIndicators, mandateDays,
    journalHash,
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
    // Save for retry on next launch — accessToken intentionally excluded.
    const pending: PendingSubmit = { ...payload };
    await AsyncStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify(pending));
    return { ok: false, reason: "network-unavailable" };
  }
}

/**
 * Retries a previously failed submission if one is stored.
 * Call this on app launch after auth is ready, passing a fresh access token.
 */
export async function retryPendingSubmission(accessToken: string): Promise<SubmitResult | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SUBMIT_KEY);
    if (!raw) return null;

    const pending = JSON.parse(raw) as PendingSubmit;
    if (!pending.runId || !Array.isArray(pending.events)) {
      await AsyncStorage.removeItem(PENDING_SUBMIT_KEY);
      return null;
    }

    const res = await fetch(supabaseUrl("/ranked-submit"), {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        runId: pending.runId,
        events: pending.events,
        finalIndicators: pending.finalIndicators,
        mandateDays: pending.mandateDays,
        journalHash: pending.journalHash,
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

// ── Notes serveur V2 : validation anti-triche (ranked-submit) ────────────────
//
// Payload reçu : { runId, events, finalIndicators, mandateDays,
//                  journalHash, deviceId?, appVersion? }
//
// Aucune validation définitive côté client.
// Rejet dur → HTTP 422 ; suspect → 200 ok:true + suspect:true (revue manuelle).
// Ne pas bannir automatiquement. Le compte reste jouable en mode non classé.
//
// ── ÉVÉNEMENTS ET PAYLOADS ───────────────────────────────────────────────────
//
//  building_upgrade_started    event_id = buildingId
//    payload { targetLevel: number }
//    → enregistré à l'instant du clic. Utilisé pour calculer la durée réelle
//      par différence elapsed_ms avec building_upgrade_completed.
//
//  building_upgrade_completed  event_id = buildingId
//    payload { level: number, durationRealMs: number }
//    → DURÉE SERVEUR = completed.elapsed_ms − started.elapsed_ms (plus fiable)
//    → durationRealMs est un champ secondaire, utilisé si started manquant
//    → UPGRADE_DURATIONS_REAL_MS[L] = UPGRADE_DURATIONS_GAME_MIN[L] × 15000
//    → UPGRADE_DURATIONS_GAME_MIN = [60,300,1200,3600,14400,28800,57600,115200,172800,259200]
//    → durée minimale = UPGRADE_DURATIONS_REAL_MS[targetLevel-1] × 0.85
//    → régression de niveau (completed.level < précédent même bâtiment) → rejet
//
//  research_started            event_id = researchId
//    payload { durationDays: number }
//    → enregistré au moment du lancement, avant que la file commence.
//
//  research_completed          event_id = researchId
//    payload { durationDays: number }
//    → durationDays = completesAtDay − startedAtDay
//    → rejet si durationDays < 1 ou > 60
//    → max 15 research_completed (borne théorique)
//    → DURÉE SERVEUR = mandate_day_completed − mandate_day_started (via events)
//
//  unit_training_started       event_id = unitId
//    payload { quantity: number, durationGameHours: number }
//    → enregistré à l'instant du lancement.
//
//  unit_training_completed     event_id = unitId
//    payload { quantity: number, durationGameHours: number }
//    → DURÉE SERVEUR = completed.elapsed_ms − started.elapsed_ms
//    → 1 game hour = 15 real min = 900 000 ms réels
//    → rejet si elapsed_ms delta < durationGameHours × 900 000 × 0.85
//    → rejet si durationGameHours < 0.1
//
//  operation_result            event_id = operationType
//    payload { success: boolean, moneySpent: number, influenceSpent: number, rankingGained: number }
//    → enregistré à chaque opération (complète military_op)
//    → cohérence ressources : somme des moneySpent doit être ≤ resources initiales +
//      revenus estimés (snapshots) + récompenses missions visibles
//    → rankingGained doit correspondre aux tables du jeu (serveur connaît OPERATIONS)
//
//  military_op                 event_id = operationType
//    payload { success: boolean }
//    → maintenu pour rétrocompatibilité avec runs soumises avant V2
//    → taux de succès global : if ops ≥ 5 and successRate > 0.95 → suspect
//
//  resource_snapshot_periodic  event_id = "snapshot"
//    payload { money, influence, military, cyberDefense, power, rankingPoints }
//    → snapshot toutes les 5 min réelles — détecte accumulation impossible
//    → maxima théoriques par 5 min (bâtiments tous niveau max) :
//        money ≤ 1 250 · influence ≤ 400 · military ≤ 600 · cyberDefense ≤ 400
//    → seuil suspect : gain entre 2 snapshots > 2× max théorique sans event justificatif
//    → seuil rejet   : gain > 10× max théorique
//    → rankingPoints ne doit jamais décroître entre snapshots (sauf event mandate_end)
//
//  crisis_choice               choice_id = choiceId  — comptage + cohérence narrative
//  reform_launched             event_id = reformId   — comptage seul
//  doctrine_set                event_id = doctrineId — comptage seul
//  mandate_end                 event_id = "mandate_end" — comptage seul
//  game_over                   event_id = "game_over"  — terminal
//  ranked_score_hint           event_id = "score_hint"
//    payload = { rankingPoints, globalPower, mandateDay, ... }
//    → croiser avec finalIndicators ; écart > 20 pts → suspect
//
// ── CONTRÔLES ANTI-TRICHE V2 ─────────────────────────────────────────────────
//
// 1. HASH D'INTÉGRITÉ DU JOURNAL
//    Le serveur recompute hashJournal(events) (djb2 identique) et compare avec
//    journalHash reçu. Mismatch → flag "journal-hash-mismatch" (pas rejet :
//    le hash n'est pas une preuve de sécurité, juste de corruption).
//
// 2. DURÉE MINIMALE PLAUSIBLE (impossible_timing)
//    elapsed_ms du dernier événement ≥ mandateDays × 21_600_000 × 0.8
//    (1 mandate day = 6h réelles = 21 600 000 ms).
//    Rejet dur si durée réelle est physiquement impossible.
//
// 3. PAIRING STARTED / COMPLETED (impossible_timing · invalid_event_sequence)
//    Pour chaque *_completed : rechercher le *_started correspondant (même event_id).
//    Vérifier : completed.elapsed_ms − started.elapsed_ms ≥ durée_min × 0.85.
//    Incohérence de niveau entre started.targetLevel et completed.level → rejet.
//    Absence de started pour un completed → flag suspect (vieux client, pas rejet).
//    Plus de 3 completed sans started → suspect.
//
// 4. ACTIONS PAR MINUTE / APM (impossible_timing)
//    nb_events_actifs / (elapsed_ms / 60 000) — exclure resource_snapshot_periodic.
//    Alerte : > 3 events/min sur > 10 min → flag.
//    Rejet   : > 8 events/min (impossible humainement) → 422.
//
// 5. COHÉRENCE RESSOURCES / COÛTS (impossible_resources)
//    Reconstituer les dépenses via operation_result.moneySpent + coûts connus
//    des reforms/doctrines/unités. Comparer avec revenus estimés par snapshots.
//    Si ressources initiales + revenus − dépenses < −5 % de la valeur simulée → suspect.
//    Si écart > −30 % (ressources impossiblement négatives) → rejet.
//
// 6. PROGRESSION BÂTIMENTS (impossible_timing · invalid_event_sequence)
//    Régression : level[n] < level[n-1] même bâtiment → rejet.
//    Plusieurs upgrades au niveau max en < 10 min réelles → suspect.
//    Nombre d'upgrades par bâtiment > maxLevel (défini dans data/buildings) → rejet.
//
// 7. RECHERCHES (impossible_timing)
//    research_completed.durationDays < 1 → rejet.
//    Plus de 15 research_completed → rejet.
//    DURÉE MANDATE : mandate_day_completed − mandate_day_started (via events) < 1 → rejet.
//
// 8. OPÉRATIONS MILITAIRES (impossible_resources)
//    Taux de succès > 95 % sur ≥ 5 ops → suspect (formule plafonne à ≈ 90 %).
//    moneySpent < 0 ou > 10× coût théorique → rejet.
//
// 9. SÉQUENCE IMPOSSIBLE (invalid_event_sequence)
//    mandate_day régresse entre deux événements consécutifs → rejet.
//    ranked_score_hint absent ou écart > 20 pts avec finalIndicators → flag.
//    events.seq non continu → rejet.
//
// 10. VERSION INCONNUE (unknown_app_version)
//    appVersion absente ou < MIN_APP_VERSION env var → flag.
//    Si MIN_APP_VERSION configuré et appVersion trop ancienne → rejet (403).
//
// 11. SOUMISSION DUPLIQUÉE (duplicate_submit)
//    Run déjà au statut "validated" ou "rejected" → 409.
//    Joueur ayant soumis une run validée dans les 23h → 429.
//
// ── SCORE DE CONFIANCE ───────────────────────────────────────────────────────
//
//   confiance -= 30  si durée totale impossible                  (→ rejet direct)
//   confiance -= 20  si APM > 3/min sur > 10 min
//   confiance -= 20  si accumulation ressource > 2× max théorique / 5 min
//   confiance -= 15  si timing upgrade/training impossible (elapsed delta)
//   confiance -= 10  si taux succès ops > 95 % (≥ 5 ops)
//   confiance -= 10  si ranked_score_hint absent ou incohérent (écart > 20 pts)
//   confiance -= 10  si cohérence ressources < −30 %
//   confiance -= 5   si device marqué suspect dans les 30 derniers jours
//   confiance -= 5   si journalHash mismatch
//   confiance -= 5   si > 3 completed sans started correspondant
//
// Politique :
//   confiance ≥ 80 → run acceptée
//   confiance 50–79 → acceptée + suspect:true pour revue manuelle (30 jours)
//   confiance < 50 → rejetée (422)
//
// ── POLITIQUE DE TRAITEMENT ──────────────────────────────────────────────────
//   Rejet dur (422) : impossible_timing, APM > 8/min, impossible_resources,
//                     invalid_event_sequence, confiance < 50.
//   Marquage suspect (200 + suspect:true) : confiance 50–79.
//   Ne pas bannir côté client.
//   Rate-limit : max 1 run validée par account / 23h.
//   Rate-limit device : max 3 comptes différents / device / 24h.

