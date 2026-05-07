import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatMandateLabel } from "@/logic/timeEngine";
import { INVERTED_GAUGES } from "@/logic/gameEngine";
import type { Gauges, MandateReport } from "@/types/game";

interface Props {
  report: MandateReport | null;
  onDismiss: () => void;
}

const GAUGE_LABELS: Record<keyof Gauges, string> = {
  popularity: "Popularité",
  economy: "Économie",
  budget: "Finances publiques",
  debt: "Dette",
  security: "Sécurité",
  health: "Santé",
  ecology: "Écologie",
  cohesion: "Cohésion",
  diplomacy: "Diplomatie",
  regionalStability: "Stabilité régionale",
  authority: "Autorité",
};

const VISIBLE_MS = 3500;
const FADE_MS = 350;

/**
 * Bandeau-toast non bloquant pour les bilans TRIMESTRIELS. Apparaît
 * en haut de l'écran, montre les 3 plus gros mouvements de jauges
 * depuis le dernier bilan, puis disparaît tout seul après ~4 s.
 *
 * Volontairement non interactif (l'horloge continue à défiler) :
 * c'est un feedback visuel, pas un point de décision. Le tap est
 * juste un raccourci pour fermer plus tôt.
 */
export function QuarterReportToast({ report, onDismiss }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const isQuarter = report?.kind === "quarter";

  useEffect(() => {
    if (!isQuarter || !report) return;
    // Reset à 0 puis fade-in → hold → fade-out → onDismiss.
    opacity.setValue(0);
    let cancelled = false;
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    const holdTimer = setTimeout(() => {
      if (cancelled) return;
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) onDismiss();
      });
    }, VISIBLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(holdTimer);
    };
    // On veut un nouveau cycle si le report change (mois différent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.month, isQuarter]);

  if (!isQuarter || !report) return null;

  const deltas = (Object.keys(GAUGE_LABELS) as Array<keyof Gauges>)
    .map((k) => ({
      key: k,
      label: GAUGE_LABELS[k],
      delta: Math.round(report.gauges[k] - report.prevGauges[k]),
    }))
    .filter((d) => d.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  const isWeb = Platform.OS === "web";

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            backgroundColor: colors.background,
            borderColor: colors.border,
            ...(isWeb
              ? {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                }
              : {
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                }),
          },
        ]}
      >
        <Pressable
          onPress={onDismiss}
          accessibilityLabel="Fermer le bilan trimestriel"
          style={styles.inner}
        >
          <View style={styles.header}>
            <Text style={[styles.kind, { color: colors.mutedForeground }]}>
              BILAN TRIMESTRIEL
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.mutedForeground }]}
            >
              {formatMandateLabel(report.month)}
            </Text>
          </View>
          {deltas.length === 0 ? (
            <Text
              style={[styles.empty, { color: colors.mutedForeground }]}
            >
              Aucune évolution majeure depuis le dernier bilan.
            </Text>
          ) : (
            <View style={styles.deltas}>
              {deltas.map((d) => {
                const sign = d.delta > 0 ? "+" : "";
                const inverted = INVERTED_GAUGES.has(d.key);
                const goodDirection = inverted ? d.delta < 0 : d.delta > 0;
                const color = goodDirection
                  ? colors.success
                  : colors.destructive;
                return (
                  <View key={d.key} style={styles.deltaRow}>
                    <Text
                      style={[
                        styles.deltaLabel,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {d.label}
                    </Text>
                    <Text style={[styles.deltaValue, { color }]}>
                      {sign}
                      {d.delta}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 12,
    zIndex: 50,
  },
  toast: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    borderWidth: 1,
  },
  inner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  kind: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  deltas: {
    gap: 2,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  deltaLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  deltaValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    minWidth: 40,
    textAlign: "right",
  },
});
