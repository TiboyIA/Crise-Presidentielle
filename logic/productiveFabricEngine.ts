/**
 * productiveFabricEngine.ts — Tissu productif national (MODE DELTA).
 *
 * Cinq indicateurs abstraits (0-100) représentant la structure économique fictive :
 *   smeHealth          — santé des PME et TPE
 *   industrialChampions— grands groupes industriels nationaux
 *   startupEcosystem   — écosystème startup et innovation
 *   localCommerce      — commerce de proximité et économie locale
 *   strategicIndustry  — industrie stratégique et souveraineté économique
 *
 * Aucune gestion entreprise par entreprise. Aucun nom d'entreprise réel.
 * Aucune simulation financière. Indicateurs abstraits à portée stratégique.
 *
 * Effets :
 *   PME fortes     : chômage -, cohésion +
 *   Champions forts: économie +, balance commerciale +
 *   Startups fortes: productivité future +
 *   Commerce faible: fatigue populaire +, cohésion -
 *   Industrie forte: stabilité institutionnelle +
 *   Industrie faible: budget public -, balance commerciale -
 */

import type { StrategyGameState } from "@/types/strategy";

export interface ProductiveFabricState {
  smeHealth:           number; // Santé des PME — 0-100
  industrialChampions: number; // Grands groupes industriels — 0-100
  startupEcosystem:    number; // Écosystème startup — 0-100
  localCommerce:       number; // Commerce local — 0-100
  strategicIndustry:   number; // Industrie stratégique — 0-100
}

export const DEFAULT_PRODUCTIVE_FABRIC: ProductiveFabricState = {
  smeHealth:           55,
  industrialChampions: 50,
  startupEcosystem:    42,
  localCommerce:       58,
  strategicIndustry:   48,
};

export interface FabricBandInfo {
  label: string;
  color: string;
}

export function getFabricBandInfo(value: number): FabricBandInfo {
  if (value >= 71) return { label: "Fort",     color: "#4caf82" };
  if (value >= 51) return { label: "Correct",  color: "#e8c44f" };
  if (value >= 31) return { label: "Faible",   color: "#e8864f" };
  return                   { label: "Critique", color: "#e54848" };
}

// Seuil de visibilité du panel — un indicateur en zone remarquable
export function shouldShowFabricPanel(pf: ProductiveFabricState): boolean {
  return pf.smeHealth <= 40 || pf.industrialChampions <= 40
    || pf.startupEcosystem <= 35 || pf.startupEcosystem >= 65
    || pf.localCommerce <= 40 || pf.strategicIndustry <= 35;
}

// ── Cibles ───────────────────────────────────────────────────────────────────

