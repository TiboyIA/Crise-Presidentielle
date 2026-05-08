import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BUILDINGS } from "@/data/buildings";
import { formatDuration, getUpgradeProgress, timeRemaining } from "@/logic/buildingEngine";
import { BUILDING_IMG } from "@/constants/assets";
import { Badge } from "@/components/ui/Badge";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { BuildingId, PlayerBuilding } from "@/types/strategy";

interface Props {
  building: PlayerBuilding;
  isUnlocked: boolean;
  canAfford: boolean;
  onUpgrade: () => void;
  compact?: boolean;
}

// Per-ministry color tint for the accent bar / badge
const MINISTRY_TINT: Record<BuildingId, string> = {
  presidential_palace:    PALETTE.gold,
  economy_ministry:       "#3fbe7a",
  defense_ministry:       "#e54848",
  intelligence_ministry:  "#9a6dff",
  cyber_ministry:         "#4ac8ff",
  energy_ministry:        "#e8a93a",
  diplomacy_ministry:     "#dcb858",
  research_center:        "#5edcc6",
  central_bank:           "#3fbe7a",
  media_agency:           "#f59a3a",
  military_hq:            "#e54848",
};

const MINISTRY_ICON: Record<BuildingId, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  presidential_palace:    "crown-outline",
  economy_ministry:       "chart-line",
  defense_ministry:       "shield-outline",
  intelligence_ministry:  "eye-outline",
  cyber_ministry:         "shield-lock-outline",
  energy_ministry:        "lightning-bolt",
  diplomacy_ministry:     "handshake-outline",
  research_center:        "atom",
  central_bank:           "bank",
  media_agency:           "broadcast",
  military_hq:            "sword-cross",
};

