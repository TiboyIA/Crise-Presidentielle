import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { NewsCard } from "@/components/NewsCard";
import { InteractiveNewsModal } from "@/components/InteractiveNewsModal";
import { Badge, Panel, ScreenHeader, SectionHeader } from "@/components/ui";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { typeIcon, urgencyColor } from "@/logic/newsEngine";
import { computeNationalTension } from "@/logic/tensionEngine";
import {
  generateForecast,
  canPrepareForecast,
  canIssueAlert,
  CONFIDENCE_DEFS,
  SEVERITY_DEFS,
  PREPARE_COST_MONEY,
  ALERT_COST_INFLUENCE,
} from "@/logic/forecastUncertaintyEngine";
import { getAgroWeatherSnapshot } from "@/logic/agroWeatherEngine";
import { getWeatherOpportunitySnapshot } from "@/logic/weatherOpportunityEngine";
import {
  getTrustLevel,
  TRUST_LEVEL_DEFS,
  WEATHER_ALERT_TRUST_INITIAL,
} from "@/logic/weatherAlertTrustEngine";
import { getTransportDisruptionSummary } from "@/logic/weatherTransportEngine";
import {
  WEATHER_DOCTRINES_LIST,
  WEATHER_DOCTRINE_DEFAULT,
} from "@/logic/weatherDoctrineEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { NewsType } from "@/types/strategy";
import { useComfort } from "@/context/ComfortContext";
import { LowLoadBanner } from "@/components/LowLoadBanner";
import { getActiveWaveSummary } from "@/logic/crisisWaveEngine";
import { CrisisWaveCard } from "@/components/CrisisWaveCard";
import { getSolarStormInfo } from "@/logic/solarStormEngine";
import { computeBreakpoints } from "@/logic/breakpointEngine";
import { getMedicalBandInfo, DEFAULT_MEDICAL_DATA_QUALITY } from "@/logic/medicalInformationEngine";
import { getHospitalCodingBandInfo, DEFAULT_HOSPITAL_CODING_QUALITY } from "@/logic/hospitalCodingQualityEngine";
import { getHealthReportingBandInfo, DEFAULT_HEALTH_REPORTING_DELAY } from "@/logic/healthReportingDelayEngine";
import { getHospitalPressureBandInfo, DEFAULT_HOSPITAL_PRESSURE } from "@/logic/hospitalPressureEngine";
import { getHealthDataTrustBandInfo, DEFAULT_HEALTH_DATA_TRUST } from "@/logic/healthDataTrustEngine";
import { canLaunchDimAudit, DIM_AUDIT_COST_MONEY, DIM_AUDIT_COST_INFLUENCE } from "@/logic/dimAuditEngine";
import { DEFAULT_UNDER_DETECTION_PRESSURE } from "@/logic/healthUnderDetectionEngine";
import {
  SURVEILLANCE_LEVELS,
  SURVEILLANCE_ORDER,
  DEFAULT_SURVEILLANCE_LEVEL,
  canSetSurveillanceLevel,
} from "@/logic/healthSurveillanceEngine";
import { DEFAULT_STATISTICS_SCANDAL_PRESSURE } from "@/logic/healthStatisticsScandalEngine";
import { getInteroperabilityBandInfo, DEFAULT_HEALTH_INTEROPERABILITY } from "@/logic/healthInteroperabilityEngine";
import { generateHealthSnapshot } from "@/logic/anonymizedHealthRecordsEngine";
import { getInflationBandInfo, DEFAULT_INFLATION } from "@/logic/inflationEngine";
import { getPurchasingPowerBandInfo, DEFAULT_PURCHASING_POWER } from "@/logic/purchasingPowerEngine";
import {
  getUnemploymentBandInfo,
  getLaborShortageBandInfo,
  DEFAULT_UNEMPLOYMENT,
  DEFAULT_LABOR_SHORTAGE,
  DEFAULT_YOUTH_UNEMPLOYMENT,
} from "@/logic/laborMarketEngine";
import { getProductivityBandInfo, DEFAULT_PRODUCTIVITY } from "@/logic/productivityEngine";
import { getSupplyRiskBandInfo, computeOverallSupplyRisk, DEFAULT_SUPPLY_CHAIN_STATE } from "@/logic/supplyChainEngine";
import { SECTOR_IDS, STRATEGIC_SECTORS } from "@/data/strategicSectors";
import { getInvestorConfidenceBandInfo, DEFAULT_INVESTOR_CONFIDENCE } from "@/logic/investorConfidenceEngine";
import { getFiscalConsentBandInfo, DEFAULT_TAX_PRESSURE, DEFAULT_TAX_EFFICIENCY, DEFAULT_FISCAL_CONSENT } from "@/logic/taxPolicyEngine";

const URGENCY_SHAPES: Record<string, string> = {
  critique: "▲",
  forte:    "◆",
  moyenne:  "●",
  faible:   "○",
};

const TYPE_FILTERS: { label: string; value: NewsType | "all" }[] = [
  { label: "Tout",       value: "all" },
  { label: "Cyber",      value: "cyber" },
  { label: "Économie",   value: "economie" },
  { label: "Social",     value: "social" },
  { label: "Diplomatie", value: "diplomatie" },
  { label: "Hybride",    value: "guerre_hybride" },
  { label: "Monde",      value: "monde" },
  { label: "National",   value: "national" },
];

