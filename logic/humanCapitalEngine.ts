import type { Minister } from "@/data/ministers";

// ── Types publics ─────────────────────────────────────────────────────────────

export type HumanCapitalTier = "élevé" | "moyen" | "faible" | "critique";

export interface HumanCapitalResult {
  score: number;          // 0-100 (arrondi)
  tier: HumanCapitalTier;
  label: string;          // libellé court du tier
  color: string;          // couleur hex associée au tier
  effects: string[];      // effets actifs (max 2)
  flags: string[];        // alertes détectées (max 3)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Moteur principal ──────────────────────────────────────────────────────────

/**
 * Calcule le capital humain du gouvernement à partir des données ministérielles.
 * Fonction pure — aucun effet de bord, aucune persistance.
 * Compatible avec la sauvegarde existante : valeur dérivée, non stockée.
 *
 * @param ministers        État courant du cabinet (GameState.ministers)
 * @param options          Contexte externe optionnel
 */
export function computeHumanCapital(
  ministers: Minister[],
  options?: {
    pendingCrisesCount?: number;  // crises interactives en attente
    reshuffleCount?: number;      // remaniements depuis le début du mandat
  },
): HumanCapitalResult {
  if (ministers.length === 0) {
    return {
      score: 0,
      tier: "critique",
      label: "Sans gouvernement",
      color: "#e54848",
      effects: ["Administration paralysée"],
      flags: ["Aucun ministre en poste"],
    };
  }

  // ── Composantes de base ────────────────────────────────────────────────────
  const avgCompetence = mean(ministers.map((m) => m.competence));
  const avgLoyalty    = mean(ministers.map((m) => m.loyalty));
  const avgMorale     = mean(ministers.map((m) => m.popularity));  // proxy moral
  const avgAmbition   = mean(ministers.map((m) => m.ambition));    // tension interne

  const rivalCount    = ministers.filter((m) => m.isRival).length;
  const totalScandals = ministers.reduce((s, m) => s + m.scandals, 0);
  const highRiskCount = ministers.filter(
    (m) => m.scandalRisk >= 60 && m.scandals === 0,
  ).length;

  // Stabilité : pénalisée par rivaux, scandales révélés, et ambition collective
  const stabilityBase = clamp(
    100 - rivalCount * 20 - Math.min(totalScandals, 6) * 5 - avgAmbition * 0.25,
    0,
    100,
  );

  // Score brut pondéré — compétence 30 % · loyauté 30 % · moral 20 % · stabilité 20 %
  const raw =
    avgCompetence * 0.30 +
    avgLoyalty    * 0.30 +
    avgMorale     * 0.20 +
    stabilityBase * 0.20;

  // ── Pénalités contextuelles ────────────────────────────────────────────────
  const { pendingCrisesCount = 0, reshuffleCount = 0 } = options ?? {};
  const crisisPenalty    = Math.min(pendingCrisesCount, 8) * 1.5;  // max −12 pts
  const reshufflePenalty = Math.min(reshuffleCount, 4) * 4;        // max −16 pts

  const score = Math.round(clamp(raw - crisisPenalty - reshufflePenalty, 0, 100));

  // ── Tier & couleur ─────────────────────────────────────────────────────────
  let tier: HumanCapitalTier;
  let label: string;
  let color: string;

  if (score >= 75) {
    tier = "élevé";    label = "Gouvernement soudé";     color = "#3fbe7a";
  } else if (score >= 50) {
    tier = "moyen";    label = "Fonctionnement normal";  color = "#e8a93a";
  } else if (score >= 25) {
    tier = "faible";   label = "Cabinet fragilisé";      color = "#f59a3a";
  } else {
    tier = "critique"; label = "Gouvernement en crise";  color = "#e54848";
  }

  // ── Effets actifs ──────────────────────────────────────────────────────────
  const effects: string[] = [];
  if (score >= 85) {
    effects.push("Réformes appliquées avec efficacité");
    effects.push("Crises mieux absorbées");
  } else if (score >= 75) {
    effects.push("Décisions mieux coordonnées");
  } else if (score < 25) {
    effects.push("Risques de fuite d'informations");
    effects.push("Réformes partiellement bloquées");
  } else if (score < 50) {
    effects.push("Délais dans l'application des décisions");
  }

  // ── Alertes spécifiques ────────────────────────────────────────────────────
  const flags: string[] = [];
  if (rivalCount > 0) {
    flags.push(`${rivalCount} frondeur${rivalCount > 1 ? "s" : ""} au sein du cabinet`);
  }
  if (totalScandals >= 3) {
    flags.push("Accumulation de scandales — crédibilité érodée");
  } else if (totalScandals >= 1) {
    flags.push(`${totalScandals} scandale${totalScandals > 1 ? "s" : ""} révélé${totalScandals > 1 ? "s" : ""}`);
  }
  if (highRiskCount >= 2) {
    flags.push("Fragilité latente sur plusieurs postes");
  }
  if (avgLoyalty < 35) {
    flags.push("Loyauté collective très basse — risque de défections");
  }

  return { score, tier, label, color, effects, flags: flags.slice(0, 3) };
}

/** Accès rapide au score seul, pour les usages légers. */
export function getHumanCapitalScore(
  ministers: Minister[],
  options?: Parameters<typeof computeHumanCapital>[1],
): number {
  return computeHumanCapital(ministers, options).score;
}
