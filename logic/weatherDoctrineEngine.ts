import type { StrategyGameState } from "@/types/strategy";

// ── Identifiants ──────────────────────────────────────────────────────────────

export type WeatherDoctrineId =
  | "prudence_maximale"
  | "alerte_precoce"
  | "communication_rassurante"
  | "gestion_economique"
  | "mobilisation_preventive";

// ── Définitions ───────────────────────────────────────────────────────────────

export interface WeatherDoctrineDef {
  id:          WeatherDoctrineId;
  label:       string;
  shortLabel:  string;
  description: string;
  icon:        string;
  color:       string;
  tradeoffPos: string;
  tradeoffNeg: string;
  // Modificateurs appliqués aux crises météo
  moneyCostMod:                number;  // multiplicateur coût argent (1.0 = neutre)
  cohesionDamageMod:           number;  // multiplicateur dégâts cohésion
  trustGainMod:                number;  // multiplicateur gains de confiance
  trustLossMod:                number;  // multiplicateur pertes de confiance
  popularFatigueDelta:         number;  // additif par crise météo résolue
  institutionalStabilityDelta: number;  // additif par bonne gestion
}

export const WEATHER_DOCTRINES: Record<WeatherDoctrineId, WeatherDoctrineDef> = {
  prudence_maximale: {
    id:          "prudence_maximale",
    label:       "Prudence maximale",
    shortLabel:  "Prudence",
    description: "Anticiper au maximum, même si cela coûte plus cher. Les dégâts sont réduits mais le budget est sollicité.",
    icon:        "shield-check",
    color:       "#4a9fff",
    tradeoffPos: "Dégâts réduits",
    tradeoffNeg: "Coût +30 %",
    moneyCostMod:                1.30,
    cohesionDamageMod:           0.70,
    trustGainMod:                1.10,
    trustLossMod:                0.90,
    popularFatigueDelta:         0,
    institutionalStabilityDelta: +2,
  },
  alerte_precoce: {
    id:          "alerte_precoce",
    label:       "Alerte précoce",
    shortLabel:  "Précoce",
    description: "Déclencher les alertes tôt, au risque d'en émettre de fausses. La crédibilité fluctue mais les vraies crises sont mieux gérées.",
    icon:        "bell-alert",
    color:       "#e8a93a",
    tradeoffPos: "Meilleure anticipation",
    tradeoffNeg: "Risque fausse alerte ×",
    moneyCostMod:                1.10,
    cohesionDamageMod:           0.80,
    trustGainMod:                1.20,
    trustLossMod:                1.20,
    popularFatigueDelta:         +2,
    institutionalStabilityDelta: +1,
  },
  communication_rassurante: {
    id:          "communication_rassurante",
    label:       "Communication rassurante",
    shortLabel:  "Rassurante",
    description: "Privilégier la sérénité publique. Réduit la panique mais expose au scandale si la crise est sous-estimée.",
    icon:        "bullhorn",
    color:       "#3fbe7a",
    tradeoffPos: "Panique réduite",
    tradeoffNeg: "Risque scandale",
    moneyCostMod:                1.00,
    cohesionDamageMod:           0.85,
    trustGainMod:                0.90,
    trustLossMod:                1.30,
    popularFatigueDelta:         -2,
    institutionalStabilityDelta: -2,
  },
  gestion_economique: {
    id:          "gestion_economique",
    label:       "Gestion économique",
    shortLabel:  "Économique",
    description: "Optimiser les dépenses d'intervention. Moins coûteux mais les dégâts peuvent s'aggraver si la situation déborde.",
    icon:        "cash-minus",
    color:       "#a78bfa",
    tradeoffPos: "Coût −25 %",
    tradeoffNeg: "Dégâts potentiels +",
    moneyCostMod:                0.75,
    cohesionDamageMod:           1.20,
    trustGainMod:                0.85,
    trustLossMod:                1.10,
    popularFatigueDelta:         0,
    institutionalStabilityDelta: 0,
  },
  mobilisation_preventive: {
    id:          "mobilisation_preventive",
    label:       "Mobilisation préventive",
    shortLabel:  "Préventive",
    description: "Mobiliser systématiquement les secours en amont. Réponse optimale mais l'administration s'épuise.",
    icon:        "account-group",
    color:       "#e54848",
    tradeoffPos: "Réponse renforcée",
    tradeoffNeg: "Fatigue admin +",
    moneyCostMod:                1.15,
    cohesionDamageMod:           0.60,
    trustGainMod:                1.05,
    trustLossMod:                0.95,
    popularFatigueDelta:         +5,
    institutionalStabilityDelta: +3,
  },
};

export const WEATHER_DOCTRINES_LIST = Object.values(WEATHER_DOCTRINES);

export const WEATHER_DOCTRINE_DEFAULT: WeatherDoctrineId = "communication_rassurante";

// ── Accesseur d'état ──────────────────────────────────────────────────────────

export function getWeatherDoctrine(state: StrategyGameState): WeatherDoctrineDef {
  return WEATHER_DOCTRINES[state.weatherDoctrine ?? WEATHER_DOCTRINE_DEFAULT];
}

// ── Calcul des effets additionnels par doctrine ───────────────────────────────

export interface DoctrineWeatherEffect {
  extraMoneyDelta:             number;  // delta argent additionnel (peut être 0)
  cohesionAdjustment:          number;  // correction sur dégâts cohésion (positif = moins de dégâts)
  trustDeltaAdjustment:        number;  // delta trust additionnel
  popularFatigueBonus:         number;
  institutionalStabilityBonus: number;
}

export function computeDoctrineWeatherEffect(
  doctrine: WeatherDoctrineDef,
  params: {
    moneyCost:    number;   // coût argent du choix (négatif ou 0)
    trustDelta:   number;   // delta trust du choix
    cohesionDelta: number;  // delta cohésion du choix (peut être négatif)
  },
): DoctrineWeatherEffect {
  // Coût supplémentaire basé sur le multiplicateur doctrine
  const extraMoneyDelta = params.moneyCost < 0
    ? Math.round(params.moneyCost * (doctrine.moneyCostMod - 1))
    : 0;

  // Ajustement cohésion : le modificateur s'applique uniquement aux dégâts (négatif)
  const cohesionAdjustment = params.cohesionDelta < 0
    ? Math.round(params.cohesionDelta * doctrine.cohesionDamageMod) - params.cohesionDelta
    : 0;

  // Trust : gain ou perte ajustés
  const trustMod = params.trustDelta >= 0 ? doctrine.trustGainMod : doctrine.trustLossMod;
  const trustDeltaAdjustment = Math.round(params.trustDelta * trustMod) - params.trustDelta;

  return {
    extraMoneyDelta,
    cohesionAdjustment,
    trustDeltaAdjustment,
    popularFatigueBonus:         doctrine.popularFatigueDelta,
    institutionalStabilityBonus: doctrine.institutionalStabilityDelta,
  };
}
