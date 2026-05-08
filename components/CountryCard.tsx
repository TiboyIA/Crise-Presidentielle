import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { COUNTRIES } from "@/data/countries";
import type { CountryId, CountryRelation, RelationStatus } from "@/types/strategy";

interface Props {
  countryId: CountryId;
  relation: CountryRelation;
  onPress: () => void;
}

export function CountryCard({ countryId, relation, onPress }: Props) {
  const colors = useColors();
  const country = COUNTRIES[countryId];
  const statusStyle = RELATION_STYLES[relation.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: statusStyle.borderColor, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* Relation color accent bar */}
      <View style={[styles.accent, { backgroundColor: statusStyle.color }]} />

      <Text style={styles.flag}>{country.flag}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{country.name}</Text>
        <Text style={[styles.region, { color: colors.mutedForeground }]}>{country.region}</Text>
        {/* Power mini bar */}
        <View style={[styles.powerBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.powerFill, { width: `${country.basePower}%`, backgroundColor: statusStyle.color + "99" }]} />
        </View>
      </View>
      <View style={styles.right}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.borderColor }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label.toUpperCase()}</Text>
        </View>
        <Text style={[styles.powerNum, { color: colors.mutedForeground }]}>{country.basePower} pts</Text>
      </View>
    </Pressable>
  );
}

const RELATION_STYLES: Record<RelationStatus, { label: string; color: string; bg: string; borderColor: string }> = {
  allied:   { label: "Allié",   color: "#60D080", bg: "#60D08018", borderColor: "#60D08055" },
  friendly: { label: "Ami",     color: "#60CFFF", bg: "#60CFFF18", borderColor: "#60CFFF44" },
  neutral:  { label: "Neutre",  color: "#8090A0", bg: "#8090A018", borderColor: "#8090A044" },
  rival:    { label: "Rival",   color: "#FFA040", bg: "#FFA04018", borderColor: "#FFA04055" },
  hostile:  { label: "Hostile", color: "#FF5060", bg: "#FF506018", borderColor: "#FF506055" },
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    gap: 10,
  },
  accent: { width: 3, alignSelf: "stretch" },
  flag: { fontSize: 26, paddingLeft: 4 },
  info: { flex: 1, gap: 3, paddingVertical: 12 },
  name: { fontSize: 13, fontFamily: "Inter_700Bold" },
  region: { fontSize: 10, fontFamily: "Inter_400Regular" },
  powerBar: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  powerFill: { height: "100%", borderRadius: 2 },
  right: { alignItems: "flex-end", gap: 5, paddingRight: 12, paddingVertical: 12 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  statusText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  powerNum: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
