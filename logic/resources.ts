/**
 * ─── LOT 18 — Ressources stockables ──────────────────────────────
 *
 * Module pur (pas d'I/O, pas de dépendance React) qui définit les
 * 5 ressources du jeu, leurs valeurs initiales et bornes, ainsi que
 * les helpers de manipulation (`canAfford`, `applyCost`,
 * `addResources`, `sanitizeResources`).
 *
 * Conventions :
 *  - Toutes les ressources sont des entiers positifs ou nuls.
 *  - Les bornes hautes sont définies par `RESOURCE_MAX`.
 *  - Les coûts sont des `ResourceCosts` (Partial<Resources>) — toute
 *    clé absente est traitée comme 0.
 *  - Les helpers sont PURS et déterministes : ils renvoient un
 *    nouveau snapshot, jamais ne mutent l'argument.
 */
import type { Resources, ResourceCosts, ResourceKey } from "@/types/game";

/** Valeur de départ d'une partie neuve. */
export const INITIAL_RESOURCES: Resources = {
  budgetNational: 5000,
  politicalInfluence: 50,
  intelligence: 30,
  technology: 20,
  energy: 60,
};

/** Bornes hautes : pas de gain possible au-delà. */
export const RESOURCE_MAX: Resources = {
  budgetNational: 10000,
  politicalInfluence: 100,
  intelligence: 100,
  technology: 100,
  energy: 100,
};

/** Libellés FR pour l'UI. */
export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  budgetNational: "Budget National",
  politicalInfluence: "Influence Politique",
  intelligence: "Renseignements",
  technology: "Technologie",
  energy: "Énergie",
};

/** Libellés courts pour les chips (max 7 caractères). */
export const RESOURCE_SHORT_LABELS: Record<ResourceKey, string> = {
  budgetNational: "Budget",
  politicalInfluence: "Influ.",
  intelligence: "Rens.",
  technology: "Tech",
  energy: "Énergie",
};

/** Icônes Feather/lucide associées (utilisées par l'UI). */
export const RESOURCE_ICONS: Record<ResourceKey, string> = {
  budgetNational: "briefcase",
  politicalInfluence: "award",
  intelligence: "eye",
  technology: "cpu",
  energy: "zap",
};

/** Description courte (1 phrase) — utilisée dans les tooltips/aide. */
export const RESOURCE_DESCRIPTIONS: Record<ResourceKey, string> = {
  budgetNational:
    "Crédits d'État. Finance les recherches, lois et infrastructures.",
  politicalInfluence:
    "Capital politique. Permet de faire passer des réformes et calmer l'opposition.",
  intelligence:
    "Renseignements. Détecte les menaces et anticipe les crises.",
  technology:
    "Avance technologique. Lance des recherches et modernise le pays.",
  energy:
    "Marge énergétique. Maintient la stabilité et soutient l'économie.",
};

/** Ordre canonique d'affichage (Budget en premier). */
export const RESOURCE_KEYS: readonly ResourceKey[] = [
  "budgetNational",
  "politicalInfluence",
  "intelligence",
  "technology",
  "energy",
] as const;

/* ────────────────────────────────────────────────────────────────
 * Helpers purs
 * ─────────────────────────────────────────────────────────────── */

function clampOne(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return Math.round(value);
}

/**
 * Borne TOUTES les ressources entre 0 et leur max respectif.
 * Renvoie un nouveau snapshot.
 */
export function clampResources(input: Resources): Resources {
  return {
    budgetNational: clampOne(input.budgetNational, RESOURCE_MAX.budgetNational),
    politicalInfluence: clampOne(
      input.politicalInfluence,
      RESOURCE_MAX.politicalInfluence,
    ),
    intelligence: clampOne(input.intelligence, RESOURCE_MAX.intelligence),
    technology: clampOne(input.technology, RESOURCE_MAX.technology),
    energy: clampOne(input.energy, RESOURCE_MAX.energy),
  };
}

