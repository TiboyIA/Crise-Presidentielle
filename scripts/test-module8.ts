/**
 * Module 8 — Micro-tests déterministes pour la couche temps de mandat.
 *
 * Couverture :
 *  - formatMandate / formatMandateLabel / formatMandateShort : 1, 12,
 *    13, 60.
 *  - turnToMonth : 1->3, 2->6, 5->15, 20->60, borné 60.
 *  - sanitizeGameTime : valeurs hors-bornes ramenées dans la fenêtre,
 *    speedBeforePause jamais 0, pause forcée au load.
 *  - detectDueReport : pas de bilan en mois 1/2 ; trimestriel en 3/6/9 ;
 *    annuel en 12/24/36/48 (et pas de trimestriel ce mois-là) ; pas de
 *    second tir si déjà compté.
 *  - shouldTriggerElection : true uniquement à 60.
 *  - scheduleNextEventMonth : currentMonth + 3, borné 60.
 *
 * Lancé manuellement via :
 *   pnpm --filter @workspace/etat-de-crise exec tsx scripts/test-module8.ts
 */
import {
  TOTAL_MONTHS,
  MONTHS_PER_DECISION,
  TICK_MS_BY_SPEED,
  INITIAL_GAME_TIME,
  formatMandate,
  formatMandateLabel,
  formatMandateShort,
  turnToMonth,
  sanitizeGameTime,
  detectDueReport,
  shouldTriggerElection,
  scheduleNextEventMonth,
} from "../logic/timeEngine";
import type { Gauges } from "../types/game";

// Snapshot local pour éviter d'importer ../logic/gameEngine qui tire
// d'autres dépendances `@/...` non résolues hors d'Expo/Metro.
const FALLBACK_GAUGES: Gauges = {
  popularity: 50,
  economy: 50,
  budget: 50,
  debt: 30,
  security: 50,
  health: 50,
  ecology: 50,
  cohesion: 50,
  diplomacy: 50,
  regionalStability: 50,
  authority: 50,
};

let failed = 0;
let passed = 0;

function expectEq<T>(actual: T, expected: T, label: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
  } else {
    failed += 1;
    console.error(
      `✗ ${label}\n  attendu: ${JSON.stringify(expected)}\n  reçu:    ${JSON.stringify(actual)}`,
    );
  }
}

// ── Constantes ─────────────────────────────────────────────────────
expectEq(TOTAL_MONTHS, 60, "TOTAL_MONTHS = 60 (5 ans)");
expectEq(MONTHS_PER_DECISION, 3, "MONTHS_PER_DECISION = 3 (1 décision = 1 trimestre)");
// LOT 17 — TICK_MS_BY_SPEED est désormais en ms PAR SEMAINE (4
// semaines/mois). Cadences doublées après LOT 18.3 (lecture
// confortable de l'horloge et du ticker mensuel) :
// x0.5 ≈ 12 min, x1 ≈ 6 min, x2 ≈ 3 min, x4 ≈ 1.5 min pour 60 mois.
expectEq(TICK_MS_BY_SPEED[0.5], 3000, "tick x0.5 = 3000 ms / semaine");
expectEq(TICK_MS_BY_SPEED[1], 1500, "tick x1 = 1500 ms / semaine");
expectEq(TICK_MS_BY_SPEED[2], 750, "tick x2 = 750 ms / semaine");
expectEq(TICK_MS_BY_SPEED[4], 375, "tick x4 = 375 ms / semaine");

// ── Format ─────────────────────────────────────────────────────────
expectEq(formatMandate(1), { year: 1, monthInYear: 1 }, "mois 1 → A1 M1");
expectEq(formatMandate(12), { year: 1, monthInYear: 12 }, "mois 12 → A1 M12");
expectEq(formatMandate(13), { year: 2, monthInYear: 1 }, "mois 13 → A2 M1");
expectEq(formatMandate(60), { year: 5, monthInYear: 12 }, "mois 60 → A5 M12");
expectEq(
  formatMandateLabel(1),
  "Année 1 — Mois 1 du mandat",
  "label mois 1",
);
expectEq(
  formatMandateLabel(60),
  "Année 5 — Mois 12 du mandat",
  "label mois 60",
);
expectEq(formatMandateShort(13), "A2 M1", "short mois 13");

// ── Conversion turn → mois ─────────────────────────────────────────
expectEq(turnToMonth(1), 3, "turn 1 → mois 3");
expectEq(turnToMonth(2), 6, "turn 2 → mois 6");
expectEq(turnToMonth(5), 15, "turn 5 → mois 15");
expectEq(turnToMonth(20), 60, "turn 20 → mois 60");
expectEq(turnToMonth(99), 60, "turn hors borne → 60");
expectEq(turnToMonth(0), 1, "turn 0 → mois 1 (sécurité)");

