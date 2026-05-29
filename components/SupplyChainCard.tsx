/**
 * SupplyChainCard — Carte "Dépendances stratégiques" (Dashboard nation).
 *
 * Affiche les 4 secteurs les plus vulnérables avec leur niveau de risque,
 * et un indicateur de risque global agrégé.
 *
 * Pressable : navigue vers le Journal de Crise.
 * Aucune donnée commerciale réelle. Aucun pays nommé.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getSupplyRiskBandInfo,
  computeOverallSupplyRisk,
  DEFAULT_SUPPLY_CHAIN_STATE,
} from "@/logic/supplyChainEngine";
import { STRATEGIC_SECTORS, SECTOR_IDS } from "@/data/strategicSectors";
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

export function SupplyChainCard({ state }: Props) {
  const router = useRouter();
  const sc = state.supplyChain ?? DEFAULT_SUPPLY_CHAIN_STATE;

  const sortedSectors = SECTOR_IDS
    .map((id) => ({ id, def: STRATEGIC_SECTORS[id], ...sc[id] }))
    .sort((a, b) => b.disruptionRisk - a.disruptionRisk);

  const avgRisk     = computeOverallSupplyRisk(sc);
  const overallInfo = getSupplyRiskBandInfo(avgRisk);
  const hasAlert    = sortedSectors.some((s) => s.disruptionRisk >= 80 && s.stockLevel < 30);

  const overallColor =
    avgRisk >= 76 ? PALETTE.danger :
    avgRisk >= 56 ? "#e8864f" :
    avgRisk >= 31 ? PALETTE.warning :
    "#4caf82";

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
        <MaterialCommunityIcons name="package-variant-closed" size={12} color={overallColor} />
        <Text style={s.headerLabel}>DÉPENDANCES STRATÉGIQUES</Text>
        {hasAlert && (
          <View style={[s.alertDot, { backgroundColor: PALETTE.danger }]} />
        )}
        <View style={[s.riskBadge, { borderColor: overallColor + "44", backgroundColor: overallColor + "12" }]}>
          <Text style={[s.riskBadgeText, { color: overallColor }]}>{overallInfo.label}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={12} color={PALETTE.textLow} style={s.chevron} />
      </View>

      {/* 4 secteurs les plus vulnérables */}
      <View style={s.metricsGrid}>
        {sortedSectors.slice(0, 4).map((sec) => {
          const info = getSupplyRiskBandInfo(sec.disruptionRisk);
          return (
            <MetricRow
              key={sec.id}
              icon={sec.def.icon as McIconName}
              label={sec.def.name}
              value={info.label}
              color={info.color}
            />
          );
        })}
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
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      RADIUS.pill,
    borderWidth:       1,
  },
  riskBadgeText: {
    fontSize:   8,
    fontFamily: FONT.bold,
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