export function computeSmeHealthTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];
  const pf        = state.productiveFabric ?? DEFAULT_PRODUCTIVE_FABRIC;
  let target = 55;

  // Dynamisme économique — marché porteur pour les PME
  const economy = ind?.economy ?? 55;
  if (economy >= 70)      target += 6;
  else if (economy >= 55) target += 3;
  else if (economy < 30)  target -= 8;
  else if (economy < 45)  target -= 4;

  // Chômage — contexte de marché du travail pour recrutement et demande locale
  const unemployment = state.unemployment ?? 25;
  if (unemployment >= 50)      target -= 8;
  else if (unemployment >= 35) target -= 4;
  else if (unemployment <= 12) target += 5;
  else if (unemployment <= 20) target += 2;

  // Inflation — coûts de production et pouvoir d'achat local
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)       target -= 8;
  else if (inflation >= 50)  target -= 4;
  else if (inflation >= 35)  target -= 2;
  else if (inflation <= 20)  target += 3;

  // Pression fiscale — charges pesant sur les structures fragiles
  const taxPressure = state.taxPressure ?? 42;
  if (taxPressure >= 70)      target -= 7;
  else if (taxPressure >= 55) target -= 3;
  else if (taxPressure <= 30) target += 5;
  else if (taxPressure <= 40) target += 2;

  // Consentement fiscal — stabilité du cadre fiscal perçu
  const fiscalConsent = state.fiscalConsent ?? 62;
  if (fiscalConsent >= 70)      target += 4;
  else if (fiscalConsent >= 55) target += 2;
  else if (fiscalConsent <= 30) target -= 6;
  else if (fiscalConsent <= 45) target -= 3;

  // Économie informelle — concurrence déloyale sur les PME formelles
  const shadowEconomy = state.shadowEconomy ?? 30;
  if (shadowEconomy >= 60)      target -= 6;
  else if (shadowEconomy >= 40) target -= 3;
  else if (shadowEconomy <= 15) target += 3;

  // Moral de l'administration — accès aux services, démarches fluides
  const adminMorale = state.administrationMorale ?? 60;
  if (adminMorale >= 70)      target += 4;
  else if (adminMorale <= 35) target -= 5;
  else if (adminMorale <= 50) target -= 2;

  // Pouvoir d'achat — demande locale, clientèle des PME
  const pp = state.purchasingPower ?? 60;
  if (pp >= 70)      target += 4;
  else if (pp <= 30) target -= 5;
  else if (pp <= 45) target -= 2;

  // Commerce local — économie de proximité interconnectée avec les PME
  if (pf.localCommerce <= 30) target -= 3;
  else if (pf.localCommerce >= 70) target += 2;

  // Réformes et recherches — simplification, accompagnement
  if (reforms.find((r) => r.id === "fiscal"  && r.applied)) target += 6;
  if (reforms.find((r) => r.id === "sociale" && r.applied)) target += 4;
  if (completed.includes("research_admin_ai"))               target += 5;

  return Math.max(0, Math.min(100, target));
}

export function computeIndustrialChampionsTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];
  const pf        = state.productiveFabric ?? DEFAULT_PRODUCTIVE_FABRIC;
  const relations = state.relations ?? [];
  let target = 50;

  // Économie nationale — performance globale bénéfique aux grands groupes
  const economy = ind?.economy ?? 55;
  if (economy >= 75)      target += 6;
  else if (economy >= 60) target += 3;
  else if (economy < 30)  target -= 8;
  else if (economy < 45)  target -= 4;

  // Balance commerciale — environnement export et compétitivité internationale
  const tb = state.tradeBalance ?? -5;
  if (tb >= 30)       target += 6;
  else if (tb >= 10)  target += 3;
  else if (tb <= -30) target -= 6;
  else if (tb <= -15) target -= 3;

  // Productivité — compétitivité des groupes nationaux
  const productivity = state.productivity ?? 50;
  if (productivity >= 75)      target += 7;
  else if (productivity >= 60) target += 4;
  else if (productivity <= 25) target -= 7;
  else if (productivity <= 40) target -= 3;

  // Confiance des investisseurs — capitaux et projets industriels
  const investorConf = state.investorConfidence ?? 55;
  if (investorConf >= 75)      target += 6;
  else if (investorConf >= 55) target += 3;
  else if (investorConf <= 25) target -= 7;
  else if (investorConf <= 40) target -= 3;

  // Industrie stratégique — synergie avec les champions nationaux
  if (pf.strategicIndustry >= 65) target += 5;
  else if (pf.strategicIndustry <= 25) target -= 4;

  // Chaînes d'approvisionnement — dépendances critiques
  const sc = state.supplyChain;
  if (sc) {
    if (sc.energie.disruptionRisk >= 70)              target -= 6;
    else if (sc.energie.disruptionRisk < 40 && sc.energie.stockLevel > 60) target += 4;
    if (sc.materiaux_critiques.dependencyLevel > 70)  target -= 4;
    if (sc.semi_conducteurs.dependencyLevel > 70)     target -= 3;
  }

  // Relations diplomatiques — accès aux marchés internationaux
  const allyCount = relations.filter((r) => r.status === "allied" || r.status === "friendly").length;
  const rivalCount = relations.filter((r) => r.status === "hostile" || r.status === "rival").length;
  target += Math.min(6, allyCount * 1);
  target -= Math.min(6, rivalCount * 2);

  // Réformes et recherches — compétitivité industrielle
  if (reforms.find((r) => r.id === "industrie"    && r.applied)) target += 10;
  if (reforms.find((r) => r.id === "diplomatique" && r.applied)) target +=  6;
  if (reforms.find((r) => r.id === "energie"      && r.applied)) target +=  5;
  if (completed.includes("research_energy_sovereign"))            target +=  6;
  if (completed.includes("research_digital_twin"))                target +=  5;

  return Math.max(0, Math.min(100, target));
}

