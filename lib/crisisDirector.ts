import type { GameState } from "@/types/game";
import type { EventCategory } from "@/data/events";

/**
 * Module IA 2 — Directeur de crise dynamique.
 *
 * Pure analytical layer that observes the GameState and produces a
 * `DirectorProfile`: a small set of signals describing what the player
 * is currently neglecting / overdoing, plus French directives that
 * are injected into the AI event generator and used to bias the
 * deterministic catalog draw.
 *
 * Design notes:
 * - 100% pure / deterministic given state — no I/O, easy to test.
 * - Thresholds are conservative so a brand-new game (all gauges = 50)
 *   produces ZERO signals and the game still feels neutral.
 * - At most 3 strongest signals are kept to keep the AI prompt short.
 */

export interface DirectorSignal {
  /** Stable identifier — never user-visible. */
  key: string;
  /** Short French label shown to the player on the dashboard. */
  label: string;
  /**
   * Importance 1..3. Used to sort and to bias category preference.
   * Higher means "this is becoming a serious problem".
   */
  weight: number;
  /** Catalog/AI categories that this signal pushes for. */
  categories: EventCategory[];
  /** Full French sentence injected into the AI generator prompt. */
  directive: string;
}

export interface DirectorProfile {
  /** Top signals (sorted by weight, max 3). */
  signals: DirectorSignal[];
  /** Deduped union of categories across kept signals. */
  preferredCategories: EventCategory[];
  /** Directives ready to be sent to the AI server. */
  directives: string[];
  /** One-line French summary suitable for a dashboard hint. */
  summary: string;
  /** False = balanced situation, no signal kept. */
  hasSignals: boolean;
}

const MAX_SIGNALS = 3;

