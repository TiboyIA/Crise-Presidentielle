/**
 * inertiaEngine.ts — Inertie physique et administrative de l'État.
 *
 * Les grandes décisions ne produisent pas leur plein effet immédiatement.
 * Une partie arrive tout de suite. Le reste s'installe progressivement
 * au fil des jours de mandat, selon la santé actuelle du domaine concerné.
 *
 * Règles :
 * - Systèmes sains (≥ 65) : 40 % immédiat, 60 % différé sur 50 jours.
 * - Systèmes normaux (40-64) : 30 % immédiat, 70 % différé sur 80 jours.
 * - Systèmes dégradés (< 40) : 20 % immédiat, 80 % différé sur 120 jours.
 * - Crises brutales (dépassement du seuil d'absorption) : fraction immédiate
 *   réduite, délai étendu — l'État n'absorbe pas tout d'un coup.
 * - Aucun calcul visible au joueur. Aucune simulation scientifique.
 * - Les effets différés disparaissent si le domaine change radicalement.
 */

import type { StrategyGameState, NationalIndicators, HiddenPolitics, StrategyResources } from "@/types/strategy";

// ── Domaines d'inertie ─────────────────────────────────────────────────────────

export type InertiaDomain =
  | "energie"
  | "securite"
  | "economie"
  | "cyberDefense"
  | "infrastructure"
  | "cohesion";

export const INERTIA_DOMAIN_LABELS: Record<InertiaDomain, string> = {
  energie:        "Énergie",
  securite:       "Sécurité",
  economie:       "Économie",
  cyberDefense:   "Cyberdéfense",
  infrastructure: "Infrastructure",
  cohesion:       "Cohésion",
};

// ── Effets en file d'attente ──────────────────────────────────────────────────

export interface InertiaEffect {
  id:             string;
  domain:         InertiaDomain;
  remainingAmount: number;    // signé : positif = amélioration, négatif = dégradation
  chunkPerDay:    number;     // montant absolu appliqué par jour de mandat
  expiresAtDay:   number;     // jour de mandat au-delà duquel l'effet est annulé
  sourceEventId?: string;
}

// ── Seuils d'absorption par domaine ──────────────────────────────────────────
// Au-delà de ces montants absolus, l'effet immédiat est plafonné (crise brutale).

const ABSORPTION_CAPS: Record<InertiaDomain, number> = {
  energie:        80,   // énergie : impact > 80 pts = choc brutal
  securite:       20,   // indicateur 0-100 : impact > 20 pts = choc brutal
  economie:       20,
  cyberDefense:   60,
  infrastructure: 15,
  cohesion:       18,
};

// ── Santé courante du domaine ─────────────────────────────────────────────────

export function getDomainHealth(domain: InertiaDomain, state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;

  switch (domain) {
    case "energie":        return Math.min(100, Math.round(res.energy / 3));       // 300 énergie ≈ 100 %
    case "securite":       return ind.security;
    case "economie":       return ind.economy;
    case "cyberDefense":   return Math.min(100, Math.round(res.cyberDefense * 0.5)); // 200 cyber ≈ 100 %
    case "infrastructure": return hp.institutionalStability;
    case "cohesion":       return ind.cohesion;
  }
}

// ── Ratio immédiat selon la santé du domaine ──────────────────────────────────

function getImmediateRatio(health: number): number {
  if (health >= 65) return 0.4;
  if (health >= 40) return 0.3;
  return 0.2;
}

// ── Durée de déploiement (jours de mandat) selon la santé ────────────────────

function getDeploymentDays(health: number): number {
  if (health >= 65) return 50;
  if (health >= 40) return 80;
  return 120;
}

// ── Application directe d'un montant à un domaine ────────────────────────────

function applyDomainDelta(
  state: StrategyGameState,
  domain: InertiaDomain,
  delta: number,
): StrategyGameState {
  if (delta === 0) return state;
  const d = Math.round(delta);

  switch (domain) {
    case "energie":
      return {
        ...state,
        resources: {
          ...state.resources,
          energy: Math.max(0, state.resources.energy + d),
        },
      };

    case "securite":
      return {
        ...state,
        nationalIndicators: {
          ...state.nationalIndicators,
          security: Math.min(100, Math.max(0, state.nationalIndicators.security + d)),
        },
      };

    case "economie":
      return {
        ...state,
        nationalIndicators: {
          ...state.nationalIndicators,
          economy: Math.min(100, Math.max(0, state.nationalIndicators.economy + d)),
        },
      };

    case "cyberDefense":
      return {
        ...state,
        resources: {
          ...state.resources,
          cyberDefense: Math.max(0, state.resources.cyberDefense + d),
        },
      };

    case "infrastructure":
      return {
        ...state,
        hiddenPolitics: {
          ...state.hiddenPolitics,
          institutionalStability: Math.min(100, Math.max(0, state.hiddenPolitics.institutionalStability + d)),
        },
      };

    case "cohesion":
      return {
        ...state,
        nationalIndicators: {
          ...state.nationalIndicators,
          cohesion: Math.min(100, Math.max(0, state.nationalIndicators.cohesion + d)),
        },
      };
  }
}

