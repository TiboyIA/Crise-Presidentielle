import React from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  /** Painterly square icon (see data/metaImages.ts). */
  iconSource: ImageSourcePropType;
  label: string;
  value: number;
  invert?: boolean;
}

export function MetaStatsCard({ iconSource, label, value, invert }: Props) {
  const colors = useColors();
  const score = invert ? 100 - value : value;
  const tone =
    score >= 60 ? colors.success : score >= 35 ? colors.warning : colors.danger;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.head}>
        <Image source={iconSource} style={styles.icon} resizeMode="cover" />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {Math.round(value)}
        </Text>
        <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.max(2, value)}%`, backgroundColor: tone },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 6,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    minWidth: 24,
  },
  barBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});
