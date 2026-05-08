import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FONT, GRADIENTS, PALETTE, RADIUS } from "@/constants/uiTokens";

type Variant = "primary" | "gold" | "danger" | "ghost" | "success";

interface Props {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}

/**
 * Standard CTA used everywhere: gradient background, uppercase letterspaced
 * label, soft press feedback. Use `disabled` for unaffordable/locked states.
 */
export function PrimaryButton({ label, onPress, disabled, variant = "primary", size = "md", icon, style, full = true }: Props) {
  const gradient = pickGradient(variant, !!disabled);
  const textColor = pickTextColor(variant, !!disabled);
  const padV = size === "sm" ? 9 : size === "lg" ? 16 : 12;
  const fontSize = size === "sm" ? 11 : size === "lg" ? 14 : 12;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        full && { alignSelf: "stretch" },
        { opacity: pressed && !disabled ? 0.85 : 1, transform: [{ scale: pressed && !disabled ? 0.985 : 1 }] },
        style,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.inner, { paddingVertical: padV }]}
      >
        {icon}
        <Text style={[styles.label, { color: textColor, fontSize, marginLeft: icon ? 6 : 0 }]}>{label.toUpperCase()}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function pickGradient(v: Variant, disabled: boolean): [string, string] {
  if (disabled) return ["#1a1f2c", "#0e1119"];
  switch (v) {
    case "gold":    return GRADIENTS.gold;
    case "danger":  return ["#e54848", "#7e1f1f"];
    case "success": return GRADIENTS.success;
    case "ghost":   return ["#1c2230", "#141821"];
    default:        return GRADIENTS.primary;
  }
}
function pickTextColor(v: Variant, disabled: boolean): string {
  if (disabled) return PALETTE.textLow;
  if (v === "gold") return "#1a1308";
  return "#fff";
}

const styles = StyleSheet.create({
  wrap: { borderRadius: RADIUS.sm, overflow: "hidden" },
  inner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  label: { fontFamily: FONT.bold, letterSpacing: 1.6 },
});
