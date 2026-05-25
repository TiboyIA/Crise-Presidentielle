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
import { fetchSpyOps, type SpyOp, type SpyResult } from "@/services/SpyService";
import { buildOperationReport } from "@/logic/operationNarrativeEngine";
import { OperationReportCard } from "@/components/OperationReportCard";

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

const OP_LABELS: Record<string, string> = {
  intel_probe:   "Intel",
  doctrine_scan: "Doctrine",
  score_range:   "Score",
};

const OP_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  intel_probe:   "magnify",
  doctrine_scan: "eye-outline",
  score_range:   "chart-line",
};

function countdownLabel(resolvesAt: string): string {
  const ms = new Date(resolvesAt).getTime() - Date.now();
  if (ms <= 0) return "Traitement en cours…";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `Disponible dans ${h}h ${m}m` : `Disponible dans ${m}m`;
}

function blockedReasonLabel(reason?: string): string {
  switch (reason) {
    case "target-protected-new":   return "Cible protégée — compte récent (< 7 jours).";
    case "target-protected-quota": return "Cible saturée — trop d'opérations ce cycle.";
    case "target-no-score":        return "Cible sans score classé cette saison.";
    case "defense-intercepted":    return "Opération interceptée par la défense adverse.";
    case "intel-network-blocked":  return "Réseau de renseignement adverse a neutralisé l'op.";
    default:                       return "Opération bloquée par les défenses adverses.";
  }
}

function ResultLine({ result, opType }: { result: SpyResult; opType: string }) {
  if (result.blocked_reason) {
    return (
      <View style={styles.blockedBox}>
        <MaterialCommunityIcons name="shield-alert-outline" size={12} color={PALETTE.textLow} />
        <Text style={styles.resultBlocked}>{blockedReasonLabel(result.blocked_reason)}</Text>
      </View>
    );
  }

  const lines: string[] = [];

  if (opType === "intel_probe") {
    const flag = result.country ? (COUNTRY_FLAGS[result.country] ?? "🏳️") : "";
    if (result.country) lines.push(`${flag} ${result.country.replace(/_/g, " ")}`);
    if (result.doctrine) lines.push(`Doctrine : ${DOCTRINE_LABELS[result.doctrine] ?? result.doctrine}`);
  } else if (opType === "doctrine_scan") {
    if (result.doctrine) lines.push(`Doctrine : ${DOCTRINE_LABELS[result.doctrine] ?? result.doctrine}`);
    if (result.days_min != null) lines.push(`Durée mandat : ${result.days_min}–${result.days_max}j`);
  } else if (opType === "score_range") {
    const flag = result.country ? (COUNTRY_FLAGS[result.country] ?? "🏳️") : "";
    if (result.country) lines.push(`${flag} ${result.country.replace(/_/g, " ")}`);
    if (result.score_min != null) {
      lines.push(`Score estimé : ${result.score_min.toLocaleString("fr-FR")} – ${result.score_max!.toLocaleString("fr-FR")}`);
    }
  }

  if (lines.length === 0) return null;

  return (
    <View style={styles.resultLines}>
      {lines.map((l) => (
        <Text key={l} style={styles.resultText}>{l}</Text>
      ))}
    </View>
  );
}

function OpRow({ op }: { op: SpyOp }) {
  const result = op.result_json as SpyResult | null;
  const targetName = result?.target_name ?? "Cible inconnue";
  const icon = OP_ICONS[op.op_type] ?? "magnify";
  const label = OP_LABELS[op.op_type] ?? op.op_type;
  const date = new Date(op.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  const statusColor =
    op.status === "resolved" ? PALETTE.success :
    op.status === "blocked"  ? PALETTE.textLow :
    PALETTE.warning;

  const statusIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
    op.status === "resolved" ? "check-circle" :
    op.status === "blocked"  ? "shield-off-outline" :
    "clock-outline";

  return (
    <View style={[styles.row, op.status === "blocked" && styles.rowBlocked]}>
      <View style={[styles.opBadge, { borderColor: statusColor + "55" }]}>
        <MaterialCommunityIcons name={icon} size={16} color={statusColor} />
        <Text style={[styles.opBadgeLabel, { color: statusColor }]}>{label.toUpperCase()}</Text>
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.rowTop}>
          <Text style={styles.targetName} numberOfLines={1}>{targetName}</Text>
          <Text style={styles.rowDate}>{date}</Text>
        </View>

        {op.status === "pending" ? (
          <Text style={styles.pendingText}>{countdownLabel(op.resolves_at)}</Text>
        ) : result ? (
          <ResultLine result={result} opType={op.op_type} />
        ) : op.status === "blocked" ? (
          <View style={styles.blockedBox}>
            <MaterialCommunityIcons name="shield-alert-outline" size={12} color={PALETTE.textLow} />
            <Text style={styles.resultBlocked}>{blockedReasonLabel(undefined)}</Text>
          </View>
        ) : null}
      </View>

      <MaterialCommunityIcons name={statusIcon} size={16} color={statusColor} />
    </View>
  );
}

