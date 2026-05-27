/**
 * cosmicEngine.ts — Moteur Cosmique V2 (centralisé).
 *
 * Remplace les trois moteurs séparés (spaceNationsEngine, orionCityEngine,
 * moralNegotiationEngine) par un seul tick unifié.
 *
 * Règles :
 * - Un seul passage par palier de 10 jours de mandat.
 * - Aurora ne donne jamais de bonus gratuit — conditions strictes.
 * - Obscurium est toujours disponible mais alimente la dette.
 * - La crédibilité cosmique dérive lentement (±2 pts par palier).
 * - Le jeu reste présidentiel — le cosmique est toujours secondaire.
 */

import type { StrategyGameState } from "@/types/strategy";
import type {
  CosmicState,
  CosmicDiscoveryStage,
  OrionAccessLevel,
  OrionDistrictId,
  CosmicPactType,
  CosmicStateEffects,
} from "@/types/cosmic";
import { DEFAULT_COSMIC_STATE } from "@/types/cosmic";

// ── Seuils du pacte Aurora ────────────────────────────────────────────────────

const AURORA_PACT_THRESHOLDS = {
  maxScandalRisk:            55,
  minInstitutionalStability: 40,
  maxObscuriumDebt:          30,
  pactDurationActions:       18,
} as const;

// ── Calcul de la crédibilité cosmique cible ───────────────────────────────────

