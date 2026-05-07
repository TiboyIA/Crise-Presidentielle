import { apiUrl } from "@/lib/api";
import type { CrisisEvent, EventCategory, EventChoice } from "@/data/events";
import type { Gauges, HiddenGauges } from "@/types/game";

const GAUGE_KEYS: (keyof Gauges)[] = [
  "popularity",
  "economy",
  "budget",
  "debt",
  "security",
  "health",
  "ecology",
  "cohesion",
  "diplomacy",
  "regionalStability",
  "authority",
];

const HIDDEN_GAUGE_KEYS: (keyof HiddenGauges)[] = [
  "scandalRisk",
  "peopleFatigue",
  "radicalization",
  "foreignDependence",
  "cyberRisk",
  "corruption",
  "oppositionPower",
];

const VALID_CATEGORIES: EventCategory[] = [
  "social",
  "economy",
  "security",
  "diplomacy",
  "ecology",
  "scandal",
  "media",
  "opposition",
  "regional",
  "cyber",
  "health",
  "energy",
  "agriculture",
  "hybrid_warfare",
];

interface ServerChoice {
  id?: unknown;
  label?: unknown;
  description?: unknown;
  consequence?: unknown;
  effects?: Record<string, unknown>;
  hiddenEffects?: Record<string, unknown>;
  delayedRisk?: unknown;
}
interface ServerEvent {
  id?: unknown;
  category?: unknown;
  title?: unknown;
  context?: unknown;
  source?: unknown;
  choices?: unknown;
}

function pickInts<K extends string>(
  src: Record<string, unknown> | undefined,
  keys: readonly K[],
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  if (!src) return out;
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "number" && Number.isFinite(v) && v !== 0) {
      // Mirror server-side clamp so a malicious payload can't blow gauges.
      out[k] = Math.max(-30, Math.min(30, Math.round(v)));
    }
  }
  return out;
}

function asCategory(v: unknown): EventCategory {
  if (typeof v === "string" && (VALID_CATEGORIES as string[]).includes(v)) {
    return v as EventCategory;
  }
  return "social";
}

/**
 * Sanitize a server-generated event into a strict CrisisEvent shape.
 * Returns null if the payload is unusable.
 */
export function normalizeAIEvent(raw: unknown): CrisisEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as ServerEvent;
  const choicesArr = Array.isArray(e.choices) ? e.choices : [];
  if (choicesArr.length !== 3) return null;

  const choices: EventChoice[] = [];
  for (let i = 0; i < choicesArr.length; i++) {
    const cRaw = choicesArr[i] as ServerChoice;
    if (!cRaw || typeof cRaw !== "object") return null;
    const label = typeof cRaw.label === "string" ? cRaw.label : "";
    const description = typeof cRaw.description === "string" ? cRaw.description : "";
    const consequence = typeof cRaw.consequence === "string" ? cRaw.consequence : "";
    if (!label || !consequence) return null;
    const effects = pickInts<keyof Gauges>(cRaw.effects, GAUGE_KEYS);
    const hidden = pickInts<keyof HiddenGauges>(cRaw.hiddenEffects, HIDDEN_GAUGE_KEYS);
    const id = typeof cRaw.id === "string" && cRaw.id ? cRaw.id : ["a", "b", "c"][i] ?? String(i);
    choices.push({
      id,
      label,
      description,
      consequence,
      effects,
      ...(Object.keys(hidden).length > 0 ? { hiddenEffects: hidden } : {}),
    });
  }

  const id =
    typeof e.id === "string" && e.id
      ? e.id
      : `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const title = typeof e.title === "string" ? e.title : "Crise inattendue";
  const context = typeof e.context === "string" ? e.context : "";
  const source = typeof e.source === "string" ? e.source : "Dépêche";

  return {
    id,
    category: asCategory(e.category),
    title,
    context,
    source,
    choices,
  };
}

export interface GenerateAIEventInput {
  theme?: string;
  tone?: string;
  avoidTitles?: string[];
  /**
   * French directives produced by the crisis director (Module IA 2).
   * The server injects them verbatim into the AI prompt so the
   * generated crisis adapts to what the player is neglecting.
   */
  directives?: string[];
  /**
   * Subset of EventCategory values the AI should prefer.
   * Server validates against the canonical category list.
   */
  preferredCategories?: string[];
}

// Client-side timeout slightly longer than the server-side OpenAI
// timeout (25s) plus network overhead. Past this we surface a clear
// error to the player rather than spinning forever.
const CLIENT_TIMEOUT_MS = 35_000;

export async function generateAIEvent(
  input: GenerateAIEventInput = {},
  signal?: AbortSignal,
): Promise<CrisisEvent> {
  const localAbort = new AbortController();
  const timer = setTimeout(() => localAbort.abort(), CLIENT_TIMEOUT_MS);
  // Forward an externally-provided abort signal to our local controller.
  const onExternalAbort = () => localAbort.abort();
  if (signal) {
    if (signal.aborted) localAbort.abort();
    else signal.addEventListener("abort", onExternalAbort);
  }
  try {
    const res = await fetch(apiUrl("/api/ai/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: localAbort.signal,
    });
    if (res.status === 429) {
      let retryAfter = "";
      try {
        const j = (await res.json()) as { retryAfterSec?: number };
        if (typeof j?.retryAfterSec === "number") {
          retryAfter = ` Réessayez dans ${j.retryAfterSec}s.`;
        }
      } catch {
        // ignore
      }
      throw new Error(`Trop de demandes IA.${retryAfter}`);
    }
    if (res.status === 504) {
      throw new Error("L'IA met trop de temps à répondre. Réessayez.");
    }
    if (!res.ok) {
      throw new Error(`Génération IA échouée (HTTP ${res.status}).`);
    }
    const json = (await res.json()) as unknown;
    const evt = normalizeAIEvent(json);
    if (!evt) {
      throw new Error("Réponse IA inutilisable.");
    }
    return evt;
  } catch (err) {
    if (localAbort.signal.aborted) {
      throw new Error("L'IA met trop de temps à répondre. Réessayez.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onExternalAbort);
  }
}
