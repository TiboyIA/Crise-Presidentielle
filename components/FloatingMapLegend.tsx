import React from "react";
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

export function FloatingMapLegend({
  activeLayer,
  onLayerChange,
  showHotspots,
  onToggleHotspots,
  style,
}: Props) {
  return (
    <View style={[styles.positioner, style]} pointerEvents="box-none">
      <View style={styles.panel} pointerEvents="auto">
        <View style={styles.header}>
          <MaterialCommunityIcons name="layers-outline" size={9} color={PALETTE.gold} />
          <Text style={styles.kicker}>COUCHES</Text>
        </View>

        <View style={styles.hairline} />

        {EXTENDED_MAP_LAYERS.map((layer) => {
          const active = activeLayer === layer.id;
          return (
            <Pressable
              key={layer.id}
              onPress={() => onLayerChange(layer.id)}
              style={({ pressed }) => [
                styles.row,
                active && { backgroundColor: layer.color + "18" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: active ? layer.color : "#2e3e52" }]} />
              <Text style={[styles.rowLabel, { color: active ? layer.color : PALETTE.textMid }]}>
                {layer.shortLabel}
              </Text>
              {active && <View style={[styles.activePip, { backgroundColor: layer.color }]} />}
            </Pressable>
          );
        })}

        <View style={styles.hairline} />

        <Pressable
          onPress={onToggleHotspots}
          style={({ pressed }) => [
            styles.row,
            showHotspots && { backgroundColor: "rgba(255,96,64,0.14)" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: showHotspots ? "#ff6040" : "#2e3e52" }]} />
          <Text style={[styles.rowLabel, { color: showHotspots ? "#ff6040" : PALETTE.textMid }]}>
            Points
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: "absolute",
    right: 10,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  panel: {
    backgroundColor: "rgba(4,9,20,0.92)",
    borderWidth: 1,
    borderColor: "rgba(74,159,255,0.2)",
    borderRadius: 10,
    paddingVertical: 8,
    shadowColor: "#4a9fff",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: -2, height: 0 },
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  kicker: {
    fontSize: 8,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
    letterSpacing: 1.8,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(74,159,255,0.18)",
    marginHorizontal: 8,
    marginVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowLabel: {
    fontSize: 10,
    fontFamily: FONT.bold,
    letterSpacing: 0.3,
    flex: 1,
  },
  activePip: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
