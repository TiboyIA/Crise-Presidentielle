/**
 * businessCycleEngine.ts — Cycle économique national (MODE DELTA).
 *
 * 5 phases discrètes :
 *   expansion      — croissance saine, emploi ↑, investissement favorable
 *   surchauffe     — croissance excessive, inflation ↑, fatigue populaire
 *   ralentissement — freinage visible, investissement ↓, chômage remonte
 *   recession      — contraction, recettes ↓, tensions sociales
 *   reprise        — stabilisation, confiance qui revient, opportunités
 *
 * La phase est déterminée par un indicateur de momentum (0-100) calculé à
 * partir des conditions réelles : inflation, chômage, croissance, confiance,
 * commerce, stagflation, chocs actifs.
 *
 * Transitions — logique de chemin avec hysterèse :
 *   surchauffe     requiert momentum ≥ 68 ET inflation ≥ 50
 *   expansion      requiert momentum ≥ 58 (depuis reprise ou état normal)
 *   reprise        requiert momentum ≥ 28 depuis récession (phase intermédiaire obligatoire)
 *   ralentissement zone momentum 28-57 hors récession/reprise
 *   recession      momentum < 28 (ou rechute depuis reprise)
 *
 * Le joueur ne contrôle pas la phase directement. Il agit sur les conditions
 * sous-jacentes. Aucun effet invisible : chaque phase a des effets explicites.
 */

import type { StrategyGameState } from "@/types/strategy";

export type BusinessCyclePhase =
  | "expansion"
  | "surchauffe"
  | "ralentissement"
  | "recession"
  | "reprise";

export interface CyclePhaseMeta {
  label:       string;
  color:       string;
  description: string;
}

export const CYCLE_META: Record<BusinessCyclePhase, CyclePhaseMeta> = {
  expansion: {
    label:       "Expansion",
    color:       "#4caf82",
    description: "Croissance saine. L'emploi et l'investissement progressent. Les marges de manœuvre budgétaire s'améliorent.",
  },
  surchauffe: {
    label:       "Surchauffe",
    color:       "#e8c44f",
    description: "L'économie tourne au-delà de ses capacités optimales. L'inflation s'emballe. La correction est inévitable si rien n'est fait.",
  },
  ralentissement: {
    label:       "Ralentissement",
    color:       "#e8864f",
    description: "La dynamique économique faiblit. L'investissement recule, le chômage repart à la hausse. La confiance se fragilise.",
  },
  recession: {
    label:       "Récession",
    color:       "#e54848",
    description: "Contraction économique avérée. Les recettes fiscales baissent. Les tensions sociales et politiques s'intensifient.",
  },
  reprise: {
    label:       "Reprise",
    color:       "#4c9bbf",
    description: "L'économie se stabilise après la récession. La confiance revient progressivement. Les opportunités d'investissement réapparaissent.",
  },
};

export const DEFAULT_BUSINESS_CYCLE_PHASE: BusinessCyclePhase = "expansion";
export const DEFAULT_CYCLE_MOMENTUM = 60;

// ── Calcul du momentum ────────────────────────────────────────────────────────

function computeMomentumTarget(state: StrategyGameState): number {
  const economy       = state.nationalIndicators?.economy ?? 55;
  const unemployment  = state.unemployment ?? 25;
  const inflation     = state.inflation ?? 25;
  const investorConf  = state.investorConfidence ?? 55;
  const tradeBalance  = state.tradeBalance ?? -5;
  const fiscalConsent = state.fiscalConsent ?? 62;
  const stagflation   = state.stagflationIndex ?? 0;
  const shocks        = state.economicShocks ?? [];
  const programs      = state.fiscalPrograms ?? [];

  let score = 50;

  // Croissance économique — moteur principal du cycle
  if (economy >= 70)       score += 15;
  else if (economy >= 55)  score +=  6;
  else if (economy < 35)   score -= 15;
  else if (economy < 45)   score -=  8;

  // Emploi — reflet de la santé économique réelle
  if (unemployment <= 15)       score += 10;
  else if (unemployment <= 22)  score +=  5;
  else if (unemployment >= 45)  score -= 12;
  else if (unemployment >= 35)  score -=  6;

  // Inflation — stimulante à dose modérée, toxique à forte dose
  if (inflation >= 65)       score -= 12;
  else if (inflation >= 50)  score -=  6;
  else if (inflation <= 20)  score +=  5;
  else if (inflation <= 30)  score +=  3;

  // Confiance des marchés — signal avancé du cycle
  if (investorConf >= 70)       score += 10;
  else if (investorConf >= 55)  score +=  4;
  else if (investorConf <= 30)  score -= 10;
  else if (investorConf <= 45)  score -=  5;

  // Commerce extérieur — ouverture et dynamisme
  if (tradeBalance >= 20)        score +=  5;
  else if (tradeBalance <= -30)  score -=  8;
  else if (tradeBalance <= -15)  score -=  4;

  // Consentement fiscal — capacité d'investissement de l'État
  if (fiscalConsent >= 70)       score +=  6;
  else if (fiscalConsent <= 30)  score -=  6;

  // Piège stagflationniste — annihile le momentum
  if (stagflation >= 60)       score -= 15;
  else if (stagflation >= 40)  score -=  8;
  else if (stagflation >= 25)  score -=  4;

  // Chocs économiques externes — freins conjoncturels
  const activeShocks = shocks.filter((s) => s.intensity > 0 && s.remainingDays > 0).length;
  score -= Math.min(10, activeShocks * 5);

  // Programmes budgétaires actifs — soutien conjoncturel
  score += Math.min(9, programs.length * 3);

  return Math.max(0, Math.min(100, score));
}

