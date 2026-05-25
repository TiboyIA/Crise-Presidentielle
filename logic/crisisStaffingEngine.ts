import { clamp } from "@/logic/utils";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import type {
  CabinetConflict,
  HiddenPolitics,
  NationalIndicators,
  StrategyGameState,
} from "@/types/strategy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StaffingOutcome =
  | "coordination_reussie"
  | "coordination_moyenne"
  | "saturation_administrative"
  | "conflit_de_commandement";

export interface StaffingOutcomeDef {
  outcome:     StaffingOutcome;
  label:       string;
  description: string;
  color:       string;
  // Modificateurs appliqués à l'état
  indicatorMod:     Partial<NationalIndicators>;
  hiddenPoliticsMod: Partial<HiddenPolitics>;
  fatigueDelta:     number;   // appliqué à chaque ministre mobilisé
  createsConflict:  boolean;
}

export const STAFFING_OUTCOMES: Record<StaffingOutcome, StaffingOutcomeDef> = {
  coordination_reussie: {
    outcome:     "coordination_reussie",
    label:       "Coordination réussie",
    description: "Les équipes ont travaillé en cohésion. L'impact de la crise est partiellement absorbé.",
    color:       "#3fbe7a",
    indicatorMod:     { cohesion: 3, security: 2 },
    hiddenPoliticsMod: { institutionalStability: 2, scandalRisk: -3 },
    fatigueDelta:    15,
    createsConflict: false,
  },
  coordination_moyenne: {
    outcome:     "coordination_moyenne",
    label:       "Coordination partielle",
    description: "La réponse a été laborieuse mais les équipes ont tenu. Effet limité sur la crise.",
    color:       "#4a9fff",
    indicatorMod:     { cohesion: 1 },
    hiddenPoliticsMod: { institutionalStability: 1 },
    fatigueDelta:    22,
    createsConflict: false,
  },
  saturation_administrative: {
    outcome:     "saturation_administrative",
    label:       "Saturation administrative",
    description: "La mobilisation a épuisé les équipes sans résultat probant. La crise suit son cours.",
    color:       "#f59a3a",
    indicatorMod:     {},
    hiddenPoliticsMod: { institutionalStability: -1, popularFatigue: 2 },
    fatigueDelta:    32,
    createsConflict: false,
  },
  conflit_de_commandement: {
    outcome:     "conflit_de_commandement",
    label:       "Conflit de commandement",
    description: "Les désaccords de méthode ont paralysé la cellule. Un conflit interne en résulte.",
    color:       "#e54848",
    indicatorMod:     {},
    hiddenPoliticsMod: { institutionalStability: -2, mediaMood: -2 },
    fatigueDelta:    25,
    createsConflict: true,
  },
};

export const STAFFING_COST_INFLUENCE = 50;
export const STAFFING_COOLDOWN_ACTIONS = 8;

// ── Conditions ────────────────────────────────────────────────────────────────

export interface StaffingCheck {
  ok:           boolean;
  reason?:      string;
  criticalCount: number;
  mobilizedIds: string[];   // ministres sélectionnés pour la cellule
}

export function canActivateStaffing(state: StrategyGameState): StaffingCheck {
  // Crise critique en file d'attente
  const criticalIds = state.news.pendingIds.filter(
    (id) => NEWS_EVENT_MAP[id]?.urgency === "critique",
  );
  if (criticalIds.length === 0) {
    return { ok: false, reason: "Aucune crise critique active — la cellule n'est pas justifiée.", criticalCount: 0, mobilizedIds: [] };
  }

  // Cooldown anti-spam
  const lastAt = state.lastStaffingAt ?? -99;
  const cooldownLeft = STAFFING_COOLDOWN_ACTIONS - (state.news.actionCount - lastAt);
  if (cooldownLeft > 0) {
    return { ok: false, reason: `Cellule en récupération — disponible dans ${cooldownLeft} action${cooldownLeft > 1 ? "s" : ""}.`, criticalCount: criticalIds.length, mobilizedIds: [] };
  }

  // Capital humain minimal (moral administratif)
  const morale = state.administrationMorale ?? 60;
  if (morale <= 30) {
    return { ok: false, reason: "Administration en crise institutionnelle — impossible de mobiliser.", criticalCount: criticalIds.length, mobilizedIds: [] };
  }

  // Sélection des ministres disponibles (fatigue < 80), triés par compétence
  const fatigue    = state.ministerFatigue ?? {};
  const available  = state.strategyMinisters
    .filter((m) => (fatigue[m.id] ?? 0) < 80)
    .sort((a, b) => b.competence - a.competence);

  if (available.length < 2) {
    return { ok: false, reason: "Moins de 2 ministres disponibles — tous sont trop épuisés pour être mobilisés.", criticalCount: criticalIds.length, mobilizedIds: [] };
  }

  // Ressources
  if (state.resources.influence < STAFFING_COST_INFLUENCE) {
    return { ok: false, reason: `Influence insuffisante — ${STAFFING_COST_INFLUENCE} requise.`, criticalCount: criticalIds.length, mobilizedIds: [] };
  }

  const mobilizedIds = available.slice(0, 3).map((m) => m.id);
  return { ok: true, criticalCount: criticalIds.length, mobilizedIds };
}

// ── Résolution probabiliste ───────────────────────────────────────────────────
//
// La distribution de base est modifiée par l'état du gouvernement :
//   - moral admin. élevé       → favorise coordination_reussie
//   - compétence moy. élevée   → favorise coordination_reussie
//   - talentDrainScore élevé   → favorise conflit_de_commandement
//   - usages répétés           → pénalise les bons outcomes
//   - moral bas                → favorise saturation

