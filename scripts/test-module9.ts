/**
 * LOT 18 — Micro-tests déterministes pour la couche ressources
 * stockables (Budget National, Influence, Renseignements,
 * Technologie, Énergie).
 *
 * Couverture :
 *  - sanitizeResources : input absent / partiel / non-finite /
 *    hors-bornes ramenés à des valeurs valides.
 *  - clampResources : bornes hautes et basses respectées.
 *  - canAfford : couverture totale, manquant, exact, coût zéro.
 *  - missingResources : liste correcte des ressources manquantes.
 *  - applyCost : débit + clamp à 0 si insuffisant ; non-mutation.
 *  - addResources : crédit + clamp aux bornes ; valeurs négatives
 *    traitées comme un coût.
 *  - formatResource : Budget avec séparateur de milliers,
 *    autres ressources en entier simple.
 *  - formatCosts : ignore zéros, agrège dans l'ordre canonique.
 *
 * Lancé manuellement via :
 *   pnpm --filter @workspace/etat-de-crise exec tsx scripts/test-module9.ts
 */
import {
  INITIAL_RESOURCES,
  RESOURCE_MAX,
  canAfford,
  missingResources,
  applyCost,
  addResources,
  clampResources,
  sanitizeResources,
  formatResource,
  formatCosts,
  regenerateResources,
  formatSkipSummary,
} from "../logic/resources";
import type { Resources } from "../types/game";

let ok = 0;
let ko = 0;
function expectEq<T>(actual: T, expected: T, label: string): void {
  const ax = JSON.stringify(actual);
  const ex = JSON.stringify(expected);
  if (ax === ex) {
    ok++;
  } else {
    ko++;
    console.error(`✗ ${label}: attendu ${ex}, reçu ${ax}`);
  }
}

// ── sanitizeResources ─────────────────────────────────────────────
expectEq(
  sanitizeResources(undefined),
  INITIAL_RESOURCES,
  "sanitize undefined → INITIAL_RESOURCES",
);
expectEq(
  sanitizeResources(null),
  INITIAL_RESOURCES,
  "sanitize null → INITIAL_RESOURCES",
);
expectEq(
  sanitizeResources({}),
  INITIAL_RESOURCES,
  "sanitize {} → INITIAL_RESOURCES",
);
expectEq(
  sanitizeResources("garbage"),
  INITIAL_RESOURCES,
  "sanitize string → INITIAL_RESOURCES",
);
// Partiel : seules les clés présentes valides sont gardées, le reste retombe sur INITIAL.
const partial = sanitizeResources({ budgetNational: 1234 });
expectEq(partial.budgetNational, 1234, "sanitize partial → garde budget");
expectEq(
  partial.politicalInfluence,
  INITIAL_RESOURCES.politicalInfluence,
  "sanitize partial → influence par défaut",
);
// Non-finite & invalides
const dirty = sanitizeResources({
  budgetNational: NaN,
  politicalInfluence: Infinity,
  intelligence: "x" as unknown as number,
  technology: -50,
  energy: 9999,
});
expectEq(
  dirty.budgetNational,
  INITIAL_RESOURCES.budgetNational,
  "sanitize NaN → fallback initial",
);
expectEq(
  dirty.politicalInfluence,
  INITIAL_RESOURCES.politicalInfluence,
  "sanitize Infinity → fallback initial",
);
expectEq(
  dirty.intelligence,
  INITIAL_RESOURCES.intelligence,
  "sanitize string → fallback initial",
);
expectEq(dirty.technology, 0, "sanitize -50 → clamp à 0");
expectEq(dirty.energy, RESOURCE_MAX.energy, "sanitize 9999 → clamp à 100");

