import type { GameState, WarState } from "@/types/game";
import {
  WAR_LOOP_EVENT_IDS,
  WAR_CHOICE_DELTAS,
  WAR_EVENTS_BY_ID,
  type WarMetricKey,
} from "@/data/warEvents";

/**
 * Module 6C — Moteur du mini-jeu de guerre conventionnelle.
 *
 * Pipeline :
 *   1. ULTIMATUM (event ev_ultimatum) → 3 choix possibles.
 *      - "a" capituler  : pas d'entrée en guerre, game over diplo immédiat.
 *      - "b" négocier   : pas d'entrée en guerre, status reste "peace"
 *                         mais aggression baisse fortement.
 *      - "c" mobiliser  : `startWar(state)` → entrée en guerre.
 *   2. GUERRE (status="war") : à chaque tour, le tirage d'event est
 *      DIRIGÉ : on tire un `WAR_LOOP_EVENT_IDS` plutôt qu'un event
 *      normal. Drift passif des 3 mini-jauges. `tickWar()` avance
 *      `warTurn` et applique le drift.
 *   3. VERDICT (warTurn >= maxWarTurns OU forfait par "ev_war_truce_offer"
 *      "a") : `judgeWar(state)` calcule l'outcome et termine la guerre.
 *
 * 100% pur, déterministe, aucun appel à l'IA.
 */

const DEFAULT_MOBILIZATION = 50;
const DEFAULT_ALLIES = 40;
const DEFAULT_SUPPLY = 50;
const DEFAULT_MAX_WAR_TURNS = 4;

function clamp(x: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, x));
}

// ─── Création / fin de l'état de guerre ────────────────────────────

export function createWarStateForUltimatum(turn: number): WarState {
  return {
    status: "ultimatum",
    ultimatumTurn: turn,
    warTurn: 0,
    maxWarTurns: DEFAULT_MAX_WAR_TURNS,
    mobilization: DEFAULT_MOBILIZATION,
    allies: DEFAULT_ALLIES,
    supply: DEFAULT_SUPPLY,
    outcome: null,
  };
}

export function startWar(prev: WarState): WarState {
  return {
    ...prev,
    status: "war",
    warTurn: 0,
  };
}

// ─── Tick passif pendant la guerre ─────────────────────────────────
//
// Avancée d'1 tour de guerre, drift passif modéré : la guerre coûte
// (ravitaillement -2, mobilisation -1, alliés -1) si le joueur ne
// fait rien pour compenser. Le joueur agit via les choix
// d'événements de guerre qui appliquent leurs propres deltas.

export function tickWar(prev: WarState): WarState {
  if (prev.status !== "war") return prev;
  return {
    ...prev,
    warTurn: prev.warTurn + 1,
    mobilization: clamp(prev.mobilization - 1),
    allies: clamp(prev.allies - 1),
    supply: clamp(prev.supply - 2),
  };
}

// ─── Application d'un choix d'event de guerre ──────────────────────

export function applyWarChoiceDeltas(
  prev: WarState,
  eventId: string,
  choiceId: string,
): WarState {
  if (prev.status !== "war" && prev.status !== "ultimatum") return prev;
  const deltas = WAR_CHOICE_DELTAS[`${eventId}#${choiceId}`];
  if (!deltas) return prev;
  return {
    ...prev,
    mobilization: clamp(prev.mobilization + (deltas.mobilization ?? 0)),
    allies: clamp(prev.allies + (deltas.allies ?? 0)),
    supply: clamp(prev.supply + (deltas.supply ?? 0)),
  };
}

// ─── Tirage d'un event de guerre ───────────────────────────────────
//
// Pendant la guerre, le moteur principal délègue le tirage à cette
// fonction. Tirage déterministe sur (warTurn, ultimatumTurn) pour
// éviter les rejouabilités triviales sans pénaliser le rejeu.

function hashSeed(a: number, b: number, salt: string): number {
  let h = a * 73856093 + b * 19349663;
  for (let i = 0; i < salt.length; i++) h = ((h << 5) - h + salt.charCodeAt(i)) | 0;
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWarEvent(
  ws: WarState,
  seenEventIds: string[],
): string | null {
  // Au dernier tour de guerre, on force l'offre de trêve si on ne
  // l'a pas encore vue, pour donner au joueur la possibilité de
  // sortir par une décision et pas par un verdict aveugle.
  if (
    ws.warTurn >= ws.maxWarTurns - 1 &&
    !seenEventIds.includes("ev_war_truce_offer")
  ) {
    return "ev_war_truce_offer";
  }
  const seen = new Set(seenEventIds);
  const fresh = WAR_LOOP_EVENT_IDS.filter((id) => !seen.has(id));
  const candidates = fresh.length > 0 ? fresh : WAR_LOOP_EVENT_IDS;
  if (candidates.length === 0) return null;
  const rng = mulberry32(hashSeed(ws.warTurn, ws.ultimatumTurn, "war"));
  const idx = Math.floor(rng() * candidates.length) % candidates.length;
  return candidates[idx] ?? null;
}

// ─── Verdict ────────────────────────────────────────────────────────

export type WarOutcome = "victory" | "defeat" | "truce";

const VICTORY_SCORE = 200;
const DEFEAT_SCORE = 110;

export function shouldJudgeWar(ws: WarState): boolean {
  return ws.status === "war" && ws.warTurn >= ws.maxWarTurns;
}

export function judgeWar(ws: WarState): WarOutcome {
  const score = ws.mobilization + ws.allies + ws.supply;
  if (score >= VICTORY_SCORE) return "victory";
  if (score < DEFEAT_SCORE) return "defeat";
  return "truce";
}

export function endWar(prev: WarState, outcome: WarOutcome): WarState {
  const status =
    outcome === "victory"
      ? "victory"
      : outcome === "defeat"
        ? "defeat"
        : "truce";
  return { ...prev, status, outcome };
}

// ─── Helpers pour le caller (GameContext) ──────────────────────────

export function isWarActive(state: GameState): boolean {
  return state.warState?.status === "war";
}

export function isUltimatumPending(state: GameState): boolean {
  return state.warState?.status === "ultimatum";
}

export function isWarOver(state: GameState): boolean {
  const s = state.warState?.status;
  return s === "victory" || s === "defeat" || s === "truce";
}

export const WAR_EVENT_LOOKUP = WAR_EVENTS_BY_ID;
export type { WarMetricKey };
