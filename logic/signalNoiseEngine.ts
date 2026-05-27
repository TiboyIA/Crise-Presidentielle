/**
 * signalNoiseEngine.ts — Qualité du signal de renseignement.
 *
 * Indicateur abstrait (0–100) : signalNoiseRatio.
 * Modélise la clarté de l'information disponible pour la prise de décision
 * sans système d'espionnage réel ni IA générative.
 *
 * Un ratio élevé = alertes précoces fiables, meilleures anticipations.
 * Un ratio faible = faux positifs, risques mal évalués, opacité stratégique.
 *
 * Bandes :
 *   80–100 : optimal       — signal clair, anticipation maximale
 *   60–79  : satisfaisant  — flux normal, quelques interférences
 *   40–59  : dégradé       — incohérences, alertes tardives
 *   20–39  : faible        — bruit élevé, faux positifs
 *    0–19  : critique      — opacité quasi-totale
 */

import type { StrategyGameState } from "@/types/strategy";

// ── Bandes de qualité ─────────────────────────────────────────────────────────

export type SignalBand = "optimal" | "satisfaisant" | "dégradé" | "faible" | "critique";

export interface SignalBandInfo {
  band:    SignalBand;
  label:   string;
  color:   string;
  message: string;
}

const BAND_DATA: Record<SignalBand, { label: string; color: string; message: string }> = {
  optimal: {
    label:   "Signal optimal",
    color:   "#4caf82",
    message: "Le renseignement fonctionne à plein régime. Les sources sont fiables, les signaux clairs. Votre capacité d'anticipation est à son maximum.",
  },
  satisfaisant: {
    label:   "Signal satisfaisant",
    color:   "#8bc34a",
    message: "Flux d'informations satisfaisant. Les alertes précoces sont opérationnelles. Quelques interférences ponctuelles à surveiller.",
  },
  dégradé: {
    label:   "Signal dégradé",
    color:   "#e8c44f",
    message: "Signal affaibli. Les données entrantes présentent des incohérences. Certaines alertes peuvent être tardives ou imprécises.",
  },
  faible: {
    label:   "Signal faible",
    color:   "#e8864f",
    message: "Bruit de fond élevé. Les faux positifs se multiplient. La fiabilité des rapports est compromise. Vigilance accrue recommandée.",
  },
  critique: {
    label:   "Signal critique",
    color:   "#e54848",
    message: "Signal quasi-nul. Les informations disponibles sont peu fiables. Les risques sont mal évalués. Situation d'opacité stratégique dangereuse.",
  },
};

export function getSignalBandInfo(ratio: number): SignalBandInfo {
  const band: SignalBand =
    ratio >= 80 ? "optimal"
    : ratio >= 60 ? "satisfaisant"
    : ratio >= 40 ? "dégradé"
    : ratio >= 20 ? "faible"
    : "critique";
  return { band, ...BAND_DATA[band] };
}

// ── Cible implicite ───────────────────────────────────────────────────────────

function computeSignalTarget(state: StrategyGameState): number {
  const res = state.resources;
  const hp  = state.hiddenPolitics;
  const ind = state.nationalIndicators;

  let target = 55; // base neutre

  // Renseignement élevé → signal plus clair
  if (res.intelligence > 150)      target += 15;
  else if (res.intelligence > 80)  target += 8;
  else if (res.intelligence < 30)  target -= 12;

  // Cyberdéfense → protection contre brouillage numérique
  if (res.cyberDefense > 150)      target += 10;
  else if (res.cyberDefense > 80)  target += 5;
  else if (res.cyberDefense < 25)  target -= 8;

  // Recherche technologique → algorithmes d'analyse améliorés
  if (res.technology > 120)     target += 12;
  else if (res.technology > 60) target += 6;
  else if (res.technology < 20) target -= 6;

  // Moral administratif → fiabilité des analystes
  const morale = state.administrationMorale ?? 60;
  if (morale > 80)      target += 8;
  else if (morale > 60) target += 3;
  else if (morale < 35) target -= 6;
  else if (morale < 20) target -= 12;

  // Stabilité institutionnelle → chaîne hiérarchique intacte
  const instab = hp?.institutionalStability ?? 60;
  if (instab > 75)  target += 5;
  else if (instab < 35) target -= 8;

  // Crise sociale → bruit ambiant, sources peu fiables
  const cohesion = ind.cohesion;
  if (cohesion < 30)      target -= 12;
  else if (cohesion < 45) target -= 6;

  // Saturation de crises → analystes débordés
  const pendingCount = state.news.pendingIds.length;
  if (pendingCount > 3)      target -= 8;
  else if (pendingCount > 1) target -= 4;

  // Contamination sémantique → brouillage des concepts
  const contamCount = (state.semanticContamination ?? []).length;
  if (contamCount > 3)      target -= 8;
  else if (contamCount > 0) target -= 4;

  // Risque de scandale → perte de confiance interne
  const scandalRisk = hp?.scandalRisk ?? 20;
  if (scandalRisk > 65)      target -= 8;
  else if (scandalRisk > 45) target -= 4;

  // Obscurium — emprise sur les canaux informationnels
  const obscurium = state.cosmicState?.obscuriumInfluence ?? 0;
  if (obscurium > 60)      target -= 10;
  else if (obscurium > 40) target -= 5;

  // Tempête solaire → interférences radio-satellite
  const stormLevel = state.solarStorm?.level;
  if (stormLevel === "forte" || stormLevel === "extrême") target -= 8;
  else if (stormLevel === "modérée")                      target -= 4;
  else if (stormLevel === "faible")                       target -= 2;

  // Fenêtre orbitale → couverture et qualité des capteurs
  const orbital = state.orbitalWindow?.current;
  if (orbital === "favorable")        target += 8;
  else if (orbital === "courte")      target += 4;
  else if (orbital === "perturbée")   target -= 6;
  else if (orbital === "fermée")      target -= 3;
  else if (orbital === "tempête_solaire") target -= 10;

  return Math.min(100, Math.max(0, Math.round(target)));
}

// ── Tick journalier ───────────────────────────────────────────────────────────

const SIGNAL_DRIFT_PER_TICK = 4;
export const DEFAULT_SIGNAL_NOISE_RATIO = 55;

export function tickSignalNoise(state: StrategyGameState): StrategyGameState {
  const current = state.signalNoiseRatio ?? DEFAULT_SIGNAL_NOISE_RATIO;
  const target  = computeSignalTarget(state);

  const diff  = target - current;
  const delta = Math.sign(diff) * Math.min(SIGNAL_DRIFT_PER_TICK, Math.abs(diff));
  const next  = Math.min(100, Math.max(0, Math.round(current + delta)));

  let s = next === current ? state : { ...state, signalNoiseRatio: next };

  // Signal optimal → boost renseignement (meilleures alertes précoces)
  if (next >= 75) {
    s = { ...s, resources: { ...s.resources, intelligence: s.resources.intelligence + 5 } };
  }

  // Signal dégradé → perte de renseignement (analyse parasitée)
  if (next < 40) {
    const drain = next < 20 ? 6 : 3;
    s = { ...s, resources: { ...s.resources, intelligence: Math.max(0, s.resources.intelligence - drain) } };
  }

  return s;
}
