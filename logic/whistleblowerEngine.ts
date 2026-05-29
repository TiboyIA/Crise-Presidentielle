/**
 * whistleblowerEngine.ts — Lanceurs d'Alerte (MODE DELTA).
 *
 * Déclencheurs vérifiés au tick (un seul par tick) :
 *   corruption_exposure  : corruptionExposure ≥ 55  && jour ≥ 15
 *   legal_risk           : legalRisk          ≥ 60  && jour ≥ 18
 *   disloyal_minister    : loyalty d'un ministre < 25 && jour ≥ 10
 *   ignored_conflict     : conflictOfInterestRisk ≥ 65 && jour ≥ 15
 *   data_manipulation    : whistleblowerRisk   ≥ 70  && jour ≥ 20
 *   derogation_abuse     : dérogations non révisées ≥ 3 && jour ≥ 12
 *   audit_pressure       : auditPressure       ≥ 70  && jour ≥ 15
 *
 * Actions joueur (boutons de panneau) :
 *   protéger la source  → conformité +, scandalRisk court terme
 *   audit interne       → legalRisk -, institutionalStability +
 *   corriger discrètement → corruptionExposure -, whistleblowerRisk -
 *
 * Effets passifs :
 *   ≥ 2 alertes non résolues (×4j) : scandalRisk +2, mediaMood -1
 *   alerte âgée ≥ 10 actions (×5j) : scandalRisk +1
 *   0 alerte & whistleblowerRisk < 25 (×6j) : eliteTrust +1
 */

import type { StrategyGameState } from "@/types/strategy";

export type WhistleblowerTriggerType =
  | "corruption_exposure"
  | "legal_risk"
  | "disloyal_minister"
  | "ignored_conflict"
  | "data_manipulation"
  | "derogation_abuse"
  | "audit_pressure";

export interface WhistleblowerAlert {
  id:                  string;
  triggerType:         WhistleblowerTriggerType;
  severity:            "faible" | "modere" | "grave" | "critique";
  description:         string;
  politicalPressure:   number;  // 0-100 — pression politique si ignoré
  createdAtAction:     number;
  expiresAfterActions: number;
  resolved:            boolean;
  ignored:             boolean;
}

export const PROTECT_COST_INFLUENCE = 20;
export const AUDIT_COST_INFLUENCE   = 25;
export const CORRECT_COST_MONEY     = 20;

interface TriggerDef {
  description:       string;
  severity:          WhistleblowerAlert["severity"];
  politicalPressure: number;
  duration:          number;  // en actions
}

