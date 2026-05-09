import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { MAP_COUNTRY_SHAPES, MAP_COUNTRY_SHAPES_BY_ID, CONTINENTS_V2 } from "@/data/mapGeo";
import {
  computeCountryRender,
  generateHotspots,
  getHotspotColor,
  MAP_LAYERS,
} from "@/logic/hotspotEngine";
import type { MapLayerId } from "@/logic/hotspotEngine";
import { OPERATIONS, canLaunchOperation } from "@/logic/operationEngine";
import { Badge, Panel, PrimaryButton, ScreenHeader } from "@/components/ui";
import { FONT, PALETTE, RADIUS, STATUS_COLORS } from "@/constants/uiTokens";
import type { CountryId, OperationType, RelationStatus } from "@/types/strategy";

const REGIONS = ["Europe", "Amériques", "Asie", "Moyen-Orient"];

const STATUS_LABELS: Record<RelationStatus, string> = {
  allied:   "Allié",
  friendly: "Ami",
  neutral:  "Neutre",
  rival:    "Rival",
  hostile:  "Hostile",
};

function mapStatusToTone(s: RelationStatus): "success" | "info" | "neutral" | "warning" | "danger" {
  switch (s) {
    case "allied":   return "success";
    case "friendly": return "info";
    case "neutral":  return "neutral";
    case "rival":    return "warning";
    case "hostile":  return "danger";
  }
}