function computeTargetCredibility(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;

  let score = 50;

  if (ind.cohesion >= 60)               score += 8;
  if (ind.cohesion >= 75)               score += 5;
  if (hp.institutionalStability >= 65)  score += 10;
  if (hp.institutionalStability >= 80)  score += 5;
  if (hp.scandalRisk < 25)              score += 8;
  if (hp.scandalRisk < 15)              score += 5;
  if (res.cyberDefense >= 60)           score += 6;
  if (hp.eliteTrust >= 65)              score += 4;
  if (ind.ecology >= 55)                score += 3;

  if (hp.scandalRisk > 60)              score -= 12;
  if (hp.scandalRisk > 80)             score -= 10;
  if (hp.popularFatigue > 65)          score -= 8;
  if (hp.popularFatigue > 80)          score -= 5;
  if ((state.nationalDebt ?? 30) > 300) score -= 8;
  if ((state.nationalDebt ?? 30) > 400) score -= 8;
  if (state.governanceDoctrine === "autoritaire") score -= 12;
  if (ind.cohesion < 30)               score -= 10;
  if (hp.institutionalStability < 35)  score -= 10;
  if (res.cyberDefense < 20)           score -= 5;

  const cs = state.cosmicState;
  if (cs && cs.obscuriumInfluence > 40) {
    score -= Math.round((cs.obscuriumInfluence - 40) * 0.3);
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Calcul du standing Orion cible ────────────────────────────────────────────

function computeTargetOrionStanding(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;
  const cs  = state.cosmicState;

  let score = 0;

  if (ind.cohesion >= 65)                     score += 10;
  if (ind.cohesion >= 80)                     score += 5;
  if (hp.institutionalStability >= 65)        score += 10;
  if (hp.institutionalStability >= 80)        score += 5;
  if (res.cyberDefense >= 60)                 score += 8;
  if (res.cyberDefense >= 80)                 score += 5;
  if (hp.scandalRisk < 20)                    score += 10;
  if (hp.scandalRisk < 10)                    score += 5;
  if (hp.eliteTrust >= 65)                    score += 6;
  if ((state.nationalDebt ?? 0) < 100)        score += 5;
  if (state.governanceDoctrine === "democratique") score += 5;

  const promiseStatus = state.campaignPromises?.status ?? {};
  const keptCount = Object.values(promiseStatus).filter((s) => s === "tenue").length;
  if (keptCount >= 2) score += 8;
  if (keptCount >= 3) score += 5;

  if (cs && cs.cosmicCredibility >= 50) score += 8;
  if (cs && cs.cosmicCredibility >= 70) score += 5;

  if (hp.scandalRisk > 60)               score -= 12;
  if (hp.scandalRisk > 80)              score -= 10;
  if (hp.popularFatigue > 70)           score -= 8;
  if ((state.nationalDebt ?? 0) > 300)  score -= 10;
  if ((state.nationalDebt ?? 0) > 400)  score -= 8;
  if (state.governanceDoctrine === "autoritaire") score -= 15;
  if (ind.cohesion < 30)               score -= 12;
  if (hp.institutionalStability < 30)  score -= 10;
  if (res.cyberDefense < 20)           score -= 5;

  const contradictions = state.contradictionHistory ?? [];
  if (contradictions.length >= 5)      score -= 8;
  if (contradictions.length >= 10)     score -= 8;

  if (cs && cs.obscuriumInfluence > 50) {
    score -= Math.round((cs.obscuriumInfluence - 50) * 0.4);
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Calcul du niveau d'accès Orion ───────────────────────────────────────────

function computeOrionAccessLevel(
  standing: number,
  cs: CosmicState,
  state: StrategyGameState,
): OrionAccessLevel {
  if (!cs.orionDiscovered) return "inconnu";
  if (cs.orionAccessLevel === "banni" && standing < 20) return "banni";
  if (standing === 0 && cs.orionDiscovered) return "banni";
  if (state.mandateDay >= 70 && standing < 35) return "surveillé";
  if (standing >= 65) return "invité";
  if (standing >= 35) return "toléré";
  return "observé";
}

// ── Calcul de la confiance Aurora cible ──────────────────────────────────────

function computeTargetAuroraTrust(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;
  const cs  = state.cosmicState;

  let score = 30;

  if (ind.cohesion >= 65)              score += 10;
  if (ind.cohesion >= 80)             score += 5;
  if (hp.institutionalStability >= 65) score += 10;
  if (hp.institutionalStability >= 80) score += 5;
  if (res.cyberDefense >= 60)         score += 8;
  if (hp.scandalRisk < 20)            score += 10;
  if (hp.scandalRisk < 10)            score += 5;
  if (hp.eliteTrust >= 65)            score += 6;

  const promiseStatus = state.campaignPromises?.status ?? {};
  const keptCount = Object.values(promiseStatus).filter((s) => s === "tenue").length;
  if (keptCount >= 2) score += 8;
  if (keptCount >= 3) score += 5;

  if (state.governanceDoctrine === "democratique") score += 5;

  if (hp.scandalRisk > 55)              score -= 12;
  if (hp.scandalRisk > 75)             score -= 10;
  if (hp.popularFatigue > 70)          score -= 6;
  if (state.governanceDoctrine === "autoritaire") score -= 15;
  if (ind.cohesion < 30)              score -= 10;
  if (hp.institutionalStability < 30) score -= 8;

  const contradictions = state.contradictionHistory ?? [];
  if (contradictions.length >= 4) score -= 8;
  if (contradictions.length >= 8) score -= 8;

  if (cs && cs.obscuriumDebt > 30) {
    score -= Math.round((cs.obscuriumDebt - 30) * 0.4);
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Stade de découverte suivant ───────────────────────────────────────────────

function nextDiscoveryStage(
  current: CosmicDiscoveryStage,
  cs: CosmicState,
  hasCosmicEvent: boolean,
): CosmicDiscoveryStage {
  if (current === "hidden" && hasCosmicEvent) return "signal";

  if (current === "signal" && cs.councilAttention >= 25) return "indirect_contact";

  if (current === "indirect_contact") {
    if (cs.orionDiscovered) return "orion_discovered";
    if (cs.councilAttention >= 50 && cs.cosmicCredibility >= 40) return "council_divided";
    if (cs.obscuriumInfluence >= 60) return "obscurium_risk";
  }

  if (current === "orion_discovered") {
    if (cs.lastNegotiationAt > 0) return "chambre_access";
    if (cs.councilAttention >= 50 && cs.cosmicCredibility >= 40) return "council_divided";
  }

  if (current === "council_divided") {
    if (cs.cosmicCredibility >= 60 && cs.auroraTrust >= 45) return "full_engagement";
    if (cs.cosmicCredibility < 25 && cs.councilAttention >= 50) return "surveillance";
    if (cs.obscuriumInfluence >= 65) return "obscurium_risk";
  }

  if (current === "chambre_access") {
    if (cs.cosmicCredibility >= 55 && cs.moralBalance >= 15) return "full_engagement";
    if (cs.councilAttention >= 50 && cs.cosmicCredibility >= 40) return "council_divided";
  }

  return current;
}

// ── Vérification de violation du pacte Aurora ─────────────────────────────────

function checkAuroraPactViolation(state: StrategyGameState, cs: CosmicState): boolean {
  if (cs.activePact !== "aurora") return false;
  const hp = state.hiddenPolitics;
  return (
    hp.scandalRisk > AURORA_PACT_THRESHOLDS.maxScandalRisk ||
    hp.institutionalStability < AURORA_PACT_THRESHOLDS.minInstitutionalStability ||
    cs.obscuriumDebt > AURORA_PACT_THRESHOLDS.maxObscuriumDebt
  );
}

// ── Déverrouillage progressif des quartiers ───────────────────────────────────

function computeKnownDistricts(
  cs: CosmicState,
  hasOrionEvent: boolean,
  newStanding: number,
  newObscurium: number,
  state: StrategyGameState,
): OrionDistrictId[] {
  const known = [...cs.knownDistricts];
  const add = (id: OrionDistrictId) => { if (!known.includes(id)) known.push(id); };

  if (hasOrionEvent)                               add("porte_orion");
  if (newStanding >= 15)                           add("marche_silences");
  if (newStanding >= 15 || newObscurium >= 20)     add("couloir_noir");
  if (newStanding >= 35)                           add("dome_ambassades");
  if (newStanding >= 35)                           add("phare_aurora");
  if (newStanding >= 50)                           add("archives_stellaires");
  if (newStanding >= 60 || state.mandateDay >= 70) add("tribunal_especes");
  if (cs.lastNegotiationAt > 0)                    add("chambre_seuil");

  return known;
}

// ── Tick principal ────────────────────────────────────────────────────────────

export function tickCosmic(state: StrategyGameState): StrategyGameState {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;

  const hasCosmicEvent = state.news.log.some(
    (l) =>
      l.eventId.startsWith("sn_") ||
      l.eventId.startsWith("oc_") ||
      l.eventId.startsWith("ch_") ||
      l.eventId.startsWith("cv_"),
  );

  const hasOrionEvent = state.news.log.some(
    (l) => l.eventId.startsWith("oc_") || l.eventId.startsWith("cv_orion"),
  );

  // ── Crédibilité cosmique ──────────────────────────────────────────────────
  const targetCred  = computeTargetCredibility(state);
  const credDrift   = Math.sign(targetCred - cs.cosmicCredibility) * 2;
  const newCred     = Math.min(100, Math.max(0, cs.cosmicCredibility + credDrift));

  // ── Attention du Conseil ──────────────────────────────────────────────────
  const councilTarget  = hasCosmicEvent ? Math.min(100, cs.councilAttention + 3) : Math.max(0, cs.councilAttention - 1);
  const newCouncil     = Math.min(100, Math.max(0, Math.round(councilTarget)));

  // ── Soutien Aurora ────────────────────────────────────────────────────────
  const auroraTarget   = newCred >= 50 ? Math.round(newCred * 0.8) : Math.round(newCred * 0.5);
  const auroraDrift    = Math.sign(auroraTarget - cs.auroraSupport);
  const newAuroraSupp  = Math.min(100, Math.max(0, cs.auroraSupport + auroraDrift));

  // ── Influence Obscurium ───────────────────────────────────────────────────
  const hp = state.hiddenPolitics;
  const obscInflTarget = hp.scandalRisk > 50 ? Math.min(100, cs.obscuriumInfluence + 2)
                       : Math.max(0, cs.obscuriumInfluence - 1);
  const newObscInfl    = Math.min(100, Math.max(0, Math.round(obscInflTarget)));

  // ── Standing Orion ────────────────────────────────────────────────────────
  const newOrionDiscovered = cs.orionDiscovered || hasOrionEvent;
  const targetStanding  = computeTargetOrionStanding(state);
  const standingDrift   = newOrionDiscovered ? Math.sign(targetStanding - cs.orionStanding) * 2 : 0;
  const newStanding     = Math.min(100, Math.max(0, cs.orionStanding + standingDrift));

  // ── Embassy Trust Aurora (physique) ──────────────────────────────────────
  const targetEmbassy  = newStanding >= 50 ? Math.round(newStanding * 0.8) : Math.round(newStanding * 0.5);
  const embassyDrift   = Math.sign(targetEmbassy - cs.auroraEmbassyTrust);
  const newEmbassy     = Math.min(100, Math.max(0, cs.auroraEmbassyTrust + embassyDrift));

  // ── Trace Obscurium (physique dans la Cité) ───────────────────────────────
  const targetObscTrace = Math.round(Math.max(0, newObscInfl * 0.6));
  const obscTraceDrift  = Math.sign(targetObscTrace - cs.obscuriumTrace);
  const newObscTrace    = Math.min(100, Math.max(0, cs.obscuriumTrace + obscTraceDrift));

  // ── Niveau d'accès Orion ──────────────────────────────────────────────────
  const newAccessLevel  = computeOrionAccessLevel(newStanding, { ...cs, orionDiscovered: newOrionDiscovered }, state);

  // ── Quartiers connus ──────────────────────────────────────────────────────
  const newDistricts    = computeKnownDistricts(cs, hasOrionEvent, newStanding, newObscTrace, state);

  // ── Confiance Aurora (morale) ─────────────────────────────────────────────
  const targetAurTrust  = computeTargetAuroraTrust(state);
  const aurTrustDrift   = Math.sign(targetAurTrust - cs.auroraTrust);
  const newAurTrust     = Math.min(100, Math.max(0, cs.auroraTrust + aurTrustDrift));

  // ── Dette Obscurium — réduit légèrement si aucune aide récente ────────────
  const recentObscEvent = state.news.log.some(
    (l) =>
      l.choiceId === "ch_obscurium_accept" ||
      l.choiceId === "oc_couloir_accept" ||
      l.choiceId === "oc_couloir_ecoute" ||
      l.choiceId === "sn_noctyra_accept" ||
      (l.choiceId ?? "").startsWith("cv_obscurium_shadow_accept") ||
      (l.choiceId ?? "").startsWith("cv_chambre_second_obscurium"),
  );
  const debtDrift       = recentObscEvent ? 0 : -1;
  const newDebt         = Math.min(100, Math.max(0, cs.obscuriumDebt + debtDrift));

  // ── Équilibre moral ────────────────────────────────────────────────────────
  const rawBalance      = newAurTrust - newDebt;
  const newBalance      = Math.min(100, Math.max(-100, rawBalance));

  // ── Violation du pacte Aurora ─────────────────────────────────────────────
  const pactViolated    = checkAuroraPactViolation(state, cs);
  const newBroken       = cs.auroraConditionBroken || pactViolated;

  // ── Expiration du pacte ───────────────────────────────────────────────────
  const pactExpired = cs.activePact !== "none" && cs.pactExpiresAtAction > 0 && state.news.actionCount >= cs.pactExpiresAtAction;
  const newPact          = pactExpired ? "none" : cs.activePact;
  const newPactExpires   = pactExpired ? 0 : cs.pactExpiresAtAction;
  const newBrokenCleared = pactExpired && !cs.auroraConditionBroken ? false : newBroken;

  // ── Stade de découverte ────────────────────────────────────────────────────
  const partialCs: CosmicState = {
    ...cs,
    cosmicCredibility:  newCred,
    councilAttention:   newCouncil,
    auroraSupport:      newAuroraSupp,
    obscuriumInfluence: newObscInfl,
    orionDiscovered:    newOrionDiscovered,
    orionStanding:      newStanding,
    obscuriumTrace:     newObscTrace,
    auroraTrust:        newAurTrust,
    obscuriumDebt:      newDebt,
    lastNegotiationAt:  cs.lastNegotiationAt,
  };
  const newStage = nextDiscoveryStage(cs.discoveryStage, partialCs, hasCosmicEvent);

  const newCosmicState: CosmicState = {
    discoveryStage:        newStage,
    firstDiscoveredAt:     hasCosmicEvent && cs.firstDiscoveredAt === 0 ? state.mandateDay : cs.firstDiscoveredAt,
    cosmicCredibility:     newCred,
    councilAttention:      newCouncil,
    auroraSupport:         newAuroraSupp,
    obscuriumInfluence:    newObscInfl,
    lastCouncilVoteAt:     cs.lastCouncilVoteAt,
    orionDiscovered:       newOrionDiscovered,
    orionStanding:         newStanding,
    orionAccessLevel:      newAccessLevel,
    auroraEmbassyTrust:    newEmbassy,
    obscuriumTrace:        newObscTrace,
    knownDistricts:        newDistricts,
    lastOrionEventAt:      hasOrionEvent ? state.mandateDay : cs.lastOrionEventAt,
    auroraTrust:           newAurTrust,
    obscuriumDebt:         newDebt,
    moralBalance:          newBalance,
    activePact:            newPact,
    pactExpiresAtAction:   newPactExpires,
    auroraConditionBroken: newBrokenCleared,
    lastNegotiationAt:     cs.lastNegotiationAt,
  };

  return { ...state, cosmicState: newCosmicState };
}

// ── Application directe d'effets cosmiques (via choix de crise) ─────────────

export function applyCosmicEffects(
  cs: CosmicState,
  fx: CosmicStateEffects,
  actionCount: number,
): CosmicState {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

  let updated = { ...cs };

  if (fx.cosmicCredibilityDelta)  updated.cosmicCredibility  = clamp(cs.cosmicCredibility  + fx.cosmicCredibilityDelta,  0, 100);
  if (fx.councilAttentionDelta)   updated.councilAttention   = clamp(cs.councilAttention   + fx.councilAttentionDelta,   0, 100);
  if (fx.auroraSupportDelta)      updated.auroraSupport      = clamp(cs.auroraSupport      + fx.auroraSupportDelta,      0, 100);
  if (fx.obscuriumInfluenceDelta) updated.obscuriumInfluence = clamp(cs.obscuriumInfluence + fx.obscuriumInfluenceDelta, 0, 100);
  if (fx.orionStandingDelta)      updated.orionStanding      = clamp(cs.orionStanding      + fx.orionStandingDelta,      0, 100);
  if (fx.auroraEmbassyTrustDelta) updated.auroraEmbassyTrust = clamp(cs.auroraEmbassyTrust + fx.auroraEmbassyTrustDelta, 0, 100);
  if (fx.obscuriumTraceDelta)     updated.obscuriumTrace     = clamp(cs.obscuriumTrace     + fx.obscuriumTraceDelta,     0, 100);
  if (fx.auroraTrustDelta)        updated.auroraTrust        = clamp(cs.auroraTrust        + fx.auroraTrustDelta,        0, 100);
  if (fx.obscuriumDebtDelta)      updated.obscuriumDebt      = clamp(cs.obscuriumDebt      + fx.obscuriumDebtDelta,      0, 100);
  if (fx.moralBalanceDelta)       updated.moralBalance       = clamp(cs.moralBalance       + fx.moralBalanceDelta,     -100, 100);

  if (fx.orionDiscovery) {
    updated.orionDiscovered = true;
    if (!updated.knownDistricts.includes("porte_orion")) {
      updated.knownDistricts = [...updated.knownDistricts, "porte_orion"];
    }
  }

  if (fx.endPact) {
    updated.activePact          = "none";
    updated.pactExpiresAtAction = 0;
    updated.auroraConditionBroken = false;
  } else if (fx.activatePact && fx.activatePact !== "none") {
    updated.activePact          = fx.activatePact as CosmicPactType;
    updated.pactExpiresAtAction = actionCount + (fx.pactDurationActions ?? AURORA_PACT_THRESHOLDS.pactDurationActions);
    updated.lastNegotiationAt   = actionCount;
  }

  if (fx.advanceStage) {
    updated.discoveryStage = nextDiscoveryStage(cs.discoveryStage, updated, true);
  }

  // Recalcul de l'équilibre moral après les deltas
  updated.moralBalance = clamp(updated.auroraTrust - updated.obscuriumDebt, -100, 100);

  return updated;
}

// ── Helpers pour les conditions des événements (newsEngine.ts) ───────────────

// Helpers V2 — utilisent cosmicState

export function isCvSignalReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState;
  return !cs || cs.discoveryStage === "hidden" && state.mandateDay >= 10;
}

export function isCvEarthObservedReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.cosmicCredibility >= 25 && cs.councilAttention >= 15 && state.mandateDay >= 20;
}

export function isCvAuroraDiplomaticChannelReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.auroraTrust >= 28 && cs.cosmicCredibility >= 38 && cs.discoveryStage !== "hidden";
}

export function isCvObscuriumShadowContactReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  const hp = state.hiddenPolitics;
  return cs.obscuriumInfluence >= 30 || hp.scandalRisk > 48;
}

export function isCvOrionCartographyReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.orionDiscovered && cs.orionStanding >= 18;
}

export function isCvCouncilEmergencySessionReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  const hp = state.hiddenPolitics;
  return cs.cosmicCredibility < 32 && cs.councilAttention >= 40 && state.mandateDay >= 45 && hp.institutionalStability < 55;
}

export function isCvAuroraEndorsementReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.auroraTrust >= 58 && cs.cosmicCredibility >= 52 && cs.activePact === "none" && state.mandateDay >= 55;
}

export function isCvObscuriumExposedReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.obscuriumDebt >= 38 && cs.cosmicCredibility >= 32;
}

export function isCvChambreSecondSessionReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.lastNegotiationAt > 0 && cs.moralBalance >= -5 && cs.moralBalance <= 5 && state.mandateDay >= 42;
}

export function isCvCouncilVoteEarthReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.cosmicCredibility >= 48 && cs.councilAttention >= 55 && state.mandateDay >= 68;
}

export function isCvOrionCrisisReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.orionDiscovered && cs.orionStanding >= 28 && cs.obscuriumTrace >= 28;
}

export function isCvMoralReckoningReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.lastNegotiationAt > 0 && (cs.moralBalance >= 35 || cs.moralBalance <= -35) && state.mandateDay >= 58;
}

export function isCvAuroraFinalTestReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.activePact === "aurora" && !cs.auroraConditionBroken && cs.cosmicCredibility >= 52 && state.mandateDay >= 65;
}

export function isCvObscuriumRevelationReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return cs.obscuriumDebt >= 65 || (cs.obscuriumInfluence >= 58 && state.mandateDay >= 78);
}

