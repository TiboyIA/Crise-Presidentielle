import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { getMissionDef } from "@/logic/missionEngine";
import { RESOURCE_ICONS } from "@/types/strategy";
import type { PlayerMission } from "@/types/strategy";

interface Props {
  mission: PlayerMission;
  onCollect: () => void;
}

export function MissionCard({ mission, onCollect }: Props) {
  const colors = useColors();
  const def = getMissionDef(mission.defId);
  if (!def) return null;

  const pct = Math.min(1, mission.progress / mission.target);
  const rewardEntries = Object.entries(def.reward).filter(([, v]) => v > 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: mission.completed ? "#60D080" : colors.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{def.title}</Text>
          <Text style={[styles.desc, { color: colors.mutedForeground }]}>{def.description}</Text>
        </View>
        <View style={[styles.pointsBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.pointsText, { color: colors.primary }]}>+{def.rewardPoints}pts</Text>
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: mission.completed ? "#60D080" : colors.primary }]} />
      </View>

      <View style={styles.footer}>
        <View style={styles.rewards}>
          {rewardEntries.map(([key, val]) => (
            <View key={key} style={[styles.rewardChip, { backgroundColor: colors.muted }]}>
              <Text style={styles.rewardIcon}>{RESOURCE_ICONS[key as keyof typeof RESOURCE_ICONS] ?? "📦"}</Text>
              <Text style={[styles.rewardText, { color: colors.foreground }]}>+{val}</Text>
            </View>
          ))}
        </View>
        {mission.completed && (
          <Pressable
            onPress={onCollect}
            style={({ pressed }) => [styles.collectBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.collectText}>Réclamer ✓</Text>
          </Pressable>
        )}
        {!mission.completed && (
          <Text style={[styles.progress, { color: colors.mutedForeground }]}>
            {mission.progress}/{mission.target}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { fontSize: 13, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  pointsBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  pointsText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  progressBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rewards: { flexDirection: "row", gap: 4 },
  rewardChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  rewardIcon: { fontSize: 11 },
  rewardText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  collectBtn: { backgroundColor: "#60D080", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  collectText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  progress: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
