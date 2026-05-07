import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  TOTAL_MONTHS,
  WEEKS_PER_MONTH,
  formatMandateLabel,
} from "@/logic/timeEngine";
import type { TimeSpeed } from "@/types/game";

interface Props {
  /** Mois courant 1..60. */
  month: number;
  /** Semaine courante dans le mois (1..4). LOT 17. */
  week: number;
  /** Mois auquel le prochain événement est programmé. */
  nextEventMonth: number;
  /** Vitesse actuelle (0=pause, 0.5/1/2/4 jouée). */
  speed: TimeSpeed;
  /** True si un événement OU un bilan modal bloque les contrôles. */
  blocked: boolean;
  onSetSpeed: (s: TimeSpeed) => void;
  onSkip: () => void;
}

// LOT 17 — Ajout du bouton x0.5 (lent) entre pause et x1, pour
// donner au joueur une vraie option "observer le pays tranquillement".
const SPEED_BUTTONS: Array<{ value: TimeSpeed; label: string; aria: string }> = [
  { value: 0, label: "‖", aria: "Mettre en pause" },
  { value: 0.5, label: "▶ ½", aria: "Vitesse lente x0.5" },
  { value: 1, label: "▶", aria: "Vitesse x1" },
  { value: 2, label: "▶▶", aria: "Vitesse x2" },
  { value: 4, label: "▶▶▶", aria: "Vitesse x4" },
];

export function TimeBar({
  month,
  week,
  nextEventMonth,
  speed,
  blocked,
  onSetSpeed,
  onSkip,
}: Props) {
  const colors = useColors();
  const monthsToNext = Math.max(0, nextEventMonth - month);
  const isAtEnd = month >= TOTAL_MONTHS;
  // LOT 17 — Largeur de la jauge intra-mois (0..1) : la progression
  // est continue (semaine N en cours = N/4 du mois écoulé). Affichage
  // purement visuel, sans interaction.
  const safeWeek = Math.max(1, Math.min(WEEKS_PER_MONTH, Math.floor(week) || 1));
  const weekProgress = safeWeek / WEEKS_PER_MONTH;

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
            {formatMandateLabel(month).toUpperCase()}
          </Text>
          <Text style={[styles.weekLabel, { color: colors.mutedForeground }]}>
            {`Semaine ${safeWeek}/${WEEKS_PER_MONTH}`}
          </Text>
        </View>
        <View style={styles.spacer} />
        {SPEED_BUTTONS.map((btn) => {
          const active = speed === btn.value;
          // Quand un event/report bloque, seul le bouton pause reste
          // visuellement actif (et il l'est de fait, vu que speed=0).
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
      <View
        style={[
          styles.weekTrack,
          { backgroundColor: colors.border },
        ]}
        accessibilityLabel={`Progression du mois : semaine ${safeWeek} sur ${WEEKS_PER_MONTH}`}
      >
        <View
          style={[
            styles.weekFill,
            {
              backgroundColor: colors.primary,
              width: `${Math.round(weekProgress * 100)}%`,
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
          {monthsToNext === 0
            ? "imminent"
            : `dans ${monthsToNext} mois`}
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
  weekLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.6,
    opacity: 0.8,
  },
  weekTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  weekFill: {
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
