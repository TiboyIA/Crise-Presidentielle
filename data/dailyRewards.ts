import type { DailyLoginRewardState, StrategyResources } from "@/types/strategy";

export interface DailyRewardDef {
  index: number;
  dayLabel: string;
  icon: string;
  title: string;
  effects: Partial<StrategyResources>;
  description: string;
}

export const DAILY_REWARDS: DailyRewardDef[] = [
  {
    index: 0,
    dayLabel: "JOUR 1",
    icon: "💰",
    title: "Trésorerie d'État",
    effects: { money: 150 },
    description: "+150 Argent",
  },
  {
    index: 1,
    dayLabel: "JOUR 2",
    icon: "🗣️",
    title: "Rayonnement diplomatique",
    effects: { influence: 10 },
    description: "+10 Influence",
  },
  {
    index: 2,
    dayLabel: "JOUR 3",
    icon: "🔬",
    title: "Avancée technologique",
    effects: { technology: 8 },
    description: "+8 Technologie",
  },
  {
    index: 3,
    dayLabel: "JOUR 4",
    icon: "🕵️",
    title: "Rapport du renseignement",
    effects: { intelligence: 8 },
    description: "+8 Renseignement",
  },
  {
    index: 4,
    dayLabel: "JOUR 5",
    icon: "🛡️",
    title: "Renforcement cyber",
    effects: { cyberDefense: 8 },
    description: "+8 Cyberdéfense",
  },
  {
    index: 5,
    dayLabel: "JOUR 6",
    icon: "⚡",
    title: "Réserves énergétiques",
    effects: { energy: 10 },
    description: "+10 Énergie",
  },
  {
    index: 6,
    dayLabel: "JOUR 7",
    icon: "👑",
    title: "Coffre présidentiel",
    effects: { money: 300, influence: 10, technology: 5 },
    description: "+300 Argent · +10 Influence · +5 Technologie",
  },
];

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isDailyRewardReady(dlr?: DailyLoginRewardState): boolean {
  if (!dlr) return true;
  return startOfDay(Date.now()) > startOfDay(dlr.lastLoginRewardAt);
}

export function getNextReward(dlr?: DailyLoginRewardState): DailyRewardDef {
  const idx = dlr ? dlr.totalDaysClaimed % 7 : 0;
  return DAILY_REWARDS[idx]!;
}

export function getNextStreak(dlr?: DailyLoginRewardState): number {
  if (!dlr) return 1;
  const todayStart = startOfDay(Date.now());
  const lastClaimDay = startOfDay(dlr.lastLoginRewardAt);
  const daysDiff = Math.floor((todayStart - lastClaimDay) / (24 * 60 * 60 * 1000));
  return daysDiff === 1 ? dlr.currentStreak + 1 : 1;
}
