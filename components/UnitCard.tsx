import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { UNIT_IMG } from "@/constants/assets";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { BRANCH_COLORS, RARITY_COLORS, RARITY_LABELS } from "@/data/units";
import { scaleUnitStat } from "@/types/units";
import type { UnitDef, PlayerUnit } from "@/types/units";
import type { StrategyResources } from "@/types/strategy";

interface Props {
  def: UnitDef;
  playerUnit?: PlayerUnit;       // undefined = not yet owned
  canAfford: boolean;
  onTrain: (qty: number) => void;
  onDetails?: () => void;
  compact?: boolean;
}

const QTY_OPTIONS = [1, 5, 10] as const;

export function UnitCard({ def, playerUnit, canAfford, onTrain, onDetails, compact = false }: Props) {
  const level = playerUnit?.level ?? 1;
  const qty = playerUnit?.quantity ?? 0;
  const branchColor = BRANCH_COLORS[def.branch] ?? PALETTE.gold;
  const rarityColor = RARITY_COLORS[def.rarity] ?? PALETTE.textMid;
  const power = scaleUnitStat(def.power, level);
  const img = UNIT_IMG[def.id];

  if (compact) {
    return (
      <View style={[styles.compactWrap, { borderColor: branchColor + "44" }]}>
        <LinearGradient colors={["#161b27", "#0c1018"]} style={styles.compactInner}>
          {img && <Image source={img} style={styles.compactImg} resizeMode="cover" />}
          <LinearGradient colors={["rgba(13,17,25,0)", "rgba(13,17,25,0.9)"]} style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.sm }]} />
          <View style={[styles.compactAccent, { backgroundColor: branchColor }]} />
          <View style={styles.compactBody}>
            <Text style={styles.compactName} numberOfLines={1}>{def.name}</Text>
            <Text style={[styles.compactBranch, { color: branchColor }]}>{def.branch.toUpperCase()}</Text>
          </View>
          <View style={styles.compactRight}>
            <Text style={[styles.compactPower, { color: branchColor }]}>{power}</Text>
            <Text style={styles.compactQty}>×{qty}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: branchColor + "55" }]}>
      <LinearGradient colors={["#1a1f2c", "#0d1119"]} style={styles.cardInner}>
        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: branchColor }]} />

        {/* Banner */}
        <View style={styles.bannerWrap}>
          {img && <Image source={img} style={styles.banner} resizeMode="cover" />}
          <LinearGradient colors={["rgba(13,17,25,0)", "rgba(13,17,25,0.88)"]} style={StyleSheet.absoluteFill} />
          {/* Top badges */}
          <View style={styles.bannerTopLeft}>
            <View style={[styles.rarityChip, { borderColor: rarityColor + "88", backgroundColor: rarityColor + "22" }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>{RARITY_LABELS[def.rarity]}</Text>
            </View>
          </View>
          <View style={styles.bannerTopRight}>
            {qty > 0 && (
              <View style={[styles.qtyBadge, { backgroundColor: branchColor + "33", borderColor: branchColor }]}>
                <Text style={[styles.qtyText, { color: branchColor }]}>×{qty}</Text>
              </View>
            )}
          </View>
          {/* Power bottom */}
          <View style={styles.bannerBottom}>
            <MaterialCommunityIcons name="lightning-bolt" size={11} color={branchColor} />
            <Text style={[styles.powerNum, { color: branchColor }]}>{power}</Text>
            {level > 1 && <Text style={styles.levelBadge}>NIV.{level}</Text>}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.name}>{def.name}</Text>
          <Text style={[styles.branch, { color: branchColor }]}>{def.branch.toUpperCase()} · {def.roles[0].replace("_", " ").toUpperCase()}</Text>
          <Text style={styles.desc} numberOfLines={2}>{def.description}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: "ATK", val: scaleUnitStat(def.attack, level), color: "#e54848" },
              { label: "DEF", val: scaleUnitStat(def.defense, level), color: "#4a9fff" },
              { label: "VIT", val: def.speed,                         color: "#52c97a" },
              { label: "FUR", val: def.stealth,                       color: "#a78bfa" },
              { label: "POR", val: def.range,                         color: "#e8a93a" },
            ].map((s) => (
              <View key={s.label} style={styles.statChip}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Training time & cost */}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={11} color={PALETTE.textLow} />
            <Text style={styles.metaText}>{formatTrainingTime(def.trainingTimeSec)}</Text>
            <View style={styles.metaSep} />
            {Object.entries(def.baseCost).slice(0, 3).map(([k, v]) => (
              <View key={k} style={styles.costChip}>
                <Text style={styles.costVal}>{v}</Text>
                <Text style={styles.costKey}>{k.slice(0, 3).toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {/* Train buttons */}
          <View style={styles.trainRow}>
            {QTY_OPTIONS.map((q) => (
              <Pressable
                key={q}
                onPress={() => onTrain(q)}
                style={({ pressed }) => [
                  styles.trainBtn,
                  { opacity: pressed ? 0.75 : 1, backgroundColor: canAfford ? branchColor + "22" : "transparent", borderColor: canAfford ? branchColor + "88" : PALETTE.panelEdge },
                ]}
              >
                <Text style={[styles.trainBtnText, { color: canAfford ? branchColor : PALETTE.textLow }]}>×{q}</Text>
              </Pressable>
            ))}
            {onDetails && (
              <Pressable onPress={onDetails} style={({ pressed }) => [styles.detailBtn, { opacity: pressed ? 0.7 : 1 }]}>
                <MaterialCommunityIcons name="information-outline" size={14} color={PALETTE.textMid} />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function formatTrainingTime(sec: number): string {
  if (sec < 3600) return `${Math.round(sec / 60)}min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  cardInner: { borderRadius: RADIUS.md, overflow: "hidden" },
  accentBar: { height: 2, width: "100%" },

  bannerWrap: { height: 100, position: "relative", overflow: "hidden" },
  banner: { width: "100%", height: "100%" },
  bannerTopLeft: { position: "absolute", top: 6, left: 6, flexDirection: "row", gap: 4 },
  bannerTopRight: { position: "absolute", top: 6, right: 6 },
  bannerBottom: { position: "absolute", bottom: 6, left: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  rarityChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs, borderWidth: 1 },
  rarityText: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 0.8 },
  qtyBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1 },
  qtyText: { fontSize: 11, fontFamily: FONT.bold },
  powerNum: { fontSize: 14, fontFamily: FONT.bold, letterSpacing: 0.5 },
  levelBadge: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, letterSpacing: 1 },

  body: { padding: 10, gap: 7 },
  name: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh },
  branch: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1.5 },
  desc: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14 },

  statsRow: { flexDirection: "row", gap: 4 },
  statChip: { flex: 1, alignItems: "center", paddingVertical: 4, borderRadius: RADIUS.xs, backgroundColor: PALETTE.panelHi, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },
  statVal: { fontSize: 11, fontFamily: FONT.bold },
  statLbl: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.8 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaText: { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textLow },
  metaSep: { width: 1, height: 10, backgroundColor: PALETTE.panelEdge, marginHorizontal: 2 },
  costChip: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  costVal: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textHigh },
  costKey: { fontSize: 8, fontFamily: FONT.med, color: PALETTE.textLow },

  trainRow: { flexDirection: "row", gap: 6 },
  trainBtn: { flex: 1, paddingVertical: 7, borderRadius: RADIUS.xs, borderWidth: 1, alignItems: "center" },
  trainBtnText: { fontSize: 11, fontFamily: FONT.bold },
  detailBtn: { width: 32, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },

  // compact
  compactWrap: { borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  compactInner: { flexDirection: "row", alignItems: "center", position: "relative", overflow: "hidden" },
  compactAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 2 },
  compactImg: { width: 52, height: 52 },
  compactBody: { flex: 1, paddingHorizontal: 8, gap: 2 },
  compactName: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh },
  compactBranch: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1 },
  compactRight: { paddingRight: 10, alignItems: "flex-end" },
  compactPower: { fontSize: 13, fontFamily: FONT.bold },
  compactQty: { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textMid },
});