/**
 * Vérifie que `resources` couvre intégralement `costs`. Toute clé
 * absente du coût est ignorée. Une valeur de coût ≤ 0 est tolérée
 * (jamais bloquante).
 */
export function canAfford(
  resources: Resources,
  costs: ResourceCosts,
): boolean {
  for (const key of RESOURCE_KEYS) {
    const need = costs[key] ?? 0;
    if (need <= 0) continue;
    if ((resources[key] ?? 0) < need) return false;
  }
  return true;
}

/**
 * Liste les CLÉS des ressources insuffisantes pour un coût.
 * Renvoie [] si tout est couvert.
 */
export function missingResources(
  resources: Resources,
  costs: ResourceCosts,
): ResourceKey[] {
  const missing: ResourceKey[] = [];
  for (const key of RESOURCE_KEYS) {
    const need = costs[key] ?? 0;
    if (need <= 0) continue;
    if ((resources[key] ?? 0) < need) missing.push(key);
  }
  return missing;
}

/**
 * LOT 18.2 — Renvoie les MONTANTS qui manquent pour couvrir le coût,
 * par ressource (objet `ResourceCosts` partiel : seules les clés en
 * déficit sont présentes). Renvoie un objet vide si tout est couvert.
 *
 * Utilisé par les toasts UI pour afficher "il manque X budget, Y tech"
 * via `formatCosts(missingResourceAmounts(...))`.
 */
export function missingResourceAmounts(
  resources: Resources,
  costs: ResourceCosts,
): ResourceCosts {
  const missing: ResourceCosts = {};
  for (const key of RESOURCE_KEYS) {
    const need = costs[key] ?? 0;
    if (need <= 0) continue;
    const have = resources[key] ?? 0;
    if (have < need) missing[key] = need - have;
  }
  return missing;
}

/**
 * Débite `costs` de `resources`. Si une ressource passerait sous 0,
 * elle est clampée à 0 (pas de dette). Pour échec strict, valider
 * en amont avec `canAfford`.
 */
export function applyCost(
  resources: Resources,
  costs: ResourceCosts,
): Resources {
  return clampResources({
    budgetNational:
      (resources.budgetNational ?? 0) - (costs.budgetNational ?? 0),
    politicalInfluence:
      (resources.politicalInfluence ?? 0) - (costs.politicalInfluence ?? 0),
    intelligence: (resources.intelligence ?? 0) - (costs.intelligence ?? 0),
    technology: (resources.technology ?? 0) - (costs.technology ?? 0),
    energy: (resources.energy ?? 0) - (costs.energy ?? 0),
  });
}

/**
 * Crédite `delta` à `resources`. Les bornes hautes sont appliquées.
 * `delta` peut contenir des valeurs négatives (équivalent à un coût).
 */
export function addResources(
  resources: Resources,
  delta: ResourceCosts,
): Resources {
  return clampResources({
    budgetNational:
      (resources.budgetNational ?? 0) + (delta.budgetNational ?? 0),
    politicalInfluence:
      (resources.politicalInfluence ?? 0) + (delta.politicalInfluence ?? 0),
    intelligence: (resources.intelligence ?? 0) + (delta.intelligence ?? 0),
    technology: (resources.technology ?? 0) + (delta.technology ?? 0),
    energy: (resources.energy ?? 0) + (delta.energy ?? 0),
  });
}

/**
 * Sanitize au chargement d'une save. Toute valeur manquante,
 * non-finie ou hors-bornes est ramenée :
 *  - clé absente → valeur INITIAL_RESOURCES de cette clé
 *  - valeur non-finie → INITIAL_RESOURCES de cette clé
 *  - valeur hors-bornes → clamp [0, RESOURCE_MAX[k]]
 */
