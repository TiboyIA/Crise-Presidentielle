import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, PALETTE, SPACING } from "@/constants/uiTokens";

interface Props {
  title: string;
  kicker?: string;            // small uppercase line above title (e.g. "MODULE")
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hPad?: number;
  onBack?: () => void;
}

/**
 * Coherent screen header: gradient strip, subtle gold rule, back chevron,
 * centered uppercase title, optional kicker. Replaces the per-screen
 * "← Retour | titre | spacer" pattern.
 */
export function ScreenHeader({ title, kicker, rightSlot, style, hPad = 16, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <LinearGradient
      colors={["#0e1320", "#0a0c14"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + 6, paddingHorizontal: hPad }, style]}
    >
      <View style={styles.row}>
        <Pressable onPress={handleBack} hitSlop={14} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.55 : 1 }]}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <View style={styles.titleWrap}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.rightWrap}>{rightSlot}</View>
      </View>

      {/* gold hairline rule */}
      <View style={styles.rule}>
        <LinearGradient
          colors={["transparent", PALETTE.gold + "55", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, width: 80 },
  backArrow: { fontSize: 22, color: PALETTE.textHigh, fontFamily: FONT.bold, marginTop: -2 },
  backText: { fontSize: 13, color: PALETTE.textMid, fontFamily: FONT.semi, letterSpacing: 0.3 },
  titleWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  kicker: { fontSize: 9, color: PALETTE.gold, fontFamily: FONT.bold, letterSpacing: 3, opacity: 0.85 },
  title: { fontSize: 14, color: PALETTE.textHigh, fontFamily: FONT.bold, letterSpacing: 2.5, textTransform: "uppercase" },
  rightWrap: { width: 80, alignItems: "flex-end", justifyContent: "center" },
  rule: { height: 1, marginTop: 6, opacity: 0.9 },
});
