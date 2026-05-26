import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { CountryCard } from "@/components/CountryCard";
import { Badge, Panel, PrimaryButton, ScreenHeader, SectionHeader } from "@/components/ui";
import { COUNTRY_LIST } from "@/data/countries";
import { STRATEGY_RESEARCH_LIST } from "@/data/strategyResearch";
import { OPERATIONS, canLaunchOperation } from "@/logic/operationEngine";
import { generateWeatherState } from "@/logic/weatherEngine";
import {
  getOperationWeatherModifier,
  getGlobalWeatherCondition,
  type WeatherCondition,
} from "@/logic/operationWeatherModifier";
import type { WeatherTypeId } from "@/data/weatherEvents";
import { OPERATION_IMG } from "@/constants/assets";
import { getOperationNarrative, getBlockedNarrative } from "@/data/operationNarratives";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { RESOURCE_LABELS } from "@/types/strategy";
import type { CountryId, OperationType, ResourceKey } from "@/types/strategy";
import { useComfort } from "@/context/ComfortContext";
import { useCommand } from "@/hooks/useCommand";
import { commandId } from "@/core/commands";

export default function OperationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ countryId?: CountryId }>();
  const { state, launchOperation } = useStrategy();
  const { hPad } = useResponsive();
  const [selectedCountryId, setSelectedCountryId] = useState<CountryId | null>(params.countryId ?? null);
  const [result, setResult] = useState<{ success: boolean; message: string; narrativeTitle?: string; narrativeBody?: string } | null>(null);
  const { run, isPending } = useCommand();
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resultTimerRef.current) clearTimeout(resultTimerRef.current); }, []);

  const { enabled: comfort, fs, pad, reducedInfo, extraConfirm } = useComfort();

  if (!state) return null;

  const weather = generateWeatherState(state.mandateDay);
  const weatherTypeId = weather.typeDef.id as WeatherTypeId;
  const globalCondition = getGlobalWeatherCondition(weatherTypeId);

  const conditionColor = (c: WeatherCondition) =>
    c === "favorable" ? PALETTE.success : c === "defavorable" ? PALETTE.warning : PALETTE.textLow;
  const conditionLabel = (c: WeatherCondition) =>
    c === "favorable" ? "Favorable" : c === "defavorable" ? "Défavorable" : "Neutre";
  const conditionIcon = (c: WeatherCondition): React.ComponentProps<typeof MaterialCommunityIcons>["name"] =>
    c === "favorable" ? "weather-sunny" : c === "defavorable" ? "weather-lightning-rainy" : "weather-cloudy";

  const relationMap = Object.fromEntries(state.relations.map((r) => [r.countryId, r]));
  const selectedRelation = selectedCountryId ? relationMap[selectedCountryId] : null;

  const doLaunch = (type: OperationType) => {
    if (!selectedCountryId) return;
    const cid = commandId("launch_operation", `${type}:${selectedCountryId}`);
    const res = run(cid, () => launchOperation(type, selectedCountryId));
    if (res === null) {
      setResult({ success: false, message: "Action en cours…" });
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => setResult(null), 1500);
      return;
    }
    const narrative = getOperationNarrative(type, res.success);
    setResult({ ...res, narrativeTitle: narrative.title, narrativeBody: narrative.body });
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => setResult(null), 7000);
  };

  const handleLaunch = (type: OperationType) => {
    if (!selectedCountryId) return;
    const op = OPERATIONS[type];
    const needsConfirm = op.isOffensive || extraConfirm;
    if (needsConfirm) {
      const costStr = (Object.entries(op.cost) as [ResourceKey, number][])
        .map(([k, v]) => `${v} ${RESOURCE_LABELS[k]}`)
        .join(" · ");
      Alert.alert(
        `Opération : ${op.name}`,
        `${op.description}\n\nCoût : ${costStr}${op.isOffensive ? "\n\nCette action est irréversible une fois lancée." : ""}`,
        [
          { text: "Annuler", style: "cancel" },
          { text: op.isOffensive ? "Lancer" : "Confirmer", style: op.isOffensive ? "destructive" : "default", onPress: () => doLaunch(type) },
        ],
      );
      return;
    }
    doLaunch(type);
  };

  const ops = Object.values(OPERATIONS);
  const completedResearch = state.strategyResearch?.completed ?? [];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Centre d'opérations"
        kicker="ACTIONS COVERTES"
        rightSlot={
          <Pressable
            onPress={() => router.push("/mission-reports")}
            hitSlop={10}
            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          >
            <MaterialCommunityIcons name="file-document-multiple-outline" size={18} color={PALETTE.textLow} />
            <Text style={{ fontFamily: FONT.med, fontSize: 11, color: PALETTE.textLow }}>
              Rapports
            </Text>
            {(state.missionReports?.length ?? 0) > 0 && (
              <View style={{ backgroundColor: PALETTE.gold, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 9, color: "#000" }}>
                  {state.missionReports!.length}
                </Text>
              </View>
            )}
          </Pressable>
        }
      />

      {result && (
        <View style={[
          styles.resultBanner,
          { marginHorizontal: hPad, borderColor: result.success ? PALETTE.success + "55" : PALETTE.danger + "55", backgroundColor: result.success ? PALETTE.success + "12" : PALETTE.danger + "12" },
        ]}>
          <MaterialCommunityIcons
            name={result.success ? "check-circle-outline" : "alert-octagon-outline"}
            size={18}
            color={result.success ? PALETTE.success : PALETTE.danger}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, gap: 3 }}>
            {result.narrativeTitle ? (
              <>
                <Text style={[styles.resultTitle, { color: result.success ? PALETTE.success : PALETTE.danger }]}>
                  {result.narrativeTitle}
                </Text>
                <Text style={styles.resultNarrative}>{result.narrativeBody}</Text>
              </>
            ) : (
              <Text style={[styles.resultText, { color: result.success ? PALETTE.success : PALETTE.danger }]}>{result.message}</Text>
            )}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }, comfort && { gap: pad(10) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Target selection */}
        <SectionHeader label="Pays cible" trailing={selectedCountryId ? <Pressable onPress={() => setSelectedCountryId(null)}><Text style={styles.changeLink}>Changer →</Text></Pressable> : undefined} />

        {selectedCountryId && selectedRelation ? (
          <CountryCard countryId={selectedCountryId} relation={selectedRelation} onPress={() => setSelectedCountryId(null)} />
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={styles.helper}>Sélectionnez le pays sur lequel concentrer vos opérations.</Text>
            {COUNTRY_LIST.filter((c) => c.id !== state.countryId).map((c) => {
              const rel = relationMap[c.id];
              if (!rel) return null;
              return <CountryCard key={c.id} countryId={c.id} relation={rel} onPress={() => setSelectedCountryId(c.id)} />;
            })}
          </View>
        )}

        {/* Operations list */}
        {selectedCountryId && selectedRelation && (
          <>
            <SectionHeader label="Catalogue d'opérations" count={`${ops.length}`} />

            {/* Bandeau météo opérationnel */}
            {!reducedInfo && (
              <View style={[styles.weatherBanner, { borderColor: conditionColor(globalCondition.condition) + "44", backgroundColor: conditionColor(globalCondition.condition) + "0e" }]}>
                <MaterialCommunityIcons
                  name={weather.typeDef.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                  size={14}
                  color={conditionColor(globalCondition.condition)}
                />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[styles.weatherBannerTitle, { color: conditionColor(globalCondition.condition) }]}>
                    {weather.typeDef.label} · Condition météo :{" "}
                    <Text style={{ fontFamily: FONT.bold }}>{conditionLabel(globalCondition.condition)}</Text>
                  </Text>
                  <Text style={styles.weatherBannerSub}>{globalCondition.summary}</Text>
                </View>
                <MaterialCommunityIcons name={conditionIcon(globalCondition.condition)} size={18} color={conditionColor(globalCondition.condition) + "88"} />
              </View>
            )}

            <Panel style={styles.diploCard}>
              <Text style={styles.diploKicker}>SCORE DIPLOMATIQUE</Text>
              <View style={styles.diploRow}>
                <Text style={styles.diploVal}>{selectedRelation.score > 0 ? "+" : ""}{selectedRelation.score}</Text>
                <Text style={styles.diploStatus}>· {selectedRelation.status.toUpperCase()}</Text>
              </View>
            </Panel>

            {ops.map((op) => {
              const check = canLaunchOperation(op.id, selectedRelation, state.buildings, state.resources);
              const isLoading = isPending(commandId("launch_operation", `${op.id}:${selectedCountryId}`));
              const cooldownExpiry = selectedRelation.operationCooldowns[op.id];
              const onCooldown = !!(cooldownExpiry && Date.now() < cooldownExpiry);
              const blocked = !check.allowed || onCooldown;
              const opImg = OPERATION_IMG[op.id];
              const hasResearchBonus = STRATEGY_RESEARCH_LIST.some(
                (r) => r.operationBonus === op.id && completedResearch.includes(r.id),
              );

              return (
                <View key={op.id} style={styles.opWrap}>
                  <LinearGradient
                    colors={["#1a1f2c", "#0d1119"]}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    style={[styles.opCard, { borderColor: op.isOffensive ? PALETTE.danger + "44" : PALETTE.panelEdge }]}
                  >
                    {/* Banner — masquée en mode Confort, remplacée par un en-tête texte compact */}
                    {!comfort ? (
                      <View style={styles.opBanner}>
                        {opImg && <Image source={opImg} style={styles.opImg} resizeMode="cover" />}
                        <LinearGradient colors={["rgba(13,17,25,0.1)", "rgba(13,17,25,0.96)"]} style={StyleSheet.absoluteFill} />
                        <View style={styles.opBannerTopRow}>
                          {op.isOffensive ? (
                            <Badge label="Offensif" tone="danger" size="xs" dot />
                          ) : (
                            <Badge label="Défensif" tone="info" size="xs" dot />
                          )}
                        </View>
                        <View style={styles.opBannerBottom}>
                          <Text style={styles.opName}>{op.name}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: pad(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PALETTE.panelEdge }}>
                        {op.isOffensive
                          ? <Badge label="Offensif" tone="danger" size="xs" dot />
                          : <Badge label="Défensif" tone="info" size="xs" dot />}
                        <Text style={{ flex: 1, fontSize: fs(15), fontFamily: FONT.bold, color: PALETTE.textHigh }}>{op.name}</Text>
                      </View>
                    )}

                    {/* Body — padding élargi en mode Confort */}
                    <View style={[styles.opBody, comfort && { padding: pad(12), gap: pad(10) }]}>
                      <Text style={[styles.opDesc, comfort && { fontSize: fs(11), color: PALETTE.textMid }]}>{op.description}</Text>

                      {/* Cost row */}
                      <View style={styles.metricsRow}>
                        <View style={styles.metric}>
                          <Text style={styles.metricKicker}>COÛT</Text>
                          <View style={styles.costList}>
                            {Object.entries(op.cost).map(([key, val]) => {
                              const have = state.resources[key as ResourceKey] ?? 0;
                              const ok = have >= val;
                              return (
                                <Text key={key} style={[styles.costItem, { color: ok ? PALETTE.textHigh : PALETTE.danger }]}>
                                  {!ok ? "✕ " : ""}{val} <Text style={styles.costKey}>{key}</Text>
                                </Text>
                              );
                            })}
                          </View>
                        </View>
                        {op.requiredBuilding && (
                          <View style={styles.metric}>
                            <Text style={styles.metricKicker}>PRÉREQUIS</Text>
                            <Text style={styles.metricVal}>Niv. {op.requiredBuilding.level}</Text>
                          </View>
                        )}
                      </View>

                      {/* Status messages */}
                      {!check.allowed && (() => {
                        const bn = getBlockedNarrative(check.reason ?? "");
                        return (
                          <View style={{ gap: 4 }}>
                            <View style={styles.statusRow}>
                              <MaterialCommunityIcons name="lock-outline" size={12} color={PALETTE.danger} />
                              <Text style={[styles.statusText, { color: PALETTE.danger }]}>{bn.title}</Text>
                            </View>
                            {!reducedInfo && (
                              <Text style={styles.blockedNarrative}>{bn.body}</Text>
                            )}
                          </View>
                        );
                      })()}
                      {onCooldown && check.allowed && (() => {
                        const bn = getBlockedNarrative("cooldown");
                        return (
                          <View style={{ gap: 4 }}>
                            <View style={styles.statusRow}>
                              <MaterialCommunityIcons name="timer-sand" size={12} color={PALETTE.warning} />
                              <Text style={[styles.statusText, { color: PALETTE.warning }]}>{bn.title}</Text>
                            </View>
                            {!reducedInfo && (
                              <Text style={styles.blockedNarrative}>{bn.body}</Text>
                            )}
                          </View>
                        );
                      })()}

                      {hasResearchBonus && !reducedInfo && (
                        <View style={styles.statusRow}>
                          <MaterialCommunityIcons name="flask-outline" size={12} color="#a78bfa" />
                          <Text style={[styles.statusText, { color: "#a78bfa" }]}>Bonus R&D actif · +5% succès</Text>
                        </View>
                      )}

                      {!reducedInfo && (() => {
                        const wm = getOperationWeatherModifier(weatherTypeId, op.id);
                        const col = conditionColor(wm.condition);
                        const pct = wm.modifier !== 0
                          ? ` · ${wm.modifier > 0 ? "+" : ""}${Math.round(wm.modifier * 100)} %`
                          : "";
                        return (
                          <View style={styles.statusRow}>
                            <MaterialCommunityIcons name={conditionIcon(wm.condition)} size={12} color={col} />
                            <Text style={[styles.statusText, { color: col }]}>
                              Météo : {conditionLabel(wm.condition)}{pct} · {wm.label}
                            </Text>
                          </View>
                        );
                      })()}

                      <PrimaryButton
                        label={isLoading ? "En cours…" : op.isOffensive ? "Lancer l'opération" : "Engager"}
                        variant={op.isOffensive ? "danger" : "primary"}
                        disabled={blocked || isLoading}
                        onPress={() => handleLaunch(op.id)}
                      />
                    </View>
                  </LinearGradient>
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
  container: { flex: 1, backgroundColor: PALETTE.ink },
  resultBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8, padding: 12, borderRadius: RADIUS.sm, borderWidth: 1 },
  resultTitle: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  resultNarrative: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 17 },
  resultText: { fontSize: 12, fontFamily: FONT.bold, flex: 1 },
  blockedNarrative: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic", lineHeight: 15, paddingLeft: 18 },
  content: { paddingTop: 12, gap: 10 },
  // note: gap is overridden inline when comfort enabled
  changeLink: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold },
  helper: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, fontStyle: "italic", marginBottom: 4 },

  diploCard: { padding: 12 },
  diploKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  diploRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
  diploVal: { fontSize: 22, fontFamily: FONT.bold, color: PALETTE.textHigh },
  diploStatus: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 1 },

  opWrap: { borderRadius: RADIUS.md, overflow: "hidden" },
  opCard: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  opBanner: { height: 88, position: "relative", overflow: "hidden" },
  opImg: { width: "100%", height: "100%" },
  opBannerTopRow: { position: "absolute", top: 8, right: 8 },
  opBannerBottom: { position: "absolute", bottom: 8, left: 12, right: 12 },
  opName: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 0.4 },
  opBody: { padding: 12, gap: 10 },
  opDesc: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 },

  metricsRow: { flexDirection: "row", gap: 12 },
  metric: { gap: 3 },
  metricKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  metricVal: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },
  costList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  costItem: { fontSize: 12, fontFamily: FONT.bold },
  costKey: { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textMid, letterSpacing: 0.5 },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 11, fontFamily: FONT.semi },

  weatherBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 10, borderRadius: RADIUS.sm, borderWidth: 1,
  },
  weatherBannerTitle: { fontSize: 10, fontFamily: FONT.semi },
  weatherBannerSub: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow },
});