export function isCvCosmicLegacyReady(state: StrategyGameState): boolean {
  const cs = state.cosmicState ?? DEFAULT_COSMIC_STATE;
  return state.mandateDay >= 88 && (cs.cosmicCredibility >= 38 || cs.orionDiscovered);
}

// ── Labels narratifs ──────────────────────────────────────────────────────────

export function getCosmicCredibilityLabel(score: number): string {
  if (score >= 80) return "Crédibilité exemplaire";
  if (score >= 65) return "Crédibilité solide";
  if (score >= 45) return "Crédibilité partielle";
  if (score >= 30) return "Crédibilité contestée";
  if (score >= 15) return "Crédibilité fragilisée";
  return "Crédibilité nulle";
}

export function getMoralBalanceLabel(balance: number): string {
  if (balance >= 70)  return "Alignement Aurora";
  if (balance >= 40)  return "Confiance construite";
  if (balance >= 15)  return "Humanité souveraine";
  if (balance >= -15) return "Équilibre instable";
  if (balance >= -40) return "Influence Obscurium";
  if (balance >= -70) return "Dette obscure élevée";
  return "Dépendance critique";
}

export function getMoralBalanceColor(balance: number): string {
  if (balance >= 40)  return "#7ec8f7";
  if (balance >= 10)  return "#4caf82";
  if (balance >= -10) return "#e8c44f";
  if (balance >= -40) return "#e07840";
  return "#9b6fd4";
}

export function getAuroraTrustLabel(trust: number): string {
  if (trust >= 75) return "Aurora vous observe avec bienveillance";
  if (trust >= 50) return "Aurora maintient un canal ouvert";
  if (trust >= 30) return "Aurora vous surveille";
  if (trust >= 15) return "Aurora doute de vous";
  return "Aurora a détourné son regard";
}

export function getObscuriumDebtLabel(debt: number): string {
  if (debt <= 5)  return "Aucune dette connue";
  if (debt <= 20) return "Trace discrète";
  if (debt <= 40) return "Obscurium attend son dû";
  if (debt <= 65) return "Dette active — les conséquences approchent";
  return "Dépendance critique — l'addition sera lourde";
}
