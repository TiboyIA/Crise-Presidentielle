/**
 * economyEngine.ts — Orchestrateur du Système Économique National V2.
 *
 * Produit un résumé lisible (EconomicOverview) à partir de tous les indicateurs
 * économiques actifs. Utilisé par le Dashboard, le Bilan de mandat et le sandbox.
 *
 * Ne simule aucune économie réelle. Aucun conseil financier.
 */

import type { StrategyGameState }         from "@/types/strategy";
import type { EconomicOverview, EconomicIndicatorSummary, EconomicGlobalBand } from "@/types/economy";
import { getInflationBandInfo,           DEFAULT_INFLATION }          from "@/logic/inflationEngine";
import { getPurchasingPowerBandInfo,     DEFAULT_PURCHASING_POWER }   from "@/logic/purchasingPowerEngine";
import { getUnemploymentBandInfo,        DEFAULT_UNEMPLOYMENT }       from "@/logic/laborMarketEngine";
import { getProductivityBandInfo,        DEFAULT_PRODUCTIVITY }       from "@/logic/productivityEngine";
import { getInvestorConfidenceBandInfo,  DEFAULT_INVESTOR_CONFIDENCE } from "@/logic/investorConfidenceEngine";
import { getFiscalConsentBandInfo,       DEFAULT_FISCAL_CONSENT }     from "@/logic/taxPolicyEngine";
import { getTradeBalanceBandInfo,        DEFAULT_TRADE_BALANCE }      from "@/logic/tradeBalanceEngine";
import { getStagflationBandInfo,         DEFAULT_STAGFLATION_INDEX }  from "@/logic/stagflationEngine";
import { CYCLE_META,                     DEFAULT_BUSINESS_CYCLE_PHASE } from "@/logic/businessCycleEngine";

// ── Score partiel par indicateur ──────────────────────────────────────────────

function scoreInflation(v: number): number {
  if (v < 35)  return 18;
  if (v < 60)  return 10;
  if (v < 80)  return 4;
  return 0;
}

function scoreUnemployment(v: number): number {
  if (v < 25)  return 18;
  if (v < 45)  return 12;
  if (v < 60)  return 5;
  return 0;
}

function scorePurchasingPower(v: number): number {
  if (v > 60)  return 14;
  if (v >= 40) return 9;
  if (v >= 25) return 4;
  return 0;
}

function scoreInvestorConf(v: number): number {
  if (v > 65)  return 14;
  if (v >= 45) return 9;
  if (v >= 25) return 4;
  return 0;
}

function scoreProductivity(v: number): number {
  if (v > 60)  return 10;
  if (v >= 40) return 6;
  if (v >= 25) return 3;
  return 0;
}

function scoreTradeBalance(v: number): number {
  if (v > 20)   return 8;
  if (v >= -10) return 5;
  if (v >= -40) return 2;
  return 0;
}

function scoreFiscalConsent(v: number): number {
  if (v > 60)  return 8;
  if (v >= 40) return 5;
  if (v >= 25) return 2;
  return 0;
}

function scoreStagflation(v: number): number {
  if (v < 20)  return 5;
  if (v < 50)  return 3;
  if (v < 75)  return 1;
  return 0;
}

function scoreCycle(phase: string): number {
  switch (phase) {
    case "expansion":     return 5;
    case "reprise":       return 4;
    case "ralentissement":return 2;
    case "surchauffe":    return 2;
    case "recession":     return 0;
    default:              return 3;
  }
}

// ── Bande globale ─────────────────────────────────────────────────────────────

function globalBandFromScore(score: number): { band: EconomicGlobalBand; label: string; color: string } {
  if (score >= 70) return { band: "bon",      label: "Économie saine",     color: "#4caf82" };
  if (score >= 45) return { band: "neutre",   label: "Situation neutre",   color: "#e8c44f" };
  if (score >= 25) return { band: "tendu",    label: "Tensions économiques", color: "#e8864f" };
  return              { band: "critique",  label: "Crise économique",   color: "#e54848" };
}

// ── Risque de stagflation ──────────────────────────────────────────────────────

type StagflationRisk = EconomicOverview["stagflationRisk"];
function stagflationRisk(v: number): StagflationRisk {
  if (v < 26) return "none";
  if (v < 51) return "emerging";
  if (v < 76) return "confirmed";
  return "severe";
}

// ── Export principal ──────────────────────────────────────────────────────────

