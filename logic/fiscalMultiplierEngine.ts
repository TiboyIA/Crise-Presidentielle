/**
 * fiscalMultiplierEngine.ts — Multiplicateur budgétaire (MODE DELTA).
 *
 * 8 types de dépenses publiques, chacun avec une phase court terme (popularité /
 * visibilité rapide) et une phase long terme (effets structurels durables).
 *
 * Règles :
 *   - Un seul programme actif par type — le nouveau remplace l'ancien.
 *   - Les effets sont scalés par l'intensité du programme (0-100).
 *   - Tout programme génère un risque de gaspillage (scandalRisk).
 *   - La sécurité à haute intensité risque de réduire la cohésion à long terme.
 *
 * Utilisation dans les événements :
 *   fiscalSpendingType: "infrastructure"   → déclenche createFiscalProgram
 *   fiscalSpendingIntensity: 65            → intensité du programme
 *
 * Affichage dans les choix (consequence des événements) :
 *   getFiscalEffectSummary("infrastructure")
 *   → "Court : cohésion↑  /  Long : commerce↑, chômage↓"
 */

import type { StrategyGameState } from "@/types/strategy";

export type SpendingType =
  | "emergency_aid"
  | "infrastructure"
  | "research"
  | "security"
  | "health"
  | "energy"
  | "training"
  | "industry";

export interface FiscalProgram {
  id:                 string;
  type:               SpendingType;
  intensity:          number;  // 0–100
  shortDaysRemaining: number;  // jours de phase court terme
  longDaysRemaining:  number;  // jours de phase long terme (après la phase courte)
}

interface PhaseEffects {
  cycleDays:                    number;
  popularFatigueDelta?:         number;
  cohesionDelta?:               number;
  inflationDelta?:              number;
  unemploymentDelta?:           number;
  jobQualityDelta?:             number;
  technologyGain?:              number;
  institutionalStabilityDelta?: number;
  investorConfidenceDelta?:     number;
  tradeBalanceDelta?:           number;
  supplyEnergyStockDelta?:      number;
  industrialChampionsDelta?:    number;
  strategicIndustryDelta?:      number;
}

interface SpendingProfile {
  label:          string;
  shortTermLabel: string;
  longTermLabel:  string;
  wasteRisk:      "faible" | "moyen" | "élevé";
  shortDuration:  number;
  longDuration:   number;
  shortEffects:   PhaseEffects;
  longEffects:    PhaseEffects;
}

const PROFILES: Record<SpendingType, SpendingProfile> = {
  emergency_aid: {
    label:          "Aide d'urgence",
    shortTermLabel: "popularité↑, fatigue-",
    longTermLabel:  "inflation↑ (coût durable)",
    wasteRisk:      "élevé",
    shortDuration:  5,
    longDuration:   8,
    shortEffects:   { cycleDays: 3, popularFatigueDelta: -2, cohesionDelta: 1 },
    longEffects:    { cycleDays: 3, inflationDelta: 1 },
  },
  infrastructure: {
    label:          "Infrastructure",
    shortTermLabel: "cohésion↑",
    longTermLabel:  "commerce↑, chômage↓",
    wasteRisk:      "moyen",
    shortDuration:  5,
    longDuration:   16,
    shortEffects:   { cycleDays: 4, cohesionDelta: 1 },
    longEffects:    { cycleDays: 4, tradeBalanceDelta: 1, unemploymentDelta: -1 },
  },
  research: {
    label:          "Recherche & développement",
    shortTermLabel: "confiance marchés↑",
    longTermLabel:  "technologie↑ (durable)",
    wasteRisk:      "faible",
    shortDuration:  3,
    longDuration:   20,
    shortEffects:   { cycleDays: 5, investorConfidenceDelta: 1 },
    longEffects:    { cycleDays: 4, technologyGain: 1 },
  },
  security: {
    label:          "Sécurité",
    shortTermLabel: "stabilité↑",
    longTermLabel:  "risque cohésion↓ si excès",
    wasteRisk:      "moyen",
    shortDuration:  6,
    longDuration:   12,
    shortEffects:   { cycleDays: 3, institutionalStabilityDelta: 1 },
    longEffects:    { cycleDays: 999 },  // géré en tant que cas spécial dans tickFiscalMultiplier
  },
  health: {
    label:          "Santé publique",
    shortTermLabel: "bien-être↑, cohésion↑",
    longTermLabel:  "emploi↑, attractivité↑",
    wasteRisk:      "faible",
    shortDuration:  6,
    longDuration:   14,
    shortEffects:   { cycleDays: 3, popularFatigueDelta: -1, cohesionDelta: 1 },
    longEffects:    { cycleDays: 4, unemploymentDelta: -1, investorConfidenceDelta: 1 },
  },
  energy: {
    label:          "Transition énergétique",
    shortTermLabel: "inflation↓",
    longTermLabel:  "inflation↓, stocks énergie↑",
    wasteRisk:      "faible",
    shortDuration:  4,
    longDuration:   14,
    shortEffects:   { cycleDays: 2, inflationDelta: -1 },
    longEffects:    { cycleDays: 3, inflationDelta: -1, supplyEnergyStockDelta: 2 },
  },
  training: {
    label:          "Formation professionnelle",
    shortTermLabel: "cohésion↑",
    longTermLabel:  "chômage↓, qualité emploi↑",
    wasteRisk:      "moyen",
    shortDuration:  3,
    longDuration:   18,
    shortEffects:   { cycleDays: 4, cohesionDelta: 1 },
    longEffects:    { cycleDays: 3, unemploymentDelta: -1, jobQualityDelta: 1 },
  },
  industry: {
    label:          "Plan industriel",
    shortTermLabel: "investisseurs↑, exports↑",
    longTermLabel:  "industrie↑, souveraineté↑",
    wasteRisk:      "moyen",
    shortDuration:  5,
    longDuration:   15,
    shortEffects:   { cycleDays: 3, investorConfidenceDelta: 1, tradeBalanceDelta: 1 },
    longEffects:    { cycleDays: 4, tradeBalanceDelta: 1, industrialChampionsDelta: 1, strategicIndustryDelta: 1 },
  },
};

