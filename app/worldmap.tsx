import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient as SvgGradient, Line, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { COUNTRY_POLYGONS, CONTINENT_POLYGONS } from "@/data/mapWorld";
import { Badge, Panel, PrimaryButton, ScreenHeader, SectionHeader } from "@/components/ui";
import { FONT, PALETTE, RADIUS, STATUS_COLORS } from "@/constants/uiTokens";
import type { CountryId, RelationStatus } from "@/types/strategy";

const REGIONS = ["Europe", "Amériques", "Asie", "Moyen-Orient"];

// Node positions for connection lines (kept for tension/alliance lines)
const MAP_NODES: Partial<Record<CountryId, { x: number; y: number }>> = {
  usa:          { x: 14, y: 38 },
  brazil:       { x: 27, y: 68 },
  uk:           { x: 42, y: 23 },
  germany:      { x: 49, y: 27 },
  france:       { x: 45, y: 32 },
  italy:        { x: 51, y: 38 },
  russia:       { x: 68, y: 18 },
  turkey:       { x: 57, y: 37 },
  israel:       { x: 56, y: 43 },
  saudi_arabia: { x: 59, y: 53 },
  iran:         { x: 63, y: 42 },
  india:        { x: 68, y: 52 },
  china:        { x: 74, y: 36 },
  south_korea:  { x: 80, y: 34 },
  japan:        { x: 83, y: 31 },
};

const STATUS_LABELS: Record<RelationStatus, string> = {
  allied:   "Allié",
  friendly: "Ami",
  neutral:  "Neutre",
  rival:    "Rival",
  hostile:  "Hostile",
};

