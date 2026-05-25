import { clamp } from "@/logic/utils";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import type { StrategyGameState } from "@/types/strategy";

// ── Tiers ─────────────────────────────────────────────────────────────────────

export type TalentDrainTier = "stable" | "inquietant" | "critique" | "hemorragie";

export interface TalentDrainTierInfo {
  tier:  TalentDrainTier;
  label: string;
  color: string;
}

export function getTalentDrainTier(score: number): TalentDrainTierInfo {
  if (score <= 25) return { tier: "stable",     label: "Stable",     color: "#3fbe7a" };
  if (score <= 50) return { tier: "inquietant", label: "Inquiétant", color: "#e8a93a" };
  if (score <= 75) return { tier: "critique",   label: "Critique",   color: "#f59a3a" };
  return                  { tier: "hemorragie", label: "Hémorragie", color: "#e54848" };
}

// ── Score ──────────────────────────────────────────────────────────────────────
//
// Recalcule le talentDrainScore tous les 10 jours.
// La valeur précédente sert de base ; la récupération naturelle (−3) est
// écrasée par les facteurs négatifs si ceux-ci sont présents.

export function computeTalentDrainDelta(state: StrategyGameState): number {
  const morale  = state.administrationMorale ?? 60;
  const hp      = state.hiddenPolitics;
  const ind     = state.nationalIndicators;
  const fatigue = state.ministerFatigue ?? {};
  const current = state.talentDrainScore ?? 15;

  let delta = -3; // récupération naturelle

  // Moral administratif — proxy principal des conditions de travail
  if      (morale <= 20) delta += 18;
  else if (morale <= 40) delta += 10;
  else if (morale <= 55) delta += 4;
  else if (morale >= 75) delta -= 2;

  // Budget public comprimé → gel d'embauche perçu
  if      (ind.publicBudget < -80) delta += 12;
  else if (ind.publicBudget < -40) delta += 6;

  // Scandales → stigmatisation de la fonction publique
  if      (hp.scandalRisk > 70) delta += 10;
  else if (hp.scandalRisk > 50) delta += 5;

  // Ministres "toxiques" : loyauté basse + fatigue haute → mauvais management
  let toxicCount = 0;
  for (const m of state.strategyMinisters) {
    if (m.loyalty < 35 && (fatigue[m.id] ?? 0) > 60) toxicCount++;
  }
  delta += Math.min(toxicCount * 6, 18); // plafonné à 3 ministres

  // Crises en file → surcharge perçue de l'appareil d'État
  let criticalCrises = 0;
  let highCrises     = 0;
  for (const id of state.news.pendingIds) {
    const ev = NEWS_EVENT_MAP[id];
    if (!ev) continue;
    if      (ev.urgency === "critique") criticalCrises++;
    else if (ev.urgency === "forte")    highCrises++;
  }
  delta += Math.min(criticalCrises * 5, 15);
  delta += Math.min(highCrises     * 2,  8);

  // Trop de réformes simultanées → sentiment de chaos institutionnel
  const activeReforms = state.reforms.filter((r) => !r.applied).length;
  if      (activeReforms >= 4) delta += 8;
  else if (activeReforms >= 2) delta += 3;

  // Fatigue ministérielle moyenne → culture de surmenage perçue
  if (state.strategyMinisters.length > 0) {
    const avgFatigue =
      state.strategyMinisters.reduce((sum, m) => sum + (fatigue[m.id] ?? 0), 0) /
      state.strategyMinisters.length;
    if      (avgFatigue > 70) delta += 10;
    else if (avgFatigue > 50) delta += 4;
  }

  return clamp(current + delta);
}

// ── Effets ────────────────────────────────────────────────────────────────────
//
// Appliqués après le recalcul du score (dans le même tick 10 jours).
// Intentionnellement légers : la fuite est un signal, pas un mur.

export function applyTalentDrainEffects(state: StrategyGameState): StrategyGameState {
  const score = state.talentDrainScore ?? 15;
  if (score <= 25) return state;

  let ind         = { ...state.nationalIndicators };
  let hp          = { ...state.hiddenPolitics };
  let res         = { ...state.resources };
  let adminMorale = state.administrationMorale ?? 60;

  // Spirale descendante sur le moral si déjà en tension
  if (score > 50) adminMorale = Math.max(0, adminMorale - 2);

  // Perte de capacité d'État
  if (score > 70) hp.institutionalStability = clamp(hp.institutionalStability - 1);

  // Coûts de remplacement et sous-traitance — drain argent proportionnel au score
  if (score > 60) res = { ...res, money: Math.max(0, res.money - Math.round(score * 0.3)) };

  // Productivité économique affectée au stade hémorragie
  if (score > 75) ind.economy = clamp(ind.economy - 1);

  return { ...state, nationalIndicators: ind, hiddenPolitics: hp, resources: res, administrationMorale: adminMorale };
}

// ── Tick principal ────────────────────────────────────────────────────────────

export function tickTalentDrain(state: StrategyGameState): StrategyGameState {
  const newScore  = computeTalentDrainDelta(state);
  const withScore = { ...state, talentDrainScore: newScore };
  return applyTalentDrainEffects(withScore);
}

// ── Leviers ───────────────────────────────────────────────────────────────────

export interface TalentLeverResult {
  success: boolean;
  reason?: string;
  newState?: StrategyGameState;
}

// Levier 1 — Plan de modernisation RH
// Investissement structurel : réduit fortement le score + relance le moral
export function applyPlanModernisationRH(state: StrategyGameState): TalentLeverResult {
  const COST_MONEY     = 200;
  const COST_INFLUENCE = 30;

  if (state.resources.money < COST_MONEY) {
    return { success: false, reason: `Fonds insuffisants — ${COST_MONEY}M€ requis.` };
  }
  if (state.resources.influence < COST_INFLUENCE) {
    return { success: false, reason: `Influence insuffisante — ${COST_INFLUENCE} requise.` };
  }

  return {
    success: true,
    newState: {
      ...state,
      resources: {
        ...state.resources,
        money:     state.resources.money     - COST_MONEY,
        influence: state.resources.influence - COST_INFLUENCE,
      },
      talentDrainScore:    clamp((state.talentDrainScore ?? 15) - 25),
      administrationMorale: Math.min(100, (state.administrationMorale ?? 60) + 8),
    },
  };
}

// Levier 2 — Reconnaissance publique des agents
// Signal symbolique fort, coût en influence
export function applyReconnaissancePublique(state: StrategyGameState): TalentLeverResult {
  const COST_INFLUENCE = 40;

  if (state.resources.influence < COST_INFLUENCE) {
    return { success: false, reason: `Influence insuffisante — ${COST_INFLUENCE} requise.` };
  }

  return {
    success: true,
    newState: {
      ...state,
      resources: {
        ...state.resources,
        influence: state.resources.influence - COST_INFLUENCE,
      },
      talentDrainScore:    clamp((state.talentDrainScore ?? 15) - 12),
      administrationMorale: Math.min(100, (state.administrationMorale ?? 60) + 6),
    },
  };
}

// Levier 3 — Stabilisation du cabinet
// Mesures internes sans coût direct ; l'effet dépend de l'état du moral
export function applyStabilisationCabinet(state: StrategyGameState): TalentLeverResult {
  const adminMorale = state.administrationMorale ?? 60;
  const reduction   = adminMorale >= 50 ? 15 : 8;

  return {
    success: true,
    newState: {
      ...state,
      talentDrainScore: clamp((state.talentDrainScore ?? 15) - reduction),
    },
  };
}
