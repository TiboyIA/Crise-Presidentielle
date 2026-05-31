import React, { useMemo } from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { generateWeatherState, daysUntilNextUpdate } from "@/logic/weatherEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { SectionBackdrop } from "@/components/ui/SectionBackdrop";
import { WeatherPanels } from "@/components/WeatherPanels";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

// ── Composants ────────────────────────────────────────────────────────────────

function VigilanceBand({ color, level, sublabel }: { color: string; level: string; sublabel: string }) {
  return (
    <View style={[styles.vigilanceBand, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <View style={[styles.vigilanceDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.vigilanceLevel, { color }]}>VIGILANCE {level.toUpperCase()}</Text>
        <Text style={[styles.vigilanceSublabel, { color: color + "cc" }]}>{sublabel}</Text>
      </View>
    </View>
  );
}

function SectorChip({ label }: { label: string }) {
  return (
    <View style={styles.sectorChip}>
      <Text style={styles.sectorChipText}>{label}</Text>
    </View>
  );
}

function PeriodCard({
  label,
  icon,
  typeLabel,
  vigilanceColor,
  vigilanceLevel,
  summary,
  isToday,
}: {
  label: string;
  icon: McIconName;
  typeLabel: string;
  vigilanceColor: string;
  vigilanceLevel: string;
  summary: string;
  isToday: boolean;
}) {
  return (
    <View style={[styles.periodCard, isToday && { borderColor: vigilanceColor + "55", backgroundColor: vigilanceColor + "0d" }]}>
      <Text style={styles.periodLabel}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={22} color={vigilanceColor} />
      <Text style={[styles.periodType, { color: vigilanceColor }]} numberOfLines={1}>{typeLabel}</Text>
      <View style={[styles.periodBadge, { backgroundColor: vigilanceColor + "22" }]}>
        <Text style={[styles.periodBadgeText, { color: vigilanceColor }]}>{vigilanceLevel}</Text>
      </View>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function WeatherRoomScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { state } = useStrategy();

  const weather = useMemo(
    () => generateWeatherState(state?.mandateDay ?? 0),
    [state?.mandateDay],
  );

  if (!state) return null;

  const { typeDef, vigilance, zone, situation, forecast, recommendation, periods } = weather;
  const daysLeft = daysUntilNextUpdate(state.mandateDay);
  const vigColor = vigilance.color;

  return (
    <View style={styles.root}>
      <SectionBackdrop section="meteo" />
      <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <LinearGradient colors={["#0b1422", "#0a0c14"]} style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>PRÉSIDENCE DE LA RÉPUBLIQUE</Text>
          <Text style={styles.headerTitle}>SALLE MÉTÉO NATIONALE</Text>
        </View>
        <View style={styles.mandateBadge}>
          <Text style={styles.mandateNum}>{state.mandateDay}</Text>
          <Text style={styles.mandateLbl}>JOUR</Text>
        </View>
      </LinearGradient>
      <View style={[styles.headerRule, { backgroundColor: vigColor + "55" }]} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Panneau principal ──────────────────────────────────────────────── */}
        <View style={styles.mainCard}>
          <LinearGradient
            colors={[vigColor + "22", vigColor + "08"]}
            style={styles.mainCardGradient}
          >
            <View style={styles.mainCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mainZone}>{zone}</Text>
                <Text style={[styles.mainType, { color: vigColor }]}>{typeDef.label}</Text>
                <Text style={styles.mainDesc}>{typeDef.description}</Text>
              </View>
              <MaterialCommunityIcons name={typeDef.icon as McIconName} size={52} color={vigColor} style={styles.mainIcon} />
            </View>

            <VigilanceBand color={vigColor} level={vigilance.label} sublabel={vigilance.sublabel} />

            <View style={styles.updateRow}>
              <MaterialCommunityIcons name="update" size={10} color={PALETTE.textLow} />
              <Text style={styles.updateText}>
                Mise à jour dans {daysLeft} jour{daysLeft > 1 ? "s" : ""} · Période {Math.floor(state.mandateDay / 4) + 1}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Situation actuelle ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information-outline" size={13} color={PALETTE.textLow} />
            <Text style={styles.sectionTitle}>SITUATION ACTUELLE</Text>
          </View>
          <Text style={styles.sectionBody}>{situation}</Text>
        </View>

        {/* ── Prévision ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar-clock" size={13} color={PALETTE.textLow} />
            <Text style={styles.sectionTitle}>PRÉVISION COURTE</Text>
          </View>
          <View style={styles.periodsRow}>
            {periods.map((p, i) => (
              <PeriodCard
                key={p.label}
                label={p.label}
                icon={p.typeDef.icon as McIconName}
                typeLabel={p.typeDef.label}
                vigilanceColor={p.vigilance.color}
                vigilanceLevel={p.vigilance.label}
                summary={p.summary}
                isToday={i === 0}
              />
            ))}
          </View>
          <Text style={styles.forecastText}>{forecast}</Text>
        </View>

        {/* ── Secteurs impactés ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color={PALETTE.textLow} />
            <Text style={styles.sectionTitle}>SECTEURS IMPACTÉS</Text>
          </View>
          <View style={styles.sectorRow}>
            {typeDef.sectors.map((s) => (
              <SectorChip key={s} label={s} />
            ))}
          </View>
        </View>

        {/* ── Recommandation présidentielle ─────────────────────────────────── */}
        <View style={[styles.section, styles.recSection]}>
          <LinearGradient
            colors={[vigColor + "18", vigColor + "06"]}
            style={styles.recGradient}
          >
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="shield-star-outline" size={13} color={vigColor} />
              <Text style={[styles.sectionTitle, { color: vigColor }]}>ACTION PRÉSIDENTIELLE RECOMMANDÉE</Text>
            </View>
            <Text style={[styles.recBody, { color: vigColor + "dd" }]}>{recommendation}</Text>
          </LinearGradient>
        </View>

        {/* ── Phénomène principal — résumé texte ────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={13} color={PALETTE.textLow} />
            <Text style={styles.sectionTitle}>PHÉNOMÈNE PRINCIPAL</Text>
          </View>
          <View style={styles.phenomRow}>
            <MaterialCommunityIcons name={typeDef.icon as McIconName} size={18} color={vigColor} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.phenomType, { color: vigColor }]}>{typeDef.label}</Text>
              <Text style={styles.phenomZone}>Zone : {zone}</Text>
            </View>
            <View style={[styles.phenomBadge, { backgroundColor: vigColor + "22", borderColor: vigColor + "44" }]}>
              <Text style={[styles.phenomBadgeText, { color: vigColor }]}>{vigilance.label.toUpperCase()}</Text>
            </View>
          </View>
        </View>

          {/* ── Panneaux météo détaillés (migrés du Journal) ───────────────────── */}
          <WeatherPanels />

        {/* ── Retour ─────────────────────────────────────────────────────────── */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.closeBtnText}>Fermer la salle météo</Text>
        </Pressable>
      </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 3 },
  headerTitle:  { fontSize: 15, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 2 },
  mandateBadge: {
    alignItems: "center", width: 44, paddingVertical: 6,
    borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: PALETTE.panelEdge, backgroundColor: PALETTE.panelHi,
  },
  mandateNum: { fontSize: 15, fontFamily: FONT.bold, color: PALETTE.textHigh },
  mandateLbl: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },
  headerRule: { height: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },

  // Panneau principal
  mainCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
    overflow: "hidden",
  },
  mainCardGradient: { padding: 16, gap: 12 },
  mainCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  mainZone: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2, marginBottom: 4 },
  mainType: { fontSize: 22, fontFamily: FONT.bold, letterSpacing: 0.5, marginBottom: 4 },
  mainDesc: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 },
  mainIcon: { opacity: 0.9 },
  vigilanceBand: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  vigilanceDot: { width: 8, height: 8, borderRadius: 4 },
  vigilanceLevel: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1 },
  vigilanceSublabel: { fontSize: 9, fontFamily: FONT.reg, marginTop: 1 },
  updateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  updateText: { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow },

  // Sections
  section: {
    backgroundColor: PALETTE.panel, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
    padding: 14, gap: 10,
  },
  recSection: { padding: 0, overflow: "hidden" },
  recGradient: { padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: {
    fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2,
    color: PALETTE.textLow, flex: 1,
  },
  sectionBody: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 18 },
  forecastText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 17 },

  // Prévision 3 périodes
  periodsRow: { flexDirection: "row", gap: 8 },
  periodCard: {
    flex: 1, alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 6,
    backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
  },
  periodLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },
  periodType: { fontSize: 8, fontFamily: FONT.semi, textAlign: "center" },
  periodBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  periodBadgeText: { fontSize: 7, fontFamily: FONT.bold },

  // Secteurs
  sectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sectorChip: {
    paddingHorizontal: 9, paddingVertical: 4,
    backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
  },
  sectorChipText: { fontSize: 9, fontFamily: FONT.semi, color: PALETTE.textMid },

  // Recommandation
  recBody: { fontSize: 12, fontFamily: FONT.semi, lineHeight: 18 },

  // Phénomène principal
  phenomRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: PALETTE.panelEdge,
  },
  phenomType: { fontSize: 13, fontFamily: FONT.bold },
  phenomZone: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow },
  phenomBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.pill, borderWidth: 1,
  },
  phenomBadgeText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.5 },

  // Bouton fermer
  closeBtn: {
    paddingVertical: 14, alignItems: "center",
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.panelEdge,
  },
  closeBtnText: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textLow, letterSpacing: 0.5 },
});
