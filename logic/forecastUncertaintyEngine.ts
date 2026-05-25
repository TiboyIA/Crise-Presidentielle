import type { StrategyGameState } from "@/types/strategy";
import { clamp } from "@/logic/utils";

export type ConfidenceLevel = "faible" | "moderee" | "elevee";
export type ForecastSeverity = "mineure" | "moderee" | "majeure" | "catastrophique";

export interface ForecastUncertainty {
  phenomenon: string;
  icon: string;
  probability: number;      // 20–95 (%)
  confidence: ConfidenceLevel;
  expectedSeverity: ForecastSeverity;
  affectedSystems: string[];
  falseAlarmRisk: number;   // 0–100
}

export interface ConfidenceDef {
  label: string;
  color: string;
  description: string;
}

export const CONFIDENCE_DEFS: Record<ConfidenceLevel, ConfidenceDef> = {
  faible: {
    label: "Faible",
    color: "#e8a93a",
    description: "Données fragmentaires — prudence maximale conseillée",
  },
  moderee: {
    label: "Modérée",
    color: "#4a9fff",
    description: "Consensus partiel — scénario probable mais incertain",
  },
  elevee: {
    label: "Élevée",
    color: "#3fbe7a",
    description: "Modèles convergents — fiabilité reconnue des services",
  },
};

export const SEVERITY_DEFS: Record<ForecastSeverity, { label: string; color: string }> = {
  mineure:        { label: "Mineure",        color: "#3fbe7a" },
  moderee:        { label: "Modérée",        color: "#e8a93a" },
  majeure:        { label: "Majeure",        color: "#e87a3a" },
  catastrophique: { label: "Catastrophique", color: "#e54848" },
};

// ── 5 types de prévisions incertaines ────────────────────────────────────────

interface ForecastTemplate {
  phenomenon: string;
  icon: string;
  affectedSystems: string[];
  baseFalseAlarmRisk: number;
}

const FORECAST_TEMPLATES: ForecastTemplate[] = [
  {
    phenomenon: "Canicule prolongée",
    icon: "thermometer-high",
    affectedSystems: ["Santé publique", "Énergie", "Agriculture"],
    baseFalseAlarmRisk: 25,
  },
  {
    phenomenon: "Tempête littorale",
    icon: "weather-hurricane",
    affectedSystems: ["Infrastructure", "Pêche", "Transport maritime"],
    baseFalseAlarmRisk: 35,
  },
  {
    phenomenon: "Inondations soudaines",
    icon: "home-flood",
    affectedSystems: ["Logement", "Agriculture", "Réseau routier"],
    baseFalseAlarmRisk: 40,
  },
  {
    phenomenon: "Gel précoce",
    icon: "snowflake-alert",
    affectedSystems: ["Agriculture", "Transport", "Énergie"],
    baseFalseAlarmRisk: 45,
  },
  {
    phenomenon: "Épisode de neige exceptionnel",
    icon: "weather-snowy-heavy",
    affectedSystems: ["Transport", "Hôpitaux", "Approvisionnement"],
    baseFalseAlarmRisk: 50,
  },
];

// ── Génération déterministe ───────────────────────────────────────────────────

