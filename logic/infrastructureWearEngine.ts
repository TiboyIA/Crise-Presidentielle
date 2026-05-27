/**
 * infrastructureWearEngine.ts — Usure physique des infrastructures.
 *
 * Chaque bâtiment actif accumule une usure (0–100) au fil du temps.
 * Cette usure augmente avec les crises environnementales, le manque
 * de budget et la forte production. Elle baisse avec la maintenance.
 *
 * Bandes d'usure :
 *   0–24  : neuf           — aucun effet
 *  25–49  : légère usure   — rendement légèrement réduit (drain discret)
 *  50–74  : usure modérée  — drain notable sur ressources
 *  75–89  : forte usure    — drain significatif + pression sur stabilité
 *  90–100 : critique       — événement de rupture possible
 *
 * Les effets sont discrets : pas de chiffre brut exposé au joueur.
 * Un label de bande coloré suffit.
 */

import type { BuildingId, StrategyGameState, StrategyResources } from "@/types/strategy";

// ── Bandes d'usure ────────────────────────────────────────────────────────────

export type WearBand = "neuf" | "légère" | "modérée" | "forte" | "critique";

export interface WearBandInfo {
  band:  WearBand;
  label: string;
  color: string;
}

export function getWearBandInfo(wear: number): WearBandInfo {
  if (wear < 25) return { band: "neuf",      label: "Bon état",      color: "#4caf82" };
  if (wear < 50) return { band: "légère",    label: "Légère usure",  color: "#8bc34a" };
  if (wear < 75) return { band: "modérée",   label: "Usure modérée", color: "#e8c44f" };
  if (wear < 90) return { band: "forte",     label: "Forte usure",   color: "#e8864f" };
  return                { band: "critique",  label: "CRITIQUE",      color: "#e54848" };
}

// ── Ressource primaire par bâtiment (cible des drains d'usure) ────────────────

const BUILDING_DRAIN: Partial<Record<BuildingId, { key: keyof StrategyResources; mild: number; high: number }>> = {
  presidential_palace:     { key: "influence",   mild: 6,   high: 15  },
  economy_ministry:        { key: "money",       mild: 200, high: 500 },
  defense_ministry:        { key: "military",    mild: 3,   high: 7   },
  intelligence_ministry:   { key: "intelligence",mild: 3,   high: 7   },
  cyber_ministry:          { key: "cyberDefense",mild: 4,   high: 10  },
  energy_ministry:         { key: "energy",      mild: 12,  high: 30  },
  diplomacy_ministry:      { key: "influence",   mild: 5,   high: 12  },
  research_center:         { key: "technology",  mild: 3,   high: 7   },
  central_bank:            { key: "money",       mild: 300, high: 700 },
  media_agency:            { key: "influence",   mild: 4,   high: 10  },
  military_hq:             { key: "military",    mild: 4,   high: 10  },
};

// ── Métriques d'usure ─────────────────────────────────────────────────────────

export function getAverageWear(state: StrategyGameState): number {
  const wear = state.infrastructureWear ?? {};
  const active = state.buildings.filter((b) => b.level > 0);
  if (active.length === 0) return 0;

  const total = active.reduce((sum, b) => sum + (wear[b.id] ?? 0), 0);
  return Math.round(total / active.length);
}

export function getCriticalBuildings(state: StrategyGameState, threshold = 88): BuildingId[] {
  const wear = state.infrastructureWear ?? {};
  return Object.entries(wear)
    .filter(([, w]) => w >= threshold)
    .map(([id]) => id as BuildingId);
}

// ── Usure passive par bâtiment par 10 jours ───────────────────────────────────

function passiveWearPerTick(buildingId: BuildingId, buildingLevel: number, state: StrategyGameState): number {
  if (buildingLevel === 0) return 0;

  let wear = 2; // base : vieillissement naturel

  // Bâtiments à forte production : plus d'usure mécanique
  if (buildingLevel >= 7) wear += 1;

  // Stress énergétique → énergie et palais présidentiel
  const energy = state.resources.energy;
  if ((buildingId === "energy_ministry" || buildingId === "presidential_palace") && energy < 80) {
    wear += 2;
  }

  // Stress cyber → ministère cyber
  if (buildingId === "cyber_ministry" && state.resources.cyberDefense < 50) {
    wear += 2;
  }

  // Météo extrême → usure générale plus rapide
  const cropStress = state.agroWeather?.cropStress ?? 0;
  if (cropStress > 85) wear += 2;
  else if (cropStress > 70) wear += 1;

  // Budget serré → manque d'entretien courant
  if (state.nationalIndicators.publicBudget < -60) wear += 1;

  return wear;
}

// ── Tick tous les 10 jours ────────────────────────────────────────────────────

export function tickInfrastructureWear(state: StrategyGameState): StrategyGameState {
  const currentWear = { ...(state.infrastructureWear ?? {}) };
  let resources = { ...state.resources };
  let instability = state.hiddenPolitics?.institutionalStability ?? 60;

  for (const building of state.buildings) {
    if (building.level === 0) continue;

    const delta  = passiveWearPerTick(building.id, building.level, state);
    const prev   = currentWear[building.id] ?? 0;
    const next   = Math.min(100, prev + delta);
    currentWear[building.id] = next;

    // Drain de production pour usure modérée et plus
    const drain = BUILDING_DRAIN[building.id];
    if (drain && next >= 50) {
      const amount = next >= 75 ? drain.high : drain.mild;
      const key    = drain.key;
      resources = { ...resources, [key]: Math.max(0, (resources[key] ?? 0) - amount) };
    }
  }

  // Pression sur la stabilité institutionnelle selon l'usure moyenne
  const avgWear = Math.round(
    state.buildings.filter((b) => b.level > 0).reduce((sum, b) => sum + (currentWear[b.id] ?? 0), 0)
    / Math.max(1, state.buildings.filter((b) => b.level > 0).length),
  );
  if (avgWear >= 70)      instability = Math.max(0, instability - 2);
  else if (avgWear >= 50) instability = Math.max(0, instability - 1);

  return {
    ...state,
    resources,
    infrastructureWear: currentWear,
    hiddenPolitics: {
      ...state.hiddenPolitics,
      institutionalStability: instability,
    },
  };
}

// ── Réduction d'usure (maintenance ou choix événement) ───────────────────────

export function applyWearReduction(state: StrategyGameState, reduction: number): StrategyGameState {
  if (reduction <= 0) return state;
  const current = state.infrastructureWear ?? {};
  const updated: Partial<Record<BuildingId, number>> = {};

  for (const building of state.buildings) {
    if (building.level === 0) continue;
    const prev = current[building.id] ?? 0;
    const next = Math.max(0, prev - reduction);
    if (next > 0) updated[building.id] = next;
    // Si next = 0, on ne stocke pas (= neuf, valeur implicite)
  }

  return { ...state, infrastructureWear: updated };
}

// ── Maintenance préventive directe (action joueur) ────────────────────────────

export const MAINTENANCE_COST    = 800;
export const MAINTENANCE_WEAR_REDUCTION = 20;

export function canPerformMaintenance(state: StrategyGameState): boolean {
  return state.resources.money >= MAINTENANCE_COST && getAverageWear(state) >= 15;
}
