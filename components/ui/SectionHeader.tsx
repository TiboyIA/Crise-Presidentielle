import React from "react";
import { StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import { FONT, PALETTE } from "@/constants/uiTokens";

interface Props {
  label: string;
  count?: string | number;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}

/**
 * Uppercase section title with a small leading accent chevron and an
 * optional trailing counter ("12/14") or arrow. Used at the top of each
 * group of cards (RESSOURCES, ACTIONS, OPÉRATIONS DISPONIBLES, etc.).
 */
export function SectionHeader({ label, count, trailing, style, accent = PALETTE.gold }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <Text style={[styles.label, { color: PALETTE.textMid }]}>{label.toUpperCase()}</Text>
      {count !== undefined && <Text style={[styles.count, { color: accent }]}>{count}</Text>}
      <View style={styles.spacer} />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 4 },
  bar: { width: 3, height: 12, borderRadius: 1 },
  label: { fontSize: 10, fontFamily: FONT.bold, letterSpacing: 2.2 },
  count: { fontSize: 10, fontFamily: FONT.bold, letterSpacing: 1 },
  spacer: { flex: 1 },
});
