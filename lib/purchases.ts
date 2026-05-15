// Type-only imports — zero runtime cost, work everywhere including Expo Go.
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { Platform } from "react-native";
import type { EventPack } from "@/data/events";

// Maps our internal pack IDs → RevenueCat entitlement identifiers.
// Must match exactly what you configure in the RevenueCat dashboard.
const PACK_TO_ENTITLEMENT: Record<EventPack, string> = {
  climate: "climate_pack",
};

// Reverse mapping used by the entitlements layer to convert backend responses.
const ENTITLEMENT_TO_PACK: Partial<Record<string, EventPack>> = Object.fromEntries(
  (Object.entries(PACK_TO_ENTITLEMENT) as [EventPack, string][]).map(([pack, id]) => [id, pack]),
);

let initialized = false;

/**
 * Lazy accessor for the native RevenueCat module.
 * Returns null in Expo Go (native module not present) or on web.
 * Returns the real module in any proper native build (EAS / local run).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPurchases(): any | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases").default;
  } catch {
    return null;
  }
}

export function initPurchases(): void {
  if (initialized || Platform.OS === "web") return;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    console.warn(
      "[RevenueCat] EXPO_PUBLIC_REVENUECAT_ANDROID_KEY not set — purchases disabled.",
    );
    return;
  }
  const Purchases = getPurchases();
  if (!Purchases) {
    console.warn("[RevenueCat] Native module unavailable (Expo Go?) — purchases disabled.");
    return;
  }
  Purchases.configure({ apiKey });
  initialized = true;
}

/**
 * Identify the RevenueCat user as the authenticated Supabase user.
 * Must be called after auth + initPurchases() so that RevenueCat webhook
 * events carry the Supabase UID as app_user_id — enabling the backend to
 * link purchases to the correct player row.
 */
export async function loginRevenueCat(userId: string): Promise<void> {
  if (!initialized || Platform.OS === "web") return;
  const Purchases = getPurchases();
  if (!Purchases) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn("[RevenueCat] logIn failed:", e);
  }
}

/**
 * Reset RevenueCat to an anonymous identity (call on sign-out).
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!initialized || Platform.OS === "web") return;
  const Purchases = getPurchases();
  if (!Purchases) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn("[RevenueCat] logOut failed:", e);
  }
}

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!initialized || Platform.OS === "web") return null;
  try {
    return await getPurchases()?.getCustomerInfo() ?? null;
  } catch (e) {
    console.warn("[RevenueCat] getCustomerInfo failed:", e);
    return null;
  }
}

/** Convert RevenueCat CustomerInfo → list of unlocked packs. */
export function packsFromCustomerInfo(info: CustomerInfo): EventPack[] {
  return (Object.entries(PACK_TO_ENTITLEMENT) as [EventPack, string][])
    .filter(([, id]) => info.entitlements.active[id] !== undefined)
    .map(([pack]) => pack);
}

/**
 * Convert a list of entitlement IDs (from the backend player-entitlements
 * endpoint) to our internal EventPack list.
 */
export function packsFromEntitlementIds(entitlementIds: string[]): EventPack[] {
  return entitlementIds
    .map((id) => ENTITLEMENT_TO_PACK[id])
    .filter((p): p is EventPack => p !== undefined);
}

/**
 * Purchase a pack via RevenueCat.
 * The package identifier in your RevenueCat offering must match the pack ID.
 * Returns the full list of now-unlocked packs on success.
 * Throws on cancellation or error (caller must handle).
 */
export async function purchasePack(pack: EventPack): Promise<EventPack[]> {
  if (!initialized) throw new Error("RevenueCat not initialized");
  const Purchases = getPurchases();
  if (!Purchases) throw new Error("Native module unavailable");
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;
  if (!offering) throw new Error("Aucune offre RevenueCat disponible");

  const rcPackage: PurchasesPackage | undefined =
    offering.availablePackages.find((p: PurchasesPackage) => p.identifier === pack);
  if (!rcPackage)
    throw new Error(`Pack "${pack}" introuvable dans l'offre RevenueCat`);

  const { customerInfo } = await Purchases.purchasePackage(rcPackage);
  return packsFromCustomerInfo(customerInfo);
}

/**
 * Restore past purchases (required by Google Play policy).
 * Returns the list of restored packs.
 */
export async function restorePurchases(): Promise<EventPack[]> {
  if (!initialized || Platform.OS === "web") return [];
  try {
    const customerInfo = await getPurchases()?.restorePurchases();
    if (!customerInfo) return [];
    return packsFromCustomerInfo(customerInfo);
  } catch (e) {
    console.warn("[RevenueCat] restorePurchases failed:", e);
    return [];
  }
}
