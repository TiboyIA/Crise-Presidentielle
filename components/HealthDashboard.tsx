import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { computeBreakpoints } from "@/logic/breakpointEngine";
import { getMedicalBandInfo, DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { getHospitalCodingBandInfo, DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { getHealthReportingBandInfo, DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";
import { getHospitalPressureBandInfo, DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";
import { getHealthDataTrustBandInfo, DEFAULT_HEALTH_DATA_TRUST } from "@/logic/healthDataTrustEngine";
import { canLaunchDimAudit, DIM_AUDIT_COST_MONEY, DIM_AUDIT_COST_INFLUENCE } from "@/logic/dimAuditEngine";
import { DEFAULT_UNDER_DETECTION_PRESSURE } from "@/logic/healthUnderDetectionEngine";
import {
  SURVEILLANCE_LEVELS, SURVEILLANCE_ORDER, DEFAULT_SURVEILLANCE_LEVEL, canSetSurveillanceLevel,
} from "@/logic/healthSurveillanceEngine";
import { DEFAULT_STATISTICS_SCANDAL_PRESSURE } from "@/logic/healthStatisticsScandalEngine";
import { getInteroperabilityBandInfo, DEFAULT_HEALTH_INTEROPERABILITY } from "@/logic/healthInteroperabilityEngine";
import { generateHealthSnapshot } from "@/logic/anonymizedHealthRecordsEngine";
import { getSolarStormInfo } from "@/logic/solarStormEngine";

/**
 * Tableau de bord sanitaire autonome — extrait du Journal de Crise vers la
 * Cellule Santé Publique dédiée. Re-dérive tous ses indicateurs depuis le
 * contexte stratégique ; conserve les actions de jeu (audit DIM, niveau de
 * veille). Aucune modification de la logique.
 */
export function HealthDashboard() {
  const { state, launchDimAudit, setHealthSurveillanceLevel } = useStrategy();
  const { hPad } = useResponsive();
  const [dimExpanded, setDimExpanded] = useState(false);

  const healthSnapshot = useMemo(
    () => (state ? generateHealthSnapshot(state) : null),
    [state?.mandateDay, state?.hospitalPressure, state?.medicalDataQuality, state?.hospitalCodingQuality, state?.healthReportingDelay, state?.underDetectionPressure],
  );

  if (!state || !healthSnapshot) return null;

  const hospPressure      = state.hospitalPressure ?? DEFAULT_HOSPITAL_PRESSURE;
  const hospPressureInfo  = getHospitalPressureBandInfo(hospPressure);
  const medicalQuality    = state.medicalDataQuality ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const medicalInfo       = getMedicalBandInfo(medicalQuality);
  const codingQuality     = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  const codingInfo        = getHospitalCodingBandInfo(codingQuality);
  const reportingDelay    = state.healthReportingDelay ?? DEFAULT_HEALTH_REPORTING_DELAY;
  const reportingInfo     = getHealthReportingBandInfo(reportingDelay);
  const healthTrust       = state.healthDataTrust ?? DEFAULT_HEALTH_DATA_TRUST;
  const healthTrustInfo   = getHealthDataTrustBandInfo(healthTrust);
  const underDetection    = state.underDetectionPressure ?? DEFAULT_UNDER_DETECTION_PRESSURE;
  const scandalPressure   = state.statisticsScandalPressure ?? DEFAULT_STATISTICS_SCANDAL_PRESSURE;
  const interopValue      = state.healthInteroperability ?? DEFAULT_HEALTH_INTEROPERABILITY;
  const interopInfo       = getInteroperabilityBandInfo(interopValue);
  const rupturedSystems   = computeBreakpoints(state).filter((b) => b.status === "rupture");

  return (
    <>
      {/* ── Pression hospitalière ────────────────────────────────────── */}
      <View style={[styles.waveBlock, { marginHorizontal: hPad, marginTop: 8, borderColor: hospPressureInfo.color + "33" }]}>
        <View style={styles.waveHeader}>
          <MaterialCommunityIcons name="hospital-building" size={12} color={hospPressureInfo.color} />
          <Text style={[styles.waveTitle, { color: hospPressureInfo.color }]}>PRESSION HOSPITALIÈRE</Text>
          <View style={[styles.waveBadge, { backgroundColor: hospPressureInfo.color + "22" }]}>
            <Text style={[styles.waveBadgeText, { color: hospPressureInfo.color }]}>{hospPressureInfo.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.waveBadgeText, { color: hospPressureInfo.color, marginLeft: 4 }]}>{Math.round(hospPressure)}</Text>
        </View>
        <View style={hospStyles.bar}>
          <View style={[hospStyles.fill, { width: `${hospPressure}%` as `${number}%`, backgroundColor: hospPressureInfo.color }]} />
          {([31, 61, 81] as const).map((t) => (
            <View key={t} style={[hospStyles.tick, { left: `${t}%` as `${number}%` }]} />
          ))}
        </View>
        <Text style={styles.stormDesc}>{hospPressureInfo.message}</Text>
      </View>

      {/* ── Cellule de Veille Sanitaire ──────────────────────────────── */}
      {(() => {
        const currentLevel = state.healthSurveillanceLevel ?? DEFAULT_SURVEILLANCE_LEVEL;
        const currentDef   = SURVEILLANCE_LEVELS[currentLevel];
        return (
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: currentDef.color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="radar" size={12} color={currentDef.color} />
              <Text style={[styles.waveTitle, { color: currentDef.color }]}>VEILLE SANITAIRE</Text>
              <View style={[styles.waveBadge, { backgroundColor: currentDef.color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: currentDef.color }]}>{currentDef.label.toUpperCase()}</Text>
              </View>
              {currentDef.dailyCostMoney > 0 && (
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow, marginLeft: 4 }]}>{`−${currentDef.dailyCostMoney} M€/j`}</Text>
              )}
            </View>
            <Text style={[styles.stormDesc, { marginBottom: 8 }]}>{currentDef.description}</Text>
            <View style={survStyles.grid}>
              {SURVEILLANCE_ORDER.map((levelId) => {
                const def      = SURVEILLANCE_LEVELS[levelId];
                const isActive = levelId === currentLevel;
                const check    = isActive ? { ok: false } : canSetSurveillanceLevel(state, levelId);
                return (
                  <Pressable
                    key={levelId}
                    disabled={isActive}
                    style={({ pressed }) => [
                      survStyles.btn,
                      isActive && { borderColor: def.color, backgroundColor: def.color + "22" },
                      !isActive && !check.ok && survStyles.btnDim,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                    onPress={() => {
                      const r = setHealthSurveillanceLevel(levelId);
                      if (!r.success) Alert.alert("Indisponible", r.reason ?? "Conditions non remplies.", [{ text: "OK" }]);
                    }}
                  >
                    <Text style={[survStyles.btnLabel, { color: isActive ? def.color : check.ok ? PALETTE.textHigh : PALETTE.textLow }]}>{def.label}</Text>
                    {def.dailyCostMoney > 0 && (
                      <Text style={[survStyles.btnCost, { color: isActive ? def.color : PALETTE.textLow }]}>{`${def.dailyCostMoney} M€/j`}</Text>
                    )}
                    {!isActive && def.upgradeCostMoney > 0 && check.ok && (
                      <Text style={survStyles.btnUpgrade}>{`${def.upgradeCostMoney} M€ · ${def.upgradeCostInfluence} INF`}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* ── Cellule DIM Nationale ─────────────────────────────────────── */}
      <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: medicalInfo.color + "33" }]}>
        <View style={styles.waveHeader}>
          <MaterialCommunityIcons name="hospital-box-outline" size={12} color={medicalInfo.color} />
          <Text style={[styles.waveTitle, { color: medicalInfo.color }]}>CELLULE DIM NATIONALE</Text>
          <View style={[styles.waveBadge, { backgroundColor: medicalInfo.color + "22" }]}>
            <Text style={[styles.waveBadgeText, { color: medicalInfo.color }]}>{medicalInfo.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.waveBadgeText, { color: medicalInfo.color, marginLeft: 4 }]}>{Math.round(medicalQuality)}</Text>
        </View>
        <Text style={styles.stormDesc}>{medicalInfo.message}</Text>
      </View>

      {/* ── Interopérabilité des systèmes de santé ───────────────────── */}
      <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: interopInfo.color + "33" }]}>
        <View style={styles.waveHeader}>
          <MaterialCommunityIcons name="lan-connect" size={12} color={interopInfo.color} />
          <Text style={[styles.waveTitle, { color: interopInfo.color }]}>INTEROPÉRABILITÉ SYS. SANTÉ</Text>
          <View style={[styles.waveBadge, { backgroundColor: interopInfo.color + "22" }]}>
            <Text style={[styles.waveBadgeText, { color: interopInfo.color }]}>{interopInfo.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.waveBadgeText, { color: interopInfo.color, marginLeft: 4 }]}>{Math.round(interopValue)}</Text>
        </View>
        <View style={hospStyles.bar}>
          <View style={[hospStyles.fill, { width: `${interopValue}%` as `${number}%`, backgroundColor: interopInfo.color }]} />
          {([20, 40, 60, 80] as const).map((t) => (
            <View key={t} style={[hospStyles.tick, { left: `${t}%` as `${number}%` }]} />
          ))}
        </View>
        <Text style={styles.stormDesc}>{interopInfo.message}</Text>
      </View>

      {/* ── Action : Audit DIM National ──────────────────────────────── */}
      {(() => {
        const auditCheck = canLaunchDimAudit(state);
        const canAudit   = auditCheck.ok;
        return (
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#4a9fff33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="magnify-scan" size={12} color="#4a9fff" />
              <Text style={[styles.waveTitle, { color: "#4a9fff" }]}>AUDIT DIM NATIONAL</Text>
            </View>
            <Text style={[styles.stormDesc, { marginBottom: 8 }]}>
              Commandite un audit indépendant des données hospitalières. Améliore la qualité du codage et des données sanitaires, mais peut révéler des anomalies à risque politique.
            </Text>
            <Pressable
              style={({ pressed }) => [forecastStyles.btn, !canAudit && forecastStyles.btnDim, { opacity: pressed ? 0.75 : 1, alignSelf: "flex-start" }]}
              disabled={!canAudit}
              onPress={() => {
                if (!canAudit) {
                  Alert.alert("Audit indisponible", auditCheck.reason ?? "Conditions non remplies.", [{ text: "OK" }]);
                  return;
                }
                Alert.alert(
                  "Lancer l'audit DIM ?",
                  `Coût : ${DIM_AUDIT_COST_MONEY} M€ · ${DIM_AUDIT_COST_INFLUENCE} Influence\n\nLe résultat est incertain et dépend de l'état du système de santé.`,
                  [
                    { text: "Annuler", style: "cancel" },
                    {
                      text: "Lancer l'audit",
                      onPress: () => {
                        const r = launchDimAudit();
                        if (r.failReason) Alert.alert("Audit impossible", r.failReason, [{ text: "OK" }]);
                        else if (r.result) Alert.alert(r.result.def.label, r.result.def.description, [{ text: "OK" }]);
                      },
                    },
                  ],
                );
              }}
            >
              <MaterialCommunityIcons name="magnify-scan" size={11} color={canAudit ? "#4a9fff" : PALETTE.textLow} />
              <Text style={[forecastStyles.btnText, { color: canAudit ? "#4a9fff" : PALETTE.textLow }]}>
                {canAudit ? `Lancer l'audit — ${DIM_AUDIT_COST_MONEY} M€ · ${DIM_AUDIT_COST_INFLUENCE} INF` : (auditCheck.reason ?? "Indisponible")}
              </Text>
            </Pressable>
          </View>
        );
      })()}

      {/* ── Rapports DIM anonymisés (agrégats fictifs) ───────────────── */}
      <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#4a9fff22" }]}>
        <Pressable style={styles.waveHeader} onPress={() => setDimExpanded((v) => !v)}>
          <MaterialCommunityIcons name="file-chart-outline" size={12} color="#4a9fff" />
          <Text style={[styles.waveTitle, { color: "#4a9fff" }]}>RAPPORTS DIM — AGRÉGATS FICTIFS</Text>
          <View style={[styles.waveBadge, { backgroundColor: "#4a9fff22" }]}>
            <Text style={[styles.waveBadgeText, { color: "#4a9fff" }]}>SEM.{Math.ceil(state.mandateDay / 7) + 1}</Text>
          </View>
          <MaterialCommunityIcons name={dimExpanded ? "chevron-up" : "chevron-down"} size={12} color="#4a9fff" style={{ marginLeft: "auto" }} />
        </Pressable>

        <View style={{ gap: 4, marginTop: 6 }}>
          <View style={dimStyles.row}>
            <MaterialCommunityIcons name="alert-circle-outline" size={10} color={PALETTE.textLow} />
            <Text style={dimStyles.label}>Passages urgences (fictif)</Text>
            <Text style={[dimStyles.value, { color: healthSnapshot.urgencyTrend === "hausse" ? PALETTE.danger : healthSnapshot.urgencyTrend === "baisse" ? PALETTE.success : PALETTE.textHigh }]}>
              {healthSnapshot.urgencyPassages.toLocaleString("fr-FR")}
              {healthSnapshot.urgencyTrend === "hausse" ? " ↑" : healthSnapshot.urgencyTrend === "baisse" ? " ↓" : " →"}
            </Text>
          </View>
          <View style={dimStyles.row}>
            <MaterialCommunityIcons name="clock-outline" size={10} color={PALETTE.textLow} />
            <Text style={dimStyles.label}>Délai médian attente (fictif)</Text>
            <Text style={[dimStyles.value, { color: healthSnapshot.averageWaitMinutes >= 200 ? PALETTE.danger : healthSnapshot.averageWaitMinutes >= 120 ? PALETTE.warning : PALETTE.textHigh }]}>
              {healthSnapshot.averageWaitMinutes >= 60
                ? `${Math.floor(healthSnapshot.averageWaitMinutes / 60)}h${String(healthSnapshot.averageWaitMinutes % 60).padStart(2, "0")}`
                : `${healthSnapshot.averageWaitMinutes} min`}
            </Text>
          </View>
          <View style={dimStyles.row}>
            <MaterialCommunityIcons name="bed-outline" size={10} color={PALETTE.textLow} />
            <Text style={dimStyles.label}>Occupation lits (fictif)</Text>
            <Text style={[dimStyles.value, { color: healthSnapshot.bedOccupancyRate >= 95 ? PALETTE.danger : healthSnapshot.bedOccupancyRate >= 88 ? PALETTE.warning : PALETTE.textHigh }]}>
              {healthSnapshot.bedOccupancyRate} %
            </Text>
          </View>
          <View style={dimStyles.row}>
            <MaterialCommunityIcons name="alert-outline" size={10} color={PALETTE.textLow} />
            <Text style={dimStyles.label}>Anomalies codage (fictif)</Text>
            <Text style={[dimStyles.value, { color: healthSnapshot.codingAnomalyRate >= 1.5 ? PALETTE.danger : healthSnapshot.codingAnomalyRate >= 0.8 ? PALETTE.warning : PALETTE.textHigh }]}>
              {healthSnapshot.codingAnomalies.toLocaleString("fr-FR")} ({healthSnapshot.codingAnomalyRate.toFixed(2)} %)
            </Text>
          </View>
        </View>

        {healthSnapshot.weakSignals.length > 0 && (
          <View style={{ marginTop: 8, gap: 3 }}>
            {healthSnapshot.weakSignals.map((sig) => (
              <View key={sig.code} style={dimStyles.signalRow}>
                <Text style={[dimStyles.signalCode, { color: sig.color }]}>{sig.code}</Text>
                <Text style={[dimStyles.signalLabel, { color: sig.color }]}>{sig.label}</Text>
              </View>
            ))}
          </View>
        )}

        {dimExpanded && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {healthSnapshot.reportSamples.map((rep) => (
              <View key={rep.id} style={[dimStyles.report, { borderLeftColor: rep.color }]}>
                <View style={dimStyles.reportHeader}>
                  <Text style={[dimStyles.reportTitle, { color: rep.color }]}>{rep.title.toUpperCase()}</Text>
                  <View style={[dimStyles.reportBadge, { backgroundColor: rep.color + "22" }]}>
                    <Text style={[dimStyles.reportBadgeText, { color: rep.color }]}>{rep.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={dimStyles.reportPeriod}>{rep.period}</Text>
                <Text style={dimStyles.reportSummary}>{rep.summary}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Codage hospitalier ────────────────────────────────────────── */}
      <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: codingInfo.color + "33" }]}>
        <View style={styles.waveHeader}>
          <MaterialCommunityIcons name="clipboard-pulse-outline" size={12} color={codingInfo.color} />
          <Text style={[styles.waveTitle, { color: codingInfo.color }]}>CODAGE HOSPITALIER</Text>
          <View style={[styles.waveBadge, { backgroundColor: codingInfo.color + "22" }]}>
            <Text style={[styles.waveBadgeText, { color: codingInfo.color }]}>{codingInfo.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.waveBadgeText, { color: codingInfo.color, marginLeft: 4 }]}>{Math.round(codingQuality)}</Text>
        </View>
        <Text style={styles.stormDesc}>{codingInfo.message}</Text>
      </View>

      {/* ── Retard remontée données santé ────────────────────────────── */}
      <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: reportingInfo.color + "33" }]}>
        <View style={styles.waveHeader}>
          <MaterialCommunityIcons name="database-clock-outline" size={12} color={reportingInfo.color} />
          <Text style={[styles.waveTitle, { color: reportingInfo.color }]}>DONNÉES SANTÉ</Text>
          <View style={[styles.waveBadge, { backgroundColor: reportingInfo.color + "22" }]}>
            <Text style={[styles.waveBadgeText, { color: reportingInfo.color }]}>{reportingInfo.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.waveBadgeText, { color: reportingInfo.color, marginLeft: 4 }]}>{`−${Math.round(reportingDelay)} actions`}</Text>
        </View>
        <Text style={styles.stormDesc}>{reportingInfo.message}</Text>
      </View>

      {/* ── Confiance dans les chiffres de santé ─────────────────────── */}
      <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: healthTrustInfo.color + "33" }]}>
        <View style={styles.waveHeader}>
          <MaterialCommunityIcons name="shield-check-outline" size={12} color={healthTrustInfo.color} />
          <Text style={[styles.waveTitle, { color: healthTrustInfo.color }]}>CONFIANCE DONNÉES SANTÉ</Text>
          <View style={[styles.waveBadge, { backgroundColor: healthTrustInfo.color + "22" }]}>
            <Text style={[styles.waveBadgeText, { color: healthTrustInfo.color }]}>{healthTrustInfo.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.waveBadgeText, { color: healthTrustInfo.color, marginLeft: 4 }]}>{Math.round(healthTrust)}</Text>
        </View>
        <View style={hospStyles.bar}>
          <View style={[hospStyles.fill, { width: `${healthTrust}%` as `${number}%`, backgroundColor: healthTrustInfo.color }]} />
          {([20, 40, 60, 80] as const).map((t) => (
            <View key={t} style={[hospStyles.tick, { left: `${t}%` as `${number}%` }]} />
          ))}
        </View>
        <Text style={styles.stormDesc}>{healthTrustInfo.message}</Text>
      </View>

      {/* ── Tempête solaire active ────────────────────────────────────── */}
      {state.solarStorm && (() => {
        const storm = getSolarStormInfo(state.solarStorm.level);
        return (
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: storm.color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="weather-sunny-alert" size={12} color={storm.color} />
              <Text style={[styles.waveTitle, { color: storm.color }]}>TEMPÊTE SOLAIRE ACTIVE</Text>
              <View style={[styles.waveBadge, { backgroundColor: storm.color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: storm.color }]}>{storm.level.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.stormDesc}>{storm.description}</Text>
          </View>
        );
      })()}

      {/* ── Sous-détection sanitaire cachée ──────────────────────────── */}
      {underDetection >= 35 && (() => {
        const color = underDetection >= 85 ? "#e54848" : underDetection >= 60 ? "#e8864f" : "#e8c44f";
        const label = underDetection >= 85 ? "CRITIQUE" : underDetection >= 60 ? "ALERTE" : "SIGNAL FAIBLE";
        const msg = underDetection >= 85
          ? "Des données sanitaires incohérentes masquent probablement une crise plus grave. Un événement critique est imminent si aucune correction n'est apportée."
          : underDetection >= 60
          ? "Des anomalies statistiques persistantes suggèrent une sous-déclaration significative. Le système d'information sanitaire nécessite une investigation urgente."
          : "Un signal anormal a été détecté dans les données hospitalières. La situation reste sous contrôle mais mérite attention.";
        return (
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="eye-off-outline" size={12} color={color} />
              <Text style={[styles.waveTitle, { color }]}>SOUS-DÉTECTION SANITAIRE</Text>
              <View style={[styles.waveBadge, { backgroundColor: color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color }]}>{label}</Text>
              </View>
              <Text style={[styles.waveBadgeText, { color, marginLeft: 4 }]}>{Math.round(underDetection)}</Text>
            </View>
            <View style={hospStyles.bar}>
              <View style={[hospStyles.fill, { width: `${underDetection}%` as `${number}%`, backgroundColor: color }]} />
              {([35, 60, 85] as const).map((t) => (
                <View key={t} style={[hospStyles.tick, { left: `${t}%` as `${number}%` }]} />
              ))}
            </View>
            <Text style={styles.stormDesc}>{msg}</Text>
          </View>
        );
      })()}

      {/* ── Scandale des chiffres de santé ───────────────────────────── */}
      {scandalPressure >= 35 && (() => {
        const color = scandalPressure >= 85 ? "#e54848" : scandalPressure >= 65 ? "#e8864f" : "#e8c44f";
        const label = scandalPressure >= 85 ? "SCANDALE" : scandalPressure >= 65 ? "CONTROVERSE" : "INCOHÉRENCES";
        const msg = scandalPressure >= 85
          ? "Un scandale statistique majeur est en cours. La crédibilité des données officielles de santé est ouvertement contestée. Le gouvernement est en position de crise."
          : scandalPressure >= 65
          ? "La controverse sur les données sanitaires est entrée dans l'arène publique. L'opposition et la presse amplifient les incohérences signalées."
          : "Des experts indépendants ont signalé des incohérences dans les données sanitaires officielles. La pression monte dans les milieux spécialisés.";
        return (
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="chart-line-variant" size={12} color={color} />
              <Text style={[styles.waveTitle, { color }]}>SCANDALE STATISTIQUE</Text>
              <View style={[styles.waveBadge, { backgroundColor: color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color }]}>{label}</Text>
              </View>
              <Text style={[styles.waveBadgeText, { color, marginLeft: 4 }]}>{Math.round(scandalPressure)}</Text>
            </View>
            <View style={hospStyles.bar}>
              <View style={[hospStyles.fill, { width: `${scandalPressure}%` as `${number}%`, backgroundColor: color }]} />
              {([35, 65, 85] as const).map((t) => (
                <View key={t} style={[hospStyles.tick, { left: `${t}%` as `${number}%` }]} />
              ))}
            </View>
            <Text style={styles.stormDesc}>{msg}</Text>
          </View>
        );
      })()}

      {/* ── Ruptures systémiques ──────────────────────────────────────── */}
      {rupturedSystems.length > 0 && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#e5484833" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="alert-octagon" size={12} color="#e54848" />
            <Text style={[styles.waveTitle, { color: "#e54848" }]}>RUPTURES SYSTÉMIQUES</Text>
            <View style={[styles.waveBadge, { backgroundColor: "#e5484822" }]}>
              <Text style={[styles.waveBadgeText, { color: "#e54848" }]}>{rupturedSystems.length}</Text>
            </View>
          </View>
          {rupturedSystems.map((bp) => (
            <Text key={bp.id} style={styles.stormDesc}>
              {"▲ "}{bp.label} — stress {Math.round(bp.stress)} / seuil {Math.round(bp.threshold)}
            </Text>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  waveBlock:     { marginBottom: 8, backgroundColor: PALETTE.panel, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#e8864f33", padding: 12, gap: 4 },
  waveHeader:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  waveTitle:     { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: "#e8864f", letterSpacing: 1.2 },
  waveBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.pill },
  waveBadgeText: { fontSize: 8, fontFamily: FONT.bold, color: "#e8864f" },
  stormDesc:     { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 },
});

const hospStyles = StyleSheet.create({
  bar:  { height: 6, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden", marginTop: 6, marginBottom: 4, position: "relative" },
  fill: { position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 3 },
  tick: { position: "absolute", top: 0, width: 1, height: "100%", backgroundColor: PALETTE.panelEdge + "cc" },
});

const survStyles = StyleSheet.create({
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  btn:       { flex: 1, minWidth: "44%", borderWidth: 1, borderColor: PALETTE.panelEdge, borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 8, gap: 2 },
  btnDim:    { opacity: 0.5 },
  btnLabel:  { fontFamily: FONT.bold, fontSize: 11 },
  btnCost:   { fontFamily: FONT.reg, fontSize: 9 },
  btnUpgrade:{ fontFamily: FONT.reg, fontSize: 8, color: PALETTE.textLow },
});

const dimStyles = StyleSheet.create({
  row:         { flexDirection: "row", alignItems: "center", gap: 6 },
  label:       { fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, flex: 1 },
  value:       { fontFamily: FONT.bold, fontSize: 10 },
  signalRow:   { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  signalCode:  { fontFamily: FONT.bold, fontSize: 9, width: 30 },
  signalLabel: { fontFamily: FONT.reg, fontSize: 9, flex: 1 },
  report:      { borderLeftWidth: 2, paddingLeft: 8, gap: 3 },
  reportHeader:{ flexDirection: "row", alignItems: "center", gap: 6 },
  reportTitle: { fontFamily: FONT.bold, fontSize: 9, flex: 1 },
  reportBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  reportBadgeText: { fontFamily: FONT.bold, fontSize: 8 },
  reportPeriod:{ fontFamily: FONT.reg, fontSize: 8, color: PALETTE.textLow },
  reportSummary: { fontFamily: FONT.reg, fontSize: 9, color: PALETTE.textMid, lineHeight: 14 },
});

const forecastStyles = StyleSheet.create({
  btn:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.panelEdge },
  btnDim:  { opacity: 0.5 },
  btnText: { fontSize: 10, fontFamily: FONT.semi },
});