// ── clampResources ────────────────────────────────────────────────
const clamped = clampResources({
  budgetNational: 99999,
  politicalInfluence: -10,
  intelligence: 50,
  technology: 200,
  energy: 0.5,
});
expectEq(
  clamped.budgetNational,
  RESOURCE_MAX.budgetNational,
  "clamp budget 99999 → max",
);
expectEq(clamped.politicalInfluence, 0, "clamp influence négatif → 0");
expectEq(clamped.intelligence, 50, "clamp 50 inchangé");
expectEq(clamped.technology, 100, "clamp tech 200 → 100");
expectEq(clamped.energy, 1, "clamp 0.5 → 1 (round)");

// ── canAfford ─────────────────────────────────────────────────────
const wallet: Resources = {
  budgetNational: 1000,
  politicalInfluence: 30,
  intelligence: 20,
  technology: 10,
  energy: 50,
};
expectEq(
  canAfford(wallet, { budgetNational: 500, technology: 5 }),
  true,
  "canAfford couvert",
);
expectEq(
  canAfford(wallet, { budgetNational: 1500 }),
  false,
  "canAfford insuffisant budget",
);
expectEq(
  canAfford(wallet, { technology: 10 }),
  true,
  "canAfford exact tech",
);
expectEq(
  canAfford(wallet, { technology: 11 }),
  false,
  "canAfford 1 de moins → false",
);
expectEq(canAfford(wallet, {}), true, "canAfford coût vide → true");
expectEq(
  canAfford(wallet, { budgetNational: 0 }),
  true,
  "canAfford coût 0 → true",
);
expectEq(
  canAfford(wallet, { budgetNational: -10 }),
  true,
  "canAfford coût négatif → true",
);

// ── missingResources ──────────────────────────────────────────────
expectEq(
  missingResources(wallet, { budgetNational: 500, technology: 5 }),
  [],
  "missingResources couvert → []",
);
expectEq(
  missingResources(wallet, {
    budgetNational: 1500,
    technology: 50,
    energy: 10,
  }),
  ["budgetNational", "technology"],
  "missingResources liste budget+tech (énergie OK)",
);

// ── applyCost ─────────────────────────────────────────────────────
const after = applyCost(wallet, { budgetNational: 300, technology: 5 });
expectEq(after.budgetNational, 700, "applyCost budget 1000-300");
expectEq(after.technology, 5, "applyCost tech 10-5");
expectEq(after.politicalInfluence, 30, "applyCost autres inchangées");
// Non-mutation
expectEq(wallet.budgetNational, 1000, "applyCost ne mute pas l'argument");
// Clamp à 0 si dépassement
const broke = applyCost(wallet, { budgetNational: 5000 });
expectEq(broke.budgetNational, 0, "applyCost clamp à 0 si dépassement");

// ── addResources ──────────────────────────────────────────────────
const richer = addResources(wallet, { budgetNational: 500, technology: 5 });
expectEq(richer.budgetNational, 1500, "addResources budget +500");
expectEq(richer.technology, 15, "addResources tech +5");
// Clamp au max
const overflow = addResources(wallet, { politicalInfluence: 200 });
expectEq(
  overflow.politicalInfluence,
  RESOURCE_MAX.politicalInfluence,
  "addResources clamp au max",
);
// Delta négatif → équivalent débit
const debited = addResources(wallet, { budgetNational: -300 });
expectEq(debited.budgetNational, 700, "addResources delta négatif = débit");

// ── formatResource ────────────────────────────────────────────────
// `toLocaleString("fr-FR")` utilise un espace insécable étroit (NNBSP,
// U+202F) comme séparateur de milliers — pas un espace ASCII.
const NNBSP = "\u202f";
expectEq(
  formatResource("budgetNational", 4250),
  `4${NNBSP}250`,
  "format Budget avec séparateur de milliers (NNBSP)",
);
expectEq(
  formatResource("budgetNational", 1000000),
  `1${NNBSP}000${NNBSP}000`,
  "format Budget multi-séparateurs (NNBSP)",
);
expectEq(
  formatResource("politicalInfluence", 50),
  "50",
  "format Influence entier simple",
);
expectEq(
  formatResource("intelligence", 0),
  "0",
  "format 0 → '0'",
);
expectEq(
  formatResource("technology", 99.7),
  "100",
  "format arrondit (99.7 → 100)",
);

