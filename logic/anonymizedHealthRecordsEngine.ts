/**
 * anonymizedHealthRecordsEngine.ts — Dossiers médicaux fictifs anonymisés.
 *
 * Génère des agrégats statistiques FICTIFS pour illustrer l'état du système
 * de santé dans le jeu. Aucune donnée réelle n'est utilisée ou produite.
 *
 * Les chiffres sont entièrement dérivés des indicateurs de jeu :
 *   hospitalPressure, medicalDataQuality, hospitalCodingQuality,
 *   healthReportingDelay, underDetectionPressure.
 *
 * Ce moteur ne simule pas une épidémie, un flux patient réel, ni aucun
 * processus médical. Il produit uniquement des textes narratifs fictifs
 * à usage d'interface de jeu.
 *
 * JAMAIS : nom, âge réel, adresse, numéro SS, pathologie réelle, donnée personnelle.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";
import { DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";
import { DEFAULT_UNDER_DETECTION_PRESSURE } from "@/logic/healthUnderDetectionEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeakSignal {
  code:     string;
  label:    string;
  severity: "bas" | "moyen" | "élevé";
  color:    string;
}

export interface DimReportSample {
  id:       string;
  title:    string;
  period:   string;
  summary:  string;
  status:   "normal" | "attention" | "alerte" | "critique";
  color:    string;
}

export interface AnonymizedHealthSnapshot {
  generatedAtDay:     number;
  // Agrégats fictifs
  urgencyPassages:    number;   // passages urgences / semaine (fictif)
  urgencyTrend:       "hausse" | "stable" | "baisse";
  weeklyFlux:         number;   // flux total entrées hospitalières (fictif)
  averageWaitMinutes: number;   // délai médian d'attente aux urgences (fictif)
  bedOccupancyRate:   number;   // taux d'occupation lits (fictif, 0-100)
  codingAnomalies:    number;   // dossiers avec anomalie de codage (fictif)
  codingAnomalyRate:  number;   // % du flux (fictif)
  weakSignals:        WeakSignal[];
  reportSamples:      DimReportSample[];  // 5 rapports DIM fictifs
}

// ── Calcul des agrégats fictifs ───────────────────────────────────────────────

function pseudoVariation(seed: number, amplitude: number): number {
  // Variation pseudo-déterministe — même seed → même résultat
  return Math.round((Math.sin(seed * 7.3 + 1.4) * 0.5 + 0.5) * amplitude - amplitude / 2);
}

export function generateHealthSnapshot(state: StrategyGameState): AnonymizedHealthSnapshot {
  const day      = state.mandateDay;
  const pressure = state.hospitalPressure    ?? DEFAULT_HOSPITAL_PRESSURE;
  const mdq      = state.medicalDataQuality  ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const coding   = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  const delay    = state.healthReportingDelay  ?? DEFAULT_HEALTH_REPORTING_DELAY;
  const underDet = state.underDetectionPressure ?? DEFAULT_UNDER_DETECTION_PRESSURE;

  // ── Passages urgences (fictif) ────────────────────────────────────────────
  const basePassages =
    pressure >= 81 ? 14200 :
    pressure >= 61 ? 10800 :
    pressure >= 40 ? 8100  :
    pressure >= 25 ? 6400  : 5200;
  const urgencyPassages = Math.max(1000, basePassages + pseudoVariation(day, 1200));

  const urgencyTrend: "hausse" | "stable" | "baisse" =
    pressure >= 61 ? "hausse" : pressure < 30 ? "baisse" : "stable";

  // ── Flux total (fictif) ───────────────────────────────────────────────────
  const weeklyFlux = Math.round(urgencyPassages * 3.2 + pseudoVariation(day + 1, 800));

  // ── Délai médian d'attente (fictif) ──────────────────────────────────────
  const baseWait =
    pressure >= 81 ? 340 :
    pressure >= 61 ? 210 :
    pressure >= 40 ? 130 : 85;
  const averageWaitMinutes = Math.max(40, baseWait + pseudoVariation(day + 2, 30));

  // ── Taux d'occupation lits (fictif) ──────────────────────────────────────
  const baseOccupancy =
    pressure >= 81 ? 97 :
    pressure >= 61 ? 92 :
    pressure >= 40 ? 85 :
    pressure >= 25 ? 78 : 72;
  const bedOccupancyRate = Math.min(100, Math.max(60, baseOccupancy + pseudoVariation(day + 3, 4)));

  // ── Anomalies de codage (fictif) ──────────────────────────────────────────
  const anomalyBasePct =
    coding < 20 ? 2.8 :
    coding < 35 ? 1.8 :
    coding < 50 ? 1.1 :
    coding < 65 ? 0.6 : 0.3;
  const underDetBonus = underDet >= 60 ? 0.6 : underDet >= 35 ? 0.3 : 0;
  const codingAnomalyRate = Math.min(5, anomalyBasePct + underDetBonus + pseudoVariation(day + 4, 10) / 100);
  const codingAnomalies   = Math.round((weeklyFlux * codingAnomalyRate) / 100);

  // ── Signaux faibles (fictif) ──────────────────────────────────────────────
  const weakSignals: WeakSignal[] = [];

  if (delay >= 14) {
    weakSignals.push({
      code:     "S-01",
      label:    `Retard de remontée des données : ${Math.round(delay)} actions en moyenne`,
      severity: delay >= 22 ? "élevé" : "moyen",
      color:    delay >= 22 ? "#e8864f" : "#e8c44f",
    });
  }
  if (coding < 50) {
    weakSignals.push({
      code:     "S-02",
      label:    "Écarts de codage non expliqués dans plusieurs établissements",
      severity: coding < 30 ? "élevé" : "moyen",
      color:    coding < 30 ? "#e8864f" : "#e8c44f",
    });
  }
  if (underDet >= 35) {
    weakSignals.push({
      code:     "S-03",
      label:    "Incohérences statistiques entre flux déclaré et flux estimé",
      severity: underDet >= 60 ? "élevé" : "bas",
      color:    underDet >= 60 ? "#e54848" : "#e8c44f",
    });
  }
  if (mdq < 45) {
    weakSignals.push({
      code:     "S-04",
      label:    "Qualité insuffisante des données DIM transmises au niveau national",
      severity: mdq < 25 ? "élevé" : "moyen",
      color:    mdq < 25 ? "#e8864f" : "#e8c44f",
    });
  }
  if (pressure >= 61 && delay >= 10) {
    weakSignals.push({
      code:     "S-05",
      label:    "Risque de sous-déclaration lié à la surcharge des équipes d'encodage",
      severity: "élevé",
      color:    "#e54848",
    });
  }

  // ── 5 rapports DIM fictifs ────────────────────────────────────────────────
  const reportSamples = generateReportSamples(state, {
    urgencyPassages, weeklyFlux, averageWaitMinutes,
    bedOccupancyRate, codingAnomalies, codingAnomalyRate, delay, pressure, coding, underDet,
  });

  return {
    generatedAtDay: day,
    urgencyPassages, urgencyTrend, weeklyFlux,
    averageWaitMinutes, bedOccupancyRate,
    codingAnomalies, codingAnomalyRate,
    weakSignals, reportSamples,
  };
}

// ── Générateur des 5 rapports DIM fictifs ─────────────────────────────────────

interface ReportCtx {
  urgencyPassages: number;
  weeklyFlux:      number;
  averageWaitMinutes: number;
  bedOccupancyRate: number;
  codingAnomalies: number;
  codingAnomalyRate: number;
  delay:    number;
  pressure: number;
  coding:   number;
  underDet: number;
}

function fmtWait(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h00`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("fr-FR");
}

function generateReportSamples(state: StrategyGameState, ctx: ReportCtx): DimReportSample[] {
  const { pressure, coding, delay, underDet, bedOccupancyRate,
          urgencyPassages, weeklyFlux, averageWaitMinutes,
          codingAnomalies, codingAnomalyRate } = ctx;
  const w = Math.ceil(state.mandateDay / 7) + 1;

  const samples: DimReportSample[] = [];

  // ── Rapport 1 — Synthèse hebdomadaire standard ────────────────────────────
  const r1status: DimReportSample["status"] =
    pressure >= 81 ? "critique" : pressure >= 61 ? "alerte" : pressure >= 40 ? "attention" : "normal";
  samples.push({
    id:     "dim_weekly_synthesis",
    title:  "Synthèse hebdomadaire DIM",
    period: `Semaine ${w} · Période ${Math.ceil(w / 4)}`,
    status: r1status,
    color:  r1status === "critique" ? "#e54848" : r1status === "alerte" ? "#e8864f" : r1status === "attention" ? "#e8c44f" : "#4caf82",
    summary:
      `FLUX GLOBAL : ${fmtNum(weeklyFlux)} entrées recensées cette semaine, dont ${fmtNum(urgencyPassages)} passages aux urgences ` +
      `(${pressure >= 61 ? "en hausse significative" : pressure < 30 ? "en diminution" : "stable"}). ` +
      `Délai médian d'attente : ${fmtWait(averageWaitMinutes)}. ` +
      `Taux d'occupation fictif des lits : ${bedOccupancyRate} %. ` +
      `${codingAnomalies} dossiers présentent une anomalie de codage (${codingAnomalyRate.toFixed(2)} % du flux). ` +
      `Qualité globale du signal : ${pressure >= 81 ? "dégradée — intervention requise" : pressure >= 61 ? "sous tension" : "satisfaisante"}.`,
  });

  // ── Rapport 2 — Analyse des délais de remontée ────────────────────────────
  const r2status: DimReportSample["status"] =
    delay >= 22 ? "critique" : delay >= 15 ? "alerte" : delay >= 10 ? "attention" : "normal";
  samples.push({
    id:     "dim_delay_analysis",
    title:  "Analyse des délais de remontée DIM",
    period: `Semaine ${w}`,
    status: r2status,
    color:  r2status === "critique" ? "#e54848" : r2status === "alerte" ? "#e8864f" : r2status === "attention" ? "#e8c44f" : "#4caf82",
    summary:
      `DÉLAIS DE REMONTÉE : délai moyen de transmission fictif de ${Math.round(delay)} unités. ` +
      `${delay >= 18
        ? `Situation préoccupante : ${Math.round(delay * 4.2)} établissements fictifs accusent un retard supérieur au seuil réglementaire. Les données des 72 dernières heures sont partiellement indisponibles au niveau agrégé.`
        : delay >= 10
        ? `Léger retard observé dans ${Math.round(delay * 2.1)} établissements fictifs. La consolidation nationale reste possible mais avec une marge d'incertitude accrue.`
        : `Les délais de remontée sont conformes aux objectifs. La consolidation nationale est disponible dans les délais habituels.`}`,
  });

  // ── Rapport 3 — Qualité du codage médico-administratif ───────────────────
  const r3status: DimReportSample["status"] =
    coding < 25 ? "critique" : coding < 45 ? "alerte" : coding < 60 ? "attention" : "normal";
  samples.push({
    id:     "dim_coding_quality",
    title:  "Qualité du codage médico-administratif",
    period: `Période ${Math.ceil(w / 4)} · Mois ${Math.ceil(state.mandateDay / 30)}`,
    status: r3status,
    color:  r3status === "critique" ? "#e54848" : r3status === "alerte" ? "#e8864f" : r3status === "attention" ? "#e8c44f" : "#4caf82",
    summary:
      `CODAGE : ${fmtNum(codingAnomalies)} dossiers fictifs présentent au moins une anomalie de codage ce cycle (${codingAnomalyRate.toFixed(2)} % du flux entrant). ` +
      `${coding < 35
        ? `Plusieurs catégories de diagnostics présentent des écarts systématiques non justifiés. La comparabilité des séries est compromise. Une révision des protocoles de codage est recommandée en urgence.`
        : coding < 55
        ? `Des incohérences ponctuelles ont été identifiées dans plusieurs groupes de séjour. Un programme de formation correctif est en cours d'élaboration.`
        : `Les indicateurs de qualité du codage se situent dans les marges acceptables. Des améliorations mineures restent possibles dans 2 à 3 groupes nosologiques fictifs.`}`,
  });

  // ── Rapport 4 — Signaux faibles et anomalies statistiques ────────────────
  const r4status: DimReportSample["status"] =
    underDet >= 85 ? "critique" : underDet >= 60 ? "alerte" : underDet >= 35 ? "attention" : "normal";
  samples.push({
    id:     "dim_weak_signals",
    title:  "Signaux faibles et anomalies statistiques",
    period: `Semaine ${w} · Rapport interne`,
    status: r4status,
    color:  r4status === "critique" ? "#e54848" : r4status === "alerte" ? "#e8864f" : r4status === "attention" ? "#e8c44f" : "#4caf82",
    summary:
      underDet >= 60
        ? `ALERTE INTERNE : une divergence significative entre le flux déclaré et le flux estimé par recoupement a été identifiée. L'écart fictif estimé représente entre ${Math.round(underDet * 0.3)} et ${Math.round(underDet * 0.5)} dossiers non retracés par semaine. Une investigation est en cours. Ce rapport est à diffusion restreinte.`
        : underDet >= 35
        ? `SIGNAL MODÉRÉ : des incohérences statistiques mineures ont été détectées dans ${Math.round(underDet / 8)} groupes de séjour fictifs. Aucune explication structurelle n'a encore été identifiée. Surveillance maintenue.`
        : `Aucun signal faible significatif détecté cette semaine. Les séries statistiques fictives sont cohérentes avec les tendances habituelles.`,
  });

  // ── Rapport 5 — Tension lits et gestion de flux ───────────────────────────
  const r5status: DimReportSample["status"] =
    bedOccupancyRate >= 97 ? "critique" : bedOccupancyRate >= 92 ? "alerte" : bedOccupancyRate >= 85 ? "attention" : "normal";
  samples.push({
    id:     "dim_bed_tension",
    title:  "Tension lits et gestion de flux",
    period: `Semaine ${w}`,
    status: r5status,
    color:  r5status === "critique" ? "#e54848" : r5status === "alerte" ? "#e8864f" : r5status === "attention" ? "#e8c44f" : "#4caf82",
    summary:
      `OCCUPATION : taux d'occupation fictif des lits à ${bedOccupancyRate} % cette semaine. ` +
      `${bedOccupancyRate >= 97
        ? `Saturation critique fictive : la marge de manœuvre est nulle dans plusieurs services. Les transferts fictifs inter-établissements ont atteint un niveau record. La capacité d'absorption supplémentaire est épuisée.`
        : bedOccupancyRate >= 92
        ? `Tension élevée fictive : la gestion des flux entrants nécessite une coordination renforcée. Des reports de prises en charge non urgentes ont été signalés dans ${Math.round((bedOccupancyRate - 85) * 1.5)} établissements fictifs.`
        : bedOccupancyRate >= 85
        ? `Occupation soutenue mais maîtrisée. La marge de sécurité reste suffisante pour absorber un pic de flux de faible amplitude.`
        : `Taux d'occupation confortable. Les services disposent d'une marge de sécurité satisfaisante.`}`,
  });

  return samples;
}
