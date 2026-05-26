/**
 * moralNegotiationEngine.ts — La Chambre du Seuil.
 *
 * Gère l'équilibre moral du président face aux deux forces :
 * Aurora (protecteur conditionnel) et Obscurium (tentateur toxique).
 *
 * Règles :
 * - Aurora ne donne jamais de bonus gratuit — conditions strictes.
 * - Obscurium est toujours disponible mais chaque aide alimente la dette.
 * - La neutralité est un choix valide qui renforce la crédibilité humaine.
 * - Les effets dérivés du tick sont lents (±1 pt par palier).
 */

import type { StrategyGameState } from "@/types/strategy";
import type { ActivePact } from "@/data/moralNegotiations";
import { AURORA_PACT_THRESHOLDS } from "@/data/moralNegotiations";

// ── État ──────────────────────────────────────────────────────────────────────

export interface MoralNegotiationState {
  auroraTrust:           number;   // 0-100 — confiance d'Aurora envers le président
  obscuriumDebt:         number;   // 0-100 — dette invisible envers Obscurium
  moralBalance:          number;   // -100 à +100 (+100 = alignement Aurora)
  lastNegotiationAt:     number;   // news.actionCount du dernier événement ch_
  activePact:            ActivePact;
  pactExpiresAtAction:   number;   // actionCount absolu d'expiration (0 = aucun)
  auroraConditionBroken: boolean;  // true si les conditions du pacte Aurora ont été violées
}

export const DEFAULT_MORAL_NEGOTIATION_STATE: MoralNegotiationState = {
  auroraTrust:           20,
  obscuriumDebt:         0,
  moralBalance:          0,
  lastNegotiationAt:     0,
  activePact:            "none",
  pactExpiresAtAction:   0,
  auroraConditionBroken: false,
};

// ── Score Aurora cible ─────────────────────────────────────────────────────────

