// ── Mode Faible Charge Mentale — Bandeau de priorité ─────────────────────────
// Affiché en haut du contenu quand le mode est actif.
// Communique une seule chose : ce qui compte maintenant.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface Props {
  /** Phrase courte de priorité (1 ligne max) */
  text: string;
  /** Icône gauche */
  icon?: McIconName;
  /** Couleur du bandeau */
  color?: string;
  /** Libellé du bouton d'action (optionnel) */
  actionLabel?: string;
  /** Route de navigation au tap du bouton */
  actionRoute?: string;
}

export function LowLoadBanner({
  text,
  icon = "information-outline",
  color = PALETTE.info,
  actionLabel,
  actionRoute,
}: Props) {
  const router = useRouter();
  return (
    <View style={[styles.wrap, { borderColor: color + "44", backgroundColor: color + "10" }]}>
      <Text style={[styles.kicker, { color }]}>CE QUI COMPTE MAINTENANT</Text>
      <View style={styles.body}>
        <MaterialCommunityIcons name={icon} size={14} color={color} />
        <Text style={styles.text} numberOfLines={2}>{text}</Text>
      </View>
      {actionLabel != null && actionRoute != null && (
        <Pressable
          onPress={() => router.push(actionRoute as Parameters<typeof router.push>[0])}
          style={({ pressed }) => [styles.action, { borderColor: color + "55", opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.actionText, { color }]}>{actionLabel} →</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  kicker: {
    fontSize: 8,
    fontFamily: FONT.bold,
    letterSpacing: 2,
  },
  body: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.semi,
    color: PALETTE.textHigh,
    lineHeight: 18,
  },
  action: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
});
