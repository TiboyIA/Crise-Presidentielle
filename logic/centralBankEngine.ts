/**
 * centralBankEngine.ts — Banque centrale fictive indépendante (MODE DELTA).
 *
 * Trois indicateurs abstraits :
 *   interestRate          (0-100) — taux directeur fictif, 0=nul, 100=maximum restrictif
 *   centralBankCredibility (0-100) — crédibilité de l'institution
 *   monetaryTension        (0-100) — tension entre politique monétaire et politique budgétaire
 *
 * La banque réagit de façon autonome à l'inflation, au chômage et à la croissance.
 * Le joueur ne contrôle pas les taux directement. Ses actions sont indirectes :
 *   - respecter l'indépendance → crédibilité ↑, tension ↓
 *   - faire pression publiquement → crédibilité ↓, tension ↑
 *   - coordonner → tension ↓
 *   - nommer un gouverneur (profil) → influe sur le comportement futur des taux
 *
 * Effets des taux hauts (≥60) :
 *   inflation ↓, économie ralentit (pression emploi), signal de stabilité → investorConfidence ↑
 * Effets des taux bas (≤20) :
 *   économie stimulée, risque inflation ↑, marchés rassurent sur la croissance court terme
 *
 * Crédibilité haute → inflation ancrée, investorConfidence ↑
 * Crédibilité basse → marchés nerveux, monetaryTension ↑
 * Tension haute     → institutionalStability ↓, investorConfidence ↓
 */

import type { StrategyGameState } from "@/types/strategy";

export type CentralBankProfile = "hawkish" | "balanced" | "dovish";

export interface CentralBankBandInfo {
  label:   string;
  color:   string;
  message: string;
}

export const DEFAULT_INTEREST_RATE     = 30;
export const DEFAULT_CB_CREDIBILITY    = 65;
export const DEFAULT_MONETARY_TENSION  = 20;

// ── Bandes de lecture — taux directeur ───────────────────────────────────────

const RATE_BANDS: { threshold: number; info: CentralBankBandInfo }[] = [
  { threshold: 70, info: { label: "Politique restrictive", color: "#e54848", message: "Taux très élevés. La banque centrale combat activement l'inflation au prix d'un ralentissement de l'activité." } },
  { threshold: 50, info: { label: "Politique modérément restrictive", color: "#e8864f", message: "La banque centrale resserre progressivement sa politique monétaire. Pression sur le crédit et l'investissement." } },
  { threshold: 30, info: { label: "Politique neutre", color: "#e8c44f", message: "Taux équilibrés entre stabilité des prix et soutien à la croissance." } },
  { threshold: 0,  info: { label: "Politique accommodante", color: "#4caf82", message: "Taux bas. La banque centrale soutient la croissance et l'emploi. Risque inflationniste sur le long terme." } },
];

export function getInterestRateBandInfo(value: number): CentralBankBandInfo {
  return (RATE_BANDS.find((b) => value >= b.threshold) ?? RATE_BANDS[RATE_BANDS.length - 1]).info;
}

// ── Bandes de lecture — crédibilité ──────────────────────────────────────────

const CREDIBILITY_BANDS: { threshold: number; info: CentralBankBandInfo }[] = [
  { threshold: 70, info: { label: "Institution crédible", color: "#4caf82",  message: "La banque centrale bénéficie d'une forte confiance. Son mandat anti-inflation est ancré dans les anticipations des marchés." } },
  { threshold: 45, info: { label: "Crédibilité fragilisée", color: "#e8c44f", message: "La crédibilité de l'institution est sous pression. Les signaux de politique monétaire sont moins bien reçus." } },
  { threshold: 0,  info: { label: "Institution discréditée", color: "#e54848", message: "La banque centrale a perdu la confiance des marchés. L'inflation risque de dérailler. Les investisseurs fuient l'incertitude." } },
];

export function getCredibilityBandInfo(value: number): CentralBankBandInfo {
  return (CREDIBILITY_BANDS.find((b) => value >= b.threshold) ?? CREDIBILITY_BANDS[CREDIBILITY_BANDS.length - 1]).info;
}

// ── Calcul de la cible — taux directeur ──────────────────────────────────────