export function computeStartupEcosystemTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];
  const pf        = state.productiveFabric ?? DEFAULT_PRODUCTIVE_FABRIC;
  let target = 42;

  // Technologie disponible — ressource clé pour l'écosystème
  const tech = state.resources?.technology ?? 100;
  if (tech > 200)      target += 6;
  else if (tech > 100) target += 3;
  else if (tech < 50)  target -= 4;

  // Recherches complétées — chaque recherche stimule l'innovation
  const researchBonus = Math.min(10, completed.length * 2);
  target += researchBonus;

  // Dynamisme économique — demande et débouchés pour les nouvelles entreprises
  const economy = ind?.economy ?? 55;
  if (economy >= 70)      target += 5;
  else if (economy >= 55) target += 3;
  else if (economy < 30)  target -= 6;
  else if (economy < 45)  target -= 3;

  // Inflation — financement difficile quand les coûts s'envolent
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)       target -= 7;
  else if (inflation >= 50)  target -= 3;
  else if (inflation <= 20)  target += 3;

  // Stabilité institutionnelle — prévisibilité du cadre réglementaire
  const stability = hp?.institutionalStability ?? 70;
  if (stability >= 75)      target += 5;
  else if (stability <= 30) target -= 6;
  else if (stability <= 50) target -= 3;

  // Confiance des investisseurs — accès au capital-risque fictif
  const investorConf = state.investorConfidence ?? 55;
  if (investorConf >= 75)      target += 8;
  else if (investorConf >= 55) target += 4;
  else if (investorConf <= 25) target -= 8;
  else if (investorConf <= 40) target -= 4;

  // Tissu PME — l'écosystème entrepreneur s'appuie sur un tissu sain
  if (pf.smeHealth >= 70) target += 3;

  // Réformes et recherches — cadre et incitations à l'innovation
  if (reforms.find((r) => r.id === "cyber"      && r.applied)) target += 7;
  if (reforms.find((r) => r.id === "education"  && r.applied)) target += 8;
  if (completed.includes("research_digital_twin"))              target += 5;
  if (completed.includes("research_admin_ai"))                  target += 3;

  return Math.max(0, Math.min(100, target));
}

export function computeLocalCommerceTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const hp        = state.hiddenPolitics;
  const pf        = state.productiveFabric ?? DEFAULT_PRODUCTIVE_FABRIC;
  let target = 58;

  // Pouvoir d'achat — moteur principal du commerce local
  const pp = state.purchasingPower ?? 60;
  if (pp >= 70)      target += 8;
  else if (pp >= 55) target += 4;
  else if (pp <= 30) target -= 10;
  else if (pp <= 45) target -=  5;

  // Chômage — population active, revenus disponibles
  const unemployment = state.unemployment ?? 25;
  if (unemployment >= 50)      target -= 7;
  else if (unemployment >= 35) target -= 3;
  else if (unemployment <= 12) target += 5;
  else if (unemployment <= 20) target += 2;

  // Inflation — érosion du budget disponible pour le commerce de proximité
  const inflation = state.inflation ?? 25;
  if (inflation >= 70)       target -= 7;
  else if (inflation >= 50)  target -= 4;
  else if (inflation <= 20)  target += 3;

  // Économie informelle — concurrence déloyale sur le commerce formel
  const shadowEconomy = state.shadowEconomy ?? 30;
  if (shadowEconomy >= 60)      target -= 6;
  else if (shadowEconomy >= 40) target -= 3;
  else if (shadowEconomy <= 15) target += 3;

  // PME — commerce local et PME forment un tissu économique solidaire
  if (pf.smeHealth >= 70)      target += 5;
  else if (pf.smeHealth <= 30) target -= 6;
  else if (pf.smeHealth <= 45) target -= 3;

  // Inégalités — fracture sociale réduit la demande locale dans les zones défavorisées
  const inequality = state.inequalityIndex ?? 35;
  if (inequality >= 65)      target -= 5;
  else if (inequality >= 50) target -= 2;
  else if (inequality <= 25) target += 3;

  // Moral de l'administration — fluidité des démarches pour les commerçants
  const adminMorale = state.administrationMorale ?? 60;
  if (adminMorale >= 70)      target += 3;
  else if (adminMorale <= 35) target -= 4;

  return Math.max(0, Math.min(100, target));
}

