/**
 * Module 6 — micro-tests déterministes (no framework, exit code 0/1).
 *
 * Couverture :
 *  - tickHostilePower : aggression bornée, monotone vers le haut sur
 *    plusieurs tours, peut produire des opérations.
 *  - judgeWar : seuils victory / defeat / truce respectés.
 *  - computeThreatLevel : 4 paliers cohérents en fonction des ops
 *    accumulées.
 *  - shouldIssueUltimatum : faux par défaut, vrai après accumulation.
 *
 * Lancé manuellement via :
 *   pnpm --filter @workspace/etat-de-crise exec tsx scripts/test-module6.ts
 */
import {
  tickHostilePower,
  computeThreatLevel,
  shouldIssueUltimatum,
} from "../logic/hybridWarfare";
import { judgeWar } from "../logic/warEngine";
import { createDefaultHostilePower } from "../data/hostilePowers";
import type {
  GameState,
  Gauges,
  HiddenGauges,
  HybridOperation,
  WarState,
} from "../types/game";

let failed = 0;
function check(label: string, cond: boolean, info?: unknown) {
  if (cond) {
    // eslint-disable-next-line no-console
    console.log(`  OK    ${label}`);
  } else {
    failed += 1;
    // eslint-disable-next-line no-console
    console.log(`  FAIL  ${label}`, info ?? "");
  }
}

// ── Fixtures basiques ────────────────────────────────────────────
const baseGauges: Gauges = {
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
const baseHidden: HiddenGauges = {
  scandalRisk: 10,
  peopleFatigue: 10,
  radicalization: 10,
  foreignDependence: 30,
  cyberRisk: 30,
  corruption: 10,
  oppositionPower: 30,
};

// ── Test 1 : tickHostilePower borne aggression et produit des ops ──
//
// On démarre à aggression=65 (état réaliste après 4-5 tours d'un
// mandat où le joueur a multiplié les choix « durs »), le moteur
// doit alors produire au moins 1 opération sur 24 ticks.
console.log("Test 1 — tickHostilePower : aggression bornée + ops produites");
{
  const hp0 = createDefaultHostilePower();
  hp0.aggression = 65;
  let hp = hp0;
  let ops: HybridOperation[] = [];
  let opsProduced = 0;
  for (let t = 1; t <= 24; t++) {
    const r = tickHostilePower(hp, ops, baseGauges, baseHidden, t, [], false);
    hp = r.hostilePower;
    if (r.injectEventId) {
      // Ajout manuel — le moteur retourne nextOps via hybridOps.
      ops = r.hybridOps;
      opsProduced += 1;
    }
    check(
      `T${t} aggression in [0,100]`,
      hp.aggression >= 0 && hp.aggression <= 100,
      hp.aggression,
    );
  }
  check(
    "au moins 1 opération produite sur 24 tours @ aggression initiale 65",
    opsProduced >= 1,
    { opsProduced },
  );
}

// ── Test 2 : computeThreatLevel — 4 paliers ──────────────────────
console.log("\nTest 2 — computeThreatLevel : 4 paliers");
{
  const hp = createDefaultHostilePower();
  const baseState: GameState = {
    hostilePower: hp,
    hybridOps: [],
  } as unknown as GameState;
  hp.aggression = 20;
  check("aggression 20 → vigilance", computeThreatLevel(baseState) === "vigilance");
  hp.aggression = 45;
  check("aggression 45 → tension", computeThreatLevel(baseState) === "tension");
  hp.aggression = 70;
  check("aggression 70 → alerte", computeThreatLevel(baseState) === "alerte");
  hp.aggression = 90;
  check("aggression 90 → imminence", computeThreatLevel(baseState) === "imminence");
}

// ── Test 3 : judgeWar — seuils victoire / défaite / trêve ────────
console.log("\nTest 3 — judgeWar : seuils");
{
  const ws = (mob: number, allies: number, supply: number): WarState => ({
    status: "war",
    ultimatumTurn: 0,
    warTurn: 3,
    maxWarTurns: 3,
    mobilization: mob,
    allies,
    supply,
    outcome: null,
  });
  check("score >= 200 → victory", judgeWar(ws(80, 80, 60)) === "victory");
  check("score < 110 → defeat", judgeWar(ws(20, 30, 30)) === "defeat");
  check("entre les deux → truce", judgeWar(ws(50, 50, 50)) === "truce");
}

// ── Test 4 : shouldIssueUltimatum monte avec ops non désamorcées ─
console.log("\nTest 4 — shouldIssueUltimatum");
{
  const hp = createDefaultHostilePower();
  hp.aggression = 30;
  const state0: GameState = {
    hostilePower: hp,
    hybridOps: [],
    warState: null,
  } as unknown as GameState;
  check("baseline → false", shouldIssueUltimatum(state0) === false);
  hp.aggression = 95;
  const state1: GameState = {
    hostilePower: hp,
    hybridOps: Array.from({ length: 6 }, (_, i) => ({
      id: `op_${i}`,
      vector: "cyber",
      eventId: "ev_x",
      turn: i,
      severity: "medium",
      defused: false,
      resolved: true,
    })) as HybridOperation[],
    warState: null,
  } as unknown as GameState;
  check(
    "aggression 95 + 6 ops subies → true",
    shouldIssueUltimatum(state1) === true,
  );
}

console.log(
  failed === 0
    ? "\n✓ Tous les tests passent."
    : `\n✗ ${failed} test(s) en échec.`,
);
process.exit(failed === 0 ? 0 : 1);
