import React from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { gaugeColor } from "@/logic/gameEngine";

interface Props {
  label: string;
  /** Painterly square icon (see data/gaugeImages.ts). */
  iconSource: ImageSourcePropType;
  value: number;
  delta?: number;
  /**
   * If true, the gauge has inverted semantics (high = bad, e.g. Dette).
   * Color is computed from `100 - value` while the bar fill keeps its
   * actual magnitude.
   */
  inverted?: boolean;
}

export function GaugeBar({ label, iconSource, value, delta, inverted }: Props) {
  const colors = useColors();
  const colorValue = inverted ? 100 - value : value;
  const status = gaugeColor(colorValue);
  const barColor =
    status === "danger"
      ? colors.danger
      : status === "warning"
        ? colors.warning
        : colors.success;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Image source={iconSource} style={styles.icon} resizeMode="cover" />
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {label.toUpperCase()}
          </Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: colors.foreground }]}>
            {Math.round(value)}
          </Text>
          {delta !== undefined && delta !== 0 ? (
            <Text
              style={[
                styles.delta,
                { color: delta > 0 ? colors.success : colors.danger },
              ]}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(0, Math.min(100, value))}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  value: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  delta: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
