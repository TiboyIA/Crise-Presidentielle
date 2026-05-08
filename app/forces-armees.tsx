import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { UnitCard } from "@/components/UnitCard";
import { Panel } from "@/components/ui";
import { UNITS, UNIT_LIST, BRANCH_LABELS, BRANCH_COLORS, BRANCH_ORDER } from "@/data/units";
import { MILITARY_DOCTRINES, MILITARY_DOCTRINE_LIST } from "@/data/militaryDoctrines";
import { calculateMilitaryPower } from "@/logic/militaryEngine";
import { canAfford } from "@/logic/buildingEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { UnitBranch, MilitaryDoctrineId } from "@/types/units";
import type { UnitId } from "@/types/units";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type TabId = UnitBranch | "queue" | "doctrine";

const TABS: { id: TabId; label: string; icon: McIconName }[] = [
  { id: "land",     label: "Terre",    icon: "tank" },
  { id: "air",      label: "Air",      icon: "airplane" },
  { id: "naval",    label: "Mer",      icon: "anchor" },
  { id: "support",  label: "Soutien",  icon: "shield-half-full" },
  { id: "queue",    label: "File",     icon: "clock-outline" },
  { id: "doctrine", label: "Doctrine", icon: "sword-cross" },
];

function formatRemaining(endsAt: number): string {
  const ms = Math.max(0, endsAt - Date.now());
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}min`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export default function ForcesArmeesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, trainUnit, collectTraining, setMilitaryDoctrine } = useStrategy();
  const { hPad, maxContentWidth } = useResponsive();
  const [activeTab, setActiveTab] = useState<TabId>("land");

  if (!state) return null;

  const playerUnits = state.playerUnits ?? [];
  const trainingQueue = state.trainingQueue ?? [];
  const militaryDoctrine = state.militaryDoctrine ?? "defensive";
  const militaryPower = calculateMilitaryPower(playerUnits, militaryDoctrine);
  const completedCount = trainingQueue.filter((e) => e.status === "completed").length;

  const getPlayerUnit = (unitId: UnitId) => playerUnits.find((u) => u.unitId === unitId);

  const handleTrain = (unitId: UnitId, qty: number) => {
    const result = trainUnit(unitId, qty);
    if (!result.success) Alert.alert("Formation impossible", result.reason ?? "Erreur");
  };

  const handleSetDoctrine = (id: MilitaryDoctrineId) => {
    const result = setMilitaryDoctrine(id);
    if (!result.success) Alert.alert("Changement impossible", result.reason ?? "Erreur");
  };

  const branchUnits = activeTab !== "queue" && activeTab !== "doctrine"
    ? UNIT_LIST.filter((u) => u.branch === activeTab)
    : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#110d1a", "#0d1119"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerKicker}>ÉTAT-MAJOR · COMMANDEMENT</Text>
            <Text style={styles.headerTitle}>FORCES ARMÉES</Text>
          </View>
          <View style={styles.powerBadge}>
            <MaterialCommunityIcons name="sword-cross" size={12} color={PALETTE.crimson} />
            <Text style={styles.powerNum}>{militaryPower.total}</Text>
          </View>
        </View>

        {/* Military power breakdown */}
        <View style={styles.powerRow}>
          {(["land", "air", "naval", "support"] as UnitBranch[]).map((b) => {
            const val = militaryPower[b];
            const color = BRANCH_COLORS[b];
            return (
              <View key={b} style={styles.powerCell}>
                <Text style={[styles.powerCellVal, { color }]}>{val}</Text>
                <Text style={[styles.powerCellLbl, { color: color + "99" }]}>{BRANCH_LABELS[b].toUpperCase()}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.headerRule} />
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabColor = tab.id in BRANCH_COLORS ? BRANCH_COLORS[tab.id as UnitBranch] : PALETTE.gold;
          const hasBadge = tab.id === "queue" && completedCount > 0;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={({ pressed }) => [styles.tab, isActive && { borderBottomColor: tabColor, borderBottomWidth: 2 }, { opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialCommunityIcons name={tab.icon} size={14} color={isActive ? tabColor : PALETTE.textLow} />
              <Text style={[styles.tabLabel, { color: isActive ? tabColor : PALETTE.textLow }]}>{tab.label}</Text>
              {hasBadge && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{completedCount}</Text></View>}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad },
          maxContentWidth ? { maxWidth: maxContentWidth, alignSelf: "center", width: "100%" } : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* UNIT BRANCH VIEW */}
        {(activeTab === "land" || activeTab === "air" || activeTab === "naval" || activeTab === "support") && (
          <>
            {branchUnits.map((def) => {
              const pu = getPlayerUnit(def.id);
              const affordable = canAfford(def.baseCost, state.resources);
              const locked = def.unlockRequirement
                ? !state.buildings.some((b) => b.id === def.unlockRequirement!.buildingId && b.level >= def.unlockRequirement!.level)
                : false;
              return locked ? (
                <Panel key={def.id} style={styles.lockedCard}>
                  <MaterialCommunityIcons name="lock-outline" size={14} color={PALETTE.textLow} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockedName}>{def.name}</Text>
                    <Text style={styles.lockedReq}>
                      Débloqué : {def.unlockRequirement?.buildingId.replace(/_/g, " ")} niv. {def.unlockRequirement?.level}
                    </Text>
                  </View>
                  <View style={[styles.rarityDot, { backgroundColor: BRANCH_COLORS[def.branch] }]} />
                </Panel>
              ) : (
                <UnitCard
                  key={def.id}
                  def={def}
                  playerUnit={pu}
                  canAfford={affordable}
                  onTrain={(qty) => handleTrain(def.id, qty)}
                />
              );
            })}
          </>
        )}

        {/* TRAINING QUEUE */}
        {activeTab === "queue" && (
          <>
            {completedCount > 0 && (
              <Pressable
                onPress={collectTraining}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Panel variant="gold" glow style={styles.collectBanner}>
                  <MaterialCommunityIcons name="star-circle" size={18} color={PALETTE.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.collectTitle}>{completedCount} FORMATION{completedCount > 1 ? "S" : ""} TERMINÉE{completedCount > 1 ? "S" : ""}</Text>
                    <Text style={styles.collectSub}>Appuyez pour récupérer vos unités</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.gold} />
                </Panel>
              </Pressable>
            )}
            {trainingQueue.length === 0 && (
              <Panel style={styles.emptyPanel}>
                <MaterialCommunityIcons name="clock-outline" size={28} color={PALETTE.textLow} />
                <Text style={styles.emptyText}>Aucune formation en cours</Text>
                <Text style={styles.emptySubText}>Sélectionnez une unité dans les onglets Terre, Air, Mer ou Soutien.</Text>
              </Panel>
            )}
            {trainingQueue.map((entry) => {
              const def = UNITS[entry.unitId];
              const isComplete = entry.status === "completed";
              const branchColor = BRANCH_COLORS[def?.branch ?? "land"] ?? PALETTE.gold;
              const pct = isComplete ? 100 : Math.round(((Date.now() - entry.startedAt) / (entry.endsAt - entry.startedAt)) * 100);
              return (
                <Panel key={entry.id} style={styles.queueCard}>
                  <View style={styles.queueRow}>
                    <View style={[styles.queueDot, { backgroundColor: isComplete ? PALETTE.success : branchColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.queueName}>{def?.name ?? entry.unitId} × {entry.quantity}</Text>
                      <View style={styles.queueTrack}>
                        <View style={[styles.queueFill, { width: `${pct}%`, backgroundColor: isComplete ? PALETTE.success : branchColor }]} />
                      </View>
                    </View>
                    <Text style={[styles.queueEta, { color: isComplete ? PALETTE.success : PALETTE.textMid }]}>
                      {isComplete ? "✓ Prêt" : formatRemaining(entry.endsAt)}
                    </Text>
                  </View>
                </Panel>
              );
            })}
          </>
        )}

        {/* MILITARY DOCTRINE */}
        {activeTab === "doctrine" && (
          <>
            <Panel style={styles.activeDoctrine}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="sword-cross" size={14} color={PALETTE.gold} />
                <Text style={styles.sectionTitle}>DOCTRINE ACTIVE</Text>
              </View>
              {(() => {
                const doc = MILITARY_DOCTRINES[militaryDoctrine];
                return (
                  <View style={styles.docRow}>
                    <MaterialCommunityIcons name={doc.icon as McIconName} size={24} color={doc.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docName, { color: doc.color }]}>{doc.name}</Text>
                      <Text style={styles.docDesc}>{doc.description}</Text>
                    </View>
                  </View>
                );
              })()}
            </Panel>

            {MILITARY_DOCTRINE_LIST.filter((d) => d.id !== militaryDoctrine).map((doc) => (
              <Pressable
                key={doc.id}
                onPress={() => Alert.alert(
                  `Adopter : ${doc.name}`,
                  doc.description + "\n\nChangement de doctrine ?",
                  [
                    { text: "Annuler", style: "cancel" },
                    { text: "Adopter", onPress: () => handleSetDoctrine(doc.id) },
                  ],
                )}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Panel style={[styles.docOption, { borderColor: doc.color + "44" }]}>
                  <MaterialCommunityIcons name={doc.icon as McIconName} size={20} color={doc.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docOptionName, { color: doc.color }]}>{doc.name}</Text>
                    <Text style={styles.docDesc}>{doc.description}</Text>
                    <View style={styles.bonusTags}>
                      {doc.attackBonus > 0 && <View style={styles.bonusChip}><Text style={styles.bonusText}>ATK +{Math.round(doc.attackBonus * 100)}%</Text></View>}
                      {doc.defenseBonus > 0 && <View style={[styles.bonusChip, { borderColor: "#4a9fff55" }]}><Text style={[styles.bonusText, { color: "#4a9fff" }]}>DEF +{Math.round(doc.defenseBonus * 100)}%</Text></View>}
                      {doc.upkeepMod > 0 && <View style={[styles.bonusChip, { borderColor: "#e54848aa" }]}><Text style={[styles.bonusText, { color: "#e54848" }]}>Entretien +{Math.round(doc.upkeepMod * 100)}%</Text></View>}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={PALETTE.textLow} />
                </Panel>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 8 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 2 },
  headerRule: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.panelEdge, marginTop: 10 },
  powerBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.crimson + "55", backgroundColor: "rgba(192,57,43,0.1)" },
  powerNum: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.crimson },

  powerRow: { flexDirection: "row", gap: 0 },
  powerCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  powerCellVal: { fontSize: 14, fontFamily: FONT.bold },
  powerCellLbl: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 1 },

  tabBar: { paddingHorizontal: 12, paddingVertical: 4, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PALETTE.panelEdge },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, position: "relative" },
  tabLabel: { fontSize: 11, fontFamily: FONT.semi },
  tabBadge: { backgroundColor: PALETTE.success, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  tabBadgeText: { fontSize: 8, fontFamily: FONT.bold, color: "#fff" },

  content: { gap: 8, paddingTop: 10 },

  lockedCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, opacity: 0.6 },
  lockedName: { fontSize: 12, fontFamily: FONT.semi, color: PALETTE.textMid },
  lockedReq: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },

  collectBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  collectTitle: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1.5 },
  collectSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, marginTop: 2 },

  emptyPanel: { padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: FONT.semi, color: PALETTE.textMid },
  emptySubText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 15 },

  queueCard: { padding: 10, gap: 6 },
  queueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  queueDot: { width: 8, height: 8, borderRadius: 4 },
  queueName: { fontSize: 12, fontFamily: FONT.semi, color: PALETTE.textHigh, marginBottom: 4 },
  queueTrack: { height: 3, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  queueFill: { height: "100%", borderRadius: 2 },
  queueEta: { fontSize: 10, fontFamily: FONT.bold, width: 60, textAlign: "right" },

  activeDoctrine: { padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  docName: { fontSize: 14, fontFamily: FONT.bold },
  docDesc: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, marginTop: 2, lineHeight: 14 },
  docOption: { padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1 },
  docOptionName: { fontSize: 12, fontFamily: FONT.bold },
  bonusTags: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 5 },
  bonusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: PALETTE.success + "55" },
  bonusText: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.success, letterSpacing: 0.5 },
});
