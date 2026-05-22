import type { CatBondTypeId, InsuranceProductId, StrategyGameState } from "@/types/strategy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskCategory =
  | "climat" | "cyber" | "dette" | "energie"
  | "social" | "militaire" | "diplomatique" | "industriel";

export type RiskStatus = "critique" | "eleve" | "modere" | "faible" | "couvert";

export interface RiskEntry {
  id: string;
  name: string;
  category: RiskCategory;
  probabilityScore: number;  // 0-100
  severityScore: number;     // 0-100
  expectedLoss: number;      // M€ — approx probabilité × gravité × exposition max
  coverageLevel: number;     // 0-100 — niveau de protection actuel
  mitigationActions: string[];
  status: RiskStatus;
}

export interface RiskRegister {
  risks: RiskEntry[];        // tous les risques, triés par expectedLoss desc
  topFive: RiskEntry[];
  globalRiskLevel: number;   // 0-100 — niveau agrégé
  criticalCount: number;
  coverageAvg: number;       // 0-100
}

// ── Palette statique ──────────────────────────────────────────────────────────

export const RISK_CATEGORY_COLORS: Record<RiskCategory, string> = {
  climat:      "#52c97a",
  cyber:       "#4a9fff",
  dette:       "#e8a93a",
  energie:     "#f59e0b",
  social:      "#a78bfa",
  militaire:   "#e54848",
  diplomatique:"#c9a84c",
  industriel:  "#94a3b8",
};

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  climat:      "Climat",
  cyber:       "Cyber",
  dette:       "Dette",
  energie:     "Énergie",
  social:      "Social",
  militaire:   "Militaire",
  diplomatique:"Diplomatique",
  industriel:  "Industriel",
};

export const RISK_STATUS_COLORS: Record<RiskStatus, string> = {
  critique: "#e54848",
  eleve:    "#e8a93a",
  modere:   "#f59e0b",
  faible:   "#3fbe7a",
  couvert:  "#4a9fff",
};

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  critique: "CRITIQUE",
  eleve:    "ÉLEVÉ",
  modere:   "MODÉRÉ",
  faible:   "FAIBLE",
  couvert:  "COUVERT",
};

// ── Helpers internes ──────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hasIns(state: StrategyGameState, id: InsuranceProductId): boolean {
  return (state.insurancePolicies ?? []).some((p) => p.productId === id && p.active);
}

function hasBond(state: StrategyGameState, id: CatBondTypeId): boolean {
  return (state.activeCatBonds ?? []).some((b) => !b.triggered && b.typeId === id);
}

function computeStatus(prob: number, sev: number, coverage: number): RiskStatus {
  if (coverage >= 70) return "couvert";
  const risk = (prob * sev) / 100;
  if (risk >= 55 && coverage < 30) return "critique";
  if (risk >= 38) return "eleve";
  if (risk >= 20) return "modere";
  return "faible";
}

function buildRisk(
  id: string,
  name: string,
  category: RiskCategory,
  probability: number,
  severity: number,
  coverage: number,
  baseMaxLoss: number,
  actions: string[],
): RiskEntry {
  const prob = Math.round(clamp(probability, 0, 100));
  const sev  = Math.round(clamp(severity,     0, 100));
  const cov  = Math.round(clamp(coverage,     0, 100));
  return {
    id, name, category,
    probabilityScore: prob,
    severityScore:    sev,
    expectedLoss:     Math.round((prob / 100) * (sev / 100) * baseMaxLoss),
    coverageLevel:    cov,
    mitigationActions: actions,
    status:           computeStatus(prob, sev, cov),
  };
}

// ── Moteur principal ──────────────────────────────────────────────────────────

