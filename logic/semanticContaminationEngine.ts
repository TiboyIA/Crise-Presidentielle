import type { HiddenPolitics, NationalIndicators, NewsType, ToxicKeyword } from "@/types/strategy";

export type { ToxicKeyword } from "@/types/strategy";

export interface ContaminationContext {
  newsType: NewsType;
  nationalIndicators: NationalIndicators;
  hiddenPolitics: HiddenPolitics;
  governanceDoctrine: string;
  actionCount: number;
}

interface ContaminationRule {
  themeKey: string;
  keyword: string;
  toxicityBase: number;
  source: ToxicKeyword["source"];
  durationActions: number;
  matches: (ctx: ContaminationContext) => boolean;
}

// ── 5 règles de contamination ─────────────────────────────────────────────────

const CONTAMINATION_RULES: ContaminationRule[] = [
  {
    themeKey: "reforme",
    keyword: "Réforme",
    toxicityBase: 45,
    source: "opposition",
    durationActions: 20,
    matches: ({ newsType }) => newsType === "social",
  },
  {
    themeKey: "securite",
    keyword: "Sécurité",
    toxicityBase: 40,
    source: "opposition",
    durationActions: 25,
    // Doctrine autoritaire ou scandale latent → le mot "sécurité" devient instrumentalisé
    matches: ({ governanceDoctrine, hiddenPolitics }) =>
      governanceDoctrine === "autoritaire" || hiddenPolitics.scandalRisk > 65,
  },
  {
    themeKey: "ecologie",
    keyword: "Écologie",
    toxicityBase: 35,
    source: "media",
    durationActions: 15,
    // L'écologie devient perçue comme un luxe quand l'économie s'effondre
    matches: ({ nationalIndicators }) => nationalIndicators.economy < 35,
  },
  {
    themeKey: "dette",
    keyword: "Dette",
    toxicityBase: 55,
    source: "crisis",
    durationActions: 30,
    matches: ({ nationalIndicators }) => nationalIndicators.publicBudget < 20,
  },
  {
    themeKey: "austerite",
    keyword: "Austérité",
    toxicityBase: 50,
    source: "media",
    durationActions: 20,
    matches: ({ newsType, nationalIndicators }) =>
      newsType === "economie" && nationalIndicators.economy < 45,
  },
];

// ── API publique ───────────────────────────────────────────────────────────────

/**
 * Génère un nouveau mot-clé toxique si les conditions sont remplies et qu'il n'est pas déjà présent.
 * Un seul mot-clé est généré par événement (premier match dans l'ordre des règles).
 */
export function generateContaminationFromEvent(
  ctx: ContaminationContext,
  existing: ToxicKeyword[],
): ToxicKeyword | null {
  const existingKeys = new Set(existing.map((k) => k.themeKey));
  for (const rule of CONTAMINATION_RULES) {
    if (!existingKeys.has(rule.themeKey) && rule.matches(ctx)) {
      return {
        keyword: rule.keyword,
        themeKey: rule.themeKey,
        toxicity: rule.toxicityBase,
        source: rule.source,
        expiresAfterActions: ctx.actionCount + rule.durationActions,
      };
    }
  }
  return null;
}

/** Retourne les mots-clés toxiques actifs qui recoupent les thèmes du choix. */
export function checkChoiceContamination(
  semanticThemes: string[],
  toxicKeywords: ToxicKeyword[],
): ToxicKeyword[] {
  if (semanticThemes.length === 0 || toxicKeywords.length === 0) return [];
  const themeSet = new Set(semanticThemes);
  return toxicKeywords.filter((k) => themeSet.has(k.themeKey));
}

/** Calcule les malus discrets sur hiddenPolitics pour chaque thème contaminé utilisé. */
export function computeContaminationEffects(matched: ToxicKeyword[]): Partial<HiddenPolitics> {
  if (matched.length === 0) return {};
  let mediaMood = 0;
  let popularFatigue = 0;
  let scandalRisk = 0;
  for (const kw of matched) {
    mediaMood      -= Math.round(kw.toxicity * 0.10);
    popularFatigue += Math.round(kw.toxicity * 0.08);
    scandalRisk    += Math.round(kw.toxicity * 0.06);
  }
  return {
    mediaMood:      Math.max(-8, mediaMood),
    popularFatigue: Math.min(6, popularFatigue),
    scandalRisk:    Math.min(5, scandalRisk),
  };
}

/** Retire les mots-clés expirés selon le compteur d'actions courant. */
export function decayContamination(
  keywords: ToxicKeyword[],
  currentActionCount: number,
): ToxicKeyword[] {
  return keywords.filter((k) => k.expiresAfterActions > currentActionCount);
}