export function sanitizeResources(input: unknown): Resources {
  if (!input || typeof input !== "object") {
    return { ...INITIAL_RESOURCES };
  }
  const raw = input as Partial<Record<ResourceKey, unknown>>;
  const candidate: Resources = {
    budgetNational: pickNumber(raw.budgetNational, INITIAL_RESOURCES.budgetNational),
    politicalInfluence: pickNumber(
      raw.politicalInfluence,
      INITIAL_RESOURCES.politicalInfluence,
    ),
    intelligence: pickNumber(raw.intelligence, INITIAL_RESOURCES.intelligence),
    technology: pickNumber(raw.technology, INITIAL_RESOURCES.technology),
    energy: pickNumber(raw.energy, INITIAL_RESOURCES.energy),
  };
  return clampResources(candidate);
}

function pickNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

/**
 * Format affichable d'une ressource. Le Budget National utilise un
 * séparateur de milliers (espace insécable), les autres ressources
 * sont en entier simple.
 */
export function formatResource(key: ResourceKey, value: number): string {
  const v = Math.round(value);
  if (key === "budgetNational") {
    return v.toLocaleString("fr-FR");
  }
  return String(v);
}

/**
 * Format d'un coût pour l'UI : "500 Budget · 20 Tech".
 * Ignore les clés absentes ou ≤ 0.
 */
export function formatCosts(costs: ResourceCosts): string {
  const parts: string[] = [];
  for (const key of RESOURCE_KEYS) {
    const v = costs[key] ?? 0;
    if (v <= 0) continue;
    parts.push(`${formatResource(key, v)} ${RESOURCE_SHORT_LABELS[key]}`);
  }
  return parts.join(" · ");
}

/**
 * ─── LOT 18.3 — Régénération mensuelle ────────────────────────────
 *
 * Type d'un delta SIGNÉ (peut contenir des entiers négatifs pour
 * représenter des dépenses). Utilisé par `regenerateResources` pour
 * exposer le bilan mensuel à l'UI sans confusion avec `ResourceCosts`
 * (qui est un coût TOUJOURS positif côté tech-tree / crises).
 */
export type ResourceDelta = Partial<Record<ResourceKey, number>>;

/**
 * Sous-ensemble des jauges utilisé par la formule mensuelle.
 * On déclare le sous-ensemble explicitement (pas tout `Gauges`)
 * pour éviter le couplage et faciliter les tests.
 */
export interface RegenGauges {
  economy: number;
  cohesion: number;
  popularity: number;
  health: number;
  ecology: number;
  debt: number;
}

interface RegenHidden {
  corruption: number;
  oppositionPower: number;
}

export interface RegenResult {
  /** Snapshot de ressources APRÈS application du delta. */
  nextResources: Resources;
  /** Delta signé par ressource (uniquement clés où le delta ≠ 0). */
  delta: ResourceDelta;
  /** Texte court prêt à pousser dans l'`AlertTicker` (≤ 90 chars). */
  summary: string;
}

/**
 * Calcule la régénération MENSUELLE des 5 ressources en fonction
 * de l'état des jauges du pays. Pure : ne mute rien.
 *
 * Formule (volontairement simple et lisible — pas de tuning fin) :
 *
 *  - **Budget National** : recettes fiscales modulées par l'économie
 *    et la cohésion (mieux on collecte si la société tient), MOINS
 *    des dépenses fixes de fonctionnement et MOINS les intérêts de
 *    la dette. Ordre de grandeur : -350 à +400 cr/mois.
 *      `+200 + (eco-50)*4 + (coh-50)*1 - 150 - debt*0.5`
 *
 *  - **Influence Politique** : capital politique gagné quand le pays
 *    soutient (popularity haute) et qu'il n'y a pas de fronde
 *    (oppositionPower bas).
 *      `+1 si pop≥60, -1 si pop≤30, -1 si oppoPower≥70`
 *
 *  - **Renseignements** : services rendus (+2/mois) sapés par la
 *    corruption interne.
 *      `+2, -1 si corruption≥60`
 *
 *  - **Technologie** : R&D civile spontanée, accélérée par un système
 *    de santé performant (universités/hôpitaux qui publient).
 *      `+1, +1 si health≥70`
 *
 *  - **Énergie** : marge énergétique régénérée naturellement, érodée
 *    quand l'écologie se dégrade (canicules / coupures réseau).
 *      `+2, -1 si ecology≤30`
 *
 * Le `summary` est de la forme "📊 Bilan mensuel — Budget +220 ·
 * Tech +1 · Énergie -1" (Budget formaté FR avec NNBSP, autres
 * ressources en entier signé). Si tous les deltas sont nuls,
 * "📊 Bilan mensuel — situation stable".
 */
