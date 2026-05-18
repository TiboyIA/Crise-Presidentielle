import type {
  HiddenPolitics,
  NationalIndicators,
  NewsChoice,
  NewsEvent,
  StrategyResources,
} from "@/types/strategy";

// ── Normalisation des effets ──────────────────────────────────────────────────
//
// Chaque type d'effet a une amplitude typique différente.
// On ramène tout à une unité commune (1 pt = "effet modéré") pour pouvoir
// comparer gains et coûts entre ressources, indicateurs et politique cachée.
//
//  money       : ±100 par pt  (un delta de 300 = 3 pts)
//  resources   : ±10  par pt  (un delta de 20 = 2 pts)
//  indicators  : ±5   par pt  (un delta de 10 = 2 pts)
//  hiddenPol.  : ±3   par pt  (un delta de 6 = 2 pts)

const RES_NORM  = 10;
const IND_NORM  = 5;
const HP_NORM   = 3;

function normResource(key: keyof StrategyResources, val: number): number {
  return key === "money" ? val / 100 : val / RES_NORM;
}

function normIndicator(_key: keyof NationalIndicators, val: number): number {
  return val / IND_NORM;
}

function normHidden(_key: keyof HiddenPolitics, val: number): number {
  return val / HP_NORM;
}

// ── Modèle interne ────────────────────────────────────────────────────────────

interface ChoiceVector {
  [dimension: string]: number; // clé normalisée → valeur normalisée
}

function buildVector(choice: NewsChoice): ChoiceVector {
  const v: ChoiceVector = {};

  for (const [k, val] of Object.entries(choice.effects ?? {})) {
    if (val !== undefined) v[`res_${k}`] = normResource(k as keyof StrategyResources, val);
  }
  for (const [k, val] of Object.entries(choice.indicatorEffects ?? {})) {
    if (val !== undefined) v[`ind_${k}`] = normIndicator(k as keyof NationalIndicators, val);
  }
  for (const [k, val] of Object.entries(choice.hiddenPoliticsEffects ?? {})) {
    if (val !== undefined) v[`hp_${k}`] = normHidden(k as keyof HiddenPolitics, val);
  }

  return v;
}

// Somme des composantes positives (gains bruts normalisés)
function totalGains(v: ChoiceVector): number {
  return Object.values(v).filter((x) => x > 0).reduce((s, x) => s + x, 0);
}

// Somme des valeurs absolues des composantes négatives (coûts bruts normalisés)
function totalCosts(v: ChoiceVector): number {
  return Object.values(v).filter((x) => x < 0).reduce((s, x) => s + Math.abs(x), 0);
}

// ── Types publics ─────────────────────────────────────────────────────────────

/**
 * Problème détecté sur un choix individuel.
 *
 *  no_cost   — aucun effet négatif : le joueur ne sacrifie rien.
 *  no_gain   — aucun effet positif : pourquoi choisir ça ?
 *  dominated — un autre choix est strictement meilleur sur TOUTES les dimensions.
 *  free_win  — gains élevés, coûts quasi-nuls ET sans conséquence cachée :
 *              combinaison trop généreuse pour un dilemme crédible.
 */
export type ParetoFlag = "no_cost" | "no_gain" | "dominated" | "free_win";

/**
 * Problème détecté à l'échelle de l'événement.
 *
 *  perfect_choice_exists      — au moins un choix sans aucun coût.
 *  dominated_choice_exists    — au moins un choix rendu inutile par un autre.
 *  no_real_tradeoff           — aucun choix n'exige un vrai sacrifice.
 *  missing_hidden_consequence — événement critique sans conséquence cachée possible.
 *  no_strong_advantage        — aucun choix n'a d'avantage clair et fort.
 */
export type DilemmaFlag =
  | "perfect_choice_exists"
  | "dominated_choice_exists"
  | "no_real_tradeoff"
  | "missing_hidden_consequence"
  | "no_strong_advantage";

export interface ChoiceDiagnosis {
  id: string;
  label: string;
  /** Points de gain normalisés (somme des effets positifs). */
  gains: number;
  /** Points de coût normalisés (somme des |effets négatifs|). */
  costs: number;
  /** gains − costs. Positif = choix favorable en net. */
  balance: number;
  /** Vrai si le choix peut déclencher une DelayedConsequence. */
  hasHiddenConsequence: boolean;
  flags: ParetoFlag[];
}

export interface ParetoDilemmaReport {
  eventId: string;
  eventTitle: string;
  urgency: string;
  isCritical: boolean;
  choices: ChoiceDiagnosis[];
  dilemmaFlags: DilemmaFlag[];
  /** true uniquement si aucun flag n'est levé — l'événement est bien équilibré. */
  isWellBalanced: boolean;
  /** Suggestions concrètes pour corriger les déséquilibres détectés. */
  recommendations: string[];
}