export function computeEconomicOverview(state: StrategyGameState): EconomicOverview {
  const inflation        = state.inflation       ?? DEFAULT_INFLATION;
  const purchasingPower  = state.purchasingPower ?? DEFAULT_PURCHASING_POWER;
  const unemployment     = state.unemployment    ?? DEFAULT_UNEMPLOYMENT;
  const productivity     = state.productivity    ?? DEFAULT_PRODUCTIVITY;
  const investorConf     = state.investorConfidence ?? DEFAULT_INVESTOR_CONFIDENCE;
  const fiscalConsent    = state.fiscalConsent   ?? DEFAULT_FISCAL_CONSENT;
  const tradeBalance     = state.tradeBalance    ?? DEFAULT_TRADE_BALANCE;
  const stagflation      = state.stagflationIndex ?? DEFAULT_STAGFLATION_INDEX;
  const cyclePhase       = state.businessCyclePhase ?? DEFAULT_BUSINESS_CYCLE_PHASE;

  // Scores partiels (total max = 100)
  const globalScore = Math.round(
    scoreInflation(inflation) +
    scoreUnemployment(unemployment) +
    scorePurchasingPower(purchasingPower) +
    scoreInvestorConf(investorConf) +
    scoreProductivity(productivity) +
    scoreTradeBalance(tradeBalance) +
    scoreFiscalConsent(fiscalConsent) +
    scoreStagflation(stagflation) +
    scoreCycle(cyclePhase),
  );

  const { band: globalBand, label: globalLabel, color: globalColor } = globalBandFromScore(globalScore);

  // Indicateurs lisibles
  const indicators: EconomicIndicatorSummary[] = [
    {
      key: "inflation", label: "Inflation",
      value: inflation,
      bandLabel: getInflationBandInfo(inflation).label,
      color:     getInflationBandInfo(inflation).color,
      alerting:  inflation >= 60,
    },
    {
      key: "unemployment", label: "Chômage",
      value: unemployment,
      bandLabel: getUnemploymentBandInfo(unemployment).label,
      color:     getUnemploymentBandInfo(unemployment).color,
      alerting:  unemployment >= 50,
    },
    {
      key: "purchasingPower", label: "Pouvoir d'achat",
      value: purchasingPower,
      bandLabel: getPurchasingPowerBandInfo(purchasingPower).label,
      color:     getPurchasingPowerBandInfo(purchasingPower).color,
      alerting:  purchasingPower < 35,
    },
    {
      key: "investorConfidence", label: "Confiance marchés",
      value: investorConf,
      bandLabel: getInvestorConfidenceBandInfo(investorConf).label,
      color:     getInvestorConfidenceBandInfo(investorConf).color,
      alerting:  investorConf <= 25,
    },
    {
      key: "productivity", label: "Productivité",
      value: productivity,
      bandLabel: getProductivityBandInfo(productivity).label,
      color:     getProductivityBandInfo(productivity).color,
      alerting:  productivity < 30,
    },
    {
      key: "tradeBalance", label: "Balance commerciale",
      value: tradeBalance,
      bandLabel: getTradeBalanceBandInfo(tradeBalance).label,
      color:     getTradeBalanceBandInfo(tradeBalance).color,
      alerting:  tradeBalance <= -40,
    },
    {
      key: "fiscalConsent", label: "Consentement fiscal",
      value: fiscalConsent,
      bandLabel: getFiscalConsentBandInfo(fiscalConsent).label,
      color:     getFiscalConsentBandInfo(fiscalConsent).color,
      alerting:  fiscalConsent < 30,
    },
    {
      key: "stagflation", label: "Risque de stagflation",
      value: stagflation,
      bandLabel: getStagflationBandInfo(stagflation).label,
      color:     getStagflationBandInfo(stagflation).color,
      alerting:  stagflation >= 50,
    },
  ];

  // Alertes actives
  const activeAlerts: string[] = [];
  if (inflation >= 60)        activeAlerts.push("Inflation forte");
  if (unemployment >= 55)     activeAlerts.push("Chômage en hausse");
  if (purchasingPower < 35)   activeAlerts.push("Pouvoir d'achat dégradé");
  if (investorConf <= 25)     activeAlerts.push("Défiance des marchés");
  if (stagflation >= 50)      activeAlerts.push("Risque de stagflation critique");
  if (cyclePhase === "recession")   activeAlerts.push("Récession en cours");
  if (cyclePhase === "surchauffe")  activeAlerts.push("Surchauffe économique");
  if (tradeBalance <= -40)    activeAlerts.push("Déficit commercial lourd");

  const cycleMeta = CYCLE_META[cyclePhase];

  return {
    globalScore,
    globalBand,
    globalLabel,
    globalColor,
    indicators,
    activeAlerts,
    cyclePhase,
    cycleLabel: cycleMeta.label,
    cycleColor: cycleMeta.color,
    stagflationRisk: stagflationRisk(stagflation),
  };
}
