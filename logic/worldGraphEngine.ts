import { COUNTRIES } from "@/data/countries";
import type { CountryId, CountryRelation } from "@/types/strategy";

// ── Blocs géopolitiques ───────────────────────────────────────────────────────
// Définit l'appartenance primaire de chaque pays à un réseau géopolitique.
// Le bridge score mesure combien de blocs DIFFÉRENTS un pays connecte (en + ou −).

const BLOCS: Record<CountryId, string> = {
  usa:          "west",
  uk:           "west",
  france:       "west",
  germany:      "west",
  italy:        "west",
  canada:       "west",
  australia:    "west",
  japan:        "asia_west",
  south_korea:  "asia_west",
  russia:       "eurasian",
  china:        "eurasian",
  india:        "south_asia",
  pakistan:     "south_asia",
  saudi_arabia: "middle_east",
  turkey:       "middle_east",
  iran:         "middle_east",
  israel:       "middle_east",
  brazil:       "latam",
  nigeria:      "africa",
  north_korea:  "pariah",
};

// ── Arêtes du graphe géopolitique ─────────────────────────────────────────────
// Format : [A, B, poids]   Poids > 0 = alliance/partenariat  Poids < 0 = rivalité/hostilité
// Chaque paire ne figure qu'une seule fois — les arêtes sont bidirectionnelles.

const EDGES: [CountryId, CountryId, number][] = [
  // ── Réseau occidental ────────────────────────────────────────────────────
  ["usa", "uk",           3], ["usa", "canada",      3], ["usa", "australia",   3],
  ["usa", "japan",        3], ["usa", "israel",      3], ["usa", "france",      2],
  ["usa", "germany",      2], ["usa", "italy",       2], ["usa", "south_korea", 2],
  ["usa", "saudi_arabia", 2],
  ["uk",  "france",       2], ["uk",  "germany",     2], ["uk",  "canada",      2],
  ["uk",  "australia",    3], ["uk",  "japan",       2],
  ["france",  "germany",  3], ["france", "italy",    2],
  ["germany", "italy",    2], ["germany", "canada",  2],
  ["japan",   "australia",2], ["japan",  "south_korea", 1], ["australia", "south_korea", 1],
  // ── Réseau eurasien ──────────────────────────────────────────────────────
  ["china", "russia",     3], ["china", "pakistan",  2], ["china", "north_korea", 1],
  ["russia", "iran",      2],
  // ── Relations de pont (Quad, BRICS, acteurs pivots) ──────────────────────
  ["india",  "usa",        1], ["india", "russia",   1],  // non-alignement actif
  ["india",  "japan",      2], ["india", "australia", 1], // Quad
  ["india",  "saudi_arabia", 1],                          // partenariat énergétique
  ["turkey", "usa",        1], ["turkey", "saudi_arabia", 1],  // OTAN + monde islamique
  ["brazil", "usa",        1], ["brazil", "china",   1],  // BRICS + Amériques
  ["nigeria", "usa",       1], ["nigeria", "uk",     1],
  ["saudi_arabia", "israel", 1],                          // accords d'Abraham
  // ── Rivalités et hostilités ──────────────────────────────────────────────
  ["usa",         "russia",      -3], ["usa",        "china",       -2],
  ["usa",         "iran",        -3], ["usa",        "north_korea", -3],
  ["russia",      "uk",          -2], ["russia",     "france",      -2],
  ["russia",      "germany",     -2], ["russia",     "japan",       -2],
  ["china",       "india",       -2], ["china",      "japan",       -2],
  ["china",       "south_korea", -1], ["china",      "australia",   -2],
  ["iran",        "israel",      -3], ["iran",       "saudi_arabia",-2],
  ["north_korea", "south_korea", -3], ["north_korea","japan",       -2],
  ["india",       "pakistan",    -3], ["pakistan",   "usa",         -1],
  ["turkey",      "russia",      -1], ["turkey",     "iran",        -1],
];

// ── Types publics ─────────────────────────────────────────────────────────────

