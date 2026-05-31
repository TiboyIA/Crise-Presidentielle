import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { SectionBackdrop } from "@/components/ui/SectionBackdrop";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import {
  computeComplianceRiskMap, getOverallRiskInfo,
  RISK_LEVEL_COLORS, type RiskCategory, type RiskLevel,
} from "@/logic/complianceRiskMapEngine";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const LEVEL_SHORT: Record<RiskLevel, string> = {
  "faible":            "FAIBLE",
  "sous surveillance": "SURVEILLANCE",
  "élevé":            "ÉLEVÉ",
  "critique":          "CRITIQUE",
};

function LevelBadge({ level }: { level: RiskLevel }) {
  const color = RISK_LEVEL_COLORS[level];
  return (
    <View style={[badge.wrap, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <Text style={[badge.text, { color }]}>{LEVEL_SHORT[level]}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.xs, borderWidth: StyleSheet.hairlineWidth },
  text: { fontFamily: FONT.bold, fontSize: 9, letterSpacing: 0.8 },
});

function DimRow({
  icon, label, level,
}: {
  icon: McIconName; label: string; level: RiskLevel;
}) {
  const color = RISK_LEVEL_COLORS[level];
  return (
    <View style={row.wrap}>
      <MaterialCommunityIcons name={icon} size={10} color={color} />
      <Text style={[row.label, { color: PALETTE.textLow }]}>{label}</Text>
      <View style={[row.dot, { backgroundColor: color }]} />
      <Text style={[row.val, { color }]}>{LEVEL_SHORT[level]}</Text>
    </View>
  );
}

const row = StyleSheet.create({
  wrap:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  label: { flex: 1, fontFamily: FONT.reg, fontSize: 10 },
  dot:   { width: 5, height: 5, borderRadius: 3 },
  val:   { fontFamily: FONT.semi, fontSize: 10, minWidth: 85, textAlign: "right" },
});

function RiskCard({ cat }: { cat: RiskCategory }) {
  const accent = RISK_LEVEL_COLORS[cat.overallLevel];
  return (
    <View style={[card.wrap, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={card.header}>
        <MaterialCommunityIcons name={cat.icon as McIconName} size={14} color={accent} />
        <Text style={[card.title, { color: accent }]}>{cat.label.toUpperCase()}</Text>
        <LevelBadge level={cat.overallLevel} />
      </View>

      {/* 4 dimensions */}
      <View style={{ marginTop: 8, marginBottom: 6 }}>
        <DimRow icon="trending-up"   label="Probabilité"  level={cat.probability} />
        <DimRow icon="alert-outline" label="Gravité"      level={cat.severity} />
        <DimRow icon="eye-outline"   label="Exposition"   level={cat.exposure} />
        <DimRow icon="shield-half-full" label="Contrôle"  level={cat.control} />
      </View>

      {/* Détail */}
      <Text style={card.detail}>{cat.detail}</Text>

      {/* Action recommandée */}
      <View style={card.actionRow}>
        <MaterialCommunityIcons name="lightbulb-outline" size={10} color={PALETTE.textLow} />
        <Text style={card.action}>{cat.recommendedAction}</Text>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: "#131825",
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ffffff14",
    padding: 12,
    marginBottom: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title:  { flex: 1, fontFamily: FONT.bold, fontSize: 11, letterSpacing: 1 },
  detail: { fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, marginBottom: 6, lineHeight: 14 },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#ffffff14" },
  action: { flex: 1, fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textMid, lineHeight: 14, fontStyle: "italic" },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ComplianceScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { state } = useStrategy();

  const riskMap = useMemo(
    () => state ? computeComplianceRiskMap(state) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.mandateDay, state?.complianceState, state?.abuseOfPowerState, state?.aiGovernanceState],
  );

  if (!state || !riskMap) return null;

  const overall = getOverallRiskInfo(riskMap.overallScore);

  // Tri : critique → élevé → sous surveillance → faible
  const ORDER: RiskLevel[] = ["critique", "élevé", "sous surveillance", "faible"];
  const sorted = [...riskMap.categories].sort(
    (a, b) => ORDER.indexOf(a.overallLevel) - ORDER.indexOf(b.overallLevel),
  );

  return (
    <View style={styles.container}>
      <SectionBackdrop section="securite" intensity={0.4} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={PALETTE.textHigh} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>TABLEAU DE BORD</Text>
          <Text style={styles.title}>Cartographie des risques conformité</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Score global */}
        <View style={[styles.overallCard, { borderColor: overall.color + "44" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="chart-donut" size={16} color={overall.color} />
            <Text style={[styles.overallLabel, { color: overall.color }]}>{overall.label.toUpperCase()}</Text>
            {riskMap.criticalCount > 0 && (
              <View style={[badge.wrap, { backgroundColor: "#e5484822", borderColor: "#e5484855", marginLeft: "auto" }]}>
                <Text style={[badge.text, { color: "#e54848" }]}>{riskMap.criticalCount} CRITIQUE{riskMap.criticalCount > 1 ? "S" : ""}</Text>
              </View>
            )}
          </View>

          {/* Barre synthétique */}
          <View style={{ height: 6, backgroundColor: "#ffffff14", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <View style={{ width: `${riskMap.overallScore}%` as `${number}%`, height: "100%", backgroundColor: overall.color, borderRadius: 3 }} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={styles.overallMeta}>Score global : {riskMap.overallScore} / 100</Text>
            <Text style={styles.overallMeta}>Jour mandat : {riskMap.generatedAtDay}</Text>
          </View>

          {/* Résumé compteurs */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[
              { label: "Critique", count: riskMap.criticalCount, color: "#e54848" },
              { label: "Élevé",    count: riskMap.elevatedCount,  color: "#e8864f" },
              { label: "Surveillance", count: sorted.filter((c) => c.overallLevel === "sous surveillance").length, color: "#e8c44f" },
              { label: "Faible",   count: sorted.filter((c) => c.overallLevel === "faible").length,    color: "#4caf82" },
            ].map((s) => (
              <View key={s.label} style={[styles.countChip, { borderColor: s.color + "44" }]}>
                <View style={[styles.countDot, { backgroundColor: s.color }]} />
                <Text style={[styles.countText, { color: s.color }]}>{s.count}</Text>
                <Text style={[styles.countLabel, { color: PALETTE.textLow }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Catégories triées */}
        {sorted.map((cat) => <RiskCard key={cat.id} cat={cat} />)}

        <Text style={styles.footer}>
          Données synthétisées à partir des systèmes MODE DELTA actifs. Mise à jour à chaque jour de mandat.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0c14" },
  header: {
    flexDirection: "row", alignItems: "flex-end", gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#0a0c14ee",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ffffff14",
  },
  backBtn:  { padding: 4 },
  kicker:   { fontFamily: FONT.bold, fontSize: 8, color: PALETTE.textLow, letterSpacing: 2, marginBottom: 2 },
  title:    { fontFamily: FONT.bold, fontSize: 15, color: PALETTE.textHigh, letterSpacing: 0.5 },
  scroll:   { paddingHorizontal: 14, paddingTop: 14 },
  overallCard: {
    backgroundColor: "#131825",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  overallLabel: { flex: 1, fontFamily: FONT.bold, fontSize: 13, letterSpacing: 1 },
  overallMeta:  { fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow },
  countChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.xs, borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#ffffff08",
  },
  countDot:   { width: 6, height: 6, borderRadius: 3 },
  countText:  { fontFamily: FONT.bold, fontSize: 12 },
  countLabel: { fontFamily: FONT.reg, fontSize: 10 },
  footer: {
    fontFamily: FONT.reg, fontSize: 9, color: PALETTE.textLow,
    textAlign: "center", paddingTop: 8, lineHeight: 13,
  },
});
