/**
 * validators.ts — Validation runtime des données externes.
 *
 * Règles :
 *  - Chaque validateur retourne la valeur typée ou null (jamais de throw).
 *  - Un item invalide dans un tableau → filtré, pas crash.
 *  - devWarn() loggue en DEV uniquement — silencieux en production.
 *  - Pas de dépendance externe : TypeScript pur.
 *
 * Couverture :
 *  - Alliance            (réponse serveur alliances)
 *  - SpyOp              (réponse serveur espionnage)
 *  - CyberOp            (réponse serveur cyber)
 *  - LeaderboardEntry   (classement global)
 *  - CloudSave          (sauvegarde cloud)
 *  - NewsEvent          (événements statiques — garde de forme)
 *  - StrategyGameState  (forme minimale — la profondeur est gérée par migrateSave)
 */

import type { NewsEvent, NewsType, NewsUrgency } from "@/types/strategy";
import type { AllianceStatus } from "@/services/AllianceService";
import type { SpyOpType, SpyOpStatus } from "@/services/SpyService";
import type { CyberOpStatus } from "@/services/CyberService";
import type { CloudSave } from "@/services/SyncService";

// ── Primitives ────────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

function isBool(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isOneOf<T extends string>(v: unknown, allowed: readonly T[]): v is T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v);
}

// ── Dev logging ───────────────────────────────────────────────────────────────

function devWarn(label: string, reason: string, value?: unknown): void {
  if (__DEV__) {
    console.warn(`[validator] ${label}: ${reason}`, value ?? "");
  }
}

// ── Alliance ──────────────────────────────────────────────────────────────────

const ALLIANCE_STATUSES: readonly AllianceStatus[] = ["pending", "active", "rejected", "broken"];

export function validateAlliance(raw: unknown): import("@/services/AllianceService").Alliance | null {
  if (!isObj(raw)) { devWarn("Alliance", "not an object", raw); return null; }
  if (!isNonEmptyStr(raw.id))           { devWarn("Alliance", "id invalid", raw.id); return null; }
  if (!isOneOf(raw.status, ALLIANCE_STATUSES)) { devWarn("Alliance", "status invalid", raw.status); return null; }
  if (!isNonEmptyStr(raw.partner_id))   { devWarn("Alliance", "partner_id invalid"); return null; }
  if (!isNonEmptyStr(raw.partner_name)) { devWarn("Alliance", "partner_name invalid"); return null; }
  if (!isNonEmptyStr(raw.created_at))   { devWarn("Alliance", "created_at invalid"); return null; }
  if (!isBool(raw.is_initiator))        { devWarn("Alliance", "is_initiator invalid"); return null; }

  return {
    id:           raw.id,
    status:       raw.status as AllianceStatus,
    created_at:   raw.created_at,
    expires_at:   isStr(raw.expires_at) ? raw.expires_at : null,
    is_initiator: raw.is_initiator,
    partner_id:   raw.partner_id,
    partner_name: raw.partner_name,
  };
}

// ── SpyOp ─────────────────────────────────────────────────────────────────────

const SPY_OP_TYPES: readonly SpyOpType[] = ["intel_probe", "doctrine_scan", "score_range"];
const SPY_OP_STATUSES: readonly SpyOpStatus[] = ["pending", "resolved", "blocked"];

export function validateSpyOp(raw: unknown): import("@/services/SpyService").SpyOp | null {
  if (!isObj(raw)) { devWarn("SpyOp", "not an object"); return null; }
  if (!isNonEmptyStr(raw.id))                      { devWarn("SpyOp", "id invalid"); return null; }
  if (!isOneOf(raw.op_type, SPY_OP_TYPES))         { devWarn("SpyOp", "op_type invalid", raw.op_type); return null; }
  if (!isOneOf(raw.status, SPY_OP_STATUSES))       { devWarn("SpyOp", "status invalid", raw.status); return null; }
  if (!isNonEmptyStr(raw.created_at))              { devWarn("SpyOp", "created_at invalid"); return null; }
  if (!isNonEmptyStr(raw.resolves_at))             { devWarn("SpyOp", "resolves_at invalid"); return null; }

  return {
    id:          raw.id,
    op_type:     raw.op_type as SpyOpType,
    status:      raw.status as SpyOpStatus,
    created_at:  raw.created_at,
    resolves_at: raw.resolves_at,
    result_json: isObj(raw.result_json) ? (raw.result_json as any) : null,
  };
}

