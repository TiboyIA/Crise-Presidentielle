/**
 * conflictOfInterestEngine.ts — Conflits d'Intérêts Ministériels (MODE DELTA).
 *
 * Chaque ministre dispose d'un profil de risque éthique (4 indicateurs 0-100) :
 *   interestExposure    : conflit d'intérêts potentiel
 *   giftRisk            : risque de cadeaux / avantages indus
 *   familyBusinessRisk  : risque lié à des proches en affaires
 *   revolvingDoorRisk   : risque de pantouflage / porte tournante
 *
 * Statuts de déclaration :
 *   "non déclaré"  → risque caché, drift rapide
 *   "déclaré"      → risque ralenti, drift lent
 *   "audité"       → risque stabilisé, eliteTrust +
 *   "problématique" → ministre compromis, effets passifs aggravés
 *
 * Actions joueur (par ministre) :
 *   requestDeclaration  → déclaration publique d'intérêts (-10 INF)
 *   launchEthicsAudit   → audit éthique complet (-25 INF)
 *   suspendMinisterCoi  → écarté temporairement 15 actions (-15 INF)
 *   ignoreConflict      → passe, risque différé (sans coût = prise de risque)
 *   defendPublicly      → défense publique (-20 INF) — boomerang si risque élevé
 *
 * Effets passifs du tick :
 *   overallRisk ≥ 65 & "non déclaré" (×3j) : corruptionExposure +1
 *   statut "problématique" (×3j)            : scandalRisk +2, mediaMood -1
 *   statut "audité" (×8j)                   : eliteTrust +1
 *   ≥ 2 ministres risk ≥ 50 (×5j)          : mediaMood -1, oppositionPower +1
 *   ministre suspendu réintégré             : scandal brève +3
 */

import type { StrategyGameState, StrategyMinister } from "@/types/strategy";

export type DisclosureStatus = "non déclaré" | "déclaré" | "audité" | "problématique";

export interface MinisterConflictProfile {
  ministerId:           string;
  interestExposure:     number;  // 0-100
  giftRisk:             number;  // 0-100
  familyBusinessRisk:   number;  // 0-100
  revolvingDoorRisk:    number;  // 0-100
  disclosureStatus:     DisclosureStatus;
  overallRisk:          number;  // composite 0-100 (calculé)
  suspended:            boolean;
  suspendedUntilAction: number;  // actionCount de réintégration automatique
  defended:             boolean;
  lastActionAt:         number;  // anti-spam actions joueur
}

export const DECLARATION_COST_INFLUENCE  = 10;
export const ETHICS_AUDIT_COST_INFLUENCE = 25;
export const SUSPEND_COST_INFLUENCE      = 15;
export const DEFEND_COST_INFLUENCE       = 20;
export const SUSPEND_DURATION_ACTIONS    = 15;

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function computeOverallRisk(p: Pick<MinisterConflictProfile, "interestExposure" | "giftRisk" | "familyBusinessRisk" | "revolvingDoorRisk">): number {
  return clamp(
    p.interestExposure   * 0.35 +
    p.giftRisk           * 0.25 +
    p.familyBusinessRisk * 0.22 +
    p.revolvingDoorRisk  * 0.18,
  );
}

function initProfile(m: StrategyMinister): MinisterConflictProfile {
  const base = m.scandalRisk;
  const interestExposure   = clamp(base * 0.55);
  const giftRisk           = clamp(base * 0.35);
  const familyBusinessRisk = clamp(base * 0.25);
  const revolvingDoorRisk  = clamp(base * 0.20);
  return {
    ministerId:           m.id,
    interestExposure,
    giftRisk,
    familyBusinessRisk,
    revolvingDoorRisk,
    disclosureStatus:     "non déclaré",
    overallRisk:          computeOverallRisk({ interestExposure, giftRisk, familyBusinessRisk, revolvingDoorRisk }),
    suspended:            false,
    suspendedUntilAction: 0,
    defended:             false,
    lastActionAt:         0,
  };
}

// ── Bande de risque ───────────────────────────────────────────────────────────

