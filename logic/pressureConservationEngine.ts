/**
 * pressureConservationEngine.ts — Conservation de la pression politique.
 *
 * Principe : une décision puissante ne supprime pas toujours la pression,
 * elle la déplace vers un autre domaine.
 *
 * Les bons investissements (technologie, réformes structurelles) réduisent
 * la pression totale au lieu de la déplacer.
 *
 * Règles :
 *   1. Sécurité / militaire fort  → cohésion sous tension
 *   2. Afflux financier soudain   → fragilité institutionnelle
 *   3. Cyber accéléré             → surchauffe des systèmes
 *   4. Correction budgétaire dure → fatigue populaire
 *   5. Opération à haut risque    → risque diplomatique sur les élites
 *
 * Seuls les choix puissants déclenchent ces règles (seuils définis ci-dessous).
 * Maximum 2 pressions simultanées par décision.
 * Ne s'applique pas si le choix est un investissement technologique.
 */

import type { NewsChoice, StrategyGameState } from "@/types/strategy";

// ── Résultat ───────────────────────────────────────────────────────────────────

export interface PressureResult {
  state: StrategyGameState;
  note:  string | null;
}

// ── Règles de déplacement ────────────────────────────────────────────────────

const RULES: {
  condition: (c: NewsChoice) => boolean;
  exempt:    (c: NewsChoice) => boolean;
  apply:     (s: StrategyGameState) => StrategyGameState;
  note:      string;
}[] = [
  // 1. Sécurité ou militaire renforcé → cohésion sociale sous tension
  {
    condition: (c) =>
      (c.indicatorEffects?.security ?? 0) >= 6 ||
      (c.effects?.military ?? 0) >= 25,
    exempt: (c) =>
      (c.effects?.technology ?? 0) >= 5 ||
      (c.hiddenPoliticsEffects?.institutionalStability ?? 0) >= 5,
    apply: (s) => ({
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        cohesion: Math.max(0, s.nationalIndicators.cohesion - 2),
      },
    }),
    note: "Renforcement sécuritaire : pression déplacée sur la cohésion sociale.",
  },

  // 2. Afflux financier soudain → fragilité institutionnelle temporaire
  {
    condition: (c) => (c.effects?.money ?? 0) >= 800,
    exempt: (c) =>
      (c.effects?.technology ?? 0) >= 5 ||
      (c.hiddenPoliticsEffects?.institutionalStability ?? 0) >= 4,
    apply: (s) => ({
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 60) - 2),
      },
    }),
    note: "Afflux financier soudain : pression déplacée sur la stabilité institutionnelle.",
  },

  // 3. Cyber accéléré → surchauffe thermique des systèmes
  {
    condition: (c) => (c.effects?.cyberDefense ?? 0) >= 25,
    exempt:    (c) => (c.effects?.technology ?? 0) >= 5,
    apply: (s) => ({
      ...s,
      thermalStress: Math.min(100, (s.thermalStress ?? 22) + 6),
    }),
    note: "Accélération cyber : pression thermique déplacée sur les systèmes critiques.",
  },

  // 4. Correction budgétaire brutale + gain économique → fatigue populaire
  {
    condition: (c) =>
      (c.effects?.money ?? 0) <= -600 &&
      (c.indicatorEffects?.economy ?? 0) >= 3,
    exempt: (c) =>
      (c.effects?.technology ?? 0) >= 5 ||
      (c.indicatorEffects?.popularity ?? 0) >= 3,
    apply: (s) => ({
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        popularity: Math.max(0, s.nationalIndicators.popularity - 2),
      },
    }),
    note: "Correction budgétaire : pression déplacée sur la popularité.",
  },

  // 5. Opération influence / covert → risque diplomatique sur les élites
  {
    condition: (c) =>
      (c.effects?.influence ?? 0) <= -20 &&
      ((c.effects?.military ?? 0) >= 10 || (c.effects?.intelligence ?? 0) >= 15),
    exempt: (c) =>
      (c.effects?.technology ?? 0) >= 5 ||
      (c.indicatorEffects?.security ?? 0) >= 5,
    apply: (s) => ({
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        eliteTrust: Math.max(0, (s.hiddenPolitics?.eliteTrust ?? 65) - 3),
      },
    }),
    note: "Opération à haut risque : risque diplomatique latent sur les cercles d'élite.",
  },
];

const MAX_SIMULTANEOUS = 2;

// ── Fonction principale ────────────────────────────────────────────────────────

export function applyPressureConservation(
  state:  StrategyGameState,
  choice: NewsChoice,
): PressureResult {
  const triggered = RULES
    .filter((r) => r.condition(choice) && !r.exempt(choice))
    .slice(0, MAX_SIMULTANEOUS);

  if (triggered.length === 0) return { state, note: null };

  let s = state;
  for (const rule of triggered) {
    s = rule.apply(s);
  }

  const note = triggered.map((r) => r.note).join(" ");
  return { state: s, note };
}
