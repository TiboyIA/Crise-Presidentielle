/**
 * discourseEngine.ts — Indice de Clarté Présidentielle
 *
 * Calcule un score de clarté (0-100) pour un message présidentiel en réponse à une crise.
 * Aucune analyse textuelle — le score est déterminé entièrement par :
 *   1. Le profil de clarté du choix (données statiques définies dans newsEvents.ts)
 *   2. Le contexte de crise (urgence, type)
 *   3. L'état politique actuel (hiddenPolitics, doctrine, usure du mandat)
 *
 * Effets des retombées (appliqués dans StrategyContext après chaosAmplifier) :
 *   score ≥ 70  → mediaMood +3, popularFatigue −2           ("Message clair")
 *   score 40-69 → aucun effet additionnel                    ("Message ambigu")
 *   score < 40  → popularFatigue +3, scandalRisk +3          ("Communication confuse")
 *   score < 20 + urgency "critique" → panique : popularFatigue +8, scandalRisk +8, mediaMood −8
 */

import type { ClarityContext, ClarityProfile, ClarityResult } from "@/types/strategy";
import type { HiddenPolitics } from "@/types/strategy";

export type { ClarityProfile, ClarityContext, ClarityResult } from "@/types/strategy";

// ── Bandes de clarté ──────────────────────────────────────────────────────────

export type ClarityBand = "clear" | "ambiguous" | "confused";

export const CLARITY_LABELS: Record<ClarityBand, string> = {
  clear:    "Message clair",
  ambiguous:"Message ambigu",
  confused: "Communication confuse",
};

/** Couleur hex associée à chaque bande, compatible avec PALETTE. */
export const CLARITY_COLORS: Record<ClarityBand, string> = {
  clear:    "#3fbe7a",  // PALETTE.success
  ambiguous:"#e8a93a",  // PALETTE.warning
  confused: "#e54848",  // PALETTE.danger
};

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Calcule l'indice de clarté présidentielle pour un message de crise.
 *
 * @param messageType Profil de clarté du choix (cohérence, précision, transparence, jargon, évitement).
 * @param context     Contexte de la crise (urgence, type).
 * @param state       État politique courant (hiddenPolitics, indicators, doctrine, mandateDay).
 */
export function computePresidentialClarity(
  messageType: ClarityProfile,
  context:     ClarityContext,
  state:       { hiddenPolitics: HiddenPolitics; nationalIndicators: { cohesion: number }; governanceDoctrine: string; mandateDay: number },
): ClarityResult {
  const { coherence, precision, transparency, jargon, evasion } = messageType;

  // 1. Score de base à partir du profil statique (0-100)
  //    Positifs : cohérence, précision, transparence (pondération équilibrée)
  //    Négatifs : jargon (pénalité légère) et évitement (pénalité forte)
  const positiveSignal = (coherence + precision + transparency) / 3;    // 0-10
  const negativeSignal = (jargon * 0.5 + evasion * 0.5);                // 0-10
  const rawBase = Math.max(0, positiveSignal - negativeSignal * 0.65);   // 0-10
  let score = Math.round(rawBase * 10);                                  // 0-100

  const hp = state.hiddenPolitics;
  const { urgency } = context;

  // 2. Amplification en crise — haute gravité rend la clarté plus exigeante
  if (urgency === "critique") {
    if (state.nationalIndicators.cohesion < 40)       score -= 15;
    else if (state.nationalIndicators.cohesion < 60)  score -= 8;
  } else if (urgency === "forte") {
    if (state.nationalIndicators.cohesion < 35)       score -= 8;
  }

  // 3. Humeur médiatique — médias hostiles déforment le message
  if (hp.mediaMood < 30)       score -= 12;
  else if (hp.mediaMood < 45)  score -= 6;
  else if (hp.mediaMood >= 75) score += 4;

  // 4. Lassitude populaire — public moins réceptif aux discours
  if (hp.popularFatigue > 65)      score -= 8;
  else if (hp.popularFatigue > 50) score -= 4;

  // 5. Doctrine de gouvernance — affecte la lisibilité naturelle du discours
  switch (state.governanceDoctrine) {
    case "technocratique":  score += 8;  break;
    case "ecologiste":      score += 3;  break;
    case "populiste":       score -= 6;  break;
    case "autoritaire":     score -= 10; break;
  }

  // 6. Usure du mandat — discours moins cru au fil du temps
  if (state.mandateDay > 200)      score -= 8;
  else if (state.mandateDay > 150) score -= 4;

  // 7. Stabilité institutionnelle — l'appareil d'État amplifie ou atténue
  if (hp.institutionalStability >= 70)      score += 5;
  else if (hp.institutionalStability < 40)  score -= 5;

  // 8. Crédibilité fragilisée par un scandalRisk élevé
  if (hp.scandalRisk > 70)       score -= 10;
  else if (hp.scandalRisk > 50)  score -= 5;

  score = Math.max(0, Math.min(100, score));

  // 9. Bande de clarté
  const band: ClarityBand =
    score >= 70 ? "clear" :
    score >= 40 ? "ambiguous" :
    "confused";

  // 10. Effets cachés générés par la clarté du message
  const hiddenPoliticsEffects: Partial<HiddenPolitics> = {};

  if (score >= 70) {
    hiddenPoliticsEffects.mediaMood      = 3;
    hiddenPoliticsEffects.popularFatigue = -2;
  } else if (score < 40) {
    if (score < 20 && urgency === "critique") {
      // Communication confuse en crise critique : risque de panique
      hiddenPoliticsEffects.popularFatigue = 8;
      hiddenPoliticsEffects.scandalRisk    = 8;
      hiddenPoliticsEffects.mediaMood      = -8;
    } else {
      hiddenPoliticsEffects.popularFatigue = 3;
      hiddenPoliticsEffects.scandalRisk    = 3;
    }
  }

  return {
    clarityScore:          score,
    band,
    label:                 CLARITY_LABELS[band],
    color:                 CLARITY_COLORS[band],
    hiddenPoliticsEffects,
  };
}
