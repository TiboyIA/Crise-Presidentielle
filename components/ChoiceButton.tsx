import React, { memo } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { EventChoice } from "@/data/events";
import type { Gauges, HiddenGauges, HiddenGaugeKey } from "@/types/game";
import {
  TONE_IMAGES,
  TONE_LABEL,
  inferChoiceTone,
} from "@/data/eventToneImages";
import {
  GAUGE_LABELS,
  HIDDEN_GAUGE_LABELS,
  INVERTED_GAUGES,
} from "@/logic/gameEngine";

interface Props {
  choice: EventChoice;
  selected: boolean;
  onPress: () => void;
  /**
   * Hidden gauges already revealed to the player. Hidden-effect chips
   * only display their real label/value if the gauge is in this list;
   * otherwise they show as obscured ("?? effet caché").
   */
  revealedHiddenKeys?: HiddenGaugeKey[];
}

function ChoiceButtonImpl({
  choice,
  selected,
  onPress,
  revealedHiddenKeys = [],
}: Props) {
  const colors = useColors();
  const tone = inferChoiceTone(choice);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.highlight : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.toneBox,
            {
              borderColor: selected ? colors.primary : colors.border,
            },
          ]}
        >
          <Image
            source={TONE_IMAGES[tone]}
            style={styles.toneImage}
            resizeMode="cover"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <View style={styles.titleStack}>
          <Text
            style={[
              styles.toneLabel,
              { color: selected ? colors.primary : colors.mutedForeground },
            ]}
          >
            {TONE_LABEL[tone]}
          </Text>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {choice.label}
          </Text>
        </View>
      </View>
      <Text style={[styles.desc, { color: colors.mutedForeground }]}>
        {choice.description}
      </Text>
      {!selected ? (
        <View style={styles.tagsRow}>
          {choice.hiddenEffects &&
          Object.keys(choice.hiddenEffects).length > 0 ? (
            <View style={[styles.riskTag, { borderColor: colors.warning }]}>
              <Text style={[styles.riskText, { color: colors.warning }]}>
                ⚠ Risque caché
              </Text>
            </View>
          ) : null}
          {choice.cascade && choice.cascade.length > 0 ? (
            <View style={[styles.cascadeTag, { borderColor: colors.warning }]}>
              <Text style={[styles.riskText, { color: colors.warning }]}>
                ⛓ Cascade · {choice.cascade.length} effet
                {choice.cascade.length > 1 ? "s" : ""} à venir
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {selected ? (
        <View style={styles.effects}>
          {(Object.keys(choice.effects) as (keyof Gauges)[]).map((k) => {
            const v = choice.effects[k] ?? 0;
            // For inverted gauges (e.g. Dette), a positive delta is BAD.
            const isGood = INVERTED_GAUGES.has(k) ? v <= 0 : v >= 0;
            return (
              <View
                key={k}
                style={[
                  styles.chip,
                  { backgroundColor: isGood ? colors.success : colors.danger },
                ]}
              >
                <Text style={styles.chipText}>
                  {GAUGE_LABELS[k]} {v > 0 ? "+" : ""}
                  {v}
                </Text>
              </View>
            );
          })}
          {choice.hiddenEffects ? (
            <>
              {(
                Object.keys(choice.hiddenEffects) as HiddenGaugeKey[]
              ).map((k) => {
                const v = choice.hiddenEffects?.[k] ?? 0;
                const revealed = revealedHiddenKeys.includes(k);
                // All listed hidden gauges represent risks/pressures —
                // a positive delta is universally bad.
                const isGood = v <= 0;
                if (revealed) {
                  return (
                    <View
                      key={`h_${k}`}
                      style={[
                        styles.chip,
                        styles.hiddenChip,
                        {
                          backgroundColor: isGood ? colors.success : colors.danger,
                        },
                      ]}
                    >
                      <Text style={styles.chipText}>
                        {HIDDEN_GAUGE_LABELS[k]} {v > 0 ? "+" : ""}
                        {v}
                      </Text>
                    </View>
                  );
                }
                return (
                  <View
                    key={`h_${k}`}
                    style={[
                      styles.chip,
                      styles.hiddenChip,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      ?? effet caché
                    </Text>
                  </View>
                );
              })}
            </>
          ) : null}
        </View>
      ) : null}
      {selected && choice.cascade && choice.cascade.length > 0 ? (
        <View
          style={[
            styles.cascadePreview,
            { borderColor: colors.warning, backgroundColor: colors.muted },
          ]}
        >
          <Text style={[styles.cascadeTitle, { color: colors.warning }]}>
            ⛓ CONSÉQUENCES À VENIR
          </Text>
          {choice.cascade.map((step, i) => (
            <View key={i} style={styles.cascadeStepRow}>
              <Text
                style={[
                  styles.cascadeStepEta,
                  { color: colors.warning },
                ]}
              >
                +{step.delay} sem
              </Text>
              <Text
                style={[
                  styles.cascadeStepLabel,
                  { color: colors.foreground },
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export const ChoiceButton = memo(ChoiceButtonImpl);

const styles = StyleSheet.create({
  choice: {
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toneBox: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  toneImage: {
    width: "100%",
    height: "100%",
  },
  titleStack: {
    flex: 1,
    gap: 2,
  },
  toneLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  effects: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  hiddenChip: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  riskTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  cascadeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  riskText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  cascadePreview: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 4,
  },
  cascadeTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  cascadeStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cascadeStepEta: {
    minWidth: 50,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  cascadeStepLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
});
