/**
 * orbitalWindowEngine.ts — Fenêtres orbitales des satellites nationaux.
 *
 * Indicateur discret à 5 états : OrbitalState.
 * Modélise la disponibilité de la couverture satellitaire sans orbites réalistes.
 * L'état évolue aléatoirement via une machine de transition pondérée.
 *
 * États :
 *   fermée          — pas de fenêtre disponible, perte de renseignement
 *   courte          — fenêtre brève, légère amélioration de l'intelligence
 *   favorable       — couverture optimale, boost renseignement + probabilité cosmique +
 *   perturbée       — signal dégradé, perte renseignement + cyberdéfense
 *   tempête_solaire — éruption solaire, dommages cyberdéfense + renseignement
 *
 * Aucune gestion de satellites individuels. Aucune orbite calculée.
 */

import type { StrategyGameState } from "@/types/strategy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrbitalState = "fermée" | "courte" | "favorable" | "perturbée" | "tempête_solaire";

export interface OrbitalWindowState {
  current:        OrbitalState;
  remainingTicks: number;   // jours restants dans cet état
}

export interface OrbitalStateInfo {
  state: OrbitalState;
  label: string;
  color: string;
}

// ── Infos visuelles ───────────────────────────────────────────────────────────

export function getOrbitalStateInfo(state: OrbitalState): OrbitalStateInfo {
  switch (state) {
    case "fermée":          return { state, label: "Fenêtre fermée",   color: "#5e6678" };
    case "courte":          return { state, label: "Fenêtre courte",   color: "#8bc34a" };
    case "favorable":       return { state, label: "Fenêtre favorable", color: "#4caf82" };
    case "perturbée":       return { state, label: "Signal perturbé",  color: "#e8864f" };
    case "tempête_solaire": return { state, label: "TEMPÊTE SOLAIRE",  color: "#e54848" };
  }
}

// ── Durées par état (en jours) ────────────────────────────────────────────────

const STATE_DURATION: Record<OrbitalState, [number, number]> = {
  fermée:          [5, 9],
  courte:          [3, 5],
  favorable:       [4, 7],
  perturbée:       [4, 7],
  tempête_solaire: [2, 4],
};

function rollDuration(state: OrbitalState): number {
  const [min, max] = STATE_DURATION[state];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Transitions pondérées ─────────────────────────────────────────────────────

const TRANSITIONS: Record<OrbitalState, { value: OrbitalState; weight: number }[]> = {
  fermée: [
    { value: "fermée",          weight: 15 },
    { value: "courte",          weight: 35 },
    { value: "favorable",       weight: 25 },
    { value: "perturbée",       weight: 15 },
    { value: "tempête_solaire", weight: 10 },
  ],
  courte: [
    { value: "fermée",          weight: 20 },
    { value: "courte",          weight: 15 },
    { value: "favorable",       weight: 40 },
    { value: "perturbée",       weight: 15 },
    { value: "tempête_solaire", weight: 10 },
  ],
  favorable: [
    { value: "fermée",          weight: 20 },
    { value: "courte",          weight: 30 },
    { value: "favorable",       weight: 20 },
    { value: "perturbée",       weight: 15 },
    { value: "tempête_solaire", weight: 15 },
  ],
  perturbée: [
    { value: "fermée",          weight: 30 },
    { value: "courte",          weight: 20 },
    { value: "favorable",       weight: 15 },
    { value: "perturbée",       weight: 25 },
    { value: "tempête_solaire", weight: 10 },
  ],
  tempête_solaire: [
    { value: "fermée",          weight: 35 },
    { value: "courte",          weight: 20 },
    { value: "favorable",       weight: 5  },
    { value: "perturbée",       weight: 35 },
    { value: "tempête_solaire", weight: 5  },
  ],
};

function weightedRoll(options: { value: OrbitalState; weight: number }[]): OrbitalState {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.weight;
    if (r <= 0) return o.value;
  }
  return options[options.length - 1].value;
}

// ── État initial ──────────────────────────────────────────────────────────────

export const DEFAULT_ORBITAL_WINDOW: OrbitalWindowState = {
  current:        "courte",
  remainingTicks: 4,
};

// ── Tick journalier ───────────────────────────────────────────────────────────

export function tickOrbitalWindow(state: StrategyGameState): StrategyGameState {
  const ow = state.orbitalWindow ?? { ...DEFAULT_ORBITAL_WINDOW };

  // Décompte de durée — transition si écoulée
  let nextOw: OrbitalWindowState;
  if (ow.remainingTicks > 1) {
    nextOw = { ...ow, remainingTicks: ow.remainingTicks - 1 };
  } else {
    const nextState = weightedRoll(TRANSITIONS[ow.current]);
    nextOw = { current: nextState, remainingTicks: rollDuration(nextState) };
  }

  let s: StrategyGameState = { ...state, orbitalWindow: nextOw };

  // Effets discrets selon l'état actif
  const active = nextOw.current;

  if (active === "favorable") {
    s = { ...s, resources: { ...s.resources, intelligence: s.resources.intelligence + 6 } };
  } else if (active === "courte") {
    s = { ...s, resources: { ...s.resources, intelligence: s.resources.intelligence + 3 } };
  } else if (active === "perturbée") {
    s = {
      ...s,
      resources: {
        ...s.resources,
        intelligence: Math.max(0, s.resources.intelligence - 4),
        cyberDefense: Math.max(0, s.resources.cyberDefense - 3),
      },
    };
  } else if (active === "tempête_solaire") {
    s = {
      ...s,
      resources: {
        ...s.resources,
        intelligence: Math.max(0, s.resources.intelligence - 6),
        cyberDefense: Math.max(0, s.resources.cyberDefense - 8),
      },
    };
  } else {
    // fermée — légère perte de couverture
    s = { ...s, resources: { ...s.resources, intelligence: Math.max(0, s.resources.intelligence - 2) } };
  }

  return s;
}
