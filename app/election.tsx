import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { selectDebateAngles } from "@/lib/oppositionAnalysis";
import { generateOppositionAttacks } from "@/lib/aiOpposition";
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
import { generateFinalDebateAttacks } from "@/lib/aiFinalDebate";
import { formatMandateLabel, turnToMonth } from "@/logic/timeEngine";
import { ELECTION_IMAGES, STRATEGY_IMAGES } from "@/data/electionImages";
import type {
  FinalDebateAttack,
  FinalDebateDecision,
  FinalDebateStrategy,
  OppositionAngle,
  OppositionAttack,
  OppositionWeakness,
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

// ----- Angle metadata --------------------------------------------------
const ANGLE_META: Record<
  OppositionAngle,
  { label: string; icon: keyof typeof Feather.glyphMap }
> = {
  budget: { label: "Dette & finances", icon: "trending-up" },
  security: { label: "Sécurité", icon: "shield" },
  ecology: { label: "Écologie", icon: "wind" },
  cohesion: { label: "Cohésion nationale", icon: "users" },
  broken_promise: { label: "Promesse brisée", icon: "x-circle" },
  popularity: { label: "Désaveu populaire", icon: "thumbs-down" },
  scandals: { label: "Scandales", icon: "alert-triangle" },
  authority: { label: "Autorité", icon: "minimize" },
};

export default function ElectionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state,
    resetGame,
    startSecondTerm,
    setElectionDebate,
    setFinalDebatePack,
    setFinalDebateChoice,
  } = useGame();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const result = state.electionResult;

  // ----- Module IA 4: opposition debate generation --------------------
  const opponent = useMemo(
    () => pickOpponent(state.president?.name ?? null),
    [state.president?.name],
  );

  const weaknesses = useMemo<OppositionWeakness[]>(() => {
    if (!result) return [];
    return selectDebateAngles(state, 4);
  }, [result, state]);

  const cachedDebate = state.electionDebate ?? null;

  const [debateLoading, setDebateLoading] = useState(false);
  const [debateError, setDebateError] = useState<string | null>(null);
  const [debateAttacks, setDebateAttacks] = useState<OppositionAttack[] | null>(
    cachedDebate,
  );
  // In-flight guard prevents same-mount double fetches; the abort
  // controller cancels any pending request on unmount so a fast
  // navigate-away-and-back cannot trigger duplicate AI billing.
  const fetchInFlightRef = useRef(false);
  const inFlightAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchDebate = useCallback(async () => {
    if (fetchInFlightRef.current) return;
    if (!result) return;
    if (weaknesses.length === 0) return;
    fetchInFlightRef.current = true;
    const abort = new AbortController();
    inFlightAbortRef.current = abort;
    setDebateLoading(true);
    setDebateError(null);
    try {
      const attacks = await generateOppositionAttacks(
        {
          weaknesses,
          maxAttacks: Math.min(4, weaknesses.length),
          challengerArchetype: opponent.role,
        },
        abort.signal,
      );
      if (!isMountedRef.current || abort.signal.aborted) return;
      setDebateAttacks(attacks);
      setElectionDebate(attacks);
    } catch (e) {
      // A unmount-triggered abort is silent — no error to display.
      if (abort.signal.aborted) return;
      if (!isMountedRef.current) return;
      const msg =
        e instanceof Error ? e.message : "L'opposition reste muette.";
      setDebateError(msg);
    } finally {
      if (isMountedRef.current) setDebateLoading(false);
      fetchInFlightRef.current = false;
      if (inFlightAbortRef.current === abort) {
        inFlightAbortRef.current = null;
      }
    }
  }, [result, weaknesses, opponent.role, setElectionDebate]);

  // Auto-trigger once on mount when there's nothing cached.
  useEffect(() => {
    if (!result) return;
    if (cachedDebate && cachedDebate.length > 0) return;
    if (debateAttacks && debateAttacks.length > 0) return;
    if (weaknesses.length === 0) return;
    void fetchDebate();
    // We intentionally only depend on the existence of a result to
    // run-once. fetchDebate is stable enough thanks to its own guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Cancel any in-flight AI request when the screen unmounts so that a
  // fast navigate-away-and-back cannot trigger a duplicate request.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      inFlightAbortRef.current?.abort();
      finalDebateAbortRef.current?.abort();
    };
  }, []);

  // ----- Module IA 5: interactive final presidential debate -----------
  //
  // Once the 5 decisions are picked + AI attacks are fetched (cached in
  // state.finalDebatePack), the player picks one rhetorical strategy
  // per decision. Each pick yields a deterministic vote-share modifier.
  // The score card stays HIDDEN until all picks are made — that's the
  // dramatic reveal at the end of the mandate.

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

  const [finalLoading, setFinalLoading] = useState(false);
  const [finalError, setFinalError] = useState<string | null>(null);
  const finalDebateInFlightRef = useRef(false);
  const finalDebateAbortRef = useRef<AbortController | null>(null);

  const fetchFinalDebate = useCallback(async () => {
    if (finalDebateInFlightRef.current) return;
    if (!result) return;
    if (state.finalDebatePack) return;
    if (computedFinalDecisions.length === 0) return;
    finalDebateInFlightRef.current = true;
    const abort = new AbortController();
    finalDebateAbortRef.current = abort;
    setFinalLoading(true);
    setFinalError(null);
    try {
      const attacks = await generateFinalDebateAttacks(
        {
          decisions: computedFinalDecisions,
          challengerArchetype: opponent.role,
        },
        abort.signal,
      );
      if (!isMountedRef.current || abort.signal.aborted) return;
      // Persist BOTH the decisions and the attacks atomically — once
      // cached, neither will be regenerated on remount.
      setFinalDebatePack({
        decisions: computedFinalDecisions,
        attacks,
      });
    } catch (e) {
      if (abort.signal.aborted) return;
      if (!isMountedRef.current) return;
      const msg =
        e instanceof Error ? e.message : "L'opposition reste muette.";
      setFinalError(msg);
    } finally {
      if (isMountedRef.current) setFinalLoading(false);
      finalDebateInFlightRef.current = false;
      if (finalDebateAbortRef.current === abort) {
        finalDebateAbortRef.current = null;
      }
    }
  }, [
    result,
    state.finalDebatePack,
    computedFinalDecisions,
    opponent.role,
    setFinalDebatePack,
    setFinalLoading,
  ]);

  useEffect(() => {
    if (!result) return;
    if (state.finalDebatePack) return;
    if (computedFinalDecisions.length === 0) return;
    void fetchFinalDebate();
    // Run-once gating: only re-trigger if the cache is cleared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, state.finalDebatePack]);

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

  // Render decision: only show debate card if there are weaknesses to
  // attack, otherwise the screen stays clean (a flawless mandate gets
  // no opposition rant).
  const showDebate = weaknesses.length > 0;

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

        {/* Module 5 — Réquisitoire persistant : on liste les angles
            d'attaque accumulés tout au long du mandat AVANT le débat
            télévisé IA. Le composant retourne null s'il n'y a pas de
            ligne d'attaque, donc un mandat irréprochable n'affiche
            rien (même comportement que `showDebate` plus bas). */}
        <OppositionAttackPanel
          lines={state.attackLines ?? []}
          mode="election"
        />

        {showDebate && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              DÉBAT TÉLÉVISÉ DE L'ENTRE-DEUX-TOURS
            </Text>
            <View
              style={[
                styles.debateCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.debateHeader}>
                <View
                  style={[
                    styles.opponentAvatar,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <Feather name="user" size={20} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.opponentName, { color: colors.foreground }]}
                  >
                    {opponent.name}
                  </Text>
                  <Text
                    style={[
                      styles.opponentRole,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {opponent.role}
                  </Text>
                </View>
                <View
                  style={[
                    styles.aiBadge,
                    { borderColor: colors.border, backgroundColor: colors.muted },
                  ]}
                >
                  <Feather name="cpu" size={9} color={colors.mutedForeground} />
                  <Text
                    style={[styles.aiBadgeText, { color: colors.mutedForeground }]}
                  >
                    IA
                  </Text>
                </View>
              </View>

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              {debateLoading && !debateAttacks && (
                <View style={styles.debateLoadingRow}>
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                  <Text
                    style={[
                      styles.debateLoadingText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    L'opposition prépare ses répliques…
                  </Text>
                </View>
              )}

              {debateError && !debateAttacks && (
                <View style={styles.debateErrorBlock}>
                  <Text
                    style={[styles.debateErrorText, { color: colors.danger }]}
                  >
                    {debateError}
                  </Text>
                  <Pressable
                    onPress={() => void fetchDebate()}
                    disabled={debateLoading}
                    style={({ pressed }) => [
                      styles.retryBtn,
                      {
                        borderColor: colors.border,
                        opacity: pressed || debateLoading ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name="refresh-cw"
                      size={12}
                      color={colors.foreground}
                    />
                    <Text
                      style={[
                        styles.retryBtnText,
                        { color: colors.foreground },
                      ]}
                    >
                      RÉESSAYER
                    </Text>
                  </Pressable>
                </View>
              )}

              {debateAttacks &&
                debateAttacks.map((attack, i) => {
                  // Defensive: if the AI ever returns an angle outside the
                  // known set (or schema drift on a future deploy), fall
                  // back to a generic "Critique" tag instead of crashing.
                  const meta =
                    ANGLE_META[attack.angle] ??
                    ({ label: "Critique", icon: "alert-circle" } as const);
                  return (
                    <View
                      key={`${attack.angle}_${i}`}
                      style={[
                        styles.attackBlock,
                        i < debateAttacks.length - 1 && {
                          borderBottomColor: colors.border,
                          borderBottomWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.attackTagRow}>
                        <Feather
                          name={meta.icon}
                          size={11}
                          color={colors.danger}
                        />
                        <Text
                          style={[styles.attackTag, { color: colors.danger }]}
                        >
                          {meta.label.toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.attackLine,
                          { color: colors.cardForeground },
                        ]}
                      >
                        «{" "}
                        {typeof attack.line === "string" &&
                        attack.line.trim().length > 0
                          ? attack.line
                          : "Pas de pique précise."}{" "}
                        »
                      </Text>
                    </View>
                  );
                })}
            </View>
          </>
        )}

        {/* ----- Module IA 5: interactive final debate ----------------- */}
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

            {finalLoading && !state.finalDebatePack && (
              <View
                style={[
                  styles.finalLoadingCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.debateLoadingText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  L'opposition prépare ses cinq attaques…
                </Text>
              </View>
            )}

            {finalError && !state.finalDebatePack && (
              <View
                style={[
                  styles.finalLoadingCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.debateErrorText, { color: colors.danger }]}
                >
                  {finalError}
                </Text>
                <Pressable
                  onPress={() => void fetchFinalDebate()}
                  disabled={finalLoading}
                  style={({ pressed }) => [
                    styles.retryBtn,
                    {
                      borderColor: colors.border,
                      opacity: pressed || finalLoading ? 0.6 : 1,
                    },
                  ]}
                >
                  <Feather
                    name="refresh-cw"
                    size={12}
                    color={colors.foreground}
                  />
                  <Text
                    style={[styles.retryBtnText, { color: colors.foreground }]}
                  >
                    RÉESSAYER
                  </Text>
                </Pressable>
              </View>
            )}

            {state.finalDebatePack &&
              computedFinalDecisions.map((decision, idx) => {
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
                        DÉCISION {idx + 1} · {formatMandateLabel(turnToMonth(decision.turn)).toUpperCase()}
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
  // ----- Debate (Module IA 4) -----
  debateCard: {
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  debateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  opponentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  opponentName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  opponentRole: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
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
  debateLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  debateLoadingText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  debateErrorBlock: {
    paddingVertical: 8,
    gap: 10,
  },
  debateErrorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
  },
  retryBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  attackBlock: {
    paddingVertical: 12,
    gap: 6,
  },
  attackTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attackTag: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  attackLine: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
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
  // ----- Module IA 5: final debate -----
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
  finalLoadingCard: {
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
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
  // ----- LOT 7: cards immersives stratégies de riposte -----
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
  // ----- LOT 7: image verdict scellé -----
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
  // ----- LOT 7: image victoire/défaite dans voteCard -----
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