// ── CyberOp ───────────────────────────────────────────────────────────────────

const CYBER_OP_STATUSES: readonly CyberOpStatus[] = ["pending", "resolved", "blocked"];

export function validateCyberOp(raw: unknown): import("@/services/CyberService").CyberOp | null {
  if (!isObj(raw)) { devWarn("CyberOp", "not an object"); return null; }
  if (!isNonEmptyStr(raw.id))                       { devWarn("CyberOp", "id invalid"); return null; }
  if (!isNonEmptyStr(raw.attacker_id))              { devWarn("CyberOp", "attacker_id invalid"); return null; }
  if (!isNonEmptyStr(raw.target_id))                { devWarn("CyberOp", "target_id invalid"); return null; }
  if (!isOneOf(raw.status, CYBER_OP_STATUSES))      { devWarn("CyberOp", "status invalid", raw.status); return null; }
  if (!isNum(raw.magnitude))                        { devWarn("CyberOp", "magnitude invalid"); return null; }
  if (!isNonEmptyStr(raw.created_at))               { devWarn("CyberOp", "created_at invalid"); return null; }
  if (!isNonEmptyStr(raw.resolves_at))              { devWarn("CyberOp", "resolves_at invalid"); return null; }

  return {
    id:             raw.id,
    attacker_id:    raw.attacker_id,
    target_id:      raw.target_id,
    status:         raw.status as CyberOpStatus,
    magnitude:      raw.magnitude,
    created_at:     raw.created_at,
    resolves_at:    raw.resolves_at,
    target_name:    isStr(raw.target_name) ? raw.target_name : undefined,
    attacker_name:  isStr(raw.attacker_name) ? raw.attacker_name : undefined,
  };
}

// ── LeaderboardEntry ──────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  display_name: string;
  country_id: string;
  doctrine: string;
  score: number;
  mandate_days: number;
  created_at: string;
  season: number;
  rank_title: string;
  global_power: number;
}

export function validateLeaderboardEntry(raw: unknown): LeaderboardEntry | null {
  if (!isObj(raw)) { devWarn("LeaderboardEntry", "not an object"); return null; }
  if (!isNonEmptyStr(raw.id))           { devWarn("LeaderboardEntry", "id invalid"); return null; }
  if (!isNonEmptyStr(raw.player_id))    { devWarn("LeaderboardEntry", "player_id invalid"); return null; }
  if (!isNonEmptyStr(raw.display_name)) { devWarn("LeaderboardEntry", "display_name invalid"); return null; }
  if (!isNonEmptyStr(raw.country_id))   { devWarn("LeaderboardEntry", "country_id invalid"); return null; }
  if (!isStr(raw.doctrine))             { devWarn("LeaderboardEntry", "doctrine invalid"); return null; }
  if (!isNum(raw.score))                { devWarn("LeaderboardEntry", "score invalid"); return null; }
  if (!isNum(raw.mandate_days))         { devWarn("LeaderboardEntry", "mandate_days invalid"); return null; }
  if (!isNonEmptyStr(raw.created_at))   { devWarn("LeaderboardEntry", "created_at invalid"); return null; }
  if (!isNum(raw.season))               { devWarn("LeaderboardEntry", "season invalid"); return null; }
  if (!isStr(raw.rank_title))           { devWarn("LeaderboardEntry", "rank_title invalid"); return null; }
  if (!isNum(raw.global_power))         { devWarn("LeaderboardEntry", "global_power invalid"); return null; }

  return {
    id:           raw.id,
    player_id:    raw.player_id,
    display_name: raw.display_name,
    country_id:   raw.country_id,
    doctrine:     raw.doctrine,
    score:        raw.score,
    mandate_days: raw.mandate_days,
    created_at:   raw.created_at,
    season:       raw.season,
    rank_title:   raw.rank_title,
    global_power: raw.global_power,
  };
}

