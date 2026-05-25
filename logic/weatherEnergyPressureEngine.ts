import type { StrategyGameState, NewsLogEntry } from "@/types/strategy";
import { generateWeatherState } from "@/logic/weatherEngine";
import type { WeatherTypeId } from "@/data/weatherEvents";
import { clamp } from "@/logic/utils";

// ── 5 effets météo sur l'énergie ──────────────────────────────────────────────
//
// energyDelta : points d'énergie ajoutés (négatif = consommation)
// notable     : true = entrée dans le Journal de Crise
// blackoutRisk: true = risque de panne si énergie déjà faible

interface EnergyWeatherEffect {
  energyDelta:  number;
  label:        string;
  source:       string;
  notable:      boolean;
  blackoutRisk: boolean;
}

const ENERGY_EFFECTS: Record<WeatherTypeId, EnergyWeatherEffect> = {
  // 1. Canicule — climatisation en surchauffe
  canicule: {
    energyDelta:  -5,
    label:        "Canicule : pic de consommation électrique — climatisation en surchauffe",
    source:       "Réseau de Transport de l'Électricité",
    notable:      true,
    blackoutRisk: false,
  },
  // 2. Vague de froid — chauffage intensif
  vague_de_froid: {
    energyDelta:  -8,
    label:        "Vague de froid : consommation énergétique au maximum — appel de puissance record",
    source:       "Réseau de Transport de l'Électricité",
    notable:      true,
    blackoutRisk: false,
  },
  // 3. Tempête — risque de panne réseau
  tempete: {
    energyDelta:  -3,
    label:        "Tempête : perturbations sur le réseau électrique — lignes à risque",
    source:       "Réseau de Transport de l'Électricité",
    notable:      true,
    blackoutRisk: true,
  },
  // 4. Sécheresse — production hydroélectrique en baisse
  secheresse: {
    energyDelta:  -4,
    label:        "Sécheresse : production hydroélectrique dégradée — barrages en sous-capacité",
    source:       "Agence Nationale de l'Énergie",
    notable:      true,
    blackoutRisk: false,
  },
  // 5. Vents violents — production renouvelable en hausse (éoliennes)
  vents_violents: {
    energyDelta:  +6,
    label:        "Vents soutenus : production éolienne en hausse — marge énergétique renforcée",
    source:       "Agence Nationale de l'Énergie",
    notable:      true,
    blackoutRisk: false,
  },
  // Bonus : brouillard dense — ensoleillement quasi nul (solaire -)
  brouillard_dense: {
    energyDelta:  -3,
    label:        "Ciel couvert persistant : production solaire très réduite",
    source:       "Agence Nationale de l'Énergie",
    notable:      true,
    blackoutRisk: false,
  },
  // Orage électrique — réseau sous tension
  orage_electrique: {
    energyDelta:  -5,
    label:        "Orage électrique : surtensions sur le réseau — protections automatiques activées",
    source:       "Réseau de Transport de l'Électricité",
    notable:      true,
    blackoutRisk: true,
  },
  // Neige — chauffage + logistique d'approvisionnement
  neige_exceptionnelle: {
    energyDelta:  -6,
    label:        "Neige exceptionnelle : chauffage en surtension — approvisionnement perturbé",
    source:       "Réseau de Transport de l'Électricité",
    notable:      true,
    blackoutRisk: false,
  },
  // Pluies intenses — hydro légèrement favorisé
  pluies_intenses: {
    energyDelta:  +2,
    label:        "Pluies soutenues : production hydroélectrique légèrement améliorée",
    source:       "Agence Nationale de l'Énergie",
    notable:      false,
    blackoutRisk: false,
  },
  // Épisode méditerranéen — neutre (chaud mais pas canicule)
  episode_mediterraneen: {
    energyDelta:  0,
    label:        "",
    source:       "",
    notable:      false,
    blackoutRisk: false,
  },
};

const MAX_LOG = 30;

// ── Réduction selon le niveau du ministère de l'Énergie ──────────────────────

function energyMinistryReduction(state: StrategyGameState): number {
  const level = state.buildings.find((b) => b.id === "energy_ministry")?.level ?? 0;
  if (level >= 3) return 0.40;
  if (level >= 1) return 0.20;
  return 0;
}

// ── Tick principal — appelé tous les 10 jours ─────────────────────────────────

export function tickWeatherEnergyPressure(state: StrategyGameState): StrategyGameState {
  const weather = generateWeatherState(state.mandateDay);
  const typeId  = weather.typeDef.id as WeatherTypeId;
  const effect  = ENERGY_EFFECTS[typeId];

  if (!effect || effect.energyDelta === 0) return state;

  const reduction    = energyMinistryReduction(state);
  const adjustedDelta = effect.energyDelta > 0
    ? effect.energyDelta
    : Math.ceil(effect.energyDelta * (1 - reduction));

  const currentEnergy = state.resources.energy;
  const newEnergy     = clamp(currentEnergy + adjustedDelta);

  let newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, energy: newEnergy },
  };

  // ── Entrée dans le Journal de Crise ───────────────────────────────────────

  if (effect.notable) {
    const effectEntry: NewsLogEntry = {
      eventId:   `weather_energy_${typeId}`,
      title:     effect.label,
      source:    effect.source,
      type:      "economie",
      urgency:   adjustedDelta < -5 ? "moyenne" : "faible",
      timestamp: Date.now(),
      effects:   { energy: adjustedDelta },
    };
    newState = {
      ...newState,
      news: {
        ...newState.news,
        log: [...newState.news.log.slice(-MAX_LOG + 1), effectEntry],
        unreadCount: newState.news.unreadCount + 1,
      },
    };
  }

  // ── Alerte blackout si énergie critique ───────────────────────────────────

  if (effect.blackoutRisk && newEnergy < 20) {
    const blackoutEntry: NewsLogEntry = {
      eventId:   "weather_energy_blackout_risk",
      title:     "Risque de blackout électrique — marge énergétique critique, réseau fragilisé",
      source:    "Cellule de Crise Énergie",
      type:      "economie",
      urgency:   "forte",
      timestamp: Date.now(),
      effects:   {},
    };
    newState = {
      ...newState,
      news: {
        ...newState.news,
        log: [...newState.news.log.slice(-MAX_LOG + 1), blackoutEntry],
        unreadCount: newState.news.unreadCount + 1,
      },
    };
  }

  return newState;
}

// ── Résumé pour affichage UI ──────────────────────────────────────────────────

export interface EnergyPressureSummary {
  energyDelta:  number;
  label:        string;
  blackoutRisk: boolean;
}

export function getEnergyPressureSummary(
  mandateDay: number,
  ministryLevel: number,
): EnergyPressureSummary {
  const weather = generateWeatherState(mandateDay);
  const typeId  = weather.typeDef.id as WeatherTypeId;
  const effect  = ENERGY_EFFECTS[typeId];

  if (!effect || effect.energyDelta === 0) {
    return { energyDelta: 0, label: "Conditions neutres pour le réseau énergétique", blackoutRisk: false };
  }

  const reduction    = ministryLevel >= 3 ? 0.40 : ministryLevel >= 1 ? 0.20 : 0;
  const adjustedDelta = effect.energyDelta > 0
    ? effect.energyDelta
    : Math.ceil(effect.energyDelta * (1 - reduction));

  return {
    energyDelta:  adjustedDelta,
    label:        effect.label,
    blackoutRisk: effect.blackoutRisk,
  };
}
