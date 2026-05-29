/**
 * EmploymentCard — Carte "Emploi national" (Dashboard).
 *
 * Affiche 4 indicateurs du marché du travail fictif :
 *   - Chômage (unemployment)
 *   - Qualité de l'emploi (jobQuality)
 *   - Chômage des jeunes (youthUnemployment)
 *   - Pénurie main-d'œuvre (laborShortage)
 *
 * Pressable : navigue vers le Journal de Crise (onglet JOURNAL).
 * Aucune donnée économique réelle. Aucun chiffre national officiel.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getUnemploymentBandInfo,
  getJobQualityBandInfo,
  getLaborShortageBandInfo,
  DEFAULT_UNEMPLOYMENT,
  DEFAULT_JOB_QUALITY,
  DEFAULT_YOUTH_UNEMPLOYMENT,
  DEFAULT_LABOR_SHORTAGE,
} from "@/logic/laborMarketEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { StrategyGameState } from "@/types/strategy";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface RowProps {
  icon:  McIconName;
  label: string;
  value: string;
  color: string;
}

function MetricRow({ icon, label, value, color }: RowProps) {
  return (
    <View style={s.metricRow}>
      <MaterialCommunityIcons name={icon} size={10} color={color} />
      <Text style={s.metricLabel}>{label}</Text>
      <View style={[s.pill, { borderColor: color + "44", backgroundColor: color + "12" }]}>
        <Text style={[s.pillText, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

interface Props {
  state: StrategyGameState;
}

export function EmploymentCard({ state }: Props) {
  const router = useRouter();

  const unempValue   = state.unemployment       ?? DEFAULT_UNEMPLOYMENT;
  const jqValue      = state.jobQuality         ?? DEFAULT_JOB_QUALITY;
  const youthValue   = state.youthUnemployment  ?? DEFAULT_YOUTH_UNEMPLOYMENT;
  const shortValue   = state.laborShortage      ?? DEFAULT_LABOR_SHORTAGE;

  const unempInfo    = getUnemploymentBandInfo(unempValue);
  const jqInfo       = getJobQualityBandInfo(jqValue);
  const shortInfo    = getLaborShortageBandInfo(shortValue);

  const hasAlert = unempValue >= 60 || jqValue < 25 || shortValue >= 75;
  const overallColor = unempValue >= 60
    ? PALETTE.danger
    : unempValue >= 40 || shortValue >= 50
      ? PALETTE.warning
      : "#4caf82";

  return (
    <Pressable
      style={({ pressed }) => [
        s.card,
        { borderColor: overallColor + "44", opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push("/journal-crise")}
    >
      {/* En-tête */}
      <View style={s.header}>
        <MaterialCommunityIcons name="briefcase-outline" size={12} color={overallColor} />
        <Text style={s.headerLabel}>EMPLOI NATIONAL</Text>
        {hasAlert && (
          <View style={[s.alertDot, { backgroundColor: PALETTE.danger }]} />
        )}
        <MaterialCommunityIcons name="chevron-right" size={12} color={PALETTE.textLow} style={s.chevron} />
      </View>

      {/* 4 indicateurs */}
      <View style={s.metricsGrid}>
        <MetricRow
          icon="account-group-outline"
          label="Chômage"
          value={`${Math.round(unempValue)} — ${unempInfo.label}`}
          color={unempInfo.color}
        />
        <MetricRow
          icon="star-outline"
          label="Qualité emploi"
          value={jqInfo.label}
          color={jqInfo.color}
        />
        <MetricRow
          icon="school-outline"
          label="Chômage jeunes"
          value={`${Math.round(youthValue)} %`}
          color={youthValue >= 55 ? PALETTE.danger : youthValue >= 40 ? PALETTE.warning : "#4caf82"}
        />
        <MetricRow
          icon="wrench-outline"
          label="Pénurie main-d'œuvre"
          value={shortInfo.label}
          color={shortInfo.color}
        />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth:       1,
    borderRadius:      RADIUS.sm,
    backgroundColor:   PALETTE.panel,
    paddingHorizontal: 12,
    paddingVertical:   8,
    gap:               6,
  },
  header: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  headerLabel: {
    flex:          1,
    fontSize:      9,
    fontFamily:    FONT.bold,
    color:         PALETTE.textMid,
    letterSpacing: 1.2,
  },
  alertDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  chevron: {
    marginLeft: 2,
  },
  metricsGrid: {
    gap: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  metricLabel: {
    flex:       1,
    fontSize:   8,
    fontFamily: FONT.reg,
    color:      PALETTE.textLow,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      RADIUS.pill,
    borderWidth:       1,
  },
  pillText: {
    fontSize:   8,
    fontFamily: FONT.bold,
  },
});
