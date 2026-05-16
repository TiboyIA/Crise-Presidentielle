import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface PvpEntry {
  rank: number;
  player_id: string;
  display_name: string;
  pvp_points: number;
  spy_ops_success: number;
  cyber_ops_success: number;
  alliances_formed: number;
}

interface MyStats {
  pvp_points: number;
  spy_ops_success: number;
  cyber_ops_success: number;
  alliances_formed: number;
}

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function PvpRow({ entry }: { entry: PvpEntry }) {
  const isTop3 = entry.rank <= 3;
  const rankColor = entry.rank === 1 ? "#FFD700" : entry.rank === 2 ? "#C0C0C0" : entry.rank === 3 ? "#CD7F32" : PALETTE.textMid;

  return (
    <View style={[styles.row, isTop3 && styles.rowTop3]}>
      <Text style={[styles.rowRank, { color: rankColor }]}>{rankMedal(entry.rank)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{entry.display_name}</Text>
        <View style={styles.rowBadges}>
          {entry.spy_ops_success > 0 && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="magnify" size={10} color={PALETTE.textLow} />
              <Text style={styles.badgeText}>{entry.spy_ops_success}</Text>
            </View>
          )}
          {entry.cyber_ops_success > 0 && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="lightning-bolt" size={10} color={PALETTE.danger} />
              <Text style={[styles.badgeText, { color: PALETTE.danger }]}>{entry.cyber_ops_success}</Text>
            </View>
          )}
          {entry.alliances_formed > 0 && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="handshake" size={10} color={PALETTE.success} />
              <Text style={[styles.badgeText, { color: PALETTE.success }]}>{entry.alliances_formed}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.rowPoints, { color: isTop3 ? rankColor : PALETTE.gold }]}>
        {entry.pvp_points} <Text style={styles.rowPointsLabel}>pts</Text>
      </Text>
    </View>
  );
}

export default function RankingPvpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [entries, setEntries] = useState<PvpEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/leaderboard-pvp`, {
        headers: {
          "apikey": ANON_KEY,
          ...(auth.accessToken ? { "Authorization": `Bearer ${auth.accessToken}` } : {}),
        },
      });
      if (!res.ok) return;
      const data = await res.json() as { entries: PvpEntry[]; my_stats: MyStats | null };
      if (mountedRef.current) {
        setEntries(data.entries ?? []);
        setMyStats(data.my_stats);
      }
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [auth.accessToken]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>CLASSEMENT PvP</Text>
          <Text style={styles.headerTitle}>GUERRE DES NATIONS</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <View style={styles.headerRule} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PALETTE.gold} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.gold} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Player's own PvP stats */}
          {myStats && (
            <LinearGradient colors={["#1c1408", "#0a0d14"]} style={styles.myCard}>
              <View style={styles.myCardTop}>
                <MaterialCommunityIcons name="sword-cross" size={20} color={PALETTE.gold} />
                <Text style={styles.myCardTitle}>MES POINTS PvP</Text>
                <Text style={styles.myCardPoints}>{myStats.pvp_points}</Text>
              </View>
              <View style={styles.myCardStats}>
                <View style={styles.myStatItem}>
                  <MaterialCommunityIcons name="magnify" size={14} color={PALETTE.textLow} />
                  <Text style={styles.myStatLabel}>Espionnage</Text>
                  <Text style={styles.myStatValue}>{myStats.spy_ops_success}</Text>
                </View>
                <View style={styles.myStatItem}>
                  <MaterialCommunityIcons name="lightning-bolt" size={14} color={PALETTE.danger} />
                  <Text style={styles.myStatLabel}>Cyberattaques</Text>
                  <Text style={[styles.myStatValue, { color: PALETTE.danger }]}>{myStats.cyber_ops_success}</Text>
                </View>
                <View style={styles.myStatItem}>
                  <MaterialCommunityIcons name="handshake" size={14} color={PALETTE.success} />
                  <Text style={styles.myStatLabel}>Alliances</Text>
                  <Text style={[styles.myStatValue, { color: PALETTE.success }]}>{myStats.alliances_formed}</Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendText}>🔍 +5 pts espionnage réussi &nbsp;·&nbsp; ⚡ +15 pts cyberattaque &nbsp;·&nbsp; 🤝 +10 pts alliance</Text>
          </View>

          {entries.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="sword-cross" size={40} color={PALETTE.textLow} />
              <Text style={styles.emptyText}>Aucune activité PvP cette saison</Text>
            </View>
          ) : (
            entries.map((entry) => <PvpRow key={entry.player_id} entry={entry} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06080e" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: "#fff", letterSpacing: 4 },
  headerRule: { height: 1, backgroundColor: PALETTE.gold + "33" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 8 },

  myCard: {
    borderRadius: RADIUS.md, padding: 16, gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "55",
  },
  myCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  myCardTitle: { flex: 1, fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  myCardPoints: { fontSize: 24, fontFamily: FONT.bold, color: PALETTE.gold },
  myCardStats: { flexDirection: "row", justifyContent: "space-around" },
  myStatItem: { alignItems: "center", gap: 4 },
  myStatLabel: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow },
  myStatValue: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textHigh },

  legend: { alignItems: "center", paddingVertical: 4 },
  legendText: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center" },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    padding: 12,
  },
  rowTop3: { borderColor: PALETTE.gold + "44" },
  rowRank: { fontSize: 16, fontFamily: FONT.bold, width: 36, textAlign: "center" },
  rowName: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh },
  rowBadges: { flexDirection: "row", gap: 8, marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 3 },
  badgeText: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textLow },
  rowPoints: { fontSize: 18, fontFamily: FONT.bold },
  rowPointsLabel: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow },

  emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 48 },
  emptyText: { fontSize: 13, fontFamily: FONT.reg, color: PALETTE.textLow },
});
