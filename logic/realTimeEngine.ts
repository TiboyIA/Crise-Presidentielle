// Real-time engine — drives the mandateDay progression based on wall-clock time.
//
// Design rule: 1 mandate day = 24 real hours.
// All player actions are time-neutral; only the passage of real time advances
// the mandate. The engine caps offline accumulation to avoid event avalanches
// when a player returns after a long absence.

import type { StrategyGameState } from "@/types/strategy";

export const REALTIME_CONFIG = {
  /** Real minutes that map to a single mandate day (1440 = 24 h). */
  realMinutesPerMandateDay: 1440,
  /** Cap on offline accumulation in minutes. Anything beyond is dropped. */
  maxOfflineMinutes: 24 * 60,
  /** Tick cadence on the foreground client. */
  tickIntervalMs: 60 * 1000,
  /** Cadence of strategic events (in mandate days). */
  pollEveryMandateDays: 10,
  majorCrisisEveryMandateDays: 25,
  bilanEveryMandateDays: 100,
  /**
   * Tolerance against tiny clock skew (e.g. NTP corrections going slightly
   * backwards). Below this delta we silently keep the previous lastKnownTime
   * without flagging cheating.
   */
  clockSkewToleranceMs: 5 * 60 * 1000, // 5 min
} as const;

export interface RealTimeState {
  /** Wall clock time at the last successful tick. */
  lastTickAt: number;
  /** Real minutes accumulated towards the next mandate day (0..1440). */
  mandateDayProgressMinutes: number;
  /**
   * Highest wall clock time we have observed. Used as an anti-cheat anchor:
   * if the device clock jumps backwards, we refuse to grant progress.
   */
  lastKnownTime: number;
}

export const DEFAULT_REALTIME_STATE: RealTimeState = {
  lastTickAt: 0,
  mandateDayProgressMinutes: 0,
  lastKnownTime: 0,
};

/** Build the initial RealTimeState anchored at the current wall clock. */
export function initRealTime(now: number): RealTimeState {
  return {
    lastTickAt: now,
    mandateDayProgressMinutes: 0,
    lastKnownTime: now,
  };
}

export interface RealTimeAdvance {
  /** New RealTimeState to persist on the game state. */
  realTime: RealTimeState;
  /** Whole mandate days that should be added to mandateDay this tick. */
  daysToAdd: number;
  /** Whether the device clock appears to have moved backwards. */
  clockTampered: boolean;
}

/**
 * Compute how many mandate days should be added given the elapsed real time
 * since the last tick. Caps offline progression and detects clock tampering.
 *
 * Pure function — does not mutate input.
 */
export function computeRealTimeAdvance(
  prev: RealTimeState | undefined,
  now: number,
): RealTimeAdvance {
  // Backward-compat / first run: bootstrap state without granting progress.
  if (!prev || prev.lastTickAt === 0) {
    return {
      realTime: initRealTime(now),
      daysToAdd: 0,
      clockTampered: false,
    };
  }

  // Anti-cheat: clock moved backwards beyond tolerance → no progress.
  if (now < prev.lastKnownTime - REALTIME_CONFIG.clockSkewToleranceMs) {
    return {
      realTime: { ...prev, lastTickAt: now },
      daysToAdd: 0,
      clockTampered: true,
    };
  }

  const elapsedMs = Math.max(0, now - prev.lastTickAt);
  const elapsedMinutes = elapsedMs / 60000;

  // Cap offline accumulation. Beyond this cap, "lost" minutes are forfeited.
  const cappedMinutes = Math.min(elapsedMinutes, REALTIME_CONFIG.maxOfflineMinutes);

  const totalProgress = prev.mandateDayProgressMinutes + cappedMinutes;
  const daysToAdd = Math.floor(totalProgress / REALTIME_CONFIG.realMinutesPerMandateDay);
  const remainingProgress = totalProgress - daysToAdd * REALTIME_CONFIG.realMinutesPerMandateDay;

  return {
    realTime: {
      lastTickAt: now,
      mandateDayProgressMinutes: remainingProgress,
      lastKnownTime: Math.max(prev.lastKnownTime, now),
    },
    daysToAdd,
    clockTampered: false,
  };
}

// ─── Strategic clock helpers ──────────────────────────────────────────

export interface StrategicClockInfo {
  /** Current mandate day. */
  mandateDay: number;
  /** Progress into the current mandate day (0..1). */
  dayProgress: number;
  /** Real minutes remaining before the mandate day ticks over. */
  minutesUntilNextDay: number;
  /** Mandate days remaining until the next national poll. */
  daysUntilPoll: number;
  /** Mandate days remaining until the next scheduled major crisis. */
  daysUntilMajorCrisis: number;
  /** Mandate days remaining until the next presidential bilan (every 100). */
  daysUntilBilan: number;
}

/** Compute everything the StrategicClock UI needs from the game state. */
export function getStrategicClockInfo(state: StrategyGameState): StrategicClockInfo {
  const rt = state.realTime ?? DEFAULT_REALTIME_STATE;
  const dayProgress = rt.mandateDayProgressMinutes / REALTIME_CONFIG.realMinutesPerMandateDay;
  const minutesUntilNextDay = Math.max(
    0,
    REALTIME_CONFIG.realMinutesPerMandateDay - rt.mandateDayProgressMinutes,
  );

  // Last poll cycle the player acknowledged
  const lastPollCycle = Math.floor(state.lastPollShownAt / REALTIME_CONFIG.pollEveryMandateDays);
  const nextPollDay = (lastPollCycle + 1) * REALTIME_CONFIG.pollEveryMandateDays;
  const daysUntilPoll = Math.max(0, nextPollDay - state.mandateDay);

  // Major crisis is fired every 25 days starting at day 25
  const daysSinceLastCrisis = state.mandateDay % REALTIME_CONFIG.majorCrisisEveryMandateDays;
  const daysUntilMajorCrisis = REALTIME_CONFIG.majorCrisisEveryMandateDays - daysSinceLastCrisis;

  // Bilan: next multiple of 100 after lastBilanShownAt
  const lastBilanCycle = Math.floor(state.lastBilanShownAt / REALTIME_CONFIG.bilanEveryMandateDays);
  const nextBilanDay = (lastBilanCycle + 1) * REALTIME_CONFIG.bilanEveryMandateDays;
  const daysUntilBilan = Math.max(0, nextBilanDay - state.mandateDay);

  return {
    mandateDay: state.mandateDay,
    dayProgress,
    minutesUntilNextDay,
    daysUntilPoll,
    daysUntilMajorCrisis,
    daysUntilBilan,
  };
}

/** Format remaining minutes as "Xh YYmin" (or "YYmin" if < 1 h). */
export function formatRealMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}
