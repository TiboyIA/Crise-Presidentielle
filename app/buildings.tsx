import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { BuildingCard } from "@/components/BuildingCard";
import { ScreenHeader, SectionHeader } from "@/components/ui";
import { BUILDINGS, BUILDING_LIST } from "@/data/buildings";
import { canAfford, isUnlocked } from "@/logic/buildingEngine";
import { FONT, PALETTE } from "@/constants/uiTokens";
import type { BuildingId } from "@/types/strategy";

const CATEGORIES: { label: string; ids: BuildingId[] }[] = [
  { label: "Pouvoir & Économie", ids: ["presidential_palace", "economy_ministry", "central_bank", "media_agency"] },
  { label: "Force & Sécurité",   ids: ["defense_ministry", "military_hq", "cyber_ministry"] },
  { label: "Influence & Savoir", ids: ["intelligence_ministry", "diplomacy_ministry", "energy_ministry", "research_center"] },
];

export default function BuildingsScreen() {
  const insets = useSafeAreaInsets();
  const { state, upgradeBuilding } = useStrategy();
  const { hPad } = useResponsive();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  if (!state) return null;

  const handleUpgrade = (id: BuildingId) => {
    const result = upgradeBuilding(id);
    if (!result.success) {
      setToast(result.reason ?? "Action impossible");
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 3000);
    }
  };

  const buildingMap = Object.fromEntries(state.buildings.map((b) => [b.id, b]));
  const totalLevels = state.buildings.reduce((acc, b) => acc + b.level, 0);
  const upgrading = state.buildings.filter((b) => b.upgradeEndTime !== null).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Ministères" kicker="ARCHITECTURE D'ÉTAT" />

      {/* Summary strip */}
      <View style={[styles.summary, { paddingHorizontal: hPad }]}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{state.buildings.length}</Text>
          <Text style={styles.summaryLbl}>BÂTIMENTS</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalLevels}</Text>
          <Text style={styles.summaryLbl}>NIVEAU CUMULÉ</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, upgrading > 0 && { color: PALETTE.gold }]}>{upgrading}</Text>
          <Text style={styles.summaryLbl}>EN CHANTIER</Text>
        </View>
      </View>

      {toast && (
        <View style={[styles.toast, { marginHorizontal: hPad }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Améliorez vos ministères pour augmenter la production de ressources, débloquer de nouvelles options stratégiques et renforcer votre puissance nationale.
        </Text>

        {CATEGORIES.map((cat) => {
          const cards = cat.ids
            .filter((id) => BUILDINGS[id])
            .map((id) => {
              const def = BUILDINGS[id];
              const building = buildingMap[id] ?? { id, level: 0, upgradeStartTime: null, upgradeEndTime: null };
              const unlocked = isUnlocked(building, state.buildings);
              const nextLevel = def.levels[building.level];
              const affordable = nextLevel ? canAfford(nextLevel.cost, state.resources) : false;
              return (
                <BuildingCard
                  key={id}
                  building={building}
                  isUnlocked={unlocked}
                  canAfford={affordable}
                  onUpgrade={() => handleUpgrade(id)}
                />
              );
            });
          return (
            <View key={cat.label} style={styles.categoryBlock}>
              <SectionHeader label={cat.label} count={`${cards.length}`} />
              <View style={{ gap: 10 }}>{cards}</View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.ink },
  summary: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryVal: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.textHigh },
  summaryLbl: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  summaryDivider: { width: 1, height: 28, backgroundColor: PALETTE.panelEdge },
  toast: { padding: 10, borderRadius: 4, backgroundColor: PALETTE.danger + "22", borderWidth: 1, borderColor: PALETTE.danger + "66" },
  toastText: { color: PALETTE.danger, fontSize: 12, fontFamily: FONT.bold, textAlign: "center" },
  list: { paddingTop: 4, gap: 16 },
  intro: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 18, fontStyle: "italic" },
  categoryBlock: { gap: 10 },
});
