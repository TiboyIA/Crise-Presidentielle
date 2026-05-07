export type RegionId =
  | "idf"
  | "paca"
  | "auvergne"
  | "hdf"
  | "bretagne"
  | "occitanie"
  | "grand_est"
  | "outre_mer";

export type PoliticalLeaning =
  | "gauche"
  | "centre_gauche"
  | "centre"
  | "centre_droit"
  | "droite"
  | "rn"
  | "fragmentee"
  | "variable";

/**
 * Per-region gauges introduced in v0.3. Each region tracks 6 dimensions
 * in addition to the legacy `tension` value (which is preserved for
 * backward compat with the 103 existing events). All values 0-100.
 */
export interface RegionGauges {
  economy: number;
  security: number;
  popularity: number;
  ecology: number;
  publicHealth: number;
  socialStability: number;
}

export type RegionGaugeKey = keyof RegionGauges;

export const REGION_GAUGE_KEYS: RegionGaugeKey[] = [
  "economy",
  "security",
  "popularity",
  "ecology",
  "publicHealth",
  "socialStability",
];

export const REGION_GAUGE_LABELS: Record<RegionGaugeKey, string> = {
  economy: "Économie",
  security: "Sécurité",
  popularity: "Popularité",
  ecology: "Écologie",
  publicHealth: "Santé publique",
  socialStability: "Stabilité sociale",
};

export const REGION_GAUGE_ICONS: Record<RegionGaugeKey, string> = {
  economy: "trending-up",
  security: "shield",
  popularity: "heart",
  ecology: "wind",
  publicHealth: "activity",
  socialStability: "users",
};

/**
 * v0.4 — Trait régional : identité géographique/économique dominante
 * de la région. Sert au moteur (Module 2) à choisir le bon scénario
 * de demande / catastrophe et à colorer les évènements.
 */
export type RegionTrait =
  | "capital"
  | "coastal"
  | "industrial"
  | "agricultural"
  | "strategic"
  | "alpine";

export type RegionResource =
  | "services"
  | "tourisme"
  | "industrie"
  | "agriculture"
  | "defense"
  | "energie";

export interface RegionOutput {
  resource: RegionResource;
  /**
   * Contribution de base de la région au budget national PAR TOUR
   * quand l'économie régionale est saine. Modulée à la baisse (ou
   * inversée) si la région est hostile (tension élevée).
   */
  budget: number;
}

export interface Region {
  id: RegionId;
  name: string;
  capital: string;
  tension: number;
  /** Per-region gauges (v0.3). */
  gauges: RegionGauges;
  population: string;
  /** Population numérique en millions. Utilisée pour pondérer le vote
   *  régional à l'élection (Module 2). */
  populationWeight: number;
  /** Identité dominante de la région (v0.4 — Module 2). */
  trait: RegionTrait;
  /** Ressource produite et contribution budgétaire (Module 2). */
  output: RegionOutput;
  dominant: string;
  leaning: PoliticalLeaning;
  insight: string;
}