function AgroBar({ label, value, color, invert }: { label: string; value: number; color: string; invert?: boolean }) {
  // Pour "stress cultures", on montre la barre comme un niveau de danger (haut = mauvais)
  const displayValue = invert ? value : value;
  return (
    <View style={agroBarStyles.row}>
      <Text style={agroBarStyles.label}>{label}</Text>
      <View style={agroBarStyles.track}>
        <View style={[agroBarStyles.fill, { width: `${displayValue}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={[agroBarStyles.pct, { color }]}>{Math.round(value)} %</Text>
    </View>
  );
}

const agroBarStyles = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, width: 90 },
  track: { flex: 1, height: 5, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden" },
  fill:  { height: "100%", borderRadius: 3 },
  pct:   { fontFamily: FONT.bold, fontSize: 10, width: 36, textAlign: "right" },
});

const hospStyles = StyleSheet.create({
  bar:  { height: 6, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden", marginTop: 6, marginBottom: 4, position: "relative" },
  fill: { position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 3 },
  tick: { position: "absolute", top: 0, width: 1, height: "100%", backgroundColor: PALETTE.panelEdge + "cc" },
});

export default function JournalDeCriseScreen() {
  const insets = useSafeAreaInsets();
  const { state, resolveInteractiveNews, dismissNews, markNewsRead, setWeatherDoctrine, launchDimAudit, setHealthSurveillanceLevel } = useStrategy();
  const { hPad, width } = useResponsive();

  const { prepareForecast, issuePublicAlert } = useStrategy();
  const { enabled: comfort, fs, pad, lowLoad, reducedInfo, extraConfirm } = useComfort();
  const [activeTab, setActiveTab] = useState<"journal" | "sante">("journal");
  const [filter, setFilter] = useState<NewsType | "all">("all");
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [logExpanded, setLogExpanded] = useState(false);
  const [dimExpanded, setDimExpanded] = useState(false);
  const LOG_INITIAL = 5;

  useEffect(() => {
    if (state) markNewsRead();
  }, []);

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

  const pendingInteractive = useMemo(() => {
    if (!state) return [];
    return state.news.pendingIds
      .map((id) => NEWS_EVENT_MAP[id])
      .filter(Boolean)
      .filter((e) => e.isInteractive);
  }, [state]);

  const filteredLog = useMemo(() => {
    if (!state) return [];
    const log = state.news.log;
    return filter === "all"
      ? [...log].reverse()
      : log.filter((e) => e.type === filter).reverse();
  }, [state, filter]);

  if (!state) return null;
  const { news } = state;

  const activeWaves = getActiveWaveSummary(state.crisisWaves ?? []);
  const rupturedSystems = computeBreakpoints(state).filter((b) => b.status === "rupture");
  const medicalQuality  = state.medicalDataQuality ?? DEFAULT_MEDICAL_DATA_QUALITY;
  const medicalInfo     = getMedicalBandInfo(medicalQuality);
  const codingQuality   = state.hospitalCodingQuality ?? DEFAULT_HOSPITAL_CODING_QUALITY;
  const codingInfo      = getHospitalCodingBandInfo(codingQuality);
  const reportingDelay   = state.healthReportingDelay ?? DEFAULT_HEALTH_REPORTING_DELAY;
  const reportingInfo    = getHealthReportingBandInfo(reportingDelay);
  const hospPressure     = state.hospitalPressure ?? DEFAULT_HOSPITAL_PRESSURE;
  const hospPressureInfo = getHospitalPressureBandInfo(hospPressure);
  const healthTrust      = state.healthDataTrust ?? DEFAULT_HEALTH_DATA_TRUST;
  const healthTrustInfo  = getHealthDataTrustBandInfo(healthTrust);
  const underDetection    = state.underDetectionPressure    ?? DEFAULT_UNDER_DETECTION_PRESSURE;
  const scandalPressure   = state.statisticsScandalPressure ?? DEFAULT_STATISTICS_SCANDAL_PRESSURE;
  const interopValue      = state.healthInteroperability     ?? DEFAULT_HEALTH_INTEROPERABILITY;
  const interopInfo       = getInteroperabilityBandInfo(interopValue);
  const hasCriticalHealth = hospPressure >= 81 || healthTrust <= 20 || underDetection >= 85 || scandalPressure >= 85 || interopValue < 20;
  const inflationValue       = state.inflation       ?? DEFAULT_INFLATION;
  const inflationInfo        = getInflationBandInfo(inflationValue);
  const purchasingPowerValue = state.purchasingPower ?? DEFAULT_PURCHASING_POWER;
  const purchasingPowerInfo  = getPurchasingPowerBandInfo(purchasingPowerValue);
  const unemploymentValue    = state.unemployment    ?? DEFAULT_UNEMPLOYMENT;
  const unemploymentInfo     = getUnemploymentBandInfo(unemploymentValue);
  const laborShortageValue   = state.laborShortage   ?? DEFAULT_LABOR_SHORTAGE;
  const laborShortageInfo    = getLaborShortageBandInfo(laborShortageValue);
  const youthUnempValue      = state.youthUnemployment ?? DEFAULT_YOUTH_UNEMPLOYMENT;
  const productivityValue    = state.productivity    ?? DEFAULT_PRODUCTIVITY;
  const productivityInfo     = getProductivityBandInfo(productivityValue);
  const healthSnapshot   = useMemo(() => generateHealthSnapshot(state), [state.mandateDay, state.hospitalPressure, state.medicalDataQuality, state.hospitalCodingQuality, state.healthReportingDelay, state.underDetectionPressure]);

  const investorConfValue = state.investorConfidence ?? DEFAULT_INVESTOR_CONFIDENCE;
  const investorConfInfo  = getInvestorConfidenceBandInfo(investorConfValue);
  const showInvestorPanel = investorConfValue < 46 || investorConfValue >= 75;

  const fiscalConsentValue  = state.fiscalConsent  ?? DEFAULT_FISCAL_CONSENT;
  const fiscalConsentInfo   = getFiscalConsentBandInfo(fiscalConsentValue);
  const taxPressureValue    = state.taxPressure    ?? DEFAULT_TAX_PRESSURE;
  const taxEfficiencyValue  = state.taxEfficiency  ?? DEFAULT_TAX_EFFICIENCY;
  const showFiscalPanel     = fiscalConsentValue < 46 || fiscalConsentValue >= 71;

  const supplyChainSt    = state.supplyChain ?? DEFAULT_SUPPLY_CHAIN_STATE;
  const supplyAvgRisk    = computeOverallSupplyRisk(supplyChainSt);
  const supplyOverallInfo = getSupplyRiskBandInfo(supplyAvgRisk);
  const supplyRuptured   = SECTOR_IDS.filter((id) => supplyChainSt[id].disruptionRisk >= 80 && supplyChainSt[id].stockLevel < 30);
  const supplyVulnerable = SECTOR_IDS.filter((id) => supplyChainSt[id].disruptionRisk >= 56 && !supplyRuptured.includes(id));
  const showSupplyPanel  = supplyAvgRisk >= 35 || supplyRuptured.length >= 1;

  const activeEvent = activeModal ? NEWS_EVENT_MAP[activeModal] : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Journal de Crise" kicker="DESK PRÉSIDENTIEL" />

      {/* ── Onglets ────────────────────────────────────────────────────────── */}
      <View style={tabStyles.bar}>
        {(["journal", "sante"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[tabStyles.tab, active && tabStyles.tabActive]}
            >
              <Text style={[tabStyles.tabText, active && tabStyles.tabTextActive]}>
                {tab === "journal" ? "JOURNAL" : "SANTÉ"}
              </Text>
              {tab === "sante" && hasCriticalHealth && !active && (
                <View style={tabStyles.dot} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET JOURNAL — ticker + décisions + alertes + archives              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "journal" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >

      {/* PRIORITÉ — Mode Faible Charge Mentale */}
      {lowLoad && (
        <View style={{ paddingHorizontal: hPad, paddingTop: 8 }}>
          {pendingInteractive.length > 0 ? (
            <LowLoadBanner
              text={`Décision urgente : ${pendingInteractive.length} événement${pendingInteractive.length > 1 ? "s" : ""} en attente de votre arbitrage.`}
              icon="alert-octagon-outline"
              color={PALETTE.danger}
            />
          ) : (
            <LowLoadBanner
              text="Aucune décision urgente — situation sous contrôle."
              icon="check-circle-outline"
              color={PALETTE.success}
            />
          )}
        </View>
      )}

      {/* Breaking news ticker */}
      <View style={[styles.tickerWrap, { paddingHorizontal: hPad }]}>
        <View style={styles.tickerBadge}>
          <Text style={styles.tickerBadgeText}>EN DIRECT</Text>
        </View>
        <Text style={[styles.tickerText, comfort && { fontSize: fs(11), color: PALETTE.textHigh }]}>
          {pendingInteractive.length > 0
            ? `${pendingInteractive.length} décision${pendingInteractive.length > 1 ? "s" : ""} requise${pendingInteractive.length > 1 ? "s" : ""}`
            : `${news.log.length} dépêche${news.log.length > 1 ? "s" : ""} archivée${news.log.length > 1 ? "s" : ""}`}
        </Text>
      </View>

      {/* Pending interactive decisions */}
      {pendingInteractive.length > 0 && (
        <Panel variant="danger" glow={!comfort} style={[styles.urgentPanel, { marginHorizontal: hPad }]}>
          <View style={styles.urgentHeader}>
            <MaterialCommunityIcons name="alert-octagon" size={16} color={PALETTE.danger} />
            <Text style={styles.urgentTitle}>DÉCISIONS PRÉSIDENTIELLES EN ATTENTE</Text>
            <Badge label={`${pendingInteractive.length}`} tone="danger" size="xs" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.urgentScroll}>
            {pendingInteractive.map((event) => {
              const urg = urgencyColor(event.urgency);
              return (
                <Pressable
                  key={event.id}
                  onPress={() => setActiveModal(event.id)}
                  style={({ pressed }) => [
                    styles.urgentChip,
                    { borderColor: urg, backgroundColor: urg + "1c", maxWidth: Math.round(width * 0.62), opacity: pressed ? 0.85 : 1 },
                    comfort && { padding: pad(10), minWidth: 180 },
                  ]}
                >
                  <View style={styles.urgentChipHeader}>
                    <Text style={styles.urgentChipIcon}>{typeIcon(event.type)}</Text>
                    <Text style={[styles.urgentChipUrg, { color: urg }, comfort && { fontSize: fs(9) }]}>{(URGENCY_SHAPES[event.urgency] ?? "") + " " + event.urgency.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.urgentChipTitle, { color: PALETTE.textHigh }, comfort && { fontSize: fs(12), lineHeight: fs(16) }]} numberOfLines={2}>{event.title}</Text>
                  <Text style={[styles.urgentChipCta, { color: urg }, comfort && { fontSize: fs(10), paddingVertical: 2 }]}>Décider →</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Panel>
      )}

      {/* ── Tempête solaire active ───────────────────────────────────────── */}
      {state.solarStorm && !lowLoad && (() => {
        const storm = getSolarStormInfo(state.solarStorm.level);
        return (
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: storm.color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="weather-sunny-alert" size={12} color={storm.color} />
              <Text style={[styles.waveTitle, { color: storm.color }]}>TEMPÊTE SOLAIRE ACTIVE</Text>
              <View style={[styles.waveBadge, { backgroundColor: storm.color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: storm.color }]}>
                  {storm.level.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.stormDesc}>{storm.description}</Text>
          </View>
        );
      })()}

      {/* ── Pression conservée — résumé du dernier déplacement ───────────── */}
      {state.recentPressureNote && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#a78bfa33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="transfer-right" size={12} color="#a78bfa" />
            <Text style={[styles.waveTitle, { color: "#a78bfa" }]}>PRESSION CONSERVÉE</Text>
          </View>
          <Text style={styles.stormDesc}>{state.recentPressureNote}</Text>
        </View>
      )}

      {/* ── Résonance sociale — dernier cas déclenché ────────────────────── */}
      {state.resonanceNote && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#f472b633" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="sine-wave" size={12} color="#f472b6" />
            <Text style={[styles.waveTitle, { color: "#f472b6" }]}>RÉSONANCE SOCIALE</Text>
          </View>
          <Text style={styles.stormDesc}>{state.resonanceNote}</Text>
        </View>
      )}

      {/* ── Ruptures systémiques actives ─────────────────────────────────── */}
      {rupturedSystems.length > 0 && !lowLoad && (
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

      {/* ── Ondes de crise actives ──────────────────────────────────────── */}
      {activeWaves.length > 0 && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="wave" size={12} color="#e8864f" />
            <Text style={styles.waveTitle}>ONDES DE PROPAGATION ACTIVES</Text>
            <View style={[styles.waveBadge, { backgroundColor: "#e8864f22" }]}>
              <Text style={styles.waveBadgeText}>{activeWaves.length}</Text>
            </View>
          </View>
          {activeWaves.map((wave) => (
            <CrisisWaveCard key={wave.id} wave={wave} />
          ))}
        </View>
      )}


      {/* ── Baromètre économique — Inflation, Pouvoir d'achat & Productivité ── */}
      {(inflationValue >= 35 || purchasingPowerValue < 45 || productivityValue <= 35 || productivityValue >= 76) && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: inflationValue >= 61 ? inflationInfo.color + "33" : purchasingPowerInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="chart-line" size={12} color={inflationValue >= 61 ? inflationInfo.color : purchasingPowerInfo.color} />
            <Text style={[styles.waveTitle, { color: inflationValue >= 61 ? inflationInfo.color : purchasingPowerInfo.color }]}>BAROMÈTRE ÉCONOMIQUE</Text>
          </View>
          <Text style={styles.stormDesc}>
            <Text style={{ color: inflationInfo.color }}>{"Inflation : " + inflationInfo.label}</Text>
            {"   ·   "}
            <Text style={{ color: purchasingPowerInfo.color }}>{"Pouvoir d'achat : " + purchasingPowerInfo.label}</Text>
          </Text>
          {(productivityValue <= 35 || productivityValue >= 76) && (
            <Text style={styles.stormDesc}>
              <Text style={{ color: productivityInfo.color }}>{"Productivité : " + productivityInfo.label}</Text>
            </Text>
          )}
        </View>
      )}

      {/* ── Emploi national ───────────────────────────────────────────────────── */}
      {(unemploymentValue >= 45 || laborShortageValue >= 60 || youthUnempValue >= 55) && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: unemploymentInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="briefcase-outline" size={12} color={unemploymentInfo.color} />
            <Text style={[styles.waveTitle, { color: unemploymentInfo.color }]}>EMPLOI NATIONAL</Text>
          </View>
          <Text style={styles.stormDesc}>
            <Text style={{ color: unemploymentInfo.color }}>{"Chômage : " + unemploymentInfo.label}</Text>
            {laborShortageValue >= 40 && (
              <>
                {"   ·   "}
                <Text style={{ color: laborShortageInfo.color }}>{"Pénurie : " + laborShortageInfo.label}</Text>
              </>
            )}
          </Text>
        </View>
      )}

      {/* ── Consentement fiscal ──────────────────────────────────────────────── */}
      {showFiscalPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: fiscalConsentInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="bank-outline" size={12} color={fiscalConsentInfo.color} />
            <Text style={[styles.waveTitle, { color: fiscalConsentInfo.color }]}>CONSENTEMENT FISCAL</Text>
            <View style={[styles.waveBadge, { backgroundColor: fiscalConsentInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: fiscalConsentInfo.color }]}>
                {fiscalConsentInfo.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.waveBadgeText, { color: fiscalConsentInfo.color, marginLeft: 4 }]}>
              {Math.round(fiscalConsentValue)}
            </Text>
          </View>
          <Text style={styles.stormDesc}>{fiscalConsentInfo.message}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Text style={[styles.stormDesc, { flex: 1 }]}>
              <Text style={{ color: "#94a3b8" }}>Pression fiscale </Text>
              <Text style={{ color: taxPressureValue >= 68 ? "#e8864f" : "#94a3b8" }}>{Math.round(taxPressureValue)}</Text>
            </Text>
            <Text style={[styles.stormDesc, { flex: 1 }]}>
              <Text style={{ color: "#94a3b8" }}>Efficacité </Text>
              <Text style={{ color: taxEfficiencyValue >= 65 ? "#4caf82" : "#94a3b8" }}>{Math.round(taxEfficiencyValue)}</Text>
            </Text>
          </View>
        </View>
      )}

      {/* ── Confiance des marchés fictifs ────────────────────────────────────── */}
      {showInvestorPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: investorConfInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="trending-up" size={12} color={investorConfInfo.color} />
            <Text style={[styles.waveTitle, { color: investorConfInfo.color }]}>CONFIANCE DES MARCHÉS</Text>
            <View style={[styles.waveBadge, { backgroundColor: investorConfInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: investorConfInfo.color }]}>
                {investorConfInfo.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.waveBadgeText, { color: investorConfInfo.color, marginLeft: 4 }]}>
              {Math.round(investorConfValue)}
            </Text>
          </View>
          <Text style={styles.stormDesc}>{investorConfInfo.message}</Text>
        </View>
      )}

      {/* ── Chaînes d'approvisionnement stratégiques ─────────────────────────── */}
      {showSupplyPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: supplyOverallInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="package-variant-closed" size={12} color={supplyOverallInfo.color} />
            <Text style={[styles.waveTitle, { color: supplyOverallInfo.color }]}>APPROVISIONNEMENTS</Text>
            {supplyRuptured.length > 0 && (
              <View style={[styles.waveBadge, { backgroundColor: "#e5484822" }]}>
                <Text style={[styles.waveBadgeText, { color: "#e54848" }]}>
                  {supplyRuptured.length} rupture{supplyRuptured.length > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
          {supplyRuptured.map((id) => (
            <Text key={id} style={styles.stormDesc}>
              <Text style={{ color: "#e54848" }}>{"▲ " + STRATEGIC_SECTORS[id].name + " — rupture critique"}</Text>
            </Text>
          ))}
          {supplyVulnerable.slice(0, 3).map((id) => (
            <Text key={id} style={styles.stormDesc}>
              <Text style={{ color: "#e8864f" }}>{"◆ " + STRATEGIC_SECTORS[id].name + " — vulnérable"}</Text>
            </Text>
          ))}
        </View>
      )}

      {/* Filtres */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { paddingHorizontal: hPad }]}
        nestedScrollEnabled
      >
        {TYPE_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: active ? PALETTE.crimson + "33" : "transparent",
                  borderColor: active ? PALETTE.crimson : PALETTE.panelEdge,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? PALETTE.textHigh : PALETTE.textMid }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Archives — flat dans le ScrollView principal */}
      <View style={[styles.log, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }, comfort && { gap: pad(10) }]}>
        {filteredLog.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="archive-outline" size={36} color={PALETTE.textLow} />
            <Text style={styles.emptyTitle}>{news.log.length === 0 ? "Aucune dépêche" : "Aucun résultat"}</Text>
            <Text style={styles.emptyText}>
              {news.log.length === 0
                ? "Engagez des actions stratégiques pour générer de l'actualité."
                : "Aucune actualité dans cette catégorie."}
            </Text>
          </View>
        ) : (
          <>
            <SectionHeader label="Archives" count={`${filteredLog.length}`} />
            {(reducedInfo && !logExpanded ? filteredLog.slice(0, LOG_INITIAL) : filteredLog).map((entry, i) => (
              <NewsCard key={`${entry.eventId}_${entry.timestamp}_${i}`} entry={entry} />
            ))}
            {reducedInfo && filteredLog.length > LOG_INITIAL && (
              <Pressable
                onPress={() => setLogExpanded((v) => !v)}
                style={({ pressed }) => [styles.logMoreBtn, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={styles.logMoreText}>
                  {logExpanded
                    ? "Réduire ↑"
                    : `${filteredLog.length - LOG_INITIAL} article${filteredLog.length - LOG_INITIAL > 1 ? "s" : ""} supplémentaire${filteredLog.length - LOG_INITIAL > 1 ? "s" : ""} ↓`}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>

        </ScrollView>
      )}
      {/* fin onglet JOURNAL */}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET SANTÉ — tableau de bord sanitaire MODE DELTA                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "sante" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 0 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Pression hospitalière ────────────────────────────────────── */}
          <View style={[styles.waveBlock, { marginHorizontal: hPad, marginTop: 8, borderColor: hospPressureInfo.color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="hospital-building" size={12} color={hospPressureInfo.color} />
              <Text style={[styles.waveTitle, { color: hospPressureInfo.color }]}>PRESSION HOSPITALIÈRE</Text>
              <View style={[styles.waveBadge, { backgroundColor: hospPressureInfo.color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: hospPressureInfo.color }]}>
                  {hospPressureInfo.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.waveBadgeText, { color: hospPressureInfo.color, marginLeft: 4 }]}>
                {Math.round(hospPressure)}
              </Text>
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
                    <Text style={[styles.waveBadgeText, { color: PALETTE.textLow, marginLeft: 4 }]}>
                      {`−${currentDef.dailyCostMoney} M€/j`}
                    </Text>
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
                        <Text style={[survStyles.btnLabel, { color: isActive ? def.color : check.ok ? PALETTE.textHigh : PALETTE.textLow }]}>
                          {def.label}
                        </Text>
                        {def.dailyCostMoney > 0 && (
                          <Text style={[survStyles.btnCost, { color: isActive ? def.color : PALETTE.textLow }]}>
                            {`${def.dailyCostMoney} M€/j`}
                          </Text>
                        )}
                        {!isActive && def.upgradeCostMoney > 0 && check.ok && (
                          <Text style={survStyles.btnUpgrade}>
                            {`${def.upgradeCostMoney} M€ · ${def.upgradeCostInfluence} INF`}
                          </Text>
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
                <Text style={[styles.waveBadgeText, { color: medicalInfo.color }]}>
                  {medicalInfo.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.waveBadgeText, { color: medicalInfo.color, marginLeft: 4 }]}>
                {Math.round(medicalQuality)}
              </Text>
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
              <Text style={[styles.waveBadgeText, { color: interopInfo.color, marginLeft: 4 }]}>
                {Math.round(interopValue)}
              </Text>
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
                  style={({ pressed }) => [
                    styles.forecastBtn,
                    !canAudit && styles.forecastBtnDim,
                    { opacity: pressed ? 0.75 : 1, alignSelf: "flex-start" },
                  ]}
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
                            if (r.failReason) {
                              Alert.alert("Audit impossible", r.failReason, [{ text: "OK" }]);
                            } else if (r.result) {
                              Alert.alert(r.result.def.label, r.result.def.description, [{ text: "OK" }]);
                            }
                          },
                        },
                      ],
                    );
                  }}
                >
                  <MaterialCommunityIcons name="magnify-scan" size={11} color={canAudit ? "#4a9fff" : PALETTE.textLow} />
                  <Text style={[styles.forecastBtnText, { color: canAudit ? "#4a9fff" : PALETTE.textLow }]}>
                    {canAudit
                      ? `Lancer l'audit — ${DIM_AUDIT_COST_MONEY} M€ · ${DIM_AUDIT_COST_INFLUENCE} INF`
                      : (auditCheck.reason ?? "Indisponible")}
                  </Text>
                </Pressable>
              </View>
            );
          })()}

          {/* ── Rapports DIM anonymisés (agrégats fictifs) ───────────────── */}
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#4a9fff22" }]}>
            <Pressable
              style={styles.waveHeader}
              onPress={() => setDimExpanded((v) => !v)}
            >
              <MaterialCommunityIcons name="file-chart-outline" size={12} color="#4a9fff" />
              <Text style={[styles.waveTitle, { color: "#4a9fff" }]}>RAPPORTS DIM — AGRÉGATS FICTIFS</Text>
              <View style={[styles.waveBadge, { backgroundColor: "#4a9fff22" }]}>
                <Text style={[styles.waveBadgeText, { color: "#4a9fff" }]}>SEM.{Math.ceil(state.mandateDay / 7) + 1}</Text>
              </View>
              <MaterialCommunityIcons
                name={dimExpanded ? "chevron-up" : "chevron-down"}
                size={12} color="#4a9fff"
                style={{ marginLeft: "auto" }}
              />
            </Pressable>

            {/* Agrégats synthétiques — toujours visibles */}
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

            {/* Signaux faibles */}
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

            {/* Rapports DIM dépliables */}
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
                <Text style={[styles.waveBadgeText, { color: codingInfo.color }]}>
                  {codingInfo.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.waveBadgeText, { color: codingInfo.color, marginLeft: 4 }]}>
                {Math.round(codingQuality)}
              </Text>
            </View>
            <Text style={styles.stormDesc}>{codingInfo.message}</Text>
          </View>

          {/* ── Retard remontée données santé ────────────────────────────── */}
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: reportingInfo.color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="database-clock-outline" size={12} color={reportingInfo.color} />
              <Text style={[styles.waveTitle, { color: reportingInfo.color }]}>DONNÉES SANTÉ</Text>
              <View style={[styles.waveBadge, { backgroundColor: reportingInfo.color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: reportingInfo.color }]}>
                  {reportingInfo.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.waveBadgeText, { color: reportingInfo.color, marginLeft: 4 }]}>
                {`−${Math.round(reportingDelay)} actions`}
              </Text>
            </View>
            <Text style={styles.stormDesc}>{reportingInfo.message}</Text>
          </View>

          {/* ── Confiance dans les chiffres de santé ─────────────────────── */}
          <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: healthTrustInfo.color + "33" }]}>
            <View style={styles.waveHeader}>
              <MaterialCommunityIcons name="shield-check-outline" size={12} color={healthTrustInfo.color} />
              <Text style={[styles.waveTitle, { color: healthTrustInfo.color }]}>CONFIANCE DONNÉES SANTÉ</Text>
              <View style={[styles.waveBadge, { backgroundColor: healthTrustInfo.color + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: healthTrustInfo.color }]}>
                  {healthTrustInfo.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.waveBadgeText, { color: healthTrustInfo.color, marginLeft: 4 }]}>
                {Math.round(healthTrust)}
              </Text>
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
                    <Text style={[styles.waveBadgeText, { color: storm.color }]}>
                      {storm.level.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.stormDesc}>{storm.description}</Text>
              </View>
            );
          })()}

          {/* ── Sous-détection sanitaire cachée ──────────────────────────── */}
          {underDetection >= 35 && (() => {
            const color =
              underDetection >= 85 ? "#e54848" :
              underDetection >= 60 ? "#e8864f" : "#e8c44f";
            const label =
              underDetection >= 85 ? "CRITIQUE" :
              underDetection >= 60 ? "ALERTE" : "SIGNAL FAIBLE";
            const msg =
              underDetection >= 85
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
                  <Text style={[styles.waveBadgeText, { color, marginLeft: 4 }]}>
                    {Math.round(underDetection)}
                  </Text>
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
            const color =
              scandalPressure >= 85 ? "#e54848" :
              scandalPressure >= 65 ? "#e8864f" : "#e8c44f";
            const label =
              scandalPressure >= 85 ? "SCANDALE" :
              scandalPressure >= 65 ? "CONTROVERSE" : "INCOHÉRENCES";
            const msg =
              scandalPressure >= 85
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
                  <Text style={[styles.waveBadgeText, { color, marginLeft: 4 }]}>
                    {Math.round(scandalPressure)}
                  </Text>
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
                <MaterialCommunityIcons
                  name={forecast.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                  size={20}
                  color={CONFIDENCE_DEFS[forecast.confidence].color}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.forecastPhenomenon, { color: CONFIDENCE_DEFS[forecast.confidence].color }]}>
                    {forecast.phenomenon}
                  </Text>
                  <Text style={styles.forecastMeta}>
                    {forecast.probability} % de probabilité · Confiance{" "}
                    <Text style={{ color: CONFIDENCE_DEFS[forecast.confidence].color }}>
                      {CONFIDENCE_DEFS[forecast.confidence].label}
                    </Text>
                  </Text>
                </View>
              </View>
              <Text style={styles.forecastHint}>{CONFIDENCE_DEFS[forecast.confidence].description}</Text>
              {(() => {
                const trust = state?.weatherAlertTrust ?? WEATHER_ALERT_TRUST_INITIAL;
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
                  <MaterialCommunityIcons
                    name={transportDisruption.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                    size={13}
                    color={transportDisruption.color}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.transportLabel, { color: transportDisruption.color }]} numberOfLines={1}>
                      {transportDisruption.label}
                    </Text>
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
                  const canPrep = state ? canPrepareForecast(state) : { ok: false };
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
                  const canAlert = state ? canIssueAlert(state) : { ok: false };
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
                <MaterialCommunityIcons
                  name={agroSnapshot.phenomenon.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                  size={18}
                  color={agroSnapshot.phenomenon.color}
                />
                <Text style={[styles.agroPhenLabel, { color: agroSnapshot.phenomenon.color }]}>
                  {agroSnapshot.phenomenon.label}
                </Text>
              </View>
              <View style={styles.agroIndicators}>
                <AgroBar label="Humidité sol" value={agroSnapshot.soilMoisture}
                  color={agroSnapshot.soilMoisture < 25 ? PALETTE.danger : agroSnapshot.soilMoisture < 50 ? PALETTE.warning : "#4a9fff"} />
                <AgroBar label="Stress cultures" value={agroSnapshot.cropStress}
                  color={agroSnapshot.cropStress > 65 ? PALETTE.danger : agroSnapshot.cropStress > 40 ? PALETTE.warning : PALETTE.success} invert />
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
                  <MaterialCommunityIcons
                    name={opportunitySnapshot.def.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                    size={20} color={opportunitySnapshot.def.color}
                  />
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
                const active = (state?.weatherDoctrine ?? WEATHER_DOCTRINE_DEFAULT) === doc.id;
                return (
                  <Pressable
                    key={doc.id}
                    onPress={() => setWeatherDoctrine(doc.id)}
                    style={({ pressed }) => [
                      styles.doctrineChip,
                      { borderColor: active ? doc.color : PALETTE.panelEdge, backgroundColor: active ? doc.color + "22" : PALETTE.panelHi, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={doc.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                      size={13} color={active ? doc.color : PALETTE.textLow}
                    />
                    <Text style={[styles.doctrineChipLabel, { color: active ? doc.color : PALETTE.textMid }]}>{doc.shortLabel}</Text>
                    {active && <View style={[styles.doctrineActiveDot, { backgroundColor: doc.color }]} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            {(() => {
              const activeDoc = WEATHER_DOCTRINES_LIST.find((d) => d.id === (state?.weatherDoctrine ?? WEATHER_DOCTRINE_DEFAULT));
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

        </ScrollView>
      )}
      {/* fin onglet SANTÉ */}

      <InteractiveNewsModal
        event={activeEvent}
        visible={!!activeModal}
        tension={state ? computeNationalTension(state) : undefined}
        actionCount={news.actionCount}
        clarityContext={state ? {
          hiddenPolitics: state.hiddenPolitics,
          nationalIndicators: state.nationalIndicators,
          governanceDoctrine: state.governanceDoctrine,
          mandateDay: state.mandateDay,
        } : undefined}
        onChoose={(id) => {
          if (!activeModal) return;
          resolveInteractiveNews(activeModal, id);
          setActiveModal(null);
        }}
        onDismiss={() => {
          if (!activeModal) return;
          if (extraConfirm) {
            Alert.alert(
              "Ignorer cet événement",
              "Cet événement sera archivé sans décision prise. Voulez-vous continuer ?",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Ignorer", style: "destructive", onPress: () => { dismissNews(activeModal); setActiveModal(null); } },
              ],
            );
          } else {
            dismissNews(activeModal);
            setActiveModal(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.ink },
  tickerWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, paddingBottom: 6 },
  tickerBadge: { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: PALETTE.danger, borderRadius: 2 },
  tickerBadgeText: { fontSize: 9, fontFamily: FONT.bold, color: "#fff", letterSpacing: 1.5 },
  tickerText: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 0.5 },

  urgentPanel: { padding: 12, gap: 8, marginTop: 4 },
  urgentHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  urgentTitle: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.danger, letterSpacing: 1.8, flex: 1 },
  urgentScroll: { gap: 8, paddingTop: 4 },
  urgentChip: { borderRadius: 6, padding: 10, gap: 4, borderWidth: 1, minWidth: 160 },
  urgentChipHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  urgentChipIcon: { fontSize: 14 },
  urgentChipUrg: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 1 },
  urgentChipTitle: { fontSize: 12, fontFamily: FONT.semi, lineHeight: 16 },
  urgentChipCta: { fontSize: 10, fontFamily: FONT.bold, letterSpacing: 0.5, marginTop: 2 },

  filters: { paddingVertical: 10, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  filterText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1 },

  log: { paddingTop: 4, gap: 10 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1 },
  emptyText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 16, maxWidth: 240 },
  logMoreBtn: { alignItems: "center", paddingVertical: 10 },
  logMoreText: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.5 },

  // Prévisions météo incertaines
  forecastBlock: {
    backgroundColor: PALETTE.panel, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
    padding: 12, gap: 8, marginTop: 6,
  },
  forecastHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  forecastTitle: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.textLow, flex: 1 },
  forecastSevBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.pill },
  forecastSevText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 0.5 },
  forecastRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  forecastPhenomenon: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  forecastMeta: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 },
  forecastHint: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },
  forecastSystemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  forecastChip: {
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
  },
  forecastChipText: { fontSize: 8, fontFamily: FONT.semi, color: PALETTE.textMid },
  forecastActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  forecastBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
  },
  forecastBtnDim: { opacity: 0.5 },
  forecastBtnText: { fontSize: 10, fontFamily: FONT.semi },
  // ── Météo agricole ────────────────────────────────────────────────────────
  agroBlock: {
    marginTop: 8, marginBottom: 4,
    backgroundColor: PALETTE.panelHi, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
    padding: 12, gap: 8,
  },
  agroHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  agroTitle: { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.8 },
  agroHarvestBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  agroHarvestText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.8 },
  agroPhenRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  agroPhenLabel: { fontSize: 12, fontFamily: FONT.semi },
  agroIndicators: { gap: 5 },
  // ── Fenêtre météo favorable ───────────────────────────────────────────────
  opportunityBlock: {
    marginTop: 8, marginBottom: 4,
    backgroundColor: PALETTE.panel, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
    padding: 12, gap: 8,
  },
  opportunityHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  opportunityTitle: { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.8 },
  opportunityRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  opportunityLabel: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  opportunityDesc: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2, lineHeight: 14 },
  opportunityBonusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  opportunityBonusText: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.success },
  opportunityFooter: { flexDirection: "row", alignItems: "center", gap: 8 },
  opportunityProgressTrack: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: PALETTE.panelEdge, overflow: "hidden",
  },
  opportunityProgressFill: { height: "100%", borderRadius: 2 },
  opportunityDaysLeft: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textLow, width: 22, textAlign: "right" },
  opportunityEmpty: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 2 },
  opportunityEmptyText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic" },
  // ── Perturbations transport ───────────────────────────────────────────────
  transportRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: PALETTE.panelHi,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
  },
  transportLabel: { fontSize: 10, fontFamily: FONT.semi, lineHeight: 14 },
  transportEffects: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 },
  // ── Confiance alertes météo ───────────────────────────────────────────────
  trustRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  trustLabel: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.5, width: 80 },
  trustTrack: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: PALETTE.panelEdge, overflow: "hidden",
  },
  trustFill: { height: "100%", borderRadius: 2 },
  trustBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.pill },
  trustBadgeText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 0.5 },
  // ── Doctrine météo présidentielle ─────────────────────────────────────────
  doctrineBlock: {
    marginTop: 8, marginBottom: 4,
    backgroundColor: PALETTE.panel, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: PALETTE.panelEdge,
    padding: 12, gap: 8,
  },
  doctrineHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  doctrineTitle: { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.8 },
  doctrineScroll: { gap: 6, paddingBottom: 2 },
  doctrineChip: {
    flexDirection: "column", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: RADIUS.sm, borderWidth: 1, minWidth: 66,
  },
  doctrineChipLabel: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.5, textAlign: "center" },
  doctrineActiveDot: { width: 4, height: 4, borderRadius: 2 },
  doctrineTradeoffs: { flexDirection: "row", gap: 14, paddingHorizontal: 2 },
  doctrineTradeoffItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  doctrineTradeoffText: { fontSize: 9, fontFamily: FONT.semi },
  // ── Ondes de crise ────────────────────────────────────────────────────────
  waveBlock: {
    marginBottom: 8,
    backgroundColor: PALETTE.panel, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: "#e8864f33",
    padding: 12, gap: 4,
  },
  waveHeader:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  waveTitle:     { flex: 1, fontSize: 9, fontFamily: FONT.bold, color: "#e8864f", letterSpacing: 1.2 },
  waveBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.pill },
  waveBadgeText: { fontSize: 8, fontFamily: FONT.bold, color: "#e8864f" },
  stormDesc:     { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 },
});

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
    backgroundColor: PALETTE.ink,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: PALETTE.crimson,
  },
  tabText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: PALETTE.textLow,
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: PALETTE.textHigh,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.danger,
  },
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
