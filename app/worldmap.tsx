import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
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
import { COUNTRY_LABEL_ANCHORS } from "@/data/mapLabelAnchors";

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
const CID_TO_ALPHA2 = new Map(Object.entries(ALPHA2_TO_COUNTRY_ID).map(([a2, cid]) => [cid, a2]));

const MIN_SCALE = 1;
const MAX_SCALE = 12;

// Tier 1 — grandes puissances, labels dès zoom 2.0
const TIER1 = new Set<CountryId>([
  "usa", "china", "russia", "france", "germany", "india", "japan", "brazil", "uk",
]);

// Tier 2 — puissances secondaires, labels dès zoom 3.5
const TIER2 = new Set<CountryId>([
  "turkey", "iran", "israel", "south_korea", "italy", "saudi_arabia",
  "australia", "canada", "north_korea", "nigeria", "pakistan",
]);


const TAP_LARGE  = new Set<CountryId>(["usa", "russia", "china", "brazil", "australia", "canada", "india"]);
const TAP_MEDIUM = new Set<CountryId>(["france", "germany", "uk", "saudi_arabia", "nigeria", "turkey", "iran", "pakistan"]);

function tapBaseForCountry(cid: CountryId): number {
  if (TAP_LARGE.has(cid))  return 60;
  if (TAP_MEDIUM.has(cid)) return 48;
  return 36;
}

const LABEL_NAMES: Partial<Record<CountryId, string>> = {
  usa:          "USA",
  china:        "CHINE",
  russia:       "RUSSIE",
  india:        "INDE",
  uk:           "R.-UNI",
  france:       "FRANCE",
  germany:      "ALLEMAGNE",
  brazil:       "BRÉSIL",
  japan:        "JAPON",
  turkey:       "TÜRKIYE",
  iran:         "IRAN",
  israel:       "ISRAËL",
  south_korea:  "COR. SUD",
  italy:        "ITALIE",
  saudi_arabia: "ARABIE S.",
  australia:    "AUSTRALIE",
  canada:       "CANADA",
  north_korea:  "COR. NORD",
  nigeria:      "NIGERIA",
  pakistan:     "PAKISTAN",
};

type LabelMode = "none" | "tier1" | "tier2";

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

// ── Worklet partagé : SVG → coordonnées écran ─────────────────────────────────
function svgToScreen(
  cx: number, cy: number,
  s: number, tx: number, ty: number,
  W: number, H: number,
): [number, number] {
  "worklet";
  const coverS = W > 0 ? Math.max(W / SVG_W, H / SVG_H) : 1;
  const mW = SVG_W * coverS;
  const mH = SVG_H * coverS;
  const gs = coverS * s;
  const gx = tx + mW / 2 * (1 - s);
  const gy = ty + mH / 2 * (1 - s);
  return [
    (W - mW) / 2 + gx + cx * gs,
    (H - mH) / 2 + gy + cy * gs,
  ];
}

// ── CountryMapLabel ───────────────────────────────────────────────────────────
// Label overlay React Native — taille fixe à l'écran, suit le zoom/pan via
// le même calcul de transform que CountryTapTarget.
const LABEL_W = 72;
const LABEL_H = 14;

