import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { useAuth } from "@/context/AuthContext";
import { fetchAlliances, respondToAlliance, computeAllianceBonuses, ALLIANCE_BONUS_PER_ACTIVE, type Alliance } from "@/services/AllianceService";

const STATUS_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  pending:  "clock-outline",
  active:   "handshake",
  broken:   "link-off",
  rejected: "close-circle-outline",
};

const STATUS_COLORS: Record<string, string> = {
  pending:  PALETTE.warning,
  active:   PALETTE.success,
  broken:   PALETTE.textLow,
  rejected: PALETTE.danger,
};

function expiresLabel(expires_at: string | null): string {
  if (!expires_at) return "";
  const ms = new Date(expires_at).getTime() - Date.now();
  if (ms <= 0) return "Expirée";
  const days = Math.floor(ms / (86400 * 1000));
  const hours = Math.floor((ms % (86400 * 1000)) / (3600 * 1000));
  if (days > 0) return `Expire dans ${days}j`;
  return `Expire dans ${hours}h`;
}

function inviteErrorMessage(error?: string): string {
  switch (error) {
    case "max-alliances-reached": return "Tu as déjà 3 alliances actives.";
    case "not-pending":           return "Cette invitation n'est plus en attente.";
    case "not-active":            return "Cette alliance n'est plus active.";
    case "network-unavailable":   return "Connexion indisponible.";
    default:                      return "Une erreur est survenue. Vérifie ta connexion.";
  }
}

