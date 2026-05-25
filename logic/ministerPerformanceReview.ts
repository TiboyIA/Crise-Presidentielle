import type { StrategyGameState, StrategyMinister } from "@/types/strategy";
import { MINISTER_INDICATOR } from "@/data/strategyMinisters";

// ── Types publics ─────────────────────────────────────────────────────────────

export type PerformanceRating = "excellent" | "solide" | "fragile" | "toxique" | "a_remplacer";

export interface RatingInfo {
  rating: PerformanceRating;
  label: string;
  color: string;
}

export interface MinisterPerformanceReport {
  ministerId: string;
  score: number;           // 0-100
  rating: PerformanceRating;
  label: string;           // label localisé
  color: string;           // couleur du badge
  summary: string;         // 1 phrase max
  shouldReplace: boolean;  // true pour toxique / à remplacer
}

// ── Table de ratings ──────────────────────────────────────────────────────────

export const RATING_INFO: Record<PerformanceRating, RatingInfo> = {
  excellent:   { rating: "excellent",   label: "Excellent",    color: "#3fbe7a" },
  solide:      { rating: "solide",      label: "Solide",       color: "#4a9fff" },
  fragile:     { rating: "fragile",     label: "Fragile",      color: "#e8a93a" },
  toxique:     { rating: "toxique",     label: "Toxique",      color: "#f59a3a" },
  a_remplacer: { rating: "a_remplacer", label: "À remplacer",  color: "#e54848" },
};

// ── Score ─────────────────────────────────────────────────────────────────────
//
// Pondération :
//   compétence      28 %  — capacité brute à gérer le portefeuille
//   loyauté         22 %  — alignement politique
//   faible fatigue  14 %  — disponibilité réelle
//   faible risque   14 %  — sécurité médiatique
//   santé indicateur 14 % — impact réel sur les indicateurs nationaux
//   + bonus discret si indicateur > 70 (ministre en tête)
//   - malus conflit  8    (plafonné, n'écrase pas le reste)

function computeScore(
  minister: StrategyMinister,
  fatigue: number,
  inConflict: boolean,
  indicatorHealth: number,
): number {
  const base =
    minister.competence              * 0.28 +
    minister.loyalty                 * 0.22 +
    (100 - fatigue)                  * 0.14 +
    (100 - minister.scandalRisk)     * 0.14 +
    indicatorHealth                  * 0.14;

  const conflictPenalty = inConflict ? 8 : 0;
  const indicatorBonus  = indicatorHealth > 70 ? 3 : 0;

  return Math.min(100, Math.max(0, Math.round(base + indicatorBonus - conflictPenalty)));
}

function ratingFromScore(score: number): PerformanceRating {
  if (score >= 72) return "excellent";
  if (score >= 55) return "solide";
  if (score >= 38) return "fragile";
  if (score >= 22) return "toxique";
  return "a_remplacer";
}

// ── Phrase de synthèse ────────────────────────────────────────────────────────
//
// On détecte le facteur le plus pénalisant et on le nomme clairement.
// La phrase reste neutre — le système ne porte pas de jugement moral.

function buildSummary(
  minister: StrategyMinister,
  fatigue: number,
  inConflict: boolean,
  indicatorHealth: number,
  rating: PerformanceRating,
): string {
  if (minister.scandalRisk > 65) return "Son risque de scandale fragilise la coalition.";
  if (minister.loyalty < 35)     return "Sa loyauté chancelante inquiète l'entourage présidentiel.";
  if (fatigue > 72)              return "L'épuisement nuit à l'efficacité de ses décisions.";
  if (inConflict)                return "Son conflit interne pèse sur la cohésion du cabinet.";
  if (minister.competence < 45)  return "Sa compétence limitée ralentit son portefeuille.";
  if (indicatorHealth < 28)      return "Son secteur traverse une période difficile.";
  if (minister.scandalRisk > 45) return "Le risque de scandale reste à surveiller.";
  if (minister.loyalty < 50)     return "Sa loyauté reste fragile, une surveillance s'impose.";
  if (fatigue > 55)              return "La charge de travail commence à se faire sentir.";

  switch (rating) {
    case "excellent": return "Pilier du Cabinet, performant et fiable.";
    case "solide":    return "Profil équilibré, gestion maîtrisée.";
    default:          return "Profil stable, sans signaux d'alerte immédiats.";
  }
}

// ── Fonction principale ───────────────────────────────────────────────────────

export function evaluateCabinetPerformance(
  state: StrategyGameState,
): MinisterPerformanceReport[] {
  const fatigueMap  = state.ministerFatigue ?? {};
  const conflicts   = state.cabinetConflicts ?? [];
  const indicators  = state.nationalIndicators ?? {
    popularity: 60, economy: 55, security: 50,
    ecology: 45, cohesion: 60, publicBudget: 20,
  };

  return state.strategyMinisters.map((minister): MinisterPerformanceReport => {
    const fatigue  = fatigueMap[minister.id] ?? 0;
    const inConflict = conflicts.some(
      (c) => c.ministerA === minister.id || c.ministerB === minister.id,
    );

    // Santé de l'indicateur lié au portefeuille (0-100)
    // publicBudget est -150..+100 → ramener en 0-100
    const indicatorKey = MINISTER_INDICATOR[minister.id as keyof typeof MINISTER_INDICATOR];
    let indicatorHealth = 50;
    if (indicatorKey && indicatorKey !== "publicBudget") {
      indicatorHealth = indicators[indicatorKey as keyof typeof indicators] as number;
    } else if (indicatorKey === "publicBudget") {
      indicatorHealth = Math.round(((indicators.publicBudget + 150) / 250) * 100);
    }

    const score   = computeScore(minister, fatigue, inConflict, indicatorHealth);
    const rating  = ratingFromScore(score);
    const info    = RATING_INFO[rating];
    const summary = buildSummary(minister, fatigue, inConflict, indicatorHealth, rating);

    return {
      ministerId:    minister.id,
      score,
      rating,
      label:         info.label,
      color:         info.color,
      summary,
      shouldReplace: rating === "toxique" || rating === "a_remplacer",
    };
  });
}

// ── Résumé exécutif ───────────────────────────────────────────────────────────

export interface CabinetHealthSummary {
  avgScore: number;
  countByRating: Record<PerformanceRating, number>;
  replacementCount: number;
}

export function summarizeCabinetHealth(
  reports: MinisterPerformanceReport[],
): CabinetHealthSummary {
  const avg = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)
    : 0;

  const counts: Record<PerformanceRating, number> = {
    excellent: 0, solide: 0, fragile: 0, toxique: 0, a_remplacer: 0,
  };
  for (const r of reports) counts[r.rating]++;

  return {
    avgScore:         avg,
    countByRating:    counts,
    replacementCount: counts.toxique + counts.a_remplacer,
  };
}
