const BASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

function efUrl(path: string): string {
  return `${BASE_URL}/functions/v1${path}`;
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
    "apikey": ANON_KEY,
  };
}

export type SpyOpType = "intel_probe" | "doctrine_scan" | "score_range";
export type SpyOpStatus = "pending" | "resolved" | "blocked";

export interface SpyOp {
  id: string;
  op_type: SpyOpType;
  status: SpyOpStatus;
  created_at: string;
  resolves_at: string;
  result_json: SpyResult | null;
}

export interface SpyResult {
  target_name: string;
  // intel_probe
  country?: string;
  doctrine?: string;
  // doctrine_scan
  days_min?: number;
  days_max?: number;
  // score_range
  score_min?: number;
  score_max?: number;
  // blocked
  blocked_reason?: string;
}

export async function launchSpyOp(
  accessToken: string,
  targetPlayerId: string,
  opType: SpyOpType,
): Promise<{ ok: boolean; error?: string; resolvesAt?: string }> {
  try {
    const res = await fetch(efUrl("/spy-launch"), {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ targetPlayerId, opType }),
    });
    const data = await res.json() as { ok?: boolean; error?: string; resolvesAt?: string };
    if (res.ok && data.ok) return { ok: true, resolvesAt: data.resolvesAt };
    return { ok: false, error: data.error ?? "server-error" };
  } catch {
    return { ok: false, error: "network-unavailable" };
  }
}

export async function fetchSpyOps(accessToken: string): Promise<SpyOp[]> {
  try {
    const res = await fetch(efUrl("/spy-resolve"), { headers: authHeaders(accessToken) });
    if (!res.ok) return [];
    const data = await res.json() as { ops?: SpyOp[] };
    return data.ops ?? [];
  } catch {
    return [];
  }
}