function DefenseSection() {
  return (
    <View style={styles.defenseBox}>
      <View style={styles.defenseTitleRow}>
        <MaterialCommunityIcons name="shield-half-full" size={13} color={PALETTE.textMid} />
        <Text style={styles.defenseTitle}>DÉFENSE CONTRE L'ESPIONNAGE</Text>
      </View>
      <Text style={styles.defenseText}>
        Les joueurs ayant développé leur infrastructure de cybersécurité ou leur réseau de renseignement réduisent les chances de réussite des opérations adverses. Une opération peut être bloquée ou retournée.
      </Text>
      <View style={styles.limitsGrid}>
        <LimitItem icon="timer-outline"       label="Quota"   value="Max 2 ops / 24h" />
        <LimitItem icon="account-clock"       label="Cooldown" value="1 op par cible / 24h" />
        <LimitItem icon="shield-account"      label="Protection" value="Nouveaux comptes (< 7j)" />
        <LimitItem icon="trophy-outline"      label="Prérequis" value="1 partie classée validée" />
      </View>
    </View>
  );
}

function LimitItem({
  icon, label, value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.limitItem}>
      <MaterialCommunityIcons name={icon} size={12} color={PALETTE.textLow} />
      <View>
        <Text style={styles.limitLabel}>{label}</Text>
        <Text style={styles.limitValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function SpyOpsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [ops, setOps] = useState<SpyOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [archivedIds, setArchivedIds] = useState<ReadonlySet<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!auth.accessToken) { setLoading(false); setRefreshing(false); return; }
    try {
      const data = await fetchSpyOps(auth.accessToken);
      if (mountedRef.current) setOps(data);
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [auth.accessToken]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const archiveOp = useCallback((id: string) => {
    setArchivedIds((prev) => new Set([...prev, id]));
  }, []);

  if (!auth.isEnabled) return null;

  const pending  = ops.filter((o) => o.status === "pending")
    .sort((a, b) => new Date(a.resolves_at).getTime() - new Date(b.resolves_at).getTime());
  const resolved = ops.filter((o) => o.status === "resolved")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const blocked  = ops.filter((o) => o.status === "blocked")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>RENSEIGNEMENT</Text>
          <Text style={styles.headerTitle}>MES OPÉRATIONS</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <View style={styles.headerRule} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PALETTE.gold} size="large" />
        </View>
      ) : ops.length === 0 ? (
        <ScrollView
          contentContainerStyle={[styles.emptyContent, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.gold} />}
        >
          <MaterialCommunityIcons name="magnify" size={48} color={PALETTE.textLow} />
          <Text style={styles.emptyTitle}>Aucune opération</Text>
          <Text style={styles.emptyText}>
            Lance une opération d'espionnage depuis le profil d'un joueur dans le classement mondial.
          </Text>
          <DefenseSection />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.gold} />}
          showsVerticalScrollIndicator={false}
        >
          {pending.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>EN COURS</Text>
              {pending.map((op) => <OpRow key={op.id} op={op} />)}
            </>
          )}

          {resolved.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>RÉSULTATS</Text>
              {resolved.map((op) =>
                archivedIds.has(op.id) ? (
                  <OpRow key={op.id} op={op} />
                ) : (
                  <OperationReportCard
                    key={op.id}
                    report={buildOperationReport(op)}
                    onArchive={() => archiveOp(op.id)}
                  />
                )
              )}
            </>
          )}

          {blocked.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>BLOQUÉES</Text>
              {blocked.map((op) =>
                archivedIds.has(op.id) ? (
                  <OpRow key={op.id} op={op} />
                ) : (
                  <OperationReportCard
                    key={op.id}
                    report={buildOperationReport(op)}
                    onArchive={() => archiveOp(op.id)}
                  />
                )
              )}
            </>
          )}

          <DefenseSection />
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
  emptyContent: { alignItems: "center", gap: 12, paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textMid, textAlign: "center" },
  emptyText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 18, marginBottom: 8 },

  content: { padding: 16, gap: 6 },
  sectionLabel: {
    fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold,
    letterSpacing: 2.5, marginTop: 12, marginBottom: 4,
  },

  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    padding: 14,
  },
  rowBlocked: { opacity: 0.7 },
  opBadge: {
    alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 8,
    borderRadius: RADIUS.sm - 2, borderWidth: StyleSheet.hairlineWidth,
    minWidth: 58,
  },
  opBadgeLabel: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 1 },

  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  targetName: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh, flex: 1 },
  rowDate: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow },

  pendingText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.warning, fontStyle: "italic" },

  resultLines: { gap: 2 },
  resultText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textMid },
  blockedBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 2 },
  resultBlocked: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic", flex: 1 },

  defenseBox: {
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    padding: 14, gap: 10, marginTop: 16,
  },
  defenseTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  defenseTitle: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 2 },
  defenseText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 17 },
  limitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  limitItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    width: "47%",
  },
  limitLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1, marginBottom: 1 },
  limitValue: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid },
});
