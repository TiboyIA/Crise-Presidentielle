import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { useAuth } from "@/context/AuthContext";
import { filterValid, validateLeaderboardEntry, type LeaderboardEntry } from "@/utils/validators";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const DOCTRINE_LABELS: Record<string, string> = {
  democratique:   "Réformateur",
  securitaire:    "Protecteur",
  technocratique: "Technocrate",
  populiste:      "Populaire",
  autoritaire:    "Autoritaire",
  souverainiste:  "Souverainiste",
  ecologiste:     "Écologiste",
  liberal:        "Libéral",
};

const COUNTRY_FLAGS: Record<string, string> = {
  france: "🇫🇷", usa: "🇺🇸", china: "🇨🇳", russia: "🇷🇺", germany: "🇩🇪",
  uk: "🇬🇧", india: "🇮🇳", japan: "🇯🇵", brazil: "🇧🇷", turkey: "🇹🇷",
  iran: "🇮🇷", israel: "🇮🇱", south_korea: "🇰🇷", italy: "🇮🇹",
  saudi_arabia: "🇸🇦", australia: "🇦🇺", canada: "🇨🇦",
  north_korea: "🇰🇵", nigeria: "🇳🇬", pakistan: "🇵🇰",
};

async function fetchLeaderboard(offset = 0): Promise<LeaderboardEntry[]> {
  if (!SUPABASE_URL) return [];
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/leaderboard-global?limit=50&offset=${offset}`,
    { headers: { apikey: SUPABASE_ANON_KEY } },
  );
  if (!res.ok) return [];
  const data = await res.json() as { entries?: unknown[] };
  return filterValid(data.entries ?? [], validateLeaderboardEntry);
}

export default function RankingGlobalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const rankColor = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : PALETTE.textMid;
    const flag = COUNTRY_FLAGS[item.country_id] ?? "🏳️";
    const doctrine = DOCTRINE_LABELS[item.doctrine] ?? item.doctrine;
    const date = new Date(item.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

    return (
      <Pressable
        onPress={() => router.push({ pathname: "/player-profile", params: { entry: JSON.stringify(item), rank: String(rank) } })}
        style={({ pressed }) => [styles.row, isTop3 && styles.rowTop3, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.rank, { color: rankColor, width: rank >= 10 ? 28 : 22 }]}>
          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
        </Text>
        <Text style={styles.flag}>{flag}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.display_name || "Anonyme"}</Text>
          <Text style={styles.meta}>{doctrine} · {item.mandate_days}j · {date}</Text>
        </View>
        <Text style={[styles.score, isTop3 && { color: rankColor }]}>
          {item.score.toLocaleString()}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={14} color={PALETTE.textLow} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>CLASSEMENT MONDIAL</Text>
          <Text style={styles.headerTitle}>TABLEAU D'HONNEUR</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <View style={styles.headerRule} />

      {/* Bandeau score du joueur */}
      {auth.isEnabled && (
        <View style={styles.ownBadge}>
          <MaterialCommunityIcons
            name="sword-cross"
            size={14}
            color={PALETTE.gold}
          />
          <Text style={styles.ownBadgeText}>
            {auth.isLinked
              ? "Les scores proviennent du mode classé — lance une partie en mode classé pour participer"
              : "Lie ton compte Google ou Apple pour participer au classement mondial"}
          </Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PALETTE.gold} size="large" />
          <Text style={styles.loadingText}>Chargement du classement…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={PALETTE.textLow} />
          <Text style={styles.errorText}>Impossible de charger le classement</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="trophy-outline" size={48} color={PALETTE.textLow} />
          <Text style={styles.emptyTitle}>Aucun score soumis</Text>
          <Text style={styles.emptyText}>Sois le premier à entrer dans l'histoire.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.gold} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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

  ownBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  ownBadgeText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, fontStyle: "italic" },

  list: { paddingVertical: 8, paddingHorizontal: 16 },
  separator: { height: 1, backgroundColor: "rgba(255,255,255,0.05)" },

  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 4 },
  rowTop3: { backgroundColor: "rgba(201,168,76,0.05)", borderRadius: RADIUS.sm, paddingHorizontal: 8, marginHorizontal: -4 },

  rank: { fontFamily: FONT.bold, fontSize: 13, textAlign: "center" },
  flag: { fontSize: 22 },
  name: { fontSize: 13, fontFamily: FONT.bold, color: "#fff", letterSpacing: 0.3 },
  meta: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 },
  score: { fontSize: 15, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.5 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 13, fontFamily: FONT.reg, color: PALETTE.textMid },
  errorText: { fontSize: 13, fontFamily: FONT.reg, color: PALETTE.textMid, textAlign: "center" },
  emptyTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textMid, textAlign: "center" },
  emptyText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 18 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.gold + "55" },
  retryText: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1 },
});
