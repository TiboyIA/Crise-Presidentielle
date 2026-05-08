import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { BUILDINGS } from "@/data/buildings";
import { formatDuration, getUpgradeProgress, timeRemaining } from "@/logic/buildingEngine";
import type { BuildingId, PlayerBuilding } from "@/types/strategy";

interface Props {
  building: PlayerBuilding;
  isUnlocked: boolean;
  canAfford: boolean;
  onUpgrade: () => void;
  compact?: boolean;
}

export function BuildingCard({ building, isUnlocked, canAfford, onUpgrade, compact = false }: Props) {
  const colors = useColors();
  const def = BUILDINGS[building.id];
  const isUpgrading = building.upgradeEndTime !== null;
  const progress = isUpgrading ? getUpgradeProgress(building) : 0;
  const remaining = isUpgrading ? timeRemaining(building) : 0;
  const isMaxed = building.level >= def.maxLevel;
  const isLocked = !isUnlocked || building.level === 0 && !isUnlocked;

  const nextLevelData = building.level < def.maxLevel ? def.levels[building.level] : null;

  const btnDisabled = isLocked || isUpgrading || isMaxed || !canAfford;

  const prodEntries = nextLevelData
    ? Object.entries(nextLevelData.production).filter(([, v]) => v > 0)
    : [];

  if (compact) {
    return (
      <Pressable
        onPress={!btnDisabled ? onUpgrade : undefined}
        style={({ pressed }) => [
          styles.compact,
          { backgroundColor: colors.card, borderColor: isUpgrading ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.icon}>{def.icon}</Text>
        <View style={styles.compactInfo}>
          <Text style={[styles.compactName, { color: colors.foreground }]} numberOfLines={1}>{def.name}</Text>
          <Text style={[styles.levelLabel, { color: colors.mutedForeground }]}>Niv. {building.level}</Text>
        </View>
        {isUpgrading ? (
          <View style={[styles.progressPill, { backgroundColor: colors.primary + "33" }]}>
            <Text style={[styles.progressText, { color: colors.primary }]}>{formatDuration(remaining)}</Text>
          </View>
        ) : (
          <View style={[styles.upgBtn, { backgroundColor: btnDisabled ? colors.muted : colors.primary }]}>
            <Text style={[styles.upgBtnText, { color: btnDisabled ? colors.mutedForeground : "#fff" }]}>
              {isMaxed ? "MAX" : "▲"}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isUpgrading ? colors.primary : colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{def.icon}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.foreground }]}>{def.name}</Text>
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>{def.description}</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}>
          <Text style={[styles.levelNum, { color: colors.primary }]}>{building.level}</Text>
          <Text style={[styles.levelMax, { color: colors.mutedForeground }]}>/{def.maxLevel}</Text>
        </View>
      </View>

      {isLocked && (
        <View style={[styles.locked, { backgroundColor: colors.muted }]}>
          <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
            🔒 {def.unlockRequirement
              ? `Débloqué au niveau ${def.unlockRequirement.level} de ${BUILDINGS[def.unlockRequirement.buildingId].name}`
              : "Verrouillé"}
          </Text>
        </View>
      )}

      {!isLocked && nextLevelData && prodEntries.length > 0 && (
        <View style={styles.production}>
          <Text style={[styles.prodLabel, { color: colors.mutedForeground }]}>Production/min :</Text>
          <View style={styles.prodRow}>
            {prodEntries.map(([key, val]) => (
              <View key={key} style={[styles.prodChip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.prodText, { color: colors.foreground }]}>+{val} {key}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {isUpgrading && (
        <View style={styles.upgradeSection}>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressTime, { color: colors.primary }]}>
            Amélioration : {formatDuration(remaining)}
          </Text>
        </View>
      )}

      {!isLocked && !isUpgrading && !isMaxed && nextLevelData && (
        <View style={styles.footer}>
          <View style={styles.costs}>
            {Object.entries(nextLevelData.cost).map(([key, val]) => (
              <View key={key} style={[styles.costChip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.costText, { color: colors.foreground }]}>{val} {key}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={onUpgrade}
            disabled={!canAfford}
            style={({ pressed }) => [
              styles.upgradeBtn,
              { backgroundColor: canAfford ? colors.primary : colors.muted, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.upgradeText, { color: canAfford ? "#fff" : colors.mutedForeground }]}>
              Améliorer →{" "}Niv.{building.level + 1}
            </Text>
          </Pressable>
        </View>
      )}

      {isMaxed && (
        <View style={[styles.maxed, { borderColor: "#FFD700" }]}>
          <Text style={[styles.maxedText, { color: "#FFD700" }]}>⭐ Niveau maximum atteint</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  icon: { fontSize: 28, width: 36, textAlign: "center" },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  levelBadge: { flexDirection: "row", alignItems: "baseline", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  levelNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  levelMax: { fontSize: 11, fontFamily: "Inter_400Regular" },
  locked: { borderRadius: 6, padding: 8 },
  lockedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  production: { gap: 4 },
  prodLabel: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  prodRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  prodChip: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  prodText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  upgradeSection: { gap: 4 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressTime: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  footer: { gap: 8 },
  costs: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  costChip: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  costText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  upgradeBtn: { borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  upgradeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  maxed: { borderRadius: 6, borderWidth: 1, padding: 8, alignItems: "center" },
  maxedText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  // compact
  compact: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1, padding: 10, gap: 8 },
  compactInfo: { flex: 1, gap: 2 },
  compactName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  levelLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  progressPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  progressText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  upgBtn: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  upgBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
