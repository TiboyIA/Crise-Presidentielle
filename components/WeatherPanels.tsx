import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import {
  generateForecast, canPrepareForecast, canIssueAlert,
  CONFIDENCE_DEFS, SEVERITY_DEFS, PREPARE_COST_MONEY, ALERT_COST_INFLUENCE,
} from "@/logic/forecastUncertaintyEngine";
import { getAgroWeatherSnapshot } from "@/logic/agroWeatherEngine";
import { getWeatherOpportunitySnapshot } from "@/logic/weatherOpportunityEngine";
import { getTransportDisruptionSummary } from "@/logic/weatherTransportEngine";
import {
  getTrustLevel, TRUST_LEVEL_DEFS, WEATHER_ALERT_TRUST_INITIAL,
} from "@/logic/weatherAlertTrustEngine";
import { WEATHER_DOCTRINES_LIST, WEATHER_DOCTRINE_DEFAULT } from "@/logic/weatherDoctrineEngine";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function AgroBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={agroBarStyles.row}>
      <Text style={agroBarStyles.label}>{label}</Text>
      <View style={agroBarStyles.track}>
        <View style={[agroBarStyles.fill, { width: `${value}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={[agroBarStyles.pct, { color }]}>{Math.round(value)} %</Text>
    </View>
  );
}

/**
 * Panneaux météo détaillés autonomes — migrés du Journal de Crise vers la
 * Salle Météo Nationale : prévisions incertaines (avec actions préparer /
 * émettre alerte), météo agricole, fenêtre favorable, doctrine météo.
 * Re-dérive tout depuis le contexte ; conserve les actions de jeu.
 */
export function WeatherPanels() {
  const { state, prepareForecast, issuePublicAlert, setWeatherDoctrine } = useStrategy();
  const { hPad } = useResponsive();

  const forecast = useMemo(
    () => (state ? generateForecast(state.mandateDay) : null),
    [state?.mandateDay],
  );
  const agroSnapshot = useMemo(
    () => (state ? getAgroWeatherSnapshot(state) : null),
    [state?.mandateDay, state?.agroWeather],
  );
  const opportunitySnapshot = useMemo(
    () => (state ? getWeatherOpportunitySnapshot(state) : null),
    [state?.mandateDay, state?.weatherOpportunity],
  );
  const transportDisruption = useMemo(
    () => (state ? getTransportDisruptionSummary(state.mandateDay) : null),
    [state?.mandateDay],
  );

  if (!state) return null;

  return (
    <>
      {/* ── Prévisions météo incertaines ──────────────────────────────── */}
      {forecast && (
        <View style={[styles.forecastBlock, { marginHorizontal: hPad }]}>
          <View style={styles.forecastHeader}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={12} color={PALETTE.textLow} />
            <Text style={styles.forecastTitle}>PRÉVISIONS INCERTAINES</Text>
            <View style={[styles.forecastSevBadge, { backgroundColor: SEVERITY_DEFS[forecast.expectedSeverity].color + "22" }]}>
              <Text style={[styles.forecastSevText, { color: SEVERITY_DEFS[forecast.expectedSeverity].color }]}>
                {SEVERITY_DEFS[forecast.expectedSeverity].label.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.forecastRow}>
            <MaterialCommunityIcons name={forecast.icon as McIconName} size={20} color={CONFIDENCE_DEFS[forecast.confidence].color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.forecastPhenomenon, { color: CONFIDENCE_DEFS[forecast.confidence].color }]}>{forecast.phenomenon}</Text>
              <Text style={styles.forecastMeta}>
                {forecast.probability} % de probabilité · Confiance{" "}
                <Text style={{ color: CONFIDENCE_DEFS[forecast.confidence].color }}>{CONFIDENCE_DEFS[forecast.confidence].label}</Text>
              </Text>
            </View>
          </View>
          <Text style={styles.forecastHint}>{CONFIDENCE_DEFS[forecast.confidence].description}</Text>
          {(() => {
            const trust = state.weatherAlertTrust ?? WEATHER_ALERT_TRUST_INITIAL;
            const level = getTrustLevel(trust);
            const def   = TRUST_LEVEL_DEFS[level];
            return (
              <View style={styles.trustRow}>
                <Text style={styles.trustLabel}>CONFIANCE ALERTES</Text>
                <View style={styles.trustTrack}>
                  <View style={[styles.trustFill, { width: `${trust}%` as `${number}%`, backgroundColor: def.color }]} />
                </View>
                <View style={[styles.trustBadge, { backgroundColor: def.color + "22" }]}>
                  <Text style={[styles.trustBadgeText, { color: def.color }]}>{def.label.toUpperCase()}</Text>
                </View>
              </View>
            );
          })()}
          {transportDisruption && (
            <View style={styles.transportRow}>
              <MaterialCommunityIcons name={transportDisruption.icon as McIconName} size={13} color={transportDisruption.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.transportLabel, { color: transportDisruption.color }]} numberOfLines={1}>{transportDisruption.label}</Text>
                <Text style={styles.transportEffects}>
                  {[
                    transportDisruption.moneyDelta !== 0    && `${transportDisruption.moneyDelta > 0 ? "+" : ""}${transportDisruption.moneyDelta} M€`,
                    transportDisruption.militaryDelta !== 0 && `${transportDisruption.militaryDelta > 0 ? "+" : ""}${transportDisruption.militaryDelta} Mil.`,
                    transportDisruption.economyDelta !== 0  && `Éco ${transportDisruption.economyDelta > 0 ? "+" : ""}${transportDisruption.economyDelta}`,
                  ].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.forecastSystemsRow}>
            {forecast.affectedSystems.map((s) => (
              <View key={s} style={styles.forecastChip}>
                <Text style={styles.forecastChipText}>{s}</Text>
              </View>
            ))}
          </View>
          <View style={styles.forecastActions}>
            {(() => {
              const canPrep = canPrepareForecast(state);
              return (
                <Pressable
                  style={({ pressed }) => [styles.forecastBtn, !canPrep.ok && styles.forecastBtnDim, { opacity: pressed ? 0.75 : 1 }]}
                  disabled={!canPrep.ok}
                  onPress={() => {
                    const r = prepareForecast();
                    if (r.outcome) Alert.alert(r.wasRealEvent ? "Anticipation réussie" : "Fausse alerte", r.outcome, [{ text: "OK" }]);
                  }}
                >
                  <MaterialCommunityIcons name="shield-check-outline" size={11} color={canPrep.ok ? "#3fbe7a" : PALETTE.textLow} />
                  <Text style={[styles.forecastBtnText, { color: canPrep.ok ? "#3fbe7a" : PALETTE.textLow }]}>
                    {canPrep.ok ? `Préparer — ${PREPARE_COST_MONEY} M€` : "Préparé ce cycle"}
                  </Text>
                </Pressable>
              );
            })()}
            {(() => {
              const canAlert = canIssueAlert(state);
              return (
                <Pressable
                  style={({ pressed }) => [styles.forecastBtn, !canAlert.ok && styles.forecastBtnDim, { opacity: pressed ? 0.75 : 1 }]}
                  disabled={!canAlert.ok}
                  onPress={() => {
                    const r = issuePublicAlert();
                    if (r.outcome) Alert.alert(r.wasRealEvent ? "Alerte confirmée" : "Fausse alerte publique", r.outcome, [{ text: "OK" }]);
                  }}
                >
                  <MaterialCommunityIcons name="bullhorn-outline" size={11} color={canAlert.ok ? "#4a9fff" : PALETTE.textLow} />
                  <Text style={[styles.forecastBtnText, { color: canAlert.ok ? "#4a9fff" : PALETTE.textLow }]}>
                    {canAlert.ok ? `Émettre alerte — ${ALERT_COST_INFLUENCE} INF` : "Alerte émise ce cycle"}
                  </Text>
                </Pressable>
              );
            })()}
          </View>
        </View>
      )}

      {/* ── Météo agricole ────────────────────────────────────────────── */}
      {agroSnapshot && (
        <View style={[styles.agroBlock, { marginHorizontal: hPad }]}>
          <View style={styles.agroHeader}>
            <MaterialCommunityIcons name="sprout" size={12} color={PALETTE.textLow} />
            <Text style={styles.agroTitle}>MÉTÉO AGRICOLE</Text>
            <View style={[styles.agroHarvestBadge, {
              backgroundColor:
                agroSnapshot.harvestForecast === "bonne"    ? "#3fbe7a22" :
                agroSnapshot.harvestForecast === "mauvaise" ? "#e5484822" : "#e8a93a22",
            }]}>
              <Text style={[styles.agroHarvestText, {
                color:
                  agroSnapshot.harvestForecast === "bonne"    ? PALETTE.success :
                  agroSnapshot.harvestForecast === "mauvaise" ? PALETTE.danger   : PALETTE.warning,
              }]}>
                {agroSnapshot.harvestForecast.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.agroPhenRow}>
            <MaterialCommunityIcons name={agroSnapshot.phenomenon.icon as McIconName} size={18} color={agroSnapshot.phenomenon.color} />
            <Text style={[styles.agroPhenLabel, { color: agroSnapshot.phenomenon.color }]}>{agroSnapshot.phenomenon.label}</Text>
          </View>
          <View style={styles.agroIndicators}>
            <AgroBar label="Humidité sol" value={agroSnapshot.soilMoisture}
              color={agroSnapshot.soilMoisture < 25 ? PALETTE.danger : agroSnapshot.soilMoisture < 50 ? PALETTE.warning : "#4a9fff"} />
            <AgroBar label="Stress cultures" value={agroSnapshot.cropStress}
              color={agroSnapshot.cropStress > 65 ? PALETTE.danger : agroSnapshot.cropStress > 40 ? PALETTE.warning : PALETTE.success} />
          </View>
        </View>
      )}

      {/* ── Fenêtre météo favorable ───────────────────────────────────── */}
      <View style={[styles.opportunityBlock, { marginHorizontal: hPad }]}>
        <View style={styles.opportunityHeader}>
          <MaterialCommunityIcons name="weather-partly-cloudy" size={12} color={PALETTE.textLow} />
          <Text style={styles.opportunityTitle}>FENÊTRE MÉTÉO FAVORABLE</Text>
        </View>
        {opportunitySnapshot ? (
          <>
            <View style={styles.opportunityRow}>
              <MaterialCommunityIcons name={opportunitySnapshot.def.icon as McIconName} size={20} color={opportunitySnapshot.def.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.opportunityLabel, { color: opportunitySnapshot.def.color }]}>{opportunitySnapshot.def.label}</Text>
                <Text style={styles.opportunityDesc} numberOfLines={2}>{opportunitySnapshot.def.description}</Text>
              </View>
            </View>
            <View style={styles.opportunityBonusRow}>
              <MaterialCommunityIcons name="trending-up" size={11} color={PALETTE.success} />
              <Text style={styles.opportunityBonusText}>{opportunitySnapshot.def.bonusLabel}</Text>
            </View>
            <View style={styles.opportunityFooter}>
              <View style={styles.opportunityProgressTrack}>
                <View style={[styles.opportunityProgressFill, {
                  width: `${Math.round(opportunitySnapshot.progress * 100)}%` as `${number}%`,
                  backgroundColor: opportunitySnapshot.def.color,
                }]} />
              </View>
              <Text style={styles.opportunityDaysLeft}>{opportunitySnapshot.daysLeft}j</Text>
            </View>
          </>
        ) : (
          <View style={styles.opportunityEmpty}>
            <MaterialCommunityIcons name="cloud-outline" size={15} color={PALETTE.textLow} />
            <Text style={styles.opportunityEmptyText}>Aucune fenêtre favorable active</Text>
          </View>
        )}
      </View>

      {/* ── Doctrine météo ────────────────────────────────────────────── */}
      <View style={[styles.doctrineBlock, { marginHorizontal: hPad }]}>
        <View style={styles.doctrineHeader}>
          <MaterialCommunityIcons name="shield-star-outline" size={12} color={PALETTE.textLow} />
          <Text style={styles.doctrineTitle}>DOCTRINE MÉTÉO</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doctrineScroll} nestedScrollEnabled>
          {WEATHER_DOCTRINES_LIST.map((doc) => {
            const active = (state.weatherDoctrine ?? WEATHER_DOCTRINE_DEFAULT) === doc.id;
            return (
              <Pressable
                key={doc.id}
                onPress={() => setWeatherDoctrine(doc.id)}
                style={({ pressed }) => [
                  styles.doctrineChip,
                  { borderColor: active ? doc.color : PALETTE.panelEdge, backgroundColor: active ? doc.color + "22" : PALETTE.panelHi, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialCommunityIcons name={doc.icon as McIconName} size={13} color={active ? doc.color : PALETTE.textLow} />
                <Text style={[styles.doctrineChipLabel, { color: active ? doc.color : PALETTE.textMid }]}>{doc.shortLabel}</Text>
                {active && <View style={[styles.doctrineActiveDot, { backgroundColor: doc.color }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
        {(() => {
          const activeDoc = WEATHER_DOCTRINES_LIST.find((d) => d.id === (state.weatherDoctrine ?? WEATHER_DOCTRINE_DEFAULT));
          if (!activeDoc) return null;
          return (
            <View style={styles.doctrineTradeoffs}>
              <View style={styles.doctrineTradeoffItem}>
                <MaterialCommunityIcons name="plus-circle-outline" size={10} color={PALETTE.success} />
                <Text style={[styles.doctrineTradeoffText, { color: PALETTE.success }]}>{activeDoc.tradeoffPos}</Text>
              </View>
              <View style={styles.doctrineTradeoffItem}>
                <MaterialCommunityIcons name="minus-circle-outline" size={10} color={PALETTE.danger} />
                <Text style={[styles.doctrineTradeoffText, { color: PALETTE.danger }]}>{activeDoc.tradeoffNeg}</Text>
              </View>
            </View>
          );
        })()}
      </View>
    </>
  );
}

const agroBarStyles = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, width: 90 },
  track: { flex: 1, height: 5, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden" },
  fill:  { height: "100%", borderRadius: 3 },
  pct:   { fontFamily: FONT.bold, fontSize: 10, width: 36, textAlign: "right" },
});

const styles = StyleSheet.create({
  forecastBlock: { backgroundColor: PALETTE.panel, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.panelEdge, padding: 12, gap: 8, marginTop: 8 },
  forecastHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  forecastTitle: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.textLow, flex: 1 },
  forecastSevBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.pill },
  forecastSevText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 0.5 },
  forecastRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  forecastPhenomenon: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  forecastMeta: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 },
  forecastHint: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },
  forecastSystemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  forecastChip: { paddingHorizontal: 7, paddingVertical: 3, backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: PALETTE.panelEdge },
  forecastChipText: { fontSize: 8, fontFamily: FONT.semi, color: PALETTE.textMid },
  forecastActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  forecastBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.panelEdge },
  forecastBtnDim: { opacity: 0.5 },
  forecastBtnText: { fontSize: 10, fontFamily: FONT.semi },

  agroBlock: { marginTop: 8, marginBottom: 4, backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.panelEdge, padding: 12, gap: 8 },
  agroHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  agroTitle: { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.8 },
  agroHarvestBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  agroHarvestText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.8 },
  agroPhenRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  agroPhenLabel: { fontSize: 12, fontFamily: FONT.semi },
  agroIndicators: { gap: 5 },

  opportunityBlock: { marginTop: 8, marginBottom: 4, backgroundColor: PALETTE.panel, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.panelEdge, padding: 12, gap: 8 },
  opportunityHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  opportunityTitle: { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.8 },
  opportunityRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  opportunityLabel: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  opportunityDesc: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2, lineHeight: 14 },
  opportunityBonusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  opportunityBonusText: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.success },
  opportunityFooter: { flexDirection: "row", alignItems: "center", gap: 8 },
  opportunityProgressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  opportunityProgressFill: { height: "100%", borderRadius: 2 },
  opportunityDaysLeft: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textLow, width: 22, textAlign: "right" },
  opportunityEmpty: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 2 },
  opportunityEmptyText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },

  transportRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },
  transportLabel: { fontSize: 10, fontFamily: FONT.semi, lineHeight: 14 },
  transportEffects: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 },

  trustRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  trustLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.5, width: 80 },
  trustTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  trustFill: { height: "100%", borderRadius: 2 },
  trustBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.pill },
  trustBadgeText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 0.5 },

  doctrineBlock: { marginTop: 8, marginBottom: 4, backgroundColor: PALETTE.panel, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.panelEdge, padding: 12, gap: 8 },
  doctrineHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  doctrineTitle: { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.8 },
  doctrineScroll: { gap: 6, paddingBottom: 2 },
  doctrineChip: { flexDirection: "column", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.sm, borderWidth: 1, minWidth: 66 },
  doctrineChipLabel: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.5, textAlign: "center" },
  doctrineActiveDot: { width: 4, height: 4, borderRadius: 2 },
  doctrineTradeoffs: { flexDirection: "row", gap: 14, paddingHorizontal: 2 },
  doctrineTradeoffItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  doctrineTradeoffText: { fontSize: 9, fontFamily: FONT.semi },
});
