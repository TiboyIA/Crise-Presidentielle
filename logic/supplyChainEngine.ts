/**
 * supplyChainEngine.ts — Chaînes d'approvisionnement stratégiques (MODE DELTA).
 *
 * 8 secteurs fictifs avec 4 indicateurs chacun :
 *   dependencyLevel  : 0-100 — dépendance aux importations (haut = vulnérable)
 *   stockLevel       : 0-100 — réserves stratégiques (haut = amorti les chocs)
 *   domesticCapacity : 0-100 — capacité de production nationale (haut = souveraineté)
 *   disruptionRisk   : 0-100 — risque de rupture d'approvisionnement (haut = danger)
 *
 * disruptionRisk est la valeur clé affichée et qui génère des effets.
 * Les trois autres sont des leviers d'action ou des modificateurs structurels.
 *
 * Effets par jour :
 *   alimentation en rupture (≥80) + stock < 30 : -1 cohésion, -1 popularité (tous les 3 j)
 *   medicaments en rupture + stock < 30 : hospitalPressure +2 (tous les 3 j)
 *   3+ secteurs en rupture : économie -1 (tous les 5 j)
 *   2+ secteurs en rupture : popularFatigue +1 (tous les 4 j)
 *
 * Effets sur l'inflation : lus directement dans inflationEngine.computeInflationTarget.
 */

import type { StrategyGameState } from "@/types/strategy";
import { STRATEGIC_SECTORS, SECTOR_IDS, type SectorId } from "@/data/strategicSectors";

export interface SectorState {
  dependencyLevel:  number;   // 0-100
  stockLevel:       number;   // 0-100
  domesticCapacity: number;   // 0-100
  disruptionRisk:   number;   // 0-100
}

export type SupplyChainState = Record<SectorId, SectorState>;

export type SupplyRiskBand = "stable" | "tension" | "vulnerable" | "rupture";

export interface SupplyRiskBandInfo {
  band:    SupplyRiskBand;
  label:   string;
  color:   string;
  message: string;
}

const SUPPLY_BANDS: { threshold: number; info: SupplyRiskBandInfo }[] = [
  {
    threshold: 76,
    info: {
      band: "rupture", label: "Rupture critique", color: "#e54848",
      message: "L'approvisionnement est interrompu. Les stocks s'épuisent. Des mesures d'urgence sont indispensables.",
    },
  },
  {
    threshold: 56,
    info: {
      band: "vulnerable", label: "Vulnérable", color: "#e8864f",
      message: "Les chaînes d'approvisionnement sont fragiles. Un choc externe pourrait déclencher une rupture.",
    },
  },
  {
    threshold: 31,
    info: {
      band: "tension", label: "Tension", color: "#e8c44f",
      message: "Des tensions sont perceptibles sur les approvisionnements. La situation est maîtrisable à court terme.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "stable", label: "Stable", color: "#4caf82",
      message: "Les approvisionnements sont sécurisés. Les réserves et la production nationale assurent la continuité.",
    },
  },
];

export function getSupplyRiskBandInfo(value: number): SupplyRiskBandInfo {
  return (SUPPLY_BANDS.find((b) => value >= b.threshold) ?? SUPPLY_BANDS[SUPPLY_BANDS.length - 1]).info;
}

export const DEFAULT_SUPPLY_CHAIN_STATE: SupplyChainState = Object.fromEntries(
  SECTOR_IDS.map((id) => {
    const def = STRATEGIC_SECTORS[id];
    return [id, {
      dependencyLevel:  def.initialDependency,
      stockLevel:       def.initialStock,
      domesticCapacity: def.initialCapacity,
      disruptionRisk:   def.initialDisruption,
    }];
  }),
) as SupplyChainState;

// ── Calcul de la cible de disruptionRisk pour un secteur ─────────────────────

