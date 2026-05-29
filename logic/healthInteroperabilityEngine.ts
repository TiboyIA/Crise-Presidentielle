/**
 * healthInteroperabilityEngine.ts — Interopérabilité des Systèmes de Santé.
 *
 * Jauge abstraite représentant la capacité des systèmes d'information sanitaire
 * à communiquer entre eux : échange de données, consolidation automatique,
 * cohérence des flux entre établissements, entre niveaux territoriaux et entre
 * systèmes administratifs.
 *
 * healthInteroperability (0-100) augmente avec :
 *   - Modernisation numérique (recherches complétées)
 *   - Cyberdéfense forte (intégrité des flux)
 *   - Moral administratif élevé (équipes capables de faire fonctionner les outils)
 *   - Stabilité institutionnelle (continuité des systèmes)
 *   - Réseau électrique stable (infrastructure de base)
 *   - Veille sanitaire renforcée (usage intensif des outils d'intégration)
 *
 * healthInteroperability diminue avec :
 *   - Cyberattaque (disruption des systèmes)
 *   - Blackout (panne réseau)
 *   - Crise hospitalière (surcharge qui dégrade la saisie et les échanges)
 *   - Retards de remontée importants (symptôme d'une intégration défaillante)
 *   - Moral administratif bas (agents incapables de maintenir les systèmes)
 *   - Ruptures systémiques (dégradation des infrastructures support)
 *
 * Effets :
 *   >= 80 : médicalDataQuality +10, healthReportingDelay -4
 *   >= 60 : médicalDataQuality +5,  healthReportingDelay -2
 *   < 30  : médicalDataQuality -8,  healthReportingDelay +4
 *   < 20  : médicalDataQuality -15, healthReportingDelay +8
 *
 * 5 bandes d'état :
 *   >= 80 : Optimale    — communication temps réel, données consolidées
 *   >= 60 : Satisfaisante — échanges fonctionnels, quelques frictions
 *   >= 40 : Dégradée    — silos, doublons, délais croissants
 *   >= 20 : Critique    — erreurs statistiques, données contradictoires
 *    < 20 : Rupture     — système d'information fracturé, décisions aveugles
 *
 * Aucun système informatique réel. Aucune donnée patient.
 */

