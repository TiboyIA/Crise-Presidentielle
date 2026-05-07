/**
 * Decision history tracking.
 * Provides a clear audit trail of all player choices and their consequences.
 */

import { PromiseTag } from "@/data/promises";
import { Gauges, HiddenGauges, Resources } from "@/types/game";

/**
 * Impact of a decision on various game aspects.
 */
export interface DecisionImpact {
  gaugeChanges: Partial<Gauges>;
  hiddenGaugeChanges: Partial<HiddenGauges>;
  resourceChanges?: Partial<Resources>;
  promiseFulfilled?: string[];
  promiseBroken?: string[];
  ministersFired?: string[];
  eventsTriggered?: string[];
}

/**
 * A single decision log entry.
 */
export interface HistoryEntry {
  id?: string;
  turn: number;
  timestamp: number; // Unix milliseconds
  eventId?: string;
  eventTitle: string;
  choiceIndex?: number;
  choiceText?: string;
  choiceLabel?: string;
  consequence?: string;
  effects?: Partial<Gauges>;
  impact?: DecisionImpact;
  promisesFulfilled?: PromiseTag[];
  promisesBroken?: PromiseTag[];
  isDelayedConsequence?: boolean;
}

/**
 * Game history manager.
 */
export class GameHistory {
  private entries: HistoryEntry[] = [];

  /**
   * Add a decision entry to the history.
   */
  addEntry(entry: HistoryEntry): void {
    this.entries.push(entry);
  }

  /**
   * Get all history entries.
   */
  getEntries(): HistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Get the last N entries.
   */
  getRecentEntries(count: number): HistoryEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get entries for a specific turn.
   */
  getEntriesForTurn(turn: number): HistoryEntry[] {
    return this.entries.filter((e) => e.turn === turn);
  }

  /**
   * Get entries for a specific event.
   */
  getEntriesForEvent(eventId: string): HistoryEntry[] {
    return this.entries.filter((e) => e.eventId === eventId);
  }

  /**
   * Clear history.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get total number of entries.
   */
  getCount(): number {
    return this.entries.length;
  }

  /**
   * Export history as JSON.
   */
  toJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Import history from JSON.
   */
  static fromJSON(json: string): GameHistory {
    const history = new GameHistory();
    try {
      const entries = JSON.parse(json) as HistoryEntry[];
      entries.forEach((e) => history.addEntry(e));
    } catch (error) {
      console.error("Failed to import history from JSON", error);
    }
    return history;
  }
}

/**
 * Helper to calculate delta between two gauge objects.
 */
export function calculateGaugeDelta(
  before: Gauges,
  after: Gauges,
): Partial<Gauges> {
  const delta: Partial<Gauges> = {};
  (Object.keys(before) as (keyof Gauges)[]).forEach((key) => {
    const change = after[key] - before[key];
    if (change !== 0) {
      delta[key] = change;
    }
  });
  return delta;
}

/**
 * Helper to calculate delta between two hidden gauge objects.
 */
export function calculateHiddenGaugeDelta(
  before: HiddenGauges,
  after: HiddenGauges,
): Partial<HiddenGauges> {
  const delta: Partial<HiddenGauges> = {};
  (Object.keys(before) as (keyof HiddenGauges)[]).forEach((key) => {
    const change = after[key] - before[key];
    if (change !== 0) {
      delta[key] = change;
    }
  });
  return delta;
}
