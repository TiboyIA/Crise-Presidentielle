const BASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface ChatMessage {
  id: string;
  player_id: string;
  display_name: string;
  content: string;
  created_at: string;
}

export interface FetchChatResult {
  messages: ChatMessage[];
  season: number;
}

export async function fetchChat(): Promise<FetchChatResult> {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-fetch`, {
    headers: { apikey: ANON_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<FetchChatResult>;
}

export async function sendChatMessage(
  accessToken: string,
  content: string,
): Promise<{ ok: boolean; error?: string; message?: ChatMessage }> {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-send`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  const data = await res.json() as { ok?: boolean; error?: string; message?: ChatMessage };
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true, message: data.message };
}

export async function reportMessage(
  accessToken: string,
  messageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-report`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messageId }),
  });
  const data = await res.json() as { ok?: boolean; error?: string };
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true };
}
