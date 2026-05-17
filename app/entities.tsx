import React, { useState } from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStrategy } from "@/context/StrategyContext";
import { FACTIONS, FACTION_STATUS_COLORS, FACTION_STATUS_LABELS, getFactionStatus } from "@/data/factions";
import type { FactionDef } from "@/data/factions";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { StrategyGameState } from "@/types/strategy";

function computeAuroriaScore(state: StrategyGameState): number {
  const base = state.cosmicInfluence?.auroria ?? 10;
  const ind = state.nationalIndicators;
  const hp = state.hiddenPolitics;
  let score = base;
  if (ind.cohesion >= 60) score += 12;
  if (ind.cohesion >= 75) score += 8;
  if (hp.institutionalStability >= 60) score += 10;
  if (hp.scandalRisk < 30) score += 10;
  if (hp.scandalRisk > 60) score -= 15;
  if (state.resources.cyberDefense >= 50) score += 8;
  if (ind.popularity >= 65) score += 5;
  if (state.governanceDoctrine === "autoritaire") score -= 15;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function computeObscuriumScore(state: StrategyGameState): number {
  const base = state.cosmicInfluence?.obscurium ?? 10;
  const hp = state.hiddenPolitics;
  let score = base;
  if (hp.scandalRisk > 50) score += 15;
  if (hp.scandalRisk > 70) score += 10;
  if (hp.popularFatigue > 55) score += 12;
  if (hp.mediaMood < 30) score += 10;
  if (state.resources.cyberDefense < 40) score += 10;
  if (state.governanceDoctrine === "autoritaire") score += 12;
  if (state.nationalIndicators.cohesion < 30) score += 10;
  if (state.resources.cyberDefense >= 70) score -= 10;
  if (hp.scandalRisk < 20) score -= 8;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function isDiscovered(state: StrategyGameState): boolean {
  return (
    (state.cosmicInfluence?.discovered ?? false) ||
    state.news.log.some((l) => l.eventId.startsWith("cosmic_")) ||
    state.news.pendingIds.some((id) => id.startsWith("cosmic_"))
  );
}

function lastCosmicSignal(state: StrategyGameState): string | null {
  const cosmicLog = state.news.log.filter((l) => l.eventId.startsWith("cosmic_"));
  if (cosmicLog.length === 0) return null;
  return cosmicLog[cosmicLog.length - 1].title;
}

export default function EntitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStrategy();

  if (!state) return null;

  const auroriaScore = computeAuroriaScore(state);
  const obscuriumScore = computeObscuriumScore(state);
  const discovered = isDiscovered(state);
  const lastSignal = lastCosmicSignal(state);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#080c14", "#0a0c14"]} style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>NIVEAU CLASSIFIÉ OMEGA</Text>
          <Text style={styles.headerTitle}>FORCES COSMIQUES</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introBox}>
          <MaterialCommunityIcons name="orbit" size={18} color={PALETTE.textLow} />
          <Text style={styles.introText}>
            Ces entités observent chaque décision depuis les marges de votre histoire.
            Elles n'interviennent que dans les crises extrêmes — et seulement si vous leur en donnez la raison.
          </Text>
        </View>

        {!discovered && (
          <View style={styles.undiscoveredBox}>
            <MaterialCommunityIcons name="eye-off-outline" size={28} color={PALETTE.textLow} />
            <Text style={styles.undiscoveredTitle}>AUCUN SIGNAL DÉTECTÉ</Text>
            <Text style={styles.undiscoveredSub}>
              Ces forces n'ont pas encore manifesté leur présence dans votre mandat.
              Elles agissent dans l'ombre, et elles attendent.
            </Text>
          </View>
        )}

        {discovered && lastSignal && (
          <View style={styles.lastSignalRow}>
            <MaterialCommunityIcons name="antenna" size={12} color={PALETTE.warning} />
            <Text style={styles.lastSignalLabel}>DERNIER SIGNAL DÉTECTÉ</Text>
            <Text style={styles.lastSignalText} numberOfLines={1}>{lastSignal}</Text>
          </View>
        )}

        {/* AURORIA */}
        <FactionCard
          def={FACTIONS.auroria}
          score={auroriaScore}
          discovered={discovered}
        />

        {/* OBSCURIUM */}
        <FactionCard
          def={FACTIONS.obscurium}
          score={obscuriumScore}
          discovered={discovered}
        />

        {/* Footer doctrine */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerQuote}>
            "Ces forces ne donnent ni victoire automatique ni défaite certaine.{"\n"}
            Elles amplifient ce que vous choisissez d'être."
          </Text>
          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </View>
  );
}

