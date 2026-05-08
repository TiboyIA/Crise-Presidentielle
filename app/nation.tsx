import React from "react";
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { PowerBadge } from "@/components/PowerBadge";
import { MissionCard } from "@/components/MissionCard";
import { BUILDINGS } from "@/data/buildings";
import { COUNTRIES } from "@/data/countries";
import { canAfford, isUnlocked, timeRemaining, formatDuration } from "@/logic/buildingEngine";
import { getPlayerRank, getRankTitle, getTitleIcon } from "@/logic/botEngine";
import { RESOURCE_LABELS } from "@/types/strategy";
import { BG, RESOURCE_IMG } from "@/constants/assets";
import type { ResourceKey } from "@/types/strategy";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const NAV_ITEMS: { mcIcon: McIconName; label: string; route: string }[] = [
  { mcIcon: "city-variant-outline", label: "Bâtiments", route: "/buildings" },
  { mcIcon: "earth", label: "Carte Monde", route: "/worldmap" },
  { mcIcon: "sword-cross", label: "Opérations", route: "/operations" },
  { mcIcon: "trophy-outline", label: "Classement", route: "/ranking" },
  { mcIcon: "clipboard-list-outline", label: "Missions", route: "/missions" },
  { mcIcon: "newspaper-variant-outline", label: "Journal de Crise", route: "/journal-crise" },
];

const RESOURCE_ORDER: ResourceKey[] = ["money", "influence", "energy", "intelligence", "technology", "military", "cyberDefense"];

export default function NationScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, collectMissionReward } = useStrategy();
  const { hPad, resourceCols, navCols, maxContentWidth } = useResponsive();

  if (!state) return null;

  const country = COUNTRIES[state.countryId];
  const rank = getPlayerRank(state.ranking);
  const title = getRankTitle(rank, state.ranking.length);
  const titleIcon = getTitleIcon(title);

  const pendingMissions = state.missions.filter((m) => m.completed);
  const activeMissions = state.missions.filter((m) => !m.completed);
  const upgrading = state.buildings.filter((b) => b.upgradeEndTime !== null);

  const resourceEntries = RESOURCE_ORDER.map((key) => ({
    key,
    label: RESOURCE_LABELS[key],
    value: Math.floor(state.resources[key]),
  }));

  const contentStyle = [
    styles.content,
    { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad },
    maxContentWidth ? { maxWidth: maxContentWidth, alignSelf: "center" as const, width: "100%" as const } : null,
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero with image */}
      <ImageBackground
        source={BG.dashboard}
        style={[styles.heroBg, { marginTop: insets.top + 8 }]}
        resizeMode="cover"
        imageStyle={styles.heroImage}
      >
        <LinearGradient
          colors={["rgba(6,8,18,0.18)", "rgba(6,8,18,0.88)"]}
          style={styles.hero}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.flag}>{country.flag}</Text>
            <View>
              <Text style={[styles.countryName, { color: "#fff" }]}>{country.name}</Text>
              <Text style={[styles.presidentLabel, { color: "rgba(255,255,255,0.65)" }]}>
                {state.playerName} · Niv.{state.stats.presidentLevel}
              </Text>
              <View style={styles.titleRow}>
                <Text style={styles.titleIcon}>{titleIcon}</Text>
                <Text style={[styles.titleText, { color: "#C9A84C" }]}>{title}</Text>
                <Text style={[styles.rankText, { color: "rgba(255,255,255,0.5)" }]}>#{rank}</Text>
              </View>
            </View>
          </View>
          <PowerBadge power={state.stats.globalPower} size="lg" />
        </LinearGradient>
      </ImageBackground>

      {/* XP Bar */}
      <View style={[styles.xpBar, { backgroundColor: colors.muted }]}>
        <View style={[styles.xpFill, { width: `${Math.min(100, (state.stats.presidentXP / 100) * 100)}%`, backgroundColor: colors.primary }]} />
      </View>

      {/* Resources */}
      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RESSOURCES NATIONALES</Text>
        <View style={styles.resourceGrid}>
          {resourceEntries.map(({ key, label, value }) => (
            <View key={key} style={[styles.resourceCell, { backgroundColor: colors.card, borderColor: colors.border, width: `${Math.floor(100 / resourceCols) - 1}%` }]}>
              <Image source={RESOURCE_IMG[key]} style={styles.resourceImg} />
              <Text style={[styles.resourceValue, { color: colors.foreground }]}>
                {value >= 10000 ? `${(value / 1000).toFixed(1)}k` : value}
              </Text>
              <Text style={[styles.resourceLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Active upgrades */}
      {upgrading.length > 0 && (
        <View style={[styles.alertBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "44" }]}>
          <Text style={[styles.alertTitle, { color: colors.primary }]}>Améliorations en cours</Text>
          {upgrading.map((b) => (
            <Text key={b.id} style={[styles.alertLine, { color: colors.foreground }]}>
              {BUILDINGS[b.id].name} → {formatDuration(timeRemaining(b))}
            </Text>
          ))}
        </View>
      )}

      {/* Nav grid */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACTIONS</Text>
      <View style={styles.navGrid}>
        {NAV_ITEMS.map((item) => {
          const unread = item.route === "/journal-crise" ? (state.news?.unreadCount ?? 0) : 0;
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [
                styles.navCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                  width: `${Math.floor(100 / navCols) - 1}%`,
                },
              ]}
            >
              <View style={styles.navIconWrap}>
                <MaterialCommunityIcons name={item.mcIcon} size={28} color={colors.primary} />
                {unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, { color: colors.foreground }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Pending mission rewards */}
      {pendingMissions.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MISSIONS À RÉCLAMER</Text>
          {pendingMissions.map((m) => (
            <MissionCard key={m.defId} mission={m} onCollect={() => collectMissionReward(m.defId)} />
          ))}
        </>
      )}

      {/* Active missions preview */}
      {activeMissions.length > 0 && (
        <>
          <View style={styles.missionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MISSIONS DU JOUR</Text>
            <Pressable onPress={() => router.push("/missions")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Voir tout →</Text>
            </Pressable>
          </View>
          <MissionCard
            mission={activeMissions[0]}
            onCollect={() => collectMissionReward(activeMissions[0].defId)}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 12 },
  heroBg: { borderRadius: 12, overflow: "hidden" },
  heroImage: { borderRadius: 12 },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, minHeight: 110 },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  flag: { fontSize: 40 },
  countryName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  presidentLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  titleIcon: { fontSize: 14 },
  titleText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  rankText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  xpBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 2 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2, marginTop: 4 },
  resourceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resourceCell: { flexGrow: 1, borderRadius: 8, borderWidth: 1, padding: 10, alignItems: "center", gap: 4 },
  resourceImg: { width: 22, height: 22, resizeMode: "contain" },
  resourceValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  resourceLabel: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textAlign: "center" },
  alertBox: { borderRadius: 8, borderWidth: 1, padding: 12, gap: 4 },
  alertTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  alertLine: { fontSize: 11, fontFamily: "Inter_500Medium" },
  navGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  navCard: { flexGrow: 1, borderRadius: 10, borderWidth: 1, padding: 16, alignItems: "center", gap: 6 },
  navIconWrap: { position: "relative" },
  navLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  badge: { position: "absolute", top: -4, right: -6, backgroundColor: "#FF3040", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  missionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
