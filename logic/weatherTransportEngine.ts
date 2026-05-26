import type { StrategyGameState, NewsLogEntry } from "@/types/strategy";
import { applyIndicatorEffects } from "@/core/computeState";
import { generateWeatherState } from "@/logic/weatherEngine";
import type { WeatherTypeId, VigilanceLevel } from "@/data/weatherEvents";

// ── Définition des perturbations ──────────────────────────────────────────────

interface TransportEffect {
  label:       string;
  source:      string;
  icon:        string;
  color:       string;
  description: string;
  // Effets par tick de 10 jours à vigilance orange (plein = rouge)
  economyDelta:    number;   // indicateur économie
  securityDelta:   number;   // indicateur sécurité
  moneyDelta:      number;   // ressource argent (coût d'intervention)
  militaryDelta:   number;   // ressource militaire (opérations retardées)
}

const TRANSPORT_EFFECTS: Partial<Record<WeatherTypeId, TransportEffect>> = {
  // 1. Neige — routes enneigées
  neige_exceptionnelle: {
    label:        "Routes enneigées — circulation perturbée",
    source:       "Direction des Routes et Autoroutes",
    icon:         "road-variant",
    color:        "#93c5fd",
    description:  "L'enneigement massif paralyse les axes routiers et ralentit les convois.",
    economyDelta:  -2,
    securityDelta: -1,
    moneyDelta:    -80,
    militaryDelta: -5,
  },
  // 2. Brouillard — aéroports ralentis
  brouillard_dense: {
    label:        "Aéroports ralentis — visibilité réduite",
    source:       "Direction Générale de l'Aviation Civile",
    icon:         "airplane-off",
    color:        "#7e8a9e",
    description:  "Le brouillard dense immobilise le trafic aérien et perturbe les transferts sensibles.",
    economyDelta:  -1,
    securityDelta: -1,
    moneyDelta:    -60,
    militaryDelta: -8,
  },
  // 3. Tempête — ports bloqués
  tempete: {
    label:        "Ports bloqués — navigation suspendue",
    source:       "Secrétariat d'État à la Mer",
    icon:         "ferry",
    color:        "#e54848",
    description:  "Les conditions de tempête interdisent toute navigation commerciale et militaire.",
    economyDelta:  -2,
    securityDelta: -2,
    moneyDelta:    -100,
    militaryDelta: -10,
  },
  // 4. Pluies intenses — routes coupées
  pluies_intenses: {
    label:        "Routes coupées — inondations locales",
    source:       "Direction des Routes et Autoroutes",
    icon:         "car-off",
    color:        "#a78bfa",
    description:  "Des crues locales coupent plusieurs axes stratégiques et ralentissent les secours.",
    economyDelta:  -2,
    securityDelta: -1,
    moneyDelta:    -70,
    militaryDelta: -6,
  },
  // 5. Canicule — rails sous tension
  canicule: {
    label:        "Rails sous tension — dilatation thermique",
    source:       "Réseau Ferré National",
    icon:         "train",
    color:        "#f05a28",
    description:  "La chaleur extrême impose des ralentissements ferroviaires sur tout le réseau.",
    economyDelta:  -1,
    securityDelta: -1,
    moneyDelta:    -50,
    militaryDelta: -4,
  },
};

// Multiplicateur selon le niveau de vigilance
const VIGILANCE_SCALE: Record<VigilanceLevel, number> = {
  vert:   0,     // aucune perturbation
  jaune:  0.4,
  orange: 0.7,
  rouge:  1.0,
};

const MAX_LOG = 30;

// ── Snapshot pour l'UI — sans état stocké ────────────────────────────────────

export interface TransportDisruptionSummary {
  label:         string;
  icon:          string;
  color:         string;
  description:   string;
  economyDelta:  number;
  moneyDelta:    number;
  militaryDelta: number;
  vigilance:     VigilanceLevel;
  scale:         number;
}

export function getTransportDisruptionSummary(
  mandateDay: number,
): TransportDisruptionSummary | null {
  const weather  = generateWeatherState(mandateDay);
  const typeId   = weather.typeDef.id as WeatherTypeId;
  const effect   = TRANSPORT_EFFECTS[typeId];
  const vigLevel = weather.vigilance.level;
  const scale    = VIGILANCE_SCALE[vigLevel];

  if (!effect || scale === 0) return null;

  return {
    label:         effect.label,
    icon:          effect.icon,
    color:         effect.color,
    description:   effect.description,
    economyDelta:  Math.ceil(effect.economyDelta  * scale),
    moneyDelta:    Math.ceil(effect.moneyDelta    * scale),
    militaryDelta: Math.ceil(effect.militaryDelta * scale),
    vigilance:     vigLevel,
    scale,
  };
}

// ── Tick principal — appelé dans le bloc 10 jours ────────────────────────────

export function tickWeatherTransport(state: StrategyGameState): StrategyGameState {
  const weather  = generateWeatherState(state.mandateDay);
  const typeId   = weather.typeDef.id as WeatherTypeId;
  const effect   = TRANSPORT_EFFECTS[typeId];
  const vigLevel = weather.vigilance.level;
  const scale    = VIGILANCE_SCALE[vigLevel];

  if (!effect || scale === 0) return state;

  const ecoD  = Math.ceil(effect.economyDelta  * scale);
  const secD  = Math.ceil(effect.securityDelta * scale);
  const monD  = Math.ceil(effect.moneyDelta    * scale);
  const milD  = Math.ceil(effect.militaryDelta * scale);

  // Indicateurs nationaux
  let nationalIndicators = state.nationalIndicators;
  if (ecoD !== 0 || secD !== 0) {
    nationalIndicators = applyIndicatorEffects(nationalIndicators, {
      economy:  ecoD,
      security: secD,
    });
  }

  // Ressources
  const resources = {
    ...state.resources,
    money:    Math.max(0, state.resources.money    + monD),
    military: Math.max(0, state.resources.military + milD),
  };

  // Entrée dans le Journal de Crise
  const entry: NewsLogEntry = {
    eventId:   `transport_disruption_${typeId}`,
    title:     effect.label,
    source:    effect.source,
    type:      "economie",
    urgency:   vigLevel === "rouge" ? "forte" : "moyenne",
    timestamp: Date.now(),
    effects:   { money: monD },
  };

  const news = {
    ...state.news,
    log: [...state.news.log.slice(-MAX_LOG + 1), entry],
    unreadCount: state.news.unreadCount + 1,
  };

  return { ...state, nationalIndicators, resources, news };
}
