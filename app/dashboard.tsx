import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame, Gauges } from "@/context/GameContext";
import { MEDIA_OUTLETS } from "@/data/medias";
import { OPPOSITION_STANCE_LABELS } from "@/lib/oppositionReaction";
import { GaugeBar } from "@/components/GaugeBar";
import { HudHeader } from "@/components/HudHeader";
import { EventModal } from "@/components/EventModal";
import { TimeBar } from "@/components/TimeBar";
import { MandateReportModal } from "@/components/MandateReportModal";
import { QuarterReportToast } from "@/components/QuarterReportToast";
import {
  INITIAL_GAME_TIME,
  formatGameDayLabel,
  turnToGameDay,
} from "@/logic/timeEngine";
import { MetaStatsCard } from "@/components/MetaStatsCard";
import { ResourceStrip } from "@/components/ResourceStrip";
import { ResourceBar } from "@/components/ResourceBar";
import { INITIAL_RESOURCES } from "@/logic/resources";
import {
  GAUGE_LABELS,
  HIDDEN_GAUGE_LABELS,
  INVERTED_GAUGES,
} from "@/logic/gameEngine";
import { GAUGE_IMAGES } from "@/data/gaugeImages";
import { META_IMAGES } from "@/data/metaImages";
import { NAV_IMAGES } from "@/data/navImages";
import {
  DASHBOARD_SECTION_IMAGES,
  DASHBOARD_ICON_IMAGES,
  DASHBOARD_ACTION_IMAGES,
  DASHBOARD_HERO,
} from "@/data/dashboardImages";
import { TECH_TREE } from "@/data/techTree";
import { CascadeUpcomingCard } from "@/components/CascadeUpcomingCard";
import { CrisisChyron } from "@/components/CrisisChyron";
import { FranceMap } from "@/components/FranceMap";
import { PanelistesRow } from "@/components/PanelistesRow";
import { AlertTicker } from "@/components/AlertTicker";
import { MinorEventCard } from "@/components/MinorEventCard";
import { OppositionAttackPanel } from "@/components/OppositionAttackPanel";
import { HybridThreatPanel } from "@/components/HybridThreatPanel";
import { WarBanner } from "@/components/WarBanner";
import type { RegionId } from "@/data/regions";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state,
    drawNextEvent,
    resolveChoice,
    resetGame,
    injectCustomEvent,
    skipToNextEvent,
    dismissReport,
    resolveMinorEvent,
    dismissMinorEvent,
  } = useGame();
  // Track previous gauges so the resource strip can show per-turn deltas
  // (P&W-style ▲/▼ next to each value). We snapshot at the START of the
  // turn before any new resolution mutates the gauges.
  const prevGaugesRef = React.useRef<Gauges | null>(null);
  const lastSnapshotTurnRef = React.useRef<number>(state.turn);
  const [prevGauges, setPrevGauges] = useState<Gauges | null>(null);
  useEffect(() => {
    if (state.turn !== lastSnapshotTurnRef.current) {
      // Promote what we had cached as "current" to the new "previous".
      setPrevGauges(prevGaugesRef.current);
      lastSnapshotTurnRef.current = state.turn;
    }
    // Always keep the cache one step behind the live gauges.
    prevGaugesRef.current = state.gauges;
  }, [state.turn, state.gauges]);

  // Tactile warning when a critical gauge crosses into the danger zone.
  // We compare the previous render's snapshot to the live values so the
  // player feels the moment a key indicator collapses (popularity, security,
  // ecology) or debt explodes. Fires at most once per crossing per gauge.
  const dangerSeenRef = React.useRef<Record<string, boolean>>({});
  // Reset the "already warned" set when a new mandate starts, so the
  // first dip into danger always vibrates even on a fresh game.
  const presidentNameForReset = state.president?.name ?? null;
  useEffect(() => {
    dangerSeenRef.current = {};
  }, [presidentNameForReset]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const check = (
      key: keyof Gauges,
      isDanger: (v: number) => boolean,
    ) => {
      const v = state.gauges[key];
      const wasDanger = dangerSeenRef.current[key] === true;
      const nowDanger = isDanger(v);
      if (nowDanger && !wasDanger) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      }
      dangerSeenRef.current[key] = nowDanger;
    };
    check("popularity", (v) => v <= 20);
    check("security", (v) => v <= 20);
    check("ecology", (v) => v <= 20);
    check("debt", (v) => v >= 80);
  }, [state.gauges]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (!state.president) {
      router.replace("/");
    }
  }, [state.president, router]);

  useEffect(() => {
    if (state.gameOver.isOver) {
      router.replace(state.gameOver.triggeredElection ? "/election" : "/game-over");
    }
  }, [state.gameOver.isOver, state.gameOver.triggeredElection, router]);

  // Ouvre le briefing disponible — JAMAIS de saut de temps.
  // Cette fonction est appelée UNIQUEMENT quand canDrawNow=true,
  // c'est-à-dire quand l'horloge a déjà atteint nextEventMonth.
  const handleDrawAvailable = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    drawNextEvent();
  };

  const handleSelectRegion = useCallback(
    (_id: RegionId) => {
      router.push("/regions");
    },
    [router],
  );

  const handleReset = () => {
    const action = async () => {
      await resetGame();
      router.replace("/");
    };
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Abandonner ce mandat ?")) {
        action();
      }
      return;
    }
    Alert.alert(
      "Abandonner le mandat ?",
      "Votre progression actuelle sera effacée.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Abandonner", style: "destructive", onPress: action },
      ],
    );
  };

  // Module 2 — si l'évènement courant est régional (id préfixé `rgn_`),
  // on remonte son titre dans le ticker pour signaler la demande, et
  // on identifie la région ciblée pour la forcer dans `urgentRegions`
  // (sinon une région à 55-59 de tension peut afficher URGENT dans le
  // ticker mais pas de badge ⚠ sur la carte — incohérence visuelle).
  // NB: ce bloc DOIT rester AVANT tout `return` conditionnel pour
  // préserver l'ordre des hooks (`useMemo`) entre les rendus.
  const isRegionalEvent =
    !!state.currentEvent && state.currentEvent.id.startsWith("rgn_");
  const pendingRegionalTitle = isRegionalEvent ? state.currentEvent!.title : null;
  const pendingRegionalRegion = useMemo<RegionId | null>(() => {
    if (!isRegionalEvent) return null;
    const eventId = state.currentEvent!.id;
    // Format: rgn_<kind>_<regionId>_t<turn>. Comme regionId peut
    // contenir des underscores (`outre_mer`, `grand_est`), on cherche
    // par appartenance plutôt que par split.
    const match = state.regions.find((r) => eventId.includes(`_${r.id}_t`));
    return match?.id ?? null;
  }, [isRegionalEvent, state.currentEvent, state.regions]);

  // Module 2 — régions à signaler comme "en alerte" sur la carte et
  // dans le ticker. Critère composite : tension élevée OU jauge
  // critique (économie / écologie / santé), avec inclusion forcée de
  // la région concernée par l'évènement régional en cours.
  const urgentRegions = useMemo(() => {
    const set = new Set<RegionId>();
    for (const r of state.regions) {
      if (
        r.tension >= 60 ||
        r.gauges.economy <= 35 ||
        r.gauges.ecology <= 35 ||
        r.gauges.publicHealth <= 35
      ) {
        set.add(r.id);
      }
    }
    if (pendingRegionalRegion) set.add(pendingRegionalRegion);
    return set;
  }, [state.regions, pendingRegionalRegion]);

  if (!state.president) return null;

  const lastEntry = state.log[0];
  // Module 4 — la décision portant la une médiatique n'est pas
  // forcément en tête du journal : un scandale ministériel ou une
  // étape de cascade peut être empilé devant. On affiche donc la
  // première entrée qui possède une `aiHeadline`, pour ne jamais
  // « perdre » la voix du média sur ces tours-là.
  const lastHeadlineEntry = state.log.find((e) => e.aiHeadline) ?? null;
  const pendingPromises = state.promises.filter((p) => p.status === "pending").length;
  const fulfilledPromises = state.promises.filter((p) => p.status === "fulfilled").length;
  const brokenPromises = state.promises.filter((p) => p.status === "broken").length;

  // Module 7 — Sous-titre dynamique du bouton Recherche.
  // Priorité 1 : recherche en cours → on affiche les tours restants.
  // Priorité 2 : nombre de technologies déjà acquises sur 10.
  const techState = state.tech ?? { researched: [], inProgress: null };
  const researchSubtitle = (() => {
    const ip = techState.inProgress;
    if (ip) {
      const node = TECH_TREE[ip.id];
      const turnsLeft = Math.max(0, ip.completedTurn - state.turn);
      const monthsLeft = turnsLeft * 3;
      return `${node.label} — ${monthsLeft > 0 ? `${monthsLeft} jour${monthsLeft > 1 ? "s" : ""} de jeu` : "terminé"}`;
    }
    return `${techState.researched.length} / 10 technologies acquises`;
  })();
  const avgRegionalTension =
    state.regions.reduce((s, r) => s + r.tension, 0) /
    Math.max(1, state.regions.length);
  const avgMinisterLoyalty =
    state.ministers.reduce((s, m) => s + m.loyalty, 0) /
    Math.max(1, state.ministers.length);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + webTopInset,
        },
      ]}
    >
      <HudHeader
        presidentName={state.president.name}
        party={state.president.party}
        gameDay={state.gameTime?.currentMonth ?? turnToGameDay(state.turn)}
        onOpenJournal={() => router.push("/journal")}
        onGoHome={() => router.replace("/")}
        onReset={handleReset}
      />

      {state.gameTime ? (
        <TimeBar
          gameDay={state.gameTime.currentMonth}
          seasonStartedAtRealMs={
            state.gameTime.seasonStartedAtRealMs ?? state.startedAt ?? Date.now()
          }
          nextEventGameDay={state.gameTime.nextEventMonth}
          blocked={!!state.currentEvent || !!state.gameTime.pendingReport}
          onSkip={skipToNextEvent}
        />
      ) : null}

      <ResourceStrip gauges={state.gauges} prevGauges={prevGauges} />
      <ResourceBar resources={state.resources ?? INITIAL_RESOURCES} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* LOT 15 — Carte d'événement MINEUR : décision optionnelle
            qui ne met PAS le temps en pause. Affichée uniquement si
            la file mineure contient au moins une entrée non expirée. */}
        {state.minorEventQueue && state.minorEventQueue.length > 0 ? (
          <MinorEventCard
            entry={state.minorEventQueue[0]}
            currentGameDay={
              state.gameTime?.currentMonth ?? turnToGameDay(state.turn)
            }
            onResolve={resolveMinorEvent}
            onDismiss={dismissMinorEvent}
          />
        ) : null}

        {/* Module 6 — Bandeau « ÉTAT DE GUERRE / ULTIMATUM ».
            Rendu en tête du scroll et seulement si guerre/ultimatum
            actif (le composant retourne null sinon). */}
        <WarBanner state={state} />

        <CrisisChyron
          currentEvent={state.currentEvent}
          canDrawNow={
            !state.currentEvent &&
            !!state.gameTime &&
            state.gameTime.currentMonth >= state.gameTime.nextEventMonth
          }
          onDrawNow={handleDrawAvailable}
        />

        <SectionHeading
          image={DASHBOARD_SECTION_IMAGES.carte}
          title="CARTE NATIONALE"
        />

        <FranceMap
          regions={state.regions}
          selectedId={null}
          onSelect={handleSelectRegion}
          urgentRegions={urgentRegions}
        />

        <SectionHeading
          image={DASHBOARD_SECTION_IMAGES.indicateurs}
          title="INDICATEURS NATIONAUX"
        />

        <View style={styles.gaugesGrid}>
          {(Object.keys(GAUGE_LABELS) as (keyof Gauges)[]).map((key) => (
            <View key={key} style={styles.gaugeWrap}>
              <GaugeBar
                label={GAUGE_LABELS[key]}
                iconSource={GAUGE_IMAGES[key]}
                value={state.gauges[key]}
                inverted={INVERTED_GAUGES.has(key)}
              />
            </View>
          ))}
        </View>

        <SectionHeading
          image={DASHBOARD_SECTION_IMAGES.climat}
          title="CLIMAT POLITIQUE"
        />

        <View style={styles.metaGrid}>
          <MetaStatsCard
            iconSource={META_IMAGES.media}
            label="MÉDIAS"
            value={state.media}
          />
          <MetaStatsCard
            iconSource={META_IMAGES.opposition}
            label="OPPOSITION"
            value={state.opposition}
            invert
          />
        </View>

        {state.revealedHiddenKeys.length > 0 ? (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              RENSEIGNEMENTS
            </Text>
            <View
              style={[
                styles.intelCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.intelHeader}>
                <Image
                  source={DASHBOARD_ICON_IMAGES.intel}
                  style={styles.headerIconSm}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.intelLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  INDICATEURS RÉVÉLÉS
                </Text>
              </View>
              {state.revealedHiddenKeys.map((k) => {
                const v = state.hiddenGauges[k];
                const dangerLevel =
                  v >= 70 ? colors.danger : v >= 40 ? colors.warning : colors.success;
                return (
                  <View key={k} style={styles.intelRow}>
                    <Text
                      style={[styles.intelName, { color: colors.foreground }]}
                    >
                      {HIDDEN_GAUGE_LABELS[k]}
                    </Text>
                    <View
                      style={[
                        styles.intelTrack,
                        { backgroundColor: colors.muted },
                      ]}
                    >
                      <View
                        style={[
                          styles.intelFill,
                          {
                            width: `${Math.max(0, Math.min(100, v))}%`,
                            backgroundColor: dangerLevel,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.intelValue,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {Math.round(v)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <CascadeUpcomingCard
          scheduled={state.scheduledConsequences}
          currentTurn={state.turn}
        />

        <SectionHeading
          image={DASHBOARD_SECTION_IMAGES.panelistes}
          title="PANÉLISTES (CONSEILLERS)"
        />

        <PanelistesRow
          ministers={state.ministers}
          onPress={() => router.push("/cabinet")}
        />

        <SectionHeading
          image={DASHBOARD_SECTION_IMAGES.acces}
          title="ACCÈS RAPIDE"
        />

        <View style={styles.navGrid}>
          <NavCard
            iconSource={NAV_IMAGES.cabinet}
            label="Cabinet"
            value={`${Math.round(avgMinisterLoyalty)} loyauté`}
            onPress={() => router.push("/cabinet")}
          />
          <NavCard
            iconSource={NAV_IMAGES.regions}
            label="Régions"
            value={`${Math.round(avgRegionalTension)} tension`}
            onPress={() => router.push("/regions")}
          />
          <NavCard
            iconSource={NAV_IMAGES.promises}
            label="Promesses"
            value={`${fulfilledPromises}✓ ${brokenPromises}✗ ${pendingPromises}…`}
            onPress={() => router.push("/promises")}
          />
          <NavCard
            iconSource={NAV_IMAGES.journal}
            label="Journal"
            value={`${state.log.length} décisions`}
            onPress={() => router.push("/journal")}
          />
        </View>

        {/* Module 6 — Bouton dédié « Front diplomatique » (page /front).
            Affiche un thumbnail painterly (sphère armillaire) issu
            de DASHBOARD_ICON_IMAGES.diplomatique pour rester cohérent
            avec la nouvelle direction visuelle navy+ambre. */}
        <Pressable
          onPress={() => router.push("/front")}
          style={({ pressed }) => [
            styles.frontBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Image
            source={DASHBOARD_ICON_IMAGES.diplomatique}
            style={styles.frontBtnIcon}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.frontBtnLabel, { color: colors.foreground }]}>
              Front diplomatique
            </Text>
            <Text
              style={[
                styles.frontBtnSub,
                { color: colors.mutedForeground },
              ]}
            >
              Menaces extérieures, contre-mesures, journal d'opérations
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>

        {/* Module 7 — Bouton dédié « Recherche & développement ».
            Sous-titre dynamique :
              - recherche en cours → "X tour(s) restant(s) — <techno>"
              - sinon → "X / 10 technologies acquises".
            Mêmes styles que le bouton "Front diplomatique" et
            thumbnail painterly (éprouvette + livre + circuits) issu
            de DASHBOARD_ICON_IMAGES.recherche. */}
        <Pressable
          onPress={() => router.push("/research")}
          style={({ pressed }) => [
            styles.frontBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Image
            source={DASHBOARD_ICON_IMAGES.recherche}
            style={styles.frontBtnIcon}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.frontBtnLabel, { color: colors.foreground }]}>
              Recherche & développement
            </Text>
            <Text
              style={[
                styles.frontBtnSub,
                { color: colors.mutedForeground },
              ]}
            >
              {researchSubtitle}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>

        {/* Module 6 — Encart compact « MENACES EXTÉRIEURES ».
            Retourne null si pas d'acteur hostile ou si tout est calme. */}
        <HybridThreatPanel state={state} />

        {/* Module 5 — Opposition intelligente. L'encart est rendu
            UNIQUEMENT s'il y a au moins une ligne d'attaque active
            (le composant retourne null sinon, donc pas de filler
            visuel sur les bons mandats). On limite l'affichage aux
            2 plus virulentes pour ne pas écraser la « DERNIÈRE
            DÉCISION » juste en dessous. */}
        <OppositionAttackPanel
          lines={state.attackLines ?? []}
          mode="dashboard"
        />

        {lastEntry ? (
          <View
            style={[
              styles.lastDecision,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.lastDecisionHeader}>
              <Image
                source={DASHBOARD_ICON_IMAGES.decision}
                style={styles.headerIconSm}
                resizeMode="contain"
              />
              <Text
                style={[styles.lastDecisionLabel, { color: colors.mutedForeground }]}
              >
                DERNIÈRE DÉCISION — {formatGameDayLabel(turnToGameDay(lastEntry.turn)).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.lastEvent, { color: colors.foreground }]}>
              {lastEntry.eventTitle}
            </Text>
            <Text style={[styles.lastChoice, { color: colors.primary }]}>
              → {lastEntry.choiceLabel}
            </Text>
            <Text style={[styles.lastConsequence, { color: colors.cardForeground }]}>
              {lastEntry.consequence}
            </Text>

            {lastHeadlineEntry?.aiHeadline ? (() => {
              // Module 4 — bandeau coloré per-média.
              // Pour les nouvelles unes, `mediaId` identifie un des 4
              // médias fictifs et on tire couleur/icône de
              // `MEDIA_OUTLETS`. Pour les anciennes saves (sans
              // `mediaId`, générées par l'IA Module IA 3), on retombe
              // sur la couleur primaire et l'icône `rss` neutre —
              // l'affichage reste lisible.
              const h = lastHeadlineEntry.aiHeadline;
              const media = h.mediaId ? MEDIA_OUTLETS[h.mediaId] : null;
              const accentColor = media?.color ?? colors.primary;
              const iconName = media?.icon ?? "rss";
              return (
                <View
                  style={[
                    styles.headlineBox,
                    {
                      borderLeftColor: accentColor,
                      backgroundColor: colors.muted,
                    },
                  ]}
                >
                  <View style={styles.headlineMetaRow}>
                    <Feather name={iconName} size={11} color={accentColor} />
                    <Text
                      style={[styles.headlineOutlet, { color: accentColor }]}
                      numberOfLines={1}
                    >
                      {h.outlet.toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.headlineToneBadge,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.headlineToneText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {h.tone}
                      </Text>
                    </View>
                  </View>
                  {media?.tagline ? (
                    <Text
                      style={[
                        styles.headlineSnippet,
                        { color: colors.mutedForeground, marginBottom: 4 },
                      ]}
                    >
                      {media.tagline}
                    </Text>
                  ) : null}
                  <Text
                    style={[styles.headlineTitle, { color: colors.foreground }]}
                  >
                    « {h.headline} »
                  </Text>
                  {h.snippet ? (
                    <Text
                      style={[
                        styles.headlineSnippet,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {h.snippet}
                    </Text>
                  ) : null}
                </View>
              );
            })() : null}

            {lastEntry.oppositionReaction ? (() => {
              const r = lastEntry.oppositionReaction;
              const tint =
                r.stance === "exploit" || r.stance === "denounce"
                  ? colors.danger
                  : r.stance === "criticize"
                    ? colors.warning
                    : r.stance === "approve"
                      ? colors.success
                      : colors.mutedForeground;
              // Defensive: if a future schema/migration sneaks in a stance
              // value missing from the label map (or an empty AI line),
              // we still want a readable string instead of a crash.
              const stanceLabel =
                OPPOSITION_STANCE_LABELS[r.stance] ?? "Réagit";
              const oppositionLine =
                typeof r.line === "string" && r.line.trim().length > 0
                  ? r.line
                  : "L'opposition prend acte sans s'exprimer.";
              return (
                <View
                  style={[
                    styles.oppositionBox,
                    {
                      borderLeftColor: tint,
                      backgroundColor: colors.muted,
                    },
                  ]}
                >
                  <View style={styles.oppositionMetaRow}>
                    <Feather name="users" size={11} color={tint} />
                    <Text
                      style={[styles.oppositionLabel, { color: tint }]}
                      numberOfLines={1}
                    >
                      OPPOSITION
                    </Text>
                    <View
                      style={[
                        styles.oppositionStanceBadge,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.oppositionStanceText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {stanceLabel.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.oppositionLine,
                      { color: colors.foreground },
                    ]}
                  >
                    {oppositionLine}
                  </Text>
                </View>
              );
            })() : null}
          </View>
        ) : (
          <View
            style={[
              styles.emptyBriefing,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Image
              source={DASHBOARD_HERO}
              style={styles.emptyHero}
              resizeMode="cover"
            />
            <View style={styles.emptyHeader}>
              <Image
                source={DASHBOARD_ICON_IMAGES.briefingEmpty}
                style={styles.emptyHeaderIcon}
                resizeMode="contain"
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Salle de crise opérationnelle
              </Text>
            </View>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Lancez la prochaine crise pour recevoir un briefing.
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + webBottomInset + 16,
          },
        ]}
      >
        <AlertTicker
          regions={state.regions}
          log={state.log}
          pendingRegionalTitle={pendingRegionalTitle}
          eventNotifications={state.eventNotifications}
        />

        <View style={styles.bottomBarInner}>
        {/* Bouton visible uniquement quand un briefing est disponible sans sauter du temps */}
        {!state.currentEvent &&
          !!state.gameTime &&
          state.gameTime.currentMonth >= state.gameTime.nextEventMonth ? (
          <Pressable
            onPress={handleDrawAvailable}
            style={({ pressed }) => [
              styles.crisisBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Image
              source={DASHBOARD_ACTION_IMAGES.criseSuivante}
              style={styles.crisisBtnThumb}
              resizeMode="contain"
            />
            <Text
              style={[styles.crisisBtnText, { color: colors.primaryForeground }]}
            >
              OUVRIR LE BRIEFING
            </Text>
          </Pressable>
        ) : null}
        </View>
      </View>

      {/* Module 8 — Bilan ANNUEL : modale bloquante avec « Continuer
          le mandat ». N'apparaît que 4 fois par mandat (mois 12 / 24
          / 36 / 48), pour les vrais moments forts. */}
      {state.gameTime?.pendingReport?.kind === "year" ? (
        <MandateReportModal
          report={state.gameTime.pendingReport}
          onDismiss={dismissReport}
        />
      ) : null}

      {/* Module 8 — Bilan TRIMESTRIEL : bandeau-toast non bloquant,
          rendu en surimpression du dashboard. Le ticker continue de
          tourner pendant l'affichage : c'est un feedback visuel, pas
          une interruption. Disparaît tout seul après ~4 s. */}
      {state.gameTime?.pendingReport?.kind === "quarter" ? (
        <QuarterReportToast
          report={state.gameTime.pendingReport}
          onDismiss={dismissReport}
        />
      ) : null}

      {state.currentEvent ? (
        <EventModal
          event={state.currentEvent}
          onResolve={resolveChoice}
          revealedHiddenKeys={state.revealedHiddenKeys}
          researchedTech={state.tech?.researched ?? []}
          activeDoctrines={state.tech?.activeDoctrines ?? []}
        />
      ) : null}
    </View>
  );
}

interface NavCardProps {
  iconSource: ImageSourcePropType;
  label: string;
  value: string;
  onPress: () => void;
}

function NavCard({ iconSource, label, value, onPress }: NavCardProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Image source={iconSource} style={styles.navIcon} resizeMode="cover" />
      <View style={{ flex: 1 }}>
        <Text style={[styles.navLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text style={[styles.navValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      </View>
      <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
    </Pressable>
  );
}

function SectionHeading({
  image,
  title,
}: {
  image: ImageSourcePropType;
  title: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeading}>
      <Image
        source={image}
        style={styles.sectionHeadingImg}
        resizeMode="cover"
      />
      <View
        style={[
          styles.sectionHeadingOverlay,
          { backgroundColor: "rgba(7,15,30,0.55)" },
        ]}
      />
      <View style={styles.sectionHeadingTextWrap}>
        <View
          style={[
            styles.sectionHeadingAccent,
            { backgroundColor: colors.primary },
          ]}
        />
        <Text style={[styles.sectionHeadingTitle, { color: colors.foreground }]}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 6,
  },
  sectionHeading: {
    marginTop: 8,
    height: 88,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  sectionHeadingImg: {
    width: "100%",
    height: "100%",
  },
  sectionHeadingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionHeadingTextWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeadingAccent: {
    width: 4,
    height: 22,
    borderRadius: 2,
  },
  sectionHeadingTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.4,
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 4,
  },
  headerIconSm: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  frontBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  emptyHero: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    marginBottom: 4,
  },
  emptyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  emptyHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  directorHintIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  crisisBtnThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  aiBtnThumb: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  gaugesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gaugeWrap: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  frontBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  frontBtnLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  frontBtnSub: {
    fontSize: 11,
    marginTop: 2,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexBasis: "48%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  navLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  navValue: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  lastDecision: {
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
    marginTop: 6,
  },
  lastDecisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lastDecisionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  lastEvent: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  lastChoice: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  lastConsequence: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  headlineBox: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderRadius: 4,
    gap: 6,
  },
  headlineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headlineOutlet: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  headlineToneBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  headlineToneText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headlineTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    fontStyle: "italic",
  },
  headlineSnippet: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },
  headlinePending: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  oppositionBox: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderRadius: 4,
    gap: 6,
  },
  oppositionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  oppositionLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  oppositionStanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  oppositionStanceText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  oppositionLine: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  headlineRetry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  headlineRetryText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  emptyBriefing: {
    padding: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  bottomBarInner: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  crisisBtn: {
    paddingVertical: 16,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  crisisBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  aiBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  aiBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  aiError: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  directorHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  directorHintText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
  },
  intelCard: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  intelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  intelLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  intelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  intelName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1.4,
  },
  intelTrack: {
    height: 5,
    borderRadius: 3,
    flex: 2,
    overflow: "hidden",
  },
  intelFill: {
    height: "100%",
    borderRadius: 3,
  },
  intelValue: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    width: 26,
    textAlign: "right",
  },
});
