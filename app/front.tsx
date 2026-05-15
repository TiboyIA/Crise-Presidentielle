/**
 * Module 6 — Page « FRONT DIPLOMATIQUE ».
 *
 * Route `/front`. Centre des opérations face à la guerre hybride :
 *  - bandeau « niveau de menace » (couleur + label) ;
 *  - identité de l'acteur hostile + jauge `aggression` ;
 *  - journal des 6 dernières opérations hybrides ;
 *  - 4 contre-mesures applicables (cyber, désescalade, sanctions,
 *    posture militaire) avec leur coût visible et un toast de
 *    confirmation après application.
 *
 * Pas d'IA. La page fait uniquement du rendu et appelle
 * `applyHybridCountermeasure(id)` du `GameContext`. Les contre-
 * mesures sont indisponibles pendant la guerre conventionnelle
 * (le contexte refuse silencieusement, et la page le signale).
 */
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { formatGameDayLabel, turnToGameDay } from "@/logic/timeEngine";
import {
  computeThreatLevel,
  threatColor,
  threatLabel,
} from "@/logic/hybridWarfare";
import { HYBRID_VECTORS } from "@/data/hybridVectors";
import {
  HYBRID_VECTOR_IMAGES,
  DIVISION_ZERO_PORTRAIT,
} from "@/data/hybridVectorImages";
import {
  HYBRID_COUNTERMEASURES,
  type CountermeasureId,
} from "@/data/hybridCountermeasures";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FRONT_HEADER = require("@/assets/images/screens/front_header.png");

