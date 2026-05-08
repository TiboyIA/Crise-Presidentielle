import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { computeMandateScore } from "@/context/StrategyContext";
import { Panel } from "@/components/ui";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { NationalIndicators } from "@/types/strategy";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const INDICATOR_META: { key: keyof NationalIndicators; label: string; icon: McIconName; color: string }[] = [
  { key: "popularity",   label: "Popularité",    icon: "account-group",        color: "#c9a84c" },
  { key: "economy",      label: "Économie",       icon: "chart-line",           color: "#3fbe7a" },
  { key: "security",     label: "Sécurité",       icon: "shield-check",         color: "#4a9fff" },
  { key: "ecology",      label: "Écologie",       icon: "leaf",                 color: "#52c97a" },
  { key: "cohesion",     label: "Cohésion",       icon: "handshake",            color: "#a78bfa" },
  { key: "publicBudget", label: "Budget Public",  icon: "bank-outline",         color: "#e8a93a" },
];

function getRecommendation(ind: NationalIndicators): { text: string; icon: McIconName } {
  const entries: { key: keyof NationalIndicators; val: number }[] = [
    { key: "popularity",   val: ind.popularity },
    { key: "economy",      val: ind.economy },
    { key: "security",     val: ind.security },
    { key: "ecology",      val: ind.ecology },
    { key: "cohesion",     val: ind.cohesion },
    { key: "publicBudget", val: ind.publicBudget < 0 ? 0 : ind.publicBudget },
  ];
  const lowest = entries.sort((a, b) => a.val - b.val)[0];
  switch (lowest.key) {
    case "popularity":   return { text: "Priorité à la communication et au dialogue social.", icon: "account-voice" };
    case "economy":      return { text: "Stimulez l'économie nationale et réduisez la dette.", icon: "chart-line-variant" };
    case "security":     return { text: "Renforcez les capacités militaires et le renseignement.", icon: "shield-star" };
    case "ecology":      return { text: "Des actions climatiques urgentes s'imposent.", icon: "leaf" };
    case "cohesion":     return { text: "Investissez dans la cohésion nationale et les services publics.", icon: "handshake" };
    default:             return { text: "Position stable — consolidez les acquis.", icon: "trending-up" };
  }
}

function getApprovalLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Très favorable", color: PALETTE.success };
  if (score >= 65) return { label: "Favorable",       color: "#4ac8ff" };
  if (score >= 50) return { label: "Mitigé",           color: PALETTE.warning };
  if (score >= 35) return { label: "Défavorable",      color: PALETTE.danger };
  return                   { label: "Très défavorable", color: "#ff2040" };
}

