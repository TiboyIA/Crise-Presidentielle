import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useComfort, PROFILE_LIST } from "@/context/ComfortContext";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, startNewGame } = useStrategy();
  const {
    enabled: comfortEnabled, toggle: toggleComfort,
    oneHand, toggleOneHand,
    lowLoad, toggleLowLoad,
    profile, setProfile,
  } = useComfort();

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
        {/* Section — Profil d'accessibilité */}
        <Text style={styles.sectionLabel}>PROFIL D'ACCESSIBILITÉ</Text>
        <View style={styles.card}>
          {PROFILE_LIST.map((p, idx) => {
            const isActive = profile.id === p.id;
            const isLast   = idx === PROFILE_LIST.length - 1;
            return (
              <React.Fragment key={p.id}>
                <Pressable
                  onPress={() => setProfile(p.id)}
                  style={({ pressed }) => [styles.profileRow, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <View style={[styles.profileIcon, isActive && styles.profileIconOn]}>
                    <MaterialCommunityIcons
                      name={p.icon}
                      size={16}
                      color={isActive ? PALETTE.gold : PALETTE.textLow}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.profileLabel, isActive && styles.profileLabelOn]}>
                      {p.label}
                    </Text>
                    <Text style={styles.profileDesc}>{p.description}</Text>
                  </View>
                  {isActive && (
                    <MaterialCommunityIcons name="check-circle" size={16} color={PALETTE.gold} />
                  )}
                </Pressable>
                {!isLast && (
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.panelEdge }} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Section — Confort de commandement */}
        <Text style={styles.sectionLabel}>ACCESSIBILITÉ</Text>
        <View style={styles.card}>
          <Pressable
            onPress={toggleComfort}
            style={({ pressed }) => [styles.comfortRow, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.comfortIcon, comfortEnabled && styles.comfortIconOn]}>
              <MaterialCommunityIcons
                name="eye-outline"
                size={18}
                color={comfortEnabled ? PALETTE.gold : PALETTE.textLow}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.comfortTitle, comfortEnabled && styles.comfortTitleOn]}>
                Mode Confort de commandement
              </Text>
              <Text style={styles.comfortSub}>
                {comfortEnabled
                  ? "Actif — textes agrandis, espacements élargis, effets atténués, animations réduites."
                  : "Inactif — interface standard. Activez pour réduire la fatigue visuelle."}
              </Text>
            </View>
            <View style={[styles.toggle, comfortEnabled && styles.toggleOn]}>
              <View style={[styles.toggleThumb, comfortEnabled && styles.toggleThumbOn]} />
            </View>
          </Pressable>

          {comfortEnabled && (
            <View style={styles.comfortDetails}>
              <ComfortFeature icon="format-size" label="Textes critiques agrandis (+13 %)" />
              <ComfortFeature icon="arrow-expand-vertical" label="Boutons et espaces élargis (+35 %)" />
              <ComfortFeature icon="image-off-outline" label="Bannières d'images masquées" />
              <ComfortFeature icon="motion-pause-outline" label="Animations et effets réduits" />
              <ComfortFeature icon="card-text-outline" label="Résumés compacts en priorité" />
            </View>
          )}

          {/* Séparateur */}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.panelEdge }} />

          {/* Toggle — Mode Une Main */}
          <Pressable
            onPress={toggleOneHand}
            style={({ pressed }) => [styles.comfortRow, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.comfortIcon, oneHand && styles.comfortIconOn]}>
              <MaterialCommunityIcons
                name="hand-pointing-down"
                size={18}
                color={oneHand ? PALETTE.gold : PALETTE.textLow}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.comfortTitle, oneHand && styles.comfortTitleOn]}>
                Mode Une main
              </Text>
              <Text style={styles.comfortSub}>
                {oneHand
                  ? "Actif — barre de navigation en bas pour accès au pouce."
                  : "Inactif — navigation standard. Activez pour un confort au pouce."}
              </Text>
            </View>
            <View style={[styles.toggle, oneHand && styles.toggleOn]}>
              <View style={[styles.toggleThumb, oneHand && styles.toggleThumbOn]} />
            </View>
          </Pressable>

          {oneHand && (
            <View style={styles.comfortDetails}>
              <ComfortFeature icon="hand-pointing-down" label="Nation, Journal, Carte, Opérations, Missions" />
              <ComfortFeature icon="navigation-outline" label="Raccourcis accessibles d'un seul pouce" />
              <ComfortFeature icon="dots-horizontal" label="Indicateur de page active" />
            </View>
          )}

          {/* Séparateur */}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.panelEdge }} />

          {/* Toggle — Mode Faible Charge Mentale */}
          <Pressable
            onPress={toggleLowLoad}
            style={({ pressed }) => [styles.comfortRow, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.comfortIcon, lowLoad && styles.comfortIconOn]}>
              <MaterialCommunityIcons
                name="brain"
                size={18}
                color={lowLoad ? PALETTE.gold : PALETTE.textLow}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.comfortTitle, lowLoad && styles.comfortTitleOn]}>
                Mode Faible Charge Mentale
              </Text>
              <Text style={styles.comfortSub}>
                {lowLoad
                  ? "Actif — priorité unique par écran, détails secondaires masqués."
                  : "Inactif — interface complète. Activez pour réduire la surcharge cognitive."}
              </Text>
            </View>
            <View style={[styles.toggle, lowLoad && styles.toggleOn]}>
              <View style={[styles.toggleThumb, lowLoad && styles.toggleThumbOn]} />
            </View>
          </Pressable>

          {lowLoad && (
            <View style={styles.comfortDetails}>
              <ComfortFeature icon="flag-outline" label="Priorité principale affichée par écran" />
              <ComfortFeature icon="eye-off-outline" label="Sections secondaires masquées (Voir tout)" />
              <ComfortFeature icon="numeric-1-circle-outline" label="Indicateur le plus critique mis en avant" />
              <ComfortFeature icon="gesture-tap" label="Action recommandée en accès direct" />
            </View>
          )}
        </View>

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

function ComfortFeature({ icon, label }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string }) {
  return (
    <View style={styles.comfortFeature}>
      <MaterialCommunityIcons name={icon} size={11} color={PALETTE.gold} />
      <Text style={styles.comfortFeatureText}>{label}</Text>
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

  // ── Confort ───────────────────────────────────────────────────────────────────
  comfortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  comfortIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: PALETTE.panelEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  comfortIconOn: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderColor: PALETTE.gold + "50",
  },
  comfortTitle: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: PALETTE.textMid,
    marginBottom: 3,
  },
  comfortTitleOn: { color: PALETTE.gold },
  comfortSub: {
    fontSize: 11,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
    lineHeight: 15,
  },

  toggle: {
    width: 42,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.panelEdge,
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: PALETTE.gold },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.textLow,
    alignSelf: "flex-start",
  },
  toggleThumbOn: {
    backgroundColor: "#0a0c14",
    alignSelf: "flex-end",
  },

  comfortDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.panelEdge,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  comfortFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  comfortFeatureText: {
    fontSize: 11,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
  },

  // ── Partie ────────────────────────────────────────────────────────────────────
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

  // ── Profil d'accessibilité ────────────────────────────────────────────────
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: PALETTE.panelEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  profileIconOn: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderColor: PALETTE.gold + "50",
  },
  profileLabel: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: PALETTE.textMid,
    marginBottom: 2,
  },
  profileLabelOn: { color: PALETTE.gold },
  profileDesc: {
    fontSize: 11,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
    lineHeight: 15,
  },
});