export function regenerateResources(
  resources: Resources,
  gauges: RegenGauges,
  hidden: RegenHidden,
): RegenResult {
  // 1) Calcul des deltas bruts (avant clamp).
  const rawDelta: Record<ResourceKey, number> = {
    budgetNational:
      200 +
      Math.round((gauges.economy - 50) * 4) +
      Math.round((gauges.cohesion - 50) * 1) -
      150 -
      Math.round(gauges.debt * 0.5),
    politicalInfluence:
      (gauges.popularity >= 60 ? 1 : 0) +
      (gauges.popularity <= 30 ? -1 : 0) +
      (hidden.oppositionPower >= 70 ? -1 : 0),
    intelligence: 2 + (hidden.corruption >= 60 ? -1 : 0),
    technology: 1 + (gauges.health >= 70 ? 1 : 0),
    energy: 2 + (gauges.ecology <= 30 ? -1 : 0),
  };

  // 2) On applique addResources (clampe au [0, RESOURCE_MAX]) puis on
  // recalcule le delta RÉEL après clamp pour que l'UI affiche ce qui
  // a vraiment été crédité (et pas le brut "fantôme" qui aurait
  // débordé). Cohérent avec le contrat de `applyCost` (clamp à 0).
  const nextResources = addResources(resources, rawDelta);
  const delta: ResourceDelta = {};
  for (const key of RESOURCE_KEYS) {
    const real = nextResources[key] - resources[key];
    if (real !== 0) delta[key] = real;
  }

  return {
    nextResources,
    delta,
    summary: formatRegenSummary(delta),
  };
}

/**
 * Formate un delta signé en bandeau ticker court.
 * "Budget +220 · Tech +1 · Énergie -1" — ordre canonique.
 */
function formatRegenSummary(delta: ResourceDelta): string {
  const body = formatDeltaBody(delta);
  if (!body) return "📊 Bilan mensuel — situation stable";
  return `📊 Bilan mensuel — ${body}`;
}

/**
 * LOT 18.3 — Bandeau résumé d'un saut de N mois (skipToNextEvent).
 * "📊 Saut de 3 mois — Budget +1 200 · Tech +5". Si tous les deltas
 * sont nuls (cas extrême : déjà au plafond/plancher), on l'indique.
 */
export function formatSkipSummary(
  monthsSkipped: number,
  delta: ResourceDelta,
): string {
  // "mois" est invariant en français (1 mois / 3 mois).
  const body = formatDeltaBody(delta);
  if (!body) {
    return `📊 Saut de ${monthsSkipped} mois — ressources inchangées`;
  }
  return `📊 Saut de ${monthsSkipped} mois — ${body}`;
}

/** Sérialise un delta signé en "Budget +220 · Tech +1 · Énergie -1". */
function formatDeltaBody(delta: ResourceDelta): string {
  const parts: string[] = [];
  for (const key of RESOURCE_KEYS) {
    const v = delta[key];
    if (v === undefined || v === 0) continue;
    const formatted =
      key === "budgetNational"
        ? Math.abs(v).toLocaleString("fr-FR")
        : String(Math.abs(v));
    const sign = v >= 0 ? "+" : "-";
    parts.push(`${RESOURCE_SHORT_LABELS[key]} ${sign}${formatted}`);
  }
  return parts.join(" · ");
}
