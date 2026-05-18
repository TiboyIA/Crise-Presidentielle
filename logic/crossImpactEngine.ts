import type { HiddenPolitics, NationalIndicators, NewsEvent, StrategyGameState } from "@/types/strategy";

// ── Résultat ─────────────────────────────────────────────────────────────────

export interface CrossImpactResult {
  indicatorEffects: Partial<NationalIndicators>;
  hiddenEffects:    Partial<HiddenPolitics>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Accumulate a delta onto a key, keeping the running total in [-3, +3].
// This prevents stacking from multiple rules pushing a single key beyond the cap.
function addInd(
  acc: Partial<NationalIndicators>,
  key: keyof NationalIndicators,
  delta: number,
): void {
  const next = Math.max(-3, Math.min(3, (acc[key] ?? 0) + Math.round(delta)));
  if (next !== 0) acc[key] = next;
  else delete acc[key];
}

function addHid(
  acc: Partial<HiddenPolitics>,
  key: keyof HiddenPolitics,
  delta: number,
): void {
  const next = Math.max(-3, Math.min(3, (acc[key] ?? 0) + Math.round(delta)));
  if (next !== 0) acc[key] = next;
  else delete acc[key];
}

// ── Moteur ────────────────────────────────────────────────────────────────────

/**
 * Calcule les effets secondaires croisés à partir de l'état courant et des
 * effets primaires d'une décision. Les résultats sont des deltas à additionner
 * aux effets principaux — jamais une source de vérité seule.
 *
 * Garanties :
 *  - Chaque clé de résultat reste dans [-3, +3].
 *  - Toujours plus faible que l'effet principal.
 *  - Invisible au joueur (pas de log, pas d'UI dédiée).
 */
export function computeCrossImpacts(
  state: StrategyGameState,
  event: NewsEvent,
  indicatorEffects: Partial<NationalIndicators>,
  hiddenEffects: Partial<HiddenPolitics>,
): CrossImpactResult {
  const ind = state.nationalIndicators;
  const hp  = state.hiddenPolitics;
  const res = state.resources;
  const result: CrossImpactResult = { indicatorEffects: {}, hiddenEffects: {} };

  const secDelta    = indicatorEffects.security    ?? 0;
  const ecoEconDelta= indicatorEffects.economy     ?? 0;
  const budgetDelta = indicatorEffects.publicBudget ?? 0;

  // ── Règle 1 : Sécurité ↑ + Cohésion fragile → malus cohésion ────────────────
  // Renforcer l'appareil sécuritaire dans une société fracturée génère des tensions.
  // Déclencheur : sécurité augmente d'au moins 5 pts ET cohésion < 45.
  if (secDelta >= 5 && ind.cohesion < 45) {
    addInd(result.indicatorEffects, "cohesion", -Math.floor(secDelta / 5));
  }

  // ── Règle 2 : Économie ↑ + Écologie fragile → malus écologie ────────────────
  // Une reprise économique sans garde-fous accentue la pression environnementale.
  // Déclencheur : économie augmente d'au moins 5 pts ET écologie < 40.
  if (ecoEconDelta >= 5 && ind.ecology < 40) {
    addInd(result.indicatorEffects, "ecology", -Math.floor(ecoEconDelta / 5));
  }

  // ── Règle 3 : Budget ↓ + Confiance des élites faible → scandalRisk ↑ ────────
  // Les élites interprètent un déficit aggravé comme une incompétence exposable.
  // Déclencheur : budget se dégrade d'au moins 5 pts ET eliteTrust < 45.
  if (budgetDelta <= -5 && hp.eliteTrust < 45) {
    addHid(result.hiddenEffects, "scandalRisk", Math.floor(Math.abs(budgetDelta) / 5));
  }

  // ── Règle 4 : Cyberdéfense forte → amortit les crises cyber ─────────────────
  // Une infrastructure robuste absorbe une partie des impacts négatifs.
  // Déclencheur : événement de type "cyber" ET cyberDefense > 60.
  if (event.type === "cyber" && res.cyberDefense > 60) {
    const reduction = res.cyberDefense > 80 ? 2 : 1;
    for (const key of Object.keys(indicatorEffects) as (keyof NationalIndicators)[]) {
      if ((indicatorEffects[key] ?? 0) < 0) {
        addInd(result.indicatorEffects, key, reduction);
      }
    }
  }

  // ── Règle 5 : Cohésion haute → amortit les crises sociales ──────────────────
  // Une société soudée résiste mieux aux fractures sociales.
  // Déclencheur : événement de type "social" ET cohésion > 65.
  if (event.type === "social" && ind.cohesion > 65) {
    for (const key of Object.keys(indicatorEffects) as (keyof NationalIndicators)[]) {
      if ((indicatorEffects[key] ?? 0) < 0) {
        addInd(result.indicatorEffects, key, 1);
      }
    }
  }

  // ── Règle 6 : Popularité très basse + lassitude populaire → scandalRisk ↑ ───
  // Un gouvernement en défiance cumulative voit chaque crise amplifier les risques.
  // Déclencheur : popularity < 30 ET popularFatigue > 60.
  if (ind.popularity < 30 && hp.popularFatigue > 60) {
    addHid(result.hiddenEffects, "scandalRisk", 1);
  }

  // ── Règle 7 : Sécurité forte → amortit les crises hybrides ──────────────────
  // Un appareil sécuritaire solide limite les dommages des opérations adverses.
  // Déclencheur : événement de type "guerre_hybride" ET security > 70.
  if (event.type === "guerre_hybride" && ind.security > 70) {
    for (const key of Object.keys(indicatorEffects) as (keyof NationalIndicators)[]) {
      if ((indicatorEffects[key] ?? 0) < 0) {
        addInd(result.indicatorEffects, key, 1);
      }
    }
  }

  return result;
}