// ── API publique ──────────────────────────────────────────────────────────────

/** Résumé lisible des effets temporels — utilisé dans les conséquences des choix. */
export function getFiscalEffectSummary(type: SpendingType): string {
  const p = PROFILES[type];
  return `Court : ${p.shortTermLabel}  /  Long : ${p.longTermLabel}`;
}

export function getFiscalLabel(type: SpendingType): string {
  return PROFILES[type].label;
}

export function getFiscalWasteRisk(type: SpendingType): "faible" | "moyen" | "élevé" {
  return PROFILES[type].wasteRisk;
}

/** Ajoute un programme budgétaire au state. Remplace un programme du même type si déjà actif. */
export function createFiscalProgram(
  state:     StrategyGameState,
  type:      SpendingType,
  intensity: number,
): StrategyGameState {
  const profile  = PROFILES[type];
  const existing = state.fiscalPrograms ?? [];
  const filtered = existing.filter((p) => p.type !== type);
  const program: FiscalProgram = {
    id:                 `fiscal_${type}_${state.mandateDay}`,
    type,
    intensity:          Math.max(0, Math.min(100, intensity)),
    shortDaysRemaining: profile.shortDuration,
    longDaysRemaining:  profile.longDuration,
  };
  return { ...state, fiscalPrograms: [...filtered, program] };
}

// ── Effets internes ───────────────────────────────────────────────────────────

