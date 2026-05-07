import type {
  Gauges,
  GameState,
  HiddenGauges,
  HostilePower,
  HybridOperation,
  HybridOpVector,
  HybridThreatLevel,
} from "@/types/game";
import {
  HYBRID_VECTORS,
  HYBRID_VECTOR_KEYS,
  EVENT_ID_TO_VECTOR,
} from "@/data/hybridVectors";
import {
  HYBRID_COUNTERMEASURES,
  type CountermeasureId,
  getCountermeasure,
} from "@/data/hybridCountermeasures";

// ─── ID stable de l'event ULTIMATUM (matérialisé en T007) ──────────
export const ULTIMATUM_EVENT_ID = "ev_ultimatum";

// ─── Helpers déterministes ──────────────────────────────────────────

function clamp(x: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, x));
}

function hashSeed(turn: number, salt: string): number {
  let h = turn * 2654435761;
  for (let i = 0; i < salt.length; i++) h = ((h << 5) - h + salt.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(
  items: T[],
  weight: (item: T) => number,
  rng: () => number,
): T | null {
  if (items.length === 0) return null;
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[items.length - 1] ?? null;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1] ?? null;
}

// ─── Niveau de menace global ────────────────────────────────────────

export function computeThreatLevel(state: GameState): HybridThreatLevel {
  const ws = state.warState;
  if (ws && (ws.status === "war" || ws.status === "ultimatum"))
    return "imminence";
  const hp = state.hostilePower;
  if (!hp) return "vigilance";
  const liveOps = (state.hybridOps ?? []).filter(
    (o) => !o.defused && o.resolved,
  ).length;
  const score = hp.aggression + liveOps * 4;
  if (score >= 80) return "imminence";
  if (score >= 60) return "alerte";
  if (score >= 40) return "tension";
  return "vigilance";
}

const THREAT_LABELS: Record<HybridThreatLevel, string> = {
  vigilance: "VIGILANCE",
  tension: "TENSION",
  alerte: "ALERTE",
  imminence: "IMMINENCE",
};
const THREAT_COLORS: Record<HybridThreatLevel, string> = {
  vigilance: "#16a34a",
  tension: "#a37b1d",
  alerte: "#c97a1d",
  imminence: "#c0392b",
};

export function threatLabel(l: HybridThreatLevel): string {
  return THREAT_LABELS[l];
}
export function threatColor(l: HybridThreatLevel): string {
  return THREAT_COLORS[l];
}

// ─── Pondération vecteur en fonction des jauges ─────────────────────
//
// On amplifie la doctrine de l'acteur par les vulnérabilités
// françaises actuelles : si cyberRisk est haut, l'acteur frappe en
// cyber ; si foreignDependence est haut, il fait du chantage
// énergétique ; si la cohésion est basse, il pousse de la
// désinformation, etc.

function vectorBoost(
  vector: HybridOpVector,
  gauges: Gauges,
  hidden: HiddenGauges,
): number {
  switch (vector) {
    case "cyber":
      return 1 + hidden.cyberRisk / 80;
    case "energy_blackmail":
      return 1 + hidden.foreignDependence / 80;
    case "disinformation":
      return 1 + (100 - gauges.cohesion) / 120;
    case "espionage":
      return 1 + hidden.corruption / 100;
    case "industrial_sabotage":
      return 1 + (100 - gauges.economy) / 200;
    case "diplomatic_pressure":
      return 1 + (100 - gauges.diplomacy) / 100;
    case "social_manipulation":
      return 1 + hidden.peopleFatigue / 100;
    case "document_leak":
      return 1 + hidden.scandalRisk / 100;
    case "infrastructure_attack":
      return 1 + (100 - gauges.security) / 120;
  }
}

// ─── Tick principal ─────────────────────────────────────────────────
//
// Appelé à la fin de chaque resolveChoice, AVANT le calcul de
// game over / élection. 100% pur : retourne un nouvel objet sans
// muter ses inputs. Les effets appliqués au reste du `GameState`
// (injection d'event, opération journalisée, ultimatum) sont
// portés par la valeur de retour, le caller les applique.

export interface HybridTickResult {
  /** Nouvelle version de l'acteur hostile (jauges mises à jour). */
  hostilePower: HostilePower;
  /** Nouvelle liste d'opérations (avec, éventuellement, l'op nouvelle). */
  hybridOps: HybridOperation[];
  /**
   * EventId à injecter en `delayedEvents` (delay=1) si ≠ null. C'est
   * une opération hostile que le joueur découvrira au tour suivant.
   */
  injectEventId: string | null;
  /**
   * True si on doit poser un ULTIMATUM ce tour. Le caller l'utilise
   * pour préparer le warState et injecter l'event d'ultimatum.
   */
  ultimatumNeeded: boolean;
}

const PASSIVE_AGGRESSION_DRIFT = 1;
const COOLDOWN_TURNS = 1; // pas plus d'1 op par tour

export function tickHostilePower(
  prev: HostilePower | null | undefined,
  prevOps: HybridOperation[] | undefined,
  gauges: Gauges,
  hidden: HiddenGauges,
  turn: number,
  seenEventIds: string[],
  warStatusActive: boolean,
): HybridTickResult {
  const ops = prevOps ?? [];
  const hp: HostilePower = prev
    ? { ...prev, doctrine: { ...prev.doctrine } }
    : // Cas saves antérieures sans hostilePower : on initialise au vol.
      // Ne devrait pas arriver car DEFAULT_STATE l'instancie, mais on
      // garde un fallback pour la rétro-compat.
      {
        id: "hp_division_zero",
        name: "La Division Zéro",
        color: "#8b1a1a",
        description: "",
        doctrine: HYBRID_VECTOR_KEYS.reduce(
          (acc, k) => {
            acc[k] = 0.5;
            return acc;
          },
          {} as Record<HybridOpVector, number>,
        ),
        aggression: 30,
        lastOpTurn: 0,
      };

  // Pendant l'état de guerre conventionnelle, on suspend les
  // opérations hybrides — la guerre prend toute la place.
  if (warStatusActive) {
    return {
      hostilePower: hp,
      hybridOps: ops,
      injectEventId: null,
      ultimatumNeeded: false,
    };
  }

  // 1) Drift passif d'agressivité (très lent ; le vrai moteur c'est
  //    les choix du joueur via applyChoiceImpactOnAggression).
  if (hp.aggression < 50) {
    hp.aggression = clamp(hp.aggression + PASSIVE_AGGRESSION_DRIFT);
  }

  // 2) Cooldown : si une op a été tirée le tour précédent, on saute.
  if (turn - hp.lastOpTurn < COOLDOWN_TURNS) {
    return {
      hostilePower: hp,
      hybridOps: ops,
      injectEventId: null,
      ultimatumNeeded: maybeUltimatum(hp, ops),
    };
  }

  // 3) Probabilité de déclenchement = aggression / 200 (max 50%).
  //    Déterministe via mulberry32 seedé sur le tour + acteur.
  const rng = mulberry32(hashSeed(turn, `hp:${hp.id}`));
  const trigger = rng();
  const triggerThreshold = hp.aggression / 200;
  if (trigger > triggerThreshold) {
    return {
      hostilePower: hp,
      hybridOps: ops,
      injectEventId: null,
      ultimatumNeeded: maybeUltimatum(hp, ops),
    };
  }

  // 4) Tirer un vecteur pondéré par doctrine × boost contextuel.
  const vector = pickWeighted<HybridOpVector>(
    HYBRID_VECTOR_KEYS,
    (k) => hp.doctrine[k] * vectorBoost(k, gauges, hidden),
    rng,
  );
  if (!vector) {
    return {
      hostilePower: hp,
      hybridOps: ops,
      injectEventId: null,
      ultimatumNeeded: maybeUltimatum(hp, ops),
    };
  }

  // 5) Tirer un eventId du pool, en privilégiant ceux pas encore vus.
  const pool = HYBRID_VECTORS[vector].eventPool;
  const seen = new Set(seenEventIds);
  const fresh = pool.filter((id) => !seen.has(id));
  const candidates = fresh.length > 0 ? fresh : pool;
  if (candidates.length === 0) {
    return {
      hostilePower: hp,
      hybridOps: ops,
      injectEventId: null,
      ultimatumNeeded: maybeUltimatum(hp, ops),
    };
  }
  const idx = Math.floor(rng() * candidates.length) % candidates.length;
  const chosenEventId = candidates[idx]!;

  // 6) Sévérité : déterminée par l'agressivité actuelle.
  const severity: "low" | "medium" | "high" =
    hp.aggression >= 70 ? "high" : hp.aggression >= 45 ? "medium" : "low";

  const newOp: HybridOperation = {
    id: `op_${vector}_t${turn}`,
    vector,
    turn,
    eventId: chosenEventId,
    severity,
    defused: false,
    resolved: false,
  };

  hp.lastOpTurn = turn;
  const nextOps = [...ops, newOp];
  // Si l'op qu'on vient de produire pousse l'acteur à l'ultimatum,
  // on NE l'injecte PAS comme event courant : la priorité absolue
  // doit aller à `ev_ultimatum` au tour suivant. Sans cette garde,
  // les deux delayed events arriveraient pour le même tour et
  // l'ordonnancement de `drawNextEvent` pourrait sortir l'op
  // hybride avant l'ultimatum, donnant un état incohérent
  // (warState=ultimatum + résolution d'event hybride normal).
  const ultimatum = maybeUltimatum(hp, nextOps);
  return {
    hostilePower: hp,
    hybridOps: nextOps,
    injectEventId: ultimatum ? null : chosenEventId,
    ultimatumNeeded: ultimatum,
  };
}

// ─── Décision d'ultimatum ───────────────────────────────────────────
//
// Critères : aggression >= 80 ET au moins 2 ops résolues NON
// désamorcées (= le joueur a mal réagi 2 fois). Le caller doit
// vérifier avant de poser que warState n'est pas déjà ≠ "peace".

function maybeUltimatum(hp: HostilePower, ops: HybridOperation[]): boolean {
  if (hp.aggression < 80) return false;
  const failed = ops.filter((o) => o.resolved && !o.defused).length;
  return failed >= 2;
}

export function shouldIssueUltimatum(state: GameState): boolean {
  if (!state.hostilePower) return false;
  if (state.warState && state.warState.status !== "peace") return false;
  return maybeUltimatum(state.hostilePower, state.hybridOps ?? []);
}

// ─── Marquage de résolution d'opération ─────────────────────────────
//
// Appelé par GameContext.resolveChoice quand l'event résolu fait
// partie du catalogue hybride. `defused` est vrai quand le delta
// d'agressivité de la décision est <= 0 (le joueur n'a pas fait
// monter l'adversaire) ET au moins une jauge clé n'a pas chuté.

export function recordEventResolution(
  ops: HybridOperation[] | undefined,
  eventId: string,
  defused: boolean,
): HybridOperation[] {
  const list = ops ?? [];
  if (!(eventId in EVENT_ID_TO_VECTOR)) return list;
  // On mette à jour l'op LA PLUS RÉCENTE non encore résolue qui
  // correspond à cet event (cas typique : op tirée au tour N et
  // résolue au tour N ou N+1).
  let updatedIndex = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].eventId === eventId && !list[i].resolved) {
      updatedIndex = i;
      break;
    }
  }
  if (updatedIndex === -1) {
    // L'event a été tiré mais pas via le moteur (ex: cascade ou
    // tirage normal). On enregistre rétroactivement pour que
    // l'attribution à l'acteur reste cohérente.
    const vector = EVENT_ID_TO_VECTOR[eventId];
    // Pas de Date.now() : on garde le moteur 100% pur.
    // L'index dans la liste actuelle suffit pour garantir l'unicité.
    const synthetic: HybridOperation = {
      id: `op_${vector}_retro_${eventId}_${list.length}`,
      vector,
      turn: 0,
      eventId,
      severity: "medium",
      defused,
      resolved: true,
    };
    return [...list, synthetic];
  }
  const next = list.slice();
  next[updatedIndex] = {
    ...next[updatedIndex],
    defused,
    resolved: true,
  };
  return next;
}

