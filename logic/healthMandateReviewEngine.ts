/**
 * healthMandateReviewEngine.ts — Bilan Sanitaire de Mandat.
 *
 * Calcule un bilan de la politique sanitaire du joueur à partir des
 * indicateurs de jeu. Aucune donnée médicale réelle, aucun jugement médical.
 *
 * Dérivé de :
 *   - medicalDataQuality, hospitalPressure, healthDataTrust
 *   - healthInteroperability, underDetectionPressure, statisticsScandalPressure
 *   - Nombre d'audits DIM lancés (log news)
 *   - Événements sanitaires vus (log news)
 *
 * 5 verdicts possibles :
 *   "Système sanitaire robuste"
 *   "Pilotage correct mais fragile"
 *   "Hôpitaux sous tension permanente"
 *   "Crise de confiance sanitaire"
 *   "État aveugle sur sa propre santé publique"
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";
import { DEFAULT_HEALTH_DATA_TRUST } from "@/logic/healthDataTrustEngine";
import { DEFAULT_HEALTH_INTEROPERABILITY } from "@/logic/healthInteroperabilityEngine";
import { DEFAULT_UNDER_DETECTION_PRESSURE } from "@/logic/healthUnderDetectionEngine";
import { DEFAULT_STATISTICS_SCANDAL_PRESSURE } from "@/logic/healthStatisticsScandalEngine";

export interface HealthMandateBilanMetric {
  label: string;
  value: string;
  color: string;
}

export interface HealthMandateBilan {
  verdictTitle:    string;
  verdictSubtitle: string;
  verdictColor:    string;
  score:           number;  // 0-100
  metrics:         HealthMandateBilanMetric[];
}

// ── IDs des événements sanitaires utilisés pour le décompte ──────────────────

const DETECTED_EARLY_IDS = new Set([
  "underdetection_signal_faible",
  "interop_degraded",
  "hospital_pressure_warning",
  "health_delay_high",
  "hospital_coding_audit",
  "health_trust_low",
]);

const DETECTED_LATE_IDS = new Set([
  "underdetection_crise_revelee",
  "underdetection_donnees_incoherentes",
  "health_scandal_crisis",
  "interop_crisis",
  "hospital_pressure_crisis",
  "health_delay_critical",
]);

// ── Calcul du bilan ───────────────────────────────────────────────────────────

export function computeHealthMandateBilan(state: StrategyGameState): HealthMandateBilan {
  const mdq       = state.medicalDataQuality      ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const hosp      = state.hospitalPressure         ?? DEFAULT_HOSPITAL_PRESSURE;
  const trust     = state.healthDataTrust          ?? DEFAULT_HEALTH_DATA_TRUST;
  const interop   = state.healthInteroperability   ?? DEFAULT_HEALTH_INTEROPERABILITY;
  const underDet  = state.underDetectionPressure   ?? DEFAULT_UNDER_DETECTION_PRESSURE;
  const scandal   = state.statisticsScandalPressure ?? DEFAULT_STATISTICS_SCANDAL_PRESSURE;
  const log       = state.news.log;

  // ── Décompte des événements ───────────────────────────────────────────────
  const seenSet      = new Set(state.news.seenIds);
  const detectedEarly  = [...DETECTED_EARLY_IDS].filter((id) => seenSet.has(id)).length;
  const detectedLate   = [...DETECTED_LATE_IDS].filter((id) => seenSet.has(id)).length;
  const auditsLaunched = log.filter((e) => e.eventId.startsWith("dim_audit_")).length;
  const surveillance   = state.healthSurveillanceLevel ?? "faible";

  // ── Score composite (0-100) ───────────────────────────────────────────────
  let score = 50;

  // Qualité des données
  if      (mdq >= 75) score += 15;
  else if (mdq >= 55) score += 8;
  else if (mdq < 30)  score -= 15;
  else if (mdq < 45)  score -= 8;

  // Pression hospitalière — moins c'est élevé, mieux c'est
  if      (hosp < 30) score += 12;
  else if (hosp < 45) score += 5;
  else if (hosp >= 81) score -= 18;
  else if (hosp >= 61) score -= 10;

  // Confiance dans les chiffres
  if      (trust >= 75) score += 12;
  else if (trust >= 55) score += 5;
  else if (trust < 30)  score -= 12;
  else if (trust < 45)  score -= 6;

  // Interopérabilité
  if      (interop >= 75) score += 8;
  else if (interop >= 55) score += 4;
  else if (interop < 30)  score -= 8;
  else if (interop < 40)  score -= 4;

  // Sous-détection finale
  if      (underDet >= 70) score -= 12;
  else if (underDet >= 45) score -= 6;
  else if (underDet < 20)  score += 8;

  // Scandale statistique
  if      (scandal >= 70) score -= 15;
  else if (scandal >= 45) score -= 8;
  else if (scandal < 20)  score += 6;

  // Audits lancés — bonne pratique
  if      (auditsLaunched >= 4) score += 8;
  else if (auditsLaunched >= 2) score += 4;

  // Veille sanitaire
  if      (surveillance === "crise")     score += 6;
  else if (surveillance === "renforcee") score += 4;
  else if (surveillance === "standard")  score += 2;

  // Crises détectées trop tard — pénalité
  score -= detectedLate * 4;

  score = Math.max(0, Math.min(100, score));

  // ── Verdict ───────────────────────────────────────────────────────────────
  const verdict = getHealthVerdict(score, hosp, trust, underDet, scandal);

  // ── Métriques affichées ───────────────────────────────────────────────────
  const metrics: HealthMandateBilanMetric[] = [
    {
      label: "Qualité des données médicales",
      value: `${Math.round(mdq)}/100`,
      color: mdq >= 70 ? "#4caf82" : mdq >= 50 ? "#8bc34a" : mdq < 30 ? "#e54848" : "#e8c44f",
    },
    {
      label: "Pression hospitalière finale",
      value: `${Math.round(hosp)}/100`,
      color: hosp < 35 ? "#4caf82" : hosp < 55 ? "#8bc34a" : hosp >= 81 ? "#e54848" : "#e8c44f",
    },
    {
      label: "Confiance dans les chiffres",
      value: `${Math.round(trust)}/100`,
      color: trust >= 70 ? "#4caf82" : trust >= 50 ? "#8bc34a" : trust < 30 ? "#e54848" : "#e8c44f",
    },
    {
      label: "Interopérabilité des systèmes",
      value: `${Math.round(interop)}/100`,
      color: interop >= 70 ? "#4caf82" : interop >= 50 ? "#8bc34a" : interop < 30 ? "#e54848" : "#e8c44f",
    },
    {
      label: "Crises sanitaires anticipées",
      value: detectedEarly > 0 ? `${detectedEarly}` : "Aucune",
      color: detectedEarly >= 3 ? "#4caf82" : detectedEarly >= 1 ? "#8bc34a" : "#8a8a9a",
    },
    {
      label: "Crises révélées trop tard",
      value: detectedLate > 0 ? `${detectedLate}` : "Aucune",
      color: detectedLate === 0 ? "#4caf82" : detectedLate <= 2 ? "#e8c44f" : "#e54848",
    },
    {
      label: "Audits DIM lancés",
      value: auditsLaunched > 0 ? `${auditsLaunched}` : "Aucun",
      color: auditsLaunched >= 3 ? "#4caf82" : auditsLaunched >= 1 ? "#4a9fff" : "#8a8a9a",
    },
    {
      label: "Niveau de veille sanitaire",
      value: surveillance === "faible" ? "Faible" : surveillance === "standard" ? "Standard" : surveillance === "renforcee" ? "Renforcée" : "Crise",
      color: surveillance === "faible" ? "#8a8a9a" : surveillance === "standard" ? "#4a9fff" : surveillance === "renforcee" ? "#8bc34a" : "#e8864f",
    },
  ];

  return {
    verdictTitle:    verdict.title,
    verdictSubtitle: verdict.subtitle,
    verdictColor:    verdict.color,
    score,
    metrics,
  };
}

// ── Sélection du verdict ──────────────────────────────────────────────────────

function getHealthVerdict(
  score: number,
  hosp: number,
  trust: number,
  underDet: number,
  scandal: number,
): { title: string; subtitle: string; color: string } {
  // Verdicts de contexte spécifique (priorité sur le score brut)
  if (scandal >= 65 || trust < 25) {
    return {
      title:    "Crise de confiance sanitaire",
      subtitle: "La crédibilité des données officielles est sérieusement compromise.",
      color:    "#e8864f",
    };
  }
  if (underDet >= 65) {
    return {
      title:    "État aveugle sur sa propre santé publique",
      subtitle: "Des crises sanitaires ont évolué hors du champ de vision de l'État.",
      color:    "#e54848",
    };
  }
  if (hosp >= 70) {
    return {
      title:    "Hôpitaux sous tension permanente",
      subtitle: "Le système de soins a fonctionné sous pression continue pendant le mandat.",
      color:    "#e8c44f",
    };
  }

  // Verdicts par score global
  if (score >= 72) {
    return {
      title:    "Système sanitaire robuste",
      subtitle: "Les données de santé sont fiables et le système de soins est maîtrisé.",
      color:    "#4caf82",
    };
  }
  return {
    title:    "Pilotage correct mais fragile",
    subtitle: "La politique sanitaire est acceptable mais des vulnérabilités persistent.",
    color:    "#4a9fff",
  };
}
