import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";
import type { EventPack } from "@/data/events";

// Maps our internal pack IDs → RevenueCat entitlement identifiers.
// Must match exactly what you configure in the RevenueCat dashboard.
const PACK_TO_ENTITLEMENT: Record<EventPack, string> = {
  climate: "climate_pack",
};

let initialized = false;

export function initPurchases(): void {
  if (initialized || Platform.OS === "web") return;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    console.warn(
      "[RevenueCat] EXPO_PUBLIC_REVENUECAT_ANDROID_KEY not set — purchases disabled.",
    );
    return;
  }
  Purchases.configure({ apiKey });
  initialized = true;
}

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!initialized || Platform.OS === "web") return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn("[RevenueCat] getCustomerInfo failed:", e);
    return null;
  }
}

export function packsFromCustomerInfo(info: CustomerInfo): EventPack[] {
  return (Object.entries(PACK_TO_ENTITLEMENT) as [EventPack, string][])
    .filter(([, id]) => info.entitlements.active[id] !== undefined)
    .map(([pack]) => pack);
}

/**
 * Purchase a pack via RevenueCat.
 * The package identifier in your RevenueCat offering must match the pack ID.
 * Returns the full list of now-unlocked packs on success.
 * Throws on cancellation or error (caller must handle).
 */
export async function purchasePack(pack: EventPack): Promise<EventPack[]> {
  if (!initialized) throw new Error("RevenueCat not initialized");
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;
  if (!offering) throw new Error("Aucune offre RevenueCat disponible");

  const rcPackage: PurchasesPackage | undefined =
    offering.availablePackages.find((p) => p.identifier === pack);
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
    const customerInfo = await Purchases.restorePurchases();
    return packsFromCustomerInfo(customerInfo);
  } catch (e) {
    console.warn("[RevenueCat] restorePurchases failed:", e);
    return [];
  }
}
