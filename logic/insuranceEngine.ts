import type { InsurancePolicy, InsuranceProductId, NewsEvent, StrategyGameState } from "@/types/strategy";
import { INSURANCE_PRODUCTS, type InsuranceProductDef } from "@/data/insuranceProducts";
import { computeSolvencyScore } from "@/logic/solvencyEngine";

// ── Risk multiplier ───────────────────────────────────────────────────────────
// Returns 0.0 (no extra cost) → 0.8 (premium nearly doubled) based on neglected domain.

function computeRiskMultiplier(productId: InsuranceProductId, state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const res = state.resources;

  switch (productId) {
    case "cyber": {
      const deficit = Math.max(0, 50 - res.cyberDefense);
      return (deficit / 50) * 0.8;
    }
    case "climat": {
      const deficit = Math.max(0, 50 - ind.ecology);
      return (deficit / 50) * 0.7;
    }
    case "energie": {
      const scaled = Math.max(0, 200 - res.energy);
      return Math.min(0.8, scaled / 400);
    }
    case "dette": {
      const debt = state.nationalDebt ?? 0;
      return Math.min(0.8, (debt / 500) * 0.8);
    }
    case "industrie": {
      const deficit = Math.max(0, 50 - ind.economy);
      return (deficit / 50) * 0.7;
    }
    case "troubles_sociaux": {
      const deficit = Math.max(0, 50 - ind.cohesion);
      return (deficit / 50) * 0.75;
    }
  }
}

// ── Dynamic premium ───────────────────────────────────────────────────────────
// Base × (1 + riskMultiplier + claimMalus)

const CLAIM_MALUS = 0.25; // +25% per past claim

export function computeDynamicPremium(
  productId: InsuranceProductId,
  state: StrategyGameState,
  existingPolicy?: InsurancePolicy,
): number {
  const def = INSURANCE_PRODUCTS[productId];
  const riskMultiplier = computeRiskMultiplier(productId, state);
  const claimMalus = (existingPolicy?.claimCount ?? 0) * CLAIM_MALUS;
  const solvencyMultiplier = computeSolvencyScore(state).premiumMultiplier;
  return Math.round(def.basePremiumCost * (1 + riskMultiplier + claimMalus) * solvencyMultiplier);
}

// ── Event coverage ────────────────────────────────────────────────────────────

export function isEventCovered(def: InsuranceProductDef, event: NewsEvent): boolean {
  if (def.coveredEventIds.includes(event.id)) return true;
  if (def.coveredNewsTypes.length > 0 && def.coveredNewsTypes.includes(event.type)) return true;
  return false;
}

// ── Payout calculation ────────────────────────────────────────────────────────
// moneyCost must be negative (player cost). Returns 0 if below deductible.

export function computeInsurancePayout(def: InsuranceProductDef, moneyCost: number): number {
  const drain = Math.abs(moneyCost);
  if (drain <= def.deductible) return 0;
  const covered = (drain - def.deductible) * def.coverageRate;
  return Math.min(def.maxPayout, Math.round(covered));
}

// ── Policy management ─────────────────────────────────────────────────────────

export function buyInsurance(
  policies: InsurancePolicy[],
  productId: InsuranceProductId,
  mandateDay: number,
): InsurancePolicy[] {
  const existing = policies.find((p) => p.productId === productId);
  if (existing) {
    return policies.map((p) =>
      p.productId === productId ? { ...p, active: true, activatedAtDay: mandateDay } : p,
    );
  }
  return [...policies, { productId, active: true, claimCount: 0, activatedAtDay: mandateDay }];
}

export function cancelInsurance(
  policies: InsurancePolicy[],
  productId: InsuranceProductId,
): InsurancePolicy[] {
  return policies.map((p) =>
    p.productId === productId ? { ...p, active: false } : p,
  );
}

export function applyInsuranceClaim(
  policies: InsurancePolicy[],
  productId: InsuranceProductId,
): InsurancePolicy[] {
  return policies.map((p) =>
    p.productId === productId ? { ...p, claimCount: p.claimCount + 1 } : p,
  );
}

// ── Risk label for UI ─────────────────────────────────────────────────────────

export function getRiskLabel(productId: InsuranceProductId, state: StrategyGameState): { label: string; color: string } {
  const m = computeRiskMultiplier(productId, state);
  if (m > 0.5) return { label: "Risque élevé",  color: "#e54848" };
  if (m > 0.2) return { label: "Risque modéré", color: "#e8a93a" };
  return              { label: "Risque faible",  color: "#3fbe7a" };
}
