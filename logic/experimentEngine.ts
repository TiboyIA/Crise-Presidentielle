/**
 * experimentEngine.ts — A/B testing local d'équilibrage
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PRINCIPES
 *   • Affectation aléatoire 1/3-1/3-1/3 à l'installation (ou premier lancement).
 *   • Variante fixe : ne change jamais en cours de partie, ni après un reset.
 *   • 100 % local : aucune donnée envoyée au serveur dans ce delta.
 *   • Pas de collecte de données personnelles, pas de SDK tiers.
 *
 * UTILISATION
 *   1. Appeler `initExperiment()` une seule fois au démarrage de l'app
 *      (dans StrategyContext ou App._layout), avant tout rendu de jeu.
 *   2. Lire les flags avec `getExperimentVariant()` (sync, thread-safe après init)
 *      ou `loadExperimentVariant()` (async, fonctionne même sans init préalable).
 *
 * COMMENT COMPARER LES RÉSULTATS PLUS TARD
 * ──────────────────────────────────────────
 * Sources de données à croiser :
 *   • `storage/balanceStorage.ts` : gamesStarted, crises résolues, taux de défaite tôt.
 *   • `storage/statsStorage.ts`   : victories/defeats, turnsSum (durée moyenne), voteShare.
 *   • `logic/frustrationEngine.ts`: score de frustration local au moment du bilan.
 *
 * Méthode de comparaison :
 *   1. Charger le `ExperimentRecord` de chaque session (clé `@experiment_v1`).
 *   2. Grouper les sessions par `variant` (control / variant_a / variant_b).
 *   3. Calculer par groupe :
 *        – Durée médiane de partie (turnsSum / totalGames)
 *        – Taux de victoire (victories / totalGames)
 *        – Taux d'abandon avant j30 (gamesLostBeforeDay30 / gamesStarted)
 *        – Taux de résolution de crises (crisesResolved / (crisesResolved + crisesFailed))
 *   4. Seuil de significativité minimal : ≥ 30 sessions par groupe avant de conclure.
 *   5. H₀ (hypothèse nulle) : aucune différence entre les variantes.
 *      Rejeter H₀ si l'écart dépasse 10 % sur au moins 2 indicateurs.
 *
 * Intégration future dans le jeu (delta suivant) :
 *   • missionRewardVariant  → appliquer FLAG_VALUES.missionRewardMultiplier[v]
 *                             sur `reward` dans `logic/missionEngine.ts`.
 *   • buildingCostCurveVariant → passer FLAG_VALUES.buildingCostExponent[v]
 *                             à `genLevels()` dans `data/buildings.ts`.
 *   • crisisFrequencyVariant   → multiplier FLAG_VALUES.crisisDelayMultiplier[v]
 *                             aux bornes de `MAJOR_DELAY_RANGE` / `MINOR_DELAY_RANGE`
 *                             dans `logic/timeEngine.ts`.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types publics ─────────────────────────────────────────────────────────────

export type Variant = "control" | "variant_a" | "variant_b";

/** Flags exposés aux moteurs de jeu. Tous pointent vers la même variante globale. */
export interface ExperimentFlags {
  /** Multiplicateur de récompenses de missions. */
  missionRewardVariant: Variant;
  /** Exposant de la courbe de coût des bâtiments. */
  buildingCostCurveVariant: Variant;
  /** Multiplicateur de fréquence des crises. */
  crisisFrequencyVariant: Variant;
}

export interface ExperimentRecord {
  /** Variante unique pour cette installation. */
  variant: Variant;
  /** Timestamp réel d'affectation (ms). Permet l'analyse par cohorte temporelle. */
  assignedAt: number;
  /** Flags dérivés de la variante — raccourcis pour les moteurs consommateurs. */
  flags: ExperimentFlags;
}

// ── Valeurs numériques par variante ──────────────────────────────────────────
//
// Ces constantes sont la SEULE source de vérité sur ce que chaque variante
// modifie. Les moteurs consommateurs lisent ces valeurs, pas les strings de variante.
//
// Exemple d'usage dans missionEngine :
//   import { getExperimentVariant, FLAG_VALUES } from "@/logic/experimentEngine";
//   const v = getExperimentVariant().flags.missionRewardVariant;
//   const mult = FLAG_VALUES.missionRewardMultiplier[v];
//   const finalReward = Math.round(baseReward * mult);

