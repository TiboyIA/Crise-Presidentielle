import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, startNewGame } = useStrategy();

  const hasSave = state !== null;

  const handleReset = () => {
    if (!state) return;
    Alert.alert(
      "Réinitialiser la partie",
      "Toute votre progression sera effacée : ressources, bâtiments, recherches, opérations, journal de crise. Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: () => {
            startNewGame(state.playerName, state.governanceDoctrine);
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#161b27", "#0c1018"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.gold} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>CONFIGURATION</Text>
          <Text style={styles.title}>Paramètres</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section — Partie */}
        <Text style={styles.sectionLabel}>PARTIE</Text>
        <View style={styles.card}>
          {hasSave && (
            <View style={styles.saveInfo}>
              <MaterialCommunityIcons name="account-outline" size={14} color={PALETTE.textMid} />
              <Text style={styles.saveInfoText}>
                {state.playerName} · Jour {state.mandateDay} · {state.governanceDoctrine}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleReset}
            disabled={!hasSave}
            style={({ pressed }) => [
              styles.resetBtn,
              !hasSave && styles.resetBtnDisabled,
              { opacity: pressed && hasSave ? 0.7 : 1 },
            ]}
          >
            <MaterialCommunityIcons
              name="restore"
              size={16}
              color={hasSave ? PALETTE.danger : PALETTE.textLow}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resetBtnTitle, !hasSave && { color: PALETTE.textLow }]}>
                Réinitialiser la partie
              </Text>
              <Text style={styles.resetBtnSub}>
                {hasSave
                  ? "Efface toute la progression. Le nom et la doctrine sont conservés."
                  : "Aucune partie en cours."}
              </Text>
            </View>
            {hasSave && (
              <MaterialCommunityIcons name="chevron-right" size={16} color={PALETTE.danger + "88"} />
            )}
          </Pressable>
        </View>

        {/* Section — À propos */}
        <Text style={styles.sectionLabel}>À PROPOS</Text>
        <View style={styles.card}>
          <Row icon="gamepad-variant-outline" label="Version" value="1.0.0" />
          <Row icon="earth" label="Mode" value="Stratégie mondiale" />
          <Row icon="shield-lock-outline" label="Données" value="Stockage local uniquement" />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={14} color={PALETTE.textMid} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080c14" },

  header: {
    padding: 16,
    paddingBottom: 12,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
  },
  backBtn: { marginBottom: 8 },
  headerText: { gap: 2 },
  kicker: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 3, color: PALETTE.gold },
  title: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 0.5 },

  scroll: { padding: 16, gap: 16 },

  sectionLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 2,
    color: PALETTE.textLow,
    marginLeft: 2,
    marginBottom: -8,
  },

  card: {
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },

  saveInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
  },
  saveInfoText: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textMid },

  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderLeftWidth: 3,
    borderLeftColor: PALETTE.danger + "88",
  },
  resetBtnDisabled: { borderLeftColor: PALETTE.panelEdge },
  resetBtnTitle: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.danger, marginBottom: 2 },
  resetBtnSub: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 15 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
  },
  rowLabel: { flex: 1, fontSize: 12, fontFamily: FONT.med, color: PALETTE.textMid },
  rowValue: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },
});
