/**
 * crisisWaveEngine.ts — Ondes de propagation des crises.
 *
 * Une crise forte ne s'arrête pas à son point d'origine.
 * Elle émet une onde qui se propage progressivement aux domaines
 * adjacents, en perdant de l'intensité à chaque propagation.
 *
 * Mécanique :
 *  - Une onde naît d'une crise forte/critique.
 *  - Elle se propage tous les `speed` actions joueur.
 *  - À chaque propagation, elle applique un effet discret aux domaines
 *    affectés, puis son intensité diminue de `damping`.
 *  - Les infrastructures solides amortissent l'onde (damping bonus).
 *  - Les systèmes fragiles amplifient l'effet reçu.
 *  - Le joueur peut lancer une action d'amortissement.
 *  - Pas plus de 3 ondes actives simultanément.
 *  - Disparaît automatiquement sous 5 d'intensité ou à expiration.
 */

import type { StrategyGameState, NewsEvent, NewsChoice } from "@/types/strategy";

// ── Domaines d'onde ───────────────────────────────────────────────────────────

export type WaveDomain =
  | "energie"
  | "economie"
  | "securite"
  | "social"
  | "diplomatie"
  | "infrastructure"
  | "cyber"
  | "transport";

export const WAVE_DOMAIN_LABELS: Record<WaveDomain, string> = {
  energie:        "Énergie",
  economie:       "Économie",
  securite:       "Sécurité",
  social:         "Social",
  diplomatie:     "Diplomatie",
  infrastructure: "Infrastructure",
  cyber:          "Cyber",
  transport:      "Transport",
};

export const WAVE_DOMAIN_ICONS: Record<WaveDomain, string> = {
  energie:        "lightning-bolt",
  economie:       "chart-line-variant",
  securite:       "shield-alert-outline",
  social:         "account-group-outline",
  diplomatie:     "earth",
  infrastructure: "office-building-cog-outline",
  cyber:          "bug-outline",
  transport:      "truck-outline",
};

// ── Structure d'une onde ──────────────────────────────────────────────────────

export interface CrisisWave {
  id:              string;
  sourceEventId:   string;
  domain:          WaveDomain;        // domaine source de l'onde
  intensity:       number;            // 0-100 — force actuelle
  speed:           number;            // actions entre deux propagations
  damping:         number;            // intensité perdue par propagation
  affectedSystems: WaveDomain[];      // domaines impactés à chaque propagation
  remainingActions: number;           // expiration auto à 0
  createdAtAction: number;
  tickCounter:     number;            // compte les actions depuis la dernière propagation
}

// ── Résumé pour affichage ─────────────────────────────────────────────────────

export interface WaveSummary {
  id:              string;
  domain:          WaveDomain;
  domainLabel:     string;
  intensity:       number;
  tier:            "fort" | "modere" | "faible";
  tierColor:       string;
  affectedLabels:  string[];
  remainingActions: number;
}

export function getActiveWaveSummary(waves: CrisisWave[]): WaveSummary[] {
  return waves
    .filter((w) => w.intensity >= 5 && w.remainingActions > 0)
    .map((w) => ({
      id:               w.id,
      domain:           w.domain,
      domainLabel:      WAVE_DOMAIN_LABELS[w.domain],
      intensity:        w.intensity,
      tier:             w.intensity >= 70 ? "fort" : w.intensity >= 35 ? "modere" : "faible",
      tierColor:        w.intensity >= 70 ? "#e54848" : w.intensity >= 35 ? "#e8864f" : "#e8c44f",
      affectedLabels:   w.affectedSystems.map((s) => WAVE_DOMAIN_LABELS[s]),
      remainingActions: w.remainingActions,
    }));
}

// ── Config des ondes par type d'événement ─────────────────────────────────────

interface WaveConfig {
  domain:          WaveDomain;
  baseIntensity:   number;  // intensité de base pour "forte" ; +20 pour "critique"
  speed:           number;
  damping:         number;
  affectedSystems: WaveDomain[];
  maxDuration:     number;  // en actions joueur
}

const WAVE_SOURCES: Partial<Record<string, WaveConfig>> = {
  cyber:          { domain: "cyber",         baseIntensity: 55, speed: 2, damping: 8,  affectedSystems: ["infrastructure", "economie", "transport"], maxDuration: 18 },
  economie:       { domain: "economie",      baseIntensity: 50, speed: 3, damping: 7,  affectedSystems: ["social", "diplomatie"],                    maxDuration: 20 },
  social:         { domain: "social",        baseIntensity: 45, speed: 2, damping: 9,  affectedSystems: ["securite", "economie"],                    maxDuration: 15 },
  guerre_hybride: { domain: "securite",      baseIntensity: 55, speed: 2, damping: 8,  affectedSystems: ["diplomatie", "social"],                    maxDuration: 18 },
  national:       { domain: "infrastructure",baseIntensity: 40, speed: 3, damping: 10, affectedSystems: ["economie", "social"],                      maxDuration: 15 },
  diplomatie:     { domain: "diplomatie",    baseIntensity: 35, speed: 4, damping: 8,  affectedSystems: ["economie", "securite"],                    maxDuration: 16 },
};

// ── Création d'une onde depuis un événement ───────────────────────────────────

let _waveSeq = 0;

