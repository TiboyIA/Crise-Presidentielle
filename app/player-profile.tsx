import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { useAuth } from "@/context/AuthContext";
import { inviteAlly } from "@/services/AllianceService";
import { launchSpyOp, type SpyOpType } from "@/services/SpyService";
import { launchCyberOp } from "@/services/CyberService";

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

const COUNTRY_LABELS: Record<string, string> = {
  france: "France", usa: "États-Unis", china: "Chine", russia: "Russie",
  germany: "Allemagne", uk: "Royaume-Uni", india: "Inde", japan: "Japon",
  brazil: "Brésil", turkey: "Turquie", iran: "Iran", israel: "Israël",
  south_korea: "Corée du Sud", italy: "Italie", saudi_arabia: "Arabie Saoudite",
  australia: "Australie", canada: "Canada", north_korea: "Corée du Nord",
  nigeria: "Nigeria", pakistan: "Pakistan",
};

const COUNTRY_FLAGS: Record<string, string> = {
  france: "🇫🇷", usa: "🇺🇸", china: "🇨🇳", russia: "🇷🇺", germany: "🇩🇪",
  uk: "🇬🇧", india: "🇮🇳", japan: "🇯🇵", brazil: "🇧🇷", turkey: "🇹🇷",
  iran: "🇮🇷", israel: "🇮🇱", south_korea: "🇰🇷", italy: "🇮🇹",
  saudi_arabia: "🇸🇦", australia: "🇦🇺", canada: "🇨🇦",
  north_korea: "🇰🇵", nigeria: "🇳🇬", pakistan: "🇵🇰",
};

