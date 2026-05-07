/**
 * ─── LOT 18 — ResourceBar ───────────────────────────────────────
 *
 * Bandeau compact affichant les 5 ressources stockables (Budget
 * National absolu en or, puis Influence, Renseignements, Tech,
 * Énergie). Pensé pour être posé juste sous `ResourceStrip` (les
 * jauges de santé du pays) afin de séparer visuellement :
 *  - jauges 0-100 % = état du pays (popularité, dette, sécurité…)
 *  - ressources stockables = leviers consommables (LOT 18).
 *
 * Pas de delta pour ce premier lot — sera ajouté en LOT 18.3 quand
 * la régénération mensuelle sera branchée.
 */
import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import {
  RESOURCE_KEYS,
  RESOURCE_SHORT_LABELS,
  RESOURCE_ICONS,
  formatResource,
} from "@/logic/resources";
import type { Resources } from "@/types/game";

interface Props {
  resources: Resources;
}

function ResourceBarImpl({ resources }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          borderTopColor: colors.gold + "33",
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {RESOURCE_KEYS.map((key) => {
          const value = resources[key];
          const iconName = RESOURCE_ICONS[key] as keyof typeof Feather.glyphMap;
          return (
            <View
              key={key}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.gold + "55",
                },
              ]}
            >
              <Feather name={iconName} size={12} color={colors.gold} />
              <Text
                style={[styles.chipLabel, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {RESOURCE_SHORT_LABELS[key].toUpperCase()}
              </Text>
              <Text
                style={[styles.chipValue, { color: colors.foreground }]}
                allowFontScaling={false}
              >
                {formatResource(key, value)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const ResourceBar = memo(ResourceBarImpl);

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  chipValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    minWidth: 22,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
});