export function computeStrategicIndustryTarget(state: StrategyGameState): number {
  const ind       = state.nationalIndicators;
  const completed = state.strategyResearch?.completed ?? [];
  const reforms   = state.reforms ?? [];
  const pf        = state.productiveFabric ?? DEFAULT_PRODUCTIVE_FABRIC;
  let target = 48;

  // Approvisionnement énergétique — condition sine qua non de la production industrielle
  const sc = state.supplyChain;
  if (sc) {
    const en = sc.energie;
    if (en.disruptionRisk >= 70 && en.stockLevel < 30)        target -= 10;
    else if (en.disruptionRisk >= 55)                          target -=  5;
    else if (en.disruptionRisk < 30 && en.stockLevel > 60)    target +=  8;
    else if (en.disruptionRisk < 45 && en.stockLevel > 50)    target +=  4;
    // Matériaux critiques — dépendances géopolitiques
    if (sc.materiaux_critiques.dependencyLevel > 70)           target -=  6;
    else if (sc.materiaux_critiques.dependencyLevel < 40)      target +=  3;
    if (sc.semi_conducteurs.dependencyLevel > 70)              target -=  5;
  }

  // Balance commerciale — compétitivité industrielle et intégration internationale
  const tb = state.tradeBalance ?? -5;
  if (tb >= 30)       target += 5;
  else if (tb >= 10)  target += 2;
  else if (tb <= -30) target -= 5;
  else if (tb <= -15) target -= 2;

  // Confiance des investisseurs — financement des projets industriels lourds
  const investorConf = state.investorConfidence ?? 55;
  if (investorConf >= 70)      target += 5;
  else if (investorConf <= 30) target -= 6;
  else if (investorConf <= 45) target -= 3;

  // Sécurité nationale — stabilité nécessaire à l'investissement industriel
  const security = ind?.security ?? 50;
  if (security >= 70)      target += 3;
  else if (security <= 30) target -= 4;

  // Synergies avec les champions industriels
  if (pf.industrialChampions >= 65) target += 5;
  else if (pf.industrialChampions <= 25) target -= 4;

  // Réformes et recherches — souveraineté et compétitivité industrielle
  if (reforms.find((r) => r.id === "industrie" && r.applied)) target += 12;
  if (reforms.find((r) => r.id === "energie"   && r.applied)) target +=  8;
  if (completed.includes("research_energy_sovereign"))         target += 10;
  if (completed.includes("research_digital_twin"))             target +=  5;

  return Math.max(0, Math.min(100, target));
}

// ── Tick quotidien ────────────────────────────────────────────────────────────

