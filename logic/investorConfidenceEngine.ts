/**
 * investorConfidenceEngine.ts — Confiance des investisseurs (MODE DELTA).
 *
 * Jauge abstraite (0-100) de la confiance fictive des agents économiques
 * dans la trajectoire du pays. Ne simule aucun marché financier réel,
 * aucun trading, aucun conseil d'investissement.
 *
 * Augmente avec : stabilité institutionnelle, inflation maîtrisée, dette basse,
 *   productivité, réformes crédibles, sécurité, absence de scandal.
 * Baisse avec : crise politique, scandale, inflation forte, dette incontrôlée,
 *   instabilité sociale, contradictions présidentielles, décisions chaotiques.
 *
 * Seuils :
 *   0–20  : Fuite des capitaux     — désinvestissement fictif accéléré
 *   21–45 : Défiance               — investissements en recul
 *   46–70 : Neutre                 — attentisme, statu quo
 *   71–100: Forte confiance        — investissements actifs, croissance portée
 *
 * Effets quotidiens :
 *   ≥ 70 tous les 3 j : économie +1
 *   ≥ 75 tous les 5 j : publicBudget +1
 *   ≤ 25 tous les 3 j : économie -1
 *   ≤ 20 tous les 5 j : publicBudget -1
 *   ≤ 15 tous les 4 j : économie -1 supplémentaire (fuite des capitaux)
 *   ≤ 15 tous les 6 j : eliteTrust -1
 */

import type { StrategyGameState } from "@/types/strategy";

export type InvestorConfidenceBand = "forte" | "neutre" | "defiance" | "fuite";

export interface InvestorConfidenceBandInfo {
  band:    InvestorConfidenceBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_INVESTOR_CONFIDENCE = 55;

const BANDS: { threshold: number; info: InvestorConfidenceBandInfo }[] = [
  {
    threshold: 71,
    info: {
      band: "forte", label: "Forte confiance", color: "#4caf82",
      message: "Les marchés fictifs font confiance à la trajectoire nationale. Les investissements sont actifs et la croissance est soutenue.",
    },
  },
  {
    threshold: 46,
    info: {
      band: "neutre", label: "Neutre", color: "#60a5fa",
      message: "Les investisseurs adoptent une posture d'attente. Aucun signal fort ne les incite à accélérer ou à retirer leurs engagements.",
    },
  },
  {
    threshold: 21,
    info: {
      band: "defiance", label: "Défiance", color: "#e8c44f",
      message: "Les investisseurs font preuve de méfiance. Les projets sont gelés en attente d'un signal de stabilité claire du gouvernement.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "fuite", label: "Fuite des capitaux", color: "#e54848",
      message: "La confiance s'est effondrée. Un désinvestissement fictif massif est en cours. L'économie nationale est menacée de contraction structurelle.",
    },
  },
];

export function getInvestorConfidenceBandInfo(value: number): InvestorConfidenceBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeInvestorConfidenceTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const reforms   = state.reforms ?? [];
  const completed = state.strategyResearch?.completed ?? [];

  let target = 50;