export function BuildingCard({ building, isUnlocked, canAfford, onUpgrade, compact = false }: Props) {
  const def = BUILDINGS[building.id];
  const isUpgrading = building.upgradeEndTime !== null;
  const progress = isUpgrading ? getUpgradeProgress(building) : 0;
  const remaining = isUpgrading ? timeRemaining(building) : 0;
  const isMaxed = building.level >= def.maxLevel;
  const isLocked = !isUnlocked;
  const nextLevelData = building.level < def.maxLevel ? def.levels[building.level] : null;
  const upgradable = !isLocked && !isUpgrading && !isMaxed && canAfford;

  const tint = MINISTRY_TINT[building.id] ?? PALETTE.gold;
  const icon = MINISTRY_ICON[building.id] ?? "office-building";
  const bannerImg = BUILDING_IMG[building.id];

  const prodEntries = nextLevelData
    ? Object.entries(nextLevelData.production).filter(([, v]) => v > 0)
    : [];

  if (compact) {
    return (
      <Pressable onPress={!isLocked && !isUpgrading && !isMaxed ? onUpgrade : undefined} style={({ pressed }) => [styles.compactWrap, { opacity: pressed ? 0.85 : 1 }]}>
        <LinearGradient colors={["#161b27", "#0c1018"]} style={[styles.compactInner, { borderColor: isUpgrading ? tint + "88" : PALETTE.panelEdge }]}>
          {bannerImg && <Image source={bannerImg} style={styles.compactImg} resizeMode="cover" />}
          <View style={styles.compactInfo}>
            <Text style={styles.compactName} numberOfLines={1}>{def.name}</Text>
            <Text style={styles.compactLevel}>NIV. {building.level}</Text>
          </View>
          {isUpgrading ? (
            <View style={[styles.pillWarm, { backgroundColor: tint + "22", borderColor: tint + "55" }]}>
              <Text style={[styles.pillWarmText, { color: tint }]}>{formatDuration(remaining)}</Text>
            </View>
          ) : isMaxed ? (
            <Badge label="MAX" tone="gold" size="xs" />
          ) : (
            <View style={[styles.upgChip, { backgroundColor: upgradable ? PALETTE.crimson : "#1a1f2c" }]}>
              <Text style={[styles.upgChipText, { color: upgradable ? "#fff" : PALETTE.textLow }]}>▲</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <View style={[styles.cardWrap, upgradable && { ...styles.glow, shadowColor: tint }]}>
      <LinearGradient
        colors={["#1a1f2c", "#0d1119"]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[styles.card, { borderColor: isUpgrading ? tint + "aa" : upgradable ? tint + "55" : PALETTE.panelEdge }]}
      >
        {/* Tint accent bar */}
        <View style={[styles.tintBar, { backgroundColor: tint }]} />

        {/* Banner with overlay info */}
        <View style={styles.bannerWrap}>
          {bannerImg && <Image source={bannerImg} style={styles.banner} resizeMode="cover" />}
          <LinearGradient colors={["rgba(13,17,25,0)", "rgba(13,17,25,0.95)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.bannerLeft}>
            <View style={[styles.iconChip, { backgroundColor: tint + "33", borderColor: tint }]}>
              <MaterialCommunityIcons name={icon} size={16} color={tint} />
            </View>
          </View>
          <View style={styles.bannerRight}>
            <View style={[styles.levelChip, { borderColor: tint }]}>
              <Text style={[styles.levelNum, { color: tint }]}>{building.level}</Text>
              <Text style={styles.levelMax}>/{def.maxLevel}</Text>
            </View>
          </View>
          {/* State badges floating */}
          <View style={styles.bannerBadges}>
            {isLocked && <Badge label="Verrouillé" tone="neutral" size="xs" outlined />}
            {isMaxed && <Badge label="Maximum" tone="gold" size="xs" />}
            {isUpgrading && <Badge label="Amélioration" tone="info" size="xs" dot />}
            {upgradable && <Badge label="Améliorable" tone="success" size="xs" dot />}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.name}>{def.name}</Text>
          <Text style={styles.desc} numberOfLines={2}>{def.description}</Text>

          {isLocked && (
            <View style={styles.lockedBox}>
              <MaterialCommunityIcons name="lock-outline" size={12} color={PALETTE.textLow} />
              <Text style={styles.lockedText}>
                {def.unlockRequirement
                  ? `Débloqué au niveau ${def.unlockRequirement.level} de ${BUILDINGS[def.unlockRequirement.buildingId].name}`
                  : "Verrouillé"}
              </Text>
            </View>
          )}

          {!isLocked && nextLevelData && prodEntries.length > 0 && (
            <View style={styles.metaBlock}>
              <Text style={styles.metaKicker}>PRODUCTION / MIN</Text>
              <View style={styles.chipRow}>
                {prodEntries.map(([key, val]) => (
                  <View key={key} style={styles.prodChip}>
                    <Text style={styles.prodPlus}>+{val}</Text>
                    <Text style={styles.prodKey}>{key}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isUpgrading && (
            <View style={styles.metaBlock}>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <LinearGradient colors={[tint, PALETTE.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={[styles.progressText, { color: tint }]}>{formatDuration(remaining)}</Text>
              </View>
            </View>
          )}

          {!isLocked && !isUpgrading && !isMaxed && nextLevelData && (
            <>
              <View style={styles.metaBlock}>
                <Text style={styles.metaKicker}>COÛT NIVEAU {building.level + 1}</Text>
                <View style={styles.chipRow}>
                  {Object.entries(nextLevelData.cost).map(([key, val]) => (
                    <View key={key} style={styles.costChip}>
                      <Text style={styles.costVal}>{val}</Text>
                      <Text style={styles.costKey}>{key}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <PrimaryButton
                label={canAfford ? `Améliorer · niv. ${building.level + 1}` : "Ressources insuffisantes"}
                variant={canAfford ? "primary" : "ghost"}
                onPress={onUpgrade}
                disabled={!canAfford}
                size="md"
              />
            </>
          )}

          {isMaxed && (
            <View style={styles.maxedBanner}>
              <MaterialCommunityIcons name="star-circle" size={16} color={PALETTE.gold} />
              <Text style={styles.maxedText}>Niveau maximum atteint</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { borderRadius: RADIUS.md, overflow: "hidden" },
  glow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  card: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", position: "relative" },
  tintBar: { height: 2, width: "100%" },

  bannerWrap: { height: 96, position: "relative", overflow: "hidden" },
  banner: { width: "100%", height: "100%" },
  bannerLeft: { position: "absolute", top: 8, left: 8 },
  bannerRight: { position: "absolute", top: 8, right: 8 },
  bannerBadges: { position: "absolute", bottom: 6, left: 8, flexDirection: "row", gap: 4 },
  iconChip: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  levelChip: { flexDirection: "row", alignItems: "baseline", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  levelNum: { fontSize: 16, fontFamily: FONT.bold },
  levelMax: { fontSize: 10, fontFamily: FONT.med, color: "rgba(255,255,255,0.5)" },

  body: { padding: 12, gap: 8 },
  name: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh },
  desc: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15 },

  lockedBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, backgroundColor: PALETTE.panelHi, borderRadius: 4 },
  lockedText: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textLow, flex: 1 },

  metaBlock: { gap: 5 },
  metaKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  prodChip: { flexDirection: "row", alignItems: "baseline", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, backgroundColor: "rgba(63,190,122,0.12)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(63,190,122,0.4)" },
  prodPlus: { fontSize: 11, fontFamily: FONT.bold, color: "#3fbe7a" },
  prodKey: { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textMid },
  costChip: { flexDirection: "row", alignItems: "baseline", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, backgroundColor: PALETTE.panelHi, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },
  costVal: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textHigh },
  costKey: { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textMid },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 0.5 },

  maxedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 8, borderWidth: 1, borderColor: PALETTE.gold + "55", borderRadius: 4, backgroundColor: PALETTE.gold + "10" },
  maxedText: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1 },

  // compact
  compactWrap: { borderRadius: RADIUS.sm, overflow: "hidden" },
  compactInner: { flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm, overflow: "hidden" },
  compactImg: { width: 52, height: 52 },
  compactInfo: { flex: 1, gap: 1, paddingHorizontal: 10, paddingVertical: 8 },
  compactName: { fontSize: 12, fontFamily: FONT.semi, color: PALETTE.textHigh },
  compactLevel: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  pillWarm: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, marginRight: 8 },
  pillWarmText: { fontSize: 10, fontFamily: FONT.bold },
  upgChip: { width: 32, height: 32, borderRadius: 4, alignItems: "center", justifyContent: "center", marginRight: 8 },
  upgChipText: { fontSize: 14, fontFamily: FONT.bold },
});