function seededVal(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const FORECAST_PERIOD_DAYS = 4;

export function forecastPeriod(mandateDay: number): number {
  return Math.floor(mandateDay / FORECAST_PERIOD_DAYS);
}

export function generateForecast(mandateDay: number): ForecastUncertainty {
  const period = forecastPeriod(mandateDay);

  const templateIdx = Math.floor(seededVal(period, 30) * FORECAST_TEMPLATES.length);
  const template = FORECAST_TEMPLATES[templateIdx]!;

  const probability = Math.round(20 + seededVal(period, 31) * 75);

  const confR = seededVal(period, 32);
  const confidence: ConfidenceLevel = confR < 0.35 ? "faible" : confR < 0.70 ? "moderee" : "elevee";

  const sevR = seededVal(period, 33);
  const expectedSeverity: ForecastSeverity =
    sevR < 0.35 ? "mineure" : sevR < 0.65 ? "moderee" : sevR < 0.88 ? "majeure" : "catastrophique";

  const confMod = confidence === "faible" ? 20 : confidence === "elevee" ? -15 : 0;
  const falseAlarmRisk = clamp(
    template.baseFalseAlarmRisk + confMod + Math.round((seededVal(period, 34) - 0.5) * 20),
  );

  return {
    phenomenon: template.phenomenon,
    icon: template.icon,
    probability,
    confidence,
    expectedSeverity,
    affectedSystems: template.affectedSystems,
    falseAlarmRisk,
  };
}

// ── Actions joueur ────────────────────────────────────────────────────────────

export interface ForecastActionResult {
  success: boolean;
  reason?: string;
  wasRealEvent?: boolean;
  outcome?: string;
}

export const PREPARE_COST_MONEY    = 80;
export const ALERT_COST_INFLUENCE  = 30;

export function canPrepareForecast(state: StrategyGameState): { ok: boolean; reason?: string } {
  const period = forecastPeriod(state.mandateDay);
  if ((state.lastForecastPreparedPeriod ?? -1) >= period) {
    return { ok: false, reason: "Préparation déjà engagée ce cycle météo." };
  }
  if (state.resources.money < PREPARE_COST_MONEY) {
    return { ok: false, reason: `Fonds insuffisants (coût : ${PREPARE_COST_MONEY} M€).` };
  }
  return { ok: true };
}

export function canIssueAlert(state: StrategyGameState): { ok: boolean; reason?: string } {
  const period = forecastPeriod(state.mandateDay);
  if ((state.lastForecastAlertPeriod ?? -1) >= period) {
    return { ok: false, reason: "Alerte publique déjà émise ce cycle météo." };
  }
  if (state.resources.influence < ALERT_COST_INFLUENCE) {
    return { ok: false, reason: `Influence insuffisante (coût : ${ALERT_COST_INFLUENCE}).` };
  }
  return { ok: true };
}

// Action 1 : Préparer (coûte 80 M€)
// Si le phénomène était réel → institutionalStability+2, administrationMorale+3
// Si fausse alerte           → popularFatigue+2, money wasted

export function applyPrepareForecast(
  state: StrategyGameState,
): { result: ForecastActionResult; newState: StrategyGameState } {
  const check = canPrepareForecast(state);
  if (!check.ok) return { result: { success: false, reason: check.reason }, newState: state };

  const forecast = generateForecast(state.mandateDay);
  const isFalseAlarm = Math.random() < forecast.falseAlarmRisk / 100;
  const period = forecastPeriod(state.mandateDay);

  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, money: state.resources.money - PREPARE_COST_MONEY },
    hiddenPolitics: {
      ...state.hiddenPolitics,
      institutionalStability: isFalseAlarm
        ? state.hiddenPolitics.institutionalStability
        : clamp(state.hiddenPolitics.institutionalStability + 2),
      popularFatigue: isFalseAlarm
        ? clamp(state.hiddenPolitics.popularFatigue + 2)
        : state.hiddenPolitics.popularFatigue,
    },
    administrationMorale: isFalseAlarm
      ? state.administrationMorale
      : clamp((state.administrationMorale ?? 60) + 3),
    lastForecastPreparedPeriod: period,
  };

  const outcome = isFalseAlarm
    ? "Fausse alerte — les équipes ont été mobilisées inutilement. Coût assumé, moral légèrement atteint."
    : "Bonne anticipation — les services ont limité l'impact du phénomène. Stabilité renforcée.";

  return { result: { success: true, wasRealEvent: !isFalseAlarm, outcome }, newState };
}

// Action 2 : Émettre une alerte publique (coûte 30 influence)
// Si le phénomène était réel → popularity+2, institutionalStability+3
// Si fausse alerte           → popularity-2, popularFatigue+3

export function applyIssuePublicAlert(
  state: StrategyGameState,
): { result: ForecastActionResult; newState: StrategyGameState } {
  const check = canIssueAlert(state);
  if (!check.ok) return { result: { success: false, reason: check.reason }, newState: state };

  const forecast = generateForecast(state.mandateDay);
  const isFalseAlarm = Math.random() < forecast.falseAlarmRisk / 100;
  const period = forecastPeriod(state.mandateDay);

  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, influence: state.resources.influence - ALERT_COST_INFLUENCE },
    nationalIndicators: {
      ...state.nationalIndicators,
      popularity: clamp(state.nationalIndicators.popularity + (isFalseAlarm ? -2 : 2)),
    },
    hiddenPolitics: {
      ...state.hiddenPolitics,
      institutionalStability: isFalseAlarm
        ? state.hiddenPolitics.institutionalStability
        : clamp(state.hiddenPolitics.institutionalStability + 3),
      popularFatigue: isFalseAlarm
        ? clamp(state.hiddenPolitics.popularFatigue + 3)
        : state.hiddenPolitics.popularFatigue,
    },
    lastForecastAlertPeriod: period,
  };

  const outcome = isFalseAlarm
    ? "Fausse alerte publique — l'opinion reste sceptique. Crédibilité légèrement entamée."
    : "Alerte fondée — la population salue la réactivité présidentielle. Confiance renforcée.";

  return { result: { success: true, wasRealEvent: !isFalseAlarm, outcome }, newState };
}
