import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { TOTAL_GAME_DAYS } from "@/logic/simulationClock";
import {
  computeGameDayDisplay,
  formatGameDayLabel,
} from "@/logic/timeEngine";
import {
  computeSeasonClock,
  formatSeasonCountdown,
} from "@/logic/simulationClock";

interface Props {
  /** Jour de jeu courant 1..120 (= currentMonth interne). */
  gameDay: number;
  /** Timestamp réel (ms) du début du mandat — ancre temps-réel. */
  seasonStartedAtRealMs: number;
  /** Jour de jeu auquel le prochain événement est programmé. */
  nextEventGameDay: number;
  /** True si un événement OU un bilan modal bloque les contrôles. */
  blocked: boolean;
  onSkip: () => void;
}

export function TimeBar({
  gameDay,
  seasonStartedAtRealMs,
  nextEventGameDay,
  blocked,
  onSkip,
}: Props) {
  const colors = useColors();
  const { seasonNumber, dayInSeason } = computeGameDayDisplay(gameDay);
  const daysToNext = Math.max(0, nextEventGameDay - gameDay);
  const isAtEnd = gameDay >= TOTAL_GAME_DAYS;

  // Calcul temps-réel depuis l'ancre de la saison.
  const { currentGameHour, seasonEndsAtRealMs } =
    computeSeasonClock(seasonStartedAtRealMs);

  // Progression intra-jour (0..1) basée sur l'heure de jeu courante.
  const dayProgress = Math.max(0, Math.min(1, currentGameHour / 24));

  // Libellé du compte à rebours prochain événement.
  const skipMeta = daysToNext === 0 ? "imminent" : `dans ${daysToNext} jour${daysToNext > 1 ? "s" : ""} de jeu`;

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
        {/* Compte à rebours fin de saison */}
        <View
          style={[
            styles.countdownBadge,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Feather name="clock" size={11} color={colors.mutedForeground} style={{ marginRight: 4 }} />
          <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
            {formatSeasonCountdown(seasonEndsAtRealMs)}
          </Text>
        </View>
      </View>

      {/* Barre de progression intra-jour (heure de jeu dans le jour courant) */}
      <View
        style={[styles.dayTrack, { backgroundColor: colors.border }]}
        accessibilityLabel={`Progression du jour : heure ${currentGameHour} sur 24`}
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
        accessibilityLabel="Sauter jusqu'au prochain événement"
        accessibilityHint="Avance volontairement le temps jusqu'au prochain briefing."
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
          name="skip-forward"
          size={14}
          color={colors.foreground}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.skipLabel, { color: colors.foreground }]}>
          Sauter jusqu'au prochain événement
        </Text>
        <View style={styles.spacer} />
        <Text style={[styles.skipMeta, { color: colors.mutedForeground }]}>
          {skipMeta}
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
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  countdownText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
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
