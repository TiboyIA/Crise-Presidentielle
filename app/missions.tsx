import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { MissionCard } from "@/components/MissionCard";
import { formatDuration } from "@/logic/buildingEngine";
import { timeUntilReset } from "@/logic/missionEngine";

export default function MissionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, collectMissionReward } = useStrategy();

  if (!state) return null;

  const completed = state.missions.filter((m) => m.completed);
  const active = state.missions.filter((m) => !m.completed);
  const resetIn = timeUntilReset(state.missions);
  const allDone = active.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.back, { color: colors.foreground }]}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>📋 Missions du jour</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Reset timer */}
        <View style={[styles.resetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.resetTitle, { color: colors.foreground }]}>🔄 Réinitialisation dans</Text>
          <Text style={[styles.resetTime, { color: colors.primary }]}>{formatDuration(resetIn)}</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View style={[styles.progressFill, { width: `${((86400000 - resetIn) / 86400000) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Progress summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: allDone ? "#60D080" : colors.border }]}>
          <Text style={[styles.summaryText, { color: allDone ? "#60D080" : colors.foreground }]}>
            {allDone ? "✅ Toutes les missions complétées !" : `${completed.length}/${state.missions.length} missions complétées`}
          </Text>
        </View>

        {/* Collectible */}
        {completed.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>À RÉCLAMER</Text>
            {completed.map((m) => (
              <MissionCard key={m.defId} mission={m} onCollect={() => collectMissionReward(m.defId)} />
            ))}
          </>
        )}

        {/* Active */}
        {active.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EN COURS</Text>
            {active.map((m) => (
              <MissionCard key={m.defId} mission={m} onCollect={() => {}} />
            ))}
          </>
        )}

        {/* Hints */}
        <View style={[styles.hintCard, { backgroundColor: colors.muted }]}>
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>💡 Comment progresser</Text>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            • Améliorez vos bâtiments pour produire plus de ressources{"\n"}
            • Lancez des opérations depuis la Carte Mondiale{"\n"}
            • Les ressources s'accumulent même hors ligne{"\n"}
            • Les missions se réinitialisent toutes les 24h
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 14, fontFamily: "Inter_600SemiBold", width: 60 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  resetCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 6 },
  resetTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resetTime: { fontSize: 22, fontFamily: "Inter_700Bold" },
  progressBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  summary: { borderRadius: 8, borderWidth: 1, padding: 12, alignItems: "center" },
  summaryText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  hintCard: { borderRadius: 10, padding: 14, gap: 8 },
  hintTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
