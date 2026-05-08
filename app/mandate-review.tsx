import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { computeMandateScore } from "@/context/StrategyContext";
import { getPlayerRank } from "@/logic/botEngine";
import { DOCTRINES } from "@/data/doctrines";
import { REFORMS } from "@/data/reforms";
import { Panel } from "@/components/ui";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { NationalIndicators, PromiseDomain } from "@/types/strategy";

const PROMISE_LABELS: Record<PromiseDomain, string> = {
  securite: "Sécurité", economie: "Économie", ecologie: "Écologie",
  souverainete: "Souveraineté", pouvoir_achat: "Pouvoir d'achat",
  innovation: "Innovation", diplomatie: "Diplomatie",
};

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const INDICATOR_META: { key: keyof NationalIndicators; label: string; icon: McIconName; color: string }[] = [
  { key: "popularity",   label: "Popularité",    icon: "account-group",   color: "#c9a84c" },
  { key: "economy",      label: "Économie",       icon: "chart-line",      color: "#3fbe7a" },
  { key: "security",     label: "Sécurité",       icon: "shield-check",    color: "#4a9fff" },
  { key: "ecology",      label: "Écologie",       icon: "leaf",            color: "#52c97a" },
  { key: "cohesion",     label: "Cohésion",       icon: "handshake",       color: "#a78bfa" },
  { key: "publicBudget", label: "Budget Public",  icon: "bank-outline",    color: "#e8a93a" },
];

function getMandateTitle(score: number): { title: string; subtitle: string; color: string } {
  if (score >= 90) return { title: "Visionnaire Historique",   subtitle: "Votre mandat entre dans les livres d'histoire", color: "#FFD56A" };
  if (score >= 80) return { title: "Grand Réformateur",        subtitle: "Un mandat de transformation profonde",          color: "#c9a84c" };
  if (score >= 70) return { title: "Dirigeant Accompli",       subtitle: "Résultats probants sur tous les fronts",        color: "#4a9fff" };
  if (score >= 60) return { title: "Président Compétent",      subtitle: "Gestion solide dans un contexte difficile",     color: "#3fbe7a" };
  if (score >= 50) return { title: "Gestionnaire Prudent",     subtitle: "Stabilité maintenue, ambitions modérées",       color: "#a78bfa" };
  if (score >= 40) return { title: "Président Ordinaire",      subtitle: "Un mandat sans éclat mais sans catastrophe",    color: PALETTE.textMid };
  if (score >= 30) return { title: "Dirigeant Contesté",       subtitle: "Tensions persistantes et bilan mitigé",         color: PALETTE.warning };
  if (score >= 20) return { title: "Président Fragilisé",      subtitle: "Crises successives ont affaibli le mandat",     color: PALETTE.danger };
  if (score >= 10) return { title: "Chef Sous Pression",       subtitle: "Résistance difficile aux crises accumulées",    color: "#ff6040" };
  return               { title: "Présidence Tourmentée",       subtitle: "Mandat marqué par de graves difficultés",       color: "#ff2040" };
}

function getMandateReward(score: number): { money: number; influence: number; points: number } {
  if (score >= 80) return { money: 1000, influence: 100, points: 50 };
  if (score >= 60) return { money: 500,  influence: 50,  points: 25 };
  if (score >= 40) return { money: 200,  influence: 25,  points: 10 };
  return                  { money: 0,    influence: 0,   points: 0  };
}