function statusFill(status: RelationStatus): string {
  switch (status) {
    case "allied":   return STATUS_COLORS.allied + "44";
    case "friendly": return STATUS_COLORS.friendly + "33";
    case "neutral":  return "#ffffff11";
    case "rival":    return STATUS_COLORS.rival + "33";
    case "hostile":  return STATUS_COLORS.hostile + "44";
  }
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

export default function WorldMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state } = useStrategy();
  const { hPad, isLandscape } = useResponsive();
  const [selected, setSelected] = useState<CountryId | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  if (!state) return null;

  const relationMap = useMemo(
    () => Object.fromEntries(state.relations.map((r) => [r.countryId, r])),
    [state.relations],
  );

  // In landscape: map takes left side, detail panel takes right side
  const mapW = isLandscape ? Math.round(width * 0.62) : width;
  const mapH = isLandscape ? height - 90 : Math.round(width * 0.62);
  const detailW = isLandscape ? width - mapW : width;

  const playerNode = MAP_NODES[state.countryId];
  const playerCountry = COUNTRIES[state.countryId];
  const allNodes = COUNTRY_LIST.filter((c) => MAP_NODES[c.id]);
  const enemyNodes = allNodes.filter((c) => c.id !== state.countryId && (relationMap[c.id]?.status === "hostile" || relationMap[c.id]?.status === "rival"));
  const allyNodes = allNodes.filter((c) => c.id !== state.countryId && (relationMap[c.id]?.status === "allied" || relationMap[c.id]?.status === "friendly"));
  const hostileCount = allNodes.filter((c) => c.id !== state.countryId && relationMap[c.id]?.status === "hostile").length;
  const alliedCount = allNodes.filter((c) => c.id !== state.countryId && relationMap[c.id]?.status === "allied").length;

  const selectedCountry = selected ? COUNTRIES[selected] : null;
  const selectedRelation = selected ? relationMap[selected] : null;

  // Scale polygon points from % to actual pixel coords
  function scalePoints(pointsStr: string): string {
    return pointsStr.split(" ").map((pt) => {
      const [x, y] = pt.split(",").map(Number);
      return `${(x / 100) * mapW},${(y / 100) * mapH}`;
    }).join(" ");
  }

  const MapSvg = (
    <View style={[styles.mapContainer, { width: mapW, height: mapH }]}>
      <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="55%" rx="75%" ry="75%">
            <Stop offset="0%" stopColor="#0a1628" stopOpacity={1} />
            <Stop offset="100%" stopColor="#03050a" stopOpacity={1} />
          </RadialGradient>
          <SvgGradient id="influence" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={PALETTE.crimson} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={PALETTE.crimson} stopOpacity={0.04} />
          </SvgGradient>
          <SvgGradient id="alliance" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={STATUS_COLORS.allied} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={STATUS_COLORS.allied} stopOpacity={0.04} />
          </SvgGradient>
        </Defs>

        {/* Ocean background */}
        <Rect x={0} y={0} width={mapW} height={mapH} fill="url(#bg)" />

        {/* Grid lines */}
        {[15, 30, 45, 60, 75, 90].map((pct) => (
          <Line key={`h${pct}`} x1={0} y1={(pct / 100) * mapH} x2={mapW} y2={(pct / 100) * mapH} stroke="#162033" strokeWidth={0.5} strokeDasharray="3,6" />
        ))}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
          <Line key={`v${pct}`} x1={(pct / 100) * mapW} y1={0} x2={(pct / 100) * mapW} y2={mapH} stroke="#162033" strokeWidth={0.5} strokeDasharray="3,6" />
        ))}

        {/* Continent backgrounds (decorative landmass) */}
        {CONTINENT_POLYGONS.map((cont) => (
          <Polygon
            key={cont.id}
            points={scalePoints(cont.points)}
            fill="#0d1e30"
            stroke="#172235"
            strokeWidth={0.8}
          />
        ))}

        {/* Country polygons filled by relation status */}
        {COUNTRY_POLYGONS.map((cp) => {
          const cid = cp.id as CountryId;
          const isPlayer = cid === state.countryId;
          const rel = relationMap[cid];
          const dimmed = activeRegion !== null && COUNTRIES[cid]?.region !== activeRegion;
          const isSelected = selected === cid;

          const fill = isPlayer
            ? PALETTE.gold + "28"
            : rel ? statusFill(rel.status) : "#ffffff08";
          const stroke = isPlayer
            ? PALETTE.gold
            : rel ? STATUS_COLORS[rel.status] : PALETTE.panelEdge;

          return (
            <Polygon
              key={cp.id}
              points={scalePoints(cp.points)}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSelected ? 1.8 : 0.9}
              opacity={dimmed ? 0.3 : 1}
            />
          );
        })}

        {/* Country labels on the polygons */}
        {COUNTRY_POLYGONS.map((cp) => {
          const cid = cp.id as CountryId;
          const dimmed = activeRegion !== null && COUNTRIES[cid]?.region !== activeRegion;
          if (dimmed) return null;
          const lx = (cp.labelX / 100) * mapW;
          const ly = (cp.labelY / 100) * mapH;
          const country = COUNTRIES[cid];
          return (
            <SvgText
              key={`lbl-${cp.id}`}
              x={lx}
              y={ly}
              fill={cid === state.countryId ? PALETTE.gold : "#8899bb"}
              fontSize={Math.max(7, mapW * 0.014)}
              fontWeight="600"
              textAnchor="middle"
              opacity={0.9}
            >
              {country?.flag ?? ""}
            </SvgText>
          );
        })}

        {/* Tension lines from player → hostiles */}
        {playerNode && enemyNodes.map((c) => {
          const node = MAP_NODES[c.id]!;
          const dimmed = activeRegion !== null && c.region !== activeRegion;
          if (dimmed) return null;
          return (
            <Line
              key={`tension-${c.id}`}
              x1={(playerNode.x / 100) * mapW} y1={(playerNode.y / 100) * mapH}
              x2={(node.x / 100) * mapW} y2={(node.y / 100) * mapH}
              stroke={STATUS_COLORS.hostile} strokeWidth={0.8}
              strokeDasharray="5,5" strokeOpacity={0.4}
            />
          );
        })}

        {/* Alliance lines */}
        {playerNode && allyNodes.map((c) => {
          const node = MAP_NODES[c.id]!;
          const dimmed = activeRegion !== null && c.region !== activeRegion;
          if (dimmed) return null;
          return (
            <Line
              key={`ally-${c.id}`}
              x1={(playerNode.x / 100) * mapW} y1={(playerNode.y / 100) * mapH}
              x2={(node.x / 100) * mapW} y2={(node.y / 100) * mapH}
              stroke={STATUS_COLORS.allied} strokeWidth={0.7}
              strokeOpacity={0.3}
            />
          );
        })}
      </Svg>

      {/* Pressable flag overlays on top of SVG */}
      {COUNTRY_POLYGONS.map((cp) => {
        const cid = cp.id as CountryId;
        const rel = relationMap[cid];
        const isPlayer = cid === state.countryId;
        if (!rel && !isPlayer) return null;
        const dimmed = activeRegion !== null && COUNTRIES[cid]?.region !== activeRegion;
        const cx = (cp.labelX / 100) * mapW;
        const cy = (cp.labelY / 100) * mapH;
        return (
          <Pressable
            key={cid}
            onPress={() => !dimmed && !isPlayer && setSelected(cid)}
            disabled={isPlayer || dimmed}
            style={({ pressed }) => [
              styles.nodeBtn,
              { left: cx - 14, top: cy - 14, opacity: dimmed ? 0.2 : pressed ? 0.7 : 1 },
            ]}
          />
        );
      })}

      {/* Frame label */}
      <View style={styles.frameLabel} pointerEvents="none">
        <Text style={styles.frameKicker}>THÉÂTRE MONDIAL · STRATÉGIQUE</Text>
        <Text style={styles.frameTime}>LIVE · {playerCountry.name.toUpperCase()}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend} pointerEvents="none">
        {(["allied", "friendly", "neutral", "rival", "hostile"] as RelationStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[s] }]} />
            <Text style={styles.legendLabel}>{STATUS_LABELS[s]}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Detail panel content (shared between modal and side panel)
  const DetailContent = selectedCountry && selectedRelation ? (
    <ScrollView contentContainerStyle={[styles.detailScroll, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.dossierHeader}>
        <View style={styles.dossierFlagWrap}>
          <Text style={styles.dossierFlag}>{selectedCountry.flag}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dossierKicker}>DOSSIER DE RENSEIGNEMENT</Text>
          <Text style={styles.dossierName}>{selectedCountry.name}</Text>
          <Text style={styles.dossierRegion}>{selectedCountry.region.toUpperCase()}</Text>
        </View>
        <Badge label={STATUS_LABELS[selectedRelation.status]} tone={mapStatusToTone(selectedRelation.status)} size="sm" outlined />
      </View>

      <Panel style={{ padding: 12, marginTop: 10 }}>
        <Text style={styles.sectionKicker}>SYNTHÈSE</Text>
        <Text style={styles.dossierDesc}>{selectedCountry.description}</Text>
      </Panel>

      <Panel style={{ padding: 12, marginTop: 8 }}>
        <Text style={styles.sectionKicker}>SCORE DIPLOMATIQUE</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreVal}>{selectedRelation.score > 0 ? "+" : ""}{selectedRelation.score}</Text>
          <View style={styles.scoreTrack}>
            <View style={[styles.scoreFill, { width: `${Math.min(100, Math.abs(selectedRelation.score))}%`, backgroundColor: selectedRelation.score >= 0 ? STATUS_COLORS.allied : STATUS_COLORS.hostile, alignSelf: selectedRelation.score >= 0 ? "flex-start" : "flex-end" }]} />
          </View>
        </View>
      </Panel>

      <Text style={[styles.sectionKicker, { marginTop: 12, marginBottom: 6 }]}>FORCES NATIONALES</Text>
      <View style={styles.statsGrid}>
        {([
          { label: "Économie",  value: selectedCountry.economy },
          { label: "Militaire", value: selectedCountry.military },
          { label: "Cyber",     value: selectedCountry.cyber },
          { label: "Diplomatie",value: selectedCountry.diplomacy },
        ]).map(({ label, value }) => (
          <Panel key={label} style={styles.statCell}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
            <View style={styles.statBar}>
              <LinearGradient colors={[PALETTE.crimson, PALETTE.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.statFill, { width: `${value}%` }]} />
            </View>
          </Panel>
        ))}
      </View>

      <View style={{ marginTop: 12 }}>
        <PrimaryButton
          label="Lancer une opération"
          variant="primary"
          size="lg"
          onPress={() => {
            setSelected(null);
            router.push({ pathname: "/operations", params: { countryId: selectedCountry.id } });
          }}
        />
      </View>
    </ScrollView>
  ) : (
    <View style={styles.emptyDetail}>
      <MaterialCommunityIcons name="crosshairs-gps" size={28} color={PALETTE.textLow} />
      <Text style={styles.emptyDetailText}>Sélectionnez un pays{"\n"}pour ouvrir son dossier</Text>
    </View>
  );

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.regionTabs, { paddingHorizontal: hPad }]}>
        <RegionTab label="Tous" active={!activeRegion} onPress={() => setActiveRegion(null)} />
        {REGIONS.map((r) => (
          <RegionTab key={r} label={r} active={activeRegion === r} onPress={() => setActiveRegion(r === activeRegion ? null : r)} />
        ))}
      </ScrollView>

      {/* LANDSCAPE: side-by-side layout */}
      {isLandscape ? (
        <View style={styles.landscapeRow}>
          {MapSvg}
          <View style={[styles.detailSide, { width: detailW }]}>
            <LinearGradient colors={["#0f1420", "#080b12"]} style={{ flex: 1, padding: 14 }}>
              {DetailContent}
            </LinearGradient>
          </View>
        </View>
      ) : (
        <>
          {MapSvg}
          <View style={[styles.hint, { paddingHorizontal: hPad }]}>
            <Text style={styles.hintText}>Touchez un pays pour ouvrir son dossier de renseignement.</Text>
          </View>

          {/* Portrait modal */}
          <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
            <Pressable style={styles.overlay} onPress={() => setSelected(null)} />
            {selectedCountry && selectedRelation && (
              <View style={[styles.sheetWrap, { maxHeight: height * 0.78 }]}>
                <LinearGradient colors={["#161b27", "#0a0d14"]} style={styles.sheet}>
                  <View style={styles.sheetHandle} />
                  {DetailContent}
                </LinearGradient>
              </View>
            )}
          </Modal>
        </>
      )}
    </View>
  );
}

function RegionTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.regionTab,
        { backgroundColor: active ? PALETTE.crimson + "33" : "transparent", borderColor: active ? PALETTE.crimson : PALETTE.panelEdge, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.regionTabText, { color: active ? PALETTE.textHigh : PALETTE.textMid }]}>{label}</Text>
    </Pressable>
  );
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
  nodeBtn: { position: "absolute", width: 28, height: 28 },
  frameLabel: { position: "absolute", top: 8, left: 10 },
  frameKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.8 },
  frameTime: { fontSize: 8, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 1, marginTop: 2 },
  legend: { position: "absolute", bottom: 8, right: 10, gap: 3 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 8, fontFamily: FONT.med, color: PALETTE.textMid, letterSpacing: 0.4 },

  landscapeRow: { flex: 1, flexDirection: "row" },
  detailSide: { borderLeftWidth: 1, borderColor: PALETTE.panelEdge },

  detailScroll: { gap: 0 },
  emptyDetail: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.5 },
  emptyDetailText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 18 },

  hint: { paddingVertical: 10 },
  hintText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  sheetWrap: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, overflow: "hidden" },
  sheet: { padding: 18, paddingTop: 8 },
  sheetHandle: { width: 40, height: 4, backgroundColor: PALETTE.panelEdge, borderRadius: 2, alignSelf: "center", marginBottom: 12 },

  dossierHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  dossierFlagWrap: { width: 52, height: 52, borderRadius: 6, backgroundColor: PALETTE.panelHi, borderWidth: 1, borderColor: PALETTE.goldDim + "55", alignItems: "center", justifyContent: "center" },
  dossierFlag: { fontSize: 30 },
  dossierKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2.5 },
  dossierName: { fontSize: 18, fontFamily: FONT.bold, color: PALETTE.textHigh, marginTop: 2 },
  dossierRegion: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 1.5, marginTop: 1 },

  sectionKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2, marginBottom: 6 },
  dossierDesc: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textHigh, lineHeight: 17 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreVal: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.textHigh, minWidth: 50 },
  scoreTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden", flexDirection: "row" },
  scoreFill: { height: "100%", borderRadius: 3 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { flex: 1, minWidth: "44%", padding: 10, gap: 4 },
  statValue: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.textHigh },
  statLabel: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  statBar: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden", marginTop: 4 },
  statFill: { height: "100%", borderRadius: 2 },
});
