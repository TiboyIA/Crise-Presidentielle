import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import {
  computeRiskRegister,
  RISK_CATEGORY_COLORS,
  RISK_CATEGORY_LABELS,
  RISK_STATUS_COLORS,
  RISK_STATUS_LABELS,
  type RiskCategory,
} from "@/logic/riskRegisterEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

type McIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const CAT_ICON: Record<RiskCategory, McIcon> = {
  climat:      "thermometer",
  cyber:       "shield-lock-outline",
  dette:       "trending-down",
  energie:     "lightning-bolt",
  social:      "account-group",
  militaire:   "sword-cross",
  diplomatique:"earth",
  industriel:  "factory",
};

function barColor(pct: number, invert = false): string {
  const v = invert ? 100 - pct : pct;
  if (v >= 65) return PALETTE.danger;
  if (v >= 40) return "#e8a93a";
  return "#3fbe7a";
}

export default function RisksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStrategy();

  const register = useMemo(() => state ? computeRiskRegister(state) : null, [state]);

  if (!state || !register) return null;

  const { topFive, globalRiskLevel, criticalCount, coverageAvg, risks } = register;

  // Couverture moyenne par catégorie (pour le panneau de synthèse)
  const catCoverages = useMemo(() => {
    const groups = new Map<RiskCategory, { total: number; count: number }>();
    for (const r of risks) {
      const g = groups.get(r.category) ?? { total: 0, count: 0 };
      g.total += r.coverageLevel;
      g.count += 1;
      groups.set(r.category, g);
    }
    return Array.from(groups.entries())
      .map(([cat, g]) => ({ cat, avg: Math.round(g.total / g.count) }))
      .sort((a, b) => a.avg - b.avg);
  }, [risks]);

  // Actions prioritaires déduites des top risques (sans doublons)
  const priorityActions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of topFive) {
      for (const a of r.mitigationActions) {
        if (!seen.has(a) && out.length < 5) { seen.add(a); out.push(a); }
      }
    }
    return out;
  }, [topFive]);

  const globalColor = globalRiskLevel >= 55 ? PALETTE.danger : globalRiskLevel >= 35 ? "#e8a93a" : "#3fbe7a";

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={["#0a0e18", "#060810"]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backBtn}>← RETOUR</Text>
          </Pressable>
          <Text style={styles.headerTitle}>REGISTRE DES RISQUES</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerSub}>
          Analyse actuarielle des expositions nationales — probabilité × gravité × exposition
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Synthèse ── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: globalColor + "55", backgroundColor: globalColor + "0d" }]}>
            <Text style={styles.summaryLabel}>NIVEAU DE RISQUE</Text>
            <Text style={[styles.summaryNum, { color: globalColor }]}>{globalRiskLevel}</Text>
            <Text style={styles.summaryMax}>/100</Text>
          </View>
          <View style={[
            styles.summaryCard,
            {
              borderColor: criticalCount > 0 ? PALETTE.danger + "55" : PALETTE.panelEdge,
              backgroundColor: criticalCount > 0 ? PALETTE.danger + "0d" : PALETTE.panelHi,
            },
          ]}>
            <Text style={styles.summaryLabel}>RISQUES CRITIQUES</Text>
            <Text style={[styles.summaryNum, { color: criticalCount > 0 ? PALETTE.danger : PALETTE.textHigh }]}>
              {criticalCount}
            </Text>
            <Text style={styles.summaryMax}>risques</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: PALETTE.panelEdge, backgroundColor: PALETTE.panelHi }]}>
            <Text style={styles.summaryLabel}>PROTECTION MOY.</Text>
            <Text style={[styles.summaryNum, { color: coverageAvg >= 55 ? "#3fbe7a" : coverageAvg >= 35 ? "#e8a93a" : PALETTE.danger }]}>
              {coverageAvg}%
            </Text>
            <Text style={styles.summaryMax}>couvert</Text>
          </View>
        </View>

        {/* ── Top 5 ── */}
        <View style={styles.sectionRow}>
          <MaterialCommunityIcons name="alert-decagram-outline" size={13} color={PALETTE.gold} />
          <Text style={styles.sectionTitle}>TOP 5 EXPOSITIONS MAJEURES</Text>
        </View>

        {topFive.map((risk, idx) => {
          const sc = RISK_STATUS_COLORS[risk.status];
          const cc = RISK_CATEGORY_COLORS[risk.category];
          const ci = CAT_ICON[risk.category];

          return (
            <View key={risk.id} style={[styles.riskCard, { borderColor: sc + "44" }]}>
              {/* Bande de rang */}
              <View style={[styles.rankBand, { backgroundColor: sc }]}>
                <Text style={styles.rankNum}>{idx + 1}</Text>
              </View>

              <View style={styles.riskBody}>
                {/* En-tête */}
                <View style={styles.riskHead}>
                  <MaterialCommunityIcons name={ci} size={14} color={cc} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riskName} numberOfLines={2}>{risk.name}</Text>
                    <Text style={[styles.riskCatLabel, { color: cc }]}>
                      {RISK_CATEGORY_LABELS[risk.category].toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: sc + "55", backgroundColor: sc + "1a" }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{RISK_STATUS_LABELS[risk.status]}</Text>
                  </View>
                </View>

                {/* Barres probabilité / gravité */}
                <View style={styles.barsRow}>
                  <View style={styles.barGroup}>
                    <Text style={styles.barLabel}>PROBABILITÉ</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, {
                        width: `${risk.probabilityScore}%`,
                        backgroundColor: barColor(risk.probabilityScore),
                      }]} />
                    </View>
                    <Text style={styles.barVal}>{risk.probabilityScore}%</Text>
                  </View>
                  <View style={styles.barGroup}>
                    <Text style={styles.barLabel}>GRAVITÉ</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, {
                        width: `${risk.severityScore}%`,
                        backgroundColor: barColor(risk.severityScore),
                      }]} />
                    </View>
                    <Text style={styles.barVal}>{risk.severityScore}%</Text>
                  </View>
                </View>

                {/* Perte + protection */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>PERTE ESTIMÉE</Text>
                    <Text style={[styles.metricVal, {
                      color: risk.expectedLoss >= 500 ? PALETTE.danger
                           : risk.expectedLoss >= 220 ? "#e8a93a"
                           : PALETTE.textHigh,
                    }]}>
                      {risk.expectedLoss} M€
                    </Text>
                  </View>
                  <View style={styles.protGroup}>
                    <Text style={styles.metricLabel}>PROTECTION</Text>
                    <View style={styles.protTrack}>
                      <View style={[styles.protFill, {
                        width: `${risk.coverageLevel}%`,
                        backgroundColor: risk.coverageLevel >= 60 ? "#3fbe7a"
                                       : risk.coverageLevel >= 30 ? "#e8a93a"
                                       : PALETTE.danger,
                      }]} />
                    </View>
                    <Text style={[styles.protVal, {
                      color: risk.coverageLevel >= 60 ? "#3fbe7a"
                           : risk.coverageLevel >= 30 ? "#e8a93a"
                           : PALETTE.danger,
                    }]}>{risk.coverageLevel}%</Text>
                  </View>
                </View>

                {/* Action recommandée */}
                {risk.mitigationActions[0] != null && (
                  <View style={styles.actionRow}>
                    <MaterialCommunityIcons name="arrow-right-circle-outline" size={11} color={cc} />
                    <Text style={[styles.actionText, { color: cc }]} numberOfLines={1}>
                      {risk.mitigationActions[0]}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* ── Couverture par domaine ── */}
        <View style={styles.sectionRow}>
          <MaterialCommunityIcons name="shield-half-full" size={13} color={PALETTE.gold} />
          <Text style={styles.sectionTitle}>COUVERTURE PAR DOMAINE</Text>
        </View>
        <View style={styles.covPanel}>
          {catCoverages.map(({ cat, avg }) => {
            const cc = RISK_CATEGORY_COLORS[cat];
            const ci = CAT_ICON[cat];
            const covColor = avg >= 60 ? "#3fbe7a" : avg >= 35 ? "#e8a93a" : PALETTE.danger;
            return (
              <View key={cat} style={styles.covRow}>
                <MaterialCommunityIcons name={ci} size={12} color={cc} style={{ width: 16 }} />
                <Text style={[styles.covCat, { color: cc }]}>{RISK_CATEGORY_LABELS[cat]}</Text>
                <View style={styles.covTrack}>
                  <View style={[styles.covFill, { width: `${avg}%`, backgroundColor: cc + "aa" }]} />
                </View>
                <Text style={[styles.covVal, { color: covColor }]}>{avg}%</Text>
              </View>
            );
          })}
        </View>

        {/* ── Actions prioritaires ── */}
        <View style={styles.sectionRow}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={13} color={PALETTE.gold} />
          <Text style={styles.sectionTitle}>ACTIONS PRIORITAIRES</Text>
        </View>
        <View style={styles.actionsPanel}>
          {priorityActions.map((action, i) => {
            const dotColor = i === 0 ? PALETTE.danger : i === 1 ? "#e8a93a" : "#3fbe7a";
            return (
              <View key={action} style={styles.priorityRow}>
                <View style={[styles.priorityBullet, { backgroundColor: dotColor }]}>
                  <Text style={styles.priorityNum}>{i + 1}</Text>
                </View>
                <Text style={styles.priorityText}>{action}</Text>
              </View>
            );
          })}
        </View>

        {/* Légende */}
        <View style={styles.legend}>
          <MaterialCommunityIcons name="information-outline" size={12} color={PALETTE.textLow} />
          <Text style={styles.legendText}>
            La perte estimée = probabilité × gravité × exposition maximale par risque.
            La protection intègre vos assurances, obligations catastrophe et ressources stratégiques.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  headerTitle: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 2.5 },
  headerSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15 },

  content: { padding: 16, gap: 12 },

  // Synthèse
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  summaryLabel: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.2, textAlign: "center" },
  summaryNum: { fontSize: 22, fontFamily: FONT.bold },
  summaryMax: { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textLow },

  // Sections
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sectionTitle: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },

  // Risk cards
  riskCard: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: PALETTE.panelHi,
    overflow: "hidden",
  },
  rankBand: { width: 28, alignItems: "center", justifyContent: "center" },
  rankNum: { fontSize: 11, fontFamily: FONT.bold, color: "#fff" },
  riskBody: { flex: 1, padding: 12, gap: 8 },

  riskHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  riskName: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh, lineHeight: 16, flex: 1 },
  riskCatLabel: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1.5, marginTop: 2 },
  statusBadge: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  statusText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 1 },

  barsRow: { flexDirection: "row", gap: 12 },
  barGroup: { flex: 1, gap: 3 },
  barLabel: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  barVal: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textHigh },

  metricsRow: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PALETTE.panelEdge, paddingTop: 8 },
  metricItem: { gap: 2 },
  metricLabel: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },
  metricVal: { fontSize: 15, fontFamily: FONT.bold },
  protGroup: { flex: 1, gap: 3 },
  protTrack: { height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  protFill: { height: "100%", borderRadius: 3 },
  protVal: { fontSize: 10, fontFamily: FONT.bold, textAlign: "right" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { flex: 1, fontSize: 10, fontFamily: FONT.semi, lineHeight: 14 },

  // Couverture par domaine
  covPanel: {
    backgroundColor: PALETTE.panelHi,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    padding: 12,
    gap: 8,
  },
  covRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  covCat: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 1, width: 78 },
  covTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  covFill: { height: "100%", borderRadius: 3 },
  covVal: { fontSize: 10, fontFamily: FONT.bold, width: 30, textAlign: "right" },

  // Actions prioritaires
  actionsPanel: {
    backgroundColor: PALETTE.panelHi,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    padding: 12,
    gap: 10,
  },
  priorityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  priorityBullet: {
    width: 20, height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityNum: { fontSize: 9, fontFamily: FONT.bold, color: "#fff" },
  priorityText: { flex: 1, fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh, lineHeight: 16 },

  // Légende
  legend: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
  },
  legendText: { flex: 1, fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 14 },
});
