import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { CountryCard } from "@/components/CountryCard";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { OPERATIONS, canLaunchOperation } from "@/logic/operationEngine";
import { RESOURCE_ICONS } from "@/types/strategy";
import type { CountryId, OperationType, ResourceKey } from "@/types/strategy";

export default function OperationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ countryId?: CountryId }>();
  const { state, launchOperation } = useStrategy();

  const { hPad } = useResponsive();
  const [selectedCountryId, setSelectedCountryId] = useState<CountryId | null>(params.countryId ?? null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState<OperationType | null>(null);

  if (!state) return null;

  const relationMap = Object.fromEntries(state.relations.map((r) => [r.countryId, r]));
  const selectedRelation = selectedCountryId ? relationMap[selectedCountryId] : null;

  const handleLaunch = async (type: OperationType) => {
    if (!selectedCountryId) return;
    setLoading(type);
    const res = launchOperation(type, selectedCountryId);
    setResult(res);
    setLoading(null);
    setTimeout(() => setResult(null), 4000);
  };

  const ops = (Object.values(OPERATIONS) as typeof OPERATIONS[OperationType][]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, paddingHorizontal: hPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.back, { color: colors.foreground }]}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>⚔️ Opérations</Text>
        <View style={{ width: 60 }} />
      </View>

      {result && (
        <View style={[styles.resultBanner, { backgroundColor: result.success ? "#60D08022" : "#FF506022", borderColor: result.success ? "#60D080" : "#FF5060" }]}>
          <Text style={[styles.resultText, { color: result.success ? "#60D080" : "#FF5060" }]}>
            {result.success ? "✓" : "✗"} {result.message}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Target selection */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYS CIBLE</Text>
        {selectedCountryId && selectedRelation ? (
          <View>
            <CountryCard countryId={selectedCountryId} relation={selectedRelation} onPress={() => setSelectedCountryId(null)} />
            <Pressable onPress={() => setSelectedCountryId(null)} style={styles.changeBtn}>
              <Text style={[styles.changeBtnText, { color: colors.primary }]}>Changer de cible</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.countryList}>
            {COUNTRY_LIST.filter((c) => c.id !== state.countryId).map((c) => {
              const rel = relationMap[c.id];
              if (!rel) return null;
              return (
                <CountryCard
                  key={c.id}
                  countryId={c.id}
                  relation={rel}
                  onPress={() => setSelectedCountryId(c.id)}
                />
              );
            })}
          </View>
        )}

        {/* Operations */}
        {selectedCountryId && selectedRelation && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>OPÉRATIONS DISPONIBLES</Text>
            <Text style={[styles.info, { color: colors.mutedForeground }]}>
              Score diplomatique : {selectedRelation.score > 0 ? "+" : ""}{selectedRelation.score} · Statut : {selectedRelation.status}
            </Text>

            {ops.map((op) => {
              const check = canLaunchOperation(op.id, selectedRelation, state.buildings, state.resources);
              const isLoading = loading === op.id;
              const cooldownExpiry = selectedRelation.operationCooldowns[op.id];
              const onCooldown = !!(cooldownExpiry && Date.now() < cooldownExpiry);

              return (
                <View key={op.id} style={[styles.opCard, { backgroundColor: colors.card, borderColor: check.allowed ? colors.border : colors.muted }]}>
                  <View style={styles.opHeader}>
                    <Text style={styles.opIcon}>{op.icon}</Text>
                    <View style={styles.opInfo}>
                      <Text style={[styles.opName, { color: check.allowed ? colors.foreground : colors.mutedForeground }]}>{op.name}</Text>
                      <Text style={[styles.opDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{op.description}</Text>
                    </View>
                    {op.isOffensive && (
                      <View style={[styles.offensiveBadge, { backgroundColor: "#FF506022" }]}>
                        <Text style={[styles.offensiveText, { color: "#FF5060" }]}>Offensif</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.costRow}>
                    {Object.entries(op.cost).map(([key, val]) => (
                      <View key={key} style={[styles.costChip, { backgroundColor: colors.muted }]}>
                        <Text style={styles.costIcon}>{RESOURCE_ICONS[key as ResourceKey] ?? "📦"}</Text>
                        <Text style={[styles.costText, { color: (state.resources[key as ResourceKey] ?? 0) >= val ? colors.foreground : "#FF5060" }]}>
                          {val}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {!check.allowed && (
                    <Text style={[styles.blockedReason, { color: "#FF5060" }]}>🔒 {check.reason}</Text>
                  )}

                  {onCooldown && (
                    <Text style={[styles.blockedReason, { color: colors.mutedForeground }]}>
                      ⏱ Rechargement en cours
                    </Text>
                  )}

                  <Pressable
                    onPress={() => check.allowed && !onCooldown ? handleLaunch(op.id) : undefined}
                    disabled={!check.allowed || onCooldown || isLoading}
                    style={({ pressed }) => [
                      styles.launchBtn,
                      {
                        backgroundColor: check.allowed && !onCooldown ? colors.primary : colors.muted,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.launchText, { color: check.allowed && !onCooldown ? "#fff" : colors.mutedForeground }]}>
                      {isLoading ? "En cours…" : "Lancer l'opération"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 14, fontFamily: "Inter_600SemiBold", width: 60 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  resultBanner: { marginHorizontal: 16, marginTop: 8, borderRadius: 8, borderWidth: 1, padding: 12 },
  resultText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  content: { paddingTop: 12, gap: 10 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2, marginTop: 4 },
  info: { fontSize: 12, fontFamily: "Inter_500Medium" },
  countryList: { gap: 8 },
  changeBtn: { paddingVertical: 6, alignItems: "center" },
  changeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  opCard: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  opHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  opIcon: { fontSize: 24, width: 30, textAlign: "center" },
  opInfo: { flex: 1, gap: 2 },
  opName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  opDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  offensiveBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  offensiveText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  costRow: { flexDirection: "row", gap: 6 },
  costChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  costIcon: { fontSize: 12 },
  costText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  blockedReason: { fontSize: 11, fontFamily: "Inter_500Medium" },
  launchBtn: { borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  launchText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
