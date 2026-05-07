import React, { useEffect, useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import type { GaugeKey } from "@/types/game";
import { formatMandateLabel, turnToMonth } from "@/logic/timeEngine";

/**
 * Chantier 2 — Dev-only debug screen.
 *
 * Gated entirely behind `__DEV__`: in a production bundle the
 * component immediately redirects home and never renders the panel,
 * so the debug surface is unreachable for players. Reachable from
 * the home screen via a 5-tap easter egg on the title.
 */
export default function DebugScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state,
    __debugPatchGauges,
    __debugAdvanceTurn,
    __debugForceElection,
  } = useGame();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (!__DEV__) router.replace("/");
  }, [router]);

  if (!__DEV__) return null;

  const inGame = !!state.president && !state.gameOver.isOver;

  const gaugeRows = useMemo<Array<{ key: GaugeKey; label: string }>>(
    () => [
      { key: "popularity", label: "Popularité" },
      { key: "economy", label: "Économie" },
      { key: "budget", label: "Finances publiques" },
      { key: "debt", label: "Dette" },
      { key: "security", label: "Sécurité" },
      { key: "health", label: "Santé" },
      { key: "ecology", label: "Écologie" },
      { key: "cohesion", label: "Cohésion" },
      { key: "diplomacy", label: "Diplomatie" },
      { key: "regionalStability", label: "Stabilité régions" },
      { key: "authority", label: "Autorité" },
    ],
    [],
  );

  const onNudge = (key: GaugeKey, delta: number) => {
    const current = state.gauges[key] ?? 50;
    __debugPatchGauges({ [key]: current + delta } as Partial<typeof state.gauges>);
  };
  const onSet = (key: GaugeKey, value: number) => {
    __debugPatchGauges({ [key]: value } as Partial<typeof state.gauges>);
  };

  // Raccourci debug : pousse toutes les jauges à 95 d'un coup pour
  // simuler un mandat brillant et garantir une re-élection lors d'un
  // `Forcer l'élection` immédiat. Utile pour valider le flow
  // "Continuer 2nd mandat" sans avoir à matraquer +10 sur chaque
  // ligne. Strictement dev-only (le screen lui-même est gated).
  const onPrepareVictory = () => {
    const allHigh: Partial<typeof state.gauges> = {};
    for (const { key } of gaugeRows) {
      (allHigh as Record<string, number>)[key] = 95;
    }
    __debugPatchGauges(allHigh);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + webTopInset,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Feather name="terminal" size={14} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            DEBUG · DEV ONLY
          </Text>
        </View>
        <View style={{ width: 18 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.card, borderColor: colors.primary },
          ]}
        >
          <Text
            style={[styles.bannerText, { color: colors.mutedForeground }]}
          >
            Outils internes — non livrés en production. Toute modification
            altère votre partie en cours et est sauvegardée.
          </Text>
        </View>

        {!inGame ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="alert-circle" size={20} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Aucune partie active. Démarrez un mandat pour utiliser les
              outils debug.
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              ÉTAT
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Row
                label="Mois du mandat"
                value={`${state.gameTime?.currentMonth ?? turnToMonth(state.turn)} / 60 — ${formatMandateLabel(
                  state.gameTime?.currentMonth ?? turnToMonth(state.turn),
                )}`}
                colors={colors}
              />
              <Row
                label="Tour décision (interne)"
                value={`${state.turn} / ${state.maxTurns}`}
                colors={colors}
              />
              <Row
                label="Président·e"
                value={state.president?.name ?? "—"}
                colors={colors}
              />
              <Row
                label="Opposition"
                value={String(state.opposition)}
                colors={colors}
              />
              <Row
                label="Médias"
                value={String(state.media)}
                colors={colors}
              />
            </View>

            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              ACTIONS
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Pressable
                onPress={__debugAdvanceTurn}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="skip-forward" size={14} color={colors.foreground} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>
                  Avancer d'un tour
                </Text>
              </Pressable>
              <Pressable
                onPress={__debugForceElection}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    borderColor: colors.danger,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="zap" size={14} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Forcer l'élection
                </Text>
              </Pressable>
              <Pressable
                onPress={onPrepareVictory}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    borderColor: colors.success,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="award" size={14} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>
                  Préparer victoire (jauges → 95)
                </Text>
              </Pressable>
            </View>

            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              JAUGES
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {gaugeRows.map((g) => {
                const value = state.gauges[g.key] ?? 0;
                return (
                  <View key={g.key} style={styles.gaugeRow}>
                    <View style={styles.gaugeHeader}>
                      <Text
                        style={[
                          styles.gaugeLabel,
                          { color: colors.foreground },
                        ]}
                      >
                        {g.label}
                      </Text>
                      <Text
                        style={[
                          styles.gaugeValue,
                          { color: colors.primary },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.bar,
                        { backgroundColor: colors.muted },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${value}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.gaugeBtnRow}>
                      <NudgeBtn
                        label="0"
                        onPress={() => onSet(g.key, 0)}
                        colors={colors}
                      />
                      <NudgeBtn
                        label="−10"
                        onPress={() => onNudge(g.key, -10)}
                        colors={colors}
                      />
                      <NudgeBtn
                        label="−1"
                        onPress={() => onNudge(g.key, -1)}
                        colors={colors}
                      />
                      <NudgeBtn
                        label="50"
                        onPress={() => onSet(g.key, 50)}
                        colors={colors}
                      />
                      <NudgeBtn
                        label="+1"
                        onPress={() => onNudge(g.key, 1)}
                        colors={colors}
                      />
                      <NudgeBtn
                        label="+10"
                        onPress={() => onNudge(g.key, 10)}
                        colors={colors}
                      />
                      <NudgeBtn
                        label="100"
                        onPress={() => onSet(g.key, 100)}
                        colors={colors}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}
function Row({ label, value, colors }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

interface NudgeBtnProps {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}
function NudgeBtn({ label, onPress, colors }: NudgeBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.nudge,
        {
          borderColor: colors.border,
          backgroundColor: colors.background,
          opacity: pressed ? 0.5 : 1,
        },
      ]}
    >
      <Text style={[styles.nudgeText, { color: colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  banner: {
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  bannerText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    alignItems: "center",
    gap: 10,
    padding: 24,
    borderRadius: 6,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 12, fontFamily: "Inter_700Bold" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 5,
  },
  actionText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  gaugeRow: {
    gap: 6,
    paddingBottom: 10,
  },
  gaugeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gaugeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  gaugeValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  bar: { height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  gaugeBtnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  nudge: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
  },
  nudgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
