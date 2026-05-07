/**
 * Dashboard panel listing the cascade consequences brewing from past
 * decisions. Renders nothing when nothing is queued (early game) so
 * it doesn't dilute the dashboard visually.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import type { ScheduledConsequence } from "@/types/game";
import { sortScheduledForDisplay } from "@/logic/cascadeEngine";

interface Props {
  scheduled: ScheduledConsequence[];
  /** Current game turn — used to compute "in N weeks". */
  currentTurn: number;
  /** Cap how many entries we show inline (rest summarised as +X). */
  maxInline?: number;
}

const KIND_TONE: Record<
  ScheduledConsequence["step"]["kind"],
  { glyph: keyof typeof Feather.glyphMap; word: string }
> = {
  gauge: { glyph: "trending-down", word: "Effet chiffré" },
  notice: { glyph: "alert-triangle", word: "Signal" },
  event: { glyph: "zap", word: "Événement" },
};

export function CascadeUpcomingCard({
  scheduled,
  currentTurn,
  maxInline = 4,
}: Props) {
  const colors = useColors();
  const router = useRouter();
  if (!scheduled || scheduled.length === 0) return null;

  const sorted = sortScheduledForDisplay(scheduled);
  const visible = sorted.slice(0, maxInline);
  const overflow = sorted.length - visible.length;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.warning },
      ]}
    >
      <View style={styles.header}>
        <Feather name="git-branch" size={14} color={colors.warning} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          CONSÉQUENCES À VENIR
        </Text>
        <View style={[styles.countPill, { backgroundColor: colors.warning }]}>
          <Text style={styles.countPillText}>{scheduled.length}</Text>
        </View>
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Vos décisions passées vont continuer à frapper.
      </Text>

      <View style={styles.list}>
        {visible.map((sc) => {
          const turnsAway = Math.max(0, sc.triggerTurn - currentTurn);
          const tone = KIND_TONE[sc.step.kind];
          return (
            <Pressable
              key={sc.id}
              onPress={() => router.push("/journal")}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.kindBadge,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Feather
                  name={tone.glyph}
                  size={11}
                  color={colors.warning}
                />
              </View>
              <View style={styles.rowBody}>
                <Text
                  style={[styles.rowLabel, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {sc.step.label}
                </Text>
                <Text
                  style={[
                    styles.rowSource,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  Suite de votre choix « {sc.sourceChoiceLabel} »
                </Text>
              </View>
              <View style={styles.eta}>
                <Text style={[styles.etaValue, { color: colors.warning }]}>
                  {turnsAway === 0
                    ? "imminent"
                    : turnsAway === 1
                      ? "1 sem"
                      : `${turnsAway} sem`}
                </Text>
                <Text
                  style={[styles.etaKind, { color: colors.mutedForeground }]}
                >
                  {tone.word}
                </Text>
              </View>
            </Pressable>
          );
        })}
        {overflow > 0 ? (
          <Text
            style={[styles.overflow, { color: colors.mutedForeground }]}
          >
            +{overflow} autre{overflow > 1 ? "s" : ""} à venir
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  countPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: "center",
  },
  countPillText: {
    color: "#0a0a0a",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  list: {
    gap: 6,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  kindBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 15,
  },
  rowSource: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  eta: {
    alignItems: "flex-end",
    minWidth: 56,
  },
  etaValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  etaKind: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  overflow: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
  },
});
