import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getMissionDef } from "@/logic/missionEngine";
import { Badge } from "@/components/ui/Badge";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { RESOURCE_MCI } from "@/constants/iconMap";
import type { PlayerMission, ResourceKey } from "@/types/strategy";

interface Props {
  mission: PlayerMission;
  onCollect: () => void;
}

export function MissionCard({ mission, onCollect }: Props) {
  const def = getMissionDef(mission.defId);
  if (!def) return null;

  const pct = Math.min(1, mission.progress / mission.target);
  const rewardEntries = Object.entries(def.reward).filter(([, v]) => v > 0);
  const completed = mission.completed;

  return (
    <LinearGradient
      colors={completed ? ["#1c1814", "#0d1119"] : ["#161b27", "#0d1119"]}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={[styles.card, { borderColor: completed ? PALETTE.gold + "88" : PALETTE.panelEdge }]}
    >
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name={completed ? "check-decagram" : "target-variant"}
            size={20}
            color={completed ? PALETTE.gold : PALETTE.textMid}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{def.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{def.description}</Text>
        </View>
        <Badge label={`+${def.rewardPoints} pts`} tone="gold" size="xs" />
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={completed ? [PALETTE.gold, PALETTE.gold] : [PALETTE.crimson, PALETTE.gold]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${pct * 100}%` }]}
          />
        </View>
        <Text style={[styles.progressText, { color: completed ? PALETTE.gold : PALETTE.textMid }]}>
          {mission.progress}/{mission.target}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.rewards}>
          {rewardEntries.map(([key, val]) => (
            <View key={key} style={styles.rewardChip}>
              <MaterialCommunityIcons name={(RESOURCE_MCI[key as ResourceKey] ?? "circle-small") as React.ComponentProps<typeof MaterialCommunityIcons>["name"]} size={11} color={PALETTE.gold} />
              <Text style={styles.rewardVal}>+{val}</Text>
            </View>
          ))}
        </View>
        {completed && (
          <View style={{ minWidth: 110 }}>
            <PrimaryButton label="Réclamer" variant="gold" size="sm" onPress={onCollect} />
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconBox: {
    width: 32, height: 32, borderRadius: 4,
    backgroundColor: PALETTE.panelHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh },
  desc: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15 },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 0.3, minWidth: 50, textAlign: "right" },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rewards: { flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 },
  rewardChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3, backgroundColor: "rgba(63,190,122,0.12)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(63,190,122,0.4)" },
  rewardIcon: { fontSize: 11 },
  rewardVal: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.success },
});