export interface ConflictBandInfo {
  label: string;
  color: string;
  icon:  string;
}

export function getConflictBandInfo(overallRisk: number): ConflictBandInfo {
  if (overallRisk >= 70) return { label: "CRITIQUE",     color: "#e54848", icon: "alert-circle" };
  if (overallRisk >= 50) return { label: "RISQUE",       color: "#e8864f", icon: "alert-circle-outline" };
  if (overallRisk >= 30) return { label: "SURVEILLANCE", color: "#e8c44f", icon: "eye-outline" };
  return                        { label: "SAIN",         color: "#4caf82", icon: "check-circle-outline" };
}

export function getDisclosureStatusColor(status: DisclosureStatus): string {
  switch (status) {
    case "non déclaré":  return "#e8c44f";
    case "déclaré":      return "#4a9fff";
    case "audité":       return "#4caf82";
    case "problématique": return "#e54848";
  }
}

// ── Actions joueur ────────────────────────────────────────────────────────────

export function requestDeclaration(
  state: StrategyGameState,
  ministerId: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const profiles = state.ministerConflicts ?? {};
  const profile  = profiles[ministerId];
  if (!profile) return { newState: state, success: false, reason: "Profil introuvable." };
  if (profile.disclosureStatus !== "non déclaré")
    return { newState: state, success: false, reason: "Déclaration déjà effectuée." };
  if (state.resources.influence < DECLARATION_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const next: MinisterConflictProfile = {
    ...profile,
    disclosureStatus:  "déclaré",
    interestExposure:  clamp(profile.interestExposure  - 12),
    giftRisk:          clamp(profile.giftRisk           - 8),
    lastActionAt:      state.news.actionCount,
  };
  next.overallRisk = computeOverallRisk(next);

  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, influence: state.resources.influence - DECLARATION_COST_INFLUENCE },
    ministerConflicts: { ...profiles, [ministerId]: next },
    hiddenPolitics: {
      ...state.hiddenPolitics,
      institutionalStability: clamp(state.hiddenPolitics.institutionalStability + 3),
      eliteTrust:             clamp(state.hiddenPolitics.eliteTrust              - 2),
    },
  };
  return { newState, success: true };
}

export function launchEthicsAudit(
  state: StrategyGameState,
  ministerId: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const profiles = state.ministerConflicts ?? {};
  const profile  = profiles[ministerId];
  if (!profile) return { newState: state, success: false, reason: "Profil introuvable." };
  if (profile.disclosureStatus === "audité")
    return { newState: state, success: false, reason: "Audit déjà réalisé." };
  if (state.resources.influence < ETHICS_AUDIT_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const wasProblematic = profile.disclosureStatus === "problématique";
  const next: MinisterConflictProfile = {
    ...profile,
    disclosureStatus:    "audité",
    interestExposure:    clamp(profile.interestExposure   - 22),
    giftRisk:            clamp(profile.giftRisk            - 18),
    familyBusinessRisk:  clamp(profile.familyBusinessRisk  - 15),
    revolvingDoorRisk:   clamp(profile.revolvingDoorRisk   - 12),
    lastActionAt:        state.news.actionCount,
  };
  next.overallRisk = computeOverallRisk(next);

  const cs = state.complianceState;
  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, influence: state.resources.influence - ETHICS_AUDIT_COST_INFLUENCE },
    ministerConflicts: { ...profiles, [ministerId]: next },
    complianceState: cs ? {
      ...cs,
      legalRisk:          clamp(cs.legalRisk          - 10),
      corruptionExposure: clamp(cs.corruptionExposure  - 8),
      auditPressure:      clamp(cs.auditPressure       - 6),
      complianceScore:    clamp(cs.complianceScore     + 6),
    } : cs,
    hiddenPolitics: {
      ...state.hiddenPolitics,
      scandalRisk:            clamp(state.hiddenPolitics.scandalRisk            - (wasProblematic ? 15 : 8)),
      institutionalStability: clamp(state.hiddenPolitics.institutionalStability + 5),
      eliteTrust:             clamp(state.hiddenPolitics.eliteTrust              + 3),
    },
  };
  return { newState, success: true };
}