export function computeRiskRegister(state: StrategyGameState): RiskRegister {
  const res    = state.resources;
  const ind    = state.nationalIndicators;
  const debt   = Math.max(0, state.nationalDebt ?? 0);
  const market = state.catBondMarket ?? { totalIssuances: 0, marketSkepticism: 0 };

  const hostileCount = (state.relations ?? []).filter((r) => r.status === "hostile").length;
  const rivalCount   = (state.relations ?? []).filter((r) => r.status === "rival").length;
  const maxThreat    = (state.relations ?? []).reduce((m, r) => Math.max(m, r.threatLevel), 0);

  const risks: RiskEntry[] = [

    // ── CYBER ────────────────────────────────────────────────────────────────
    buildRisk(
      "cyber_infra",
      "Attaque sur infrastructures critiques",
      "cyber",
      /* prob */ clamp(78 - res.cyberDefense * 0.5, 8, 92),
      /* sev  */ 80,
      /* cov  */ clamp(
        (res.cyberDefense / 150) * 50 +
        (hasIns(state, "cyber")      ? 28 : 0) +
        (hasBond(state, "cat_cyber") ? 22 : 0),
        0, 100,
      ),
      800,
      ["Renforcer la cyberdéfense", "Souscrire l'assurance cyber", "Émettre un Cat Bond Cyber"],
    ),
    buildRisk(
      "cyber_espionnage",
      "Exfiltration de données gouvernementales",
      "cyber",
      /* prob */ clamp(62 - res.intelligence / 3, 8, 85),
      /* sev  */ 58,
      /* cov  */ clamp(
        (res.cyberDefense / 150) * 55 +
        (res.intelligence / 200) * 30 +
        (hasIns(state, "cyber") ? 15 : 0),
        0, 100,
      ),
      380,
      ["Renforcer le renseignement", "Audits de sécurité internes", "Renforcer la cyberdéfense"],
    ),

    // ── CLIMAT ───────────────────────────────────────────────────────────────
    buildRisk(
      "climat_catastrophe",
      "Catastrophe climatique majeure",
      "climat",
      /* prob */ clamp((100 - ind.ecology) * 0.68, 4, 90),
      /* sev  */ 80,
      /* cov  */ clamp(
        (ind.ecology / 100) * 38 +
        (hasIns(state, "climat")        ? 35 : 0) +
        (hasBond(state, "cat_climat")   ? 27 : 0),
        0, 100,
      ),
      700,
      ["Améliorer le bilan écologique", "Souscrire l'assurance climatique", "Réformes environnementales"],
    ),
    buildRisk(
      "climat_ressources",
      "Pénurie de ressources naturelles",
      "climat",
      /* prob */ clamp((100 - ind.ecology) * 0.48, 4, 72),
      /* sev  */ 52,
      /* cov  */ clamp(
        (ind.ecology / 100) * 55 +
        (hasIns(state, "climat") ? 20 : 0),
        0, 100,
      ),
      340,
      ["Politiques de gestion des ressources", "Réformes écologiques"],
    ),

    // ── DETTE ────────────────────────────────────────────────────────────────
    buildRisk(
      "dette_refinancement",
      "Crise de refinancement souverain",
      "dette",
      /* prob */ clamp((debt / 1000) * 100, 0, 95),
      /* sev  */ 85,
      /* cov  */ clamp(
        clamp((1 - debt / 1500) * 50, 0, 50) +
        (hasIns(state, "dette") ? 35 : 0) +
        (market.marketSkepticism < 40 ? 15 : 0),
        0, 100,
      ),
      1200,
      ["Réduire la dette nationale", "Souscrire l'assurance dette", "Stabiliser les marchés"],
    ),
    buildRisk(
      "dette_notation",
      "Dégradation de la notation souveraine",
      "dette",
      /* prob */ clamp(
        (debt / 800) * 40 + clamp(-ind.publicBudget - 50, 0, 100) * 0.25,
        3, 78,
      ),
      /* sev  */ 50,
      /* cov  */ clamp(
        (ind.economy / 100) * 40 +
        (hasIns(state, "dette") ? 30 : 0),
        0, 100,
      ),
      380,
      ["Maintenir l'équilibre budgétaire", "Réformes fiscales"],
    ),

    // ── ÉNERGIE ──────────────────────────────────────────────────────────────
    buildRisk(
      "energie_rupture",
      "Rupture d'approvisionnement énergétique",
      "energie",
      /* prob */ clamp((300 - res.energy) / 3.5, 4, 90),
      /* sev  */ 70,
      /* cov  */ clamp(
        (res.energy / 300) * 45 +
        (hasIns(state, "energie")          ? 28 : 0) +
        (hasBond(state, "cat_energie")     ? 27 : 0),
        0, 100,
      ),
      600,
      ["Augmenter les réserves énergétiques", "Souscrire l'assurance énergie", "Diversifier les sources"],
    ),

    // ── SOCIAL ───────────────────────────────────────────────────────────────
    buildRisk(
      "social_crise",
      "Crise sociale généralisée",
      "social",
      /* prob */ clamp((100 - ind.cohesion) * 0.68, 4, 90),
      /* sev  */ 65,
      /* cov  */ clamp(
        (ind.cohesion / 100) * 45 +
        (ind.popularity / 100) * 15 +
        (hasIns(state, "troubles_sociaux") ? 30 : 0) +
        (ind.economy / 100) * 10,
        0, 100,
      ),
      500,
      ["Renforcer la cohésion sociale", "Souscrire l'assurance troubles sociaux", "Politiques sociales"],
    ),
    buildRisk(
      "social_contestation",
      "Mouvement de contestation populaire",
      "social",
      /* prob */ clamp((100 - ind.popularity) * 0.58, 4, 78),
      /* sev  */ 50,
      /* cov  */ clamp(
        (ind.popularity / 100) * 55 +
        (ind.cohesion / 100) * 25 +
        (hasIns(state, "troubles_sociaux") ? 20 : 0),
        0, 100,
      ),
      290,
      ["Améliorer la popularité", "Dialogue social renforcé"],
    ),

    // ── MILITAIRE ────────────────────────────────────────────────────────────
    buildRisk(
      "militaire_escalade",
      "Escalade militaire régionale",
      "militaire",
      /* prob */ clamp(hostileCount * 20 + rivalCount * 8 + maxThreat * 0.3, 4, 92),
      /* sev  */ 90,
      /* cov  */ clamp(
        (res.military / 200) * 60 +
        (res.intelligence / 200) * 20,
        0, 80,
      ),
      1500,
      ["Renforcer les forces armées", "Opérations diplomatiques de désescalade", "Renforcer le renseignement"],
    ),
    buildRisk(
      "militaire_ops",
      "Opération militaire adverse",
      "militaire",
      /* prob */ clamp(maxThreat * 0.65, 4, 78),
      /* sev  */ 62,
      /* cov  */ clamp(
        (res.military / 200) * 55 +
        (res.intelligence / 200) * 30,
        0, 85,
      ),
      580,
      ["Opérations de renseignement", "Renforcer la défense militaire"],
    ),

    // ── DIPLOMATIQUE ─────────────────────────────────────────────────────────
    buildRisk(
      "diplo_crise",
      "Crise diplomatique majeure",
      "diplomatique",
      /* prob */ clamp(hostileCount * 14 + rivalCount * 6 + clamp(50 - res.influence / 6, 0, 50), 2, 80),
      /* sev  */ 50,
      /* cov  */ clamp(
        (res.influence / 300) * 60 +
        clamp(100 - hostileCount * 20, 0, 40),
        0, 100,
      ),
      340,
      ["Renforcer les relations diplomatiques", "Opérations d'influence", "Traités bilatéraux"],
    ),
    buildRisk(
      "diplo_sanctions",
      "Sanctions économiques internationales",
      "diplomatique",
      /* prob */ clamp(hostileCount * 18 + rivalCount * 9, 0, 85),
      /* sev  */ 60,
      /* cov  */ clamp(
        (res.influence / 300) * 50 +
        (ind.economy / 100) * 30,
        0, 80,
      ),
      490,
      ["Normaliser les relations hostiles", "Négociations commerciales"],
    ),

    // ── INDUSTRIEL ───────────────────────────────────────────────────────────
    buildRisk(
      "indus_accident",
      "Accident industriel majeur",
      "industriel",
      /* prob */ clamp(52 - ind.economy * 0.28, 4, 78),
      /* sev  */ 63,
      /* cov  */ clamp(
        (ind.economy / 100) * 38 +
        (hasIns(state, "industrie") ? 40 : 0) +
        (res.technology / 200) * 22,
        0, 100,
      ),
      440,
      ["Renforcer les normes industrielles", "Souscrire l'assurance industrie"],
    ),
    buildRisk(
      "indus_chaine",
      "Défaillance chaîne d'approvisionnement",
      "industriel",
      /* prob */ clamp((100 - ind.economy) * 0.47 + clamp((300 - res.energy) / 12, 0, 25), 4, 74),
      /* sev  */ 53,
      /* cov  */ clamp(
        (ind.economy / 100) * 48 +
        (res.energy / 300) * 32,
        0, 80,
      ),
      340,
      ["Diversifier les fournisseurs", "Réformes industrielles", "Réserves stratégiques"],
    ),
  ];

  // Tri par perte estimée décroissante
  risks.sort((a, b) => b.expectedLoss - a.expectedLoss);

  const topFive       = risks.slice(0, 5);
  const criticalCount = risks.filter((r) => r.status === "critique").length;
  const globalRiskLevel = Math.round(
    risks.reduce((s, r) => s + (r.probabilityScore * r.severityScore) / 100, 0) / risks.length,
  );
  const coverageAvg = Math.round(risks.reduce((s, r) => s + r.coverageLevel, 0) / risks.length);

  return { risks, topFive, globalRiskLevel, criticalCount, coverageAvg };
}
