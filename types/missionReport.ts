import type { OperationType, CountryId } from "@/types/strategy";

export type MissionClassification = "TOP SECRET" | "SECRET" | "CONFIDENTIEL";
export type MissionOutcome = "success" | "failure";
export type MissionPerspective = "player" | "enemy";

export interface MissionReportSections {
  objectif:       string;   // Section I — Objet et autorisation
  planification:  string;   // Section II — Planification opérationnelle
  execution:      string;   // Section III — Exécution et déroulement
  resultats:      string;   // Section IV — Résultats et évaluation
  recommandations: string;  // Section V — Recommandations et suites
}

export interface MissionReportOperative {
  unitsLabel:       string;  // "Section Alpha · 3 opérateurs"
  entryVector:      string;  // "Réseau numérique — vecteur de type spear-phishing"
  extractionStatus: string;  // "Extraction confirmée — aucune perte"
  coverStatus:      string;  // "Couverture préservée"
}

export interface MissionReportIntelligence {
  threatLevel:     string;  // "Élevée — contre-espionnage adverse actif"
  successRate:     number;  // probabilité estimée (0–1)
  weatherLabel:    string;  // "Brouillard dense"
  weatherImpact:   string;  // "Conditions favorables (+8 % discrétion)"
}

export interface MissionReport {
  id:               string;
  operationType:    OperationType;
  operationName:    string;
  targetCountryId:  CountryId;
  targetCountryName: string;
  mandateDay:       number;
  timestamp:        number;
  outcome:          MissionOutcome;
  classification:   MissionClassification;
  missionCode:      string;             // "OP-LOUP-027"
  narrativeTitle:   string;             // titre court (narratif)
  sections:         MissionReportSections;
  operative:        MissionReportOperative;
  intelligence:     MissionReportIntelligence;
  rewardsGained:    Partial<Record<string, number>>;
  costPaid:         Partial<Record<string, number>>;
  relationDelta:    number;
  rankingPoints:    number;
  // Champs optionnels pour les rapports d'opérations adverses
  perspective?:         MissionPerspective;
  attackerCountryId?:   CountryId;
  attackerCountryName?: string;
}
