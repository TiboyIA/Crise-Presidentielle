import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE } from "@/constants/uiTokens";
import { EXTENDED_MAP_LAYERS } from "@/data/mapLayers";
import type { ExtMapLayerId } from "@/data/mapLayers";

interface Props {
  activeLayer: ExtMapLayerId;
  onLayerChange: (l: ExtMapLayerId) => void;
  showHotspots: boolean;
  onToggleHotspots: () => void;
  style?: object;
}

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const COMPACT_W  = 38;
const EXPANDED_W = 110;

export function FloatingMapLegend({
  activeLayer,
  onLayerChange,
  showHotspots,
  onToggleHotspots,
  style,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.positioner, style]} pointerEvents="box-none">
      <View
        style={[styles.panel, expanded ? styles.panelExpanded : styles.panelCompact]}
        pointerEvents="auto"
      >
        {/* ── Toggle compact / étendu ── */}
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          hitSlop={8}
          style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.6 }]}
        >
          {expanded ? (
            <>
              <MaterialCommunityIcons name="layers-outline" size={9} color={PALETTE.gold} />
              <Text style={styles.toggleLabel}>COUCHES</Text>
              <MaterialCommunityIcons name="chevron-right" size={11} color={PALETTE.gold} />
            </>
          ) : (
            <MaterialCommunityIcons name="menu" size={13} color={PALETTE.gold} />
          )}
        </Pressable>

        <View style={styles.hairline} />

        {/* ── Couches ── */}
        {EXTENDED_MAP_LAYERS.map((layer) => {
          const active = activeLayer === layer.id;
          return (
            <Pressable
              key={layer.id}
              onPress={() => onLayerChange(layer.id)}
              style={({ pressed }) => [
                styles.row,
                expanded ? styles.rowExpanded : styles.rowCompact,
                active && { backgroundColor: layer.color + "1a" },
                pressed && { opacity: 0.6 },
              ]}
            >
              {active && <View style={[styles.accentBar, { backgroundColor: layer.color }]} />}

              <MaterialCommunityIcons
                name={layer.icon as McName}
                size={16}
                color={active ? layer.color : "#364d65"}
              />

              {expanded && (
                <Text
                  style={[styles.rowLabel, { color: active ? layer.color : PALETTE.textMid }]}
                  numberOfLines={1}
                >
                  {layer.shortLabel}
                </Text>
              )}
            </Pressable>
          );
        })}

        <View style={styles.hairline} />

        {/* ── Signaux (hotspots) — séparé des couches ── */}
        <Pressable
          onPress={onToggleHotspots}
          style={({ pressed }) => [
            styles.row,
            expanded ? styles.rowExpanded : styles.rowCompact,
            showHotspots && { backgroundColor: "rgba(255,96,64,0.14)" },
            pressed && { opacity: 0.6 },
          ]}
        >
          {showHotspots && (
            <View style={[styles.accentBar, { backgroundColor: "#ff6040" }]} />
          )}
          <MaterialCommunityIcons
            name={"map-marker-alert-outline" as McName}
            size={16}
            color={showHotspots ? "#ff6040" : "#364d65"}
          />
          {expanded && (
            <Text style={[styles.rowLabel, { color: showHotspots ? "#ff6040" : PALETTE.textMid }]}>
              Signaux
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: "absolute",
    right: 8,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  panel: {
    backgroundColor: "rgba(3,8,18,0.94)",
    borderWidth: 1,
    borderColor: "rgba(74,159,255,0.18)",
    borderRadius: 10,
    paddingVertical: 5,
    shadowColor: "#4a9fff",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: -3, height: 0 },
    elevation: 14,
    overflow: "hidden",
  },
  panelCompact:  { width: COMPACT_W },
  panelExpanded: { width: EXPANDED_W },

  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    minHeight: 28,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 7,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
    letterSpacing: 1.6,
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(74,159,255,0.15)",
    marginHorizontal: 5,
    marginVertical: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 5,
    marginHorizontal: 3,
    marginVertical: 1,
    overflow: "hidden",
  },
  rowCompact: {
    justifyContent: "center",
    paddingVertical: 8,
  },
  rowExpanded: {
    paddingVertical: 8,
    paddingLeft: 10,
    gap: 8,
  },

  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2.5,
  },

  rowLabel: {
    fontSize: 10,
    fontFamily: FONT.bold,
    letterSpacing: 0.4,
    flex: 1,
  },
});
