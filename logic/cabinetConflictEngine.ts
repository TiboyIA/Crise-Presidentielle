import { clamp } from "@/logic/utils";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import type { StrategyGameState } from "@/types/strategy";
import type { CabinetConflict, ConflictReason } from "@/types/strategy";

export type { CabinetConflict, ConflictReason };

export type ConflictResolution = "support_a" | "support_b" | "compromise";

// ── Définitions des 5 types de conflit ───────────────────────────────────────

export interface ConflictDef {
  label:       string;
  icon:        string;
  color:       string;
  description: string;
}

export const CONFLICT_DEFS: Record<ConflictReason, ConflictDef> = {
  domain_rivalry: {
    label:       "Rivalité de domaine",
    icon:        "sword-cross",
    color:       "#f59a3a",
    description: "Des visions opposées sur les priorités nationales créent une friction structurelle.",
  },
  ambition: {
    label:       "Ambition personnelle",
    icon:        "trending-up",
    color:       "#a78bfa",
    description: "Ce ministre signale ouvertement son désaccord avec l'orientation du Premier Ministre.",
  },
  loyalty_gap: {
    label:       "Friction post-remaniement",
    icon:        "account-switch-outline",
    color:       "#e8a93a",
    description: "L'arrivée récente d'un nouveau membre perturbe les équilibres internes du cabinet.",
  },
  doctrine_split: {
    label:       "Désaccord doctrinal",
    icon:        "scale-balance",
    color:       "#4a9fff",
    description: "La doctrine de gouvernance choisie contredit les convictions de ce ministre.",
  },
  crisis_blame: {
    label:       "Blâme post-crise",
    icon:        "alert-decagram-outline",
    color:       "#e54848",
    description: "Chacun rend l'autre responsable d'une mauvaise gestion de crise.",
  },
};

// ── Paires structurellement opposées ─────────────────────────────────────────

const RIVAL_PAIRS: ReadonlyArray<[string, string]> = [
  ["economie",         "ecologie"],           // croissance vs environnement
  ["defense",          "affaires_etrangeres"], // force brute vs diplomatie
  ["interieur",        "sante"],              // sécurité vs libertés civiles
  ["industrie",        "ecologie"],           // productivisme vs transition
];

// Doctrines qui mettent structurellement deux portefeuilles en tension
const DOCTRINE_TENSIONS: Partial<Record<string, [string, string]>> = {
  securitaire: ["ecologie",  "defense"],
  autoritaire: ["sante",     "interieur"],
  ecologiste:  ["industrie", "ecologie"],
  liberal:     ["economie",  "sante"],
};

// ── Helpers internes ──────────────────────────────────────────────────────────

function hasConflict(
  existing: CabinetConflict[],
  a: string,
  b: string,
): boolean {
  return existing.some(
    (c) => (c.ministerA === a && c.ministerB === b) ||
           (c.ministerA === b && c.ministerB === a),
  );
}

function makeId(reason: ConflictReason, a: string, b: string, action: number): string {
  return `${reason}_${a}_${b}_${action}`;
}

function countPendingCritical(pendingIds: string[]): number {
  return pendingIds.filter((id) => NEWS_EVENT_MAP[id]?.urgency === "critique").length;
}

// ── Détection (appelée tous les 10 jours) ────────────────────────────────────

