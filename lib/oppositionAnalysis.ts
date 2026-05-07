import type { GameState, OppositionWeakness } from "@/types/game";

/**
 * Module IA 4 — DETERMINISTIC opposition analyzer.
 *
 * Runs purely on the player's GameState. NEVER calls AI. Returns a
 * ranked list of weaknesses the opposition can exploit:
 *  - high debt → "irresponsabilité budgétaire"
 *  - low security → "chaos sécuritaire"
 *  - low ecology → "inaction climatique"
 *  - low cohesion → "division du pays"
 *  - any broken promise → "promesse trahie" (one weakness per promise)
 *  - low popularity → "rejet du peuple"
 *  - revealed scandals → "scandales d'État"
 *  - low authority → "vacance du pouvoir"
 *
 * Severity tiers:
 *  - "high"    : critical breach, primary attack angle
 *  - "medium"  : noticeable weakness, secondary attack
 *  - "low"     : annoyance level, kept only if nothing better
 *
 * The list is sorted by severity (high → low) so callers can take the
 * top N and feed them to the AI in priority order.
 *
 * IMPORTANT: this is the ONLY source of truth for what the opposition
 * is allowed to attack. The AI only writes rhetoric on top of these
 * deterministic findings — it cannot invent new accusations.
 */

const SEVERITY_RANK: Record<OppositionWeakness["severity"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function analyzeOppositionWeaknesses(
  state: GameState,
): OppositionWeakness[] {
  const out: OppositionWeakness[] = [];
  const g = state.gauges;

  // --- Debt (inverted gauge: HIGH = bad) -----------------------------
  if (g.debt >= 75) {
    out.push({
      angle: "budget",
      severity: "high",
      context: `Dette publique au plus haut : ${Math.round(g.debt)}/100. Budget : ${Math.round(g.budget)}/100.`,
    });
  } else if (g.debt >= 60) {
    out.push({
      angle: "budget",
      severity: "medium",
      context: `Dette publique élevée : ${Math.round(g.debt)}/100. Budget : ${Math.round(g.budget)}/100.`,
    });
  }

  // --- Security ------------------------------------------------------
  if (g.security <= 25) {
    out.push({
      angle: "security",
      severity: "high",
      context: `Sécurité effondrée : ${Math.round(g.security)}/100. Stabilité régionale : ${Math.round(g.regionalStability)}/100.`,
    });
  } else if (g.security <= 40) {
    out.push({
      angle: "security",
      severity: "medium",
      context: `Sécurité dégradée : ${Math.round(g.security)}/100.`,
    });
  }

  // --- Ecology -------------------------------------------------------
  if (g.ecology <= 25) {
    out.push({
      angle: "ecology",
      severity: "high",
      context: `Écologie au plus bas : ${Math.round(g.ecology)}/100. Engagements climatiques abandonnés.`,
    });
  } else if (g.ecology <= 40) {
    out.push({
      angle: "ecology",
      severity: "medium",
      context: `Écologie en recul : ${Math.round(g.ecology)}/100.`,
    });
  }

  // --- Cohesion ------------------------------------------------------
  if (g.cohesion <= 25) {
    out.push({
      angle: "cohesion",
      severity: "high",
      context: `Cohésion nationale brisée : ${Math.round(g.cohesion)}/100. Le pays est fracturé.`,
    });
  } else if (g.cohesion <= 40) {
    out.push({
      angle: "cohesion",
      severity: "medium",
      context: `Cohésion nationale fragile : ${Math.round(g.cohesion)}/100.`,
    });
  }

  // --- Broken promises (one weakness per promise, capped at top 3) ---
  const broken = state.promises.filter((p) => p.status === "broken");
  // Always escalate broken promises in the final debate — they're the
  // single sharpest attack angle ("vous aviez promis…").
  for (const promise of broken.slice(0, 3)) {
    out.push({
      angle: "broken_promise",
      severity: "high",
      context: `Promesse de campagne TRAHIE : « ${promise.label} » — abandonnée au tour ${promise.resolvedTurn ?? "?"}.`,
      // Module 5 — exposé pour permettre au tracker de lignes
      // d'attaque persistantes (logic/oppositionLines.ts) de garder
      // une ligne distincte par promesse trahie.
      promiseTag: promise.tag,
      promiseLabel: promise.label,
    });
  }

  // --- Popularity / Authority ---------------------------------------
  if (g.popularity <= 25) {
    out.push({
      angle: "popularity",
      severity: "high",
      context: `Popularité au plancher : ${Math.round(g.popularity)}/100. Le peuple a décroché.`,
    });
  } else if (g.popularity <= 40) {
    out.push({
      angle: "popularity",
      severity: "medium",
      context: `Popularité en berne : ${Math.round(g.popularity)}/100.`,
    });
  }

  if (g.authority <= 25) {
    out.push({
      angle: "authority",
      severity: "high",
      context: `Autorité présidentielle effacée : ${Math.round(g.authority)}/100.`,
    });
  } else if (g.authority <= 40) {
    out.push({
      angle: "authority",
      severity: "medium",
      context: `Autorité affaiblie : ${Math.round(g.authority)}/100.`,
    });
  }

  // --- Scandals ------------------------------------------------------
  if (state.scandalsRevealed >= 3) {
    out.push({
      angle: "scandals",
      severity: "high",
      context: `${state.scandalsRevealed} scandales sortis pendant le mandat.`,
    });
  } else if (state.scandalsRevealed >= 1) {
    out.push({
      angle: "scandals",
      severity: "medium",
      context: `${state.scandalsRevealed} scandale(s) révélé(s) durant le mandat.`,
    });
  }

  // Sort by severity (high first) then keep insertion order for ties.
  out.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );

  return out;
}

/**
 * Convenience: pick the top N weaknesses to actually pass to the AI.
 * Defaults to 4 — enough variety for a debate, few enough to keep the
 * AI's output focused.
 */
export function selectDebateAngles(
  state: GameState,
  maxAttacks = 4,
): OppositionWeakness[] {
  const all = analyzeOppositionWeaknesses(state);
  // Deduplicate by angle for non-broken-promise rows so we don't ask
  // the AI to write two attacks on the same theme. Broken-promise
  // rows are intentionally allowed to repeat (each promise is its own
  // attack angle).
  const seen = new Set<string>();
  const picked: OppositionWeakness[] = [];
  for (const w of all) {
    if (w.angle === "broken_promise") {
      picked.push(w);
    } else if (!seen.has(w.angle)) {
      seen.add(w.angle);
      picked.push(w);
    }
    if (picked.length >= maxAttacks) break;
  }
  return picked;
}