  // Stabilité institutionnelle — prévisibilité réglementaire et juridique
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 75)         target += 10;
  else if (stability >= 60)    target +=  5;
  else if (stability < 40)     target -= 10;
  else if (stability < 55)     target -=  5;

  // Inflation — prévisibilité des prix et des coûts
  const inflation = state.inflation ?? 25;
  if (inflation <= 20)         target +=  8;
  else if (inflation <= 35)    target +=  4;
  else if (inflation >= 70)    target -= 12;
  else if (inflation >= 55)    target -=  7;
  else if (inflation >= 45)    target -=  3;

  // Dette nationale — crédibilité budgétaire perçue
  const debt = state.nationalDebt ?? 0;
  if (debt < 100)              target +=  5;
  else if (debt < 180)         target +=  2;
  else if (debt > 350)         target -= 12;
  else if (debt > 250)         target -=  6;
  else if (debt > 200)         target -=  3;

  // Productivité nationale — potentiel de croissance
  const productivity = state.productivity ?? 50;
  if (productivity >= 70)      target +=  7;
  else if (productivity >= 55) target +=  3;
  else if (productivity <= 25) target -=  8;
  else if (productivity <= 40) target -=  4;

  // Budget public — crédibilité fiscale
  const budget = ind?.publicBudget ?? 20;
  if (budget >= 20)            target +=  4;
  else if (budget >= 0)        target +=  2;
  else if (budget < -80)       target -=  8;
  else if (budget < -30)       target -=  4;

  // Économie nationale — dynamisme perçu
  const economy = ind?.economy ?? 55;
  if (economy >= 70)           target +=  6;
  else if (economy >= 55)      target +=  3;
  else if (economy < 30)       target -=  8;
  else if (economy < 45)       target -=  4;

  // Sécurité — protection des infrastructures et des actifs
  const security = ind?.security ?? 50;
  if (security >= 65)          target +=  4;
  else if (security < 35)      target -=  5;
  else if (security < 50)      target -=  2;

  // Risque de scandale — toxicité politique perçue
  const scandalRisk = hp?.scandalRisk ?? 20;
  if (scandalRisk < 25)        target +=  5;
  else if (scandalRisk > 70)   target -= 10;
  else if (scandalRisk > 50)   target -=  5;
  else if (scandalRisk > 35)   target -=  2;

  // Humeur des médias — couverture favorable ou hostile
  const mediaMood = hp?.mediaMood ?? 55;
  if (mediaMood >= 65)         target +=  4;
  else if (mediaMood < 30)     target -=  6;
  else if (mediaMood < 45)     target -=  3;

  // Fatigue populaire — instabilité sociale latente
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue < 25)            target +=  3;
  else if (fatigue > 70)       target -=  7;
  else if (fatigue > 50)       target -=  3;

  // Contradictions politiques — imprévisibilité du gouvernement
  const contradictionCount = (state.contradictionHistory ?? []).filter((c) => c.surfaced).length;
  if (contradictionCount >= 5)      target -= 8;
  else if (contradictionCount >= 3) target -= 4;
  else if (contradictionCount >= 1) target -= 2;

  // Réformes appliquées — crédibilité structurelle et engagement réformateur
  if (reforms.some((r) => r.id === "fiscal"    && r.applied)) target += 7;
  if (reforms.some((r) => r.id === "industrie" && r.applied)) target += 5;
  if (reforms.some((r) => r.id === "cyber"     && r.applied)) target += 3;
  if (reforms.some((r) => r.id === "energie"   && r.applied)) target += 3;

  // Pathologies du discours — toxicité rhétorique détectée par les marchés
  const pathology = state.discoursePathology;
  if (pathology) {
    if (pathology.doubleSpeak > 70 || pathology.contradictionRisk > 70) target -= 5;
    else if (pathology.doubleSpeak > 45 || pathology.contradictionRisk > 45) target -= 2;
  }

  // Chaînes d'approvisionnement — fiabilité de l'écosystème productif
  const sc = state.supplyChain;
  if (sc) {
    const ruptured = Object.values(sc).filter((s) => s.disruptionRisk >= 80 && s.stockLevel < 30).length;
    if (ruptured >= 3)      target -= 7;
    else if (ruptured >= 1) target -= 3;
  }

  // Opposition forte — instabilité politique perçue
  const opposition = state.oppositionPower ?? 35;
  if (opposition >= 75)    target -= 6;
  else if (opposition >= 55) target -= 3;

  // Recherches avancées — signal de modernisation
  if (completed.includes("research_digital_twin"))     target += 4;
  if (completed.includes("research_energy_sovereign")) target += 3;
  if (completed.includes("research_admin_ai"))         target += 2;

  return Math.max(0, Math.min(100, target));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickInvestorConfidence(state: StrategyGameState): StrategyGameState {
  const current = state.investorConfidence ?? DEFAULT_INVESTOR_CONFIDENCE;
  const target  = computeInvestorConfidenceTarget(state);
  const drift   = 4;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, investorConfidence: Math.round(next) };

  const day = s.mandateDay;
  const ind = s.nationalIndicators;
  const hp  = s.hiddenPolitics;

  // Forte confiance — économie portée par les investissements (tous les 3 j)
  if (day % 3 === 0) {
    if (next >= 70) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          economy: Math.min(100, (ind?.economy ?? 55) + 1),
        },
      };
    } else if (next <= 25) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          economy: Math.max(0, (ind?.economy ?? 55) - 1),
        },
      };
    }
  }

  // Recettes fiscales — budget public (tous les 5 j)
  if (day % 5 === 0) {
    const budget = s.nationalIndicators?.publicBudget ?? 20;
    if (next >= 75) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          publicBudget: Math.min(100, budget + 1),
        },
      };
    } else if (next <= 20) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          publicBudget: Math.max(-150, budget - 1),
        },
      };
    }
  }

  // Fuite des capitaux — effets accélérés sur l'économie et la confiance des élites
  if (next <= 15) {
    if (day % 4 === 0) {
      s = {
        ...s,
        nationalIndicators: {
          ...s.nationalIndicators,
          economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1),
        },
      };
    }
    if (day % 6 === 0) {
      s = {
        ...s,
        hiddenPolitics: {
          ...s.hiddenPolitics,
          eliteTrust: Math.max(0, (hp?.eliteTrust ?? 65) - 1),
        },
      };
    }
  }

  return s;
}
