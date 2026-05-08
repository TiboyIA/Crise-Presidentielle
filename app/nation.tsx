import React from "react";
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { PowerBadge } from "@/components/PowerBadge";
import { MissionCard } from "@/components/MissionCard";
import { Badge, Panel, SectionHeader } from "@/components/ui";
import { BUILDINGS } from "@/data/buildings";
import { COUNTRIES } from "@/data/countries";
import { timeRemaining, formatDuration } from "@/logic/buildingEngine";
import { getPlayerRank, getRankTitle, getTitleIcon } from "@/logic/botEngine";
import { RESOURCE_LABELS } from "@/types/strategy";
import { BG, RESOURCE_IMG } from "@/constants/assets";
import { FONT, PALETTE, RADIUS, SPACING } from "@/constants/uiTokens";
import type { ResourceKey } from "@/types/strategy";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const NAV_ITEMS: { mcIcon: McIconName; label: string; route: string; tint?: string }[] = [
  { mcIcon: "city-variant-outline",        label: "Bâtiments",        route: "/buildings",      tint: PALETTE.gold },
  { mcIcon: "earth",                       label: "Salle de crise",   route: "/worldmap",       tint: PALETTE.crimson },
  { mcIcon: "sword-cross",                 label: "Opérations",       route: "/operations",     tint: PALETTE.danger },
  { mcIcon: "trophy-outline",              label: "Classement",       route: "/ranking",        tint: PALETTE.gold },
  { mcIcon: "clipboard-list-outline",      label: "Missions",         route: "/missions",       tint: PALETTE.info },
  { mcIcon: "newspaper-variant-outline",   label: "Journal de Crise", route: "/journal-crise",  tint: PALETTE.crimson },
];

const RESOURCE_ORDER: ResourceKey[] = ["money", "influence", "energy", "intelligence", "technology", "military", "cyberDefense"];

export default function NationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, collectMissionReward } = useStrategy();
  const { hPad, navCols, maxContentWidth } = useResponsive();

  if (!state) return null;

  const country = COUNTRIES[state.countryId];
  const rank = getPlayerRank(state.ranking);
  const title = getRankTitle(rank, state.ranking.length);
  const titleIcon = getTitleIcon(title);

  const pendingMissions = state.missions.filter((m) => m.completed);
  const activeMissions = state.missions.filter((m) => !m.completed);
  const upgrading = state.buildings.filter((b) => b.upgradeEndTime !== null);
  const xpPct = Math.min(100, (state.stats.presidentXP / 100) * 100);

  return (
    <View style={styles.root}>
      {/* HERO */}
      <ImageBackground source={BG.dashboard} style={[styles.hero, { paddingTop: insets.top + 8 }]} resizeMode="cover" imageStyle={styles.heroImg}>
        <LinearGradient colors={["rgba(6,8,18,0.05)", "rgba(6,8,18,0.55)", "rgba(10,12,20,0.95)"]} locations={[0, 0.5, 1]} style={styles.heroGrad}>
          <View style={[styles.heroInner, { paddingHorizontal: hPad }]}>
            <View style={styles.heroTop}>
              <Text style={styles.kicker}>PRÉSIDENCE · MANDAT EN COURS</Text>
              <Badge label={`Saison ${state.stats.season}`} tone="gold" size="xs" />
            </View>

            <View style={styles.heroRow}>
              <View style={styles.flagFrame}>
                <Text style={styles.flag}>{country.flag}</Text>
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

        {/* ACTIONS */}
        <SectionHeader label="Cabinet présidentiel" />
        <View style={styles.navGrid}>
          {NAV_ITEMS.map((item) => {
            const unread = item.route === "/journal-crise" ? (state.news?.unreadCount ?? 0) : 0;
            const upgrades = item.route === "/buildings" && upgrading.length > 0 ? upgrading.length : 0;
            const claimable = item.route === "/missions" && pendingMissions.length > 0 ? pendingMissions.length : 0;
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
                    {(unread > 0 || upgrades > 0 || claimable > 0) && (
                      <View style={styles.navBadge}>
                        <Text style={styles.navBadgeText}>{unread > 9 ? "9+" : unread + upgrades + claimable}</Text>
                      </View>
                    )}
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
  hero: { width: "100%" },
  heroImg: {},
  heroGrad: { paddingBottom: 14 },
  heroInner: { paddingTop: 8 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  kicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flagFrame: {
    width: 64, height: 64, borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1, borderColor: PALETTE.goldDim + "55",
    alignItems: "center", justifyContent: "center",
  },
  flag: { fontSize: 36 },
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
  navBadgeText: { fontSize: 9, fontFamily: FONT.bold, color: "#fff" },
  navLabel: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 0.3 },

  seeAll: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.5 },
});
