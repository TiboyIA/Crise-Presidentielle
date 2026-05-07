/**
 * ─── Crises en cascade ────────────────────────────────────────────
 * Pure helpers for the cascade system: scheduling new consequences
 * from a freshly-resolved choice, and firing the ones whose
 * `triggerTurn` has come due.
 *
 * Kept as a pure module — never reads/writes the GameContext, never
 * touches React. The provider in `context/GameContext.tsx`
 * orchestrates the immutable updates by chaining these helpers.
 */
import type {
  CascadeStep,
  DecisionLogEntry,
  DelayedEvent,
  Gauges,
  HiddenGauges,
  ScheduledConsequence,
} from "@/types/game";
import type { EventChoice } from "@/data/events";
import { clamp } from "@/logic/utils";

let _cascadeIdCounter = 0;
function newCascadeId(): string {
  _cascadeIdCounter += 1;
  return `c_${Date.now()}_${_cascadeIdCounter}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function newLogId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build the new ScheduledConsequence entries for a choice's cascade,
 * if any. Pure — does not mutate the input array. Steps with delay
 * <= 0 are silently dropped (cascades MUST be in the future).
 */
export function scheduleCascadeFromChoice(
  existing: ScheduledConsequence[],
  choice: EventChoice,
  resolveTurn: number,
  eventTitle: string,
): ScheduledConsequence[] {
  if (!choice.cascade || choice.cascade.length === 0) return existing;
  const additions: ScheduledConsequence[] = [];
  for (const step of choice.cascade) {
    if (!step || typeof step.delay !== "number" || step.delay < 1) continue;
    additions.push({
      id: newCascadeId(),
      triggerTurn: resolveTurn + step.delay,
      sourceTurn: resolveTurn,
      sourceEventTitle: eventTitle,
      sourceChoiceLabel: choice.label,
      step,
    });
  }
  if (additions.length === 0) return existing;
  return [...existing, ...additions];
}

export interface CascadeFireInput {
  scheduled: ScheduledConsequence[];
  currentTurn: number;
  gauges: Gauges;
  hiddenGauges: HiddenGauges;
  media: number;
  opposition: number;
  delayedEvents: DelayedEvent[];
  /**
   * Set of valid event IDs. Cascade "event" steps that point to an
   * unknown ID are silently downgraded to a notice so the chain
   * doesn't poison the delayed queue. Pass a `Set` for O(1) lookup;
   * pass `null` to skip validation.
   */
  validEventIds?: Set<string> | null;
}

export interface CascadeFireResult {
  /** scheduled minus fired entries. */
  scheduled: ScheduledConsequence[];
  gauges: Gauges;
  hiddenGauges: HiddenGauges;
  media: number;
  opposition: number;
  /** delayedEvents augmented with any cascade "event" steps. */
  delayedEvents: DelayedEvent[];
  /** One log entry per fired step, in firing order. */
  logEntries: DecisionLogEntry[];
}

/**
 * Fire any cascade step whose `triggerTurn <= currentTurn`. Each
 * fired step produces:
 *   - a log entry attributed to the original choice
 *   - for "gauge"  steps: gauge / hidden / media / opposition deltas
 *   - for "event"  steps: a new delayedEvent
 *   - for "notice" steps: only the log entry
 *
 * Pure — returns fresh objects, no mutation.
 */
export function fireDueConsequences(input: CascadeFireInput): CascadeFireResult {
  const due: ScheduledConsequence[] = [];
  const remaining: ScheduledConsequence[] = [];
  for (const s of input.scheduled) {
    if (s.triggerTurn <= input.currentTurn) due.push(s);
    else remaining.push(s);
  }
  if (due.length === 0) {
    return {
      scheduled: input.scheduled,
      gauges: input.gauges,
      hiddenGauges: input.hiddenGauges,
      media: input.media,
      opposition: input.opposition,
      delayedEvents: input.delayedEvents,
      logEntries: [],
    };
  }

  // Fire in chronological order, ties broken by id for determinism.
  due.sort((a, b) => a.triggerTurn - b.triggerTurn);

  let gauges = { ...input.gauges };
  let hidden = { ...input.hiddenGauges };
  let media = input.media;
  let opposition = input.opposition;
  const delayed = [...input.delayedEvents];
  const logEntries: DecisionLogEntry[] = [];

  for (const sc of due) {
    const step: CascadeStep = sc.step;
    const flatEffects: Partial<Gauges> = {};
    let consequenceText = step.label;

    if (step.kind === "gauge") {
      // Apply numeric deltas. We collect the applied deltas into
      // `flatEffects` so the log entry shows what actually moved.
      if (step.effects) {
        for (const [k, v] of Object.entries(step.effects)) {
          if (typeof v !== "number") continue;
          const key = k as keyof Gauges;
          gauges[key] = clamp(gauges[key] + v);
          flatEffects[key] = v;
        }
      }
      if (step.hiddenEffects) {
        for (const [k, v] of Object.entries(step.hiddenEffects)) {
          if (typeof v !== "number") continue;
          const key = k as keyof HiddenGauges;
          hidden[key] = clamp(hidden[key] + v);
        }
      }
      if (typeof step.mediaEffect === "number") {
        media = clamp(media + step.mediaEffect);
      }
      if (typeof step.oppositionEffect === "number") {
        opposition = clamp(opposition + step.oppositionEffect);
      }
    } else if (step.kind === "event") {
      // Event cascades schedule a follow-up draw. We fire on the
      // CURRENT turn so the next drawNextEvent picks it up
      // immediately (the cascade has already "ripened").
      //
      // Two safety rails (added after architect review):
      //   1. Validate the eventId exists. An unknown eventId would
      //      poison the delayed queue and starve other delayed
      //      events from firing.
      //   2. Dedupe against existing delayed entries pointing at
      //      the same eventId. If the same event is already queued
      //      (whether from a prior cascade or `schedulesEvent`),
      //      we don't pile up a duplicate — the player would just
      //      see the same crisis twice in a row.
      const idIsValid =
        !input.validEventIds || input.validEventIds.has(step.eventId);
      const alreadyQueued = delayed.some((d) => d.eventId === step.eventId);
      if (idIsValid && !alreadyQueued) {
        delayed.push({ eventId: step.eventId, triggerTurn: input.currentTurn });
        consequenceText = `${step.label} — un nouvel événement va frapper.`;
      } else if (alreadyQueued) {
        consequenceText = `${step.label} — la crise prévue se confirme.`;
      } else {
        // Unknown eventId — degrade gracefully to a notice so the
        // narrative beat still hits the journal.
        consequenceText = step.label;
      }
    }
    // "notice" steps: nothing numerical, just the log entry.

    logEntries.push({
      id: newLogId(),
      turn: input.currentTurn,
      eventTitle: "⛓️ Cascade",
      choiceLabel: step.label,
      consequence: consequenceText,
      effects: flatEffects,
      timestamp: Date.now(),
      isDelayedConsequence: true,
      cascadeSource: {
        sourceTurn: sc.sourceTurn,
        sourceChoiceLabel: sc.sourceChoiceLabel,
        sourceEventTitle: sc.sourceEventTitle,
      },
    });
  }

  return {
    scheduled: remaining,
    gauges,
    hiddenGauges: hidden,
    media,
    opposition,
    delayedEvents: delayed,
    logEntries,
  };
}

/**
 * Sort scheduled consequences for player-facing display: nearest
 * trigger first.
 */
export function sortScheduledForDisplay(
  scheduled: ScheduledConsequence[],
): ScheduledConsequence[] {
  return [...scheduled].sort((a, b) => a.triggerTurn - b.triggerTurn);
}
