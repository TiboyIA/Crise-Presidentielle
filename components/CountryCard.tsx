import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COUNTRIES } from "@/data/countries";
import { Badge } from "@/components/ui/Badge";
import { FONT, PALETTE, RADIUS, STATUS_COLORS } from "@/constants/uiTokens";
import type { CountryId, CountryRelation, RelationStatus } from "@/types/strategy";

interface Props {
  countryId: CountryId;
  relation: CountryRelation;
  onPress: () => void;
}

const STATUS_LABELS: Record<RelationStatus, string> = {
  allied:   "Allié",
  friendly: "Ami",
  neutral:  "Neutre",
  rival:    "Rival",
  hostile:  "Hostile",
};

export function CountryCard({ countryId, relation, onPress }: Props) {
  const country = COUNTRIES[countryId];
  const statusColor = STATUS_COLORS[relation.status];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={["#161b27", "#0d1119"]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[styles.card, { borderColor: statusColor + "55" }]}
      >
        {/* Status accent bar */}
        <View style={[styles.accent, { backgroundColor: statusColor }]} />

        <View style={styles.flagWrap}>
          <Text style={styles.flag}>{country.flag}</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{country.name}</Text>
            <Badge label={STATUS_LABELS[relation.status]} tone={mapStatusToTone(relation.status)} size="xs" outlined />
          </View>
          <Text style={styles.region}>{country.region.toUpperCase()}</Text>

          {/* Power & score row */}
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricKicker}>PUISSANCE</Text>
              <View style={styles.bar}>
                <LinearGradient
                  colors={[PALETTE.crimson, PALETTE.gold]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${country.basePower}%` }]}
                />
              </View>
              <Text style={styles.metricVal}>{country.basePower}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricKicker}>SCORE</Text>
              <Text style={[styles.metricVal, { color: relation.score >= 0 ? PALETTE.success : PALETTE.danger, marginTop: 2 }]}>
                {relation.score > 0 ? "+" : ""}{relation.score}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function mapStatusToTone(s: RelationStatus): "success" | "info" | "neutral" | "warning" | "danger" {
  switch (s) {
    case "allied":   return "success";
    case "friendly": return "info";
    case "neutral":  return "neutral";
    case "rival":    return "warning";
    case "hostile":  return "danger";
  }
}

const styles = StyleSheet.create({
  wrap: { borderRadius: RADIUS.sm, overflow: "hidden" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingRight: 12,
  },
  accent: { width: 3, alignSelf: "stretch" },
  flagWrap: {
    width: 52, height: 52, marginLeft: 8,
    borderRadius: 4, backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    alignItems: "center", justifyContent: "center",
  },
  flag: { fontSize: 28 },
  info: { flex: 1, paddingLeft: 12, paddingVertical: 10, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh, flex: 1 },
  region: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  metrics: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  metric: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },
  metricVal: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },
  bar: { width: 56, height: 3, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
});
