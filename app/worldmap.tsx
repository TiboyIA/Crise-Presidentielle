import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { CountryCard } from "@/components/CountryCard";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import type { CountryId, CountryRelation } from "@/types/strategy";

const REGIONS = ["Europe", "Amériques", "Asie", "Moyen-Orient"];

export default function WorldMapScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { state } = useStrategy();
  const { hPad } = useResponsive();
  const [selected, setSelected] = useState<CountryId | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  if (!state) return null;

  const relationMap = Object.fromEntries(state.relations.map((r) => [r.countryId, r]));

  const countriesByRegion = REGIONS.map((region) => ({
    region,
    countries: COUNTRY_LIST.filter((c) => c.region === region && c.id !== state.countryId),
  }));

  const selectedCountry = selected ? COUNTRIES[selected] : null;
  const selectedRelation = selected ? relationMap[selected] : null;

  const filteredRegions = activeRegion
    ? countriesByRegion.filter((r) => r.region === activeRegion)
    : countriesByRegion;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, paddingHorizontal: hPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.back, { color: colors.foreground }]}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>🌍 Carte Mondiale</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Region filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionTabs}
      >
        <Pressable
          onPress={() => setActiveRegion(null)}
          style={[styles.regionTab, { backgroundColor: !activeRegion ? colors.primary : colors.muted }]}
        >
          <Text style={[styles.regionTabText, { color: !activeRegion ? "#fff" : colors.foreground }]}>Tous</Text>
        </Pressable>
        {REGIONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setActiveRegion(r === activeRegion ? null : r)}
            style={[styles.regionTab, { backgroundColor: activeRegion === r ? colors.primary : colors.muted }]}
          >
            <Text style={[styles.regionTabText, { color: activeRegion === r ? "#fff" : colors.foreground }]}>{r}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredRegions.map(({ region, countries }) =>
          countries.length === 0 ? null : (
            <View key={region} style={styles.regionSection}>
              <Text style={[styles.regionTitle, { color: colors.mutedForeground }]}>{region.toUpperCase()}</Text>
              {countries.map((country) => {
                const rel = relationMap[country.id];
                if (!rel) return null;
                return (
                  <CountryCard
                    key={country.id}
                    countryId={country.id}
                    relation={rel}
                    onPress={() => setSelected(country.id)}
                  />
                );
              })}
            </View>
          ),
        )}
      </ScrollView>

      {/* Country detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)} />
        {selectedCountry && selectedRelation && (
          <ScrollView
            style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border, maxHeight: height * 0.72 }]}
            contentContainerStyle={{ gap: 12, padding: 20, paddingBottom: insets.bottom + 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetFlag}>{selectedCountry.flag}</Text>
              <View>
                <Text style={[styles.sheetName, { color: colors.foreground }]}>{selectedCountry.name}</Text>
                <Text style={[styles.sheetRegion, { color: colors.mutedForeground }]}>{selectedCountry.region}</Text>
              </View>
            </View>

            <Text style={[styles.sheetDesc, { color: colors.mutedForeground }]}>{selectedCountry.description}</Text>

            <View style={styles.statsGrid}>
              {[
                { label: "Économie", value: selectedCountry.economy },
                { label: "Militaire", value: selectedCountry.military },
                { label: "Cyber", value: selectedCountry.cyber },
                { label: "Diplomatie", value: selectedCountry.diplomacy },
              ].map(({ label, value }) => (
                <View key={label} style={[styles.statCell, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <View style={[styles.statBar, { backgroundColor: colors.muted }]}>
                    <View style={[styles.statFill, { width: `${value}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => {
                  setSelected(null);
                  router.push({ pathname: "/operations", params: { countryId: selectedCountry.id } });
                }}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.actionBtnText}>⚔️ Lancer une opération</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 14, fontFamily: "Inter_600SemiBold", width: 60 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  regionTabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  regionTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  regionTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingTop: 4, gap: 4 },
  regionSection: { gap: 8, marginTop: 8 },
  regionTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#555", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetFlag: { fontSize: 40 },
  sheetName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sheetRegion: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sheetDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { flex: 1, minWidth: "45%", borderRadius: 8, borderWidth: 1, padding: 10, gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  statBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  statFill: { height: "100%", borderRadius: 2 },
  sheetActions: { marginTop: 4 },
  actionBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
