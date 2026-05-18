import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import type {
  CampaignPromises,
  DecisionTrace,
  NewsChoice,
  NewsLogEntry,
  NewsType,
} from "@/types/strategy";

// ── Score par facteur ─────────────────────────────────────────────────────────
//
// La somme des maxima vaut exactement 100 — pas de normalisation nécessaire.
//
//  urgency          0-25   Urgence de l'événement
//  breadth          0-20   Nombre de jauges touchées (ressources + indicateurs)
//  magnitude        0-15   Amplitude totale des effets (|valeurs| / 50 → score)
//  delayed          0-12   Crée une conséquence différée
//  diplomatic       0-10   Modifie une relation diplomatique
//  traced           0-8    A généré une trace dans la mémoire du peuple
//  promise          0-6    Touche un domaine de promesse de campagne
//  typeBonus        0-4    Type à portée stratégique (diplomatie, guerre_hybride)

interface WeightBreakdown {
  urgency:    number;
  breadth:    number;
  magnitude:  number;
  delayed:    number;
  diplomatic: number;
  traced:     number;
  promise:    number;
  typeBonus:  number;
}

export interface WeightedDecision {
  entry:     NewsLogEntry;
  choice?:   NewsChoice;
  weight:    number;  // 0-100
  breakdown: WeightBreakdown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urgencyScore(urgency: NewsLogEntry["urgency"]): number {
  switch (urgency) {
    case "critique": return 25;
    case "forte":    return 15;
    case "moyenne":  return 8;
    case "faible":   return 3;
  }
}

function breadthScore(entry: NewsLogEntry, choice: NewsChoice | undefined): number {
  // Ressources non-nulles de l'entrée de log
  const resourceCount = Object.values(entry.effects).filter((v) => v !== 0 && v != null).length;
  // Indicateurs du choix (si disponible)
  const indicatorCount = Object.values(choice?.indicatorEffects ?? {}).filter((v) => v !== 0 && v != null).length;
  // Effets politique cachée
  const hiddenCount = Object.values(choice?.hiddenPoliticsEffects ?? {}).filter((v) => v !== 0 && v != null).length;
  return Math.min(20, (resourceCount + indicatorCount + hiddenCount) * 3);
}

function magnitudeScore(entry: NewsLogEntry, choice: NewsChoice | undefined): number {
  // Somme des valeurs absolues des effets ressources
  const resMag = Object.values(entry.effects).reduce((s, v) => s + Math.abs(v ?? 0), 0);
  // Somme indicateurs (×10 pour compenser l'échelle plus petite)
  const indMag = Object.values(choice?.indicatorEffects ?? {}).reduce((s, v) => s + Math.abs(v ?? 0), 0) * 10;
  // Normaliser : 50 points d'amplitude = score max (15)
  return Math.min(15, Math.round((resMag + indMag) / 50 * 15));
}

// Vérifie si le type d'événement est aligné avec un domaine de promesse.
const PROMISE_TYPE_MAP: Partial<Record<NewsType, string[]>> = {
  economie:      ["economie", "pouvoir_achat"],
  social:        ["pouvoir_achat"],
  guerre_hybride:["securite"],
  cyber:         ["securite", "innovation"],
  diplomatie:    ["diplomatie", "souverainete"],
  national:      ["souverainete"],
  monde:         ["diplomatie"],
};

function hasPromiseAlignment(entry: NewsLogEntry, promises: CampaignPromises): boolean {
  const selected = promises.selected;
  if (selected.length === 0) return false;
  const aligned = PROMISE_TYPE_MAP[entry.type] ?? [];
  return aligned.some((domain) => selected.includes(domain as any));
}

// Vérifie si une trace de mémoire concerne cette décision (par proximité temporelle + titre).
function findMatchingTrace(entry: NewsLogEntry, traces: DecisionTrace[]): DecisionTrace | undefined {
  return traces.find(
    (t) =>
      // La trace a été créée le même jour (approximation via timestamp ±5 min)
      Math.abs(t.createdAtDay - entry.timestamp / 86_400_000) < 1 ||
      // Ou contient des mots du titre de l'événement (match partiel)
      entry.title.split(" ").some((word) => word.length > 4 && t.title.includes(word)),
  );
}

// ── Calcul du poids ───────────────────────────────────────────────────────────

/**
 * Calcule le poids stratégique d'une décision interactive.
 *
 * Retourne null pour les entrées de log non-interactives (pas de choiceId).
 */
export function scoreDecision(
  entry: NewsLogEntry,
  traces: DecisionTrace[],
  campaignPromises: CampaignPromises,
): WeightedDecision | null {
  if (!entry.choiceId) return null;

  const event  = NEWS_EVENT_MAP[entry.eventId];
  const choice = event?.choices?.find((c) => c.id === entry.choiceId);

  const breakdown: WeightBreakdown = {
    urgency:    urgencyScore(entry.urgency),
    breadth:    breadthScore(entry, choice),
    magnitude:  magnitudeScore(entry, choice),
    delayed:    choice?.queuesDelayedConsequence ? 12 : 0,
    diplomatic: choice?.relationDelta ? 10 : 0,
    traced:     findMatchingTrace(entry, traces) ? 8 : 0,
    promise:    hasPromiseAlignment(entry, campaignPromises) ? 6 : 0,
    typeBonus:  (entry.type === "diplomatie" || entry.type === "guerre_hybride") ? 4 : 0,
  };

  const weight = Math.min(
    100,
    Object.values(breakdown).reduce((s, v) => s + v, 0),
  );

  return { entry, choice, weight, breakdown };
}

// ── Classement des décisions d'un mandat ─────────────────────────────────────

/**
 * Retourne les N décisions les plus importantes du mandat, triées par poids décroissant.
 *
 * @param log              Historique complet des événements.
 * @param traces           Traces de mémoire publique existantes (publicMemory.traces).
 * @param campaignPromises Promesses de campagne du mandat.
 * @param topN             Nombre de décisions à retourner (défaut : 5).
 */
export function getTopDecisions(
  log: NewsLogEntry[],
  traces: DecisionTrace[],
  campaignPromises: CampaignPromises,
  topN = 5,
): WeightedDecision[] {
  return log
    .map((entry) => scoreDecision(entry, traces, campaignPromises))
    .filter((d): d is WeightedDecision => d !== null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topN);
}

// ── Label de résumé ───────────────────────────────────────────────────────────

/**
 * Génère un label court décrivant pourquoi cette décision est à fort poids.
 * Utilisé dans le bilan pour expliquer le score sans surcharger l'UI.
 */
export function getWeightLabel(d: WeightedDecision): string {
  const parts: string[] = [];

  if (d.breakdown.urgency >= 25)    parts.push("crise critique");
  if (d.breakdown.delayed > 0)      parts.push("conséquence différée");
  if (d.breakdown.diplomatic > 0)   parts.push("impact diplomatique");
  if (d.breakdown.promise > 0)      parts.push("promesse impliquée");
  if (d.breakdown.traced > 0)       parts.push("trace mémorielle");
  if (d.breakdown.breadth >= 15)    parts.push("effets multiples");

  if (parts.length === 0) return "Décision notable";
  return parts.slice(0, 2).map((s) => s[0].toUpperCase() + s.slice(1)).join(" · ");
}

// ── Indicateur de seuil ───────────────────────────────────────────────────────

export type DecisionTier = "pivot" | "majeur" | "notable" | "mineur";

export function getDecisionTier(weight: number): DecisionTier {
  if (weight >= 70) return "pivot";
  if (weight >= 45) return "majeur";
  if (weight >= 25) return "notable";
  return "mineur";
}

export const DECISION_TIER_COLOR: Record<DecisionTier, string> = {
  pivot:   "#FF3040",
  majeur:  "#FF8040",
  notable: "#FFB020",
  mineur:  "#60A0FF",
};
