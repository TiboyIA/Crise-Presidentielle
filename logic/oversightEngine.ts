/**
 * oversightEngine.ts — Autorités Indépendantes Fictives (MODE DELTA)
 *
 * 6 autorités de contrôle fictives peuvent enquêter sur le gouvernement.
 * Chacune surveille un domaine spécifique et ouvre une investigation en
 * réponse à des indicateurs critiques.
 *
 * Déclencheurs :
 *   haip  : corruption ≥ 60 ou whistleblowerRisk ≥ 65 (jour ≥ 20)
 *   cms   : conflictOfInterestRisk ≥ 60 ET procurementIntegrity < 45 (jour ≥ 15)
 *   apdc  : cyberDefense < 35 (jour ≥ 20)
 *   clp   : ≥ 2 dérogations actives ET emergencyPowersAbuse ≥ 50 (jour ≥ 15)
 *   ccn   : dette > 300 ET budget < -60 (jour ≥ 20)
 *   ccpu  : ≥ 3 dérogations ET legalRisk ≥ 60 (jour ≥ 20)
 *
 * Actions joueur (boutons panneau) :
 *   Coopérer  (-15 INF) : pression -20, confiance +8, stability +5, scandalRisk -5
 *   Justifier (-10 INF) : pression -12, confiance +4, legalRisk -5
 *   Contester (-20 INF) : risqué — pression -10 si confiance > 45, sinon boomerang
 *
 * Blanchiment automatique : si les indicateurs sont assainis après 10 actions
 *   → investigation résolue, confiance +10, eliteTrust +4, stability +3
 *
 * Effets passifs :
 *   ≥ 2 investigations actives (×3j) : scandalRisk +2, mediaMood -1, opp +1
 *   0 investigation & trust ≥ 60 partout (×8j) : eliteTrust +1, stability +1
 *   investigation expirée non résolue : scandalRisk +5, mediaMood -3
 */

import type { StrategyGameState } from "@/types/strategy";
import { AUTHORITY_IDS, type OversightAuthorityId } from "@/data/oversightAuthorities";

export interface OversightInvestigation {
  id: string;
  authorityId: OversightAuthorityId;
  trigger: string;
  pressure: number;          // 0-100 — pression politique si ignorée
  startedAtAction: number;
  expiresAfterActions: number;
  resolved: boolean;         // true si clôturée (action joueur ou blanchiment)
  cleared: boolean;          // true si blanchiment (conditions assainies)
}

export interface OversightState {
  authorityTrust: Record<OversightAuthorityId, number>; // 0-100, initial 60
  investigations: OversightInvestigation[];
  totalInvestigations: number;
  lastClearedAt: number; // actionCount du dernier blanchiment (0 = jamais)
}

export const COOPERATE_COST_INFLUENCE = 15;
export const JUSTIFY_COST_INFLUENCE   = 10;
export const CONTEST_COST_INFLUENCE   = 20;

const AUTHORITY_PRESSURE: Record<OversightAuthorityId, number> = {
  haip:  70,
  cms:   55,
  apdc:  45,
  clp:   60,
  ccn:   65,
  ccpu:  75,
};

const AUTHORITY_DURATION: Record<OversightAuthorityId, number> = {
  haip:  28,
  cms:   25,
  apdc:  22,
  clp:   26,
  ccn:   30,
  ccpu:  24,
};

const TRIGGER_ODDS: Record<OversightAuthorityId, number> = {
  haip:  0.06,
  cms:   0.05,
  apdc:  0.05,
  clp:   0.07,
  ccn:   0.06,
  ccpu:  0.08,
};

