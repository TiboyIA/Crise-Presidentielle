import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { BG } from "@/constants/assets";

export default function StartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, loaded, startNewGame } = useStrategy();

  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (loaded && state) {
      router.replace("/nation");
    }
  }, [loaded, state]);

  if (!loaded || state) return null;

  const handleStart = () => {
    if (showNameInput) {
      if (playerName.trim().length < 2) return;
      startNewGame(playerName.trim());
      router.replace("/nation");
    } else {
      setShowNameInput(true);
    }
  };

  const canConfirm = !showNameInput || playerName.trim().length >= 2;

  return (
    <ImageBackground source={BG.investiture} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(6,8,16,0.2)", "rgba(6,8,16,0.72)", "#060810"]}
        locations={[0, 0.52, 1]}
        style={[styles.overlay, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 36 }]}
      >
        {/* Emblem + Title */}
        <View style={styles.header}>
          <Text style={styles.emblem}>⚜</Text>
          <Text style={styles.republic}>PRÉSIDENCE DE LA RÉPUBLIQUE</Text>
          <Text style={styles.title}>PRÉSIDENT</Text>
          <View style={styles.rule} />
          <Text style={styles.crisis}>NATION EN CRISE</Text>
        </View>

        {/* Feature list OR name input */}
        {showNameInput ? (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>VOTRE NOM DE PRÉSIDENT</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Emmanuel Martin"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={playerName}
              onChangeText={setPlayerName}
              maxLength={30}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
          </View>
        ) : (
          <View style={styles.features}>
            {[
              "Construisez et améliorez vos ministères",
              "Maîtrisez la carte mondiale stratégique",
              "Lancez des opérations secrètes",
              "Dominez le classement mondial",
            ].map((label) => (
              <Text key={label} style={styles.featureItem}>· {label}</Text>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleStart}
            disabled={!canConfirm}
            style={({ pressed }) => [styles.btnWrap, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={canConfirm ? ["#c0392b", "#7b0000"] : ["#2a2a2a", "#1a1a1a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainBtn}
            >
              <Text style={styles.mainBtnText}>
                {showNameInput ? "PRÊTER SERMENT" : "ENTRER EN FONCTION"}
              </Text>
            </LinearGradient>
          </Pressable>

          {showNameInput && (
            <Pressable onPress={() => setShowNameInput(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.version}>v1.0.0 · Président : Nation en Crise</Text>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },
  header: { alignItems: "center", gap: 6 },
  emblem: { fontSize: 38, color: "#C9A84C", marginBottom: 6 },
  republic: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 4, color: "rgba(201,168,76,0.75)" },
  title: { fontSize: 52, fontFamily: "Inter_700Bold", letterSpacing: 10, color: "#FFFFFF", marginTop: 8 },
  rule: { width: 56, height: 1.5, backgroundColor: "#c0392b", marginVertical: 10 },
  crisis: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 5, color: "#c0392b" },
  features: { gap: 11, paddingHorizontal: 4 },
  featureItem: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3, lineHeight: 20 },
  inputSection: { gap: 12 },
  inputLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3, color: "rgba(201,168,76,0.85)", textAlign: "center" },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#fff",
    textAlign: "center",
  },
  actions: { gap: 12 },
  btnWrap: {},
  mainBtn: { borderRadius: 10, paddingVertical: 16, alignItems: "center" },
  mainBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  cancelBtn: { paddingVertical: 8, alignItems: "center" },
  cancelText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.45)" },
  version: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", color: "rgba(255,255,255,0.25)", letterSpacing: 1 },
});
