import type { NationalIndicators, StrategyGameState } from "@/types/strategy";
import { applyIndicatorEffects } from "@/core/computeState";
import { queueNews } from "@/logic/newsEngine";

// ── Générateur déterministe (même pattern que weatherEngine) ──────────────────

function seededVal(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Cycle agricole : change tous les 7 jours de mandat
function agroPeriod(mandateDay: number): number {
  return Math.floor(mandateDay / 7);
}

// ── Phénomènes agricoles ──────────────────────────────────────────────────────

export type AgroPhenomenonId =
  | "secheresse_longue"
  | "pluie_benefique"
  | "gel_tardif"
  | "grele"
  | "chaleur_excessive"
  | "humidite_prolongee";

export interface AgroPhenomenon {
  id:                 AgroPhenomenonId;
  label:              string;
  icon:               string;
  color:              string;
  soilMoistureDelta:  number;   // appliqué tous les 10 jours
  cropStressDelta:    number;
  economyDelta:       number;
  cohesionDelta:      number;
}

export const AGRO_PHENOMENA: Record<AgroPhenomenonId, AgroPhenomenon> = {
  pluie_benefique: {
    id: "pluie_benefique",
    label: "Pluie bénéfique",
    icon: "weather-rainy",
    color: "#4a9fff",
    soilMoistureDelta: +20,
    cropStressDelta:   -14,
    economyDelta:      +1,
    cohesionDelta:      0,
  },
  humidite_prolongee: {
    id: "humidite_prolongee",
    label: "Humidité prolongée",
    icon: "water-percent",
    color: "#1abc9c",
    soilMoistureDelta: +22,
    cropStressDelta:   +8,
    economyDelta:      -1,
    cohesionDelta:      0,
  },
  secheresse_longue: {
    id: "secheresse_longue",
    label: "Sécheresse prolongée",
    icon: "weather-sunny-alert",
    color: "#e8a93a",
    soilMoistureDelta: -16,
    cropStressDelta:   +18,
    economyDelta:      -2,
    cohesionDelta:     -1,
  },
  chaleur_excessive: {
    id: "chaleur_excessive",
    label: "Chaleur excessive",
    icon: "thermometer-high",
    color: "#e74c3c",
    soilMoistureDelta: -20,
    cropStressDelta:   +14,
    economyDelta:      -1,
    cohesionDelta:     -1,
  },
  gel_tardif: {
    id: "gel_tardif",
    label: "Gel tardif",
    icon: "snowflake",
    color: "#aed6f1",
    soilMoistureDelta: +5,
    cropStressDelta:   +24,
    economyDelta:      -2,
    cohesionDelta:     -1,
  },
  grele: {
    id: "grele",
    label: "Grêle",
    icon: "weather-hail",
    color: "#85c1e9",
    soilMoistureDelta: +5,
    cropStressDelta:   +30,
    economyDelta:      -3,
    cohesionDelta:     -2,
  },
};

// Distribution pondérée : favorable 37 % / modéré 20 % / sévère 43 %
function pickPhenomenon(r: number): AgroPhenomenonId {
  if (r < 0.22) return "pluie_benefique";
  if (r < 0.37) return "humidite_prolongee";
  if (r < 0.57) return "secheresse_longue";
  if (r < 0.72) return "chaleur_excessive";
  if (r < 0.87) return "gel_tardif";
  return "grele";
}

// ── Prévision récolte ─────────────────────────────────────────────────────────

export type HarvestForecast = "bonne" | "moyenne" | "mauvaise";

export function deriveHarvestForecast(soilMoisture: number, cropStress: number): HarvestForecast {
  if (soilMoisture >= 60 && cropStress <= 30) return "bonne";
  if (soilMoisture <= 25 || cropStress >= 65)  return "mauvaise";
  return "moyenne";
}

// ── État courant du phénomène (déterministe) ──────────────────────────────────

export interface AgroWeatherSnapshot {
  phenomenon:      AgroPhenomenon;
  soilMoisture:    number;
  cropStress:      number;
  harvestForecast: HarvestForecast;
}

export function getAgroWeatherSnapshot(state: StrategyGameState): AgroWeatherSnapshot {
  const period = agroPeriod(state.mandateDay);
  const r      = seededVal(period, 5);   // salt 5 pour ne pas collisionner avec weatherEngine
  const pId    = pickPhenomenon(r);

  const sm   = state.agroWeather?.soilMoisture ?? 55;
  const cs   = state.agroWeather?.cropStress   ?? 30;

  return {
    phenomenon:      AGRO_PHENOMENA[pId],
    soilMoisture:    sm,
    cropStress:      cs,
    harvestForecast: deriveHarvestForecast(sm, cs),
  };
}

// ── Tick (appelé dans le bloc 10 jours) ──────────────────────────────────────

const MIN_EVENT_GAP = 20; // jours de mandat entre deux événements agro

export function tickAgroWeather(state: StrategyGameState): StrategyGameState {
  const period = agroPeriod(state.mandateDay);
  const r      = seededVal(period, 5);
  const pId    = pickPhenomenon(r);
  const ph     = AGRO_PHENOMENA[pId];

  const prevSM = state.agroWeather?.soilMoisture ?? 55;
  const prevCS = state.agroWeather?.cropStress   ?? 30;

  // Appliquer les deltas + clamp 0-100 + dérive naturelle vers 50 (±3)
  const drift = (v: number, target: number) => v + (target - v > 0 ? 2 : -2);
  const newSM = Math.min(100, Math.max(0, drift(prevSM, 50) + ph.soilMoistureDelta));
  const newCS = Math.min(100, Math.max(0, drift(prevCS, 40) + ph.cropStressDelta));

  const harvest = deriveHarvestForecast(newSM, newCS);
  const lastEventAt = state.agroWeather?.lastEventAt ?? -999;
  const canTrigger  = state.mandateDay - lastEventAt >= MIN_EVENT_GAP;

  // Effets sur les indicateurs (légère variation)
  let nationalIndicators: NationalIndicators = state.nationalIndicators;
  if (ph.economyDelta !== 0 || ph.cohesionDelta !== 0) {
    nationalIndicators = applyIndicatorEffects(nationalIndicators, {
      economy:  ph.economyDelta,
      cohesion: ph.cohesionDelta,
    });
  }

  // Déclenchement d'événements interactifs selon seuils
  let news = state.news;
  let triggeredEventAt = lastEventAt;

  if (canTrigger) {
    if (newSM < 22) {
      news = queueNews(news, "agro_secheresse");
      triggeredEventAt = state.mandateDay;
    } else if (newCS > 70) {
      news = queueNews(news, "agro_hausse_prix_alimentaires");
      triggeredEventAt = state.mandateDay;
    } else if (pId === "grele") {
      news = queueNews(news, "agro_grele_catastrophique");
      triggeredEventAt = state.mandateDay;
    } else if (pId === "gel_tardif" && newCS > 55) {
      news = queueNews(news, "agro_gel_tardif");
      triggeredEventAt = state.mandateDay;
    } else if (harvest === "bonne" && (state.agroWeather?.harvestForecast ?? "moyenne") !== "bonne") {
      news = queueNews(news, "agro_recolte_exceptionnelle");
      triggeredEventAt = state.mandateDay;
    }
  }

  return {
    ...state,
    nationalIndicators,
    news,
    agroWeather: {
      soilMoisture:    newSM,
      cropStress:      newCS,
      harvestForecast: harvest,
      lastEventAt:     triggeredEventAt,
    },
  };
}
