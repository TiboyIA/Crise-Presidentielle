/**
 * solarStormEngine.ts — Tempêtes solaires comme crises physiques rares.
 *
 * Les éruptions solaires sont des événements exceptionnels qui perturbent
 * l'ensemble des systèmes nationaux : énergie, cyberdéfense, renseignement,
 * communications gouvernementales.
 *
 * Niveaux :
 *   faible   — perturbation légère, gestion courante
 *   modérée  — dommages notables, réponse recommandée
 *   forte    — crise sectorielle, décision urgente
 *   extrême  — crise multi-domaine, risque blackout si réseau fragile
 *
 * La tempête est rare (8 % par palier de 10 jours).
 * Elle expire automatiquement après un certain nombre d'actions.
 * Aucune destruction permanente garantie.
 */

import type { StrategyGameState } from "@/types/strategy";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SolarStormLevel = "faible" | "modérée" | "forte" | "extrême";

export interface SolarStormState {
  level:             SolarStormLevel;
  activeUntilAction: number;   // news.actionCount à l'expiration
}

export interface SolarStormInfo {
  level:       SolarStormLevel;
  label:       string;
  color:       string;
  description: string;
}

// ── Infos visuelles ────────────────────────────────────────────────────────────

export function getSolarStormInfo(level: SolarStormLevel): SolarStormInfo {
  switch (level) {
    case "faible":
      return {
        level,
        label:       "Tempête solaire faible",
        color:       "#8bc34a",
        description: "Perturbations mineures sur les satellites et les réseaux HF. Aucun danger immédiat.",
      };
    case "modérée":
      return {
        level,
        label:       "Tempête solaire modérée",
        color:       "#e8c44f",
        description: "Dommages notables sur la cyberdéfense et le renseignement satellitaire. Une réponse rapide est conseillée.",
      };
    case "forte":
      return {
        level,
        label:       "Tempête solaire forte",
        color:       "#e8864f",
        description: "Perturbations sevères sur l'énergie, les communications gouvernementales et les opérations militaires.",
      };
    case "extrême":
      return {
        level,
        label:       "TEMPÊTE SOLAIRE EXTRÊME",
        color:       "#e54848",
        description: "Éruption majeure. Risque de blackout si le réseau est fragilisé. Décision présidentielle urgente.",
      };
  }
}

// ── Durées par niveau (en actions joueur) ──────────────────────────────────────

const STORM_DURATION: Record<SolarStormLevel, [number, number]> = {
  faible:   [12, 18],
  modérée:  [18, 26],
  forte:    [22, 32],
  extrême:  [28, 40],
};

function rollDuration(level: SolarStormLevel): number {
  const [min, max] = STORM_DURATION[level];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Tirage du niveau ───────────────────────────────────────────────────────────

function rollStormLevel(): SolarStormLevel {
  const r = Math.random();
  if (r < 0.45) return "faible";
  if (r < 0.75) return "modérée";
  if (r < 0.93) return "forte";
  return "extrême";
}

// ── Effets passifs par palier de 10 jours ─────────────────────────────────────
// Discrets — jamais garantis fatals. Compensables par les choix événementiels.

const PASSIVE_DRAIN: Record<SolarStormLevel, {
  energy:       number;
  cyberDefense: number;
  intelligence: number;
  economyDelta: number;
  gridHit:      number;
}> = {
  faible:   { energy: -20,  cyberDefense: -3,  intelligence: -5,  economyDelta:  0, gridHit:  0 },
  modérée:  { energy: -50,  cyberDefense: -8,  intelligence: -10, economyDelta:  0, gridHit:  0 },
  forte:    { energy: -80,  cyberDefense: -12, intelligence: -15, economyDelta: -1, gridHit:  0 },
  extrême:  { energy: -120, cyberDefense: -18, intelligence: -20, economyDelta: -2, gridHit: -8 },
};

function applyPassiveDrain(state: StrategyGameState, level: SolarStormLevel): StrategyGameState {
  const d   = PASSIVE_DRAIN[level];
  const res = state.resources;
  let s = {
    ...state,
    resources: {
      ...res,
      energy:       Math.max(0, res.energy       + d.energy),
      cyberDefense: Math.max(0, res.cyberDefense + d.cyberDefense),
      intelligence: Math.max(0, res.intelligence + d.intelligence),
    },
  };

  if (d.economyDelta !== 0) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        economy: Math.max(0, s.nationalIndicators.economy + d.economyDelta),
      },
    };
  }

  if (d.gridHit !== 0) {
    const currentGrid = s.gridStability ?? 72;
    s = { ...s, gridStability: Math.max(0, currentGrid + d.gridHit) };
  }

  return s;
}

// ── Tick par palier de 10 jours ────────────────────────────────────────────────

const TRIGGER_PROBABILITY = 0.08; // 8 % par palier de 10 jours

export function tickSolarStorm(state: StrategyGameState): StrategyGameState {
  // Expiration de la tempête active
  if (state.solarStorm) {
    if (state.news.actionCount >= state.solarStorm.activeUntilAction) {
      return { ...state, solarStorm: undefined };
    }
    // Appliquer les drains passifs
    return applyPassiveDrain(state, state.solarStorm.level);
  }

  // Déclenchement aléatoire si aucune tempête en cours
  if (Math.random() < TRIGGER_PROBABILITY) {
    const level    = rollStormLevel();
    const duration = rollDuration(level);
    const solarStorm: SolarStormState = {
      level,
      activeUntilAction: state.news.actionCount + duration,
    };
    return { ...state, solarStorm };
  }

  return state;
}
