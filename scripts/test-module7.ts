/**
 * Module 7 — micro-tests déterministes (no framework, exit code 0/1).
 *
 * Couverture (mise à jour LOT 18.2) :
 *  - sanitizeTechState : forme par défaut, IDs invalides filtrés,
 *    inProgress incohérent rejeté.
 *  - startResearch : refus si game over / pas de président / déjà en
 *    cours / déjà acquise / RESSOURCES insuffisantes ; succès sinon
 *    avec completedTurn = startedTurn + duration et débit en
 *    ressources cohérent (`nextResources` = ressources - costs).
 *  - tickResearch : pas de mutation avant terme, bascule en
 *    `researched` quand turn >= completedTurn, idempotent si
 *    re-appelé sur la même techno.
 *  - researchProgress : ratio borné [0,1], turnsLeft cohérent.
 *
 * Lancé manuellement via :
 *   pnpm --filter @workspace/etat-de-crise exec tsx scripts/test-module7.ts
 */
import {
  sanitizeTechState,
  startResearch,
  tickResearch,
  researchProgress,
  isTechResearched,
} from "../logic/techTree";
import { TECH_TREE } from "../data/techTree";
import { INITIAL_RESOURCES } from "../logic/resources";
import type {
  GameState,
  Gauges,
  HiddenGauges,
  Resources,
  TechState,
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

const baseGauges: Gauges = {
  popularity: 50,
  authority: 50,
  economy: 50,
  security: 50,
  ecology: 50,
  health: 50,
  diplomacy: 50,
  cohesion: 50,
  budget: 50,
  debt: 30,
  regionalStability: 50,
};
const baseHidden: HiddenGauges = {
  scandalRisk: 0,
  peopleFatigue: 0,
  radicalization: 0,
  cyberRisk: 0,
  foreignDependence: 0,
  corruption: 0,
  oppositionPower: 0,
};

// State minimal : on triche en castant, seuls les champs lus par
// startResearch sont renseignés (gameOver/president/gauges/tech/resources).
// LOT 18.2 — `resources` peut être surchargé pour simuler des stocks
// insuffisants ; non précisé → INITIAL_RESOURCES (5000/50/30/20/60).
function makeState(over: {
  tech?: TechState;
  resources?: Partial<Resources>;
  over?: boolean;
  pres?: boolean;
}): GameState {
  return {
    president: over.pres === false ? null : ({ name: "Test" } as any),
    gauges: baseGauges,
    hiddenGauges: baseHidden,
    turn: 1,
    maxTurns: 20,
    gameOver: { isOver: !!over.over } as any,
    tech: over.tech,
    resources: { ...INITIAL_RESOURCES, ...(over.resources ?? {}) },
  } as unknown as GameState;
}

console.log("\n— sanitizeTechState —");
// Module 7.1 : la forme intègre désormais activeDoctrines + cyberShieldUsesRemaining.
const DEFAULT_TECH_JSON =
  '{"researched":[],"inProgress":null,"activeDoctrines":[],"cyberShieldUsesRemaining":0}';
check(
  "Défaut sur valeur absente",
  JSON.stringify(sanitizeTechState(undefined)) === DEFAULT_TECH_JSON,
);
check(
  "Défaut sur null",
  JSON.stringify(sanitizeTechState(null)) === DEFAULT_TECH_JSON,
);
check(
  "Filtre IDs invalides",
  sanitizeTechState({ researched: ["cyber_security", "BAD_ID"], inProgress: null })
    .researched.length === 1,
);
check(
  "Rejette inProgress incohérent (completedTurn < startedTurn)",
  sanitizeTechState({
    researched: [],
    inProgress: { id: "cyber_security", startedTurn: 5, completedTurn: 2 },
  }).inProgress === null,
);
check(
  "Rejette inProgress dont la techno est déjà acquise",
  sanitizeTechState({
    researched: ["cyber_security"],
    inProgress: { id: "cyber_security", startedTurn: 1, completedTurn: 5 },
  }).inProgress === null,
);

console.log("\n— startResearch refus —");
check(
  "Refus si game over",
  !startResearch(makeState({ over: true }), "cyber_security", 1).ok,
);
check(
  "Refus si pas de président",
  !startResearch(makeState({ pres: false }), "cyber_security", 1).ok,
);
// LOT 18.2 — Plus de budget unique : on teste le manque sur chaque axe.
const refusBudget = startResearch(
  makeState({ resources: { budgetNational: 0 } }),
  "cyber_security",
  1,
);
check(
  "Refus si budgetNational insuffisant (raison = insufficient_resources)",
  !refusBudget.ok && refusBudget.reason === "insufficient_resources",
);
check(
  "Refus expose le détail du manque (missing.budgetNational > 0)",
  !refusBudget.ok &&
    refusBudget.reason === "insufficient_resources" &&
    (refusBudget.missing?.budgetNational ?? 0) > 0,
);
const refusTech = startResearch(
  makeState({ resources: { technology: 0 } }),
  "cyber_security",
  1,
);
check(
  "Refus si technology insuffisant (autre ressource)",
  !refusTech.ok && refusTech.reason === "insufficient_resources",
);
const refusIntel = startResearch(
  makeState({ resources: { intelligence: 0 } }),
  "antimissile_shield",
  1,
);
check(
  "Refus antimissile si intelligence à 0",
  !refusIntel.ok && refusIntel.reason === "insufficient_resources",
);
check(
  "Refus si déjà acquise",
  !startResearch(
    makeState({ tech: { researched: ["cyber_security"], inProgress: null } }),
    "cyber_security",
    1,
  ).ok,
);
check(
  "Refus si autre recherche en cours",
  !startResearch(
    makeState({
      tech: {
        researched: [],
        inProgress: { id: "admin_ai", startedTurn: 1, completedTurn: 4 },
      },
    }),
    "cyber_security",
    1,
  ).ok,
);

console.log("\n— startResearch succès —");
// LOT 18.2 — Avec INITIAL_RESOURCES (5000/50/30/20/60) on PEUT lancer
// cyber_security (250/0/10/12/0). On vérifie le débit cohérent.
const r = startResearch(makeState({}), "cyber_security", 3);
check("OK avec ressources de départ", r.ok);
if (r.ok) {
  const node = TECH_TREE.cyber_security;
  check(
    "costs renvoyé = node.costs",
    JSON.stringify(r.costs) === JSON.stringify(node.costs),
  );
  check(
    "completedTurn = startedTurn + duration",
    r.nextTech.inProgress?.completedTurn === 3 + node.durationTurns,
  );
  check(
    "inProgress.id = id demandé",
    r.nextTech.inProgress?.id === "cyber_security",
  );
  // Débit ressource bien appliqué (Budget débité de costs.budgetNational).
  check(
    "nextResources.budgetNational débité du coût",
    r.nextResources.budgetNational ===
      INITIAL_RESOURCES.budgetNational - (node.costs.budgetNational ?? 0),
  );
  check(
    "nextResources.technology débité du coût",
    r.nextResources.technology ===
      INITIAL_RESOURCES.technology - (node.costs.technology ?? 0),
  );
  check(
    "nextResources.intelligence débité du coût",
    r.nextResources.intelligence ===
      INITIAL_RESOURCES.intelligence - (node.costs.intelligence ?? 0),
  );
  // Ressources non listées dans costs : INCHANGÉES.
  check(
    "nextResources.energy inchangé (pas dans costs cyber_security)",
    r.nextResources.energy === INITIAL_RESOURCES.energy,
  );
}

console.log("\n— tickResearch —");
const inProgressTech: TechState = {
  researched: [],
  inProgress: {
    id: "cyber_security",
    startedTurn: 1,
    completedTurn: 5,
  },
};
// Module 7.1 : tickResearch retourne désormais { tech, activatedDoctrines }.
const tickedEarly = tickResearch(inProgressTech, 3);
check("Avant terme : inchangé", tickedEarly.tech === inProgressTech);
const tickedAtTerm = tickResearch(inProgressTech, 5);
check(
  "À terme : techno acquise",
  tickedAtTerm.tech.researched.includes("cyber_security"),
);
check("À terme : inProgress libéré", tickedAtTerm.tech.inProgress === null);
const tickedAfter = tickResearch(inProgressTech, 9);
check(
  "Après terme : techno acquise (rétro-rattrapage)",
  tickedAfter.tech.researched.includes("cyber_security"),
);
// Idempotence : re-tick d'un état déjà sans inProgress = no-op.
const noopTick = tickResearch(tickedAtTerm.tech, 6);
check("No-op si pas de inProgress", noopTick.tech === tickedAtTerm.tech);

console.log("\n— researchProgress —");
const p1 = researchProgress(inProgressTech, 1);
check("À t=startedTurn : ratio 0", p1?.ratio === 0);
const p2 = researchProgress(inProgressTech, 3);
check(
  "À mi-parcours : ratio ≈ 0.5",
  p2 != null && Math.abs(p2.ratio - 0.5) < 0.01,
);
const p3 = researchProgress(inProgressTech, 7);
check("Au-delà : ratio borné à 1", p3?.ratio === 1);
const p4 = researchProgress(
  { researched: [], inProgress: null },
  3,
);
check("Sans inProgress : null", p4 === null);

console.log("\n— Helper isTechResearched —");
check(
  "Vrai si présente",
  isTechResearched(
    makeState({ tech: { researched: ["admin_ai"], inProgress: null } }),
    "admin_ai",
  ),
);
check(
  "Faux si absente",
  !isTechResearched(
    makeState({ tech: { researched: ["admin_ai"], inProgress: null } }),
    "cyber_security",
  ),
);

console.log("");
if (failed > 0) {
  // eslint-disable-next-line no-console
  console.error(`✗ ${failed} test(s) en échec`);
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log("✓ Tous les tests Module 7 passent");
}
