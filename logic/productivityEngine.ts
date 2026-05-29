/**
 * productivityEngine.ts — Productivité nationale (MODE DELTA).
 *
 * Indicateur discret (0-100) reliant recherche, formation, énergie,
 * stabilité institutionnelle et santé des travailleurs.
 *
 * Ne duplique pas globalPower. Ne gère pas les bâtiments ni les recherches.
 * Lit les champs d'état existants pour calculer une cible.
 *
 * Seuils :
 *   0–25  : Stagnation — les investissements ne produisent plus d'effets.
 *   26–50 : Dégradée   — la productivité peine à suivre les besoins.
 *   51–75 : Correcte   — niveau nominal acceptable.
 *   76–100: Productive  — l'appareil productif tourne à plein régime.
 *
 * Effets quotidiens (légers) :
 *   ≥ 75 tous les 3 jours : économie +1
 *   ≤ 25 tous les 3 jours : économie -1
 *   ≥ 80 tous les 5 jours : publicBudget +1 (recettes fiscales supplémentaires)
 *   ≤ 20 tous les 5 jours : publicBudget -1 (recettes fiscales en chute)
 */

import type { StrategyGameState } from "@/types/strategy";

export type ProductivityBand = "productive" | "correcte" | "degradee" | "stagnation";

export interface ProductivityBandInfo {
  band:    ProductivityBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_PRODUCTIVITY = 50;

const BANDS: { threshold: number; info: ProductivityBandInfo }[] = [
  {
    threshold: 76,
    info: {
      band: "productive", label: "Productive", color: "#4caf82",
      message: "L'appareil productif national tourne à plein régime. Les investissements génèrent des rendements élevés et la compétitivité est forte.",
    },
  },
  {
    threshold: 51,
    info: {
      band: "correcte", label: "Correcte", color: "#60a5fa",
      message: "La productivité nationale est dans la moyenne. Les moteurs de croissance fonctionnent, sans véritable excès ni sous-performance notable.",
    },
  },
  {
    threshold: 26,
    info: {
      band: "degradee", label: "Dégradée", color: "#e8c44f",
      message: "La productivité peine à suivre les besoins économiques. La croissance est poussive malgré les dépenses et les rendements diminuent.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "stagnation", label: "Stagnation", color: "#e54848",
      message: "L'économie nationale tourne au ralenti. Les investissements ne produisent plus d'effets. Le risque de décrochage structurel est réel.",
    },
  },
];

export function getProductivityBandInfo(value: number): ProductivityBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeProductivityTarget(state: StrategyGameState): number {
  const res       = state.resources;
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];

  let target = 50;

  // Recherche technologique — moteur principal de la productivité
  if (completed.includes("research_digital_twin"))           target += 8;
  if (completed.includes("research_admin_ai"))               target += 6;
  if (completed.includes("research_energy_sovereign"))       target += 4;
  if (completed.includes("research_datacenter_cooling"))     target += 3;
  if (completed.includes("research_satellites"))             target += 3;
  if (completed.includes("research_self_healing_materials")) target += 2;
  if (completed.includes("research_infowar"))                target += 2;

  // Réformes structurelles — effets durables sur l'organisation productive
  if (reforms.some((r) => r.id === "industrie"  && r.applied)) target += 5;
  if (reforms.some((r) => r.id === "education"  && r.applied)) target += 4;
  if (reforms.some((r) => r.id === "cyber"      && r.applied)) target += 3;
  if (reforms.some((r) => r.id === "energie"    && r.applied)) target += 3;

  // Énergie — disponibilité et coût de production
  if (res.energy >= 150)       target += 5;
  else if (res.energy >= 100)  target += 3;
  else if (res.energy < 50)    target -= 6;
  else if (res.energy < 100)   target -= 3;

  // Réseau électrique — continuité opérationnelle de l'activité
  const grid = state.gridStability ?? 72;
  if (grid >= 70)              target += 4;
  else if (grid < 30)          target -= 8;
  else if (grid < 50)          target -= 4;