export function analyzeGameState(state: GameState): DirectorProfile {
  const g = state.gauges;
  const h = state.hiddenGauges;
  const signals: DirectorSignal[] = [];

  // 1. Écologie négligée → sécheresse, inondation, agriculture.
  if (g.ecology < 35) {
    signals.push({
      key: "ecology_neglect",
      label: "écologie négligée",
      weight: g.ecology < 20 ? 3 : 2,
      categories: ["ecology", "agriculture"],
      directive:
        "Le président néglige gravement l'écologie. Génère plutôt une crise climatique, une sécheresse, une inondation, une canicule, une pollution majeure ou une tension agricole.",
    });
  }

  // 2. Dépenses excessives / dette → crises économiques et budgétaires.
  if (g.debt > 70 || g.budget < 30) {
    signals.push({
      key: "fiscal_crisis",
      label: "finances publiques en danger",
      weight: g.debt > 85 || g.budget < 15 ? 3 : 2,
      categories: ["economy"],
      directive:
        "La situation budgétaire de la France dérape. Génère plutôt une crise économique : dégradation par les agences de notation, alerte de la Commission européenne, grève des fonctionnaires sur les salaires, ou blocage du financement de la dette sur les marchés.",
    });
  }

  // 3. Mensonges / corruption / risque scandale → médiatique.
  if (h.scandalRisk > 60 || h.corruption > 60) {
    signals.push({
      key: "scandal_brewing",
      label: "scandales latents",
      weight: h.scandalRisk > 80 || h.corruption > 80 ? 3 : 2,
      categories: ["scandal", "media"],
      directive:
        "Les non-dits et les arrangements du gouvernement s'accumulent. Génère plutôt un scandale médiatique imminent : révélation Mediapart, fuite de documents internes, plainte du Parquet national financier, conflit d'intérêts d'un ministre, ou enquête de Cash Investigation.",
    });
  }

  // 4. Sécurité / autorité excessive → tensions sociales et régionales.
  if (g.authority > 75 || g.cohesion < 30) {
    signals.push({
      key: "authoritarian_drift",
      label: "tensions sociales",
      weight: g.authority > 85 || g.cohesion < 20 ? 3 : 2,
      categories: ["social", "regional"],
      directive:
        "La main de fer du président crispe la société française. Génère plutôt une crise sociale ou régionale : mobilisation citoyenne massive, bavure policière médiatisée, blocage par des Gilets, manifestation à Notre-Dame-des-Landes, ou demande d'autonomie d'une région (Corse, Bretagne, Pays Basque).",
    });
  }

  // 5. Santé délaissée.
  if (g.health < 35) {
    signals.push({
      key: "health_crisis",
      label: "système de santé fragile",
      weight: g.health < 20 ? 3 : 2,
      categories: ["health"],
      directive:
        "Le système de santé français est exsangue. Génère plutôt une crise sanitaire ou hospitalière : saturation des urgences, démissions massives de soignants, retour d'une épidémie, ou rupture de stock de médicaments.",
    });
  }

  // 6. Diplomatie en chute libre.
  if (g.diplomacy < 30) {
    signals.push({
      key: "diplomatic_isolation",
      label: "isolement diplomatique",
      weight: g.diplomacy < 15 ? 3 : 2,
      categories: ["diplomacy", "hybrid_warfare"],
      directive:
        "La France s'isole sur la scène internationale. Génère plutôt une crise diplomatique ou une provocation hybride : tension avec un partenaire européen, sanction d'une puissance étrangère, ou opération d'influence russe / chinoise sur le sol français.",
    });
  }

  // 7. Cyber-vulnérabilité.
  if (h.cyberRisk > 60) {
    signals.push({
      key: "cyber_exposed",
      label: "cyber-vulnérabilité",
      weight: h.cyberRisk > 80 ? 3 : 2,
      categories: ["cyber"],
      directive:
        "Les défenses cyber de la France sont fragiles. Génère plutôt une cyberattaque majeure : ransomware sur un hôpital, fuite massive de données d'État, ou attaque sur une infrastructure critique (énergie, transports, eau).",
    });
  }

  // 8. Radicalisation politique → menace sécuritaire.
  if (h.radicalization > 60) {
    signals.push({
      key: "radicalization",
      label: "radicalisation politique",
      weight: h.radicalization > 80 ? 3 : 2,
      categories: ["security", "social"],
      directive:
        "La radicalisation politique monte dangereusement. Génère plutôt une menace terroriste, une violence civile organisée, ou une attaque ciblant un élu ou un lieu de pouvoir.",
    });
  }

  // 9. Dépendance étrangère excessive.
  if (h.foreignDependence > 65) {
    signals.push({
      key: "foreign_dependence",
      label: "dépendance étrangère",
      weight: 1,
      categories: ["energy", "diplomacy"],
      directive:
        "La France est devenue très dépendante d'un fournisseur étranger. Génère plutôt une rupture d'approvisionnement : énergie (gaz, pétrole), matières premières, ou semi-conducteurs.",
    });
  }

  // 10. Peuple épuisé → coût social systématique.
  if (h.peopleFatigue > 70) {
    signals.push({
      key: "people_fatigue",
      label: "peuple épuisé",
      weight: 1,
      categories: ["social", "media"],
      directive:
        "Le peuple français est épuisé par les réformes successives. Quel que soit le sujet, chaque choix doit avoir un coût social fort et provoquer une réaction médiatique vive.",
    });
  }

  // 11. Opposition trop puissante.
  if (h.oppositionPower > 70 || state.opposition > 75) {
    signals.push({
      key: "opposition_strong",
      label: "opposition virulente",
      weight: 1,
      categories: ["opposition", "media"],
      directive:
        "L'opposition parlementaire et médiatique est très forte. Génère plutôt une motion de censure, une obstruction parlementaire, une fronde au sein de la majorité, ou une attaque médiatique coordonnée de l'opposition.",
    });
  }

  // Keep only the strongest signals to bound the AI prompt length.
  signals.sort((a, b) => b.weight - a.weight);
  const top = signals.slice(0, MAX_SIGNALS);

  const preferredCategories: EventCategory[] = [];
  for (const s of top) {
    for (const c of s.categories) {
      if (!preferredCategories.includes(c)) preferredCategories.push(c);
    }
  }

  let summary: string;
  if (top.length === 0) {
    summary = "Situation équilibrée — l'IA propose des crises variées.";
  } else if (top.length === 1) {
    summary = `L'IA observe : ${top[0]!.label}.`;
  } else {
    const labels = top.map((s) => s.label);
    const last = labels[labels.length - 1];
    summary = `L'IA observe : ${labels.slice(0, -1).join(", ")} et ${last}.`;
  }

  return {
    signals: top,
    preferredCategories,
    directives: top.map((s) => s.directive),
    summary,
    hasSignals: top.length > 0,
  };
}