// ── Seuils de détection ───────────────────────────────────────────────────────
//
// Ajuster ces valeurs pour calibrer la sensibilité du checker.
// Trop bas → faux positifs. Trop haut → déséquilibres manqués.

/** En dessous de ce coût normalisé, on considère le choix "sans coût réel". */
const COST_THRESHOLD  = 0.5;

/** En dessous de ce gain normalisé, on considère le choix "sans gain réel". */
const GAIN_THRESHOLD  = 0.5;

/**
 * Un choix est "free_win" si gains > FREE_WIN_RATIO × coûts.
 * Ratio de 4 signifie : on gagne 4× plus qu'on ne perd.
 */
const FREE_WIN_RATIO  = 4.0;

/**
 * Gain minimum pour qu'un choix soit considéré comme "à avantage fort".
 * Équivaut à environ +2 indicateurs à +5 pts, ou +200 money.
 */
const STRONG_GAIN_THRESHOLD = 2.0;

/**
 * Marge de tolérance pour la détection de dominance.
 * A domine B si A[dim] >= B[dim] − DOMINANCE_MARGIN sur toutes les dimensions.
 * Évite de déclarer une dominance pour un écart d'arrondi.
 */
const DOMINANCE_MARGIN = 0.1;

// ── Détection de dominance ────────────────────────────────────────────────────
//
// A domine B si :
//  1. Pour chaque dimension présente dans B, A[dim] >= B[dim] (à la marge près).
//  2. A a au moins une dimension strictement supérieure à B.
//
// On fusionne les clés des deux vecteurs pour traiter les dimensions absentes
// comme 0 (pas d'effet sur cette dimension = neutre).

function dominates(a: ChoiceVector, b: ChoiceVector): boolean {
  const dims = new Set([...Object.keys(a), ...Object.keys(b)]);
  let strictlyBetterOnce = false;

  for (const dim of dims) {
    const aVal = a[dim] ?? 0;
    const bVal = b[dim] ?? 0;
    if (aVal < bVal - DOMINANCE_MARGIN) return false;  // B est meilleur sur cette dim
    if (aVal > bVal + DOMINANCE_MARGIN) strictlyBetterOnce = true;
  }

  return strictlyBetterOnce;
}

// ── Analyse d'un événement ────────────────────────────────────────────────────

/**
 * Analyse les choix d'un événement interactif et retourne un rapport de
 * déséquilibre Pareto.
 *
 * Appeler uniquement sur des événements `isInteractive === true` avec des `choices`.
 * Les événements non-interactifs n'ont pas de dilemmes à analyser.
 */
export function analyseEvent(event: NewsEvent): ParetoDilemmaReport | null {
  if (!event.isInteractive || !event.choices || event.choices.length < 2) return null;

  const isCritical = event.urgency === "critique" || event.urgency === "forte";

  // Construire les vecteurs normalisés pour chaque choix
  const vectors = event.choices.map((c) => buildVector(c));

  // Diagnostiquer chaque choix
  const choices: ChoiceDiagnosis[] = event.choices.map((choice, i) => {
    const v       = vectors[i];
    const gains   = totalGains(v);
    const costs   = totalCosts(v);
    const balance = gains - costs;
    const hasHiddenConsequence = !!choice.queuesDelayedConsequence;
    const flags: ParetoFlag[] = [];

    if (costs < COST_THRESHOLD)  flags.push("no_cost");
    if (gains < GAIN_THRESHOLD)  flags.push("no_gain");

    // Un choix est "free_win" s'il est très rentable sans coût ni conséquence cachée
    if (gains > COST_THRESHOLD && costs < COST_THRESHOLD && !hasHiddenConsequence &&
        gains / Math.max(costs, 0.01) >= FREE_WIN_RATIO) {
      flags.push("free_win");
    }

    // Vérifier si ce choix est dominé par au moins un autre
    const isDominated = vectors.some((other, j) => j !== i && dominates(other, v));
    if (isDominated) flags.push("dominated");

    return { id: choice.id, label: choice.label, gains, costs, balance, hasHiddenConsequence, flags };
  });

  // Flags au niveau événement
  const dilemmaFlags: DilemmaFlag[] = [];

  if (choices.some((c) => c.flags.includes("no_cost") || c.flags.includes("free_win"))) {
    dilemmaFlags.push("perfect_choice_exists");
  }
  if (choices.some((c) => c.flags.includes("dominated"))) {
    dilemmaFlags.push("dominated_choice_exists");
  }
  if (choices.every((c) => c.balance > 0)) {
    // Tous les choix sont en net positif — pas de vrai sacrifice exigé
    dilemmaFlags.push("no_real_tradeoff");
  }
  if (isCritical && choices.every((c) => !c.hasHiddenConsequence)) {
    dilemmaFlags.push("missing_hidden_consequence");
  }
  if (choices.every((c) => c.gains < STRONG_GAIN_THRESHOLD)) {
    dilemmaFlags.push("no_strong_advantage");
  }

  const recommendations = buildRecommendations(event, choices, dilemmaFlags);
  const isWellBalanced  = dilemmaFlags.length === 0;

  return {
    eventId:      event.id,
    eventTitle:   event.title,
    urgency:      event.urgency,
    isCritical,
    choices,
    dilemmaFlags,
    isWellBalanced,
    recommendations,
  };
}

