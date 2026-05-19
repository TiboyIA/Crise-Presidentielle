import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, PALETTE } from "@/constants/uiTokens";

interface Props {
  onBack: () => void;
}

export function FeatureUnavailable({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={PALETTE.textMid} />
      </Pressable>
      <View style={styles.body}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={PALETTE.textLow} />
        <Text style={styles.title}>Fonctionnalité indisponible</Text>
        <Text style={styles.subtitle}>Ce module est désactivé dans cette version.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0c0e",
  },
  backBtn: {
    position: "absolute",
    top: 56,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    color: PALETTE.textMid,
    fontSize: 18,
    fontFamily: FONT.semi,
    textAlign: "center",
  },
  subtitle: {
    color: PALETTE.textLow,
    fontSize: 13,
    fontFamily: FONT.reg,
    textAlign: "center",
  },
});
