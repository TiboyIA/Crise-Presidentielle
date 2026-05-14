import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgGradient,
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
import { COUNTRIES } from "@/data/countries";
import { ALPHA2_TO_COUNTRY_ID, GAME_ALPHA2_SET } from "@/data/isoCountryMap";
import { generateHotspots, getHotspotColor } from "@/logic/hotspotEngine";
import { canLaunchOperation } from "@/logic/operationEngine";
import { FloatingMapLegend } from "@/components/FloatingMapLegend";
import { CountryCommandPanel } from "@/components/CountryCommandPanel";
import { computeCountryRenderExt } from "@/data/countryStatus";
import { FONT, PALETTE, STATUS_COLORS } from "@/constants/uiTokens";
import type { ExtMapLayerId } from "@/data/mapLayers";
import type { CountryId, OperationType } from "@/types/strategy";

// ── SVG World Map data ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SVG_WORLD = require("@/data/svgWorldPaths.json") as Record<string, { d: string; cx: number; cy: number }>;

const SVG_W = 1000;
const SVG_H = 507.209;

type SvgEntry = { d: string; cx: number; cy: number };

const ALL_ENTRIES  = Object.entries(SVG_WORLD) as [string, SvgEntry][];
const BG_ENTRIES   = ALL_ENTRIES.filter(([code]) => !GAME_ALPHA2_SET.has(code));
const GAME_ENTRIES = ALL_ENTRIES.filter(([code]) => GAME_ALPHA2_SET.has(code));
const ALPHA2_TO_CID = new Map(GAME_ENTRIES.map(([code]) => [code, ALPHA2_TO_COUNTRY_ID[code]]));
const COUNTRY_SVG   = new Map<string, SvgEntry>(
  GAME_ENTRIES.map(([code, entry]) => [ALPHA2_TO_COUNTRY_ID[code], entry])
);

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function WorldMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state } = useStrategy();

  const [selected, setSelected]       = useState<CountryId | null>(null);
  const [activeLayer, setActiveLayer] = useState<ExtMapLayerId>("diplomacy");
  const [showHotspots, setShowHotspots] = useState(true);

  if (!state) return null;

  const isLandscape = width > height;

  // Map fills screen width (portrait) or screen height (landscape)
  const mapW = isLandscape ? Math.round(height * SVG_W / SVG_H) : width;
  const mapH = isLandscape ? height : Math.round(width * SVG_H / SVG_W);

  // Center the map on screen
  const mapLeft = isLandscape ? Math.round((width - mapW) / 2) : 0;
  const mapTop  = isLandscape ? 0 : Math.round((height - mapH) / 2);

  // SVG → screen scale factors (for tap target positioning)
  const scaleX = mapW / SVG_W;
  const scaleY = mapH / SVG_H;

  const relationMap = useMemo(
    () => Object.fromEntries(state.relations.map((r) => [r.countryId, r])),
    [state.relations],
  );

  const hotspots = useMemo(() => generateHotspots(state), [state]);

  const playerEntry   = COUNTRY_SVG.get(state.countryId);
  const playerCountry = COUNTRIES[state.countryId];

  const selectedCountry  = selected ? COUNTRIES[selected] : null;
  const selectedRelation = selected ? (relationMap[selected] ?? null) : null;
  const selectedHotspots = selected ? hotspots.filter((h) => h.countryId === selected) : [];

  const allyIds  = state.relations
    .filter((r) => (r.status === "allied" || r.status === "friendly") && r.countryId !== state.countryId)
    .map((r) => r.countryId as CountryId);
  const enemyIds = state.relations
    .filter((r) => r.status === "hostile" || r.status === "rival")
    .map((r) => r.countryId as CountryId);

  const alliedCount  = state.relations.filter((r) => r.status === "allied").length;
  const hostileCount = state.relations.filter((r) => r.status === "hostile").length;

  function renderFor(cid: CountryId) {
    const country = COUNTRIES[cid];
    const rel = relationMap[cid];
    return computeCountryRenderExt(
      activeLayer,
      cid === state!.countryId,
      { ...country },
      rel?.status,
      rel?.threatLevel ?? 0,
    );
  }

  // Legend vertical span: from below top bar to above country panel (if open)
  const topBarH     = insets.top + 56;
  const panelOffset = selected ? 200 : 24;
  const legendTop    = topBarH + 8;
  const legendBottom = panelOffset;

  return (
    <View style={styles.root}>
      {/* Ocean gradient fills entire screen */}
      <LinearGradient
        colors={["#040b18", "#030710", "#040b18"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── MAP LAYER ────────────────────────────────────────────────────────── */}
      <View style={[styles.mapLayer, { top: mapTop, left: mapLeft }]}>
        <Svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width={mapW} height={mapH}>
          <Defs>
            <RadialGradient id="ocean" cx="50%" cy="50%" rx="80%" ry="80%">
              <Stop offset="0%"   stopColor="#0a1828" stopOpacity={1} />
              <Stop offset="65%"  stopColor="#060e1a" stopOpacity={1} />
              <Stop offset="100%" stopColor="#020609" stopOpacity={1} />
            </RadialGradient>
            <SvgGradient id="gAlliance" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor={STATUS_COLORS.allied}  stopOpacity={0.8} />
              <Stop offset="100%" stopColor={STATUS_COLORS.allied}  stopOpacity={0} />
            </SvgGradient>
            <SvgGradient id="gTension" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor={STATUS_COLORS.hostile} stopOpacity={0.8} />
              <Stop offset="100%" stopColor={STATUS_COLORS.hostile} stopOpacity={0} />
            </SvgGradient>
            <RadialGradient id="playerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%"   stopColor={PALETTE.gold} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="selectedGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%"   stopColor={PALETTE.gold} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Ocean */}
          <Rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#ocean)" />

          {/* Strategic grid */}
          {[20, 40, 60, 80].map((p) => (
            <Line key={`h${p}`} x1={0} y1={(p / 100) * SVG_H} x2={SVG_W} y2={(p / 100) * SVG_H}
              stroke="#1a2d45" strokeWidth={0.4} strokeDasharray="4,12" opacity={0.45} />
          ))}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
            <Line key={`v${p}`} x1={(p / 100) * SVG_W} y1={0} x2={(p / 100) * SVG_W} y2={SVG_H}
              stroke="#1a2d45" strokeWidth={0.4} strokeDasharray="4,12" opacity={0.45} />
          ))}

          {/* Background countries */}
          <G>
            {BG_ENTRIES.map(([code, entry]) => (
              <Path key={code} d={entry.d} fill="#0d1e35" stroke="#162740" strokeWidth={0.3} opacity={0.9} />
            ))}
          </G>

          {/* Player country glow halo */}
          {playerEntry && (
            <Circle cx={playerEntry.cx} cy={playerEntry.cy} r={SVG_W * 0.048} fill="url(#playerGlow)" />
          )}

          {/* Game countries — colored by active layer */}
          <G>
            {GAME_ENTRIES.map(([code, entry]) => {
              const cid = ALPHA2_TO_CID.get(code)!;
              const isSelected = selected === cid;
              const r = renderFor(cid);
              return (
                <Path
                  key={code}
                  d={entry.d}
                  fill={r.fill}
                  stroke={r.stroke}
                  strokeWidth={isSelected ? 2.4 : cid === state.countryId ? 1.8 : 1}
                />
              );
            })}
          </G>

          {/* Selected country: glow + dashed ring */}
          {selected && COUNTRY_SVG.has(selected) && (() => {
            const e = COUNTRY_SVG.get(selected)!;
            return (
              <G key="sel-ring">
                <Circle cx={e.cx} cy={e.cy} r={SVG_W * 0.042} fill="url(#selectedGlow)" />
                <Circle cx={e.cx} cy={e.cy} r={SVG_W * 0.036}
                  fill="none" stroke={PALETTE.gold} strokeWidth={1.6} strokeDasharray="4,5" opacity={0.9} />
              </G>
            );
          })()}

          {/* Flag emoji labels */}
          {GAME_ENTRIES.map(([code, entry]) => {
            const cid  = ALPHA2_TO_CID.get(code)!;
            const flag = COUNTRIES[cid]?.flag ?? "";
            const isSelected = selected === cid;
            return (
              <SvgText
                key={`fl-${code}`}
                x={entry.cx} y={entry.cy + 6}
                fill={isSelected ? PALETTE.gold : "#9aafc4"}
                fontSize={13}
                fontWeight="700"
                textAnchor="middle"
                opacity={0.95}
              >
                {flag}
              </SvgText>
            );
          })}

          {/* Strategic lines: player → allies / enemies */}
          {playerEntry && (activeLayer === "diplomacy" || activeLayer === "alliances" || activeLayer === "threat") && (
            <G>
              {activeLayer !== "threat" && allyIds.map((cid) => {
                const e = COUNTRY_SVG.get(cid);
                if (!e) return null;
                return (
                  <Line key={`al-${cid}`}
                    x1={playerEntry.cx} y1={playerEntry.cy} x2={e.cx} y2={e.cy}
                    stroke="url(#gAlliance)" strokeWidth={1.2} strokeOpacity={0.65} />
                );
              })}
              {activeLayer !== "alliances" && enemyIds.map((cid) => {
                const e = COUNTRY_SVG.get(cid);
                if (!e) return null;
                return (
                  <Line key={`en-${cid}`}
                    x1={playerEntry.cx} y1={playerEntry.cy} x2={e.cx} y2={e.cy}
                    stroke="url(#gTension)" strokeWidth={1} strokeDasharray="5,5" strokeOpacity={0.7} />
                );
              })}
            </G>
          )}

          {/* Hotspot markers */}
          {showHotspots && hotspots.map((h) => {
            const e = COUNTRY_SVG.get(h.countryId);
            if (!e) return null;
            const color  = getHotspotColor(h.type);
            const radius = h.severity === "critical" ? 6 : h.severity === "high" ? 4.5 : 3;
            const hx = e.cx + (h.x - 50) * SVG_W * 0.003;
            const hy = e.cy + (h.y - 50) * SVG_H * 0.003;
            return (
              <G key={h.id}>
                <Circle cx={hx} cy={hy} r={radius + 5} fill={color} opacity={0.14} />
                <Circle cx={hx} cy={hy} r={radius}     fill={color} stroke="#000" strokeWidth={0.4} />
              </G>
            );
          })}
        </Svg>

        {/* Pressable tap targets (absolute, over SVG) */}
        {GAME_ENTRIES.map(([code, entry]) => {
          const cid = ALPHA2_TO_CID.get(code)!;
          if (cid === state.countryId) return null;
          const cx = entry.cx * scaleX;
          const cy = entry.cy * scaleY;
          const TAP = 52;
          return (
            <Pressable
              key={`tp-${code}`}
              onPress={() => setSelected(cid === selected ? null : cid)}
              style={({ pressed }) => ({
                position: "absolute",
                left: cx - TAP / 2,
                top: cy - TAP / 2,
                width: TAP,
                height: TAP,
                opacity: pressed ? 0.5 : 1,
              })}
            />
          );
        })}
      </View>

      {/* ── HUD OVERLAY ──────────────────────────────────────────────────────── */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

        {/* Top command bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) + 4 }]} pointerEvents="none">
          {/* Left: player identity */}
          <View style={styles.topLeft}>
            <Text style={styles.topFlag}>{playerCountry?.flag ?? ""}</Text>
            <View>
              <Text style={styles.topCountry} numberOfLines={1}>{playerCountry?.name ?? ""}</Text>
              <Text style={styles.topKicker}>COMMANDANT EN CHEF</Text>
            </View>
          </View>

          {/* Center: mandate day */}
          <View style={styles.topCenter}>
            <Text style={styles.topDay}>J·{state.mandateDay}</Text>
            <Text style={styles.topDayLabel}>MANDAT</Text>
          </View>

          {/* Right: quick stats */}
          <View style={styles.topRight}>
            <HudStat
              value={`${state.nationalIndicators.popularity}%`}
              label="POPU"
              color={state.nationalIndicators.popularity >= 50 ? "#52c97a" : "#ff3040"}
            />
            <View style={styles.topDivider} />
            <HudStat value={`${alliedCount}`}  label="ALLIÉS"  color="#52c97a" />
            <HudStat value={`${hostileCount}`} label="HOSTILE" color="#ff3040" />
          </View>
        </View>

        {/* Floating layer legend — right side */}
        <FloatingMapLegend
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          showHotspots={showHotspots}
          onToggleHotspots={() => setShowHotspots((v) => !v)}
          style={{ top: legendTop, bottom: legendBottom }}
        />

        {/* Country command panel — slides up from bottom */}
        {selected && selectedCountry && selectedRelation && (
          <CountryCommandPanel
            country={selectedCountry}
            relation={selectedRelation}
            hotspots={selectedHotspots}
            buildings={state.buildings}
            resources={state.resources}
            insets={insets}
            onClose={() => setSelected(null)}
            onOpenDossier={() => {
              setSelected(null);
              router.push({ pathname: "/operations", params: { countryId: selected } });
            }}
            onAction={(op: OperationType) => {
              setSelected(null);
              router.push({ pathname: "/operations", params: { countryId: selected, op } });
            }}
          />
        )}

        {/* Bottom-right: hotspot count badge */}
        {showHotspots && hotspots.length > 0 && (
          <View
            style={[styles.hotspotBadge, { bottom: (selected ? 200 : 16) + Math.max(insets.bottom, 4) }]}
            pointerEvents="none"
          >
            <MaterialCommunityIcons name="map-marker-radius" size={10} color="#ff6040" />
            <Text style={styles.hotspotBadgeText}>{hotspots.length} signaux</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function HudStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.hudStat}>
      <Text style={[styles.hudStatValue, { color }]}>{value}</Text>
      <Text style={styles.hudStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#040b18",
  },
  mapLayer: {
    position: "absolute",
  },

  // ── Top command bar ────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(3,7,16,0.85)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(74,159,255,0.2)",
    gap: 8,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  topFlag: { fontSize: 22 },
  topCountry: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: PALETTE.textHigh,
  },
  topKicker: {
    fontSize: 7,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
    letterSpacing: 1.8,
    marginTop: 1,
  },
  topCenter: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  topDay: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: PALETTE.textHigh,
    letterSpacing: 1,
  },
  topDayLabel: {
    fontSize: 7,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 2,
    marginTop: -2,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  hudStat: {
    alignItems: "center",
    gap: 1,
  },
  hudStatValue: {
    fontSize: 11,
    fontFamily: FONT.bold,
  },
  hudStatLabel: {
    fontSize: 6,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 1,
  },

  // ── Hotspot badge ──────────────────────────────────────────────────────────
  hotspotBadge: {
    position: "absolute",
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(4,9,20,0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,96,64,0.3)",
  },
  hotspotBadgeText: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: "#ff6040",
    letterSpacing: 0.5,
  },
});
