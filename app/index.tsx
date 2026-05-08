import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";

export default function StartScreen() {
  const colors = useColors();
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>🌍</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Président</Text>
        <Text style={[styles.subtitle, { color: colors.primary }]}>Nation en Crise</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Dirigez une nation.{"\n"}Dominez le monde.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          { icon: "🏛️", label: "Construisez et améliorez vos ministères" },
          { icon: "🌍", label: "Explorez la carte mondiale stratégique" },
          { icon: "⚔️", label: "Lancez des opérations géopolitiques" },
          { icon: "🏆", label: "Grimpez dans le classement mondial" },
        ].map(({ icon, label }) => (
          <View key={label} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <Text style={[styles.featureText, { color: colors.foreground }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Name input */}
      {showNameInput && (
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
            Votre nom de président·e :
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex : Emmanuel Martin"
            placeholderTextColor={colors.mutedForeground}
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={30}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleStart}
          />
        </View>
      )}

      {/* CTA */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleStart}
          disabled={showNameInput && playerName.trim().length < 2}
          style={({ pressed }) => [
            styles.mainBtn,
            {
              backgroundColor: showNameInput && playerName.trim().length < 2 ? colors.muted : colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.mainBtnText}>
            {showNameInput ? "🚀 Commencer la partie" : "🎮 Nouvelle partie"}
          </Text>
        </Pressable>

        {showNameInput && (
          <Pressable onPress={() => setShowNameInput(false)} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Annuler</Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>v1.0.0 · Président : Nation en Crise</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between", paddingVertical: 32 },
  header: { alignItems: "center", gap: 8 },
  emoji: { fontSize: 64 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  subtitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginTop: 8 },
  features: { gap: 12, paddingVertical: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 22, width: 30, textAlign: "center" },
  featureText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  inputSection: { gap: 8 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  actions: { gap: 10 },
  mainBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  mainBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  cancelBtn: { paddingVertical: 8, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  version: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
