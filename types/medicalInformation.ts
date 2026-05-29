/**
 * medicalInformation.ts — Types agrégateurs du Système d'Information Médicale Nationale.
 *
 * Les indicateurs de santé sont stockés comme champs optionnels directement sur
 * StrategyGameState (pour la compatibilité avec les sauvegardes existantes).
 * Ce fichier regroupe les types et fournit un helper de lecture cohérent.
 *
 * Aucune donnée médicale réelle. Aucun diagnostic. Aucune donnée personnelle.
 * Toutes les valeurs sont fictives et servent au pilotage présidentiel.
 */

import type { StrategyGameState } from "@/types/strategy";
import type { SurveillanceLevelId } from "@/logic/healthSurveillanceEngine";

// ── Snapshot lecture seule ────────────────────────────────────────────────────

export interface MedicalInformationSnapshot {
  /** Qualité globale du système d'information sanitaire (0-100). */
  medicalDataQuality:      number;
  /** Précision du codage médico-administratif hospitalier (0-100). */
  hospitalCodingQuality:   number;
  /** Pression sur le système de soins (0-100). */
  hospitalPressure:        number;
  /** Délai de remontée des données sanitaires (0-30 actions). */
  healthReportingDelay:    number;
  /** Confiance de la population dans les chiffres officiels (0-100). */
  healthDataTrust:         number;
  /** Capacité d'échange entre systèmes d'information de santé (0-100). */
  healthInteroperability:  number;
  /** Pression de sous-détection sanitaire cachée (0-100). */
  underDetectionPressure:  number;
  /** Pression de scandale statistique (0-100). */
  statisticsScandalPressure: number;
  /** Niveau de la cellule de veille sanitaire active. */
  healthSurveillanceLevel: SurveillanceLevelId;
  /** Action count du dernier audit DIM (-99 si jamais lancé). */
  lastDimAuditAt:          number;
}

// Valeurs par défaut centralisées (évite la duplication des ?? dans l'UI)
const DEFAULTS = {
  medicalDataQuality:       50,
  hospitalCodingQuality:    55,
  hospitalPressure:         30,
  healthReportingDelay:      8,
  healthDataTrust:          65,
  healthInteroperability:   52,
  underDetectionPressure:   15,
  statisticsScandalPressure: 10,
  healthSurveillanceLevel:  "faible" as SurveillanceLevelId,
  lastDimAuditAt:           -99,
};

/** Extrait un snapshot cohérent depuis StrategyGameState. */
export function getMedicalInformationSnapshot(
  state: StrategyGameState,
): MedicalInformationSnapshot {
  return {
    medicalDataQuality:       state.medicalDataQuality       ?? DEFAULTS.medicalDataQuality,
    hospitalCodingQuality:    state.hospitalCodingQuality    ?? DEFAULTS.hospitalCodingQuality,
    hospitalPressure:         state.hospitalPressure          ?? DEFAULTS.hospitalPressure,
    healthReportingDelay:     state.healthReportingDelay     ?? DEFAULTS.healthReportingDelay,
    healthDataTrust:          state.healthDataTrust           ?? DEFAULTS.healthDataTrust,
    healthInteroperability:   state.healthInteroperability   ?? DEFAULTS.healthInteroperability,
    underDetectionPressure:   state.underDetectionPressure   ?? DEFAULTS.underDetectionPressure,
    statisticsScandalPressure: state.statisticsScandalPressure ?? DEFAULTS.statisticsScandalPressure,
    healthSurveillanceLevel:  state.healthSurveillanceLevel  ?? DEFAULTS.healthSurveillanceLevel,
    lastDimAuditAt:           state.lastDimAuditAt           ?? DEFAULTS.lastDimAuditAt,
  };
}

/** Retourne true si le système de santé mérite une alerte dans l'UI. */
export function hasMedicalAlert(snap: MedicalInformationSnapshot): boolean {
  return (
    snap.hospitalPressure          >= 81 ||
    snap.healthDataTrust           <= 20 ||
    snap.underDetectionPressure    >= 85 ||
    snap.statisticsScandalPressure >= 85 ||
    snap.healthInteroperability    <  20
  );
}
