/**
 * taxPolicyEngine.ts — Fiscalité dynamique nationale (MODE DELTA).
 *
 * Trois jauges abstraites (0-100) représentant la politique fiscale fictive.
 * Ne simule aucun barème fiscal réel, aucune loi de finances, aucun conseil fiscal.
 *
 * taxPressure   : niveau de pression fiscale globale
 * taxEfficiency : efficacité du recouvrement fiscal
 * fiscalConsent : consentement de la population à l'impôt
 *
 * Règles :
 *   taxPressure haute  → recettes court terme +, popularité -, économie -
 *   taxPressure basse  → popularité +, recettes -, possible + investissement
 *   taxEfficiency haute → plus de recettes sans augmenter la pression
 *   fiscalConsent bas  → fraude fictive, colère fiscale, économie informelle
 *
 * Seuils du consentement fiscal :
 *   0–25  : Crise fiscale — fraude massive, économie informelle critique
 *   26–45 : Colère fiscale — résistance croissante, recettes fictives en baisse
 *   46–70 : Consentement acceptable — situation stable mais fragile
 *   71–100: Consentement fort — coopération élevée, fraude marginale
 *
 * Effets quotidiens :
 *   taxPressure ≥ 75  tous les 3 j : popularité -1
 *   taxPressure ≥ 68  tous les 5 j : économie -1
 *   fiscalConsent ≤ 30 tous les 3 j : économie -1 (économie informelle)
 *   fiscalConsent ≤ 30 tous les 4 j : popularFatigue +1
 *   fiscalConsent ≤ 20 tous les 5 j : eliteTrust -1
 *   fiscalConsent ≥ 75 + taxPressure ≤ 52 tous les 7 j : économie +1 (cycle vertueux)
 */

import type { StrategyGameState } from "@/types/strategy";

export type FiscalConsentBand = "fort" | "acceptable" | "colere" | "crise";

export interface FiscalConsentBandInfo {
  band:    FiscalConsentBand;
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_TAX_PRESSURE   = 42;
export const DEFAULT_TAX_EFFICIENCY = 50;
export const DEFAULT_FISCAL_CONSENT = 62;

const CONSENT_BANDS: { threshold: number; info: FiscalConsentBandInfo }[] = [
  {
    threshold: 71,
    info: {
      band: "fort", label: "Consentement fort", color: "#4caf82",
      message: "Les citoyens acceptent l'effort fiscal. La coopération avec l'administration est élevée et la fraude reste marginale.",
    },
  },
  {
    threshold: 46,
    info: {
      band: "acceptable", label: "Consentement acceptable", color: "#e8c44f",
      message: "Le consentement fiscal est dans la norme. Une minorité résiste, mais la majorité respecte ses obligations fiscales.",
    },
  },
  {
    threshold: 26,
    info: {
      band: "colere", label: "Colère fiscale", color: "#e8864f",
      message: "La pression fiscale génère une résistance croissante. L'économie informelle gagne du terrain et les recettes fictives s'érodent.",
    },
  },
  {
    threshold: 0,
    info: {
      band: "crise", label: "Crise fiscale", color: "#e54848",
      message: "Le consentement fiscal s'est effondré. La fraude massive et l'économie souterraine menacent les finances publiques et la cohésion nationale.",
    },
  },
];

export function getFiscalConsentBandInfo(value: number): FiscalConsentBandInfo {
  return (CONSENT_BANDS.find((b) => value >= b.threshold) ?? CONSENT_BANDS[CONSENT_BANDS.length - 1]).info;
}

// ── Calcul des cibles ─────────────────────────────────────────────────────────

export function computeTaxPressureTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const completed = state.strategyResearch?.completed ?? [];
  let target = 42;

  // Dette élevée — pression à générer des recettes
  const debt = state.nationalDebt ?? 0;
  if (debt > 300)        target += 10;
  else if (debt > 200)   target +=  6;
  else if (debt > 100)   target +=  3;
  else if (debt < 60)    target -=  4;