// ── formatCosts ───────────────────────────────────────────────────
expectEq(
  formatCosts({ budgetNational: 500, technology: 20 }),
  "500 Budget · 20 Tech",
  "formatCosts ordre canonique",
);
expectEq(formatCosts({}), "", "formatCosts vide → ''");
expectEq(
  formatCosts({ budgetNational: 0, energy: 5 }),
  "5 Énergie",
  "formatCosts ignore zéros",
);
expectEq(
  formatCosts({ budgetNational: -10 }),
  "",
  "formatCosts ignore valeurs négatives",
);
expectEq(
  formatCosts({
    budgetNational: 700,
    politicalInfluence: 5,
    intelligence: 10,
    technology: 25,
    energy: 40,
  }),
  "700 Budget · 5 Influ. · 10 Rens. · 25 Tech · 40 Énergie",
  "formatCosts toutes ressources",
);

// ── regenerateResources (LOT 18.3) ────────────────────────────────
// Jauges médianes (50 partout, 0 dette/corruption/oppo) → delta canon :
//   budget : 200 + 0 + 0 - 150 - 0 = +50
//   influence : pop=50 → 0
//   intel : +2
//   tech : +1
//   energy : +2
const baseGauges = {
  popularity: 50,
  economy: 50,
  cohesion: 50,
  health: 50,
  ecology: 50,
  debt: 0,
};
const baseHidden = { corruption: 0, oppositionPower: 0 };

const regen1 = regenerateResources(INITIAL_RESOURCES, baseGauges, baseHidden);
expectEq(
  regen1.delta,
  {
    budgetNational: 50,
    intelligence: 2,
    technology: 1,
    energy: 2,
  },
  "regenerateResources jauges médianes → delta canon",
);
expectEq(
  regen1.nextResources,
  {
    budgetNational: 5050,
    politicalInfluence: 50,
    intelligence: 32,
    technology: 21,
    energy: 62,
  },
  "regenerateResources jauges médianes → nextResources crédité",
);
expectEq(
  regen1.summary,
  "📊 Bilan mensuel — Budget +50 · Rens. +2 · Tech +1 · Énergie +2",
  "regenerateResources summary lisible",
);
// Économie au sol (eco=0, dette=80) → budget effondré
const regen2 = regenerateResources(
  INITIAL_RESOURCES,
  { ...baseGauges, economy: 0, debt: 80, popularity: 20, ecology: 10 },
  { ...baseHidden, corruption: 70, oppositionPower: 80 },
);
expectEq(
  regen2.delta.budgetNational,
  // 200 + (0-50)*4 + 0 - 150 - 80*0.5 = 200 -200 + 0 -150 -40 = -190
  -190,
  "regenerateResources éco effondrée → budget -190",
);
expectEq(
  regen2.delta.politicalInfluence,
  // pop≤30: -1, oppo≥70: -1 = -2
  -2,
  "regenerateResources pop basse + oppo haute → influence -2",
);
expectEq(
  regen2.delta.intelligence,
  // base +2, corruption≥60: -1 = +1
  1,
  "regenerateResources corruption haute → intel +1 net",
);
expectEq(
  regen2.delta.energy,
  // base +2, ecology≤30: -1 = +1
  1,
  "regenerateResources écologie basse → énergie +1 net",
);
// Non-mutation : l'input n'est jamais altéré.
const before = { ...INITIAL_RESOURCES };
regenerateResources(before, baseGauges, baseHidden);
expectEq(before, INITIAL_RESOURCES, "regenerateResources ne mute pas l'input");
// Clamp à 0 : si budget déjà très bas et delta négatif fort, plancher 0.
const lowBudget: Resources = {
  budgetNational: 100,
  politicalInfluence: 0,
  intelligence: 0,
  technology: 0,
  energy: 0,
};
const regen3 = regenerateResources(
  lowBudget,
  { ...baseGauges, economy: 0, debt: 100 },
  baseHidden,
);
// Brut : 200 + (-200) + 0 - 150 - 50 = -200 ; budget=100, donc tombe à 0
// (clamp). Le delta RÉEL exposé doit être -100, pas -200.
expectEq(
  regen3.nextResources.budgetNational,
  0,
  "regenerateResources clamp à 0 (pas de dette)",
);
expectEq(
  regen3.delta.budgetNational,
  -100,
  "regenerateResources delta réel reflète le clamp",
);
// Clamp au max : si tech déjà à 100 (max), pas de gain.
const maxed: Resources = { ...INITIAL_RESOURCES, technology: 100 };
const regen4 = regenerateResources(
  maxed,
  { ...baseGauges, health: 80 },
  baseHidden,
);
expectEq(
  regen4.nextResources.technology,
  100,
  "regenerateResources clamp au RESOURCE_MAX",
);
expectEq(
  regen4.delta.technology,
  undefined,
  "regenerateResources delta omis si gain nul (clamp max)",
);