function computeProbabilities(
  morale: number,
  avgCompetence: number,
  talentDrain: number,
  useCount: number,
): [number, number, number, number] {
  // [reussie, moyenne, saturation, conflit]
  let p = [35, 35, 20, 10];

  // Moral
  if      (morale >= 70) { p[0] += 15; p[2] -= 10; p[1] -= 5; }
  else if (morale <= 40) { p[2] += 15; p[0] -= 10; p[1] -= 5; }

  // Compétence
  if      (avgCompetence >= 70) { p[0] += 10; p[2] -= 6; p[3] -= 4; }
  else if (avgCompetence <= 40) { p[2] += 8;  p[0] -= 8; }

  // Fuite des talents
  if      (talentDrain > 70) { p[3] += 12; p[0] -= 8; p[1] -= 4; }
  else if (talentDrain > 50) { p[3] += 6;  p[0] -= 4; p[2] += 2; p[1] -= 4; }

  // Surexploitation — chaque usage passé dégrade les outcomes
  const penalty = Math.min(useCount * 5, 20);
  p[0] -= penalty;
  p[2] += Math.round(penalty * 0.6);
  p[3] += Math.round(penalty * 0.4);

  // Normalisation : tout garder positif puis recalculer total
  p = p.map((v) => Math.max(1, v));
  const total = p.reduce((a, b) => a + b, 0);
  return [p[0] / total, p[1] / total, p[2] / total, p[3] / total] as [number, number, number, number];
}

function drawOutcome(probs: [number, number, number, number]): StaffingOutcome {
  const r = Math.random();
  let acc = 0;
  const keys: StaffingOutcome[] = [
    "coordination_reussie",
    "coordination_moyenne",
    "saturation_administrative",
    "conflit_de_commandement",
  ];
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i]!;
    if (r < acc) return keys[i]!;
  }
  return "coordination_moyenne";
}

// ── Application ───────────────────────────────────────────────────────────────

export interface StaffingActivationResult {
  outcome:      StaffingOutcome;
  def:          StaffingOutcomeDef;
  mobilizedIds: string[];
}

export function activateStaffingCell(state: StrategyGameState): {
  result: StaffingActivationResult | null;
  newState: StrategyGameState;
  failReason?: string;
} {
  const check = canActivateStaffing(state);
  if (!check.ok) return { result: null, newState: state, failReason: check.reason };

  const { mobilizedIds } = check;
  const morale       = state.administrationMorale ?? 60;
  const talentDrain  = state.talentDrainScore ?? 15;
  const useCount     = state.staffingUseCount ?? 0;
  const fatigue      = state.ministerFatigue ?? {};

  // Compétence moyenne des ministres mobilisés
  const mobilized     = state.strategyMinisters.filter((m) => mobilizedIds.includes(m.id));
  const avgCompetence = mobilized.length > 0
    ? mobilized.reduce((sum, m) => sum + m.competence, 0) / mobilized.length
    : 50;

  const probs   = computeProbabilities(morale, avgCompetence, talentDrain, useCount);
  const outcome = drawOutcome(probs);
  const def     = STAFFING_OUTCOMES[outcome];

  // Déduction du coût
  let resources = { ...state.resources, influence: state.resources.influence - STAFFING_COST_INFLUENCE };

  // Effets sur les indicateurs et politiques cachées
  let ind = { ...state.nationalIndicators };
  let hp  = { ...state.hiddenPolitics };
  for (const [k, v] of Object.entries(def.indicatorMod) as [keyof NationalIndicators, number][]) {
    ind[k] = clamp(ind[k] + v) as typeof ind[typeof k];
  }
  for (const [k, v] of Object.entries(def.hiddenPoliticsMod) as [keyof HiddenPolitics, number][]) {
    hp[k] = clamp(hp[k] + v);
  }

  // Fatigue des ministres mobilisés
  const newFatigue = { ...fatigue };
  for (const id of mobilizedIds) {
    newFatigue[id] = Math.min(100, (newFatigue[id] ?? 0) + def.fatigueDelta);
  }

  // Conflit de commandement — entre les 2 premiers ministres mobilisés
  let cabinetConflicts = state.cabinetConflicts ?? [];
  if (def.createsConflict && mobilizedIds.length >= 2) {
    const [idA, idB] = mobilizedIds as [string, string];
    const alreadyConflict = cabinetConflicts.some(
      (c) => (c.ministerA === idA && c.ministerB === idB) ||
              (c.ministerA === idB && c.ministerB === idA),
    );
    if (!alreadyConflict) {
      const newConflict: CabinetConflict = {
        id:                   `crisis_blame_${idA}_${idB}_${state.news.actionCount}`,
        ministerA:            idA,
        ministerB:            idB,
        intensity:            40 + Math.round(Math.random() * 20),
        reason:               "crisis_blame",
        createdAtAction:      state.news.actionCount,
        expiresAfterActions:  state.news.actionCount + 35,
      };
      cabinetConflicts = [...cabinetConflicts, newConflict];
    }
  }

  const newState: StrategyGameState = {
    ...state,
    resources,
    nationalIndicators:  ind,
    hiddenPolitics:      hp,
    ministerFatigue:     newFatigue,
    cabinetConflicts,
    lastStaffingAt:      state.news.actionCount,
    staffingUseCount:    useCount + 1,
  };

  return {
    result: { outcome, def, mobilizedIds },
    newState,
  };
}
