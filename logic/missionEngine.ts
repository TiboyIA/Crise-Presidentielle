import { MISSION_POOL, pickDailyMissions } from "@/data/missions";
import type { MissionDef, MissionType, OperationType, PlayerBuilding, PlayerMission, StrategyResources } from "@/types/strategy";
import { clockNow, REAL_MS_PER_GAME_DAY } from "@/logic/simulationClock";

/**
 * Durée d'un cycle de missions = 1 jour jeu.
 * Temps réel : REAL_MS_PER_GAME_DAY = 6 h réelles (au lieu de 24 h précédemment).
 * Le joueur voit "nouvelles missions dans Xh" exprimé en temps réel.
 */
const MISSION_DURATION_MS = REAL_MS_PER_GAME_DAY; // 6 h réelles = 1 jour jeu

export function generateDailyMissions(dayIndex: number): PlayerMission[] {
  const defs = pickDailyMissions(dayIndex);
  const now  = clockNow();
  return defs.map((def) => ({
    defId:      def.id,
    completed:  false,
    progress:   0,
    target:     def.target.amount ?? def.target.minPower ?? 1,
    assignedAt: now,
  }));
}

export function getCurrentDayIndex(): number {
  return Math.floor(clockNow() / MISSION_DURATION_MS);
}

export function missionsExpired(missions: PlayerMission[]): boolean {
  if (missions.length === 0) return true;
  return missions[0].assignedAt < clockNow() - MISSION_DURATION_MS;
}

export function checkMissionProgress(
  missions: PlayerMission[],
  resources: StrategyResources,
  buildings: PlayerBuilding[],
  globalPower: number,
  event?: { type: MissionType; operationType?: OperationType; buildingId?: string },
): PlayerMission[] {
  return missions.map((m) => {
    if (m.completed) return m;

    const def = MISSION_POOL.find((d) => d.id === m.defId);
    if (!def) return m;

    let progress = m.progress;

    if (def.type === "collect_resources" && def.target.resourceKey) {
      progress = resources[def.target.resourceKey] ?? 0;
    }

    if (def.type === "reach_power" && def.target.minPower) {
      progress = globalPower;
    }

    if (event) {
      if (
        (def.type === "spy_country" && event.type === "spy_country") ||
        (def.type === "reinforce_defense" && event.type === "reinforce_defense")
      ) {
        progress = m.target;
      }

      if (
        def.type === "launch_operation" &&
        event.type === "launch_operation" &&
        def.target.operationType &&
        def.target.operationType === event.operationType
      ) {
        progress = m.target;
      }

      if (
        def.type === "win_operation" &&
        event.type === "win_operation" &&
        def.target.operationType &&
        def.target.operationType === event.operationType
      ) {
        progress = m.target;
      }

      if (
        def.type === "upgrade_building" &&
        event.type === "upgrade_building"
      ) {
        if (!def.target.buildingId || def.target.buildingId === event.buildingId) {
          progress = m.target;
        }
      }
    }

    const completed = progress >= m.target;
    return { ...m, progress: Math.min(progress, m.target), completed };
  });
}

export function getMissionDef(defId: string): MissionDef | undefined {
  return MISSION_POOL.find((d) => d.id === defId);
}

export function timeUntilReset(missions: PlayerMission[]): number {
  if (missions.length === 0) return 0;
  const expiry = missions[0].assignedAt + MISSION_DURATION_MS;
  return Math.max(0, expiry - clockNow());
}
