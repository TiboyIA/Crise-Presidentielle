/**
 * app/orion-city.tsx — La Cité d'Orion.
 *
 * Hub diplomatique interstellaire suspendu aux frontières galactiques.
 * Affiche la réputation, le niveau d'accès et les quartiers connus.
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
  DEFAULT_ORION_CITY_STATE,
} from "@/logic/orionCityEngine";
import {
  ORION_DISTRICT_LIST,
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_DESCRIPTIONS,
  ACCESS_LEVEL_COLOR,
} from "@/data/orionCity";
import type { OrionDistrictDef } from "@/data/orionCity";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { StrategyGameState } from "@/types/strategy";

// ── Helpers visuels ───────────────────────────────────────────────────────────

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function alignmentColor(a: OrionDistrictDef["alignment"]): string {
  switch (a) {
    case "aurora":    return "#7ec8f7";
    case "obscurium": return "#9b6fd4";
    case "judgment":  return PALETTE.warning;
    default:          return PALETTE.textLow;
  }
}

function standingColor(n: number): string {
  if (n >= 65) return PALETTE.success;
  if (n >= 40) return "#7ec8f7";
  if (n >= 20) return PALETTE.warning;
  return PALETTE.danger;
}

function lastOrionSignal(state: StrategyGameState): string | null {
  const entries = state.news.log.filter(
    (l) => l.eventId.startsWith("oc_"),
  );
  return entries.length > 0 ? (entries[entries.length - 1]?.title ?? null) : null;
}

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

export default function OrionCityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStrategy();

  if (!state) return null;

  const oc = state.orionCityState ?? DEFAULT_ORION_CITY_STATE;
  const discovered = oc.discovered || state.news.log.some(
    (l) => l.eventId.startsWith("oc_"),
  );

  const accessLabel = ACCESS_LEVEL_LABELS[oc.accessLevel];
  const accessDesc  = ACCESS_LEVEL_DESCRIPTIONS[oc.accessLevel];
  const accessColor = ACCESS_LEVEL_COLOR[oc.accessLevel];
  const lastSignal  = lastOrionSignal(state);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <LinearGradient colors={["#07080f", "#0a0b14"]} style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={PALETTE.textMid} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.kicker}>CLASSIFICATION ABSOLUE</Text>
          <Text style={s.title}>LA CITÉ D'ORION</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Intro */}
        <View style={s.introBox}>
          <MaterialCommunityIcons name="city-variant-outline" size={16} color={PALETTE.textLow} />
          <Text style={s.introText}>
            Une mégalopole spatiale suspendue aux frontières de plusieurs galaxies. Des milliers d'espèces y commercent, négocient et cachent leurs secrets. La Terre n'y est pas encore la bienvenue — mais elle est observée.
          </Text>
        </View>

        {/* Niveau d'accès */}
        <View style={[s.accessBox, { borderColor: discovered ? accessColor + "44" : PALETTE.panelEdge }]}>
          <MaterialCommunityIcons
            name={discovered ? "shield-star-outline" : "eye-off-outline"}
            size={14}
            color={discovered ? accessColor : PALETTE.textLow}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.accessTitle}>NIVEAU D'ACCÈS</Text>
            <Text style={[s.accessValue, { color: discovered ? accessColor : PALETTE.textLow }]}>
              {accessLabel}
            </Text>
            {discovered && (
              <Text style={s.accessDesc}>{accessDesc}</Text>
            )}
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

        {/* Métriques */}
        {discovered && (
          <>
            <Text style={s.sectionLabel}>RÉPUTATION DANS LA CITÉ</Text>
            <View style={s.card}>
              <StatBar
                label="Réputation (Orion)"
                value={oc.orionStanding}
                color={standingColor(oc.orionStanding)}
              />
              <View style={s.div} />
              <StatBar
                label="Confiance Aurora"
                value={oc.auroraEmbassyTrust}
                color="#7ec8f7"
              />
              <View style={s.div} />
              <StatBar
                label="Trace Obscurium"
                value={oc.obscuriumTrace}
                color={oc.obscuriumTrace > 40 ? PALETTE.danger : PALETTE.warning}
              />
            </View>
          </>
        )}

        {/* Quartiers */}
        <Text style={s.sectionLabel}>LES 7 QUARTIERS</Text>
        <View style={s.districtsGrid}>
          {ORION_DISTRICT_LIST.map((district) => {
            const isKnown = oc.knownDistricts.includes(district.id);
            const color   = isKnown ? alignmentColor(district.alignment) : PALETTE.textLow;
            return (
              <View
                key={district.id}
                style={[s.districtCard, { borderColor: isKnown ? color + "44" : PALETTE.panelEdge }]}
              >
                <View style={s.districtHeader}>
                  <MaterialCommunityIcons
                    name={district.icon as McName}
                    size={15}
                    color={isKnown ? color : PALETTE.textLow}
                  />
                  <Text style={[s.districtName, { color: isKnown ? PALETTE.textHigh : PALETTE.textLow }]}>
                    {district.name}
                  </Text>
                </View>
                <Text style={s.districtRole}>{district.role}</Text>
                {isKnown ? (
                  <Text style={s.districtDesc} numberOfLines={3}>{district.description}</Text>
                ) : (
                  <Text style={s.districtUnknown}>Quartier non découvert</Text>
                )}
                {isKnown && (
                  <View style={[s.observesBadge, { borderColor: color + "33" }]}>
                    <Text style={[s.observesText, { color }]} numberOfLines={2}>
                      {district.observes}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Note Obscurium */}
        {discovered && oc.obscuriumTrace > 0 && (
          <View style={s.hintBox}>
            <MaterialCommunityIcons name="alert-outline" size={12} color="#9b6fd4" />
            <Text style={[s.hintText, { color: "#9b6fd4" + "cc" }]}>
              Le Couloir Noir a laissé une empreinte dans vos dossiers. Le Phare d'Aurora en est informé.
            </Text>
          </View>
        )}

        {/* Note narrative */}
        {!discovered && (
          <View style={s.hintBox}>
            <MaterialCommunityIcons name="information-outline" size={12} color={PALETTE.textLow} />
            <Text style={s.hintText}>
              La Cité d'Orion reste indétectée par vos services. Elle se révélera lorsque les Nations de l'Espace vous auront accordé suffisamment d'attention.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#07080f" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#181a28",
  },
  backBtn:      { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  kicker:       { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 3, color: "#5a6a82" },
  title:        { fontFamily: FONT.bold, fontSize: 15, color: PALETTE.textHigh, letterSpacing: 1 },

  scroll: { padding: 16, gap: 10 },

  introBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#0c0e1a",
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#181a28",
    padding: 12,
  },
  introText: {
    flex: 1, fontFamily: FONT.reg, fontSize: 11, color: PALETTE.textLow, lineHeight: 16,
  },

  accessBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#0c0e1a",
    borderRadius: RADIUS.md, borderWidth: 1,
    padding: 12,
  },
  accessTitle: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: PALETTE.textLow, marginBottom: 2 },
  accessValue: { fontFamily: FONT.bold, fontSize: 12, marginBottom: 4 },
  accessDesc:  { fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, lineHeight: 14 },

  signalRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0c0e1a",
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.warning + "33",
    paddingHorizontal: 12, paddingVertical: 8,
  },
  signalLabel: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: PALETTE.warning },
  signalText:  { flex: 1, fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textMid },

  sectionLabel: {
    fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2.5, color: PALETTE.textLow, marginTop: 4,
  },

  card: {
    backgroundColor: "#0c0e1a",
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#181a28",
    overflow: "hidden",
  },
  div: { height: StyleSheet.hairlineWidth, backgroundColor: "#181a28", marginHorizontal: 12 },

  statRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  statLabel: { width: 120, fontFamily: FONT.reg, fontSize: 11, color: PALETTE.textMid },
  barTrack:  {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: "#181a28", overflow: "hidden",
  },
  barFill:   { height: "100%", borderRadius: 2 },
  statVal:   { width: 28, fontFamily: FONT.bold, fontSize: 11, textAlign: "right" },

  districtsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  districtCard: {
    width: "47%",
    backgroundColor: "#0c0e1a",
    borderRadius: RADIUS.md, borderWidth: 1,
    padding: 12, gap: 5,
  },
  districtHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  districtName:   { fontFamily: FONT.bold, fontSize: 10, flex: 1, lineHeight: 14 },
  districtRole:   { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 0.5, color: PALETTE.textLow },
  districtDesc:   { fontFamily: FONT.reg, fontSize: 9, color: PALETTE.textLow, lineHeight: 13 },
  districtUnknown:{ fontFamily: FONT.reg, fontSize: 9, color: PALETTE.textLow, fontStyle: "italic" },

  observesBadge: {
    marginTop: 2,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: RADIUS.sm, borderWidth: 1,
  },
  observesText: { fontFamily: FONT.reg, fontSize: 8, lineHeight: 12, fontStyle: "italic" },

  hintBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#0c0e1a",
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "#181a28",
    padding: 10,
  },
  hintText: { flex: 1, fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, lineHeight: 15 },
});
