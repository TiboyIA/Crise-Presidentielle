import { filterValid, validateAlliance } from "@/utils/validators";

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

export type AllianceStatus = "pending" | "active" | "rejected" | "broken";

export interface Alliance {
  id: string;
  status: AllianceStatus;
  created_at: string;
  expires_at: string | null;
  is_initiator: boolean;
  partner_id: string;
  partner_name: string;
}

export async function fetchAlliances(accessToken: string): Promise<Alliance[]> {
  try {
    const res = await fetch(efUrl("/alliance-list"), { headers: authHeaders(accessToken) });
    if (!res.ok) return [];
    const data = await res.json() as { alliances?: unknown[] };
    return filterValid(data.alliances ?? [], validateAlliance);
  } catch {
    return [];
  }
}

export async function inviteAlly(
  accessToken: string,
  targetPlayerId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(efUrl("/alliance-invite"), {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ targetPlayerId }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, error: data.error ?? "server-error" };
  } catch {
    return { ok: false, error: "network-unavailable" };
  }
}

export const ALLIANCE_BONUS_PER_ACTIVE = 0.02;  // +2% par alliance
export const MAX_ALLIANCE_BONUS        = 0.06;  // plafond 6% (3 alliances)

export interface AllianceBonuses {
  rate: number;   // multiplicateur total (ex. 0.04 pour 2 alliances)
  count: number;  // nombre d'alliances actives prises en compte
}

export function computeAllianceBonuses(alliances: Alliance[]): AllianceBonuses {
  const count = Math.min(alliances.filter((a) => a.status === "active").length, 3);
  return { rate: count * ALLIANCE_BONUS_PER_ACTIVE, count };
}

export async function respondToAlliance(
  accessToken: string,
  allianceId: string,
  action: "accept" | "reject" | "break",
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(efUrl("/alliance-respond"), {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ allianceId, action }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, error: data.error ?? "server-error" };
  } catch {
    return { ok: false, error: "network-unavailable" };
  }
}
