/**
 * HealthInfoCard — Carte d'information médicale nationale (Dashboard).
 *
 * Affiche 4 indicateurs clés du système de santé fictif :
 *   - Qualité des données médicales
 *   - Pression hospitalière
 *   - Confiance dans les chiffres
 *   - Délai de remontée des données
 *
 * Pressable : navigue vers l'onglet SANTÉ du Journal de Crise.
 * Aucune donnée médicale réelle. Aucun diagnostic.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getMedicalBandInfo } from "@/logic/medicalInformationEngine";
import { getHospitalPressureBandInfo } from "@/logic/hospitalPressureEngine";
import { getHealthDataTrustBandInfo } from "@/logic/healthDataTrustEngine";
import { getHealthReportingBandInfo } from "@/logic/healthReportingDelayEngine";
import { getMedicalInformationSnapshot, hasMedicalAlert } from "@/types/medicalInformation";
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

export function HealthInfoCard({ state }: Props) {
  const router  = useRouter();
  const snap    = getMedicalInformationSnapshot(state);
  const hasAlert = hasMedicalAlert(snap);

  const mdqInfo    = getMedicalBandInfo(snap.medicalDataQuality);
  const hospInfo   = getHospitalPressureBandInfo(snap.hospitalPressure);
  const trustInfo  = getHealthDataTrustBandInfo(snap.healthDataTrust);
  const delayInfo  = getHealthReportingBandInfo(snap.healthReportingDelay);

  const overallColor = hasAlert ? PALETTE.danger : snap.hospitalPressure >= 61 ? PALETTE.warning : "#4caf82";

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
        <MaterialCommunityIcons name="hospital-box-outline" size={12} color={overallColor} />
        <Text style={s.headerLabel}>INFORMATION MÉDICALE</Text>
        {hasAlert && (
          <View style={[s.alertDot, { backgroundColor: PALETTE.danger }]} />
        )}
        <MaterialCommunityIcons name="chevron-right" size={12} color={PALETTE.textLow} style={s.chevron} />
      </View>

      {/* 4 indicateurs */}
      <View style={s.metricsGrid}>
        <MetricRow
          icon="hospital-box-outline"
          label="Données médicales"
          value={mdqInfo.label}
          color={mdqInfo.color}
        />
        <MetricRow
          icon="hospital-building"
          label="Pression hospitalière"
          value={`${Math.round(snap.hospitalPressure)} — ${hospInfo.label}`}
          color={hospInfo.color}
        />
        <MetricRow
          icon="shield-check-outline"
          label="Confiance chiffres"
          value={trustInfo.label}
          color={trustInfo.color}
        />
        <MetricRow
          icon="database-clock-outline"
          label="Retard remontée"
          value={delayInfo.label}
          color={delayInfo.color}
        />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth:      1,
    borderRadius:     RADIUS.sm,
    backgroundColor:  PALETTE.panel,
    paddingHorizontal: 12,
    paddingVertical:  8,
    gap:              6,
  },
  header: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
  },
  headerLabel: {
    flex:          1,
    fontSize:       9,
    fontFamily:     FONT.bold,
    color:          PALETTE.textMid,
    letterSpacing:  1.2,
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
