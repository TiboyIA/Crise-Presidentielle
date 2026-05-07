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
} from "@/lib/purchases";

/**
 * v1.2 — Entitlements (DLC packs) with RevenueCat sync.
 *
 * Source of truth priority:
 *   1. RevenueCat customer info (real purchases, production)
 *   2. AsyncStorage (local debug grants, offline cache)
 *   3. FREE_PACKS (always unlocked)
 *
 * Public surface:
 *   - <EntitlementsProvider>   : wraps the app, initializes RevenueCat
 *   - useEntitlements()        : { unlockedPacks, hasPack, grantLocal, revokeLocal, refresh }
 */

const STORAGE_KEY = "etat_de_crise_entitlements_v1";

export const ALL_PACKS: readonly EventPack[] = ["climate"] as const;

/**
 * Packs offered for free with the base game (gift to launch v1.1).
 * Future packs that are NOT in this set will require a real purchase
 * once the RevenueCat SDK is wired in.
 *
 * Players always have access to free packs even if their stored
 * entitlements are empty (e.g. fresh install, storage wiped).
 */
export const FREE_PACKS: ReadonlySet<EventPack> = new Set<EventPack>([
  "climate",
]);

export function isPackFree(pack: EventPack): boolean {
  return FREE_PACKS.has(pack);
}

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
    // Non-fatal: entitlements will be re-fetched from RevenueCat at next launch.
  }
}

interface EntitlementsContextValue {
  loaded: boolean;
  unlockedPacks: ReadonlySet<EventPack>;
  hasPack: (pack: EventPack) => boolean;
  /**
   * Grant a pack locally (used by the in-game shop's stub purchase
   * flow today, and by the debug screen). Once RevenueCat is wired
   * in, real purchases will call this AND post to RevenueCat.
   */
  grantLocal: (pack: EventPack) => Promise<void>;
  revokeLocal: (pack: EventPack) => Promise<void>;
  /** Re-read from storage (and from RevenueCat once wired). */
  refresh: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

/**
 * Merge stored (paid) packs with the always-on free packs so consumers
 * (catalog filter, shop badges) get a single source of truth.
 */
function mergeWithFree(
  stored: ReadonlyArray<EventPack>,
): ReadonlySet<EventPack> {
  const merged = new Set<EventPack>(stored);
  for (const p of FREE_PACKS) merged.add(p);
  return merged;
}

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

  // All AsyncStorage read-modify-write happens on this serial queue
  // so concurrent grants/revokes/refreshes never lose updates.
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((fn: () => Promise<void>) => {
    const next = mutationQueueRef.current.then(fn, fn);
    mutationQueueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const refresh = useCallback(
    () =>
      enqueue(async () => {
        const [stored, customerInfo] = await Promise.all([
          readStored(),
          fetchCustomerInfo(),
        ]);
        if (!mountedRef.current) return;
        // RevenueCat is the source of truth for paid packs.
        // Merge: RC packs + local debug grants + free packs.
        const rcPacks = customerInfo ? packsFromCustomerInfo(customerInfo) : [];
        const allPaid = Array.from(
          new Set<EventPack>([...stored.packs, ...rcPacks]),
        );
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
        // Free packs are always granted; no point persisting them.
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
        // Free packs cannot be revoked (they are always part of the game).
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

/**
 * Helper for non-React code (e.g. one-shot scripts). Returns the
 * effective set of unlocked packs (persisted paid + free defaults).
 */
export async function readUnlockedPacks(): Promise<ReadonlySet<EventPack>> {
  const stored = await readStored();
  return mergeWithFree(stored.packs);
}