function computeDisruptionTarget(sectorId: SectorId, state: StrategyGameState): number {
  const sc        = state.supplyChain ?? DEFAULT_SUPPLY_CHAIN_STATE;
  const sec       = sc[sectorId];
  const hp        = state.hiddenPolitics;
  const res       = state.resources;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];

  // Base structurelle : la dépendance élevée expose, le stock et la capacité protègent
  let target = 5;
  target += sec.dependencyLevel * 0.7;
  target -= sec.stockLevel * 0.2;
  target -= sec.domesticCapacity * 0.15;

  // ── Pressions globales (identiques pour tous les secteurs) ────────────────

  // Énergie — flambée des coûts de production et logistiques
  if (res.energy < 50)        target += 8;
  else if (res.energy < 100)  target += 4;

  // Ondes de crise — chocs sur toutes les chaînes
  const waves = (state.crisisWaves ?? []).filter((w) => w.intensity >= 40).length;
  if (waves >= 3)              target += 7;
  else if (waves >= 1)        target += 3;

  // Stress thermique — perturbation logistique et production
  const thermal = state.thermalStress ?? 22;
  if (thermal > 70)           target += 5;
  else if (thermal > 50)      target += 2;

  // Inflation élevée — spirale des coûts d'importation
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)        target += 5;
  else if (inflation >= 50)   target += 2;

  // Relations hostiles — menace sur les fournisseurs stratégiques
  const hostile = state.relations.filter((r) => r.status === "hostile").length;
  if (hostile >= 3)           target += 7;
  else if (hostile >= 1)      target += 3;

  // Stabilité institutionnelle — capacité de l'État à gérer les crises
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70)        target -= 3;
  else if (stability < 35)    target += 5;
  else if (stability < 50)    target += 2;

  // Productivité nationale — robustesse de la chaîne nationale
  const productivity = state.productivity ?? 50;
  if (productivity >= 70)     target -= 5;
  else if (productivity <= 30) target += 4;

  // ── Facteurs sectoriels spécifiques ──────────────────────────────────────

  switch (sectorId) {
    case "energie":
      if (completed.includes("research_energy_sovereign"))   target -= 14;
      if (reforms.some((r) => r.id === "energie" && r.applied)) target -= 10;
      if (res.energy >= 200)                                 target -= 5;
      break;

    case "alimentation":
      if (reforms.some((r) => r.id === "industrie" && r.applied)) target -= 5;
      if (reforms.some((r) => r.id === "energie"   && r.applied)) target -= 3;
      // Stress agricole amplifie la vulnérabilité alimentaire
      if ((state.agroWeather?.cropStress ?? 0) > 60)        target += 6;
      else if ((state.agroWeather?.cropStress ?? 0) > 35)   target += 3;
      break;

    case "medicaments":
      if (reforms.some((r) => r.id === "sociale"   && r.applied)) target -= 8;
      // Pression hospitalière aggrave le besoin en médicaments
      if ((state.hospitalPressure ?? 30) >= 70)              target += 6;
      else if ((state.hospitalPressure ?? 30) >= 50)        target += 3;
      break;

    case "semi_conducteurs":
      if (completed.includes("research_digital_twin"))        target -= 12;
      if (completed.includes("research_datacenter_cooling"))  target -= 6;
      if (reforms.some((r) => r.id === "industrie" && r.applied)) target -= 8;
      if (reforms.some((r) => r.id === "cyber"     && r.applied)) target -= 4;
      break;

    case "defense":
      if (reforms.some((r) => r.id === "securite"  && r.applied)) target -= 10;
      if (completed.includes("research_infowar"))              target -= 4;
      break;

    case "telecommunications":
      if (completed.includes("research_admin_ai"))             target -= 8;
      if (completed.includes("research_infowar"))              target -= 5;
      if (reforms.some((r) => r.id === "cyber"     && r.applied)) target -= 6;
      break;

    case "transport":
      if (reforms.some((r) => r.id === "industrie" && r.applied)) target -= 5;
      if (reforms.some((r) => r.id === "energie"   && r.applied)) target -= 4;
      // Stress thermique perturbe particulièrement le transport
      if (thermal > 60) target += 3;
      break;

    case "materiaux_critiques":
      if (reforms.some((r) => r.id === "industrie" && r.applied)) target -= 10;
      if (reforms.some((r) => r.id === "energie"   && r.applied)) target -= 5;
      if (completed.includes("research_energy_sovereign"))    target -= 4;
      break;
  }

  return Math.max(0, Math.min(100, target));
}

// ── Indice agrégé de risque d'approvisionnement ───────────────────────────────

export function computeOverallSupplyRisk(supplyChain: SupplyChainState): number {
  const total = SECTOR_IDS.reduce((sum, id) => sum + supplyChain[id].disruptionRisk, 0);
  return Math.round(total / SECTOR_IDS.length);
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickSupplyChain(state: StrategyGameState): StrategyGameState {
  const current = state.supplyChain ?? DEFAULT_SUPPLY_CHAIN_STATE;
  const drift   = 3;

  // Drift chaque secteur vers sa cible
  const updated = { ...current } as SupplyChainState;
  for (const id of SECTOR_IDS) {
    const target = computeDisruptionTarget(id, state);
    const cur    = current[id].disruptionRisk;
    const next   = cur < target
      ? Math.min(target, cur + drift)
      : Math.max(target, cur - drift);
    updated[id]  = { ...current[id], disruptionRisk: Math.round(next) };
  }

  let s: StrategyGameState = { ...state, supplyChain: updated };

  const day = s.mandateDay;
  const ind = s.nationalIndicators;
  const hp  = s.hiddenPolitics;

  const ruptured = SECTOR_IDS.filter(
    (id) => updated[id].disruptionRisk >= 80 && updated[id].stockLevel < 30,
  );

  // Alimentation en rupture — insécurité alimentaire, mécontentement
  if (ruptured.includes("alimentation") && day % 3 === 0) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        cohesion:   Math.max(0, (ind?.cohesion ?? 60) - 1),
        popularity: Math.max(0, (ind?.popularity ?? 60) - 1),
      },
    };
  }

  // Médicaments en rupture — saturation hospitalière
  if (ruptured.includes("medicaments") && day % 3 === 0) {
    s = { ...s, hospitalPressure: Math.min(100, (s.hospitalPressure ?? 30) + 2) };
  }

  // 3+ secteurs en rupture — contraction économique généralisée
  if (ruptured.length >= 3 && day % 5 === 0) {
    s = {
      ...s,
      nationalIndicators: {
        ...s.nationalIndicators,
        economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1),
      },
    };
  }

  // 2+ secteurs en rupture — fatigue populaire et défiance
  if (ruptured.length >= 2 && day % 4 === 0) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1),
      },
    };
  }

  return s;
}