export function tickProductiveFabric(state: StrategyGameState): StrategyGameState {
  const prev = state.productiveFabric ?? DEFAULT_PRODUCTIVE_FABRIC;
  const drift = 3;

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const move  = (current: number, target: number) =>
    current < target ? Math.min(target, current + drift) : Math.max(target, current - drift);

  const nextSme        = move(prev.smeHealth,           computeSmeHealthTarget(state));
  const nextChampions  = move(prev.industrialChampions, computeIndustrialChampionsTarget(state));
  const nextStartups   = move(prev.startupEcosystem,    computeStartupEcosystemTarget(state));
  const nextLocal      = move(prev.localCommerce,       computeLocalCommerceTarget(state));
  const nextStrategic  = move(prev.strategicIndustry,   computeStrategicIndustryTarget(state));

  let s: StrategyGameState = {
    ...state,
    productiveFabric: {
      smeHealth:           Math.round(clamp(nextSme)),
      industrialChampions: Math.round(clamp(nextChampions)),
      startupEcosystem:    Math.round(clamp(nextStartups)),
      localCommerce:       Math.round(clamp(nextLocal)),
      strategicIndustry:   Math.round(clamp(nextStrategic)),
    },
  };

  const day = s.mandateDay;
  const hp  = s.hiddenPolitics;
  const ind = s.nationalIndicators;

  // PME fortes — création d'emplois locaux (tous les 4 j)
  if (nextSme >= 70 && day % 4 === 0) {
    s = { ...s, unemployment: Math.max(0, (s.unemployment ?? 25) - 1) };
  }
  // PME fortes — cohésion sociale (tous les 5 j)
  if (nextSme >= 65 && day % 5 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.min(100, (ind?.cohesion ?? 60) + 1) } };
  }
  // PME en crise — chômage local (tous les 3 j)
  if (nextSme <= 30 && day % 3 === 0) {
    s = { ...s, unemployment: Math.min(100, (s.unemployment ?? 25) + 1) };
  }
  // PME en crise — fatigue populaire (tous les 4 j)
  if (nextSme <= 25 && day % 4 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (hp?.popularFatigue ?? 15) + 1) } };
  }

  // Champions industriels forts — économie nationale (tous les 4 j)
  if (nextChampions >= 70 && day % 4 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.min(100, (s.nationalIndicators?.economy ?? 55) + 1) } };
  }
  // Champions industriels forts — balance commerciale (tous les 6 j)
  if (nextChampions >= 70 && day % 6 === 0) {
    s = { ...s, tradeBalance: Math.min(100, (s.tradeBalance ?? -5) + 1) };
  }
  // Champions industriels faibles — économie (tous les 4 j)
  if (nextChampions <= 30 && day % 4 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, economy: Math.max(0, (s.nationalIndicators?.economy ?? 55) - 1) } };
  }

  // Startups fortes — productivité nationale (tous les 5 j)
  if (nextStartups >= 70 && day % 5 === 0) {
    s = { ...s, productivity: Math.min(100, (s.productivity ?? 50) + 1) };
  }

  // Commerce local faible — sentiment d'abandon, fatigue (tous les 3 j)
  if (nextLocal <= 30 && day % 3 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, popularFatigue: Math.min(100, (s.hiddenPolitics?.popularFatigue ?? 15) + 1) } };
  }
  // Commerce local en crise — cohésion (tous les 4 j)
  if (nextLocal <= 25 && day % 4 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.max(0, (s.nationalIndicators?.cohesion ?? 60) - 1) } };
  }
  // Commerce local fort — cohésion (tous les 5 j)
  if (nextLocal >= 75 && day % 5 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, cohesion: Math.min(100, (s.nationalIndicators?.cohesion ?? 60) + 1) } };
  }

  // Industrie stratégique forte — stabilité institutionnelle (tous les 5 j)
  if (nextStrategic >= 70 && day % 5 === 0) {
    s = { ...s, hiddenPolitics: { ...s.hiddenPolitics, institutionalStability: Math.min(100, (hp?.institutionalStability ?? 70) + 1) } };
  }
  // Industrie stratégique faible — budget public (dépendances d'importations coûteuses) (tous les 3 j)
  if (nextStrategic <= 25 && day % 3 === 0) {
    s = { ...s, nationalIndicators: { ...s.nationalIndicators, publicBudget: Math.max(-150, (ind?.publicBudget ?? 20) - 1) } };
  }
  // Industrie stratégique très faible — balance commerciale (tous les 4 j)
  if (nextStrategic <= 20 && day % 4 === 0) {
    s = { ...s, tradeBalance: Math.max(-100, (s.tradeBalance ?? -5) - 1) };
  }

  return s;
}
