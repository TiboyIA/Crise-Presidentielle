import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { EdgeInsets } from "react-native-safe-area-context";
import { FONT, PALETTE } from "@/constants/uiTokens";
import { canLaunchOperation } from "@/logic/operationEngine";
import { getHotspotColor } from "@/logic/hotspotEngine";
import type { MapHotspot } from "@/logic/hotspotEngine";
import type { CountryDef, CountryRelation, OperationType, PlayerBuilding, RelationStatus, StrategyResources } from "@/types/strategy";

const STATUS_LABELS: Record<RelationStatus, string> = {
  allied:   "Allié",
  friendly: "Ami",
  neutral:  "Neutre",
  rival:    "Rival",
  hostile:  "Hostile",
};

const STATUS_BORDER: Record<RelationStatus, string> = {
  allied:   "#52c97a",
  friendly: "#4a9fff",
  neutral:  "#445566",
  rival:    "#e8a93a",
  hostile:  "#ff3040",
};

const PANEL_ACTIONS: { type: OperationType; icon: string; label: string }[] = [
  { type: "espionage",          icon: "eye-outline",       label: "Espion" },
  { type: "sign_treaty",        icon: "handshake-outline", label: "Traité" },
  { type: "sanction",           icon: "block-helper",      label: "Sanction" },
  { type: "military_operation", icon: "sword-cross",       label: "Opérat." },
];

interface Props {
  country: CountryDef;
  relation: CountryRelation;
  hotspots: MapHotspot[];
  buildings: PlayerBuilding[];
  resources: StrategyResources;
  insets: EdgeInsets;
  onClose: () => void;
  onOpenDossier: () => void;
  onAction: (op: OperationType) => void;
}

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export function CountryCommandPanel({
  country,
  relation,
  hotspots,
  buildings,
  resources,
  insets,
  onClose,
  onOpenDossier,
  onAction,
}: Props) {
  const borderColor = STATUS_BORDER[relation.status];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]} pointerEvents="box-none">
      <LinearGradient
        colors={["rgba(4,10,22,0.97)", "rgba(6,14,28,0.99)"]}
        style={[styles.panel, { borderColor }]}
        pointerEvents="auto"
      >
        {/* Close */}
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={13} color={PALETTE.textMid} />
        </Pressable>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.flag}>{country.flag}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{country.name}</Text>
              <View style={[styles.statusBadge, { borderColor, backgroundColor: borderColor + "22" }]}>
                <Text style={[styles.statusText, { color: borderColor }]}>
                  {STATUS_LABELS[relation.status].toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.region}>{country.region.toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatChip
            label="SCORE"
            value={`${relation.score > 0 ? "+" : ""}${relation.score}`}
            color={relation.score >= 0 ? "#52c97a" : "#ff3040"}
          />
          <StatChip
            label="MENACE"
            value={`${relation.threatLevel}`}
            color={relation.threatLevel >= 60 ? "#ff3040" : relation.threatLevel >= 30 ? "#e8a93a" : "#52c97a"}
          />
          <StatChip label="ÉCON." value={`${country.economy}`} color="#3fbe7a" />
          <StatChip label="MIL."   value={`${country.military}`} color="#e54848" />
        </View>

        {/* Active hotspots */}
        {hotspots.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hotspotScroll}
            contentContainerStyle={{ gap: 6, paddingRight: 4 }}
          >
            {hotspots.map((h) => (
              <View key={h.id} style={[styles.hotspotChip, { borderColor: getHotspotColor(h.type) + "66" }]}>
                <View style={[styles.hotspotDot, { backgroundColor: getHotspotColor(h.type) }]} />
                <Text style={styles.hotspotLabel} numberOfLines={1}>{h.title}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          {PANEL_ACTIONS.map((qa) => {
            const check = canLaunchOperation(qa.type, relation, buildings, resources);
            return (
              <Pressable
                key={qa.type}
                onPress={() => check.allowed && onAction(qa.type)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  check.allowed
                    ? { borderColor: PALETTE.gold + "55", backgroundColor: "rgba(201,168,76,0.08)" }
                    : { borderColor: "#1e2c3e", backgroundColor: "transparent" },
                  { opacity: pressed ? 0.7 : check.allowed ? 1 : 0.4 },
                ]}
              >
                <MaterialCommunityIcons
                  name={qa.icon as McName}
                  size={15}
                  color={check.allowed ? PALETTE.gold : PALETTE.textLow}
                />
                <Text style={[styles.actionLabel, { color: check.allowed ? PALETTE.textHigh : PALETTE.textLow }]}>
                  {qa.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={onOpenDossier}
            style={({ pressed }) => [
              styles.dossierBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="folder-open-outline" size={15} color={PALETTE.gold} />
            <Text style={styles.dossierLabel}>Dossier</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 11,
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 26,
  },
  flag: { fontSize: 28 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: PALETTE.textHigh,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 8,
    fontFamily: FONT.bold,
    letterSpacing: 1.2,
  },
  region: {
    fontSize: 9,
    fontFamily: FONT.semi,
    color: PALETTE.textLow,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 6,
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 6,
    paddingVertical: 6,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statValue: {
    fontSize: 13,
    fontFamily: FONT.bold,
  },
  statLabel: {
    fontSize: 7,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 1,
  },
  hotspotScroll: { marginTop: -2 },
  hotspotChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  hotspotDot: { width: 5, height: 5, borderRadius: 2.5 },
  hotspotLabel: {
    fontSize: 9,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    maxWidth: 140,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 0.3,
  },
  dossierBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE.gold + "55",
    backgroundColor: "rgba(201,168,76,0.1)",
  },
  dossierLabel: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
    letterSpacing: 0.3,
  },
});
