import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Line, Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import type { CountryId, CountryRelation, RelationStatus } from "@/types/strategy";

const REGIONS = ["Europe", "Amériques", "Asie", "Moyen-Orient"];

const MAP_NODES: Partial<Record<CountryId, { x: number; y: number }>> = {
  usa:          { x: 18, y: 40 },
  brazil:       { x: 28, y: 67 },
  uk:           { x: 43, y: 24 },
  germany:      { x: 49, y: 27 },
  france:       { x: 46, y: 31 },
  italy:        { x: 50, y: 37 },
  russia:       { x: 65, y: 18 },
  turkey:       { x: 57, y: 37 },
  israel:       { x: 56, y: 43 },
  saudi_arabia: { x: 59, y: 52 },
  iran:         { x: 62, y: 43 },
  india:        { x: 67, y: 53 },
  china:        { x: 74, y: 37 },
  south_korea:  { x: 80, y: 35 },
  japan:        { x: 82, y: 33 },
};

const STATUS_COLORS: Record<RelationStatus, string> = {
  allied:   "#60D080",
  friendly: "#60CFFF",
  neutral:  "#808090",
  rival:    "#FFA040",
  hostile:  "#FF5060",
};

const STATUS_LABELS: Record<RelationStatus, string> = {
  allied:   "Allié",
  friendly: "Ami",
  neutral:  "Neutre",
  rival:    "Rival",
  hostile:  "Hostile",
};

export default function WorldMapScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state } = useStrategy();
  const { hPad } = useResponsive();
  const [selected, setSelected] = useState<CountryId | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  if (!state) return null;

  const relationMap = Object.fromEntries(state.relations.map((r) => [r.countryId, r]));

  const mapW = width;
  const mapH = Math.round(width * 0.56);

  // Countries with known node positions (excludes player's own country from interaction)
  const allNodeCountries = COUNTRY_LIST.filter(
    (c) => c.id !== state.countryId && MAP_NODES[c.id] && relationMap[c.id],
  );

  const selectedCountry = selected ? COUNTRIES[selected] : null;
  const selectedRelation = selected ? relationMap[selected] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, paddingHorizontal: hPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.back, { color: colors.foreground }]}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Carte Mondiale</Text>
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

      {/* Node map */}
      <View style={[styles.mapContainer, { height: mapH, backgroundColor: "#07090f" }]}>
        {/* SVG grid + circles */}
        <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill}>
          {/* Grid lines */}
          {[15, 30, 45, 60, 75, 90].map((pct) => (
            <Line
              key={`h${pct}`}
              x1={0} y1={(pct / 100) * mapH}
              x2={mapW} y2={(pct / 100) * mapH}
              stroke="#151a28" strokeWidth={1}
            />
          ))}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
            <Line
              key={`v${pct}`}
              x1={(pct / 100) * mapW} y1={0}
              x2={(pct / 100) * mapW} y2={mapH}
              stroke="#151a28" strokeWidth={1}
            />
          ))}

          {/* Country circles */}
          {allNodeCountries.map((c) => {
            const node = MAP_NODES[c.id]!;
            const rel = relationMap[c.id];
            const cx = (node.x / 100) * mapW;
            const cy = (node.y / 100) * mapH;
            const statusColor = STATUS_COLORS[rel.status];
            const dimmed = activeRegion !== null && c.region !== activeRegion;
            return (
              <Circle
                key={c.id}
                cx={cx}
                cy={cy}
                r={selected === c.id ? 14 : 11}
                fill={statusColor + (dimmed ? "40" : "33")}
                stroke={statusColor}
                strokeWidth={dimmed ? 0.5 : 1.5}
                opacity={dimmed ? 0.3 : 1}
              />
            );
          })}
        </Svg>

        {/* Flag emoji nodes (overlaid) */}
        {allNodeCountries.map((c) => {
          const node = MAP_NODES[c.id]!;
          const rel = relationMap[c.id];
          const dimmed = activeRegion !== null && c.region !== activeRegion;
          const cx = (node.x / 100) * mapW;
          const cy = (node.y / 100) * mapH;
          return (
            <Pressable
              key={c.id}
              onPress={() => !dimmed && setSelected(c.id)}
              style={[
                styles.nodeBtn,
                { left: cx - 14, top: cy - 14, opacity: dimmed ? 0.25 : 1 },
              ]}
            >
              <Text style={styles.nodeFlag}>{c.flag}</Text>
            </Pressable>
          );
        })}

        {/* Legend */}
        <View style={styles.legend}>
          {(["allied", "friendly", "neutral", "rival", "hostile"] as RelationStatus[]).map((s) => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[s] }]} />
              <Text style={styles.legendLabel}>{STATUS_LABELS[s]}</Text>
            </View>
          ))}
        </View>
      </View>

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
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[selectedRelation.status] + "22", borderColor: STATUS_COLORS[selectedRelation.status] + "66" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[selectedRelation.status] }]}>
                  {STATUS_LABELS[selectedRelation.status].toUpperCase()}
                </Text>
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
                <Text style={styles.actionBtnText}>Lancer une opération</Text>
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
  mapContainer: { position: "relative", overflow: "hidden" },
  nodeBtn: { position: "absolute", width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  nodeFlag: { fontSize: 16 },
  legend: { position: "absolute", bottom: 8, right: 8, gap: 3 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#555", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetFlag: { fontSize: 40 },
  sheetName: { fontSize: 20, fontFamily: "Inter_700Bold", flex: 1 },
  sheetRegion: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
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
