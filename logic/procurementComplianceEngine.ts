/**
 * procurementComplianceEngine.ts — Marchés Publics & Risque de Favoritisme (MODE DELTA).
 *
 * procurementIntegrity (0-100) :
 *   ≥ 75 : exemplaire — coût projets -, confiance institutionnelle +
 *   50-74 : standard  — fonctionnement acceptable
 *   25-49 : risque    — irrégularités détectées, corruptionExposure monte
 *   < 25  : critique  — favoritisme systémique, scandalRisk monte vite
 *
 * Indicateurs complémentaires :
 *   vendorConcentration    (0-100) : haut = monopole fournisseur = dépendance + corruption
 *   conflictOfInterestRisk (0-100) : haut = conflits d'intérêts actifs
 *   deliveryReliability    (0-100) : haut = fournisseurs fiables, projets bien livrés
 *
 * Effets passifs (tick quotidien) :
 *   integrity < 30    (×4j) : complianceState.corruptionExposure +1
 *   conflictRisk ≥ 65 (×5j) : hiddenPolitics.scandalRisk +1
 *   integrity ≥ 70    (×6j) : nationalIndicators.economy +1
 *   concentration ≥ 70(×5j) : complianceState.corruptionExposure +1
 *   reliability < 40  (×5j) : nationalIndicators.economy -1
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProcurementState {
  procurementIntegrity:   number; // 0-100 — intégrité globale des marchés publics
  vendorConcentration:    number; // 0-100 — concentration des fournisseurs (élevé = risque)
  conflictOfInterestRisk: number; // 0-100 — risque de conflits d'intérêts actifs
  deliveryReliability:    number; // 0-100 — fiabilité de livraison des fournisseurs
}

export type ProcurementBand = "exemplaire" | "standard" | "risque" | "critique";

export interface ProcurementBandInfo {
  band:    ProcurementBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_PROCUREMENT_STATE: ProcurementState = {
  procurementIntegrity:   70,
  vendorConcentration:    25,
  conflictOfInterestRisk: 15,
  deliveryReliability:    72,
};

const INTEGRITY_BANDS: { threshold: number; info: ProcurementBandInfo }[] = [
  {
    threshold: 75,
    info: {
      band: "exemplaire", label: "Marchés exemplaires", color: "#4caf82",
      message: "Les appels d'offres sont complets, transparents et compétitifs. Les coûts des projets publics sont maîtrisés et la confiance institutionnelle renforcée.",
    },
  },
  {
    threshold: 50,
    info: {
      band: "standard", label: "Marchés standard", color: "#8bc34a",
      message: "Les procédures respectent globalement les règles. Des irrégularités ponctuelles existent mais restent tolérées par les organes de contrôle.",
    },
  },
  {
    threshold: 25,
    info: {
      band: "risque", label: "Marchés à risque", color: "#e8864f",
      message: "Des irrégularités systématiques sont détectées. Les concentrations de fournisseurs et les conflits d'intérêts fragilisent la légitimité des dépenses publiques.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "critique", label: "Favoritisme systémique", color: "#e54848",
      message: "Les marchés publics sont captés par des réseaux proches du pouvoir. Le risque de scandale est imminent et l'efficacité des dépenses publiques s'effondre.",
    },
  },
];

export function getProcurementBandInfo(integrity: number): ProcurementBandInfo {
  return (INTEGRITY_BANDS.find((b) => integrity >= b.threshold) ?? INTEGRITY_BANDS[INTEGRITY_BANDS.length - 1]).info;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function drift(current: number, target: number, speed: number): number {
  if (current < target) return Math.min(target, current + speed);
  if (current > target) return Math.max(target, current - speed);
  return current;
}

// ── Cibles ────────────────────────────────────────────────────────────────────

function computeTargets(state: StrategyGameState, prev: ProcurementState): ProcurementState {
  const hp          = state.hiddenPolitics;
  const scandalRisk = hp?.scandalRisk         ?? 20;
  const instStab    = hp?.institutionalStability ?? 70;
  const eliteTrust  = hp?.eliteTrust           ?? 65;
  const shadow      = state.shadowEconomy      ?? 30;
  const investConf  = state.investorConfidence ?? 55;
  const corrExp     = state.complianceState?.corruptionExposure ?? DEFAULT_COMPLIANCE_STATE.corruptionExposure;

  const procurementIntegrity = clamp(
    instStab    * 0.40 +
    (100 - scandalRisk)  * 0.25 +
    (100 - prev.vendorConcentration) * 0.20 +
    (100 - corrExp)      * 0.15,
  );

  const vendorConcentration = clamp(
    20 +
    (scandalRisk >= 50 ? 22 : scandalRisk >= 30 ? 10 : 0) +
    (shadow > 50 ? 25 : shadow > 30 ? 12 : 0) +
    Math.max(0, 50 - investConf) * 0.35,
  );

  const conflictOfInterestRisk = clamp(
    scandalRisk              * 0.35 +
    prev.vendorConcentration * 0.30 +
    (100 - prev.procurementIntegrity) * 0.22 +
    (eliteTrust < 40 ? 18 : eliteTrust < 55 ? 8 : 0),
  );

  const scAvgReliability = (() => {
    const sc = state.supplyChain;
    if (!sc) return 60;
    const vals = Object.values(sc);
    return vals.reduce((s, sec) => s + (100 - sec.disruptionRisk), 0) / vals.length;
  })();

  const deliveryReliability = clamp(
    prev.procurementIntegrity * 0.45 +
    scAvgReliability          * 0.35 +
    (100 - prev.vendorConcentration) * 0.20,
  );

  return { procurementIntegrity, vendorConcentration, conflictOfInterestRisk, deliveryReliability };
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickProcurement(state: StrategyGameState): StrategyGameState {
  const SPEED = 3;
  const prev    = state.procurementState ?? DEFAULT_PROCUREMENT_STATE;
  const targets = computeTargets(state, prev);

  const next: ProcurementState = {
    procurementIntegrity:   clamp(drift(prev.procurementIntegrity,   targets.procurementIntegrity,   SPEED)),
    vendorConcentration:    clamp(drift(prev.vendorConcentration,    targets.vendorConcentration,    SPEED)),
    conflictOfInterestRisk: clamp(drift(prev.conflictOfInterestRisk, targets.conflictOfInterestRisk, SPEED)),
    deliveryReliability:    clamp(drift(prev.deliveryReliability,    targets.deliveryReliability,    SPEED)),
  };

  let s: StrategyGameState = { ...state, procurementState: next };
  const day  = s.mandateDay;
  const hp   = s.hiddenPolitics;
  const cs   = s.complianceState;
  const ind  = s.nationalIndicators;

  // Intégrité faible → corruptionExposure monte
  if (next.procurementIntegrity < 30 && day % 4 === 0 && cs) {
    s = { ...s, complianceState: { ...cs, corruptionExposure: clamp(cs.corruptionExposure + 1) } };
  }

  // Concentration trop élevée → corruptionExposure monte
  if (next.vendorConcentration >= 70 && day % 5 === 0 && cs) {
    s = { ...s, complianceState: { ...s.complianceState!, corruptionExposure: clamp((s.complianceState?.corruptionExposure ?? 10) + 1) } };
  }

  // Conflits d'intérêts élevés → scandalRisk monte
  if (next.conflictOfInterestRisk >= 65 && day % 5 === 0) {
    s = { ...s, hiddenPolitics: { ...hp, scandalRisk: clamp((hp?.scandalRisk ?? 20) + 1) } };
  }

  // Bonne intégrité → économie +1 (projets publics efficaces)
  if (next.procurementIntegrity >= 70 && day % 6 === 0) {
    s = { ...s, nationalIndicators: { ...ind, economy: clamp((ind?.economy ?? 55) + 1) } };
  }

  // Faible fiabilité → économie -1 (projets mal livrés)
  if (next.deliveryReliability < 40 && day % 5 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: clamp((s.nationalIndicators?.economy ?? 55) - 1) } };
  }

  // Synchronise complianceState.procurementIntegrity avec la valeur détaillée
  if (s.complianceState) {
    const updatedCs = { ...s.complianceState, procurementIntegrity: next.procurementIntegrity };
    updatedCs.complianceScore = clamp(
      updatedCs.procurementIntegrity    * 0.30 +
      (100 - updatedCs.emergencyPowersAbuse) * 0.25 +
      (100 - updatedCs.corruptionExposure)   * 0.25 +
      (100 - updatedCs.legalRisk)            * 0.20,
    );
    s = { ...s, complianceState: updatedCs };
  }

  return s;
}