function CountryMapLabel({
  entry, cid, isSelected, isTier1,
  scale, translateX, translateY, svWidth, svHeight,
}: {
  entry: SvgEntry;
  cid: CountryId;
  isSelected: boolean;
  isTier1: boolean;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  svWidth: SharedValue<number>;
  svHeight: SharedValue<number>;
}) {
  const rawAnchor = COUNTRY_LABEL_ANCHORS[cid];
  if (!rawAnchor && !isSelected) {
    if (__DEV__) console.warn(`[worldmap] Missing label anchor for country: ${cid}`);
    return null;
  }
  const anchor = rawAnchor ?? { x: entry.cx, y: entry.cy };
  const svgX   = anchor.x;
  const svgY   = anchor.y;
  const dx     = anchor.dx ?? 0;
  const dy     = anchor.dy ?? 0;
  const hasDot = anchor.callout ?? false;

  const color = isSelected ? PALETTE.gold : isTier1 ? "#8aacc8" : "#6a8aa8";
  const label = LABEL_NAMES[cid] ?? cid.toUpperCase();

  const labelStyle = useAnimatedStyle(() => {
    const [sx, sy] = svgToScreen(
      svgX, svgY,
      scale.value, translateX.value, translateY.value,
      svWidth.value, svHeight.value,
    );
    return {
      position: "absolute" as const,
      left:  sx + dx - LABEL_W / 2,
      top:   sy + dy - LABEL_H / 2,
      width: LABEL_W,
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    if (!hasDot) {
      return { position: "absolute" as const, opacity: 0, left: 0, top: 0, width: 0, height: 0 };
    }
    const [sx, sy] = svgToScreen(
      svgX, svgY,
      scale.value, translateX.value, translateY.value,
      svWidth.value, svHeight.value,
    );
    return {
      position: "absolute" as const,
      left:         sx - 2.5,
      top:          sy - 2.5,
      width:        5,
      height:       5,
      borderRadius: 2.5,
    };
  });

  return (
    <>
      {hasDot && (
        <Animated.View
          style={[styles.labelDot, { backgroundColor: color }, dotStyle]}
          pointerEvents="none"
        />
      )}
      <Animated.View style={labelStyle} pointerEvents="none">
        <Text style={[styles.labelText, { color }]}>{label}</Text>
      </Animated.View>
    </>
  );
}

// ── CountryTapTarget ──────────────────────────────────────────────────────────
function CountryTapTarget({
  entry, cid, selected, tapBase, scale, translateX, translateY, svWidth, svHeight, onPress,
}: {
  entry: SvgEntry;
  cid: CountryId;
  selected: CountryId | null;
  tapBase: number;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  svWidth: SharedValue<number>;
  svHeight: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const [screenX, screenY] = svgToScreen(
      entry.cx, entry.cy,
      scale.value, translateX.value, translateY.value,
      svWidth.value, svHeight.value,
    );
    const tap = Math.max(28, tapBase / Math.max(1, scale.value));
    return {
      position: "absolute" as const,
      left: screenX - tap / 2,
      top:  screenY - tap / 2,
      width: tap,
      height: tap,
    };
  });
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [StyleSheet.absoluteFill, { opacity: pressed ? 0.4 : 1 }]}
      />
    </Animated.View>
  );
}

