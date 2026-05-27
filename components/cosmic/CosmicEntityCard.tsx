import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

interface Props {
  name:        string;
  role:        string;
  score:       number;
  scoreLabel:  string;
  color:       string;
  description: string;
}

export function CosmicEntityCard({ name, role, score, scoreLabel, color, description }: Props) {
  return (
    <View style={[s.card, { borderLeftColor: color }]}>
      <View style={s.header}>
        <View style={s.nameBlock}>
          <Text style={[s.name, { color }]}>{name}</Text>
          <Text style={s.role}>{role}</Text>
        </View>
        <View style={[s.scoreBadge, { backgroundColor: color + "1a", borderColor: color + "44" }]}>
          <Text style={[s.scoreVal, { color }]}>{score}</Text>
          <Text style={[s.scoreLabel, { color: color + "99" }]}>{scoreLabel}</Text>
        </View>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${score}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={s.desc}>{description}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card:       { borderLeftWidth: 2, paddingLeft: 10, paddingVertical: 8, gap: 6 },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  nameBlock:  { flex: 1, gap: 2 },
  name:       { fontSize: 12, fontFamily: FONT.bold },
  role:       { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow },
  scoreBadge: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.xs, borderWidth: 1, minWidth: 52 },
  scoreVal:   { fontSize: 16, fontFamily: FONT.bold },
  scoreLabel: { fontSize: 7, fontFamily: FONT.reg, letterSpacing: 0.5, textTransform: "uppercase" },
  barTrack:   { height: 4, borderRadius: 2, backgroundColor: "#1a1e2c", overflow: "hidden" },
  barFill:    { height: 4, borderRadius: 2 },
  desc:       { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 13 },
});
