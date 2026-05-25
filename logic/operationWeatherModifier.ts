import type { WeatherTypeId } from "@/data/weatherEvents";
import type { OperationType } from "@/types/strategy";

export type WeatherCondition = "favorable" | "neutre" | "defavorable";

export interface OperationWeatherModifier {
  modifier: number;         // delta probabilité : -0.15 à +0.10
  condition: WeatherCondition;
  label: string;
}

// ── Catégories d'opérations ───────────────────────────────────────────────────

type OpDomain = "covert" | "cyber" | "diplomacy" | "military";

const OP_DOMAINS: Record<OperationType, OpDomain> = {
  espionage:          "covert",
  steal_intel:        "covert",
  cyber_attack:       "cyber",
  influence_campaign: "diplomacy",
  sabotage:           "covert",
  sanction:           "diplomacy",
  sign_treaty:        "diplomacy",
  diplomatic_aid:     "diplomacy",
  reinforce_cyber:    "cyber",
  military_operation: "military",
};

// ── Effets météo par domaine ──────────────────────────────────────────────────
// Contraintes : min -0.15 / max +0.10

interface WeatherEffect {
  covert?:    number;
  cyber?:     number;
  military?:  number;
  diplomacy?: number;
  label: Partial<Record<OpDomain, string>>;
}

const WEATHER_EFFECTS: Record<WeatherTypeId, WeatherEffect> = {
  canicule: {
    military: -0.08,
    covert:   -0.05,
    label: {
      military: "Canicule : mobilité terrestre réduite",
      covert:   "Canicule : opérations extérieures difficiles",
    },
  },
  vague_de_froid: {
    military: -0.10,
    covert:   -0.05,
    cyber:    -0.05,
    label: {
      military: "Froid extrême : mobilité fortement réduite",
      covert:   "Froid extrême : infiltration compromise",
      cyber:    "Froid extrême : infrastructures numériques fragiles",
    },
  },
  tempete: {
    military: -0.15,
    covert:   -0.08,
    label: {
      military: "Tempête : aviation et marine entravées",
      covert:   "Tempête : opérations extérieures risquées",
    },
  },
  pluies_intenses: {
    military: -0.05,
    label: {
      military: "Pluies : logistique militaire dégradée",
    },
  },
  secheresse: {
    military: +0.07,
    label: {
      military: "Ciel dégagé : aviation et drones favorisés",
    },
  },
  brouillard_dense: {
    covert:   +0.08,
    military: -0.10,
    label: {
      covert:   "Brouillard : couverture idéale pour opérations discrètes",
      military: "Brouillard : aviation fortement réduite",
    },
  },
  vents_violents: {
    military: -0.12,
    label: {
      military: "Vents violents : aviation et drones neutralisés",
    },
  },
  orage_electrique: {
    cyber: +0.10,
    label: {
      cyber: "Orage électrique : infrastructures adverses vulnérables",
    },
  },
  episode_mediterraneen: {
    military: +0.05,
    label: {
      military: "Ciel méditerranéen : conditions favorables aux opérations aériennes",
    },
  },
  neige_exceptionnelle: {
    military: -0.15,
    covert:   -0.10,
    label: {
      military: "Neige : logistique et mobilité paralysées",
      covert:   "Neige : opérations extérieures fortement compromises",
    },
  },
};

// ── Modificateur par opération ────────────────────────────────────────────────

export function getOperationWeatherModifier(
  weatherTypeId: WeatherTypeId,
  operationType: OperationType,
): OperationWeatherModifier {
  // Orage électrique : renforcement cyber plus difficile (défenses en surcharge)
  if (weatherTypeId === "orage_electrique" && operationType === "reinforce_cyber") {
    return {
      modifier: -0.08,
      condition: "defavorable",
      label: "Orage électrique : défenses cyber difficiles à consolider",
    };
  }

  const domain = OP_DOMAINS[operationType];
  const effect = WEATHER_EFFECTS[weatherTypeId];
  const raw = (effect[domain as keyof Omit<WeatherEffect, "label">] as number | undefined) ?? 0;
  const modifier = Math.max(-0.15, Math.min(0.10, raw));
  const condition: WeatherCondition =
    modifier > 0.02 ? "favorable" : modifier < -0.02 ? "defavorable" : "neutre";
  const label = effect.label[domain] ?? "Conditions neutres pour cette opération";

  return { modifier, condition, label };
}

// ── Condition globale (bandeau résumé) ────────────────────────────────────────

export interface GlobalWeatherCondition {
  condition: WeatherCondition;
  summary: string;
}

const ALL_OP_TYPES: OperationType[] = [
  "espionage", "steal_intel", "cyber_attack", "influence_campaign",
  "sabotage", "sanction", "sign_treaty", "diplomatic_aid",
  "reinforce_cyber", "military_operation",
];

const GLOBAL_SUMMARIES: Record<WeatherTypeId, string> = {
  canicule:              "Canicule — mobilité terrestre et opérations extérieures dégradées",
  vague_de_froid:        "Froid extrême — mobilité et cybersécurité fragilisées",
  tempete:               "Tempête — aviation et marine fortement entravées",
  pluies_intenses:       "Pluies intenses — logistique militaire réduite",
  secheresse:            "Ciel dégagé — conditions favorables à l'aviation et aux drones",
  brouillard_dense:      "Brouillard dense — couverture pour opérations discrètes, aviation réduite",
  vents_violents:        "Vents violents — aviation et drones neutralisés",
  orage_electrique:      "Orage électrique — cyber adverses vulnérables, défenses fragilisées",
  episode_mediterraneen: "Ciel méditerranéen — légèrement favorable aux opérations aériennes",
  neige_exceptionnelle:  "Neige exceptionnelle — mobilité et logistique paralysées",
};

export function getGlobalWeatherCondition(weatherTypeId: WeatherTypeId): GlobalWeatherCondition {
  const modifiers = ALL_OP_TYPES.map(
    (op) => getOperationWeatherModifier(weatherTypeId, op).modifier,
  );
  const avg = modifiers.reduce((s, m) => s + m, 0) / modifiers.length;
  const condition: WeatherCondition =
    avg > 0.01 ? "favorable" : avg < -0.01 ? "defavorable" : "neutre";
  return { condition, summary: GLOBAL_SUMMARIES[weatherTypeId] };
}
