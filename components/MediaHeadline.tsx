import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  source: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "inline" | "card";
}

export function MediaHeadline({
  source,
  icon = "file-text",
  variant = "inline",
}: Props) {
  const colors = useColors();

  if (variant === "card") {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Feather name={icon} size={12} color={colors.mutedForeground} />
        <Text style={[styles.text, { color: colors.mutedForeground }]}>
          {source}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.inline,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={12} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        {source}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
});
