import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

interface Props {
  lastSignal: string | null;
  signalCount: number;
  discoveredAt: number;
}

export function CosmicSignalCard({ lastSignal, signalCount, discoveredAt }: Props) {
  const hasSignal = signalCount > 0 && lastSignal !== null;

  return (
    <View style={s.root}>
      <View style={s.row}>
        <MaterialCommunityIcons
          name={hasSignal ? "access-point" : "access-point-off"}
          size={13}
          color={hasSignal ? "#7ec8f7" : PALETTE.textLow}
        />
        <Text style={s.title}>SIGNAUX COSMIQUES</Text>
        {hasSignal && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{signalCount}</Text>
          </View>
        )}
      </View>

      {hasSignal ? (
        <>
          <Text style={s.lastLabel}>Dernier signal</Text>
          <Text style={s.lastValue} numberOfLines={2}>{lastSignal}</Text>
          {discoveredAt > 0 && (
            <Text style={s.since}>Premier contact : jour {discoveredAt} de mandat</Text>
          )}
        </>
      ) : (
        <Text style={s.noSignal}>Aucun signal détecté. Le Conseil observe en silence.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:      { gap: 6 },
  row:       { flexDirection: "row", alignItems: "center", gap: 6 },
  title:     { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.8, flex: 1 },
  badge:     { backgroundColor: "#7ec8f744", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  badgeText: { fontSize: 9, fontFamily: FONT.bold, color: "#7ec8f7" },
  lastLabel: { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow },
  lastValue: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.textHigh, lineHeight: 14 },
  since:     { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 },
  noSignal:  { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },
});
