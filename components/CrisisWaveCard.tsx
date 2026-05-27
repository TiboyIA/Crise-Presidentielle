import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { WaveSummary } from "@/logic/crisisWaveEngine";
import { WAVE_DOMAIN_ICONS } from "@/logic/crisisWaveEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

interface Props {
  wave: WaveSummary;
}

const TIER_LABELS: Record<WaveSummary["tier"], string> = {
  fort:   "FORTE",
  modere: "MODÉRÉE",
  faible: "FAIBLE",
};

export function CrisisWaveCard({ wave }: Props) {
  const icon = WAVE_DOMAIN_ICONS[wave.domain] as React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  const pct  = Math.round(wave.intensity);

  return (
    <View style={s.row}>
      <MaterialCommunityIcons name={icon} size={13} color={wave.tierColor} style={s.icon} />

      <View style={s.body}>
        <View style={s.headerRow}>
          <Text style={[s.label, { color: wave.tierColor }]}>{wave.domainLabel}</Text>
          <View style={[s.tierPill, { borderColor: wave.tierColor + "40", backgroundColor: wave.tierColor + "14" }]}>
            <Text style={[s.tierText, { color: wave.tierColor }]}>{TIER_LABELS[wave.tier]}</Text>
          </View>
          <Text style={s.remaining}>{wave.remainingActions}a</Text>
        </View>

        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: wave.tierColor }]} />
        </View>

        <Text style={s.affected} numberOfLines={1}>
          Affecte : {wave.affectedLabels.join(", ")}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:       { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 5 },
  icon:      { marginTop: 2 },
  body:      { flex: 1, gap: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label:     { fontSize: 10, fontFamily: FONT.semi, flex: 1 },
  tierPill:  { borderRadius: RADIUS.xs, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  tierText:  { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 0.5 },
  remaining: { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow },
  barTrack:  { height: 3, backgroundColor: PALETTE.panelEdge, borderRadius: 2, overflow: "hidden" },
  barFill:   { height: "100%", borderRadius: 2 },
  affected:  { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow },
});
