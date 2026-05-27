/**
 * socialResonanceEngine.ts — Résonance sociale des crises.
 *
 * Principe : certaines crises deviennent plus fortes si elles frappent
 * un contexte déjà sensible. La résonance amplifie discrètement les effets
 * négatifs sans rendre chaque décision punissable.
 *
 * 6 cas de résonance :
 *   1. popular_fatigue_energy   — popularFatigue > 65 + urgence forte/critique
 *   2. scandal_hostile_media    — scandalRisk > 55 + mediaMood < 40
 *   3. blackout_civil_unrest    — gridStability < 35 + security < 40
 *   4. broken_promise_economy   — promesse trahie + economy < 40
 *   5. echo_chamber_opposition  — même type récent dans le log + oppositionPower > 55
 *   6. maladroit_fatigue        — pathologie active + popularFatigue > 55
 *
 * Atténuation : signalNoiseRatio ≥ 70 → probabilité réduite de 50 %.
 * Maximum 1 résonance par décision (premier cas déclenché).
 */

import type { NewsEvent, StrategyGameState } from "@/types/strategy";
import { DEFAULT_SIGNAL_NOISE_RATIO } from "@/logic/signalNoiseEngine";

export interface ResonanceResult {
  state: StrategyGameState;
  note:  string | null;
}

// ── Risque global de résonance (0-100) ────────────────────────────────────────

export function computeResonanceRisk(state: StrategyGameState): number {
  const hp  = state.hiddenPolitics;
  const ind = state.nationalIndicators;
  let score = 0;

  if ((hp?.popularFatigue ?? 0) > 65) score += 20;
  if ((hp?.scandalRisk ?? 0) > 55 && (hp?.mediaMood ?? 50) < 40) score += 25;
  if ((state.gridStability ?? 60) < 35 && (ind?.security ?? 50) < 40) score += 20;

  const hasBroken = Object.values(state.campaignPromises?.status ?? {}).includes("trahie");
  if (hasBroken && (ind?.economy ?? 50) < 40) score += 25;

  if ((state.oppositionPower ?? 35) > 55) score += 15;

  const path = state.discoursePathology;
  const hasActivePathology = path ? Object.values(path).some((v) => v > 0) : false;
  if (hasActivePathology && (hp?.popularFatigue ?? 0) > 55) score += 15;

  const snr = state.signalNoiseRatio ?? DEFAULT_SIGNAL_NOISE_RATIO;
  if (snr >= 70) score = Math.round(score * 0.6);

  return Math.min(100, score);
}

// ── Cas de résonance ──────────────────────────────────────────────────────────

interface ResonanceCase {
  condition: (s: StrategyGameState, e: NewsEvent) => boolean;
  probability: number;
  apply: (s: StrategyGameState, e: NewsEvent) => StrategyGameState;
  note: string;
}

