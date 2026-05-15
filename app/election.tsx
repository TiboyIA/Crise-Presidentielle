import React, { useCallback, useMemo } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { OppositionAttackPanel } from "@/components/OppositionAttackPanel";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import {
  applyFinalDebateModifier,
  coerceStrategy,
  computeStrategyModifier,
  getStrategyMeta,
  selectFinalDebateDecisions,
  STRATEGIES,
  STRATEGY_META,
} from "@/lib/finalDebate";
import { formatGameDayLabel, turnToGameDay } from "@/logic/timeEngine";
import { ELECTION_IMAGES, STRATEGY_IMAGES } from "@/data/electionImages";
import type {
  FinalDebateAttack,
  FinalDebateDecision,
  FinalDebateStrategy,
} from "@/types/game";

// ----- Fictional opposition challenger ---------------------------------
// Stable, generic, NEVER references a real person. The name is picked
// deterministically from the player's seed so the same game always
// faces the same fictional opponent.
const FICTIONAL_OPPONENTS = [
  { name: "Hélène Vasseur", role: "Cheffe de file de l'opposition" },
  { name: "Romain Delcourt", role: "Candidat de l'opposition" },
  { name: "Camille Servan", role: "Cheffe de file de l'opposition" },
  { name: "Yannick Brossard", role: "Candidat de l'opposition" },
  { name: "Sarah Lemoyne", role: "Candidate de l'opposition" },
  { name: "Damien Faure", role: "Candidat de l'opposition" },
];

function pickOpponent(seed: string | null) {
  const s = seed ?? "default";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % FICTIONAL_OPPONENTS.length;
  return FICTIONAL_OPPONENTS[idx]!;
}

