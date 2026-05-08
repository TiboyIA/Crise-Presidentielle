// NOTE: Replace BG.dashboard with assets/images/loading/loading_command_center.png
// (a dark war-room / world map cinematic background) when the asset is ready.
// Prompt for generation: "Premium mobile strategy game loading screen background,
// presidential crisis command center, dark war room, glowing world map, cyber warfare
// atmosphere, geopolitical tension, red and gold accents, cinematic lighting,
// semi-realistic style, no text, no logo, no real politicians, 16:9 landscape composition."

import React, { useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { BG } from "@/constants/assets";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

const LOADING_MESSAGES = [
  "Initialisation des systèmes nationaux…",
  "Analyse de la situation géopolitique…",
  "Chargement du briefing présidentiel…",
  "Évaluation des menaces extérieures…",
  "Entrée en fonction…",
];

interface Props {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    let current = 0;

    const tick = () => {
      const step = Math.random() * 3 + 1.5;
      current = Math.min(100, current + step);
      const rounded = Math.round(current);
      setProgress(rounded);
      setMsgIdx(Math.min(LOADING_MESSAGES.length - 1, Math.floor(current / 20)));

      Animated.timing(barAnim, {
        toValue: current / 100,
        duration: 100,
        useNativeDriver: false,
      }).start();

      if (current < 100) {
        timerRef.current = setTimeout(tick, 80 + Math.random() * 40);
      } else {
        timerRef.current = setTimeout(() => onCompleteRef.current(), 600);
      }
    };

    timerRef.current = setTimeout(tick, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const version = Constants.expoConfig?.version ?? "1.0.0";

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <ImageBackground
      source={BG.dashboard}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* Deep cinematic overlay */}
      <LinearGradient
        colors={["rgba(4,5,10,0.25)", "rgba(4,5,10,0.6)", "rgba(4,5,10,0.96)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Crimson top vignette */}
      <LinearGradient
        colors={["rgba(140,20,20,0.18)", "rgba(140,20,20,0)"]}
        style={[StyleSheet.absoluteFill, { height: "55%" }]}
      />

      <View style={styles.container}>
        {/* Center: logo + loading */}
        <View style={styles.centerBlock}>
          {/* Crest frame */}
          <View style={styles.crestFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Text style={styles.emblem}>⚜</Text>
          </View>

          <Text style={styles.kicker}>COMMANDEMENT NATIONAL</Text>

          <View style={styles.titleRow}>
            <View style={styles.titleRule} />
            <Text style={styles.title}>PRÉSIDENT</Text>
            <View style={styles.titleRule} />
          </View>

          <Text style={styles.subtitle}>NATION EN CRISE</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Loading message */}
          <Text style={styles.loadingMsg}>{LOADING_MESSAGES[msgIdx]}</Text>

          {/* Progress bar */}
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: barWidth }]}>
              <LinearGradient
                colors={["#c0392b", "#c9a84c"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Glow on leading edge */}
              <View style={styles.barGlow} />
            </Animated.View>
          </View>

          {/* Percentage */}
          <Text style={styles.pct}>{progress}%</Text>
        </View>

        {/* Version — bottom right */}
        <Text style={styles.version}>
          Président : Nation en Crise · v{version}
        </Text>
      </View>
    </ImageBackground>
  );
}

const GOLD = PALETTE.gold;
const CORNER_SIZE = 12;

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },

  centerBlock: { alignItems: "center", gap: 10, width: "100%", maxWidth: 360 },

  crestFrame: {
    width: 72, height: 72,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  corner: { position: "absolute", top: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: GOLD + "99" },
  cornerTR: { top: 0, left: undefined, right: 0, borderTopWidth: 1.5, borderRightWidth: 1.5, borderLeftWidth: 0 },
  cornerBL: { top: undefined, bottom: 0, left: 0, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderTopWidth: 0 },
  cornerBR: { top: undefined, bottom: 0, left: undefined, right: 0, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderTopWidth: 0, borderLeftWidth: 0 },
  emblem: { fontSize: 36, color: GOLD },

  kicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 4, opacity: 0.85 },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  titleRule: { width: 28, height: 1, backgroundColor: PALETTE.goldDim },
  title: { fontSize: 40, fontFamily: FONT.bold, color: "#FFFFFF", letterSpacing: 10 },

  subtitle: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.crimson, letterSpacing: 5, marginTop: -4 },

  divider: { width: 60, height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.gold + "44", marginVertical: 6 },

  loadingMsg: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, letterSpacing: 0.5, fontStyle: "italic", textAlign: "center", minHeight: 16 },

  barTrack: {
    width: "80%", height: 3, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: 10,
  },
  barFill: { height: "100%", borderRadius: 2, overflow: "hidden" },
  barGlow: { position: "absolute", right: 0, top: -2, width: 8, height: 7, borderRadius: 4, backgroundColor: PALETTE.goldGlow, opacity: 0.8 },

  pct: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.5, marginTop: 4 },

  version: {
    position: "absolute", bottom: 24, right: 24,
    fontSize: 9, fontFamily: FONT.med,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: 1,
  },
});
