/**
 * ScreenHeroHeader — bandeau illustré uniforme pour les écrans
 * secondaires (Front, Recherche, Promesses, Journal, Stats…).
 *
 * Affiche une illustration 16:9 en haut de l'écran avec :
 *  - dégradé sombre vers le bas pour la lisibilité du texte ;
 *  - pastille kicker (sur-titre) optionnelle ;
 *  - titre principal en bas à gauche ;
 *  - bouton "fermer" en haut à droite (optionnel) ;
 *  - bouton "retour" en haut à gauche (optionnel).
 *
 * Cohérence DA : palette navy + ambre, illustrations
 * semi-réalistes générées dans le même style. Hauteur fixe
 * 200px pour ne pas avaler trop de scroll mobile.
 */
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  source: ImageSourcePropType;
  kicker?: string;
  title: string;
  subtitle?: string;
  accent?: string;
  onBack?: () => void;
  onClose?: () => void;
}

export default function ScreenHeroHeader({
  source,
  kicker,
  title,
  subtitle,
  accent,
  onBack,
  onClose,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPad = insets.top + webTopInset;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Image
        source={source}
        style={styles.img}
        resizeMode="cover"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <LinearGradient
        colors={[
          "rgba(7,11,20,0.55)",
          "rgba(7,11,20,0.15)",
          "rgba(7,11,20,0.95)",
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Revenir à l'écran précédent"
          style={[styles.cornerBtn, { top: topPad + 8, left: 12 }]}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
      ) : null}
      {onClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fermer l'écran"
          style={[styles.cornerBtn, { top: topPad + 8, right: 12 }]}
        >
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
      ) : null}

      <View style={[styles.bottom, { paddingTop: topPad + 8 }]}>
        {kicker ? (
          <View
            style={[
              styles.kickerWrap,
              { borderColor: accent ?? "rgba(255,255,255,0.5)" },
            ]}
          >
            <Text
              style={[
                styles.kicker,
                { color: accent ?? "rgba(255,255,255,0.85)" },
              ]}
              numberOfLines={1}
            >
              {kicker}
            </Text>
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 220,
    position: "relative",
    overflow: "hidden",
  },
  img: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cornerBtn: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(7,11,20,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  bottom: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 14,
    gap: 6,
  },
  kickerWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "rgba(7,11,20,0.55)",
  },
  kicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