// ── CloudSave ─────────────────────────────────────────────────────────────────

export function validateCloudSave(raw: unknown): CloudSave | null {
  if (!isObj(raw)) { devWarn("CloudSave", "not an object"); return null; }
  if (!isObj(raw.save) && !Array.isArray(raw.save)) {
    devWarn("CloudSave", "save field is not an object", raw.save);
    return null;
  }
  const saveVersion = isNum(raw.saveVersion) ? raw.saveVersion : 1;
  const savedAt = isStr(raw.savedAt) ? raw.savedAt : "";

  return { save: raw.save, saveVersion, savedAt };
}

// ── NewsEvent ─────────────────────────────────────────────────────────────────

const NEWS_TYPES: readonly NewsType[] = [
  "national", "economie", "social", "cyber", "diplomatie", "guerre_hybride", "monde", "classement",
];
const NEWS_URGENCIES: readonly NewsUrgency[] = ["faible", "moyenne", "forte", "critique"];

export function validateNewsEvent(raw: unknown): NewsEvent | null {
  if (!isObj(raw)) { devWarn("NewsEvent", "not an object"); return null; }
  if (!isNonEmptyStr(raw.id))                    { devWarn("NewsEvent", "id invalid"); return null; }
  if (!isNonEmptyStr(raw.title))                 { devWarn("NewsEvent", "title invalid"); return null; }
  if (!isNonEmptyStr(raw.source))                { devWarn("NewsEvent", "source invalid"); return null; }
  if (!isOneOf(raw.type, NEWS_TYPES))            { devWarn("NewsEvent", "type invalid", raw.type); return null; }
  if (!isOneOf(raw.urgency, NEWS_URGENCIES))     { devWarn("NewsEvent", "urgency invalid", raw.urgency); return null; }
  if (!isNonEmptyStr(raw.description))           { devWarn("NewsEvent", "description invalid"); return null; }
  if (!isBool(raw.isInteractive))                { devWarn("NewsEvent", "isInteractive invalid"); return null; }

  return raw as unknown as NewsEvent;
}

// ── StrategyGameState — forme minimale ────────────────────────────────────────
// La validation profonde est gérée par migrateSave(). Ce garde vérifie
// uniquement que les champs critiques existent avant le fast-path de chargement.

export function isValidStrategyGameState(raw: unknown): boolean {
  if (!isObj(raw)) return false;
  if (!isNum(raw.version))                       return false;
  if (!isNonEmptyStr(raw.playerName))            return false;
  if (!isObj(raw.resources))                     return false;
  if (!Array.isArray(raw.buildings))             return false;
  if (!Array.isArray(raw.relations))             return false;
  if (!isObj(raw.nationalIndicators))            return false;
  if (!isNum((raw.nationalIndicators as any).popularity)) return false;
  if (!isNum(raw.mandateDay))                    return false;
  return true;
}

// ── Utilitaire tableau ────────────────────────────────────────────────────────

/**
 * Filtre un tableau en gardant uniquement les items valides selon le validateur.
 * Les items rejetés sont loggués en DEV.
 */
export function filterValid<T>(
  items: unknown[],
  validator: (item: unknown) => T | null,
): T[] {
  const result: T[] = [];
  for (const item of items) {
    const validated = validator(item);
    if (validated !== null) result.push(validated);
  }
  return result;
}

/**
 * Parse un JSON de façon défensive.
 * Retourne null si le JSON est malformé ou si le résultat n'est pas un objet.
 */
export function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (!isObj(parsed)) {
      devWarn("safeJsonParse", "parsed value is not an object");
      return null;
    }
    return parsed;
  } catch {
    devWarn("safeJsonParse", "malformed JSON");
    return null;
  }
}
