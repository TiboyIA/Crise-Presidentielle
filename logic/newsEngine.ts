import { NEWS_EVENTS } from "@/data/newsEvents";
import type { NewsEvent, NewsLogEntry, NewsState, StrategyGameState, StrategyResources } from "@/types/strategy";
import { computeNationalTension } from "@/logic/tensionEngine";
import { applyCooldownFilter, rarityScoreBonus } from "@/logic/rarityEngine";

// ── Profil de faiblesses joueur ───────────────────────────────────────────────
//
// Utilisé pour pondérer légèrement la sélection des crises sans la forcer.
// Les seuils sont intentionnellement larges (ex. cyberDefense < 50, pas < 30)
// pour détecter les faiblesses "en voie de", pas seulement les situations
// critiques déjà capturées par evaluateConditions().
//
// La pondération (weaknessWeight) ajoute au plus +8 au score d'un événement.
// Le bonus conditionKey existant (+10) reste dominant : un événement déclenché
// par une condition explicite prend toujours le dessus. Le pool aléatoire (top-5)
// est conservé pour garantir la variété et éviter une sélection 100% déterministe.

export interface WeaknessProfile {
  cyber: boolean;       // cyberDefense < 50
  money: boolean;       // money < 1 500
  security: boolean;    // indicators.security < 45
  highDebt: boolean;    // nationalDebt > 250
  cohesion: boolean;    // indicators.cohesion < 45
  diplomacy: boolean;   // influence < 200
  energy: boolean;      // resources.energy < 100
  opposition: boolean;  // oppositionPower >= 50
}

export function computePlayerWeaknessProfile(state: StrategyGameState): WeaknessProfile {
  const r   = state.resources;
  const ind = state.nationalIndicators ?? { popularity: 60, economy: 55, security: 50, ecology: 45, cohesion: 60, publicBudget: 20 };
  return {
    cyber:      r.cyberDefense < 50,
    money:      r.money < 1_500,
    security:   ind.security < 45,
    highDebt:   (state.nationalDebt ?? 0) > 250,
    cohesion:   ind.cohesion < 45,
    diplomacy:  r.influence < 200,
    energy:     r.energy < 100,
    opposition: (state.oppositionPower ?? 35) >= 50,
  };
}

// Retourne un bonus de pertinence (0–8) pour un événement donné vis-à-vis du
// profil de faiblesses. Plafonné à 8 pour rester sous le bonus conditionKey (+10).
function weaknessWeight(event: NewsEvent, profile: WeaknessProfile): number {
  let bonus = 0;

  // Bonus par type d'événement ─────────────────────────────────────
  if (profile.cyber      && event.type === "cyber")          bonus += 4;
  if (profile.money      && event.type === "economie")       bonus += 4;
  if (profile.cohesion   && event.type === "social")         bonus += 4;
  if (profile.diplomacy  && event.type === "diplomatie")     bonus += 4;
  if (profile.security   && event.type === "guerre_hybride") bonus += 3;
  if (profile.energy     && event.type === "guerre_hybride") bonus += 2;
  if (profile.opposition && event.type === "national")       bonus += 2;

  // Bonus par conditionKey spécifique (cumule avec le type) ─────────
  if (profile.highDebt   && event.conditionKey === "budget_crisis")        bonus += 3;
  if (profile.security   && event.conditionKey === "low_security")         bonus += 3;
  if (profile.opposition && event.conditionKey === "high_opposition")      bonus += 3;
  if (profile.energy     && event.conditionKey === "no_energy_sovereign")  bonus += 3;
  if (profile.cyber      && event.conditionKey === "low_cyber")            bonus += 3;
  if (profile.money      && event.conditionKey === "low_money")            bonus += 3;
  if (profile.cohesion   && event.conditionKey === "low_cohesion")         bonus += 3;

  return Math.min(bonus, 8);
}

const MINOR_NEWS_EVERY = 4;   // non-interactive every N actions
const MAJOR_NEWS_EVERY = 12;  // interactive every N actions
const MAX_LOG = 30;           // keep last N in log

