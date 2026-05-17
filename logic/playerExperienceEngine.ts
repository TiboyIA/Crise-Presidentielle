import { BUILDINGS } from "@/data/buildings";
import { MISSION_POOL } from "@/data/missions";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { canAfford } from "@/logic/buildingEngine";
import { clockNow } from "@/logic/simulationClock";
import type { MissionDef, StrategyGameState } from "@/types/strategy";

export interface FrustrationFactors {
  resourceBlocked: number;    // 0–30
  operationFailRate: number;  // 0–20
  missionStalled: number;     // 0–20
  waitingOnly: number;        // 0–15
  unresolvedCrisis: number;   // 0–15
}

export interface PlayerRecommendation {
  conseil: string;
  missionTitle?: string;
  missionDefId?: string;
  actionLabel: string;
  actionRoute: string;
}

export interface FrustrationResult {
  score: number; // 0–100
  factors: FrustrationFactors;
  recommendation: PlayerRecommendation | null; // non-null only when score > 70
}

export function computeFrustration(state: StrategyGameState): FrustrationResult {
  const factors = computeFactors(state);
  const score = Math.min(
    100,
    Math.round(
      factors.resourceBlocked +
        factors.operationFailRate +
        factors.missionStalled +
        factors.waitingOnly +
        factors.unresolvedCrisis,
    ),
  );
  return {
    score,
    factors,
    recommendation: score > 70 ? buildRecommendation(state, factors) : null,
  };
}

function computeFactors(state: StrategyGameState): FrustrationFactors {
  // 1. RESSOURCES INSUFFISANTES ─────────────────────────────────────────────
  // Proxy: ratio of upgradeable buildings the player can't currently afford.
  // Weighted by mandateDay so early-game poverty doesn't penalise beginners.
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
    const ramp = Math.min(1, state.mandateDay / 5); // ramps 0→1 over first 5 days
    resourceBlocked = Math.round(ratio * 30 * ramp);
  }

  // 2. ÉCHECS D'OPÉRATIONS ───────────────────────────────────────────────────
  // Only meaningful after a sample of ≥3 operations.
  let operationFailRate = 0;
  if (state.stats.totalOperations >= 3) {
    const winRate = state.stats.operationsWon / state.stats.totalOperations;
    if (winRate < 0.5) {
      operationFailRate = Math.round((0.5 - winRate) * 2 * 20);
    }
  }

  // 3. MISSIONS BLOQUÉES ────────────────────────────────────────────────────
  // No mission completed in current cycle + missions are old.
  let missionStalled = 0;
  if (state.missions.length > 0 && !state.missions.some((m) => m.completed)) {
    const oldest = Math.min(...state.missions.map((m) => m.assignedAt));
    const ageHours = (clockNow() - oldest) / 3_600_000;
    // 0h → 0, 2h → 10, 4h+ → 20
    missionStalled = Math.round(Math.min(20, (ageHours / 4) * 20));
  }

  // 4. QUE DE L'ATTENTE ─────────────────────────────────────────────────────
  // Many queues running, nothing new affordable to start.
  let waitingOnly = 0;
  const buildingsBusy = state.buildings.filter((b) => b.upgradeEndTime !== null).length;
  const researchBusy = state.strategyResearch?.inProgress != null ? 1 : 0;
  const trainingBusy = state.trainingQueue.length > 0 ? 1 : 0;
  const totalBusy = buildingsBusy + researchBusy + trainingBusy;
  const canStartBuilding = upgradeableBuildings.some((b) =>
    canAfford(BUILDINGS[b.id].levels[b.level].cost, state.resources),
  );
  if (totalBusy >= 2 && !canStartBuilding && state.mandateDay >= 2) {
    waitingOnly = Math.min(15, totalBusy * 5);
  }

  // 5. CRISE CRITIQUE NON RÉSOLUE ───────────────────────────────────────────
  const pendingCritical = state.news.pendingIds.filter((id) => {
    const evt = NEWS_EVENT_MAP[id];
    return evt?.urgency === "critique" && evt?.isInteractive;
  });
  const unresolvedCrisis = Math.min(15, pendingCritical.length * 15);

  return { resourceBlocked, operationFailRate, missionStalled, waitingOnly, unresolvedCrisis };
}

function buildRecommendation(
  state: StrategyGameState,
  factors: FrustrationFactors,
): PlayerRecommendation {
  // Find the mission with highest progress ratio (most atteignable).
  let bestMission: MissionDef | null = null;
  let bestRatio = -1;
  for (const pm of state.missions) {
    if (pm.completed) continue;
    const def = MISSION_POOL.find((d) => d.id === pm.defId);
    if (!def) continue;
    const ratio = pm.target > 0 ? pm.progress / pm.target : 0;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestMission = def;
    }
  }

  // Pick conseil + action based on dominant factor.
  if (factors.unresolvedCrisis >= 15) {
    return {
      conseil: "Une crise critique attend votre décision. Chaque heure sans réponse affaiblit votre nation.",
      missionTitle: bestMission?.title,
      missionDefId: bestMission?.id,
      actionLabel: "Ouvrir le Journal de Crise",
      actionRoute: "/journal-crise",
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
