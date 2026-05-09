import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useStrategy } from "@/context/StrategyContext";
import { formatRealMinutes, getStrategicClockInfo } from "@/logic/realTimeEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface Props {
  /** Compact: single row, no events. Default: full panel. */
  compact?: boolean;
}

export function StrategicClock({ compact = false }: Props) {
  const { state } = useStrategy();
  // Force a re-render every minute so the countdown stays fresh between ticks.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!state) return null;

  const info = getStrategicClockInfo(state);
  const upgradesInProgress = state.buildings.filter((b) => b.upgradeEndTime !== null).length;
  const trainingInProgress = state.trainingQueue.filter((e) => e.status === "training").length;

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <MaterialCommunityIcons name="clock-time-eight-outline" size={12} color={PALETTE.gold} />
        <Text style={styles.compactDay}>JOUR {info.mandateDay}</Text>
        <View style={styles.compactTrack}>
          <LinearGradient
            colors={[PALETTE.crimson, PALETTE.gold]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.compactFill, { width: `${Math.round(info.dayProgress * 100)}%` }]}
          />
        </View>
        <Text style={styles.compactETA}>{formatRealMinutes(info.minutesUntilNextDay)}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#161b27", "#0c1018"]} style={styles.panel}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="clock-time-eight-outline" size={14} color={PALETTE.gold} />
        <Text style={styles.kicker}>HORLOGE STRATÉGIQUE</Text>
      </View>

      <View style={styles.dayRow}>
        <Text style={styles.dayNum}>JOUR {info.mandateDay}</Text>
        <Text style={styles.dayHint}>· prochain dans {formatRealMinutes(info.minutesUntilNextDay)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[PALETTE.crimson, PALETTE.gold]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.round(info.dayProgress * 100)}%` }]}
        />
      </View>

      <View style={styles.eventGrid}>
        <ClockEvent icon="poll" label="Sondage"     value={info.daysUntilPoll} />
        <ClockEvent icon="alert-octagon-outline" label="Crise majeure" value={info.daysUntilMajorCrisis} alert />
        <ClockEvent icon="medal-outline" label="Bilan" value={info.daysUntilBilan} />
      </View>

      {(upgradesInProgress > 0 || trainingInProgress > 0) && (
        <View style={styles.queueRow}>
          {upgradesInProgress > 0 && (
            <View style={styles.queueChip}>
              <MaterialCommunityIcons name="hammer-wrench" size={10} color={PALETTE.gold} />
              <Text style={styles.queueText}>{upgradesInProgress} amélioration{upgradesInProgress > 1 ? "s" : ""}</Text>
            </View>
          )}
          {trainingInProgress > 0 && (
            <View style={styles.queueChip}>
              <MaterialCommunityIcons name="tank" size={10} color="#e54848" />
              <Text style={styles.queueText}>{trainingInProgress} formation{trainingInProgress > 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

function ClockEvent({ icon, label, value, alert }: { icon: McIconName; label: string; value: number; alert?: boolean }) {
  const color = alert && value <= 3 ? PALETTE.danger : value <= 1 ? PALETTE.gold : PALETTE.textMid;
  return (
    <View style={styles.eventCell}>
      <MaterialCommunityIcons name={icon} size={11} color={color} />
      <Text style={styles.eventLabel}>{label}</Text>
      <Text style={[styles.eventValue, { color }]}>
        {value === 0 ? "MAINT." : `${value}j`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.gold + "33",
    padding: 12,
    gap: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },

  dayRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  dayNum: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 1 },
  dayHint: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow },

  progressTrack: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  eventGrid: { flexDirection: "row", gap: 6 },
  eventCell: {
    flex: 1, alignItems: "center", paddingVertical: 6, gap: 2,
    borderRadius: RADIUS.xs, backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge,
  },
  eventLabel: { fontSize: 8, fontFamily: FONT.semi, color: PALETTE.textLow, letterSpacing: 0.8 },
  eventValue: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 0.5 },

  queueRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  queueChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.xs, backgroundColor: "rgba(201,168,76,0.08)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "33",
  },
  queueText: { fontSize: 9, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 0.3 },

  compactWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  compactDay: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1 },
  compactTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  compactFill: { height: "100%", borderRadius: 2 },
  compactETA: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, minWidth: 44, textAlign: "right" },
});
