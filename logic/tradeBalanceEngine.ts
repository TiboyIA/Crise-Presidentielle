/**
 * tradeBalanceEngine.ts — Commerce extérieur et balance commerciale (MODE DELTA).
 *
 * Indicateur abstrait (-100 à +100) représentant la balance commerciale fictive.
 * Ne simule aucune devise réelle, aucun flux commercial réel, aucun partenaire
 * commercial obligatoire. Les échanges sont purement fictifs et agrégés.
 *
 * Augmente si : industrie forte, énergie stable, productivité élevée,
 *   export technologique, diplomatie active, chaînes robustes, réformes.
 * Baisse si : dépendance aux importations, crise énergétique, faible industrie,
 *   tensions diplomatiques, rupture transport, inflation forte, économie informelle.
 *
 * Seuils :
 *   ≥ 35   : Excédent commercial — dynamique exportatrice, économie renforcée
 *   10–34  : Balance favorable   — commerce sain, situation confortable
 *   -15–9  : Équilibre           — dépendances et exportations se compensent
 *   -45–-16: Déficit commercial  — pressions budgétaires, inflation importée
 *   ≤ -46  : Déficit chronique   — crise de souveraineté économique
 *
 * Effets quotidiens :
 *   ≥ 40 tous les 3 j : économie +1 (dynamique exportatrice)
 *   ≥ 50 tous les 5 j : stabilité institutionnelle +1 (crédibilité internationale)
 *   ≤ -35 tous les 4 j : publicBudget -1 (pression budgétaire des importations)
 *   ≤ -50 tous les 3 j : économie -1 (dépendance structurelle)
 *   ≤ -60 tous les 4 j : cohésion -1 (sentiment de perte de souveraineté)
 *   ≤ -60 tous les 6 j : popularFatigue +1
 */

import type { StrategyGameState } from "@/types/strategy";

export type TradeBalanceBand = "excedent" | "favorable" | "equilibre" | "deficit" | "chronique";

export interface TradeBalanceBandInfo {
  band:    TradeBalanceBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_TRADE_BALANCE = -5;

const BANDS: { threshold: number; info: TradeBalanceBandInfo }[] = [
  {
    threshold: 35,
    info: {
      band: "excedent", label: "Excédent commercial", color: "#4caf82",
      message: "Le pays exporte plus qu'il n'importe. L'industrie fictive est compétitive. L'économie nationale est renforcée et la crédibilité internationale progresse.",
    },
  },
  {
    threshold: 10,
    info: {
      band: "favorable", label: "Balance favorable", color: "#60a5fa",
      message: "La balance commerciale est légèrement positive. Le commerce extérieur soutient la dynamique économique sans créer de dépendance structurelle.",
    },
  },
  {
    threshold: -15,
    info: {
      band: "equilibre", label: "Équilibre commercial", color: "#e8c44f",
      message: "Les exportations et importations fictives se compensent. La situation est neutre mais fragile : une rupture dans les chaînes d'approvisionnement pourrait basculer la balance.",
    },
  },
  {
    threshold: -46,
    info: {
      band: "deficit", label: "Déficit commercial", color: "#e8864f",
      message: "Les importations dépassent les exportations. La pression budgétaire s'accroît et l'inflation importée grignote le pouvoir d'achat. Des mesures structurelles s'imposent.",
    },
  },
  {
    threshold: -100,
    info: {
      band: "chronique", label: "Déficit chronique", color: "#e54848",
      message: "Le déficit commercial est devenu structurel. La dépendance aux marchés extérieurs fictifs fragilise l'économie nationale. Une crise de souveraineté économique est en cours.",
    },
  },
];

export function getTradeBalanceBandInfo(value: number): TradeBalanceBandInfo {
  return (BANDS.find((b) => value >= b.threshold) ?? BANDS[BANDS.length - 1]).info;
}

// ── Calcul de la cible ────────────────────────────────────────────────────────

export function computeTradeBalanceTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const reforms   = state.reforms ?? [];
  const completed = state.strategyResearch?.completed ?? [];
  let target = 0;

  // Productivité — compétitivité-prix des exportations fictives
  const productivity = state.productivity ?? 50;
  if (productivity >= 75)      target += 12;
  else if (productivity >= 60) target +=  7;
  else if (productivity >= 50) target +=  3;
  else if (productivity <= 30) target -=  6;
  else if (productivity <= 40) target -=  3;

  // Économie — capacité industrielle et de production
  const economy = ind?.economy ?? 55;
  if (economy >= 70)      target +=  8;
  else if (economy >= 55) target +=  4;
  else if (economy < 30)  target -=  8;
  else if (economy < 45)  target -=  4;

  // Sécurité — environnement stable pour la production et les échanges
  const security = ind?.security ?? 50;
  if (security >= 65)     target +=  4;
  else if (security < 35) target -=  5;

  // Inflation — compétitivité-prix des exportations fictives
  const inflation = state.inflation ?? 25;
  if (inflation >= 65)      target -= 10;
  else if (inflation >= 50) target -=  6;
  else if (inflation >= 35) target -=  3;
  else if (inflation <= 20) target +=  4;