export default function ElectionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state,
    resetGame,
    startSecondTerm,
    setFinalDebateChoice,
  } = useGame();

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const result = state.electionResult;

  const opponent = useMemo(
    () => pickOpponent(state.president?.name ?? null),
    [state.president?.name],
  );

  // Always prefer the cached pack's decisions: they were "frozen" at
  // game-over time and persisting them in state means a screen re-mount
  // (or save reload) keeps the exact same 5 decisions.
  const computedFinalDecisions = useMemo<FinalDebateDecision[]>(() => {
    if (!result) return [];
    if (state.finalDebatePack) return state.finalDebatePack.decisions;
    return selectFinalDebateDecisions(state, 5);
  }, [result, state]);

  const finalChoices = state.finalDebateChoices ?? [];
  const finalChoiceById = useMemo(() => {
    const m = new Map<string, (typeof finalChoices)[number]>();
    for (const c of finalChoices) m.set(c.decisionId, c);
    return m;
  }, [finalChoices]);

  const finalAttacksById = useMemo(() => {
    const m = new Map<string, FinalDebateAttack>();
    if (state.finalDebatePack) {
      for (const a of state.finalDebatePack.attacks) m.set(a.decisionId, a);
    }
    return m;
  }, [state.finalDebatePack]);

  const showFinalDebate = computedFinalDecisions.length > 0;
  const allAnswered =
    showFinalDebate && finalChoices.length >= computedFinalDecisions.length;

  // The "displayed" election result includes the debate modifier once
  // all picks are in. Until then we show the baseline so the breakdown
  // panel below (which is also gated on allAnswered) stays consistent.
  const displayedResult = useMemo(() => {
    if (!result) return null;
    if (!allAnswered) return result;
    return applyFinalDebateModifier(result, finalChoices);
  }, [result, allAnswered, finalChoices]);

  const handleStrategyPick = useCallback(
    (decision: FinalDebateDecision, strategy: FinalDebateStrategy) => {
      if (allAnswered) return; // locked once all picks are in
      const modifier = computeStrategyModifier(decision, strategy, state);
      setFinalDebateChoice({
        decisionId: decision.decisionId,
        strategy,
        modifier,
      });
    },
    [allAnswered, state, setFinalDebateChoice],
  );

  const handleRestart = async () => {
    await resetGame();
    router.replace("/create");
  };

  const handleHome = async () => {
    await resetGame();
    router.replace("/");
  };

  // Continuation après ré-élection — garde le même président, le
  // cabinet et l'état du pays, et renvoie sur /dashboard avec
  // `turn = 1` et un évènement frais. L'horloge politique du 2nd
  // mandat repart à zéro mais le « monde » continue.
  const handleSecondTerm = () => {
    startSecondTerm();
    router.replace("/dashboard");
  };

  if (!result) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => router.replace("/")}
          style={[styles.fallbackBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.fallbackText, { color: colors.primaryForeground }]}>
            Retour à l'accueil
          </Text>
        </Pressable>
      </View>
    );
  }

  // While the final debate is in progress, hide the score and use a
  // neutral palette in the header so the headline doesn't spoil the
  // outcome before the player has finished arguing back.
  const finalDebateInProgress = showFinalDebate && !allAnswered;
  const finalReveal = displayedResult ?? result;
  const accent = finalDebateInProgress
    ? colors.foreground
    : finalReveal.reElected
      ? colors.success
      : colors.danger;
  const opponentShare = 100 - finalReveal.voteShare;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeroHeader
        source={ELECTION_IMAGES.debateHero}
        kicker="ÉLECTION PRÉSIDENTIELLE · RÉSULTATS"
        title={
          finalDebateInProgress
            ? "Le débat décidera de tout"
            : finalReveal.headline
        }
        subtitle={
          finalDebateInProgress
            ? "Le second tour démarre. Vos ripostes peuvent encore renverser le score."
            : undefined
        }
        accent={accent}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: 20,
            paddingBottom: insets.bottom + webBottomInset + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Réquisitoire persistant : liste des angles d'attaque accumulés
            tout au long du mandat. Retourne null s'il n'y a pas de ligne
            d'attaque (mandat irréprochable). */}
        <OppositionAttackPanel
          lines={state.attackLines ?? []}
          mode="election"
        />

        {/* ----- Module 5: interactive final presidential debate ------- */}
        {showFinalDebate && (
          <>
            <View style={styles.finalDebateHeaderRow}>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                DÉBAT PRÉSIDENTIEL FINAL
              </Text>
              <Text
                style={[
                  styles.finalProgress,
                  {
                    color: allAnswered ? colors.success : colors.foreground,
                    borderColor: allAnswered ? colors.success : colors.border,
                  },
                ]}
              >
                {finalChoices.length} / {computedFinalDecisions.length}
              </Text>
            </View>

            <Text
              style={[styles.finalIntro, { color: colors.mutedForeground }]}
            >
              L'opposition revient sur les décisions phares de votre mandat.
              Pour chacune, choisissez votre riposte. Chaque stratégie modifie
              votre score final.
            </Text>

            {computedFinalDecisions.map((decision, idx) => {
              const attack = finalAttacksById.get(decision.decisionId);
              const choice = finalChoiceById.get(decision.decisionId);
              return (
                <View
                  key={decision.decisionId}
                  style={[
                    styles.finalCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: choice ? colors.border : colors.border,
                    },
                  ]}
                >
                  <View style={styles.finalCardTopRow}>
                    <Text
                      style={[
                        styles.finalCardKicker,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      DÉCISION {idx + 1} · {formatGameDayLabel(turnToGameDay(decision.turn)).toUpperCase()}
                    </Text>
                    {(decision.hadScandal || decision.hadBrokenPromise) && (
                      <View
                        style={[
                          styles.finalCardTag,
                          { borderColor: colors.danger },
                        ]}
                      >
                        <Feather
                          name="alert-triangle"
                          size={9}
                          color={colors.danger}
                        />
                        <Text
                          style={[
                            styles.finalCardTagText,
                            { color: colors.danger },
                          ]}
                        >
                          {decision.hadScandal
                            ? "SCANDALE"
                            : "PROMESSE TRAHIE"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.finalCardTitle,
                      { color: colors.foreground },
                    ]}
                    numberOfLines={2}
                  >
                    {decision.eventTitle}
                  </Text>
                  <Text
                    style={[
                      styles.finalCardChoice,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Votre choix : « {decision.choiceLabel} »
                  </Text>

                  <View
                    style={[
                      styles.finalAttackBlock,
                      {
                        backgroundColor: colors.muted,
                        borderLeftColor: colors.danger,
                      },
                    ]}
                  >
                    <View style={styles.finalAttackHead}>
                      <Feather
                        name="user"
                        size={10}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.finalAttackName,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {opponent.name.toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.aiBadge,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.card,
                          },
                        ]}
                      >
                        <Feather
                          name="cpu"
                          size={8}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.aiBadgeText,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          IA
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.finalAttackLine,
                        { color: colors.cardForeground },
                      ]}
                    >
                      «{" "}
                      {typeof attack?.line === "string" &&
                      attack.line.trim().length > 0
                        ? attack.line
                        : "…"}{" "}
                      »
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.finalStrategyLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    VOTRE RIPOSTE
                  </Text>
                  <View style={styles.strategyGrid}>
                    {STRATEGIES.map((strategy) => {
                      const meta = STRATEGY_META[strategy];
                      const selected =
                        choice && coerceStrategy(choice.strategy) === strategy;
                      const lockOthers = allAnswered && !selected;
                      return (
                        <Pressable
                          key={strategy}
                          onPress={() =>
                            handleStrategyPick(decision, strategy)
                          }
                          disabled={lockOthers}
                          style={({ pressed }) => [
                            styles.strategyTile,
                            {
                              borderColor: selected
                                ? accent
                                : colors.border,
                              borderWidth: selected ? 2 : 1,
                              backgroundColor: colors.muted,
                              opacity: lockOthers ? 0.35 : pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          <View style={styles.strategyImageWrap}>
                            <Image
                              source={STRATEGY_IMAGES[strategy]}
                              style={styles.strategyImage}
                              resizeMode="cover"
                            />
                            <LinearGradient
                              colors={[
                                "rgba(7,11,20,0)",
                                "rgba(7,11,20,0.85)",
                              ]}
                              locations={[0.4, 1]}
                              style={StyleSheet.absoluteFill}
                            />
                            {selected ? (
                              <View
                                style={[
                                  styles.strategySelectedDot,
                                  { backgroundColor: accent },
                                ]}
                              >
                                <Feather
                                  name="check"
                                  size={11}
                                  color={colors.background}
                                />
                              </View>
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.strategyTileLabel,
                              {
                                color: selected
                                  ? accent
                                  : colors.foreground,
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {meta.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {choice ? (
                    <View
                      style={[
                        styles.finalChoiceRow,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.finalChoiceHint,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {getStrategyMeta(choice.strategy).hint}
                      </Text>
                      <Text
                        style={[
                          styles.finalChoiceDelta,
                          {
                            color:
                              choice.modifier > 0
                                ? colors.success
                                : choice.modifier < 0
                                  ? colors.danger
                                  : colors.mutedForeground,
                          },
                        ]}
                      >
                        {choice.modifier > 0 ? "+" : ""}
                        {choice.modifier} pt
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.finalChoiceHint,
                        {
                          color: colors.mutedForeground,
                          fontStyle: "italic",
                          paddingTop: 6,
                        },
                      ]}
                    >
                      Choisissez une riposte pour continuer.
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ----- Score reveal: gated on allAnswered (or no debate) ---- */}
        {finalDebateInProgress ? (
          <View
            style={[
              styles.scoreLocked,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.verdictImageWrap}>
              <Image
                source={ELECTION_IMAGES.verdictSealed}
                style={styles.verdictImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(7,11,20,0.05)", "rgba(7,11,20,0.85)"]}
                locations={[0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.verdictBadge}>
                <Feather name="lock" size={14} color="#fff" />
              </View>
            </View>
            <Text
              style={[
                styles.scoreLockedTitle,
                { color: colors.foreground },
              ]}
            >
              Verdict scellé
            </Text>
            <Text
              style={[
                styles.scoreLockedText,
                { color: colors.mutedForeground },
              ]}
            >
              Terminez le débat ({finalChoices.length} / {computedFinalDecisions.length})
              pour découvrir votre score au second tour.
            </Text>
          </View>
        ) : (
          displayedResult && (
            <>
              <View
                style={[
                  styles.voteCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.outcomeImageWrap}>
                  <Image
                    source={
                      finalReveal.reElected
                        ? ELECTION_IMAGES.victoryCeremony
                        : ELECTION_IMAGES.defeatElectoral
                    }
                    style={styles.outcomeImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={[
                      "rgba(7,11,20,0.05)",
                      "rgba(7,11,20,0.35)",
                      "rgba(7,11,20,0.95)",
                    ]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    style={[
                      styles.outcomeKicker,
                      { borderColor: accent },
                    ]}
                  >
                    <Feather
                      name={
                        finalReveal.reElected ? "award" : "x-octagon"
                      }
                      size={11}
                      color={accent}
                    />
                    <Text style={[styles.outcomeKickerText, { color: accent }]}>
                      {finalReveal.reElected
                        ? "RÉÉLECTION"
                        : "DÉFAITE ÉLECTORALE"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.voteLabel, { color: colors.mutedForeground }]}
                >
                  VOTRE SCORE AU SECOND TOUR
                </Text>
                <View style={styles.bigScoreRow}>
                  <Text style={[styles.bigScore, { color: accent }]}>
                    {displayedResult.voteShare}
                  </Text>
                  <Text
                    style={[styles.percent, { color: colors.mutedForeground }]}
                  >
                    %
                  </Text>
                </View>

                <View
                  style={[styles.barContainer, { backgroundColor: colors.muted }]}
                >
                  <View
                    style={[
                      styles.barYou,
                      {
                        width: `${displayedResult.voteShare}%`,
                        backgroundColor: accent,
                      },
                    ]}
                  />
                </View>
                <View style={styles.barLabels}>
                  <Text
                    style={[styles.barLabelLeft, { color: colors.foreground }]}
                  >
                    Vous : {displayedResult.voteShare}%
                  </Text>
                  <Text
                    style={[
                      styles.barLabelRight,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Opposition : {opponentShare}%
                  </Text>
                </View>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                <Text
                  style={[styles.summary, { color: colors.cardForeground }]}
                >
                  {displayedResult.summary}
                </Text>
              </View>

              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                DÉCOMPOSITION DU VOTE
              </Text>

              <View
                style={[
                  styles.breakdown,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {displayedResult.blocks.map((b, i) => {
                  const positive = b.delta >= 0;
                  return (
                    <View
                      key={b.label}
                      style={[
                        styles.block,
                        i < displayedResult.blocks.length - 1 && {
                          borderBottomColor: colors.border,
                          borderBottomWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.blockTop}>
                        <Text
                          style={[
                            styles.blockLabel,
                            { color: colors.foreground },
                          ]}
                        >
                          {b.label}
                        </Text>
                        <Text
                          style={[
                            styles.blockDelta,
                            {
                              color: positive ? colors.success : colors.danger,
                            },
                          ]}
                        >
                          {positive ? "+" : ""}
                          {b.delta}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.blockDetail,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {b.detail}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {displayedResult.regionalResults &&
              displayedResult.regionalResults.length > 0 ? (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    VOTE DES TERRITOIRES
                  </Text>
                  <View
                    style={[
                      styles.regionalCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {displayedResult.regionalResults.map((rv, i) => {
                      const wins = rv.verdict === "pour";
                      const tint = wins ? colors.success : colors.danger;
                      const fillPct = Math.max(0, Math.min(100, rv.voteShare));
                      return (
                        <View
                          key={rv.region}
                          style={[
                            styles.regionalRow,
                            i < displayedResult.regionalResults!.length - 1 && {
                              borderBottomColor: colors.border,
                              borderBottomWidth: 1,
                            },
                          ]}
                        >
                          <View style={styles.regionalTopRow}>
                            <View
                              style={[
                                styles.regionalDot,
                                { backgroundColor: tint },
                              ]}
                            />
                            <Text
                              style={[
                                styles.regionalName,
                                { color: colors.foreground },
                              ]}
                              numberOfLines={1}
                            >
                              {rv.regionName}
                            </Text>
                            <Text
                              style={[styles.regionalShare, { color: tint }]}
                            >
                              {rv.voteShare}%
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.regionalTrack,
                              { backgroundColor: colors.muted },
                            ]}
                          >
                            <View
                              style={[
                                styles.regionalFill,
                                {
                                  width: `${fillPct}%`,
                                  backgroundColor: tint,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.regionalMeta,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {wins
                              ? `Vous reconduit · poids ${rv.weight}`
                              : `Bascule contre vous · poids ${rv.weight}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          )
        )}

        <View style={styles.actions}>
          {/*
            Si vous êtes ré-élu·e, l'action principale est de POURSUIVRE
            le mandat avec le même personnage : on n'oblige plus à
            recréer un compte. "Nouvelle présidentielle" descend en
            action secondaire pour celles et ceux qui veulent tout
            recommencer avec un nouveau profil.
          */}
          {finalReveal.reElected && !finalDebateInProgress ? (
            <>
              <Pressable
                onPress={handleSecondTerm}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.success,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather
                  name="arrow-right-circle"
                  size={16}
                  color={colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.primaryBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  CONTINUER · 2ND MANDAT
                </Text>
              </Pressable>
              <Text
                style={[
                  styles.secondTermHint,
                  { color: colors.mutedForeground },
                ]}
              >
                Vous gardez votre président·e, votre gouvernement et
                l'état du pays. L'horloge politique repart à zéro.
              </Text>
              <Pressable
                onPress={handleRestart}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.secondaryBtnText,
                    { color: colors.foreground },
                  ]}
                >
                  Nouvelle présidentielle (autre personnage)
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleRestart}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather
                name="refresh-cw"
                size={16}
                color={colors.primaryForeground}
              />
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                NOUVELLE PRÉSIDENTIELLE
              </Text>
            </Pressable>
          )}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fallbackBtn: {
    margin: 24,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  fallbackText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scroll: {
    paddingHorizontal: 20,
    gap: 18,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  // ----- Vote -----
  voteCard: {
    padding: 18,
    borderRadius: 6,
    borderWidth: 1,
    gap: 10,
  },
  voteLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  bigScoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  bigScore: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
    lineHeight: 70,
  },
  percent: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    paddingBottom: 8,
  },
  barContainer: {
    height: 14,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },
  barYou: {
    height: "100%",
    borderRadius: 4,
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  barLabelLeft: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  barLabelRight: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  breakdown: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  block: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  blockTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  blockDelta: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  blockDetail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  regionalCard: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  regionalRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  regionalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  regionalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  regionalName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  regionalShare: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  regionalTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  regionalFill: {
    height: "100%",
  },
  regionalMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
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
    letterSpacing: 1.5,
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
  secondTermHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: -4,
    marginBottom: 4,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
  // ----- Module 5: final debate -----
  finalDebateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  finalProgress: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
  },
  finalIntro: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  finalCard: {
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    gap: 10,
  },
  finalCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  finalCardKicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  finalCardTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  finalCardTagText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  finalCardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  finalCardChoice: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
  },
  finalAttackBlock: {
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    gap: 6,
  },
  finalAttackHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  finalAttackName: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    flex: 1,
  },
  finalAttackLine: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  finalStrategyLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    marginTop: 2,
  },
  // ----- Strategy tiles -----
  strategyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  strategyTile: {
    width: "48.5%",
    borderRadius: 6,
    overflow: "hidden",
    paddingBottom: 8,
  },
  strategyImageWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
    overflow: "hidden",
  },
  strategyImage: {
    width: "100%",
    height: "100%",
  },
  strategySelectedDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  strategyTileLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textAlign: "center",
    paddingHorizontal: 6,
    paddingTop: 8,
    minHeight: 32,
  },
  // ----- Verdict scellé -----
  verdictImageWrap: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 180,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
    marginBottom: 10,
  },
  verdictImage: {
    width: "100%",
    height: "100%",
  },
  verdictBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(7,11,20,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  // ----- Outcome image in voteCard -----
  outcomeImageWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 180,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
    marginBottom: 8,
    marginHorizontal: -2,
  },
  outcomeImage: {
    width: "100%",
    height: "100%",
  },
  outcomeKicker: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    backgroundColor: "rgba(7,11,20,0.7)",
  },
  outcomeKickerText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  finalChoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  finalChoiceHint: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  finalChoiceDelta: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  scoreLocked: {
    padding: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  scoreLockedTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  scoreLockedText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
