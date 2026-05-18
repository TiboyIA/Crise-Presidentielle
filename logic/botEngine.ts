import { BOTS } from "@/data/bots";
import type { CountryRelation, RankEntry } from "@/types/strategy";
import { computeBotDecisions, applyStrategyGrowthMults } from "@/logic/botStrategyEngine";

const MAX_OFFLINE_HOURS = 48;

export function updateBotRanking(
  ranking: RankEntry[],
  playerPower: number,
  playerPoints: number,
  lastBotUpdate: number,
  playerRelations: CountryRelation[] = [],
): RankEntry[] {
  const now          = Date.now();
  const elapsedHours = Math.min((now - lastBotUpdate) / 3600000, MAX_OFFLINE_HOURS);

  // Mise à jour du joueur
  const withPlayer = ranking.map((entry) => {
    if (entry.id !== "player") return entry;
    const prev = entry.power;
    return {
      ...entry,
      power:  playerPower,
      points: playerPoints,
      trend: playerPower > prev ? ("up" as const) : playerPower < prev ? ("down" as const) : ("stable" as const),
    };
  });

  // Décisions stratégiques des bots pour ce cycle
  const decisions = computeBotDecisions(withPlayer, playerPower, playerRelations, now);

  // Table de croissance de base (par bot)
  const baseGrowth = new Map(BOTS.map((b) => [b.id, b.growthPerHour]));

  // Application des multiplicateurs stratégiques + mise à jour du classement
  const updated = applyStrategyGrowthMults(withPlayer, decisions, baseGrowth, elapsedHours);

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
