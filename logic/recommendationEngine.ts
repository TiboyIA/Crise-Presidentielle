import { BUILDINGS } from "@/data/buildings";
import { MISSION_POOL } from "@/data/missions";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { STRATEGY_RESEARCH_LIST } from "@/data/strategyResearch";
import { canAfford } from "@/logic/buildingEngine";
import type { StrategyGameState } from "@/types/strategy";

// ── Types publics ─────────────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  targetRoute: string;
  priority: 1 | 2 | 3; // 1 = urgent · 2 = recommandé · 3 = optionnel
}

// ── Générateurs individuels ───────────────────────────────────────────────────
// Chaque générateur retourne null si la condition n'est pas remplie.

function crisisCritical(state: StrategyGameState): Recommendation | null {
  const id = state.news.pendingIds.find((pid) => {
    const evt = NEWS_EVENT_MAP[pid];
    return evt?.urgency === "critique" && evt?.isInteractive;
  });
  if (!id) return null;
  const evt = NEWS_EVENT_MAP[id];
  const title = evt ? evt.title : "Crise critique";
  return {
    id: "crisis_critical",
    title: title.length > 38 ? title.slice(0, 38) + "…" : title,
    reason: "Une décision urgente attend votre arbitrage — chaque heure compte.",
    targetRoute: "/journal-crise",
    priority: 1,
  };
}

function missionReward(state: StrategyGameState): Recommendation | null {
  const n = state.missions.filter((m) => m.completed).length;
  if (n === 0) return null;
  return {
    id: "mission_reward",
    title: n === 1 ? "Récompense à réclamer" : `${n} récompenses à réclamer`,
    reason: n === 1
      ? "Une mission complétée attend votre validation."
      : `${n} missions complétées — ne laissez pas les récompenses expirer.`,
    targetRoute: "/missions",
    priority: 1,
  };
}

function trainingReady(state: StrategyGameState): Recommendation | null {
  const n = state.trainingQueue.filter((e) => e.status === "completed").length;
  if (n === 0) return null;
  return {
    id: "training_ready",
    title: "Unités prêtes à déployer",
    reason: `${n} lot${n > 1 ? "s" : ""} d'unités ont terminé leur entraînement.`,
    targetRoute: "/forces-armees",
    priority: 1,
  };
}

function buildingUpgrade(state: StrategyGameState): Recommendation | null {
  const upgradeable = state.buildings.filter((b) => {
    const def = BUILDINGS[b.id];
    return b.level > 0 && b.level < def.maxLevel && b.upgradeEndTime === null;
  });
  const affordable = upgradeable.find((b) =>
    canAfford(BUILDINGS[b.id].levels[b.level].cost, state.resources),
  );
  if (!affordable) return null;
  const def = BUILDINGS[affordable.id];
  return {
    id: "building_upgrade",
    title: `Améliorer : ${def.name}`,
    reason: `Niveau ${affordable.level} → ${affordable.level + 1} est finançable maintenant.`,
    targetRoute: "/buildings",
    priority: 2,
  };
}

function researchAvailable(state: StrategyGameState): Recommendation | null {
  if (state.strategyResearch?.inProgress) return null;
  const completed = state.strategyResearch?.completed ?? [];
  const pick = STRATEGY_RESEARCH_LIST.find((def) => {
    if (completed.includes(def.id)) return false;
    if (!def.prerequisites.every((p) => completed.includes(p))) return false;
    return canAfford(def.cost, state.resources);
  });
  if (!pick) return null;
  return {
    id: "research_available",
    title: `Recherche : ${pick.name}`,
    reason: "Aucune recherche en cours — avancez dans l'arbre technologique.",
    targetRoute: "/strategy-research",
    priority: 2,
  };
}

function missionClose(state: StrategyGameState): Recommendation | null {
  const close = state.missions
    .filter((m) => !m.completed && m.target > 0 && m.progress / m.target >= 0.7)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  if (!close) return null;
  const def = MISSION_POOL.find((d) => d.id === close.defId);
  return {
    id: "mission_close",
    title: def ? `Finaliser : ${def.title}` : "Mission presque terminée",
    reason: `${Math.round((close.progress / close.target) * 100)}% accomplis — encore un effort.`,
    targetRoute: "/missions",
    priority: 2,
  };
}

function allianceCheck(state: StrategyGameState): Recommendation | null {
  // Suggère les alliances si le joueur n'a aucun allié et a suffisamment d'influence
  const hasAlly = state.relations.some((r) => r.status === "allied");
  if (hasAlly || state.resources.influence < 150 || state.mandateDay < 8) return null;
  return {
    id: "alliance_available",
    title: "Nouer une alliance",
    reason: "Votre influence est suffisante — une alliance renforce le classement et la défense.",
    targetRoute: "/alliances",
    priority: 2,
  };
}

function rankingPressure(state: StrategyGameState): Recommendation | null {
  if (state.mandateDay < 10) return null;
  const rank = state.ranking.findIndex((r) => r.id === "player") + 1;
  if (rank <= 0 || rank <= state.ranking.length * 0.5) return null;
  return {
    id: "ranking_pressure",
    title: "Progresser au classement",
    reason: `Position ${rank}e — les opérations offensives rapportent des points rapidement.`,
    targetRoute: "/ranking",
    priority: 3,
  };
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Génère 0 à 3 recommandations triées par priorité, sans doublon de route.
 * Entièrement synchrone, local, aucune donnée personnelle.
 */
export function generateRecommendations(state: StrategyGameState): Recommendation[] {
  const candidates: Recommendation[] = [
    crisisCritical(state),
    missionReward(state),
    trainingReady(state),
    buildingUpgrade(state),
    researchAvailable(state),
    missionClose(state),
    allianceCheck(state),
    rankingPressure(state),
  ].filter((r): r is Recommendation => r !== null);

  // Tri par priorité, dédoublonnage par route
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => a.priority - b.priority)
    .filter((r) => {
      if (seen.has(r.targetRoute)) return false;
      seen.add(r.targetRoute);
      return true;
    });
}
