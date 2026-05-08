import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { urgencyColor, typeIcon } from "@/logic/newsEngine";
import type { NewsLogEntry } from "@/types/strategy";
import { RESOURCE_ICONS } from "@/types/strategy";
import type { ResourceKey } from "@/types/strategy";

interface Props {
  entry: NewsLogEntry;
  onPress?: () => void;
}

export function NewsCard({ entry, onPress }: Props) {
  const colors = useColors();
  const urgColor = urgencyColor(entry.urgency);
  const icon = typeIcon(entry.type);

  const hasEffects = Object.values(entry.effects).some((v) => v !== 0);
  const effectEntries = Object.entries(entry.effects).filter(([, v]) => v !== 0) as [ResourceKey, number][];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: urgColor, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.typeIcon}>{icon}</Text>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>{entry.title}</Text>
            <Text style={[styles.source, { color: colors.mutedForeground }]}>{entry.source}</Text>
          </View>
        </View>
        <View style={[styles.urgBadge, { backgroundColor: urgColor + "22" }]}>
          <Text style={[styles.urgText, { color: urgColor }]}>{entry.urgency.toUpperCase()}</Text>
        </View>
      </View>

      {entry.choiceLabel && (
        <View style={[styles.decision, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "44" }]}>
          <Text style={[styles.decisionLabel, { color: colors.primary }]}>✓ Décision : {entry.choiceLabel}</Text>
          {entry.consequence && (
            <Text style={[styles.consequence, { color: colors.mutedForeground }]} numberOfLines={2}>
              {entry.consequence}
            </Text>
          )}
        </View>
      )}

      {hasEffects && (
        <View style={styles.effects}>
          {effectEntries.map(([key, val]) => (
            <View key={key} style={[styles.effectChip, { backgroundColor: colors.muted }]}>
              <Text style={styles.effectIcon}>{RESOURCE_ICONS[key] ?? "📦"}</Text>
              <Text style={[styles.effectText, { color: val > 0 ? "#60D080" : "#FF5060" }]}>
                {val > 0 ? "+" : ""}{val}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.time, { color: colors.mutedForeground }]}>
        {formatRelativeTime(entry.timestamp)}
      </Text>
    </Pressable>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    gap: 8,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  headerLeft: { flexDirection: "row", alignItems: "flex-start", gap: 8, flex: 1 },
  typeIcon: { fontSize: 20, width: 26, textAlign: "center", marginTop: 1 },
  title: { fontSize: 13, fontFamily: "Inter_700Bold", lineHeight: 17, flex: 1 },
  source: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  urgBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0 },
  urgText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  decision: { borderRadius: 6, borderWidth: 1, padding: 8, gap: 3 },
  decisionLabel: { fontSize: 11, fontFamily: "Inter_700Bold" },
  consequence: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  effects: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  effectChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  effectIcon: { fontSize: 11 },
  effectText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  time: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "right" },
});