// Quick actions surfaced directly in the dossier
const QUICK_ACTIONS: { type: OperationType; icon: string; label: string }[] = [
  { type: "espionage",          icon: "eye-outline",          label: "Espionner" },
  { type: "sign_treaty",        icon: "handshake-outline",    label: "Traité" },
  { type: "sanction",           icon: "block-helper",         label: "Sanction" },
  { type: "cyber_attack",       icon: "lan-disconnect",       label: "Cyber" },
  { type: "influence_campaign", icon: "bullhorn-outline",     label: "Influence" },
  { type: "military_operation", icon: "sword-cross",          label: "Opération" },
];

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function WorldMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state } = useStrategy();
  const { hPad, isLandscape } = useResponsive();
  const [selected, setSelected] = useState<CountryId | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("diplomacy");
  const [showHotspots, setShowHotspots] = useState(true);

  if (!state) return null;

  const relationMap = useMemo(
    () => Object.fromEntries(state.relations.map((r) => [r.countryId, r])),
    [state.relations],
  );

  const hotspots = useMemo(() => generateHotspots(state), [state]);

  // Layout: in landscape map takes ~62%, dossier takes the rest.
  const mapW = isLandscape ? Math.round(width * 0.62) : width;
  const mapH = isLandscape ? height - 110 : Math.round(width * 0.62);
  const detailW = isLandscape ? width - mapW : width;

  const playerShape = MAP_COUNTRY_SHAPES_BY_ID[state.countryId];
  const playerCountry = COUNTRIES[state.countryId];

  // Tally counters for the intel strip
  const allRelations = state.relations;
  const hostileCount = allRelations.filter((r) => r.status === "hostile").length;
  const alliedCount  = allRelations.filter((r) => r.status === "allied").length;
  const rivalCount   = allRelations.filter((r) => r.status === "rival").length;

  const enemyShapes = COUNTRY_LIST
    .map((c) => MAP_COUNTRY_SHAPES_BY_ID[c.id])
    .filter((s): s is NonNullable<typeof s> =>
      !!s && s.countryId !== state.countryId &&
      (relationMap[s.countryId]?.status === "hostile" || relationMap[s.countryId]?.status === "rival"),
    );
  const allyShapes = COUNTRY_LIST
    .map((c) => MAP_COUNTRY_SHAPES_BY_ID[c.id])
    .filter((s): s is NonNullable<typeof s> =>
      !!s && s.countryId !== state.countryId &&
      (relationMap[s.countryId]?.status === "allied" || relationMap[s.countryId]?.status === "friendly"),
    );

  const selectedCountry  = selected ? COUNTRIES[selected] : null;
  const selectedRelation = selected ? relationMap[selected] : null;
  const selectedShape    = selected ? MAP_COUNTRY_SHAPES_BY_ID[selected] : null;

  // ── Path scaling helpers ─────────────────────────────────────────────
  // % coords → absolute pixel coords, applied lazily via SVG transform.
  const pctToPxX = (pct: number) => (pct / 100) * mapW;
  const pctToPxY = (pct: number) => (pct / 100) * mapH;

  // Scale a "M x,y L x,y Q x,y x,y ..." path string from % to pixels.
  function scalePath(path: string): string {
    return path.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_m, x: string, y: string) => {
      return `${pctToPxX(parseFloat(x))},${pctToPxY(parseFloat(y))}`;
    });
  }

  // ── Country render computation per layer ────────────────────────────
  function renderForCountry(cid: CountryId) {
    const isPlayer = cid === state!.countryId;
    const country = COUNTRIES[cid];
    const rel = relationMap[cid];
    return computeCountryRender(
      activeLayer,
      isPlayer,
      country,
      rel?.status,
      rel?.threatLevel ?? 0,
    );
  }

  // ── MAP SVG ──────────────────────────────────────────────────────────
  const MapSvg = (
    <View style={[styles.mapContainer, { width: mapW, height: mapH }]}>
      <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="ocean" cx="50%" cy="50%" rx="80%" ry="80%">
            <Stop offset="0%"   stopColor="#0c1a30" stopOpacity={1} />
            <Stop offset="60%"  stopColor="#070d18" stopOpacity={1} />
            <Stop offset="100%" stopColor="#03050a" stopOpacity={1} />
          </RadialGradient>
          <SvgGradient id="alliance-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%"   stopColor={STATUS_COLORS.allied} stopOpacity={0.7} />
            <Stop offset="100%" stopColor={STATUS_COLORS.allied} stopOpacity={0.05} />
          </SvgGradient>
          <SvgGradient id="tension-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%"   stopColor={STATUS_COLORS.hostile} stopOpacity={0.7} />
            <Stop offset="100%" stopColor={STATUS_COLORS.hostile} stopOpacity={0.05} />
          </SvgGradient>
          <RadialGradient id="player-glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%"   stopColor={PALETTE.gold} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Ocean background */}
        <Rect x={0} y={0} width={mapW} height={mapH} fill="url(#ocean)" />

        {/* Faint strategic grid */}
        {[15, 30, 45, 60, 75, 90].map((pct) => (
          <Line key={`h${pct}`} x1={0} y1={(pct / 100) * mapH} x2={mapW} y2={(pct / 100) * mapH}
            stroke="#162033" strokeWidth={0.4} strokeDasharray="3,8" opacity={0.55} />
        ))}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
          <Line key={`v${pct}`} x1={(pct / 100) * mapW} y1={0} x2={(pct / 100) * mapW} y2={mapH}
            stroke="#162033" strokeWidth={0.4} strokeDasharray="3,8" opacity={0.55} />
        ))}

        {/* Continents (decorative landmasses) */}
        {CONTINENTS_V2.map((cont) => (
          <Path key={cont.id} d={scalePath(cont.path)}
            fill="#0d1f33" stroke="#19283e" strokeWidth={0.6} opacity={0.85} />
        ))}

        {/* Player glow (radial halo) */}
        {playerShape && (
          <Circle
            cx={pctToPxX(playerShape.centerX)}
            cy={pctToPxY(playerShape.centerY)}
            r={Math.max(28, mapW * 0.05)}
            fill="url(#player-glow)"
          />
        )}

        {/* Country shapes — V2 paths */}
        <G>
          {MAP_COUNTRY_SHAPES.map((shape) => {
            const cid = shape.countryId;
            const country = COUNTRIES[cid];
            const dimmed = activeRegion !== null && country?.region !== activeRegion;
            const isSelected = selected === cid;
            const r = renderForCountry(cid);

            return (
              <Path
                key={shape.id}
                d={scalePath(shape.path!)}
                fill={r.fill}
                stroke={r.stroke}
                strokeWidth={isSelected ? 2 : cid === state.countryId ? 1.6 : 0.9}
                opacity={dimmed ? 0.22 : 1}
              />
            );
          })}
        </G>

        {/* Selected country glow ring */}
        {selectedShape && (
          <Circle
            cx={pctToPxX(selectedShape.centerX)}
            cy={pctToPxY(selectedShape.centerY)}
            r={Math.max(20, mapW * 0.035)}
            fill="none"
            stroke={PALETTE.gold}
            strokeWidth={1.2}
            strokeDasharray="3,4"
            opacity={0.85}
          />
        )}

        {/* Country flags as labels */}
        {MAP_COUNTRY_SHAPES.map((shape) => {
          const cid = shape.countryId;
          const dimmed = activeRegion !== null && COUNTRIES[cid]?.region !== activeRegion;
          if (dimmed) return null;
          return (
            <SvgText
              key={`lbl-${shape.id}`}
              x={pctToPxX(shape.labelX)}
              y={pctToPxY(shape.labelY)}
              fill="#aeb9d4"
              fontSize={Math.max(8, mapW * 0.014)}
              fontWeight="700"
              textAnchor="middle"
              opacity={0.95}
            >
              {COUNTRIES[cid]?.flag ?? ""}
            </SvgText>
          );
        })}

        {/* Strategic lines from player → others (only when diplomacy/alliances/threat layer) */}
        {(activeLayer === "diplomacy" || activeLayer === "alliances" || activeLayer === "threat") && playerShape && (
          <>
            {(activeLayer !== "threat") && allyShapes.map((s) => {
              const dimmed = activeRegion !== null && COUNTRIES[s.countryId]?.region !== activeRegion;
              if (dimmed) return null;
              return (
                <Line
                  key={`ally-${s.id}`}
                  x1={pctToPxX(playerShape.centerX)} y1={pctToPxY(playerShape.centerY)}
                  x2={pctToPxX(s.centerX)} y2={pctToPxY(s.centerY)}
                  stroke="url(#alliance-line)" strokeWidth={1.2} strokeOpacity={0.55}
                />
              );
            })}
            {(activeLayer !== "alliances") && enemyShapes.map((s) => {
              const dimmed = activeRegion !== null && COUNTRIES[s.countryId]?.region !== activeRegion;
              if (dimmed) return null;
              return (
                <Line
                  key={`tension-${s.id}`}
                  x1={pctToPxX(playerShape.centerX)} y1={pctToPxY(playerShape.centerY)}
                  x2={pctToPxX(s.centerX)} y2={pctToPxY(s.centerY)}
                  stroke="url(#tension-line)" strokeWidth={1} strokeDasharray="5,5" strokeOpacity={0.6}
                />
              );
            })}
          </>
        )}

        {/* Hotspot markers */}
        {showHotspots && hotspots.map((h) => {
          const dimmed = activeRegion !== null && COUNTRIES[h.countryId]?.region !== activeRegion;
          if (dimmed) return null;
          const color = getHotspotColor(h.type);
          const radius = h.severity === "critical" ? 5 : h.severity === "high" ? 4 : 3;
          return (
            <G key={h.id}>
              <Circle cx={pctToPxX(h.x)} cy={pctToPxY(h.y)} r={radius + 4} fill={color} opacity={0.18} />
              <Circle cx={pctToPxX(h.x)} cy={pctToPxY(h.y)} r={radius} fill={color} stroke="#000" strokeWidth={0.4} />
            </G>
          );
        })}
      </Svg>

      {/* Pressable tap targets for each country */}
      {MAP_COUNTRY_SHAPES.map((shape) => {
        const cid = shape.countryId;
        const isPlayer = cid === state.countryId;
        const dimmed = activeRegion !== null && COUNTRIES[cid]?.region !== activeRegion;
        const cx = pctToPxX(shape.centerX);
        const cy = pctToPxY(shape.centerY);
        const w = Math.max(34, (shape.bounds.maxX - shape.bounds.minX) * mapW * 0.8 / 100);
        const h = Math.max(34, (shape.bounds.maxY - shape.bounds.minY) * mapH * 0.8 / 100);
        return (
          <Pressable
            key={`btn-${cid}`}
            onPress={() => !dimmed && !isPlayer && setSelected(cid)}
            disabled={isPlayer || dimmed}
            style={({ pressed }) => [
              styles.nodeBtn,
              {
                left: cx - w / 2, top: cy - h / 2, width: w, height: h,
                opacity: dimmed ? 0.2 : pressed ? 0.5 : 1,
              },
            ]}
          />
        );
      })}

      {/* Frame label */}
      <View style={styles.frameLabel} pointerEvents="none">
        <Text style={styles.frameKicker}>THÉÂTRE MONDIAL · {MAP_LAYERS.find((l) => l.id === activeLayer)?.label.toUpperCase() ?? ""}</Text>
        <Text style={styles.frameTime}>LIVE · {playerCountry.name.toUpperCase()}</Text>
      </View>

      {/* Hotspot toggle */}
      <Pressable
        onPress={() => setShowHotspots((v) => !v)}
        style={({ pressed }) => [styles.hotspotToggle, { opacity: pressed ? 0.7 : 1, borderColor: showHotspots ? PALETTE.gold : PALETTE.panelEdge }]}
      >
        <MaterialCommunityIcons name={showHotspots ? "map-marker-radius" : "map-marker-off-outline"} size={12} color={showHotspots ? PALETTE.gold : PALETTE.textMid} />
        <Text style={[styles.hotspotToggleText, { color: showHotspots ? PALETTE.gold : PALETTE.textMid }]}>{hotspots.length} POINTS</Text>
      </Pressable>

      {/* Layer-specific legend */}
      <View style={styles.legend} pointerEvents="none">
        {activeLayer === "diplomacy" && (["allied","friendly","neutral","rival","hostile"] as RelationStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[s] }]} />
            <Text style={styles.legendLabel}>{STATUS_LABELS[s]}</Text>
          </View>
        ))}
        {activeLayer === "threat" && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#ff3040" }]} />
            <Text style={styles.legendLabel}>Menace ↑ rouge</Text>
          </View>
        )}
        {activeLayer === "alliances" && (
          <>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#52c97a" }]} /><Text style={styles.legendLabel}>Allié</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#4a9fff" }]} /><Text style={styles.legendLabel}>Ami</Text></View>
          </>
        )}
        {(activeLayer === "military" || activeLayer === "cyber" || activeLayer === "economy") && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: MAP_LAYERS.find((l) => l.id === activeLayer)!.color }]} />
            <Text style={styles.legendLabel}>Intensité ↑ pleine</Text>
          </View>
        )}
      </View>
    </View>
  );

  // ── DOSSIER PANEL ────────────────────────────────────────────────────
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

      {/* Score + threat bar */}
      <Panel style={{ padding: 12, marginTop: 10 }}>
        <View style={styles.scoreRowV2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionKicker}>SCORE DIPLOMATIQUE</Text>
            <Text style={styles.scoreValV2}>{selectedRelation.score > 0 ? "+" : ""}{selectedRelation.score}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionKicker, { color: PALETTE.danger }]}>NIVEAU DE MENACE</Text>
            <Text style={[styles.scoreValV2, { color: selectedRelation.threatLevel >= 60 ? PALETTE.danger : PALETTE.warning }]}>{selectedRelation.threatLevel}</Text>
          </View>
        </View>
        <Text style={styles.dossierDescV2}>{selectedCountry.description}</Text>
      </Panel>

      {/* Hotspots related to this country */}
      {(() => {
        const localHotspots = hotspots.filter((h) => h.countryId === selectedCountry.id);
        if (localHotspots.length === 0) return null;
        return (
          <Panel style={{ padding: 10, marginTop: 8 }}>
            <Text style={styles.sectionKicker}>SIGNAUX ACTIFS</Text>
            {localHotspots.map((h) => (
              <View key={h.id} style={styles.hotspotItem}>
                <View style={[styles.hotspotPip, { backgroundColor: getHotspotColor(h.type) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hotspotTitle}>{h.title}</Text>
                  <Text style={styles.hotspotDesc}>{h.description}</Text>
                </View>
                <Text style={[styles.hotspotSev, { color: h.severity === "critical" ? PALETTE.danger : h.severity === "high" ? PALETTE.warning : PALETTE.textLow }]}>{h.severity.toUpperCase()}</Text>
              </View>
            ))}
          </Panel>
        );
      })()}

      <Text style={[styles.sectionKicker, { marginTop: 12, marginBottom: 6 }]}>FORCES NATIONALES</Text>
      <View style={styles.statsGrid}>
        {([
          { label: "Économie",  value: selectedCountry.economy,   color: "#3fbe7a" },
          { label: "Militaire", value: selectedCountry.military,  color: "#e54848" },
          { label: "Cyber",     value: selectedCountry.cyber,     color: "#a78bfa" },
          { label: "Diplomatie",value: selectedCountry.diplomacy, color: "#4a9fff" },
        ]).map(({ label, value, color }) => (
          <Panel key={label} style={styles.statCell}>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
            <View style={styles.statBar}>
              <View style={[styles.statFill, { width: `${value}%`, backgroundColor: color }]} />
            </View>
          </Panel>
        ))}
      </View>

      {selectedRelation.revealedIntel && (() => {
        const intel = selectedRelation.revealedIntel!;
        const isStale = state.news.actionCount - intel.revealedAtAction > 50;
        return (
          <Panel style={{ padding: 12, marginTop: 8, borderColor: "#52c97a44", borderWidth: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <MaterialCommunityIcons name="eye-check-outline" size={13} color="#52c97a" />
              <Text style={[styles.sectionKicker, { color: "#52c97a", flex: 1 }]}>INTELLIGENCE RÉVÉLÉE</Text>
              {isStale && <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: PALETTE.warning, letterSpacing: 1 }}>DATÉE</Text>}
            </View>
            {([
              { label: "Capacité militaire", value: intel.military },
              { label: "Cybersécurité",      value: intel.cyber },
              { label: "Économie réelle",    value: intel.economy },
              { label: "Stabilité interne",  value: intel.stability },
            ]).map(({ label, value }) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, fontFamily: FONT.med, color: PALETTE.textMid, width: 110 }}>{label}</Text>
                <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${value}%`, borderRadius: 2, backgroundColor: isStale ? PALETTE.textLow : "#52c97a" }} />
                </View>
                <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: isStale ? PALETTE.textLow : "#52c97a", width: 24, textAlign: "right" }}>{value}</Text>
              </View>
            ))}
          </Panel>
        );
      })()}

      {/* Quick actions with availability check */}
      <Text style={[styles.sectionKicker, { marginTop: 12, marginBottom: 6 }]}>ACTIONS RAPIDES</Text>
      <View style={styles.actionGrid}>
        {QUICK_ACTIONS.map((qa) => {
          const op = OPERATIONS[qa.type];
          const check = canLaunchOperation(qa.type, selectedRelation, state.buildings, state.resources);
          return (
            <Pressable
              key={qa.type}
              onPress={() => {
                setSelected(null);
                router.push({ pathname: "/operations", params: { countryId: selectedCountry.id, op: qa.type } });
              }}
              style={({ pressed }) => [
                styles.actionCell,
                {
                  borderColor: check.allowed ? PALETTE.gold + "55" : PALETTE.panelEdge,
                  opacity: pressed ? 0.7 : check.allowed ? 1 : 0.55,
                  backgroundColor: check.allowed ? "rgba(201,168,76,0.06)" : "transparent",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={qa.icon as McIconName}
                size={16}
                color={check.allowed ? PALETTE.gold : PALETTE.textLow}
              />
              <Text style={[styles.actionLabel, { color: check.allowed ? PALETTE.textHigh : PALETTE.textLow }]}>{qa.label}</Text>
              <Text style={styles.actionMeta} numberOfLines={1}>
                {check.allowed ? op.name : (check.reason ?? "Indisponible")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 12 }}>
        <PrimaryButton
          label="Ouvrir le centre d'opérations"
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

  // ── LAYOUT ───────────────────────────────────────────────────────────
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
          <View style={[styles.intelDot, { backgroundColor: STATUS_COLORS.rival }]} />
          <Text style={styles.intelText}>{rivalCount} rivaux</Text>
        </View>
        <View style={styles.intelChip}>
          <View style={[styles.intelDot, { backgroundColor: STATUS_COLORS.hostile }]} />
          <Text style={styles.intelText}>{hostileCount} hostiles</Text>
        </View>
        <View style={styles.intelChip}>
          <Text style={[styles.intelText, { color: PALETTE.gold }]}>{state.relations.length} dossiers</Text>
        </View>
      </View>

      {/* Layer selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.layerTabs, { paddingHorizontal: hPad }]}>
        {MAP_LAYERS.map((l) => {
          const active = activeLayer === l.id;
          return (
            <Pressable
              key={l.id}
              onPress={() => setActiveLayer(l.id)}
              style={({ pressed }) => [
                styles.layerTab,
                {
                  backgroundColor: active ? l.color + "22" : "transparent",
                  borderColor: active ? l.color : PALETTE.panelEdge,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons name={l.icon as McIconName} size={11} color={active ? l.color : PALETTE.textMid} />
              <Text style={[styles.layerTabText, { color: active ? PALETTE.textHigh : PALETTE.textMid }]}>{l.shortLabel}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Region filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.regionTabs, { paddingHorizontal: hPad }]}>
        <RegionTab label="Tous" active={!activeRegion} onPress={() => setActiveRegion(null)} />
        {REGIONS.map((r) => (
          <RegionTab key={r} label={r} active={activeRegion === r} onPress={() => setActiveRegion(r === activeRegion ? null : r)} />
        ))}
      </ScrollView>

      {/* LANDSCAPE: side-by-side */}
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
            <Text style={styles.hintText}>Touchez un pays ou un point chaud pour ouvrir le dossier.</Text>
          </View>

          {/* Portrait modal */}
          <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
            <Pressable style={styles.overlay} onPress={() => setSelected(null)} />
            {selectedCountry && selectedRelation && (
              <View style={[styles.sheetWrap, { maxHeight: height * 0.82 }]}>
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
  intelStrip: { flexDirection: "row", gap: 12, paddingVertical: 6 },
  intelChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  intelDot: { width: 6, height: 6, borderRadius: 3 },
  intelText: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 0.5 },

  layerTabs: { gap: 6, paddingTop: 4, paddingBottom: 6 },
  layerTab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  layerTabText: { fontSize: 10, fontFamily: FONT.bold, letterSpacing: 1 },

  regionTabs: { gap: 6, paddingBottom: 4 },
  regionTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  regionTabText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1 },

  mapContainer: { position: "relative", overflow: "hidden", borderTopWidth: 1, borderBottomWidth: 1, borderColor: PALETTE.panelEdge },
  nodeBtn: { position: "absolute" },
  frameLabel: { position: "absolute", top: 8, left: 10 },
  frameKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.8 },
  frameTime: { fontSize: 8, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 1, marginTop: 2 },

  hotspotToggle: { position: "absolute", top: 8, right: 10, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  hotspotToggleText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 1 },

  legend: { position: "absolute", bottom: 8, right: 10, gap: 3 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 8, fontFamily: FONT.med, color: PALETTE.textMid, letterSpacing: 0.4 },

  landscapeRow: { flex: 1, flexDirection: "row" },
  detailSide: { borderLeftWidth: 1, borderColor: PALETTE.panelEdge },

  detailScroll: { gap: 0 },
  emptyDetail: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.5 },
  emptyDetailText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 18 },

  hint: { paddingVertical: 8 },
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
  dossierDescV2: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textHigh, lineHeight: 15, marginTop: 8 },
  scoreRowV2: { flexDirection: "row", gap: 16 },
  scoreValV2: { fontSize: 22, fontFamily: FONT.bold, color: PALETTE.textHigh, marginTop: 2 },

  hotspotItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  hotspotPip: { width: 6, height: 6, borderRadius: 3 },
  hotspotTitle: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh },
  hotspotDesc: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 },
  hotspotSev: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { flex: 1, minWidth: "44%", padding: 10, gap: 4 },
  statValue: { fontSize: 20, fontFamily: FONT.bold },
  statLabel: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  statBar: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden", marginTop: 4 },
  statFill: { height: "100%", borderRadius: 2 },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actionCell: { width: "31%", flexGrow: 1, minWidth: 100, padding: 10, gap: 4, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: "center" },
  actionLabel: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 0.3 },
  actionMeta: { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow, letterSpacing: 0.3, textAlign: "center" },
});
