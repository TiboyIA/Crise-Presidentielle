import React from "react";
import {
  Alert,
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
import { MinisterPosition } from "@/data/ministers";
import { MinisterCard } from "@/components/MinisterCard";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import {
  CABINET_HEADER,
  MINISTER_BADGE_IMAGES,
} from "@/data/cabinetImages";
import { computeHumanCapital } from "@/logic/humanCapitalEngine";

export default function CabinetScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, replaceMinister } = useGame();

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const askReplace = (position: MinisterPosition, name: string) => {
    const action = () => replaceMinister(position);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Remplacer ${name} ? (-5 autorité, +4 opposition)`)) {
        action();
      }
      return;
    }
    Alert.alert(
      `Remplacer ${name} ?`,
      "Coût : -5 autorité, +4 opposition. Le successeur arrivera avec des stats neuves.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Démettre", style: "destructive", onPress: action },
      ],
    );
  };

  const avgLoyalty =
    state.ministers.reduce((s, m) => s + m.loyalty, 0) /
    Math.max(1, state.ministers.length);
  const avgCompetence =
    state.ministers.reduce((s, m) => s + m.competence, 0) /
    Math.max(1, state.ministers.length);
  // Module 3 — risques internes : on liste explicitement les
  // frondeurs (déjà déclarés rivaux du Président) et les ministres à
  // fort risque caché de scandale (>= 60). On masque la valeur
  // numérique du risque pour préserver le mystère, on n'affiche
  // qu'une mention qualitative.
  const rivals = state.ministers.filter((m) => m.isRival);
  const atRisk = state.ministers.filter(
    (m) => m.scandalRisk >= 60 && m.scandals === 0,
  );
  const hasInternalAlerts = rivals.length > 0 || atRisk.length > 0;
  const hc = computeHumanCapital(state.ministers);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeroHeader
        source={CABINET_HEADER}
        kicker="HÔTEL DE MATIGNON"
        title="Conseil des ministres"
        subtitle={`${state.ministers.length} portefeuilles · loyauté moy. ${Math.round(avgLoyalty)} · compétence moy. ${Math.round(avgCompetence)}`}
        onClose={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              LOYAUTÉ MOY.
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {Math.round(avgLoyalty)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              COMPÉTENCE MOY.
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {Math.round(avgCompetence)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              MINISTRES
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {state.ministers.length}
            </Text>
          </View>
        </View>

        {/* Capital humain — indicateur RH global, valeur dérivée non stockée */}
        <View style={[styles.hcCard, { backgroundColor: colors.card, borderColor: hc.color + "55" }]}>
          <View style={styles.hcRow}>
            <Text style={[styles.hcLabel, { color: colors.mutedForeground }]}>
              CAPITAL HUMAIN DU GOUVERNEMENT
            </Text>
            <Text style={[styles.hcScore, { color: hc.color }]}>{hc.score}</Text>
          </View>
          <View style={styles.hcBarTrack}>
            <View style={[styles.hcBarFill, { width: `${hc.score}%`, backgroundColor: hc.color }]} />
          </View>
          <Text style={[styles.hcTierLabel, { color: hc.color }]}>{hc.label}</Text>
          {hc.effects.map((e, i) => (
            <Text key={i} style={[styles.hcEffect, { color: colors.mutedForeground }]}>· {e}</Text>
          ))}
        </View>

        {hasInternalAlerts ? (
          <View
            style={[
              styles.internalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.danger,
              },
            ]}
          >
            <View style={styles.internalHead}>
              <Image
                source={MINISTER_BADGE_IMAGES.risk}
                style={styles.internalIcon}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={[styles.internalLabel, { color: colors.danger }]}>
                RISQUES INTERNES
              </Text>
            </View>
            {rivals.map((m) => (
              <Text
                key={`r-${m.position}`}
                style={[styles.internalLine, { color: colors.foreground }]}
              >
                <Text style={{ fontFamily: "Inter_700Bold" }}>{m.name}</Text>
                {` (${m.positionLabel}) — `}
                <Text style={{ color: colors.danger }}>frondeur·euse déclaré·e</Text>
                {`. Lâche la majorité dans les médias.`}
              </Text>
            ))}
            {atRisk.map((m) => (
              <Text
                key={`s-${m.position}`}
                style={[styles.internalLine, { color: colors.foreground }]}
              >
                <Text style={{ fontFamily: "Inter_700Bold" }}>{m.name}</Text>
                {` (${m.positionLabel}) — `}
                <Text style={{ color: "#a16207" }}>rumeurs persistantes</Text>
                {`. Un dossier sensible pourrait sortir.`}
              </Text>
            ))}
          </View>
        ) : null}

        {state.ministers.map((m) => (
          <MinisterCard
            key={m.position}
            minister={m}
            onReplace={() => askReplace(m.position, m.name)}
          />
        ))}
      </ScrollView>
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  hcCard: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
    gap: 5,
  },
  hcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hcLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    flex: 1,
  },
  hcScore: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  hcBarTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  hcBarFill: {
    height: 3,
    borderRadius: 2,
  },
  hcTierLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  hcEffect: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  internalCard: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    marginBottom: 6,
    gap: 6,
  },
  internalHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  internalIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  internalLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  internalLine: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
