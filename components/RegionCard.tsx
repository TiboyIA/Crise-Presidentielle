import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import {
  Region,
  leaningColor,
  leaningLabel,
  tensionLevel,
} from "@/data/regions";
import { REGION_BANNERS } from "@/data/regionImages";

interface Props {
  region: Region;
}

function RegionCardImpl({ region }: Props) {
  const colors = useColors();
  const level = tensionLevel(region.tension);
  const tone = colors[level.color];
  const banner = REGION_BANNERS[region.id];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.bannerWrap}>
        <Image source={banner} style={styles.banner} resizeMode="cover" />
        <View style={styles.bannerOverlay} />
        <View style={styles.bannerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerName}>{region.name}</Text>
            <Text style={styles.bannerMeta}>
              {region.capital} · {region.population} hab.
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: tone }]}>
            <Text style={styles.levelText}>{level.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tensionRow}>
          <View style={[styles.bar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.max(2, region.tension)}%`, backgroundColor: tone },
              ]}
            />
          </View>
          <Text style={[styles.tensionValue, { color: colors.foreground }]}>
            {Math.round(region.tension)}
          </Text>
        </View>

        <View style={styles.leaningRow}>
          <View
            style={[
              styles.leaningDot,
              { backgroundColor: leaningColor(region.leaning) },
            ]}
          />
          <Text style={[styles.leaningLabel, { color: colors.foreground }]}>
            {leaningLabel(region.leaning)}
          </Text>
          <Text style={[styles.leaningSource, { color: colors.mutedForeground }]}>
            Municipales 2026
          </Text>
        </View>

        <Text style={[styles.dominant, { color: colors.mutedForeground }]}>
          {region.dominant}
        </Text>
        <Text style={[styles.insight, { color: colors.mutedForeground }]}>
          {region.insight}
        </Text>
      </View>
    </View>
  );
}

export const RegionCard = memo(RegionCardImpl);

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  bannerWrap: {
    width: "100%",
    height: 110,
    position: "relative",
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  bannerContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  bannerName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  bannerMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  body: {
    padding: 14,
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  levelText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  tensionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  tensionValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    width: 28,
    textAlign: "right",
  },
  leaningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  leaningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  leaningLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  leaningSource: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginLeft: "auto",
    letterSpacing: 0.5,
  },
  dominant: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  insight: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 15,
    marginTop: 2,
  },
});
