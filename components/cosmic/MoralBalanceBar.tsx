import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT, PALETTE } from "@/constants/uiTokens";
import { getMoralBalanceLabel, getMoralBalanceColor } from "@/logic/cosmicEngine";

interface Props {
  balance: number;
  auroraTrust: number;
  obscuriumDebt: number;
}

export function MoralBalanceBar({ balance, auroraTrust, obscuriumDebt }: Props) {
  const color = getMoralBalanceColor(balance);
  const label = getMoralBalanceLabel(balance);
  // balance: -100..+100 → mapped to 0..100 for the bar
  const pct = Math.round((balance + 100) / 2);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>ÉQUILIBRE MORAL</Text>
        <Text style={[s.label, { color }]}>{label}</Text>
      </View>

      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
        <View style={s.midLine} />
      </View>

      <View style={s.poles}>
        <Text style={[s.poleLabel, { color: "#9b6fd4" }]}>Obscurium {obscuriumDebt}</Text>
        <Text style={[s.poleVal, { color }]}>{balance > 0 ? "+" : ""}{balance}</Text>
        <Text style={[s.poleLabel, { color: "#7ec8f7" }]}>Aurora {auroraTrust}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { gap: 6 },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title:     { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.8 },
  label:     { fontSize: 9, fontFamily: FONT.semi },
  track:     { height: 6, borderRadius: 3, backgroundColor: "#1a1e2c", overflow: "hidden", position: "relative" },
  fill:      { height: 6, borderRadius: 3 },
  midLine:   { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: "#ffffff22" },
  poles:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  poleLabel: { fontSize: 8, fontFamily: FONT.reg },
  poleVal:   { fontSize: 10, fontFamily: FONT.bold },
});