export function detectCabinetConflicts(
  state: StrategyGameState,
): CabinetConflict[] {
  const existing   = state.cabinetConflicts ?? [];
  const actionCount = state.news.actionCount;
  const ministers  = state.strategyMinisters;
  const ind        = state.nationalIndicators;
  const hp         = state.hiddenPolitics;

  // Pas plus de 3 conflits simultanés — le cabinet reste gérable
  if (existing.length >= 3) return existing;

  const fresh: CabinetConflict[] = [];
  const activeCount = () => existing.length + fresh.length;

  // ── 1. Rivalité de domaine ────────────────────────────────────────────────
  for (const [idA, idB] of RIVAL_PAIRS) {
    if (activeCount() >= 3) break;
    if (hasConflict(existing, idA, idB) || hasConflict(fresh, idA, idB)) continue;

    const mA = ministers.find((m) => m.id === idA);
    const mB = ministers.find((m) => m.id === idB);
    if (!mA || !mB) continue;

    const triggered =
      (idA === "economie"  && idB === "ecologie"  && Math.abs(ind.economy - ind.ecology) > 22) ||
      (idA === "defense"   && idB === "affaires_etrangeres" && ind.security > 60 && mA.loyalty < 68) ||
      (idA === "interieur" && idB === "sante"      && ind.cohesion < 45) ||
      (idA === "industrie" && idB === "ecologie"   && mA.loyalty < 60 && mB.loyalty < 60);

    if (triggered && Math.random() < 0.32) {
      fresh.push({
        id: makeId("domain_rivalry", idA, idB, actionCount),
        ministerA: idA, ministerB: idB,
        intensity: 28 + Math.round(Math.random() * 22),
        reason: "domain_rivalry",
        createdAtAction: actionCount,
        expiresAfterActions: actionCount + 40,
      });
    }
  }

  // ── 2. Ambition personnelle ───────────────────────────────────────────────
  if (activeCount() < 3) {
    const pm = ministers.find((m) => m.id === "pm");
    if (pm && pm.loyalty < 65) {
      const ambitious = ministers.find(
        (m) =>
          m.id !== "pm" &&
          m.competence > 78 &&
          m.loyalty < 54 &&
          !hasConflict(existing, "pm", m.id) &&
          !hasConflict(fresh, "pm", m.id),
      );
      if (ambitious && Math.random() < 0.38) {
        fresh.push({
          id: makeId("ambition", ambitious.id, "pm", actionCount),
          ministerA: ambitious.id, ministerB: "pm",
          intensity: 38 + Math.round(Math.random() * 22),
          reason: "ambition",
          createdAtAction: actionCount,
          expiresAfterActions: actionCount + 35,
        });
      }
    }
  }

  // ── 3. Friction post-remaniement ─────────────────────────────────────────
  if (activeCount() < 3) {
    const unstable = ministers.find(
      (m) =>
        m.loyalty < 44 &&
        !existing.some((c) => c.ministerA === m.id || c.ministerB === m.id) &&
        !fresh.some((c) => c.ministerA === m.id || c.ministerB === m.id),
    );
    const anchor = ministers.find(
      (m) => m.loyalty >= 75 && m.id !== unstable?.id,
    );
    if (
      unstable && anchor &&
      !hasConflict(existing, unstable.id, anchor.id) &&
      !hasConflict(fresh, unstable.id, anchor.id) &&
      Math.random() < 0.28
    ) {
      fresh.push({
        id: makeId("loyalty_gap", unstable.id, anchor.id, actionCount),
        ministerA: unstable.id, ministerB: anchor.id,
        intensity: 24 + Math.round(Math.random() * 22),
        reason: "loyalty_gap",
        createdAtAction: actionCount,
        expiresAfterActions: actionCount + 30,
      });
    }
  }

  // ── 4. Désaccord doctrinal ────────────────────────────────────────────────
  if (activeCount() < 3) {
    const pair = DOCTRINE_TENSIONS[state.governanceDoctrine];
    if (pair) {
      const [idA, idB] = pair;
      const mA = ministers.find((m) => m.id === idA);
      const mB = ministers.find((m) => m.id === idB);
      if (
        mA && mB &&
        (mA.loyalty < 65 || mB.loyalty < 65) &&
        !hasConflict(existing, idA, idB) &&
        !hasConflict(fresh, idA, idB) &&
        Math.random() < 0.30
      ) {
        fresh.push({
          id: makeId("doctrine_split", idA, idB, actionCount),
          ministerA: idA, ministerB: idB,
          intensity: 33 + Math.round(Math.random() * 17),
          reason: "doctrine_split",
          createdAtAction: actionCount,
          expiresAfterActions: actionCount + 35,
        });
      }
    }
  }

  // ── 5. Blâme post-crise ───────────────────────────────────────────────────
  if (activeCount() < 3) {
    const criticalLoad = countPendingCritical(state.news.pendingIds);
    if (hp.institutionalStability < 45 && criticalLoad >= 2) {
      const pool = ministers.filter(
        (m) =>
          m.loyalty < 70 &&
          !existing.some((c) => c.ministerA === m.id || c.ministerB === m.id) &&
          !fresh.some((c) => c.ministerA === m.id || c.ministerB === m.id),
      );
      if (pool.length >= 2 && Math.random() < 0.25) {
        const [mA, mB] = pool;
        if (!hasConflict(existing, mA.id, mB.id) && !hasConflict(fresh, mA.id, mB.id)) {
          fresh.push({
            id: makeId("crisis_blame", mA.id, mB.id, actionCount),
            ministerA: mA.id, ministerB: mB.id,
            intensity: 42 + Math.round(Math.random() * 20),
            reason: "crisis_blame",
            createdAtAction: actionCount,
            expiresAfterActions: actionCount + 25,
          });
        }
      }
    }
  }

  return [...existing, ...fresh];
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickCabinetConflicts(
  state: StrategyGameState,
): StrategyGameState {
  const existing    = state.cabinetConflicts ?? [];
  const actionCount = state.news.actionCount;

  // Expiration
  const active = existing.filter((c) => actionCount < c.expiresAfterActions);
  if (active.length === 0) return { ...state, cabinetConflicts: [] };

  const criticalLoad = countPendingCritical(state.news.pendingIds);

  // Tick : décroissance naturelle ou escalade si crises critiques en attente
  const ticked = active.map((c) => ({
    ...c,
    intensity: clamp(c.intensity - 2 + (criticalLoad > 0 ? 3 : 0)),
  }));

  // Effet passif : conflits intenses → drag sur la stabilité institutionnelle
  const highCount = ticked.filter((c) => c.intensity > 60).length;
  const hp = highCount > 0
    ? { ...state.hiddenPolitics, institutionalStability: clamp(state.hiddenPolitics.institutionalStability - highCount) }
    : state.hiddenPolitics;

  return { ...state, cabinetConflicts: ticked, hiddenPolitics: hp };
}

// ── Résolution par arbitrage présidentiel ─────────────────────────────────────

export function resolveConflict(
  state: StrategyGameState,
  conflictId: string,
  resolution: ConflictResolution,
): StrategyGameState {
  const conflict = (state.cabinetConflicts ?? []).find((c) => c.id === conflictId);
  if (!conflict) return state;

  const cabinetConflicts = (state.cabinetConflicts ?? []).filter((c) => c.id !== conflictId);

  const applyLoyalty = (
    ministers: StrategyGameState["strategyMinisters"],
    id: string,
    delta: number,
  ) => ministers.map((m) =>
    m.id === id ? { ...m, loyalty: clamp(m.loyalty + delta) } : m,
  );

  let ministers = state.strategyMinisters;
  let hp        = state.hiddenPolitics;

  if (resolution === "support_a") {
    ministers = applyLoyalty(ministers, conflict.ministerA,  4);
    ministers = applyLoyalty(ministers, conflict.ministerB, -6);
    hp = { ...hp, eliteTrust: clamp(hp.eliteTrust - 3), scandalRisk: clamp(hp.scandalRisk + 5) };
  } else if (resolution === "support_b") {
    ministers = applyLoyalty(ministers, conflict.ministerB,  4);
    ministers = applyLoyalty(ministers, conflict.ministerA, -6);
    hp = { ...hp, eliteTrust: clamp(hp.eliteTrust - 3), scandalRisk: clamp(hp.scandalRisk + 5) };
  } else {
    // Compromis : les deux gagnent légèrement, stabilité renforcée
    ministers = applyLoyalty(ministers, conflict.ministerA, 2);
    ministers = applyLoyalty(ministers, conflict.ministerB, 2);
    hp = { ...hp, institutionalStability: clamp(hp.institutionalStability + 5) };
  }

  return { ...state, cabinetConflicts, strategyMinisters: ministers, hiddenPolitics: hp };
}
