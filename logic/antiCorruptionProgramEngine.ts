/**
 * antiCorruptionProgramEngine.ts — Programme Anti-Corruption d'État (MODE DELTA).
 *
 * Niveaux du programme (0 → 4) :
 *   absent      — aucun programme ; corruption dérive passivement vers le haut
 *   symbolique  — communication + , effets limités
 *   actif       — réduction réelle, coût administratif
 *   renforcé    — phase initiale de révélations, puis conformité forte
 *   indépendant — très efficace, mais expose les alliés politiques ; imprévisible
 *
 * Règles :
 *   • Pas de solution parfaite — chaque niveau a un coût ou un risque
 *   • Rétrograder réduit la crédibilité (eliteTrust − , mediaMood −)
 *   • Le niveau "renforcé" passe par une phase de choc (15 jours)
 *   • Le niveau "indépendant" déclenche des événements d'exposition imprévus
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";
import { queueNews } from "@/logic/newsEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AntiCorruptionLevel =
  | "absent"
  | "symbolique"
  | "actif"
  | "renforcé"
  | "indépendant";

export const LEVEL_ORDER: AntiCorruptionLevel[] = [
  "absent", "symbolique", "actif", "renforcé", "indépendant",
];

export const LEVEL_LABELS: Record<AntiCorruptionLevel, string> = {
  absent:       "Absent",
  symbolique:   "Symbolique",
  actif:        "Actif",
  renforcé:     "Renforcé",
  indépendant:  "Indépendant",
};

export const LEVEL_COLORS: Record<AntiCorruptionLevel, string> = {
  absent:       "#e54848",
  symbolique:   "#94a3b8",
  actif:        "#e8c44f",
  renforcé:     "#4a9fff",
  indépendant:  "#a78bfa",
};

export interface AntiCorruptionState {
  level:          AntiCorruptionLevel;
  launchedAtDay:  number;   // mandateDay lors du dernier changement de niveau
  revealedCount:  number;   // nb d'irrégularités révélées par le programme
  lastAuditAt:    number;   // mandateDay du dernier audit
  allyExposures:  number;   // nb d'alliés exposés par le programme indépendant
}

export const DEFAULT_ANTI_CORRUPTION_STATE: AntiCorruptionState = {
  level:         "absent",
  launchedAtDay: 0,
  revealedCount: 0,
  lastAuditAt:   0,
  allyExposures: 0,
};

// ── Coûts de mise à niveau ────────────────────────────────────────────────────

export interface LevelUpgradeCost {
  influence: number;
  money:     number;
}

export const UPGRADE_COSTS: Partial<Record<AntiCorruptionLevel, LevelUpgradeCost>> = {
  symbolique:  { influence: 25,  money: 0     },
  actif:       { influence: 40,  money: 300   },
  renforcé:    { influence: 60,  money: 800   },
  indépendant: { influence: 100, money: 1500  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function everyN(day: number, n: number): boolean {
  return day > 0 && day % n === 0;
}

function levelIndex(l: AntiCorruptionLevel): number {
  return LEVEL_ORDER.indexOf(l);
}

export function isInitialPhase(state: AntiCorruptionState, mandateDay: number): boolean {
  return state.level === "renforcé" && mandateDay - state.launchedAtDay < 15;
}

// ── Action présidentielle : changer le niveau ─────────────────────────────────

export function setAntiCorruptionLevel(
  state: StrategyGameState,
  newLevel: AntiCorruptionLevel,
): { state: StrategyGameState; success: boolean; reason?: string } {
  const current = state.antiCorruptionState ?? DEFAULT_ANTI_CORRUPTION_STATE;
  const curIdx  = levelIndex(current.level);
  const newIdx  = levelIndex(newLevel);

  if (newIdx === curIdx) {
    return { state, success: false, reason: "Niveau déjà actif." };
  }

  // ── Upgrade ────────────────────────────────────────────────────────────────
  if (newIdx > curIdx) {
    const cost = UPGRADE_COSTS[newLevel];
    if (!cost) return { state, success: false, reason: "Niveau inconnu." };

    if (state.resources.influence < cost.influence) {
      return { state, success: false, reason: `Influence insuffisante (${cost.influence} requis).` };
    }
    if (state.resources.money < cost.money) {
      return { state, success: false, reason: `Budget insuffisant (${cost.money} requis).` };
    }

    const newResources = {
      ...state.resources,
      influence: state.resources.influence - cost.influence,
      money:     state.resources.money     - cost.money,
    };

    return {
      success: true,
      state: {
        ...state,
        resources: newResources,
        antiCorruptionState: {
          ...current,
          level:         newLevel,
          launchedAtDay: state.mandateDay,
        },
      },
    };
  }

  // ── Downgrade — aucun coût financier, mais crédibilité dégradée ────────────
  const hp = state.hiddenPolitics;
  return {
    success: true,
    state: {
      ...state,
      hiddenPolitics: {
        ...hp,
        eliteTrust: clamp(hp.eliteTrust - 8),
        mediaMood:  clamp(hp.mediaMood  - 6),
        scandalRisk: clamp(hp.scandalRisk + 5),
      },
      antiCorruptionState: {
        ...current,
        level:         newLevel,
        launchedAtDay: state.mandateDay,
      },
    },
  };
}

// ── Tick passif ───────────────────────────────────────────────────────────────

export function tickAntiCorruption(state: StrategyGameState): StrategyGameState {
  const day     = state.mandateDay;
  const ac      = state.antiCorruptionState ?? DEFAULT_ANTI_CORRUPTION_STATE;
  const cs      = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
  const hp      = state.hiddenPolitics;
  const initial = isInitialPhase(ac, day);

  let newCs  = { ...cs };
  let newHp  = { ...hp };
  let newAc  = { ...ac };
  let news   = state.news;

  switch (ac.level) {
    // ── ABSENT ───────────────────────────────────────────────────────────────
    case "absent":
      if (everyN(day, 3))  newCs = { ...newCs, corruptionExposure: clamp(newCs.corruptionExposure + 1) };
      if (everyN(day, 5))  newCs = { ...newCs, whistleblowerRisk:  clamp(newCs.whistleblowerRisk  + 1) };
      if (everyN(day, 6))  newCs = { ...newCs, complianceScore:    clamp(newCs.complianceScore    - 1) };
      break;

    // ── SYMBOLIQUE ───────────────────────────────────────────────────────────
    case "symbolique":
      if (everyN(day, 5))  newCs = { ...newCs, corruptionExposure: clamp(newCs.corruptionExposure - 1) };
      if (everyN(day, 8))  newHp = { ...newHp, mediaMood: clamp(newHp.mediaMood + 1) };
      if (everyN(day, 10)) newHp = { ...newHp, eliteTrust: clamp(newHp.eliteTrust + 1) };
      break;

    // ── ACTIF ─────────────────────────────────────────────────────────────────
    case "actif":
      if (everyN(day, 3))  newCs = { ...newCs, corruptionExposure: clamp(newCs.corruptionExposure - 1) };
      if (everyN(day, 4))  newCs = { ...newCs, auditPressure:      clamp(newCs.auditPressure      + 1) };
      if (everyN(day, 5))  newCs = { ...newCs, legalRisk:          clamp(newCs.legalRisk          - 1) };
      if (everyN(day, 8))  newCs = { ...newCs, complianceScore:    clamp(newCs.complianceScore    + 1) };
      break;

    // ── RENFORCÉ — phase initiale (< 15j) : choc révélateur ──────────────────
    case "renforcé":
      if (initial) {
        // Révélations d'irrégularités : légère augmentation transitoire
        if (everyN(day, 4)) {
          newCs  = { ...newCs, corruptionExposure: clamp(newCs.corruptionExposure + 2) };
          newAc  = { ...newAc, revealedCount: newAc.revealedCount + 1, lastAuditAt: day };
          // Déclenche l'événement d'audit si pas encore déclenché récemment
          if (day - ac.lastAuditAt >= 8) {
            news = queueNews(news, "acep_audit_revelation");
          }
        }
        if (everyN(day, 5)) newHp = { ...newHp, eliteTrust: clamp(newHp.eliteTrust - 1) };
      } else {
        // Phase mature : efficacité maximale
        if (everyN(day, 3))  newCs = { ...newCs, corruptionExposure: clamp(newCs.corruptionExposure - 2) };
        if (everyN(day, 4))  newCs = { ...newCs, legalRisk:          clamp(newCs.legalRisk          - 1) };
        if (everyN(day, 5))  newCs = { ...newCs, complianceScore:    clamp(newCs.complianceScore    + 2) };
        if (everyN(day, 5))  newCs = { ...newCs, auditPressure:      clamp(newCs.auditPressure      - 1) };
        if (everyN(day, 8))  newHp = { ...newHp, eliteTrust:         clamp(newHp.eliteTrust         + 1) };
      }
      break;

    // ── INDÉPENDANT ───────────────────────────────────────────────────────────
    case "indépendant":
      if (everyN(day, 2))  newCs = { ...newCs, corruptionExposure: clamp(newCs.corruptionExposure - 2) };
      if (everyN(day, 3))  newCs = { ...newCs, legalRisk:          clamp(newCs.legalRisk          - 1) };
      if (everyN(day, 4))  newCs = { ...newCs, complianceScore:    clamp(newCs.complianceScore    + 2) };
      if (everyN(day, 4))  newCs = { ...newCs, auditPressure:      clamp(newCs.auditPressure      - 1) };
      // Risque d'exposition des alliés : 1 fois tous les 8 jours
      if (everyN(day, 8) && day - ac.lastAuditAt >= 8) {
        news  = queueNews(news, "acep_ally_exposure");
        newAc = { ...newAc, allyExposures: newAc.allyExposures + 1, lastAuditAt: day };
      }
      break;
  }

  // ── Résultats positifs (niveau renforcé ou indépendant, phase mature ≥ 25j) ─
  if (
    (ac.level === "renforcé" || ac.level === "indépendant") &&
    !initial &&
    day - ac.launchedAtDay >= 25 &&
    day - ac.lastAuditAt  >= 20 &&
    everyN(day, 20)
  ) {
    news  = queueNews(news, "acep_results_positive");
    newAc = { ...newAc, lastAuditAt: day };
  }

  return {
    ...state,
    news,
    hiddenPolitics:      newHp,
    complianceState:     newCs,
    antiCorruptionState: newAc,
  };
}

// ── Informations de niveau ────────────────────────────────────────────────────

export interface LevelInfo {
  level:       AntiCorruptionLevel;
  label:       string;
  color:       string;
  efficiency:  number; // 0-100 pour la barre d'affichage
  description: string;
}

export function getLevelInfo(level: AntiCorruptionLevel): LevelInfo {
  const MAP: Record<AntiCorruptionLevel, Omit<LevelInfo, "level">> = {
    absent: {
      label: "Absent", color: "#e54848", efficiency: 0,
      description: "Aucun dispositif anti-corruption. La dérive est progressive et silencieuse.",
    },
    symbolique: {
      label: "Symbolique", color: "#94a3b8", efficiency: 20,
      description: "Déclarations publiques d'intention. Effet communication modéré, impact réel limité.",
    },
    actif: {
      label: "Actif", color: "#e8c44f", efficiency: 50,
      description: "Contrôles internes réguliers. Réduit la corruption mais génère une charge administrative.",
    },
    renforcé: {
      label: "Renforcé", color: "#4a9fff", efficiency: 75,
      description: "Phase initiale perturbatrice, puis forte conformité. Révèle des irrégularités existantes.",
    },
    indépendant: {
      label: "Indépendant", color: "#a78bfa", efficiency: 95,
      description: "Autorité autonome. Très efficace mais peut exposer des alliés politiques de manière imprévisible.",
    },
  };
  return { level, ...MAP[level] };
}
