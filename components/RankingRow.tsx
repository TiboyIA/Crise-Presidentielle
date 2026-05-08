import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { RankEntry } from "@/types/strategy";

interface Props {
  entry: RankEntry;
  rank: number;
  isPlayer: boolean;
}

export function RankingRow({ entry, rank, isPlayer }: Props) {
  const podiumColor = rank === 1 ? "#FFD56A" : rank === 2 ? "#C9D1DC" : rank === 3 ? "#D49154" : null;
  const trendColor = entry.trend === "up" ? PALETTE.success : entry.trend === "down" ? PALETTE.danger : PALETTE.textLow;
  const trendIcon = entry.trend === "up" ? "menu-up" : entry.trend === "down" ? "menu-down" : "minus";

  return (
    <LinearGradient
      colors={isPlayer ? ["#22150e", "#0d0f17"] : ["#161b27", "#0d1119"]}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={[styles.row, { borderColor: isPlayer ? PALETTE.gold + "88" : PALETTE.panelEdge }]}
    >
      {/* Rank chip */}
      <View style={[styles.rankChip, { borderColor: podiumColor ?? PALETTE.panelEdge }]}>
        <Text style={[styles.rankNum, { color: podiumColor ?? PALETTE.textMid }]}>#{rank}</Text>
      </View>

      <Text style={styles.flag}>{entry.flag}</Text>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: isPlayer ? PALETTE.gold : PALETTE.textHigh }]} numberOfLines={1}>
          {isPlayer ? "VOUS · " : ""}{entry.name}
        </Text>
        <View style={styles.subRow}>
          <MaterialCommunityIcons name={trendIcon as any} size={14} color={trendColor} />
          <Text style={[styles.subPower, { color: PALETTE.textMid }]}>Puissance {entry.power}</Text>
        </View>
      </View>

      <View style={styles.pointsCol}>
        <Text style={styles.pointsVal}>{entry.points}</Text>
        <Text style={styles.pointsLbl}>PTS</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rankChip: {
    width: 38, height: 30,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  rankNum: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.5 },
  flag: { fontSize: 22 },
  name: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
  subPower: { fontSize: 10, fontFamily: FONT.med, letterSpacing: 0.3 },
  pointsCol: { alignItems: "flex-end" },
  pointsVal: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.gold },
  pointsLbl: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.2 },
});
