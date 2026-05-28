/**
 * healthDataTrustEngine.ts — Confiance dans les Chiffres de Santé.
 *
 * Indicateur spécifique à la crédibilité des données sanitaires officielles :
 * confiance que la population, les médias et les élites accordent aux chiffres
 * publiés par l'État en matière de santé publique.
 *
 * healthDataTrust (0-100) augmente si :
 *   - Données cohérentes (DIM de qualité)
 *   - Communication transparente (climat médiatique favorable)
 *   - Audits réussis (codage hospitalier précis)
 *   - Crise bien anticipée (pression hospitalière faible)
 *   - Peu de corrections tardives (retard de remontée faible)
 *
 * healthDataTrust diminue si :
 *   - Chiffres contradictoires (DIM dégradée)
 *   - Retard de publication (données sanitaires en retard)
 *   - Erreur de codage (codage hospitalier défaillant)
 *   - Scandale hospitalier (pression en crise)
 *   - Données corrigées trop tard (retard critique)
 *   - Manipulation politique des chiffres (risque de scandale élevé)
 *
 * 5 bandes de confiance (messages de briefing) :
 *   ≥ 80 : Élevée — la population suit les consignes, coopération facilitée
 *   60–79 : Correcte — confiance satisfaisante, décisions acceptées
 *   40–59 : Fragile — scepticisme croissant, rumeurs émergentes
 *   20–39 : Faible — opposition active, médias hostiles, rumeurs structurées
 *    < 20 : Critique — crise de légitimité sanitaire, État discrédité
 *
 * Effets :
 *   ≥ 75 : popularFatigue -1/jour (population coopère mieux)
 *   ≤ 40 : scandalRisk +1/jour, mediaMood -1/jour
 *   ≤ 20 : institutionalStability -1/jour, scandalRisk +2/jour
 *
 * Aucune politique de santé réelle, aucune désinformation médicale,
 * aucune donnée personnelle.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";
import { DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";

export type HealthDataTrustBand =
  | "elevee"
  | "correcte"
  | "fragile"
  | "faible"
  | "critique";

export interface HealthDataTrustBandInfo {
  band:    HealthDataTrustBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_HEALTH_DATA_TRUST = 65;

// ── 5 messages de briefing ────────────────────────────────────────────────────
const BANDS: { threshold: number; info: HealthDataTrustBandInfo }[] = [
  {
    threshold: 80,
    info: {
      band: "elevee", label: "Élevée", color: "#4caf82",
      message: "La population fait confiance aux chiffres officiels de santé. Les consignes sanitaires sont suivies, les campagnes de prévention sont efficaces et la coopération avec l'État est forte.",
    },
  },
  {
    threshold: 60,
    info: {
      band: "correcte", label: "Correcte", color: "#8bc34a",
      message: "La confiance dans les données sanitaires officielles est satisfaisante. Les décisions sont acceptées par la majorité, même si quelques voix discordantes se font entendre.",
    },
  },
  {
    threshold: 40,
    info: {
      band: "fragile", label: "Fragile", color: "#e8c44f",
      message: "Un scepticisme croissant entoure les chiffres publiés. Des rumeurs circulent sur de possibles omissions ou corrections discrètes. La population commence à chercher des sources alternatives.",
    },
  },
  {
    threshold: 20,
    info: {
      band: "faible", label: "Faible", color: "#e8864f",
      message: "La confiance est sérieusement érodée. L'opposition exploite les incohérences, les médias deviennent hostiles. Des correctifs tardifs ou des révisions de chiffres ont alimenté la méfiance.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "critique", label: "Critique", color: "#e54848",
      message: "L'État a perdu sa crédibilité sur les données sanitaires. Une crise de légitimité est ouverte. Toute décision de santé publique sera contestée. Le risque de scandale politique majeur est imminent.",
    },
  },
];

export function getHealthDataTrustBandInfo(trust: number): HealthDataTrustBandInfo {
  return (BANDS.find((b) => trust >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeHealthDataTrustTarget(state: StrategyGameState): number {
  const hp  = state.hiddenPolitics;
  let trust = 65;

  // Données cohérentes — qualité de la Cellule DIM
  const mdq = state.medicalDataQuality ?? DEFAULT_MEDICAL_DATA_QUALITY;
  if (mdq >= 75) trust += 8;
  else if (mdq >= 55) trust += 3;
  else if (mdq < 30) trust -= 8;
  else if (mdq < 50) trust -= 4;

  // Audits réussis — précision du codage hospitalier
  const coding = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  if (coding >= 75) trust += 5;
  else if (coding >= 55) trust += 2;
  else if (coding < 30) trust -= 8;
  else if (coding < 50) trust -= 4;

  // Communication transparente — climat médiatique
  const media = hp?.mediaMood ?? 55;
  if (media >= 65) trust += 6;
  else if (media >= 50) trust += 2;
  else if (media < 30) trust -= 6;
  else if (media < 45) trust -= 3;

  // Crise bien anticipée — pression hospitalière faible
  const pressure = state.hospitalPressure ?? DEFAULT_HOSPITAL_PRESSURE;
  if (pressure < 30) trust += 5;
  else if (pressure < 50) trust += 1;
  else if (pressure >= 81) trust -= 10;
  else if (pressure >= 61) trust -= 5;

  // Peu de corrections tardives — délai de remontée faible
  const delay = state.healthReportingDelay ?? DEFAULT_HEALTH_REPORTING_DELAY;
  if (delay <= 5) trust += 6;
  else if (delay <= 10) trust += 2;
  else if (delay >= 20) trust -= 10;
  else if (delay >= 14) trust -= 5;

  // Manipulation politique — risque de scandale
  const scandal = hp?.scandalRisk ?? 20;
  if (scandal >= 65) trust -= 12;
  else if (scandal >= 45) trust -= 6;
  else if (scandal < 20) trust += 5;

  // Stabilité institutionnelle — continuité et cohérence des messages
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70) trust += 4;
  else if (stability < 30) trust -= 5;

  return Math.max(0, Math.min(100, trust));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickHealthDataTrust(state: StrategyGameState): StrategyGameState {
  const current = state.healthDataTrust ?? DEFAULT_HEALTH_DATA_TRUST;
  const target  = computeHealthDataTrustTarget(state);
  const drift   = 2;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, healthDataTrust: next };
  const hp = s.hiddenPolitics;

  // Confiance élevée — la population coopère, moins d'épuisement social
  if (next >= 75) {
    s = {
      ...s,
      hiddenPolitics: {
        ...hp,
        popularFatigue: Math.max(0, (hp?.popularFatigue ?? 15) - 1),
      },
    };
  }

  // Confiance fragile — scepticisme, opposition, médias hostiles
  if (next <= 40) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        scandalRisk: Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + 1),
        mediaMood:   Math.max(0,   (s.hiddenPolitics?.mediaMood   ?? 55) - 1),
      },
    };
  }

  // Crise de légitimité sanitaire
  if (next <= 20) {
    s = {
      ...s,
      hiddenPolitics: {
        ...s.hiddenPolitics,
        institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - 1),
        scandalRisk:            Math.min(100, (s.hiddenPolitics?.scandalRisk ?? 20) + 2),
      },
    };
  }

  return s;
}
