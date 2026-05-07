import type {
  GameState,
  ResourceCosts,
  Resources,
  TechId,
  TechState,
} from "../types/game";
import {
  BRANCHES,
  DOCTRINES,
  TECH_TREE,
  type BranchId,
  type DoctrineId,
} from "../data/techTree";
import {
  INITIAL_RESOURCES,
  applyCost,
  canAfford,
  missingResourceAmounts,
  sanitizeResources,
} from "./resources";

/**
 * Module 7 — Moteur déterministe de l'arbre technologique.
 *
 * Toutes les fonctions sont PURES : elles n'utilisent jamais
 * `Date.now()`, `Math.random()`, ni `console.log`. La complétion
 * d'une recherche est purement temporelle (`turn >= completedTurn`).
 *
 * Convention `tech` :
 *   - `inProgress = null`            ← rien en cours, on peut lancer.
 *   - `inProgress = { id, started, completed }` ← un projet bloqué.
 *   - `researched: TechId[]`         ← acquis, ordre = chronologique.
 */

const EMPTY_TECH: TechState = {
  researched: [],
  inProgress: null,
  activeDoctrines: [],
  cyberShieldUsesRemaining: 0,
};

/** Nombre d'usages initiaux du bouclier "Forteresse numérique". */
export const CYBER_SHIELD_INITIAL_USES = 2;

/** Lit la liste des doctrines actives avec garde de défaut. */
export function getActiveDoctrines(tech: TechState): DoctrineId[] {
  return tech.activeDoctrines ?? [];
}

/** Vrai si la doctrine est actuellement active sur le mandat. */
export function hasDoctrine(tech: TechState, id: DoctrineId): boolean {
  return getActiveDoctrines(tech).includes(id);
}

/** Vrai si la branche est complétée (tous ses axes sont acquis). */
export function isBranchCompleted(
  tech: TechState,
  branchId: BranchId,
): boolean {
  const branch = BRANCHES.find((b) => b.id === branchId);
  if (!branch) return false;
  const acquired = new Set(tech.researched);
  return branch.techIds.every((t) => acquired.has(t));
}

/**
 * Détecte les doctrines NOUVELLEMENT activables après un changement
 * d'état tech. Une doctrine "nouvelle" = sa branche est complétée
 * dans le state donné ET elle n'est pas déjà dans `activeDoctrines`.
 */
export function detectNewDoctrines(tech: TechState): DoctrineId[] {
  const already = new Set(getActiveDoctrines(tech));
  const out: DoctrineId[] = [];
  for (const branch of BRANCHES) {
    if (already.has(branch.doctrineId)) continue;
    if (isBranchCompleted(tech, branch.id)) {
      out.push(branch.doctrineId);
    }
  }
  return out;
}

/** Récupère l'état tech avec garde de défaut (rétro-compat saves). */
export function getTechState(state: GameState): TechState {
  return state.tech ?? EMPTY_TECH;
}

/** Vrai si la techno a été acquise (recherche complétée). */
export function isTechResearched(state: GameState, id: TechId): boolean {
  return getTechState(state).researched.includes(id);
}

/** Vrai si une recherche est en cours (peu importe laquelle). */
export function isResearchInProgress(state: GameState): boolean {
  return getTechState(state).inProgress !== null;
}

export type StartResearchResult =
  | {
      ok: true;
      nextTech: TechState;
      /** LOT 18.2 — coût débité (toutes les ressources requises). */
      costs: ResourceCosts;
      /** LOT 18.2 — snapshot des ressources APRÈS débit, à appliquer. */
      nextResources: Resources;
    }
  | { ok: false; reason: StartResearchError; missing?: ResourceCosts };

export type StartResearchError =
  | "unknown_tech"
  | "already_researched"
  | "another_in_progress"
  | "insufficient_resources"
  | "no_president"
  | "game_over";

/**
 * Lit les ressources de l'état avec garde de défaut + sanitize, pour
 * les anciennes saves qui n'avaient pas encore le champ `resources`.
 */
export function getResources(state: GameState): Resources {
  return sanitizeResources(state.resources ?? INITIAL_RESOURCES);
}

/**
 * Tente de démarrer la recherche `id`. Retourne soit le nouvel état
 * `tech` + le snapshot des ressources après débit, soit une raison
 * de refus. La fonction NE MUTE PAS l'argument `state`.
 *
 * LOT 18.2 — Le débit n'est plus sur la jauge `budget` (0-100 %)
 * mais sur les `Resources` stockables (5 axes). Le caller applique
 * `nextResources` atomiquement à `state.resources` ; en cas de
 * refus pour ressources insuffisantes, `missing` liste les manques
 * pour l'affichage UI.
 */