export const INITIAL_REGIONS: Region[] = [
  {
    id: "idf",
    name: "Île-de-France",
    capital: "Paris",
    tension: 38,
    gauges: {
      economy: 72,
      security: 52,
      popularity: 50,
      ecology: 42,
      publicHealth: 65,
      socialStability: 55,
    },
    population: "12,4 M",
    populationWeight: 12.4,
    trait: "capital",
    output: { resource: "services", budget: 3 },
    dominant: "Bloc PS/Écolos consolidé · LFI en banlieue populaire",
    leaning: "gauche",
    insight:
      "Municipales 2026 : la gauche socialiste et écologiste conserve Paris au premier tour, poussée LFI en Seine-Saint-Denis. La droite tient l'Ouest (Neuilly, Versailles).",
  },
  {
    id: "paca",
    name: "Provence-Alpes-Côte d'Azur",
    capital: "Marseille",
    tension: 55,
    gauges: {
      economy: 58,
      security: 42,
      popularity: 45,
      ecology: 38,
      publicHealth: 55,
      socialStability: 42,
    },
    population: "5,1 M",
    populationWeight: 5.1,
    trait: "coastal",
    output: { resource: "tourisme", budget: 2 },
    dominant: "Duel Droite républicaine vs RN · Marseille à gauche",
    leaning: "droite",
    insight:
      "Municipales 2026 : Marseille reconduit la gauche, Toulon reste à droite face à l'assaut du RN. Le RN s'enracine dans les villes moyennes mais se heurte au plafond de verre des grandes mairies.",
  },
  {
    id: "occitanie",
    name: "Occitanie",
    capital: "Toulouse",
    tension: 48,
    gauges: {
      economy: 55,
      security: 52,
      popularity: 55,
      ecology: 62,
      publicHealth: 58,
      socialStability: 50,
    },
    population: "6,1 M",
    populationWeight: 6.1,
    trait: "agricultural",
    output: { resource: "agriculture", budget: 2 },
    dominant: "Région à deux visages : PS dominant · percées RN et LFI",
    leaning: "fragmentee",
    insight:
      "Municipales 2026 : domination socialiste à Montpellier et Narbonne, le centre-droit tient Toulouse, victoire historique du RN à Perpignan dès le 1er tour, gauche radicale à Nîmes.",
  },
  {
    id: "hdf",
    name: "Hauts-de-France",
    capital: "Lille",
    tension: 62,
    gauges: {
      economy: 42,
      security: 45,
      popularity: 38,
      ecology: 38,
      publicHealth: 48,
      socialStability: 38,
    },
    population: "6,0 M",
    populationWeight: 6.0,
    trait: "industrial",
    output: { resource: "industrie", budget: 2 },
    dominant: "Poussée des extrêmes · RN dans les bassins miniers, LFI à Roubaix",
    leaning: "rn",
    insight:
      "Municipales 2026 : progression continue du RN dans les anciens bassins miniers, coup d'éclat de LFI à Roubaix, la droite traditionnelle tient Calais et Arras.",
  },
  {
    id: "auvergne",
    name: "Auvergne-Rhône-Alpes",
    capital: "Lyon",
    tension: 42,
    gauges: {
      economy: 65,
      security: 58,
      popularity: 52,
      ecology: 55,
      publicHealth: 62,
      socialStability: 55,
    },
    population: "8,1 M",
    populationWeight: 8.1,
    trait: "alpine",
    output: { resource: "energie", budget: 2 },
    dominant: "Fracture métropoles vertes vs villes moyennes traditionnelles",
    leaning: "centre",
    insight:
      "Municipales 2026 : à Lyon, le mandat écologiste a été mis à rude épreuve par une coalition centre-gauche / centre-droit, scrutin extrêmement serré. Saint-Étienne reste à droite.",
  },
  {
    id: "grand_est",
    name: "Grand Est",
    capital: "Strasbourg",
    tension: 32,
    gauges: {
      economy: 58,
      security: 60,
      popularity: 55,
      ecology: 55,
      publicHealth: 62,
      socialStability: 65,
    },
    population: "5,5 M",
    populationWeight: 5.5,
    trait: "industrial",
    output: { resource: "industrie", budget: 2 },
    dominant: "Retour de la social-démocratie · stabilité institutionnelle",
    leaning: "centre_gauche",
    insight:
      "Municipales 2026 : à Strasbourg, les Verts reculent face à un retour en force du PS. Nancy confirme à gauche, Metz à droite. Une région qui privilégie l'expérience.",
  },
  {
    id: "bretagne",
    name: "Bretagne",
    capital: "Rennes",
    tension: 22,
    gauges: {
      economy: 62,
      security: 70,
      popularity: 65,
      ecology: 62,
      publicHealth: 65,
      socialStability: 72,
    },
    population: "3,4 M",
    populationWeight: 3.4,
    trait: "coastal",
    output: { resource: "tourisme", budget: 2 },
    dominant: "Bastion social-démocrate et listes citoyennes",
    leaning: "centre_gauche",
    insight:
      "Municipales 2026 : victoires confortables des maires sortants à Rennes et Brest. Le RN y réalise ses scores les plus bas de France. L'exception modérée.",
  },
  {
    id: "outre_mer",
    name: "Outre-mer",
    capital: "Multiples",
    tension: 55,
    gauges: {
      economy: 38,
      security: 42,
      popularity: 45,
      ecology: 58,
      publicHealth: 48,
      socialStability: 42,
    },
    population: "2,7 M",
    populationWeight: 2.7,
    trait: "strategic",
    output: { resource: "defense", budget: 1 },
    dominant: "Tendances variables selon les territoires",
    leaning: "variable",
    insight:
      "Antilles, Guyane, Réunion, Mayotte, Pacifique : équilibres politiques très différents d'un territoire à l'autre, marqués par les questions de vie chère, sécurité et autonomie.",
  },
];

/**
 * Compute the average of a region's 6 gauges. Used as a single
 * "regional health" indicator for at-a-glance map coloring.
 */
export function regionGaugeAverage(g: RegionGauges): number {
  return (
    (g.economy +
      g.security +
      g.popularity +
      g.ecology +
      g.publicHealth +
      g.socialStability) /
    6
  );
}

/**
 * Default gauge values used when migrating older saves that lack
 * per-region gauges. Mirrors the seeded values above keyed by RegionId.
 */
export const INITIAL_REGION_GAUGES: Record<RegionId, RegionGauges> =
  INITIAL_REGIONS.reduce(
    (acc, r) => {
      acc[r.id] = { ...r.gauges };
      return acc;
    },
    {} as Record<RegionId, RegionGauges>,
  );

export function tensionLevel(t: number): {
  label: string;
  color: "success" | "warning" | "danger";
} {
  if (t < 30) return { label: "Calme", color: "success" };
  if (t < 60) return { label: "Tendue", color: "warning" };
  return { label: "Explosive", color: "danger" };
}

const VALID_LEANINGS: PoliticalLeaning[] = [
  "gauche",
  "centre_gauche",
  "centre",
  "centre_droit",
  "droite",
  "rn",
  "fragmentee",
  "variable",
];

export function isValidLeaning(value: unknown): value is PoliticalLeaning {
  return (
    typeof value === "string" &&
    VALID_LEANINGS.includes(value as PoliticalLeaning)
  );
}

export function leaningLabel(l: PoliticalLeaning | string): string {
  switch (l) {
    case "gauche":
      return "Gauche";
    case "centre_gauche":
      return "Centre-gauche";
    case "centre":
      return "Centre";
    case "centre_droit":
      return "Centre-droit";
    case "droite":
      return "Droite";
    case "rn":
      return "RN / Droite radicale";
    case "fragmentee":
      return "Fragmentée";
    case "variable":
    default:
      return "Variable";
  }
}

export function leaningColor(l: PoliticalLeaning | string): string {
  switch (l) {
    case "gauche":
      return "#e11d48";
    case "centre_gauche":
      return "#f472b6";
    case "centre":
      return "#eab308";
    case "centre_droit":
      return "#60a5fa";
    case "droite":
      return "#2563eb";
    case "rn":
      return "#1e3a8a";
    case "fragmentee":
      return "#9333ea";
    case "variable":
    default:
      return "#94a3b8";
  }
}