  // Déficit budgétaire — besoin de recettes supplémentaires
  const budget = ind?.publicBudget ?? 20;
  if (budget < -80)      target +=  8;
  else if (budget < -30) target +=  4;
  else if (budget < 0)   target +=  2;
  else if (budget >= 30) target -=  3;

  // Ondes de crise — financement d'urgence exceptionnel
  const waveCount = (state.crisisWaves ?? []).filter((w) => w.intensity >= 40).length;
  if (waveCount >= 3)    target +=  5;
  else if (waveCount >= 1) target +=  2;

  // Économie faible — tentation de lever des ressources fiscales
  const economy = ind?.economy ?? 55;
  if (economy < 30)      target +=  4;
  else if (economy < 45) target +=  2;
  else if (economy >= 70) target -= 3;

  // Administration IA — collecte efficace sans hausse des taux
  if (completed.includes("research_admin_ai")) target -= 5;

  return Math.max(0, Math.min(100, target));
}

export function computeTaxEfficiencyTarget(state: StrategyGameState): number {
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];
  let target = 50;

  // Recherches — modernisation fiscale et numérique
  if (completed.includes("research_admin_ai"))     target += 14;
  if (completed.includes("research_digital_twin")) target +=  7;

  // Productivité — capacité administrative à collecter efficacement
  const productivity = state.productivity ?? 50;
  if (productivity >= 70)      target +=  6;
  else if (productivity >= 55) target +=  3;
  else if (productivity <= 30) target -=  5;

  // Économie — richesse disponible à taxer
  const economy = state.nationalIndicators?.economy ?? 55;
  if (economy >= 65)     target +=  4;
  else if (economy < 35) target -=  3;

  // Consentement fiscal — coopération vs fraude organisée
  const consent = state.fiscalConsent ?? DEFAULT_FISCAL_CONSENT;
  if (consent >= 70)      target +=  6;
  else if (consent >= 55) target +=  2;
  else if (consent <= 30) target -=  9;
  else if (consent <= 45) target -=  4;

  // Stabilité institutionnelle — capacité de l'appareil d'État
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 70)   target +=  4;
  else if (stability < 40) target -= 8;
  else if (stability < 55) target -= 3;

  return Math.max(0, Math.min(100, target));
}