export default function BriefingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, shouldShowPoll, acknowledgePoll } = useStrategy();

  if (!state) return null;

  const ind = state.nationalIndicators;
  const score = computeMandateScore(ind);
  const approval = getApprovalLabel(score);
  const recommendation = getRecommendation(ind);
  const pendingNews = state.news.pendingIds.length > 0;
  const pollCycle = Math.floor(state.mandateDay / 10);

  const handleAcknowledgePoll = () => {
    acknowledgePoll();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#1a1208", "#0d1119"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="close" size={20} color={PALETTE.textMid} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerKicker}>CELLULE DE CRISE</Text>
            <Text style={styles.headerTitle}>BRIEFING PRÉSIDENTIEL</Text>
          </View>
          <View style={styles.mandateDayBadge}>
            <Text style={styles.mandateDayNum}>{state.mandateDay}</Text>
            <Text style={styles.mandateDayLbl}>JOUR</Text>
          </View>
        </View>
        <View style={styles.headerRule} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SONDAGE — Poll section */}
        {shouldShowPoll && (
          <Panel variant="gold" glow style={styles.pollCard}>
            <View style={styles.pollHeader}>
              <MaterialCommunityIcons name="poll" size={16} color={PALETTE.gold} />
              <Text style={styles.pollKicker}>SONDAGE NATIONAL · CYCLE {pollCycle}</Text>
            </View>
            <Text style={styles.pollQuestion}>Êtes-vous satisfait(e) de l'action présidentielle ?</Text>
            <View style={styles.pollResult}>
              <Text style={styles.pollScore}>{score}%</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.pollLabel, { color: approval.color }]}>{approval.label}</Text>
                <View style={styles.pollTrack}>
                  <LinearGradient
                    colors={score >= 50 ? [PALETTE.success, PALETTE.gold] : [PALETTE.danger, PALETTE.warning]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.pollFill, { width: `${score}%` }]}
                  />
                </View>
              </View>
            </View>
            <Pressable onPress={handleAcknowledgePoll} style={({ pressed }) => [styles.pollDismiss, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.pollDismissText}>Prendre acte du sondage</Text>
              <MaterialCommunityIcons name="check" size={14} color={PALETTE.gold} />
            </Pressable>
          </Panel>
        )}

        {/* INDICATEURS */}
        <Panel style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="gauge" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>BAROMÈTRE NATIONAL</Text>
          </View>
          {INDICATOR_META.map(({ key, label, icon, color }) => {
            const val = ind[key] as number;
            const pct = key === "publicBudget"
              ? Math.max(0, (val + 150) / 250)
              : Math.max(0, val / 100);
            const isLow = key === "publicBudget" ? val < -80 : val < 30;
            const displayVal = key === "publicBudget"
              ? (val >= 0 ? `+${val}` : `${val}`)
              : `${val}%`;
            return (
              <View key={key} style={styles.indicatorRow}>
                <MaterialCommunityIcons name={icon} size={14} color={isLow ? PALETTE.danger : color} style={{ width: 18 }} />
                <Text style={styles.indicatorLabel}>{label}</Text>
                <View style={styles.indicatorTrack}>
                  <View style={[styles.indicatorFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: isLow ? PALETTE.danger : color }]} />
                </View>
                <Text style={[styles.indicatorVal, isLow && { color: PALETTE.danger }]}>{displayVal}</Text>
              </View>
            );
          })}
        </Panel>

        {/* APPROBATION GLOBALE */}
        <Panel style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chart-pie" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>INDICE D'APPROBATION</Text>
          </View>
          <View style={styles.approvalRow}>
            <View style={styles.approvalCircle}>
              <Text style={[styles.approvalNum, { color: approval.color }]}>{score}</Text>
              <Text style={styles.approvalPct}>/ 100</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.approvalLabel, { color: approval.color }]}>{approval.label}</Text>
              <View style={styles.approvalTrack}>
                <LinearGradient
                  colors={score >= 50 ? [PALETTE.success, PALETTE.gold] : [PALETTE.danger, PALETTE.warning]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.approvalFill, { width: `${score}%` }]}
                />
              </View>
              <Text style={styles.approvalSub}>Calcul pondéré des 5 indicateurs nationaux</Text>
            </View>
          </View>
        </Panel>

        {/* ALERTES ACTIVES */}
        {pendingNews && (
          <Panel variant="danger" style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert-circle" size={14} color={PALETTE.danger} />
              <Text style={[styles.sectionTitle, { color: PALETTE.danger }]}>DÉCISION EN ATTENTE</Text>
            </View>
            <Text style={styles.alertText}>
              {state.news.pendingIds.length} événement{state.news.pendingIds.length > 1 ? "s" : ""} requiert votre décision dans le Journal de Crise.
            </Text>
            <Pressable
              onPress={() => { router.back(); router.push("/journal-crise" as any); }}
              style={({ pressed }) => [styles.alertCta, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.alertCtaText}>Voir le Journal →</Text>
            </Pressable>
          </Panel>
        )}

        {/* RECOMMANDATION STRATÉGIQUE */}
        <Panel style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>RECOMMANDATION STRATÉGIQUE</Text>
          </View>
          <View style={styles.recRow}>
            <MaterialCommunityIcons name={recommendation.icon} size={22} color={PALETTE.gold} style={{ marginTop: 2 }} />
            <Text style={styles.recText}>{recommendation.text}</Text>
          </View>
        </Panel>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => { router.back(); router.push("/journal-crise" as any); }}
            style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient colors={["#c0392b", "#7b1e16"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaInner}>
              <MaterialCommunityIcons name="newspaper-variant-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>VOIR LE JOURNAL DE CRISE</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.dismissBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={styles.dismissText}>Fermer le briefing</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: { paddingHorizontal: 20, paddingBottom: 14, paddingTop: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.goldDim, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  mandateDayBadge: { alignItems: "center", width: 44, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.gold + "55", backgroundColor: "rgba(201,168,76,0.08)" },
  mandateDayNum: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.gold },
  mandateDayLbl: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.goldDim, letterSpacing: 1 },
  headerRule: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.gold + "44" },

  content: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },

  pollCard: { padding: 14, gap: 10 },
  pollHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  pollKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  pollQuestion: { fontSize: 13, fontFamily: FONT.semi, color: PALETTE.textHigh, lineHeight: 18 },
  pollResult: { flexDirection: "row", alignItems: "center", gap: 12 },
  pollScore: { fontSize: 32, fontFamily: FONT.bold, color: PALETTE.gold, width: 68 },
  pollLabel: { fontSize: 12, fontFamily: FONT.bold, letterSpacing: 0.5 },
  pollTrack: { height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  pollFill: { height: "100%", borderRadius: 3 },
  pollDismiss: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.gold + "44", backgroundColor: "rgba(201,168,76,0.06)" },
  pollDismissText: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1 },

  section: { padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },

  indicatorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  indicatorLabel: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textMid, width: 78 },
  indicatorTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  indicatorFill: { height: "100%", borderRadius: 3 },
  indicatorVal: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textHigh, width: 38, textAlign: "right" },

  approvalRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  approvalCircle: { alignItems: "center", width: 64 },
  approvalNum: { fontSize: 36, fontFamily: FONT.bold, lineHeight: 40 },
  approvalPct: { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textLow },
  approvalLabel: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  approvalTrack: { height: 6, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  approvalFill: { height: "100%", borderRadius: 3 },
  approvalSub: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, letterSpacing: 0.3 },

  alertText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 17 },
  alertCta: { alignSelf: "flex-end" },
  alertCtaText: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.danger, letterSpacing: 0.5 },

  recRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  recText: { flex: 1, fontSize: 13, fontFamily: FONT.reg, color: PALETTE.textHigh, lineHeight: 19 },

  actions: { gap: 8, marginTop: 4 },
  ctaBtn: { borderRadius: RADIUS.sm, overflow: "hidden" },
  ctaInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14 },
  ctaText: { fontSize: 12, fontFamily: FONT.bold, color: "#fff", letterSpacing: 2 },
  dismissBtn: { alignItems: "center", paddingVertical: 10 },
  dismissText: { fontSize: 12, fontFamily: FONT.med, color: PALETTE.textLow, letterSpacing: 0.5 },
});
