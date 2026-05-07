import React, { memo } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { Gauges } from "@/context/GameContext";
import {
  GAUGE_LABELS,
  INVERTED_GAUGES,
  gaugeColor,
} from "@/logic/gameEngine";
import { GAUGE_IMAGES } from "@/data/gaugeImages";

// The 5 gauges we surface in the persistent top strip. Picked to give
// the player an at-a-glance read of national health — the "resources"
// of a political simulator.
const STRIP_KEYS: (keyof Gauges)[] = [
  "popularity",
  "economy",
  "security",
  "ecology",
  "debt",
];

interface Props {
  gauges: Gauges;
  prevGauges?: Gauges | null;
}

function ResourceStripImpl({ gauges, prevGauges }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {STRIP_KEYS.map((key) => {
          const value = gauges[key];
          const inverted = INVERTED_GAUGES.has(key);
          const colorValue = inverted ? 100 - value : value;
          const status = gaugeColor(colorValue);
          const tint =
            status === "danger"
              ? colors.danger
              : status === "warning"
                ? colors.warning
                : colors.success;
          const prev = prevGauges ? prevGauges[key] : value;
          const rawDelta = value - prev;
          const delta = Math.round(rawDelta);
          // For inverted gauges (debt), a positive raw delta is BAD,
          // so we flip the arrow color semantics.
          const deltaIsGood = inverted ? delta < 0 : delta > 0;
          const showDelta = Math.abs(delta) >= 1;
          const deltaColor = deltaIsGood ? colors.success : colors.danger;

          return (
            <View
              key={key}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Image
                source={GAUGE_IMAGES[key]}
                style={styles.chipIcon}
                resizeMode="cover"
              />
              <Text
                style={[styles.chipLabel, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {GAUGE_LABELS[key].slice(0, 3).toUpperCase()}
              </Text>
              <Text
                style={[styles.chipValue, { color: tint }]}
                allowFontScaling={false}
              >
                {Math.round(value)}
              </Text>
              {showDelta ? (
                <View style={styles.deltaWrap}>
                  <Feather
                    name={delta > 0 ? "arrow-up" : "arrow-down"}
                    size={9}
                    color={deltaColor}
                  />
                  <Text
                    style={[styles.deltaText, { color: deltaColor }]}
                    allowFontScaling={false}
                  >
                    {Math.abs(delta)}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const ResourceStrip = memo(ResourceStripImpl);

const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  chipIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  chipValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    minWidth: 22,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  deltaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginLeft: 1,
  },
  deltaText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: "700",
  },
});
