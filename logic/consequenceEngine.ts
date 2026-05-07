/**
 * Consequence engine for handling decision effects.
 * Provides a centralized, structured approach to applying consequences
 * to gauges, hidden gauges, resources, ministers, regions, and opposition.
 */

import { EventChoice } from "@/data/events";
import { Gauges, HiddenGauges, Resources } from "@/types/game";
import {
  validateGauges,
  validateHiddenGauges,
  validateResources,
} from "@/logic/validators";

/**
 * Structured consequence with immediate, delayed, regional, and other effects.
 */
export interface StructuredConsequence {
  /** Immediate gauge changes. */
  immediateGaugeChanges: Partial<Gauges>;
  /** Immediate hidden gauge changes. */
  immediateHiddenGaugeChanges: Partial<HiddenGauges>;
  /** Immediate resource changes. */
  immediateResourceChanges: Partial<Resources>;
  /** Delayed effects to apply after N turns. */
  delayedEffects?: {
    turns: number;
    gaugeChanges: Partial<Gauges>;
    hiddenGaugeChanges: Partial<HiddenGauges>;
    description: string;
  }[];
  /** Regional effects. */
  regionalEffects?: {
    regionId: string;
    changes: Partial<any>;
  }[];
  /** Minister effects. */
  ministerEffects?: {
    position: string;
    changes: Partial<any>;
  }[];
  /** Opposition effects. */
  oppositionEffects?: {
    changes: Partial<any>;
  }[];
}

/**
 * Apply immediate gauge consequences from a choice.
 * Pure function — validates output.
 */
export function applyImmediateGaugeConsequences(
  gauges: Gauges,
  changes: Partial<Gauges>,
): Gauges {
  const next = { ...gauges };
  (Object.keys(changes) as (keyof Gauges)[]).forEach((key) => {
    const delta = changes[key] ?? 0;
    next[key] = (next[key] ?? 0) + delta;
  });
  return validateGauges(next);
}

/**
 * Apply immediate hidden gauge consequences from a choice.
 * Pure function — validates output.
 */
export function applyImmediateHiddenGaugeConsequences(
  hidden: HiddenGauges,
  changes: Partial<HiddenGauges>,
): HiddenGauges {
  const next = { ...hidden };
  (Object.keys(changes) as (keyof HiddenGauges)[]).forEach((key) => {
    const delta = changes[key] ?? 0;
    next[key] = (next[key] ?? 0) + delta;
  });
  return validateHiddenGauges(next);
}

/**
 * Apply immediate resource consequences from a choice.
 * Pure function — validates output.
 */
export function applyImmediateResourceConsequences(
  resources: Resources,
  changes: Partial<Resources>,
): Resources {
  const next = { ...resources };
  (Object.keys(changes) as (keyof Resources)[]).forEach((key) => {
    const delta = changes[key] ?? 0;
    next[key] = (next[key] ?? 0) + delta;
  });
  return validateResources(next);
}

/**
 * Convert a legacy EventChoice to a StructuredConsequence.
 * This enables gradual migration without breaking existing logic.
 */
export function eventChoiceToConsequence(choice: EventChoice): StructuredConsequence {
  return {
    immediateGaugeChanges: choice.effects ?? {},
    immediateHiddenGaugeChanges: choice.hiddenEffects ?? {},
    immediateResourceChanges: {},
  };
}

/**
 * Merge multiple structured consequences into one.
 * Useful for combining choice effects with event cascades, etc.
 */
export function mergeConsequences(
  consequences: StructuredConsequence[],
): StructuredConsequence {
  const merged: StructuredConsequence = {
    immediateGaugeChanges: {},
    immediateHiddenGaugeChanges: {},
    immediateResourceChanges: {},
    delayedEffects: [],
    regionalEffects: [],
    ministerEffects: [],
    oppositionEffects: [],
  };

  consequences.forEach((c) => {
    // Merge immediate gauge changes
    Object.assign(merged.immediateGaugeChanges, c.immediateGaugeChanges);

    // Merge immediate hidden gauge changes
    Object.assign(merged.immediateHiddenGaugeChanges, c.immediateHiddenGaugeChanges);

    // Merge immediate resource changes
    Object.assign(merged.immediateResourceChanges, c.immediateResourceChanges);

    // Merge delayed effects
    if (c.delayedEffects) {
      merged.delayedEffects?.push(...c.delayedEffects);
    }

    // Merge regional effects
    if (c.regionalEffects) {
      merged.regionalEffects?.push(...c.regionalEffects);
    }

    // Merge minister effects
    if (c.ministerEffects) {
      merged.ministerEffects?.push(...c.ministerEffects);
    }

    // Merge opposition effects
    if (c.oppositionEffects) {
      merged.oppositionEffects?.push(...c.oppositionEffects);
    }
  });

  return merged;
}
