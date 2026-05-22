import type {
  HiddenPolitics,
  InsuranceProductId,
  NationalIndicators,
  StrategyGameState,
} from "@/types/strategy";

// ── Types publics ─────────────────────────────────────────────────────────────

export type CostSharingStrategyId =
  | "etat"         // État prend tout en charge
  | "assurance"    // Couverture assurantielle validée
  | "regions"      // Contribution des collectivités
  | "entreprises"  // Contribution des entreprises
  | "emprunt";     // Emprunt exceptionnel d'urgence

export interface CostSharingOutcome {
  strategyId:           CostSharingStrategyId;
  label:                string;
  description:          string;
  moneyRecovered:       number;            // M€ ajoutés aux ressources
  debtAdded:            number;            // M€ ajoutés à la dette souveraine
  indicatorEffects:     Partial<NationalIndicators>;
  hiddenPoliticsEffects:Partial<HiddenPolitics>;
}

// ── Événements éligibles (3 crises majeures compatibles) ─────────────────────

export const COST_SHARING_ELIGIBLE_EVENTS = new Set([
  "blackout_national",    // Panne électrique nationale — secteur énergie
  "ecological_disaster",  // Catastrophe écologique — secteur climat
  "industrial_disaster",  // Accident industriel majeur — secteur industrie
]);

// Produit d'assurance pertinent pour chaque événement éligible
const EVENT_INSURANCE_MAP: Partial<Record<string, InsuranceProductId>> = {
  "blackout_national":   "energie",
  "ecological_disaster": "climat",
  "industrial_disaster": "industrie",
};

// En dessous de ce seuil (M€ couverts), le partage ne se déclenche pas
const MIN_UNCOVERED = 50;

// ── Labels et icônes ──────────────────────────────────────────────────────────

export const COST_SHARING_LABELS: Record<CostSharingStrategyId, string> = {
  etat:        "Prise en charge étatique",
  assurance:   "Couverture assurantielle",
  regions:     "Contribution des collectivités",
  entreprises: "Contribution des entreprises",
  emprunt:     "Emprunt exceptionnel",
};

export const COST_SHARING_ICONS: Record<CostSharingStrategyId, string> = {
  etat:        "🏛",
  assurance:   "🛡️",
  regions:     "🗺️",
  entreprises: "🏭",
  emprunt:     "📋",
};

// ── Sélection automatique de la stratégie ─────────────────────────────────────
// Basée sur l'état du jeu : assurance d'abord, puis capacité économique/sociale/financière.

function selectStrategy(
  state: StrategyGameState,
  eventId: string,
  uncoveredCost: number,
): CostSharingStrategyId {
  const productId = EVENT_INSURANCE_MAP[eventId];
  const insuranceActive = productId
    ? (state.insurancePolicies ?? []).some((p) => p.productId === productId && p.active)
    : false;

  // Si assurance active pour cet événement : le cadre assurantiel est valorisé politiquement
  if (insuranceActive) return "assurance";

  const { economy, cohesion } = state.nationalIndicators;
  const debt = state.nationalDebt ?? 0;

  // Économie solide + coût élevé → faire contribuer les entreprises
  if (economy >= 60 && uncoveredCost >= 150) return "entreprises";
  // Cohésion forte → mutualisation via les collectivités
  if (cohesion >= 58 && uncoveredCost >= 80) return "regions";
  // Marge d'endettement disponible → emprunt d'urgence
  if (debt < 380) return "emprunt";
  // Fallback : État seul absorbe le coût résiduel
  return "etat";
}

// ── Calcul des effets par stratégie ──────────────────────────────────────────

function buildOutcome(strategyId: CostSharingStrategyId, uncoveredCost: number): CostSharingOutcome {
  const label = COST_SHARING_LABELS[strategyId];

  switch (strategyId) {
    case "etat":
      return {
        strategyId, label,
        description: "L'État absorbe intégralement le coût résiduel. Geste de solidarité nationale.",
        moneyRecovered: 0,
        debtAdded: 0,
        indicatorEffects: { popularity: 4 },
        hiddenPoliticsEffects: { mediaMood: 6, institutionalStability: 3 },
      };

    case "assurance":
      return {
        strategyId, label,
        description: "La couverture assurantielle valide l'anticipation gouvernementale.",
        moneyRecovered: 0,
        debtAdded: 0,
        indicatorEffects: { popularity: 2 },
        hiddenPoliticsEffects: { eliteTrust: 6, mediaMood: 5 },
      };

    case "regions": {
      const recovered = Math.round(uncoveredCost * 0.25);
      return {
        strategyId, label,
        description: `Les collectivités contribuent à hauteur de ${recovered} M€. Tension territoriale accrue.`,
        moneyRecovered: recovered,
        debtAdded: 0,
        indicatorEffects: { cohesion: -6 },
        hiddenPoliticsEffects: { regionalTension: 10, eliteTrust: 2 },
      };
    }

    case "entreprises": {
      const recovered = Math.round(uncoveredCost * 0.30);
      return {
        strategyId, label,
        description: `Les entreprises sont mises à contribution pour ${recovered} M€. Tensions économiques à surveiller.`,
        moneyRecovered: recovered,
        debtAdded: 0,
        indicatorEffects: { economy: -4 },
        hiddenPoliticsEffects: { eliteTrust: -5, scandalRisk: 4 },
      };
    }

    case "emprunt": {
      const recovered = Math.round(uncoveredCost * 0.55);
      const debtAdded = Math.round(recovered * 1.12);
      return {
        strategyId, label,
        description: `Emprunt d'urgence : +${recovered} M€ mobilisés, +${debtAdded} M€ de dette souveraine.`,
        moneyRecovered: recovered,
        debtAdded,
        indicatorEffects: {},
        hiddenPoliticsEffects: { eliteTrust: -3 },
      };
    }
  }
}

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Déclenche le partage de coût si l'événement est éligible et le coût résiduel suffisant.
 * uncoveredCost = abs(moneyCost from choice) − (resiliencePayout + insurancePayout + catBondAbsorbed).
 */
export function computeCostSharing(
  state: StrategyGameState,
  eventId: string,
  uncoveredCost: number,
): CostSharingOutcome | null {
  if (!COST_SHARING_ELIGIBLE_EVENTS.has(eventId)) return null;
  if (uncoveredCost < MIN_UNCOVERED) return null;

  const strategyId = selectStrategy(state, eventId, uncoveredCost);
  return buildOutcome(strategyId, uncoveredCost);
}
