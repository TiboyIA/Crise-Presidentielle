import React, { useMemo } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { formatGameDayLabel, turnToGameDay } from "@/logic/timeEngine";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import {
  PROMISES_EMPTY,
  PROMISE_IMAGES,
  PROMISE_STATUS_IMAGES,
  type PromiseStatusKey,
} from "@/data/promiseImages";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROMISES_HEADER = require("@/assets/images/screens/promises_header.png");

const STATUS_LABEL: Record<PromiseStatusKey, string> = {
  pending: "En attente",
  fulfilled: "Tenue",
  broken: "Brisée",
};

const SECTION_LABEL: Record<PromiseStatusKey, string> = {
  fulfilled: "TENUES",
  pending: "EN ATTENTE",
  broken: "BRISÉES",
};

// Ordre d'affichage des sections : positif d'abord, négatif en bas.
const SECTION_ORDER: PromiseStatusKey[] = ["fulfilled", "pending", "broken"];

export default function PromisesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useGame();

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const grouped = useMemo(() => {
    const g: Record<PromiseStatusKey, typeof state.promises> = {
      fulfilled: [],
      pending: [],
      broken: [],
    };
    for (const p of state.promises) {
      const k = (p.status as PromiseStatusKey) ?? "pending";
      g[k].push(p);
    }
    return g;
  }, [state.promises]);

  const counts = useMemo(
    () => ({
      fulfilled: grouped.fulfilled.length,
      pending: grouped.pending.length,
      broken: grouped.broken.length,
    }),
    [grouped],
  );

  const toneFor = (k: PromiseStatusKey): string =>
    k === "fulfilled" ? colors.success : k === "broken" ? colors.danger : colors.warning;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeroHeader
        source={PROMISES_HEADER}
        kicker="CONTRAT DE MANDAT"
        title="Promesses de campagne"
        subtitle={
          state.promises.length === 0
            ? "Aucun engagement formel pris devant les électeurs."
            : `${counts.fulfilled} tenue${counts.fulfilled > 1 ? "s" : ""} · ${counts.broken} brisée${counts.broken > 1 ? "s" : ""} · ${counts.pending} en attente`
        }
        onClose={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {state.promises.length === 0 ? (
          <View style={styles.empty}>
            <Image
              source={PROMISES_EMPTY}
              style={styles.emptyImage}
              resizeMode="cover"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Aucune promesse enregistrée
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Le contrat de mandat est encore vierge.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <SummaryBadge value={counts.fulfilled} label="TENUES" color={colors.success} />
              <SummaryBadge value={counts.pending} label="EN ATTENTE" color={colors.warning} />
              <SummaryBadge value={counts.broken} label="BRISÉES" color={colors.danger} />
            </View>

            {SECTION_ORDER.map((statusKey) => {
              const items = grouped[statusKey];
              if (items.length === 0) return null;
              const tone = toneFor(statusKey);
              return (
                <View key={statusKey} style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Image
                      source={PROMISE_STATUS_IMAGES[statusKey]}
                      style={styles.sectionIcon}
                      resizeMode="cover"
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text style={[styles.sectionLabel, { color: tone }]}>
                      {SECTION_LABEL[statusKey]}
                    </Text>
                    <Text
                      style={[styles.sectionCount, { color: colors.mutedForeground }]}
                    >
                      {items.length}
                    </Text>
                    <View
                      style={[
                        styles.sectionRule,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </View>

                  {items.map((p) => {
                    const thumb = PROMISE_IMAGES[p.tag];
                    return (
                      <View
                        key={p.tag}
                        style={[
                          styles.card,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderLeftColor: tone,
                          },
                        ]}
                      >
                        {thumb ? (
                          <View
                            style={[
                              styles.thumbBox,
                              { borderColor: colors.border },
                            ]}
                          >
                            <Image
                              source={thumb}
                              style={styles.thumb}
                              resizeMode="cover"
                              accessible={false}
                              accessibilityElementsHidden
                              importantForAccessibility="no"
                            />
                          </View>
                        ) : null}
                        <View style={styles.cardBody}>
                          <View style={styles.cardHead}>
                            <Text
                              style={[styles.title, { color: colors.foreground }]}
                              numberOfLines={2}
                            >
                              {p.label}
                            </Text>
                            <View
                              style={[styles.statusBadge, { backgroundColor: tone }]}
                            >
                              <Image
                                source={PROMISE_STATUS_IMAGES[statusKey]}
                                style={styles.statusBadgeIcon}
                                resizeMode="cover"
                                accessible={false}
                                accessibilityElementsHidden
                                importantForAccessibility="no"
                              />
                              <Text style={styles.statusText}>
                                {STATUS_LABEL[statusKey]}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[styles.desc, { color: colors.mutedForeground }]}
                          >
                            {p.description}
                          </Text>
                          {p.resolvedTurn ? (
                            <Text
                              style={[
                                styles.resolvedAt,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              Résolu au {formatGameDayLabel(turnToGameDay(p.resolvedTurn))}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface SummaryBadgeProps {
  value: number;
  label: string;
  color: string;
}

function SummaryBadge({ value, label, color }: SummaryBadgeProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.summaryBadge,
        { backgroundColor: colors.card, borderColor: color },
      ]}
    >
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  summaryBadge: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  empty: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 12,
  },
  emptyImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
  },
  emptyHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 28,
  },
  section: {
    gap: 8,
    marginTop: 6,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sectionIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  sectionRule: {
    flex: 1,
    height: 1,
    marginLeft: 4,
  },
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 12,
  },
  thumbBox: {
    width: 64,
    height: 64,
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  statusBadgeIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },
  resolvedAt: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
});
