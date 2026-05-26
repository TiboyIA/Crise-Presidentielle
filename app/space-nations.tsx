/**
 * app/space-nations.tsx — Les Nations de l'Espace.
 *
 * Affiche l'assemblée interstellaire, la crédibilité cosmique et la
 * disposition de chaque nation envers l'humanité.
 * Écran narratif — aucune action directe sur le gameplay.
 */

import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStrategy } from "@/context/StrategyContext";
import {
  DEFAULT_SPACE_NATIONS_STATE,
  computeNationDispositions,
} from "@/logic/spaceNationsEngine";
import {
  SPACE_NATION_LIST,
  DISCOVERY_STAGE_LABELS,
} from "@/data/spaceNations";
import type { NationDisposition } from "@/data/spaceNations";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { StrategyGameState } from "@/types/strategy";

// ── Helpers visuels ───────────────────────────────────────────────────────────

function dispositionColor(d: NationDisposition): string {
  switch (d) {
    case "favorable":    return PALETTE.success;
    case "bienveillant": return "#7ec8f7";
    case "neutre":       return PALETTE.textLow;
    case "sceptique":    return PALETTE.warning;
    case "hostile":      return PALETTE.danger;
    case "infiltré":     return "#9b6fd4";
    default:             return PALETTE.textLow;
  }
}

function dispositionLabel(d: NationDisposition): string {
  switch (d) {
    case "favorable":    return "Favorable";
    case "bienveillant": return "Bienveillant";
    case "neutre":       return "Neutre";
    case "sceptique":    return "Sceptique";
    case "hostile":      return "Hostile";
    case "infiltré":     return "Infiltré";
    default:             return "Inconnu";
  }
}

function credColor(n: number): string {
  if (n >= 65) return PALETTE.success;
  if (n >= 40) return "#7ec8f7";
  if (n >= 25) return PALETTE.warning;
  return PALETTE.danger;
}

function lastSpaceSignal(state: StrategyGameState): string | null {
  const entries = state.news.log.filter(
    (l) => l.eventId.startsWith("sn_") || l.eventId.startsWith("cosmic_"),
  );
  return entries.length > 0 ? (entries[entries.length - 1]?.title ?? null) : null;
}