export function createWaveFromEvent(
  state: StrategyGameState,
  event: NewsEvent,
): StrategyGameState {
  if (event.urgency !== "forte" && event.urgency !== "critique") return state;

  const config = WAVE_SOURCES[event.type];
  if (!config) return state;

  const activeWaves = state.crisisWaves ?? [];

  // Limite : 3 ondes actives max, pas de doublon de domaine
  if (activeWaves.length >= 3) return state;
  if (activeWaves.some((w) => w.domain === config.domain)) return state;

  const critBonus   = event.urgency === "critique" ? 20 : 0;
  const intensity   = Math.min(100, config.baseIntensity + critBonus);
  _waveSeq += 1;

  const wave: CrisisWave = {
    id:               `wave_${config.domain}_${_waveSeq}`,
    sourceEventId:    event.id,
    domain:           config.domain,
    intensity,
    speed:            config.speed,
    damping:          config.damping,
    affectedSystems:  config.affectedSystems,
    remainingActions: config.maxDuration,
    createdAtAction:  state.news.actionCount,
    tickCounter:      0,
  };

  return { ...state, crisisWaves: [...activeWaves, wave] };
}

// ── Amortissement depuis l'action joueur ──────────────────────────────────────

export function dampWavesByChoice(
  state: StrategyGameState,
  dampAmount: number,
): StrategyGameState {
  const waves = state.crisisWaves;
  if (!waves || waves.length === 0 || dampAmount <= 0) return state;

  return {
    ...state,
    crisisWaves: waves
      .map((w) => ({ ...w, intensity: Math.max(0, w.intensity - dampAmount) }))
      .filter((w) => w.intensity >= 5),
  };
}

// ── Effets des ondes sur l'état ───────────────────────────────────────────────

function getSystemHealth(domain: WaveDomain, state: StrategyGameState): number {
  const res = state.resources;
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  switch (domain) {
    case "energie":        return Math.min(100, Math.round(res.energy / 3));
    case "economie":       return ind.economy;
    case "securite":       return ind.security;
    case "social":         return ind.cohesion;
    case "diplomatie":     return Math.min(100, Math.round(res.influence / 3));
    case "infrastructure": return hp?.institutionalStability ?? 60;
    case "cyber":          return Math.min(100, Math.round(res.cyberDefense / 2));
    case "transport":      return ind.economy; // proxy
  }
}

function applySystemDelta(
  state: StrategyGameState,
  domain: WaveDomain,
  delta: number,
): StrategyGameState {
  if (delta === 0) return state;
  const d = Math.round(delta);
  const res = state.resources;
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;

  switch (domain) {
    case "energie":
      return { ...state, resources: { ...res, energy: Math.max(0, res.energy + d * 10) } };
    case "economie":
      return { ...state, nationalIndicators: { ...ind, economy: Math.min(100, Math.max(0, ind.economy + d)) } };
    case "securite":
      return { ...state, nationalIndicators: { ...ind, security: Math.min(100, Math.max(0, ind.security + d)) } };
    case "social":
      return { ...state, nationalIndicators: { ...ind, cohesion: Math.min(100, Math.max(0, ind.cohesion + d)) } };
    case "diplomatie":
      return { ...state, resources: { ...res, influence: Math.max(0, res.influence + d * 12) } };
    case "infrastructure":
      return { ...state, hiddenPolitics: { ...hp, institutionalStability: Math.min(100, Math.max(0, hp.institutionalStability + d)) } };
    case "cyber":
      return { ...state, resources: { ...res, cyberDefense: Math.max(0, res.cyberDefense + d * 4) } };
    case "transport":
      return { ...state, nationalIndicators: { ...ind, economy: Math.min(100, Math.max(0, ind.economy + d)) } };
  }
}

// ── Bonus d'amortissement de l'infrastructure ─────────────────────────────────

function getDampingBonus(state: StrategyGameState, domain: WaveDomain): number {
  const instab = state.hiddenPolitics?.institutionalStability ?? 60;
  let bonus = 0;

  if (instab >= 65)      bonus += 3;
  else if (instab < 40)  bonus -= 2;  // infra fragile : l'onde dure plus longtemps

  if (domain === "cyber" && state.resources.cyberDefense >= 100) bonus += 2;
  if (domain === "energie" && state.resources.energy >= 150)     bonus += 2;
  if (domain === "economie" && state.nationalIndicators.economy >= 65) bonus += 1;

  return bonus;
}

// ── Tick par action joueur ────────────────────────────────────────────────────

export function tickCrisisWaves(state: StrategyGameState): StrategyGameState {
  const waves = state.crisisWaves;
  if (!waves || waves.length === 0) return state;

  let s = state;
  const remaining: CrisisWave[] = [];

  for (const wave of waves) {
    if (wave.remainingActions <= 0 || wave.intensity < 5) continue;

    const newCounter = wave.tickCounter + 1;
    const propagates = newCounter >= wave.speed;

    if (propagates) {
      // Appliquer les effets aux systèmes affectés
      for (const sys of wave.affectedSystems) {
        const sysHealth = getSystemHealth(sys, s);
        const fragile   = sysHealth < 35;
        const tier      = wave.intensity >= 70 ? 2 : wave.intensity >= 35 ? 1 : 0;
        if (tier === 0) continue;

        const baseDelta = -tier;
        const delta     = fragile ? baseDelta - 1 : baseDelta; // système fragile : effet amplifié
        s = applySystemDelta(s, sys, delta);
      }

      // Réduire l'intensité avec l'amortissement + bonus infrastructure
      const dampBonus  = getDampingBonus(s, wave.domain);
      const newIntensity = Math.max(0, Math.round(wave.intensity - wave.damping - dampBonus));

      remaining.push({
        ...wave,
        intensity:        newIntensity,
        remainingActions: wave.remainingActions - 1,
        tickCounter:      0,
      });
    } else {
      remaining.push({
        ...wave,
        remainingActions: wave.remainingActions - 1,
        tickCounter:      newCounter,
      });
    }
  }

  return {
    ...s,
    crisisWaves: remaining.filter((w) => w.intensity >= 5 && w.remainingActions > 0),
  };
}
