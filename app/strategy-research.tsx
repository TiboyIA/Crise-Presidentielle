import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { STRATEGY_RESEARCH, STRATEGY_RESEARCH_LIST, RESEARCH_CATEGORY_LABELS, RESEARCH_CATEGORY_COLORS } from "@/data/strategyResearch";
import { DEFAULT_RESEARCH_STATE } from "@/types/strategyResearch";
import type { StrategyResearchCategory, StrategyResearchId } from "@/types/strategyResearch";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { canAfford } from "@/logic/buildingEngine";
import { useCommand } from "@/hooks/useCommand";
import { commandId } from "@/core/commands";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const ALL_CATEGORIES: StrategyResearchCategory[] = ["cyber", "energy", "military", "economy", "society"];
const CATEGORY_ICONS: Record<StrategyResearchCategory, McIconName> = {
  cyber:    "shield-lock-outline",
  energy:   "lightning-bolt-outline",
  military: "sword-cross",
  economy:  "chart-line-variant",
  society:  "account-group-outline",
};

export default function StrategyResearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, launchStrategyResearch } = useStrategy();
  const [activeCategory, setActiveCategory] = useState<StrategyResearchCategory | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { run, isPending } = useCommand();
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  if (!state) return null;

  const research = state.strategyResearch ?? { ...DEFAULT_RESEARCH_STATE };
  const ip = research.inProgress;

  const currentDef = ip ? STRATEGY_RESEARCH[ip.id] : null;
  const progressRatio = ip && currentDef
    ? Math.min(1, Math.max(0, (state.mandateDay - ip.startedAtDay) / (ip.completesAtDay - ip.startedAtDay)))
    : 0;
  const daysLeft = ip ? Math.max(0, ip.completesAtDay - state.mandateDay) : 0;

  const filtered = useMemo(() =>
    STRATEGY_RESEARCH_LIST.filter((r) => !activeCategory || r.category === activeCategory),
    [activeCategory],
  );

  function handleLaunch(id: StrategyResearchId) {
    const cid = commandId("start_research", id);
    const result = run(cid, () => launchStrategyResearch(id));
    if (result === null) {
      setToast({ msg: "Action en cours…", ok: false });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 1500);
      return;
    }
    const msg = result.success ? "Recherche lancée !" : (result.reason ?? "Impossible");
    setToast({ msg, ok: result.success });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient colors={["#161b27", "#0c1018"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.gold} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>RECHERCHE STRATÉGIQUE</Text>
          <Text style={styles.title}>Arbre technologique</Text>
          <Text style={styles.subtitle}>
            {research.completed.length}/15 recherches · JOUR {state.mandateDay}
          </Text>
        </View>
      </LinearGradient>

      {/* In-progress banner */}
      {ip && currentDef && (
        <View style={[styles.progressBanner, { borderColor: RESEARCH_CATEGORY_COLORS[currentDef.category] }]}>
          <Text style={[styles.progressKicker, { color: RESEARCH_CATEGORY_COLORS[currentDef.category] }]}>
            🔬 EN COURS · {daysLeft}j restant{daysLeft > 1 ? "s" : ""}
          </Text>
          <Text style={styles.progressTitle}>{currentDef.icon}  {currentDef.name}</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progressRatio * 100)}%` as `${number}%`,
                  backgroundColor: RESEARCH_CATEGORY_COLORS[currentDef.category],
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          style={[styles.filterChip, !activeCategory && styles.filterChipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[styles.filterLabel, !activeCategory && { color: PALETTE.gold }]}>Toutes</Text>
        </Pressable>
        {ALL_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const color = RESEARCH_CATEGORY_COLORS[cat];
          return (
            <Pressable
              key={cat}
              style={[styles.filterChip, isActive && { borderColor: color }]}
              onPress={() => setActiveCategory(isActive ? null : cat)}
            >
              <MaterialCommunityIcons name={CATEGORY_ICONS[cat]} size={12} color={isActive ? color : PALETTE.textMid} />
              <Text style={[styles.filterLabel, isActive && { color }]}>
                {RESEARCH_CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Research list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        renderItem={({ item }) => {
          const isCompleted = research.completed.includes(item.id);
          const isInProgress = ip?.id === item.id;
          const hasOtherInProgress = !!ip && !isInProgress;
          const prereqsMet = item.prerequisites.every((p) => research.completed.includes(p));
          const affordable = canAfford(item.cost, state.resources);
          const cmdPending = isPending(commandId("start_research", item.id));
          const disabled = isCompleted || isInProgress || hasOtherInProgress || !prereqsMet || !affordable || cmdPending;
          const catColor = RESEARCH_CATEGORY_COLORS[item.category];

          let statusLabel = `${item.durationDays}j · Lancer`;
          if (isCompleted) statusLabel = "✓ Complétée";
          else if (isInProgress) statusLabel = "⌛ En cours...";
          else if (hasOtherInProgress) statusLabel = "Bloquée — autre en cours";
          else if (!prereqsMet) {
            const missing = item.prerequisites.find((p) => !research.completed.includes(p));
            statusLabel = `Prérequis : ${STRATEGY_RESEARCH[missing!]?.name ?? "?"}`;
          } else if (!affordable) statusLabel = "Ressources insuffisantes";

          return (
            <ResearchCard
              item={item}
              catColor={catColor}
              isCompleted={isCompleted}
              isInProgress={isInProgress}
              disabled={disabled}
              statusLabel={statusLabel}
              onPress={() => handleLaunch(item.id)}
            />
          );
        }}
      />

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: toast.ok ? PALETTE.crimson : "#333", bottom: insets.bottom + 16 }]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}
    </View>
  );
}

const ResearchCard = memo(function ResearchCard({
  item, catColor, isCompleted, isInProgress, disabled, statusLabel, onPress,
}: {
  item: (typeof STRATEGY_RESEARCH)[StrategyResearchId];
  catColor: string;
  isCompleted: boolean;
  isInProgress: boolean;
  disabled: boolean;
  statusLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.card, { borderColor: isCompleted ? catColor + "66" : PALETTE.panelEdge, opacity: isCompleted ? 0.8 : 1 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBadge, { backgroundColor: catColor + "22", borderColor: catColor + "44" }]}>
          <Text style={styles.iconEmoji}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={[styles.cardCat, { color: catColor }]}>
            {RESEARCH_CATEGORY_LABELS[item.category].toUpperCase()} · {item.durationDays}j
          </Text>
        </View>
        {isCompleted && (
          <MaterialCommunityIcons name="check-circle" size={18} color={catColor} />
        )}
        {isInProgress && (
          <MaterialCommunityIcons name="clock-outline" size={18} color={PALETTE.gold} />
        )}
      </View>

      <Text style={styles.cardDesc}>{item.description}</Text>
      <Text style={styles.cardBonus}>➜ {item.bonusLabel}</Text>

      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.cardBtn,
          { backgroundColor: disabled ? PALETTE.panelEdge : catColor, opacity: pressed && !disabled ? 0.8 : 1 },
        ]}
      >
        <Text style={[styles.cardBtnText, { color: disabled ? PALETTE.textLow : "#fff" }]}>
          {statusLabel}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080c14" },

  header: { padding: 16, paddingBottom: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PALETTE.panelEdge },
  backBtn: { marginBottom: 8 },
  headerText: { gap: 2 },
  kicker: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 3, color: PALETTE.gold },
  title: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 0.5 },
  subtitle: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid },

  progressBanner: {
    margin: 12,
    marginBottom: 0,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 6,
  },
  progressKicker: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 2 },
  progressTitle: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  filterScroll: { maxHeight: 44 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.xs, borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge, backgroundColor: "rgba(255,255,255,0.04)",
  },
  filterChipActive: { borderColor: PALETTE.gold },
  filterLabel: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 0.5 },

  list: { padding: 12, gap: 10 },

  card: {
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
    gap: 8,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBadge: {
    width: 44, height: 44, borderRadius: RADIUS.xs,
    alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconEmoji: { fontSize: 22 },
  cardName: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh, lineHeight: 18 },
  cardCat: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 2, marginTop: 2 },
  cardDesc: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 17 },
  cardBonus: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textLow, fontStyle: "italic" },
  cardBtn: {
    paddingVertical: 9, borderRadius: RADIUS.xs,
    alignItems: "center", marginTop: 2,
  },
  cardBtnText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1.5 },

  toast: {
    position: "absolute", left: 20, right: 20,
    paddingVertical: 11, paddingHorizontal: 16,
    borderRadius: RADIUS.sm, alignItems: "center",
  },
  toastText: { fontSize: 13, fontFamily: FONT.bold, color: "#fff" },
});