export function shouldTriggerNews(news: NewsState, actionCount: number): boolean {
  return actionCount - news.lastNewsAction >= MINOR_NEWS_EVERY;
}

export function shouldTriggerInteractiveNews(news: NewsState, actionCount: number): boolean {
  return actionCount - news.lastNewsAction >= MAJOR_NEWS_EVERY;
}

export function selectNextNews(
  state: StrategyGameState,
  forceInteractive = false,
): NewsEvent | null {
  const { news, stats, ranking } = state;
  const seenSet = new Set(news.seenIds);

  // Evaluate explicit conditions and player weakness profile
  const conditionResults = evaluateConditions(state);
  const weakProfile = computePlayerWeaknessProfile(state);
  const tension = computeNationalTension(state);

  // Filter candidates
  const candidates = NEWS_EVENTS.filter((e) => {
    if (seenSet.has(e.id)) return false;
    if (e.conditionKey && !conditionResults[e.conditionKey]) return false;
    if (forceInteractive && !e.isInteractive) return false;
    return true;
  });

  // Filtre de rareté : retire les événements en cooldown (common = jamais filtré)
  const cooldownFiltered = applyCooldownFilter(candidates.map((e) => e.id), news.log);
  const rarityFiltered   = candidates.filter((e) => cooldownFiltered.includes(e.id));
  const pool             = rarityFiltered.length > 0 ? rarityFiltered : candidates;

  if (pool.length === 0) {
    // Fallback: reset seen and try again (excluding log entries from last session)
    const recentSeen = new Set(news.log.slice(-10).map((l) => l.eventId));
    const fallback = NEWS_EVENTS.filter(
      (e) => !recentSeen.has(e.id) && (!forceInteractive || e.isInteractive),
    );
    return fallback[0] ?? null;
  }

  // Priority: conditional (+10) > interactive (+5) > urgency (1–4)
  // + weakness tilt (+0–8, always below conditionKey bonus to avoid forcing worst events)
  // + tension tilt (+0–3 for national/social events when tension ≥ 60)
  // + rarity bonus (+2–12 quand un événement rare devient enfin éligible)
  const tensionBonus = tension >= 60 ? Math.round((tension - 60) / 40 * 3) : 0;
  const sorted = pool.sort((a, b) => {
    const aTension = tensionBonus > 0 && (a.type === "national" || a.type === "social") ? tensionBonus : 0;
    const bTension = tensionBonus > 0 && (b.type === "national" || b.type === "social") ? tensionBonus : 0;
    const aScore = urgencyScore(a) + (a.conditionKey ? 10 : 0) + (a.isInteractive ? 5 : 0) + weaknessWeight(a, weakProfile) + aTension + rarityScoreBonus(a.id, news.log);
    const bScore = urgencyScore(b) + (b.conditionKey ? 10 : 0) + (b.isInteractive ? 5 : 0) + weaknessWeight(b, weakProfile) + bTension + rarityScoreBonus(b.id, news.log);
    return bScore - aScore;
  });

  // Random pick among top-5 preserves variety and prevents fully deterministic selection
  const top = sorted.slice(0, Math.min(5, sorted.length));
  return top[Math.floor(Math.random() * top.length)];
}

function urgencyScore(e: NewsEvent): number {
  switch (e.urgency) {
    case "critique": return 4;
    case "forte":    return 3;
    case "moyenne":  return 2;
    case "faible":   return 1;
  }
}

