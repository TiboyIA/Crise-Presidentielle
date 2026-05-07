import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label?: string;
  value: number;
  max?: number;
  tone?: "auto" | "success" | "warning" | "danger" | "neutral";
  /**
   * Inverts the auto-tone calculation only (so a high value reads as bad,
   * e.g. opposition or tension). The fill width still represents the raw
   * value — this prop never inverts the visual magnitude.
   */
  invertTone?: boolean;
  width?: "compact" | "full";
}

export function StatBar({
  label,
  value,
  max = 100,
  tone = "auto",
  invertTone = false,
  width = "full",
}: Props) {
  const colors = useColors();
  const score = invertTone ? max - value : value;
  const resolvedTone =
    tone === "auto"
      ? score >= 60
        ? colors.success
        : score >= 35
          ? colors.warning
          : colors.danger
      : tone === "neutral"
        ? colors.primary
        : colors[tone];

  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <View style={styles.row}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, width: width === "compact" ? 64 : 78 },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View style={[styles.bar, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(2, pct)}%`, backgroundColor: resolvedTone },
          ]}
        />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>
        {Math.round(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  bar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  value: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    width: 28,
    textAlign: "right",
  },
});
