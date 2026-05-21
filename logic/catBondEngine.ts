import type { ActiveCatBond, CatBondMarketState, CatBondTypeId, NewsEvent } from "@/types/strategy";

// ── Définition statique d'un cat bond ────────────────────────────────────────

export interface CatBondDef {
  id: CatBondTypeId;
  name: string;
  icon: string;
  riskLabel: string;
  coveredEventIds: string[];
  baseCapital: number;       // M€ collectés auprès des marchés à l'émission
  baseCoupon: number;        // M€ à rembourser si aucune crise ne survient
  durationActions: number;   // durée de vie en nombre d'actions
  investorConfidenceImpact: number; // delta eliteTrust à l'émission (négatif = marchés prudents)
  reputationPenalty: number; // delta eliteTrust si le bond est déclenché (crisis arrivée)
  available: boolean;        // false = verrouillé version 1
  color: string;
}

// ── Catalogue V1 ─────────────────────────────────────────────────────────────

export const CAT_BOND_DEFS: Record<CatBondTypeId, CatBondDef> = {
  cat_cyber: {
    id: "cat_cyber",
    name: "Cat Bond Cyber",
    icon: "⚡🛡️",
    riskLabel: "Risque Cyber",
    coveredEventIds: ["cyber_power_grid", "cyber_banking", "world_russia_cyber"],
    baseCapital: 400,
    baseCoupon: 80,
    durationActions: 20,
    investorConfidenceImpact: -3,
    reputationPenalty: -8,
    available: true,
    color: "#4a9fff",
  },
  cat_climat: {
    id: "cat_climat",
    name: "Cat Bond Climatique",
    icon: "🌡️",
    riskLabel: "Risque Climatique",
    coveredEventIds: ["heatwave_crisis", "ecological_disaster", "world_climate_summit"],
    baseCapital: 350,
    baseCoupon: 60,
    durationActions: 18,
    investorConfidenceImpact: -2,
    reputationPenalty: -6,
    available: true,
    color: "#52c97a",
  },
  cat_energie: {
    id: "cat_energie",
    name: "Cat Bond Énergie",
    icon: "⚡",
    riskLabel: "Risque Énergétique",
    coveredEventIds: ["fuel_shortage", "blackout_national", "energy_blackmail_crisis", "world_energy_crisis"],
    baseCapital: 450,
    baseCoupon: 90,
    durationActions: 22,
    investorConfidenceImpact: -4,
    reputationPenalty: -7,
    available: true,
    color: "#f59e0b",
  },
  cat_infrastructure: {
    id: "cat_infrastructure",
    name: "Cat Bond Infrastructure",
    icon: "🏗️",
    riskLabel: "Risque Infrastructure",
    coveredEventIds: ["sabotage_infrastructure", "industrial_disaster", "infrastructure_sabotage"],
    baseCapital: 500,
    baseCoupon: 100,
    durationActions: 25,
    investorConfidenceImpact: -5,
    reputationPenalty: -10,
    available: false,
    color: "#a78bfa",
  },
  cat_guerre_hybride: {
    id: "cat_guerre_hybride",
    name: "Cat Bond Guerre Hybride",
    icon: "🕵️",
    riskLabel: "Risque Hybride",
    coveredEventIds: ["hybrid_propaganda", "world_russia_cyber", "desinformation_electorale", "satellites_intel_reveal"],
    baseCapital: 600,
    baseCoupon: 120,
    durationActions: 30,
    investorConfidenceImpact: -6,
    reputationPenalty: -12,
    available: false,
    color: "#e54848",
  },
};

export const CAT_BOND_DEF_LIST = Object.values(CAT_BOND_DEFS);

// ── Capital et coupon effectifs (réduits si marchés méfiants) ─────────────────
// marketSkepticism 0 → multiplicateur 1.0 ; à 100 → capital ×0.5, coupon ×1.5

export function computeEffectiveCapital(def: CatBondDef, marketSkepticism: number): number {
  const factor = 1 - (marketSkepticism / 200);
  return Math.round(def.baseCapital * factor);
}

export function computeEffectiveCoupon(def: CatBondDef, marketSkepticism: number): number {
  const factor = 1 + (marketSkepticism / 100);
  return Math.round(def.baseCoupon * factor);
}

// ── Couverture d'un événement ─────────────────────────────────────────────────

export function isBondCovering(def: CatBondDef, event: NewsEvent): boolean {
  return def.coveredEventIds.includes(event.id);
}

// ── Calcul de l'absorption ────────────────────────────────────────────────────
// Absorbe jusqu'à 75 % du coût, plafonné par le capital disponible.

export function computeBondAbsorption(capitalRaised: number, moneyCost: number): number {
  const drain = Math.abs(moneyCost);
  return Math.min(capitalRaised, Math.round(drain * 0.75));
}

// ── Traitement expiry ─────────────────────────────────────────────────────────
// Retirer les bonds déclenchés et les bonds expirés, calculer le coupon dû.

export function processCatBondExpiry(
  bonds: ActiveCatBond[],
  currentActionCount: number,
): { bonds: ActiveCatBond[]; couponPaid: number; skepticismDelta: number } {
  let couponPaid = 0;
  let skepticismDelta = 0;

  const afterTriggered = bonds.filter((b) => !b.triggered);
  const expired = afterTriggered.filter((b) => b.expiresAtAction <= currentActionCount);
  const stillActive = afterTriggered.filter((b) => b.expiresAtAction > currentActionCount);

  for (const b of expired) {
    couponPaid += b.couponDue;
    skepticismDelta -= 5; // marchés satisfaits : aucune crise déclenchée
  }

  return { bonds: stillActive, couponPaid, skepticismDelta };
}

// ── Label marché ──────────────────────────────────────────────────────────────

export function getMarketLabel(skepticism: number): { label: string; color: string } {
  if (skepticism >= 70) return { label: "Marchés méfiants",  color: "#e54848" };
  if (skepticism >= 40) return { label: "Marchés prudents",  color: "#e8a93a" };
  return                       { label: "Marchés confiants", color: "#3fbe7a" };
}

// ── Constante d'état initial ──────────────────────────────────────────────────

export const INITIAL_CAT_BOND_MARKET: CatBondMarketState = {
  totalIssuances: 0,
  marketSkepticism: 0,
};
