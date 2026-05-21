import type { ResilienceFund, StrategyResources } from "@/types/strategy";

export type ContributionTier = "faible" | "moyenne" | "forte";

export interface ContributionDef {
  label:       string;
  moneyCost:   number;   // prélevé immédiatement sur resources.money
  balanceGain: number;   // ajouté à fund.balance
  description: string;
}

// ── Paliers de contribution ───────────────────────────────────────────────────

export const CONTRIBUTION_TIERS: Record<ContributionTier, ContributionDef> = {
  faible:  { label: "Faible",  moneyCost: 150,  balanceGain: 300,  description: "Protection légère, coût modeste." },
  moyenne: { label: "Moyenne", moneyCost: 400,  balanceGain: 800,  description: "Protection intermédiaire recommandée." },
  forte:   { label: "Forte",   moneyCost: 800,  balanceGain: 1800, description: "Protection maximale, pèse sur la trésorerie." },
};

export const INITIAL_RESILIENCE_FUND: ResilienceFund = {
  balance: 0,
  monthlyContribution: 0,
  protectionLevel: 0,
};

// ── Protection level ─────────────────────────────────────────────────────────
// 0 balance → 0 %, 2 000+ balance → 50 % (plafond)

export function computeProtectionPct(balance: number): number {
  return Math.min(50, Math.round(balance / 40));
}

// ── Contribution ─────────────────────────────────────────────────────────────

export function applyFundContribution(
  fund: ResilienceFund,
  tier: ContributionTier,
  resources: StrategyResources,
): { fund: ResilienceFund; resources: StrategyResources; success: boolean; reason?: string } {
  const def = CONTRIBUTION_TIERS[tier];
  if (resources.money < def.moneyCost) {
    return { fund, resources, success: false, reason: "Fonds insuffisants" };
  }
  const newBalance = fund.balance + def.balanceGain;
  return {
    fund: {
      balance: newBalance,
      monthlyContribution: def.moneyCost,
      protectionLevel: computeProtectionPct(newBalance),
    },
    resources: { ...resources, money: resources.money - def.moneyCost },
    success: true,
  };
}

// ── Paiement automatique lors d'une crise ───────────────────────────────────
// S'active uniquement si le coût en argent est significativement négatif.

export const FUND_TRIGGER_THRESHOLD = 100; // abs(moneyCost) doit dépasser ce seuil

export function applyFundToMoneyCost(
  fund: ResilienceFund,
  moneyCost: number,          // valeur négative (ex : -500)
  mandateDay: number,
): { fund: ResilienceFund; actualCost: number; savings: number } {
  const drain = Math.abs(moneyCost);
  if (fund.balance <= 0 || drain < FUND_TRIGGER_THRESHOLD) {
    return { fund, actualCost: moneyCost, savings: 0 };
  }
  const protPct = computeProtectionPct(fund.balance);
  const savings = Math.min(fund.balance, Math.round(drain * protPct / 100));
  const newBalance = Math.max(0, fund.balance - savings);
  return {
    fund: {
      balance: newBalance,
      monthlyContribution: fund.monthlyContribution,
      protectionLevel: computeProtectionPct(newBalance),
      lastPayoutAt: mandateDay,
    },
    actualCost: -(drain - savings),
    savings,
  };
}

// ── Labels d'affichage ────────────────────────────────────────────────────────

export function getProtectionLabel(pct: number): { label: string; color: string } {
  if (pct === 0)   return { label: "Aucune",  color: "#555" };
  if (pct < 15)   return { label: "Faible",  color: "#e8a93a" };
  if (pct < 30)   return { label: "Modérée", color: "#4a9fff" };
  return               { label: "Forte",   color: "#3fbe7a" };
}
