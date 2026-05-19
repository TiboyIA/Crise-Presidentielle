import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Modal, Platform, Pressable,
  StyleSheet, Text, View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { useStrategy } from "@/context/StrategyContext";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { typeIcon } from "@/logic/newsEngine";
import { FEATURES } from "@/config/features";

const TYPE_LABELS: Record<string, string> = {
  cyber:         "CYBERMENACE",
  economie:      "ÉCONOMIQUE",
  social:        "SOCIALE",
  diplomatie:    "DIPLOMATIQUE",
  guerre_hybride: "GUERRE HYBRIDE",
  monde:         "INTERNATIONALE",
  classement:    "GÉOPOLITIQUE",
  national:      "NATIONALE",
};

export function CrisisAlertOverlay() {
  const { state } = useStrategy();
  const router = useRouter();

  // IDs already shown this session — never more than one alert at a time
  const shownRef = useRef<Set<string>>(new Set());
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [displayedId, setDisplayedId] = useState<string | null>(null);

  const pendingIds = state?.news?.pendingIds;

  useEffect(() => {
    if (!pendingIds) return;

    for (const id of pendingIds) {
      const event = NEWS_EVENT_MAP[id];
      if (!event?.isInteractive || event.urgency !== "critique") continue;
      if (shownRef.current.has(id)) continue;

      shownRef.current.add(id);
      setDisplayedId(id);
      setVisible(true);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      break; // one alert at a time
    }
  }, [pendingIds]);

  if (!FEATURES.enableCrisisOverlay) return null;

  function dismiss() {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }

  function openBriefing() {
    dismiss();
    // Small delay so the fade-out starts before navigation
    setTimeout(() => router.push("/journal-crise"), 80);
  }

  const event = displayedId ? NEWS_EVENT_MAP[displayedId] : null;

  if (!event) return null;

  const typeEmoji = typeIcon(event.type);
  const typeLabel = TYPE_LABELS[event.type] ?? event.type.toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        {/* Tap outside = "Plus tard" */}
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

        <View style={styles.box}>
          {/* Kicker */}
          <View style={styles.kickerRow}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>ALERTE ROUGE</Text>
            <View style={styles.kickerDot} />
          </View>

          {/* Type */}
          <Text style={styles.typeLabel}>{typeEmoji}  CRISE {typeLabel}</Text>

          {/* Title */}
          <Text style={styles.crisisTitle}>{event.title}</Text>

          {/* Subtitle */}
          <View style={styles.subtitleRow}>
            <MaterialCommunityIcons name="alert-decagram" size={13} color={PALETTE.danger} />
            <Text style={styles.subtitleText}>Décision présidentielle requise</Text>
          </View>

          {/* Primary CTA */}
          <Pressable
            onPress={openBriefing}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.82 : 1 }]}
          >
            <MaterialCommunityIcons name="file-document-alert-outline" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>OUVRIR LE BRIEFING</Text>
          </Pressable>

          {/* Secondary */}
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingVertical: 8 })}
          >
            <Text style={styles.laterText}>Plus tard</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  box: {
    width: "100%",
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: "#FF3040",
    padding: 22,
    gap: 14,
    // subtle red shadow / glow on iOS
    shadowColor: "#FF3040",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },

  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  kickerDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#FF3040",
  },
  kickerText: {
    fontSize: 11, fontFamily: FONT.bold,
    color: "#FF3040", letterSpacing: 4,
  },

  typeLabel: {
    fontSize: 10, fontFamily: FONT.bold,
    color: PALETTE.textLow, letterSpacing: 2,
    textAlign: "center",
  },
  crisisTitle: {
    fontSize: 18, fontFamily: FONT.bold,
    color: "#fff", textAlign: "center",
    lineHeight: 24,
  },

  subtitleRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
  },
  subtitleText: {
    fontSize: 12, fontFamily: FONT.reg,
    color: PALETTE.textMid,
  },

  primaryBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    backgroundColor: "#FF3040",
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 13, fontFamily: FONT.bold,
    color: "#fff", letterSpacing: 2,
  },

  laterText: {
    textAlign: "center",
    fontSize: 12, fontFamily: FONT.reg,
    color: PALETTE.textLow,
  },
});
