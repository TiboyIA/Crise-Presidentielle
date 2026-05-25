import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStrategy } from "@/context/StrategyContext";
import { FONT } from "@/constants/uiTokens";

/**
 * Bandeau orange permanent affiché sur tous les écrans quand le mode
 * bac à sable développeur est actif. N'intercepte aucun toucher.
 */
export function SandboxWatermark() {
  const ctx = useStrategy();
  if (!ctx?.isSandboxActive) return null;

  return (
    <View style={styles.banner} pointerEvents="none">
      <Text style={styles.text}>
        BAC À SABLE DEV — SCORES ET CLOUD DÉSACTIVÉS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    bottom:   0,
    left:     0,
    right:    0,
    zIndex:   9999,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    paddingVertical: 4,
  },
  text: {
    fontFamily:    FONT.bold,
    fontSize:      9,
    letterSpacing: 1.8,
    color:         "#fff",
  },
});