// ── WorldMapScreen ────────────────────────────────────────────────────────────
export default function WorldMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state } = useStrategy();

  const [selected, setSelected]         = useState<CountryId | null>(null);
  const [activeLayer, setActiveLayer]   = useState<ExtMapLayerId>("diplomacy");
  const [showHotspots, setShowHotspots] = useState(true);
  const [labelMode, setLabelMode]       = useState<LabelMode>("none");
  const [hotspotMode, setHotspotMode]   = useState<"critical" | "high" | "all">("critical");

  // ── Zoom / pan shared values ──────────────────────────────────────────────
  const scale      = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx    = useSharedValue(0);
  const savedTy    = useSharedValue(0);
  const focalX     = useSharedValue(0);
  const focalY     = useSharedValue(0);
  const svMapW     = useSharedValue(0);
  const svMapH     = useSharedValue(0);
  const svWidth    = useSharedValue(width);
  const svHeight   = useSharedValue(height);

  if (!state) return null;

  const coverScale = Math.max(width / SVG_W, height / SVG_H);
  const mapW    = Math.round(SVG_W * coverScale);
  const mapH    = Math.round(SVG_H * coverScale);
  const mapLeft = Math.round((width  - mapW) / 2);
  const mapTop  = Math.round((height - mapH) / 2);

  useEffect(() => {
    svMapW.value   = mapW;
    svMapH.value   = mapH;
    svWidth.value  = width;
    svHeight.value = height;

    const initScale = 1.4;
    const entry = COUNTRY_SVG.get(state.countryId);
    if (entry) {
      const rawTx = (SVG_W / 2 - entry.cx) * coverScale * initScale;
      const rawTy = (SVG_H / 2 - entry.cy) * coverScale * initScale;
      const maxTx = Math.max(0, mapW * initScale - width)  / 2;
      const maxTy = Math.max(0, mapH * initScale - height) / 2;
      scale.value      = withSpring(initScale, { damping: 20 });
      translateX.value = withSpring(Math.max(-maxTx, Math.min(maxTx, rawTx)), { damping: 20 });
      translateY.value = withSpring(Math.max(-maxTy, Math.min(maxTy, rawTy)), { damping: 20 });
    } else {
      scale.value      = withSpring(1, { damping: 20 });
      translateX.value = withSpring(0, { damping: 20 });
      translateY.value = withSpring(0, { damping: 20 });
    }
  }, [mapW, mapH]);

  // Labels : zoom 2–3.5 → tier1, 3.5–5 → tier2, hors plage → aucun
  useAnimatedReaction(
    () => scale.value,
    (s) => {
      const lm: LabelMode =
        s < 2.0 ? "none" :
        s < 3.5 ? "tier1" :
        s < 5.0 ? "tier2" : "none";
      runOnJS(setLabelMode)(lm);
      const hm = s < 2.0 ? "critical" : s < 4.0 ? "high" : "all";
      runOnJS(setHotspotMode)(hm as "critical" | "high" | "all");
    },
  );

  function clampedTranslation(tx: number, ty: number, s: number): [number, number] {
    "worklet";
    const maxTx = Math.max(0, (svMapW.value * s - svWidth.value)  / 2);
    const maxTy = Math.max(0, (svMapH.value * s - svHeight.value) / 2);
    return [
      Math.max(-maxTx, Math.min(maxTx, tx)),
      Math.max(-maxTy, Math.min(maxTy, ty)),
    ];
  }

  // ── Gestures ──────────────────────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      savedScale.value = scale.value;
      savedTx.value    = translateX.value;
      savedTy.value    = translateY.value;
      focalX.value     = e.focalX;
      focalY.value     = e.focalY;
    })
    .onUpdate((e) => {
      const cx = svMapW.value / 2 + (svWidth.value - svMapW.value) / 2;
      const cy = svMapH.value / 2 + (svHeight.value - svMapH.value) / 2;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * e.scale));
      const d = newScale / savedScale.value;
      const newTx = savedTx.value * d + (focalX.value - cx) * (1 - d);
      const newTy = savedTy.value * d + (focalY.value - cy) * (1 - d);
      const [tx, ty] = clampedTranslation(newTx, newTy, newScale);
      scale.value      = newScale;
      translateX.value = tx;
      translateY.value = ty;
    });

  const pan = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    })
    .onUpdate((e) => {
      const [tx, ty] = clampedTranslation(
        savedTx.value + e.translationX,
        savedTy.value + e.translationY,
        scale.value,
      );
      translateX.value = tx;
      translateY.value = ty;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      const cx = svMapW.value / 2 + (svWidth.value - svMapW.value) / 2;
      const cy = svMapH.value / 2 + (svHeight.value - svMapH.value) / 2;
      if (scale.value > 1.5) {
        scale.value      = withSpring(1,  { damping: 18 });
        translateX.value = withSpring(0,  { damping: 18 });
        translateY.value = withSpring(0,  { damping: 18 });
      } else {
        const targetScale = Math.min(MAX_SCALE, scale.value * 2.5);
        const d = targetScale / scale.value;
        const [tx, ty] = clampedTranslation(
          translateX.value * d + (e.x - cx) * (1 - d),
          translateY.value * d + (e.y - cy) * (1 - d),
          targetScale,
        );
        scale.value      = withSpring(targetScale, { damping: 18 });
        translateX.value = withSpring(tx, { damping: 18 });
        translateY.value = withSpring(ty, { damping: 18 });
      }
    });

  const combinedGesture = Gesture.Simultaneous(
    Gesture.Race(doubleTap, pan),
    pinch,
  );

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const relationMap = useMemo(
    () => Object.fromEntries(state.relations.map((r) => [r.countryId, r])),
    [state.relations],
  );

  const hotspots = useMemo(() => generateHotspots(state), [state]);

  const visibleHotspots = useMemo(() => {
    if (!showHotspots) return [];
    if (hotspotMode === "all") return hotspots;
    if (hotspotMode === "high") return hotspots.filter((h) => h.severity === "critical" || h.severity === "high");
    return hotspots.filter((h) => h.severity === "critical");
  }, [hotspots, showHotspots, hotspotMode]);

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

  const topBarH     = insets.top + 56;
  const panelOffset = selected ? 200 : 24;
  const legendTop   = topBarH + 8;
  const legendBottom = panelOffset;

  return (
    <View style={styles.root}>
      {/* Ocean gradient */}
      <LinearGradient
        colors={["#040b18", "#030710", "#040b18"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── MAP + GESTURES ───────────────────────────────────────────────── */}
      <GestureDetector gesture={combinedGesture}>
      <View style={StyleSheet.absoluteFillObject}>

        {/* SVG map layer */}
        <Animated.View style={[styles.mapLayer, { top: mapTop, left: mapLeft }, animatedMapStyle]}>
        <Svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width={mapW} height={mapH}>
          <Defs>
            <RadialGradient id="ocean" cx="50%" cy="50%" rx="80%" ry="80%">
              <Stop offset="0%"   stopColor="#0a1828" stopOpacity={1} />
              <Stop offset="65%"  stopColor="#060e1a" stopOpacity={1} />
              <Stop offset="100%" stopColor="#020609" stopOpacity={1} />
            </RadialGradient>
            <SvgGradient id="gAlliance" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor={STATUS_COLORS.allied}  stopOpacity={0.6} />
              <Stop offset="100%" stopColor={STATUS_COLORS.allied}  stopOpacity={0} />
            </SvgGradient>
            <SvgGradient id="gTension" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor={STATUS_COLORS.hostile} stopOpacity={0.6} />
              <Stop offset="100%" stopColor={STATUS_COLORS.hostile} stopOpacity={0} />
            </SvgGradient>
            {/* Lueur joueur — discrète, remplacée visuellement par contour doré */}
            <RadialGradient id="playerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%"   stopColor={PALETTE.gold} stopOpacity={0.10} />
              <Stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="selectedGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%"   stopColor={PALETTE.gold} stopOpacity={0.15} />
              <Stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Ocean */}
          <Rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#ocean)" />

          {/* Grille stratégique */}
          {[20, 40, 60, 80].map((p) => (
            <Line key={`h${p}`} x1={0} y1={(p / 100) * SVG_H} x2={SVG_W} y2={(p / 100) * SVG_H}
              stroke="#1a2d45" strokeWidth={0.4} strokeDasharray="4,12" opacity={0.45} />
          ))}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
            <Line key={`v${p}`} x1={(p / 100) * SVG_W} y1={0} x2={(p / 100) * SVG_W} y2={SVG_H}
              stroke="#1a2d45" strokeWidth={0.4} strokeDasharray="4,12" opacity={0.45} />
          ))}

          {/* Pays de fond */}
          <G>
            {BG_ENTRIES.map(([code, entry]) => (
              <Path key={code} d={entry.d} fill="#0d1e35" stroke="#162740" strokeWidth={0.3} opacity={0.9} />
            ))}
          </G>

          {/* Halo joueur — petit et discret */}
          {playerEntry && (
            <Circle cx={playerEntry.cx} cy={playerEntry.cy} r={SVG_W * 0.025} fill="url(#playerGlow)" />
          )}

          {/* Pays du jeu — passe séparateur sombre */}
          <G>
            {GAME_ENTRIES.map(([code, entry]) => (
              <Path key={`sep-${code}`} d={entry.d} fill="none" stroke="#02050a" strokeWidth={1.8} />
            ))}
          </G>
          {/* Pays du jeu — fill + contour coloré */}
          <G>
            {GAME_ENTRIES.map(([code, entry]) => {
              const cid = ALPHA2_TO_CID.get(code)!;
              const isSelected = selected === cid;
              const isPlayer   = cid === state.countryId;
              const r = renderFor(cid);
              return (
                <Path
                  key={`fill-${code}`}
                  d={entry.d}
                  fill={r.fill}
                  stroke={isSelected ? "#f8d36a" : isPlayer ? PALETTE.gold + "88" : r.stroke}
                  strokeWidth={isSelected ? 1.6 : isPlayer ? 1.2 : 0.7}
                />
              );
            })}
          </G>

          {/* Pays sélectionné — halo + anneau pointillé */}
          {selected && COUNTRY_SVG.has(selected) && (() => {
            const e = COUNTRY_SVG.get(selected)!;
            return (
              <G key="sel-ring">
                <Circle cx={e.cx} cy={e.cy} r={SVG_W * 0.038} fill="url(#selectedGlow)" />
                <Circle cx={e.cx} cy={e.cy} r={SVG_W * 0.032}
                  fill="none" stroke={PALETTE.gold} strokeWidth={1.4} strokeDasharray="4,5" opacity={0.85} />
              </G>
            );
          })()}

          {/* Lignes stratégiques — alliances seulement sur la couche "alliances",
              tensions seulement sur la couche "threat" */}
          {playerEntry && (activeLayer === "alliances" || activeLayer === "threat") && (
            <G>
              {activeLayer === "alliances" && allyIds.map((cid) => {
                const e = COUNTRY_SVG.get(cid);
                if (!e) return null;
                return (
                  <Line key={`al-${cid}`}
                    x1={playerEntry.cx} y1={playerEntry.cy} x2={e.cx} y2={e.cy}
                    stroke="url(#gAlliance)" strokeWidth={1.0} strokeOpacity={0.25} />
                );
              })}
              {activeLayer === "threat" && enemyIds.map((cid) => {
                const e = COUNTRY_SVG.get(cid);
                if (!e) return null;
                return (
                  <Line key={`en-${cid}`}
                    x1={playerEntry.cx} y1={playerEntry.cy} x2={e.cx} y2={e.cy}
                    stroke="url(#gTension)" strokeWidth={0.8} strokeDasharray="5,5" strokeOpacity={0.25} />
                );
              })}
            </G>
          )}

          {/* Hotspot markers */}
          {visibleHotspots.map((h) => {
            const e = COUNTRY_SVG.get(h.countryId);
            if (!e) return null;
            const color  = getHotspotColor(h.type);
            const radius = h.severity === "critical" ? 6 : h.severity === "high" ? 4.5 : 3;
            const hx = e.cx + (h.x - 50) * SVG_W * 0.003;
            const hy = e.cy + (h.y - 50) * SVG_H * 0.003;
            return (
              <G key={h.id}>
                <Circle cx={hx} cy={hy} r={radius + 5} fill={color} opacity={0.12} />
                <Circle cx={hx} cy={hy} r={radius}     fill={color} stroke="#000" strokeWidth={0.4} />
              </G>
            );
          })}

        </Svg>
        </Animated.View>

        {/* Tap targets animés */}
        {GAME_ENTRIES.map(([code, entry]) => {
          const cid = ALPHA2_TO_CID.get(code)!;
          if (cid === state.countryId) return null;
          return (
            <CountryTapTarget
              key={`tp-${code}`}
              entry={entry}
              cid={cid}
              selected={selected}
              tapBase={tapBaseForCountry(cid)}
              scale={scale}
              translateX={translateX}
              translateY={translateY}
              svWidth={svWidth}
              svHeight={svHeight}
              onPress={() => setSelected(cid === selected ? null : cid)}
            />
          );
        })}

        {/* Labels overlay — taille fixe à l'écran, aucun pointer event */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {GAME_ENTRIES.map(([code, entry]) => {
            const cid        = ALPHA2_TO_CID.get(code)!;
            const isSelected = selected === cid;
            const isTier1    = TIER1.has(cid);
            const isTier2    = TIER2.has(cid);
            const isCallout  = COUNTRY_LABEL_ANCHORS[cid]?.callout ?? false;

            // Pays sélectionné → toujours visible.
            // Callout (petits pays) → seulement à tier2 (zoom ≥ 3.5).
            // Autres → selon appartenance tier1 / tier2 et le mode courant.
            const isVisible = isSelected || (
              isCallout
                ? labelMode === "tier2"
                : labelMode === "tier1" ? isTier1
                : labelMode === "tier2" ? (isTier1 || isTier2)
                : false
            );
            if (!isVisible) return null;

            return (
              <CountryMapLabel
                key={`lbl-${code}`}
                entry={entry}
                cid={cid}
                isSelected={isSelected}
                isTier1={isTier1}
                scale={scale}
                translateX={translateX}
                translateY={translateY}
                svWidth={svWidth}
                svHeight={svHeight}
              />
            );
          })}
        </View>

      </View>
      </GestureDetector>

      {/* ── HUD OVERLAY ──────────────────────────────────────────────────── */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

        {/* Top command bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) + 4 }]} pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            pointerEvents="auto"
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color={PALETTE.textMid} />
          </Pressable>

          <View style={styles.topLeft}>
            <View style={styles.topFlagBox}>
              <Text style={styles.topFlagCode}>{CID_TO_ALPHA2.get(state.countryId) ?? "—"}</Text>
            </View>
            <View>
              <Text style={styles.topCountry} numberOfLines={1}>{playerCountry?.name ?? ""}</Text>
              <Text style={styles.topKicker}>COMMANDANT EN CHEF</Text>
            </View>
          </View>

          <View style={styles.topCenter}>
            <Text style={styles.topDay}>J·{state.mandateDay}</Text>
            <Text style={styles.topDayLabel}>MANDAT</Text>
          </View>

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

        {/* Légende couches */}
        <FloatingMapLegend
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          showHotspots={showHotspots}
          onToggleHotspots={() => setShowHotspots((v) => !v)}
          style={{ top: legendTop, bottom: legendBottom }}
        />

        {/* Panneau pays sélectionné */}
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

        {/* Badge hotspots */}
        {visibleHotspots.length > 0 && (
          <View
            style={[styles.hotspotBadge, { bottom: (selected ? 200 : 16) + Math.max(insets.bottom, 4) }]}
            pointerEvents="none"
          >
            <MaterialCommunityIcons name="map-marker-radius" size={10} color="#ff6040" />
            <Text style={styles.hotspotBadgeText}>{visibleHotspots.length} signaux</Text>
          </View>
        )}

        {/* Contrôles zoom */}
        <ZoomControls
          scale={scale}
          onReset={() => {
            scale.value      = withSpring(1,  { damping: 18 });
            translateX.value = withSpring(0,  { damping: 18 });
            translateY.value = withSpring(0,  { damping: 18 });
          }}
          onZoomIn={() => {
            const cx = svMapW.value / 2 + (svWidth.value - svMapW.value) / 2;
            const cy = svMapH.value / 2 + (svHeight.value - svMapH.value) / 2;
            const newS = Math.min(MAX_SCALE, scale.value * 1.6);
            const d = newS / scale.value;
            const [tx, ty] = clampedTranslation(
              translateX.value * d + (cx - cx) * (1 - d),
              translateY.value * d + (cy - cy) * (1 - d),
              newS,
            );
            scale.value      = withSpring(newS, { damping: 18 });
            translateX.value = withSpring(tx,   { damping: 18 });
            translateY.value = withSpring(ty,   { damping: 18 });
          }}
          onZoomOut={() => {
            const newS = Math.max(MIN_SCALE, scale.value / 1.6);
            const d = newS / scale.value;
            const [tx, ty] = clampedTranslation(
              translateX.value * d,
              translateY.value * d,
              newS,
            );
            scale.value      = withSpring(newS, { damping: 18 });
            translateX.value = withSpring(tx,   { damping: 18 });
            translateY.value = withSpring(ty,   { damping: 18 });
          }}
          bottom={(selected ? 200 : 60) + Math.max(insets.bottom, 4)}
        />
      </View>
    </View>
  );
}

