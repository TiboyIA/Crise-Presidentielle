import React, { useState } from "react";
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useAuth } from "@/context/AuthContext";
import { startRankedRun, setRankedIntended } from "@/services/RankedService";
import { BG } from "@/constants/assets";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { GovernanceDoctrine } from "@/types/strategy";

type Step = "home" | "name" | "doctrine";

interface DoctrineOption {
  label: string;
  subtitle: string;
  doctrine: GovernanceDoctrine;
  icon: string;
  color: string;
}

const DOCTRINE_OPTIONS: DoctrineOption[] = [
  { label: "Réformateur", subtitle: "Dialogue, transparence, libertés civiles", doctrine: "democratique",    icon: "⚖️", color: "#4a9fff" },
  { label: "Protecteur",  subtitle: "Sécurité nationale, ordre public, frontières", doctrine: "securitaire",   icon: "🛡️", color: "#e54848" },
  { label: "Bâtisseur",  subtitle: "Infrastructures, industrie, long terme",       doctrine: "technocratique", icon: "🏗️", color: "#3fbe7a" },
  { label: "Technocrate", subtitle: "Expertise, données, modernisation de l'État",  doctrine: "technocratique", icon: "🤖", color: "#a78bfa" },
  { label: "Populaire",  subtitle: "Proximité, aides sociales, écoute du peuple",  doctrine: "populiste",      icon: "🗣️", color: "#e8a93a" },
];

