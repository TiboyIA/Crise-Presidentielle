/**
 * Validators for game state integrity.
 * Ensures gauges, resources, and hidden gauges stay within valid ranges.
 */

import { Gauges, HiddenGauges, Resources, GaugeKey, HiddenGaugeKey, ResourceKey } from "@/types/game";

const GAUGE_MIN = 0;
const GAUGE_MAX = 100;
const HIDDEN_GAUGE_MIN = 0;
const HIDDEN_GAUGE_MAX = 100;
const RESOURCE_MIN = 0;
const RESOURCE_MAX = 10000;

/**
 * Clamp a gauge value to [0, 100].
 * @param value The value to clamp
 * @returns Clamped value
 */
export function clampGauge(value: number): number {
  return Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, value));
}

/**
 * Clamp a hidden gauge value to [0, 100].
 * @param value The value to clamp
 * @returns Clamped value
 */
export function clampHiddenGauge(value: number): number {
  return Math.max(HIDDEN_GAUGE_MIN, Math.min(HIDDEN_GAUGE_MAX, value));
}

/**
 * Clamp a resource value to [0, RESOURCE_MAX].
 * @param value The value to clamp
 * @returns Clamped value
 */
export function clampResource(value: number): number {
  return Math.max(RESOURCE_MIN, Math.min(RESOURCE_MAX, value));
}

/**
 * Validate and repair a Gauges object.
 * Returns a new object with all values clamped to [0, 100].
 * @param gauges The gauges to validate
 * @returns A valid Gauges object
 */
export function validateGauges(gauges: Gauges): Gauges {
  const validated: Gauges = { ...gauges };
  (Object.keys(validated) as GaugeKey[]).forEach((key) => {
    validated[key] = clampGauge(validated[key]);
  });
  return validated;
}

/**
 * Validate and repair a HiddenGauges object.
 * Returns a new object with all values clamped to [0, 100].
 * @param hidden The hidden gauges to validate
 * @returns A valid HiddenGauges object
 */
export function validateHiddenGauges(hidden: HiddenGauges): HiddenGauges {
  const validated: HiddenGauges = { ...hidden };
  (Object.keys(validated) as HiddenGaugeKey[]).forEach((key) => {
    validated[key] = clampHiddenGauge(validated[key]);
  });
  return validated;
}

/**
 * Validate and repair a Resources object.
 * Returns a new object with all values clamped to [0, RESOURCE_MAX].
 * @param resources The resources to validate
 * @returns A valid Resources object
 */
export function validateResources(resources: Resources): Resources {
  const validated: Resources = { ...resources };
  (Object.keys(validated) as ResourceKey[]).forEach((key) => {
    validated[key] = clampResource(validated[key]);
  });
  return validated;
}

/**
 * Check if a gauge value is within valid range.
 * @param value The value to check
 * @returns true if valid, false otherwise
 */
export function isValidGaugeValue(value: number): boolean {
  return value >= GAUGE_MIN && value <= GAUGE_MAX;
}

/**
 * Check if all gauges are valid.
 * @param gauges The gauges to check
 * @returns true if all valid, false otherwise
 */
export function areGaugesValid(gauges: Gauges): boolean {
  return (Object.keys(gauges) as GaugeKey[]).every((key) =>
    isValidGaugeValue(gauges[key]),
  );
}

/**
 * Check if all hidden gauges are valid.
 * @param hidden The hidden gauges to check
 * @returns true if all valid, false otherwise
 */
export function areHiddenGaugesValid(hidden: HiddenGauges): boolean {
  return (Object.keys(hidden) as HiddenGaugeKey[]).every((key) =>
    isValidGaugeValue(hidden[key]),
  );
}
