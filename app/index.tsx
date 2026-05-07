import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { getTutorialSeen } from "@/storage/tutorialStorage";
import { formatMandateLabel, turnToMonth } from "@/logic/timeEngine";
import { gaugeColor } from "@/logic/utils";
import {
  HOME_LINK_ICONS,
  MANDATE_SEAL,
  SPLASH_BG,
} from "@/data/homeImages";

interface MiniGaugeProps {
  label: string;
  value: number;
  mutedColor: string;
  foregroundColor: string;
  trackColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
}

function MiniGauge({
  label,
  value,
  mutedColor,
  foregroundColor,
  trackColor,
  successColor,
  warningColor,
  dangerColor,
}: MiniGaugeProps) {
  const status = gaugeColor(value);
  const barColor =
    status === "danger"
      ? dangerColor
      : status === "warning"
        ? warningColor
        : successColor;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.miniGauge}>
      <View style={styles.miniGaugeHeader}>
        <Text style={[styles.miniGaugeLabel, { color: mutedColor }]}>
          {label}
        </Text>
        <Text style={[styles.miniGaugeValue, { color: foregroundColor }]}>
          {Math.round(value)}
        </Text>
      </View>
      <View style={[styles.miniGaugeTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.miniGaugeFill,
            { width: `${clamped}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasSavedGame, state, loaded, resetGame } = useGame();
  const [tutorialChecked, setTutorialChecked] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  // Easter egg: 5 taps on the title within 2s opens the dev-only debug
  // screen. Production bundles compile out the navigation entirely.
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTitleTap = useCallback(() => {
    if (!__DEV__) return;
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      router.push("/debug");
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);
  }, [router]);
  useEffect(
    () => () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    },
    [],
  );

  // First-launch redirect: if no save exists AND tutorial has never been
  // seen, push the user through the 3-screen tutorial. Returning players
  // (with a save) keep their existing flow untouched.
  useEffect(() => {
    if (!loaded || tutorialChecked) return;
    let cancelled = false;
    (async () => {
      const seen = await getTutorialSeen();
      if (cancelled) return;
      setTutorialChecked(true);
      if (!seen && !hasSavedGame) {
        router.replace("/tutorial");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, hasSavedGame, tutorialChecked, router]);

  if (!loaded || !tutorialChecked) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={SPLASH_BG}
        style={styles.bgImage}
        resizeMode="cover"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={[styles.overlay, { backgroundColor: "rgba(10,12,14,0.78)" }]} />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + webTopInset + 20,
            paddingBottom: insets.bottom + webBottomInset + 24,
          },
        ]}
      >
        <View style={styles.topBlock}>
          <View style={styles.alertRow}>
            <View style={[styles.alertDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.alertText, { color: colors.primary }]}>
              CONFIDENTIEL — NIVEAU 1
            </Text>
          </View>
          <Text style={[styles.year, { color: colors.mutedForeground }]}>
            ANNÉE 2035
          </Text>
        </View>

        <View style={styles.heroBlock}>
          <Pressable onPress={onTitleTap} hitSlop={4}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              ÉTAT DE
            </Text>
            <Text style={[styles.titleAccent, { color: colors.primary }]}>
              CRISE
            </Text>
          </Pressable>
          <Text style={[styles.subtitle, { color: colors.foreground }]}>
            PRÉSIDENT 2035
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.primary }]} />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Vous entrez à l'Élysée. Le pays vacille. Chaque décision compte.
          </Text>
        </View>

        <View style={styles.actionBlock}>
          {hasSavedGame && state.president && !state.gameOver.isOver ? (
            <>
              <View
                style={[
                  styles.mandateCard,
                  {
                    backgroundColor: "rgba(10,12,14,0.55)",
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.mandateHeader}>
                  <Image
                    source={MANDATE_SEAL}
                    style={styles.mandateSeal}
                    resizeMode="cover"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <View style={styles.mandateInfo}>
                    <Text
                      style={[
                        styles.mandateName,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {state.president.name}
                    </Text>
                    <Text
                      style={[
                        styles.mandateMonth,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {formatMandateLabel(
                        state.gameTime?.currentMonth ??
                          turnToMonth(state.turn),
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.mandateGauges}>
                  <MiniGauge
                    label="POP"
                    value={state.gauges.popularity}
                    mutedColor={colors.mutedForeground}
                    foregroundColor={colors.foreground}
                    trackColor="rgba(255,255,255,0.08)"
                    successColor={colors.success}
                    warningColor={colors.warning}
                    dangerColor={colors.danger}
                  />
                  <MiniGauge
                    label="ÉCO"
                    value={state.gauges.economy}
                    mutedColor={colors.mutedForeground}
                    foregroundColor={colors.foreground}
                    trackColor="rgba(255,255,255,0.08)"
                    successColor={colors.success}
                    warningColor={colors.warning}
                    dangerColor={colors.danger}
                  />
                  <MiniGauge
                    label="AUT"
                    value={state.gauges.authority}
                    mutedColor={colors.mutedForeground}
                    foregroundColor={colors.foreground}
                    trackColor="rgba(255,255,255,0.08)"
                    successColor={colors.success}
                    warningColor={colors.warning}
                    dangerColor={colors.danger}
                  />
                </View>
              </View>
              <Pressable
                onPress={() => router.replace("/dashboard")}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="play" size={16} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  REPRENDRE LE MANDAT
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await resetGame();
                  router.push("/create");
                }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                  Nouveau mandat
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => router.push("/create")}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  PRENDRE LE POUVOIR
                </Text>
              </Pressable>
              <Text style={[styles.savedHint, { color: colors.mutedForeground }]}>
                Mandat de 5 ans — 60 mois de crises à gérer
              </Text>
            </>
          )}

          <View style={styles.linkRow}>
            <Pressable
              onPress={() => router.push("/tutorial")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.howToBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Image
                source={HOME_LINK_ICONS.play}
                style={styles.howToIcon}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text
                style={[styles.howToText, { color: colors.mutedForeground }]}
              >
                COMMENT JOUER
              </Text>
            </Pressable>

            <View
              style={[
                styles.linkSeparator,
                { backgroundColor: colors.mutedForeground },
              ]}
            />

            <Pressable
              onPress={() => router.push("/stats")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.howToBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Image
                source={HOME_LINK_ICONS.stats}
                style={styles.howToIcon}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text
                style={[styles.howToText, { color: colors.mutedForeground }]}
              >
                STATISTIQUES
              </Text>
            </Pressable>

            <View
              style={[
                styles.linkSeparator,
                { backgroundColor: colors.mutedForeground },
              ]}
            />

            <Pressable
              onPress={() => router.push("/shop")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.howToBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Image
                source={HOME_LINK_ICONS.shop}
                style={styles.howToIcon}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text
                style={[styles.howToText, { color: colors.mutedForeground }]}
              >
                BOUTIQUE
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  topBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  year: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  heroBlock: {
    alignItems: "flex-start",
  },
  title: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
    lineHeight: 56,
  },
  titleAccent: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    marginTop: 12,
  },
  divider: {
    width: 50,
    height: 3,
    marginTop: 16,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    maxWidth: 320,
  },
  actionBlock: {
    gap: 12,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  savedHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 4,
  },
  linkSeparator: {
    width: 1,
    height: 12,
    opacity: 0.3,
  },
  howToBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  howToIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  howToText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  mandateCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
  },
  mandateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mandateSeal: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  mandateInfo: {
    flex: 1,
    gap: 2,
  },
  mandateName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  mandateMonth: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  mandateGauges: {
    flexDirection: "row",
    gap: 10,
  },
  miniGauge: {
    flex: 1,
    gap: 4,
  },
  miniGaugeHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  miniGaugeLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  miniGaugeValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  miniGaugeTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniGaugeFill: {
    height: "100%",
    borderRadius: 2,
  },
});
