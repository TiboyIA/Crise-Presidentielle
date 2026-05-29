/**
 * healthStatisticsScandalEngine.ts — Scandale des Chiffres de Santé.
 *
 * Accumule une pression de scandale statistique lorsque le joueur minimise
 * systématiquement les données sanitaires, tarde à corriger des erreurs,
 * ou laisse la confiance s'effondrer tout en maintenant une communication rassurante.
 *
 * statisticsScandalPressure (0-100) augmente si :
 *   - discoursePathology.minimization élevée (habitude de minimiser)
 *   - hospitalPressure élevée + mediaMood favorable (contradiction dangereuse)
 *   - healthReportingDelay élevé (corrections tardives)
 *   - healthDataTrust faible (crédibilité déjà entamée)
 *   - scandalRisk élevé (contexte explosif)
 *   - underDetectionPressure élevée (crise cachée en cours)
 *
 * Diminue si :
 *   - healthDataTrust élevée
 *   - discoursePathology.minimization faible
 *   - medicalDataQuality élevée
 *   - audit DIM récent
 *   - institutionalStability élevée
 *
 * Déclenche 3 paliers d'événements Journal (via conditionKey) :
 *   >= 35 : "Émergeant" — experts pointent des incohérences (forte)
 *   >= 65 : "Actif"    — controverse publique (forte)
 *   >= 85 : "Crise"    — scandale statistique déclaré (critique)
 *
 * Aucun vrai exemple historique, aucune vraie polémique médicale.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";
import { DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";
import { DEFAULT_HEALTH_DATA_TRUST } from "@/logic/healthDataTrustEngine";
import { DEFAULT_UNDER_DETECTION_PRESSURE } from "@/logic/healthUnderDetectionEngine";

export const DEFAULT_STATISTICS_SCANDAL_PRESSURE = 10;

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeStatisticsScandalTarget(state: StrategyGameState): number {
  let pressure = 10;

  const hp        = state.hiddenPolitics;
  const pathology = state.discoursePathology;
  const mdq       = state.medicalDataQuality      ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const hosp      = state.hospitalPressure         ?? DEFAULT_HOSPITAL_PRESSURE;
  const delay     = state.healthReportingDelay    ?? DEFAULT_HEALTH_REPORTING_DELAY;
  const trust     = state.healthDataTrust          ?? DEFAULT_HEALTH_DATA_TRUST;
  const scandal   = hp?.scandalRisk                ?? 20;
  const media     = hp?.mediaMood                  ?? 55;
  const stability = hp?.institutionalStability     ?? 70;
  const underDet  = state.underDetectionPressure   ?? DEFAULT_UNDER_DETECTION_PRESSURE;

  // ── Facteurs aggravants ───────────────────────────────────────────────────

  // Habitude de minimiser — facteur principal de vulnérabilité
  const minimization = pathology?.minimization ?? 0;
  if      (minimization >= 50) pressure += 22;
  else if (minimization >= 30) pressure += 14;
  else if (minimization >= 15) pressure += 7;

  // Contradiction structurelle : pression élevée + communication rassurante
  if (hosp >= 61 && media >= 55) pressure += 15;
  else if (hosp >= 45 && media >= 60) pressure += 8;

  // Corrections tardives — données publiées avec retard
  if      (delay >= 22) pressure += 12;
  else if (delay >= 15) pressure += 7;
  else if (delay >= 10) pressure += 3;

  // Confiance déjà fragilisée — la presse cherche des confirmations
  if      (trust < 25) pressure += 14;
  else if (trust < 40) pressure += 8;
  else if (trust < 55) pressure += 3;

  // Contexte explosif — risque de scandale ambiant
  if      (scandal >= 65) pressure += 12;
  else if (scandal >= 45) pressure += 6;
  else if (scandal >= 35) pressure += 3;

  // Crise sanitaire cachée — le décalage entre réel et officiel est détectable
  if      (underDet >= 70) pressure += 10;
  else if (underDet >= 45) pressure += 5;

  // Rhétorique de bouc émissaire — aggrave la perception de dissimulation
  const scapegoating = pathology?.scapegoating ?? 0;
  if (scapegoating >= 30) pressure += 6;
  else if (scapegoating >= 15) pressure += 3;

  // ── Facteurs protecteurs ─────────────────────────────────────────────────

  // Confiance élevée — le discours officiel est cru
  if      (trust >= 75) pressure -= 12;
  else if (trust >= 60) pressure -= 6;

  // Discours cohérent et non-minimisant
  if (minimization < 5) pressure -= 8;
  else if (minimization < 10) pressure -= 4;

  // Données médicales fiables — moins de failles exploitables
  if      (mdq >= 75) pressure -= 8;
  else if (mdq >= 60) pressure -= 4;

  // Audit DIM récent — crédibilité renforcée
  const lastAudit   = state.lastDimAuditAt ?? -99;
  const auditRecent = (state.news.actionCount - lastAudit) <= 12;
  if (auditRecent) pressure -= 14;

  // Stabilité institutionnelle — résistance aux attaques médiatiques
  if      (stability >= 70) pressure -= 6;
  else if (stability >= 55) pressure -= 3;
  else if (stability < 30)  pressure += 5;

  // Veille sanitaire renforcée — moins d'écarts entre données officielles et réelles
  const surveillance = state.healthSurveillanceLevel ?? "faible";
  if      (surveillance === "crise")     pressure -= 10;
  else if (surveillance === "renforcee") pressure -= 6;
  else if (surveillance === "standard")  pressure -= 3;

  return Math.max(0, Math.min(100, pressure));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickStatisticsScandalPressure(state: StrategyGameState): StrategyGameState {
  const current = state.statisticsScandalPressure ?? DEFAULT_STATISTICS_SCANDAL_PRESSURE;
  const target  = computeStatisticsScandalTarget(state);
  const drift   = 3;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  return { ...state, statisticsScandalPressure: next };
}
