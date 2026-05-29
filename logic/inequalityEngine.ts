/**
 * inequalityEngine.ts — Inégalités et fracture sociale (MODE DELTA).
 *
 * Deux indicateurs abstraits :
 *   inequalityIndex  (0-100) — 0 = égalité forte, 100 = fracture extrême
 *   socialMobility   (0-100) — 0 = ascenseur social bloqué, 100 = mobilité maximale
 *
 * inequalityIndex augmente si :
 *   inflation élevée, chômage élevé, qualité d'emploi faible, fiscalité perçue
 *   injuste, économie informelle élevée, corruption perçue, mobilité bloquée.
 * inequalityIndex baisse si :
 *   emploi de qualité, réformes sociale/éducation/fiscale, mobilité sociale haute,
 *   consentement fiscal fort, modernisation administrative.
 *
 * socialMobility augmente si :
 *   emploi de qualité, réformes sociale/éducation, économie forte, services
 *   publics efficaces, administration compétente, consentement fiscal fort.
 * socialMobility baisse si :
 *   chômage élevé (surtout des jeunes), inégalités structurelles, inflation,
 *   administration défaillante, faible consentement fiscal.
 *
 * Seuils inequalityIndex :
 *   0–25  : Cohésion sociale forte
 *   26–45 : Tensions modérées
 *   46–70 : Fracture sociale
 *   71–100: Crise des inégalités
 *
 * Effets quotidiens :
 *   inequalityIndex ≥ 65 tous les 3 j : cohésion -1
 *   inequalityIndex ≥ 75 tous les 3 j : popularFatigue +1
 *   inequalityIndex ≥ 80 tous les 2 j : oppositionPower +1
 *   inequalityIndex ≤ 20 tous les 5 j : cohésion +1
 *   socialMobility ≥ 70 tous les 4 j  : institutionalStability +1
 *   socialMobility ≤ 25 tous les 3 j  : oppositionPower +1
 */

import type { StrategyGameState } from "@/types/strategy";

export type InequalityBand = "cohesion" | "modere" | "fracture" | "crise";

