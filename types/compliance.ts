export interface ComplianceState {
  complianceScore:       number; // 0-100 composite (recalculé à chaque tick)
  legalRisk:             number; // 0-100 — risque d'invalidation ou de poursuites
  auditPressure:         number; // 0-100 — pression des organes de contrôle
  corruptionExposure:    number; // 0-100 — exposition à des pratiques corruptives
  procurementIntegrity:  number; // 0-100 — intégrité des marchés publics
  emergencyPowersAbuse:  number; // 0-100 — dérive des pouvoirs d'exception
  whistleblowerRisk:     number; // 0-100 — probabilité de fuite interne
  lastAuditAt:           number; // mandateDay du dernier audit gouvernemental
}

export type ComplianceBand = "conforme" | "surveillance" | "risque" | "crise";

export interface ComplianceBandInfo {
  band:    ComplianceBand;
  label:   string;
  color:   string;
  message: string;
}