export interface WorldNodeMetrics {
  countryId:            CountryId;
  influenceCentrality:  number;  // 0-100 — importance dans le réseau mondial
  isolationScore:       number;  // 0-100 — degré d'isolement diplomatique
  allianceClusterScore: number;  // 0-100 — puissance du réseau allié
  hostilePressure:      number;  // 0-100 — pression hostile reçue
  strategicBridgeScore: number;  // 0-100 — rôle de pont inter-blocs
}

export type StrategicBadge =
  | "strategic_node"
  | "pivot_country"
  | "isolated_power"
  | "tension_zone";

export const BADGE_META: Record<StrategicBadge, { label: string; color: string; icon: string }> = {
  strategic_node: { label: "Nœud stratégique", color: "#a78bfa", icon: "star-four-points"  },
  pivot_country:  { label: "Pays pivot",        color: "#4a9fff", icon: "bridge"            },
  isolated_power: { label: "Puissance isolée",  color: "#FF8040", icon: "island"            },
  tension_zone:   { label: "Zone de tension",   color: "#FF3040", icon: "alert-rhombus"     },
};

// ── Construction de l'adjacence ───────────────────────────────────────────────

interface AdjNode {
  allies:   Array<{ id: CountryId; w: number }>;
  hostiles: Array<{ id: CountryId; w: number }>;
}

function buildAdjacency(): Map<CountryId, AdjNode> {
  const map = new Map<CountryId, AdjNode>();
  for (const id of Object.keys(COUNTRIES) as CountryId[]) {
    map.set(id, { allies: [], hostiles: [] });
  }
  for (const [a, b, w] of EDGES) {
    const nodeA = map.get(a);
    const nodeB = map.get(b);
    if (!nodeA || !nodeB) continue;
    if (w > 0) {
      nodeA.allies.push({ id: b, w });
      nodeB.allies.push({ id: a, w });
    } else if (w < 0) {
      const abs = Math.abs(w);
      nodeA.hostiles.push({ id: b, w: abs });
      nodeB.hostiles.push({ id: a, w: abs });
    }
  }
  return map;
}

// ── Calcul des métriques ──────────────────────────────────────────────────────

function computeAllMetrics(): Map<CountryId, WorldNodeMetrics> {
  const adj = buildAdjacency();
  const ids = Object.keys(COUNTRIES) as CountryId[];

  const raw = new Map<CountryId, {
    allianceSum: number;
    hostileSum:  number;
    bridgeBlocs: number;
    basePower:   number;
    diplomacy:   number;
  }>();

  for (const id of ids) {
    const node    = adj.get(id)!;
    const country = COUNTRIES[id];
    const ownBloc = BLOCS[id];

    const allianceSum = node.allies.reduce((s, e) => s + e.w, 0);
    const hostileSum  = node.hostiles.reduce((s, e) => s + e.w, 0);

    // Bridge = distinct blocs connectés (positivement OU négativement) hors du bloc propre.
    // Une rivalité active est aussi un lien géopolitique exploitable diplomatiquement.
    const allNeighbors = [...node.allies, ...node.hostiles];
    const bridgeBlocs  = new Set(
      allNeighbors.map((e) => BLOCS[e.id]).filter((b) => b !== ownBloc),
    ).size;

    raw.set(id, {
      allianceSum,
      hostileSum,
      bridgeBlocs,
      basePower: country.basePower,
      diplomacy: country.diplomacy,
    });
  }

  const maxAlliance = Math.max(...[...raw.values()].map((v) => v.allianceSum), 1);
  const maxHostile  = Math.max(...[...raw.values()].map((v) => v.hostileSum),  1);
  const maxBridge   = Math.max(...[...raw.values()].map((v) => v.bridgeBlocs), 1);

  const result = new Map<CountryId, WorldNodeMetrics>();

  for (const id of ids) {
    const r = raw.get(id)!;
    const aN = r.allianceSum / maxAlliance;
    const hN = r.hostileSum  / maxHostile;
    const bN = r.bridgeBlocs / maxBridge;

    // Centralité = réseau allié (40 %) + puissance brute (35 %) + diplomatie (25 %).
    // Cette pondération reflète mieux les "grandes puissances" (USA, Chine, Russie, UK)
    // que le réseau seul, qui sur-pénalise les blocs peu denses.
    const influenceCentrality = Math.round(aN * 40 + (r.basePower / 100) * 35 + (r.diplomacy / 100) * 25);
    const allianceClusterScore = Math.round(aN * 100);
    const hostilePressure      = Math.round(hN * 100);
    const strategicBridgeScore = Math.round(bN * 100);
    // Isolement = inverse de la centralité, accentué par un réseau allié nul.
    const isolationScore = Math.round(100 - influenceCentrality + (1 - aN) * 15);

    result.set(id, {
      countryId:            id,
      influenceCentrality:  Math.min(100, Math.max(0, influenceCentrality)),
      isolationScore:       Math.min(100, Math.max(0, isolationScore)),
      allianceClusterScore: Math.min(100, Math.max(0, allianceClusterScore)),
      hostilePressure:      Math.min(100, Math.max(0, hostilePressure)),
      strategicBridgeScore: Math.min(100, Math.max(0, strategicBridgeScore)),
    });
  }

  return result;
}