export default function StartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, loaded, startNewGame } = useStrategy();
  const auth = useAuth();

  const [step, setStep] = useState<Step>("home");
  const [playerName, setPlayerName] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [rankedMode, setRankedMode] = useState(false);

  if (!loaded) return null;

  const hasSave = state !== null;

  const handleContinue = () => {
    router.replace("/nation");
  };

  const handleNewGame = () => {
    setStep("name");
  };

  const handleTutorial = () => {
    router.push("/tutorial");
  };

  const handleNameNext = () => {
    if (playerName.trim().length < 2) return;
    setStep("doctrine");
  };

  const handleDoctrineSelect = (label: string) => {
    setSelectedLabel(label);
  };

  const handleConfirmDoctrine = async () => {
    if (!selectedLabel) return;
    const opt = DOCTRINE_OPTIONS.find((o) => o.label === selectedLabel);
    if (!opt) return;
    startNewGame(playerName.trim(), opt.doctrine);
    if (rankedMode && auth.isEnabled && auth.accessToken) {
      setRankedIntended(true);
      const run = await startRankedRun(auth.accessToken, "france", opt.doctrine, playerName.trim());
      if (!run) {
        Alert.alert(
          "Mode classé indisponible",
          "Impossible de joindre le serveur. Cette partie sera enregistrée dans votre progression, mais non éligible au classement mondial.",
          [{ text: "Continuer", style: "default" }],
        );
      }
    }
    router.replace("/nation");
  };

  return (
    <ImageBackground source={BG.investiture} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(6,8,16,0.35)", "rgba(6,8,16,0.55)", "rgba(6,8,16,0.92)", "#04060a"]}
        locations={[0, 0.35, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(192,57,43,0.08)", "rgba(192,57,43,0)"]}
        style={[StyleSheet.absoluteFill, { height: "60%" }]}
      />

      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 36 }]}>
        {/* Header — always visible */}
        <View style={styles.header}>
          <View style={styles.crestFrame}>
            <View style={styles.crestCorner1} />
            <View style={styles.crestCorner2} />
            <View style={styles.crestCorner3} />
            <View style={styles.crestCorner4} />
            <Text style={styles.emblem}>⚜</Text>
          </View>
          <Text style={styles.republic}>RÉPUBLIQUE · COMMANDEMENT</Text>
          <View style={styles.titleBlock}>
            <View style={styles.sideRule} />
            <Text style={styles.title}>PRÉSIDENT</Text>
            <View style={styles.sideRule} />
          </View>
          <View style={styles.crisisLine}>
            <Text style={styles.crisisDot}>·</Text>
            <Text style={styles.crisis}>NATION EN CRISE</Text>
            <Text style={styles.crisisDot}>·</Text>
          </View>
          <Text style={styles.tagline}>UNE GUERRE HYBRIDE EST EN COURS</Text>
        </View>

        {/* Body — varies by step */}
        {step === "home" && (
          <HomeBody
            hasSave={hasSave}
            onContinue={handleContinue}
            onNewGame={handleNewGame}
            onTutorial={handleTutorial}
          />
        )}

        {step === "name" && (
          <NameBody
            playerName={playerName}
            onChangeName={setPlayerName}
            onNext={handleNameNext}
            onBack={() => setStep("home")}
          />
        )}

        {step === "doctrine" && (
          <DoctrineBody
            selectedLabel={selectedLabel}
            rankedMode={rankedMode}
            rankedAvailable={auth.isEnabled && auth.isReady}
            onSelect={handleDoctrineSelect}
            onToggleRanked={() => setRankedMode((v) => !v)}
            onConfirm={handleConfirmDoctrine}
            onBack={() => setStep("name")}
          />
        )}

        <Text style={styles.version}>v1.0.0 · PRÉSIDENT : NATION EN CRISE</Text>
      </View>
    </ImageBackground>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HomeBody({
  hasSave,
  onContinue,
  onNewGame,
  onTutorial,
}: {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onTutorial: () => void;
}) {
  return (
    <View style={styles.homeBody}>
      <View style={styles.features}>
        {[
          "Diriger une puissance mondiale",
          "Maîtriser la salle de crise",
          "Engager des opérations couverte",
          "Imposer votre rang sur l'échiquier",
        ].map((label) => (
          <View key={label} style={styles.featureRow}>
            <View style={styles.featureBullet} />
            <Text style={styles.featureItem}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {hasSave && (
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [styles.btnWrap, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={["#1a3050", "#0d2035"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.mainBtn}
            >
              <View style={styles.btnRule} />
              <Text style={styles.mainBtnText}>CONTINUER LA PARTIE</Text>
              <View style={styles.btnRule} />
            </LinearGradient>
          </Pressable>
        )}

        <Pressable
          onPress={onNewGame}
          style={({ pressed }) => [styles.btnWrap, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
        >
          <LinearGradient
            colors={["#d04030", PALETTE.crimsonDim]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.mainBtn}
          >
            <View style={styles.btnRule} />
            <Text style={styles.mainBtnText}>{hasSave ? "NOUVELLE PARTIE" : "ENTRER EN FONCTION"}</Text>
            <View style={styles.btnRule} />
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onTutorial}
          style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.55 : 1 }]}
        >
          <Text style={styles.cancelText}>📖  Revoir le tutoriel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NameBody({
  playerName,
  onChangeName,
  onNext,
  onBack,
}: {
  playerName: string;
  onChangeName: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canNext = playerName.trim().length >= 2;
  return (
    <View style={styles.nameBody}>
      <View style={styles.inputSection}>
        <Text style={styles.stepLabel}>ÉTAPE 1 / 2 — IDENTITÉ</Text>
        <Text style={styles.inputLabel}>VOTRE NOM DE PRÉSIDENT</Text>
        <TextInput
          style={styles.input}
          placeholder="ex. Emmanuel Martin"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={playerName}
          onChangeText={onChangeName}
          maxLength={30}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={onNext}
        />
        <Text style={styles.inputHint}>Le serment d'investiture vous engage devant la Nation.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onNext}
          disabled={!canNext}
          style={({ pressed }) => [styles.btnWrap, { opacity: pressed && canNext ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={canNext ? ["#d04030", PALETTE.crimsonDim] : ["#222a36", "#10141c"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.mainBtn}
          >
            <View style={styles.btnRule} />
            <Text style={[styles.mainBtnText, !canNext && { color: PALETTE.textLow }]}>SUIVANT →</Text>
            <View style={styles.btnRule} />
          </LinearGradient>
        </Pressable>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.55 : 1 }]}>
          <Text style={styles.cancelText}>← Retour</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DoctrineBody({
  selectedLabel,
  rankedMode,
  rankedAvailable,
  onSelect,
  onToggleRanked,
  onConfirm,
  onBack,
}: {
  selectedLabel: string | null;
  rankedMode: boolean;
  rankedAvailable: boolean;
  onSelect: (label: string) => void;
  onToggleRanked: () => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.doctrineBody}>
      <Text style={styles.stepLabel}>ÉTAPE 2 / 2 — DOCTRINE</Text>
      <Text style={styles.doctrineSubtitle}>Choisissez votre style de gouvernance</Text>

      <ScrollView
        style={styles.doctrineScroll}
        contentContainerStyle={styles.doctrineList}
        showsVerticalScrollIndicator={false}
      >
        {DOCTRINE_OPTIONS.map((opt) => {
          const active = selectedLabel === opt.label;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onSelect(opt.label)}
              style={({ pressed }) => [
                styles.doctrineCard,
                active && { borderColor: opt.color, backgroundColor: opt.color + "18" },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.doctrineIcon}>{opt.icon}</Text>
              <View style={styles.doctrineText}>
                <Text style={[styles.doctrineName, active && { color: opt.color }]}>{opt.label}</Text>
                <Text style={styles.doctrineDesc}>{opt.subtitle}</Text>
              </View>
              {active && <View style={[styles.doctrineCheck, { backgroundColor: opt.color }]} />}
            </Pressable>
          );
        })}

        {rankedAvailable && (
          <Pressable onPress={onToggleRanked} style={[styles.rankedToggle, rankedMode && styles.rankedToggleActive]}>
            <View style={[styles.rankedDot, rankedMode && styles.rankedDotActive]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rankedLabel, rankedMode && { color: PALETTE.gold }]}>MODE CLASSÉ</Text>
              <Text style={styles.rankedDesc}>Score soumis au classement mondial en fin de partie</Text>
            </View>
            <Text style={{ fontSize: 14, color: rankedMode ? PALETTE.gold : PALETTE.textLow }}>
              {rankedMode ? "✓" : "○"}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={onConfirm}
          disabled={selectedLabel === null}
          style={({ pressed }) => [styles.btnWrap, { opacity: pressed && selectedLabel !== null ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={selectedLabel !== null ? ["#d04030", PALETTE.crimsonDim] : ["#222a36", "#10141c"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.mainBtn}
          >
            <View style={styles.btnRule} />
            <Text style={[styles.mainBtnText, selectedLabel === null && { color: PALETTE.textLow }]}>PRÊTER SERMENT</Text>
            <View style={styles.btnRule} />
          </LinearGradient>
        </Pressable>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.55 : 1 }]}>
          <Text style={styles.cancelText}>← Retour</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GOLD = PALETTE.goldDim;

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },

  header: { alignItems: "center", gap: 8 },
  crestFrame: { width: 76, height: 76, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  crestCorner1: { position: "absolute", top: 0, left: 0, width: 14, height: 14, borderTopWidth: 1, borderLeftWidth: 1, borderColor: PALETTE.gold + "88" },
  crestCorner2: { position: "absolute", top: 0, right: 0, width: 14, height: 14, borderTopWidth: 1, borderRightWidth: 1, borderColor: PALETTE.gold + "88" },
  crestCorner3: { position: "absolute", bottom: 0, left: 0, width: 14, height: 14, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: PALETTE.gold + "88" },
  crestCorner4: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderBottomWidth: 1, borderRightWidth: 1, borderColor: PALETTE.gold + "88" },
  emblem: { fontSize: 38, color: PALETTE.gold },

  republic: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 4, color: PALETTE.gold, opacity: 0.85 },
  titleBlock: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  sideRule: { width: 36, height: 1, backgroundColor: GOLD },
  title: { fontSize: 46, fontFamily: FONT.bold, letterSpacing: 11, color: "#FFFFFF" },
  crisisLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  crisisDot: { fontSize: 16, color: PALETTE.crimson },
  crisis: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 5, color: PALETTE.crimson },
  tagline: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 4, color: PALETTE.textMid, marginTop: 8 },

  version: { fontSize: 9, fontFamily: FONT.med, textAlign: "center", color: "rgba(255,255,255,0.25)", letterSpacing: 2 },

  // Home
  homeBody: { gap: 20 },
  features: { gap: 12, paddingHorizontal: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureBullet: { width: 4, height: 4, backgroundColor: PALETTE.gold, transform: [{ rotate: "45deg" }] },
  featureItem: { fontSize: 13, fontFamily: FONT.med, color: "rgba(255,255,255,0.7)", letterSpacing: 0.4, lineHeight: 18 },

  // Name
  nameBody: { gap: 20 },
  inputSection: { gap: 10 },
  stepLabel: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 3, color: PALETTE.textLow, textAlign: "center" },
  inputLabel: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 3, color: PALETTE.gold, textAlign: "center" },
  input: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.gold + "55",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: FONT.reg,
    color: "#fff", textAlign: "center",
    letterSpacing: 0.5,
  },
  inputHint: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", fontStyle: "italic" },

  // Doctrine
  doctrineBody: { flex: 1, gap: 10 },
  doctrineSubtitle: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, textAlign: "center", letterSpacing: 0.5 },
  doctrineScroll: { flex: 1 },
  doctrineList: { gap: 8, paddingVertical: 4 },
  doctrineCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  doctrineIcon: { fontSize: 22 },
  doctrineText: { flex: 1, gap: 2 },
  doctrineName: { fontSize: 13, fontFamily: FONT.bold, color: "#fff", letterSpacing: 0.5 },
  doctrineDesc: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14 },
  doctrineCheck: { width: 8, height: 8, borderRadius: 4 },
  rankedToggle: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 4,
  },
  rankedToggleActive: {
    borderColor: PALETTE.gold + "66",
    backgroundColor: PALETTE.gold + "0d",
  },
  rankedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE.textLow },
  rankedDotActive: { backgroundColor: PALETTE.gold },
  rankedLabel: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 2 },
  rankedDesc: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2, lineHeight: 13 },

  // Shared actions
  actions: { gap: 10 },
  btnWrap: { borderRadius: RADIUS.sm, overflow: "hidden" },
  mainBtn: { paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 12 },
  mainBtnText: { color: "#fff", fontSize: 13, fontFamily: FONT.bold, letterSpacing: 3.5 },
  btnRule: { width: 16, height: 1, backgroundColor: "rgba(255,255,255,0.5)" },
  cancelBtn: { paddingVertical: 6, alignItems: "center" },
  cancelText: { fontSize: 12, fontFamily: FONT.med, color: PALETTE.textMid, letterSpacing: 0.5 },
});
