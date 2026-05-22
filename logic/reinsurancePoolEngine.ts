// ── Pool de Réassurance Alliée ────────────────────────────────────────────────
// Les alliances actives forment un pool de réassurance qui absorbe une fraction
// du coût résiduel d'une crise. Plafonné à 10 %. Le pool se fatigue sous les
// sinistres répétés (poolStress) et récupère naturellement entre les crises.

export interface ReinsurancePool {
  poolStress: number;    // 0-100 — monte à chaque sinistre, retombe avec le temps
  lastClaimAt?: number;  // actionCount du dernier sinistre
}

export interface ReinsuranceClaimResult {
  absorbed: number;       // M€ absorbés par le pool
  influenceCost: number;  // influence diplomatique perdue (friction alliée)
  newPool: ReinsurancePool;
}

// ── Paramètres du pool ────────────────────────────────────────────────────────

const COVERAGE_PER_ALLY = 0.035;  // 3,5 % de couverture par allié actif
const MAX_COVERAGE      = 0.10;   // plafond à 10 %
const MIN_STRESS_FACTOR = 0.40;   // réduction maximale par stress (60 % de perte)

// ── Taux de couverture effectif ───────────────────────────────────────────────

/**
 * Retourne le taux de couverture en fraction (0–0,10) selon le nombre
 * d'alliés actifs et le stress courant du pool.
 */
export function computeCoverageRate(pool: ReinsurancePool, membersCount: number): number {
  if (membersCount === 0) return 0;
  const base = Math.min(MAX_COVERAGE, membersCount * COVERAGE_PER_ALLY);
  // Stress 0 → facteur 1,0 ; stress 100 → facteur max(0,4 ; 1 - 100/150 ≈ 0,33 → 0,4)
  const stressFactor = Math.max(MIN_STRESS_FACTOR, 1 - pool.poolStress / 150);
  return base * stressFactor;
}

// ── Sinistre sur le pool ──────────────────────────────────────────────────────

/**
 * Calcule l'absorption du pool pour un coût résiduel donné.
 * Retourne null si aucun allié ou si le montant absorbé est nul.
 */
export function claimReinsurance(
  pool:          ReinsurancePool,
  membersCount:  number,
  uncoveredCost: number,
  actionCount:   number,
): ReinsuranceClaimResult | null {
  const rate = computeCoverageRate(pool, membersCount);
  if (rate <= 0 || uncoveredCost <= 0) return null;

  const absorbed = Math.round(uncoveredCost * rate);
  if (absorbed === 0) return null;

  // Plus le sinistre est élevé, plus le pool est stressé
  const stressGain = Math.min(30, 10 + Math.round(absorbed / 40));
  // Friction diplomatique proportionnelle à l'absorption (min 5 influence)
  const influenceCost = Math.max(5, Math.round(absorbed / 25));

  return {
    absorbed,
    influenceCost,
    newPool: {
      poolStress: Math.min(100, pool.poolStress + stressGain),
      lastClaimAt: actionCount,
    },
  };
}

// ── Récupération naturelle du pool ────────────────────────────────────────────

/** Réduit le stress du pool de 8 points (appelé tous les 10 jours de mandat). */
export function decayPoolStress(pool: ReinsurancePool): ReinsurancePool {
  if (pool.poolStress <= 0) return pool;
  return { ...pool, poolStress: Math.max(0, pool.poolStress - 8) };
}

// ── Labels de stress pour l'interface ────────────────────────────────────────

export function getPoolStressLabel(stress: number): string {
  if (stress < 20) return "Opérationnel";
  if (stress < 50) return "Sous tension";
  if (stress < 80) return "Fragilisé";
  return "Surchargé";
}

export function getPoolStressColor(stress: number): string {
  if (stress < 20) return "#3fbe7a";
  if (stress < 50) return "#e8a93a";
  if (stress < 80) return "#FF8040";
  return "#e54848";
}