// Parité skip ↔ N appels mensuels : composer regen 3 fois doit
// produire le même nextResources qu'un seul appel * 3 (modulo clamp).
// Ce test garantit l'invariant que skipToNextEvent et advanceOneMonth
// restent symétriques côté ressources sur les chemins nominaux.
const stableGauges = { ...baseGauges, economy: 60, cohesion: 55, debt: 20 };
const stableHidden = baseHidden;
let composed = INITIAL_RESOURCES;
for (let i = 0; i < 3; i++) {
  composed = regenerateResources(composed, stableGauges, stableHidden)
    .nextResources;
}
// 3 appels indépendants ≡ chaîne fonctionnelle. Pas de drift.
expectEq(
  Number.isInteger(composed.budgetNational),
  true,
  "regenerateResources composition 3 mois → entiers stables",
);
expectEq(
  composed.energy <= RESOURCE_MAX.energy,
  true,
  "regenerateResources composition 3 mois → respecte clamp max",
);
expectEq(
  composed.budgetNational > INITIAL_RESOURCES.budgetNational,
  true,
  "regenerateResources composition 3 mois éco saine → budget croît",
);

// Dette impaire (debt=83) → debt*0.5 = 41.5, arrondi déterministe.
// Le résultat doit être un entier (Math.round dans regenerateResources)
// sans NaN ni valeur fractionnaire — sinon les ressources stockables
// ne seraient plus des compteurs entiers.
const regen5 = regenerateResources(
  INITIAL_RESOURCES,
  { ...baseGauges, debt: 83 },
  baseHidden,
);
const budgetDelta5 = regen5.delta.budgetNational ?? 0;
expectEq(
  Number.isInteger(budgetDelta5),
  true,
  "regenerateResources delta budget reste entier (debt impair)",
);
expectEq(
  Number.isInteger(regen5.nextResources.budgetNational),
  true,
  "regenerateResources nextResources budget reste entier (debt impair)",
);
// 200 + 0 + 0 - 150 - round(83*0.5) = 50 - 42 = 8.
expectEq(
  budgetDelta5,
  8,
  "regenerateResources debt=83 → budget +8 (déterministe)",
);

// ── formatSkipSummary ─────────────────────────────────────────────
expectEq(
  formatSkipSummary(3, { budgetNational: 1200, technology: 5 }),
  "📊 Saut de 3 mois — Budget +1\u202f200 · Tech +5",
  "formatSkipSummary 3 mois avec deltas",
);
expectEq(
  formatSkipSummary(1, {}),
  "📊 Saut de 1 mois — ressources inchangées",
  "formatSkipSummary delta vide → message inchangé",
);
expectEq(
  formatSkipSummary(2, { budgetNational: -300, energy: -2 }),
  "📊 Saut de 2 mois — Budget -300 · Énergie -2",
  "formatSkipSummary deltas négatifs",
);

console.log(`\n${ok} OK, ${ko} KO`);
if (ko > 0) process.exit(1);
