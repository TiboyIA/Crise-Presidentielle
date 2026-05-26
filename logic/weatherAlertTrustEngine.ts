import type { StrategyGameState } from "@/types/strategy";

// ── Valeur initiale ───────────────────────────────────────────────────────────

export const WEATHER_ALERT_TRUST_INITIAL = 60;

// ── Niveaux de confiance ──────────────────────────────────────────────────────

export type TrustLevel = "forte" | "moderee" | "faible";

export interface TrustLevelDef {
  label:       string;
  color:       string;
  description: string;
  cohesionMod: number;   // modificateur de cohésion appliqué aux événements météo (-1 / 0 / +1)
}

export const TRUST_LEVEL_DEFS: Record<TrustLevel, TrustLevelDef> = {
  forte: {
    label:       "Élevée",
    color:       "#3fbe7a",
    description: "La population suit les consignes — dégâts sociaux réduits lors des crises météo.",
    cohesionMod: +1,
  },
  moderee: {
    label:       "Modérée",
    color:       "#e8a93a",
    description: "Confiance partielle — respect variable des consignes officielles.",
    cohesionMod: 0,
  },
  faible: {
    label:       "Fragile",
    color:       "#e54848",
    description: "Scepticisme généralisé — consignes ignorées, dégâts amplifiés en cas de crise.",
    cohesionMod: -1,
  },
};

export function getTrustLevel(trust: number): TrustLevel {
  if (trust >= 65) return "forte";
  if (trust >= 35) return "moderee";
  return "faible";
}

// ── Mise à jour dans l'état ───────────────────────────────────────────────────

export function applyWeatherTrustDelta(state: StrategyGameState, delta: number): StrategyGameState {
  const current = state.weatherAlertTrust ?? WEATHER_ALERT_TRUST_INITIAL;
  return {
    ...state,
    weatherAlertTrust: Math.min(100, Math.max(0, Math.round(current + delta))),
  };
}

// ── Deltas nommés — immuables ─────────────────────────────────────────────────

export const TRUST_DELTA = {
  // Actions du joueur sur les prévisions météo
  alertPublicCorrect:    +8,   // alerte publique fondée, phénomène confirmé
  alertPublicFalseAlarm: -10,  // fausse alerte publique
  prepareCorrect:        +5,   // préparation utile — phénomène réel
  prepareFalseAlarm:     -5,   // préparation inutile — fausse alerte

  // Choix sur épisode méditerranéen — alerte orange
  medOrangeOrsec:        +6,   // plan ORSEC bien déclenché
  medOrangeCommuniquer:  +8,   // communication transparente + évacuations préventives
  medOrangeMinimiser:    -12,  // minimisation de la menace

  // Choix sur épisode méditerranéen — alerte rouge
  medRougeArmee:         +4,   // mobilisation massive armée + sécurité civile
  medRougeEvacuation:    +5,   // évacuations prioritaires
  medRougeCoordination:  +6,   // coordination nationale interministérielle
} as const;
