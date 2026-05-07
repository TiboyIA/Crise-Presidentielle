import { apiUrl } from "@/lib/api";
import type {
  OppositionAngle,
  OppositionAttack,
  OppositionWeakness,
} from "@/types/game";

const VALID_ANGLES: OppositionAngle[] = [
  "budget",
  "security",
  "ecology",
  "cohesion",
  "broken_promise",
  "popularity",
  "scandals",
  "authority",
];

const CLIENT_TIMEOUT_MS = 25_000;

export interface GenerateOppositionAttacksInput {
  weaknesses: OppositionWeakness[];
  maxAttacks?: number;
  challengerArchetype?: string;
}

interface RawResponse {
  attacks?: unknown;
}

interface RawAttack {
  angle?: unknown;
  line?: unknown;
}

function normalizeAttacks(raw: unknown): OppositionAttack[] | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawResponse;
  if (!Array.isArray(r.attacks)) return null;
  const out: OppositionAttack[] = [];
  for (const a of r.attacks) {
    if (!a || typeof a !== "object") continue;
    const at = a as RawAttack;
    const angle =
      typeof at.angle === "string" &&
      (VALID_ANGLES as string[]).includes(at.angle)
        ? (at.angle as OppositionAngle)
        : null;
    const line = typeof at.line === "string" ? at.line.trim() : "";
    if (!angle || !line) continue;
    out.push({ angle, line });
  }
  return out.length > 0 ? out : null;
}

export async function generateOppositionAttacks(
  input: GenerateOppositionAttacksInput,
  signal?: AbortSignal,
): Promise<OppositionAttack[]> {
  const localAbort = new AbortController();
  const timer = setTimeout(() => localAbort.abort(), CLIENT_TIMEOUT_MS);
  const onExternalAbort = () => localAbort.abort();
  if (signal) {
    if (signal.aborted) localAbort.abort();
    else signal.addEventListener("abort", onExternalAbort);
  }
  try {
    const res = await fetch(apiUrl("/api/ai/opposition-attack"), {
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
      throw new Error(`Trop de demandes à l'opposition.${retry}`);
    }
    if (res.status === 504) {
      throw new Error("L'opposition prépare encore son débat. Réessayez.");
    }
    if (!res.ok) {
      throw new Error(
        `Réplique d'opposition échouée (HTTP ${res.status}).`,
      );
    }
    const json = (await res.json()) as unknown;
    const attacks = normalizeAttacks(json);
    if (!attacks) {
      throw new Error("Répliques d'opposition inutilisables.");
    }
    return attacks;
  } catch (err) {
    if (localAbort.signal.aborted) {
      throw new Error("L'opposition prépare encore son débat. Réessayez.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onExternalAbort);
  }
}
