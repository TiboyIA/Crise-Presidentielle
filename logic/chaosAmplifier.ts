import type { HiddenPolitics, NationalIndicators, NewsEvent, StrategyResources } from "@/types/strategy";
import type { TensionLevel } from "@/logic/tensionEngine";

// ── Configuration par niveau de tension ───────────────────────────────────────
//
// negBoost : fraction ajoutée aux effets négatifs    (ex: 0.10 → -10 devient -11)
// posReduce: fraction retirée aux effets positifs    (ex: 0.05 → +10 devient +9)
// cascadeBoost: multiplicateur de probabilité pour rollCascades (1.0 = aucun boost)
//
// Plafond garanti : jamais plus de 15 % d'amplification sur les négatifs.
// Aucun effet positif n'est amplifié — seulement atténué ou inchangé.

interface ChaosConfig {
  negBoost:     number;  // 0.00 – 0.15
  posReduce:    number;  // 0.00 – 0.05
  cascadeBoost: number;  // 1.00 – 1.30
}

const CHAOS_CONFIG: Record<TensionLevel, ChaosConfig> = {
  stable:    { negBoost: 0.00, posReduce: 0.00, cascadeBoost: 1.00 },
  pression:  { negBoost: 0.05, posReduce: 0.00, cascadeBoost: 1.00 },
  risque:    { negBoost: 0.10, posReduce: 0.05, cascadeBoost: 1.00 },
  explosive: { negBoost: 0.15, posReduce: 0.05, cascadeBoost: 1.25 },
};

// ── Guard-rails ───────────────────────────────────────────────────────────────

/** Nombre minimum d'actions avant que le chaos s'active. Protège le début de partie. */
const MIN_ACTIONS_BEFORE_CHAOS = 15;

/** Urgences sur lesquelles l'amplification s'applique — jamais sur faible/moyenne. */
const ELIGIBLE_URGENCIES: NewsEvent["urgency"][] = ["forte", "critique"];

// ── Types publics ─────────────────────────────────────────────────────────────

export interface ChaosModifier {
  /**
   * Delta de ressources supplémentaire à ajouter APRÈS l'application normale.
   * Représente uniquement la différence due à l'amplification chaotique.
   * Vide si pas d'amplification.
   */
  resourceDelta:     Partial<StrategyResources>;
  /**
   * Effets indicateurs amplifiés — à utiliser À LA PLACE de choice.indicatorEffects.
   * Identiques à l'original si pas d'amplification.
   */
  indicatorEffects:  Partial<NationalIndicators>;
  /**
   * Effets politique cachée amplifiés — à utiliser À LA PLACE de choice.hiddenPoliticsEffects.
   * Identiques à l'original si pas d'amplification.
   */
  hiddenEffects:     Partial<HiddenPolitics>;
  /**
   * Multiplicateur à passer à rollCascades. 1.0 = aucun boost.
   * Vaut jusqu'à 1.25 en mode explosive.
   */
  cascadeBoost:      number;
  /**
   * true si une amplification non-triviale a été appliquée.
   * Utile pour conditionner l'avertissement UI.
   */
  isActive:          boolean;
}

// ── Amplification des effets ──────────────────────────────────────────────────

function amplifyValue(val: number, config: ChaosConfig): number {
  if (val < 0) return Math.round(val * (1 + config.negBoost));
  if (val > 0) return Math.round(val * (1 - config.posReduce));
  return 0;
}

function amplifyPartial<T extends Record<string, number>>(
  effects: Partial<T>,
  config: ChaosConfig,
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, val] of Object.entries(effects) as [keyof T & string, number][]) {
    result[key as keyof T] = amplifyValue(val, config) as T[keyof T];
  }
  return result;
}

// Calcule uniquement le delta entre les effets amplifiés et les effets originaux.
// Utilisé pour les ressources qui sont déjà appliquées par applyInteractiveNews.
function computeDelta<T extends Record<string, number>>(
  original: Partial<T>,
  amplified: Partial<T>,
): Partial<T> {
  const delta: Partial<T> = {};
  const keys = new Set([...Object.keys(original), ...Object.keys(amplified)]) as Set<keyof T & string>;
  for (const key of keys) {
    const diff = (amplified[key] ?? 0) - (original[key] ?? 0);
    if (diff !== 0) delta[key as keyof T] = diff as T[keyof T];
  }
  return delta;
}

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Calcule le modificateur chaotique pour un événement.
 *
 * Conditions pour qu'une amplification soit active :
 *  1. `actionCount >= MIN_ACTIONS_BEFORE_CHAOS` (protège le début de partie).
 *  2. `event.urgency` est "forte" ou "critique".
 *  3. Le niveau de tension est "pression", "risque" ou "explosive".
 *
 * Si les conditions ne sont pas remplies, retourne un modificateur neutre (aucun effet).
 */
export function computeChaosModifier(
  tensionLevel:        TensionLevel,
  event:               NewsEvent,
  actionCount:         number,
  resourceEffects:     Partial<StrategyResources>,
  indicatorEffects:    Partial<NationalIndicators>,
  hiddenEffects:       Partial<HiddenPolitics>,
): ChaosModifier {
  const neutral: ChaosModifier = {
    resourceDelta:    {},
    indicatorEffects: indicatorEffects,
    hiddenEffects:    hiddenEffects,
    cascadeBoost:     1.0,
    isActive:         false,
  };

  // Guard-rails — pas d'amplification si conditions non remplies
  if (actionCount < MIN_ACTIONS_BEFORE_CHAOS)      return neutral;
  if (!ELIGIBLE_URGENCIES.includes(event.urgency)) return neutral;

  const config = CHAOS_CONFIG[tensionLevel];
  if (config.negBoost === 0 && config.posReduce === 0) return neutral;

  const ampRes = amplifyPartial(resourceEffects, config);
  const ampInd = amplifyPartial(indicatorEffects, config);
  const ampHid = amplifyPartial(hiddenEffects, config);

  return {
    resourceDelta:    computeDelta(resourceEffects, ampRes),
    indicatorEffects: ampInd,
    hiddenEffects:    ampHid,
    cascadeBoost:     config.cascadeBoost,
    isActive:         true,
  };
}

// ── Avertissement UI ──────────────────────────────────────────────────────────

/**
 * Retourne le message d'avertissement à afficher dans le modal d'événement,
 * ou null si aucun avertissement n'est nécessaire.
 *
 * Affiché uniquement pour les événements forte/critique en tension risque/explosive,
 * et seulement après le début de partie (actionCount ≥ MIN_ACTIONS_BEFORE_CHAOS).
 */
export function getChaosWarning(
  tensionLevel:  TensionLevel,
  eventUrgency:  NewsEvent["urgency"],
  actionCount:   number,
): string | null {
  if (actionCount < MIN_ACTIONS_BEFORE_CHAOS)        return null;
  if (!ELIGIBLE_URGENCIES.includes(eventUrgency))    return null;
  if (tensionLevel === "stable" || tensionLevel === "pression") return null;

  return tensionLevel === "explosive"
    ? "Pays sous tension critique : les crises sont fortement amplifiées."
    : "Pays sous tension : les crises sont amplifiées.";
}