// ── Sous-composants HUD ───────────────────────────────────────────────────────
function HudStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.hudStat}>
      <Text style={[styles.hudStatValue, { color }]}>{value}</Text>
      <Text style={styles.hudStatLabel}>{label}</Text>
    </View>
  );
}

interface ZoomControlsProps {
  scale: SharedValue<number>;
  bottom: number;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}
function ZoomControls({ scale, bottom, onReset, onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <View style={[styles.zoomControls, { bottom }]} pointerEvents="box-none">
      <View style={styles.zoomPanel} pointerEvents="auto">
        <Pressable onPress={onZoomIn} style={({ pressed }) => [styles.zoomBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="plus" size={16} color={PALETTE.textHigh} />
        </Pressable>
        <Pressable onPress={onReset} style={({ pressed }) => [styles.zoomReset, { opacity: pressed ? 0.6 : 1 }]}>
          <ScaleLabel scale={scale} />
          <MaterialCommunityIcons name="fullscreen-exit" size={11} color={PALETTE.textLow} />
        </Pressable>
        <Pressable onPress={onZoomOut} style={({ pressed }) => [styles.zoomBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="minus" size={16} color={PALETTE.textHigh} />
        </Pressable>
      </View>
    </View>
  );
}

function ScaleLabel({ scale }: { scale: SharedValue<number> }) {
  const [display, setDisplay] = useState("1.0×");
  useAnimatedReaction(
    () => scale.value,
    (s) => { runOnJS(setDisplay)(`${s.toFixed(1)}×`); },
  );
  return <Text style={styles.zoomResetText}>{display}</Text>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#040b18",
  },
  mapLayer: {
    position: "absolute",
  },

  // Labels overlay
  labelText: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  labelDot: {
    position: "absolute",
    opacity: 0.85,
  },

  // ── Top command bar ─────────────────────────────────────────────────────
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
  backBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    marginRight: 4,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  topFlagBox: {
    width: 30,
    height: 22,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PALETTE.gold + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  topFlagCode: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
    letterSpacing: 1.2,
  },
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

  // ── Hotspot badge ───────────────────────────────────────────────────────
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

  // ── Zoom controls ───────────────────────────────────────────────────────
  zoomControls: {
    position: "absolute",
    right: 10,
    alignItems: "flex-end",
  },
  zoomPanel: {
    backgroundColor: "rgba(4,9,20,0.88)",
    borderWidth: 1,
    borderColor: "rgba(74,159,255,0.2)",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#4a9fff",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  zoomBtn: {
    width: 36,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomReset: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74,159,255,0.2)",
    gap: 1,
  },
  zoomResetText: {
    fontSize: 8,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
    letterSpacing: 0.5,
  },
});
