/**
 * economicShockEngine.ts — Chocs économiques externes (MODE DELTA).
 *
 * Dix types de chocs rares, intenses et temporaires, représentant des
 * perturbations fictives d'origine externe. Chaque choc a une intensité,
 * une durée, des effets quotidiens et des amortisseurs d'État.
 *
 * Ne simule aucune bourse réelle, aucune crise réelle, aucun pays
 * réel contraint. Les effets sont des deltas abstraits sur les indicateurs.
 *
 * Mécanique :
 *  - Un choc est créé lors du déclenchement de l'événement Journal correspondant.
 *  - Le joueur peut l'amortir via ses choix présidentiels (economicShockDamping).
 *  - Chaque jour, le choc perd de l'intensité (décroissance) et ses effets
 *    s'appliquent périodiquement, atténués par les amortisseurs d'État.
 *  - Il expire quand intensity ≤ 0 ou remainingDays ≤ 0.
 *  - Maximum 3 chocs actifs simultanément.
 */

import type { StrategyGameState, NewsEvent } from "@/types/strategy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EconomicShockType =
  | "energy_price_spike"
  | "strategic_supply_rupture"
  | "international_financial_crisis"
  | "global_trade_contraction"
  | "investment_panic"
  | "imported_food_crisis"
  | "maritime_blockade"
  | "trade_war"
  | "component_shortage"
  | "tech_bubble_burst";

export interface EconomicShock {
  id:            string;
  sourceEventId: string;
  type:          EconomicShockType;
  intensity:     number; // 0-100, décroît chaque jour
  remainingDays: number; // 0 = expiré
}

// ── Métadonnées d'affichage ───────────────────────────────────────────────────

export const SHOCK_META: Record<EconomicShockType, { label: string; color: string }> = {
  energy_price_spike:             { label: "Flambée énergétique",             color: "#e8864f" },
  strategic_supply_rupture:       { label: "Rupture d'approvisionnement",     color: "#e54848" },
  international_financial_crisis: { label: "Crise financière internationale", color: "#e54848" },
  global_trade_contraction:       { label: "Recul du commerce mondial",       color: "#e8864f" },
  investment_panic:               { label: "Panique des investisseurs",       color: "#e54848" },
  imported_food_crisis:           { label: "Crise alimentaire importée",      color: "#e8864f" },
  maritime_blockade:              { label: "Blocage maritime fictif",          color: "#e8864f" },
  trade_war:                      { label: "Guerre commerciale",              color: "#e8864f" },
  component_shortage:             { label: "Pénurie de composants",           color: "#e8c44f" },
  tech_bubble_burst:              { label: "Éclatement bulle technologique",  color: "#e54848" },
};

// ── Définitions des chocs ─────────────────────────────────────────────────────

interface ShockDef {
  defaultIntensity: number;
  defaultDuration:  number; // jours
  decayPerDay:      number; // perte d'intensité par jour
  effectCycleDays:  number; // effets appliqués tous les N jours
}

const SHOCK_DEFS: Record<EconomicShockType, ShockDef> = {
  energy_price_spike:             { defaultIntensity: 70, defaultDuration: 12, decayPerDay: 4, effectCycleDays: 2 },
  strategic_supply_rupture:       { defaultIntensity: 80, defaultDuration: 15, decayPerDay: 4, effectCycleDays: 2 },
  international_financial_crisis: { defaultIntensity: 85, defaultDuration: 20, decayPerDay: 3, effectCycleDays: 2 },
  global_trade_contraction:       { defaultIntensity: 65, defaultDuration: 18, decayPerDay: 2, effectCycleDays: 2 },
  investment_panic:               { defaultIntensity: 75, defaultDuration: 10, decayPerDay: 6, effectCycleDays: 2 },
  imported_food_crisis:           { defaultIntensity: 70, defaultDuration: 14, decayPerDay: 3, effectCycleDays: 2 },
  maritime_blockade:              { defaultIntensity: 75, defaultDuration: 12, decayPerDay: 5, effectCycleDays: 2 },
  trade_war:                      { defaultIntensity: 65, defaultDuration: 22, decayPerDay: 2, effectCycleDays: 3 },
  component_shortage:             { defaultIntensity: 70, defaultDuration: 16, decayPerDay: 3, effectCycleDays: 3 },
  tech_bubble_burst:              { defaultIntensity: 80, defaultDuration: 18, decayPerDay: 3, effectCycleDays: 2 },
};

