/**
 * types/economy.ts — Types d'affichage pour le Système Économique National V2.
 *
 * Ce fichier définit les structures de données LISIBLES utilisées dans le
 * dashboard, le bilan de mandat et le journal de crise.
 * Il ne contient aucun calcul économique — voir logic/economyEngine.ts.
 */

export interface EconomicIndicatorSummary {
  key:       string;
  label:     string;
  value:     number;
  bandLabel: string;
  color:     string;
  alerting:  boolean;
}

export type EconomicGlobalBand = "bon" | "neutre" | "tendu" | "critique";

export interface EconomicOverview {
  /** Score composite 0-100 de l'état économique global. */
  globalScore: number;
  globalBand:  EconomicGlobalBand;
  globalLabel: string;
  globalColor: string;
  /** Liste ordonnée des indicateurs économiques principaux. */
  indicators:  EconomicIndicatorSummary[];
  /** Messages d'alerte actifs (indicateurs critiques). */
  activeAlerts: string[];
  /** Phase du cycle économique. */
  cyclePhase:  string;
  cycleLabel:  string;
  cycleColor:  string;
  /** Indice de stagflation résumé. */
  stagflationRisk: "none" | "emerging" | "confirmed" | "severe";
}
