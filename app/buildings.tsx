import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { BuildingCard } from "@/components/BuildingCard";
import { BUILDINGS, BUILDING_LIST } from "@/data/buildings";
import { canAfford, isUnlocked } from "@/logic/buildingEngine";
import type { BuildingId } from "@/types/strategy";

export default function BuildingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, upgradeBuilding } = useStrategy();
  const { hPad } = useResponsive();
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!state) return null;

  const handleUpgrade = (id: BuildingId) => {
    const result = upgradeBuilding(id);
    if (!result.success) {
      setLastResult(result.reason ?? "Impossible");
      setTimeout(() => setLastResult(null), 3000);
    }
  };

  const buildingMap = Object.fromEntries(state.buildings.map((b) => [b.id, b]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, paddingHorizontal: hPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.back, { color: colors.foreground }]}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>🏗️ Bâtiments</Text>
        <View style={{ width: 60 }} />
      </View>

      {lastResult && (
        <View style={[styles.toast, { backgroundColor: "#FF5060" }]}>
          <Text style={styles.toastText}>{lastResult}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.info, { color: colors.mutedForeground }]}>
          Améliorez vos bâtiments pour augmenter la production de ressources et votre puissance nationale.
        </Text>

        {BUILDING_LIST.map((def) => {
          const building = buildingMap[def.id] ?? { id: def.id, level: 0, upgradeStartTime: null, upgradeEndTime: null };
          const unlocked = isUnlocked(building, state.buildings);
          const nextLevel = def.levels[building.level];
          const affordable = nextLevel ? canAfford(nextLevel.cost, state.resources) : false;

          return (
            <BuildingCard
              key={def.id}
              building={building}
              isUnlocked={unlocked}
              canAfford={affordable}
              onUpgrade={() => handleUpgrade(def.id as BuildingId)}
            />
          );
        })}
      </ScrollView>
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
  toast: { marginTop: 8, borderRadius: 8, padding: 10, marginHorizontal: 12 },
  toastText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  list: { paddingTop: 12, gap: 12 },
  info: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
