import { EventChoice } from "@/data/events";
import { createMinister, Minister } from "@/data/ministers";
import { Region } from "@/data/regions";
import { PlayerPromise } from "@/data/promises";
import { Gauges, HiddenGauges, HiddenGaugeKey } from "@/types/game";
import { clamp } from "@/logic/utils";

/**
 * Apply a choice's hidden-gauge effects (scandalRisk, peopleFatigue, etc.).
 * Pure function — values are clamped to [0, 100].
 */
export function applyHiddenEffects(
  hidden: HiddenGauges,
  choice: EventChoice,
): HiddenGauges {
  if (!choice.hiddenEffects) return hidden;
  const next: HiddenGauges = { ...hidden };
  for (const key of Object.keys(choice.hiddenEffects) as HiddenGaugeKey[]) {
    const delta = choice.hiddenEffects[key] ?? 0;
    next[key] = clamp(next[key] + delta);
  }
  return next;
}

/**
 * Apply a choice's gauge effects to the current gauge state.
 * Pure function — caller is responsible for further side-effects
 * (media, opposition, promise repercussions, etc.).
 */
export function applyChoice(gauges: Gauges, choice: EventChoice): Gauges {
  const next: Gauges = { ...gauges };
  for (const key of Object.keys(choice.effects) as (keyof Gauges)[]) {
    const delta = choice.effects[key] ?? 0;
    next[key] = clamp(next[key] + delta);
  }
  return next;
}

/**
 * Apply minister-level consequences from a choice (loyalty/competence/scandals,
 * or full replacement).
 */
export function applyMinisterEffects(
  ministers: Minister[],
  choice: EventChoice,
): Minister[] {
  if (!choice.ministerEffects || choice.ministerEffects.length === 0) {
    return ministers;
  }
  const next = ministers.map((m) => ({ ...m }));
  for (const eff of choice.ministerEffects) {
    const idx = next.findIndex((m) => m.position === eff.position);
    if (idx === -1) continue;
    if (eff.fire) {
      next[idx] = createMinister(eff.position);
      continue;
    }
    if (typeof eff.loyalty === "number") {
      next[idx]!.loyalty = clamp(next[idx]!.loyalty + eff.loyalty);
    }
    if (typeof eff.competence === "number") {
      next[idx]!.competence = clamp(next[idx]!.competence + eff.competence);
    }
    if (typeof eff.scandals === "number") {
      next[idx]!.scandals = Math.max(0, next[idx]!.scandals + eff.scandals);
    }
  }
  return next;
}

/**
 * Apply regional effects from a choice. Supports both the legacy
 * `tension` delta and the v0.3 per-gauge deltas (economy, security,
 * popularity, ecology, publicHealth, socialStability).
 *
 * To keep the 103 existing events meaningful for the new gauges,
 * a `tension` delta is automatically mirrored inversely onto
 * `socialStability` (high tension = lower stability).
 */
export function applyRegionEffects(
  regions: Region[],
  choice: EventChoice,
): Region[] {
  if (!choice.regionEffects || choice.regionEffects.length === 0) return regions;
  const next = regions.map((r) => ({ ...r, gauges: { ...r.gauges } }));
  for (const eff of choice.regionEffects) {
    const idx = next.findIndex((r) => r.id === eff.region);
    if (idx === -1) continue;
    const region = next[idx]!;
    if (typeof eff.tension === "number") {
      region.tension = clamp(region.tension + eff.tension);
      // Mirror tension inversely onto socialStability so legacy
      // tension-only events still move the new region gauges.
      region.gauges.socialStability = clamp(
        region.gauges.socialStability - eff.tension,
      );
    }
    if (typeof eff.economy === "number") {
      region.gauges.economy = clamp(region.gauges.economy + eff.economy);
    }
    if (typeof eff.security === "number") {
      region.gauges.security = clamp(region.gauges.security + eff.security);
    }
    if (typeof eff.popularity === "number") {
      region.gauges.popularity = clamp(region.gauges.popularity + eff.popularity);
    }
    if (typeof eff.ecology === "number") {
      region.gauges.ecology = clamp(region.gauges.ecology + eff.ecology);
    }
    if (typeof eff.publicHealth === "number") {
      region.gauges.publicHealth = clamp(
        region.gauges.publicHealth + eff.publicHealth,
      );
    }
    if (typeof eff.socialStability === "number") {
      region.gauges.socialStability = clamp(
        region.gauges.socialStability + eff.socialStability,
      );
    }
  }
  return next;
}

export interface PromiseChangeResult {
  promises: PlayerPromise[];
  fulfilled: PlayerPromise[];
  broken: PlayerPromise[];
}

/**
 * Update promise statuses based on the choice's fulfilled/broken tags.
 */
export function applyPromiseChanges(
  promises: PlayerPromise[],
  choice: EventChoice,
  turn: number,
): PromiseChangeResult {
  if (!choice.fulfillsPromise && !choice.breaksPromise) {
    return { promises, fulfilled: [], broken: [] };
  }
  const fulfilled: PlayerPromise[] = [];
  const broken: PlayerPromise[] = [];
  const next = promises.map((p) => {
    if (p.status !== "pending") return p;
    if (choice.fulfillsPromise?.includes(p.tag)) {
      const updated = { ...p, status: "fulfilled" as const, resolvedTurn: turn };
      fulfilled.push(updated);
      return updated;
    }
    if (choice.breaksPromise?.includes(p.tag)) {
      const updated = { ...p, status: "broken" as const, resolvedTurn: turn };
      broken.push(updated);
      return updated;
    }
    return p;
  });
  return { promises: next, fulfilled, broken };
}
