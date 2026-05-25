import {
  WEATHER_TYPES,
  WEATHER_TYPE_LIST,
  WEATHER_ZONES,
  VIGILANCE_DEFS,
  type VigilanceLevel,
  type WeatherTypeDef,
  type VigilanceDef,
} from "@/data/weatherEvents";

// ── Générateur pseudo-aléatoire déterministe ──────────────────────────────────
// Produit une valeur stable dans [0, 1) pour un (seed, salt) donné.
// Pas de bibliothèque externe — Math.sin seul suffit pour de l'ambiance fictive.

function seededVal(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Période météo : change tous les 4 jours de mandat ─────────────────────────

function weatherPeriod(mandateDay: number): number {
  return Math.floor(mandateDay / 4);
}

// ── Sélection du niveau de vigilance ─────────────────────────────────────────
// Distribution : vert 25 % | jaune 40 % | orange 25 % | rouge 10 %

function pickVigilance(r: number): VigilanceLevel {
  if (r < 0.25) return "vert";
  if (r < 0.65) return "jaune";
  if (r < 0.90) return "orange";
  return "rouge";
}

// ── Prévision sur 3 périodes ──────────────────────────────────────────────────

export interface WeatherPeriodForecast {
  label:     string;   // "Aujourd'hui", "Demain", "Après-demain"
  vigilance: VigilanceDef;
  typeDef:   WeatherTypeDef;
  summary:   string;
}

function vigilanceDelta(base: VigilanceLevel, r: number): VigilanceLevel {
  const order: VigilanceLevel[] = ["vert", "jaune", "orange", "rouge"];
  const idx  = order.indexOf(base);
  const delta = r < 0.25 ? -1 : r < 0.60 ? 0 : 1;
  return order[Math.max(0, Math.min(3, idx + delta))] ?? base;
}

const PERIOD_LABELS = ["Aujourd'hui", "Demain", "Après-demain"];

// ── État météo complet ────────────────────────────────────────────────────────

export interface WeatherState {
  typeDef:         WeatherTypeDef;
  vigilance:       VigilanceDef;
  zone:            string;
  situation:       string;
  forecast:        string;
  recommendation:  string;
  periods:         WeatherPeriodForecast[];
  mandateDay:      number;
  lastUpdateDay:   number;   // premier jour de la période courante
}

export function generateWeatherState(mandateDay: number): WeatherState {
  const period = weatherPeriod(mandateDay);

  // Sélections déterministes
  const typeIdx    = Math.floor(seededVal(period, 0) * WEATHER_TYPE_LIST.length);
  const vigilIdx   = seededVal(period, 1);
  const zoneIdx    = Math.floor(seededVal(period, 2) * WEATHER_ZONES.length);
  const situIdx    = Math.floor(seededVal(period, 3) * 3);
  const foreIdx    = Math.floor(seededVal(period, 4) * 3);

  const typeDef   = WEATHER_TYPE_LIST[typeIdx] ?? WEATHER_TYPE_LIST[0]!;
  const vigLevel  = pickVigilance(vigilIdx);
  const vigilance = VIGILANCE_DEFS[vigLevel];
  const zone      = WEATHER_ZONES[zoneIdx] ?? WEATHER_ZONES[0]!;
  const situation = typeDef.situations[situIdx] ?? typeDef.situations[0]!;
  const forecast  = typeDef.forecasts[foreIdx]  ?? typeDef.forecasts[0]!;

  // Prévision J / J+1 / J+2
  const periods: WeatherPeriodForecast[] = PERIOD_LABELS.map((label, i) => {
    const subPeriod     = weatherPeriod(mandateDay + i * 4);
    const subTypeIdx    = Math.floor(seededVal(subPeriod, 0) * WEATHER_TYPE_LIST.length);
    const subVigR       = seededVal(subPeriod, 1);
    const subForeIdx    = Math.floor(seededVal(subPeriod, 4) * 3);

    // J = situation courante ; J+1/J+2 peuvent évoluer légèrement
    const subTypeDef = i === 0
      ? typeDef
      : WEATHER_TYPE_LIST[subTypeIdx] ?? typeDef;
    const subVigLevel = i === 0
      ? vigLevel
      : vigilanceDelta(vigLevel, seededVal(period, 10 + i));
    const subVigilance = VIGILANCE_DEFS[subVigLevel];
    const subVigRUsed  = i === 0 ? vigilIdx : subVigR;
    void subVigRUsed; // non utilisé directement — seul subVigLevel compte

    return {
      label,
      vigilance: subVigilance,
      typeDef:   subTypeDef,
      summary:   i === 0
        ? situation
        : (subTypeDef.forecasts[subForeIdx] ?? subTypeDef.forecasts[0]!),
    };
  });

  return {
    typeDef,
    vigilance,
    zone,
    situation,
    forecast,
    recommendation: typeDef.recommendations[vigLevel],
    periods,
    mandateDay,
    lastUpdateDay: period * 4,
  };
}

// ── Jours restants avant la prochaine mise à jour ─────────────────────────────

export function daysUntilNextUpdate(mandateDay: number): number {
  const period = weatherPeriod(mandateDay);
  const nextUpdateDay = (period + 1) * 4;
  return Math.max(0, nextUpdateDay - mandateDay);
}