// ── Recommandations textuelles ────────────────────────────────────────────────

function buildRecommendations(
  event: NewsEvent,
  choices: ChoiceDiagnosis[],
  flags: DilemmaFlag[],
): string[] {
  const rec: string[] = [];

  for (const c of choices) {
    if (c.flags.includes("no_cost") && !c.flags.includes("no_gain")) {
      rec.push(`"${c.label}" : aucun coût — ajouter un malus (ex: -influence, -money, ou hiddenPoliticsEffect).`);
    }
    if (c.flags.includes("no_gain")) {
      rec.push(`"${c.label}" : aucun gain — ce choix est peu attractif, ajouter un avantage ou supprimer.`);
    }
    if (c.flags.includes("dominated")) {
      rec.push(`"${c.label}" : dominé par un autre choix — aucun joueur rationnel ne le choisira.`);
    }
    if (c.flags.includes("free_win")) {
      rec.push(`"${c.label}" : gains élevés sans coût ni conséquence cachée — risque de choix évident.`);
    }
  }

  if (flags.includes("no_real_tradeoff")) {
    rec.push(`[${event.id}] Tous les choix sont en net positif — renforcer au moins un coût pour créer un vrai dilemme.`);
  }
  if (flags.includes("missing_hidden_consequence")) {
    rec.push(`[${event.id}] Événement critique sans conséquence cachée — ajouter queuesDelayedConsequence sur au moins un choix.`);
  }
  if (flags.includes("no_strong_advantage")) {
    rec.push(`[${event.id}] Aucun choix n'a d'avantage clair — au moins un choix devrait avoir un gain fort et évident.`);
  }

  return rec;
}

// ── Diagnostic global ─────────────────────────────────────────────────────────

/**
 * Analyse tous les événements interactifs d'un tableau et retourne uniquement
 * ceux qui présentent au moins un problème d'équilibre.
 *
 * Usage dev :
 *   import { NEWS_EVENTS } from "@/data/newsEvents";
 *   import { diagnoseMalBalancedEvents, printDiagnosticReport } from "@/logic/paretoDilemmaChecker";
 *   printDiagnosticReport(NEWS_EVENTS);
 */
export function diagnoseMalBalancedEvents(events: NewsEvent[]): ParetoDilemmaReport[] {
  return events
    .map(analyseEvent)
    .filter((r): r is ParetoDilemmaReport => r !== null && !r.isWellBalanced);
}

/**
 * Affiche un rapport lisible dans la console.
 * À appeler depuis un écran dev ou un script standalone — pas en production.
 */
export function printDiagnosticReport(events: NewsEvent[]): void {
  const problematic = diagnoseMalBalancedEvents(events);

  if (problematic.length === 0) {
    console.log("[Pareto] ✅ Tous les événements sont bien équilibrés.");
    return;
  }

  console.group(`[Pareto] ⚠️  ${problematic.length} événement(s) déséquilibré(s)`);

  for (const r of problematic) {
    console.group(`\n▸ [${r.urgency.toUpperCase()}] ${r.eventTitle} (${r.eventId})`);
    console.log("  Flags :", r.dilemmaFlags.join(", "));
    for (const c of r.choices) {
      const flagStr = c.flags.length > 0 ? ` ⚠ [${c.flags.join(", ")}]` : "";
      console.log(`  • ${c.label} : gains=${c.gains.toFixed(1)} costs=${c.costs.toFixed(1)} balance=${c.balance.toFixed(1)}${flagStr}`);
    }
    if (r.recommendations.length > 0) {
      console.log("  Recommandations :");
      for (const rec of r.recommendations) console.log(`    → ${rec}`);
    }
    console.groupEnd();
  }

  console.groupEnd();
}
