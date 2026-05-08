import React from "react";
import { StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "gold" | "primary";

interface Props {
  label: string;
  tone?: Tone;
  size?: "xs" | "sm" | "md";
  style?: StyleProp<ViewStyle>;
  dot?: boolean;
  outlined?: boolean;
}

const TONE_COLORS: Record<Tone, string> = {
  neutral: PALETTE.textMid,
  info:    PALETTE.info,
  success: PALETTE.success,
  warning: PALETTE.warning,
  danger:  PALETTE.danger,
  gold:    PALETTE.gold,
  primary: PALETTE.crimson,
};

export function Badge({ label, tone = "neutral", size = "sm", style, dot = false, outlined = false }: Props) {
  const c = TONE_COLORS[tone];
  const padH = size === "xs" ? 5 : size === "md" ? 9 : 7;
  const padV = size === "xs" ? 2 : size === "md" ? 4 : 3;
  const fontSize = size === "xs" ? 8 : size === "md" ? 11 : 9;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: padH,
          paddingVertical: padV,
          backgroundColor: outlined ? "transparent" : c + "26",
          borderColor: c + (outlined ? "aa" : "55"),
        },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: c }]} />}
      <Text style={[styles.label, { color: c, fontSize }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  label: { fontFamily: FONT.bold, letterSpacing: 0.7 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