function FactionCard({ def, score, discovered }: {
  def: FactionDef;
  score: number;
  discovered: boolean;
}) {
  const [powersOpen, setPowersOpen] = useState(false);
  const [weakOpen, setWeakOpen] = useState(false);

  const status = getFactionStatus(score);
  const statusColor = FACTION_STATUS_COLORS[status];
  const statusLabel = FACTION_STATUS_LABELS[status];
  const isAuroria = def.id === "auroria";

  const borderColor = def.color + "55";
  const glowColor = def.color;

  return (
    <View style={[
      styles.card,
      { borderColor },
      { shadowColor: glowColor },
    ]}>
      {/* Top accent bar */}
      <View style={[styles.cardAccentBar, { backgroundColor: def.color + "30" }]}>
        <LinearGradient
          colors={[def.color + "20", "transparent"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardTopRow}>
          <View style={[styles.alignmentChip, { borderColor: def.color + "66", backgroundColor: def.color + "15" }]}>
            <MaterialCommunityIcons
              name={isAuroria ? "shield-star-outline" : "eye-outline"}
              size={11}
              color={def.color}
            />
            <Text style={[styles.alignmentLabel, { color: def.color }]}>
              {isAuroria ? "GARDIENNE" : "PRÉDATEUR"}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: statusColor + "20", borderColor: statusColor + "55" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={[styles.factionName, { color: def.color }]}>{def.name}</Text>
        <Text style={styles.factionDesc}>{def.description}</Text>

        {/* Intelligence level */}
        <View style={styles.intelRow}>
          <MaterialCommunityIcons name="brain" size={12} color={def.secondaryColor} />
          <Text style={[styles.intelLabel, { color: def.secondaryColor }]}>INTELLIGENCE</Text>
          <Text style={styles.intelText}>{def.intelligenceLevel}</Text>
        </View>

        {/* Influence score bar */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreLabelRow}>
            <Text style={styles.scoreLabel}>NIVEAU D'INFLUENCE</Text>
            <Text style={[styles.scoreValue, { color: def.color }]}>{discovered ? score : "???"}</Text>
          </View>
          <View style={styles.scoreTrack}>
            <View
              style={[
                styles.scoreFill,
                {
                  width: discovered ? `${score}%` : "5%",
                  backgroundColor: def.color,
                  opacity: discovered ? 1 : 0.3,
                },
              ]}
            />
            {/* Threshold markers */}
            <View style={[styles.thresholdMark, { left: `${def.statusThresholds.observateur}%` }]} />
            <View style={[styles.thresholdMark, { left: `${def.statusThresholds.actif}%` }]} />
            <View style={[styles.thresholdMark, { left: `${def.statusThresholds.imminente}%` }]} />
          </View>
          <View style={styles.thresholdLabels}>
            <Text style={styles.thresholdLabel} />
            <Text style={styles.thresholdLabel}>Observateur</Text>
            <Text style={styles.thresholdLabel}>Actif</Text>
            <Text style={styles.thresholdLabel}>Imminente</Text>
          </View>
        </View>

        {/* Doctrine */}
        <View style={[styles.doctrineBox, { borderLeftColor: def.color }]}>
          <Text style={styles.doctrineText}>"{def.doctrine}"</Text>
        </View>

        {/* Powers — collapsible */}
        <Pressable
          style={styles.expandBtn}
          onPress={() => setPowersOpen((v) => !v)}
        >
          <MaterialCommunityIcons
            name={isAuroria ? "shield-check-outline" : "lightning-bolt"}
            size={13}
            color={def.color}
          />
          <Text style={[styles.expandLabel, { color: def.color }]}>
            {isAuroria ? "CAPACITÉS" : "POUVOIRS"} ({def.powers.length})
          </Text>
          <MaterialCommunityIcons
            name={powersOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={PALETTE.textLow}
          />
        </Pressable>
        {powersOpen && (
          <View style={styles.listBox}>
            {def.powers.map((p, i) => (
              <View key={i} style={styles.listRow}>
                <View style={[styles.listDot, { backgroundColor: def.color }]} />
                <Text style={styles.listItem}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weaknesses — collapsible */}
        <Pressable
          style={styles.expandBtn}
          onPress={() => setWeakOpen((v) => !v)}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={13} color={PALETTE.textLow} />
          <Text style={styles.expandLabel}>FAIBLESSES ({def.weaknesses.length})</Text>
          <MaterialCommunityIcons
            name={weakOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={PALETTE.textLow}
          />
        </Pressable>
        {weakOpen && (
          <View style={styles.listBox}>
            {def.weaknesses.map((w, i) => (
              <View key={i} style={styles.listRow}>
                <View style={[styles.listDot, { backgroundColor: PALETTE.warning }]} />
                <Text style={styles.listItem}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Intervention conditions */}
        <View style={styles.condSection}>
          <Text style={styles.condTitle}>CONDITIONS D'INTERVENTION</Text>
          {def.interventionConditions.map((c, i) => (
            <View key={i} style={styles.condRow}>
              <MaterialCommunityIcons name="chevron-right" size={12} color={def.color + "99"} />
              <Text style={styles.condItem}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#05070d",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#161b27",
  },
  backBtn: {
    width: 40,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerKicker: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 3,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: PALETTE.textHigh,
    letterSpacing: 2,
  },

  scroll: {
    padding: 16,
    gap: 16,
  },

  introBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#0f131c",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#1e2536",
    padding: 14,
  },
  introText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    lineHeight: 18,
  },

  undiscoveredBox: {
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0b0e18",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#1a1f2e",
    padding: 28,
    borderStyle: "dashed",
  },
  undiscoveredTitle: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 3,
  },
  undiscoveredSub: {
    fontSize: 12,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },

  lastSignalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0f1320",
    borderRadius: RADIUS.xs,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e8a93a22",
  },
  lastSignalLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: PALETTE.warning,
    letterSpacing: 2,
  },
  lastSignalText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT.med,
    color: PALETTE.textMid,
  },

  // ── FACTION CARD ──────────────────────────────────────────────
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    backgroundColor: "#0b0f1a",
    overflow: "hidden",
    // glow applied inline (shadowColor)
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 4,
  },

  cardAccentBar: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alignmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  alignmentLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 1.5,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 1,
  },

  cardBody: {
    padding: 16,
    gap: 14,
  },
  factionName: {
    fontSize: 20,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
  factionDesc: {
    fontSize: 13,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    lineHeight: 20,
  },

  intelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#0f131c",
    borderRadius: RADIUS.xs,
    padding: 10,
  },
  intelLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 2,
    marginTop: 1,
  },
  intelText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    lineHeight: 16,
  },

  scoreSection: {
    gap: 6,
  },
  scoreLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 13,
    fontFamily: FONT.bold,
  },
  scoreTrack: {
    height: 6,
    backgroundColor: "#161b27",
    borderRadius: 3,
    overflow: "visible",
    position: "relative",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 3,
  },
  thresholdMark: {
    position: "absolute",
    top: -2,
    width: 1.5,
    height: 10,
    backgroundColor: "#2a3048",
    borderRadius: 1,
  },
  thresholdLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  thresholdLabel: {
    fontSize: 8,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
  },

  doctrineBox: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  doctrineText: {
    fontSize: 12,
    fontFamily: FONT.med,
    color: PALETTE.textMid,
    fontStyle: "italic",
    lineHeight: 18,
  },

  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#161b27",
  },
  expandLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 1.5,
  },

  listBox: {
    gap: 8,
    paddingLeft: 4,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  listDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
  },
  listItem: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    lineHeight: 18,
  },

  condSection: {
    gap: 6,
    backgroundColor: "#0f131c",
    borderRadius: RADIUS.sm,
    padding: 12,
  },
  condTitle: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 2,
    marginBottom: 2,
  },
  condRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  condItem: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    lineHeight: 17,
  },

  // ── FOOTER ───────────────────────────────────────────────────
  footer: {
    alignItems: "center",
    gap: 14,
    paddingTop: 8,
  },
  footerLine: {
    width: "60%",
    height: 1,
    backgroundColor: "#1e2536",
  },
  footerQuote: {
    fontSize: 12,
    fontFamily: FONT.med,
    color: PALETTE.textLow,
    textAlign: "center",
    lineHeight: 19,
    fontStyle: "italic",
    paddingHorizontal: 24,
  },
});
