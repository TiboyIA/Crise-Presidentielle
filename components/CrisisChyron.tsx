import React, { memo, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { CrisisEvent } from "@/data/events";

interface Props {
  currentEvent: CrisisEvent | null;
  /**
   * True quand le briefing est prêt à être ouvert sans sauter du temps
   * (currentMonth >= nextEventMonth). Le bouton "Ouvrir le briefing"
   * n'apparaît QUE dans ce cas — jamais pour sauter du temps.
   */
  canDrawNow: boolean;
  /** Appelé UNIQUEMENT pour ouvrir un briefing déjà disponible. */
  onDrawNow: () => void;
  isAILoading?: boolean;
}

function CrisisChyronImpl({ currentEvent, canDrawNow, onDrawNow, isAILoading }: Props) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const isActive = !!currentEvent;

  // ── État 1 : crise en cours ──────────────────────────────────────────
  if (isActive) {
    return (
      <View
        style={[
          styles.wrap,
          {
            borderLeftColor: colors.danger,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderRightColor: colors.border,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Animated.View
            style={[
              styles.liveDot,
              { backgroundColor: colors.danger, opacity: dotOpacity },
            ]}
          />
          <Text style={[styles.liveLabel, { color: colors.danger }]}>
            CRISE EN COURS
          </Text>
          <View style={[styles.sourceBadge, { borderColor: colors.border }]}>
            <Text
              style={[styles.sourceText, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {currentEvent.source}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {currentEvent.title}
        </Text>

        <Text
          style={[styles.subtitle, { color: colors.mutedForeground }]}
          numberOfLines={3}
        >
          {currentEvent.context}
        </Text>

        <View style={styles.activePill}>
          <Feather name="alert-triangle" size={12} color={colors.danger} />
          <Text style={[styles.activePillText, { color: colors.danger }]}>
            La fenêtre de décision est ouverte
          </Text>
        </View>
      </View>
    );
  }

  // ── État 2 : briefing disponible (aucun saut de temps) ──────────────
  if (canDrawNow) {
    return (
      <View
        style={[
          styles.wrap,
          {
            borderLeftColor: colors.warning,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderRightColor: colors.border,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Animated.View
            style={[
              styles.liveDot,
              { backgroundColor: colors.warning, opacity: dotOpacity },
            ]}
          />
          <Text style={[styles.liveLabel, { color: colors.warning }]}>
            BRIEFING DISPONIBLE
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          Salle de crise opérationnelle
        </Text>

        <Text
          style={[styles.subtitle, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          Un dossier est prêt pour votre décision.
        </Text>

        <Pressable
          onPress={onDrawNow}
          disabled={isAILoading}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le prochain briefing"
          accessibilityHint="Ouvre le dossier de crise disponible sans sauter du temps."
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.warning,
              opacity: isAILoading ? 0.55 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="file-text" size={14} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.ctaText}>Ouvrir le briefing</Text>
          <Feather name="chevron-right" size={16} color="#fff" />
        </Pressable>
      </View>
    );
  }

  // ── État 3 : en attente — PAS de bouton de saut de temps ────────────
  return (
    <View
      style={[
        styles.wrap,
        styles.wrapIdle,
        {
          borderLeftColor: colors.border,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderRightColor: colors.border,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Animated.View
          style={[
            styles.liveDot,
            { backgroundColor: colors.mutedForeground, opacity: dotOpacity },
          ]}
        />
        <Text style={[styles.liveLabel, { color: colors.mutedForeground }]}>
          EN ATTENTE D'UN ÉVÉNEMENT
        </Text>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        Salle de crise opérationnelle
      </Text>

      <Text
        style={[styles.subtitle, { color: colors.mutedForeground }]}
        numberOfLines={2}
      >
        Le prochain événement arrivera avec le temps. Utilisez ▶ pour laisser
        la simulation avancer.
      </Text>
    </View>
  );
}

export const CrisisChyron = memo(CrisisChyronImpl);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 6,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  wrapIdle: {
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
  },
  sourceBadge: {
    marginLeft: "auto",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 3,
    maxWidth: 160,
  },
  sourceText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  activePillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  cta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  ctaText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
