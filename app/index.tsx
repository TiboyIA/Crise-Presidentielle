import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { getTutorialSeen } from "@/storage/tutorialStorage";
import { BG } from "@/constants/assets";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

export default function StartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, loaded, startNewGame } = useStrategy();

  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (loaded && state) router.replace("/nation");
  }, [loaded, state]);

  if (!loaded || state) return null;

  const handleStart = () => {
    if (showNameInput) {
      if (playerName.trim().length < 2) return;
      startNewGame(playerName.trim());
      router.replace("/nation");
    } else {
      // Check tutorial before showing name input
      getTutorialSeen().then((seen) => {
        if (!seen) {
          router.push("/tutorial");
        } else {
          setShowNameInput(true);
        }
      });
    }
  };

  const canConfirm = !showNameInput || playerName.trim().length >= 2;

  return (
    <ImageBackground source={BG.investiture} style={styles.bg} resizeMode="cover">
      {/* Layer 1: deep tint (sets the mood) */}
      <LinearGradient
        colors={["rgba(6,8,16,0.35)", "rgba(6,8,16,0.55)", "rgba(6,8,16,0.92)", "#04060a"]}
        locations={[0, 0.35, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 2: top vignette (gives depth) */}
      <LinearGradient
        colors={["rgba(192,57,43,0.08)", "rgba(192,57,43,0)"]}
        style={[StyleSheet.absoluteFill, { height: "60%" }]}
      />

      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 36 }]}>
        {/* Crest + Title */}
        <View style={styles.header}>
          {/* Crest frame */}
          <View style={styles.crestFrame}>
            <View style={styles.crestCorner1} />
            <View style={styles.crestCorner2} />
            <View style={styles.crestCorner3} />
            <View style={styles.crestCorner4} />
            <Text style={styles.emblem}>⚜</Text>
          </View>

          <Text style={styles.republic}>RÉPUBLIQUE · COMMANDEMENT</Text>

          <View style={styles.titleBlock}>
            <View style={styles.sideRule} />
            <Text style={styles.title}>PRÉSIDENT</Text>
            <View style={styles.sideRule} />
          </View>

          <View style={styles.crisisLine}>
            <Text style={styles.crisisDot}>·</Text>
            <Text style={styles.crisis}>NATION EN CRISE</Text>
            <Text style={styles.crisisDot}>·</Text>
          </View>
          <Text style={styles.tagline}>UNE GUERRE HYBRIDE EST EN COURS</Text>
        </View>

        {/* Body */}
        {showNameInput ? (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>VOTRE NOM DE PRÉSIDENT</Text>
            <TextInput
              style={styles.input}
              placeholder="ex. Emmanuel Martin"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={playerName}
              onChangeText={setPlayerName}
              maxLength={30}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
            <Text style={styles.inputHint}>Le serment d'investiture vous engage devant la Nation.</Text>
          </View>
        ) : (
          <View style={styles.features}>
            {[
              { label: "Diriger une puissance mondiale" },
              { label: "Maîtriser la salle de crise" },
              { label: "Engager des opérations covertes" },
              { label: "Imposer votre rang sur l'échiquier" },
            ].map(({ label }) => (
              <View key={label} style={styles.featureRow}>
                <View style={styles.featureBullet} />
                <Text style={styles.featureItem}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleStart}
            disabled={!canConfirm}
            style={({ pressed }) => [styles.btnWrap, { opacity: pressed && canConfirm ? 0.85 : 1, transform: [{ scale: pressed && canConfirm ? 0.99 : 1 }] }]}
          >
            <LinearGradient
              colors={canConfirm ? ["#d04030", PALETTE.crimsonDim] : ["#222a36", "#10141c"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.mainBtn}
            >
              <View style={styles.btnRule} />
              <Text style={[styles.mainBtnText, !canConfirm && { color: PALETTE.textLow }]}>
                {showNameInput ? "PRÊTER SERMENT" : "ENTRER EN FONCTION"}
              </Text>
              <View style={styles.btnRule} />
            </LinearGradient>
          </Pressable>

          {showNameInput && (
            <Pressable onPress={() => setShowNameInput(false)} style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.55 : 1 }]}>
              <Text style={styles.cancelText}>← Retour</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.version}>v1.0.0 · PRÉSIDENT : NATION EN CRISE</Text>
      </View>
    </ImageBackground>
  );
}

const GOLD = PALETTE.goldDim;

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },

  header: { alignItems: "center", gap: 8 },
  crestFrame: {
    width: 76, height: 76,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  crestCorner1: { position: "absolute", top: 0, left: 0, width: 14, height: 14, borderTopWidth: 1, borderLeftWidth: 1, borderColor: PALETTE.gold + "88" },
  crestCorner2: { position: "absolute", top: 0, right: 0, width: 14, height: 14, borderTopWidth: 1, borderRightWidth: 1, borderColor: PALETTE.gold + "88" },
  crestCorner3: { position: "absolute", bottom: 0, left: 0, width: 14, height: 14, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: PALETTE.gold + "88" },
  crestCorner4: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderBottomWidth: 1, borderRightWidth: 1, borderColor: PALETTE.gold + "88" },
  emblem: { fontSize: 38, color: PALETTE.gold },

  republic: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 4, color: PALETTE.gold, opacity: 0.85 },

  titleBlock: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  sideRule: { width: 36, height: 1, backgroundColor: GOLD },
  title: { fontSize: 46, fontFamily: FONT.bold, letterSpacing: 11, color: "#FFFFFF" },

  crisisLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  crisisDot: { fontSize: 16, color: PALETTE.crimson },
  crisis: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 5, color: PALETTE.crimson },
  tagline: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 4, color: PALETTE.textMid, marginTop: 8 },

  features: { gap: 12, paddingHorizontal: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureBullet: { width: 4, height: 4, backgroundColor: PALETTE.gold, transform: [{ rotate: "45deg" }] },
  featureItem: { fontSize: 13, fontFamily: FONT.med, color: "rgba(255,255,255,0.7)", letterSpacing: 0.4, lineHeight: 18 },

  inputSection: { gap: 10 },
  inputLabel: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 3, color: PALETTE.gold, textAlign: "center" },
  input: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.gold + "55",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: FONT.reg,
    color: "#fff", textAlign: "center",
    letterSpacing: 0.5,
  },
  inputHint: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", fontStyle: "italic" },

  actions: { gap: 10 },
  btnWrap: { borderRadius: RADIUS.sm, overflow: "hidden" },
  mainBtn: { paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 12 },
  mainBtnText: { color: "#fff", fontSize: 13, fontFamily: FONT.bold, letterSpacing: 3.5 },
  btnRule: { width: 16, height: 1, backgroundColor: "rgba(255,255,255,0.5)" },
  cancelBtn: { paddingVertical: 6, alignItems: "center" },
  cancelText: { fontSize: 12, fontFamily: FONT.med, color: PALETTE.textMid, letterSpacing: 0.5 },

  version: { fontSize: 9, fontFamily: FONT.med, textAlign: "center", color: "rgba(255,255,255,0.25)", letterSpacing: 2 },
});
