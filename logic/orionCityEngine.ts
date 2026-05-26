/**
 * orionCityEngine.ts — Moteur de la Cité d'Orion.
 *
 * Calcule l'orionStanding, gère le niveau d'accès et fait évoluer
 * les quartiers connus. Tick tous les 10 jours de mandat.
 *
 * Règles :
 * - orionStanding dérive lentement (±2 pts par palier).
 * - La Cité ne se révèle qu'après un signal dans le Journal de Crise.
 * - Obscurium ne doit jamais être présenté comme une aide gratuite.
 * - Aurora aide seulement si la Terre reste crédible et cohérente.
 */

import type { StrategyGameState } from "@/types/strategy";
import type { OrionDistrictId, OrionAccessLevel } from "@/data/orionCity";

// ── État ──────────────────────────────────────────────────────────────────────

export interface OrionCityState {
  discovered:          boolean;
  orionStanding:       number;          // 0-100 — réputation dans la Cité
  accessLevel:         OrionAccessLevel;
  auroraEmbassyTrust:  number;          // 0-100 — confiance du Phare d'Aurora
  obscuriumTrace:      number;          // 0-100 — empreinte d'Obscurium
  lastVisitAt:         number;          // mandateDay du dernier événement oc_
  knownDistricts:      OrionDistrictId[];
}

export const DEFAULT_ORION_CITY_STATE: OrionCityState = {
  discovered:          false,
  orionStanding:       0,
  accessLevel:         "inconnu",
  auroraEmbassyTrust:  10,
  obscuriumTrace:      0,
  lastVisitAt:         0,
  knownDistricts:      [],
};

// ── Score cible ────────────────────────────────────────────────────────────────