  // Confiance des investisseurs — signal de crédibilité pour les partenaires fictifs
  const investorConf = state.investorConfidence ?? 55;
  if (investorConf >= 70)      target +=  5;
  else if (investorConf >= 55) target +=  2;
  else if (investorConf <= 30) target -=  8;
  else if (investorConf <= 45) target -=  4;

  // Économie informelle — désavantage compétitif et sous-déclaration des exportations
  const shadow = state.shadowEconomy ?? 30;
  if (shadow >= 60)      target -=  8;
  else if (shadow >= 40) target -=  4;
  else if (shadow <= 20) target +=  4;

  // Énergie nationale — coût de production et potentiel d'exportation énergétique
  const energy = state.resources?.energy ?? 100;
  if (energy < 50)        target -=  8;
  else if (energy < 100)  target -=  3;
  else if (energy >= 200) target +=  5;

  // Réformes structurelles — capacité et positionnement exportateur
  if (reforms.some((r) => r.id === "industrie"    && r.applied)) target += 10;
  if (reforms.some((r) => r.id === "energie"      && r.applied)) target +=  8;
  if (reforms.some((r) => r.id === "diplomatique" && r.applied)) target +=  6;
  if (reforms.some((r) => r.id === "fiscal"       && r.applied)) target +=  3;

  // Recherches — modernisation industrielle et souveraineté technologique
  if (completed.includes("research_energy_sovereign")) target +=  8;
  if (completed.includes("research_digital_twin"))     target +=  5;
  if (completed.includes("research_admin_ai"))         target +=  3;

  // Relations diplomatiques — accords commerciaux fictifs et partenariats
  const relations = state.relations ?? [];
  const allies   = relations.filter((r) => r.status === "allied").length;
  const friendly = relations.filter((r) => r.status === "friendly").length;
  const hostile  = relations.filter((r) => r.status === "hostile").length;
  const rival    = relations.filter((r) => r.status === "rival").length;
  target += Math.min(allies * 2 + friendly, 8);
  target -= Math.min(hostile * 2 + rival,   8);

  // Chaînes d'approvisionnement — robustesse logistique et dépendances sectorielles
  const sc = state.supplyChain;
  if (sc) {
    // Énergie — capacité de production nationale et coûts d'exportation
    const energieSec = sc.energie;
    if (energieSec.disruptionRisk >= 80 && energieSec.stockLevel < 30)  target -= 15;
    else if (energieSec.disruptionRisk >= 60)                            target -=  8;
    else if (energieSec.disruptionRisk <= 25 && energieSec.domesticCapacity >= 60) target += 6;

    // Transport — fluidité des échanges commerciaux fictifs
    const transportSec = sc.transport;
    if (transportSec.disruptionRisk >= 70 && transportSec.stockLevel < 30) target -= 10;
    else if (transportSec.disruptionRisk >= 55)                             target -=  5;
    else if (transportSec.disruptionRisk <= 25)                             target +=  4;

    // Dépendance semi-conducteurs — vulnérabilité technologique aux importations
    const semiSec = sc.semi_conducteurs;
    if (semiSec.dependencyLevel >= 70)           target -=  6;
    else if (semiSec.dependencyLevel >= 50)      target -=  3;
    else if (semiSec.domesticCapacity >= 50)     target +=  4;

    // Alimentation — souveraineté agricole et potentiel exportateur
    const alimSec = sc.alimentation;
    if (alimSec.domesticCapacity >= 70)          target +=  4;
    else if (alimSec.domesticCapacity <= 30)     target -=  3;
  }

  return Math.max(-100, Math.min(100, target));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickTradeBalance(state: StrategyGameState): StrategyGameState {
  const current = state.tradeBalance ?? DEFAULT_TRADE_BALANCE;
  const target  = computeTradeBalanceTarget(state);
  const drift   = 4;

  let next = current;
  if (current < target) next = Math.min(target, current + drift);
  else if (current > target) next = Math.max(target, current - drift);

  let s: StrategyGameState = { ...state, tradeBalance: Math.round(next) };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;
  const ind = s.nationalIndicators;

  // Excédent commercial — dynamique économique positive (tous les 3 j)
  if (next >= 40 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.min(100, (ind?.economy ?? 55) + 1) } };
  }

  // Crédibilité commerciale internationale — confiance renforcée (tous les 5 j)
  if (next >= 50 && day % 5 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: Math.min(100, (hp?.institutionalStability ?? 70) + 1) } };
  }

  // Déficit commercial — pression budgétaire des importations (tous les 4 j)
  if (next <= -35 && day % 4 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, publicBudget: Math.max(-150, (s.nationalIndicators?.publicBudget ?? 20) - 1) } };
  }

  // Déficit chronique — économie fragilisée par la dépendance (tous les 3 j)
  if (next <= -50 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1) } };
  }

  // Crise de souveraineté économique — fracture sociale et sentiment de dépendance (tous les 4 j)
  if (next <= -60 && day % 4 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.max(0, (s.nationalIndicators?.cohesion ?? 60) - 1) } };
  }

  // Lassitude face à la dépendance — fatigue populaire (tous les 6 j)
  if (next <= -60 && day % 6 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1) } };
  }

  return s;
}