export default function MandateReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, startNewMandate } = useStrategy();

  if (!state) return null;

  const ind = state.nationalIndicators;
  const score = computeMandateScore(ind);
  const mandate = getMandateTitle(score);
  const reward = getMandateReward(score);
  const playerRank = getPlayerRank(state.ranking);
  const bilanNumber = Math.floor(state.mandateDay / 100);

  const handleNewMandate = () => {
    startNewMandate();
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Gold header */}
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="close" size={20} color={PALETTE.textMid} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerKicker}>PRÉSIDENCE · RAPPORT OFFICIEL</Text>
            <Text style={styles.headerTitle}>BILAN DE MANDAT N°{bilanNumber}</Text>
            <Text style={styles.headerSub}>Jours {state.lastBilanShownAt + 1} – {state.mandateDay}</Text>
          </View>
        </View>
        <View style={styles.headerRule} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SCORE GLOBAL */}
        <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.scoreCard}>
          <Text style={styles.scoreKicker}>SCORE DU MANDAT</Text>
          <Text style={[styles.scoreNum, { color: mandate.color }]}>{score}</Text>
          <Text style={styles.scoreMax}>/&nbsp;100</Text>
          <View style={styles.scoreDivider} />
          <Text style={[styles.mandateTitle, { color: mandate.color }]}>{mandate.title}</Text>
          <Text style={styles.mandateSub}>{mandate.subtitle}</Text>

          {/* Score bar */}
          <View style={styles.scoreTrack}>
            <LinearGradient
              colors={score >= 60 ? [PALETTE.success, PALETTE.gold] : score >= 40 ? [PALETTE.warning, "#c9a84c"] : [PALETTE.danger, PALETTE.warning]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.scoreFill, { width: `${score}%` }]}
            />
          </View>
        </LinearGradient>

        {/* INDICATEURS DÉTAILLÉS */}
        <Panel style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="gauge" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>ÉTAT DES INDICATEURS NATIONAUX</Text>
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

        {/* STATISTIQUES CLÉS */}
        <Panel style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trophy-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>STATISTIQUES DU MANDAT</Text>
          </View>
          <View style={styles.statsGrid}>
            {[
              { label: "Puissance mondiale",  value: state.stats.globalPower,                   icon: "earth" as McIconName,             color: PALETTE.gold },
              { label: "Points de classement", value: state.stats.rankingPoints,                  icon: "star-outline" as McIconName,      color: "#a78bfa" },
              { label: "Rang mondial",         value: `#${playerRank}`,                           icon: "podium" as McIconName,            color: "#4a9fff" },
              { label: "Opérations lancées",   value: state.stats.totalOperations,                icon: "sword-cross" as McIconName,       color: PALETTE.crimson },
              { label: "Taux de succès",        value: state.stats.totalOperations > 0 ? `${Math.round((state.stats.operationsWon / state.stats.totalOperations) * 100)}%` : "N/A", icon: "check-circle-outline" as McIconName, color: PALETTE.success },
              { label: "Niveau président",      value: `Niv. ${state.stats.presidentLevel}`,      icon: "account-star" as McIconName,      color: PALETTE.warning },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <MaterialCommunityIcons name={stat.icon} size={18} color={stat.color} />
                <Text style={[styles.statVal, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Panel>

        {/* DOCTRINE & RÉFORMES DU MANDAT */}
        {(() => {
          const doctrine = DOCTRINES[state.governanceDoctrine];
          const completedReforms = state.reforms.filter((r) => r.applied);
          const promises = state.campaignPromises;
          return (
            <Panel style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="crown-outline" size={14} color={PALETTE.gold} />
                <Text style={styles.sectionTitle}>DOCTRINE & BILAN POLITIQUE</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                <MaterialCommunityIcons name={doctrine.icon as any} size={18} color={doctrine.color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: FONT.bold, color: doctrine.color }}>{doctrine.name}</Text>
                  <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 }}>{doctrine.slogan}</Text>
                </View>
              </View>
              {completedReforms.length > 0 && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2, marginTop: 4 }}>RÉFORMES ACCOMPLIES</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {completedReforms.map((r) => {
                      const def = REFORMS[r.id];
                      return (
                        <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.xs, backgroundColor: "rgba(63,190,122,0.12)", borderWidth: 1, borderColor: "#3fbe7a44" }}>
                          <MaterialCommunityIcons name={def.icon as any} size={10} color="#3fbe7a" />
                          <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: "#3fbe7a" }}>{def.name}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              {promises.selected.length > 0 && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2, marginTop: 4 }}>PROMESSES DE CAMPAGNE</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {promises.selected.map((domain) => {
                      const status = promises.status[domain] ?? "en cours";
                      const color = status === "tenue" ? "#3fbe7a" : status === "trahie" ? PALETTE.danger : status === "partielle" ? PALETTE.warning : "#4a9fff";
                      return (
                        <View key={domain} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: color + "44", backgroundColor: color + "11" }}>
                          <Text style={{ fontSize: 9, fontFamily: FONT.bold, color }}>{PROMISE_LABELS[domain]}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </Panel>
          );
        })()}

        {/* RÉCOMPENSES */}
        {(reward.money > 0 || reward.influence > 0 || reward.points > 0) && (
          <Panel variant="gold" glow style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="gift-outline" size={14} color={PALETTE.gold} />
              <Text style={styles.sectionTitle}>RÉCOMPENSES DE MANDAT</Text>
            </View>
            <View style={styles.rewardsRow}>
              {reward.money > 0 && (
                <View style={styles.rewardChip}>
                  <Text style={styles.rewardIcon}>💰</Text>
                  <Text style={styles.rewardVal}>+{reward.money}</Text>
                </View>
              )}
              {reward.influence > 0 && (
                <View style={styles.rewardChip}>
                  <Text style={styles.rewardIcon}>🎭</Text>
                  <Text style={styles.rewardVal}>+{reward.influence}</Text>
                </View>
              )}
              {reward.points > 0 && (
                <View style={styles.rewardChip}>
                  <MaterialCommunityIcons name="star" size={14} color={PALETTE.gold} />
                  <Text style={styles.rewardVal}>+{reward.points} pts</Text>
                </View>
              )}
            </View>
          </Panel>
        )}

        {/* ACTION */}
        <Pressable onPress={handleNewMandate} style={({ pressed }) => [styles.newMandateBtn, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
          <LinearGradient colors={["#dcb858", "#a07f30"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newMandateInner}>
            <View style={styles.mandateRule} />
            <Text style={styles.newMandateText}>ENTAMER UN NOUVEAU MANDAT</Text>
            <View style={styles.mandateRule} />
          </LinearGradient>
        </Pressable>
        <Text style={styles.newMandateHint}>La progression, les ressources et le rang sont conservés.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: { paddingHorizontal: 20, paddingBottom: 14, paddingTop: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.goldDim, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  headerSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, letterSpacing: 1 },
  headerRule: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.gold + "44" },

  content: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },

  scoreCard: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "44", padding: 20, alignItems: "center", gap: 4 },
  scoreKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.goldDim, letterSpacing: 3, marginBottom: 6 },
  scoreNum: { fontSize: 72, fontFamily: FONT.bold, lineHeight: 76 },
  scoreMax: { fontSize: 14, fontFamily: FONT.med, color: PALETTE.textLow, marginTop: -4 },
  scoreDivider: { width: 60, height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.gold + "55", marginVertical: 10 },
  mandateTitle: { fontSize: 18, fontFamily: FONT.bold, letterSpacing: 0.5, textAlign: "center" },
  mandateSub: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, textAlign: "center", lineHeight: 16 },
  scoreTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden", marginTop: 14 },
  scoreFill: { height: "100%", borderRadius: 3 },

  section: { padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },

  indicatorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  indicatorLabel: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textMid, width: 78 },
  indicatorTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  indicatorFill: { height: "100%", borderRadius: 3 },
  indicatorVal: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textHigh, width: 38, textAlign: "right" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { width: "30%", flexGrow: 1, alignItems: "center", gap: 4, paddingVertical: 10, borderRadius: RADIUS.sm, backgroundColor: PALETTE.panelHi, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },
  statVal: { fontSize: 15, fontFamily: FONT.bold },
  statLabel: { fontSize: 8, fontFamily: FONT.med, color: PALETTE.textLow, letterSpacing: 0.5, textAlign: "center" },

  rewardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rewardChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: PALETTE.gold + "55" },
  rewardIcon: { fontSize: 16 },
  rewardVal: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.gold },

  newMandateBtn: { borderRadius: RADIUS.sm, overflow: "hidden", marginTop: 8 },
  newMandateInner: { paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 12 },
  newMandateText: { fontSize: 12, fontFamily: FONT.bold, color: "#fff", letterSpacing: 3 },
  mandateRule: { width: 16, height: 1, backgroundColor: "rgba(255,255,255,0.4)" },
  newMandateHint: { textAlign: "center", fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, letterSpacing: 0.3 },
});
