// Analyse qualitative d'un NewsChoice pour affichage dans l'UI décisionnelle.
// Aucun chiffre caché n'est révélé — seulement des étiquettes de type et de risque.

import { RESOURCE_LABELS } from "@/types/strategy";
import type { NewsChoice, ResourceKey } from "@/types/strategy";

export interface ChoiceAnalysis {
  /** Ressource ou indicateur le plus impacté négativement */
  costLabel: string | null;
  /** Ressource ou indicateur le plus impacté positivement */
  gainLabel: string | null;
  /** Risque probable issu des effets politiques cachés */
  hiddenRisk: string | null;
  /** Portée temporelle de la décision */
  horizon: "court" | "moyen" | "long";
}

// Libellés raccourcis pour la ligne compacte (max 10 caractères)
const RESOURCE_SHORT: Record<ResourceKey, string> = {
  money:        "Budget",
  influence:    "Influence",
  energy:       "Énergie",
  intelligence: "Rens.",
  technology:   "Techno.",
  military:     "Militaire",
  cyberDefense: "Cyberdéf.",
};

const INDICATOR_SHORT: Record<string, string> = {
  popularity:   "Popularité",
  economy:      "Économie",
  security:     "Sécurité",
  ecology:      "Écologie",
  cohesion:     "Cohésion",
  publicBudget: "Budget pub.",
};

// Seuil minimal pour qu'un indicateur compte comme coût ou gain
const IND_THRESHOLD = 4;

export function analyzeChoice(choice: NewsChoice): ChoiceAnalysis {
  const resourceArr = (Object.entries(choice.effects ?? {}) as [ResourceKey, number][])
    .filter(([, v]) => v !== 0);
  const indicatorArr = (Object.entries(choice.indicatorEffects ?? {})) as [string, number][];

  // ── Coût principal ────────────────────────────────────────────────────────
  const negRes = resourceArr.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const negInd = indicatorArr.filter(([, v]) => v < -IND_THRESHOLD).sort((a, b) => a[1] - b[1]);

  const costLabel: string | null =
    negRes.length > 0
      ? (RESOURCE_SHORT[negRes[0][0]] ?? RESOURCE_LABELS[negRes[0][0]] ?? null)
      : negInd.length > 0
        ? (INDICATOR_SHORT[negInd[0][0]] ?? null)
        : null;

  // ── Gain principal ────────────────────────────────────────────────────────
  const posRes = resourceArr.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const posInd = indicatorArr.filter(([, v]) => v > IND_THRESHOLD).sort((a, b) => b[1] - a[1]);

  const gainLabel: string | null =
    posRes.length > 0
      ? (RESOURCE_SHORT[posRes[0][0]] ?? RESOURCE_LABELS[posRes[0][0]] ?? null)
      : posInd.length > 0
        ? (INDICATOR_SHORT[posInd[0][0]] ?? null)
        : null;

  // ── Risque probable (effets politiques cachés) ────────────────────────────
  const hiddenRisk = deriveHiddenRisk(choice);

  // ── Horizon temporel ──────────────────────────────────────────────────────
  let horizon: "court" | "moyen" | "long" = "court";
  if (choice.queuesDelayedConsequence) {
    horizon = "long";
  } else if (
    (choice.hiddenPoliticsEffects && Object.keys(choice.hiddenPoliticsEffects).length > 0) ||
    (choice.pathologyDelta && Object.keys(choice.pathologyDelta).length > 0)
  ) {
    horizon = "moyen";
  }

  return { costLabel, gainLabel, hiddenRisk, horizon };
}

function deriveHiddenRisk(choice: NewsChoice): string | null {
  const hp = choice.hiddenPoliticsEffects ?? {};
  const pd = choice.pathologyDelta ?? {};

  // Conséquence différée — le plus important à signaler
  if (choice.queuesDelayedConsequence) return "Effet différé";

  // Risques politiques cachés — par ordre de gravité
  if ((hp.scandalRisk ?? 0) > 0)             return "Scandale";
  if ((hp.mediaMood ?? 0) < 0)               return "Médias";
  if ((hp.eliteTrust ?? 0) < 0)              return "Élites";
  if ((hp.institutionalStability ?? 0) < 0)  return "Instabilité";
  if ((hp.popularFatigue ?? 0) > 0)          return "Fatigue";
  if ((hp.regionalTension ?? 0) > 0)         return "Tensions";

  // Pathologies rhétoriques
  if ((pd.scapegoating ?? 0) > 0)            return "Bouc émissaire";
  if ((pd.fearSpeech ?? 0) > 0)              return "Anxiogène";
  if ((pd.technocraticColdness ?? 0) > 0)    return "Froideur";
  if ((pd.minimization ?? 0) > 0)            return "Minimisation";

  return null;
}
