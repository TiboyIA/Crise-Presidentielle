import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { RankingRow } from "@/components/RankingRow";
import { PowerBadge } from "@/components/PowerBadge";
import { getPlayerRank, getRankTitle, getTitleIcon } from "@/logic/botEngine";
import { formatDuration } from "@/logic/buildingEngine";

const SEASON_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export default function RankingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStrategy();

  if (!state) return null;

  const rank = getPlayerRank(state.ranking);
  const title = getRankTitle(rank, state.ranking.length);
  const titleIcon = getTitleIcon(title);

  const seasonTimeLeft = Math.max(0, state.stats.seasonStartTime + SEASON_DURATION_MS - Date.now());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.back, { color: colors.foreground }]}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>🏆 Classement</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Player summary */}
        <View style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.playerLeft}>
            <Text style={[styles.playerRank, { color: colors.primary }]}>#{rank}</Text>
            <View>
              <Text style={[styles.playerName, { color: colors.foreground }]}>{state.playerName}</Text>
              <View style={styles.titleRow}>
                <Text style={styles.titleIcon}>{titleIcon}</Text>
                <Text style={[styles.titleText, { color: colors.primary }]}>{title}</Text>
              </View>
            </View>
          </View>
          <View style={styles.playerRight}>
            <PowerBadge power={state.stats.globalPower} size="md" />
            <Text style={[styles.points, { color: colors.mutedForeground }]}>{state.stats.rankingPoints} pts</Text>
          </View>
        </View>

        {/* Season info */}
        <View style={[styles.seasonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.seasonHeader}>
            <Text style={[styles.seasonTitle, { color: colors.foreground }]}>🗓️ Saison {state.stats.season}</Text>
            <View style={[styles.seasonBadge, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.seasonBadgeText, { color: colors.primary }]}>En cours</Text>
            </View>
          </View>
          <Text style={[styles.seasonTime, { color: colors.mutedForeground }]}>
            Fin dans : {formatDuration(seasonTimeLeft)}
          </Text>
          <Text style={[styles.seasonDesc, { color: colors.mutedForeground }]}>
            Maintenez votre position pour décrocher des récompenses et un titre prestigieux à la fin de la saison.
          </Text>
        </View>

        {/* Ranking */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CLASSEMENT MONDIAL</Text>
        {state.ranking.map((entry, i) => (
          <RankingRow
            key={entry.id}
            entry={entry}
            rank={i + 1}
            isPlayer={entry.id === "player"}
          />
        ))}

        {/* Titles to earn */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TITRES DE SAISON</Text>
        {[
          { rank: 1, title: "Leader Mondial", icon: "🌍", desc: "Première place mondiale" },
          { rank: 3, title: "Superpuissance", icon: "⭐", desc: "Top 3 mondial" },
          { rank: 5, title: "Puissance Majeure", icon: "🏆", desc: "Top 5 mondial" },
          { rank: 8, title: "Puissance Montante", icon: "📈", desc: "Top 8 mondial" },
        ].map(({ rank: r, title: t, icon, desc }) => (
          <View key={t} style={[styles.titleCard, { backgroundColor: colors.card, borderColor: rank <= r ? "#FFD700" : colors.border }]}>
            <Text style={styles.titleCardIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.titleCardTitle, { color: rank <= r ? "#FFD700" : colors.mutedForeground }]}>{t}</Text>
              <Text style={[styles.titleCardDesc, { color: colors.mutedForeground }]}>{desc}</Text>
            </View>
            {rank <= r && <Text style={[styles.earned, { color: "#FFD700" }]}>✓ Acquis</Text>}
          </View>
        ))}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 14, fontFamily: "Inter_600SemiBold", width: 60 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  playerCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 2, padding: 16 },
  playerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  playerRank: { fontSize: 28, fontFamily: "Inter_700Bold" },
  playerName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  titleIcon: { fontSize: 14 },
  titleText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  playerRight: { alignItems: "center", gap: 4 },
  points: { fontSize: 11, fontFamily: "Inter_500Medium" },
  seasonCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 6 },
  seasonHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seasonTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  seasonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  seasonBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  seasonTime: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  seasonDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2, marginTop: 4 },
  titleCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 8, borderWidth: 1, padding: 12 },
  titleCardIcon: { fontSize: 22, width: 28, textAlign: "center" },
  titleCardTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  titleCardDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  earned: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
