import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getOrbitalStateInfo, type OrbitalWindowState } from "@/logic/orbitalWindowEngine";
import { FONT, PALETTE } from "@/constants/uiTokens";

interface Props {
  orbitalWindow: OrbitalWindowState;
}

export function OrbitalWindowBadge({ orbitalWindow }: Props) {
  const { label, color } = getOrbitalStateInfo(orbitalWindow.current);

  return (
    <View style={s.row}>
      <MaterialCommunityIcons name="satellite-variant" size={11} color={color} />
      <Text style={s.section}>FENÊTRE ORBITALE</Text>
      <View style={[s.pill, { borderColor: color + "44", backgroundColor: color + "12" }]}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text style={[s.pillText, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, paddingVertical: 4 },
  section:  { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.8, flex: 1 },
  pill:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  dot:      { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 9, fontFamily: FONT.semi },
});