// Correspondance event → type de choc
const EVENT_TO_SHOCK: Partial<Record<string, EconomicShockType>> = {
  shock_energy_price_spike:       "energy_price_spike",
  shock_supply_rupture:           "strategic_supply_rupture",
  shock_financial_crisis:         "international_financial_crisis",
  shock_trade_contraction:        "global_trade_contraction",
  shock_investment_panic:         "investment_panic",
  shock_food_crisis:              "imported_food_crisis",
  shock_maritime_blockade:        "maritime_blockade",
  shock_trade_war:                "trade_war",
  shock_component_shortage:       "component_shortage",
  shock_tech_bubble:              "tech_bubble_burst",
};

// ── Amortisseurs d'État ───────────────────────────────────────────────────────

function computeAbsorption(type: EconomicShockType, state: StrategyGameState): number {
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];
  const sc        = state.supplyChain;
  const hp        = state.hiddenPolitics;
  const pf        = state.productiveFabric;
  let abs = 0;

  switch (type) {
    case "energy_price_spike":
      if (completed.includes("research_energy_sovereign"))                       abs += 0.30;
      if (reforms.find((r) => r.id === "energie" && r.applied))                  abs += 0.20;
      if (sc && sc.energie.stockLevel > 60 && sc.energie.disruptionRisk < 40)   abs += 0.15;
      break;

    case "strategic_supply_rupture": {
      if (!sc) break;
      const avgDep = Object.values(sc).reduce((s, sec) => s + sec.dependencyLevel, 0) / 8;
      if (avgDep < 35) abs += 0.25;
      const avgStock = Object.values(sc).reduce((s, sec) => s + sec.stockLevel, 0) / 8;
      if (avgStock > 55) abs += 0.25;
      if (reforms.find((r) => r.id === "industrie" && r.applied)) abs += 0.15;
      break;
    }

    case "international_financial_crisis":
      if ((state.nationalDebt ?? 0) < 100)                    abs += 0.20;
      if ((hp?.institutionalStability ?? 70) >= 75)           abs += 0.25;
      if ((state.nationalDebt ?? 0) < 60)                     abs += 0.15; // très sain
      break;

    case "global_trade_contraction": {
      if ((pf?.industrialChampions ?? 50) >= 65)              abs += 0.25;
      const allyCount = (state.relations ?? []).filter((r) => r.status === "allied" || r.status === "friendly").length;
      if (allyCount >= 4)                                      abs += 0.20;
      if (reforms.find((r) => r.id === "industrie" && r.applied)) abs += 0.20;
      break;
    }

    case "investment_panic":
      if ((hp?.institutionalStability ?? 70) >= 70)           abs += 0.25;
      if ((state.nationalDebt ?? 0) < 100)                    abs += 0.20;
      if ((state.nationalDebt ?? 0) < 60)                     abs += 0.15;
      break;

    case "imported_food_crisis":
      if (!sc) break;
      if (sc.alimentation.dependencyLevel < 40)               abs += 0.30;
      if (sc.alimentation.stockLevel > 60)                    abs += 0.35;
      break;

    case "maritime_blockade":
      if (sc && sc.transport.dependencyLevel < 40)            abs += 0.30;
      if (reforms.find((r) => r.id === "diplomatique" && r.applied)) abs += 0.20;
      if (sc && sc.transport.stockLevel > 55)                 abs += 0.15;
      break;

    case "trade_war": {
      if (reforms.find((r) => r.id === "diplomatique" && r.applied)) abs += 0.30;
      if ((pf?.industrialChampions ?? 50) >= 65)              abs += 0.20;
      const allies = (state.relations ?? []).filter((r) => r.status === "allied" || r.status === "friendly").length;
      if (allies >= 4)                                         abs += 0.15;
      break;
    }

    case "component_shortage":
      if (sc && sc.semi_conducteurs.dependencyLevel < 40)     abs += 0.40;
      if (completed.includes("research_digital_twin"))         abs += 0.25;
      break;

    case "tech_bubble_burst":
      if ((hp?.institutionalStability ?? 70) >= 75)           abs += 0.25;
      if ((state.investorConfidence ?? 55) < 40)              abs += 0.20; // moins à perdre
      if ((state.nationalIndicators?.economy ?? 55) >= 70)    abs += 0.15;
      break;
  }

  return Math.min(0.75, abs);
}

