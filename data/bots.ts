import type { BotPlayer, RankEntry } from "@/types/strategy";

export const BOTS: BotPlayer[] = [
  {
    id: "bot_usa",
    name: "James Walker",
    countryName: "États-Unis",
    flag: "🇺🇸",
    startPower: 420,
    growthPerHour: 12,
    personality: "aggressive",
  },
  {
    id: "bot_china",
    name: "Wei Zhongshan",
    countryName: "Chine",
    flag: "🇨🇳",
    startPower: 390,
    growthPerHour: 14,
    personality: "economic",
  },
  {
    id: "bot_russia",
    name: "Viktor Sorokin",
    countryName: "Russie",
    flag: "🇷🇺",
    startPower: 350,
    growthPerHour: 8,
    personality: "aggressive",
  },
  {
    id: "bot_germany",
    name: "Klaus Brenner",
    countryName: "Allemagne",
    flag: "🇩🇪",
    startPower: 280,
    growthPerHour: 10,
    personality: "economic",
  },
  {
    id: "bot_uk",
    name: "Charles Ashford",
    countryName: "Royaume-Uni",
    flag: "🇬🇧",
    startPower: 290,
    growthPerHour: 9,
    personality: "diplomatic",
  },
  {
    id: "bot_india",
    name: "Raj Mehta",
    countryName: "Inde",
    flag: "🇮🇳",
    startPower: 220,
    growthPerHour: 13,
    personality: "economic",
  },
  {
    id: "bot_israel",
    name: "Avi Cohen",
    countryName: "Israël",
    flag: "🇮🇱",
    startPower: 200,
    growthPerHour: 7,
    personality: "defensive",
  },
  {
    id: "bot_japan",
    name: "Kenji Tanaka",
    countryName: "Japon",
    flag: "🇯🇵",
    startPower: 240,
    growthPerHour: 8,
    personality: "defensive",
  },
  {
    id: "bot_brazil",
    name: "Carlos Oliveira",
    countryName: "Brésil",
    flag: "🇧🇷",
    startPower: 150,
    growthPerHour: 9,
    personality: "diplomatic",
  },
  {
    id: "bot_turkey",
    name: "Mehmet Yilmaz",
    countryName: "Turquie",
    flag: "🇹🇷",
    startPower: 170,
    growthPerHour: 10,
    personality: "aggressive",
  },
];

export function getInitialRanking(playerPower: number): RankEntry[] {
  const now = Date.now();
  const botEntries: RankEntry[] = BOTS.map((bot) => ({
    id: bot.id,
    name: bot.name,
    flag: bot.flag,
    power: bot.startPower,
    points: bot.startPower * 2,
    trend: "stable" as const,
  }));

  const playerEntry: RankEntry = {
    id: "player",
    name: "Vous",
    flag: "🇫🇷",
    power: playerPower,
    points: playerPower * 2,
    trend: "stable",
  };

  return [...botEntries, playerEntry].sort((a, b) => b.power - a.power);
}