const CASES: ResonanceCase[] = [
  // 1. Fatigue populaire + crise forte/critique
  {
    condition: (s, e) =>
      (s.hiddenPolitics?.popularFatigue ?? 0) > 65 &&
      (e.urgency === "forte" || e.urgency === "critique"),
    probability: 0.55,
    apply: (s, e) => {
      const strong = e.urgency === "critique";
      return {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          cohesion: Math.max(0, s.nationalIndicators.cohesion - (strong ? 3 : 2)),
        },
        hiddenPolitics: {
          ...s.hiddenPolitics,
          popularFatigue: Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + (strong ? 5 : 3)),
        },
      };
    },
    note: "Résonance sociale : la fatigue populaire amplifie la crise — cohésion fragilisée.",
  },

  // 2. Risque de scandale + médias hostiles
  {
    condition: (s) =>
      (s.hiddenPolitics?.scandalRisk ?? 0) > 55 &&
      (s.hiddenPolitics?.mediaMood ?? 50) < 40,
    probability: 0.50,
    apply: (s) => {
      const strong = (s.hiddenPolitics?.scandalRisk ?? 0) > 70;
      return {
        ...s,
        hiddenPolitics: {
          ...s.hiddenPolitics,
          eliteTrust: Math.max(0, (s.hiddenPolitics?.eliteTrust ?? 65) - (strong ? 5 : 3)),
        },
        nationalIndicators: {
          ...s.nationalIndicators,
          popularity: Math.max(0, s.nationalIndicators.popularity - (strong ? 3 : 2)),
        },
      };
    },
    note: "Résonance médiatique : risque de scandale en contexte hostile — confiance des élites érodée.",
  },

  // 3. Réseau instable + sécurité faible
  {
    condition: (s) =>
      (s.gridStability ?? 60) < 35 &&
      (s.nationalIndicators?.security ?? 50) < 40,
    probability: 0.60,
    apply: (s) => {
      const strong = (s.gridStability ?? 60) < 20;
      return {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          cohesion: Math.max(0, s.nationalIndicators.cohesion - (strong ? 4 : 2)),
        },
        hiddenPolitics: {
          ...s.hiddenPolitics,
          popularFatigue: Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + (strong ? 5 : 3)),
        },
      };
    },
    note: "Résonance infrastructurelle : instabilité du réseau et déficit sécuritaire génèrent des tensions civiles.",
  },

  // 4. Promesse trahie + économie dégradée
  {
    condition: (s) => {
      const hasBroken = Object.values(s.campaignPromises?.status ?? {}).includes("trahie");
      return hasBroken && (s.nationalIndicators?.economy ?? 50) < 40;
    },
    probability: 0.65,
    apply: (s) => {
      const strong = (s.nationalIndicators?.economy ?? 50) < 25;
      return {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          popularity: Math.max(0, s.nationalIndicators.popularity - (strong ? 5 : 3)),
        },
        hiddenPolitics: {
          ...s.hiddenPolitics,
          institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - (strong ? 2 : 1)),
        },
      };
    },
    note: "Résonance électorale : promesse trahie en contexte économique dégradé — popularité en chute.",
  },

  // 5. Chambre d'écho + opposition forte
  {
    condition: (s, e) => {
      if ((s.oppositionPower ?? 35) <= 55) return false;
      return s.news.log.slice(-5).some((l) => l.type === e.type);
    },
    probability: 0.45,
    apply: (s) => {
      const strong = (s.oppositionPower ?? 35) > 70;
      return {
        ...s,
        hiddenPolitics: {
          ...s.hiddenPolitics,
          mediaMood:   Math.max(0,   (s.hiddenPolitics?.mediaMood   ?? 55) - (strong ? 4 : 3)),
          scandalRisk: Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + (strong ? 5 : 3)),
        },
      };
    },
    note: "Résonance oppositionnelle : crises répétées du même registre récupérées politiquement — climat médiatique dégradé.",
  },

  // 6. Pathologie rhétorique + fatigue populaire
  {
    condition: (s) => {
      const path = s.discoursePathology;
      if (!path) return false;
      return Object.values(path).some((v) => v > 0) && (s.hiddenPolitics?.popularFatigue ?? 0) > 55;
    },
    probability: 0.50,
    apply: (s) => {
      const path = s.discoursePathology;
      const high = path ? Object.values(path).filter((v) => v > 30).length >= 2 : false;
      return {
        ...s,
        hiddenPolitics: {
          ...s.hiddenPolitics,
          institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - (high ? 3 : 2)),
          eliteTrust:             Math.max(0, (s.hiddenPolitics?.eliteTrust             ?? 65) - (high ? 4 : 2)),
        },
      };
    },
    note: "Résonance rhétorique : discours dégradé en contexte de fatigue — méfiance institutionnelle renforcée.",
  },
];

// ── Fonction principale ───────────────────────────────────────────────────────

export function evaluateResonance(
  state: StrategyGameState,
  event: NewsEvent,
): ResonanceResult {
  const snr = state.signalNoiseRatio ?? DEFAULT_SIGNAL_NOISE_RATIO;
  const attenuation = snr >= 70 ? 0.5 : 1;

  for (const c of CASES) {
    if (!c.condition(state, event)) continue;
    if (Math.random() > c.probability * attenuation) continue;
    return { state: c.apply(state, event), note: c.note };
  }
  return { state, note: null };
}
