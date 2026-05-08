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
      <Text style={styles.flag}>{country.flag}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{country.name}</Text>
        <Text style={[styles.region, { color: colors.mutedForeground }]}>{country.region}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
        </View>
        <View style={styles.powerRow}>
          <Text style={[styles.powerIcon]}>⚡</Text>
          <Text style={[styles.powerNum, { color: colors.foreground }]}>{country.basePower}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const RELATION_STYLES: Record<RelationStatus, { label: string; color: string; bg: string; borderColor: string }> = {
  allied: { label: "Allié", color: "#60D080", bg: "#60D08022", borderColor: "#60D08066" },
  friendly: { label: "Ami", color: "#60CFFF", bg: "#60CFFF22", borderColor: "#60CFFF44" },
  neutral: { label: "Neutre", color: "#A0A0A0", bg: "#A0A0A022", borderColor: "#A0A0A044" },
  rival: { label: "Rival", color: "#FFA040", bg: "#FFA04022", borderColor: "#FFA04066" },
  hostile: { label: "Hostile", color: "#FF5060", bg: "#FF506022", borderColor: "#FF506066" },
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  flag: { fontSize: 28 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 13, fontFamily: "Inter_700Bold" },
  region: { fontSize: 11, fontFamily: "Inter_400Regular" },
  right: { alignItems: "flex-end", gap: 4 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  powerRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  powerIcon: { fontSize: 11 },
  powerNum: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
