import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { RankEntry } from "@/types/strategy";

interface Props {
  entry: RankEntry;
  rank: number;
  isPlayer: boolean;
}

export function RankingRow({ entry, rank, isPlayer }: Props) {
  const colors = useColors();

  const rankColor = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : colors.mutedForeground;
  const trendIcon = entry.trend === "up" ? "▲" : entry.trend === "down" ? "▼" : "—";
  const trendColor = entry.trend === "up" ? "#60D080" : entry.trend === "down" ? "#FF5060" : colors.mutedForeground;

  return (
    <View style={[styles.row, { backgroundColor: isPlayer ? colors.primary + "18" : "transparent", borderColor: isPlayer ? colors.primary + "44" : colors.border }]}>
      <Text style={[styles.rank, { color: rankColor }]}>{rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}</Text>
      <Text style={styles.flag}>{entry.flag}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, { color: isPlayer ? colors.primary : colors.foreground }]} numberOfLines={1}>
          {isPlayer ? "Vous" : entry.name}
        </Text>
      </View>
      <Text style={[styles.trend, { color: trendColor }]}>{trendIcon}</Text>
      <View style={[styles.powerBadge, { backgroundColor: colors.muted }]}>
        <Text style={[styles.power, { color: colors.foreground }]}>⚡ {entry.power}</Text>
      </View>
      <View style={[styles.pointsBadge, { backgroundColor: colors.muted }]}>
        <Text style={[styles.points, { color: colors.primary }]}>{entry.points}pts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  rank: { width: 28, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  flag: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  trend: { fontSize: 11, fontFamily: "Inter_700Bold", width: 14, textAlign: "center" },
  powerBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  power: { fontSize: 11, fontFamily: "Inter_700Bold" },
  pointsBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  points: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
