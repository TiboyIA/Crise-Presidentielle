import type { GaffeType, HiddenPolitics, MinisterGaffeEntry, NationalIndicators, NewsUrgency, StrategyMinister } from "@/types/strategy";
import { fatigueToProbabilityBonus } from "@/logic/ministerBurnoutEngine";

export type { GaffeType, MinisterGaffeEntry } from "@/types/strategy";

// ── Labels d'affichage ─────────────────────────────────────────────────────────

export const GAFFE_LABELS: Record<GaffeType, string> = {
  condescendance:       "Déclaration méprisante",
  contradiction:        "Contradiction publique",
  minimisation:         "Minimisation de crise",
  chiffre_faux:         "Chiffre erroné",
  attaque_maladroite:   "Attaque maladroite",
  silence_embarrassant: "Silence embarrassant",
};

// ── Effets par type ────────────────────────────────────────────────────────────

interface GaffeEffectSet {
  indicatorEffects:      Partial<NationalIndicators>;
  hiddenPoliticsEffects: Partial<HiddenPolitics>;
  oppositionPowerDelta:  number;
}

const GAFFE_EFFECTS: Record<GaffeType, GaffeEffectSet> = {
  condescendance:       { indicatorEffects: { popularity: -6 }, hiddenPoliticsEffects: { mediaMood: -5, scandalRisk: 6 },  oppositionPowerDelta: 4 },
  contradiction:        { indicatorEffects: { popularity: -4 }, hiddenPoliticsEffects: { mediaMood: -6, scandalRisk: 8 },  oppositionPowerDelta: 5 },
  minimisation:         { indicatorEffects: { popularity: -3 }, hiddenPoliticsEffects: { mediaMood: -4, scandalRisk: 4 },  oppositionPowerDelta: 3 },
  chiffre_faux:         { indicatorEffects: { popularity: -4 }, hiddenPoliticsEffects: { mediaMood: -7, scandalRisk: 7 },  oppositionPowerDelta: 4 },
  attaque_maladroite:   { indicatorEffects: { popularity: -3 }, hiddenPoliticsEffects: { mediaMood: -3, scandalRisk: 5 },  oppositionPowerDelta: 6 },
  silence_embarrassant: { indicatorEffects: { popularity: -5 }, hiddenPoliticsEffects: { mediaMood: -5, scandalRisk: 5 },  oppositionPowerDelta: 3 },
};

// ── 8 citations fictives ───────────────────────────────────────────────────────

const GAFFE_QUOTES: Record<GaffeType, string[]> = {
  condescendance: [
    "Les gens qui se plaignent devraient regarder combien ils coûtent à la collectivité.",
    "Cette frange de la population a toujours eu du mal à comprendre les enjeux macroéconomiques.",
  ],
  contradiction: [
    "Nous n'avons jamais dit que cette réforme était urgente — et c'est justement pourquoi elle l'est.",
  ],
  minimisation: [
    "Ce sont des chiffres alarmistes. La situation est sous contrôle depuis plusieurs semaines.",
  ],
  chiffre_faux: [
    "Les 80 % de la population concernée — enfin, plusieurs dizaines de milliers selon les données rectifiées.",
  ],
  attaque_maladroite: [
    "Les syndicats savent exactement ce qu'ils font. Et ce n'est pas dans l'intérêt du pays.",
    "L'opposition ferait bien de s'occuper de ses propres casseroles avant de commenter les nôtres.",
  ],
  silence_embarrassant: [
    "Je n'ai pas les éléments pour répondre en ce moment. Nous communiquerons dès que nous aurons quelque chose à dire.",
  ],
};

// ── Logique interne ────────────────────────────────────────────────────────────

function pickQuote(type: GaffeType): string {
  const pool = GAFFE_QUOTES[type];
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickGaffeType(minister: StrategyMinister): GaffeType {
  const lowCompetence  = minister.competence < 50;
  const lowLoyalty     = minister.loyalty < 40;
  const highCompetence = minister.competence > 70;

  const weights: [GaffeType, number][] = [
    ["condescendance",       lowLoyalty    ? 4 : 1],
    ["contradiction",        lowCompetence ? 4 : 2],
    ["minimisation",         3],
    ["chiffre_faux",         lowCompetence ? 4 : 1],
    ["attaque_maladroite",   lowLoyalty    ? 4 : 1],
    ["silence_embarrassant", highCompetence ? 3 : 1],
  ];

  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of weights) {
    r -= w;
    if (r <= 0) return type;
  }
  return "minimisation";
}

function riskScore(m: StrategyMinister): number {
  return (100 - m.competence) * 0.5 + (100 - m.loyalty) * 0.3 + m.scandalRisk * 0.2;
}

// ── API publique ───────────────────────────────────────────────────────────────

/** Calcule la probabilité de gaffe (0-20 %) selon le profil du ministre et le contexte. */
export function computeGaffeProbability(
  minister: StrategyMinister,
  hiddenPolitics: HiddenPolitics,
  urgency: NewsUrgency,
  fatigue?: number,
): number {
  let score = 0;

  // Fragilité du ministre
  score += Math.max(0, Math.round((65 - minister.competence) * 0.4));
  score += Math.max(0, Math.round((50 - minister.loyalty) * 0.3));
  score += Math.round(minister.scandalRisk * 0.1);

  // Pression du contexte
  if (hiddenPolitics.scandalRisk > 70) score += 7;
  else if (hiddenPolitics.scandalRisk > 50) score += 3;
  if (hiddenPolitics.mediaMood < 30) score += 7;
  else if (hiddenPolitics.mediaMood < 50) score += 3;
  if (hiddenPolitics.popularFatigue > 70) score += 5;
  else if (hiddenPolitics.popularFatigue > 55) score += 2;

  // Urgence
  if (urgency === "critique") score += 10;
  else if (urgency === "forte") score += 5;

  // Fatigue ministérielle
  if (fatigue !== undefined) score += fatigueToProbabilityBonus(fatigue);

  return Math.min(20, Math.round(score / 4));
}

/** Sélectionne le ministre le plus fragile (celui avec le score de risque le plus élevé). */
export function pickWeakestMinister(ministers: StrategyMinister[]): StrategyMinister | null {
  if (ministers.length === 0) return null;
  return ministers.reduce((w, m) => riskScore(m) > riskScore(w) ? m : w);
}

/**
 * Tente de générer une gaffe ministérielle.
 * @param ministers  Ministres avec `name` déjà résolu depuis STRATEGY_MINISTERS.
 * @returns  Entrée de gaffe, ou null si le tirage n'aboutit pas.
 */
export function generateMinisterGaffe(
  ministers: StrategyMinister[],
  hiddenPolitics: HiddenPolitics,
  urgency: NewsUrgency,
  fatigueMap?: Record<string, number>,
): MinisterGaffeEntry | null {
  const minister = pickWeakestMinister(ministers);
  if (!minister) return null;

  const fatigue    = fatigueMap?.[minister.id];
  const probability = computeGaffeProbability(minister, hiddenPolitics, urgency, fatigue);
  if (Math.random() * 100 >= probability) return null;

  const gaffeType = pickGaffeType(minister);
  return {
    ministerId:    minister.id,
    ministerName:  minister.name ?? "un membre du gouvernement",
    gaffeType,
    quote:         pickQuote(gaffeType),
  };
}

/** Retourne les effets sur indicateurs, politique cachée et opposition. */
export function computeGaffeEffects(gaffe: MinisterGaffeEntry): GaffeEffectSet {
  return GAFFE_EFFECTS[gaffe.gaffeType];
}