import type { StrategyGameState } from "@/types/strategy";
import { DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";
import { DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";

export type InteroperabilityBand =
  | "optimale"
  | "satisfaisante"
  | "degradee"
  | "critique"
  | "rupture";

export interface InteroperabilityBandInfo {
  band:    InteroperabilityBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_HEALTH_INTEROPERABILITY = 52;

const BANDS: { threshold: number; info: InteroperabilityBandInfo }[] = [
  {
    threshold: 80,
    info: {
      band: "optimale", label: "Optimale", color: "#4caf82",
      message: "Les systèmes de santé communiquent en temps réel. Les données sont consolidées automatiquement et les décisions s'appuient sur une information complète et cohérente.",
    },
  },
  {
    threshold: 60,
    info: {
      band: "satisfaisante", label: "Satisfaisante", color: "#8bc34a",
      message: "L'interopérabilité est fonctionnelle. Des frictions ponctuelles existent mais n'affectent pas significativement la prise de décision.",
    },
  },
  {
    threshold: 40,
    info: {
      band: "degradee", label: "Dégradée", color: "#e8c44f",
      message: "Des silos de données persistent. Les échanges entre systèmes sont partiels, générant des doublons, des délais et des erreurs de codage difficiles à détecter.",
    },
  },
  {
    threshold: 20,
    info: {
      band: "critique", label: "Critique", color: "#e8864f",
      message: "Les systèmes communiquent mal entre eux. Des erreurs statistiques importantes apparaissent par manque d'intégration. Les décisions reposent sur des données partiellement contradictoires.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "rupture", label: "Rupture", color: "#e54848",
      message: "Le système d'information sanitaire est fracturé. Chaque établissement opère en silo complet. Les données agrégées sont largement fictives. Une crise d'information médicale est déclarée.",
    },
  },
];

export function getInteroperabilityBandInfo(value: number): InteroperabilityBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeInteroperabilityTarget(state: StrategyGameState): number {
  let score = 50;

  const hp         = state.hiddenPolitics;
  const res        = state.resources;
  const completed  = state.strategyResearch?.completed ?? [];
  const hosp       = state.hospitalPressure     ?? DEFAULT_HOSPITAL_PRESSURE;
  const delay      = state.healthReportingDelay ?? DEFAULT_HEALTH_REPORTING_DELAY;
  const mdq        = state.medicalDataQuality   ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const cyber      = res.cyberDefense;
  const grid       = state.gridStability        ?? 72;
  const morale     = state.administrationMorale ?? 60;
  const stability  = hp?.institutionalStability ?? 70;
  const bpStatuses = state.breakpoints?.statuses ?? {};
  const ruptures   = Object.values(bpStatuses).filter((s) => s === "rupture").length;

  // ── Facteurs positifs ─────────────────────────────────────────────────────

  // Modernisation numérique — facteur structurel majeur
  if (completed.includes("research_digital_twin"))       score += 18;
  if (completed.includes("research_datacenter_cooling")) score += 10;
  if (completed.includes("research_quantum_sensors"))    score += 6;

  // Cyberdéfense — intégrité et continuité des flux de données
  if      (cyber >= 70) score += 14;
  else if (cyber >= 50) score += 7;
  else if (cyber >= 35) score += 3;

  // Moral administratif — agents capables de faire fonctionner les outils
  if      (morale >= 75) score += 10;
  else if (morale >= 55) score += 5;

  // Stabilité institutionnelle — continuité des équipes et des processus
  if      (stability >= 75) score += 8;
  else if (stability >= 55) score += 4;

  // Réseau électrique stable — infrastructure de base des systèmes numériques
  if      (grid >= 75) score += 8;
  else if (grid >= 55) score += 4;

  // Veille sanitaire — usage intensif des outils d'intégration
  const surveillance = state.healthSurveillanceLevel ?? "faible";
  if      (surveillance === "crise")     score += 10;
  else if (surveillance === "renforcee") score += 6;
  else if (surveillance === "standard")  score += 3;

  // Qualité des données — feedback positif (bonne intégration = bonnes données)
  if      (mdq >= 75) score += 6;
  else if (mdq >= 60) score += 3;

  // Audit DIM récent — force la vérification des interfaces
  const lastAudit   = state.lastDimAuditAt ?? -99;
  const auditRecent = (state.news.actionCount - lastAudit) <= 15;
  if (auditRecent) score += 6;

  // ── Facteurs négatifs ─────────────────────────────────────────────────────

  // Cyberattaque — disruption des systèmes d'échange
  if      (cyber < 20) score -= 18;
  else if (cyber < 35) score -= 10;

  // Blackout — panne d'infrastructure
  if      (grid < 25) score -= 16;
  else if (grid < 40) score -= 8;

  // Crise hospitalière — surcharge qui dégrade la saisie et les échanges
  if      (hosp >= 81) score -= 14;
  else if (hosp >= 61) score -= 7;

  // Retards de remontée — symptôme d'une intégration défaillante
  if      (delay >= 22) score -= 10;
  else if (delay >= 15) score -= 5;

  // Moral administratif bas — agents dépassés, systèmes mal maintenus
  if      (morale < 25) score -= 14;
  else if (morale < 40) score -= 7;

  // Instabilité institutionnelle — turnover des équipes, rupture de continuité
  if      (stability < 25) score -= 12;
  else if (stability < 40) score -= 6;

  // Ruptures systémiques — dégradation des infrastructures support
  if      (ruptures >= 3) score -= 14;
  else if (ruptures === 2) score -= 8;
  else if (ruptures === 1) score -= 4;

  // Crises en attente — saturation des équipes techniques
  const pending = state.news.pendingIds.length;
  if      (pending >= 4) score -= 8;
  else if (pending >= 2) score -= 4;

  return Math.max(0, Math.min(100, score));
}

// ── Tick (per-day) ────────────────────────────────────────────────────────────

export function tickHealthInteroperability(state: StrategyGameState): StrategyGameState {
  const current = state.healthInteroperability ?? DEFAULT_HEALTH_INTEROPERABILITY;
  const target  = computeInteroperabilityTarget(state);
  const drift   = 3;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  return { ...state, healthInteroperability: next };
}