function computeTargetAuroraTrust(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;

  let score = 30; // base neutre

  // Facteurs positifs
  if (ind.cohesion >= 65)                   score += 10;
  if (ind.cohesion >= 80)                   score += 5;
  if (hp.institutionalStability >= 65)      score += 10;
  if (hp.institutionalStability >= 80)      score += 5;
  if (res.cyberDefense >= 60)               score += 8;
  if (hp.scandalRisk < 20)                  score += 10;
  if (hp.scandalRisk < 10)                  score += 5;
  if (hp.eliteTrust >= 65)                  score += 6;

  // Promesses tenues — signal de crédibilité fort pour Aurora
  const promiseStatus = state.campaignPromises?.status ?? {};
  const keptCount = Object.values(promiseStatus).filter((s) => s === "tenue").length;
  if (keptCount >= 2) score += 8;
  if (keptCount >= 3) score += 5;

  // Gouvernance
  if (state.governanceDoctrine === "democratique") score += 5;

  // Facteurs négatifs
  if (hp.scandalRisk > 55)                  score -= 12;
  if (hp.scandalRisk > 75)                  score -= 10;
  if (hp.popularFatigue > 70)               score -= 6;
  if (state.governanceDoctrine === "autoritaire") score -= 15;
  if (ind.cohesion < 30)                    score -= 10;
  if (hp.institutionalStability < 30)       score -= 8;

  // Contradictions publiques — Aurora déteste le mensonge
  const contradictions = state.contradictionHistory ?? [];
  if (contradictions.length >= 4)           score -= 8;
  if (contradictions.length >= 8)           score -= 8;

  // Influence Obscurium pèse contre la confiance Aurora
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  if (mn.obscuriumDebt > 30) score -= Math.round((mn.obscuriumDebt - 30) * 0.4);

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Vérification de violation du pacte Aurora ─────────────────────────────────

function checkAuroraPactViolation(
  state: StrategyGameState,
  mn: MoralNegotiationState,
): boolean {
  if (mn.activePact !== "aurora") return false;

  const hp = state.hiddenPolitics;
  return (
    hp.scandalRisk > AURORA_PACT_THRESHOLDS.maxScandalRisk ||
    hp.institutionalStability < AURORA_PACT_THRESHOLDS.minInstitutionalStability ||
    mn.obscuriumDebt > AURORA_PACT_THRESHOLDS.maxObscuriumDebt
  );
}

// ── Tick principal — appelé tous les 10 jours de mandat ───────────────────────

export function tickMoralNegotiation(state: StrategyGameState): StrategyGameState {
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  const oc = state.orionCityState;

  // La Chambre ne s'active que si la Cité d'Orion est découverte
  if (!oc?.discovered) {
    return { ...state, moralNegotiationState: mn };
  }

  // Dérive de la confiance Aurora (±1 par palier)
  const targetTrust = computeTargetAuroraTrust(state);
  const trustDrift  = Math.sign(targetTrust - mn.auroraTrust);
  const newTrust    = Math.min(100, Math.max(0, mn.auroraTrust + trustDrift));

  // Dérive de la dette Obscurium — réduit légèrement si aucune aide récente
  // (max -1 par palier, la dette ne disparaît jamais complètement seule)
  const recentObscuriumEvent = state.news.log.some(
    (l) => l.eventId.startsWith("ch_") && (
      l.choiceId === "ch_obscurium_accept" ||
      l.choiceId === "oc_couloir_accept" ||
      l.choiceId === "oc_couloir_ecoute" ||
      l.choiceId === "sn_noctyra_accept"
    ),
  );
  const debtDrift   = recentObscuriumEvent ? 0 : -1;
  const newDebt     = Math.min(100, Math.max(0, mn.obscuriumDebt + debtDrift));

  // Équilibre moral : Aurora - Obscurium, normalisé sur [-100, +100]
  const rawBalance  = newTrust - newDebt;
  const newBalance  = Math.min(100, Math.max(-100, rawBalance));

  // Vérification violation pacte Aurora
  const pactViolated = checkAuroraPactViolation(state, mn);
  const newBroken    = mn.auroraConditionBroken || pactViolated;

  // Expiration du pacte
  const pactExpired =
    mn.activePact !== "none" &&
    mn.pactExpiresAtAction > 0 &&
    state.news.actionCount >= mn.pactExpiresAtAction;

  const newPact          = pactExpired ? "none" : mn.activePact;
  const newPactExpires   = pactExpired ? 0 : mn.pactExpiresAtAction;
  // Si le pacte expire proprement (Aurora, non rompu), réinitialise le flag
  const newBrokenCleared = pactExpired && !mn.auroraConditionBroken ? false : newBroken;

  return {
    ...state,
    moralNegotiationState: {
      auroraTrust:           newTrust,
      obscuriumDebt:         newDebt,
      moralBalance:          newBalance,
      lastNegotiationAt:     mn.lastNegotiationAt,
      activePact:            newPact,
      pactExpiresAtAction:   newPactExpires,
      auroraConditionBroken: newBrokenCleared,
    },
  };
}

// ── Helpers pour les conditions des événements Journal de Crise ───────────────

export function isChChambreEligible(state: StrategyGameState): boolean {
  const oc = state.orionCityState;
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  return (oc?.discovered ?? false) && state.mandateDay >= 20 && mn.lastNegotiationAt === 0;
}

export function isChAuroraOffer(state: StrategyGameState): boolean {
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  return (
    (state.orionCityState?.discovered ?? false) &&
    mn.auroraTrust >= 35 &&
    mn.activePact === "none" &&
    mn.obscuriumDebt < 40
  );
}

export function isChObscuriumOffer(state: StrategyGameState): boolean {
  const mn  = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  const hp  = state.hiddenPolitics;
  return (
    (state.orionCityState?.discovered ?? false) &&
    mn.activePact === "none" &&
    (mn.obscuriumDebt >= 10 || hp.scandalRisk > 45)
  );
}

export function isChAuroraPactKept(state: StrategyGameState): boolean {
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  return (
    mn.activePact === "aurora" &&
    !mn.auroraConditionBroken &&
    mn.pactExpiresAtAction > 0 &&
    state.news.actionCount >= mn.pactExpiresAtAction - 3
  );
}

export function isChAuroraPactBroken(state: StrategyGameState): boolean {
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  return mn.activePact === "aurora" && mn.auroraConditionBroken;
}

export function isChObscuriumDebtRises(state: StrategyGameState): boolean {
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  return mn.obscuriumDebt >= 50;
}

export function isChOrionJudges(state: StrategyGameState): boolean {
  const oc = state.orionCityState;
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  return (
    (oc?.orionStanding ?? 0) >= 30 &&
    state.mandateDay >= 60 &&
    mn.lastNegotiationAt > 0
  );
}

export function isChHumanitySovereign(state: StrategyGameState): boolean {
  const mn = state.moralNegotiationState ?? DEFAULT_MORAL_NEGOTIATION_STATE;
  return mn.moralBalance >= 20 && state.mandateDay >= 35 && mn.activePact === "none";
}