function computeInterestRateTarget(state: StrategyGameState): number {
  const inflation    = state.inflation ?? 25;
  const unemployment = state.unemployment ?? 25;
  const economy      = state.nationalIndicators?.economy ?? 55;
  const credibility  = state.centralBankCredibility ?? DEFAULT_CB_CREDIBILITY;
  const profile      = state.centralBankProfile ?? "balanced";

  let target = 30;

  // Réaction à l'inflation — mandat premier de la banque
  if (inflation >= 70)       target += 25;
  else if (inflation >= 55)  target += 15;
  else if (inflation >= 40)  target +=  8;
  else if (inflation <= 15)  target -= 10;
  else if (inflation <= 25)  target -=  5;

  // Réaction au chômage — mandat secondaire
  if (unemployment >= 50)       target -= 15;
  else if (unemployment >= 38)  target -=  8;
  else if (unemployment <= 10)  target +=  5;

  // Réaction à la dynamique économique
  if (economy < 30)       target -= 12;
  else if (economy < 45)  target -=  6;
  else if (economy >= 70) target +=  5;

  // Profil du gouverneur — influe sur le biais de la politique
  if (profile === "hawkish") target += 10;
  if (profile === "dovish")  target -= 10;

  // Crédibilité faible — la banque se montre plus restrictive pour regagner la confiance
  if (credibility <= 30)       target += 5;
  else if (credibility >= 80)  target -= 3;

  return Math.max(0, Math.min(100, target));
}

// ── Calcul de la cible — crédibilité ─────────────────────────────────────────

function computeCredibilityTarget(state: StrategyGameState): number {
  const inflation    = state.inflation ?? 25;
  const interestRate = state.interestRate ?? DEFAULT_INTEREST_RATE;
  const tension      = state.monetaryTension ?? DEFAULT_MONETARY_TENSION;
  const institutional = state.hiddenPolitics?.institutionalStability ?? 70;
  const scandalRisk   = state.hiddenPolitics?.scandalRisk ?? 20;
  const reforms       = state.reforms ?? [];

  let target = 65;

  // Inflation maîtrisée = mandat rempli
  if (inflation <= 20)       target += 12;
  else if (inflation <= 30)  target +=  6;
  else if (inflation >= 60)  target -= 10;
  else if (inflation >= 45)  target -=  5;

  // Cohérence taux/inflation — réaction crédible
  if (inflation >= 55 && interestRate >= 55) target += 5;
  if (inflation >= 55 && interestRate <= 25) target -= 10;

  // Tension politique — pression érode la crédibilité perçue
  if (tension >= 65)       target -= 15;
  else if (tension >= 45)  target -=  8;
  else if (tension >= 30)  target -=  3;
  else if (tension <= 15)  target +=  8;

  // Stabilité institutionnelle — les institutions solides protègent la banque
  if (institutional >= 70)       target +=  5;
  else if (institutional <= 35)  target -=  8;

  // Contagion par les scandales — perception d'une gouvernance défaillante
  if (scandalRisk >= 60)       target -= 5;
  else if (scandalRisk >= 40)  target -= 2;

  // Réforme institutionnelle — cadre légal renforcé
  if (reforms.find((r) => r.id === "fiscal" && r.applied)) target += 5;

  return Math.max(0, Math.min(100, target));
}

// ── Calcul de la cible — tension monétaire ───────────────────────────────────

