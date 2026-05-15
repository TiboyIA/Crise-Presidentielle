import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
  Image,
  ListRenderItem,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame, Gauges } from "@/context/GameContext";
import { GAUGE_LABELS } from "@/logic/gameEngine";
import { OPPOSITION_STANCE_LABELS } from "@/lib/oppositionReaction";
import type { DecisionLogEntry } from "@/types/game";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import {
  JOURNAL_HEADER,
  OPPOSITION_EMBLEM,
} from "@/data/journalImages";

type ColorPalette = ReturnType<typeof useColors>;

export default function JournalScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useGame();

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  // Chantier 3 — FlatList virtualises long mandates (20+ decisions
  // each with 2-4 nested chips/blocks). Stable callbacks + memoised
  // <JournalEntry/> let unaffected rows skip re-rendering when the
  // loading/error map updates.
  const totalCount = state.log.length;
  const renderItem = useCallback<ListRenderItem<DecisionLogEntry>>(
    ({ item, index }) => (
      <JournalEntry
        entry={item}
        isLast={index === totalCount - 1}
        colors={colors}
      />
    ),
    [colors, totalCount],
  );

  const keyExtractor = useCallback((item: DecisionLogEntry) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeroHeader
        source={JOURNAL_HEADER}
        kicker="ARCHIVES PRÉSIDENTIELLES"
        title="Journal des décisions"
        subtitle={
          totalCount === 0
            ? "Aucune décision n'a encore été archivée."
            : `${totalCount} décision${totalCount > 1 ? "s" : ""} consignée${totalCount > 1 ? "s" : ""} dans les archives officielles.`
        }
        onClose={() => router.back()}
      />

      <FlatList
        data={state.log}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="archive" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Aucune décision archivée
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Vos choix apparaîtront ici au fil du mandat.
            </Text>
          </View>
        }
      />
    </View>
  );
}

interface JournalEntryProps {
  entry: DecisionLogEntry;
  isLast: boolean;
  colors: ColorPalette;
}

const JournalEntry = memo(function JournalEntry({
  entry,
  isLast,
  colors,
}: JournalEntryProps) {
  const effectKeys = useMemo(
    () => Object.keys(entry.effects) as (keyof Gauges)[],
    [entry.effects],
  );
  const reaction = entry.oppositionReaction;
  const reactionTone =
    reaction?.stance === "exploit" || reaction?.stance === "denounce"
      ? colors.danger
      : reaction?.stance === "criticize"
        ? colors.warning
        : reaction?.stance === "approve"
          ? colors.success
          : colors.mutedForeground;

  return (
    <View
      style={[
        styles.entry,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.entryHeader}>
        <View style={[styles.turnBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.turnBadgeText}>S{entry.turn}</Text>
        </View>
        <Text
          style={[styles.eventTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {entry.eventTitle}
        </Text>
      </View>

      {entry.isDelayedConsequence ? (
        <View style={styles.fallbackRow}>
          <Feather name="link" size={11} color={colors.warning} />
          <Text style={[styles.fallbackText, { color: colors.warning }]}>
            RETOMBÉE D'UN CHOIX ANTÉRIEUR
          </Text>
        </View>
      ) : null}

      <View style={styles.choiceRow}>
        <Feather
          name="corner-down-right"
          size={12}
          color={colors.mutedForeground}
        />
        <Text style={[styles.choiceLabel, { color: colors.cardForeground }]}>
          {entry.choiceLabel}
        </Text>
      </View>

      <Text style={[styles.consequence, { color: colors.mutedForeground }]}>
        {entry.consequence}
      </Text>

      <View style={styles.effectsRow}>
        {effectKeys.map((k) => {
          const v = entry.effects[k] ?? 0;
          return (
            <View
              key={k}
              style={[
                styles.effectChip,
                {
                  backgroundColor: v >= 0 ? colors.success : colors.danger,
                },
              ]}
            >
              <Text style={styles.effectText}>
                {GAUGE_LABELS[k]} {v > 0 ? "+" : ""}
                {v}
              </Text>
            </View>
          );
        })}
      </View>

      {reaction ? (
        <View
          style={[
            styles.reactionBox,
            { borderLeftColor: reactionTone, backgroundColor: colors.muted },
          ]}
        >
          <Image
            source={OPPOSITION_EMBLEM}
            style={styles.reactionEmblem}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.reactionContent}>
            <View style={styles.reactionMetaRow}>
              <Text style={[styles.reactionLabel, { color: reactionTone }]}>
                OPPOSITION
              </Text>
              <Text style={[styles.reactionStance, { color: reactionTone }]}>
                {OPPOSITION_STANCE_LABELS[reaction.stance]}
              </Text>
            </View>
            <Text style={[styles.reactionLine, { color: colors.foreground }]}>
              « {reaction.line} »
            </Text>
          </View>
        </View>
      ) : null}

      {!isLast ? (
        <View
          style={[styles.connector, { backgroundColor: colors.border }]}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  entry: {
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    position: "relative",
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  turnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 36,
    alignItems: "center",
  },
  turnBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  eventTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  choiceLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  consequence: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  effectsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  effectChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  effectText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  connector: {
    position: "absolute",
    width: 1,
    height: 12,
    bottom: -12,
    left: 30,
  },
  fallbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: -2,
  },
  fallbackText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  reactionBox: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  reactionEmblem: {
    width: 38,
    height: 38,
    borderRadius: 4,
    marginTop: 2,
  },
  reactionContent: {
    flex: 1,
    gap: 4,
  },
  reactionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reactionLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  reactionStance: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  reactionLine: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  headlineBox: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headlineLogo: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginTop: 2,
  },
  headlineLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headlineContent: {
    flex: 1,
    gap: 4,
  },
  headlineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headlineToneVignette: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  headlineOutlet: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  headlineTone: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headlineTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    fontStyle: "italic",
  },
  headlineSnippet: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_400Regular",
  },
  headlineActionRow: {
    marginTop: 4,
    gap: 6,
  },
  headlineLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headlinePending: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  headlineRetry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  headlineRetryText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