export interface InequalityBandInfo {
  band:    InequalityBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_INEQUALITY_INDEX = 35;
export const DEFAULT_SOCIAL_MOBILITY  = 55;

const BANDS: { threshold: number; info: InequalityBandInfo }[] = [
  {
    threshold: 71,
    info: {
      band: "crise", label: "Crise des inégalités", color: "#e54848",
      message: "Les inégalités ont atteint un niveau déstabilisateur. Le sentiment d'injustice structurelle alimente la radicalisation, affaiblit la cohésion nationale et érode la légitimité des institutions.",
    },
  },
  {
    threshold: 46,
    info: {
      band: "fracture", label: "Fracture sociale", color: "#e8864f",
      message: "Une fracture sociale significative s'est installée. L'accès aux opportunités est inégal. La mobilité sociale est entravée. Les politiques publiques peinent à atteindre les populations les plus fragilisées.",
    },
  },
  {
    threshold: 26,
    info: {
      band: "modere", label: "Tensions modérées", color: "#e8c44f",
      message: "Les inégalités sont perceptibles mais restent dans des proportions gérables. Les mécanismes de redistribution amortissent les tensions. Une vigilance s'impose pour éviter leur aggravation.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "cohesion", label: "Cohésion sociale forte", color: "#4caf82",
      message: "La distribution des ressources et des opportunités est relativement équilibrée. Les mécanismes de redistribution fonctionnent. La cohésion nationale est préservée.",
    },
  },
];

export function getInequalityBandInfo(value: number): InequalityBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible — inequalityIndex ─────────────────────────────────────

export function computeInequalityTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];

  let target = 35;

  // Inflation — érode les revenus des ménages modestes en priorité
  const inflation = state.inflation ?? 25;
  if (inflation >= 75)       target += 10;
  else if (inflation >= 55)  target +=  6;
  else if (inflation >= 40)  target +=  3;
  else if (inflation <= 20)  target -=  3;

  // Chômage — précarité et écarts de revenus structurels
  const unemployment = state.unemployment ?? 25;
  if (unemployment >= 55)      target += 9;
  else if (unemployment >= 40) target += 5;
  else if (unemployment >= 28) target += 2;
  else if (unemployment <= 12) target -= 4;

  // Chômage des jeunes — ascenseur social bloqué dès l'entrée dans la vie active
  const youthUnemployment = state.youthUnemployment ?? 35;
  if (youthUnemployment >= 55)       target += 6;
  else if (youthUnemployment >= 40)  target += 3;

  // Qualité de l'emploi — emploi précaire creuse les inégalités salariales
  const jobQuality = state.jobQuality ?? 55;
  if (jobQuality >= 70)      target -= 8;
  else if (jobQuality >= 55) target -= 4;
  else if (jobQuality <= 30) target += 8;
  else if (jobQuality <= 45) target += 4;

  // Consentement fiscal — fiscalité perçue injuste amplifie la fracture
  const fiscalConsent = state.fiscalConsent ?? 62;
  if (fiscalConsent <= 25)      target += 8;
  else if (fiscalConsent <= 40) target += 4;
  else if (fiscalConsent >= 70) target -= 5;
  else if (fiscalConsent >= 55) target -= 2;

  // Économie informelle — fracture entre travailleurs formels et informels
  const shadowEconomy = state.shadowEconomy ?? 30;
  if (shadowEconomy >= 65)      target += 8;
  else if (shadowEconomy >= 45) target += 4;
  else if (shadowEconomy >= 30) target += 2;
  else if (shadowEconomy <= 15) target -= 3;

  // Dynamisme économique — croissance inclusive vs. concentrée
  const economy = ind?.economy ?? 55;
  if (economy >= 75)      target -= 4;
  else if (economy >= 60) target -= 2;
  else if (economy < 30)  target += 5;
  else if (economy < 45)  target += 2;

  // Fatigue populaire — crise sociale amplifie les perceptions d'injustice
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue >= 70)      target += 5;
  else if (fatigue >= 50) target += 2;
  else if (fatigue < 20)  target -= 2;

  // Risque de scandale — perception de corruption et d'impunité des élites
  const scandalRisk = hp?.scandalRisk ?? 20;
  if (scandalRisk >= 65)      target += 5;
  else if (scandalRisk >= 45) target += 2;

  // Mobilité sociale — la mobilité effective réduit les inégalités perçues
  const mobility = state.socialMobility ?? DEFAULT_SOCIAL_MOBILITY;
  if (mobility >= 70)      target -= 7;
  else if (mobility >= 55) target -= 3;
  else if (mobility <= 25) target += 7;
  else if (mobility <= 40) target += 3;

  // Réformes structurelles — redistribution et inclusion sociale
  if (reforms.find((r) => r.id === "sociale"   && r.applied)) target -= 10;
  if (reforms.find((r) => r.id === "education" && r.applied)) target -=  8;
  if (reforms.find((r) => r.id === "fiscal"    && r.applied)) target -=  5;

  // Recherches — administration moderne, ciblage des politiques sociales
  if (completed.includes("research_admin_ai"))     target -= 5;
  if (completed.includes("research_digital_twin")) target -= 3;

  return Math.max(0, Math.min(100, target));
}

// ── Calcul de la cible — socialMobility ──────────────────────────────────────

