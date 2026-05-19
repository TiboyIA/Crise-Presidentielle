/**
 * OfflineQueue — file d'attente persistante pour les actions réseau non critiques.
 *
 * Principes :
 *  - Les tokens d'accès ne sont JAMAIS persistés. flushQueue() reçoit un token
 *    frais depuis AuthContext à chaque appel.
 *  - Idempotence : un item avec le même `id` ne peut exister qu'une fois dans la
 *    file (sauf si l'ancien est déjà "success" ou "failed").
 *  - Backoff exponentiel : 10 s → 20 s → 40 s → 80 s → 300 s (plafond).
 *  - Abandon après MAX_ATTEMPTS tentatives → statut "failed".
 *  - Nettoyage : pruneQueue() supprime les items résolus de plus de 7 jours.
 *  - Jamais de throw vers l'appelant — toutes les erreurs sont absorbées.
 *
 * Actions supportées :
 *  - alliance_invite   ← migré (player-profile.tsx)
 *  - cloud_save_upload ← réservé (SyncService gère encore son propre pending)
 *  - ranked_submit     ← réservé (RankedService gère encore son propre pending)
 *  - spy_launch        ← réservé
 *  - cyber_launch      ← réservé
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY     = "offline_queue_v1";
const MAX_ATTEMPTS  = 5;
const PRUNE_AGE_MS  = 7 * 24 * 60 * 60 * 1000; // 7 jours

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueueStatus = "queued" | "sending" | "success" | "failed" | "retrying";

export type QueueActionType =
  | "alliance_invite"
  | "cloud_save_upload"
  | "ranked_submit"
  | "spy_launch"
  | "cyber_launch";

export interface QueueItem {
  /** Clé d'idempotence — unique par intention métier (ex. `alliance_invite:userId`). */
  id: string;
  type: QueueActionType;
  /** Données de l'action. Jamais de token d'accès. */
  payload: Record<string, unknown>;
  status: QueueStatus;
  attemptCount: number;
  /** Timestamp (ms) à partir duquel une nouvelle tentative est autorisée. 0 = immédiat. */
  nextRetryAt: number;
  enqueuedAt: number;
  lastError?: string;
}

// ── Backoff ───────────────────────────────────────────────────────────────────

function backoffMs(attempt: number): number {
  // 10 s, 20 s, 40 s, 80 s, 300 s
  return Math.min(10_000 * Math.pow(2, attempt), 300_000);
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function loadQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(items: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch { /* noop — ne jamais bloquer l'appelant */ }
}

// ── Exécuteurs inline ─────────────────────────────────────────────────────────
// Les appels HTTP sont définis ici pour éviter les imports circulaires avec les
// services. Les URLs et clés reprennent les mêmes variables d'env que les services.

function efUrl(path: string): string {
  return `${(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/functions/v1${path}`;
}

function buildHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

async function executeItem(
  item: QueueItem,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  switch (item.type) {

    case "alliance_invite": {
      try {
        const res = await fetch(efUrl("/alliance-invite"), {
          method: "POST",
          headers: buildHeaders(accessToken),
          body: JSON.stringify({ targetPlayerId: item.payload.targetPlayerId }),
        });
        const data = await res.json() as { ok?: boolean; error?: string };
        // 409 / 422 = rejet définitif (cooldown, quota) — ne pas retenter
        if (res.status === 409 || res.status === 422) {
          return { ok: false, error: data.error ?? "rejected" };
        }
        return res.ok && data.ok ? { ok: true } : { ok: false, error: data.error ?? "server-error" };
      } catch {
        return { ok: false, error: "network-unavailable" };
      }
    }

    // Réservés — pas encore migrés. On les marque success pour ne pas bloquer la file.
    case "cloud_save_upload":
    case "ranked_submit":
    case "spy_launch":
    case "cyber_launch":
      return { ok: true };

    default:
      return { ok: false, error: "unknown-type" };
  }
}

// ── Rejet définitif ───────────────────────────────────────────────────────────
// Certaines erreurs serveur indiquent que retenter est inutile.

function isDefinitiveRejection(error: string | undefined): boolean {
  return error === "rejected" || error === "unknown-type";
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Ajoute une action à la file.
 * Idempotent : si un item avec le même `id` est déjà actif (ni success ni failed),
 * l'appel est ignoré silencieusement.
 */
export async function enqueue(
  item: Omit<QueueItem, "status" | "attemptCount" | "nextRetryAt" | "enqueuedAt">,
): Promise<void> {
  const queue = await loadQueue();
  const active = queue.some(
    (q) => q.id === item.id && q.status !== "success" && q.status !== "failed",
  );
  if (active) return;

  await saveQueue([
    ...queue,
    { ...item, status: "queued", attemptCount: 0, nextRetryAt: 0, enqueuedAt: Date.now() },
  ]);
}

/**
 * Tente d'envoyer tous les items en attente dont la fenêtre de retry est passée.
 * Appeler après l'initialisation de l'auth (auth ready) et sur restauration réseau.
 * Ne throw jamais.
 */
export async function flushQueue(accessToken: string): Promise<void> {
  const queue = await loadQueue();
  const now = Date.now();

  const updated = await Promise.all(
    queue.map(async (item): Promise<QueueItem> => {
      if (item.status === "success" || item.status === "failed") return item;
      if (item.nextRetryAt > now) return item;

      const result = await executeItem(item, accessToken);

      if (result.ok) {
        return { ...item, status: "success", lastError: undefined };
      }

      const nextAttempt = item.attemptCount + 1;
      if (nextAttempt >= MAX_ATTEMPTS || isDefinitiveRejection(result.error)) {
        return { ...item, status: "failed", attemptCount: nextAttempt, lastError: result.error };
      }

      return {
        ...item,
        status:       "retrying",
        attemptCount: nextAttempt,
        nextRetryAt:  now + backoffMs(nextAttempt),
        lastError:    result.error,
      };
    }),
  );

  await saveQueue(updated);
}

/**
 * Retourne un snapshot de la file (debug / indicateur UI offline).
 */
export async function getQueueSnapshot(): Promise<QueueItem[]> {
  return loadQueue();
}

/**
 * Supprime les items résolus (success / failed) de plus de 7 jours.
 * Appeler en arrière-plan au lancement, après flushQueue().
 */
export async function pruneQueue(): Promise<void> {
  const queue = await loadQueue();
  const cutoff = Date.now() - PRUNE_AGE_MS;
  const kept = queue.filter(
    (item) =>
      (item.status !== "success" && item.status !== "failed") ||
      item.enqueuedAt > cutoff,
  );
  if (kept.length !== queue.length) await saveQueue(kept);
}

// ── Helpers typés (points d'appel préférés) ───────────────────────────────────

/**
 * Met en file une invitation d'alliance.
 * La clé d'idempotence empêche l'envoi de deux invitations au même joueur.
 *
 * Retourne "sent" si l'envoi immédiat a réussi, "queued" si le réseau est indisponible.
 */
export async function enqueueAllianceInvite(
  targetPlayerId: string,
  accessToken: string,
): Promise<"sent" | "queued" | "failed"> {
  const id = `alliance_invite:${targetPlayerId}`;
  await enqueue({ id, type: "alliance_invite", payload: { targetPlayerId } });
  await flushQueue(accessToken);

  const snapshot = await getQueueSnapshot();
  const item = snapshot.find((q) => q.id === id);

  if (!item || item.status === "success") return "sent";
  if (item.status === "failed")           return "failed";
  return "queued"; // retrying ou queued = sera envoyé au prochain flush
}
