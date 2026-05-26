import type { StrategyGameState, StrategyResources } from "@/types/strategy";
import { applyIndicatorEffects } from "@/core/computeState";

// ── Générateur déterministe (même pattern que les autres engines) ─────────────

function seededVal(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function opportunityPeriod(mandateDay: number): number {
  return Math.floor(mandateDay / 10);
}

// ── Définitions des 5 opportunités ───────────────────────────────────────────

export type WeatherOpportunityId =
  | "ciel_clair"
  | "pluie_moderee"
  | "vent_stable"
  | "temperature_douce"
  | "periode_seche";

export interface WeatherOpportunityDef {
  id:           WeatherOpportunityId;
  label:        string;
  description:  string;
  icon:         string;
  color:        string;
  bonusLabel:   string;
  resourceBonus: Partial<StrategyResources>;
  indicatorBonus: Partial<Record<"economy" | "cohesion", number>>;
  durationDays: number;
}

export const WEATHER_OPPORTUNITIES: Record<WeatherOpportunityId, WeatherOpportunityDef> = {
  ciel_clair: {
    id:          "ciel_clair",
    label:       "Ciel dégagé",
    description: "Les conditions atmosphériques favorisent les opérations aériennes et la surveillance satellitaire.",
    icon:        "weather-sunny",
    color:       "#f59a3a",
    bonusLabel:  "+8 Renseignement · +5 Militaire",
    resourceBonus:  { intelligence: 8, military: 5 },
    indicatorBonus: {},
    durationDays: 14,
  },
  pluie_moderee: {
    id:          "pluie_moderee",
    label:       "Pluie modérée",
    description: "Des pluies régulières rechargent les nappes phréatiques et profitent aux cultures.",
    icon:        "weather-rainy",
    color:       "#4a9fff",
    bonusLabel:  "+80 M€ · +Économie",
    resourceBonus:  { money: 80 },
    indicatorBonus: { economy: 1 },
    durationDays: 12,
  },
  vent_stable: {
    id:          "vent_stable",
    label:       "Vent stable et soutenu",
    description: "Les vents réguliers maximisent la production éolienne nationale.",
    icon:        "turbine",
    color:       "#22d3ee",
    bonusLabel:  "+5 Énergie",
    resourceBonus:  { energy: 5 },
    indicatorBonus: {},
    durationDays: 10,
  },
  temperature_douce: {
    id:          "temperature_douce",
    label:       "Températures douces",
    description: "Un temps agréable stimule les activités extérieures et la cohésion sociale.",
    icon:        "thermometer",
    color:       "#3fbe7a",
    bonusLabel:  "+Cohésion légère",
    resourceBonus:  {},
    indicatorBonus: { cohesion: 1 },
    durationDays: 12,
  },
  periode_seche: {
    id:          "periode_seche",
    label:       "Période sèche favorable",
    description: "L'absence de précipitations accélère les chantiers d'infrastructure en cours.",
    icon:        "hammer-wrench",
    color:       "#e8a93a",
    bonusLabel:  "+6 Technologie · +50 M€",
    resourceBonus:  { technology: 6, money: 50 },
    indicatorBonus: {},
    durationDays: 10,
  },
};

const OPPORTUNITY_IDS: WeatherOpportunityId[] = [
  "ciel_clair",
  "pluie_moderee",
  "vent_stable",
  "temperature_douce",
  "periode_seche",
];

// ── Snapshot pour l'UI ───────────────────────────────────────────────────────

export interface WeatherOpportunitySnapshot {
  def:         WeatherOpportunityDef;
  expiresAt:   number;
  spawnedAt:   number;
  daysLeft:    number;
  progress:    number;   // 0-1, fraction of duration remaining
}

export function getWeatherOpportunitySnapshot(
  state: StrategyGameState,
): WeatherOpportunitySnapshot | null {
  const opp = state.weatherOpportunity;
  if (!opp || state.mandateDay >= opp.expiresAt) return null;
  const def       = WEATHER_OPPORTUNITIES[opp.id];
  const total     = opp.expiresAt - opp.spawnedAt;
  const elapsed   = state.mandateDay - opp.spawnedAt;
  const daysLeft  = Math.max(0, opp.expiresAt - state.mandateDay);
  const progress  = Math.max(0, 1 - elapsed / total);
  return { def, expiresAt: opp.expiresAt, spawnedAt: opp.spawnedAt, daysLeft, progress };
}

// ── Application des bonus (appelée une fois par tick de 10 jours) ─────────────

function applyBonus(
  state: StrategyGameState,
  def: WeatherOpportunityDef,
): StrategyGameState {
  const res = state.resources;
  const rb  = def.resourceBonus;
  const newRes: StrategyResources = {
    money:        Math.max(0, res.money        + (rb.money        ?? 0)),
    influence:    Math.max(0, res.influence    + (rb.influence    ?? 0)),
    energy:       Math.max(0, res.energy       + (rb.energy       ?? 0)),
    intelligence: Math.max(0, res.intelligence + (rb.intelligence ?? 0)),
    technology:   Math.max(0, res.technology   + (rb.technology   ?? 0)),
    military:     Math.max(0, res.military     + (rb.military     ?? 0)),
    cyberDefense: Math.max(0, res.cyberDefense + (rb.cyberDefense ?? 0)),
  };

  let next: StrategyGameState = { ...state, resources: newRes };

  if (def.indicatorBonus.economy || def.indicatorBonus.cohesion) {
    next = {
      ...next,
      nationalIndicators: applyIndicatorEffects(next.nationalIndicators, def.indicatorBonus),
    };
  }

  return next;
}

// ── Tick principal — appelé dans le bloc 10 jours ────────────────────────────

const SPAWN_PROBABILITY = 0.45;   // probabilité qu'une opportunité apparaisse

export function tickWeatherOpportunity(state: StrategyGameState): StrategyGameState {
  const current = state.weatherOpportunity;

  // Opportunité encore active → appliquer le bonus et continuer
  if (current && state.mandateDay < current.expiresAt) {
    const def = WEATHER_OPPORTUNITIES[current.id];
    return applyBonus(state, def);
  }

  // Pas d'opportunité active — tenter d'en déclencher une nouvelle
  const period = opportunityPeriod(state.mandateDay);
  const spawnR = seededVal(period, 7);   // salt 7 réservé aux opportunités

  if (spawnR >= SPAWN_PROBABILITY) {
    // Pas d'opportunité cette période
    return { ...state, weatherOpportunity: undefined };
  }

  // Sélection déterministe de l'opportunité
  const pickR  = seededVal(period, 8);
  const id     = OPPORTUNITY_IDS[Math.floor(pickR * OPPORTUNITY_IDS.length)]!;
  const def    = WEATHER_OPPORTUNITIES[id];

  const newOpp = {
    id,
    spawnedAt: state.mandateDay,
    expiresAt: state.mandateDay + def.durationDays,
  };

  const stateWithOpp = { ...state, weatherOpportunity: newOpp };
  return applyBonus(stateWithOpp, def);
}