export function computeFiscalConsentTarget(state: StrategyGameState): number {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  let target = 62;

  // Pression fiscale — déterminant principal du consentement
  const taxPressure = state.taxPressure ?? DEFAULT_TAX_PRESSURE;
  if (taxPressure >= 80)       target -= 18;
  else if (taxPressure >= 70)  target -= 10;
  else if (taxPressure >= 60)  target -=  5;
  else if (taxPressure >= 50)  target -=  2;
  else if (taxPressure <= 28)  target +=  5;
  else if (taxPressure <= 35)  target +=  2;

  // Efficacité fiscale — perception que les impôts sont bien utilisés
  const taxEfficiency = state.taxEfficiency ?? DEFAULT_TAX_EFFICIENCY;
  if (taxEfficiency >= 70)      target +=  9;
  else if (taxEfficiency >= 55) target +=  4;
  else if (taxEfficiency <= 30) target -= 11;
  else if (taxEfficiency <= 45) target -=  5;

  // Inflation — double peine perçue (salaires qui n'augmentent pas + impôts qui restent)
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)      target -=  9;
  else if (inflation >= 55) target -=  5;
  else if (inflation >= 40) target -=  2;
  else if (inflation <= 20) target +=  3;

  // Économie — prospérité réduit la résistance à l'impôt
  const economy = ind?.economy ?? 55;
  if (economy >= 70)      target +=  5;
  else if (economy >= 55) target +=  2;
  else if (economy < 35)  target -=  7;
  else if (economy < 45)  target -=  3;

  // Fatigue populaire — ras-le-bol fiscal latent
  const fatigue = hp?.popularFatigue ?? 15;
  if (fatigue > 70)      target -=  8;
  else if (fatigue > 50) target -=  4;
  else if (fatigue < 20) target +=  3;

  // Risque de scandale — perception de corruption ou de gaspillage public
  const scandalRisk = hp?.scandalRisk ?? 20;
  if (scandalRisk > 65)       target -=  9;
  else if (scandalRisk > 45)  target -=  4;
  else if (scandalRisk > 30)  target -=  2;
  else if (scandalRisk < 15)  target +=  3;

  // Humeur des médias — framing de l'effort fiscal
  const mediaMood = hp?.mediaMood ?? 55;
  if (mediaMood >= 65)    target +=  4;
  else if (mediaMood < 35) target -= 5;
  else if (mediaMood < 45) target -= 2;

  // Popularité — légitimité générale du gouvernement
  const popularity = ind?.popularity ?? 60;
  if (popularity >= 65)    target +=  3;
  else if (popularity < 35) target -= 5;
  else if (popularity < 45) target -= 2;

  return Math.max(0, Math.min(100, target));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickTaxPolicy(state: StrategyGameState): StrategyGameState {
  const taxPressure   = state.taxPressure   ?? DEFAULT_TAX_PRESSURE;
  const taxEfficiency = state.taxEfficiency ?? DEFAULT_TAX_EFFICIENCY;
  const fiscalConsent = state.fiscalConsent ?? DEFAULT_FISCAL_CONSENT;

  const targetP = computeTaxPressureTarget(state);
  const targetE = computeTaxEfficiencyTarget(state);
  const targetC = computeFiscalConsentTarget(state);

  const nextP = taxPressure   < targetP ? Math.min(targetP, taxPressure   + 2) : Math.max(targetP, taxPressure   - 2);
  const nextE = taxEfficiency < targetE ? Math.min(targetE, taxEfficiency + 3) : Math.max(targetE, taxEfficiency - 3);
  const nextC = fiscalConsent < targetC ? Math.min(targetC, fiscalConsent + 4) : Math.max(targetC, fiscalConsent - 4);

  let s: StrategyGameState = {
    ...state,
    taxPressure:   Math.round(nextP),
    taxEfficiency: Math.round(nextE),
    fiscalConsent: Math.round(nextC),
  };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;

  // Recettes fiscales — publicBudget selon pression et efficacité
  if (day % 4 === 0) {
    const budget = s.nationalIndicators?.publicBudget ?? 20;
    if (nextP >= 60 && nextE >= 65 && nextC >= 45) {
      s = { ...s, nationalIndicators: { ...s.nationalIndicators, publicBudget: Math.min(100, budget + 2) } };
    } else if (nextP >= 55 && nextE >= 50 && nextC >= 40) {
      s = { ...s, nationalIndicators: { ...s.nationalIndicators, publicBudget: Math.min(100, budget + 1) } };
    } else if (nextP <= 28) {
      s = { ...s, nationalIndicators: { ...s.nationalIndicators, publicBudget: Math.max(-150, budget - 1) } };
    }
  }

  // Efficacité fiscale élevée — bonus de recettes supplémentaires (tous les 6 j)
  if (nextE >= 75 && day % 6 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, publicBudget: Math.min(100, (s.nationalIndicators?.publicBudget ?? 20) + 1) } };
  }

  // Pression fiscale élevée — popularité en souffrance (tous les 3 j)
  if (nextP >= 75 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, popularity: Math.max(0, (s.nationalIndicators?.popularity ?? 60) - 1) } };
  }

  // Pression fiscale élevée — économie ralentie (tous les 5 j)
  if (nextP >= 68 && day % 5 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1) } };
  }

  // Consentement bas — économie informelle, recettes perdues (tous les 3 j)
  if (nextC <= 30 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1) } };
  }

  // Consentement bas — fatigue populaire croissante (tous les 4 j)
  if (nextC <= 30 && day % 4 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1) } };
  }

  // Consentement très bas — élites inquiètes (tous les 5 j)
  if (nextC <= 20 && day % 5 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, eliteTrust: Math.max(0, (s.hiddenPolitics?.eliteTrust ?? 65) - 1) } };
  }

  // Cycle vertueux — consentement fort + pression modérée → économie (tous les 7 j)
  if (nextC >= 75 && nextP <= 52 && day % 7 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.min(100, (s.nationalIndicators?.economy ?? 55) + 1) } };
  }

  return s;
}
