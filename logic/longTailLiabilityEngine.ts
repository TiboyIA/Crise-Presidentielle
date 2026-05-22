// ── Passifs Longue Traîne ─────────────────────────────────────────────────────
// Certaines décisions de crise génèrent des coûts récurrents différés.
// Le coût augmente légèrement à chaque période si le passif n'est pas traité.
// Une réforme ciblée peut liquider le passif correspondant.

import type { LiabilityCategory, LiabilityDefId, LongTailLiability } from "@/types/strategy";
import type { ReformId } from "@/types/strategy";

// ── Définitions statiques ─────────────────────────────────────────────────────

interface LiabilityDef {
  id:              LiabilityDefId;
  label:           string;
  category:        LiabilityCategory;
  description:     string;
  baseCost:        number;   // M€ prélevés tous les 10 jours de mandat
  riskGrowth:      number;   // % de croissance par période non traitée
  reducedByReform: ReformId; // réforme qui liquide ce passif
  color:           string;
}

export const LIABILITY_DEFS: Record<LiabilityDefId, LiabilityDef> = {
  fiscal_opacity: {
    id: "fiscal_opacity",
    label: "Opacité fiscale",
    category: "dette_cachee",
    description: "Emprunt exceptionnel non consolidé — les intérêts s'accumulent silencieusement.",
    baseCost: 30,
    riskGrowth: 8,
    reducedByReform: "fiscal",
    color: "#e54848",
  },
  infrastructure_neglect: {
    id: "infrastructure_neglect",
    label: "Infrastructures dégradées",
    category: "infrastructure",
    description: "Investissements repoussés — le parc se détériore à un rythme croissant.",
    baseCost: 20,
    riskGrowth: 5,
    reducedByReform: "industrie",
    color: "#FF8040",
  },
  social_fracture: {
    id: "social_fracture",
    label: "Fracture sociale latente",
    category: "social",
    description: "Répression sans dialogue — les tensions restent actives et coûteuses à contenir.",
    baseCost: 15,
    riskGrowth: 6,
    reducedByReform: "sociale",
    color: "#a78bfa",
  },
  cyber_dependency: {
    id: "cyber_dependency",
    label: "Dépendance cyber privée",
    category: "cyber",
    description: "Prestataires privés — la dépendance croît et les failles restent ouvertes.",
    baseCost: 25,
    riskGrowth: 10,
    reducedByReform: "cyber",
    color: "#4a9fff",
  },
  energy_vulnerability: {
    id: "energy_vulnerability",
    label: "Vulnérabilité énergétique",
    category: "energie",
    description: "Cession sous pression — la dépendance à l'énergie extérieure s'accentue.",
    baseCost: 35,
    riskGrowth: 12,
    reducedByReform: "energie",
    color: "#e8a93a",
  },
};

// ── Déclencheurs : événement + choix → passif ─────────────────────────────────

const TRIGGER_MAP: Partial<Record<string, Partial<Record<string, LiabilityDefId>>>> = {
  "debt_crisis":             { "borrow_more":   "fiscal_opacity" },
  "housing_crisis":          { "tax_incentive": "infrastructure_neglect" },
  "social_unrest":           { "firm_stance":   "social_fracture" },
  "cyber_power_grid":        { "hire_private":  "cyber_dependency" },
  "energy_blackmail_crisis": { "energy_yield":  "energy_vulnerability" },
};

// ── Labels et couleurs pour l'affichage ──────────────────────────────────────

export const LIABILITY_CATEGORY_LABELS: Record<LiabilityCategory, string> = {
  dette_cachee:   "Dette cachée",
  infrastructure: "Infrastructure",
  sante:          "Santé",
  cyber:          "Cyber",
  energie:        "Énergie",
  social:         "Social",
  diplomatie:     "Diplomatie",
};

export function getLiabilityColor(defId: LiabilityDefId): string {
  return LIABILITY_DEFS[defId].color;
}

export function getLiabilityLabel(defId: LiabilityDefId): string {
  return LIABILITY_DEFS[defId].label;
}

// ── Logique principale ────────────────────────────────────────────────────────

/**
 * Vérifie si ce couple événement/choix crée un passif.
 * Retourne null si déjà présent (un seul passif par template).
 */
export function checkLiabilityTrigger(
  eventId:      string,
  choiceId:     string,
  existing:     LongTailLiability[],
  mandateDay:   number,
  actionCount:  number,
): LongTailLiability | null {
  const defId = TRIGGER_MAP[eventId]?.[choiceId];
  if (!defId) return null;
  if (existing.some((l) => l.defId === defId)) return null;

  const def = LIABILITY_DEFS[defId];
  return {
    id: `${defId}_${mandateDay}`,
    defId,
    sourceDecision: `${eventId}/${choiceId}`,
    category: def.category,
    annualCost: def.baseCost,
    initialCost: def.baseCost,
    riskGrowth: def.riskGrowth,
    triggerAfterActions: actionCount + 20, // se manifeste après 20 actions
    createdAtDay: mandateDay,
    description: def.description,
  };
}

/**
 * Applique le prélèvement périodique et fait croître les passifs actifs.
 * Appelé tous les 10 jours de mandat.
 */
export function applyLiabilityPeriod(
  liabilities:  LongTailLiability[],
  money:        number,
  actionCount:  number,
): { money: number; liabilities: LongTailLiability[]; totalDeducted: number } {
  let totalDeducted = 0;

  const updated = liabilities.map((l) => {
    if (actionCount < l.triggerAfterActions) return l;

    totalDeducted += l.annualCost;

    // Croissance plafonnée à 3× la valeur initiale
    const grown = Math.min(
      l.initialCost * 3,
      Math.round(l.annualCost * (1 + l.riskGrowth / 100)),
    );
    return { ...l, annualCost: grown };
  });

  return {
    money: Math.max(0, money - totalDeducted),
    liabilities: updated,
    totalDeducted,
  };
}

/**
 * Supprime les passifs couverts par la réforme qui vient de s'appliquer.
 */
export function reduceLiabilitiesByReform(
  liabilities: LongTailLiability[],
  reformId:    ReformId,
): LongTailLiability[] {
  return liabilities.filter((l) => LIABILITY_DEFS[l.defId].reducedByReform !== reformId);
}

/** Exposition totale actuelle (somme des annualCost actifs). */
export function computeTotalExposure(
  liabilities:  LongTailLiability[],
  actionCount:  number,
): number {
  return liabilities
    .filter((l) => actionCount >= l.triggerAfterActions)
    .reduce((sum, l) => sum + l.annualCost, 0);
}
