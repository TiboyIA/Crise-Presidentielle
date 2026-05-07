import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame, Gauges } from "@/context/GameContext";
import { formatMandateLabel, turnToMonth } from "@/logic/timeEngine";
import { GAUGE_LABELS } from "@/logic/gameEngine";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GO_VICTORY = require("@/assets/images/screens/game_over_victory.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GO_DEFEAT = require("@/assets/images/screens/game_over_defeat.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GO_COLLAPSE = require("@/assets/images/screens/game_over_collapse.png");

export default function GameOverScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, resetGame } = useGame();
  const [isSharing, setIsSharing] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const isVictory = !!state.gameOver.victory;
  const accent = isVictory ? colors.gold : colors.danger;

  // Image dynamique :
  // - défaite militaire → effondrement (collapse)
  // - victoire → victoire (parade républicaine)
  // - autre défaite → defeat (cabinet vide / mandat brisé)
  const heroImage =
    state.warState?.outcome === "defeat"
      ? GO_COLLAPSE
      : isVictory
        ? GO_VICTORY
        : GO_DEFEAT;

  // Module 6 — fin de mandat liée à un conflit conventionnel.
  // On lit `warState.outcome` (préservé par `endWar`) pour
  // distinguer victoire militaire / défaite militaire / trêve.
  // `null` = la fin de partie n'a aucun rapport avec la guerre.
  const warOutcome = state.warState?.outcome ?? null;
  const kickerLabel = warOutcome
    ? warOutcome === "victory"
      ? "VICTOIRE MILITAIRE"
      : warOutcome === "defeat"
        ? "DÉFAITE MILITAIRE"
        : "TRÊVE FORCÉE"
    : isVictory
      ? "FIN DE MANDAT"
      : "MANDAT INTERROMPU";
  const kickerIcon: React.ComponentProps<typeof Feather>["name"] = warOutcome
    ? warOutcome === "victory"
      ? "shield"
      : warOutcome === "defeat"
        ? "alert-octagon"
        : "flag"
    : isVictory
      ? "award"
      : "alert-octagon";

  // End-of-mandate tactile finale: heavy success rumble for victory,
  // error pattern for collapse. Fires once on mount.
  useEffect(() => {
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(
      isVictory
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    // We only want this on first render of the final screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await resetGame();
    router.replace("/create");
  };

  const handleHome = async () => {
    await resetGame();
    router.replace("/");
  };

  // Native share sheet — iOS / Android use the OS share UI; web falls
  // back to the Web Share API (mobile browsers) or a clipboard fallback.
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const presidentLabel = state.president
        ? `${state.president.name} (${state.president.party})`
        : "Président anonyme";
      const verdict = isVictory
        ? "Mandat accompli."
        : "Mandat interrompu.";
      const headline = state.gameOver.title ?? "Fin de partie";
      const popularity = Math.round(state.gauges.popularity);
      const economy = Math.round(state.gauges.economy);
      const security = Math.round(state.gauges.security);
      const ecology = Math.round(state.gauges.ecology);
      const message = [
        `🇫🇷 ÉTAT DE CRISE — ${headline}`,
        "",
        `${verdict} ${presidentLabel}, ${formatMandateLabel(
          state.gameTime?.currentMonth ?? turnToMonth(state.turn),
        ).toLowerCase()}.`,
        `Popularité ${popularity} · Économie ${economy} · Sécurité ${security} · Écologie ${ecology}`,
        `${state.log.length} décisions historiques.`,
        "",
        "Mon tour de présider la France 2035 → essayez le vôtre.",
      ].join("\n");
      const title = `Président : Nation en Crise — ${headline}`;

      if (Platform.OS === "web") {
        const nav =
          typeof navigator !== "undefined" ? (navigator as Navigator) : null;
        if (nav && typeof nav.share === "function") {
          try {
            await nav.share({ title, text: message });
          } catch {
            // User dismissed — silent.
          }
        } else if (
          nav &&
          nav.clipboard &&
          typeof nav.clipboard.writeText === "function"
        ) {
          await nav.clipboard.writeText(message);
          if (typeof window !== "undefined") {
            window.alert("Bilan copié dans le presse-papier.");
          }
        } else if (typeof window !== "undefined") {
          window.prompt("Copiez votre bilan :", message);
        }
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Share.share({ title, message });
    } catch (e) {
      console.warn("Share failed:", e);
      Alert.alert("Partage indisponible", "Réessayez dans un instant.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + webBottomInset + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroWrap, { backgroundColor: colors.card }]}>
          <Image
            source={heroImage}
            style={styles.heroImage}
            resizeMode="cover"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <LinearGradient
            colors={["rgba(7,12,30,0)", "rgba(7,12,30,0.55)", "rgba(7,12,30,0.95)"]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              styles.heroContent,
              { paddingTop: insets.top + webTopInset + 24 },
            ]}
          >
            <View style={[styles.kickerRow, { borderColor: accent }]}>
              <Feather name={kickerIcon} size={14} color={accent} />
              <Text style={[styles.kicker, { color: accent }]}>
                {kickerLabel}
              </Text>
            </View>
            <Text style={[styles.title, { color: "#fff" }]}>
              {state.gameOver.title ?? "Terminé"}
            </Text>
            <View style={[styles.divider, { backgroundColor: accent }]} />
            <Text style={[styles.reason, { color: "rgba(255,255,255,0.92)" }]}>
              {state.gameOver.reason}
            </Text>
          </View>
        </View>

        <View style={[styles.contentPad, { gap: 18 }]}>
        {state.president ? (
          <View
            style={[
              styles.presidentCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
              PRÉSIDENT EN EXERCICE
            </Text>
            <Text style={[styles.presidentName, { color: colors.foreground }]}>
              {state.president.name}
            </Text>
            <Text style={[styles.presidentMeta, { color: colors.mutedForeground }]}>
              {state.president.party} · {state.president.age} ans
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            BILAN FINAL — {formatMandateLabel(
              state.gameTime?.currentMonth ?? turnToMonth(state.turn),
            ).toUpperCase()}
          </Text>
          <View style={styles.statsGrid}>
            {(Object.keys(GAUGE_LABELS) as (keyof Gauges)[]).map((key) => (
              <View key={key} style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {GAUGE_LABELS[key]}
                </Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {Math.round(state.gauges[key])}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            DÉCISIONS PRISES
          </Text>
          <Text style={[styles.bigStat, { color: colors.foreground }]}>
            {state.log.length}
          </Text>
          <Text style={[styles.cardSubtle, { color: colors.mutedForeground }]}>
            décisions historiques sont entrées dans les archives.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleRestart}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <Text
              style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
            >
              REJOUER
            </Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            disabled={isSharing}
            style={({ pressed }) => [
              styles.shareBtn,
              {
                borderColor: accent,
                opacity: pressed || isSharing ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="share-2" size={15} color={accent} />
            <Text style={[styles.shareBtnText, { color: accent }]}>
              {isSharing ? "OUVERTURE…" : "PARTAGER MON BILAN"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleHome}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
              Retour à l'accueil
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    gap: 18,
  },
  heroWrap: {
    width: "100%",
    minHeight: 320,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroContent: {
    position: "relative",
    paddingHorizontal: 24,
    paddingBottom: 28,
    minHeight: 320,
    justifyContent: "flex-end",
    gap: 10,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "rgba(7,12,30,0.55)",
  },
  kicker: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  divider: {
    width: 50,
    height: 3,
  },
  reason: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  contentPad: {
    paddingHorizontal: 24,
  },
  presidentCard: {
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  presidentName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  presidentMeta: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  statsCard: {
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    gap: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statItem: {
    flexBasis: "31%",
    flexGrow: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  bigStat: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  cardSubtle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 8,
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
  shareBtn: {
    paddingVertical: 14,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