const AUTHORITY_TRIGGER: Record<OversightAuthorityId, string> = {
  haip:  "Risques d'intégrité publique — corruption ou lanceur d'alerte détectés.",
  cms:   "Irrégularités dans les marchés publics — conflits d'intérêts non résolus.",
  apdc:  "Cyberdéfense civile défaillante — données des citoyens potentiellement exposées.",
  clp:   "Multiplication des dérogations — atteinte présumée aux libertés fondamentales.",
  ccn:   "Déséquilibre budgétaire grave — dette nationale et déficit hors de contrôle.",
  ccpu:  "Prolifération des pouvoirs d'urgence — contrôle constitutionnel requis.",
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function initOversightState(): OversightState {
  const authorityTrust = {} as Record<OversightAuthorityId, number>;
  for (const id of AUTHORITY_IDS) authorityTrust[id] = 60;
  return { authorityTrust, investigations: [], totalInvestigations: 0, lastClearedAt: 0 };
}

function getOrInit(state: StrategyGameState): OversightState {
  return state.oversightState ?? initOversightState();
}

export function getActiveInvestigations(state: StrategyGameState): OversightInvestigation[] {
  const os  = getOrInit(state);
  const now = state.news.actionCount;
  return os.investigations.filter((i) => !i.resolved && i.expiresAfterActions > now);
}

function hasActiveFor(state: StrategyGameState, id: OversightAuthorityId): boolean {
  return getActiveInvestigations(state).some((i) => i.authorityId === id);
}

function shouldTrigger(state: StrategyGameState, id: OversightAuthorityId): boolean {
  if (hasActiveFor(state, id)) return false;
  const cs  = state.complianceState;
  const ps  = state.procurementState;
  const now = state.news.actionCount;
  const day = state.mandateDay;

  switch (id) {
    case "haip":
      return ((cs?.corruptionExposure ?? 10) >= 60 || (cs?.whistleblowerRisk ?? 15) >= 65) && day >= 20;
    case "cms":
      return (ps?.conflictOfInterestRisk ?? 15) >= 60 && (ps?.procurementIntegrity ?? 70) < 45 && day >= 15;
    case "apdc":
      return state.resources.cyberDefense < 35 && day >= 20;
    case "clp": {
      const activeDerog = (state.derogations ?? []).filter(
        (d) => !d.reviewed && !d.ignored && d.expiresAfterActions > now,
      ).length;
      return activeDerog >= 2 && (cs?.emergencyPowersAbuse ?? 10) >= 50 && day >= 15;
    }
    case "ccn":
      return (state.nationalDebt ?? 0) > 300 && (state.nationalIndicators?.publicBudget ?? 20) < -60 && day >= 20;
    case "ccpu": {
      const activeDerog = (state.derogations ?? []).filter(
        (d) => !d.reviewed && !d.ignored && d.expiresAfterActions > now,
      ).length;
      return activeDerog >= 3 && (cs?.legalRisk ?? 20) >= 60 && day >= 20;
    }
  }
}

function canBeCleared(state: StrategyGameState, id: OversightAuthorityId): boolean {
  const cs  = state.complianceState;
  const ps  = state.procurementState;
  const now = state.news.actionCount;
  switch (id) {
    case "haip":  return (cs?.corruptionExposure ?? 10) < 25 && (cs?.whistleblowerRisk ?? 15) < 25;
    case "cms":   return (ps?.procurementIntegrity ?? 70) >= 70 && (ps?.conflictOfInterestRisk ?? 15) < 25;
    case "apdc":  return state.resources.cyberDefense >= 55;
    case "clp": {
      const activeDerog = (state.derogations ?? []).filter(
        (d) => !d.reviewed && !d.ignored && d.expiresAfterActions > now,
      ).length;
      return activeDerog === 0 && (cs?.emergencyPowersAbuse ?? 10) < 20;
    }
    case "ccn":   return (state.nationalDebt ?? 0) < 200 || (state.nationalIndicators?.publicBudget ?? 20) > -20;
    case "ccpu": {
      const activeDerog = (state.derogations ?? []).filter(
        (d) => !d.reviewed && !d.ignored && d.expiresAfterActions > now,
      ).length;
      return activeDerog === 0 && (cs?.legalRisk ?? 20) < 25;
    }
  }
}

// ── Actions joueur ────────────────────────────────────────────────────────────

export function cooperateWithInvestigation(
  state: StrategyGameState,
  investigationId: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const os  = getOrInit(state);
  const inv = os.investigations.find((i) => i.id === investigationId && !i.resolved);
  if (!inv) return { newState: state, success: false, reason: "Investigation introuvable." };
  if (state.resources.influence < COOPERATE_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const cs       = state.complianceState;
  const prevTrust = os.authorityTrust[inv.authorityId] ?? 60;
  const newTrust  = { ...os.authorityTrust, [inv.authorityId]: clamp(prevTrust + 8) };
  const newInv    = { ...inv, resolved: true, cleared: false };

  return {
    newState: {
      ...state,
      resources: { ...state.resources, influence: state.resources.influence - COOPERATE_COST_INFLUENCE },
      oversightState: {
        ...os,
        authorityTrust: newTrust,
        investigations: os.investigations.map((i) => (i.id === investigationId ? newInv : i)),
      },
      complianceState: cs ? { ...cs, complianceScore: clamp(cs.complianceScore + 5) } : cs,
      hiddenPolitics: {
        ...state.hiddenPolitics,
        institutionalStability: clamp(state.hiddenPolitics.institutionalStability + 5),
        scandalRisk:            clamp(state.hiddenPolitics.scandalRisk             - 5),
        eliteTrust:             clamp(state.hiddenPolitics.eliteTrust              + 3),
      },
    },
    success: true,
  };
}

export function justifyToAuthority(
  state: StrategyGameState,
  investigationId: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const os  = getOrInit(state);
  const inv = os.investigations.find((i) => i.id === investigationId && !i.resolved);
  if (!inv) return { newState: state, success: false, reason: "Investigation introuvable." };
  if (state.resources.influence < JUSTIFY_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const cs       = state.complianceState;
  const prevTrust = os.authorityTrust[inv.authorityId] ?? 60;
  const newTrust  = { ...os.authorityTrust, [inv.authorityId]: clamp(prevTrust + 4) };
  const newInv    = { ...inv, pressure: clamp(inv.pressure - 12) };

  return {
    newState: {
      ...state,
      resources: { ...state.resources, influence: state.resources.influence - JUSTIFY_COST_INFLUENCE },
      oversightState: {
        ...os,
        authorityTrust: newTrust,
        investigations: os.investigations.map((i) => (i.id === investigationId ? newInv : i)),
      },
      complianceState: cs ? {
        ...cs,
        legalRisk:       clamp(cs.legalRisk       - 5),
        complianceScore: clamp(cs.complianceScore  + 3),
      } : cs,
    },
    success: true,
  };
}

export function contestAuthority(
  state: StrategyGameState,
  investigationId: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const os  = getOrInit(state);
  const inv = os.investigations.find((i) => i.id === investigationId && !i.resolved);
  if (!inv) return { newState: state, success: false, reason: "Investigation introuvable." };
  if (state.resources.influence < CONTEST_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const prevTrust = os.authorityTrust[inv.authorityId] ?? 60;
  const isRisky   = prevTrust < 45;
  const newTrust  = { ...os.authorityTrust, [inv.authorityId]: clamp(prevTrust + (isRisky ? -8 : -3)) };
  const newInv    = { ...inv, pressure: clamp(inv.pressure + (isRisky ? 12 : -10)) };

  return {
    newState: {
      ...state,
      resources: { ...state.resources, influence: state.resources.influence - CONTEST_COST_INFLUENCE },
      oversightState: {
        ...os,
        authorityTrust: newTrust,
        investigations: os.investigations.map((i) => (i.id === investigationId ? newInv : i)),
      },
      hiddenPolitics: {
        ...state.hiddenPolitics,
        eliteTrust:  clamp(state.hiddenPolitics.eliteTrust  + (isRisky ? -5 : 1)),
        mediaMood:   clamp(state.hiddenPolitics.mediaMood   + (isRisky ? -8 : 2)),
        scandalRisk: clamp(state.hiddenPolitics.scandalRisk + (isRisky ? 8 : -3)),
      },
    },
    success: true,
  };
}

// ── Helpers d'affichage ───────────────────────────────────────────────────────

export function getAuthorityTrustLabel(trust: number): string {
  if (trust >= 70) return "BIENVEILLANT";
  if (trust >= 50) return "NEUTRE";
  if (trust >= 30) return "MÉFIANT";
  return "HOSTILE";
}

export function getAuthorityTrustColor(trust: number): string {
  if (trust >= 70) return "#4caf82";
  if (trust >= 50) return "#e8c44f";
  if (trust >= 30) return "#e8864f";
  return "#e54848";
}

export function getPressureLabel(pressure: number): string {
  if (pressure >= 75) return "CRITIQUE";
  if (pressure >= 50) return "ÉLEVÉE";
  if (pressure >= 25) return "MODÉRÉE";
  return "FAIBLE";
}

export function getPressureColor(pressure: number): string {
  if (pressure >= 75) return "#9b1010";
  if (pressure >= 50) return "#e54848";
  if (pressure >= 25) return "#e8864f";
  return "#e8c44f";
}

export function getOversightRiskLevel(
  activeCount: number,
  maxPressure: number,
): "safe" | "watch" | "alert" | "critical" {
  if (activeCount === 0) return "safe";
  if (maxPressure >= 65 || activeCount >= 3) return "critical";
  if (maxPressure >= 45 || activeCount >= 2) return "alert";
  return "watch";
}

// ── Tick ──────────────────────────────────────────────────────────────────────

export function tickOversight(state: StrategyGameState): StrategyGameState {
  let s  = state;
  let os = getOrInit(s);
  const now = s.news.actionCount;
  const day = s.mandateDay;

  // 1. Pénalité pour investigations expirées non résolues
  for (const inv of os.investigations) {
    if (!inv.resolved && inv.expiresAfterActions <= now) {
      s = {
        ...s,
        hiddenPolitics: {
          ...s.hiddenPolitics,
          scandalRisk: clamp(s.hiddenPolitics.scandalRisk + 5),
          mediaMood:   clamp(s.hiddenPolitics.mediaMood   - 3),
        },
      };
      os = {
        ...os,
        investigations: os.investigations.map((i) =>
          i.id === inv.id ? { ...i, resolved: true } : i,
        ),
      };
    }
  }
  // Élaguer les investigations résolues (garder les 10 dernières)
  const resolved = os.investigations.filter((i) => i.resolved).slice(-10);
  const alive    = os.investigations.filter((i) => !i.resolved);
  os = { ...os, investigations: [...alive, ...resolved] };
  s  = { ...s, oversightState: os };

  // 2. Blanchiment automatique : conditions assainies après 10 actions
  const active = getActiveInvestigations(s);
  for (const inv of active) {
    if (canBeCleared(s, inv.authorityId) && now - inv.startedAtAction >= 10) {
      const prevTrust = os.authorityTrust[inv.authorityId] ?? 60;
      os = {
        ...os,
        authorityTrust: { ...os.authorityTrust, [inv.authorityId]: clamp(prevTrust + 10) },
        investigations: os.investigations.map((i) =>
          i.id === inv.id ? { ...i, resolved: true, cleared: true } : i,
        ),
        lastClearedAt: now,
      };
      s = {
        ...s,
        oversightState: os,
        hiddenPolitics: {
          ...s.hiddenPolitics,
          eliteTrust:             clamp(s.hiddenPolitics.eliteTrust             + 4),
          institutionalStability: clamp(s.hiddenPolitics.institutionalStability + 3),
        },
      };
    }
  }

  // 3. Possibilité de créer une nouvelle investigation (max 1 par tick)
  for (const id of AUTHORITY_IDS) {
    if (shouldTrigger(s, id) && Math.random() < TRIGGER_ODDS[id]) {
      const newInv: OversightInvestigation = {
        id:                  `oversight_${id}_${now}`,
        authorityId:         id,
        trigger:             AUTHORITY_TRIGGER[id],
        pressure:            AUTHORITY_PRESSURE[id],
        startedAtAction:     now,
        expiresAfterActions: now + AUTHORITY_DURATION[id],
        resolved:            false,
        cleared:             false,
      };
      os = {
        ...os,
        investigations:      [...os.investigations, newInv],
        totalInvestigations: os.totalInvestigations + 1,
      };
      s = { ...s, oversightState: os };
      break;
    }
  }

  // 4. Effets passifs
  const finalActive = getActiveInvestigations(s);
  const activeCount = finalActive.length;

  if (activeCount >= 2 && day % 3 === 0) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: clamp(s.hiddenPolitics.scandalRisk + 2),
        mediaMood:   clamp(s.hiddenPolitics.mediaMood   - 1),
      },
      oppositionPower: clamp((s.oppositionPower ?? 35) + 1),
    };
  }

  if (activeCount === 0 && day % 8 === 0) {
    const latestOs = s.oversightState ?? os;
    const allTrustHigh = AUTHORITY_IDS.every((id) => (latestOs.authorityTrust[id] ?? 60) >= 60);
    if (allTrustHigh) {
      s = {
        ...s,
        hiddenPolitics: {
          ...s.hiddenPolitics,
          eliteTrust:             clamp(s.hiddenPolitics.eliteTrust             + 1),
          institutionalStability: clamp(s.hiddenPolitics.institutionalStability + 1),
        },
      };
    }
  }

  // 5. Dérive de la confiance vers 60 (point neutre) en l'absence d'investigation active
  const latestOs    = s.oversightState ?? os;
  const newTrustMap = { ...latestOs.authorityTrust };
  for (const id of AUTHORITY_IDS) {
    const hasInv = finalActive.some((i) => i.authorityId === id);
    if (!hasInv && day % 10 === 0) {
      const t = newTrustMap[id] ?? 60;
      if (t !== 60) newTrustMap[id] = clamp(t + (t < 60 ? 1 : -1));
    }
  }
  s = { ...s, oversightState: { ...latestOs, authorityTrust: newTrustMap } };

  return s;
}
