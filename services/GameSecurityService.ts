/**
 * GameSecurityService — couche de sécurité pour les actions sensibles du jeu.
 *
 * Rôle actuel (client-only) :
 *   • Rate-limiting local : empêche les actions répétées trop vite
 *   • Déduplication : chaque action reçoit un actionId unique, évite le rejeu
 *   • Journalisation : toutes les anomalies sont loggées via securityLogger
 *
 * Rôle futur (avec backend) :
 *   • Envoyer l'action + actionId + sessionToken au serveur
 *   • Le serveur valide, calcule, sauvegarde et retourne l'état mis à jour
 *   • Le client n'applique l'effet que si le serveur confirme
 *
 * ─── PRINCIPE ARCHITECTURAL ───────────────────────────────────────────────────
 * Ce jeu est actuellement client-only (offline-first, un joueur).
 * Les achats sont validés par RevenueCat côté serveur.
 * Les autres états de jeu sont locaux — il n'y a pas de classement compétitif.
 *
 * La vraie protection "source de vérité serveur" n'a de sens que si tu ajoutes :
 *   - un compte utilisateur,
 *   - une sauvegarde cloud,
 *   - un classement mondial,
 *   - une économie réelle (ex: monnaie échangeable).
 *
 * En l'absence de ces éléments, la sécurité la plus utile est :
 *   1. Validation côté serveur des ACHATS (déjà fait via RevenueCat).
 *   2. Rate-limiting local + déduplication pour éviter les glitches (fait ici).
 *   3. App Integrity pour détecter les builds tampérées (AppIntegrityService).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ── POUR ALLER VERS UN VRAI BACKEND ──────────────────────────────────────────
 * 1. Brancher un système d'authentification (Supabase, Firebase Auth, etc.)
 * 2. Remplacer `_executeLocal()` par un appel `fetch(apiUrl("/api/game/action"), {...})`
 * 3. Le backend reçoit : { playerId, sessionToken, actionId, actionType, payload, timestamp }
 * 4. Le backend vérifie : anti-rejeu (actionId déjà vu ?), cohérence (ressources valides ?)
 * 5. Le backend retourne le nouvel état et le client le merge.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { securitySuspicious, securityBlocked, securityInfo } from "@/lib/securityLogger";

// ── Types ────────────────────────────────────────────────────────────────────

export type SensitiveActionType =
  | "purchase_pack"
  | "restore_purchases"
  | "start_new_game"
  | "apply_crisis_choice"
  | "apply_strategy_choice"
  | "unlock_building";

export interface SensitiveAction {
  type: SensitiveActionType;
  /** Payload non-typé — le backend devra valider. */
  payload?: Record<string, unknown>;
}

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
  /** Repeated too fast — caller should show a soft message, not crash. */
  rateLimited?: boolean;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

/** Délais minimum entre deux exécutions de la même action (ms). */
const RATE_LIMITS: Partial<Record<SensitiveActionType, number>> = {
  purchase_pack: 5_000,
  restore_purchases: 10_000,
  start_new_game: 2_000,
  apply_crisis_choice: 500,
  apply_strategy_choice: 500,
  unlock_building: 1_000,
};

const _lastActionTime = new Map<SensitiveActionType, number>();

function isRateLimited(type: SensitiveActionType): boolean {
  const limit = RATE_LIMITS[type];
  if (!limit) return false;
  const last = _lastActionTime.get(type) ?? 0;
  return Date.now() - last < limit;
}

function recordActionTime(type: SensitiveActionType): void {
  _lastActionTime.set(type, Date.now());
}

// ── Action ID (déduplication) ─────────────────────────────────────────────────

/** IDs des actions récentes — fenêtre glissante de 5 minutes. */
const _recentActionIds = new Map<string, number>();
const ACTION_ID_TTL_MS = 5 * 60 * 1_000;

function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isReplayedAction(actionId: string): boolean {
  const seen = _recentActionIds.get(actionId);
  if (seen) return true;
  // Purge les entrées expirées pour éviter une fuite mémoire.
  const now = Date.now();
  for (const [id, ts] of _recentActionIds.entries()) {
    if (now - ts > ACTION_ID_TTL_MS) _recentActionIds.delete(id);
  }
  _recentActionIds.set(actionId, now);
  return false;
}

// ── Dispatch principal ────────────────────────────────────────────────────────

/**
 * Exécute une action sensible avec les contrôles de sécurité.
 *
 * Usage :
 *   const result = await GameSecurityService.dispatch(
 *     { type: "purchase_pack", payload: { pack: "climate" } },
 *     () => purchasePack("climate"),   // ← fonction locale actuelle
 *   );
 *
 * Quand le backend est prêt, remplacer le callback local par un fetch().
 */
async function dispatch<T>(
  action: SensitiveAction,
  executeLocal: () => Promise<T>,
): Promise<ActionResult<T>> {
  const actionId = generateActionId();

  // Anti-rejeu (inutile en local mais prépare la structure backend)
  if (isReplayedAction(actionId)) {
    securityBlocked("GameSecurity", "Action dupliquée détectée", {
      actionId,
      type: action.type,
    });
    return { ok: false, error: "duplicate-action" };
  }

  // Rate limiting
  if (isRateLimited(action.type)) {
    securitySuspicious("GameSecurity", "Action trop rapide", {
      type: action.type,
    });
    return { ok: false, rateLimited: true, error: "rate-limited" };
  }

  recordActionTime(action.type);
  securityInfo("GameSecurity", `Action: ${action.type}`, { actionId });

  try {
    const data = await executeLocal();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export const GameSecurityService = { dispatch } as const;