const TRIGGER_DEFS: Record<WhistleblowerTriggerType, TriggerDef> = {
  corruption_exposure: {
    description:       "Des données internes révèlent une exposition à la corruption dans les achats publics. Un fonctionnaire envisage de transmettre un dossier.",
    severity:          "grave",
    politicalPressure: 65,
    duration:          25,
  },
  legal_risk: {
    description:       "Un conseiller juridique signale des irrégularités potentielles dans des décisions récentes. La discrétion de l'administration est menacée.",
    severity:          "modere",
    politicalPressure: 50,
    duration:          22,
  },
  disloyal_minister: {
    description:       "Un membre du cabinet montre des signes de défection. Des documents sensibles pourraient fuiter vers la presse d'investigation.",
    severity:          "grave",
    politicalPressure: 70,
    duration:          20,
  },
  ignored_conflict: {
    description:       "Des conflits d'intérêts non déclarés dans les marchés publics ont été détectés par un auditeur interne. Il hésite à agir.",
    severity:          "modere",
    politicalPressure: 55,
    duration:          22,
  },
  data_manipulation: {
    description:       "Un agent du renseignement interne signale des manipulations statistiques dans les rapports officiels. Le risque de fuite est élevé.",
    severity:          "critique",
    politicalPressure: 80,
    duration:          18,
  },
  derogation_abuse: {
    description:       "Un conseiller d'État fictif recense trop de dérogations non justifiées. Il envisage de saisir une autorité indépendante.",
    severity:          "grave",
    politicalPressure: 75,
    duration:          22,
  },
  audit_pressure: {
    description:       "La pression d'audit interne est si élevée qu'un auditeur fictif indépendant menace de rendre public un rapport préliminaire.",
    severity:          "faible",
    politicalPressure: 45,
    duration:          28,
  },
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

const ALL_TRIGGERS: WhistleblowerTriggerType[] = [
  "data_manipulation",
  "derogation_abuse",
  "disloyal_minister",
  "corruption_exposure",
  "legal_risk",
  "ignored_conflict",
  "audit_pressure",
];

const TRIGGER_ODDS: Record<WhistleblowerTriggerType, number> = {
  data_manipulation:   0.08,
  derogation_abuse:    0.09,
  disloyal_minister:   0.07,
  corruption_exposure: 0.06,
  legal_risk:          0.05,
  ignored_conflict:    0.05,
  audit_pressure:      0.04,
};

function shouldTrigger(state: StrategyGameState, type: WhistleblowerTriggerType): boolean {
  const cs  = state.complianceState;
  const ps  = state.procurementState;
  const now = state.news.actionCount;
  const day = state.mandateDay;

  const hasActive = (state.whistleblowerAlerts ?? []).some(
    (a) => a.triggerType === type && !a.resolved && !a.ignored && a.expiresAfterActions > now,
  );
  if (hasActive) return false;

  switch (type) {
    case "corruption_exposure": return (cs?.corruptionExposure ?? 10) >= 55 && day >= 15;
    case "legal_risk":          return (cs?.legalRisk          ?? 20) >= 60 && day >= 18;
    case "disloyal_minister":   return state.strategyMinisters.some((m) => m.loyalty < 25) && day >= 10;
    case "ignored_conflict":    return (ps?.conflictOfInterestRisk ?? 15) >= 65 && day >= 15;
    case "data_manipulation":   return (cs?.whistleblowerRisk  ?? 15) >= 70 && day >= 20;
    case "derogation_abuse": {
      const count = (state.derogations ?? []).filter(
        (d) => !d.reviewed && !d.ignored && d.expiresAfterActions > now,
      ).length;
      return count >= 3 && day >= 12;
    }
    case "audit_pressure":      return (cs?.auditPressure ?? 15) >= 70 && day >= 15;
  }
}

function createAlert(state: StrategyGameState, type: WhistleblowerTriggerType): WhistleblowerAlert {
  const def = TRIGGER_DEFS[type];
  const now = state.news.actionCount;
  return {
    id:                  `wb_${type}_${now}`,
    triggerType:         type,
    severity:            def.severity,
    description:         def.description,
    politicalPressure:   def.politicalPressure,
    createdAtAction:     now,
    expiresAfterActions: now + def.duration,
    resolved:            false,
    ignored:             false,
  };
}

// ── Actions joueur ────────────────────────────────────────────────────────────

export function protectWhistleblower(
  state: StrategyGameState,
  id: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const alerts = state.whistleblowerAlerts ?? [];
  const alert  = alerts.find((a) => a.id === id);
  if (!alert || alert.resolved || alert.ignored)
    return { newState: state, success: false, reason: "Alerte introuvable." };
  if (state.resources.influence < PROTECT_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const cs = state.complianceState;
  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, influence: state.resources.influence - PROTECT_COST_INFLUENCE },
    whistleblowerAlerts: alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    complianceState: cs ? {
      ...cs,
      whistleblowerRisk: clamp(cs.whistleblowerRisk - 15),
      complianceScore:   clamp(cs.complianceScore   + 5),
      legalRisk:         clamp(cs.legalRisk          - 5),
    } : cs,
    hiddenPolitics: {
      ...state.hiddenPolitics,
      scandalRisk:            clamp(state.hiddenPolitics.scandalRisk            + 6),
      mediaMood:              clamp(state.hiddenPolitics.mediaMood              - 3),
      institutionalStability: clamp(state.hiddenPolitics.institutionalStability + 2),
    },
  };
  return { newState, success: true };
}

export function launchInternalAudit(
  state: StrategyGameState,
  id: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const alerts = state.whistleblowerAlerts ?? [];
  const alert  = alerts.find((a) => a.id === id);
  if (!alert || alert.resolved || alert.ignored)
    return { newState: state, success: false, reason: "Alerte introuvable." };
  if (state.resources.influence < AUDIT_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const cs = state.complianceState;
  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, influence: state.resources.influence - AUDIT_COST_INFLUENCE },
    whistleblowerAlerts: alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    complianceState: cs ? {
      ...cs,
      legalRisk:       clamp(cs.legalRisk       - 12),
      auditPressure:   clamp(cs.auditPressure    - 8),
      complianceScore: clamp(cs.complianceScore  + 8),
    } : cs,
    hiddenPolitics: {
      ...state.hiddenPolitics,
      institutionalStability: clamp(state.hiddenPolitics.institutionalStability + 5),
      scandalRisk:            clamp(state.hiddenPolitics.scandalRisk             - 5),
      eliteTrust:             clamp(state.hiddenPolitics.eliteTrust              + 3),
    },
  };
  return { newState, success: true };
}

