/**
 * spaceNationsEngine.ts — Moteur des Nations de l'Espace.
 *
 * Calcule la crédibilité cosmique, les scores par faction et fait évoluer
 * l'état du Conseil interstellaire à chaque palier de 10 jours de mandat.
 *
 * Règles :
 * - Aucun bonus massif. Les effets sont narratifs et graduels.
 * - La crédibilité dérive lentement (±2 pts par palier).
 * - La découverte est conditionnée par les événements du Journal de Crise.
 * - Noctyra reste ambiguë : sa disposition n'est jamais clairement hostile.
 */

import type { StrategyGameState } from "@/types/strategy";
import type { SpaceNationId, NationDisposition } from "@/data/spaceNations";

// ── Types ──────────────────────────────────────────────────────────────────────

export type DiscoveryStage =
  | "hidden"
  | "signal"
  | "indirect_contact"
  | "council_divided"
  | "limited_assistance"
  | "surveillance"
  | "obscurium_infiltration";

export interface SpaceNationsState {
  cosmicCredibility:    number;        // 0-100 — jugement global du Conseil
  auroraSupport:        number;        // 0-100 — soutien actif d'Aurora Prime
  obscuriumCorruption:  number;        // 0-100 — emprise d'Obscurium sur le Conseil
  councilAttention:     number;        // 0-100 — intérêt du Conseil pour la Terre
  lastCouncilVoteAt:    number;        // mandateDay du dernier vote
  discovered:           boolean;
  discoveryStage:       DiscoveryStage;
}

export const DEFAULT_SPACE_NATIONS_STATE: SpaceNationsState = {
  cosmicCredibility:   20,
  auroraSupport:       15,
  obscuriumCorruption: 10,
  councilAttention:    0,
  lastCouncilVoteAt:   0,
  discovered:          false,
  discoveryStage:      "hidden",
};

// ── Dispositions par nation (dérivées du SpaceNationsState) ────────────────────

export type NationDispositions = Record<SpaceNationId, NationDisposition>;

export function computeNationDispositions(
  state: StrategyGameState,
  sn: SpaceNationsState,
): NationDispositions {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;
  const cred = sn.cosmicCredibility;

  // Aurora Prime — suit la crédibilité et la stabilité
  const auroraPrime: NationDisposition =
    cred >= 65 ? "favorable" :
    cred >= 45 ? "bienveillant" :
    cred >= 25 ? "neutre" :
    "sceptique";

  // Veyrion — juge la performance (technologie, économie, dette)
  const techScore = res.technology + (ind.economy - 50);
  const veyrion: NationDisposition =
    techScore >= 80  ? "favorable" :
    techScore >= 40  ? "neutre" :
    techScore >= 0   ? "sceptique" :
    "hostile";

  // Solméria — juge la diplomatie et les alliances
  const allyCount = state.relations.filter((r) => r.status === "allied").length;
  const solmeria: NationDisposition =
    allyCount >= 4   ? "favorable" :
    allyCount >= 2   ? "bienveillant" :
    allyCount >= 1   ? "neutre" :
    "sceptique";

  // Kharon-Nox — méfiance proportionnelle à la militarisation
  const milScore = res.military;
  const kharonNox: NationDisposition =
    milScore > 200   ? "hostile" :
    milScore > 140   ? "sceptique" :
    milScore > 60    ? "neutre" :
    "bienveillant";

  // Elyndra — juge la cohésion et l'intégrité morale
  const moralScore = ind.cohesion - hp.scandalRisk + (hp.institutionalStability - 50) * 0.5;
  const elyndra: NationDisposition =
    moralScore >= 50  ? "favorable" :
    moralScore >= 25  ? "bienveillant" :
    moralScore >= 0   ? "neutre" :
    moralScore >= -20 ? "sceptique" :
    "hostile";

  // Orionis — silencieux sauf si Obscurium est fort ou institutions effondrées
  const obscurius = sn.obscuriumCorruption;
  const orionis: NationDisposition =
    obscurius >= 70 || hp.institutionalStability < 25 ? "favorable" : // intervient
    "neutre";

  // Noctyra — officiellement neutre, jamais clairement hostile en surface
  // Elle est "favorable" quand le chaos est élevé (ce qui devrait être un mauvais signe)
  const chaos = hp.scandalRisk + hp.popularFatigue - ind.cohesion;
  const noctyra: NationDisposition =
    chaos >= 80  ? "bienveillant" :   // elle apprécie la situation
    chaos >= 40  ? "neutre" :         // elle attend son heure
    "sceptique";                       // elle cherche une fissure

  return {
    aurora_prime: auroraPrime,
    veyrion,
    solmeria,
    kharon_nox: kharonNox,
    elyndra,
    orionis,
    noctyra,
  };
}

// ── Calcul de la crédibilité cosmique cible ────────────────────────────────────

