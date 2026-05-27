/**
 * gridPhysicsEngine.ts — Stabilité du réseau électrique.
 *
 * Indicateur physique discret (0–100) : gridStability.
 * Reflète la fiabilité globale du réseau sans modèle d'ingénierie réel.
 * L'indicateur dérive lentement vers une cible implicite calculée
 * depuis l'état courant (énergie, cyber, infrastructure, météo).
 *
 * Seuils :
 *  80–100 : réseau stable
 *  50–79  : tension sur le réseau
 *  25–49  : risque de délestage
 *   0–24  : risque de blackout
 *
 * Les effets sont discrets : aucun chiffre brut n'est exposé au joueur,
 * seulement un label de bande coloré. Aucun modèle d'ingénierie détaillé.
 */

import type { StrategyGameState } from "@/types/strategy";

// ── Bandes de stabilité ───────────────────────────────────────────────────────

export type GridBand = "stable" | "tension" | "risque_delestage" | "risque_blackout";

export interface GridBandInfo {
  band:  GridBand;
  label: string;
  color: string;
}

export function getGridBandInfo(stability: number): GridBandInfo {
  if (stability >= 80) return { band: "stable",           label: "Réseau stable",    color: "#4caf82" };
  if (stability >= 50) return { band: "tension",          label: "Tension réseau",   color: "#e8c44f" };
  if (stability >= 25) return { band: "risque_delestage", label: "Risque délestage", color: "#e8864f" };
  return                      { band: "risque_blackout",  label: "Risque blackout",  color: "#e54848" };
}

// ── Cible implicite de stabilité ──────────────────────────────────────────────
// Jamais exposée au joueur — détermine uniquement la direction de la dérive.

function computeGridTarget(state: StrategyGameState): number {
  const res = state.resources;
  const hp  = state.hiddenPolitics;
  const ind = state.nationalIndicators;

  let target = 65; // base neutre

  // Énergie disponible
  if (res.energy > 250)      target += 18;
  else if (res.energy > 150) target += 10;
  else if (res.energy > 80)  target += 4;
  else if (res.energy < 50)  target -= 18;
  else if (res.energy < 20)  target -= 35;

  // Cyberdéfense — protection contre sabotage et pannes numériques
  if (res.cyberDefense > 150)      target += 8;
  else if (res.cyberDefense > 80)  target += 3;
  else if (res.cyberDefense < 40)  target -= 10;
  else if (res.cyberDefense < 15)  target -= 20;

  // Infrastructure — dette d'entretien implicite
  const instab = hp?.institutionalStability ?? 60;
  target += Math.round((instab - 50) * 0.25);

  // Économie — coupes dans les programmes de maintenance
  const eco = ind.economy;
  if (eco < 20)      target -= 15;
  else if (eco < 30) target -= 8;

  // Pression météo — chaleur extrême, tempêtes, surcharge saisonnière
  const cropStress = state.agroWeather?.cropStress ?? 20;
  if (cropStress > 85)      target -= 14;
  else if (cropStress > 70) target -= 7;

  return Math.min(100, Math.max(0, target));
}

// ── Tick journalier — dérive vers la cible ────────────────────────────────────

const GRID_DRIFT_PER_TICK = 3; // la stabilité évolue de max 3 pts par tick
const DEFAULT_GRID_STABILITY = 72;

export function tickGridPhysics(state: StrategyGameState): StrategyGameState {
  const current = state.gridStability ?? DEFAULT_GRID_STABILITY;
  const target  = computeGridTarget(state);

  if (current === target) return state;

  const diff  = target - current;
  const delta = Math.sign(diff) * Math.min(GRID_DRIFT_PER_TICK, Math.abs(diff));
  const next  = Math.min(100, Math.max(0, Math.round(current + delta)));

  if (next === current) return state;
  return { ...state, gridStability: next };
}

// ── Modificateur de dégâts lors d'une crise blackout ─────────────────────────
// Réduit ou amplifie les effets d'un blackout selon la santé du réseau.

export function getBlackoutDamageMultiplier(stability: number): number {
  if (stability >= 80) return 0.6;  // réseau robuste — meilleure absorption
  if (stability >= 50) return 0.85;
  if (stability >= 25) return 1.15; // réseau fragile — crise amplifiée
  return 1.4;                       // réseau critique — effondrement possible
}
