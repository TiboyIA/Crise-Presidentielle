import { clamp } from "@/logic/utils";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import type { StrategyGameState } from "@/types/strategy";

// ── Tiers ─────────────────────────────────────────────────────────────────────

export type MoraleTier = "engagee" | "stable" | "tension" | "malaise" | "crise";

export interface MoraleTierInfo {
  tier:  MoraleTier;
  label: string;
  color: string;
}

export function getMoraleTier(morale: number): MoraleTierInfo {
  if (morale <= 20) return { tier: "crise",   label: "Crise institutionnelle", color: "#e54848" };
  if (morale <= 40) return { tier: "malaise", label: "Malaise profond",        color: "#f59a3a" };
  if (morale <= 60) return { tier: "tension", label: "Tension sourde",         color: "#e8a93a" };
  if (morale <= 80) return { tier: "stable",  label: "Stable",                 color: "#3fbe7a" };
  return                   { tier: "engagee", label: "Administration engagée", color: "#4a9fff" };
}

// ── Lectures d'état ───────────────────────────────────────────────────────────

function countPendingCrises(pendingIds: string[]): { critical: number; high: number } {
  let critical = 0, high = 0;
  for (const id of pendingIds) {
    const ev = NEWS_EVENT_MAP[id];
    if (!ev) continue;
    if (ev.urgency === "critique") critical++;
    else if (ev.urgency === "forte") high++;
  }
  return { critical, high };
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickAdministrationMorale(
  state: StrategyGameState,
): StrategyGameState {
  const morale = state.administrationMorale ?? 60;
  const ind    = state.nationalIndicators;
  const hp     = state.hiddenPolitics;

  let delta = 0;

  // Crises en attente → surcharge de la chaîne administrative
  const { critical, high } = countPendingCrises(state.news.pendingIds);
  delta -= Math.min(critical, 3) * 2;
  delta -= Math.min(high, 3) * 1;

  // Budget : coupes budgétaires → démotivation des services
  if (ind.publicBudget < -80) delta -= 3;
  else if (ind.publicBudget < -40) delta -= 1;

  // Réformes actives → signal de mouvement, sentiment d'utilité
  const activeReforms = state.reforms.filter((r) => !r.applied).length;
  if (activeReforms >= 1) delta += 1;

  // Loyauté cabinet → qualité du management ministériel
  if (state.strategyMinisters.length > 0) {
    const avgLoyalty =
      state.strategyMinisters.reduce((sum, m) => sum + m.loyalty, 0) /
      state.strategyMinisters.length;
    if (avgLoyalty < 40)      delta -= 2;
    else if (avgLoyalty > 70) delta += 1;
  }

  // Stabilité institutionnelle → confiance dans la hiérarchie
  if (hp.institutionalStability < 35)      delta -= 2;
  else if (hp.institutionalStability > 75) delta += 1;

  // Scandales → poison du moral collectif
  if (hp.scandalRisk > 65) delta -= 2;

  // Popularité → reconnaissance publique du travail des agents
  if (ind.popularity > 65) delta += 1;

  // Période calme → récupération naturelle
  if (critical === 0 && high === 0 && delta >= 0) delta += 1;

  const next = clamp(morale + delta);

  // Moral en crise → drag sur la stabilité institutionnelle
  let hiddenPolitics = hp;
  if (next <= 20) {
    hiddenPolitics = {
      ...hp,
      institutionalStability: clamp(hp.institutionalStability - 1),
    };
  }

  return { ...state, administrationMorale: next, hiddenPolitics };
}

// ── Effet sur la probabilité de gaffe ─────────────────────────────────────────

/**
 * Delta de probabilité de gaffe dû au moral administratif.
 * Positif = plus de gaffes, négatif = moins d'erreurs.
 */
export function moraleToGaffeProbabilityBonus(morale: number): number {
  if (morale <= 20) return  8;
  if (morale <= 40) return  4;
  if (morale >= 80) return -3;
  return 0;
}

// ── Modificateur de vitesse des réformes ──────────────────────────────────────

/**
 * Retourne le nombre de jours supplémentaires causés par le moral bas.
 * Peut être utilisé par les composants pour l'affichage (pas appliqué au moteur de réformes).
 */
export function moraleReformDelayDays(morale: number): number {
  if (morale <= 20) return 3;
  if (morale <= 40) return 1;
  return 0;
}