export function correctQuietly(
  state: StrategyGameState,
  id: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const alerts = state.whistleblowerAlerts ?? [];
  const alert  = alerts.find((a) => a.id === id);
  if (!alert || alert.resolved || alert.ignored)
    return { newState: state, success: false, reason: "Alerte introuvable." };
  if (state.resources.money < CORRECT_COST_MONEY)
    return { newState: state, success: false, reason: "Fonds insuffisants." };

  const cs = state.complianceState;
  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, money: state.resources.money - CORRECT_COST_MONEY },
    whistleblowerAlerts: alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    complianceState: cs ? {
      ...cs,
      corruptionExposure: clamp(cs.corruptionExposure - 10),
      whistleblowerRisk:  clamp(cs.whistleblowerRisk  - 18),
      complianceScore:    clamp(cs.complianceScore    + 8),
      legalRisk:          clamp(cs.legalRisk           - 8),
    } : cs,
    hiddenPolitics: {
      ...state.hiddenPolitics,
      scandalRisk:            clamp(state.hiddenPolitics.scandalRisk            - 8),
      institutionalStability: clamp(state.hiddenPolitics.institutionalStability + 3),
    },
  };
  return { newState, success: true };
}

// ── Helpers publics ───────────────────────────────────────────────────────────

export function getActiveWhistleblowerAlerts(state: StrategyGameState): WhistleblowerAlert[] {
  const now = state.news.actionCount;
  return (state.whistleblowerAlerts ?? []).filter(
    (a) => !a.resolved && !a.ignored && a.expiresAfterActions > now,
  );
}

export function getWhistleblowerRiskLevel(count: number): "safe" | "watch" | "alert" | "critical" {
  if (count === 0) return "safe";
  if (count === 1) return "watch";
  if (count === 2) return "alert";
  return "critical";
}

const SEVERITY_LABEL: Record<WhistleblowerAlert["severity"], string> = {
  faible:   "SIGNAL FAIBLE",
  modere:   "ALERTE MODÉRÉE",
  grave:    "ALERTE GRAVE",
  critique: "CRISE IMMINENTE",
};

const SEVERITY_COLOR: Record<WhistleblowerAlert["severity"], string> = {
  faible:   "#e8c44f",
  modere:   "#e8864f",
  grave:    "#e54848",
  critique: "#9b1010",
};

const TRIGGER_LABEL: Record<WhistleblowerTriggerType, string> = {
  corruption_exposure: "Exposition à la corruption",
  legal_risk:          "Risque juridique interne",
  disloyal_minister:   "Ministre potentiellement défecteur",
  ignored_conflict:    "Conflit d'intérêts non déclaré",
  data_manipulation:   "Manipulation de données officielles",
  derogation_abuse:    "Abus de dérogations d'urgence",
  audit_pressure:      "Pression d'audit interne",
};

export function getAlertSeverityLabel(severity: WhistleblowerAlert["severity"]): string {
  return SEVERITY_LABEL[severity];
}
export function getAlertSeverityColor(severity: WhistleblowerAlert["severity"]): string {
  return SEVERITY_COLOR[severity];
}
export function getAlertTriggerLabel(type: WhistleblowerTriggerType): string {
  return TRIGGER_LABEL[type];
}

// ── Tick ──────────────────────────────────────────────────────────────────────

export function tickWhistleblower(state: StrategyGameState): StrategyGameState {
  let s: StrategyGameState = state;
  const now = s.news.actionCount;
  const day = s.mandateDay;

  // 1. Purge des alertes expirées
  const alive = (s.whistleblowerAlerts ?? []).filter(
    (a) => a.resolved || a.ignored || a.expiresAfterActions > now,
  );
  s = { ...s, whistleblowerAlerts: alive };

  // 2. Possibilité de créer une nouvelle alerte (maximum 1 par tick)
  for (const type of ALL_TRIGGERS) {
    if (shouldTrigger(s, type) && Math.random() < TRIGGER_ODDS[type]) {
      s = { ...s, whistleblowerAlerts: [...(s.whistleblowerAlerts ?? []), createAlert(s, type)] };
      break;
    }
  }

  // 3. Effets passifs basés sur l'état des alertes actives
  const active    = getActiveWhistleblowerAlerts(s);
  const count     = active.length;
  const hasOldOne = active.some((a) => now - a.createdAtAction >= 10);

  if (count >= 2 && day % 4 === 0) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: clamp(s.hiddenPolitics.scandalRisk + 2),
        mediaMood:   clamp(s.hiddenPolitics.mediaMood   - 1),
      },
    };
  }
  if (hasOldOne && day % 5 === 0) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: clamp(s.hiddenPolitics.scandalRisk + 1),
      },
    };
  }

  // 4. Récompense bonne gouvernance : aucune alerte + risque faible
  const cs = s.complianceState;
  if (cs && cs.whistleblowerRisk < 25 && count === 0 && day % 6 === 0) {
    s = {
      ...s,
      hiddenPolitics: { ...s.hiddenPolitics, eliteTrust: clamp(s.hiddenPolitics.eliteTrust + 1) },
    };
  }

  return s;
}