export function suspendMinisterCoi(
  state: StrategyGameState,
  ministerId: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const profiles = state.ministerConflicts ?? {};
  const profile  = profiles[ministerId];
  if (!profile) return { newState: state, success: false, reason: "Profil introuvable." };
  if (profile.suspended)
    return { newState: state, success: false, reason: "Ministre déjà suspendu." };
  if (state.resources.influence < SUSPEND_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  // Réduire le scandalRisk du ministre en jeu
  const ministers = state.strategyMinisters.map((m) =>
    m.id === ministerId ? { ...m, scandalRisk: clamp(m.scandalRisk - 15) } : m,
  );

  const next: MinisterConflictProfile = {
    ...profile,
    suspended:            true,
    suspendedUntilAction: state.news.actionCount + SUSPEND_DURATION_ACTIONS,
    lastActionAt:         state.news.actionCount,
  };
  next.overallRisk = computeOverallRisk(next);

  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, influence: state.resources.influence - SUSPEND_COST_INFLUENCE },
    strategyMinisters: ministers,
    ministerConflicts: { ...profiles, [ministerId]: next },
    hiddenPolitics: {
      ...state.hiddenPolitics,
      mediaMood:   clamp(state.hiddenPolitics.mediaMood   - 5),
      scandalRisk: clamp(state.hiddenPolitics.scandalRisk  - 5),
    },
  };
  return { newState, success: true };
}

export function defendPublicly(
  state: StrategyGameState,
  ministerId: string,
): { newState: StrategyGameState; success: boolean; reason?: string } {
  const profiles = state.ministerConflicts ?? {};
  const profile  = profiles[ministerId];
  if (!profile) return { newState: state, success: false, reason: "Profil introuvable." };
  if (state.resources.influence < DEFEND_COST_INFLUENCE)
    return { newState: state, success: false, reason: "Influence insuffisante." };

  const highRisk = profile.overallRisk >= 60;
  const next: MinisterConflictProfile = {
    ...profile,
    defended:     true,
    lastActionAt: state.news.actionCount,
  };

  const newState: StrategyGameState = {
    ...state,
    resources: { ...state.resources, influence: state.resources.influence - DEFEND_COST_INFLUENCE },
    ministerConflicts: { ...profiles, [ministerId]: next },
    hiddenPolitics: {
      ...state.hiddenPolitics,
      scandalRisk: clamp(state.hiddenPolitics.scandalRisk - (highRisk ? -5 : 10)),
      eliteTrust:  clamp(state.hiddenPolitics.eliteTrust  - (highRisk ? 6 : 2)),
      mediaMood:   clamp(state.hiddenPolitics.mediaMood   - (highRisk ? 3 : -2)),
    },
  };
  return { newState, success: true };
}

// ── Helpers publics ───────────────────────────────────────────────────────────

export function getExposedMinisters(state: StrategyGameState): MinisterConflictProfile[] {
  const profiles = state.ministerConflicts ?? {};
  return Object.values(profiles).filter((p) => p.overallRisk >= 25);
}

export function getMostExposedMinister(state: StrategyGameState): MinisterConflictProfile | null {
  const exposed = getExposedMinisters(state);
  if (exposed.length === 0) return null;
  return exposed.reduce((max, p) => (p.overallRisk > max.overallRisk ? p : max));
}

// ── Tick ──────────────────────────────────────────────────────────────────────

