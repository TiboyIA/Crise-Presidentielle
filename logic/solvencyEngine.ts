import type { StrategyGameState } from "@/types/strategy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SolvencyBand = "resilient" | "correct" | "vulnerable" | "risky" | "critical";

export interface SolvencyBreakdown {
  budget:      number; // 0-20  — liquidités disponibles
  debt:        number; // 0-20  — maîtrise de la dette
  reserves:    number; // 0-10  — fonds de résilience
  stability:   number; // 0-12  — sécurité intérieure
  cohesion:    number; // 0-8   — cohésion sociale
  cyberDefense:number; // 0-10  — bouclier cyber
  energy:      number; // 0-5   — souveraineté énergétique
  insurance:   number; // 0-8   — couverture assurantielle
  marketRisk:  number; // 0-7   — confiance des marchés
}

export interface SolvencyResult {
  score:             number;       // 0-100
  band:              SolvencyBand;
  label:             string;
  color:             string;
  breakdown:         SolvencyBreakdown;
  premiumMultiplier: number;       // ≥1.0 — surcoût assurance si solvabilité faible
}

// ── Bandes et palette ─────────────────────────────────────────────────────────

const BAND_CONFIG: Record<SolvencyBand, { label: string; color: string }> = {
  resilient: { label: "Pays résilient",            color: "#3fbe7a" },
  correct:   { label: "Solvabilité correcte",       color: "#52c97a" },
  vulnerable:{ label: "Vulnérabilité détectée",     color: "#e8a93a" },
  risky:     { label: "Risque de crise financière", color: "#e54848" },
  critical:  { label: "Quasi-insolvabilité",        color: "#ff2040" },
};

export const SOLVENCY_THRESHOLDS = { resilient: 80, correct: 60, vulnerable: 40, risky: 20 } as const;

// ── Moteur de calcul ──────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeSolvencyScore(state: StrategyGameState): SolvencyResult {
  const res    = state.resources;
  const ind    = state.nationalIndicators;
  const debt   = Math.max(0, state.nationalDebt ?? 0);
  const fund   = state.resilienceFund;
  const market = state.catBondMarket ?? { totalIssuances: 0, marketSkepticism: 0 };
  const activePolicies = (state.insurancePolicies ?? []).filter((p) => p.active).length;

  // 1. Budget liquide (0-20)
  const budget = clamp(res.money, 0, 600) / 600 * 20;

  // 2. Maîtrise de la dette (0-20) — dette nulle ou négative = score max
  const debtScore = debt === 0 ? 20 : clamp((1000 - debt) / 1000, 0, 1) * 20;

  // 3. Fonds de résilience (0-10)
  const reserves = clamp((fund?.balance ?? 0) / 500, 0, 1) * 10;

  // 4. Sécurité intérieure (0-12)
  const stability = ind.security / 100 * 12;

  // 5. Cohésion sociale (0-8)
  const cohesion = ind.cohesion / 100 * 8;

  // 6. Cyberdéfense (0-10) — plafond à 150 pour éviter qu'un seul levier domine
  const cyberDefense = clamp(res.cyberDefense / 150, 0, 1) * 10;

  // 7. Souveraineté énergétique (0-5)
  const energy = clamp(res.energy / 300, 0, 1) * 5;

  // 8. Couverture assurantielle (0-8) — 6 produits disponibles
  const insurance = (activePolicies / 6) * 8;

  // 9. Confiance des marchés (0-7) — méfiance élevée = score bas
  const marketRisk = (1 - market.marketSkepticism / 100) * 7;

  const raw   = budget + debtScore + reserves + stability + cohesion + cyberDefense + energy + insurance + marketRisk;
  const score = Math.round(clamp(raw, 0, 100));

  const band: SolvencyBand =
    score >= SOLVENCY_THRESHOLDS.resilient  ? "resilient"  :
    score >= SOLVENCY_THRESHOLDS.correct    ? "correct"    :
    score >= SOLVENCY_THRESHOLDS.vulnerable ? "vulnerable" :
    score >= SOLVENCY_THRESHOLDS.risky      ? "risky"      :
    "critical";

  const { label, color } = BAND_CONFIG[band];

  // Prime d'assurance majorée si solvabilité faible (assureurs prudents)
  const premiumMultiplier =
    score < 20 ? 1.30 :
    score < 40 ? 1.20 :
    score < 60 ? 1.10 :
    1.00;

  return {
    score,
    band,
    label,
    color,
    breakdown: {
      budget:      Math.round(budget),
      debt:        Math.round(debtScore),
      reserves:    Math.round(reserves),
      stability:   Math.round(stability),
      cohesion:    Math.round(cohesion),
      cyberDefense:Math.round(cyberDefense),
      energy:      Math.round(energy),
      insurance:   Math.round(insurance),
      marketRisk:  Math.round(marketRisk),
    },
    premiumMultiplier,
  };
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

export function getSolvencyBandConfig(band: SolvencyBand): { label: string; color: string } {
  return BAND_CONFIG[band];
}

/** Conseil court affiché selon la bande. */
export function getSolvencyHint(band: SolvencyBand): string {
  switch (band) {
    case "resilient":  return "Vos finances nationales sont solides. Continuez à investir dans la résilience.";
    case "correct":    return "La situation est sous contrôle. Surveillez la dette et les réserves.";
    case "vulnerable": return "Des fragilités structurelles existent. Réduisez la dette et renforcez les assurances.";
    case "risky":      return "Risque élevé de crise financière. Agissez sur le budget et la dette immédiatement.";
    case "critical":   return "Insolvabilité imminente. Toute nouvelle crise pourrait déstabiliser l'État.";
  }
}
