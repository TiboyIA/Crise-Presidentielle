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
  onTriggerNext: () => void;
  isAILoading?: boolean;
}

function CrisisChyronImpl({ currentEvent, onTriggerNext, isAILoading }: Props) {
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
  const accent = isActive ? colors.danger : colors.warning;
  const label = isActive ? "CRISE EN COURS" : "EN ATTENTE D'UNE CRISE";
  const title = isActive
    ? currentEvent.title
    : "Salle de crise opérationnelle";
  const subtitle = isActive
    ? currentEvent.context
    : "Tirez la prochaine décision pour recevoir un briefing.";

  return (
    <View
      style={[
        styles.wrap,
        {
          borderLeftColor: accent,
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
            { backgroundColor: accent, opacity: dotOpacity },
          ]}
        />
        <Text style={[styles.liveLabel, { color: accent }]}>{label}</Text>
        {currentEvent ? (
          <View style={[styles.sourceBadge, { borderColor: colors.border }]}>
            <Text
              style={[styles.sourceText, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {currentEvent.source}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[styles.title, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {title}
      </Text>

      <Text
        style={[styles.subtitle, { color: colors.mutedForeground }]}
        numberOfLines={3}
      >
        {subtitle}
      </Text>

      {isActive ? (
        <View style={styles.activePill}>
          <Feather name="alert-triangle" size={12} color={accent} />
          <Text style={[styles.activePillText, { color: accent }]}>
            La fenêtre de décision est ouverte
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onTriggerNext}
          disabled={isAILoading}
          accessibilityRole="button"
          accessibilityLabel="Déclencher la prochaine crise"
          accessibilityHint="Tire un événement aléatoire pour ouvrir la fenêtre de décision."
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: accent,
              opacity: isAILoading ? 0.55 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.ctaText}>DÉCLENCHER</Text>
          <Feather name="chevron-right" size={16} color="#fff" />
        </Pressable>
      )}
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
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  ctaText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