function computeMonetaryTensionTarget(state: StrategyGameState): number {
  const interestRate  = state.interestRate ?? DEFAULT_INTEREST_RATE;
  const credibility   = state.centralBankCredibility ?? DEFAULT_CB_CREDIBILITY;
  const institutional = state.hiddenPolitics?.institutionalStability ?? 70;
  const fatigue       = state.hiddenPolitics?.popularFatigue ?? 15;
  const unemployment  = state.unemployment ?? 25;
  const programs      = state.fiscalPrograms ?? [];
  const shadowEco     = state.shadowEconomy ?? 30;

  let target = 20;

  // Taux hauts + chômage élevé = pression du gouvernement pour baisser les taux
  if (interestRate >= 55 && unemployment >= 40) target += 18;
  else if (interestRate >= 55 && unemployment >= 28) target += 10;
  else if (interestRate >= 60) target +=  8;

  // Fatigue populaire — gouvernement tenté d'intervenir sur la politique monétaire
  if (fatigue >= 65)       target += 12;
  else if (fatigue >= 45)  target +=  6;
  else if (fatigue <= 15)  target -=  5;

  // Programmes budgétaires actifs — impulsion divergente de la politique monétaire
  target += Math.min(15, programs.length * 4);

  // Économie informelle — instabilité structurelle augmente les frictions
  if (shadowEco >= 60)       target +=  8;
  else if (shadowEco >= 40)  target +=  3;

  // Crédibilité haute — amortit la tension institutionnelle
  if (credibility >= 75)       target -= 10;
  else if (credibility >= 55)  target -=  4;
  else if (credibility <= 30)  target += 10;

  // Stabilité institutionnelle — les institutions solides contiennent la friction
  if (institutional >= 70)       target -=  8;
  else if (institutional <= 35)  target += 10;

  return Math.max(0, Math.min(100, target));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickCentralBank(state: StrategyGameState): StrategyGameState {
  const currentRate        = state.interestRate ?? DEFAULT_INTEREST_RATE;
  const currentCredibility = state.centralBankCredibility ?? DEFAULT_CB_CREDIBILITY;
  const currentTension     = state.monetaryTension ?? DEFAULT_MONETARY_TENSION;

  const rateDrift        = 4;
  const credibilityDrift = 2;
  const tensionDrift     = 3;

  // Drift taux vers cible autonome
  const targetRate = computeInterestRateTarget(state);
  let nextRate = currentRate;
  if (currentRate < targetRate) nextRate = Math.min(targetRate, currentRate + rateDrift);
  else if (currentRate > targetRate) nextRate = Math.max(targetRate, currentRate - rateDrift);

  // Drift crédibilité
  const targetCredibility = computeCredibilityTarget(state);
  let nextCredibility = currentCredibility;
  if (currentCredibility < targetCredibility) nextCredibility = Math.min(targetCredibility, currentCredibility + credibilityDrift);
  else if (currentCredibility > targetCredibility) nextCredibility = Math.max(targetCredibility, currentCredibility - credibilityDrift);

  // Drift tension
  const targetTension = computeMonetaryTensionTarget(state);
  let nextTension = currentTension;
  if (currentTension < targetTension) nextTension = Math.min(targetTension, currentTension + tensionDrift);
  else if (currentTension > targetTension) nextTension = Math.max(targetTension, currentTension - tensionDrift);

  let s: StrategyGameState = {
    ...state,
    interestRate:          Math.round(nextRate),
    centralBankCredibility: Math.round(nextCredibility),
    monetaryTension:        Math.round(nextTension),
  };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;
  const ind = s.nationalIndicators;

  // ── Effets des taux hauts — politique restrictive ─────────────────────────

  // Taux élevés : compression de l'inflation (effet monétaire classique)
  if (nextRate >= 60 && day % 3 === 0) {
    s = { ...s, inflation: Math.max(0, (s.inflation ?? 25) - 1) };
  }

  // Taux très élevés : ralentissement économique — pression sur l'emploi
  if (nextRate >= 70 && day % 4 === 0) {
    s = { ...s, unemployment: Math.min(100, (s.unemployment ?? 25) + 1) };
  }

  // Taux élevés avec crédibilité haute : signal de stabilité, confiance marchés
  if (nextRate >= 55 && nextCredibility >= 60 && day % 5 === 0) {
    s = { ...s, investorConfidence: Math.min(100, (s.investorConfidence ?? 55) + 1) };
  }

  // ── Effets des taux bas — politique accommodante ──────────────────────────

  // Taux bas : risque inflationniste
  if (nextRate <= 20 && day % 3 === 0) {
    s = { ...s, inflation: Math.min(100, (s.inflation ?? 25) + 1) };
  }

  // Taux très bas : signal de soutien, court terme favorable aux marchés
  if (nextRate <= 15 && day % 5 === 0) {
    s = { ...s, investorConfidence: Math.min(100, (s.investorConfidence ?? 55) + 1) };
  }

  // ── Effets de la crédibilité ──────────────────────────────────────────────

  // Crédibilité haute : ancrage des anticipations, marchés confiants
  if (nextCredibility >= 70 && day % 5 === 0) {
    s = { ...s, investorConfidence: Math.min(100, (s.investorConfidence ?? 55) + 1) };
  }

  // Crédibilité haute : stabilisation institutionnelle
  if (nextCredibility >= 80 && day % 6 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: Math.min(100, (hp?.institutionalStability ?? 70) + 1) } };
  }

  // Crédibilité basse : marchés nerveux
  if (nextCredibility <= 30 && day % 3 === 0) {
    s = { ...s, investorConfidence: Math.max(0, (s.investorConfidence ?? 55) - 1) };
  }

  // Crédibilité très basse : la tension institutionnelle s'auto-entretient
  if (nextCredibility <= 25 && day % 4 === 0) {
    s = { ...s, monetaryTension: Math.min(100, s.monetaryTension! + 1) };
  }

  // ── Effets de la tension monétaire ────────────────────────────────────────

  // Tension élevée : friction qui érode la stabilité institutionnelle
  if (nextTension >= 70 && day % 3 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: Math.max(0, (s.hiddenPolitics?.institutionalStability ?? 70) - 1) } };
  }

  // Tension très élevée : les marchés perçoivent un risque de perte d'indépendance
  if (nextTension >= 80 && day % 3 === 0) {
    s = { ...s, investorConfidence: Math.max(0, (s.investorConfidence ?? 55) - 1) };
  }

  // Tension faible et crédibilité haute : confiance structurelle renforcée
  if (nextTension <= 15 && nextCredibility >= 70 && day % 6 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.min(100, (ind?.cohesion ?? 60) + 1) } };
  }

  return s;
}
