import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { WEEKS_PER_MONTH, TICK_MS_BY_SPEED } from "@/logic/timeEngine";
import {
  TOTAL_GAME_DAYS,
  computeGameDayDisplay,
  formatGameDayLabel,
  formatCountdownDays,
  formatCountdownRealTime,
} from "@/logic/simulationClock";
import type { TimeSpeed } from "@/types/game";

interface Props {
  /** Jour de jeu courant 1..60 (= currentMonth interne). */
  gameDay: number;
  /** Sous-progression du jour (ancienne semaine dans le mois, 1..4). */
  week: number;
  /** Jour de jeu auquel le prochain événement est programmé. */
  nextEventGameDay: number;
  /** Vitesse actuelle (0=pause, 0.5/1/2/4 jouée). */
  speed: TimeSpeed;
  /** True si un événement OU un bilan modal bloque les contrôles. */
  blocked: boolean;
  onSetSpeed: (s: TimeSpeed) => void;
  onSkip: () => void;
}

const SPEED_BUTTONS: Array<{ value: TimeSpeed; label: string; aria: string }> = [
  { value: 0, label: "‖", aria: "Mettre en pause" },
  { value: 0.5, label: "▶ ½", aria: "Vitesse lente x0.5" },
  { value: 1, label: "▶", aria: "Vitesse x1" },
  { value: 2, label: "▶▶", aria: "Vitesse x2" },
  { value: 4, label: "▶▶▶", aria: "Vitesse x4" },
];

export function TimeBar({
  gameDay,
  week,
  nextEventGameDay,
  speed,
  blocked,
  onSetSpeed,
  onSkip,
}: Props) {
  const colors = useColors();
  const { seasonNumber, dayInSeason } = computeGameDayDisplay(gameDay);
  const daysToNext = Math.max(0, nextEventGameDay - gameDay);
  const isAtEnd = gameDay >= TOTAL_GAME_DAYS;

  // Sous-progression du jour courant (0..1) — pour la barre visuelle.
  const safeWeek = Math.max(1, Math.min(WEEKS_PER_MONTH, Math.floor(week) || 1));
  const dayProgress = safeWeek / WEEKS_PER_MONTH;

  // Compte à rebours réel estimé (basé sur la vitesse du ticker).
  const tickMs = speed > 0 ? TICK_MS_BY_SPEED[speed as Exclude<TimeSpeed, 0>] : 0;
  const realtimeLabel =
    speed === 0
      ? "⏸ Mis en pause"
      : (formatCountdownRealTime(daysToNext, tickMs, WEEKS_PER_MONTH) ??
         formatCountdownDays(daysToNext));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.muted, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.labelStack}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {formatGameDayLabel(gameDay).toUpperCase()}
          </Text>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            {`Saison ${seasonNumber} · Jour ${dayInSeason} sur ${TOTAL_GAME_DAYS}`}
          </Text>
        </View>
        <View style={styles.spacer} />
        {SPEED_BUTTONS.map((btn) => {
          const active = speed === btn.value;
          const disabled = blocked && btn.value !== 0;
          return (
            <Pressable
              key={btn.value}
              onPress={() => onSetSpeed(btn.value)}
              disabled={disabled || isAtEnd}
              accessibilityLabel={btn.aria}
              style={({ pressed }) => [
                styles.speedBtn,
                {
                  backgroundColor: active
                    ? colors.primary
                    : colors.background,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: disabled || isAtEnd ? 0.35 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.speedLabel,
                  {
                    color: active
                      ? colors.primaryForeground
                      : colors.foreground,
                  },
                ]}
              >
                {btn.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Barre de progression intra-jour */}
      <View
        style={[styles.dayTrack, { backgroundColor: colors.border }]}
        accessibilityLabel={`Progression du jour : partie ${safeWeek} sur ${WEEKS_PER_MONTH}`}
      >
        <View
          style={[
            styles.dayFill,
            {
              backgroundColor: colors.primary,
              width: `${Math.round(dayProgress * 100)}%`,
            },
          ]}
        />
      </View>

      <Pressable
        onPress={onSkip}
        disabled={blocked || isAtEnd}
        accessibilityLabel="Avancer au prochain événement"
        style={({ pressed }) => [
          styles.skipBtn,
          {
            borderColor: colors.border,
            backgroundColor: colors.background,
            opacity: blocked || isAtEnd ? 0.35 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Feather
          name="fast-forward"
          size={14}
          color={colors.foreground}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.skipLabel, { color: colors.foreground }]}>
          Avancer au prochain événement
        </Text>
        <View style={styles.spacer} />
        <Text style={[styles.skipMeta, { color: colors.mutedForeground }]}>
          {daysToNext === 0 ? "imminent" : realtimeLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  spacer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  labelStack: {
    flexDirection: "column",
    gap: 1,
  },
  subLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.6,
    opacity: 0.8,
  },
  dayTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  dayFill: {
    height: "100%",
    borderRadius: 2,
  },
  speedBtn: {
    minWidth: 34,
    height: 30,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  speedLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
  },
  skipLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  skipMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