// ─── Effet d'une décision sur l'agressivité ─────────────────────────
//
// Heuristique simple : si une décision dégrade fortement diplomacy
// ou security, l'acteur monte ; si elle fait monter security/defense
// significativement, il monte aussi (effet "provocation"). Si le
// joueur fait des concessions diplomatiques, il baisse.

export function applyChoiceImpactOnAggression(
  hp: HostilePower,
  effectsApplied: Partial<Gauges>,
  hiddenApplied: Partial<HiddenGauges>,
): HostilePower {
  let delta = 0;
  // Concession diplomatique → calme l'adversaire.
  const dDiplo = effectsApplied.diplomacy ?? 0;
  if (dDiplo > 0) delta -= Math.min(dDiplo, 6);
  // Provocation = on monte les jauges sécuritaires/autorité fort.
  const dSec = effectsApplied.security ?? 0;
  if (dSec >= 6) delta += 3;
  const dAuth = effectsApplied.authority ?? 0;
  if (dAuth >= 6) delta += 2;
  // Faiblesses qui s'aggravent → l'adversaire est encouragé.
  const dCohesion = effectsApplied.cohesion ?? 0;
  if (dCohesion <= -6) delta += 2;
  const dCyber = hiddenApplied.cyberRisk ?? 0;
  if (dCyber >= 6) delta += 2;
  if (delta === 0) return hp;
  return { ...hp, aggression: clamp(hp.aggression + delta) };
}

