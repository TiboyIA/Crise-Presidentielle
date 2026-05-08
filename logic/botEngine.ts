import { BOTS } from "@/data/bots";
import type { RankEntry } from "@/types/strategy";

const MAX_OFFLINE_HOURS = 48;

export function updateBotRanking(
  ranking: RankEntry[],
  playerPower: number,
  playerPoints: number,
  lastBotUpdate: number,
): RankEntry[] {
  const now = Date.now();
  const elapsedHours = Math.min((now - lastBotUpdate) / 3600000, MAX_OFFLINE_HOURS);

  const updated = ranking.map((entry) => {
    if (entry.id === "player") {
      const prev = entry.power;
      return {
        ...entry,
        power: playerPower,
        points: playerPoints,
        trend: playerPower > prev ? ("up" as const) : playerPower < prev ? ("down" as const) : ("stable" as const),
      };
    }

    const bot = BOTS.find((b) => b.id === entry.id);
    if (!bot) return entry;

    const growthVariance = 0.8 + Math.random() * 0.4; // ±20% variance
    const growth = bot.growthPerHour * elapsedHours * growthVariance;
    const newPower = Math.round(entry.power + growth);
    const prevPower = entry.power;

    return {
      ...entry,
      power: newPower,
      points: newPower * 2,
      trend: newPower > prevPower ? ("up" as const) : ("stable" as const),
    };
  });

  return updated.sort((a, b) => b.power - a.power);
}

export function getPlayerRank(ranking: RankEntry[]): number {
  return ranking.findIndex((e) => e.id === "player") + 1;
}

export function getRankTitle(rank: number, total: number): string {
  const pct = rank / total;
  if (pct <= 0.05) return "Leader Mondial";
  if (pct <= 0.15) return "Superpuissance";
  if (pct <= 0.3) return "Puissance Majeure";
  if (pct <= 0.5) return "Puissance Montante";
  if (pct <= 0.7) return "Puissance Régionale";
  return "Nation en développement";
}

export function getTitleIcon(title: string): string {
  const map: Record<string, string> = {
    "Leader Mondial": "🌍",
    Superpuissance: "⭐",
    "Puissance Majeure": "🏆",
    "Puissance Montante": "📈",
    "Puissance Régionale": "🏅",
    "Nation en développement": "🌱",
  };
  return map[title] ?? "🏳️";
}