function computeTargetCredibility(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;

  let score = 50; // base neutre

  // Facteurs positifs
  if (ind.cohesion >= 60)              score += 8;
  if (ind.cohesion >= 75)              score += 5;
  if (hp.institutionalStability >= 65) score += 10;
  if (hp.institutionalStability >= 80) score += 5;
  if (hp.scandalRisk < 25)             score += 8;
  if (hp.scandalRisk < 15)             score += 5;
  if (res.cyberDefense >= 60)          score += 6;
  if (hp.eliteTrust >= 65)             score += 4;
  if (ind.ecology >= 55)               score += 3;

  // Facteurs négatifs
  if (hp.scandalRisk > 60)             score -= 12;
  if (hp.scandalRisk > 80)             score -= 10;
  if (hp.popularFatigue > 65)          score -= 8;
  if (hp.popularFatigue > 80)          score -= 5;
  if ((state.nationalDebt ?? 30) > 300) score -= 8;
  if ((state.nationalDebt ?? 30) > 400) score -= 8;
  if (state.governanceDoctrine === "autoritaire") score -= 12;
  if (ind.cohesion < 30)               score -= 10;
  if (hp.institutionalStability < 35)  score -= 10;
  if (res.cyberDefense < 20)           score -= 5;

  // Obscurium pèse directement sur la crédibilité
  const cosmic = state.cosmicInfluence;
  if (cosmic && cosmic.obscurium > 40) score -= Math.round((cosmic.obscurium - 40) * 0.3);

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Évolution du stage de découverte ─────────────────────────────────────────

function evolveStage(
  current: DiscoveryStage,
  sn: SpaceNationsState,
  hasSpaceEvent: boolean,
): DiscoveryStage {
  if (current === "hidden" && hasSpaceEvent) return "signal";

  if (current === "signal" && sn.councilAttention >= 25) return "indirect_contact";

  if (current === "indirect_contact") {
    if (sn.councilAttention >= 50 && sn.cosmicCredibility >= 40) return "council_divided";
    if (sn.obscuriumCorruption >= 60) return "obscurium_infiltration";
  }

  if (current === "council_divided") {
    if (sn.cosmicCredibility >= 60) return "limited_assistance";
    if (sn.obscuriumCorruption >= 65) return "obscurium_infiltration";
    if (sn.councilAttention >= 70 && sn.cosmicCredibility < 35) return "surveillance";
  }

  return current;
}

// ── Tick principal — appelé tous les 10 jours de mandat ─────────────────────

export function tickSpaceNations(state: StrategyGameState): StrategyGameState {
  const sn = state.spaceNationsState ?? DEFAULT_SPACE_NATIONS_STATE;

  const targetCred = computeTargetCredibility(state);

  // Dérive lente : ±2 par palier (changements graduels, pas immédiats)
  const credDrift = Math.sign(targetCred - sn.cosmicCredibility) * 2;
  const newCred   = Math.min(100, Math.max(0, sn.cosmicCredibility + credDrift));

  // Aurora suit la crédibilité avec un peu de retard
  const targetAurora = newCred > 50 ? Math.round(newCred * 0.75) : Math.round(newCred * 0.5);
  const auroraDrift   = Math.sign(targetAurora - sn.auroraSupport);
  const newAurora     = Math.min(100, Math.max(0, sn.auroraSupport + auroraDrift));

  // Obscurium pousse à l'inverse de la crédibilité
  const targetObsc   = Math.round(Math.max(0, 80 - newCred * 0.7));
  const obscuriumDrift = Math.sign(targetObsc - sn.obscuriumCorruption);
  const newObscurium   = Math.min(100, Math.max(0, sn.obscuriumCorruption + obscuriumDrift));

  // Attention du Conseil : croît quand la crédibilité est extrême (très bonne ou très mauvaise)
  let attentionDrift = 0;
  if (newCred >= 65 || newCred <= 20) attentionDrift = 1;
  else if (newCred <= 35)             attentionDrift = 0;
  else                                attentionDrift = -1;
  const newAttention = Math.min(100, Math.max(0, sn.councilAttention + attentionDrift));

  // Y a-t-il eu un événement spatial dans le Journal ?
  const hasSpaceEvent = state.news.log.some(
    (l) => l.eventId.startsWith("sn_") || l.eventId.startsWith("cosmic_"),
  );

  const newStage     = evolveStage(sn.discoveryStage, { ...sn, cosmicCredibility: newCred, councilAttention: newAttention, obscuriumCorruption: newObscurium }, hasSpaceEvent);
  const newDiscovered = sn.discovered || hasSpaceEvent || newStage !== "hidden";

  return {
    ...state,
    spaceNationsState: {
      cosmicCredibility:   newCred,
      auroraSupport:       newAurora,
      obscuriumCorruption: newObscurium,
      councilAttention:    newAttention,
      lastCouncilVoteAt:   sn.lastCouncilVoteAt,
      discovered:          newDiscovered,
      discoveryStage:      newStage,
    },
  };
}

// ── Helpers pour les conditions des événements news ───────────────────────────

export function isSnAuroraContact(state: StrategyGameState): boolean {
  const sn = state.spaceNationsState ?? DEFAULT_SPACE_NATIONS_STATE;
  return sn.cosmicCredibility >= 45 && sn.auroraSupport >= 35;
}

export function isSnCouncilEligible(state: StrategyGameState): boolean {
  const sn = state.spaceNationsState ?? DEFAULT_SPACE_NATIONS_STATE;
  return sn.councilAttention >= 30 && sn.cosmicCredibility >= 30;
}

export function isSnNoctyraActive(state: StrategyGameState): boolean {
  const sn = state.spaceNationsState ?? DEFAULT_SPACE_NATIONS_STATE;
  const hp = state.hiddenPolitics;
  return sn.obscuriumCorruption >= 45 || hp.scandalRisk > 55;
}

export function isSnSanctionRisk(state: StrategyGameState): boolean {
  const sn = state.spaceNationsState ?? DEFAULT_SPACE_NATIONS_STATE;
  return sn.cosmicCredibility < 25 && sn.councilAttention >= 35;
}

export function isSnTribunal(state: StrategyGameState): boolean {
  const sn = state.spaceNationsState ?? DEFAULT_SPACE_NATIONS_STATE;
  return state.mandateDay >= 80 && sn.councilAttention >= 25 && sn.discovered;
}
