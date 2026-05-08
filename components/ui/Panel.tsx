import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS, PALETTE, RADIUS, SHADOW } from "@/constants/uiTokens";

type Variant = "default" | "gold" | "danger" | "glass";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: Variant;
  bordered?: boolean;
  glow?: boolean;
}

/**
 * Premium card surface used across the strategy game.
 * Subtle vertical gradient + soft border + optional glow.
 */
export function Panel({ children, style, variant = "default", bordered = true, glow = false }: Props) {
  const colors = pickGradient(variant);
  const borderColor = pickBorder(variant);

  return (
    <View style={[styles.outer, glow && variantGlow(variant), style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.inner, bordered && { borderWidth: StyleSheet.hairlineWidth, borderColor }]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

function pickGradient(v: Variant): [string, string] {
  switch (v) {
    case "gold":   return GRADIENTS.panelGold;
    case "danger": return GRADIENTS.panelDanger;
    case "glass":  return GRADIENTS.glassPanel;
    default:       return GRADIENTS.panel;
  }
}
function pickBorder(v: Variant): string {
  switch (v) {
    case "gold":   return PALETTE.goldDim + "88";
    case "danger": return PALETTE.crimson + "66";
    case "glass":  return PALETTE.panelEdge + "cc";
    default:       return PALETTE.panelEdge;
  }
}
function variantGlow(v: Variant) {
  if (v === "danger") return SHADOW.glowDanger;
  if (v === "gold")   return SHADOW.glow;
  return SHADOW.md;
}

const styles = StyleSheet.create({
  outer: { borderRadius: RADIUS.md, overflow: "hidden" },
  inner: { borderRadius: RADIUS.md, overflow: "hidden" },
});
