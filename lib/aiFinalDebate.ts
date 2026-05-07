import { apiUrl } from "@/lib/api";
import type { FinalDebateAttack, FinalDebateDecision } from "@/types/game";

const CLIENT_TIMEOUT_MS = 25_000;

export interface GenerateFinalDebateAttacksInput {
  decisions: FinalDebateDecision[];
  challengerArchetype?: string;
}

interface RawResponse {
  attacks?: unknown;
}

interface RawAttack {
  decisionId?: unknown;
  line?: unknown;
}

function normalizeAttacks(
  raw: unknown,
  expectedIds: Set<string>,
): FinalDebateAttack[] | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawResponse;
  if (!Array.isArray(r.attacks)) return null;
  const out: FinalDebateAttack[] = [];
  const seen = new Set<string>();
  for (const a of r.attacks) {
    if (!a || typeof a !== "object") continue;
    const at = a as RawAttack;
    const decisionId =
      typeof at.decisionId === "string" ? at.decisionId.trim() : "";
    const line = typeof at.line === "string" ? at.line.trim() : "";
    if (!decisionId || !line) continue;
    if (!expectedIds.has(decisionId)) continue;
    if (seen.has(decisionId)) continue;
    seen.add(decisionId);
    out.push({ decisionId, line });
  }
  return out.length > 0 ? out : null;
}

/**
 * Fetch one opposition attack per supplied decision (Module IA 5).
 * Honors an optional external AbortSignal so the caller (the election
 * screen) can cancel on unmount and avoid double-billing the AI.
 */
export async function generateFinalDebateAttacks(
  input: GenerateFinalDebateAttacksInput,
  signal?: AbortSignal,
): Promise<FinalDebateAttack[]> {
  const expectedIds = new Set(input.decisions.map((d) => d.decisionId));
  const localAbort = new AbortController();
  const timer = setTimeout(() => localAbort.abort(), CLIENT_TIMEOUT_MS);
  const onExternalAbort = () => localAbort.abort();
  if (signal) {
    if (signal.aborted) localAbort.abort();
    else signal.addEventListener("abort", onExternalAbort);
  }
  try {
    const res = await fetch(apiUrl("/api/ai/final-debate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: localAbort.signal,
    });
    if (res.status === 429) {
      let retry = "";
      try {
        const j = (await res.json()) as { retryAfterSec?: number };
        if (typeof j?.retryAfterSec === "number") {
          retry = ` Réessayez dans ${j.retryAfterSec}s.`;
        }
      } catch {
        // ignore
      }
      throw new Error(`Trop de demandes au débat final.${retry}`);
    }
    if (res.status === 504) {
      throw new Error("L'opposition prépare encore ses arguments. Réessayez.");
    }
    if (!res.ok) {
      throw new Error(`Débat final échoué (HTTP ${res.status}).`);
    }
    const json = (await res.json()) as unknown;
    const attacks = normalizeAttacks(json, expectedIds);
    if (!attacks) {
      throw new Error("Attaques de débat inutilisables.");
    }
    return attacks;
  } catch (err) {
    if (localAbort.signal.aborted) {
      throw new Error("L'opposition prépare encore ses arguments. Réessayez.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onExternalAbort);
  }
}
