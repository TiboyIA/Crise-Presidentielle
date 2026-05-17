/**
 * rankedScoreFormula.ts — Formule de score classé robuste
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SOURCE DE VÉRITÉ pour la formule côté client ET documentation de référence
 * pour l'implémentation serveur (ranked-submit Edge Function).
 *
 * PRINCIPE FONDAMENTAL
 *   Le score final N'EST PAS calculé côté client.
 *   Le client fournit des données brutes (journal + indicateurs finaux).
 *   Le serveur calcule, valide, et stocke le score. Cette formule est la
 *   spécification de ce que le serveur doit implémenter.
 *
 * PROBLÈMES DU SCORE PRÉCÉDENT (computeMandateScore)
 *   • 100 % côté client → falsifiable par interception réseau
 *   • Popularity surpondérée (35 %) → un seul indicateur domine
 *   • Aucune composante durée, progression, activité, difficulté
 *   • globalPower, rankingPoints, publicBudget absents de la soumission
 *
 * COMPOSANTES DU NOUVEAU SCORE (max théorique ~175 pts avant multiplicateur)
 *   1. base_indicators   : 0–100  (5 indicateurs finaux, poids rééquilibrés)
 *   2. progression_bonus : 0–25   (bâtiments + recherches complétées)
 *   3. longevity_bonus   : 0–15   (jours de mandat, rendements décroissants)
 *   4. activity_bonus    : 0–10   (diversité de décisions, log-scale)
 *   5. power_bonus       : 0–10   (puissance / sqrt(jours), densité)
 *   × difficulty_mult    : 0.80–1.30 (pays + doctrine)
 *   + anomaly_penalty    : 0 à −50 (détection d'incohérences)
 *
 *   Score réaliste pour un bon joueur : 90–140 pts
 *   Score impossible à falsifier > 180 pts → rejet 422
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CountryId, GovernanceDoctrine } from "@/types/strategy";

// ── Types portables (miroir du payload envoyé au serveur) ─────────────────────

export interface ScoringIndicators {
  popularity:    number; // 0–100
  economy:       number; // 0–100
  security:      number; // 0–100
  ecology:       number; // 0–100
  cohesion:      number; // 0–100
  globalPower:   number; // 0–∞  (somme des bonus de bâtiments + ressources)
  rankingPoints: number; // 0–∞  (points accumulés via opérations + mandats)
  publicBudget:  number; // −150–100
}

export interface ScoringEvent {
  event_type: string;
  event_id:   string;
  mandate_day: number;
  elapsed_ms:  number;
  payload?:    Record<string, number | string | boolean>;
}

export interface ScoringPayload {
  indicators:  ScoringIndicators;
  mandateDays: number;
  events:      ScoringEvent[];
  countryId:   CountryId;
  doctrine:    GovernanceDoctrine;
}

export interface ScoreBreakdown {
  baseIndicators:    number; // 0–100
  progressionBonus:  number; // 0–25
  longevityBonus:    number; // 0–15
  activityBonus:     number; // 0–10
  powerBonus:        number; // 0–10
  rawSubtotal:       number; // somme des 5 composantes
  difficultyMult:    number; // 0.80–1.30
  scaledSubtotal:    number; // rawSubtotal × difficultyMult
  anomalyPenalty:    number; // ≤ 0
  finalScore:        number; // max(0, scaledSubtotal + anomalyPenalty)
}

export interface AnomalyFlag {
  code:     string;
  severity: "warn" | "reject"; // warn → suspect:true ; reject → 422
  detail:   string;
  penalty:  number;            // points déduits (0 pour les rejets durs → 422 direct)
}

export interface ScoreResult {
  breakdown:  ScoreBreakdown;
  anomalies:  AnomalyFlag[];
  hardReject: boolean;         // true → serveur retourne 422
  suspect:    boolean;         // true → serveur stocke pour revue manuelle
}

// ── 1. Score de base — indicateurs finaux ─────────────────────────────────────
//
// Poids rééquilibrés vs l'ancienne formule (pop 0.35 → 0.28) pour
// éviter la dépendance à un seul indicateur.
// publicBudget (+100 à −150) contribue modestement : un budget négatif
// pénalise légèrement, un budget très positif donne un bonus plafonné.

const BASE_WEIGHTS = {
  popularity: 0.28, // réduit depuis 0.35
  economy:    0.22, // légèrement augmenté
  security:   0.18, // augmenté depuis 0.15
  ecology:    0.14, // augmenté depuis 0.10
  cohesion:   0.18, // stable
} as const;

export function computeBaseScore(ind: ScoringIndicators): number {
  const weighted =
    ind.popularity * BASE_WEIGHTS.popularity +
    ind.economy    * BASE_WEIGHTS.economy    +
    ind.security   * BASE_WEIGHTS.security   +
    ind.ecology    * BASE_WEIGHTS.ecology    +
    ind.cohesion   * BASE_WEIGHTS.cohesion;

  // publicBudget contribue de −5 à +3 (asymétrique : la dette punit plus qu'elle ne récompense)
  const budgetBonus = Math.min(3, Math.max(-5, ind.publicBudget * 0.03));

  return Math.min(100, Math.max(0, Math.round(weighted + budgetBonus)));
}

// ── 2. Bonus de progression ───────────────────────────────────────────────────
//
// Récompense les joueurs actifs qui font progresser leur nation.
// Plafonné pour éviter le farming passif en boucle.
// Le serveur compte les événements directement depuis le journal.

export function computeProgressionBonus(events: ScoringEvent[]): number {
  const upgrades  = events.filter(e => e.event_type === "building_upgrade_completed").length;
  const research  = events.filter(e => e.event_type === "research_completed").length;
  const units     = events.filter(e => e.event_type === "unit_training_completed").length;

  // Poids : recherche > bâtiment > unité (la recherche est un engagement long terme)
  const raw = upgrades * 0.7 + research * 2.5 + units * 0.4;
  return Math.min(25, Math.round(raw));
}

// ── 3. Bonus de longévité ─────────────────────────────────────────────────────
//
// sqrt() donne des rendements décroissants : doubler la durée n'équivaut
// pas à doubler le bonus. Évite le farming de durée.
//
//   10 jours  → sqrt(10) × 0.9 ≈ 2.8
//   50 jours  → sqrt(50) × 0.9 ≈ 6.4
//   100 jours → sqrt(100) × 0.9 = 9
//   250 jours → sqrt(250) × 0.9 ≈ 14.2
//   plafond 15 atteint à ~278 jours

export function computeLongevityBonus(mandateDays: number): number {
  return Math.min(15, Math.round(Math.sqrt(Math.max(0, mandateDays)) * 0.9));
}

// ── 4. Bonus d'activité ───────────────────────────────────────────────────────
//
// Log-scale : les premières décisions valent plus que les suivantes.
// Récompense la diversité (crises + réformes > opérations seules).
//
//   5 crises  → log(6) × 2.5 ≈ 4.5
//  20 crises  → log(21) × 2.5 ≈ 7.6
//  50 crises + 5 réformes + 10 ops → log(1+50+10+20) × 2.5 ≈ 10.7 → plafond 10

export function computeActivityBonus(events: ScoringEvent[]): number {
  const crises  = events.filter(e => e.event_type === "crisis_choice").length;
  const reforms = events.filter(e => e.event_type === "reform_launched").length;
  const ops     = events.filter(e => e.event_type === "military_op").length;
  const docs    = events.filter(e => e.event_type === "doctrine_set").length;

  // Réformes et doctrines récompensées plus (décisions structurelles)
  const weighted = crises + reforms * 2 + ops * 0.8 + docs * 1.5;
  return Math.min(10, Math.round(Math.log(1 + weighted) * 2.5));
}

// ── 5. Bonus de densité de puissance ─────────────────────────────────────────
//
// globalPower / sqrt(mandateDays) : un joueur efficace qui build de la
// puissance rapidement est mieux récompensé qu'un joueur passif qui
// accumule juste de la durée.

export function computePowerBonus(globalPower: number, mandateDays: number): number {
  if (mandateDays <= 0) return 0;
  const density = globalPower / Math.sqrt(mandateDays);
  // Calibration : 300 power en 100 jours → density 30 → bonus 4.5
  //               800 power en 100 jours → density 80 → bonus 10 (plafond)
  return Math.min(10, Math.round(density * 0.12));
}

// ── 6. Multiplicateur de difficulté ──────────────────────────────────────────
//
// Deux dimensions : pays (contexte structurel) + doctrine (style de gouvernance).
// Multiplicateur combiné = pays × doctrine, plafonné à [0.80, 1.30].
//
// PAYS — difficulté relative (France = 1.00, référence)
//   Facile   (0.88–0.95) : Canada, Australie, Allemagne, Royaume-Uni
//   Standard (0.98–1.05) : France, USA, Japon, Corée du Sud, Italie, Inde
//   Difficile(1.08–1.15) : Chine, Brésil, Turquie, Arabie Saoudite, Israël, Nigéria
//   Très dur (1.18–1.28) : Russie, Pakistan, Iran, Corée du Nord
//
// DOCTRINE — impact sur la difficulté à maintenir les indicateurs
//   −5 % : libéral (économie facile), technocratique (stabilité facile)
//   +0 % : démocratique, écologiste, souverainiste
//   +5 % : populiste (imprévisibilité économique)
//   +8 % : sécuritaire (popularité difficile)
//  +12 % : autoritaire (popularité + cohésion difficiles)

const COUNTRY_DIFFICULTY: Record<CountryId, number> = {
  // Facile
  canada:       0.88,
  australia:    0.90,
  germany:      0.93,
  uk:           0.95,
  // Standard
  japan:        0.98,
  south_korea:  0.98,
  italy:        1.00,
  france:       1.00,
  usa:          1.00,
  // Difficile
  india:        1.05,
  china:        1.08,
  brazil:       1.10,
  turkey:       1.10,
  saudi_arabia: 1.12,
  israel:       1.13,
  nigeria:      1.15,
  // Très difficile
  russia:       1.18,
  pakistan:     1.20,
  iran:         1.22,
  north_korea:  1.28,
};

const DOCTRINE_DIFFICULTY: Record<GovernanceDoctrine, number> = {
  liberal:         0.95,
  technocratique:  0.97,
  democratique:    1.00,
  ecologiste:      1.02,
  souverainiste:   1.03,
  populiste:       1.05,
  securitaire:     1.08,
  autoritaire:     1.12,
};

export function getDifficultyMultiplier(countryId: CountryId, doctrine: GovernanceDoctrine): number {
  const cFactor = COUNTRY_DIFFICULTY[countryId] ?? 1.00;
  const dFactor = DOCTRINE_DIFFICULTY[doctrine] ?? 1.00;
  const combined = cFactor * dFactor;
  return Math.max(0.80, Math.min(1.30, Math.round(combined * 1000) / 1000));
}

// ── 7. Détection d'anomalies ──────────────────────────────────────────────────
//
// Seuils calibrés sur le simulateur (balanceSimulator.ts) :
//   • Un joueur humain normal : 2–5 crises/heure réelle
//   • Durée minimale : 1 jour mandat = 360 min réelles = 21 600 000 ms
//   • Accumulation money max : ~250/min (central_bank lv10 + economy_ministry lv10)
//   • Durée upgrade minimale lv1 : 60 game_sec → 250ms réels (très rapide mais
//     techniquement possible si le joueur est juste en train d'appuyer)

// Table côté serveur : durées minimales (ms réels) par niveau bâtiment
// = UPGRADE_DURATIONS_SEC[i] × (1000 / 240)  → ratio game_sec→ms_réels
const UPGRADE_MIN_MS: number[] = [60, 300, 1200, 3600, 14400, 28800, 57600, 115200, 172800, 259200]
  .map(s => (s * 1000) / 240);

// Accumulation max théorique par snapshot de 5 min (300 000 ms)
const MAX_GAIN_PER_SNAPSHOT = { money: 1_250, influence: 150, power: 60 };

export function detectAnomalies(
  events: ScoringEvent[],
  mandateDays: number,
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const nonSnapshot = events.filter(e => e.event_type !== "resource_snapshot_periodic");
  const lastMs = events.length > 0 ? Math.max(...events.map(e => e.elapsed_ms)) : 0;

  // A. DURÉE MINIMALE PLAUSIBLE (rejet dur)
  // 1 jour mandat = 21 600 000 ms réels (tolérance −30 %)
  const minExpectedMs = mandateDays * 21_600_000 * 0.70;
  if (mandateDays > 2 && lastMs < minExpectedMs) {
    flags.push({
      code: "DURATION_IMPOSSIBLE",
      severity: "reject",
      detail: `elapsed_ms=${lastMs} < minimum plausible ${Math.round(minExpectedMs)} (${mandateDays}j × 70%)`,
      penalty: 0, // rejet hard → 422
    });
  }

  // B. ACTIONS PAR MINUTE (alerte ou rejet)
  // Non-snapshot events / durée réelle en minutes
  if (lastMs > 0) {
    const elapsedMin = lastMs / 60_000;
    const apm = elapsedMin > 0 ? nonSnapshot.length / elapsedMin : 0;
    if (apm > 10) {
      flags.push({
        code: "APM_IMPOSSIBLE",
        severity: "reject",
        detail: `${apm.toFixed(1)} actions/min > seuil de rejet 10/min`,
        penalty: 0,
      });
    } else if (apm > 5) {
      flags.push({
        code: "APM_SUSPECT",
        severity: "warn",
        detail: `${apm.toFixed(1)} actions/min > seuil d'alerte 5/min`,
        penalty: -15,
      });
    }
  }

  // C. VITESSE D'AMÉLIORATION BÂTIMENT
  // Pour chaque building_upgrade_completed, vérifier elapsed_ms depuis start du run
  // La durée minimale pour niveau L est UPGRADE_MIN_MS[L-1].
  // Heuristique serveur : si le 1er upgrade de chaque bâtiment se fait en < MIN × 0.85
  // → suspect (on ne peut pas reconstituer le startUpgrade exact depuis le journal actuel,
  //   mais on peut détecter des cumuls impossibles).
  const upgradeEvents = events.filter(e => e.event_type === "building_upgrade_completed");
  const suspiciousUpgrades = upgradeEvents.filter(e => {
    const level = typeof e.payload?.level === "number" ? e.payload.level : 1;
    const minDuration = UPGRADE_MIN_MS[Math.max(0, level - 1)] ?? UPGRADE_MIN_MS[0];
    // Si elapsed_ms < durée minimale pour ce niveau ET niveau > 2 (les bas niveaux sont rapides)
    return level >= 3 && e.elapsed_ms < minDuration * 0.85;
  });
  if (suspiciousUpgrades.length >= 3) {
    flags.push({
      code: "UPGRADE_SPEED_SUSPECT",
      severity: "warn",
      detail: `${suspiciousUpgrades.length} améliorations de haut niveau trop rapides`,
      penalty: -10,
    });
  }

  // D. ACCUMULATION DE RESSOURCES INCOHÉRENTE (snapshots)
  const snapshots = events.filter(e => e.event_type === "resource_snapshot_periodic")
    .sort((a, b) => a.elapsed_ms - b.elapsed_ms);
  let resourceViolations = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1]!;
    const curr = snapshots[i]!;
    const pMoney = typeof prev.payload?.money === "number" ? prev.payload.money : 0;
    const cMoney = typeof curr.payload?.money === "number" ? curr.payload.money : 0;
    const pPower = typeof prev.payload?.power === "number" ? prev.payload.power : 0;
    const cPower = typeof curr.payload?.power === "number" ? curr.payload.power : 0;

    const gainMoney = cMoney - pMoney;
    const gainPower = cPower - pPower;
    if (gainMoney > MAX_GAIN_PER_SNAPSHOT.money * 2) resourceViolations++;
    if (gainPower > MAX_GAIN_PER_SNAPSHOT.power * 2) resourceViolations++;
  }
  if (resourceViolations >= 3) {
    flags.push({
      code: "RESOURCE_ACCUMULATION_IMPOSSIBLE",
      severity: resourceViolations >= 6 ? "reject" : "warn",
      detail: `${resourceViolations} intervalles avec gain de ressources > 2× max théorique`,
      penalty: resourceViolations >= 6 ? 0 : -20,
    });
  }

  // E. SÉQUENCES IMPOSSIBLES
  let seqViolations = 0;
  let lastMandateDay = -1;
  const buildingLevels: Record<string, number> = {};

  for (const e of events) {
    // mandate_day ne peut pas régresser
    if (e.mandate_day < lastMandateDay) seqViolations++;
    lastMandateDay = e.mandate_day;

    // Niveau bâtiment ne peut pas régresser
    if (e.event_type === "building_upgrade_completed") {
      const bid = e.event_id;
      const level = typeof e.payload?.level === "number" ? e.payload.level : 0;
      if (buildingLevels[bid] !== undefined && level <= buildingLevels[bid]!) seqViolations++;
      buildingLevels[bid] = level;
    }
  }
  if (seqViolations > 0) {
    flags.push({
      code: "SEQUENCE_REGRESSION",
      severity: seqViolations >= 3 ? "reject" : "warn",
      detail: `${seqViolations} régressions de séquence (mandate_day ou niveau bâtiment)`,
      penalty: seqViolations >= 3 ? 0 : -seqViolations * 5,
    });
  }

  // F. SCORE THÉORIQUE IMPOSSIBLE
  // Le score max théorique absolu (tout à 100, multiplicateur 1.30, aucune pénalité) :
  // (100 + 25 + 15 + 10 + 10) × 1.30 = 208 pts → tout résultat > 190 est suspect
  // Cette vérification ne peut se faire qu'APRÈS calcul du score.

  return flags;
}

// ── Calcul complet (client-side preview — serveur recalcule de son côté) ──────

export function computeRankedScore(payload: ScoringPayload): ScoreResult {
  const { indicators, mandateDays, events, countryId, doctrine } = payload;

  const baseIndicators   = computeBaseScore(indicators);
  const progressionBonus = computeProgressionBonus(events);
  const longevityBonus   = computeLongevityBonus(mandateDays);
  const activityBonus    = computeActivityBonus(events);
  const powerBonus       = computePowerBonus(indicators.globalPower, mandateDays);
  const rawSubtotal      = baseIndicators + progressionBonus + longevityBonus + activityBonus + powerBonus;
  const difficultyMult   = getDifficultyMultiplier(countryId, doctrine);
  const scaledSubtotal   = Math.round(rawSubtotal * difficultyMult);

  const anomalies = detectAnomalies(events, mandateDays);

  // Score théorique impossible (vérification post-calcul)
  if (scaledSubtotal > 190) {
    anomalies.push({
      code: "SCORE_THEORETICALLY_IMPOSSIBLE",
      severity: "reject",
      detail: `Score ${scaledSubtotal} > plafond absolu 190 — impossible sans manipulation`,
      penalty: 0,
    });
  }

  const anomalyPenalty = anomalies
    .filter(a => a.severity === "warn")
    .reduce((sum, a) => sum + a.penalty, 0);

  const finalScore = Math.max(0, scaledSubtotal + anomalyPenalty);
  const hardReject = anomalies.some(a => a.severity === "reject");
  const suspect    = anomalies.some(a => a.severity === "warn");

  return {
    breakdown: {
      baseIndicators, progressionBonus, longevityBonus, activityBonus, powerBonus,
      rawSubtotal, difficultyMult, scaledSubtotal, anomalyPenalty, finalScore,
    },
    anomalies,
    hardReject,
    suspect,
  };
}

// ── Hint client : données vérifiables à inclure dans le journal ───────────────
//
// À enregistrer via rankRecord("ranked_score_hint", ...) juste avant submitRankedRun.
// Le serveur compare ces chiffres aux events du journal pour détecter les incohérences.

export interface ClientScoreHint {
  globalPower:           number;
  rankingPoints:         number;
  publicBudget:          number;
  totalBuildingLevels:   number;
  researchCount:         number;
  totalOperations:       number;
  operationsWon:         number;
  mandateDay:            number;
  crisisChoiceCount:     number;
}

// ── NOTES SERVEUR : implémentation ranked-submit (Deno/Edge Function) ─────────
//
// SCHÉMA D'ENTRÉE attendu par la Edge Function (mirrors submitRankedRun payload) :
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ {                                                                           │
// │   runId:           string,         // UUID from ranked_runs table           │
// │   events:          RunEvent[],     // journal complet                       │
// │   finalIndicators: {               // indicateurs finaux ÉTENDUS            │
// │     popularity:    number,         //   0–100                               │
// │     economy:       number,         //   0–100                               │
// │     security:      number,         //   0–100                               │
// │     ecology:       number,         //   0–100                               │
// │     cohesion:      number,         //   0–100                               │
// │     globalPower:   number,         //   0–∞ (NOUVEAU)                      │
// │     rankingPoints: number,         //   0–∞ (NOUVEAU)                      │
// │     publicBudget:  number,         //   −150–100 (NOUVEAU)                 │
// │   },                                                                        │
// │   mandateDays:     number,         // jours de mandat                       │
// │   deviceId?:       string,         // identifiant appareil                  │
// │   appVersion?:     string,         // version expo (semver)                 │
// │ }                                                                           │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// TABLES SUPABASE à créer ou enrichir :
//   ranked_runs (runId PK, userId, countryId, doctrine, startedAt, seed, status)
//   ranked_scores (runId FK, finalScore, breakdown JSONB, suspect BOOL, createdAt)
//   ranked_anomalies (runId FK, code, severity, detail, penalty) — pour revue manuelle
//
// ALGORITHME serveur (pseudo-code Deno/TypeScript) :
//
//   1. Charger ranked_runs WHERE runId = body.runId AND status = 'active'
//      → 404 si introuvable, 409 si déjà soumis
//
//   2. Valider JWT → userId correspond au run
//      → 403 sinon
//
//   3. Vérifier rate-limit : max 1 soumission toutes 23h par compte
//      → 429 si dépassé
//
//   4. Reconstituer le payload ScoringPayload :
//      { indicators: body.finalIndicators,
//        mandateDays: body.mandateDays,
//        events: body.events,
//        countryId: ranked_runs.countryId,
//        doctrine: ranked_runs.doctrine }
//
//   5. Appeler computeRankedScore(payload) — formule ci-dessus
//      (ré-implémenter en Deno en important cette spec)
//
//   6. Si result.hardReject → UPDATE ranked_runs SET status='rejected'
//      → retourner { ok: false, reason: "score_invalid" } HTTP 422
//
//   7. Insérer ranked_scores { runId, finalScore, breakdown, suspect }
//      Insérer ranked_anomalies si anomalies.length > 0
//      UPDATE ranked_runs SET status = result.suspect ? 'suspect' : 'validated'
//
//   8. Retourner { ok: true, score: result.breakdown.finalScore,
//                  suspect: result.suspect }
//      (suspect:true permet au client de l'afficher discrètement si souhaité)
//
// POLITIQUE DE SANCTIONS
//   • Rejet dur (422)   : run marquée 'rejected', pas de score, pas de bannissement
//   • Marquage suspect  : score stocké mais hors classement public, revue manuelle 30j
//   • Récidive suspecte : si > 3 runs suspectes pour un compte → flag 'review_manual'
//   • Ne jamais bannir automatiquement. Le compte reste jouable en mode non classé.
//
// CLASSEMENT PUBLIC
//   SELECT userId, MAX(finalScore) AS best_score
//   FROM ranked_scores
//   WHERE suspect = false
//   GROUP BY userId
//   ORDER BY best_score DESC
//   LIMIT 100
//
// VÉRIFICATIONS CROISÉES (hint vs journal)
//   Le champ ranked_score_hint dans les events contient :
//   { globalPower, rankingPoints, totalBuildingLevels, researchCount,
//     totalOperations, operationsWon, mandateDay, crisisChoiceCount }
//   Comparer avec ce que le journal contient effectivement :
//     building_upgrade_completed events → doit correspondre à totalBuildingLevels
//     research_completed events        → doit correspondre à researchCount
//     military_op events               → ≤ totalOperations
//     crisis_choice events             → doit correspondre à crisisChoiceCount
//   Incohérence > 15 % → ajouter flag HINT_MISMATCH severity:warn penalty:-10
