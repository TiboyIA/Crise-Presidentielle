import { BUILDINGS } from "@/data/buildings";
import { MISSION_POOL } from "@/data/missions";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { canAfford } from "@/logic/buildingEngine";
import { clockNow } from "@/logic/simulationClock";
import type { MissionDef, StrategyGameState } from "@/types/strategy";

// ── Score bands ────────────────────────────────────────────────────────────────
// 0–30   : normal      — légère insatisfaction, rien d'alarmant
// 31–60  : attention   — signaux précoces de blocage
// 61–80  : décrochage  — risque de départ du joueur
// 81–100 : forte       — frustration sévère, intervention nécessaire

export type FrustrationBand = "normal" | "attention" | "decrochage" | "forte";

export const BAND_LABELS: Record<FrustrationBand, string> = {
  normal:     "Normal",
  attention:  "Attention",
  decrochage: "Décrochage",
  forte:      "Frustration forte",
};

// Couleur par bande — alignées sur PALETTE (no import pour éviter la dépendance RN)
export const BAND_COLORS: Record<FrustrationBand, string> = {
  normal:     "#3fbe7a",
  attention:  "#e8a93a",
  decrochage: "#f59a3a",
  forte:      "#e54848",
};

export function getBand(score: number): FrustrationBand {
  if (score <= 30) return "normal";
  if (score <= 60) return "attention";
  if (score <= 80) return "decrochage";
  return "forte";
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FrustrationFactors {
  resourceBlocked:    number; // 0–30  tentatives bloquées par ressources insuffisantes
  operationFailRate:  number; // 0–20  échecs d'opérations successifs
  missionStalled:     number; // 0–20  aucune mission complétée récemment
  waitingOnly:        number; // 0–15  que de l'attente, rien de déclenchable
  unresolvedCrisis:   number; // 0–15  crise critique non traitée
  progressionBlocked: number; // 0–10  progression globale bloquée (classement + indicateurs)
}

export interface PlayerRecommendation {
  conseil:       string;
  missionTitle?: string;
  missionDefId?: string;
  actionLabel:   string;
  actionRoute:   string;
}

export interface FrustrationResult {
  score:          number;              // 0–100
  band:           FrustrationBand;
  factors:        FrustrationFactors;
  recommendation: PlayerRecommendation | null; // non-null seulement si score > 70
}

// ── API publique ───────────────────────────────────────────────────────────────

/**
 * Calcule un score de frustration local (0–100) à partir de l'état courant.
 * Entièrement synchrone, local, aucune donnée personnelle transmise.
 */
export function computeFrustration(state: StrategyGameState): FrustrationResult {
  const factors = computeFactors(state);
  const score = Math.min(
    100,
    Math.round(
      factors.resourceBlocked +
      factors.operationFailRate +
      factors.missionStalled +
      factors.waitingOnly +
      factors.unresolvedCrisis +
      factors.progressionBlocked,
    ),
  );
  const band = getBand(score);
  return {
    score,
    band,
    factors,
    recommendation: score > 70 ? buildRecommendation(state, factors) : null,
  };
}

// ── Calcul des facteurs ────────────────────────────────────────────────────────

function computeFactors(state: StrategyGameState): FrustrationFactors {
  // 1. RESSOURCES INSUFFISANTES ─────────────────────────────────────────────
  // Ratio de bâtiments améliorables que le joueur ne peut pas se payer.
  // Monté progressivement sur les 5 premiers jours (ramp) pour ne pas pénaliser
  // les débutants dès le départ.
  let resourceBlocked = 0;
  const upgradeableBuildings = state.buildings.filter((b) => {
    const def = BUILDINGS[b.id];
    return b.level > 0 && b.level < def.maxLevel && b.upgradeEndTime === null;
  });
  if (upgradeableBuildings.length > 0) {
    const unaffordable = upgradeableBuildings.filter(
      (b) => !canAfford(BUILDINGS[b.id].levels[b.level].cost, state.resources),
    );
    const ratio = unaffordable.length / upgradeableBuildings.length;
    const ramp = Math.min(1, state.mandateDay / 5);
    resourceBlocked = Math.round(ratio * 30 * ramp);
  }

  // 2. ÉCHECS D'OPÉRATIONS SUCCESSIFS ───────────────────────────────────────
  // Significatif seulement après au moins 3 opérations lancées.
  let operationFailRate = 0;
  if (state.stats.totalOperations >= 3) {
    const winRate = state.stats.operationsWon / state.stats.totalOperations;
    if (winRate < 0.5) {
      operationFailRate = Math.round((0.5 - winRate) * 2 * 20);
    }
  }

  // 3. AUCUNE MISSION COMPLÉTÉE RÉCEMMENT ───────────────────────────────────
  // Si aucune mission n'est complétée et que les missions sont anciennes.
  let missionStalled = 0;
  if (state.missions.length > 0 && !state.missions.some((m) => m.completed)) {
    const oldest = Math.min(...state.missions.map((m) => m.assignedAt));
    const ageHours = (clockNow() - oldest) / 3_600_000;
    // 0h → 0, 2h → 10, 4h+ → 20
    missionStalled = Math.round(Math.min(20, (ageHours / 4) * 20));
  }

  // 4. TROP D'ATTENTE — RIEN DE DÉCLENCHABLE ────────────────────────────────
  // Files chargées (bâtiment + recherche + entraînement) mais aucun démarrage
  // possible faute de ressources.
  let waitingOnly = 0;
  const buildingsBusy = state.buildings.filter((b) => b.upgradeEndTime !== null).length;
  const researchBusy  = state.strategyResearch?.inProgress != null ? 1 : 0;
  const trainingBusy  = state.trainingQueue.length > 0 ? 1 : 0;
  const totalBusy = buildingsBusy + researchBusy + trainingBusy;
  const canStartBuilding = upgradeableBuildings.some((b) =>
    canAfford(BUILDINGS[b.id].levels[b.level].cost, state.resources),
  );
  if (totalBusy >= 2 && !canStartBuilding && state.mandateDay >= 2) {
    waitingOnly = Math.min(15, totalBusy * 5);
  }

  // 5. CRISE CRITIQUE NON TRAITÉE ────────────────────────────────────────────
  const pendingCritical = state.news.pendingIds.filter((id) => {
    const evt = NEWS_EVENT_MAP[id];
    return evt?.urgency === "critique" && evt?.isInteractive;
  });
  const unresolvedCrisis = Math.min(15, pendingCritical.length * 15);

  // 6. PROGRESSION GLOBALE BLOQUÉE ──────────────────────────────────────────
  // Combinaison de deux signaux :
  //   a) Classement en bas de tableau après plusieurs jours de jeu
  //   b) Indicateurs nationaux en zone critique (popularité ou sécurité < 25)
  let progressionBlocked = 0;
  if (state.mandateDay >= 15 && state.ranking.length > 0) {
    const playerIdx = state.ranking.findIndex((r) => r.id === "player");
    if (playerIdx >= 0) {
      const rankPct = (playerIdx + 1) / state.ranking.length;
      if (rankPct >= 0.75) progressionBlocked += 5;
    }
  }
  const { popularity, security } = state.nationalIndicators;
  if (popularity < 25 || security < 25) {
    progressionBlocked = Math.min(10, progressionBlocked + 5);
  }

  return {
    resourceBlocked,
    operationFailRate,
    missionStalled,
    waitingOnly,
    unresolvedCrisis,
    progressionBlocked,
  };
}

// ── Conseil stratégique ────────────────────────────────────────────────────────

function buildRecommendation(
  state: StrategyGameState,
  factors: FrustrationFactors,
): PlayerRecommendation {
  const bestMission = pickBestMission(state);

  if (factors.unresolvedCrisis >= 15) {
    return {
      conseil: "Une crise critique attend votre décision. Chaque heure sans réponse affaiblit votre nation.",
      missionTitle: bestMission?.title,
      missionDefId: bestMission?.id,
      actionLabel: "Ouvrir le Journal de Crise",
      actionRoute: "/journal-crise",
    };
  }
  if (factors.progressionBlocked >= 8) {
    return {
      conseil: factors.waitingOnly >= 8
        ? "La progression est bloquée. Utilisez ce temps d'attente pour des opérations diplomatiques ou offensives."
        : "Votre nation stagne dans le classement. Des opérations ciblées contre des rivaux proches rapportent des points rapidement.",
      missionTitle: bestMission?.title,
      missionDefId: bestMission?.id,
      actionLabel: "Voir le Classement",
      actionRoute: "/ranking",
    };
  }
  if (factors.missionStalled >= 15) {
    return {
      conseil: "Vos missions semblent hors de portée. Les opérations diplomatiques débloquent de l'influence rapidement.",
      missionTitle: bestMission?.title,
      missionDefId: bestMission?.id,
      actionLabel: "Lancer une Opération",
      actionRoute: "/operations",
    };
  }
  if (factors.operationFailRate >= 10) {
    return {
      conseil: "Trop d'opérations échouent. Ciblez des pays moins hostiles ou renforcez le renseignement d'abord.",
      missionTitle: bestMission?.title,
      missionDefId: bestMission?.id,
      actionLabel: "Voir la Carte du Monde",
      actionRoute: "/worldmap",
    };
  }
  if (factors.waitingOnly >= 10) {
    return {
      conseil: "Tout est en construction. Profitez-en pour avancer sur la Recherche ou la Diplomatie.",
      missionTitle: bestMission?.title,
      missionDefId: bestMission?.id,
      actionLabel: "Lancer une Recherche",
      actionRoute: "/strategy-research",
    };
  }
  if (factors.resourceBlocked >= 20) {
    return {
      conseil: "Vos ressources sont insuffisantes. Laissez vos bâtiments produire et revenez dans quelques heures.",
      missionTitle: bestMission?.title,
      missionDefId: bestMission?.id,
      actionLabel: "Voir les Bâtiments",
      actionRoute: "/buildings",
    };
  }
  return {
    conseil: "Progressez mission par mission. Chaque action compte pour votre classement.",
    missionTitle: bestMission?.title,
    missionDefId: bestMission?.id,
    actionLabel: "Voir les Missions",
    actionRoute: "/missions",
  };
}

function pickBestMission(state: StrategyGameState): MissionDef | null {
  let best: MissionDef | null = null;
  let bestRatio = -1;
  for (const pm of state.missions) {
    if (pm.completed) continue;
    const def = MISSION_POOL.find((d) => d.id === pm.defId);
    if (!def) continue;
    const ratio = pm.target > 0 ? pm.progress / pm.target : 0;
    if (ratio > bestRatio) { bestRatio = ratio; best = def; }
  }
  return best;
}
