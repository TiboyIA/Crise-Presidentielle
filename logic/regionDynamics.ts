import type { EventChoice } from "@/data/events";
import type {
  PoliticalLeaning,
  Region,
  RegionId,
  RegionTrait,
} from "@/data/regions";
import type { Gauges } from "@/types/game";
import { clamp } from "@/logic/utils";

/**
 * Module 2 — moteur dynamique des régions.
 *
 * Trois mécaniques pures, sans état interne :
 *  1. Production budgétaire par région (computeRegionalProduction).
 *  2. Résistance régionale aux réformes (applyReformResistance).
 *  3. Sélection d'une région candidate à un évènement régional
 *     (pickRegionalCandidate).
 *
 * On garde tout dans un seul fichier pour limiter la prolifération :
 * ces fonctions partagent le même domaine métier (la région) et sont
 * appelées dans la même section du resolveChoice.
 */

// ─── 1. Production budgétaire ────────────────────────────────────────

export interface RegionalProductionEntry {
  id: RegionId;
  delta: number;
  reason: "produces" | "neutral" | "withholds" | "strikes";
}

export interface RegionalProductionResult {
  totalDelta: number;
  perRegion: RegionalProductionEntry[];
}

/**
 * Calcule la contribution nette des régions au budget national pour
 * un tour. Une région saine produit, une région hostile retient ses
 * recettes, une région en explosion creuse activement le déficit.
 *
 * Le résultat est borné à ±5 pour éviter d'éclipser les effets d'un
 * choix politique : les régions sont un "bruit de fond" budgétaire,
 * pas le levier principal.
 */
export function computeRegionalProduction(
  regions: Region[],
): RegionalProductionResult {
  const perRegion: RegionalProductionEntry[] = regions.map((r) => {
    const base = r.output.budget;
    if (r.tension >= 70) {
      // Grève fiscale, blocages : la région coûte au lieu de rapporter.
      return { id: r.id, delta: -base, reason: "strikes" };
    }
    if (r.tension >= 55) {
      return { id: r.id, delta: 0, reason: "withholds" };
    }
    if (r.gauges.economy >= 60 && r.tension < 45) {
      return { id: r.id, delta: base, reason: "produces" };
    }
    if (r.gauges.economy >= 45) {
      return { id: r.id, delta: Math.round(base / 2), reason: "produces" };
    }
    return { id: r.id, delta: 0, reason: "neutral" };
  });
  const total = perRegion.reduce((s, e) => s + e.delta, 0);
  // Borne : ±5 budget / tour pour rester un bruit de fond.
  const bounded = Math.max(-5, Math.min(5, total));
  return { totalDelta: bounded, perRegion };
}

// ─── 2. Résistance régionale aux réformes ────────────────────────────

export type ReformKind =
  | "ecology"  // taxes carbone, normes environnementales — fâche droite/RN
  | "security" // tour de vis sécuritaire — fâche gauche
  | "economy"  // austérité, baisse dépenses — fâche gauche/centre-gauche
  | "social";  // hausse impôts, redistribution — fâche droite/RN

/**
 * Quels courants politiques s'opposent FRONTALEMENT à chaque famille
 * de réforme. Une région classée dans cette liste se mobilise contre
 * la réforme dès que sa tension est déjà élevée (>= 50).
 */
const HATES_REFORM: Record<ReformKind, ReadonlyArray<PoliticalLeaning>> = {
  ecology: ["droite", "rn"],
  security: ["gauche"],
  economy: ["gauche", "centre_gauche"],
  social: ["droite", "rn", "centre_droit"],
};

export interface ReformResistanceResult {
  /** Régions qui résistent activement à cette réforme. */
  resisters: RegionId[];
  /** Gauges après pénalités (popularity / authority réduites). */
  gauges: Gauges;
  /** Régions modifiées (tension augmentée chez les résistantes). */
  regions: Region[];
  /** Texte court à afficher dans le journal — vide si pas de résistance. */
  notice: string | null;
}

/**
 * Applique les pénalités de résistance régionale à une réforme.
 *
 * Modèle volontairement simple :
 *  - Régions qui résistent = celles dont la tendance politique HAIT
 *    cette réforme ET dont la tension est déjà ≥ 50 (donc mobilisable).
 *  - Pour chaque résistante : +5 tension régionale, -2 economy locale,
 *    et au global -1 popularity / -1 authority par résistante (cap 4).
 *
 * Si le choix n'est pas tagué `reform`, la fonction est un no-op : on
 * renvoie les références d'entrée inchangées pour que le call site
 * puisse l'appeler systématiquement sans coût.
 */