function computeTargetStanding(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;
  const sn  = state.spaceNationsState;

  let score = 0;

  // Facteurs positifs
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
  if (state.governanceDoctrine === "transparence" as string) score += 3;

  // Promesses tenues — signal de crédibilité fort
  const promiseStatus = state.campaignPromises?.status ?? {};
  const keptCount = Object.values(promiseStatus).filter((s) => s === "tenue").length;
  if (keptCount >= 2)                         score += 8;
  if (keptCount >= 3)                         score += 5;

  // Crédibilité cosmique — la Cité reçoit aussi les signaux du Conseil
  if (sn && sn.cosmicCredibility >= 50)       score += 8;
  if (sn && sn.cosmicCredibility >= 70)       score += 5;

  // Facteurs négatifs
  if (hp.scandalRisk > 60)                    score -= 12;
  if (hp.scandalRisk > 80)                    score -= 10;
  if (hp.popularFatigue > 70)                 score -= 8;
  if ((state.nationalDebt ?? 0) > 300)        score -= 10;
  if ((state.nationalDebt ?? 0) > 400)        score -= 8;
  if (state.governanceDoctrine === "autoritaire") score -= 15;
  if (ind.cohesion < 30)                      score -= 12;
  if (hp.institutionalStability < 30)         score -= 10;
  if (res.cyberDefense < 20)                  score -= 5;

  // Contradictions répétées — signal de mensonge public
  const contradictions = state.contradictionHistory ?? [];
  if (contradictions.length >= 5)             score -= 8;
  if (contradictions.length >= 10)            score -= 8;

  // Influence Obscurium sur le Conseil interstellaire
  if (sn && sn.obscuriumCorruption > 50) {
    score -= Math.round((sn.obscuriumCorruption - 50) * 0.4);
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Niveau d'accès ─────────────────────────────────────────────────────────────

function computeAccessLevel(
  standing: number,
  oc: OrionCityState,
  state: StrategyGameState,
): OrionAccessLevel {
  if (!oc.discovered) return "inconnu";

  // Banni si standing effondré après découverte
  if (oc.accessLevel === "banni" && standing < 20) return "banni";
  if (standing === 0 && oc.discovered) return "banni";

  // Sous surveillance active si le Tribunal peut être déclenché
  if (state.mandateDay >= 70 && standing < 35) return "surveillé";

  // Progression positive
  if (standing >= 65) return "invité";
  if (standing >= 35) return "toléré";
  return "observé";
}

// ── Tick principal — appelé tous les 10 jours de mandat ──────────────────────

export function tickOrionCity(state: StrategyGameState): StrategyGameState {
  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;

  const hasOrionEvent = state.news.log.some(
    (l) => l.eventId.startsWith("oc_"),
  );

  const newDiscovered = oc.discovered || hasOrionEvent;

  if (!newDiscovered) {
    return { ...state, orionCityState: { ...oc, discovered: false } };
  }

  const targetStanding = computeTargetStanding(state);
  const standingDrift  = Math.sign(targetStanding - oc.orionStanding) * 2;
  const newStanding    = Math.min(100, Math.max(0, oc.orionStanding + standingDrift));

  // Aurora Embassy Trust suit le standing avec retard
  const targetAurora = newStanding >= 50
    ? Math.round(newStanding * 0.8)
    : Math.round(newStanding * 0.5);
  const auroraDrift  = Math.sign(targetAurora - oc.auroraEmbassyTrust);
  const newAurora    = Math.min(100, Math.max(0, oc.auroraEmbassyTrust + auroraDrift));

  // Trace Obscurium — suit la corruption du Conseil
  const sn = state.spaceNationsState;
  const targetObsc     = sn ? Math.round(Math.max(0, sn.obscuriumCorruption * 0.6)) : 0;
  const obscuriumDrift = Math.sign(targetObsc - oc.obscuriumTrace);
  const newObscurium   = Math.min(100, Math.max(0, oc.obscuriumTrace + obscuriumDrift));

  const newAccessLevel = computeAccessLevel(newStanding, oc, state);

  // Quartiers connus — déverrouillage progressif par palier de standing
  const known = [...oc.knownDistricts];
  const addIfAbsent = (id: OrionDistrictId) => { if (!known.includes(id)) known.push(id); };

  if (hasOrionEvent)             addIfAbsent("porte_orion");
  if (newStanding >= 15)         addIfAbsent("marche_silences");
  if (newStanding >= 15 || newObscurium >= 20) addIfAbsent("couloir_noir");
  if (newStanding >= 35)         addIfAbsent("dome_ambassades");
  if (newStanding >= 35)         addIfAbsent("phare_aurora");
  if (newStanding >= 50)         addIfAbsent("archives_stellaires");
  if (newStanding >= 60 || state.mandateDay >= 70) addIfAbsent("tribunal_especes");

  return {
    ...state,
    orionCityState: {
      discovered:          newDiscovered,
      orionStanding:       newStanding,
      accessLevel:         newAccessLevel,
      auroraEmbassyTrust:  newAurora,
      obscuriumTrace:      newObscurium,
      lastVisitAt:         hasOrionEvent ? state.mandateDay : oc.lastVisitAt,
      knownDistricts:      known,
    },
  };
}

// ── Helpers pour les conditions des événements Journal de Crise ───────────────

export function isOcSignalVisible(state: StrategyGameState): boolean {
  // Premier signal : les Nations de l'Espace doivent avoir été détectées
  return (state.spaceNationsState?.discovered ?? false) && state.mandateDay >= 15;
}

export function isOcDomeEligible(state: StrategyGameState): boolean {
  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;
  return oc.discovered && oc.orionStanding >= 35 && oc.accessLevel !== "banni";
}

export function isOcSilenceMarket(state: StrategyGameState): boolean {
  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;
  return oc.discovered && oc.orionStanding >= 20;
}

export function isOcCouloir(state: StrategyGameState): boolean {
  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;
  const sn = state.spaceNationsState;
  return oc.discovered && (
    (sn?.obscuriumCorruption ?? 0) >= 40 || oc.obscuriumTrace >= 25
  );
}

export function isOcTribunalActive(state: StrategyGameState): boolean {
  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;
  return oc.discovered && state.mandateDay >= 70 && oc.orionStanding < 40;
}

export function isOcArchiveUnlocked(state: StrategyGameState): boolean {
  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;
  return oc.discovered && oc.orionStanding >= 50 && oc.auroraEmbassyTrust >= 40;
}

export function isOcPharoAid(state: StrategyGameState): boolean {
  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;
  return oc.discovered && oc.auroraEmbassyTrust >= 55 && oc.orionStanding >= 45;
}
