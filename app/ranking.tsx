import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/utils/responsive";
import { RankingRow } from "@/components/RankingRow";
import { PowerBadge } from "@/components/PowerBadge";
import { Badge, Panel, ScreenHeader, SectionHeader } from "@/components/ui";
import { getPlayerRank, getRankTitle, getTitleIcon } from "@/logic/botEngine";
import { formatDuration } from "@/logic/buildingEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { hasPendingSubmission } from "@/services/RankedService";

const SEASON_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const SEASON_TITLES = [
  { rank: 1, title: "Leader Mondial",     desc: "Première place mondiale" },
  { rank: 3, title: "Superpuissance",     desc: "Top 3 mondial" },
  { rank: 5, title: "Puissance Majeure",  desc: "Top 5 mondial" },
  { rank: 8, title: "Puissance Montante", desc: "Top 8 mondial" },
];

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useStrategy();
  const auth = useAuth();
  const { hPad } = useResponsive();

  const [rankedPending, setRankedPending] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    hasPendingSubmission().then((pending) => {
      if (!mountedRef.current) return;
      setRankedPending(pending);
    });
  }, []);

  if (!state) return null;

  const rank = getPlayerRank(state.ranking);
  const title = getRankTitle(rank, state.ranking.length);
  const titleIcon = getTitleIcon(title);
  const seasonTimeLeft = Math.max(0, state.stats.seasonStartTime + SEASON_DURATION_MS - Date.now());
  const seasonProgress = 1 - seasonTimeLeft / SEASON_DURATION_MS;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Classement" kicker="ÉCHIQUIER MONDIAL" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Player podium */}
        <View style={styles.playerWrap}>
          <LinearGradient
            colors={["#22150e", "#0a0d14"]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={styles.playerCard}
          >
            <View style={styles.playerLeft}>
              <View style={styles.rankFrame}>
                <Text style={styles.rankNum}>#{rank}</Text>
              </View>
              <View>
                <Text style={styles.playerName}>{state.playerName}</Text>
                <View style={styles.playerTitle}>
                  <Text style={styles.playerTitleIcon}>{titleIcon}</Text>
                  <Text style={styles.playerTitleText}>{title}</Text>
                </View>
                <Text style={styles.playerPoints}>{state.stats.rankingPoints} POINTS</Text>
              </View>
            </View>
            <PowerBadge power={state.stats.globalPower} size="md" />
          </LinearGradient>
        </View>

        {/* Season status */}
        <Panel style={styles.seasonCard}>
          <View style={styles.seasonHeader}>
            <View>
              <Text style={styles.seasonKicker}>SAISON {state.stats.season}</Text>
              <Text style={styles.seasonTitle}>Cycle géopolitique en cours</Text>
            </View>
            <Badge label="En cours" tone="success" size="sm" dot />
          </View>
          <View style={styles.seasonBar}>
            <LinearGradient
              colors={[PALETTE.crimson, PALETTE.gold]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.seasonBarFill, { width: `${Math.round(seasonProgress * 100)}%` }]}
            />
          </View>
          <View style={styles.seasonFooter}>
            <Text style={styles.seasonFooterText}>FIN DE SAISON</Text>
            <Text style={styles.seasonRemaining}>{formatDuration(seasonTimeLeft)}</Text>
          </View>
        </Panel>

        {/* Account security */}
        {auth.isEnabled && (
          <Pressable
            onPress={() => router.push("/account-link")}
            style={({ pressed }) => [styles.leaderboardBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <LinearGradient colors={["#0d1119", "#0d1119"]} style={[styles.leaderboardBtnInner, { borderColor: auth.isLinked ? PALETTE.success + "55" : PALETTE.warning + "55" }]}>
              <MaterialCommunityIcons
                name={auth.isLinked ? "shield-check" : "shield-alert-outline"}
                size={20}
                color={auth.isLinked ? PALETTE.success : PALETTE.warning}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.leaderboardBtnTitle, { color: auth.isLinked ? PALETTE.success : PALETTE.warning }]}>
                  {auth.isLinked ? "COMPTE SÉCURISÉ" : "SÉCURISER MON COMPTE"}
                </Text>
                <Text style={styles.leaderboardBtnSub}>
                  {auth.isLinked ? `Lié via ${auth.linkedProviders.join(", ")}` : "Protégez votre progression avec Google ou Apple"}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textLow} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Cyberattaques */}
        {auth.isEnabled && (
          <Pressable
            onPress={() => router.push("/cyber-ops")}
            style={({ pressed }) => [styles.leaderboardBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <LinearGradient colors={["#0d1119", "#0d1119"]} style={[styles.leaderboardBtnInner, { borderColor: PALETTE.danger + "55" }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color={PALETTE.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.leaderboardBtnTitle, { color: PALETTE.danger }]}>MES CYBERATTAQUES</Text>
                <Text style={styles.leaderboardBtnSub}>Opérations de guerre numérique en cours</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textLow} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Espionnage */}
        {auth.isEnabled && (
          <Pressable
            onPress={() => router.push("/spy-ops")}
            style={({ pressed }) => [styles.leaderboardBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <LinearGradient colors={["#0d1119", "#0d1119"]} style={styles.leaderboardBtnInner}>
              <MaterialCommunityIcons name="magnify" size={20} color={PALETTE.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderboardBtnTitle}>MES OPÉRATIONS D'ESPIONNAGE</Text>
                <Text style={styles.leaderboardBtnSub}>Consulter les résultats de renseignement</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textLow} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Alliances */}
        {auth.isEnabled && (
          <Pressable
            onPress={() => router.push("/alliances")}
            style={({ pressed }) => [styles.leaderboardBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <LinearGradient colors={["#0d1119", "#0d1119"]} style={styles.leaderboardBtnInner}>
              <MaterialCommunityIcons name="handshake" size={20} color={PALETTE.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderboardBtnTitle}>MES ALLIANCES</Text>
                <Text style={styles.leaderboardBtnSub}>Gérer vos alliances diplomatiques</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textLow} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Soumission ranked en attente */}
        {rankedPending && (
          <View style={[styles.leaderboardBtn, { overflow: "hidden" }]}>
            <LinearGradient colors={["#0d1119", "#0d1119"]} style={[styles.leaderboardBtnInner, { borderColor: PALETTE.warning + "55" }]}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={PALETTE.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.leaderboardBtnTitle, { color: PALETTE.warning }]}>SOUMISSION EN ATTENTE</Text>
                <Text style={styles.leaderboardBtnSub}>Score classé enregistré — sera soumis à la prochaine connexion</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Forum mondial */}
        <Pressable
          onPress={() => router.push("/chat")}
          style={({ pressed }) => [styles.leaderboardBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <LinearGradient colors={["#0d1119", "#0d1119"]} style={[styles.leaderboardBtnInner, { borderColor: PALETTE.gold + "55" }]}>
            <MaterialCommunityIcons name="forum-outline" size={20} color={PALETTE.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.leaderboardBtnTitle}>FORUM DIPLOMATIQUE</Text>
              <Text style={styles.leaderboardBtnSub}>Canal mondial de la saison en cours</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textLow} />
          </LinearGradient>
        </Pressable>

        {/* Classement PvP */}
        <Pressable
          onPress={() => router.push("/ranking-pvp")}
          style={({ pressed }) => [styles.leaderboardBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <LinearGradient colors={["#0d1119", "#0d1119"]} style={[styles.leaderboardBtnInner, { borderColor: PALETTE.crimson + "55" }]}>
            <MaterialCommunityIcons name="sword-cross" size={20} color={PALETTE.crimson} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.leaderboardBtnTitle, { color: PALETTE.crimson }]}>CLASSEMENT PvP</Text>
              <Text style={styles.leaderboardBtnSub}>Guerre des nations — points d'engagement saisonniers</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textLow} />
          </LinearGradient>
        </Pressable>

        {/* Leaderboard mondial */}
        <Pressable
          onPress={() => router.push("/ranking-global")}
          style={({ pressed }) => [styles.leaderboardBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.leaderboardBtnInner}>
            <MaterialCommunityIcons name="trophy" size={20} color={PALETTE.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.leaderboardBtnTitle}>TABLEAU D'HONNEUR MONDIAL</Text>
              <Text style={styles.leaderboardBtnSub}>Classement des meilleurs mandats en ligne</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.textLow} />
          </LinearGradient>
        </Pressable>

        {/* Global ranking */}
        <SectionHeader label="Classement mondial" count={`${state.ranking.length}`} />
        {state.ranking.map((entry, i) => (
          <RankingRow key={entry.id} entry={entry} rank={i + 1} isPlayer={entry.id === "player"} />
        ))}

        {/* Season titles */}
        <SectionHeader label="Titres de saison" />
        {SEASON_TITLES.map(({ rank: r, title: t, desc }) => {
          const earned = rank <= r;
          return (
            <View key={t} style={[styles.titleCardWrap, earned && styles.titleCardGlow]}>
              <LinearGradient
                colors={earned ? ["#1c1814", "#0a0d14"] : ["#161b27", "#0d1119"]}
                style={[styles.titleCard, { borderColor: earned ? PALETTE.gold + "88" : PALETTE.panelEdge }]}
              >
                <MaterialCommunityIcons
                  name={earned ? "medal" : "medal-outline"}
                  size={24}
                  color={earned ? PALETTE.gold : PALETTE.textLow}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.titleCardTitle, { color: earned ? PALETTE.gold : PALETTE.textMid }]}>{t}</Text>
                  <Text style={styles.titleCardDesc}>{desc}</Text>
                </View>
                {earned && <Badge label="Acquis" tone="gold" size="xs" />}
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.ink },
  content: { paddingTop: 12, gap: 10 },

  playerWrap: { borderRadius: RADIUS.md, overflow: "hidden" },
  playerCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: PALETTE.gold + "55",
  },
  playerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  rankFrame: {
    width: 56, height: 56, borderRadius: 4,
    borderWidth: 1, borderColor: PALETTE.goldDim + "88",
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  rankNum: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.5 },
  playerName: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textHigh },
  playerTitle: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  playerTitleIcon: { fontSize: 14 },
  playerTitleText: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.gold },
  playerPoints: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5, marginTop: 3 },

  seasonCard: { padding: 14, gap: 8 },
  seasonHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  seasonKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2.5 },
  seasonTitle: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh, marginTop: 2 },
  seasonBar: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  seasonBarFill: { height: "100%", borderRadius: 2 },
  seasonFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seasonFooterText: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  seasonRemaining: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },

  titleCardWrap: { borderRadius: RADIUS.sm, overflow: "hidden" },
  titleCardGlow: {
    shadowColor: PALETTE.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  titleCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  titleCardTitle: { fontSize: 13, fontFamily: FONT.bold },
  titleCardDesc: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 },

  leaderboardBtn: { borderRadius: RADIUS.sm, overflow: "hidden" },
  leaderboardBtnInner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "55",
  },
  leaderboardBtnTitle: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.5 },
  leaderboardBtnSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 },
});