function applyPhaseEffects(
  state:     StrategyGameState,
  effects:   PhaseEffects,
  intensity: number,
  day:       number,
): StrategyGameState {
  if (day % effects.cycleDays !== 0) return state;

  const scale = intensity / 100;
  const d     = (base: number) => Math.round(base * scale);
  let s       = state;

  if (effects.popularFatigueDelta) {
    const delta = d(effects.popularFatigueDelta);
    if (delta !== 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.max(0, Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + delta)) } };
  }
  if (effects.cohesionDelta) {
    const delta = d(effects.cohesionDelta);
    if (delta !== 0) s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.max(0, Math.min(100, (s.nationalIndicators?.cohesion ?? 60) + delta)) } };
  }
  if (effects.inflationDelta) {
    const delta = d(effects.inflationDelta);
    if (delta !== 0) s = { ...s, inflation: Math.max(0, Math.min(100, (s.inflation ?? 25) + delta)) };
  }
  if (effects.unemploymentDelta) {
    const delta = d(effects.unemploymentDelta);
    if (delta !== 0) s = { ...s, unemployment: Math.max(0, Math.min(100, (s.unemployment ?? 25) + delta)) };
  }
  if (effects.jobQualityDelta) {
    const delta = d(effects.jobQualityDelta);
    if (delta !== 0) s = { ...s, jobQuality: Math.max(0, Math.min(100, (s.jobQuality ?? 55) + delta)) };
  }
  if (effects.technologyGain) {
    const delta = d(effects.technologyGain);
    if (delta !== 0) s = { ...s, resources: { ...s.resources, technology: Math.max(0, (s.resources?.technology ?? 0) + delta) } };
  }
  if (effects.institutionalStabilityDelta) {
    const delta = d(effects.institutionalStabilityDelta);
    if (delta !== 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: Math.max(0, Math.min(100, (s.hiddenPolitics?.institutionalStability ?? 70) + delta)) } };
  }
  if (effects.investorConfidenceDelta) {
    const delta = d(effects.investorConfidenceDelta);
    if (delta !== 0) s = { ...s, investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) + delta)) };
  }
  if (effects.tradeBalanceDelta) {
    const delta = d(effects.tradeBalanceDelta);
    if (delta !== 0) s = { ...s, tradeBalance: Math.max(-100, Math.min(100, (s.tradeBalance ?? -5) + delta)) };
  }
  if (effects.supplyEnergyStockDelta && s.supplyChain) {
    const delta = d(effects.supplyEnergyStockDelta);
    if (delta !== 0) s = { ...s, supplyChain: { ...s.supplyChain, energie: { ...s.supplyChain.energie, stockLevel: Math.max(0, Math.min(100, s.supplyChain.energie.stockLevel + delta)) } } };
  }
  if (effects.industrialChampionsDelta && s.productiveFabric) {
    const delta = d(effects.industrialChampionsDelta);
    if (delta !== 0) s = { ...s, productiveFabric: { ...s.productiveFabric, industrialChampions: Math.max(0, Math.min(100, s.productiveFabric.industrialChampions + delta)) } };
  }
  if (effects.strategicIndustryDelta && s.productiveFabric) {
    const delta = d(effects.strategicIndustryDelta);
    if (delta !== 0) s = { ...s, productiveFabric: { ...s.productiveFabric, strategicIndustry: Math.max(0, Math.min(100, s.productiveFabric.strategicIndustry + delta)) } };
  }

  return s;
}

function applyWasteEffect(
  state:     StrategyGameState,
  wasteRisk: "faible" | "moyen" | "élevé",
  intensity: number,
  day:       number,
): StrategyGameState {
  const hp = state.hiddenPolitics;
  if (wasteRisk === "élevé" && day % 4 === 0) {
    return { ...state, hiddenPolitics: { ...hp, scandalRisk: Math.min(100, (hp?.scandalRisk ?? 20) + 1) } };
  }
  if (wasteRisk === "moyen" && intensity >= 55 && day % 7 === 0) {
    return { ...state, hiddenPolitics: { ...hp, scandalRisk: Math.min(100, (hp?.scandalRisk ?? 20) + 1) } };
  }
  return state;
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickFiscalMultiplier(state: StrategyGameState): StrategyGameState {
  const programs = state.fiscalPrograms;
  if (!programs || programs.length === 0) return state;

  const day  = state.mandateDay;
  let s      = state;
  const next: FiscalProgram[] = [];

  for (const program of programs) {
    const profile = PROFILES[program.type];

    if (program.shortDaysRemaining > 0) {
      s = applyPhaseEffects(s, profile.shortEffects, program.intensity, day);
      s = applyWasteEffect(s, profile.wasteRisk, program.intensity, day);
      next.push({ ...program, shortDaysRemaining: program.shortDaysRemaining - 1 });
    } else if (program.longDaysRemaining > 0) {
      s = applyPhaseEffects(s, profile.longEffects, program.intensity, day);
      // Sécurité : dérive possible en phase longue si intensité excessive
      if (program.type === "security" && program.intensity >= 70 && day % 6 === 0) {
        s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.max(0, (s.nationalIndicators?.cohesion ?? 60) - 1) } };
      }
      s = applyWasteEffect(s, profile.wasteRisk, program.intensity, day);
      next.push({ ...program, longDaysRemaining: program.longDaysRemaining - 1 });
    }
    // programme expiré : non ajouté à next
  }

  return { ...s, fiscalPrograms: next };
}
