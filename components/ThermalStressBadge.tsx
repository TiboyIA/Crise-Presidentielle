import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getThermalBandInfo } from "@/logic/thermalStressEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

interface Props {
  stress: number;
}

export function ThermalStressBadge({ stress }: Props) {
  const info = getThermalBandInfo(stress);
  return (
    <View style={[styles.container, { borderColor: info.color + "44" }]}>
      <MaterialCommunityIcons name="thermometer" size={13} color={info.color} />
      <Text style={styles.label}>SYSTÈMES THERMIQUES</Text>
      <View style={[styles.pill, { backgroundColor: info.color + "22", borderColor: info.color + "55" }]}>
        <Text style={[styles.pillText, { color: info.color }]}>{info.label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: PALETTE.panel,
  },
  label: {
    flex: 1,
    fontSize: 9,
    fontFamily: FONT.bold,
    color: PALETTE.textMid,
    letterSpacing: 1.2,
  },
  pill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 0.8,
  },
});
