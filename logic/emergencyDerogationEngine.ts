/**
 * emergencyDerogationEngine.ts — Registre des Dérogations d'Urgence (MODE DELTA).
 *
 * Chaque dérogation représente une décision exceptionnelle prise hors procédure normale :
 *   - achat d'urgence sans appel d'offres complet
 *   - mobilisation exceptionnelle hors cadre légal
 *   - suspension temporaire d'un organe de contrôle
 *   - réquisition fictive pour contourner une règle
 *   - classement sous secret défense exceptionnel
 *
 * Effets à la création :
 *   complianceState.legalRisk +, complianceState.auditPressure +8
 *
 * Actions du joueur :
 *   Justifier  — coût 15 Influence — legalRisk par dérog. -18, compliance améliore
 *   Auditer    — coût 20 M€ + 20 Inf — marked reviewed, legalRisk -28, scandalRisk -5
 *   Ignorer    — marque comme ignorée (sans coût, risque reste actif)
 *
 * Effets passifs (tick quotidien) :
 *   ≥ 4 non-auditées (×2j) : scandalRisk +2, oppositionPower +1
 *   ≥ 2 non-auditées (×4j) : scandalRisk +1
 *   Expirations sans audit  : scandalRisk + (4×count), institutionalStability - (2×count)
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DerogationType =
  | "emergency_procurement"    // achat sans appel d'offres complet
  | "exceptional_mobilization" // mobilisation hors cadre légal ordinaire
  | "control_suspension"       // suspension temporaire d'un organe de contrôle
  | "fictitious_requisition"   // réquisition formelle pour contourner une règle
  | "defense_secrecy";         // classement sous secret défense exceptionnel

export interface DerogationDef {
  type:            DerogationType;
  label:           string;
  icon:            string;
  color:           string;
  baseLegalRisk:   number;
  description:     string;
  defaultDuration: number; // en actions
}

export const DEROGATION_DEFS: Record<DerogationType, DerogationDef> = {
  emergency_procurement: {
    type: "emergency_procurement", label: "Achat d'urgence", icon: "cart-outline",
    color: "#e8c44f", baseLegalRisk: 35,
    description: "Marché passé sans appel d'offres complet — procédure d'urgence.",
    defaultDuration: 25,
  },
  exceptional_mobilization: {
    type: "exceptional_mobilization", label: "Mobilisation exceptionnelle", icon: "account-group-outline",
    color: "#e8864f", baseLegalRisk: 45,
    description: "Réquisition ou mobilisation hors cadre légal ordinaire.",
    defaultDuration: 20,
  },
  control_suspension: {
    type: "control_suspension", label: "Suspension de contrôle", icon: "eye-off-outline",
    color: "#e54848", baseLegalRisk: 60,
    description: "Organe de contrôle suspendu temporairement par décision d'exception.",
    defaultDuration: 15,
  },
  fictitious_requisition: {
    type: "fictitious_requisition", label: "Réquisition fictive", icon: "file-document-outline",
    color: "#e8864f", baseLegalRisk: 50,
    description: "Réquisition formelle sans base réelle pour contourner une règle.",
    defaultDuration: 20,
  },
  defense_secrecy: {
    type: "defense_secrecy", label: "Secret défense", icon: "lock-outline",
    color: "#94a3b8", baseLegalRisk: 30,
    description: "Classement sous secret défense d'informations normalement publiques.",
    defaultDuration: 30,
  },
};

export interface DerogationEntry {
  id:                  string;
  crisisId:            string;  // eventId déclencheur
  type:                DerogationType;
  reason:              string;  // pourquoi cette dérogation
  benefit:             string;  // avantage gameplay obtenu
  legalRisk:           number;  // 0-100
  expiresAfterActions: number;  // actionCount absolu d'expiration
  reviewed:            boolean;
  ignored:             boolean; // marquée explicitement ignorée
  createdAtAction:     number;
  createdAtDay:        number;
}

export interface DerogationCreationParams {
  crisisId:         string;
  type:             DerogationType;
  reason:           string;
  benefit:          string;
  legalRisk?:       number;
  durationActions?: number;
}

// ── Coûts des actions ─────────────────────────────────────────────────────────

export const DEROGATION_JUSTIFY_COST_INFLUENCE = 15;
export const DEROGATION_AUDIT_COST_MONEY       = 20;
export const DEROGATION_AUDIT_COST_INFLUENCE   = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function recomputeComplianceScore(cs: typeof DEFAULT_COMPLIANCE_STATE): number {
  return clamp(
    cs.procurementIntegrity    * 0.30 +
    (100 - cs.emergencyPowersAbuse) * 0.25 +
    (100 - cs.corruptionExposure)   * 0.25 +
    (100 - cs.legalRisk)            * 0.20,
  );
}

export function getActiveUnreviewed(state: StrategyGameState): DerogationEntry[] {
  const now = state.news.actionCount;
  return (state.derogations ?? []).filter(
    (d) => !d.reviewed && !d.ignored && d.expiresAfterActions > now,
  );
}

export function getActiveDerogations(state: StrategyGameState): DerogationEntry[] {
  const now = state.news.actionCount;
  return (state.derogations ?? []).filter((d) => d.expiresAfterActions > now);
}

export function getDerogationRiskLevel(unreviewedCount: number): "safe" | "watch" | "alert" | "critical" {
  if (unreviewedCount >= 4) return "critical";
  if (unreviewedCount >= 3) return "alert";
  if (unreviewedCount >= 1) return "watch";
  return "safe";
}

// ── Création ──────────────────────────────────────────────────────────────────

export function addDerogation(state: StrategyGameState, params: DerogationCreationParams): StrategyGameState {
  const def      = DEROGATION_DEFS[params.type];
  const legalRisk = params.legalRisk ?? def.baseLegalRisk;
  const duration  = params.durationActions ?? def.defaultDuration;

  const entry: DerogationEntry = {
    id:                  `derog_${state.news.actionCount}_${params.type}`,
    crisisId:            params.crisisId,
    type:                params.type,
    reason:              params.reason,
    benefit:             params.benefit,
    legalRisk,
    expiresAfterActions: state.news.actionCount + duration,
    reviewed:            false,
    ignored:             false,
    createdAtAction:     state.news.actionCount,
    createdAtDay:        state.mandateDay,
  };

  const cs = { ...(state.complianceState ?? DEFAULT_COMPLIANCE_STATE) };
  cs.legalRisk     = clamp(cs.legalRisk     + Math.round(legalRisk * 0.25));
  cs.auditPressure = clamp(cs.auditPressure + 8);
  cs.complianceScore = recomputeComplianceScore(cs);

  return {
    ...state,
    derogations:    [...(state.derogations ?? []), entry],
    complianceState: cs,
  };
}

// ── Actions du joueur ─────────────────────────────────────────────────────────

export function justifyDerogation(
  state: StrategyGameState,
  id: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  if (state.resources.influence < DEROGATION_JUSTIFY_COST_INFLUENCE) {
    return { newState: state, success: false, reason: `Influence insuffisante — ${DEROGATION_JUSTIFY_COST_INFLUENCE} requis.` };
  }

  const derogations = (state.derogations ?? []).map((d) =>
    d.id === id ? { ...d, legalRisk: Math.max(5, d.legalRisk - 18) } : d,
  );

  const cs = { ...(state.complianceState ?? DEFAULT_COMPLIANCE_STATE) };
  cs.legalRisk     = clamp(cs.legalRisk     - 8);
  cs.auditPressure = clamp(cs.auditPressure - 5);
  cs.complianceScore = recomputeComplianceScore(cs);

  return {
    newState: {
      ...state,
      derogations,
      complianceState: cs,
      resources: { ...state.resources, influence: state.resources.influence - DEROGATION_JUSTIFY_COST_INFLUENCE },
    },
    success: true,
  };
}

export function auditDerogation(
  state: StrategyGameState,
  id: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  if (state.resources.money < DEROGATION_AUDIT_COST_MONEY) {
    return { newState: state, success: false, reason: `Budget insuffisant — ${DEROGATION_AUDIT_COST_MONEY} M€ requis.` };
  }
  if (state.resources.influence < DEROGATION_AUDIT_COST_INFLUENCE) {
    return { newState: state, success: false, reason: `Influence insuffisante — ${DEROGATION_AUDIT_COST_INFLUENCE} requis.` };
  }

  const derogations = (state.derogations ?? []).map((d) =>
    d.id === id ? { ...d, reviewed: true, legalRisk: Math.max(0, d.legalRisk - 28) } : d,
  );

  const cs = { ...(state.complianceState ?? DEFAULT_COMPLIANCE_STATE) };
  cs.legalRisk     = clamp(cs.legalRisk     - 15);
  cs.auditPressure = clamp(cs.auditPressure - 10);
  cs.complianceScore = recomputeComplianceScore(cs);

  const hp = state.hiddenPolitics;
  const hiddenPolitics = { ...hp, scandalRisk: clamp((hp?.scandalRisk ?? 20) - 5) };

  return {
    newState: {
      ...state,
      derogations,
      complianceState: cs,
      hiddenPolitics,
      resources: {
        ...state.resources,
        money:     state.resources.money     - DEROGATION_AUDIT_COST_MONEY,
        influence: state.resources.influence - DEROGATION_AUDIT_COST_INFLUENCE,
      },
    },
    success: true,
  };
}

export function ignoreDerogation(state: StrategyGameState, id: string): StrategyGameState {
  return {
    ...state,
    derogations: (state.derogations ?? []).map((d) =>
      d.id === id ? { ...d, ignored: true } : d,
    ),
  };
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickDerogations(state: StrategyGameState): StrategyGameState {
  const now = state.news.actionCount;
  const all = state.derogations ?? [];
  if (all.length === 0) return state;

  const active: DerogationEntry[] = [];
  let expiredUnreviewed = 0;

  for (const d of all) {
    if (now >= d.expiresAfterActions) {
      if (!d.reviewed && !d.ignored) expiredUnreviewed++;
    } else {
      active.push(d);
    }
  }

  let s: StrategyGameState = { ...state, derogations: active };

  if (expiredUnreviewed > 0) {
    const hp = s.hiddenPolitics;
    s = {
      ...s,
      hiddenPolitics: {
        ...hp,
        scandalRisk:            clamp((hp?.scandalRisk            ?? 20) + expiredUnreviewed * 4),
        institutionalStability: clamp((hp?.institutionalStability ?? 70) - expiredUnreviewed * 2),
      },
    };
  }

  const unreviewedCount = active.filter((d) => !d.reviewed && !d.ignored).length;
  const day = s.mandateDay;

  if (unreviewedCount >= 4 && day % 2 === 0) {
    const hp = s.hiddenPolitics;
    s = {
      ...s,
      hiddenPolitics: { ...hp, scandalRisk: clamp((hp?.scandalRisk ?? 20) + 2) },
      oppositionPower: clamp((s.oppositionPower ?? 35) + 1),
    };
  } else if (unreviewedCount >= 2 && day % 4 === 0) {
    const hp = s.hiddenPolitics;
    s = { ...s, hiddenPolitics: { ...hp, scandalRisk: clamp((hp?.scandalRisk ?? 20) + 1) } };
  }

  return s;
}