// ── Machine à états — transitions avec hysterèse ─────────────────────────────

function determinePhase(
  current:   BusinessCyclePhase,
  momentum:  number,
  inflation: number,
): BusinessCyclePhase {
  // ① Surchauffe — dynamisme excessif combiné à une inflation élevée
  if (momentum >= 68 && inflation >= 50) return "surchauffe";

  // ② Expansion — momentum élevé (avec transition obligatoire depuis récession)
  if (momentum >= 58) {
    if (current === "recession") return "reprise";  // passage obligatoire par reprise
    return "expansion";
  }

  // ③ Reprise — sortie progressive de récession avec momentum remontant
  if ((current === "recession" || current === "reprise") && momentum >= 28) return "reprise";

  // ④ Ralentissement — zone intermédiaire de freinage
  if (momentum >= 28) return "ralentissement";

  // ⑤ Récession — momentum effondré (ou rechute depuis reprise)
  return "recession";
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickBusinessCycle(state: StrategyGameState): StrategyGameState {
  const currentMomentum = state.cycleMomentum ?? DEFAULT_CYCLE_MOMENTUM;
  const currentPhase    = state.businessCyclePhase ?? DEFAULT_BUSINESS_CYCLE_PHASE;
  const drift           = 6;

  // Drift du momentum vers la cible
  const targetMomentum = computeMomentumTarget(state);
  let nextMomentum = currentMomentum;
  if (currentMomentum < targetMomentum) nextMomentum = Math.min(targetMomentum, currentMomentum + drift);
  else if (currentMomentum > targetMomentum) nextMomentum = Math.max(targetMomentum, currentMomentum - drift);
  nextMomentum = Math.round(nextMomentum);

  // Transition de phase
  const inflation  = state.inflation ?? 25;
  const nextPhase  = determinePhase(currentPhase, nextMomentum, inflation);

  let s: StrategyGameState = {
    ...state,
    cycleMomentum:     nextMomentum,
    businessCyclePhase: nextPhase,
  };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;
  const ind = s.nationalIndicators;

  // ── Effets par phase ──────────────────────────────────────────────────────

  switch (nextPhase) {
    case "expansion":
      // Confiance soutenue — le cycle vertueux renforce les marchés
      if (day % 5 === 0) s = { ...s, investorConfidence: Math.min(100, (s.investorConfidence ?? 55) + 1) };
      // Cohésion renforcée — croissance bénéfique pour la société
      if (day % 6 === 0) s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.min(100, (ind?.cohesion ?? 60) + 1) } };
      break;

    case "surchauffe":
      // Pression inflationniste — économie au-delà de ses capacités
      if (day % 3 === 0) s = { ...s, inflation: Math.min(100, (s.inflation ?? 25) + 1) };
      // Coût de la vie — les ménages ressentent l'échauffement
      if (day % 4 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1) } };
      break;

    case "ralentissement":
      // Frilosité des marchés — premier signal de retournement
      if (day % 4 === 0) s = { ...s, investorConfidence: Math.max(0, (s.investorConfidence ?? 55) - 1) };
      // Début de hausse du chômage — les embauches ralentissent
      if (day % 5 === 0) s = { ...s, unemployment: Math.min(100, (s.unemployment ?? 25) + 1) };
      break;

    case "recession":
      // Marchés en repli — contraction avérée
      if (day % 3 === 0) s = { ...s, investorConfidence: Math.max(0, (s.investorConfidence ?? 55) - 1) };
      // Détresse sociale — chômage et incertitude pèsent sur les ménages
      if (day % 4 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1) } };
      // Opposition — capitalise sur la crise économique
      if (day % 4 === 0) s = { ...s, oppositionPower: Math.min(100, (s.oppositionPower ?? 35) + 1) };
      // Institutions fragilisées — légitimité sous pression
      if (day % 6 === 0) s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - 1) } };
      break;

    case "reprise":
      // Confiance qui revient — signal de sortie de récession
      if (day % 4 === 0) s = { ...s, investorConfidence: Math.min(100, (s.investorConfidence ?? 55) + 1) };
      // Espoir collectif — la société respire après la crise
      if (day % 7 === 0) s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.min(100, (s.nationalIndicators?.cohesion ?? 60) + 1) } };
      break;
  }

  return s;
}
