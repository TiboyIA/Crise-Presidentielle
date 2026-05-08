import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE } from "@/constants/uiTokens";

interface Props {
  power: number;
  size?: "sm" | "md" | "lg";
}

type Tier = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  outer: [string, string];
};

export function PowerBadge({ power, size = "md" }: Props) {
  const tier = getPowerTier(power);

  const containerSize = size === "sm" ? 38 : size === "lg" ? 64 : 50;
  const labelSize = size === "sm" ? 10 : size === "lg" ? 15 : 12;
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;

  return (
    <View style={[styles.outer, { width: containerSize, height: containerSize, borderColor: tier.color + "aa" }]}>
      <LinearGradient
        colors={tier.outer}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={styles.inner}
      >
        <MaterialCommunityIcons name={tier.icon} size={iconSize} color={tier.color} />
        <Text style={[styles.label, { color: tier.color, fontSize: labelSize }]}>{formatPower(power)}</Text>
      </LinearGradient>
    </View>
  );
}

function formatPower(power: number): string {
  if (power >= 1000) return `${(power / 1000).toFixed(1)}k`;
  return String(power);
}

function getPowerTier(power: number): Tier {
  if (power >= 800) return { icon: "earth",        color: "#FFD56A",       outer: ["#2c2410", "#0d1119"] };
  if (power >= 500) return { icon: "star",         color: "#C0A0FF",       outer: ["#1d1530", "#0d1119"] };
  if (power >= 300) return { icon: "trophy",       color: "#60CFFF",       outer: ["#0e1f2c", "#0d1119"] };
  if (power >= 150) return { icon: "medal",        color: "#3fbe7a",       outer: ["#0e1f17", "#0d1119"] };
  if (power >= 50)  return { icon: "shield-star",  color: "#FFA040",       outer: ["#2a1a0c", "#0d1119"] };
  return                       { icon: "shield-outline", color: PALETTE.textMid, outer: ["#161b27", "#0d1119"] };
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 6, borderWidth: 1,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  inner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 1 },
  label: { fontFamily: FONT.bold, letterSpacing: 0.3 },
});
