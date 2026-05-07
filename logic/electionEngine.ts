import type { Gauges } from "@/types/game";
import { PlayerPromise } from "@/data/promises";
import type { Region, RegionId } from "@/data/regions";

export interface ElectionBlock {
  label: string;
  delta: number;
  detail: string;
}

/**
 * Module 2 — Résultat du vote dans une région donnée.
 * `voteShare` est le score du président sortant (0-100). `weight` est
 * la pondération démographique (en millions d'habitants) utilisée pour
 * agréger en vote national.
 */
export interface RegionVote {
  region: RegionId;
  regionName: string;
  voteShare: number;
  weight: number;
  /** Pour l'UI : "vote_pour" | "vote_contre" en fonction du score */
  verdict: "pour" | "contre";
}

export interface ElectionResult {
  voteShare: number;
  reElected: boolean;
  blocks: ElectionBlock[];
  headline: string;
  summary: string;
  /** Module 2 — résultat détaillé par région (optionnel pour la
   *  rétro-compatibilité avec les saves antérieures). */
  regionalResults?: RegionVote[];
}

/**
 * Calcule le score régional d'un président sortant pour une région.
 *
 * Modèle : on part d'un baseline 50, on ajoute :
 *  - bonus/malus de popularité régionale
 *  - bonus de stabilité sociale
 *  - pénalité de tension
 * Le résultat est borné [5, 95] pour rester crédible.
 */
function regionVoteShare(region: Region): number {
  const popPart = (region.gauges.popularity - 50) * 0.55;
  const stabilityPart = (region.gauges.socialStability - 50) * 0.25;
  const tensionPenalty = -(region.tension - 50) * 0.4;
  const economyPart = (region.gauges.economy - 50) * 0.15;
  const raw = 50 + popPart + stabilityPart + tensionPenalty + economyPart;
  return Math.max(5, Math.min(95, raw));
}

function computeRegionalResults(regions: Region[]): {
  results: RegionVote[];
  weightedAverage: number;
} {
  if (regions.length === 0) {
    return { results: [], weightedAverage: 50 };
  }
  const results: RegionVote[] = regions.map((r) => {
    const share = regionVoteShare(r);
    return {
      region: r.id,
      regionName: r.name,
      voteShare: Math.round(share),
      weight: r.populationWeight,
      verdict: share >= 50 ? "pour" : "contre",
    };
  });
  const totalWeight = results.reduce((s, r) => s + r.weight, 0) || 1;
  const weightedAverage =
    results.reduce((s, r) => s + r.voteShare * r.weight, 0) / totalWeight;
  return { results, weightedAverage };
}

export function computeElection(
  gauges: Gauges,
  promises: PlayerPromise[],
  media: number,
  opposition: number,
  scandalsRevealed: number,
  /**
   * Module 2 — passez les régions pour ajouter le bloc "Vote des
   *  territoires". Optionnel pour la rétro-compatibilité (un appel
   *  sans régions retombe sur l'ancien comportement).
   */
  regions?: Region[],
): ElectionResult {
  const avg =
    (gauges.popularity +
      gauges.economy +
      gauges.security +
      gauges.diplomacy +
      gauges.ecology +
      gauges.authority) /
    6;

  const fulfilled = promises.filter((p) => p.status === "fulfilled").length;
  const broken = promises.filter((p) => p.status === "broken").length;

  const baseScore = 30;
  const performanceScore = (avg - 50) * 0.55;
  const promisesScore = fulfilled * 5 - broken * 7;
  const mediaScore = (media - 50) * 0.22;
  const oppositionScore = -(opposition - 50) * 0.28;
  const scandalsScore = -scandalsRevealed * 4;

  const regionalAgg = regions
    ? computeRegionalResults(regions)
    : { results: [], weightedAverage: 50 };
  // Le vote régional pèse comme un signal complémentaire au bilan :
  // un président qui a coupé les régions en perd, un qui les a
  // ménagées en gagne.
  const regionalScore = regions ? (regionalAgg.weightedAverage - 50) * 0.4 : 0;

  const raw =
    baseScore +
    performanceScore +
    promisesScore +
    mediaScore +
    oppositionScore +
    scandalsScore +
    regionalScore;

  const voteShare = Math.max(5, Math.min(95, Math.round(raw)));
  const reElected = voteShare >= 50;

  const blocks: ElectionBlock[] = [
    {
      label: "Score de base",
      delta: baseScore,
      detail: "Socle naturel de l'exécutif sortant.",
    },
    {
      label: "Bilan présidentiel",
      delta: Math.round(performanceScore * 10) / 10,
      detail: `Moyenne des indicateurs : ${Math.round(avg)}/100`,
    },
    {
      label: "Promesses tenues",
      delta: promisesScore,
      detail: `${fulfilled} tenue(s), ${broken} brisée(s)`,
    },
    {
      label: "Climat médiatique",
      delta: Math.round(mediaScore * 10) / 10,
      detail: `Médias : ${Math.round(media)}/100`,
    },
    {
      label: "Opposition parlementaire",
      delta: Math.round(oppositionScore * 10) / 10,
      detail: `Force adverse : ${Math.round(opposition)}/100`,
    },
    {
      label: "Scandales révélés",
      delta: scandalsScore,
      detail: `${scandalsRevealed} affaire(s) sortie(s) en plein mandat`,
    },
  ];

  if (regions) {
    const pourCount = regionalAgg.results.filter((r) => r.verdict === "pour")
      .length;
    blocks.push({
      label: "Vote des territoires",
      delta: Math.round(regionalScore * 10) / 10,
      detail: `${pourCount}/${regionalAgg.results.length} régions vous reconduisent · score moyen pondéré ${Math.round(
        regionalAgg.weightedAverage,
      )}/100`,
    });
  }

  let headline: string;
  let summary: string;
  if (voteShare >= 65) {
    headline = "Réélection triomphale";
    summary =
      "Vous écrasez vos adversaires au second tour. Une vague historique vous porte pour cinq nouvelles années.";
  } else if (voteShare >= 55) {
    headline = "Réélection nette";
    summary =
      "Le pays vous accorde un second mandat clair. La République continue.";
  } else if (voteShare >= 50) {
    headline = "Réélection serrée";
    summary =
      "Une victoire à l'arraché. Vous gardez l'Élysée mais sans mandat fort.";
  } else if (voteShare >= 42) {
    headline = "Défaite honorable";
    summary =
      "Vous perdez de peu. Votre bilan a divisé. Vous quittez l'Élysée la tête haute, mais battu.";
  } else if (voteShare >= 30) {
    headline = "Défaite cinglante";
    summary =
      "L'opposition rafle la mise. La France tourne la page de votre mandat.";
  } else {
    headline = "Désaveu national";
    summary =
      "Le pays vous rejette massivement. Votre mandat entre dans l'Histoire comme un échec.";
  }

  return {
    voteShare,
    reElected,
    blocks,
    headline,
    summary,
    regionalResults: regions ? regionalAgg.results : undefined,
  };
}