// ── Sanitize ───────────────────────────────────────────────────────
const fresh = sanitizeGameTime(undefined, FALLBACK_GAUGES);
expectEq(fresh.currentMonth, INITIAL_GAME_TIME.currentMonth, "sanitize undefined → mois initial");
expectEq(fresh.speed, 0, "sanitize undefined → pause");
expectEq(fresh.nextEventMonth, INITIAL_GAME_TIME.nextEventMonth, "sanitize undefined → next event initial");
const dirty = {
  currentMonth: 99,
  nextEventMonth: 200,
  speed: 4 as const,
  speedBeforePause: 0 as 1, // valeur invalide délibérée (test du sanitize)
  pendingReport: null,
  lastReportedQuarter: -5,
  lastReportedYear: -5,
  lastSnapshotGauges: {},
};
const cleaned = sanitizeGameTime(dirty, FALLBACK_GAUGES);
expectEq(cleaned.currentMonth, 60, "currentMonth borné 60");
expectEq(cleaned.nextEventMonth, 60, "nextEventMonth borné 60");
expectEq(cleaned.speed, 0, "speed forcée 0 au load");
expectEq(
  cleaned.speedBeforePause === 0.5 ||
    cleaned.speedBeforePause === 1 ||
    cleaned.speedBeforePause === 2 ||
    cleaned.speedBeforePause === 4,
  true,
  "speedBeforePause toujours 0.5/1/2/4 (LOT 17)",
);
// LOT 17 — 0.5 doit être préservé tel quel (et pas réécrit à 1).
const dirtyHalf = { ...dirty, speedBeforePause: 0.5 as 1 };
const cleanedHalf = sanitizeGameTime(dirtyHalf, FALLBACK_GAUGES);
expectEq(cleanedHalf.speedBeforePause, 0.5, "speedBeforePause=0.5 préservé");
// LOT 17 — weekInMonth manquant → reset à 1 (pas de tick fantôme).
expectEq(cleaned.weekInMonth, 1, "weekInMonth manquant → reset 1");
// LOT 17 — weekInMonth=3 valide → préservé.
const dirtyWeek = { ...dirty, weekInMonth: 3 };
const cleanedWeek = sanitizeGameTime(dirtyWeek, FALLBACK_GAUGES);
expectEq(cleanedWeek.weekInMonth, 3, "weekInMonth=3 préservé");
// LOT 17 — weekInMonth=99 hors-bornes → reset à 1.
const dirtyWeekBad = { ...dirty, weekInMonth: 99 };
const cleanedWeekBad = sanitizeGameTime(dirtyWeekBad, FALLBACK_GAUGES);
expectEq(cleanedWeekBad.weekInMonth, 1, "weekInMonth=99 hors-bornes → 1");

// ── Bilans ─────────────────────────────────────────────────────────
expectEq(detectDueReport(1, 0, 0), null, "pas de bilan en mois 1");
expectEq(detectDueReport(2, 0, 0), null, "pas de bilan en mois 2");
expectEq(detectDueReport(3, 0, 0), "quarter", "bilan trimestriel en mois 3");
expectEq(detectDueReport(6, 3, 0), "quarter", "bilan trimestriel en mois 6");
expectEq(detectDueReport(12, 9, 0), "year", "bilan ANNUEL en mois 12 (pas trimestriel)");
expectEq(detectDueReport(15, 9, 12), "quarter", "bilan trimestriel en mois 15");
expectEq(detectDueReport(24, 21, 12), "year", "bilan annuel en mois 24");
expectEq(detectDueReport(36, 33, 24), "year", "bilan annuel en mois 36");
expectEq(detectDueReport(48, 45, 36), "year", "bilan annuel en mois 48");
// idempotence : si déjà reporté, on ne re-tire pas
expectEq(detectDueReport(3, 3, 0), null, "trimestre déjà compté");
expectEq(detectDueReport(12, 9, 12), null, "année déjà comptée");

// ── Élection ───────────────────────────────────────────────────────
expectEq(shouldTriggerElection(59), false, "pas d'élection avant 60");
expectEq(shouldTriggerElection(60), true, "élection au mois 60");
expectEq(shouldTriggerElection(61), true, "élection si déjà passé 60");

// ── Programmation prochain événement ───────────────────────────────
expectEq(scheduleNextEventMonth(0), 3, "next event après mois 0");
expectEq(scheduleNextEventMonth(45), 48, "next event après mois 45");
expectEq(scheduleNextEventMonth(58), 60, "next event borné à 60");
expectEq(scheduleNextEventMonth(60), 60, "next event reste à 60");

// ── Bilan ──────────────────────────────────────────────────────────
console.log(`\n${passed} OK, ${failed} KO`);
if (failed > 0) {
  process.exit(1);
}
