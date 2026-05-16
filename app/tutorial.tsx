import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { setTutorialSeen } from "@/storage/tutorialStorage";
import {
  TUTORIAL_IMAGES,
  TutorialStepKey,
} from "@/data/tutorialImages";

interface Step {
  key: TutorialStepKey;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    key: "gauges",
    icon: "activity",
    label: "ÉTAPE 1 / 3",
    title: "Surveille les jauges",
    body:
      "11 jauges visibles : popularité, économie, sécurité, écologie… Et des jauges cachées qui se révèlent quand la crise approche. Garde un œil partout.",
  },
  {
    key: "consequences",
    icon: "eye-off",
    label: "ÉTAPE 2 / 3",
    title: "Chaque choix a des conséquences cachées",
    body:
      "Sauver une entreprise rassure aujourd'hui, mais creuse la dette demain. Un choix peut déclencher un scandale ou une crise plusieurs jours de jeu plus tard.",
  },
  {
    key: "election",
    icon: "award",
    label: "ÉTAPE 3 / 3",
    title: "Survis jusqu'à l'élection",
    body:
      "60 jours de jeu. 5 saisons. À la fin du mandat, le peuple juge tes promesses tenues, tes scandales, et te dit s'il te renouvelle… ou pas.",
  },
];

export default function TutorialScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(0);

  const isLandscape = width > height;
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const topPad = insets.top + webTopInset;

  const finish = async () => {
    await setTutorialSeen(true);
    router.replace("/");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void finish();
    }
  };

  const skip = () => {
    void finish();
  };

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const topBar = (
    <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
      <View style={[styles.kickerWrap, { borderColor: colors.primary }]}>
        <Text style={[styles.kicker, { color: colors.primary }]}>
          {current.label}
        </Text>
      </View>
      {!isLast ? (
        <Pressable
          onPress={skip}
          hitSlop={12}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Passer le tutoriel"
        >
          <Text style={styles.skip}>PASSER</Text>
        </Pressable>
      ) : (
        <View />
      )}
    </View>
  );

  const bodyContent = (
    <>
      <View style={[styles.iconRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={current.icon} size={20} color={colors.primary} />
        <Text style={[styles.iconRowText, { color: colors.mutedForeground }]}>
          REPÈRE-CLÉ
        </Text>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {current.title}
      </Text>
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        {current.body}
      </Text>
    </>
  );

  const footer = (
    <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === step ? colors.primary : colors.muted,
                width: i === step ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>
      <Pressable
        onPress={next}
        accessibilityRole="button"
        accessibilityLabel={isLast ? "Commencer le jeu" : "Étape suivante"}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
          {isLast ? "COMMENCER" : "SUIVANT"}
        </Text>
        <Feather
          name={isLast ? "play" : "arrow-right"}
          size={16}
          color={colors.primaryForeground}
        />
      </Pressable>
    </View>
  );

  if (isLandscape) {
    return (
      <View style={[styles.container, styles.containerRow, { backgroundColor: colors.background }]}>
        {/* Left: hero image column */}
        <View style={styles.heroWrapLandscape}>
          <Image
            source={TUTORIAL_IMAGES[current.key]}
            style={styles.heroImg}
            resizeMode="cover"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <LinearGradient
            colors={["rgba(7,11,20,0.55)", "rgba(7,11,20,0.2)", "rgba(7,11,20,0.95)"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {topBar}
        </View>

        {/* Right: content column */}
        <View style={styles.rightColLandscape}>
          <ScrollView
            style={styles.bodyScrollView}
            contentContainerStyle={[styles.bodyScroll, styles.bodyScrollLandscape]}
            showsVerticalScrollIndicator={false}
          >
            {bodyContent}
          </ScrollView>
          {footer}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.heroWrap}>
        <Image
          source={TUTORIAL_IMAGES[current.key]}
          style={styles.heroImg}
          resizeMode="cover"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <LinearGradient
          colors={["rgba(7,11,20,0.55)", "rgba(7,11,20,0.2)", "rgba(7,11,20,0.95)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {topBar}
      </View>

      <ScrollView
        style={styles.bodyScrollView}
        contentContainerStyle={styles.bodyScroll}
        showsVerticalScrollIndicator={false}
      >
        {bodyContent}
      </ScrollView>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerRow: {
    flexDirection: "row",
  },
  heroWrap: {
    width: "100%",
    height: 280,
    position: "relative",
    overflow: "hidden",
  },
  heroWrapLandscape: {
    width: "40%",
    alignSelf: "stretch",
    overflow: "hidden",
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  kickerWrap: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "rgba(7,11,20,0.55)",
  },
  kicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  skipBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(7,11,20,0.55)",
  },
  skip: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.85)",
  },
  rightColLandscape: {
    flex: 1,
  },
  bodyScrollView: {
    flex: 1,
  },
  bodyScroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 14,
  },
  bodyScrollLandscape: {
    paddingTop: 20,
    justifyContent: "center",
  },
  iconRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  iconRowText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 18,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  cta: {
    paddingVertical: 16,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