export function computeSocialMobilityTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];

  let target = 55;

  // Qualité de l'emploi — accès à des emplois porteurs de progression réelle
  const jobQuality = state.jobQuality ?? 55;
  if (jobQuality >= 70)      target += 12;
  else if (jobQuality >= 55) target +=  6;
  else if (jobQuality <= 30) target -= 12;
  else if (jobQuality <= 45) target -=  6;

  // Chômage — peu d'emplois formels = peu de portes d'entrée
  const unemployment = state.unemployment ?? 25;
  if (unemployment >= 50)      target -= 10;
  else if (unemployment >= 35) target -=  5;
  else if (unemployment >= 25) target -=  2;
  else if (unemployment <= 10) target +=  5;

  // Chômage des jeunes — bloque l'ascenseur social à la source
  const youthUnemployment = state.youthUnemployment ?? 35;
  if (youthUnemployment >= 55)       target -= 9;
  else if (youthUnemployment >= 40)  target -= 5;
  else if (youthUnemployment <= 20)  target += 4;

  // Inégalités — les inégalités structurelles créent des barrières durables
  const inequality = state.inequalityIndex ?? DEFAULT_INEQUALITY_INDEX;
  if (inequality >= 70)      target -= 12;
  else if (inequality >= 55) target -=  7;
  else if (inequality >= 40) target -=  3;
  else if (inequality <= 20) target +=  8;
  else if (inequality <= 30) target +=  4;

  // Inflation — érode l'épargne et les perspectives d'avancement
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)       target -=  7;
  else if (inflation >= 50)  target -=  3;
  else if (inflation <= 20)  target +=  2;

  // Dynamisme économique — la croissance crée des opportunités de progression
  const economy = ind?.economy ?? 55;
  if (economy >= 70)      target +=  7;
  else if (economy >= 55) target +=  3;
  else if (economy < 30)  target -=  7;
  else if (economy < 45)  target -=  3;

  // Consentement fiscal — finance les services publics vecteurs de mobilité
  const fiscalConsent = state.fiscalConsent ?? 62;
  if (fiscalConsent >= 70)      target +=  5;
  else if (fiscalConsent >= 55) target +=  2;
  else if (fiscalConsent <= 30) target -=  5;
  else if (fiscalConsent <= 45) target -=  2;

  // Moral de l'administration — services accessibles et efficaces
  const adminMorale = state.administrationMorale ?? 60;
  if (adminMorale >= 70)      target +=  5;
  else if (adminMorale >= 55) target +=  2;
  else if (adminMorale <= 30) target -=  6;
  else if (adminMorale <= 45) target -=  2;

  // Réformes structurelles — investissement dans l'ascenseur social
  if (reforms.find((r) => r.id === "sociale"   && r.applied)) target += 12;
  if (reforms.find((r) => r.id === "education" && r.applied)) target += 10;
  if (reforms.find((r) => r.id === "fiscal"    && r.applied)) target +=  4;

  // Recherches — services modernisés et ciblage des publics fragiles
  if (completed.includes("research_admin_ai"))     target += 6;
  if (completed.includes("research_digital_twin")) target += 4;

  return Math.max(0, Math.min(100, target));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickInequality(state: StrategyGameState): StrategyGameState {
  const currentInequality = state.inequalityIndex ?? DEFAULT_INEQUALITY_INDEX;
  const currentMobility   = state.socialMobility  ?? DEFAULT_SOCIAL_MOBILITY;
  const drift = 3;

  let nextInequality = currentInequality;
  const targetInequality = computeInequalityTarget(state);
  if (currentInequality < targetInequality) nextInequality = Math.min(targetInequality, currentInequality + drift);
  else if (currentInequality > targetInequality) nextInequality = Math.max(targetInequality, currentInequality - drift);

  let nextMobility = currentMobility;
  const targetMobility = computeSocialMobilityTarget(state);
  if (currentMobility < targetMobility) nextMobility = Math.min(targetMobility, currentMobility + drift);
  else if (currentMobility > targetMobility) nextMobility = Math.max(targetMobility, currentMobility - drift);

  let s: StrategyGameState = {
    ...state,
    inequalityIndex: Math.round(nextInequality),
    socialMobility:  Math.round(nextMobility),
  };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;
  const ind = s.nationalIndicators;

  // Fracture — cohésion nationale érodée par les inégalités structurelles (tous les 3 j)
  if (nextInequality >= 65 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.max(0, (ind?.cohesion ?? 60) - 1) } };
  }

  // Lassitude — injustice chronique pèse sur la fatigue populaire (tous les 3 j)
  if (nextInequality >= 75 && day % 3 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1) } };
  }

  // Instabilité politique — l'opposition capitalise sur la fracture (tous les 2 j)
  if (nextInequality >= 80 && day % 2 === 0) {
    s = { ...s, oppositionPower: Math.min(100, (s.oppositionPower ?? 35) + 1) };
  }

  // Cohésion renforcée — société inclusive et redistributive (tous les 5 j)
  if (nextInequality <= 20 && day % 5 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.min(100, (s.nationalIndicators?.cohesion ?? 60) + 1) } };
  }

  // Confiance institutionnelle — mobilité haute légitime les institutions (tous les 4 j)
  if (nextMobility >= 70 && day % 4 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: Math.min(100, (hp?.institutionalStability ?? 70) + 1) } };
  }

  // Ascenseur bloqué — mobilité faible alimente l'opposition (tous les 3 j)
  if (nextMobility <= 25 && day % 3 === 0) {
    s = { ...s, oppositionPower: Math.min(100, (s.oppositionPower ?? 35) + 1) };
  }

  return s;
}