function seasonLabel(season: number): string {
  const year = Math.floor(season / 100);
  const month = season % 100;
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

interface LeaderboardEntry {
  id: string;
  player_id: string;
  display_name: string;
  country_id: string;
  doctrine: string;
  score: number;
  mandate_days: number;
  created_at: string;
  season: number;
  rank_title: string;
  global_power: number;
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ entry: string; rank: string }>();

  const entry: LeaderboardEntry | null = React.useMemo(() => {
    try { return JSON.parse(params.entry ?? "") as LeaderboardEntry; }
    catch { return null; }
  }, [params.entry]);

  const rank = parseInt(params.rank ?? "0", 10);
  const auth = useAuth();
  const [inviteState, setInviteState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteError, setInviteError] = useState("");

  function inviteErrorLabel(error?: string): string {
    switch (error) {
      case "no-validated-run":        return "Complète d'abord une partie en mode classé.";
      case "max-alliances-reached":   return "Tu as déjà 3 alliances actives.";
      case "alliance-already-exists": return "Une relation d'alliance existe déjà avec ce joueur.";
      case "cooldown-active":         return "Attends 48h avant de ré-inviter ce joueur.";
      case "network-unavailable":     return "Connexion indisponible.";
      default:                        return "Erreur lors de l'invitation.";
    }
  }

  const [spySending, setSpySending] = useState<SpyOpType | null>(null);
  const [spySentOp, setSpySentOp] = useState<SpyOpType | null>(null);
  const [spyError, setSpyError] = useState("");

  const [cyberSending, setCyberSending] = useState(false);
  const [cyberSent, setCyberSent] = useState(false);
  const [cyberError, setCyberError] = useState("");

  function spyErrorLabel(error?: string): string {
    switch (error) {
      case "no-validated-run":     return "Complète d'abord une partie en mode classé.";
      case "target-protected-new": return "Ce joueur est protégé (compte < 7 jours).";
      case "target-no-score":      return "Ce joueur n'a pas encore soumis de score classé.";
      case "quota-exceeded":       return "Maximum 2 opérations par 24h.";
      case "target-cooldown":      return "Tu as déjà espionné ce joueur récemment.";
      case "network-unavailable":  return "Connexion indisponible.";
      default:                     return "Erreur lors du lancement.";
    }
  }

  async function handleSpy(opType: SpyOpType) {
    if (!auth.accessToken || !entry || spySending || spySentOp) return;
    setSpySending(opType);
    setSpyError("");
    const result = await launchSpyOp(auth.accessToken, entry.player_id, opType);
    setSpySending(null);
    if (result.ok) {
      setSpySentOp(opType);
    } else {
      setSpyError(spyErrorLabel(result.error));
    }
  }

  function cyberErrorLabel(error?: string): string {
    switch (error) {
      case "no-validated-run":         return "Complète d'abord une partie en mode classé.";
      case "target-protected-new":     return "Ce joueur est protégé (compte < 14 jours).";
      case "target-no-score":          return "Ce joueur n'a pas de score classé cette saison.";
      case "quota-exceeded":           return "Maximum 1 cyberattaque par 24h.";
      case "target-protected-quota":   return "Ce joueur est déjà sous attaque ce cycle.";
      case "proportionality-exceeded": return "Écart de score trop grand pour cibler ce joueur.";
      case "network-unavailable":      return "Connexion indisponible.";
      default:                         return "Erreur lors du lancement.";
    }
  }

  async function handleCyber() {
    if (!auth.accessToken || !entry || cyberSending || cyberSent) return;
    setCyberSending(true);
    setCyberError("");
    const result = await launchCyberOp(auth.accessToken, entry.player_id);
    setCyberSending(false);
    if (result.ok) {
      setCyberSent(true);
    } else {
      setCyberError(cyberErrorLabel(result.error));
    }
  }

  async function handleInvite() {
    if (!auth.accessToken || !entry || inviteState === "sending") return;
    setInviteState("sending");
    const result = await inviteAlly(auth.accessToken, entry.player_id);
    if (result.ok) {
      setInviteState("sent");
    } else {
      setInviteState("error");
      setInviteError(inviteErrorLabel(result.error));
    }
  }

  if (!entry) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnStandalone}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
      </View>
    );
  }

  const flag = COUNTRY_FLAGS[entry.country_id] ?? "🏳️";
  const country = COUNTRY_LABELS[entry.country_id] ?? entry.country_id;
  const doctrine = DOCTRINE_LABELS[entry.doctrine] ?? entry.doctrine;
  const rankColor = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : PALETTE.gold;
  const date = new Date(entry.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const hasTitle = Boolean(entry.rank_title);
  const hasPower = entry.global_power > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>PROFIL DIRIGEANT</Text>
          <Text style={styles.headerTitle}>DOSSIER PUBLIC</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <View style={styles.headerRule} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <LinearGradient colors={["#1c1408", "#0a0d14"]} style={styles.idCard}>
          <View style={styles.idTop}>
            <Text style={styles.bigFlag}>{flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.displayName} numberOfLines={1}>
                {entry.display_name || "Anonyme"}
              </Text>
              <Text style={styles.countryText}>{country}</Text>
              {hasTitle && (
                <Text style={styles.rankTitleText}>{entry.rank_title}</Text>
              )}
            </View>
            <View style={[styles.rankBadge, { borderColor: rankColor + "88" }]}>
              <Text style={[styles.rankBadgeText, { color: rankColor }]}>
                {rankMedal(rank)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats grid */}
        <View style={styles.grid}>
          <StatCard
            icon="star"
            label="SCORE CLASSÉ"
            value={entry.score.toLocaleString("fr-FR")}
            accent={PALETTE.gold}
          />
          <StatCard
            icon="calendar-range"
            label="DURÉE MANDAT"
            value={`${entry.mandate_days} jours`}
          />
          <StatCard
            icon="account-tie"
            label="DOCTRINE"
            value={doctrine}
          />
          {hasPower && (
            <StatCard
              icon="lightning-bolt"
              label="PUISSANCE"
              value={String(entry.global_power)}
              accent={PALETTE.warning}
            />
          )}
          <StatCard
            icon="trophy-outline"
            label="SAISON"
            value={seasonLabel(entry.season)}
          />
          <StatCard
            icon="clock-outline"
            label="SOUMIS LE"
            value={date}
          />
        </View>

        {/* Spy ops */}
        {auth.isEnabled && auth.accessToken && entry.player_id !== auth.user?.id && (
          <View style={styles.spyWrap}>
            <Text style={styles.spySectionLabel}>OPÉRATION D'ESPIONNAGE</Text>
            <View style={styles.spyChips}>
              {(
                [
                  { type: "intel_probe"   as SpyOpType, label: "Intel",    icon: "magnify" },
                  { type: "doctrine_scan" as SpyOpType, label: "Doctrine", icon: "eye-outline" },
                  { type: "score_range"   as SpyOpType, label: "Score",    icon: "chart-line" },
                ] as const
              ).map(({ type, label, icon }) => {
                const isSent    = spySentOp === type;
                const isSending = spySending === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => void handleSpy(type)}
                    disabled={!!spySending || !!spySentOp}
                    style={({ pressed }) => [
                      styles.spyChip,
                      isSent && styles.spyChipSent,
                      { opacity: pressed || (!!spySending && !isSending) || !!spySentOp ? 0.6 : 1 },
                    ]}
                  >
                    {isSending
                      ? <ActivityIndicator size="small" color={PALETTE.gold} />
                      : <MaterialCommunityIcons
                          name={icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                          size={14}
                          color={isSent ? PALETTE.success : PALETTE.gold}
                        />
                    }
                    <Text style={[styles.spyChipText, isSent && { color: PALETTE.success }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {Boolean(spyError) && <Text style={styles.spyErrText}>{spyError}</Text>}
            {spySentOp && <Text style={styles.spySentText}>Opération lancée — résultat dans 6h</Text>}
          </View>
        )}

        {/* Cyber attack */}
        {auth.isEnabled && auth.isLinked && auth.accessToken && entry.player_id !== auth.user?.id && (
          <View style={styles.cyberWrap}>
            {cyberSent ? (
              <View style={styles.cyberRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={PALETTE.success} />
                <Text style={[styles.cyberBtnText, { color: PALETTE.success }]}>Cyberattaque lancée — résultat dans 4h</Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => void handleCyber()}
                  disabled={cyberSending}
                  style={({ pressed }) => [styles.cyberRow, { opacity: pressed || cyberSending ? 0.7 : 1 }]}
                >
                  {cyberSending
                    ? <ActivityIndicator size="small" color={PALETTE.danger} />
                    : <MaterialCommunityIcons name="lightning-bolt" size={16} color={PALETTE.danger} />
                  }
                  <Text style={styles.cyberBtnText}>
                    {cyberSending ? "Lancement…" : "Lancer une cyberattaque"}
                  </Text>
                </Pressable>
                {Boolean(cyberError) && (
                  <Text style={styles.cyberErrText}>{cyberError}</Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Alliance invite */}
        {auth.isEnabled && auth.isLinked && auth.accessToken && entry.player_id !== auth.user?.id && (
          <View style={styles.inviteWrap}>
            {inviteState === "sent" ? (
              <View style={styles.inviteRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={PALETTE.success} />
                <Text style={[styles.inviteBtnText, { color: PALETTE.success }]}>Invitation envoyée</Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => void handleInvite()}
                  disabled={inviteState === "sending"}
                  style={({ pressed }) => [styles.inviteRow, { opacity: pressed || inviteState === "sending" ? 0.7 : 1 }]}
                >
                  {inviteState === "sending"
                    ? <ActivityIndicator size="small" color={PALETTE.gold} />
                    : <MaterialCommunityIcons name="handshake-outline" size={16} color={PALETTE.gold} />
                  }
                  <Text style={styles.inviteBtnText}>
                    {inviteState === "sending" ? "Envoi…" : "Proposer une alliance"}
                  </Text>
                </Pressable>
                {inviteState === "error" && (
                  <Text style={styles.inviteErrText}>{inviteError}</Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-check-outline" size={12} color={PALETTE.textLow} />
          <Text style={styles.footerText}>Score validé par le serveur — mode classé</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={16} color={accent ?? PALETTE.textLow} style={{ marginBottom: 6 }} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06080e" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backBtnStandalone: { margin: 16, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: "#fff", letterSpacing: 4 },
  headerRule: { height: 1, backgroundColor: PALETTE.gold + "33" },

  content: { padding: 16, gap: 12 },

  idCard: {
    borderRadius: RADIUS.md, padding: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "55",
  },
  idTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  bigFlag: { fontSize: 52, lineHeight: 60 },
  displayName: { fontSize: 20, fontFamily: FONT.bold, color: "#fff", letterSpacing: 0.3 },
  countryText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textMid, marginTop: 2 },
  rankTitleText: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, marginTop: 4, letterSpacing: 1 },

  rankBadge: {
    width: 52, height: 52, borderRadius: RADIUS.sm,
    borderWidth: 1, backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  rankBadgeText: { fontSize: 20, fontFamily: FONT.bold },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    padding: 14,
  },
  statLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2, marginBottom: 4 },
  statValue: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh },

  footer: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingTop: 4 },
  footerText: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },

  inviteWrap: {
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "44",
    padding: 14,
  },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  inviteBtnText: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.gold },
  inviteErrText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.danger, marginTop: 8 },

  spyWrap: {
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
    padding: 14, gap: 10,
  },
  spySectionLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2.5 },
  spyChips: { flexDirection: "row", gap: 8 },
  spyChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 6,
    borderRadius: RADIUS.sm - 2,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "55",
  },
  spyChipSent: { borderColor: PALETTE.success + "55" },
  spyChipText: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold },
  spyErrText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.danger },
  spySentText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, fontStyle: "italic" },

  cyberWrap: {
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.danger + "44",
    padding: 14,
  },
  cyberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cyberBtnText: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.danger },
  cyberErrText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.danger, marginTop: 8 },
});
