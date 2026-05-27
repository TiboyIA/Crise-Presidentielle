import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { CosmicState } from "@/types/cosmic";
import { COSMIC_STAGE_LABELS, COSMIC_STAGE_COLORS } from "@/types/cosmic";
import { getCosmicCredibilityLabel } from "@/logic/cosmicEngine";

interface Props {
  cosmic: CosmicState;
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${value}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[s.statVal, { color }]}>{value}</Text>
    </View>
  );
}

export function CosmicOverviewCard({ cosmic }: Props) {
  const stageColor = COSMIC_STAGE_COLORS[cosmic.discoveryStage];
  const stageLabel = COSMIC_STAGE_LABELS[cosmic.discoveryStage];
  const credLabel  = getCosmicCredibilityLabel(cosmic.cosmicCredibility);

  return (
    <View style={s.root}>
      <View style={[s.stageBadge, { borderColor: stageColor + "55", backgroundColor: stageColor + "14" }]}>
        <MaterialCommunityIcons name="orbit-variant" size={12} color={stageColor} />
        <Text style={[s.stageText, { color: stageColor }]}>{stageLabel}</Text>
      </View>

      <View style={s.credRow}>
        <Text style={s.credLabel}>Crédibilité cosmique</Text>
        <Text style={[s.credScore, { color: stageColor }]}>{cosmic.cosmicCredibility}</Text>
      </View>
      <Text style={[s.credDesc, { color: stageColor }]}>{credLabel}</Text>

      <View style={s.divider} />

      <StatRow label="Attention du Conseil" value={cosmic.councilAttention}  color="#4a9fff" />
      <StatRow label="Soutien Aurora"        value={cosmic.auroraSupport}     color="#7ec8f7" />
      <StatRow label="Influence Obscurium"   value={cosmic.obscuriumInfluence} color="#9b6fd4" />
    </View>
  );
}

const s = StyleSheet.create({
  root:       { gap: 8 },
  stageBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.xs, borderWidth: 1 },
  stageText:  { fontSize: 10, fontFamily: FONT.semi, letterSpacing: 0.5 },
  credRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  credLabel:  { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid },
  credScore:  { fontSize: 20, fontFamily: FONT.bold },
  credDesc:   { fontSize: 9, fontFamily: FONT.reg, marginTop: -4 },
  divider:    { height: 1, backgroundColor: "#ffffff0d", marginVertical: 4 },
  statRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  statLabel:  { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, width: 130 },
  barTrack:   { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#1a1e2c", overflow: "hidden" },
  barFill:    { height: 4, borderRadius: 2 },
  statVal:    { fontSize: 9, fontFamily: FONT.bold, width: 26, textAlign: "right" },
});