export function applyReformResistance(
  choice: EventChoice,
  gauges: Gauges,
  regions: Region[],
): ReformResistanceResult {
  if (!choice.reform) {
    return { resisters: [], gauges, regions, notice: null };
  }
  const haters = HATES_REFORM[choice.reform];
  const resisters: RegionId[] = [];
  const updatedRegions = regions.map((r) => {
    const hates = haters.includes(r.leaning);
    if (hates && r.tension >= 50) {
      resisters.push(r.id);
      return {
        ...r,
        tension: clamp(r.tension + 5),
        gauges: {
          ...r.gauges,
          economy: clamp(r.gauges.economy - 2),
          socialStability: clamp(r.gauges.socialStability - 3),
        },
      };
    }
    return r;
  });
  if (resisters.length === 0) {
    return { resisters: [], gauges, regions: updatedRegions, notice: null };
  }
  // Pénalité plafonnée à 4 régions pour rester soutenable.
  const penalty = Math.min(4, resisters.length);
  const updatedGauges: Gauges = {
    ...gauges,
    popularity: clamp(gauges.popularity - penalty),
    authority: clamp(gauges.authority - penalty),
  };
  const labels: Record<ReformKind, string> = {
    ecology: "écologique",
    security: "sécuritaire",
    economy: "d'austérité",
    social: "sociale",
  };
  const notice = `${resisters.length} région${
    resisters.length > 1 ? "s" : ""
  } se mobilise${resisters.length > 1 ? "nt" : ""} contre cette réforme ${
    labels[choice.reform]
  }.`;
  return {
    resisters,
    gauges: updatedGauges,
    regions: updatedRegions,
    notice,
  };
}

// ─── 3. Sélection d'un candidat régional ─────────────────────────────

export interface RegionalCandidate {
  region: Region;
  /** "demand" si la région demande, "catastrophe" sinon. */
  kind: "demand" | "catastrophe";
}

/**
 * Choisit la région la plus éligible à déclencher un évènement
 * régional, ou null si aucune ne l'est ce tour. Critères :
 *  - tension ≥ 55 OU économie ≤ 35 OU écologie ≤ 35
 *  - exclut les régions qui ont déclenché un évènement dans les
 *    `cooldownTurns` derniers tours
 *
 * `kind` est tiré au sort avec un biais : 75% demande, 25% catastrophe
 * (les catastrophes restent rares pour rester impactantes).
 */
export function pickRegionalCandidate(
  regions: Region[],
  recentRegionIds: ReadonlySet<RegionId>,
  rand: () => number = Math.random,
): RegionalCandidate | null {
  const eligible = regions.filter(
    (r) =>
      !recentRegionIds.has(r.id) &&
      (r.tension >= 55 ||
        r.gauges.economy <= 35 ||
        r.gauges.ecology <= 35 ||
        r.gauges.publicHealth <= 35),
  );
  if (eligible.length === 0) return null;
  // Trie par "stress" composite : tension forte + jauges basses passent
  // en premier.
  eligible.sort((a, b) => {
    const stressA =
      a.tension - (a.gauges.economy + a.gauges.ecology + a.gauges.publicHealth) / 3;
    const stressB =
      b.tension - (b.gauges.economy + b.gauges.ecology + b.gauges.publicHealth) / 3;
    return stressB - stressA;
  });
  const region = eligible[0]!;
  const kind: "demand" | "catastrophe" = rand() < 0.25 ? "catastrophe" : "demand";
  return { region, kind };
}

// ─── 4. Petits utilitaires affichés en UI ────────────────────────────

const TRAIT_ICONS: Record<RegionTrait, string> = {
  capital: "🏛",
  coastal: "🌊",
  industrial: "🏭",
  agricultural: "🌾",
  strategic: "🛡",
  alpine: "⛰",
};

export function regionTraitIcon(trait: RegionTrait): string {
  return TRAIT_ICONS[trait];
}

const RESOURCE_LABEL: Record<Region["output"]["resource"], string> = {
  services: "Services",
  tourisme: "Tourisme",
  industrie: "Industrie",
  agriculture: "Agriculture",
  defense: "Défense",
  energie: "Énergie",
};

export function regionResourceLabel(resource: Region["output"]["resource"]): string {
  return RESOURCE_LABEL[resource];
}
