/**
 * LOT 12 — visuels painterly navy+ambre pour l'écran /stats.
 *
 * - 9 illustrations pour les causes de défaite (Record<DefeatReason, …>).
 * - 6 vignettes pour les KPI cards.
 * - 1 illustration pour l'empty state (aucune partie jouée).
 *
 * Les 6 visuels de stratégies de débat sont déjà fournis par
 * `STRATEGY_IMAGES` dans `data/electionImages.ts` (LOT 7) et sont
 * réexportés ici pour que `/stats` ait un point d'accès unique.
 *
 * Toutes les illustrations respectent la DA :
 * no faces, no real flags, no readable text/numbers, no recognizable
 * geography.
 */
import type { ImageSourcePropType } from "react-native";
import type { DefeatReason } from "@/storage/statsStorage";
import { STRATEGY_IMAGES } from "@/data/electionImages";

export const DEFEAT_REASON_IMAGES: Record<DefeatReason, ImageSourcePropType> = {
  popularity_collapse: require("@/assets/images/stats/defeat_popularity.png"),
  cohesion_collapse: require("@/assets/images/stats/defeat_cohesion.png"),
  authority_collapse: require("@/assets/images/stats/defeat_authority.png"),
  security_collapse: require("@/assets/images/stats/defeat_security.png"),
  budget_collapse: require("@/assets/images/stats/defeat_budget.png"),
  debt_explosion: require("@/assets/images/stats/defeat_debt.png"),
  lost_election: require("@/assets/images/stats/defeat_election.png"),
  max_turns: require("@/assets/images/stats/defeat_max_turns.png"),
  other: require("@/assets/images/stats/defeat_other.png"),
};

export type StatsKpiKey =
  | "mandats"
  | "winrate"
  | "victories"
  | "defeats"
  | "avgTurns"
  | "avgScore";

export const KPI_IMAGES: Record<StatsKpiKey, ImageSourcePropType> = {
  mandats: require("@/assets/images/stats/kpi_mandats.png"),
  winrate: require("@/assets/images/stats/kpi_winrate.png"),
  victories: require("@/assets/images/stats/kpi_victories.png"),
  defeats: require("@/assets/images/stats/kpi_defeats.png"),
  avgTurns: require("@/assets/images/stats/kpi_avg_turns.png"),
  avgScore: require("@/assets/images/stats/kpi_avg_score.png"),
};

export const STATS_EMPTY: ImageSourcePropType = require("@/assets/images/stats/empty_state.png");

export { STRATEGY_IMAGES };
