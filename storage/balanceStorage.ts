import AsyncStorage from "@react-native-async-storage/async-storage";

const BALANCE_KEY = "@balance_stats_v1";

export interface BalanceStats {
  gamesStarted: number;
  gamesLostBeforeDay30: number;
  gamesReachedDay100: number;
  firstSessionActions: number;
  crisesResolved: number;
  crisesFailed: number;
  mostUsedActions: Record<string, number>;
  // Internal accumulators for averages
  _totalDaysReached: number;
  _totalPopularityAtBilan: number;
  _totalEconomyAtBilan: number;
  _totalSecurityAtBilan: number;
  _bilanCount: number;
}

const EMPTY: BalanceStats = {
  gamesStarted: 0,
  gamesLostBeforeDay30: 0,
  gamesReachedDay100: 0,
  firstSessionActions: 0,
  crisesResolved: 0,
  crisesFailed: 0,
  mostUsedActions: {},
  _totalDaysReached: 0,
  _totalPopularityAtBilan: 0,
  _totalEconomyAtBilan: 0,
  _totalSecurityAtBilan: 0,
  _bilanCount: 0,
};

function merge(raw: unknown): BalanceStats {
  const base: BalanceStats = { ...EMPTY, mostUsedActions: {} };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<BalanceStats>;
  return {
    gamesStarted: r.gamesStarted ?? 0,
    gamesLostBeforeDay30: r.gamesLostBeforeDay30 ?? 0,
    gamesReachedDay100: r.gamesReachedDay100 ?? 0,
    firstSessionActions: r.firstSessionActions ?? 0,
    crisesResolved: r.crisesResolved ?? 0,
    crisesFailed: r.crisesFailed ?? 0,
    mostUsedActions: r.mostUsedActions ?? {},
    _totalDaysReached: r._totalDaysReached ?? 0,
    _totalPopularityAtBilan: r._totalPopularityAtBilan ?? 0,
    _totalEconomyAtBilan: r._totalEconomyAtBilan ?? 0,
    _totalSecurityAtBilan: r._totalSecurityAtBilan ?? 0,
    _bilanCount: r._bilanCount ?? 0,
  };
}

export async function loadBalanceStats(): Promise<BalanceStats> {
  try {
    const raw = await AsyncStorage.getItem(BALANCE_KEY);
    if (!raw) return { ...EMPTY, mostUsedActions: {} };
    return merge(JSON.parse(raw));
  } catch {
    return { ...EMPTY, mostUsedActions: {} };
  }
}

async function persist(stats: BalanceStats): Promise<void> {
  try {
    await AsyncStorage.setItem(BALANCE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("balanceStorage: persist failed", e);
  }
}

export async function trackGameStarted(): Promise<void> {
  const stats = await loadBalanceStats();
  stats.gamesStarted += 1;
  await persist(stats);
}

export async function trackCrisisResolved(success: boolean): Promise<void> {
  const stats = await loadBalanceStats();
  if (success) stats.crisesResolved += 1;
  else stats.crisesFailed += 1;
  await persist(stats);
}

export async function trackActionUsed(actionType: string): Promise<void> {
  const stats = await loadBalanceStats();
  stats.mostUsedActions[actionType] = (stats.mostUsedActions[actionType] ?? 0) + 1;
  await persist(stats);
}

export async function trackMandateDayReached(day: number): Promise<void> {
  const stats = await loadBalanceStats();
  if (day < 30 && stats.gamesStarted > 0) stats.gamesLostBeforeDay30 += 1;
  if (day >= 100) stats.gamesReachedDay100 += 1;
  stats._totalDaysReached += day;
  await persist(stats);
}

export async function trackBilanStats(opts: {
  popularity: number;
  economy: number;
  security: number;
}): Promise<void> {
  const stats = await loadBalanceStats();
  stats._bilanCount += 1;
  stats._totalPopularityAtBilan += opts.popularity;
  stats._totalEconomyAtBilan += opts.economy;
  stats._totalSecurityAtBilan += opts.security;
  await persist(stats);
}

/** Derived averages — computed on read, not stored. */
export function getAverages(stats: BalanceStats) {
  const games = Math.max(1, stats.gamesStarted);
  const bilans = Math.max(1, stats._bilanCount);
  return {
    averageMandateDayReached: Math.round(stats._totalDaysReached / games),
    averagePopularityAtBilan: Math.round(stats._totalPopularityAtBilan / bilans),
    averageEconomyAtBilan: Math.round(stats._totalEconomyAtBilan / bilans),
    averageSecurityAtBilan: Math.round(stats._totalSecurityAtBilan / bilans),
    lostEarlyRate: stats.gamesStarted > 0
      ? Math.round((stats.gamesLostBeforeDay30 / stats.gamesStarted) * 100)
      : 0,
    reachedBilanRate: stats.gamesStarted > 0
      ? Math.round((stats.gamesReachedDay100 / stats.gamesStarted) * 100)
      : 0,
    crisisSuccessRate: (stats.crisesResolved + stats.crisesFailed) > 0
      ? Math.round((stats.crisesResolved / (stats.crisesResolved + stats.crisesFailed)) * 100)
      : 0,
  };
}

export async function resetBalanceStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BALANCE_KEY);
  } catch { /* noop */ }
}
