import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { TOTAL_GAME_DAYS, computeGameDayDisplay } from "@/logic/simulationClock";

interface Props {
  presidentName: string;
  party: string;
  /** Jour de jeu courant 1..60 (issu de `state.gameTime.currentMonth`). */
  gameDay: number;
  onOpenJournal: () => void;
  onGoHome: () => void;
  onReset: () => void;
}

export function HudHeader({
  presidentName,
  party,
  gameDay,
  onOpenJournal,
  onGoHome,
  onReset,
}: Props) {
  const colors = useColors();
  const { seasonNumber, dayInSeason } = computeGameDayDisplay(gameDay);
  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: colors.success, shadowColor: colors.success },
          ]}
        />
        <Text style={[styles.liveText, { color: colors.success }]}>
          EN DIRECT
        </Text>
        <View style={styles.spacer} />
        <Pressable
          onPress={onGoHome}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
          accessibilityLabel="Retour à l'accueil (la partie est sauvegardée)"
        >
          <Feather name="home" size={14} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={onOpenJournal}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
          accessibilityLabel="Ouvrir le journal de mandat"
        >
          <Feather name="book-open" size={14} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
          accessibilityLabel="Abandonner le mandat (efface la sauvegarde)"
        >
          <Feather name="rotate-ccw" size={14} color={colors.foreground} />
        </Pressable>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.presidentName, { color: colors.foreground }]}>
            Pdt. {presidentName}
          </Text>
          <Text style={[styles.party, { color: colors.mutedForeground }]}>
            {party}
          </Text>
        </View>
        <View style={styles.timeBox}>
          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
            SAISON {seasonNumber} · JOUR {dayInSeason}
          </Text>
          <Text style={[styles.timeValue, { color: colors.foreground }]}>
            Jour {gameDay} / {TOTAL_GAME_DAYS}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  spacer: {
    flex: 1,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  presidentName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  party: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  timeBox: {
    alignItems: "flex-end",
  },
  timeLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  timeValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
});
