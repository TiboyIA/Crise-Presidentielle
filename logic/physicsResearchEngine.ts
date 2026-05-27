/**
 * physicsResearchEngine.ts — Effets passifs des recherches physiques avancées.
 *
 * Appelé par tick (per-10-day). Chaque recherche complétée applique des effets
 * légers et cumulatifs sur les systèmes MODE DELTA correspondants.
 *
 * Effets par recherche :
 *   inertial_storage        → gridStability +4
 *   self_healing_materials  → usure -2 par bâtiment actif
 *   datacenter_cooling      → thermalStress -4, cyberDefense +3
 *   adaptive_orbits         → intelligence +4
 *   em_shielding            → restaure 40% drain tempête solaire
 *   quantum_sensors         → signalNoiseRatio +4, déverrouille visibilité complète des ruptures
 *   superconducting_grid    → energy +10, gridStability +3
 *   digital_twin            → marges sécurité systémiques relevées si < 5
 */

import type { StrategyGameState } from "@/types/strategy";
import type { SolarStormLevel } from "@/logic/solarStormEngine";
import { DEFAULT_BREAKPOINT_STATE } from "@/logic/breakpointEngine";
import type { BreakpointSystemId } from "@/logic/breakpointEngine";

const ALL_SYSTEMS: BreakpointSystemId[] = [
  "grid", "publicTrust", "infrastructure", "cyber",
  "publicFinance", "socialCohesion", "militaryCommand",
];

// 40% de restauration des drains de PASSIVE_DRAIN (faible/modérée/forte/extrême)
const EM_RESTORE: Record<SolarStormLevel, { energy: number; cyberDefense: number; intelligence: number }> = {
  "faible":   { energy:  8, cyberDefense: 1, intelligence: 2 },
  "modérée":  { energy: 20, cyberDefense: 3, intelligence: 4 },
  "forte":    { energy: 32, cyberDefense: 5, intelligence: 6 },
  "extrême":  { energy: 48, cyberDefense: 7, intelligence: 8 },
};

export function applyPhysicsResearchEffects(state: StrategyGameState): StrategyGameState {
  const completed = state.strategyResearch?.completed ?? [];
  let s = state;

  // 1. Stockage inertiel du réseau → gridStability +4 par cycle
  if (completed.includes("research_inertial_storage")) {
    s = { ...s, gridStability: Math.min(100, (s.gridStability ?? 60) + 4) };
  }

  // 2. Matériaux auto-réparants → -2 usure sur chaque bâtiment actif
  if (completed.includes("research_self_healing_materials")) {
    const wear = { ...(s.infrastructureWear ?? {}) };
    for (const b of s.buildings.filter((b) => b.level > 0)) {
      wear[b.id] = Math.max(0, (wear[b.id] ?? 0) - 2);
    }
    s = { ...s, infrastructureWear: wear };
  }

  // 3. Refroidissement avancé → thermalStress -4, cyberDefense +3
  if (completed.includes("research_datacenter_cooling")) {
    s = { ...s, thermalStress: Math.max(0, (s.thermalStress ?? 22) - 4) };
    s = { ...s, resources: { ...s.resources, cyberDefense: s.resources.cyberDefense + 3 } };
  }

  // 4. Satellites à orbite adaptative → intelligence +4
  if (completed.includes("research_adaptive_orbits")) {
    s = { ...s, resources: { ...s.resources, intelligence: s.resources.intelligence + 4 } };
  }

  // 5. Blindage électromagnétique → restaure 40% des pertes de la tempête solaire active
  if (completed.includes("research_em_shielding") && s.solarStorm) {
    const r = EM_RESTORE[s.solarStorm.level];
    s = {
      ...s,
      resources: {
        ...s.resources,
        energy:       s.resources.energy       + r.energy,
        cyberDefense: s.resources.cyberDefense + r.cyberDefense,
        intelligence: s.resources.intelligence + r.intelligence,
      },
    };
  }

  // 6. Capteurs quantiques → signalNoiseRatio +4, marge cyber +1 si < 10
  if (completed.includes("research_quantum_sensors")) {
    s = { ...s, signalNoiseRatio: Math.min(100, (s.signalNoiseRatio ?? 55) + 4) };
    const bp6 = s.breakpoints ?? DEFAULT_BREAKPOINT_STATE;
    if ((bp6.margins.cyber ?? 0) < 10) {
      s = {
        ...s,
        breakpoints: {
          ...bp6,
          margins: { ...bp6.margins, cyber: Math.min(10, (bp6.margins.cyber ?? 0) + 1) },
        },
      };
    }
  }

  // 7. Réseau supraconducteur → énergie +10, gridStability +3
  if (completed.includes("research_superconducting_grid")) {
    s = { ...s, resources: { ...s.resources, energy: s.resources.energy + 10 } };
    s = { ...s, gridStability: Math.min(100, (s.gridStability ?? 60) + 3) };
  }

  // 8. Jumeau numérique → relève les marges < 5 vers 5 (plancher de résilience)
  if (completed.includes("research_digital_twin")) {
    const bp8   = s.breakpoints ?? DEFAULT_BREAKPOINT_STATE;
    const marg8 = { ...bp8.margins };
    let changed = false;
    for (const id of ALL_SYSTEMS) {
      const cur = marg8[id] ?? 0;
      if (cur < 5) { marg8[id] = Math.min(5, cur + 1); changed = true; }
    }
    if (changed) s = { ...s, breakpoints: { ...bp8, margins: marg8 } };
  }

  return s;
}
