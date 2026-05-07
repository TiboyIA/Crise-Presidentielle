/**
 * Module 5 — Moteur de lignes d'attaque persistantes.
 *
 * À chaque tour, on lit les `OppositionWeakness[]` retournées par
 * `analyzeOppositionWeaknesses(state)` et on les FUSIONNE avec les
 * `attackLines` du tour précédent :
 *
 *   - Si une faiblesse persiste (même angle, ou même `promiseTag`
 *     pour les promesses trahies) : on continue la ligne existante,
 *     on incrémente `turnsActive`, on met à jour la sévérité (la
 *     plus haute prévaut), et on repioche un slogan dans la tranche
 *     de durée correspondante.
 *
 *   - Si une faiblesse est nouvelle : on crée une ligne fraîche
 *     (turnsActive=1, firstTurn=lastTurn=turn courant).
 *
 *   - Si une ligne existante n'a plus de faiblesse correspondante :
 *     elle est purgée. (Pas de cooldown — l'opposition arrête de
 *     taper dès que le problème est résolu, ce qui récompense le
 *     redressement.)
 *
 * 100 % pur, 100 % déterministe : appel multiple avec mêmes inputs
 * → mêmes outputs. Aucun appel IA, aucune lecture d'horloge.
 */
import {
  OPPOSITION_SLOGANS,
  classifyDuration,
} from "@/data/oppositionSlogans";
import type { PromiseTag } from "@/data/promises";
import type {
  OppositionAngle,
  OppositionAttackLineState,
  OppositionSeverity,
  OppositionWeakness,
} from "@/types/game";

/** Sévérité ordonnée pour `Math.max`-style merge. */
const SEVERITY_RANK: Record<OppositionSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};
const SEVERITY_BY_RANK: OppositionSeverity[] = ["low", "low", "medium", "high"];

function maxSeverity(
  a: OppositionSeverity,
  b: OppositionSeverity,
): OppositionSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/**
 * Identité stable d'une faiblesse, pour le merge :
 *   - broken_promise → "broken_promise:<tag>"
 *   - autres angles  → "<angle>"
 */
function weaknessKey(w: {
  angle: OppositionAngle;
  promiseTag?: PromiseTag;
}): string {
  if (w.angle === "broken_promise" && w.promiseTag) {
    return `bp:${w.promiseTag}`;
  }
  return `a:${w.angle}`;
}

function lineKey(line: OppositionAttackLineState): string {
  if (line.angle === "broken_promise" && line.promiseTag) {
    return `bp:${line.promiseTag}`;
  }
  return `a:${line.angle}`;
}

/**
 * PRNG déterministe pour piocher un slogan. Seedé sur (turn, key,
 * turnsActive) pour que :
 *   - le slogan tourne d'un tour à l'autre (variété),
 *   - mais reste stable au sein d'un tour (rerender React).
 *
 * mulberry32, suffisant pour un index sur ≤10 entrées.
 */
function seedHash(turn: number, key: string, turnsActive: number): number {
  let h = turn * 73856093 + turnsActive * 19349663;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
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

/**
 * Pioche un slogan brut puis substitue {turns} et {label}.
 * Si l'angle est `broken_promise` et qu'on n'a pas de label, on
 * retombe sur "votre engagement de campagne" pour rester lisible.
 */
function pickSlogan(args: {
  angle: OppositionAngle;
  turnsActive: number;
  turn: number;
  promiseLabel?: string;
}): string {
  const { angle, turnsActive, turn, promiseLabel } = args;
  const duration = classifyDuration(turnsActive);
  const pool = OPPOSITION_SLOGANS[angle][duration];
  const key = `${angle}:${duration}:${promiseLabel ?? ""}`;
  const rng = mulberry32(seedHash(turn, key, turnsActive));
  const idx = Math.floor(rng() * pool.length) % pool.length;
  const raw = pool[idx];
  return raw
    .replace(/\{turns\}/g, String(turnsActive))
    .replace(/\{label\}/g, promiseLabel ?? "votre engagement de campagne");
}

/** Génère un id stable pour une nouvelle ligne (pas de Date.now ici). */
function makeLineId(args: {
  angle: OppositionAngle;
  promiseTag?: PromiseTag;
  firstTurn: number;
}): string {
  const tag = args.promiseTag ? `_${args.promiseTag}` : "";
  return `oal_${args.angle}${tag}_t${args.firstTurn}`;
}

/**
 * Résultat d'un tick. Pur — ne mute aucun input.
 */
export function tickAttackLines(
  prev: OppositionAttackLineState[] | undefined,
  weaknesses: OppositionWeakness[],
  turn: number,
): OppositionAttackLineState[] {
  const prevByKey = new Map<string, OppositionAttackLineState>();
  for (const l of prev ?? []) prevByKey.set(lineKey(l), l);

  // Dédup les weaknesses sur leur clé d'identité (au cas où
  // analyzeOppositionWeaknesses émettrait plusieurs niveaux pour le
  // même angle — il ne le fait pas mais on se protège). On garde la
  // sévérité la plus haute et le label le plus récent.
  const wkByKey = new Map<string, OppositionWeakness>();
  for (const w of weaknesses) {
    const k = weaknessKey(w);
    const existing = wkByKey.get(k);
    if (!existing) {
      wkByKey.set(k, w);
    } else {
      wkByKey.set(k, {
        ...existing,
        severity: maxSeverity(existing.severity, w.severity),
        promiseLabel: w.promiseLabel ?? existing.promiseLabel,
      });
    }
  }

  const next: OppositionAttackLineState[] = [];
  for (const [key, w] of wkByKey) {
    const previous = prevByKey.get(key);
    if (previous) {
      const turnsActive = previous.turnsActive + 1;
      const severity = maxSeverity(previous.severity, w.severity);
      next.push({
        ...previous,
        severity,
        turnsActive,
        lastTurn: turn,
        slogan: pickSlogan({
          angle: w.angle,
          turnsActive,
          turn,
          promiseLabel: w.promiseLabel,
        }),
      });
    } else {
      const firstTurn = turn;
      next.push({
        id: makeLineId({
          angle: w.angle,
          promiseTag: w.promiseTag,
          firstTurn,
        }),
        angle: w.angle,
        severity: w.severity,
        turnsActive: 1,
        firstTurn,
        lastTurn: turn,
        slogan: pickSlogan({
          angle: w.angle,
          turnsActive: 1,
          turn,
          promiseLabel: w.promiseLabel,
        }),
        promiseTag: w.promiseTag,
      });
    }
  }

  // Tri : sévérité décroissante, puis durée décroissante. Permet à
  // l'UI de prendre les top-N sans recalcul.
  next.sort((a, b) => {
    const dSev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (dSev !== 0) return dSev;
    return b.turnsActive - a.turnsActive;
  });

  return next;
}

/** Helper pour les tests / l'UI. */
export function _severityFromRank(rank: number): OppositionSeverity {
  return SEVERITY_BY_RANK[Math.max(0, Math.min(3, rank))];
}