// ── Composants ────────────────────────────────────────────────────────────────

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${value}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[s.statVal, { color }]}>{value}</Text>
    </View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function SpaceNationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStrategy();

  if (!state) return null;

  const sn         = state.spaceNationsState ?? DEFAULT_SPACE_NATIONS_STATE;
  const discovered = sn.discovered || state.news.log.some(
    (l) => l.eventId.startsWith("sn_") || l.eventId.startsWith("cosmic_"),
  );
  const stageLabel = DISCOVERY_STAGE_LABELS[sn.discoveryStage] ?? "Inconnu";
  const lastSignal = lastSpaceSignal(state);
  const dispositions = discovered
    ? computeNationDispositions(state, sn)
    : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <LinearGradient colors={["#070b14", "#0a0c14"]} style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={PALETTE.textMid} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.kicker}>CLASSIFICATION ABSOLUE</Text>
          <Text style={s.title}>LES NATIONS DE L'ESPACE</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Intro */}
        <View style={s.introBox}>
          <MaterialCommunityIcons name="telescope" size={16} color={PALETTE.textLow} />
          <Text style={s.introText}>
            Une assemblée interstellaire observe l'humanité depuis les marges de votre histoire.
            Aurora défend votre droit à exister. Obscurium cherche à vous corrompre.
            Le reste du Conseil attend de voir.
          </Text>
        </View>

        {/* État de découverte */}
        <View style={[s.stageBox, { borderColor: discovered ? "#7ec8f744" : PALETTE.panelEdge }]}>
          <MaterialCommunityIcons
            name={discovered ? "antenna" : "eye-off-outline"}
            size={14}
            color={discovered ? "#7ec8f7" : PALETTE.textLow}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.stageTitle}>ÉTAT DE DÉCOUVERTE</Text>
            <Text style={[s.stageValue, { color: discovered ? "#7ec8f7" : PALETTE.textLow }]}>
              {stageLabel}
            </Text>
          </View>
        </View>

        {/* Dernier signal */}
        {lastSignal && (
          <View style={s.signalRow}>
            <MaterialCommunityIcons name="waveform" size={11} color={PALETTE.warning} />
            <Text style={s.signalLabel}>DERNIER SIGNAL</Text>
            <Text style={s.signalText} numberOfLines={1}>{lastSignal}</Text>
          </View>
        )}

        {/* Métriques globales */}
        {discovered && (
          <>
            <Text style={s.sectionLabel}>CRÉDIBILITÉ COSMIQUE</Text>
            <View style={s.card}>
              <StatBar
                label="Crédibilité"
                value={sn.cosmicCredibility}
                color={credColor(sn.cosmicCredibility)}
              />
              <View style={s.div} />
              <StatBar label="Soutien Aurora" value={sn.auroraSupport} color="#7ec8f7" />
              <View style={s.div} />
              <StatBar
                label="Corruption Obscurium"
                value={sn.obscuriumCorruption}
                color={sn.obscuriumCorruption > 50 ? PALETTE.danger : PALETTE.warning}
              />
              <View style={s.div} />
              <StatBar
                label="Attention du Conseil"
                value={sn.councilAttention}
                color={PALETTE.gold}
              />
            </View>
          </>
        )}

        {/* Nations */}
        <Text style={s.sectionLabel}>LES 7 NATIONS</Text>
        <View style={s.nationsGrid}>
          {SPACE_NATION_LIST.map((nation) => {
            const disp = dispositions?.[nation.id];
            const color = disp ? dispositionColor(disp) : PALETTE.textLow;
            return (
              <View
                key={nation.id}
                style={[s.nationCard, { borderColor: discovered ? color + "44" : PALETTE.panelEdge }]}
              >
                <View style={s.nationHeader}>
                  <MaterialCommunityIcons
                    name={nation.icon as McName}
                    size={16}
                    color={discovered ? color : PALETTE.textLow}
                  />
                  <Text style={[s.nationName, { color: discovered ? PALETTE.textHigh : PALETTE.textLow }]}>
                    {nation.name}
                  </Text>
                </View>
                <Text style={s.nationRole}>{nation.role}</Text>
                {discovered && disp ? (
                  <View style={[s.dispBadge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
                    <Text style={[s.dispText, { color }]}>{dispositionLabel(disp)}</Text>
                  </View>
                ) : (
                  <View style={[s.dispBadge, { backgroundColor: PALETTE.panelEdge + "80", borderColor: PALETTE.panelEdge }]}>
                    <Text style={[s.dispText, { color: PALETTE.textLow }]}>Non découvert</Text>
                  </View>
                )}
                {discovered && (
                  <Text style={s.nationObserves} numberOfLines={2}>{nation.observes}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Noctyra note */}
        {discovered && (
          <View style={s.hintBox}>
            <MaterialCommunityIcons name="eye-outline" size={12} color={PALETTE.textLow} />
            <Text style={s.hintText}>
              Noctyra se présente comme arbitre neutre. Les analystes ne parviennent pas à un consensus sur ses véritables intentions.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#070b14" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1a2035",
  },
  backBtn:      { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  kicker:       { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 3, color: "#5a6a82" },
  title:        { fontFamily: FONT.bold, fontSize: 15, color: PALETTE.textHigh, letterSpacing: 1 },

  scroll: { padding: 16, gap: 10 },

  introBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#0d1220",
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#1a2035",
    padding: 12,
  },
  introText: {
    flex: 1, fontFamily: FONT.reg, fontSize: 11, color: PALETTE.textLow, lineHeight: 16,
  },

  stageBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#0d1220",
    borderRadius: RADIUS.md, borderWidth: 1,
    padding: 12,
  },
  stageTitle: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: PALETTE.textLow, marginBottom: 2 },
  stageValue: { fontFamily: FONT.bold, fontSize: 12 },

  signalRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0d1220",
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.warning + "33",
    paddingHorizontal: 12, paddingVertical: 8,
  },
  signalLabel: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: PALETTE.warning },
  signalText:  { flex: 1, fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textMid },

  sectionLabel: {
    fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2.5, color: PALETTE.textLow, marginTop: 4,
  },

  card: {
    backgroundColor: "#0d1220",
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#1a2035",
    overflow: "hidden",
  },
  div: { height: StyleSheet.hairlineWidth, backgroundColor: "#1a2035", marginHorizontal: 12 },

  statRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  statLabel: { width: 120, fontFamily: FONT.reg, fontSize: 11, color: PALETTE.textMid },
  barTrack:  {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: "#1a2035", overflow: "hidden",
  },
  barFill:   { height: "100%", borderRadius: 2 },
  statVal:   { width: 28, fontFamily: FONT.bold, fontSize: 11, textAlign: "right" },

  nationsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  nationCard: {
    width: "47%",
    backgroundColor: "#0d1220",
    borderRadius: RADIUS.md, borderWidth: 1,
    padding: 12, gap: 6,
  },
  nationHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  nationName:   { fontFamily: FONT.bold, fontSize: 11, flex: 1 },
  nationRole:   { fontFamily: FONT.reg, fontSize: 9, color: PALETTE.textLow, lineHeight: 13 },
  nationObserves: { fontFamily: FONT.reg, fontSize: 9, color: PALETTE.textLow, lineHeight: 13, fontStyle: "italic" },

  dispBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.pill, borderWidth: 1,
    alignSelf: "flex-start",
  },
  dispText: { fontFamily: FONT.bold, fontSize: 9, letterSpacing: 0.5 },

  hintBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#0d1220",
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "#1a2035",
    padding: 10,
  },
  hintText: { flex: 1, fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, lineHeight: 15 },
});
