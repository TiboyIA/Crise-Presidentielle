/**
 * healthUnderDetectionEngine.ts — Sous-détection sanitaire.
 *
 * Mécanique de crise sanitaire cachée : si les données sont mauvaises
 * et la pression hospitalière élevée, une crise peut rester invisible
 * et gagner en intensité avant d'éclater.
 *
 * underDetectionPressure (0-100) augmente si :
 *   - medicalDataQuality basse (données peu fiables)
 *   - hospitalPressure élevée (système sous tension)
 *   - healthReportingDelay élevé (informations tardives)
 *   - cyberDefense faible (systèmes vulnérables)
 *   - gridStability faible (données corrompues par instabilité)
 *   - healthDataTrust faible (signaux ignorés)
 *   - scandalRisk élevé (contexte politique défavorable)
 *
 * underDetectionPressure diminue si :
 *   - medicalDataQuality élevée (données fiables)
 *   - hospitalPressure faible (système stable)
 *   - hospitalCodingQuality élevée (codage précis)
 *   - healthDataTrust élevée
 *   - cyberDefense forte
 *   - audit DIM récent (lastDimAuditAt dans les 15 dernières actions)
 *   - institutionalStability élevée
 *
 * La pression déclenche 3 paliers d'événements Journal (via conditionKey) :
 *   >= 35 : "signal faible"  — anomalie statistique détectée
 *   >= 60 : "données incohérentes" — investigation requise
 *   >= 85 : "crise révélée tardivement" — révélation critique
 *
 * Aucune maladie nommée, aucune simulation médicale, aucun conseil médical.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";
import { DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";
import { DEFAULT_HEALTH_DATA_TRUST } from "@/logic/healthDataTrustEngine";

export const DEFAULT_UNDER_DETECTION_PRESSURE = 15;

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeUnderDetectionTarget(state: StrategyGameState): number {
  let pressure = 20; // pression de base

  const mdq       = state.medicalDataQuality      ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const coding    = state.hospitalCodingQuality   ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  const delay     = state.healthReportingDelay    ?? DEFAULT_HEALTH_REPORTING_DELAY;
  const hosp      = state.hospitalPressure         ?? DEFAULT_HOSPITAL_PRESSURE;
  const trust     = state.healthDataTrust          ?? DEFAULT_HEALTH_DATA_TRUST;
  const hp        = state.hiddenPolitics;
  const cyber     = state.resources.cyberDefense;
  const grid      = state.gridStability            ?? 72;
  const stability = hp?.institutionalStability     ?? 70;
  const scandal   = hp?.scandalRisk                ?? 20;

  // ── Facteurs aggravants ───────────────────────────────────────────────────

  // Qualité des données médicales
  if      (mdq < 20) pressure += 22;
  else if (mdq < 35) pressure += 14;
  else if (mdq < 50) pressure += 7;

  // Pression hospitalière
  if      (hosp >= 81) pressure += 18;
  else if (hosp >= 61) pressure += 10;
  else if (hosp >= 45) pressure += 4;

  // Retard de remontée
  if      (delay >= 22) pressure += 14;
  else if (delay >= 15) pressure += 7;
  else if (delay >= 10) pressure += 3;

  // Confiance faible → signaux ignorés ou mal interprétés
  if      (trust < 25) pressure += 10;
  else if (trust < 40) pressure += 5;

  // Cyberdéfense faible → vulnérabilité des systèmes de collecte
  if      (cyber < 20) pressure += 8;
  else if (cyber < 35) pressure += 4;

  // Réseau électrique instable → données corrompues
  if      (grid < 30) pressure += 6;
  else if (grid < 50) pressure += 3;

  // Contexte politique défavorable
  if (scandal >= 60) pressure += 6;
  else if (scandal >= 40) pressure += 3;

  // ── Facteurs protecteurs ─────────────────────────────────────────────────

  // Données médicales fiables
  if      (mdq >= 75) pressure -= 16;
  else if (mdq >= 60) pressure -= 8;

  // Pression hospitalière faible
  if      (hosp < 25) pressure -= 14;
  else if (hosp < 35) pressure -= 7;

  // Codage hospitalier précis
  if      (coding >= 75) pressure -= 10;
  else if (coding >= 55) pressure -= 5;

  // Confiance élevée
  if      (trust >= 75) pressure -= 10;
  else if (trust >= 60) pressure -= 5;

  // Cyberdéfense solide
  if      (cyber >= 65) pressure -= 8;
  else if (cyber >= 45) pressure -= 4;

  // Audit DIM récent — protection majeure
  const lastAudit   = state.lastDimAuditAt ?? -99;
  const auditRecent = (state.news.actionCount - lastAudit) <= 15;
  if (auditRecent) pressure -= 18;

  // Stabilité institutionnelle
  if      (stability >= 70) pressure -= 7;
  else if (stability >= 55) pressure -= 3;
  else if (stability < 35)  pressure += 5;

  return Math.max(0, Math.min(100, pressure));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickHealthUnderDetection(state: StrategyGameState): StrategyGameState {
  const current = state.underDetectionPressure ?? DEFAULT_UNDER_DETECTION_PRESSURE;
  const target  = computeUnderDetectionTarget(state);
  const drift   = 4;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  return { ...state, underDetectionPressure: next };
}