export const FLAG_VALUES = {
  /**
   * Multiplicateur appliqué aux `reward` de chaque MissionDef.
   *   control  → ×1.00 (récompenses inchangées)
   *   variant_a → ×1.20 (+20 % — teste si des récompenses plus généreuses
   *               améliorent le taux de complétion et la rétention)
   *   variant_b → ×0.85 (-15 % — teste si des récompenses plus rares
   *               augmentent la valeur perçue et l'engagement)
   */
  missionRewardMultiplier: {
    control:   1.00,
    variant_a: 1.20,
    variant_b: 0.85,
  },

  /**
   * Exposant de la courbe de coût bâtiment (remplace 1.8 dans `genLevels`).
   *   control  → 1.80 (courbe actuelle — cost[i] = base × 1.80^i)
   *   variant_a → 1.65 (courbe plus douce — progression plus accessible)
   *   variant_b → 1.95 (courbe plus raide — décisions d'upgrade plus importantes)
   */
  buildingCostExponent: {
    control:   1.80,
    variant_a: 1.65,
    variant_b: 1.95,
  },

  /**
   * Multiplicateur appliqué aux bornes de délai entre crises
   * (MAJOR_DELAY_RANGE et MINOR_DELAY_RANGE dans timeEngine).
   *   control  → ×1.00 (fréquence actuelle)
   *   variant_a → ×1.33 (crises moins fréquentes — teste si moins de pression
   *               réduit le stress et améliore l'exploration)
   *   variant_b → ×0.75 (crises plus fréquentes — teste si plus de décisions
   *               augmente l'engagement et le temps de session)
   */
  crisisDelayMultiplier: {
    control:   1.00,
    variant_a: 1.33,
    variant_b: 0.75,
  },
} as const;

// ── Assignation ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "@experiment_v1";
const VARIANTS: Variant[] = ["control", "variant_a", "variant_b"];

function assignVariant(): Variant {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)]!;
}

function buildFlags(variant: Variant): ExperimentFlags {
  return {
    missionRewardVariant:    variant,
    buildingCostCurveVariant: variant,
    crisisFrequencyVariant:  variant,
  };
}

function buildRecord(variant: Variant): ExperimentRecord {
  return { variant, assignedAt: Date.now(), flags: buildFlags(variant) };
}

function parseRecord(raw: string): ExperimentRecord | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ExperimentRecord>;
    if (!parsed.variant || !VARIANTS.includes(parsed.variant as Variant)) return null;
    const variant = parsed.variant as Variant;
    return {
      variant,
      assignedAt: typeof parsed.assignedAt === "number" ? parsed.assignedAt : Date.now(),
      flags: buildFlags(variant), // always recompute — never trust stored flags
    };
  } catch {
    return null;
  }
}

// ── Cache module-level (singleton) ───────────────────────────────────────────
//
// Après `initExperiment()`, les consommateurs synchrones (useMemo, moteurs purs)
// peuvent appeler `getExperimentVariant()` sans await.

let _cache: ExperimentRecord | null = null;

/**
 * Charge ou crée l'enregistrement d'expérience depuis AsyncStorage.
 * Appeler UNE SEULE FOIS au démarrage de l'app (avant le premier rendu de jeu).
 * Idempotent : les appels suivants retournent le cache sans I/O.
 */
export async function initExperiment(): Promise<ExperimentRecord> {
  if (_cache) return _cache;
  _cache = await loadExperimentVariant();
  return _cache;
}

/**
 * Lecture synchrone — disponible après `initExperiment()`.
 * Retourne `control` par défaut si init n'a pas encore eu lieu
 * (cas d'urgence seulement, ne jamais compter dessus en prod).
 */
export function getExperimentVariant(): ExperimentRecord {
  return _cache ?? buildRecord("control");
}

/**
 * Lecture asynchrone — utilisable sans `initExperiment()`.
 * Chauffe également le cache pour les appels sync ultérieurs.
 */
export async function loadExperimentVariant(): Promise<ExperimentRecord> {
  if (_cache) return _cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const record = parseRecord(raw);
      if (record) {
        _cache = record;
        return record;
      }
    }
    // Première installation ou données corrompues → nouvelle affectation
    const record = buildRecord(assignVariant());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      variant:    record.variant,
      assignedAt: record.assignedAt,
    }));
    _cache = record;
    return record;
  } catch {
    // AsyncStorage indisponible (tests unitaires, Expo Go fraîche) → fallback control
    const fallback = buildRecord("control");
    _cache = fallback;
    return fallback;
  }
}

/**
 * Réinitialise la variante (dev / QA uniquement).
 * À appeler UNIQUEMENT depuis l'écran `dev-stats.tsx` ou une commande de test.
 * Ne jamais exposer à l'utilisateur final.
 */
export async function resetExperiment(): Promise<ExperimentRecord> {
  _cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
  return initExperiment();
}

/**
 * Force une variante spécifique (dev / QA uniquement).
 * La variante forcée est persisée et reste jusqu'à `resetExperiment()`.
 */
export async function forceVariant(variant: Variant): Promise<ExperimentRecord> {
  const record = buildRecord(variant);
  record.assignedAt = Date.now();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      variant:    record.variant,
      assignedAt: record.assignedAt,
    }));
  } catch { /* noop */ }
  _cache = record;
  return record;
}
