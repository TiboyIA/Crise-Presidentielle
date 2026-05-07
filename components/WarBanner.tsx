/**
 * Module 6 — Bandeau « ÉTAT DE GUERRE ».
 *
 * Rendu en haut du dashboard quand `state.warState.status === "war"`
 * ou `"ultimatum"`. Affiche :
 *  - un bandeau rouge proéminent ;
 *  - le statut courant (ULTIMATUM EN COURS / GUERRE — TOUR X/Y) ;
 *  - les 3 mini-jauges du mini-jeu : Mobilisation / Alliés /
 *    Ravitaillement (uniquement quand `status === "war"` ;
 *    pendant l'ultimatum elles n'ont pas encore de sens).
 *
 * Pas d'interaction directe — c'est un indicateur d'état. Les
 * choix passent par les évènements de guerre tirés normalement
 * dans le flux principal.
 */
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { STATE_OF_WAR_BANNER } from "@/data/hybridVectorImages";
import type { GameState } from "@/types/game";

interface Props {
  state: GameState;
}

const RED = "#c0392b";
const RED_DARK = "#7a1d12";

export function WarBanner({ state }: Props) {
  const ws = state.warState;
  if (!ws || (ws.status !== "war" && ws.status !== "ultimatum")) {
    return null;
  }
  const isUltimatum = ws.status === "ultimatum";
  const titleText = isUltimatum
    ? "ULTIMATUM EN COURS"
    : `ÉTAT DE GUERRE · TOUR ${ws.warTurn + 1}/${ws.maxWarTurns}`;
  const subText = isUltimatum
    ? "Une décision est attendue dans les 24 heures."
    : `La nation est mobilisée. Issue conditionnée par votre conduite militaire.`;

  return (
    <View
      style={[styles.container, { backgroundColor: RED_DARK, borderColor: RED }]}
    >
      <View style={styles.heroBannerWrap}>
        <Image
          source={STATE_OF_WAR_BANNER}
          style={styles.heroBanner}
          resizeMode="cover"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <LinearGradient
          colors={["transparent", RED_DARK]}
          style={styles.heroFade}
          pointerEvents="none"
        />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Feather name="alert-octagon" size={14} color="#fff" />
          <Text style={styles.title}>{titleText}</Text>
        </View>
        <Text style={styles.subtitle}>{subText}</Text>
        {!isUltimatum ? (
          <View style={styles.gaugesRow}>
            <WarMiniGauge label="Mobilisation" value={ws.mobilization} />
            <WarMiniGauge label="Alliés" value={ws.allies} />
            <WarMiniGauge label="Ravitaillement" value={ws.supply} />
          </View>
        ) : null}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>
            {!isUltimatum
              ? `Score militaire : ${ws.mobilization + ws.allies + ws.supply} / 300`
              : "En attente de votre réponse à l'ultimatum…"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function WarMiniGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const fillColor = pct >= 60 ? "#5dd185" : pct >= 30 ? "#e8b54e" : "#e26b66";
  return (
    <View style={styles.miniGaugeBox}>
      <Text style={styles.miniGaugeLabel}>{label}</Text>
      <View style={styles.miniGaugeTrack}>
        <View
          style={[
            styles.miniGaugeFill,
            { width: `${pct}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
      <Text style={styles.miniGaugeValue}>{Math.round(pct)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  heroBannerWrap: {
    width: "100%",
    height: 110,
    overflow: "hidden",
    position: "relative",
  },
  heroBanner: {
    width: "100%",
    height: "100%",
  },
  heroFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  body: {
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  subtitle: {
    color: "#f5d4d2",
    fontSize: 12,
  },
  gaugesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  miniGaugeBox: {
    flex: 1,
    gap: 3,
  },
  miniGaugeLabel: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  miniGaugeTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniGaugeFill: {
    height: "100%",
  },
  miniGaugeValue: {
    color: "#fff",
    fontSize: 10,
    textAlign: "right",
  },
  scoreRow: {
    marginTop: 4,
  },
  scoreLabel: {
    color: "#f5d4d2",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
