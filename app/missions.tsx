import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { MissionCard } from "@/components/MissionCard";
import { Panel, ScreenHeader, SectionHeader } from "@/components/ui";
import { formatDuration } from "@/logic/buildingEngine";
import { timeUntilReset } from "@/logic/missionEngine";
import { FONT, PALETTE } from "@/constants/uiTokens";

const DAY_MS = 86_400_000;

export default function MissionsScreen() {
  const insets = useSafeAreaInsets();
  const { state, collectMissionReward } = useStrategy();
  const { hPad } = useResponsive();

  if (!state) return null;

  const completed = state.missions.filter((m) => m.completed);
  const active = state.missions.filter((m) => !m.completed);
  const resetIn = timeUntilReset(state.missions);
  const dayProgress = (DAY_MS - resetIn) / DAY_MS;
  const allDone = active.length === 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Missions du jour" kicker="ORDRES DE MISSION" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Panel style={styles.resetCard}>
          <View style={styles.resetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resetKicker}>PROCHAINE ROTATION</Text>
              <Text style={styles.resetTime}>{formatDuration(resetIn)}</Text>
            </View>
            <MaterialCommunityIcons name="refresh-circle" size={26} color={PALETTE.gold} />
          </View>
          <View style={styles.resetBar}>
            <LinearGradient
              colors={[PALETTE.crimson, PALETTE.gold]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.resetFill, { width: `${Math.round(dayProgress * 100)}%` }]}
            />
          </View>
        </Panel>

        <Panel variant={allDone ? "gold" : "default"} glow={allDone} style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <MaterialCommunityIcons
              name={allDone ? "check-circle" : "clipboard-check-outline"}
              size={20}
              color={allDone ? PALETTE.gold : PALETTE.textMid}
            />
            <Text style={[styles.summaryText, { color: allDone ? PALETTE.gold : PALETTE.textHigh }]}>
              {allDone ? "Toutes les missions complétées" : `${completed.length} sur ${state.missions.length} accomplies`}
            </Text>
          </View>
        </Panel>

        {completed.length > 0 && (
          <>
            <SectionHeader label="À réclamer" count={completed.length} accent={PALETTE.gold} />
            {completed.map((m) => (
              <MissionCard key={m.defId} mission={m} onCollect={() => collectMissionReward(m.defId)} />
            ))}
          </>
        )}

        {active.length > 0 && (
          <>
            <SectionHeader label="En cours" count={active.length} />
            {active.map((m) => (
              <MissionCard key={m.defId} mission={m} onCollect={() => {}} />
            ))}
          </>
        )}

        <Panel style={styles.hintCard}>
          <View style={styles.hintHeader}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.hintTitle}>COMMENT PROGRESSER</Text>
          </View>
          {[
            "Améliorez vos ministères pour produire plus de ressources",
            "Lancez des opérations depuis la salle de crise",
            "Les ressources s'accumulent même hors ligne",
            "Les missions se réinitialisent toutes les 24h",
          ].map((t) => (
            <View key={t} style={styles.hintRow}>
              <View style={styles.hintBullet} />
              <Text style={styles.hintText}>{t}</Text>
            </View>
          ))}
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.ink },
  content: { paddingTop: 12, gap: 10 },

  resetCard: { padding: 14, gap: 10 },
  resetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  resetKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  resetTime: { fontSize: 22, fontFamily: FONT.bold, color: PALETTE.textHigh, marginTop: 4 },
  resetBar: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  resetFill: { height: "100%", borderRadius: 2 },

  summaryCard: { padding: 14, flexDirection: "row", alignItems: "center" },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryText: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },

  hintCard: { padding: 14, gap: 6, marginTop: 6 },
  hintHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  hintTitle: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hintBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: PALETTE.gold, marginTop: 6 },
  hintText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16, flex: 1 },
});
