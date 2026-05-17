import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  apple: "Apple",
};

export default function AccountLinkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  function linkErrorMessage(error?: string): string {
    switch (error) {
      case "no-session":              return "Session expirée. Relancez l'application.";
      case "identity-already-linked": return "Ce compte est déjà lié à un autre joueur.";
      case "not-enabled":             return "Authentification non disponible.";
      default:                        return "Liaison impossible. Réessayez dans un instant.";
    }
  }

  async function handleLinkGoogle() {
    setLoading("google");
    setFeedback(null);
    const result = await auth.linkWithGoogle();
    setLoading(null);
    if (result.ok) {
      setFeedback({ ok: true, message: "Compte sécurisé avec succès." });
    } else if (result.error !== "cancelled") {
      setFeedback({ ok: false, message: linkErrorMessage(result.error) });
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>COMPTE</Text>
          <Text style={styles.headerTitle}>SÉCURISER MON COMPTE</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <View style={styles.headerRule} />

      <View style={styles.body}>
        {/* Status */}
        {auth.isLinked ? (
          <View style={styles.linkedCard}>
            <MaterialCommunityIcons name="shield-check" size={32} color={PALETTE.success} />
            <Text style={styles.linkedTitle}>Compte sécurisé</Text>
            <Text style={styles.linkedSub}>
              Lié via {auth.linkedProviders.map((p) => PROVIDER_LABELS[p] ?? p).join(", ")}
            </Text>
            <Text style={styles.linkedNote}>
              Vos données sont protégées. En cas de perte de téléphone, reconnectez-vous avec le même compte pour retrouver votre progression.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="shield-alert-outline" size={28} color={PALETTE.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Compte anonyme</Text>
                <Text style={styles.infoText}>
                  Votre progression est sauvegardée localement et sur le cloud. Mais si vous perdez votre téléphone ou réinstallez l'app, vos données seront perdues.
                </Text>
                <Text style={styles.infoText}>
                  Liez un compte Google ou Apple pour récupérer votre sauvegarde depuis n'importe quel appareil.
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <Pressable
                onPress={handleLinkGoogle}
                disabled={loading !== null}
                style={({ pressed }) => [styles.providerBtn, { opacity: pressed || loading !== null ? 0.7 : 1 }]}
              >
                {loading === "google" ? (
                  <ActivityIndicator color={PALETTE.gold} size="small" />
                ) : (
                  <>
                    <Text style={styles.providerIcon}>G</Text>
                    <Text style={styles.providerLabel}>Continuer avec Google</Text>
                  </>
                )}
              </Pressable>
            </View>

            {feedback && (
              <Text style={[styles.feedback, { color: feedback.ok ? PALETTE.success : PALETTE.danger }]}>
                {feedback.message}
              </Text>
            )}

            <Text style={styles.disclaimer}>
              La liaison ne remplace pas votre compte — votre identifiant joueur, vos scores et votre progression restent identiques.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06080e" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  headerTitle: { fontSize: 15, fontFamily: FONT.bold, color: "#fff", letterSpacing: 2 },
  headerRule: { height: 1, backgroundColor: PALETTE.gold + "33" },

  body: { flex: 1, padding: 20, gap: 16 },

  linkedCard: { alignItems: "center", gap: 10, padding: 24, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.success + "55", backgroundColor: PALETTE.success + "0d" },
  linkedTitle: { fontSize: 18, fontFamily: FONT.bold, color: PALETTE.success },
  linkedSub: { fontSize: 12, fontFamily: FONT.semi, color: PALETTE.textMid },
  linkedNote: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 17 },

  infoCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.warning + "44", backgroundColor: PALETTE.warning + "0d" },
  infoTitle: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.warning, marginBottom: 4 },
  infoText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16, marginBottom: 4 },

  buttons: { gap: 10 },
  providerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 14, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
    backgroundColor: "#161b27",
  },
  providerIcon: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.gold, width: 20, textAlign: "center" },
  providerLabel: { fontSize: 13, fontFamily: FONT.semi, color: PALETTE.textHigh },

  feedback: { fontSize: 12, fontFamily: FONT.semi, textAlign: "center" },
  disclaimer: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 15, marginTop: 4 },
});
