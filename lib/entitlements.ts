import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EventPack } from "@/data/events";
import {
  fetchCustomerInfo,
  initPurchases,
  packsFromCustomerInfo,
  packsFromEntitlementIds,
} from "@/lib/purchases";

/**
 * v1.3 — Entitlements (DLC packs) with server-side source of truth.
 *
 * Source of truth priority:
 *   1. Backend player-entitlements (updated by RevenueCat webhook — server decides)
 *   2. RevenueCat SDK (optimistic, for the brief window between purchase and webhook)
 *   3. AsyncStorage (local debug grants only — never used for real purchase decisions)
 *   4. FREE_PACKS (always unlocked)
 *
 * The backend MUST be the authority on whether a player is premium.
 * The app never decides unilaterally.
 *
 * Public surface:
 *   - setEntitlementToken(token)   : called by AuthContext on auth state change
 *   - <EntitlementsProvider>       : wraps the app, initializes RevenueCat
 *   - useEntitlements()            : { unlockedPacks, hasPack, grantLocal, revokeLocal, refresh }
 */

const STORAGE_KEY = "etat_de_crise_entitlements_v1";

export const ALL_PACKS: readonly EventPack[] = ["climate"] as const;

export const FREE_PACKS: ReadonlySet<EventPack> = new Set<EventPack>([
  "climate",
]);

export function isPackFree(pack: EventPack): boolean {
  return FREE_PACKS.has(pack);
}

// ── Module-level auth token (set by AuthContext on auth state change) ──────────

let _entitlementToken: string | null = null;

export function setEntitlementToken(token: string | null): void {
  _entitlementToken = token;
}

// ── Backend entitlements fetch ────────────────────────────────────────────────

async function fetchBackendEntitlements(): Promise<string[] | null> {
  const token = _entitlementToken;
  if (!token) return null;
  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !anonKey) return null;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/player-entitlements`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": anonKey,
      },
    });
    if (!res.ok) return null;
    const data = await res.json() as { entitlements?: unknown };
    if (!Array.isArray(data.entitlements)) return null;
    return (data.entitlements as unknown[]).filter((e): e is string => typeof e === "string");
  } catch {
    return null;
  }
}

// ── AsyncStorage helpers ──────────────────────────────────────────────────────

interface StoredState {
  packs: EventPack[];
}

async function readStored(): Promise<StoredState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { packs: [] };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!parsed || !Array.isArray(parsed.packs)) return { packs: [] };
    const valid = parsed.packs.filter((p): p is EventPack =>
      (ALL_PACKS as readonly string[]).includes(p),
    );
    return { packs: valid };
  } catch {
    return { packs: [] };
  }
}

async function writeStored(state: StoredState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal: entitlements will be re-fetched from backend/RevenueCat at next launch.
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

function mergeWithFree(stored: ReadonlyArray<EventPack>): ReadonlySet<EventPack> {
  const merged = new Set<EventPack>(stored);
  for (const p of FREE_PACKS) merged.add(p);
  return merged;
}

interface EntitlementsContextValue {
  loaded: boolean;
  unlockedPacks: ReadonlySet<EventPack>;
  hasPack: (pack: EventPack) => boolean;
  grantLocal: (pack: EventPack) => Promise<void>;
  revokeLocal: (pack: EventPack) => Promise<void>;
  refresh: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loaded, setLoaded] = useState(false);
  const [packs, setPacks] = useState<ReadonlySet<EventPack>>(() =>
    mergeWithFree([]),
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((fn: () => Promise<void>) => {
    const next = mutationQueueRef.current.then(fn, fn);
    mutationQueueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const refresh = useCallback(
    () =>
      enqueue(async () => {
        const [stored, customerInfo, backendIds] = await Promise.all([
          readStored(),
          fetchCustomerInfo(),
          fetchBackendEntitlements(),
        ]);
        if (!mountedRef.current) return;

        // Backend (server-side webhook state) is the source of truth for real purchases.
        // RC SDK is the optimistic fallback for the brief window between purchase and webhook.
        // We union both so a just-purchased pack shows immediately even before the webhook fires.
        const rcPacks      = customerInfo ? packsFromCustomerInfo(customerInfo) : [];
        const backendPacks = backendIds !== null ? packsFromEntitlementIds(backendIds) : [];
        const realPacks    = Array.from(new Set<EventPack>([...backendPacks, ...rcPacks]));

        // Local debug grants (grantLocal) sit on top of real purchases.
        const allPaid = Array.from(new Set<EventPack>([...stored.packs, ...realPacks]));
        setPacks(mergeWithFree(allPaid));
        setLoaded(true);
      }),
    [enqueue],
  );

  useEffect(() => {
    initPurchases();
    void refresh();
  }, [refresh]);

  const grantLocal = useCallback(
    (pack: EventPack) =>
      enqueue(async () => {
        if (FREE_PACKS.has(pack)) {
          if (mountedRef.current) {
            const stored = await readStored();
            setPacks(mergeWithFree(stored.packs));
          }
          return;
        }
        const stored = await readStored();
        if (stored.packs.includes(pack)) {
          if (mountedRef.current) setPacks(mergeWithFree(stored.packs));
          return;
        }
        const next = { packs: [...stored.packs, pack] };
        await writeStored(next);
        if (mountedRef.current) setPacks(mergeWithFree(next.packs));
      }),
    [enqueue],
  );

  const revokeLocal = useCallback(
    (pack: EventPack) =>
      enqueue(async () => {
        if (FREE_PACKS.has(pack)) {
          if (mountedRef.current) {
            const stored = await readStored();
            setPacks(mergeWithFree(stored.packs));
          }
          return;
        }
        const stored = await readStored();
        const next = { packs: stored.packs.filter((p) => p !== pack) };
        await writeStored(next);
        if (mountedRef.current) setPacks(mergeWithFree(next.packs));
      }),
    [enqueue],
  );

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      loaded,
      unlockedPacks: packs,
      hasPack: (p: EventPack) => packs.has(p),
      grantLocal,
      revokeLocal,
      refresh,
    }),
    [loaded, packs, grantLocal, revokeLocal, refresh],
  );

  return React.createElement(
    EntitlementsContext.Provider,
    { value },
    children,
  );
}

export function useEntitlements(): EntitlementsContextValue {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) {
    throw new Error("useEntitlements must be used inside <EntitlementsProvider>");
  }
  return ctx;
}

export async function readUnlockedPacks(): Promise<ReadonlySet<EventPack>> {
  const stored = await readStored();
  return mergeWithFree(stored.packs);
}