// ── Application des effets par type ──────────────────────────────────────────

function applyShockEffects(state: StrategyGameState, shock: EconomicShock): StrategyGameState {
  const def = SHOCK_DEFS[shock.type];
  if (state.mandateDay % def.effectCycleDays !== 0) return state;

  const absorption = computeAbsorption(shock.type, state);
  const scale = (shock.intensity / 100) * Math.max(0.25, 1 - absorption);
  const d = (base: number) => Math.round(base * scale);

  let s = state;
  const ind = s.nationalIndicators;
  const hp  = s.hiddenPolitics;

  switch (shock.type) {
    case "energy_price_spike":
      s = { ...s,
        inflation:          Math.min(100, Math.max(0, (s.inflation ?? 25) + d(5))),
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(2)) },
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(3))),
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(3)),
      };
      if (s.supplyChain) {
        s = { ...s, supplyChain: { ...s.supplyChain,
          energie: { ...s.supplyChain.energie, disruptionRisk: Math.min(100, s.supplyChain.energie.disruptionRisk + d(8)) },
        }};
      }
      break;

    case "strategic_supply_rupture":
      s = { ...s,
        inflation:          Math.min(100, Math.max(0, (s.inflation ?? 25) + d(4))),
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(2)) },
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(4)),
      };
      if (s.supplyChain) {
        s = { ...s, supplyChain: { ...s.supplyChain,
          energie:            { ...s.supplyChain.energie,            disruptionRisk: Math.min(100, s.supplyChain.energie.disruptionRisk + d(6)) },
          transport:          { ...s.supplyChain.transport,          disruptionRisk: Math.min(100, s.supplyChain.transport.disruptionRisk + d(6)) },
          materiaux_critiques:{ ...s.supplyChain.materiaux_critiques, disruptionRisk: Math.min(100, s.supplyChain.materiaux_critiques.disruptionRisk + d(8)) },
        }};
      }
      break;

    case "international_financial_crisis":
      s = { ...s,
        nationalIndicators: { ...ind,
          economy:    Math.max(0, (ind?.economy ?? 55) - d(3)),
          publicBudget: Math.max(-150, (ind?.publicBudget ?? 20) - d(2)),
        },
        unemployment:       Math.min(100, (s.unemployment ?? 25) + d(2)),
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(7))),
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(3)),
      };
      break;

    case "global_trade_contraction":
      s = { ...s,
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(2)) },
        unemployment:       Math.min(100, (s.unemployment ?? 25) + d(2)),
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(3))),
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(6)),
      };
      break;

    case "investment_panic":
      s = { ...s,
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(9))),
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(2)) },
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(3)),
      };
      break;

    case "imported_food_crisis":
      s = { ...s,
        inflation:          Math.min(100, Math.max(0, (s.inflation ?? 25) + d(6))),
        nationalIndicators: { ...ind,
          economy:    Math.max(0, (ind?.economy ?? 55) - d(2)),
          popularity: Math.max(0, (ind?.popularity ?? 60) - d(2)),
        },
        hiddenPolitics: { ...hp, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + d(2)) },
      };
      if (s.supplyChain) {
        s = { ...s, supplyChain: { ...s.supplyChain,
          alimentation: { ...s.supplyChain.alimentation,
            disruptionRisk: Math.min(100, s.supplyChain.alimentation.disruptionRisk + d(12)),
            stockLevel:     Math.max(0,   s.supplyChain.alimentation.stockLevel     - d(8)),
          },
        }};
      }
      break;

    case "maritime_blockade":
      s = { ...s,
        inflation:          Math.min(100, Math.max(0, (s.inflation ?? 25) + d(4))),
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(2)) },
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(3))),
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(7)),
      };
      if (s.supplyChain) {
        s = { ...s, supplyChain: { ...s.supplyChain,
          transport:   { ...s.supplyChain.transport,   disruptionRisk: Math.min(100, s.supplyChain.transport.disruptionRisk + d(15)) },
          alimentation:{ ...s.supplyChain.alimentation, disruptionRisk: Math.min(100, s.supplyChain.alimentation.disruptionRisk + d(5)) },
          energie:     { ...s.supplyChain.energie,      disruptionRisk: Math.min(100, s.supplyChain.energie.disruptionRisk + d(4)) },
        }};
      }
      break;

    case "trade_war":
      s = { ...s,
        inflation:          Math.min(100, Math.max(0, (s.inflation ?? 25) + d(3))),
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(2)) },
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(3))),
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(6)),
      };
      break;

    case "component_shortage":
      s = { ...s,
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(2)) },
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(3))),
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(2)),
        productivity:       Math.max(0, (s.productivity ?? 50) - d(2)),
      };
      if (s.supplyChain) {
        s = { ...s, supplyChain: { ...s.supplyChain,
          semi_conducteurs: { ...s.supplyChain.semi_conducteurs, disruptionRisk: Math.min(100, s.supplyChain.semi_conducteurs.disruptionRisk + d(10)) },
        }};
      }
      break;

    case "tech_bubble_burst":
      s = { ...s,
        investorConfidence: Math.max(0, Math.min(100, (s.investorConfidence ?? 55) - d(8))),
        nationalIndicators: { ...ind, economy: Math.max(0, (ind?.economy ?? 55) - d(3)) },
        tradeBalance:       Math.max(-100, (s.tradeBalance ?? -5) - d(2)),
      };
      if (s.productiveFabric) {
        s = { ...s, productiveFabric: { ...s.productiveFabric,
          startupEcosystem: Math.max(0, s.productiveFabric.startupEcosystem - d(5)),
        }};
      }
      break;
  }

  return s;
}