export default function AlliancesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!auth.accessToken) { setLoading(false); setRefreshing(false); return; }
    try {
      const data = await fetchAlliances(auth.accessToken);
      if (mountedRef.current) setAlliances(data);
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [auth.accessToken]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  async function doRespond(allianceId: string, action: "accept" | "reject" | "break") {
    if (!auth.accessToken || responding) return;
    setResponding(allianceId);
    try {
      const result = await respondToAlliance(auth.accessToken, allianceId, action);
      if (mountedRef.current) {
        if (result.ok) {
          await load();
        } else {
          Alert.alert("Erreur", inviteErrorMessage(result.error));
        }
      }
    } finally {
      if (mountedRef.current) setResponding(null);
    }
  }

  function handleRespond(allianceId: string, action: "accept" | "reject" | "break") {
    if (action === "break") {
      Alert.alert(
        "Rompre l'alliance",
        "Cette action brisera votre alliance. Un délai de 48h s'appliquera avant toute nouvelle invitation.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Rompre", style: "destructive", onPress: () => void doRespond(allianceId, action) },
        ],
      );
      return;
    }
    void doRespond(allianceId, action);
  }

  const received = alliances.filter((a) => a.status === "pending" && !a.is_initiator);
  const active   = alliances.filter((a) => a.status === "active");
  const sent     = alliances.filter((a) => a.status === "pending" && a.is_initiator);
  const isEmpty  = received.length === 0 && active.length === 0 && sent.length === 0;

  if (!auth.isEnabled) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>DIPLOMATIE</Text>
          <Text style={styles.headerTitle}>MES ALLIANCES</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <View style={styles.headerRule} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PALETTE.gold} size="large" />
        </View>
      ) : isEmpty ? (
        <ScrollView
          contentContainerStyle={[styles.center, { flex: 1, paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.gold} />}
        >
          <MaterialCommunityIcons name="handshake-outline" size={48} color={PALETTE.textLow} />
          <Text style={styles.emptyTitle}>Aucune alliance</Text>
          <Text style={styles.emptyText}>
            Consulte le classement mondial, appuie sur un joueur et propose-lui une alliance.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.gold} />}
          showsVerticalScrollIndicator={false}
        >
          {received.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>INVITATIONS REÇUES</Text>
              {received.map((a) => (
                <AllianceRow
                  key={a.id}
                  alliance={a}
                  busy={responding === a.id}
                  onAccept={() => handleRespond(a.id, "accept")}
                  onReject={() => handleRespond(a.id, "reject")}
                />
              ))}
            </>
          )}

          {active.length > 0 && (() => {
            const { rate } = computeAllianceBonuses(active);
            const bonusPct = Math.round(rate * 100);
            return (
              <>
                <Text style={styles.sectionLabel}>ALLIANCES ACTIVES</Text>
                <View style={styles.bonusEncart}>
                  <MaterialCommunityIcons name="lightning-bolt" size={13} color={PALETTE.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bonusTitle}>BONUS DIPLOMATIQUE ACTIF</Text>
                    <Text style={styles.bonusDesc}>
                      {`+${Math.round(ALLIANCE_BONUS_PER_ACTIVE * 100)}% par alliance — Bonus total : +${bonusPct}% production`}
                    </Text>
                  </View>
                </View>
                {active.map((a) => (
                  <AllianceRow
                    key={a.id}
                    alliance={a}
                    busy={responding === a.id}
                    onBreak={() => handleRespond(a.id, "break")}
                  />
                ))}
              </>
            );
          })()}

          {sent.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>INVITATIONS ENVOYÉES</Text>
              {sent.map((a) => (
                <AllianceRow key={a.id} alliance={a} busy={false} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function AllianceRow({
  alliance, busy, onAccept, onReject, onBreak,
}: {
  alliance: Alliance;
  busy: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onBreak?: () => void;
}) {
  const statusColor = STATUS_COLORS[alliance.status] ?? PALETTE.textMid;
  const icon = STATUS_ICONS[alliance.status] ?? "circle-outline";
  const expiresText = expiresLabel(alliance.expires_at);
  const isActive = alliance.status === "active";

  return (
    <View style={[styles.row, isActive && styles.rowActive]}>
      <MaterialCommunityIcons name={icon} size={20} color={statusColor} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{alliance.partner_name || "Anonyme"}</Text>
        {isActive && (
          <View style={styles.bonusBadge}>
            <Text style={styles.bonusBadgeText}>+{Math.round(ALLIANCE_BONUS_PER_ACTIVE * 100)}% PRODUCTION</Text>
          </View>
        )}
        {Boolean(expiresText) && <Text style={styles.rowMeta}>{expiresText}</Text>}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={PALETTE.gold} />
      ) : (
        <View style={styles.rowActions}>
          {onAccept && (
            <Pressable onPress={onAccept} style={({ pressed }) => [styles.actionBtn, styles.acceptBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.actionText, { color: PALETTE.success }]}>ACCEPTER</Text>
            </Pressable>
          )}
          {onReject && (
            <Pressable onPress={onReject} style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.actionText, { color: PALETTE.textLow }]}>REFUSER</Text>
            </Pressable>
          )}
          {onBreak && (
            <Pressable onPress={onBreak} style={({ pressed }) => [styles.actionBtn, styles.breakBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.actionText, { color: PALETTE.danger }]}>ROMPRE</Text>
            </Pressable>
          )}
          {!onAccept && !onReject && !onBreak && (
            <Text style={styles.sentLabel}>En attente…</Text>
          )}
        </View>
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

  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textMid, textAlign: "center" },
  emptyText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 18 },

  content: { padding: 16, gap: 6 },
  sectionLabel: {
    fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold,
    letterSpacing: 2.5, marginTop: 12, marginBottom: 4,
  },

  bonusEncart: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: PALETTE.success + "12",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.success + "44",
    padding: 12, marginBottom: 4,
  },
  bonusTitle: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.success, letterSpacing: 2, marginBottom: 2 },
  bonusDesc:  { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    padding: 14,
  },
  rowActive: { borderColor: PALETTE.success + "44" },
  rowName: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh },
  rowMeta: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 },
  bonusBadge: {
    alignSelf: "flex-start",
    backgroundColor: PALETTE.success + "20",
    borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2,
    marginTop: 4,
  },
  bonusBadgeText: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.success, letterSpacing: 1 },
  rowActions: { flexDirection: "row", gap: 8, alignItems: "center" },

  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.sm - 2,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
  },
  acceptBtn: { borderColor: PALETTE.success + "55" },
  breakBtn:  { borderColor: PALETTE.danger + "55" },
  actionText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 1 },
  sentLabel: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },
});