// Module-level singleton — calculé une seule fois à l'import.
const WORLD_METRICS = computeAllMetrics();

// ── API publique ──────────────────────────────────────────────────────────────

export function getNodeMetrics(countryId: CountryId): WorldNodeMetrics | null {
  return WORLD_METRICS.get(countryId) ?? null;
}

export function getAllMetrics(): Map<CountryId, WorldNodeMetrics> {
  return WORLD_METRICS;
}

/**
 * Retourne les badges stratégiques d'un pays.
 *
 * Seuils calibrés pour donner 3-5 pays par badge maximum :
 *  - strategic_node  ≥ 57 : grandes puissances (USA, Chine, UK, Allemagne, France)
 *  - pivot_country   ≥ 55 : ponts inter-blocs (USA, Chine, Japon, Russie, Inde)
 *  - isolated_power  ≥ 80 : régimes isolés (Corée du Nord, Iran, Pakistan, Nigéria)
 *  - tension_zone    ≥ 65 : cibles de pression hostile (USA, Russie, Chine, Iran, Corée du Nord)
 */
export function getStrategicBadges(countryId: CountryId): StrategicBadge[] {
  const m = WORLD_METRICS.get(countryId);
  if (!m) return [];
  const badges: StrategicBadge[] = [];
  if (m.influenceCentrality  >= 57) badges.push("strategic_node");
  if (m.strategicBridgeScore >= 55) badges.push("pivot_country");
  if (m.isolationScore       >= 80) badges.push("isolated_power");
  if (m.hostilePressure      >= 65) badges.push("tension_zone");
  return badges;
}

/**
 * Priorité d'opération (0-100) combinant l'importance structurelle du pays
 * et la relation actuelle avec le joueur.
 *
 * Usage : trier ou mettre en avant les pays cibles dans l'écran Opérations.
 */
export function getOperationPriority(
  countryId: CountryId,
  playerRelations: CountryRelation[],
): number {
  const m = WORLD_METRICS.get(countryId);
  if (!m) return 0;
  const rel = playerRelations.find((r) => r.countryId === countryId);
  const relScore = rel?.score ?? 0; // -100 à 100

  const structuralWeight =
    m.influenceCentrality * 0.4 +
    m.allianceClusterScore * 0.2;

  const opportunityWeight =
    relScore < 0
      ? m.hostilePressure * 0.3 + Math.abs(relScore) * 0.1  // hostile → priorité opération
      : m.influenceCentrality * 0.1;                          // allié → priorité alliance

  return Math.round(Math.min(100, structuralWeight + opportunityWeight));
}

/**
 * Retourne les N pays avec le meilleur score de pont (pivots globaux).
 * Utile pour les recommandations stratégiques de la salle de crise.
 */
export function getTopPivotCountries(n = 3): CountryId[] {
  return ([...WORLD_METRICS.entries()])
    .sort(([, a], [, b]) => b.strategicBridgeScore - a.strategicBridgeScore)
    .slice(0, n)
    .map(([id]) => id);
}
