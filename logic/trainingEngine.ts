import { TRAINING_PROGRAMS, type TrainingId } from "@/data/trainingPrograms";
import type { ActiveTraining, StrategyGameState } from "@/types/strategy";

export type { ActiveTraining };

// Plafonds appliqués à la complétion — la formation ne peut rendre un ministre parfait
const COMPETENCE_CAP = 90;
const LOYALTY_CAP    = 90;
const SCANDAL_FLOOR  =  5;

// ── Lecture ───────────────────────────────────────────────────────────────────

export function getMinisterTraining(
  state: StrategyGameState,
  ministerId: string,
): ActiveTraining | null {
  return (state.activeTrainings ?? {})[ministerId] ?? null;
}

// ── Validation ────────────────────────────────────────────────────────────────

export function canStartTraining(
  state: StrategyGameState,
  ministerId: string,
  programId: TrainingId,
): { ok: boolean; reason?: string } {
  const program = TRAINING_PROGRAMS[programId];
  if (!program) return { ok: false, reason: "Programme inconnu." };

  if (getMinisterTraining(state, ministerId)) {
    return { ok: false, reason: "Ce ministre est déjà en formation." };
  }

  const minister = state.strategyMinisters.find((m) => m.id === ministerId);
  if (!minister) return { ok: false, reason: "Ministre introuvable." };

  if (program.costMoney && state.resources.money < program.costMoney) {
    return { ok: false, reason: `Fonds insuffisants — ${program.costMoney} requis.` };
  }
  if (program.costInfluence && state.resources.influence < program.costInfluence) {
    return { ok: false, reason: `Influence insuffisante — ${program.costInfluence} requise.` };
  }

  if (program.prerequisite?.minCompetence !== undefined &&
      minister.competence < program.prerequisite.minCompetence) {
    return { ok: false, reason: `Compétence minimale requise : ${program.prerequisite.minCompetence}.` };
  }
  if (program.prerequisite?.maxScandalRisk !== undefined &&
      minister.scandalRisk > program.prerequisite.maxScandalRisk) {
    return { ok: false, reason: "Ce ministre est trop exposé médiatiquement pour se former." };
  }

  return { ok: true };
}

// ── Démarrage ─────────────────────────────────────────────────────────────────

export function startTraining(
  state: StrategyGameState,
  ministerId: string,
  programId: TrainingId,
): StrategyGameState {
  const check = canStartTraining(state, ministerId, programId);
  if (!check.ok) return state;

  const program = TRAINING_PROGRAMS[programId];
  const actionCount = state.news.actionCount;

  // Déduction des coûts
  let resources = { ...state.resources };
  if (program.costMoney)     resources = { ...resources, money:     resources.money     - program.costMoney };
  if (program.costInfluence) resources = { ...resources, influence: resources.influence - program.costInfluence };

  // Fatigue immédiate
  const prevFatigue = (state.ministerFatigue ?? {})[ministerId] ?? 0;
  const ministerFatigue: Record<string, number> = {
    ...(state.ministerFatigue ?? {}),
    [ministerId]: Math.min(100, prevFatigue + program.fatigueCost),
  };

  // Enregistrement de la formation
  const training: ActiveTraining = {
    ministerId,
    programId,
    startedAtAction:    actionCount,
    completesAtAction:  actionCount + program.durationActions,
  };
  const activeTrainings: Record<string, ActiveTraining> = {
    ...(state.activeTrainings ?? {}),
    [ministerId]: training,
  };

  return { ...state, resources, ministerFatigue, activeTrainings };
}

// ── Tick : vérifier les complétions (appelé après chaque incrément d'actionCount) ──

export function tickTrainings(state: StrategyGameState): StrategyGameState {
  const trainings = state.activeTrainings ?? {};
  if (Object.keys(trainings).length === 0) return state;

  const actionCount = state.news.actionCount;
  const toComplete: string[] = [];

  for (const [ministerId, t] of Object.entries(trainings)) {
    if (actionCount >= t.completesAtAction) toComplete.push(ministerId);
  }

  if (toComplete.length === 0) return state;

  let ministers = [...state.strategyMinisters];
  const next = { ...trainings };

  for (const ministerId of toComplete) {
    const t = trainings[ministerId]!;
    const program = TRAINING_PROGRAMS[t.programId as TrainingId];
    if (!program) { delete next[ministerId]; continue; }

    const { effect } = program;
    ministers = ministers.map((m) => {
      if (m.id !== ministerId) return m;
      return {
        ...m,
        competence: effect.competenceDelta
          ? Math.min(COMPETENCE_CAP, m.competence + effect.competenceDelta)
          : m.competence,
        loyalty: effect.loyaltyDelta
          ? Math.min(LOYALTY_CAP, m.loyalty + effect.loyaltyDelta)
          : m.loyalty,
        scandalRisk: effect.scandalRiskDelta
          ? Math.max(SCANDAL_FLOOR, m.scandalRisk + effect.scandalRiskDelta)
          : m.scandalRisk,
      };
    });
    delete next[ministerId];
  }

  return { ...state, strategyMinisters: ministers, activeTrainings: next };
}
