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
import { fetchCyberOps, type CyberOp, type CyberOpsResult } from "@/services/CyberService";

function countdownLabel(resolvesAt: string): string {
  const ms = new Date(resolvesAt).getTime() - Date.now();
  if (ms <= 0) return "Traitement en cours…";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `Disponible dans ${h}h ${m}m` : `Disponible dans ${m}m`;
}

function OpRow({
  op,
  direction,
}: {
  op: CyberOp;
  direction: "sent" | "received";
}) {
  const name = direction === "sent" ? (op.target_name ?? "Cible inconnue") : (op.attacker_name ?? "Source inconnue");
  const date = new Date(op.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  const statusColor =
    op.status === "resolved" ? PALETTE.danger :
    op.status === "blocked"  ? PALETTE.textLow :
    PALETTE.warning;

  const statusIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
    op.status === "resolved" ? "lightning-bolt" :
    op.status === "blocked"  ? "close-circle-outline" :
    "clock-outline";

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={statusIcon} size={18} color={statusColor} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
          <Text style={styles.rowDate}>{date}</Text>
        </View>
        {op.status === "pending" ? (
          <Text style={styles.pendingText}>{countdownLabel(op.resolves_at)}</Text>
        ) : op.status === "resolved" ? (
          <Text style={[styles.resolvedText, { color: statusColor }]}>
            {direction === "sent"
              ? `Virus déployé — malus −${op.magnitude}% appliqué`
              : `Cyberattaque subie — malus −${op.magnitude}%`}
          </Text>
        ) : (
          <Text style={styles.blockedText}>Opération bloquée</Text>
        )}
      </View>
    </View>
  );
}

export default function CyberOpsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [data, setData] = useState<CyberOpsResult>({ sent: [], received: [], pending_debuff_pct: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!auth.accessToken) { setLoading(false); setRefreshing(false); return; }
    try {
      const result = await fetchCyberOps(auth.accessToken);
      if (mountedRef.current) setData(result);
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [auth.accessToken]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (!auth.isEnabled) return null;

  const isEmpty = data.sent.length === 0 && data.received.length === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>GUERRE NUMÉRIQUE</Text>
          <Text style={styles.headerTitle}>MES CYBERATTAQUES</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <View style={styles.headerRule} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PALETTE.danger} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isEmpty && { flex: 1 },
            { paddingBottom: insets.bottom + 32 },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.danger} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Active debuff warning */}
          {(data.pending_debuff_pct ?? 0) > 0 && (
            <View style={styles.debuffBanner}>
              <MaterialCommunityIcons name="virus" size={18} color={PALETTE.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.debuffTitle}>VIRUS ACTIF</Text>
                <Text style={styles.debuffSub}>
                  Malus de −{data.pending_debuff_pct}% sur votre prochain score classé
                </Text>
              </View>
            </View>
          )}

          {isEmpty ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="shield-lock-outline" size={48} color={PALETTE.textLow} />
              <Text style={styles.emptyTitle}>Aucune opération</Text>
              <Text style={styles.emptyText}>
                Lance une cyberattaque depuis le profil d'un joueur dans le classement mondial.
              </Text>
            </View>
          ) : (
            <>
              {data.sent.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>ATTAQUES LANCÉES</Text>
                  {data.sent.map((op) => (
                    <OpRow key={op.id} op={op} direction="sent" />
                  ))}
                </>
              )}

              {data.received.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: data.sent.length > 0 ? 8 : 0 }]}>
                    ATTAQUES REÇUES
                  </Text>
                  {data.received.map((op) => (
                    <OpRow key={op.id} op={op} direction="received" />
                  ))}
                </>
              )}
            </>
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
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.danger, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: "#fff", letterSpacing: 4 },
  headerRule: { height: 1, backgroundColor: PALETTE.danger + "33" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 8 },

  debuffBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: PALETTE.danger + "18",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.danger + "55",
    padding: 14,
  },
  debuffTitle: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.danger, letterSpacing: 1.5 },
  debuffSub: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, marginTop: 2 },

  sectionLabel: {
    fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow,
    letterSpacing: 2.5, paddingHorizontal: 2,
  },

  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    padding: 14,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowName: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh, flex: 1 },
  rowDate: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow },
  pendingText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.warning, fontStyle: "italic" },
  resolvedText: { fontSize: 11, fontFamily: FONT.reg },
  blockedText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textMid, textAlign: "center" },
  emptyText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 18 },
});