// ── Enregistrement d'un effet inertiel depuis un choix ────────────────────────

export function queueInertiaChoiceEffects(
  state: StrategyGameState,
  effects: Partial<Record<InertiaDomain, number>>,
  sourceEventId?: string,
): StrategyGameState {
  let s = state;
  const newQueue = [...(s.inertiaQueue ?? [])];

  for (const [rawDomain, totalAmount] of Object.entries(effects) as [InertiaDomain, number][]) {
    if (!totalAmount || totalAmount === 0) continue;

    const health          = getDomainHealth(rawDomain, s);
    const immediateRatio  = getImmediateRatio(health);
    const absAmount       = Math.abs(totalAmount);
    const sign            = Math.sign(totalAmount);
    const cap             = ABSORPTION_CAPS[rawDomain];

    // Crises brutales : si l'impact dépasse la capacité d'absorption, on réduit la part immédiate
    const effectiveRatio  = absAmount > cap ? immediateRatio * 0.5 : immediateRatio;
    const immediateAmount = sign * Math.round(absAmount * effectiveRatio);
    const deferredAmount  = totalAmount - immediateAmount;

    // Application immédiate
    if (immediateAmount !== 0) {
      s = applyDomainDelta(s, rawDomain, immediateAmount);
    }

    // Mise en file si reste significatif
    if (Math.abs(deferredAmount) >= 1) {
      const deploymentDays = absAmount > cap
        ? Math.round(getDeploymentDays(health) * 1.5)   // choc brutal : délai étendu
        : getDeploymentDays(health);

      const chunkPerDay = Math.max(0.5, Math.abs(deferredAmount) / deploymentDays);

      newQueue.push({
        id:              `inertia_${rawDomain}_${s.mandateDay}_${Math.random().toString(36).slice(2, 6)}`,
        domain:          rawDomain,
        remainingAmount: deferredAmount,
        chunkPerDay,
        expiresAtDay:    s.mandateDay + deploymentDays + 20,  // marge de sécurité
        sourceEventId,
      });
    }
  }

  return { ...s, inertiaQueue: newQueue };
}

// ── Tick quotidien — appliqué chaque jour de mandat ──────────────────────────

export function tickInertia(state: StrategyGameState): StrategyGameState {
  const queue = state.inertiaQueue;
  if (!queue || queue.length === 0) return state;

  let s = state;
  const updatedQueue: InertiaEffect[] = [];

  for (const effect of queue) {
    // Expiration de sécurité
    if (s.mandateDay >= effect.expiresAtDay) continue;

    const sign        = Math.sign(effect.remainingAmount);
    const absRemain   = Math.abs(effect.remainingAmount);
    const todayChunk  = Math.min(effect.chunkPerDay, absRemain);

    if (todayChunk < 0.5) continue; // quantité négligeable, on abandonne

    const applied = sign * todayChunk;
    s = applyDomainDelta(s, effect.domain, applied);

    const newRemaining = effect.remainingAmount - applied;

    // On garde l'effet tant qu'il reste quelque chose de significatif
    if (Math.abs(newRemaining) >= 0.5) {
      updatedQueue.push({ ...effect, remainingAmount: newRemaining });
    }
  }

  return { ...s, inertiaQueue: updatedQueue };
}

// ── Résumé de la file (pour debug / UI discrète) ──────────────────────────────

export interface InertiaSummary {
  domain:         InertiaDomain;
  label:          string;
  remainingTotal: number;   // somme signée des effets en attente
  direction:      "amélioration" | "dégradation" | "neutre";
}

export function getInertiaSummary(state: StrategyGameState): InertiaSummary[] {
  const queue = state.inertiaQueue ?? [];
  if (queue.length === 0) return [];

  const totals: Partial<Record<InertiaDomain, number>> = {};
  for (const fx of queue) {
    totals[fx.domain] = (totals[fx.domain] ?? 0) + fx.remainingAmount;
  }

  return Object.entries(totals)
    .filter(([, v]) => Math.abs(v) >= 1)
    .map(([domain, total]) => ({
      domain:         domain as InertiaDomain,
      label:          INERTIA_DOMAIN_LABELS[domain as InertiaDomain],
      remainingTotal: Math.round(total),
      direction:      total > 0 ? "amélioration" : total < 0 ? "dégradation" : "neutre",
    }));
}