export function startResearch(
  state: GameState,
  id: TechId,
  currentTurn: number,
): StartResearchResult {
  if (state.gameOver.isOver) return { ok: false, reason: "game_over" };
  if (!state.president) return { ok: false, reason: "no_president" };
  const node = TECH_TREE[id];
  if (!node) return { ok: false, reason: "unknown_tech" };
  const tech = getTechState(state);
  if (tech.researched.includes(id)) {
    return { ok: false, reason: "already_researched" };
  }
  if (tech.inProgress) {
    return { ok: false, reason: "another_in_progress" };
  }
  const resources = getResources(state);
  if (!canAfford(resources, node.costs)) {
    return {
      ok: false,
      reason: "insufficient_resources",
      missing: missingResourceAmounts(resources, node.costs),
    };
  }
  return {
    ok: true,
    // Copie défensive : on ne renvoie pas la référence statique du
    // tech-tree pour éviter qu'un caller imprudent ne mute par
    // inadvertance le coût d'un axe (ex: spread, push…).
    costs: { ...node.costs },
    nextResources: applyCost(resources, node.costs),
    // Module 7.1 — On PRÉSERVE l'intégralité de l'état tech (notamment
    // `activeDoctrines` et `cyberShieldUsesRemaining`) ; sinon, lancer
    // une nouvelle recherche réinitialiserait silencieusement toutes
    // les doctrines débloquées et viderait le compteur de bouclier.
    nextTech: {
      ...tech,
      inProgress: {
        id,
        startedTurn: currentTurn,
        completedTurn: currentTurn + node.durationTurns,
      },
    },
  };
}

/**
 * Tick de fin de tour : si la recherche en cours arrive à terme à
 * `nextTurn`, la déplace dans `researched` et libère `inProgress`.
 * Détecte aussi les NOUVELLES doctrines activables (branche
 * complétée par cette acquisition) et les ajoute à `activeDoctrines`.
 *
 * Sans recherche en cours OU recherche encore en cours → renvoie
 * `tech` inchangé et `activatedDoctrines: []`.
 */
export function tickResearch(
  tech: TechState,
  nextTurn: number,
): { tech: TechState; activatedDoctrines: DoctrineId[] } {
  const ip = tech.inProgress;
  if (!ip) return { tech, activatedDoctrines: [] };
  if (nextTurn < ip.completedTurn) {
    return { tech, activatedDoctrines: [] };
  }
  // Garde-fou : ne re-acquiert pas si déjà dans researched.
  const alreadyOwned = tech.researched.includes(ip.id);
  const nextResearched = alreadyOwned
    ? tech.researched
    : [...tech.researched, ip.id];
  const candidate: TechState = {
    ...tech,
    researched: nextResearched,
    inProgress: null,
  };
  const activatedDoctrines = detectNewDoctrines(candidate);
  if (activatedDoctrines.length === 0) {
    return { tech: candidate, activatedDoctrines: [] };
  }
  // Active les doctrines + initialise le compteur du bouclier cyber
  // si Forteresse numérique vient d'être débloquée.
  const nextActive = [...getActiveDoctrines(candidate), ...activatedDoctrines];
  const includesShield = activatedDoctrines.includes("doctrine_forteresse");
  return {
    tech: {
      ...candidate,
      activeDoctrines: nextActive,
      cyberShieldUsesRemaining: includesShield
        ? CYBER_SHIELD_INITIAL_USES
        : (candidate.cyberShieldUsesRemaining ?? 0),
    },
    activatedDoctrines,
  };
}

/**
 * Progression visible (0..1) de la recherche en cours, ou null.
 * Utilisée par la barre de progression sur la page /research et
 * l'indicateur compact sur le dashboard.
 */
export function researchProgress(
  tech: TechState,
  currentTurn: number,
): { id: TechId; ratio: number; turnsLeft: number } | null {
  const ip = tech.inProgress;
  if (!ip) return null;
  const total = ip.completedTurn - ip.startedTurn;
  if (total <= 0) return { id: ip.id, ratio: 1, turnsLeft: 0 };
  const elapsed = Math.max(0, currentTurn - ip.startedTurn);
  const ratio = Math.max(0, Math.min(1, elapsed / total));
  const turnsLeft = Math.max(0, ip.completedTurn - currentTurn);
  return { id: ip.id, ratio, turnsLeft };
}

/**
 * Sanitize un état tech possiblement corrompu/legacy au chargement.
 * Garantit la forme `{researched: TechId[], inProgress: null|valid}`.
 */
export function sanitizeTechState(raw: unknown): TechState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TECH };
  const r = raw as Partial<TechState>;
  const validIds = new Set(Object.keys(TECH_TREE) as TechId[]);
  const researched = Array.isArray(r.researched)
    ? (r.researched.filter((x) => validIds.has(x as TechId)) as TechId[])
    : [];
  let inProgress: TechState["inProgress"] = null;
  if (r.inProgress && typeof r.inProgress === "object") {
    const ip = r.inProgress;
    if (
      validIds.has(ip.id as TechId) &&
      typeof ip.startedTurn === "number" &&
      typeof ip.completedTurn === "number" &&
      ip.completedTurn >= ip.startedTurn &&
      !researched.includes(ip.id as TechId)
    ) {
      inProgress = {
        id: ip.id as TechId,
        startedTurn: ip.startedTurn,
        completedTurn: ip.completedTurn,
      };
    }
  }
  // Module 7.1 — sanitize doctrines + cyber shield counter.
  const validDoctrines = new Set(Object.keys(DOCTRINES) as DoctrineId[]);
  const activeDoctrines = Array.isArray(r.activeDoctrines)
    ? (r.activeDoctrines.filter((d) =>
        validDoctrines.has(d as DoctrineId),
      ) as DoctrineId[])
    : [];
  const cyberShieldUsesRemaining =
    typeof r.cyberShieldUsesRemaining === "number" &&
    r.cyberShieldUsesRemaining >= 0
      ? Math.min(
          CYBER_SHIELD_INITIAL_USES,
          Math.floor(r.cyberShieldUsesRemaining),
        )
      : 0;
  return {
    researched,
    inProgress,
    activeDoctrines,
    cyberShieldUsesRemaining,
  };
}
