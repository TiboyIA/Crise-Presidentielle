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

export type CyberOpStatus = "pending" | "resolved" | "blocked";

export interface CyberOp {
  id: string;
  attacker_id: string;
  target_id: string;
  status: CyberOpStatus;
  magnitude: number;
  created_at: string;
  resolves_at: string;
  target_name?: string;
  attacker_name?: string;
}

export interface CyberOpsResult {
  sent: CyberOp[];
  received: CyberOp[];
  pending_debuff_pct: number | null;
}

export async function launchCyberOp(
  accessToken: string,
  targetPlayerId: string,
): Promise<{ ok: boolean; error?: string; resolvesAt?: string }> {
  try {
    const res = await fetch(efUrl("/cyber-launch"), {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ targetPlayerId }),
    });
    const data = await res.json() as { ok?: boolean; error?: string; resolvesAt?: string };
    if (res.ok && data.ok) return { ok: true, resolvesAt: data.resolvesAt };
    return { ok: false, error: data.error ?? "server-error" };
  } catch {
    return { ok: false, error: "network-unavailable" };
  }
}

export async function fetchCyberOps(accessToken: string): Promise<CyberOpsResult> {
  try {
    const res = await fetch(efUrl("/cyber-resolve"), { headers: authHeaders(accessToken) });
    if (!res.ok) return { sent: [], received: [], pending_debuff_pct: null };
    return await res.json() as CyberOpsResult;
  } catch {
    return { sent: [], received: [], pending_debuff_pct: null };
  }
}
