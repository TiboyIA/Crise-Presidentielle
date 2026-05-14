import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useRouter } from "expo-router";
import { useStrategy } from "@/context/StrategyContext";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { MAP_COUNTRY_SHAPES, MAP_COUNTRY_SHAPES_BY_ID, CONTINENTS_V2 } from "@/data/mapGeo";
import { computeCountryRender, generateHotspots, getHotspotColor } from "@/logic/hotspotEngine";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, STATUS_COLORS } from "@/constants/uiTokens";
import type { CountryId } from "@/types/strategy";

const MAP_ASPECT = 0.62; // height / width

export function WorldMapMini() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state } = useStrategy();

  const mapW = width;
  const mapH = Math.round(width * MAP_ASPECT * 0.52); // compact: ~52% of full height

  if (!state) return null;

  const relationMap = useMemo(
    () => Object.fromEntries(state.relations.map((r) => [r.countryId, r])),
    [state.relations],
  );

  const hotspots = useMemo(() => generateHotspots(state), [state]);

  const playerShape = MAP_COUNTRY_SHAPES_BY_ID[state.countryId];

  const allyShapes = COUNTRY_LIST
    .map((c) => MAP_COUNTRY_SHAPES_BY_ID[c.id])
    .filter((s): s is NonNullable<typeof s> =>
      !!s && s.countryId !== state.countryId &&
      (relationMap[s.countryId]?.status === "allied" || relationMap[s.countryId]?.status === "friendly"),
    );

  const enemyShapes = COUNTRY_LIST
    .map((c) => MAP_COUNTRY_SHAPES_BY_ID[c.id])
    .filter((s): s is NonNullable<typeof s> =>
      !!s && s.countryId !== state.countryId &&
      (relationMap[s.countryId]?.status === "hostile" || relationMap[s.countryId]?.status === "rival"),
    );

  const px = (pct: number) => (pct / 100) * mapW;
  const py = (pct: number) => (pct / 100) * mapH;

  function scalePath(path: string): string {
    return path.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_m, x: string, y: string) =>
      `${px(parseFloat(x))},${py(parseFloat(y))}`,
    );
  }

  const hostileCount = state.relations.filter((r) => r.status === "hostile").length;
  const alliedCount  = state.relations.filter((r) => r.status === "allied").length;
  const criticalHotspots = hotspots.filter((h) => h.severity === "critical").length;

  return (
    <Pressable
      onPress={() => router.push("/worldmap")}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.92 : 1 }]}
    >
      {/* Map SVG */}
      <View style={[styles.mapBox, { height: mapH }]}>
        <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="mm-ocean" cx="50%" cy="50%" rx="80%" ry="80%">
              <Stop offset="0%"   stopColor="#0c1a30" stopOpacity={1} />
              <Stop offset="60%"  stopColor="#070d18" stopOpacity={1} />
              <Stop offset="100%" stopColor="#03050a" stopOpacity={1} />
            </RadialGradient>
            <RadialGradient id="mm-pglow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%"   stopColor={PALETTE.gold} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          <Rect x={0} y={0} width={mapW} height={mapH} fill="url(#mm-ocean)" />

          {/* Grid */}
          {[25, 50, 75].map((p) => (
            <Line key={`h${p}`} x1={0} y1={py(p)} x2={mapW} y2={py(p)}
              stroke="#162033" strokeWidth={0.3} strokeDasharray="3,8" opacity={0.5} />
          ))}
          {[20, 40, 60, 80].map((p) => (
            <Line key={`v${p}`} x1={px(p)} y1={0} x2={px(p)} y2={mapH}
              stroke="#162033" strokeWidth={0.3} strokeDasharray="3,8" opacity={0.5} />
          ))}

          {/* Continents */}
          {CONTINENTS_V2.map((c) => (
            <Path key={c.id} d={scalePath(c.path)} fill="#0d1f33" stroke="#19283e" strokeWidth={0.5} opacity={0.85} />
          ))}

          {/* Player glow */}
          {playerShape && (
            <Circle
              cx={px(playerShape.centerX)} cy={py(playerShape.centerY)}
              r={Math.max(22, mapW * 0.045)}
              fill="url(#mm-pglow)"
            />
          )}

          {/* Country shapes */}
          {MAP_COUNTRY_SHAPES.map((shape) => {
            const cid = shape.countryId as CountryId;
            const isPlayer = cid === state.countryId;
            const rel = relationMap[cid];
            const r = computeCountryRender("diplomacy", isPlayer, COUNTRIES[cid], rel?.status, rel?.threatLevel ?? 0);
            return (
              <Path
                key={shape.id}
                d={scalePath(shape.path!)}
                fill={r.fill}
                stroke={r.stroke}
                strokeWidth={isPlayer ? 1.4 : 0.7}
              />
            );
          })}

          {/* Alliance lines */}
          {playerShape && allyShapes.map((s) => (
            <Line
              key={`a-${s.id}`}
              x1={px(playerShape.centerX)} y1={py(playerShape.centerY)}
              x2={px(s.centerX)} y2={py(s.centerY)}
              stroke={STATUS_COLORS.allied} strokeWidth={0.9} strokeOpacity={0.45}
            />
          ))}

          {/* Tension lines */}
          {playerShape && enemyShapes.map((s) => (
            <Line
              key={`e-${s.id}`}
              x1={px(playerShape.centerX)} y1={py(playerShape.centerY)}
              x2={px(s.centerX)} y2={py(s.centerY)}
              stroke={STATUS_COLORS.hostile} strokeWidth={0.7} strokeDasharray="4,5" strokeOpacity={0.5}
            />
          ))}

          {/* Hotspots */}
          {hotspots.map((h) => {
            const color = getHotspotColor(h.type);
            const r = h.severity === "critical" ? 4 : h.severity === "high" ? 3 : 2;
            return (
              <G key={h.id}>
                <Circle cx={px(h.x)} cy={py(h.y)} r={r + 3} fill={color} opacity={0.15} />
                <Circle cx={px(h.x)} cy={py(h.y)} r={r} fill={color} stroke="#000" strokeWidth={0.4} />
              </G>
            );
          })}

          {/* Flag labels */}
          {MAP_COUNTRY_SHAPES.map((shape) => {
            const cid = shape.countryId as CountryId;
            return (
              <SvgText
                key={`lbl-${shape.id}`}
                x={px(shape.labelX)} y={py(shape.labelY)}
                fill="#aeb9d4"
                fontSize={Math.max(7, mapW * 0.012)}
                fontWeight="700"
                textAnchor="middle"
                opacity={0.9}
              >
                {COUNTRIES[cid]?.flag ?? ""}
              </SvgText>
            );
          })}
        </Svg>

        {/* Top-left: intel strip */}
        <View style={styles.intelStrip}>
          <View style={[styles.intelBadge, { backgroundColor: STATUS_COLORS.allied + "22", borderColor: STATUS_COLORS.allied + "55" }]}>
            <Text style={[styles.intelVal, { color: STATUS_COLORS.allied }]}>{alliedCount}</Text>
            <Text style={styles.intelLabel}>ALLIÉS</Text>
          </View>
          <View style={[styles.intelBadge, { backgroundColor: STATUS_COLORS.hostile + "22", borderColor: STATUS_COLORS.hostile + "55" }]}>
            <Text style={[styles.intelVal, { color: STATUS_COLORS.hostile }]}>{hostileCount}</Text>
            <Text style={styles.intelLabel}>HOSTILES</Text>
          </View>
          {criticalHotspots > 0 && (
            <View style={[styles.intelBadge, { backgroundColor: PALETTE.danger + "22", borderColor: PALETTE.danger + "55" }]}>
              <Text style={[styles.intelVal, { color: PALETTE.danger }]}>{criticalHotspots}</Text>
              <Text style={styles.intelLabel}>CRITIQUES</Text>
            </View>
          )}
        </View>

        {/* Bottom-right: expand button */}
        <View style={styles.expandBtn}>
          <MaterialCommunityIcons name="fullscreen" size={13} color={PALETTE.gold} />
          <Text style={styles.expandText}>CARTE COMPLÈTE</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },

  mapBox: {
    width: "100%",
    backgroundColor: "#03050a",
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.gold + "22",
    overflow: "hidden",
  },

  intelStrip: {
    position: "absolute",
    top: 8,
    left: 10,
    flexDirection: "row",
    gap: 5,
  },
  intelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  intelVal: { fontSize: 11, fontFamily: FONT.bold },
  intelLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },

  expandBtn: {
    position: "absolute",
    bottom: 8,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.gold + "44",
  },
  expandText: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.2 },
});
