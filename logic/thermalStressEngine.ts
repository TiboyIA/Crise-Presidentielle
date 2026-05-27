/**
 * thermalStressEngine.ts — Stress thermique des systèmes nationaux.
 *
 * Indicateur abstrait (0–100) : thermalStress.
 * Reflète la charge thermique globale des systèmes critiques
 * sans formule de thermodynamique : serveurs, réseaux, industrie, opérations.
 *
 * Bandes :
 *   0–29  : nominal          — aucun effet
 *  30–54  : tension          — coûts énergétiques légèrement accrus
 *  55–79  : surchauffe       — drain énergie + cyberdéfense réduite
 *  80–100 : surchauffe critique — fatigue population, rendement industriel –
 *
 * Les effets sont discrets. Seule la bande est exposée au joueur.
 */

import type { StrategyGameState } from "@/types/strategy";

// ── Bandes thermiques ─────────────────────────────────────────────────────────

export type ThermalBand = "nominal" | "tension" | "surchauffe" | "critique";

export interface ThermalBandInfo {
  band:  ThermalBand;
  label: string;
  color: string;
}

export function getThermalBandInfo(stress: number): ThermalBandInfo {
  if (stress < 30) return { band: "nominal",    label: "Systèmes nominaux",    color: "#4caf82" };
  if (stress < 55) return { band: "tension",    label: "Tension thermique",    color: "#e8c44f" };
  if (stress < 80) return { band: "surchauffe", label: "Surchauffe partielle", color: "#e8864f" };
  return                   { band: "critique",  label: "SURCHAUFFE CRITIQUE",  color: "#e54848" };
}

// ── Cible implicite ───────────────────────────────────────────────────────────
// Jamais exposée au joueur — détermine uniquement la direction de la dérive.

function computeThermalTarget(state: StrategyGameState): number {
  const res = state.resources;
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;

  let target = 25; // base neutre — tendance nominale basse

  // Demande énergétique élevée → systèmes en surcharge thermique
  if (res.energy > 300)       target += 20;
  else if (res.energy > 200)  target += 12;
  else if (res.energy > 120)  target += 5;
  else if (res.energy < 50)   target -= 8;

  // Cyberdéfense — datacenters et systèmes de sécurité sous charge
  if (res.cyberDefense > 150)     target += 12;
  else if (res.cyberDefense > 80) target += 6;
  else if (res.cyberDefense < 20) target -= 5;

  // Opérations militaires intenses — équipements en surchauffe
  if (res.military > 200)      target += 15;
  else if (res.military > 120) target += 8;
  else if (res.military < 40)  target -= 4;

  // Industrie accélérée — économie en surchauffe
  const eco = ind.economy;
  if (eco > 75)      target += 10;
  else if (eco > 55) target += 4;
  else if (eco < 25) target -= 6; // dépression → moins de chaleur industrielle

  // Canicule ou stress météo extrême (proxy via agroWeather)
  const cropStress = state.agroWeather?.cropStress ?? 20;
  if (cropStress > 85)      target += 14;
  else if (cropStress > 65) target += 7;

  // Infrastructure solide — meilleure dissipation thermique
  const instab = hp?.institutionalStability ?? 60;
  if (instab > 75)  target -= 8;
  else if (instab < 35) target += 6; // bâtiments vétustes → moins bonne dissipation

  // Recherche technologique — amélioration du refroidissement et de l'efficacité
  if (res.technology > 120)     target -= 10;
  else if (res.technology > 60) target -= 5;

  // Budget contraint → moins de maintenance thermique
  if (ind.publicBudget < -60)  target += 8;
  else if (ind.publicBudget > 40) target -= 4;

  return Math.min(100, Math.max(0, Math.round(target)));
}

// ── Tick journalier ───────────────────────────────────────────────────────────

const THERMAL_DRIFT_PER_TICK = 3;
export const DEFAULT_THERMAL_STRESS = 22;

export function tickThermalStress(state: StrategyGameState): StrategyGameState {
  const current = state.thermalStress ?? DEFAULT_THERMAL_STRESS;
  const target  = computeThermalTarget(state);

  const diff  = target - current;
  const delta = Math.sign(diff) * Math.min(THERMAL_DRIFT_PER_TICK, Math.abs(diff));
  const next  = Math.min(100, Math.max(0, Math.round(current + delta)));

  let s = next === current ? state : { ...state, thermalStress: next };

  // Effets de la surchauffe — discrets, légers, journaliers
  if (next >= 55) {
    // Refroidissement coûteux en énergie
    const energyDrain = next >= 80 ? 20 : 10;
    s = { ...s, resources: { ...s.resources, energy: Math.max(0, s.resources.energy - energyDrain) } };

    // Cyberdéfense dégradée par la chaleur
    const cyberDrain = next >= 80 ? 8 : 4;
    s = { ...s, resources: { ...s.resources, cyberDefense: Math.max(0, s.resources.cyberDefense - cyberDrain) } };
  }

  if (next >= 70) {
    // Pression sur la stabilité institutionnelle
    const hp = s.hiddenPolitics;
    if (hp) {
      s = { ...s, hiddenPolitics: { ...hp, institutionalStability: Math.max(0, hp.institutionalStability - 1) } };
    }
  }

  if (next >= 80) {
    // Fatigue population + rendement industriel réduit
    const ind = s.nationalIndicators;
    s = {
      ...s,
      nationalIndicators: {
        ...ind,
        popularity: Math.max(0, ind.popularity - 1),
        economy:    Math.max(0, ind.economy    - 1),
      },
    };
  }

  return s;
}

// ── Réduction directe (événements ou actions de refroidissement) ──────────────

export function applyThermalReduction(state: StrategyGameState, reduction: number): StrategyGameState {
  if (reduction <= 0) return state;
  const current = state.thermalStress ?? DEFAULT_THERMAL_STRESS;
  const next = Math.max(0, current - reduction);
  if (next === current) return state;
  return { ...state, thermalStress: next };
}
