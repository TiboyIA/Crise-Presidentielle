import React, { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import {
  Region,
  RegionId,
  regionGaugeAverage,
  tensionLevel,
} from "@/data/regions";
import {
  FRANCE_METRO_REGIONS,
  FRANCE_VIEWBOX,
} from "@/data/franceGeo";

interface Props {
  regions: Region[];
  selectedId?: RegionId | null;
  onSelect: (id: RegionId) => void;
  /**
   * Module 2 — régions à signaler comme "en alerte" (demande
   * régionale en attente, jauges critiques). Affichées avec un
   * petit point jaune sur la carte.
   */
  urgentRegions?: ReadonlySet<RegionId>;
}

interface Palette {
  success: string;
  warning: string;
  danger: string;
}

/**
 * Map a tension value (0-100) to the canonical fill color used across
 * the game. We delegate to `tensionLevel()` from `data/regions` so the
 * map's color thresholds stay in lockstep with region cards, badges,
 * and the average-tension callout — change tension semantics in one
 * place and every surface follows.
 */
function tensionFill(tension: number, palette: Palette): string {
  return palette[tensionLevel(tension).color];
}

/** Outre-mer inset (small rectangle in the bottom-left corner). */
const OUTRE_MER_RECT = { x: 6, y: 308, w: 78, h: 50 };

function FranceMapImpl({ regions, selectedId, onSelect, urgentRegions }: Props) {
  const colors = useColors();

  const palette = useMemo(
    () => ({
      success: colors.success,
      warning: colors.warning,
      danger: colors.danger,
    }),
    [colors.success, colors.warning, colors.danger],
  );

  // Lookup map: game RegionId -> Region (with current tension/gauges)
  const regionById = useMemo(() => {
    const m = new Map<RegionId, Region>();
    regions.forEach((r) => m.set(r.id, r));
    return m;
  }, [regions]);

  const outreMer = regionById.get("outre_mer") ?? null;

  const renderShape = useCallback(
    (shape: typeof FRANCE_METRO_REGIONS[number]) => {
      const gameRegion = shape.game ? regionById.get(shape.game) : null;
      const isGame = gameRegion != null;
      const isSelected = isGame && selectedId === gameRegion.id;
      const isUrgent = isGame && urgentRegions?.has(gameRegion.id);
      const fill = isGame
        ? tensionFill(gameRegion.tension, palette)
        : colors.muted;
      const fillOpacity = isGame ? (isSelected ? 1 : 0.78) : 0.35;
      const stroke = isSelected ? colors.foreground : colors.background;
      const strokeWidth = isSelected ? 2.5 : 1;

      return (
        <G key={shape.code}>
          <Path
            d={shape.d}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
            onPress={isGame ? () => onSelect(gameRegion.id) : undefined}
          />
          {isGame ? (
            <>
              <SvgText
                x={shape.cx}
                y={shape.cy}
                fill="#fff"
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="middle"
                pointerEvents="none"
              >
                {shape.nom.length > 14 ? shape.nom.slice(0, 12) + "…" : shape.nom}
              </SvgText>
              <SvgText
                x={shape.cx}
                y={shape.cy + 11}
                fill="#fff"
                fontSize={9}
                fontWeight="600"
                textAnchor="middle"
                alignmentBaseline="middle"
                pointerEvents="none"
                opacity={0.85}
              >
                {Math.round(regionGaugeAverage(gameRegion.gauges))}
              </SvgText>
              {isUrgent ? (
                <SvgText
                  x={shape.cx}
                  y={shape.cy - 12}
                  fill="#facc15"
                  stroke="#7c2d12"
                  strokeWidth={0.5}
                  fontSize={11}
                  fontWeight="900"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  pointerEvents="none"
                >
                  ⚠
                </SvgText>
              ) : null}
            </>
          ) : (
            <SvgText
              x={shape.cx}
              y={shape.cy}
              fill={colors.mutedForeground}
              fontSize={7}
              fontWeight="500"
              textAnchor="middle"
              alignmentBaseline="middle"
              pointerEvents="none"
              opacity={0.6}
            >
              {shape.nom}
            </SvgText>
          )}
        </G>
      );
    },
    [
      regionById,
      selectedId,
      palette,
      colors.muted,
      colors.foreground,
      colors.background,
      colors.mutedForeground,
      onSelect,
    ],
  );

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        CARTE INTERACTIVE · TOUCHEZ UNE RÉGION
      </Text>
      <Svg
        viewBox={`0 0 ${FRANCE_VIEWBOX.w} ${FRANCE_VIEWBOX.h}`}
        width="100%"
        height={340}
      >
        {FRANCE_METRO_REGIONS.map(renderShape)}

        {/* Outre-mer inset: a separate small tappable rectangle */}
        {outreMer ? (
          <G>
            <Rect
              x={OUTRE_MER_RECT.x - 3}
              y={OUTRE_MER_RECT.y - 3}
              width={OUTRE_MER_RECT.w + 6}
              height={OUTRE_MER_RECT.h + 6}
              rx={3}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3,2"
              pointerEvents="none"
            />
            <Rect
              x={OUTRE_MER_RECT.x}
              y={OUTRE_MER_RECT.y}
              width={OUTRE_MER_RECT.w}
              height={OUTRE_MER_RECT.h}
              rx={2}
              fill={tensionFill(outreMer.tension, palette)}
              fillOpacity={selectedId === "outre_mer" ? 1 : 0.78}
              stroke={
                selectedId === "outre_mer" ? colors.foreground : colors.background
              }
              strokeWidth={selectedId === "outre_mer" ? 2.5 : 1}
              onPress={() => onSelect("outre_mer")}
            />
            <SvgText
              x={OUTRE_MER_RECT.x + OUTRE_MER_RECT.w / 2}
              y={OUTRE_MER_RECT.y + OUTRE_MER_RECT.h / 2 - 4}
              fill="#fff"
              fontSize={9}
              fontWeight="700"
              textAnchor="middle"
              alignmentBaseline="middle"
              pointerEvents="none"
            >
              Outre-mer
            </SvgText>
            <SvgText
              x={OUTRE_MER_RECT.x + OUTRE_MER_RECT.w / 2}
              y={OUTRE_MER_RECT.y + OUTRE_MER_RECT.h / 2 + 8}
              fill="#fff"
              fontSize={9}
              fontWeight="600"
              textAnchor="middle"
              alignmentBaseline="middle"
              pointerEvents="none"
              opacity={0.85}
            >
              {Math.round(regionGaugeAverage(outreMer.gauges))}
            </SvgText>
            {urgentRegions?.has("outre_mer") ? (
              <SvgText
                x={OUTRE_MER_RECT.x + OUTRE_MER_RECT.w - 8}
                y={OUTRE_MER_RECT.y + 8}
                fill="#facc15"
                stroke="#7c2d12"
                strokeWidth={0.5}
                fontSize={11}
                fontWeight="900"
                textAnchor="middle"
                alignmentBaseline="middle"
                pointerEvents="none"
              >
                ⚠
              </SvgText>
            ) : null}
          </G>
        ) : null}
      </Svg>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendSwatch, { backgroundColor: colors.success }]}
          />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
            Calme
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendSwatch, { backgroundColor: colors.warning }]}
          />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
            Tendue
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendSwatch, { backgroundColor: colors.danger }]}
          />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
            Explosive
          </Text>
        </View>
        <Text
          style={[
            styles.legendHint,
            { color: colors.mutedForeground, marginLeft: "auto" },
          ]}
        >
          ⌀ jauges
        </Text>
      </View>
    </View>
  );
}

export const FranceMap = memo(FranceMapImpl);

/**
 * Backward-compatible export. The old implementation layered invisible
 * Pressable rectangles on top of the SVG as a defensive hit-target
 * fallback. Real geographic polygons no longer fit cleanly inside
 * percentage-based rectangles, and modern react-native-svg dispatches
 * onPress reliably on iOS/Android/Web — so we rely on Path onPress and
 * keep this wrapper as a thin pass-through to avoid breaking call sites.
 */
export function FranceMapWithFallback(props: Props) {
  return <FranceMap {...props} />;
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  legendHint: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
});
