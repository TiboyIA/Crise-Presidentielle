import { apiUrl } from "@/lib/api";
import type { AIHeadline, AIHeadlineTone } from "@/types/game";

const VALID_TONES: AIHeadlineTone[] = [
  "favorable",
  "critique",
  "neutre",
  "alarmiste",
  "sarcastique",
];

const CLIENT_TIMEOUT_MS = 25_000;

export interface GenerateAIHeadlineInput {
  eventTitle: string;
  choiceLabel: string;
  consequence?: string;
  tone?: AIHeadlineTone;
}

interface RawHeadline {
  outlet?: unknown;
  headline?: unknown;
  snippet?: unknown;
  tone?: unknown;
}

function normalize(raw: unknown): AIHeadline | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawHeadline;
  const outlet = typeof r.outlet === "string" ? r.outlet.trim() : "";
  const headline = typeof r.headline === "string" ? r.headline.trim() : "";
  const snippet = typeof r.snippet === "string" ? r.snippet.trim() : "";
  if (!outlet || !headline) return null;
  const tone: AIHeadlineTone =
    typeof r.tone === "string" && (VALID_TONES as string[]).includes(r.tone)
      ? (r.tone as AIHeadlineTone)
      : "neutre";
  return { outlet, headline, snippet, tone };
}

export async function generateAIHeadline(
  input: GenerateAIHeadlineInput,
  signal?: AbortSignal,
): Promise<AIHeadline> {
  const localAbort = new AbortController();
  const timer = setTimeout(() => localAbort.abort(), CLIENT_TIMEOUT_MS);
  const onExternalAbort = () => localAbort.abort();
  if (signal) {
    if (signal.aborted) localAbort.abort();
    else signal.addEventListener("abort", onExternalAbort);
  }
  try {
    const res = await fetch(apiUrl("/api/ai/headline"), {
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
      throw new Error(`Trop de demandes médias.${retry}`);
    }
    if (res.status === 504) {
      throw new Error("Les médias prennent leur temps. Réessayez.");
    }
    if (!res.ok) {
      throw new Error(`Une médiatique échouée (HTTP ${res.status}).`);
    }
    const json = (await res.json()) as unknown;
    const headline = normalize(json);
    if (!headline) {
      throw new Error("Une médiatique inutilisable.");
    }
    return headline;
  } catch (err) {
    if (localAbort.signal.aborted) {
      throw new Error("Les médias prennent leur temps. Réessayez.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onExternalAbort);
  }
}