  // Stabilité institutionnelle — prévisibilité réglementaire et investissement
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70)         target += 5;
  else if (stability < 35)     target -= 7;
  else if (stability < 50)     target -= 3;

  // Moral administratif — efficacité des services et des régulations
  const adminMorale = state.administrationMorale ?? 60;
  if (adminMorale >= 65)       target += 4;
  else if (adminMorale < 35)   target -= 5;

  // Santé des travailleurs — disponibilité et forme du capital humain
  const hospPressure = state.hospitalPressure ?? 30;
  if (hospPressure < 40)       target += 3;
  else if (hospPressure >= 81) target -= 5;
  else if (hospPressure >= 61) target -= 2;

  const mdq = state.medicalDataQuality ?? 50;
  if (mdq >= 70)               target += 2;

  // Emploi — qualité du travail et disponibilité
  const unemp = state.unemployment ?? 25;
  if (unemp < 20)              target += 4;
  else if (unemp < 35)         target += 2;

  const jq = state.jobQuality ?? 55;
  if (jq >= 70)                target += 4;
  else if (jq >= 50)           target += 2;
  else if (jq < 30)            target -= 4;

  // Fatigue populaire — démotivation et présentéisme
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue > 70)            target -= 8;
  else if (fatigue > 50)       target -= 4;
  else if (fatigue < 25)       target += 2;

  // Fuite des talents publics — perte de compétences stratégiques
  const talentDrain = state.talentDrainScore ?? 15;
  if (talentDrain >= 60)       target -= 6;
  else if (talentDrain >= 40)  target -= 3;

  // Inflation élevée — distorsion des signaux économiques et conflits salariaux
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)         target -= 6;
  else if (inflation >= 45)    target -= 3;

  // Stress thermique — conditions de travail dégradées par la chaleur
  const thermal = state.thermalStress ?? 22;
  if (thermal > 70)            target -= 4;
  else if (thermal > 50)       target -= 2;

  // Usure des infrastructures — ralentissement logistique et pannes
  const wear = state.infrastructureWear ?? {};
  const activeBuildings = state.buildings.filter((b) => b.level > 0);
  if (activeBuildings.length > 0) {
    const avgWear = activeBuildings.reduce((s, b) => s + (wear[b.id] ?? 0), 0) / activeBuildings.length;
    if (avgWear >= 70)         target -= 5;
    else if (avgWear >= 45)    target -= 2;
    else if (avgWear < 20)     target += 2;
  }

  // Ondes de crise actives — disruptions de l'activité économique
  const waves = (state.crisisWaves ?? []).filter((w) => w.intensity >= 40).length;
  if (waves >= 3)              target -= 5;
  else if (waves >= 1)         target -= 2;

  return Math.max(0, Math.min(100, target));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickProductivity(state: StrategyGameState): StrategyGameState {
  const current = state.productivity ?? DEFAULT_PRODUCTIVITY;
  const target  = computeProductivityTarget(state);
  const drift   = 3; // la productivité évolue lentement

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, productivity: next };

  const day = s.mandateDay;
  const ind = s.nationalIndicators;

  // Effets sur l'économie — légers, tous les 3 jours
  if (day % 3 === 0) {
    if (next >= 75) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          economy: Math.min(100, (ind?.economy ?? 55) + 1),
        },
      };
    } else if (next <= 25) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          economy: Math.max(0, (ind?.economy ?? 55) - 1),
        },
      };
    }
  }

  // Effets sur le budget public — recettes fiscales, tous les 5 jours
  if (day % 5 === 0) {
    const budget = s.nationalIndicators?.publicBudget ?? 20;
    if (next >= 80) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          publicBudget: Math.min(100, budget + 1),
        },
      };
    } else if (next <= 20) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          publicBudget: Math.max(-150, budget - 1),
        },
      };
    }
  }

  return s;
}
