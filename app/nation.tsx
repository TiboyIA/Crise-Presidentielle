import React, { useMemo, useState } from "react";
import { Alert, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { PowerBadge } from "@/components/PowerBadge";
import { MissionCard } from "@/components/MissionCard";
import { Badge, Panel, SectionHeader } from "@/components/ui";
import { StrategicClock } from "@/components/StrategicClock";
import { BUILDINGS } from "@/data/buildings";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { COUNTRIES } from "@/data/countries";
import { DOCTRINES, DOCTRINE_LIST } from "@/data/doctrines";
import { REFORMS, REFORM_LIST, CATEGORY_COLOR } from "@/data/reforms";
import { STRATEGY_MINISTERS, CABINET_PRIMARY, CABINET_SECONDARY } from "@/data/strategyMinisters";
import type { StrategyMinisterId } from "@/data/strategyMinisters";
import type { GovernanceDoctrine, ReformId } from "@/types/strategy";
import { timeRemaining, formatDuration } from "@/logic/buildingEngine";
import { getPlayerRank, getRankTitle, getTitleIcon } from "@/logic/botEngine";
import { RESOURCE_LABELS } from "@/types/strategy";
import { BG, RESOURCE_IMG } from "@/constants/assets";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { ResourceKey } from "@/types/strategy";
import { isDailyRewardReady, getNextReward } from "@/data/dailyRewards";
import { usePortrait } from "@/context/PortraitContext";
import { useComfort } from "@/context/ComfortContext";
import { LowLoadBanner } from "@/components/LowLoadBanner";
import { isRankedIntended } from "@/services/RankedService";
import { computeFrustration, BAND_LABELS, BAND_COLORS } from "@/logic/frustrationEngine";
import { computePlayerStyle } from "@/logic/playerSegmentation";
import { generateRecommendations } from "@/logic/recommendationEngine";
import {
  CONTRIBUTION_TIERS,
  computeProtectionPct,
  getProtectionLabel,
} from "@/logic/resilienceFundEngine";
import type { ContributionTier } from "@/logic/resilienceFundEngine";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const NAV_ITEMS: { mcIcon: McIconName; label: string; route: string; tint?: string }[] = [
  { mcIcon: "city-variant-outline",        label: "Bâtiments",        route: "/buildings",            tint: PALETTE.gold },
  { mcIcon: "earth",                       label: "Salle de crise",   route: "/worldmap",             tint: PALETTE.crimson },
  { mcIcon: "sword-cross",                 label: "Opérations",       route: "/operations",           tint: PALETTE.danger },
  { mcIcon: "tank",                        label: "Forces Armées",    route: "/forces-armees",        tint: "#e54848" },
  { mcIcon: "flask-outline",               label: "Recherche",        route: "/strategy-research",    tint: "#a78bfa" },
  { mcIcon: "trophy-outline",              label: "Classement",       route: "/ranking",              tint: PALETTE.gold },
  { mcIcon: "clipboard-list-outline",      label: "Missions",         route: "/missions",             tint: PALETTE.info },
  { mcIcon: "newspaper-variant-outline",   label: "Journal de Crise", route: "/journal-crise",        tint: PALETTE.crimson },
  { mcIcon: "orbit",                       label: "Forces Cosmiques", route: "/entities",             tint: "#9b59b6" },
  { mcIcon: "shield-half-full",            label: "Risques",          route: "/risques",              tint: "#4a9fff" },
  { mcIcon: "alert-decagram-outline",      label: "Registre Risques", route: "/risks",                tint: "#e54848" },
];

const RESOURCE_ORDER: ResourceKey[] = ["money", "influence", "energy", "intelligence", "technology", "military", "cyberDefense"];

const INDICATOR_LABELS: Record<string, string> = {
  popularity: "Popularité",
  economy: "Économie",
  security: "Sécurité",
  ecology: "Écologie",
  cohesion: "Cohésion",
  publicBudget: "Budget",
};

const INDICATOR_COLORS: Record<string, string> = {
  popularity: "#c9a84c",
  economy:    "#3fbe7a",
  security:   "#4a9fff",
  ecology:    "#52c97a",
  cohesion:   "#a78bfa",
  publicBudget: "#e8a93a",
};

export default function NationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, collectMissionReward, shouldShowBilan, adoptDoctrine, launchReform, fireMinister, claimDailyReward, contributeFund } = useStrategy();
  const { selectedPortrait } = usePortrait();
  const { lowLoad, reducedInfo, contrastBoost } = useComfort();
  const [doctrineExpanded, setDoctrineExpanded] = useState(false);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [reformsExpanded, setReformsExpanded] = useState(false);
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);
  const [advisorDismissed, setAdvisorDismissed] = useState(false);
  const [lowLoadExpanded, setLowLoadExpanded] = useState(false);
  const [baromExpanded, setBaromExpanded] = useState(false);
  const [secondairesExpanded, setSecondairesExpanded] = useState(false);
  const { hPad, navCols, maxContentWidth } = useResponsive();

  const frustration       = useMemo(() => (state ? computeFrustration(state) : null),        [state]);
  const playerStyle       = useMemo(() => (state ? computePlayerStyle(state) : null),        [state]);
  const recommendations   = useMemo(() => (state ? generateRecommendations(state) : []),     [state]);

  if (!state) return null;

  const country = COUNTRIES[state.countryId];
  const rewardReady = isDailyRewardReady(state.dailyLoginReward);
  const nextReward = getNextReward(state.dailyLoginReward);
  const rank = getPlayerRank(state.ranking);
  const title = getRankTitle(rank, state.ranking.length);
  const titleIcon = getTitleIcon(title);

  const pendingMissions = state.missions.filter((m) => m.completed);
  const activeMissions = state.missions.filter((m) => !m.completed);
  const upgrading = state.buildings.filter((b) => b.upgradeEndTime !== null);
  const xpPct = Math.min(100, (state.stats.presidentXP / 100) * 100);

  return (
    <View style={styles.root}>
      {/* MODAL RÉCOMPENSE QUOTIDIENNE */}
      <Modal
        visible={rewardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRewardModalVisible(false)}
      >
        <Pressable style={styles.rewardOverlay} onPress={() => setRewardModalVisible(false)}>
          <Pressable style={styles.rewardModal} onPress={() => {}}>
            <Text style={styles.rewardModalIcon}>{nextReward.icon}</Text>
            <Text style={styles.rewardModalKicker}>{nextReward.dayLabel} / 7</Text>
            <Text style={styles.rewardModalTitle}>{nextReward.title}</Text>
            <Text style={styles.rewardModalDesc}>{nextReward.description}</Text>
            {state.dailyLoginReward && state.dailyLoginReward.currentStreak > 1 && (
              <Text style={styles.rewardStreak}>
                🔥 {state.dailyLoginReward.currentStreak} jours consécutifs
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.rewardClaimBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => {
                claimDailyReward();
                setRewardModalVisible(false);
              }}
            >
              <Text style={styles.rewardClaimBtnText}>RÉCLAMER</Text>
            </Pressable>
            <Pressable onPress={() => setRewardModalVisible(false)} style={styles.rewardDismiss}>
              <Text style={styles.rewardDismissText}>Plus tard</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* HERO */}
      <ImageBackground source={BG.dashboard} style={[styles.hero, { paddingTop: insets.top + 8 }]} resizeMode="cover" imageStyle={styles.heroImg}>
        <LinearGradient colors={["rgba(6,8,18,0.05)", "rgba(6,8,18,0.55)", "rgba(10,12,20,0.95)"]} locations={[0, 0.5, 1]} style={styles.heroGrad}>
          <View style={[styles.heroInner, { paddingHorizontal: hPad }]}>
            <View style={styles.heroTop}>
              <View style={{ gap: 2 }}>
                <Pressable
                  onPress={() => router.replace("/")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Retour au menu principal"
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, alignSelf: "flex-start" })}
                >
                  <Text style={styles.kicker}>← MENU PRINCIPAL</Text>
                </Pressable>
                <Text style={styles.mandateDay}>Jour {state.mandateDay}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Badge label={`Saison ${state.stats.season}`} tone="gold" size="xs" />
                <Pressable
                  onPress={() => router.push("/briefing" as any)}
                  style={({ pressed }) => [styles.briefingBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialCommunityIcons name="file-document-outline" size={13} color={PALETTE.gold} />
                  <Text style={styles.briefingBtnText}>BRIEFING</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/settings" as any)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <MaterialCommunityIcons name="cog-outline" size={16} color={PALETTE.textMid} />
                </Pressable>
                {__DEV__ && (
                  <Pressable
                    onPress={() => router.push("/strategy-debug" as any)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.4 })}
                  >
                    <MaterialCommunityIcons name="bug-outline" size={14} color="#a78bfa" />
                  </Pressable>
                )}
                {__DEV__ && (
                  <Pressable
                    onPress={() => router.push("/dev-stats" as any)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.4 })}
                  >
                    <MaterialCommunityIcons name="chart-bar" size={14} color={PALETTE.info} />
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.heroRow}>
              <View style={[styles.flagFrame, { backgroundColor: selectedPortrait.bgColor, borderColor: selectedPortrait.borderColor }]}>
                <Text style={styles.flag}>{selectedPortrait.icon}</Text>
                <View style={styles.flagBadge}>
                  <Text style={styles.flagBadgeText}>{country.flag}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.country}>{country.name}</Text>
                <Text style={styles.player} numberOfLines={1}>
                  {state.playerName} · Niveau {state.stats.presidentLevel}
                </Text>
                <View style={styles.titleRow}>
                  <Text style={styles.titleIcon}>{titleIcon}</Text>
                  <Text style={styles.titleText}>{title}</Text>
                  <Text style={styles.rankText}>· #{rank}</Text>
                </View>
              </View>
              <PowerBadge power={state.stats.globalPower} size="lg" />
            </View>

            {/* XP bar */}
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>EXPÉRIENCE</Text>
              <View style={styles.xpTrack}>
                <LinearGradient colors={[PALETTE.crimson, PALETTE.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.xpFill, { width: `${xpPct}%` }]} />
              </View>
              <Text style={styles.xpVal}>{state.stats.presidentXP}/100</Text>
            </View>

            {/* PROFIL STRATÉGIQUE — visible dès le jour 5 */}
            {playerStyle && (
              <View style={styles.styleChip}>
                <MaterialCommunityIcons
                  name={playerStyle.def.icon as any}
                  size={10}
                  color={playerStyle.def.color}
                />
                <Text style={[styles.styleChipText, { color: playerStyle.def.color }]}>
                  Profil : {playerStyle.def.label}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad },
          maxContentWidth ? { maxWidth: maxContentWidth, alignSelf: "center", width: "100%" } : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HORLOGE STRATÉGIQUE — drives mandate progression in real time */}
        <StrategicClock />

        {/* PRIORITÉ — Mode Faible Charge Mentale */}
        {lowLoad && (() => {
          const topRec = recommendations[0];
          if (!topRec) return null;
          const color = topRec.priority === 1 ? PALETTE.danger : topRec.priority === 2 ? PALETTE.info : PALETTE.textMid;
          const icon = topRec.priority === 1 ? "alert-circle-outline" : "compass-outline";
          return (
            <LowLoadBanner
              text={topRec.title + " — " + topRec.reason}
              icon={icon as any}
              color={color}
              actionLabel="Agir"
              actionRoute={topRec.targetRoute}
            />
          );
        })()}

        {/* MODE CLASSÉ ACTIF */}
        {isRankedIntended() && (
          <View style={styles.rankedBadge}>
            <MaterialCommunityIcons name="sword-cross" size={11} color={PALETTE.gold} />
            <Text style={styles.rankedBadgeText}>MODE CLASSÉ ACTIF</Text>
          </View>
        )}

        {/* RÉCOMPENSE QUOTIDIENNE */}
        {rewardReady && (
          <Pressable
            onPress={() => setRewardModalVisible(true)}
            style={({ pressed }) => [styles.rewardCard, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.rewardIcon}>{nextReward.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardCardLabel}>RÉCOMPENSE DU JOUR · {nextReward.dayLabel}</Text>
              <Text style={styles.rewardCardTitle}>{nextReward.title}</Text>
              <Text style={styles.rewardCardDesc}>{nextReward.description}</Text>
            </View>
            <MaterialCommunityIcons name="gift-outline" size={20} color={PALETTE.gold} />
          </Pressable>
        )}

        {/* CONSEIL STRATÉGIQUE — s'affiche si frustrationScore > 70 */}
        {!advisorDismissed && frustration?.recommendation && (
          <Pressable
            onPress={() => router.push(frustration.recommendation!.actionRoute as any)}
            style={({ pressed }) => [styles.advisorCard, { opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={styles.advisorHeader}>
              <MaterialCommunityIcons name="lightbulb-outline" size={13} color="#e8a93a" />
              <Text style={styles.advisorKicker}>CONSEIL STRATÉGIQUE</Text>
              <View style={[styles.advisorBandBadge, {
                borderColor: BAND_COLORS[frustration.band] + "55",
                backgroundColor: BAND_COLORS[frustration.band] + "18",
              }]}>
                <Text style={[styles.advisorBandText, { color: BAND_COLORS[frustration.band] }]}>
                  {BAND_LABELS[frustration.band].toUpperCase()}
                </Text>
              </View>
              <Pressable
                onPress={(e) => { e.stopPropagation(); setAdvisorDismissed(true); }}
                hitSlop={10}
                style={styles.advisorDismissBtn}
              >
                <MaterialCommunityIcons name="close" size={14} color="#6b7280" />
              </Pressable>
            </View>
            <Text style={styles.advisorConseil}>{frustration.recommendation.conseil}</Text>
            {frustration.recommendation.missionTitle && (
              <View style={styles.advisorMission}>
                <MaterialCommunityIcons name="flag-outline" size={11} color="#4a9fff" />
                <Text style={styles.advisorMissionLabel} numberOfLines={1}>
                  Mission : {frustration.recommendation.missionTitle}
                </Text>
              </View>
            )}
            <View style={styles.advisorAction}>
              <Text style={styles.advisorActionLabel}>{frustration.recommendation.actionLabel}</Text>
              <MaterialCommunityIcons name="arrow-right" size={12} color="#e8a93a" />
            </View>
          </Pressable>
        )}

        {/* RESOURCES STRIP */}
        <SectionHeader label="Ressources nationales" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.resourceStrip}
        >
          {RESOURCE_ORDER.map((key) => (
            <ResourceChip
              key={key}
              imgKey={key}
              label={RESOURCE_LABELS[key]}
              value={Math.floor(state.resources[key])}
            />
          ))}
        </ScrollView>

        {/* BAROMÈTRE NATIONAL */}
        <SectionHeader label="Baromètre national" trailing={
          reducedInfo
            ? <Pressable onPress={() => setBaromExpanded((v) => !v)}>
                <Text style={styles.showMoreText}>{baromExpanded ? "Réduire ↑" : "Voir ↓"}</Text>
              </Pressable>
            : undefined
        } />
        {(!reducedInfo || baromExpanded) && (
        <Panel style={styles.barometre}>
          <View style={styles.barometreGrid}>
            {Object.entries(state.nationalIndicators).map(([key, val]) => {
              const pct = key === "publicBudget"
                ? Math.max(0, (val + 150) / 250)
                : val / 100;
              const color = INDICATOR_COLORS[key] ?? PALETTE.gold;
              const isLow = key === "publicBudget" ? val < -80 : val < 30;
              return (
                <View key={key} style={styles.barometreItem}>
                  <View style={styles.barometreLabelRow}>
                    <View style={styles.barometreLabelWrap}>
                      {isLow && <MaterialCommunityIcons name="alert" size={9} color={PALETTE.danger} />}
                      <Text style={[styles.barometreLabel, contrastBoost && { color: PALETTE.textMid }]}>{INDICATOR_LABELS[key]}</Text>
                    </View>
                    <View style={styles.barometreValWrap}>
                      {isLow && <Text style={styles.barometreAlertBadge}>CRITIQUE</Text>}
                      <Text style={[styles.barometreVal, isLow && { color: PALETTE.danger }, contrastBoost && !isLow && { color: PALETTE.textHigh }]}>
                        {key === "publicBudget" ? (val >= 0 ? `+${val}` : `${val}`) : `${val}%`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.barometreTrack}>
                    <View style={[styles.barometreFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: isLow ? PALETTE.danger : color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </Panel>
        )}

        {/* SECTIONS SECONDAIRES — masquées en mode Faible Charge Mentale */}
        {lowLoad && !lowLoadExpanded && (
          <Pressable
            onPress={() => setLowLoadExpanded(true)}
            style={({ pressed }) => [styles.showMoreBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <MaterialCommunityIcons name="chevron-down" size={14} color={PALETTE.textLow} />
            <Text style={styles.showMoreText}>Voir tout le tableau de bord</Text>
          </Pressable>
        )}
        {lowLoad && lowLoadExpanded && (
          <Pressable
            onPress={() => setLowLoadExpanded(false)}
            style={({ pressed }) => [styles.showMoreBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <MaterialCommunityIcons name="chevron-up" size={14} color={PALETTE.textLow} />
            <Text style={styles.showMoreText}>Réduire</Text>
          </Pressable>
        )}

        {(!lowLoad || lowLoadExpanded) && (
          <>

        {/* FONDS NATIONAL DE RÉSILIENCE */}
        {(() => {
          const fund = state.resilienceFund ?? { balance: 0, monthlyContribution: 0, protectionLevel: 0 };
          const protPct = computeProtectionPct(fund.balance);
          const { label: protLabel, color: protColor } = getProtectionLabel(protPct);
          const tiers: ContributionTier[] = ["faible", "moyenne", "forte"];
          return (
            <Panel style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="shield-check-outline" size={14} color="#3fbe7a" />
                <Text style={[styles.sectionTitle, { color: "#3fbe7a" }]}>RÉSERVE DE RÉSILIENCE</Text>
                <View style={[styles.protChip, { borderColor: protColor + "55", backgroundColor: protColor + "14" }]}>
                  <Text style={[styles.protChipText, { color: protColor }]}>{protLabel}</Text>
                </View>
              </View>
              <View style={styles.fundRow}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.fundBalance}>{fund.balance.toLocaleString("fr-FR")} M€</Text>
                  <Text style={styles.fundSub}>
                    {protPct > 0
                      ? `Absorbe jusqu'à ${protPct}% du coût des crises critiques`
                      : "Aucune protection — constituez une réserve"}
                  </Text>
                </View>
                {fund.balance > 0 && (
                  <View style={styles.protBar}>
                    <View style={[styles.protBarFill, { width: `${protPct * 2}%`, backgroundColor: protColor }]} />
                  </View>
                )}
              </View>
              <View style={styles.tierRow}>
                {tiers.map((tier) => {
                  const def = CONTRIBUTION_TIERS[tier];
                  return (
                    <Pressable
                      key={tier}
                      onPress={() => {
                        const r = contributeFund(tier);
                        if (!r.success) Alert.alert("Impossible", r.reason ?? "Fonds insuffisants");
                      }}
                      style={({ pressed }) => [styles.tierBtn, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Text style={styles.tierLabel}>{def.label}</Text>
                      <Text style={styles.tierCost}>−{def.moneyCost} M€</Text>
                      <Text style={styles.tierGain}>+{def.balanceGain} réserve</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Panel>
          );
        })()}

        {/* DOCTRINE DE GOUVERNANCE */}
        {(() => {
          const doctrine = DOCTRINES[state.governanceDoctrine];
          return (
            <Panel style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="crown-outline" size={14} color={PALETTE.gold} />
                <Text style={styles.sectionTitle}>DOCTRINE DE GOUVERNANCE</Text>
                <Pressable onPress={() => setDoctrineExpanded((v) => !v)} style={styles.expandBtn}>
                  <MaterialCommunityIcons name={doctrineExpanded ? "chevron-up" : "chevron-down"} size={16} color={PALETTE.textMid} />
                </Pressable>
              </View>
              <View style={styles.doctrineRow}>
                <MaterialCommunityIcons name={doctrine.icon as any} size={22} color={doctrine.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.doctrineName, { color: doctrine.color }]}>{doctrine.name}</Text>
                  <Text style={styles.doctrineSlogan}>"{doctrine.slogan}"</Text>
                </View>
              </View>
              {doctrineExpanded && (
                <View style={styles.doctrineAlt}>
                  <Text style={styles.doctrineAltTitle}>CHANGER DE DOCTRINE :</Text>
                  {DOCTRINE_LIST.filter((d) => d.id !== state.governanceDoctrine).map((d) => (
                    <Pressable
                      key={d.id}
                      onPress={() => {
                        const r = adoptDoctrine(d.id as GovernanceDoctrine);
                        if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur");
                        else setDoctrineExpanded(false);
                      }}
                      style={({ pressed }) => [styles.doctrineOption, { opacity: pressed ? 0.75 : 1, borderColor: d.color + "44" }]}
                    >
                      <MaterialCommunityIcons name={d.icon as any} size={16} color={d.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.doctrineOptionName, { color: d.color }]}>{d.name}</Text>
                        <Text style={styles.doctrineRisk}>{d.risks}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </Panel>
          );
        })()}

        {/* RÉFORMES NATIONALES */}
        {(() => {
          const activeReforms = state.reforms.filter((r) => !r.applied);
          const availableReforms = REFORM_LIST.filter((def) => !state.reforms.some((r) => r.id === def.id && !r.applied));
          return (
            <Panel style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="text-box-check-outline" size={14} color={PALETTE.gold} />
                <Text style={styles.sectionTitle}>RÉFORMES NATIONALES</Text>
                {activeReforms.length > 0 && (
                  <View style={styles.reformBadge}>
                    <Text style={styles.reformBadgeText}>{activeReforms.length}</Text>
                  </View>
                )}
                <Pressable onPress={() => setReformsExpanded((v) => !v)} style={styles.expandBtn}>
                  <MaterialCommunityIcons name={reformsExpanded ? "chevron-up" : "chevron-down"} size={16} color={PALETTE.textMid} />
                </Pressable>
              </View>
              {activeReforms.length === 0 && !reformsExpanded && (
                <Text style={styles.reformEmpty}>Aucune réforme en cours — lancez-en une</Text>
              )}
              {activeReforms.map((r) => {
                const def = REFORMS[r.id];
                const daysLeft = Math.max(0, r.completesAtDay - state.mandateDay);
                const pct = Math.min(100, ((r.completesAtDay - r.launchedAtDay - daysLeft) / (r.completesAtDay - r.launchedAtDay)) * 100);
                return (
                  <View key={r.id} style={styles.reformActive}>
                    <MaterialCommunityIcons name={def.icon as any} size={14} color={CATEGORY_COLOR[def.category]} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.reformName}>{def.name}</Text>
                      <View style={styles.reformTrack}>
                        <View style={[styles.reformFill, { width: `${pct}%`, backgroundColor: CATEGORY_COLOR[def.category] }]} />
                      </View>
                    </View>
                    <Text style={styles.reformEta}>{daysLeft}j</Text>
                  </View>
                );
              })}
              {reformsExpanded && (
                <View style={styles.reformsGrid}>
                  {availableReforms.map((def) => (
                    <Pressable
                      key={def.id}
                      onPress={() => {
                        const r = launchReform(def.id as ReformId);
                        if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur");
                        else setReformsExpanded(false);
                      }}
                      style={({ pressed }) => [styles.reformOption, { opacity: pressed ? 0.75 : 1, borderColor: CATEGORY_COLOR[def.category] + "44" }]}
                    >
                      <View style={styles.reformOptionHeader}>
                        <MaterialCommunityIcons name={def.icon as any} size={14} color={CATEGORY_COLOR[def.category]} />
                        <Text style={[styles.reformOptionName, { color: CATEGORY_COLOR[def.category] }]}>{def.name}</Text>
                        <Text style={styles.reformDuration}>{def.durationDays}j</Text>
                      </View>
                      <Text style={styles.reformDesc} numberOfLines={2}>{def.description}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Panel>
          );
        })()}

        {/* CABINET STRATÉGIQUE */}
        <Panel style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-tie-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>CABINET STRATÉGIQUE</Text>
          </View>
          {/* Debt indicator */}
          {(() => {
            const debt = state.nationalDebt ?? 0;
            const debtColor = debt > 400 ? PALETTE.danger : debt > 250 ? PALETTE.warning : "#52c97a";
            const debtPct = Math.min(100, (debt / 500) * 100);
            return (
              <View style={styles.debtRow}>
                <MaterialCommunityIcons name="bank-outline" size={12} color={debtColor} />
                <Text style={[styles.debtLabel, { color: debtColor }]}>DETTE SOUVERAINE</Text>
                <View style={styles.debtTrack}>
                  <View style={[styles.debtFill, { width: `${debtPct}%`, backgroundColor: debtColor }]} />
                </View>
                <Text style={[styles.debtVal, { color: debtColor }]}>{debt}</Text>
              </View>
            );
          })()}
          {/* Primary ministers */}
          <View style={styles.cabinetGrid}>
            {state.strategyMinisters
              .filter((m) => CABINET_PRIMARY.includes(m.id as any))
              .map((m) => <MinisterRow key={m.id} m={m} onFire={fireMinister} />)}
          </View>

          {/* Secondary ministers — collapsible */}
          <Pressable onPress={() => setSecondaryExpanded((v) => !v)} style={styles.secondaryCabinetToggle}>
            <MaterialCommunityIcons name="account-multiple-outline" size={12} color={PALETTE.textLow} />
            <Text style={styles.secondaryCabinetLabel}>
              {secondaryExpanded ? "MASQUER LE GOUVERNEMENT ÉTENDU" : "VOIR LE GOUVERNEMENT ÉTENDU"}
            </Text>
            <MaterialCommunityIcons name={secondaryExpanded ? "chevron-up" : "chevron-down"} size={14} color={PALETTE.textLow} />
          </Pressable>
          {secondaryExpanded && (
            <View style={styles.cabinetGrid}>
              {state.strategyMinisters
                .filter((m) => CABINET_SECONDARY.includes(m.id as any))
                .map((m) => <MinisterRow key={m.id} m={m} onFire={fireMinister} />)}
            </View>
          )}
        </Panel>

          </>
        )}

        {/* BILAN DISPONIBLE BANNER */}
        {shouldShowBilan && (
          <Pressable onPress={() => router.push("/mandate-review" as any)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <Panel variant="gold" glow style={styles.bilanBanner}>
              <MaterialCommunityIcons name="medal-outline" size={20} color={PALETTE.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bilanTitle}>BILAN DE MANDAT DISPONIBLE</Text>
                <Text style={styles.bilanSub}>Jour {state.mandateDay} · Consultez votre bilan présidentiel</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.gold} />
            </Panel>
          </Pressable>
        )}

        {/* ALERTS — upgrades in progress */}
        {upgrading.length > 0 && (
          <Panel variant="gold" glow style={styles.alertPanel}>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="hammer-wrench" size={14} color={PALETTE.gold} />
              <Text style={styles.alertTitle}>AMÉLIORATIONS EN COURS</Text>
              <Badge label={`${upgrading.length}`} tone="gold" size="xs" />
            </View>
            {upgrading.map((b) => (
              <View key={b.id} style={styles.alertRow}>
                <Text style={styles.alertName}>{BUILDINGS[b.id].name}</Text>
                <Text style={styles.alertEta}>{formatDuration(timeRemaining(b))}</Text>
              </View>
            ))}
          </Panel>
        )}

        {/* ACTIONS PRIORITAIRES — hiérarchie décisionnelle */}
        {recommendations.length > 0 && (() => {
          const critiques   = recommendations.filter((r) => r.priority === 1);
          const importantes = recommendations.filter((r) => r.priority === 2).slice(0, 2);
          const secondaires = recommendations.filter((r) => r.priority === 3);
          return (
            <View style={styles.actionSection}>
              <SectionHeader label="Actions prioritaires" />

              {/* ── CRITIQUE : À TRAITER MAINTENANT ── */}
              {critiques[0] && (
                <Pressable
                  onPress={() => router.push(critiques[0].targetRoute as any)}
                  style={({ pressed }) => [styles.actionCritiqueCard, { opacity: pressed ? 0.9 : 1 }]}
                >
                  <View style={styles.actionLabelRow}>
                    <MaterialCommunityIcons name="alert-octagon" size={10} color={PALETTE.danger} />
                    <Text style={[styles.actionLabel, { color: PALETTE.danger }]}>À TRAITER MAINTENANT</Text>
                  </View>
                  <Text style={styles.actionCritiqueTitle}>{critiques[0].title}</Text>
                  <Text style={styles.actionReason} numberOfLines={2}>{critiques[0].reason}</Text>
                  <View style={styles.actionCta}>
                    <Text style={[styles.actionCtaText, { color: PALETTE.danger }]}>Agir →</Text>
                  </View>
                </Pressable>
              )}

              {/* ── IMPORTANTES : PEUT ATTENDRE ── */}
              {importantes.length > 0 && (
                <View style={styles.actionImportantGroup}>
                  <View style={styles.actionLabelRow}>
                    <MaterialCommunityIcons name="clock-outline" size={10} color={PALETTE.warning} />
                    <Text style={[styles.actionLabel, { color: PALETTE.warning }]}>PEUT ATTENDRE</Text>
                  </View>
                  {importantes.map((rec) => (
                    <Pressable
                      key={rec.id}
                      onPress={() => router.push(rec.targetRoute as any)}
                      style={({ pressed }) => [styles.actionImportantRow, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <View style={styles.actionDot} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.recTitle} numberOfLines={1}>{rec.title}</Text>
                        <Text style={styles.recReason} numberOfLines={1}>{rec.reason}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={14} color={PALETTE.textLow} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* ── SECONDAIRES : OPTIMISATION ── */}
              {secondaires.length > 0 && (
                <>
                  <Pressable
                    onPress={() => setSecondairesExpanded((v) => !v)}
                    style={({ pressed }) => [styles.actionOptToggle, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <MaterialCommunityIcons name="tune-vertical" size={10} color="#6b7280" />
                    <Text style={styles.actionOptLabel}>
                      OPTIMISATION · {secondaires.length} suggestion{secondaires.length > 1 ? "s" : ""}
                    </Text>
                    <MaterialCommunityIcons name={secondairesExpanded ? "chevron-up" : "chevron-down"} size={12} color="#6b7280" />
                  </Pressable>
                  {secondairesExpanded && secondaires.map((rec) => (
                    <Pressable
                      key={rec.id}
                      onPress={() => router.push(rec.targetRoute as any)}
                      style={({ pressed }) => [styles.actionOptRow, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <View style={[styles.actionDot, { backgroundColor: "#6b7280" }]} />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={styles.recTitle} numberOfLines={1}>{rec.title}</Text>
                        <Text style={styles.recReason} numberOfLines={1}>{rec.reason}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={14} color={PALETTE.textLow} />
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          );
        })()}

        {/* ACTIONS */}
        <SectionHeader label="Cabinet présidentiel" />
        <View style={styles.navGrid}>
          {NAV_ITEMS.map((item) => {
            const unread = item.route === "/journal-crise" ? (state.news?.unreadCount ?? 0) : 0;
            const upgrades = item.route === "/buildings" && upgrading.length > 0 ? upgrading.length : 0;
            const claimable = item.route === "/missions" && pendingMissions.length > 0 ? pendingMissions.length : 0;
            const hasCriticalPending = item.route === "/journal-crise" &&
              (state.news?.pendingIds ?? []).some((id) => {
                const e = NEWS_EVENT_MAP[id];
                return e?.isInteractive && e?.urgency === "critique";
              });
            const hasCosmicPending = item.route === "/entities" &&
              (state.news?.pendingIds ?? []).some((id) => id.startsWith("cosmic_"));
            const cellW = `${Math.floor(100 / navCols) - 1}%` as const;
            return (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.navCell,
                  { width: cellW, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <LinearGradient
                  colors={["#161b27", "#0c1018"]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={styles.navInner}
                >
                  <View style={[styles.navAccent, { backgroundColor: (item.tint ?? PALETTE.crimson) + "22" }]} />
                  <View style={styles.navIconRow}>
                    <MaterialCommunityIcons name={item.mcIcon} size={26} color={item.tint ?? PALETTE.gold} />
                    {hasCriticalPending ? (
                      <View style={[styles.navBadge, styles.navBadgeCritique]}>
                        <Text style={styles.navBadgeText}>CRITIQUE</Text>
                      </View>
                    ) : hasCosmicPending ? (
                      <View style={[styles.navBadge, styles.navBadgeCosmic]}>
                        <Text style={styles.navBadgeText}>SIGNAL</Text>
                      </View>
                    ) : (unread > 0 || upgrades > 0 || claimable > 0) ? (
                      <View style={styles.navBadge}>
                        <Text style={styles.navBadgeText}>{unread > 9 ? "9+" : unread + upgrades + claimable}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.navLabel}>{item.label}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* PENDING REWARDS */}
        {pendingMissions.length > 0 && (
          <>
            <SectionHeader label="Récompenses à réclamer" count={pendingMissions.length} accent={PALETTE.gold} />
            {pendingMissions.map((m) => (
              <MissionCard key={m.defId} mission={m} onCollect={() => collectMissionReward(m.defId)} />
            ))}
          </>
        )}

        {/* TODAY'S MISSIONS PREVIEW */}
        {activeMissions.length > 0 && (
          <>
            <SectionHeader
              label="Missions du jour"
              trailing={
                <Pressable onPress={() => router.push("/missions")}>
                  <Text style={styles.seeAll}>Voir tout →</Text>
                </Pressable>
              }
            />
            <MissionCard mission={activeMissions[0]} onCollect={() => collectMissionReward(activeMissions[0].defId)} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MinisterRow({ m, onFire }: { m: { id: string; name?: string; loyalty: number; competence: number; scandalRisk: number }; onFire: (id: string) => void }) {
  const def = STRATEGY_MINISTERS[m.id as StrategyMinisterId];
  if (!def) return null;
  const displayName = m.name ?? def.name;
  const loyaltyColor = m.loyalty < 40 ? PALETTE.danger : m.loyalty < 60 ? PALETTE.warning : def.specialtyColor;
  const canFire = m.loyalty < 40;
  return (
    <View style={styles.ministerChip}>
      <Text style={[styles.ministerSpec, { color: def.specialtyColor }]}>{def.specialty[0]}</Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.ministerName} numberOfLines={1}>{displayName.split(" ")[0]} {displayName.split(" ").slice(-1)}</Text>
        <View style={styles.ministerLoyaltyRow}>
          <View style={styles.ministerLoyaltyTrack}>
            <View style={[styles.ministerLoyaltyFill, { width: `${m.loyalty}%`, backgroundColor: loyaltyColor }]} />
          </View>
          <Text style={[styles.ministerLoyaltyVal, { color: loyaltyColor }]}>{m.loyalty}</Text>
          {m.loyalty < 40
            ? <Text style={[styles.ministerLoyaltyStatus, { color: PALETTE.danger }]}>CRITIQUE</Text>
            : m.loyalty < 60
            ? <Text style={[styles.ministerLoyaltyStatus, { color: PALETTE.warning }]}>VIGILANCE</Text>
            : null}
        </View>
      </View>
      {canFire && (
        <Pressable
          onPress={() => Alert.alert(
            "Limoger le ministre",
            `Remplacer ${displayName} ? (-5 confiance élites, -3 popularité)`,
            [
              { text: "Annuler", style: "cancel" },
              { text: "Limoger", style: "destructive", onPress: () => onFire(m.id) },
            ],
          )}
          style={({ pressed }) => [styles.fireBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="account-remove-outline" size={14} color={PALETTE.danger} />
        </Pressable>
      )}
    </View>
  );
}

function ResourceChip({ imgKey, label, value }: { imgKey: ResourceKey; label: string; value: number }) {
  const display = value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(1)}k` : `${value}`;
  return (
    <Panel style={styles.resourceCell}>
      <View style={styles.resourceRow}>
        <Image source={RESOURCE_IMG[imgKey]} style={styles.resourceImg} />
        <View>
          <Text style={styles.resourceVal}>{display}</Text>
          <Text style={styles.resourceLbl}>{label.toUpperCase()}</Text>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },
  rankedBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "66", backgroundColor: PALETTE.gold + "12" },
  rankedBadgeText: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  hero: { width: "100%" },
  heroImg: {},
  heroGrad: { paddingBottom: 14 },
  heroInner: { paddingTop: 8 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  kicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  mandateDay: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1 },
  briefingBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: PALETTE.gold + "55", backgroundColor: "rgba(201,168,76,0.08)" },
  briefingBtnText: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.5 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flagFrame: {
    width: 64, height: 64, borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1, borderColor: PALETTE.goldDim + "55",
    alignItems: "center", justifyContent: "center",
  },
  flag: { fontSize: 32 },
  flagBadge: {
    position: "absolute", bottom: -4, right: -4,
    backgroundColor: PALETTE.void, borderRadius: 12,
    paddingHorizontal: 2, paddingVertical: 1,
  },
  flagBadgeText: { fontSize: 18 },
  country: { fontSize: 22, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 0.5 },
  player: { fontSize: 12, fontFamily: FONT.med, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  titleIcon: { fontSize: 13 },
  titleText: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.3 },
  rankText: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textMid },

  xpRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  xpLabel: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5, width: 78 },
  xpTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 2 },
  xpVal: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.5 },

  content: { gap: 10, paddingTop: 12 },

  resourceStrip: { gap: 8, paddingRight: 8 },
  resourceCell: { paddingVertical: 8, paddingHorizontal: 10 },
  resourceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  resourceImg: { width: 22, height: 22, resizeMode: "contain" },
  resourceVal: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh, lineHeight: 16 },
  resourceLbl: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1 },

  alertPanel: { padding: 12, gap: 4 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  alertTitle: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.8, flex: 1 },
  alertRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 3 },
  alertName: { fontSize: 12, fontFamily: FONT.semi, color: PALETTE.textHigh },
  alertEta: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold },

  navGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  navCell: { borderRadius: RADIUS.md, overflow: "hidden" },
  navInner: { padding: 14, alignItems: "flex-start", gap: 10, minHeight: 90, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge, borderRadius: RADIUS.md, position: "relative", overflow: "hidden" },
  navAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  navIconRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  navBadge: { backgroundColor: PALETTE.danger, borderRadius: 8, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  navBadgeCritique: { backgroundColor: "#FF3040", borderRadius: 4, minWidth: 50, height: 16, paddingHorizontal: 5 },
  navBadgeCosmic: { backgroundColor: "#9b59b6", borderRadius: 4, minWidth: 44, height: 16, paddingHorizontal: 5 },
  navBadgeText: { fontSize: 9, fontFamily: FONT.bold, color: "#fff" },
  navLabel: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 0.3 },

  seeAll: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.5 },

  barometre: { padding: 12, gap: 8 },
  barometreGrid: { gap: 8 },
  barometreItem: { gap: 4 },
  barometreLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  barometreLabelWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  barometreValWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  barometreAlertBadge: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.danger, letterSpacing: 0.5, opacity: 0.85 },
  barometreLabel: { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textMid, letterSpacing: 0.5 },
  barometreVal: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textHigh },
  barometreTrack: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  barometreFill: { height: "100%", borderRadius: 2 },

  bilanBanner: { padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  bilanTitle: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.5 },
  bilanSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, marginTop: 2 },

  section: { padding: 12, gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2, flex: 1 },
  expandBtn: { padding: 4 },

  doctrineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  doctrineName: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  doctrineSlogan: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, fontStyle: "italic", marginTop: 2 },
  doctrineAlt: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PALETTE.panelEdge, paddingTop: 8, marginTop: 2 },
  doctrineAltTitle: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2, marginBottom: 4 },
  doctrineOption: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: RADIUS.sm, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)" },
  doctrineOptionName: { fontSize: 11, fontFamily: FONT.bold },
  doctrineRisk: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 },

  reformBadge: { backgroundColor: PALETTE.gold + "33", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  reformBadgeText: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold },
  reformEmpty: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", paddingVertical: 4 },
  reformActive: { flexDirection: "row", alignItems: "center", gap: 8 },
  reformName: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh },
  reformTrack: { height: 3, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  reformFill: { height: "100%", borderRadius: 2 },
  reformEta: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, width: 24, textAlign: "right" },
  reformsGrid: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PALETTE.panelEdge, paddingTop: 8 },
  reformOption: { padding: 8, borderRadius: RADIUS.sm, borderWidth: 1, gap: 4, backgroundColor: "rgba(255,255,255,0.03)" },
  reformOptionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  reformOptionName: { fontSize: 11, fontFamily: FONT.bold, flex: 1 },
  reformDuration: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid },
  reformDesc: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 13 },

  debtRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  debtLabel: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1.5 },
  debtTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  debtFill: { height: "100%", borderRadius: 2 },
  debtVal: { fontSize: 9, fontFamily: FONT.bold, width: 28, textAlign: "right" },

  cabinetGrid: { gap: 6 },
  ministerChip: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  ministerSpec: { fontSize: 18, fontFamily: FONT.bold, width: 20, textAlign: "center" },
  ministerName: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh },
  ministerLoyaltyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ministerLoyaltyTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  ministerLoyaltyFill: { height: "100%", borderRadius: 2 },
  ministerLoyaltyVal: { fontSize: 9, fontFamily: FONT.bold, width: 22, textAlign: "right" },
  ministerLoyaltyStatus: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 0.4, flexShrink: 0 },
  fireBtn: { padding: 6, borderRadius: RADIUS.xs, backgroundColor: PALETTE.danger + "22", borderWidth: 1, borderColor: PALETTE.danger + "44" },

  secondaryCabinetToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, justifyContent: "center" },
  secondaryCabinetLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.5, flex: 1, textAlign: "center" },

  // Daily reward card
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.gold + "55",
    backgroundColor: PALETTE.gold + "0d",
  },
  rewardIcon: { fontSize: 26 },
  rewardCardLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2, marginBottom: 2 },
  rewardCardTitle: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 0.3 },
  rewardCardDesc: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.gold, marginTop: 2 },

  // Daily reward modal
  rewardOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,6,10,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  rewardModal: {
    width: "100%",
    backgroundColor: "#0f131e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.gold + "44",
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  rewardModalIcon: { fontSize: 48 },
  rewardModalKicker: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 3, color: PALETTE.gold, marginTop: 4 },
  rewardModalTitle: { fontSize: 20, fontFamily: FONT.bold, color: "#ffffff", letterSpacing: 0.3, textAlign: "center" },
  rewardModalDesc: { fontSize: 14, fontFamily: FONT.med, color: PALETTE.gold, textAlign: "center", lineHeight: 20 },
  rewardStreak: { fontSize: 12, fontFamily: FONT.semi, color: "#ff9d3b", marginTop: 2 },
  rewardClaimBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: PALETTE.gold,
    alignItems: "center",
  },
  rewardClaimBtnText: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 3, color: "#05070d" },
  rewardDismiss: { paddingVertical: 8 },
  rewardDismissText: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textLow },

  // Frustration advisor card
  advisorCard: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#e8a93a44",
    backgroundColor: "#e8a93a0d",
    padding: 12,
    gap: 8,
  },
  advisorHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  advisorKicker: { fontSize: 8, fontFamily: FONT.bold, color: "#e8a93a", letterSpacing: 2, flex: 1 },
  advisorBandBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: RADIUS.xs, borderWidth: 1 },
  advisorBandText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 0.6 },
  advisorDismissBtn: { padding: 2 },
  advisorConseil: { fontSize: 12, fontFamily: FONT.reg, color: "#d1d5db", lineHeight: 17 },
  advisorMission: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4a9fff18",
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  advisorMissionLabel: { fontSize: 10, fontFamily: FONT.semi, color: "#4a9fff", flex: 1 },
  advisorAction: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" },
  advisorActionLabel: { fontSize: 10, fontFamily: FONT.bold, color: "#e8a93a", letterSpacing: 0.5 },

  // Style chip — profil stratégique discret dans le hero
  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  styleChipText: { fontSize: 9, fontFamily: FONT.med, letterSpacing: 0.8 },

  // Recommendation card
  recCard: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.info + "33",
    backgroundColor: PALETTE.info + "0a",
    overflow: "hidden",
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.info + "22",
  },
  recKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.info, letterSpacing: 2, flex: 1 },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  recDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  recTitle: { fontSize: 12, fontFamily: FONT.semi, color: PALETTE.textHigh },
  recReason: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14 },

  actionSection: { gap: 6 },
  actionCritiqueCard: { borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.danger + "55", backgroundColor: PALETTE.danger + "0d", padding: 12, gap: 6 },
  actionLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionLabel: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1.5 },
  actionCritiqueTitle: { fontSize: 14, fontFamily: FONT.semi, color: PALETTE.textHigh, lineHeight: 19 },
  actionReason: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15 },
  actionCta: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  actionCtaText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 0.5 },
  actionImportantGroup: { gap: 5 },
  actionImportantRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge, backgroundColor: PALETTE.panelHi },
  actionDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0, backgroundColor: PALETTE.info },
  actionOptToggle: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6 },
  actionOptLabel: { flex: 1, fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1.5, color: "#6b7280" },
  actionOptRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, paddingHorizontal: 12, borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge + "66" },

  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  showMoreText: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.5 },

  protChip: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, marginLeft: "auto" },
  protChipText: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1 },
  fundRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fundBalance: { fontSize: 18, fontFamily: FONT.bold, color: PALETTE.textHigh },
  fundSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14 },
  protBar: { width: 48, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  protBarFill: { height: "100%", borderRadius: 3 },
  tierRow: { flexDirection: "row", gap: 8 },
  tierBtn: { flex: 1, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.panelEdge, backgroundColor: PALETTE.panelHi, padding: 8, alignItems: "center", gap: 2 },
  tierLabel: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textHigh },
  tierCost: { fontSize: 9, fontFamily: FONT.semi, color: PALETTE.danger },
  tierGain: { fontSize: 8, fontFamily: FONT.reg, color: "#3fbe7a" },
});