export function tickConflictOfInterest(state: StrategyGameState): StrategyGameState {
  let s: StrategyGameState = state;
  const now      = s.news.actionCount;
  const day      = s.mandateDay;
  const doctrine = s.governanceDoctrine ?? "democratique";
  const isPopulistOrAutoc = doctrine === "populiste" || doctrine === "autoritaire";

  const profiles: Record<string, MinisterConflictProfile> = { ...(s.ministerConflicts ?? {}) };

  // 1. Initialiser les profils manquants + traiter chaque ministre
  for (const m of s.strategyMinisters) {
    if (!profiles[m.id]) {
      profiles[m.id] = initProfile(m);
    }

    let p = { ...profiles[m.id] };

    // Lever la suspension si expirée
    if (p.suspended && now >= p.suspendedUntilAction) {
      p = { ...p, suspended: false };
      // Brève pression scandaleuse au retour
      s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, scandalRisk: clamp(s.hiddenPolitics.scandalRisk + 3) } };
    }

    // Calculer les cibles selon statut et doctrine
    const statusMod = p.disclosureStatus === "audité"
      ? -20
      : p.disclosureStatus === "déclaré"
      ? -8
      : p.disclosureStatus === "problématique"
      ? 15
      : 0;

    const targetInterest   = clamp(m.scandalRisk * 0.60 + statusMod + (isPopulistOrAutoc ? 12 : 0));
    const targetGift       = clamp(m.scandalRisk * 0.40 + statusMod * 0.7);
    const targetFamily     = clamp(m.scandalRisk * 0.28 + statusMod * 0.6);
    const targetRevolving  = clamp(m.scandalRisk * 0.22 + (isPopulistOrAutoc ? 10 : 0) + statusMod * 0.5);

    // Drift vitesse réduite (impact durable des actions)
    const speed = p.disclosureStatus === "audité" ? 1 : 2;

    const drift = (cur: number, tgt: number) =>
      cur < tgt ? Math.min(tgt, cur + speed) : Math.max(tgt, cur - speed);

    p = {
      ...p,
      interestExposure:   clamp(drift(p.interestExposure,   targetInterest)),
      giftRisk:           clamp(drift(p.giftRisk,           targetGift)),
      familyBusinessRisk: clamp(drift(p.familyBusinessRisk, targetFamily)),
      revolvingDoorRisk:  clamp(drift(p.revolvingDoorRisk,  targetRevolving)),
    };
    p.overallRisk = computeOverallRisk(p);

    // Dégrader vers "problématique" si très exposé et non déclaré depuis longtemps
    if (
      p.disclosureStatus === "non déclaré" &&
      p.overallRisk >= 75 &&
      now - p.lastActionAt >= 20 &&
      day >= 20
    ) {
      p = { ...p, disclosureStatus: "problématique" };
    }

    profiles[m.id] = p;
  }

  s = { ...s, ministerConflicts: profiles };

  // 2. Effets passifs globaux
  const exposed = Object.values(profiles).filter((p) => p.overallRisk >= 50);
  const problematic = Object.values(profiles).filter((p) => p.disclosureStatus === "problématique");
  const audited = Object.values(profiles).filter((p) => p.disclosureStatus === "audité");

  // ministre exposé non déclaré → corruptionExposure cible monte
  const highHidden = Object.values(profiles).filter(
    (p) => p.overallRisk >= 65 && p.disclosureStatus === "non déclaré",
  );
  if (highHidden.length > 0 && day % 3 === 0) {
    const cs = s.complianceState;
    if (cs) {
      s = { ...s, complianceState: { ...cs, corruptionExposure: clamp(cs.corruptionExposure + 1) } };
    }
  }

  // statut "problématique"
  if (problematic.length > 0 && day % 3 === 0) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: clamp(s.hiddenPolitics.scandalRisk + 2),
        mediaMood:   clamp(s.hiddenPolitics.mediaMood   - 1),
      },
    };
  }

  // ≥ 2 ministres exposés
  if (exposed.length >= 2 && day % 5 === 0) {
    s = {
      ...s,
      hiddenPolitics: { ...s.hiddenPolitics, mediaMood: clamp(s.hiddenPolitics.mediaMood - 1) },
      oppositionPower: clamp((s.oppositionPower ?? 35) + 1),
    };
  }

  // ministre audité → eliteTrust +
  if (audited.length > 0 && day % 8 === 0) {
    s = {
      ...s,
      hiddenPolitics: { ...s.hiddenPolitics, eliteTrust: clamp(s.hiddenPolitics.eliteTrust + 1) },
    };
  }

  return s;
}
