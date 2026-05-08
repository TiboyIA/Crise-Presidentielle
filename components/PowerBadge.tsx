import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  power: number;
  size?: "sm" | "md" | "lg";
}

export function PowerBadge({ power, size = "md" }: Props) {
  const colors = useColors();
  const tier = getPowerTier(power);

  const containerSize = size === "sm" ? 36 : size === "lg" ? 60 : 48;
  const fontSize = size === "sm" ? 10 : size === "lg" ? 16 : 13;

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize, backgroundColor: tier.bg, borderColor: tier.color }]}>
      <Text style={[styles.icon, { fontSize: size === "lg" ? 20 : 14 }]}>{tier.icon}</Text>
      <Text style={[styles.label, { color: tier.color, fontSize }]}>{formatPower(power)}</Text>
    </View>
  );
}

function formatPower(power: number): string {
  if (power >= 1000) return `${(power / 1000).toFixed(1)}k`;
  return String(power);
}

function getPowerTier(power: number) {
  if (power >= 800) return { icon: "🌍", color: "#FFD700", bg: "#FFD70022" };
  if (power >= 500) return { icon: "⭐", color: "#C0A0FF", bg: "#C0A0FF22" };
  if (power >= 300) return { icon: "🏆", color: "#60CFFF", bg: "#60CFFF22" };
  if (power >= 150) return { icon: "📈", color: "#60D080", bg: "#60D08022" };
  if (power >= 50) return { icon: "🏅", color: "#FFA040", bg: "#FFA04022" };
  return { icon: "🌱", color: "#808080", bg: "#80808022" };
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  icon: { lineHeight: 18 },
  label: { fontFamily: "Inter_700Bold", lineHeight: 14 },
});