const COUNTERMEASURE_IMAGES: Record<CountermeasureId, number> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cm_cyber_invest: require("@/assets/images/countermeasures/cybersecurity.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cm_de_escalation: require("@/assets/images/countermeasures/deescalation.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cm_sanctions: require("@/assets/images/countermeasures/sanctions.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cm_military_posture: require("@/assets/images/countermeasures/military.png"),
};

export default function FrontScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, applyHybridCountermeasure } = useGame();

  const hp = state.hostilePower;
  const ops = state.hybridOps ?? [];
  const level = computeThreatLevel(state);
  const accent = threatColor(level);
  const warLocked =
    state.warState?.status === "war" ||
    state.warState?.status === "ultimatum";

  // 6 dernières opérations, ordre antéchronologique.
  const recentOps = ops.slice(-6).reverse();

  function handleCountermeasure(id: (typeof HYBRID_COUNTERMEASURES)[number]["id"]) {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    applyHybridCountermeasure(id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeroHeader
        source={FRONT_HEADER}
        kicker={`MENACE — ${threatLabel(level)}`}
        title="Front diplomatique"
        subtitle={
          hp
            ? `${hp.name} · agressivité ${Math.round(hp.aggression)}/100`
            : "Aucune menace identifiée à ce jour."
        }
        accent={accent}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Profil acteur hostile */}
        {hp ? (
          <View
            style={[
              styles.threatHeader,
              {
                borderColor: accent,
                backgroundColor: colors.card,
              },
            ]}
          >
            <View style={styles.actorBannerWrap}>
              <Image
                source={DIVISION_ZERO_PORTRAIT}
                style={styles.actorBanner}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
            <View style={styles.threatBody}>
              <View style={styles.row}>
                <Feather name="alert-triangle" size={16} color={accent} />
                <Text style={[styles.threatLabel, { color: accent }]}>
                  ACTEUR HOSTILE
                </Text>
              </View>
              <Text style={[styles.actorName, { color: hp.color }]}>
                {hp.name}
              </Text>
              <Text
                style={[
                  styles.actorDesc,
                  { color: colors.mutedForeground },
                ]}
              >
                {hp.description}
              </Text>
              <Text
                style={[styles.aggression, { color: colors.foreground }]}
              >
                Agressivité estimée : {Math.round(hp.aggression)} / 100
              </Text>
              <View style={styles.aggBarTrack}>
                <View
                  style={[
                    styles.aggBarFill,
                    {
                      width: `${Math.round(hp.aggression)}%`,
                      backgroundColor: accent,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Journal opérations */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>
          JOURNAL DES OPÉRATIONS
        </Text>
        {recentOps.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Aucune opération attribuée à ce jour. Le calme — pour
            combien de temps ?
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {recentOps.map((op) => {
              const v = HYBRID_VECTORS[op.vector];
              const dot = op.defused
                ? "#16a34a"
                : op.resolved
                  ? colors.danger
                  : "#a37b1d";
              const vectorImage = HYBRID_VECTOR_IMAGES[op.vector];
              return (
                <View
                  key={op.id}
                  style={[
                    styles.opCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {vectorImage ? (
                    <View style={styles.opThumbWrap}>
                      <Image
                        source={vectorImage}
                        style={styles.opThumb}
                        resizeMode="cover"
                        accessible={false}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                    </View>
                  ) : null}
                  <View style={styles.opBody}>
                    <View style={styles.opCardHeader}>
                      <Text style={[styles.opEmoji]}>{v.emoji}</Text>
                      <Text
                        style={[styles.opLabel, { color: colors.foreground }]}
                      >
                        {v.label}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <View
                        style={[styles.statusDot, { backgroundColor: dot }]}
                      />
                      <Text
                        style={[
                          styles.opStatus,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {op.defused
                          ? "DÉSAMORCÉE"
                          : op.resolved
                            ? "SUBIE"
                            : "EN COURS"}
                      </Text>
                    </View>
                    <Text
                      style={[styles.opDesc, { color: colors.mutedForeground }]}
                    >
                      {v.description}
                    </Text>
                    <Text
                      style={[styles.opMeta, { color: colors.mutedForeground }]}
                    >
                      {formatGameDayLabel(turnToGameDay(op.turn))} · sévérité{" "}
                      {op.severity}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Contre-mesures */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>
          CONTRE-MESURES PERMANENTES
        </Text>
        {warLocked ? (
          <Text style={[styles.empty, { color: colors.danger }]}>
            Trop tard pour la diplomatie ou le cyber civil — le pays
            est en état de guerre. Les contre-mesures sont gelées.
          </Text>
        ) : null}
        <View style={{ gap: 12 }}>
          {HYBRID_COUNTERMEASURES.map((cm) => {
            const used = (hp?.usedCountermeasures ?? []).includes(cm.id);
            const disabled = warLocked || !hp || used;
            return (
              <Pressable
                key={cm.id}
                disabled={disabled}
                onPress={() => handleCountermeasure(cm.id)}
                accessibilityRole="button"
                accessibilityLabel={`Contre-mesure : ${cm.label}. ${cm.costSummary}`}
                accessibilityHint={cm.description}
                accessibilityState={{ disabled, selected: used }}
                style={({ pressed }) => [
                  styles.cmCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: used ? colors.success : colors.border,
                    opacity: disabled && !used ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.cmThumbWrap}>
                  <Image
                    source={COUNTERMEASURE_IMAGES[cm.id]}
                    style={styles.cmThumb}
                    resizeMode="cover"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  {used ? (
                    <View style={styles.cmThumbBadge}>
                      <Feather name="check" size={11} color="#fff" />
                      <Text style={styles.cmThumbBadgeText}>APPLIQUÉE</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cmBody}>
                  <View style={styles.cmHeader}>
                    <Text style={styles.cmEmoji}>{cm.emoji}</Text>
                    <Text style={[styles.cmLabel, { color: colors.foreground }]}>
                      {cm.label}
                    </Text>
                  </View>
                  <Text
                    style={[styles.cmDesc, { color: colors.mutedForeground }]}
                  >
                    {cm.description}
                  </Text>
                  <Text
                    style={[
                      styles.cmCost,
                      { color: used ? colors.success : accent },
                    ]}
                  >
                    {cm.costSummary}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="arrow-left" size={14} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>
            Retour au tableau de bord
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  threatHeader: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  actorBannerWrap: {
    width: "100%",
    height: 140,
    overflow: "hidden",
  },
  actorBanner: {
    width: "100%",
    height: "100%",
  },
  threatBody: {
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  threatLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  actorName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  actorDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  aggression: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  aggBarTrack: {
    height: 8,
    backgroundColor: "rgba(120,120,120,0.25)",
    borderRadius: 4,
    overflow: "hidden",
  },
  aggBarFill: {
    height: "100%",
  },
  section: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 10,
  },
  empty: {
    fontSize: 13,
    fontStyle: "italic",
  },
  opCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  opThumbWrap: {
    width: "100%",
    height: 90,
    overflow: "hidden",
  },
  opThumb: {
    width: "100%",
    height: "100%",
  },
  opBody: {
    padding: 12,
    gap: 6,
  },
  opCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  opEmoji: {
    fontSize: 16,
  },
  opLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  opStatus: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  opDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  opMeta: {
    fontSize: 11,
  },
  cmCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cmThumbWrap: {
    width: "100%",
    height: 110,
    position: "relative",
  },
  cmThumb: {
    width: "100%",
    height: "100%",
  },
  cmThumbBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(22,163,74,0.9)",
  },
  cmThumbBadgeText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  cmBody: {
    padding: 12,
    gap: 6,
  },
  cmHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cmEmoji: {
    fontSize: 18,
  },
  cmLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  cmDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  cmCost: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  backLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