function evaluateConditions(state: StrategyGameState): Record<string, boolean> {
  const { resources, ranking, stats, nationalIndicators: ind } = state;
  const playerRank = ranking.findIndex((r) => r.id === "player") + 1;
  const indicators = ind ?? { popularity: 60, economy: 55, security: 50, ecology: 45, cohesion: 60, publicBudget: 20 };
  const hp = state.hiddenPolitics ?? { eliteTrust: 65, scandalRisk: 20, mediaMood: 55, popularFatigue: 15, regionalTension: 30, institutionalStability: 70 };
  return {
    low_money:                resources.money < 500,
    low_cyber:                resources.cyberDefense < 30,
    low_military:             resources.military < 40,
    high_power:               stats.globalPower >= 200,
    rank_pressure:            playerRank > ranking.length * 0.4,
    top5_rank:                playerRank <= 5,
    low_popularity:           indicators.popularity < 30,
    low_ind_economy:          indicators.economy < 25,
    low_security:             indicators.security < 25,
    low_ecology:              indicators.ecology < 25,
    low_cohesion:             indicators.cohesion < 25,
    budget_crisis:            indicators.publicBudget < -80,
    low_elite_trust:          hp.eliteTrust < 35,
    high_scandal_risk:        hp.scandalRisk > 65,
    low_media_mood:           hp.mediaMood < 30,
    high_popular_fatigue:     hp.popularFatigue > 65,
    high_regional_tension:    hp.regionalTension > 65,
    low_institutional_stability: hp.institutionalStability < 35,
    high_debt:                   (state.nationalDebt ?? 0) > 350,
    minister_scandal_risk:       state.strategyMinisters?.some((m) => m.scandalRisk > 70) ?? false,
    high_opposition:             (state.oppositionPower ?? 35) >= 65,
    low_opposition:              (state.oppositionPower ?? 35) < 30,
    no_energy_sovereign:         !(state.strategyResearch?.completed ?? []).includes("research_energy_sovereign"),
    has_satellites:              (state.strategyResearch?.completed ?? []).includes("research_satellites"),
    has_infowar:                 (state.strategyResearch?.completed ?? []).includes("research_infowar"),
    cosmic_auroria_eligible:     indicators.cohesion >= 50 && hp.institutionalStability >= 55 && hp.scandalRisk < 50,
    cosmic_obscurium_active:     hp.scandalRisk > 40 || resources.cyberDefense < 40 || hp.popularFatigue > 55,
    // ── Helpers cosmiques V2 — lire cosmicState en priorité, fallback ancien état ─
    // Nations de l'Espace (sn_)
    sn_aurora_contact:   (state.cosmicState?.cosmicCredibility ?? state.spaceNationsState?.cosmicCredibility ?? 0) >= 45 && (state.cosmicState?.auroraSupport ?? state.spaceNationsState?.auroraSupport ?? 0) >= 35,
    sn_council_eligible: (state.cosmicState?.councilAttention ?? state.spaceNationsState?.councilAttention ?? 0) >= 30 && (state.cosmicState?.cosmicCredibility ?? state.spaceNationsState?.cosmicCredibility ?? 0) >= 30,
    sn_noctyra_active:   (state.cosmicState?.obscuriumInfluence ?? state.spaceNationsState?.obscuriumCorruption ?? 0) >= 45 || hp.scandalRisk > 55,
    sn_sanction_risk:    (state.cosmicState?.cosmicCredibility ?? state.spaceNationsState?.cosmicCredibility ?? 0) < 25 && (state.cosmicState?.councilAttention ?? state.spaceNationsState?.councilAttention ?? 0) >= 35,
    sn_tribunal:         state.mandateDay >= 80 && (state.cosmicState?.councilAttention ?? state.spaceNationsState?.councilAttention ?? 0) >= 25 && (state.cosmicState?.discoveryStage !== "hidden" || (state.spaceNationsState?.discovered ?? false)),
    // Cité d'Orion (oc_)
    oc_signal_visible:   (state.cosmicState?.discoveryStage !== "hidden" || (state.spaceNationsState?.discovered ?? false)) && state.mandateDay >= 15,
    oc_dome_eligible:    (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && (state.cosmicState?.orionStanding ?? state.orionCityState?.orionStanding ?? 0) >= 35 && (state.cosmicState?.orionAccessLevel ?? state.orionCityState?.accessLevel) !== "banni",
    oc_silence_market:   (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && (state.cosmicState?.orionStanding ?? state.orionCityState?.orionStanding ?? 0) >= 20,
    oc_couloir:          (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && ((state.cosmicState?.obscuriumInfluence ?? state.spaceNationsState?.obscuriumCorruption ?? 0) >= 40 || (state.cosmicState?.obscuriumTrace ?? state.orionCityState?.obscuriumTrace ?? 0) >= 25),
    oc_tribunal_active:  (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && state.mandateDay >= 70 && (state.cosmicState?.orionStanding ?? state.orionCityState?.orionStanding ?? 0) < 40,
    oc_archive_unlocked: (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && (state.cosmicState?.orionStanding ?? state.orionCityState?.orionStanding ?? 0) >= 50 && (state.cosmicState?.auroraEmbassyTrust ?? state.orionCityState?.auroraEmbassyTrust ?? 0) >= 40,
    oc_phare_aid:        (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && (state.cosmicState?.auroraEmbassyTrust ?? state.orionCityState?.auroraEmbassyTrust ?? 0) >= 55 && (state.cosmicState?.orionStanding ?? state.orionCityState?.orionStanding ?? 0) >= 45,
    // Chambre du Seuil (ch_)
    ch_chambre_eligible:        (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && state.mandateDay >= 20 && (state.cosmicState?.lastNegotiationAt ?? state.moralNegotiationState?.lastNegotiationAt ?? 0) === 0,
    ch_aurora_offer_eligible:   (state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && (state.cosmicState?.auroraTrust ?? state.moralNegotiationState?.auroraTrust ?? 0) >= 35 && (state.cosmicState?.activePact ?? state.moralNegotiationState?.activePact ?? "none") === "none" && (state.cosmicState?.obscuriumDebt ?? state.moralNegotiationState?.obscuriumDebt ?? 0) < 40,
    ch_obscurium_offer_eligible:(state.cosmicState?.orionDiscovered ?? state.orionCityState?.discovered ?? false) && (state.cosmicState?.activePact ?? state.moralNegotiationState?.activePact ?? "none") === "none" && ((state.cosmicState?.obscuriumDebt ?? state.moralNegotiationState?.obscuriumDebt ?? 0) >= 10 || hp.scandalRisk > 45),
    ch_aurora_pact_kept:        (state.cosmicState?.activePact ?? state.moralNegotiationState?.activePact ?? "none") === "aurora" && !(state.cosmicState?.auroraConditionBroken ?? state.moralNegotiationState?.auroraConditionBroken ?? false) && (state.cosmicState?.pactExpiresAtAction ?? state.moralNegotiationState?.pactExpiresAtAction ?? 0) > 0 && state.news.actionCount >= (state.cosmicState?.pactExpiresAtAction ?? state.moralNegotiationState?.pactExpiresAtAction ?? 0) - 3,
    ch_aurora_pact_broken:      (state.cosmicState?.activePact ?? state.moralNegotiationState?.activePact ?? "none") === "aurora" && (state.cosmicState?.auroraConditionBroken ?? state.moralNegotiationState?.auroraConditionBroken ?? false),
    ch_obscurium_debt_active:   (state.cosmicState?.obscuriumDebt ?? state.moralNegotiationState?.obscuriumDebt ?? 0) >= 50,
    ch_orion_judges:            (state.cosmicState?.orionStanding ?? state.orionCityState?.orionStanding ?? 0) >= 30 && state.mandateDay >= 60 && (state.cosmicState?.lastNegotiationAt ?? state.moralNegotiationState?.lastNegotiationAt ?? 0) > 0,
    ch_humanity_sovereign:      (state.cosmicState?.moralBalance ?? state.moralNegotiationState?.moralBalance ?? 0) >= 20 && state.mandateDay >= 35 && (state.cosmicState?.activePact ?? state.moralNegotiationState?.activePact ?? "none") === "none",
    // Système Cosmique V2 (cv_)
    cv_signal_anomaly_ready:               !state.cosmicState || state.cosmicState.discoveryStage === "hidden",
    cv_earth_observed_ready:               (state.cosmicState?.cosmicCredibility ?? 0) >= 25 && (state.cosmicState?.councilAttention ?? 0) >= 15 && state.mandateDay >= 20,
    cv_aurora_diplomatic_channel_ready:    (state.cosmicState?.auroraTrust ?? 0) >= 28 && (state.cosmicState?.cosmicCredibility ?? 0) >= 38 && (state.cosmicState?.discoveryStage ?? "hidden") !== "hidden",
    cv_obscurium_shadow_contact_ready:     (state.cosmicState?.obscuriumInfluence ?? 0) >= 30 || hp.scandalRisk > 48,
    cv_orion_cartography_ready:            (state.cosmicState?.orionDiscovered ?? false) && (state.cosmicState?.orionStanding ?? 0) >= 18,
    cv_council_emergency_session_ready:    (state.cosmicState?.cosmicCredibility ?? 50) < 32 && (state.cosmicState?.councilAttention ?? 0) >= 40 && state.mandateDay >= 45,
    cv_aurora_endorsement_ready:           (state.cosmicState?.auroraTrust ?? 0) >= 58 && (state.cosmicState?.cosmicCredibility ?? 0) >= 52 && (state.cosmicState?.activePact ?? "none") === "none" && state.mandateDay >= 55,
    cv_obscurium_exposed_ready:            (state.cosmicState?.obscuriumDebt ?? 0) >= 38 && (state.cosmicState?.cosmicCredibility ?? 0) >= 32,
    cv_chambre_second_session_ready:       (state.cosmicState?.lastNegotiationAt ?? 0) > 0 && (state.cosmicState?.moralBalance ?? 0) >= -5 && (state.cosmicState?.moralBalance ?? 0) <= 5 && state.mandateDay >= 42,
    cv_council_vote_earth_ready:           (state.cosmicState?.cosmicCredibility ?? 0) >= 48 && (state.cosmicState?.councilAttention ?? 0) >= 55 && state.mandateDay >= 68,
    cv_orion_crisis_ready:                 (state.cosmicState?.orionDiscovered ?? false) && (state.cosmicState?.orionStanding ?? 0) >= 28 && (state.cosmicState?.obscuriumTrace ?? 0) >= 28,
    cv_moral_reckoning_ready:              (state.cosmicState?.lastNegotiationAt ?? 0) > 0 && ((state.cosmicState?.moralBalance ?? 0) >= 35 || (state.cosmicState?.moralBalance ?? 0) <= -35) && state.mandateDay >= 58,
    cv_aurora_final_test_ready:            (state.cosmicState?.activePact ?? "none") === "aurora" && !(state.cosmicState?.auroraConditionBroken ?? false) && (state.cosmicState?.cosmicCredibility ?? 0) >= 52 && state.mandateDay >= 65,
    cv_obscurium_revelation_ready:         (state.cosmicState?.obscuriumDebt ?? 0) >= 65 || ((state.cosmicState?.obscuriumInfluence ?? 0) >= 58 && state.mandateDay >= 78),
    cv_cosmic_legacy_ready:                state.mandateDay >= 88 && ((state.cosmicState?.cosmicCredibility ?? 0) >= 38 || (state.cosmicState?.orionDiscovered ?? false)),
    low_administration_morale:      (state.administrationMorale ?? 60) <= 40,
    very_low_administration_morale: (state.administrationMorale ?? 60) <= 20,
    active_high_cabinet_conflict:   (state.cabinetConflicts ?? []).some((c) => c.intensity > 65),
    // ── Réseau électrique ──────────────────────────────────────────────────
    grid_critical:           (state.gridStability ?? 72) < 25,
    grid_tension:            (state.gridStability ?? 72) >= 25 && (state.gridStability ?? 72) < 50,
    grid_stable_opportunity: (state.gridStability ?? 72) >= 60 && state.mandateDay >= 30,
    // ── Ondes de crise ────────────────────────────────────────────────────
    wave_active_strong:      (state.crisisWaves ?? []).some((w) => w.intensity >= 50),
    // ── Tempêtes solaires ────────────────────────────────────────────────
    solar_storm_faible:   state.solarStorm?.level === "faible",
    solar_storm_moderee:  state.solarStorm?.level === "modérée",
    solar_storm_forte:    state.solarStorm?.level === "forte",
    solar_storm_extreme:  state.solarStorm?.level === "extrême",
    // ── Fenêtres orbitales ────────────────────────────────────────────────
    orbital_tempete_solaire:   state.orbitalWindow?.current === "tempête_solaire",
    orbital_window_favorable:  state.orbitalWindow?.current === "favorable" && state.mandateDay >= 20,
    orbital_window_perturbee:  (state.orbitalWindow?.current === "perturbée" || state.orbitalWindow?.current === "fermée") && state.mandateDay >= 15,
    // ── Stress thermique ───────────────────────────────────────────────────
    thermal_critical_stress:  (state.thermalStress ?? 22) >= 80,
    thermal_high_stress:      (state.thermalStress ?? 22) >= 55 && state.mandateDay >= 15,
    thermal_cooling_window:   (state.thermalStress ?? 22) < 35 && state.mandateDay >= 25,
    // ── Usure infrastructures ──────────────────────────────────────────────
    infra_critical_wear:     Object.values(state.infrastructureWear ?? {}).some((w) => (w ?? 0) >= 88),
    infra_high_wear:         (() => { const w = state.infrastructureWear ?? {}; const active = state.buildings.filter((b) => b.level > 0); if (active.length === 0) return false; const avg = active.reduce((s, b) => s + (w[b.id] ?? 0), 0) / active.length; return avg >= 55 && state.mandateDay >= 20; })(),
    infra_maintenance_due:   (() => { const w = state.infrastructureWear ?? {}; const active = state.buildings.filter((b) => b.level > 0); if (active.length === 0) return false; const avg = active.reduce((s, b) => s + (w[b.id] ?? 0), 0) / active.length; return avg >= 35 && state.mandateDay >= 15; })(),
    // ── Seuils de rupture ─────────────────────────────────────────────────────
    breakpoint_grid_rupture:    state.breakpoints?.statuses?.grid            === "rupture",
    breakpoint_trust_rupture:   state.breakpoints?.statuses?.publicTrust     === "rupture",
    breakpoint_infra_rupture:   state.breakpoints?.statuses?.infrastructure  === "rupture",
    breakpoint_cyber_rupture:   state.breakpoints?.statuses?.cyber           === "rupture",
    breakpoint_finance_rupture: state.breakpoints?.statuses?.publicFinance   === "rupture",
    // ── Cellule DIM Nationale ─────────────────────────────────────────────────
    medical_quality_critical: (state.medicalDataQuality ?? 50) < 25  && state.mandateDay >= 10,
    medical_quality_degraded: (state.medicalDataQuality ?? 50) >= 25 && (state.medicalDataQuality ?? 50) < 50 && state.mandateDay >= 20,
    medical_quality_high:     (state.medicalDataQuality ?? 50) >= 75 && state.mandateDay >= 30,
    // ── Qualité du codage hospitalier ────────────────────────────────────────
    hospital_coding_critical: (state.hospitalCodingQuality ?? 55) < 25 && state.mandateDay >= 15,
    hospital_coding_audit:    (state.hospitalCodingQuality ?? 55) >= 25 && (state.hospitalCodingQuality ?? 55) < 55 && state.mandateDay >= 20,
    // ── Retard de remontée des données de santé ───────────────────────────────
    health_delay_critical: (state.healthReportingDelay ?? 8) >= 22 && state.mandateDay >= 20,
    health_delay_high:     (state.healthReportingDelay ?? 8) >= 14 && (state.healthReportingDelay ?? 8) < 22 && state.mandateDay >= 15,
    // ── Saturation hospitalière ────────────────────────────────────────────────
    hospital_pressure_crisis:      (state.hospitalPressure ?? 30) >= 81 && state.mandateDay >= 15,
    hospital_pressure_saturation:  (state.hospitalPressure ?? 30) >= 61 && (state.hospitalPressure ?? 30) < 81 && state.mandateDay >= 10,
    hospital_pressure_tension:     (state.hospitalPressure ?? 30) >= 40 && (state.hospitalPressure ?? 30) < 61 && state.mandateDay >= 10,
    hospital_plan_opportunity:     (state.hospitalPressure ?? 30) < 35 && state.mandateDay >= 20,
    // ── Confiance dans les chiffres de santé ──────────────────────────────────
    health_trust_critical: (state.healthDataTrust ?? 65) < 20 && state.mandateDay >= 15,
    health_trust_low:      (state.healthDataTrust ?? 65) >= 20 && (state.healthDataTrust ?? 65) < 40 && state.mandateDay >= 10,
    health_trust_high:     (state.healthDataTrust ?? 65) >= 80 && state.mandateDay >= 25,
    // ── Sous-détection sanitaire cachée ──────────────────────────────────────
    underdetection_signal:     (state.underDetectionPressure ?? 15) >= 35 && state.mandateDay >= 15,
    underdetection_incoherent: (state.underDetectionPressure ?? 15) >= 60 && state.mandateDay >= 20,
    underdetection_crisis:     (state.underDetectionPressure ?? 15) >= 85 && state.mandateDay >= 25,
    // ── Scandale des chiffres de santé ───────────────────────────────────────
    health_scandal_emerging: (state.statisticsScandalPressure ?? 10) >= 35 && state.mandateDay >= 20,
    health_scandal_active:   (state.statisticsScandalPressure ?? 10) >= 65 && state.mandateDay >= 25,
    health_scandal_crisis:   (state.statisticsScandalPressure ?? 10) >= 85 && state.mandateDay >= 30,
    // ── Interopérabilité des systèmes de santé ───────────────────────────────
    interop_degraded:    (state.healthInteroperability ?? 52) < 35 && state.mandateDay >= 15,
    interop_crisis:      (state.healthInteroperability ?? 52) < 20 && state.mandateDay >= 25,
    interop_opportunity: (state.healthInteroperability ?? 52) >= 70 && state.mandateDay >= 30,
    // ── Bilan sanitaire intermédiaire ────────────────────────────────────────
    health_bilan_eligible: state.mandateDay >= 50,
    // ── Marché du travail ────────────────────────────────────────────────────
    unemployment_rising:    (state.unemployment ?? 25) >= 45 && state.mandateDay >= 15,
    unemployment_crisis:    (state.unemployment ?? 25) >= 65 && state.mandateDay >= 20,
    labor_shortage_alert:   (state.laborShortage ?? 20) >= 60 && (state.unemployment ?? 25) < 30 && state.mandateDay >= 20,
    youth_unemployment_high:(state.youthUnemployment ?? 35) >= 55 && state.mandateDay >= 15,
    job_quality_crisis:     (state.jobQuality ?? 55) < 25 && state.mandateDay >= 20,
    employment_boom:        (state.unemployment ?? 25) < 15 && state.mandateDay >= 30,
    // ── Inflation et pouvoir d'achat ─────────────────────────────────────────
    inflation_signal:      (state.inflation ?? 25) >= 35 && (state.inflation ?? 25) < 60 && state.mandateDay >= 10,
    inflation_alert:       (state.inflation ?? 25) >= 60 && (state.inflation ?? 25) < 80 && state.mandateDay >= 15,
    inflation_crisis:      (state.inflation ?? 25) >= 80 && state.mandateDay >= 20,
    purchasing_power_low:  (state.purchasingPower ?? 60) < 35 && state.mandateDay >= 15,
    economic_stagnation:   (state.inflation ?? 25) < 20 && (state.nationalIndicators?.economy ?? 55) < 35 && state.mandateDay >= 20,
    // ── Chaînes d'approvisionnement ──────────────────────────────────────────
    supply_chain_watch: (() => {
      const sc = state.supplyChain;
      if (!sc) return false;
      const avg = Object.values(sc).reduce((s, sec) => s + sec.disruptionRisk, 0) / 8;
      return avg >= 30 && state.mandateDay >= 10;
    })(),
    supply_sector_alert: (() => {
      const sc = state.supplyChain;
      if (!sc) return false;
      return Object.values(sc).some((sec) => sec.disruptionRisk >= 65) && state.mandateDay >= 15;
    })(),
    supply_rupture_crisis: (() => {
      const sc = state.supplyChain;
      if (!sc) return false;
      return Object.values(sc).some((sec) => sec.disruptionRisk >= 80 && sec.stockLevel < 30) && state.mandateDay >= 20;
    })(),
    supply_critical_dependency: (() => {
      const sc = state.supplyChain;
      if (!sc) return false;
      return (sc.semi_conducteurs.dependencyLevel >= 70 || sc.materiaux_critiques.dependencyLevel >= 60) && state.mandateDay >= 20;
    })(),
    supply_sovereignty_window: (() => {
      const completed = state.strategyResearch?.completed ?? [];
      const hasTech   = completed.includes("research_digital_twin") || completed.includes("research_energy_sovereign");
      return hasTech && (state.productivity ?? 50) >= 60 && state.mandateDay >= 25;
    })(),
  };
}

export function applyAutoNews(
  state: StrategyGameState,
  event: NewsEvent,
): { news: NewsState; resources: StrategyResources } {
  const logEntry: NewsLogEntry = {
    eventId: event.id,
    title: event.title,
    source: event.source,
    type: event.type,
    urgency: event.urgency,
    timestamp: Date.now(),
    effects: event.autoEffects ?? {},
  };

  const resources = applyEffects(state.resources, event.autoEffects ?? {});

  const news: NewsState = {
    ...state.news,
    log: [...state.news.log.slice(-MAX_LOG + 1), logEntry],
    seenIds: [...state.news.seenIds, event.id],
    unreadCount: state.news.unreadCount + 1,
    lastNewsAction: state.news.actionCount,
  };

  return { news, resources };
}

export function applyInteractiveNews(
  state: StrategyGameState,
  event: NewsEvent,
  choiceId: string,
): { news: NewsState; resources: StrategyResources } {
  const choice = event.choices?.find((c) => c.id === choiceId);
  if (!choice) return { news: state.news, resources: state.resources };

  const logEntry: NewsLogEntry = {
    eventId: event.id,
    title: event.title,
    source: event.source,
    type: event.type,
    urgency: event.urgency,
    timestamp: Date.now(),
    choiceId: choice.id,
    choiceLabel: choice.label,
    consequence: choice.consequence,
    effects: choice.effects,
  };

  const resources = applyEffects(state.resources, choice.effects);

  const news: NewsState = {
    ...state.news,
    log: [...state.news.log.slice(-MAX_LOG + 1), logEntry],
    seenIds: [...state.news.seenIds, event.id],
    pendingIds: state.news.pendingIds.filter((id) => id !== event.id),
    unreadCount: Math.max(0, state.news.unreadCount - 1),
    lastNewsAction: state.news.actionCount,
  };

  return { news, resources };
}

export function queueNews(state: NewsState, eventId: string): NewsState {
  if (state.pendingIds.includes(eventId)) return state;
  return {
    ...state,
    pendingIds: [...state.pendingIds, eventId],
    seenIds: [...state.seenIds, eventId],
    unreadCount: state.unreadCount + 1,
    lastNewsAction: state.actionCount,
  };
}

export function dismissPendingNews(state: NewsState, eventId: string): NewsState {
  return {
    ...state,
    pendingIds: state.pendingIds.filter((id) => id !== eventId),
    unreadCount: Math.max(0, state.unreadCount - 1),
  };
}

export function markAllRead(state: NewsState): NewsState {
  return { ...state, unreadCount: 0 };
}

function applyEffects(
  resources: StrategyResources,
  effects: Partial<StrategyResources>,
): StrategyResources {
  const next = { ...resources };
  for (const [key, val] of Object.entries(effects) as [keyof StrategyResources, number][]) {
    next[key] = Math.max(0, Math.round(next[key] + val));
  }
  return next;
}

export const DEFAULT_NEWS_STATE: NewsState = {
  log: [],
  seenIds: [],
  pendingIds: [],
  actionCount: 0,
  lastNewsAction: 0,
  unreadCount: 0,
};

export function urgencyColor(urgency: NewsEvent["urgency"]): string {
  switch (urgency) {
    case "critique": return "#FF3040";
    case "forte":    return "#FF8040";
    case "moyenne":  return "#FFB020";
    case "faible":   return "#60A0FF";
  }
}

export function typeIcon(type: NewsEvent["type"]): string {
  switch (type) {
    case "cyber":         return "💻";
    case "economie":      return "📊";
    case "social":        return "👥";
    case "diplomatie":    return "🤝";
    case "guerre_hybride": return "⚠️";
    case "monde":         return "🌍";
    case "classement":    return "🏆";
    case "national":      return "🏛️";
  }
}
