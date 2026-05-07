import type { DelayedEvent } from "@/types/game";

/**
 * Chantier 1 — Cascades sociales déterministes.
 *
 * From the deltas between the previous and post-choice gauges, decide
 * whether to schedule a follow-up "cascade" event in 1-2 turns. Pure
 * function: caller supplies prev/new snapshots, we return the delayed
 * events to push.
 *
 * Cascade events live in `data/events.ts` under DELAYED_EVENTS — they
 * are NEVER picked by the random catalog, only triggered here.
 */

export interface CascadeContext {
  prevPopularity: number;
  newPopularity: number;
  newCohesion: number;
  prevAvgRegionTension: number;
  newAvgRegionTension: number;
  promisesBrokenCount: number;
  /** Pre-increment turn (the turn the player just played). */
  turn: number;
  /** ids already pending in delayedEvents — used for dedup. */
  alreadyScheduled: ReadonlySet<string>;
}

export interface CascadeResult {
  newDelayedEvents: DelayedEvent[];
  /** Short FR notes that the caller can log for tooling/debug. */
  notes: string[];
}

export const CASCADE_EVENT_IDS = [
  "ev_cascade_protests",
  "ev_cascade_demonstration",
  "ev_cascade_communautaire",
  "ev_cascade_motion_censure",
  "ev_cascade_emeutes_regions",
] as const;

export type CascadeEventId = (typeof CASCADE_EVENT_IDS)[number];

export function computeSocialCascade(ctx: CascadeContext): CascadeResult {
  const out: DelayedEvent[] = [];
  const notes: string[] = [];
  const seen = new Set(ctx.alreadyScheduled);

  const trigger = (eventId: CascadeEventId, delay: number, note: string) => {
    if (seen.has(eventId)) return;
    seen.add(eventId);
    out.push({ eventId, triggerTurn: ctx.turn + delay });
    notes.push(note);
  };

  const popDrop = ctx.prevPopularity - ctx.newPopularity;
  if (popDrop >= 15) {
    trigger(
      "ev_cascade_protests",
      1,
      "Effondrement de popularité — manifestations imminentes",
    );
  }
  if (ctx.newPopularity <= 25) {
    trigger(
      "ev_cascade_demonstration",
      2,
      "Popularité critique — mobilisation populaire",
    );
  }
  if (ctx.newCohesion <= 25) {
    trigger(
      "ev_cascade_communautaire",
      2,
      "Cohésion fracturée — tensions communautaires",
    );
  }
  if (ctx.promisesBrokenCount >= 2) {
    trigger(
      "ev_cascade_motion_censure",
      1,
      "Promesses trahies — motion de censure",
    );
  }
  const tensionJump =
    ctx.newAvgRegionTension - ctx.prevAvgRegionTension;
  if (ctx.newAvgRegionTension > 70 || tensionJump >= 12) {
    trigger(
      "ev_cascade_emeutes_regions",
      1,
      "Régions sous tension — risque émeutier",
    );
  }
  return { newDelayedEvents: out, notes };
}