// ─── Application d'une contre-mesure ────────────────────────────────
//
// Retourne un PATCH partiel qu'il faut merger dans le `setState`.
// Pas d'effet de bord ; le caller fait l'addition + le clamp final
// via les fonctions existantes (bouchant les jauges 0-100).

export interface CountermeasureApplyResult {
  hostilePower: HostilePower;
  effects: Partial<Gauges>;
  hiddenEffects: Partial<HiddenGauges>;
  countermeasure: ReturnType<typeof getCountermeasure>;
}

export function applyCountermeasure(
  hp: HostilePower | null | undefined,
  id: CountermeasureId,
): CountermeasureApplyResult | null {
  const cm = getCountermeasure(id);
  if (!cm || !hp) return null;
  // Single-use par mandat : on refuse silencieusement si déjà
  // appliquée. Le caller (GameContext) doit checker le retour
  // `null` pour ne pas afficher le toast de confirmation.
  const used = hp.usedCountermeasures ?? [];
  if (used.includes(id)) return null;
  const newHp: HostilePower = {
    ...hp,
    aggression: clamp(hp.aggression + cm.aggressionDelta),
    usedCountermeasures: [...used, id],
  };
  return {
    hostilePower: newHp,
    effects: cm.effects,
    hiddenEffects: cm.hiddenEffects,
    countermeasure: cm,
  };
}

export const COUNTERMEASURES = HYBRID_COUNTERMEASURES;
