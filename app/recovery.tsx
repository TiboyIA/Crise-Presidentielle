import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { reloadAppAsync } from "expo";
import { useStrategy } from "@/context/StrategyContext";
import { useAuth } from "@/context/AuthContext";
import { downloadSave } from "@/services/SyncService";
import { migrateSave } from "@/storage/saveMigrations";
import { saveStrategy, deleteStrategy } from "@/storage/strategyStorage";

const BG    = "#0a0c0e";
const CARD  = "#141820";
const WARN  = "#f39c12";
const RED   = "#c0392b";
const GREEN = "#27ae60";
const MUTED = "#6a7a90";
const FG    = "#e8e8e8";
const BORDER= "#1e2530";

export default function RecoveryScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const auth    = useAuth();
  const { saveWarnings, startNewGame } = useStrategy();

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  // ── Cloud restore ────────────────────────────────────────────────────────────

  const handleCloudRestore = async () => {
    if (!auth.accessToken) {
      Alert.alert(
        "Non connecté",
        "Connectez-vous à votre compte pour restaurer une sauvegarde cloud.",
        [{ text: "OK" }],
      );
      return;
    }
    setStatus("loading");
    setStatusMsg("Téléchargement de la sauvegarde cloud…");
    try {
      const cloud = await downloadSave(auth.accessToken);
      if (!cloud?.save) {
        setStatus("error");
        setStatusMsg("Aucune sauvegarde cloud disponible.");
        return;
      }
      const result = migrateSave(cloud.save);
      if (!result) {
        setStatus("error");
        setStatusMsg("La sauvegarde cloud n'est pas lisible.");
        return;
      }
      await saveStrategy(result.state);
      setStatus("done");
      setStatusMsg("Sauvegarde restaurée. Redémarrage…");
      setTimeout(() => reloadAppAsync(), 1200);
    } catch {
      setStatus("error");
      setStatusMsg("Erreur de connexion. Vérifiez votre réseau et réessayez.");
    }
  };

  // ── Continue with recovered state ────────────────────────────────────────────

  const handleContinue = () => {
    router.replace("/nation");
  };

  // ── Export diagnostic ────────────────────────────────────────────────────────

  const handleExportDiagnostic = async () => {
    const lines = [
      "=== DIAGNOSTIC — PRÉSIDENT : NATION EN CRISE ===",
      `Date : ${new Date().toISOString()}`,
      `Plateforme : ${Platform.OS} ${Platform.Version}`,
      "",
      "Avertissements de migration :",
      ...(saveWarnings.length > 0 ? saveWarnings.map((w) => `• ${w}`) : ["(aucun)"]),
    ].join("\n");

    try {
      await Share.share({ message: lines, title: "Diagnostic sauvegarde" });
    } catch {
      // User dismissed share sheet — not an error
    }
  };

  // ── New game (last resort) ───────────────────────────────────────────────────

  const handleNewGame = () => {
    const msg =
      "Cette action démarre une nouvelle partie. La session récupérée sera effacée. Vos statistiques et achats sont conservés.";

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Nouvelle partie ?\n\n${msg}`)) {
        void confirmNewGame();
      }
      return;
    }
    Alert.alert("Nouvelle partie ?", msg, [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", style: "destructive", onPress: () => void confirmNewGame() },
    ]);
  };

  const confirmNewGame = async () => {
    await deleteStrategy();
    startNewGame("Président");
    router.replace("/nation");
  };

  // ── Retry load ───────────────────────────────────────────────────────────────

  const handleRetry = async () => {
    setStatus("loading");
    setStatusMsg("Rechargement…");
    try {
      await reloadAppAsync();
    } catch {
      setStatus("error");
      setStatusMsg("Impossible de redémarrer. Fermez et rouvrez l'application.");
    }
  };

  const isLoading = status === "loading";

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Sauvegarde récupérée</Text>
          <Text style={styles.subtitle}>
            Une partie de votre progression n'a pas pu être chargée correctement.
            Choisissez comment continuer.
          </Text>
        </View>

        {/* Status message */}
        {statusMsg !== "" && (
          <View style={[styles.statusBox, status === "error" && styles.statusBoxError]}>
            <Text style={[styles.statusText, status === "error" && styles.statusTextError]}>
              {statusMsg}
            </Text>
          </View>
        )}

        {/* Options */}
        <View style={styles.section}>
          {/* Primary: cloud restore */}
          <ActionButton
            label="Restaurer depuis le cloud"
            description={
              auth.accessToken
                ? "Télécharge et applique votre dernière sauvegarde en ligne."
                : "Connectez-vous à votre compte pour accéder à la sauvegarde cloud."
            }
            color={GREEN}
            icon="☁️"
            onPress={handleCloudRestore}
            disabled={isLoading}
          />

          {/* Retry */}
          <ActionButton
            label="Réessayer"
            description="Redémarre l'application. La session récupérée reste disponible."
            color="#2980b9"
            icon="🔄"
            onPress={handleRetry}
            disabled={isLoading}
          />

          {/* Continue with fallback */}
          <ActionButton
            label="Continuer la session récupérée"
            description="Joue avec l'état de secours. Certaines données peuvent être manquantes."
            color={WARN}
            icon="▶️"
            onPress={handleContinue}
            disabled={isLoading}
          />

          {/* Export diagnostic */}
          <ActionButton
            label="Exporter le diagnostic"
            description="Partage les détails techniques pour obtenir de l'aide."
            color={MUTED}
            icon="📋"
            onPress={handleExportDiagnostic}
            disabled={isLoading}
            outline
          />

          {/* Last resort: new game */}
          <ActionButton
            label="Nouvelle partie"
            description="Efface la session corrompue et repart de zéro. Irreversible."
            color={RED}
            icon="🗑️"
            onPress={handleNewGame}
            disabled={isLoading}
            outline
          />
        </View>

        {/* Dev-only warning list */}
        {__DEV__ && saveWarnings.length > 0 && (
          <View style={styles.devBox}>
            <Text style={styles.devTitle}>DEV — Avertissements migration</Text>
            {saveWarnings.map((w, i) => (
              <Text key={i} style={styles.devLine}>• {w}</Text>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Vos statistiques et packs débloqués sont toujours conservés.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Action button component ───────────────────────────────────────────────────

function ActionButton({
  label, description, color, icon, onPress, disabled, outline,
}: {
  label: string;
  description: string;
  color: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        outline ? { ...styles.btnOutline, borderColor: color } : { backgroundColor: color },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <View style={styles.btnRow}>
        <Text style={styles.btnIcon}>{icon}</Text>
        <View style={styles.btnText}>
          <Text style={[styles.btnLabel, outline && { color }]}>{label}</Text>
          <Text style={styles.btnDesc}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    padding: 24,
    gap: 20,
  },
  header: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: FG,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
  statusBox: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  statusBoxError: {
    borderLeftColor: RED,
  },
  statusText: {
    color: FG,
    fontSize: 13,
  },
  statusTextError: {
    color: RED,
  },
  section: {
    gap: 12,
  },
  btn: {
    borderRadius: 10,
    padding: 16,
  },
  btnOutline: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  btnIcon: {
    fontSize: 22,
    lineHeight: 28,
  },
  btnText: {
    flex: 1,
    gap: 4,
  },
  btnLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 18,
  },
  devBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  devTitle: {
    color: WARN,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  devLine: {
    color: MUTED,
    fontSize: 11,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  footer: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingBottom: 16,
  },
});
