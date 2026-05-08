import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Line, RadialGradient, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { Badge, Panel, PrimaryButton, ScreenHeader, SectionHeader } from "@/components/ui";
import { FONT, PALETTE, RADIUS, SPACING, STATUS_COLORS } from "@/constants/uiTokens";
import type { CountryId, RelationStatus } from "@/types/strategy";

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

const STATUS_LABELS: Record<RelationStatus, string> = {
  allied:   "Allié",
  friendly: "Ami",
  neutral:  "Neutre",
  rival:    "Rival",
  hostile:  "Hostile",
};

export default function WorldMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state } = useStrategy();
  const { hPad } = useResponsive();
  const [selected, setSelected] = useState<CountryId | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  if (!state) return null;

  const relationMap = useMemo(
    () => Object.fromEntries(state.relations.map((r) => [r.countryId, r])),
    [state.relations],
  );

  const mapW = width;
  const mapH = Math.round(width * 0.6);

  const playerNode = MAP_NODES[state.countryId];
  const playerCountry = COUNTRIES[state.countryId];

  const allNodes = COUNTRY_LIST.filter((c) => MAP_NODES[c.id]);
  const enemyNodes = allNodes.filter(
    (c) => c.id !== state.countryId && (relationMap[c.id]?.status === "hostile" || relationMap[c.id]?.status === "rival"),
  );
  const allyNodes = allNodes.filter(
    (c) => c.id !== state.countryId && (relationMap[c.id]?.status === "allied" || relationMap[c.id]?.status === "friendly"),
  );

  // Counters for the intel header
  const hostileCount = allNodes.filter((c) => c.id !== state.countryId && relationMap[c.id]?.status === "hostile").length;
  const alliedCount = allNodes.filter((c) => c.id !== state.countryId && relationMap[c.id]?.status === "allied").length;

  const selectedCountry = selected ? COUNTRIES[selected] : null;
  const selectedRelation = selected ? relationMap[selected] : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Salle de crise" kicker="THÉÂTRE MONDIAL" />

      {/* Intel strip */}
      <View style={[styles.intelStrip, { paddingHorizontal: hPad }]}>
        <View style={styles.intelChip}>
          <View style={[styles.intelDot, { backgroundColor: STATUS_COLORS.allied }]} />
          <Text style={styles.intelText}>{alliedCount} alliés</Text>
        </View>
        <View style={styles.intelChip}>
          <View style={[styles.intelDot, { backgroundColor: STATUS_COLORS.hostile }]} />
          <Text style={styles.intelText}>{hostileCount} hostiles</Text>
        </View>
        <View style={styles.intelChip}>
          <Text style={[styles.intelText, { color: PALETTE.gold }]}>{state.relations.length} dossiers</Text>
        </View>
      </View>

      {/* Region filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.regionTabs, { paddingHorizontal: hPad }]}
      >
        <RegionTab label="Tous" active={!activeRegion} onPress={() => setActiveRegion(null)} />
        {REGIONS.map((r) => (
          <RegionTab key={r} label={r} active={activeRegion === r} onPress={() => setActiveRegion(r === activeRegion ? null : r)} />
        ))}
      </ScrollView>

      {/* Map */}
      <View style={[styles.mapContainer, { height: mapH }]}>
        <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="bg" cx="50%" cy="55%" rx="70%" ry="70%">
              <Stop offset="0%" stopColor="#0c1729" stopOpacity={1} />
              <Stop offset="100%" stopColor="#04060a" stopOpacity={1} />
            </RadialGradient>
            <SvgGradient id="influence" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={PALETTE.crimson} stopOpacity={0.5} />
              <Stop offset="100%" stopColor={PALETTE.crimson} stopOpacity={0.05} />
            </SvgGradient>
            <SvgGradient id="alliance" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={STATUS_COLORS.allied} stopOpacity={0.5} />
              <Stop offset="100%" stopColor={STATUS_COLORS.allied} stopOpacity={0.05} />
            </SvgGradient>
          </Defs>

          {/* Background */}
          <Rect x={0} y={0} width={mapW} height={mapH} fill="url(#bg)" />

          {/* Latitude/longitude grid */}
          {[15, 30, 45, 60, 75, 90].map((pct) => (
            <Line key={`h${pct}`} x1={0} y1={(pct / 100) * mapH} x2={mapW} y2={(pct / 100) * mapH} stroke="#1a2538" strokeWidth={0.5} strokeDasharray="2,4" />
          ))}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
            <Line key={`v${pct}`} x1={(pct / 100) * mapW} y1={0} x2={(pct / 100) * mapW} y2={mapH} stroke="#1a2538" strokeWidth={0.5} strokeDasharray="2,4" />
          ))}

          {/* Influence lines from player → hostiles (tension lines) */}
          {playerNode && enemyNodes.map((c) => {
            const node = MAP_NODES[c.id]!;
            const dimmed = activeRegion !== null && c.region !== activeRegion;
            if (dimmed) return null;
            return (
              <Line
                key={`influence-${c.id}`}
                x1={(playerNode.x / 100) * mapW}
                y1={(playerNode.y / 100) * mapH}
                x2={(node.x / 100) * mapW}
                y2={(node.y / 100) * mapH}
                stroke={STATUS_COLORS.hostile}
                strokeWidth={0.7}
                strokeDasharray="4,4"
                strokeOpacity={0.45}
              />
            );
          })}

          {/* Alliance lines (solid faint) */}
          {playerNode && allyNodes.map((c) => {
            const node = MAP_NODES[c.id]!;
            const dimmed = activeRegion !== null && c.region !== activeRegion;
            if (dimmed) return null;
            return (
              <Line
                key={`ally-${c.id}`}
                x1={(playerNode.x / 100) * mapW}
                y1={(playerNode.y / 100) * mapH}
                x2={(node.x / 100) * mapW}
                y2={(node.y / 100) * mapH}
                stroke={STATUS_COLORS.allied}
                strokeWidth={0.6}
                strokeOpacity={0.35}
              />
            );
          })}

          {/* Country circles */}
          {allNodes.map((c) => {
            if (c.id === state.countryId) return null;
            const node = MAP_NODES[c.id]!;
            const rel = relationMap[c.id];
            if (!rel) return null;
            const cx = (node.x / 100) * mapW;
            const cy = (node.y / 100) * mapH;
            const statusColor = STATUS_COLORS[rel.status];
            const dimmed = activeRegion !== null && c.region !== activeRegion;
            const isSelected = selected === c.id;
            return (
              <React.Fragment key={c.id}>
                {/* glow halo */}
                <Circle cx={cx} cy={cy} r={isSelected ? 18 : 14} fill={statusColor} opacity={dimmed ? 0.06 : 0.18} />
                <Circle
                  cx={cx} cy={cy}
                  r={isSelected ? 12 : 10}
                  fill={statusColor + (dimmed ? "30" : "55")}
                  stroke={statusColor}
                  strokeWidth={isSelected ? 2 : 1.2}
                  opacity={dimmed ? 0.35 : 1}
                />
              </React.Fragment>
            );
          })}

          {/* Player home node — gold star */}
          {playerNode && (
            <>
              <Circle cx={(playerNode.x / 100) * mapW} cy={(playerNode.y / 100) * mapH} r={20} fill={PALETTE.gold} opacity={0.18} />
              <Circle cx={(playerNode.x / 100) * mapW} cy={(playerNode.y / 100) * mapH} r={14} fill={PALETTE.gold} opacity={0.35} stroke={PALETTE.goldGlow} strokeWidth={1.5} />
            </>
          )}
        </Svg>

        {/* Pressable flag overlays */}
        {allNodes.map((c) => {
          const node = MAP_NODES[c.id]!;
          const rel = relationMap[c.id];
          const isPlayer = c.id === state.countryId;
          if (!rel && !isPlayer) return null;
          const dimmed = activeRegion !== null && c.region !== activeRegion;
          const cx = (node.x / 100) * mapW;
          const cy = (node.y / 100) * mapH;
          return (
            <Pressable
              key={c.id}
              onPress={() => !dimmed && !isPlayer && setSelected(c.id)}
              disabled={isPlayer || dimmed}
              style={({ pressed }) => [
                styles.nodeBtn,
                {
                  left: cx - 16,
                  top: cy - 16,
                  opacity: dimmed ? 0.25 : 1,
                  transform: [{ scale: pressed && !isPlayer ? 0.92 : 1 }],
                },
              ]}
            >
              <Text style={styles.nodeFlag}>{c.flag}</Text>
            </Pressable>
          );
        })}

        {/* Top-left frame label */}
        <View style={styles.frameLabel}>
          <Text style={styles.frameKicker}>SECTEUR · GLOBAL</Text>
          <Text style={styles.frameTime}>LIVE · {playerCountry.name.toUpperCase()}</Text>
        </View>

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

      {/* Hint */}
      <View style={[styles.hint, { paddingHorizontal: hPad }]}>
        <Text style={styles.hintText}>Sélectionnez un pays sur la carte pour ouvrir son dossier de renseignement.</Text>
      </View>

      {/* Country dossier modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)} />
        {selectedCountry && selectedRelation && (
          <View style={[styles.sheetWrap, { maxHeight: height * 0.78 }]}>
            <LinearGradient colors={["#161b27", "#0a0d14"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheet}>
              <View style={styles.sheetHandle} />

              {/* Dossier header */}
              <View style={styles.dossierHeader}>
                <View style={styles.dossierFlagWrap}>
                  <Text style={styles.dossierFlag}>{selectedCountry.flag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dossierKicker}>DOSSIER DE RENSEIGNEMENT</Text>
                  <Text style={styles.dossierName}>{selectedCountry.name}</Text>
                  <Text style={styles.dossierRegion}>{selectedCountry.region.toUpperCase()}</Text>
                </View>
                <Badge label={STATUS_LABELS[selectedRelation.status]} tone={mapStatusToTone(selectedRelation.status)} size="md" outlined />
              </View>

              <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
                {/* Description */}
                <Panel style={{ padding: 12 }}>
                  <Text style={styles.sectionKicker}>SYNTHÈSE</Text>
                  <Text style={styles.dossierDesc}>{selectedCountry.description}</Text>
                </Panel>

                {/* Relation score */}
                <Panel style={{ padding: 12 }}>
                  <Text style={styles.sectionKicker}>SCORE DIPLOMATIQUE</Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreVal}>
                      {selectedRelation.score > 0 ? "+" : ""}{selectedRelation.score}
                    </Text>
                    <View style={styles.scoreTrack}>
                      <View
                        style={[
                          styles.scoreFill,
                          {
                            width: `${Math.min(100, Math.abs(selectedRelation.score))}%`,
                            backgroundColor: selectedRelation.score >= 0 ? STATUS_COLORS.allied : STATUS_COLORS.hostile,
                            alignSelf: selectedRelation.score >= 0 ? "flex-start" : "flex-end",
                          },
                        ]}
                      />
                    </View>
                  </View>
                </Panel>

                {/* Stats */}
                <Text style={styles.sectionKicker}>FORCES NATIONALES</Text>
                <View style={styles.statsGrid}>
                  {[
                    { label: "Économie", value: selectedCountry.economy },
                    { label: "Militaire", value: selectedCountry.military },
                    { label: "Cyber", value: selectedCountry.cyber },
                    { label: "Diplomatie", value: selectedCountry.diplomacy },
                  ].map(({ label, value }) => (
                    <Panel key={label} style={styles.statCell}>
                      <Text style={styles.statValue}>{value}</Text>
                      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
                      <View style={styles.statBar}>
                        <LinearGradient
                          colors={[PALETTE.crimson, PALETTE.gold]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[styles.statFill, { width: `${value}%` }]}
                        />
                      </View>
                    </Panel>
                  ))}
                </View>

                {/* Action */}
                <PrimaryButton
                  label="Lancer une opération"
                  variant="primary"
                  size="lg"
                  onPress={() => {
                    setSelected(null);
                    router.push({ pathname: "/operations", params: { countryId: selectedCountry.id } });
                  }}
                />
              </ScrollView>
            </LinearGradient>
          </View>
        )}
      </Modal>
    </View>
  );
}

function RegionTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.regionTab,
        {
          backgroundColor: active ? PALETTE.crimson + "33" : "transparent",
          borderColor: active ? PALETTE.crimson : PALETTE.panelEdge,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.regionTabText, { color: active ? PALETTE.textHigh : PALETTE.textMid }]}>{label}</Text>
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
  container: { flex: 1, backgroundColor: PALETTE.ink },
  intelStrip: { flexDirection: "row", gap: 10, paddingVertical: 8 },
  intelChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  intelDot: { width: 6, height: 6, borderRadius: 3 },
  intelText: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 0.5 },
  regionTabs: { gap: 6, paddingBottom: 4 },
  regionTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  regionTabText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1 },

  mapContainer: { position: "relative", overflow: "hidden", borderTopWidth: 1, borderBottomWidth: 1, borderColor: PALETTE.panelEdge },
  nodeBtn: { position: "absolute", width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  nodeFlag: { fontSize: 17 },
  frameLabel: { position: "absolute", top: 8, left: 10 },
  frameKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  frameTime: { fontSize: 9, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 1, marginTop: 2 },
  legend: { position: "absolute", bottom: 8, right: 10, gap: 3 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textMid, letterSpacing: 0.5 },

  hint: { paddingVertical: 12 },
  hintText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  sheetWrap: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, overflow: "hidden" },
  sheet: { padding: 18, paddingTop: 8 },
  sheetHandle: { width: 40, height: 4, backgroundColor: PALETTE.panelEdge, borderRadius: 2, alignSelf: "center", marginBottom: 12 },

  dossierHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  dossierFlagWrap: {
    width: 56, height: 56, borderRadius: 6,
    backgroundColor: PALETTE.panelHi,
    borderWidth: 1, borderColor: PALETTE.goldDim + "55",
    alignItems: "center", justifyContent: "center",
  },
  dossierFlag: { fontSize: 32 },
  dossierKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2.5 },
  dossierName: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.textHigh, marginTop: 2 },
  dossierRegion: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 1.5, marginTop: 1 },

  sectionKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2, marginBottom: 6 },
  dossierDesc: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textHigh, lineHeight: 17 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreVal: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.textHigh, minWidth: 50 },
  scoreTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden", flexDirection: "row" },
  scoreFill: { height: "100%", borderRadius: 3 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { flex: 1, minWidth: "45%", padding: 10, gap: 4 },
  statValue: { fontSize: 22, fontFamily: FONT.bold, color: PALETTE.textHigh },
  statLabel: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  statBar: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden", marginTop: 4 },
  statFill: { height: "100%", borderRadius: 2 },
});
