import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  DEFEAT_REASON_LABELS,
  DefeatReason,
  GameStats,
  STRATEGY_LABELS,
  loadStats,
  resetStats,
} from "@/storage/statsStorage";
import type { FinalDebateStrategy } from "@/types/game";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import {
  DEFEAT_REASON_IMAGES,
  KPI_IMAGES,
  STATS_EMPTY,
  STRATEGY_IMAGES,
} from "@/data/statsImages";
import type { StatsKpiKey } from "@/data/statsImages";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const STATS_HEADER = require("@/assets/images/screens/stats_header.png");

export default function StatsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<GameStats | null>(null);

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const refresh = useCallback(async () => {
    const s = await loadStats();
    setStats(s);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onReset = useCallback(() => {
    const action = async () => {
      await resetStats();
      await refresh();
    };
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm("Réinitialiser toutes les statistiques ?")
      ) {
        action();
      }
      return;
    }
    Alert.alert(
      "Réinitialiser les statistiques ?",
      "Cette action efface définitivement votre historique.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Réinitialiser", style: "destructive", onPress: action },
      ],
    );
  }, [refresh]);

  if (!stats) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      />
    );
  }

  const winRate =
    stats.totalGames > 0 ? (stats.victories / stats.totalGames) * 100 : 0;
  const avgTurns =
    stats.totalGames > 0 ? stats.turnsSum / stats.totalGames : 0;
  const avgVoteShare =
    stats.voteShareCount > 0 ? stats.voteShareSum / stats.voteShareCount : 0;

  const sortedReasons = (Object.keys(stats.defeatReasons) as DefeatReason[])
    .map((k) => ({ k, v: stats.defeatReasons[k] }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);

  const sortedStrategies = (
    Object.keys(stats.strategyPicks) as FinalDebateStrategy[]
  )
    .map((k) => ({ k, v: stats.strategyPicks[k] }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);

  const totalStrategyPicks = sortedStrategies.reduce((s, r) => s + r.v, 0);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScreenHeroHeader
        source={STATS_HEADER}
        kicker="MÉMOIRES DE L'ÉLYSÉE"
        title="Statistiques"
        subtitle={
          stats.totalGames === 0
            ? "Aucune partie n'a encore été enregistrée."
            : `${stats.totalGames} mandat${stats.totalGames > 1 ? "s" : ""} joué${stats.totalGames > 1 ? "s" : ""} · ${stats.victories} victoire${stats.victories > 1 ? "s" : ""}`
        }
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {stats.totalGames === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Image
              source={STATS_EMPTY}
              style={styles.emptyImage}
              resizeMode="cover"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Aucune partie enregistrée
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Terminez un mandat (élection ou défaite) pour alimenter vos
              statistiques.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <Kpi
                label="MANDATS JOUÉS"
                value={String(stats.totalGames)}
                imageKey="mandats"
              />
              <Kpi
                label="TAUX VICTOIRE"
                value={`${Math.round(winRate)}%`}
                imageKey="winrate"
                accent
              />
              <Kpi
                label="VICTOIRES"
                value={String(stats.victories)}
                imageKey="victories"
              />
              <Kpi
                label="DÉFAITES"
                value={String(stats.defeats)}
                imageKey="defeats"
              />
              <Kpi
                label="TOUR MOYEN"
                value={avgTurns.toFixed(1)}
                imageKey="avgTurns"
              />
              <Kpi
                label="SCORE MOYEN"
                value={
                  stats.voteShareCount > 0 ? `${avgVoteShare.toFixed(1)}%` : "—"
                }
                imageKey="avgScore"
              />
            </View>

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground },
              ]}
            >
              CAUSES DE DÉFAITE
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {sortedReasons.length === 0 ? (
                <Text
                  style={[styles.emptyDesc, { color: colors.mutedForeground }]}
                >
                  Aucune défaite enregistrée. Belle régularité.
                </Text>
              ) : (
                sortedReasons.map((r) => {
                  const pct =
                    stats.defeats > 0 ? (r.v / stats.defeats) * 100 : 0;
                  return (
                    <IllustratedRow
                      key={r.k}
                      image={DEFEAT_REASON_IMAGES[r.k]}
                      label={DEFEAT_REASON_LABELS[r.k]}
                      meta={`${r.v} défaite${r.v > 1 ? "s" : ""} · ${Math.round(pct)}%`}
                      pct={pct}
                      barColor={colors.danger}
                    />
                  );
                })
              )}
            </View>

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground },
              ]}
            >
              STRATÉGIES DE DÉBAT
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {sortedStrategies.length === 0 ? (
                <Text
                  style={[styles.emptyDesc, { color: colors.mutedForeground }]}
                >
                  Vous n'avez pas encore joué de débat final.
                </Text>
              ) : (
                sortedStrategies.map((r) => {
                  const pct =
                    totalStrategyPicks > 0
                      ? (r.v / totalStrategyPicks) * 100
                      : 0;
                  return (
                    <IllustratedRow
                      key={r.k}
                      image={STRATEGY_IMAGES[r.k]}
                      label={STRATEGY_LABELS[r.k]}
                      meta={`${r.v} fois · ${Math.round(pct)}%`}
                      pct={pct}
                      barColor={colors.primary}
                    />
                  );
                })
              )}
            </View>

            <Pressable
              onPress={onReset}
              style={({ pressed }) => [
                styles.resetBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="trash-2" size={13} color={colors.danger} />
              <Text style={[styles.resetText, { color: colors.danger }]}>
                RÉINITIALISER
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface KpiProps {
  label: string;
  value: string;
  imageKey: StatsKpiKey;
  accent?: boolean;
}

function Kpi({ label, value, imageKey, accent }: KpiProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.kpi,
        {
          backgroundColor: colors.card,
          borderColor: accent ? colors.primary : colors.border,
        },
      ]}
    >
      <Image
        source={KPI_IMAGES[imageKey]}
        style={styles.kpiImage}
        resizeMode="cover"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        style={[
          styles.kpiLabel,
          { color: colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.kpiValue,
          { color: accent ? colors.primary : colors.foreground },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

interface IllustratedRowProps {
  image: ImageSourcePropType;
  label: string;
  meta: string;
  pct: number;
  barColor: string;
}

function IllustratedRow({
  image,
  label,
  meta,
  pct,
  barColor,
}: IllustratedRowProps) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Image
        source={image}
        style={styles.rowImage}
        resizeMode="cover"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.rowBody}>
        <View style={styles.rowText}>
          <Text
            style={[styles.rowLabel, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.rowMeta,
              { color: colors.mutedForeground },
            ]}
          >
            {meta}
          </Text>
        </View>
        <View style={[styles.bar, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${pct}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 14,
  },
  empty: {
    alignItems: "center",
    gap: 12,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 24,
  },
  emptyImage: {
    width: 96,
    height: 96,
    borderRadius: 6,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpi: {
    flexBasis: "31%",
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
    gap: 6,
    alignItems: "flex-start",
  },
  kpiImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 6,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 6,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowImage: {
    width: 44,
    height: 44,
    borderRadius: 4,
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowText: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 6,
  },
  resetText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
});