// ── API publique ──────────────────────────────────────────────────────────────

export function createEconomicShockFromEvent(
  state:  StrategyGameState,
  event:  NewsEvent,
): StrategyGameState {
  const shockType = EVENT_TO_SHOCK[event.id];
  if (!shockType) return state;

  const def = SHOCK_DEFS[shockType];
  const existing = (state.economicShocks ?? []).find((s) => s.type === shockType);

  // Si ce type de choc est déjà actif, on amplifie l'existant
  if (existing) {
    return {
      ...state,
      economicShocks: (state.economicShocks ?? []).map((s) =>
        s.id === existing.id
          ? { ...s, intensity: Math.min(100, s.intensity + 20), remainingDays: Math.max(s.remainingDays, def.defaultDuration) }
          : s,
      ),
    };
  }

  // Maximum 3 chocs simultanés — si plein, on ignore le nouveau (le moins grave d'abord)
  const active = (state.economicShocks ?? []).filter((s) => s.intensity > 0 && s.remainingDays > 0);
  if (active.length >= 3) return state;

  const newShock: EconomicShock = {
    id:            `shock_${event.id}_d${state.mandateDay}`,
    sourceEventId: event.id,
    type:          shockType,
    intensity:     def.defaultIntensity,
    remainingDays: def.defaultDuration,
  };

  return { ...state, economicShocks: [...(state.economicShocks ?? []), newShock] };
}

export function dampenEconomicShock(
  state:         StrategyGameState,
  sourceEventId: string,
  reduction:     number,
): StrategyGameState {
  const shocks = state.economicShocks ?? [];
  if (!shocks.some((s) => s.sourceEventId === sourceEventId)) return state;

  const dayReduction = Math.floor(reduction / 10); // 30 damping → -3 jours

  return {
    ...state,
    economicShocks: shocks.map((s) =>
      s.sourceEventId === sourceEventId
        ? {
            ...s,
            intensity:     Math.max(0, s.intensity     - reduction),
            remainingDays: Math.max(0, s.remainingDays - dayReduction),
          }
        : s,
    ),
  };
}

export function tickEconomicShocks(state: StrategyGameState): StrategyGameState {
  const shocks = state.economicShocks ?? [];
  if (shocks.length === 0) return state;

  let s = state;
  const surviving: EconomicShock[] = [];

  for (const shock of shocks) {
    if (shock.intensity <= 0 || shock.remainingDays <= 0) continue;

    // Appliquer les effets de ce cycle
    s = applyShockEffects(s, shock);

    // Décroissance
    const def = SHOCK_DEFS[shock.type];
    const newIntensity = Math.max(0, shock.intensity - def.decayPerDay);
    const newDays      = shock.remainingDays - 1;

    if (newIntensity > 0 && newDays > 0) {
      surviving.push({ ...shock, intensity: newIntensity, remainingDays: newDays });
    }
  }

  return { ...s, economicShocks: surviving };
}
