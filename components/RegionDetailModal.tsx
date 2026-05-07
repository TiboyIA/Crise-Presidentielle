import React from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  REGION_GAUGE_KEYS,
  REGION_GAUGE_LABELS,
  Region,
  leaningColor,
  leaningLabel,
  regionGaugeAverage,
  tensionLevel,
} from "@/data/regions";
import { getRegionGaugeImage } from "@/data/regionImages";

interface Props {
  region: Region | null;
  visible: boolean;
  onClose: () => void;
}

function gaugeColor(
  v: number,
  c: { success: string; warning: string; danger: string },
): string {
  if (v >= 60) return c.success;
  if (v >= 35) return c.warning;
  return c.danger;
}

export function RegionDetailModal({ region, visible, onClose }: Props) {
  const colors = useColors();
  if (!region) return null;
  const tLevel = tensionLevel(region.tension);
  const tTone = colors[tLevel.color];
  const avg = regionGaugeAverage(region.gauges);
  const leaningTint = leaningColor(region.leaning);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.eyebrow, { color: colors.mutedForeground }]}
              >
                FICHE RÉGIONALE
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {region.name}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {region.capital} · {region.population} hab.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeBtn, { borderColor: colors.border }]}
              accessibilityLabel="Fermer"
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Tension + average row */}
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.summaryCell,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  TENSION
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.foreground }]}
                >
                  {Math.round(region.tension)}
                </Text>
                <View style={[styles.badge, { backgroundColor: tTone }]}>
                  <Text style={styles.badgeText}>{tLevel.label}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.summaryCell,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  ⌀ JAUGES
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.foreground }]}
                >
                  {Math.round(avg)}
                </Text>
                <Text
                  style={[
                    styles.summaryHint,
                    { color: colors.mutedForeground },
                  ]}
                >
                  / 100
                </Text>
              </View>
            </View>

            {/* 6 gauges */}
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              JAUGES RÉGIONALES
            </Text>
            <View style={{ gap: 8 }}>
              {REGION_GAUGE_KEYS.map((k) => {
                const v = region.gauges[k];
                const tone = gaugeColor(v, {
                  success: colors.success,
                  warning: colors.warning,
                  danger: colors.danger,
                });
                return (
                  <View key={k} style={styles.gaugeRow}>
                    <View
                      style={[
                        styles.gaugeIconBox,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Image
                        source={getRegionGaugeImage(k)}
                        style={styles.gaugeIcon}
                        resizeMode="cover"
                        accessible={false}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                    </View>
                    <Text
                      style={[styles.gaugeLabel, { color: colors.foreground }]}
                    >
                      {REGION_GAUGE_LABELS[k]}
                    </Text>
                    <View
                      style={[styles.gaugeBar, { backgroundColor: colors.muted }]}
                    >
                      <View
                        style={[
                          styles.gaugeFill,
                          {
                            width: `${Math.max(2, v)}%`,
                            backgroundColor: tone,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.gaugeValue, { color: colors.foreground }]}
                    >
                      {Math.round(v)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Political snapshot */}
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground, marginTop: 14 },
              ]}
            >
              ORIENTATION POLITIQUE
            </Text>
            <View style={styles.leaningRow}>
              <View
                style={[styles.leaningDot, { backgroundColor: leaningTint }]}
              />
              <Text
                style={[styles.leaningLabel, { color: colors.foreground }]}
              >
                {leaningLabel(region.leaning)}
              </Text>
              <Text
                style={[styles.leaningSrc, { color: colors.mutedForeground }]}
              >
                Municipales 2026
              </Text>
            </View>
            <Text style={[styles.dominant, { color: colors.foreground }]}>
              {region.dominant}
            </Text>
            <Text style={[styles.insight, { color: colors.mutedForeground }]}>
              {region.insight}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  summaryCell: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  summaryHint: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gaugeIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  gaugeIcon: {
    width: "100%",
    height: "100%",
  },
  gaugeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 100,
  },
  gaugeBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 3,
  },
  gaugeValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    width: 26,
    textAlign: "right",
  },
  leaningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leaningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  leaningLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  leaningSrc: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginLeft: "auto",
    letterSpacing: 0.5,
  },
  dominant: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  insight: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 15,
    marginTop: 6,
  },
});
