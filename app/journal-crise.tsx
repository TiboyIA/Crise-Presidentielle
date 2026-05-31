import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { NewsCard } from "@/components/NewsCard";
import { InteractiveNewsModal } from "@/components/InteractiveNewsModal";
import { Badge, Panel, ScreenHeader, SectionHeader } from "@/components/ui";
import { SectionBackdrop } from "@/components/ui/SectionBackdrop";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { typeMaterialIcon, urgencyColor } from "@/logic/newsEngine";
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
import { getShadowEconomyBandInfo, DEFAULT_SHADOW_ECONOMY } from "@/logic/shadowEconomyEngine";
import { getTradeBalanceBandInfo, DEFAULT_TRADE_BALANCE } from "@/logic/tradeBalanceEngine";
import { getInequalityBandInfo, DEFAULT_INEQUALITY_INDEX, DEFAULT_SOCIAL_MOBILITY } from "@/logic/inequalityEngine";
import { getFabricBandInfo, DEFAULT_PRODUCTIVE_FABRIC, shouldShowFabricPanel } from "@/logic/productiveFabricEngine";
import { SHOCK_META } from "@/logic/economicShockEngine";
import { getComplianceBandInfo, DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";
import { getProcurementBandInfo, DEFAULT_PROCUREMENT_STATE } from "@/logic/procurementComplianceEngine";
import {
  DEROGATION_DEFS, getActiveDerogations, getActiveUnreviewed, getDerogationRiskLevel,
  DEROGATION_JUSTIFY_COST_INFLUENCE, DEROGATION_AUDIT_COST_MONEY, DEROGATION_AUDIT_COST_INFLUENCE,
} from "@/logic/emergencyDerogationEngine";
import {
  getActiveWhistleblowerAlerts, getWhistleblowerRiskLevel,
  getAlertSeverityLabel, getAlertSeverityColor, getAlertTriggerLabel,
  PROTECT_COST_INFLUENCE, AUDIT_COST_INFLUENCE, CORRECT_COST_MONEY,
} from "@/logic/whistleblowerEngine";
import {
  getActiveInvestigations, getAuthorityTrustLabel, getAuthorityTrustColor,
  getPressureLabel, getPressureColor, getOversightRiskLevel,
  COOPERATE_COST_INFLUENCE, JUSTIFY_COST_INFLUENCE, CONTEST_COST_INFLUENCE,
} from "@/logic/oversightEngine";
import { OVERSIGHT_AUTHORITY_DEFS, AUTHORITY_IDS } from "@/data/oversightAuthorities";
import { CYCLE_META, DEFAULT_BUSINESS_CYCLE_PHASE, DEFAULT_CYCLE_MOMENTUM } from "@/logic/businessCycleEngine";
import {
  getLevelInfo, isInitialPhase, LEVEL_ORDER, LEVEL_LABELS, UPGRADE_COSTS,
  DEFAULT_ANTI_CORRUPTION_STATE,
} from "@/logic/antiCorruptionProgramEngine";
import type { AntiCorruptionLevel } from "@/logic/antiCorruptionProgramEngine";
import {
  computeAIRiskScore, getAIRiskInfo, getAITransparencyLabel, getOversightLabel,
  DEFAULT_AI_GOVERNANCE_STATE, AI_DEPLOYMENT_LABELS,
} from "@/logic/aiGovernanceComplianceEngine";
import { getStagflationBandInfo, DEFAULT_STAGFLATION_INDEX } from "@/logic/stagflationEngine";
import {
  getInterestRateBandInfo, getCredibilityBandInfo,
  DEFAULT_INTEREST_RATE, DEFAULT_CB_CREDIBILITY, DEFAULT_MONETARY_TENSION,
} from "@/logic/centralBankEngine";
import type { SpendingType } from "@/logic/fiscalMultiplierEngine";

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
  const router = useRouter();
  const { state, resolveInteractiveNews, dismissNews, markNewsRead, justifyDerogation, auditDerogation, ignoreDerogation, protectWhistleblower, launchWhistleblowerAudit, correctWhistleblowerQuietly, oversightCooperate, oversightJustify, oversightContest, setAntiCorruptionLevel } = useStrategy();
  const { hPad, width } = useResponsive();

  const { enabled: comfort, fs, pad, lowLoad, reducedInfo, extraConfirm } = useComfort();
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

  const shadowEconomyValue  = state.shadowEconomy ?? DEFAULT_SHADOW_ECONOMY;
  const shadowEconomyInfo   = getShadowEconomyBandInfo(shadowEconomyValue);
  const showShadowPanel     = shadowEconomyValue >= 41;

  const tradeBalanceValue   = state.tradeBalance ?? DEFAULT_TRADE_BALANCE;
  const tradeBalanceInfo    = getTradeBalanceBandInfo(tradeBalanceValue);
  const showTradePanel      = tradeBalanceValue <= -30 || tradeBalanceValue >= 35;

  const inequalityValue     = state.inequalityIndex ?? DEFAULT_INEQUALITY_INDEX;
  const inequalityInfo      = getInequalityBandInfo(inequalityValue);
  const socialMobilityValue = state.socialMobility  ?? DEFAULT_SOCIAL_MOBILITY;
  const showInequalityPanel = inequalityValue >= 46 || socialMobilityValue <= 35;

  const activeEconomicShocks = (state.economicShocks ?? []).filter((s) => s.intensity > 0 && s.remainingDays > 0);

  const businessCyclePhase  = state.businessCyclePhase ?? DEFAULT_BUSINESS_CYCLE_PHASE;
  const cycleMomentumValue  = state.cycleMomentum ?? DEFAULT_CYCLE_MOMENTUM;
  const cycleMeta           = CYCLE_META[businessCyclePhase];
  const showCyclePanel      = businessCyclePhase !== "expansion" || state.mandateDay >= 10;

  const stagflationValue   = state.stagflationIndex ?? DEFAULT_STAGFLATION_INDEX;
  const stagflationInfo    = getStagflationBandInfo(stagflationValue);
  const showStagflPanel    = stagflationValue >= 26;

  const interestRateValue   = state.interestRate ?? DEFAULT_INTEREST_RATE;
  const interestRateInfo    = getInterestRateBandInfo(interestRateValue);
  const cbCredValue         = state.centralBankCredibility ?? DEFAULT_CB_CREDIBILITY;
  const cbCredInfo          = getCredibilityBandInfo(cbCredValue);
  const monetaryTensionValue = state.monetaryTension ?? DEFAULT_MONETARY_TENSION;
  const cbProfile           = state.centralBankProfile ?? "balanced";
  const showCbPanel         = interestRateValue >= 50 || cbCredValue <= 35 || monetaryTensionValue >= 55 || cbProfile !== "balanced";

  const SPENDING_LABELS: Record<SpendingType, string> = {
    emergency_aid: "Aide d'urgence", infrastructure: "Infrastructure",
    research: "R&D", security: "Sécurité", health: "Santé publique",
    energy: "Énergie", training: "Formation", industry: "Plan industriel",
  };
  const activeFiscalPrograms = (state.fiscalPrograms ?? []).filter(
    (p) => p.shortDaysRemaining > 0 || p.longDaysRemaining > 0,
  );
  const showFiscalProgramsPanel = activeFiscalPrograms.length > 0;

  const compliance          = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
  const complianceInfo      = getComplianceBandInfo(compliance.complianceScore);
  const showCompliancePanel = compliance.complianceScore < 60 || compliance.auditPressure >= 50 || compliance.legalRisk >= 50;

  const activeDerogations   = getActiveDerogations(state);
  const unreviewedDerogs    = getActiveUnreviewed(state);
  const derogRiskLevel      = getDerogationRiskLevel(unreviewedDerogs.length);
  const showDerogPanel      = activeDerogations.length > 0;
  const DEROG_RISK_COLOR: Record<string, string> = {
    safe: "#4caf82", watch: "#e8c44f", alert: "#e8864f", critical: "#e54848",
  };
  const DEROG_RISK_LABEL: Record<string, string> = {
    safe: "MAÎTRISÉ", watch: "À SURVEILLER", alert: "RISQUE ÉLEVÉ", critical: "CRISE",
  };

  const procurement      = state.procurementState ?? DEFAULT_PROCUREMENT_STATE;
  const procurementInfo  = getProcurementBandInfo(procurement.procurementIntegrity);
  const showProcurPanel  = procurement.procurementIntegrity < 65 || procurement.conflictOfInterestRisk >= 40 || procurement.vendorConcentration >= 50;

  const activeWbAlerts   = getActiveWhistleblowerAlerts(state);
  const wbRiskLevel      = getWhistleblowerRiskLevel(activeWbAlerts.length);
  const showWbPanel      = activeWbAlerts.length > 0;
  const WB_RISK_COLOR: Record<string, string> = {
    safe: "#4caf82", watch: "#e8c44f", alert: "#e8864f", critical: "#e54848",
  };
  const WB_RISK_LABEL: Record<string, string> = {
    safe: "AUCUNE ALERTE", watch: "SOUS SURVEILLANCE", alert: "RISQUE ÉLEVÉ", critical: "CRISE",
  };

  const acState          = state.antiCorruptionState ?? DEFAULT_ANTI_CORRUPTION_STATE;
  const acLevelInfo      = getLevelInfo(acState.level);
  const acInitialPhase   = isInitialPhase(acState, state.mandateDay);
  const showAcPanel      = acState.level !== "absent" || (state.complianceState?.corruptionExposure ?? 10) >= 40;

  const aiState          = state.aiGovernanceState ?? DEFAULT_AI_GOVERNANCE_STATE;
  const aiRiskScore      = computeAIRiskScore(aiState);
  const aiRiskInfo       = getAIRiskInfo(aiRiskScore);
  const completedResearch = state.strategyResearch?.completed ?? [];
  const aiIsActive       = completedResearch.includes("research_admin_ai") ||
                           aiState.activeDeployments.length > 0;
  const showAiPanel      = aiIsActive || aiRiskScore >= 30;

  const activeOversightInvs = getActiveInvestigations(state);
  const oversightMaxPressure = activeOversightInvs.length > 0
    ? Math.max(...activeOversightInvs.map((i) => i.pressure))
    : 0;
  const oversightRiskLevel  = getOversightRiskLevel(activeOversightInvs.length, oversightMaxPressure);
  const oversightTrustMap   = (state.oversightState?.authorityTrust ?? {}) as Record<string, number>;
  const anyTrustLow         = AUTHORITY_IDS.some((id) => (oversightTrustMap[id] ?? 60) < 40);
  const showOversightPanel  = activeOversightInvs.length > 0 || anyTrustLow;
  const OVERSIGHT_RISK_COLOR: Record<string, string> = {
    safe: "#4caf82", watch: "#e8c44f", alert: "#e8864f", critical: "#e54848",
  };
  const OVERSIGHT_RISK_LABEL: Record<string, string> = {
    safe: "CONFIANCE", watch: "SOUS SURVEILLANCE", alert: "PRESSION ÉLEVÉE", critical: "CRISE",
  };

  const productiveFabric    = state.productiveFabric ?? DEFAULT_PRODUCTIVE_FABRIC;
  const showFabricPanel     = shouldShowFabricPanel(productiveFabric);
  const fabricEntries: { key: string; label: string; value: number }[] = [
    { key: "sme",       label: "PME",                    value: productiveFabric.smeHealth },
    { key: "champions", label: "Champions industriels",  value: productiveFabric.industrialChampions },
    { key: "startups",  label: "Startups",               value: productiveFabric.startupEcosystem },
    { key: "local",     label: "Commerce local",         value: productiveFabric.localCommerce },
    { key: "strategic", label: "Industrie stratégique",  value: productiveFabric.strategicIndustry },
  ];
  const worstFabricValue = Math.min(...fabricEntries.map((e) => e.value));
  const worstFabricInfo  = getFabricBandInfo(worstFabricValue);

  const supplyChainSt    = state.supplyChain ?? DEFAULT_SUPPLY_CHAIN_STATE;
  const supplyAvgRisk    = computeOverallSupplyRisk(supplyChainSt);
  const supplyOverallInfo = getSupplyRiskBandInfo(supplyAvgRisk);
  const supplyRuptured   = SECTOR_IDS.filter((id) => supplyChainSt[id].disruptionRisk >= 80 && supplyChainSt[id].stockLevel < 30);
  const supplyVulnerable = SECTOR_IDS.filter((id) => supplyChainSt[id].disruptionRisk >= 56 && !supplyRuptured.includes(id));
  const showSupplyPanel  = supplyAvgRisk >= 35 || supplyRuptured.length >= 1;

  const activeEvent = activeModal ? NEWS_EVENT_MAP[activeModal] : null;

  return (
    <View style={styles.container}>
      <SectionBackdrop section="journal" intensity={0.45} />
      <ScreenHeader title="Journal de Crise" kicker="DESK PRÉSIDENTIEL" />

      {/* ── Accès aux salles dédiées (santé / météo) ───────────────────────── */}
      <View style={tabStyles.bar}>
        <Pressable
          onPress={() => router.push("/cellule-sante" as any)}
          style={({ pressed }) => [tabStyles.link, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="hospital-box-outline" size={14} color="#2fb8a6" />
          <Text style={tabStyles.linkText}>CELLULE SANTÉ</Text>
          {hasCriticalHealth && <View style={tabStyles.dot} />}
        </Pressable>
        <View style={tabStyles.linkDivider} />
        <Pressable
          onPress={() => router.push("/weather-room" as any)}
          style={({ pressed }) => [tabStyles.link, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="radar" size={14} color={PALETTE.info} />
          <Text style={tabStyles.linkText}>SALLE MÉTÉO</Text>
        </Pressable>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET JOURNAL — ticker + décisions + alertes + archives              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {(
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
                    <MaterialCommunityIcons name={typeMaterialIcon(event.type) as React.ComponentProps<typeof MaterialCommunityIcons>["name"]} size={13} color={urg} style={styles.urgentChipIcon} />
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

      {/* ── Chocs économiques actifs ─────────────────────────────────────────── */}
      {activeEconomicShocks.length > 0 && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#e54848" + "44" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="alert-octagon-outline" size={12} color="#e54848" />
            <Text style={[styles.waveTitle, { color: "#e54848" }]}>CHOCS ÉCONOMIQUES ACTIFS</Text>
            <View style={[styles.waveBadge, { backgroundColor: "#e5484822" }]}>
              <Text style={[styles.waveBadgeText, { color: "#e54848" }]}>
                {activeEconomicShocks.length} ACTIF{activeEconomicShocks.length > 1 ? "S" : ""}
              </Text>
            </View>
          </View>
          {activeEconomicShocks.map((shock) => {
            const meta = SHOCK_META[shock.type];
            const intensityColor = shock.intensity >= 60 ? "#e54848" : shock.intensity >= 35 ? "#e8864f" : "#e8c44f";
            return (
              <View key={shock.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 }}>
                <View style={[styles.waveBadge, { backgroundColor: meta.color + "22" }]}>
                  <Text style={[styles.waveBadgeText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                </View>
                <Text style={[styles.waveBadgeText, { color: intensityColor }]}>
                  Intensité <Text style={{ fontWeight: "bold" }}>{Math.round(shock.intensity)}</Text>
                </Text>
                <Text style={[styles.waveBadgeText, { color: "#888" }]}>
                  {shock.remainingDays}j restant{shock.remainingDays > 1 ? "s" : ""}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Balance commerciale ──────────────────────────────────────────────── */}
      {showTradePanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: tradeBalanceInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="swap-horizontal" size={12} color={tradeBalanceInfo.color} />
            <Text style={[styles.waveTitle, { color: tradeBalanceInfo.color }]}>BALANCE COMMERCIALE</Text>
            <View style={[styles.waveBadge, { backgroundColor: tradeBalanceInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: tradeBalanceInfo.color }]}>
                {tradeBalanceInfo.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.waveBadgeText, { color: tradeBalanceInfo.color, marginLeft: 4 }]}>
              {tradeBalanceValue > 0 ? "+" : ""}{Math.round(tradeBalanceValue)}
            </Text>
          </View>
          <Text style={styles.stormDesc}>{tradeBalanceInfo.message}</Text>
        </View>
      )}

      {/* ── Fracture sociale ─────────────────────────────────────────────────── */}
      {showInequalityPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: inequalityInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="scale-unbalanced" size={12} color={inequalityInfo.color} />
            <Text style={[styles.waveTitle, { color: inequalityInfo.color }]}>FRACTURE SOCIALE</Text>
            <View style={[styles.waveBadge, { backgroundColor: inequalityInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: inequalityInfo.color }]}>
                {inequalityInfo.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.waveBadgeText, { color: inequalityInfo.color, marginLeft: 4 }]}>
              {Math.round(inequalityValue)}
            </Text>
          </View>
          <Text style={styles.stormDesc}>{inequalityInfo.message}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Text style={[styles.waveBadgeText, { color: "#aaa" }]}>
              Inégalités <Text style={{ color: inequalityInfo.color }}>{Math.round(inequalityValue)}</Text>
            </Text>
            <Text style={[styles.waveBadgeText, { color: "#aaa" }]}>
              Mobilité sociale <Text style={{ color: socialMobilityValue >= 55 ? "#4caf82" : socialMobilityValue >= 35 ? "#e8c44f" : "#e54848" }}>{Math.round(socialMobilityValue)}</Text>
            </Text>
          </View>
        </View>
      )}

      {/* ── Tissu productif national ─────────────────────────────────────────── */}
      {showFabricPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: worstFabricInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="factory" size={12} color={worstFabricInfo.color} />
            <Text style={[styles.waveTitle, { color: worstFabricInfo.color }]}>TISSU PRODUCTIF</Text>
            <View style={[styles.waveBadge, { backgroundColor: worstFabricInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: worstFabricInfo.color }]}>
                {worstFabricInfo.label.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {fabricEntries.map((entry) => {
              const info = getFabricBandInfo(entry.value);
              return (
                <Text key={entry.key} style={[styles.waveBadgeText, { color: "#aaa" }]}>
                  {entry.label}{" "}
                  <Text style={{ color: info.color }}>{Math.round(entry.value)}</Text>
                </Text>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Économie informelle ──────────────────────────────────────────────── */}
      {showShadowPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: shadowEconomyInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="eye-off-outline" size={12} color={shadowEconomyInfo.color} />
            <Text style={[styles.waveTitle, { color: shadowEconomyInfo.color }]}>ÉCONOMIE INFORMELLE</Text>
            <View style={[styles.waveBadge, { backgroundColor: shadowEconomyInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: shadowEconomyInfo.color }]}>
                {shadowEconomyInfo.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.waveBadgeText, { color: shadowEconomyInfo.color, marginLeft: 4 }]}>
              {Math.round(shadowEconomyValue)}
            </Text>
          </View>
          <Text style={styles.stormDesc}>{shadowEconomyInfo.message}</Text>
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

      {/* ── Cycle économique national ─────────────────────────────────────────── */}
      {showCyclePanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: cycleMeta.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={12} color={cycleMeta.color} />
            <Text style={[styles.waveTitle, { color: cycleMeta.color }]}>CYCLE ÉCONOMIQUE</Text>
            <View style={[styles.waveBadge, { backgroundColor: cycleMeta.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: cycleMeta.color }]}>
                {cycleMeta.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.waveBadgeText, { color: cycleMeta.color, marginLeft: 4 }]}>
              Momentum {Math.round(cycleMomentumValue)}
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: PALETTE.panelEdge, borderRadius: 2, overflow: "hidden", marginTop: 6, marginBottom: 4 }}>
            <View style={{ height: "100%", width: `${Math.round(cycleMomentumValue)}%` as `${number}%`, backgroundColor: cycleMeta.color, borderRadius: 2 }} />
          </View>
          <Text style={styles.stormDesc}>{cycleMeta.description}</Text>
        </View>
      )}

      {/* ── Stagflation ───────────────────────────────────────────────────────── */}
      {showStagflPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: stagflationInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="alert-rhombus-outline" size={12} color={stagflationInfo.color} />
            <Text style={[styles.waveTitle, { color: stagflationInfo.color }]}>RISQUE STAGFLATION</Text>
            <View style={[styles.waveBadge, { backgroundColor: stagflationInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: stagflationInfo.color }]}>
                {stagflationInfo.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.waveBadgeText, { color: stagflationInfo.color, marginLeft: 4 }]}>
              {Math.round(stagflationValue)}
            </Text>
          </View>
          <Text style={styles.stormDesc}>{stagflationInfo.message}</Text>
        </View>
      )}

      {/* ── Banque centrale fictive ────────────────────────────────────────────── */}
      {showCbPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: cbCredInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="bank" size={12} color={cbCredInfo.color} />
            <Text style={[styles.waveTitle, { color: cbCredInfo.color }]}>BANQUE CENTRALE</Text>
            <View style={[styles.waveBadge, { backgroundColor: interestRateInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: interestRateInfo.color }]}>
                {interestRateInfo.label.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Text style={[styles.waveBadgeText, { color: "#94a3b8" }]}>
              Taux{" "}<Text style={{ color: interestRateInfo.color }}>{Math.round(interestRateValue)}</Text>
            </Text>
            <Text style={[styles.waveBadgeText, { color: "#94a3b8" }]}>
              Crédibilité{" "}<Text style={{ color: cbCredInfo.color }}>{Math.round(cbCredValue)}</Text>
            </Text>
            <Text style={[styles.waveBadgeText, { color: "#94a3b8" }]}>
              Tension{" "}<Text style={{ color: monetaryTensionValue >= 55 ? "#e54848" : monetaryTensionValue >= 35 ? "#e8864f" : "#4caf82" }}>{Math.round(monetaryTensionValue)}</Text>
            </Text>
          </View>
          <Text style={[styles.stormDesc, { marginTop: 3 }]}>
            <Text style={{ color: "#94a3b8" }}>Profil gouverneur : </Text>
            <Text style={{ color: cbProfile === "hawkish" ? "#e8864f" : cbProfile === "dovish" ? "#4caf82" : "#e8c44f" }}>
              {cbProfile === "hawkish" ? "Restrictif" : cbProfile === "dovish" ? "Accommodant" : "Équilibré"}
            </Text>
          </Text>
          <Text style={styles.stormDesc}>{cbCredInfo.message}</Text>
        </View>
      )}

      {/* ── Programmes budgétaires actifs ─────────────────────────────────────── */}
      {showFiscalProgramsPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: "#a78bfa33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={12} color="#a78bfa" />
            <Text style={[styles.waveTitle, { color: "#a78bfa" }]}>PROGRAMMES BUDGÉTAIRES</Text>
            <View style={[styles.waveBadge, { backgroundColor: "#a78bfa22" }]}>
              <Text style={[styles.waveBadgeText, { color: "#a78bfa" }]}>
                {activeFiscalPrograms.length} ACTIF{activeFiscalPrograms.length > 1 ? "S" : ""}
              </Text>
            </View>
          </View>
          <View style={{ gap: 4, marginTop: 4 }}>
            {activeFiscalPrograms.map((p) => {
              const isShort = p.shortDaysRemaining > 0;
              const days    = isShort ? p.shortDaysRemaining : p.longDaysRemaining;
              const phase   = isShort ? "Court terme" : "Long terme";
              const phaseColor = isShort ? "#4caf82" : "#4c9bbf";
              return (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.waveBadge, { backgroundColor: phaseColor + "22" }]}>
                    <Text style={[styles.waveBadgeText, { color: phaseColor }]}>{phase.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.waveBadgeText, { color: "#94a3b8", flex: 1 }]}>
                    {SPENDING_LABELS[p.type as SpendingType] ?? p.type}
                  </Text>
                  <Text style={[styles.waveBadgeText, { color: "#94a3b8" }]}>
                    Intensité <Text style={{ color: "#a78bfa" }}>{Math.round(p.intensity)}</Text>
                  </Text>
                  <Text style={[styles.waveBadgeText, { color: "#94a3b8" }]}>
                    {days}j
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Lanceurs d'alerte ──────────────────────────────────────────────────── */}
      {showWbPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: WB_RISK_COLOR[wbRiskLevel] + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="account-alert-outline" size={12} color={WB_RISK_COLOR[wbRiskLevel]} />
            <Text style={[styles.waveTitle, { color: WB_RISK_COLOR[wbRiskLevel] }]}>LANCEURS D'ALERTE</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={[styles.waveBadge, { backgroundColor: WB_RISK_COLOR[wbRiskLevel] + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: WB_RISK_COLOR[wbRiskLevel] }]}>
                  {WB_RISK_LABEL[wbRiskLevel]}
                </Text>
              </View>
              {activeWbAlerts.length > 0 && (
                <View style={[styles.waveBadge, { backgroundColor: "#e8864f22" }]}>
                  <Text style={[styles.waveBadgeText, { color: "#e8864f" }]}>
                    {activeWbAlerts.length} ALERTE{activeWbAlerts.length > 1 ? "S" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ gap: 8, marginTop: 8 }}>
            {activeWbAlerts.map((wb) => {
              const sevColor = getAlertSeverityColor(wb.severity);
              const sevLabel = getAlertSeverityLabel(wb.severity);
              const remaining = wb.expiresAfterActions - state.news.actionCount;
              const isOld = state.news.actionCount - wb.createdAtAction >= 8;

              return (
                <View key={wb.id} style={{ gap: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: PALETTE.panelEdge }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={11} color={sevColor} />
                    <Text style={[styles.waveBadgeText, { color: sevColor, flex: 1 }]}>
                      {getAlertTriggerLabel(wb.triggerType).toUpperCase()}
                    </Text>
                    <View style={[styles.waveBadge, { backgroundColor: sevColor + "22" }]}>
                      <Text style={[styles.waveBadgeText, { color: sevColor }]}>{sevLabel}</Text>
                    </View>
                    {isOld && (
                      <View style={[styles.waveBadge, { backgroundColor: "#e5484822" }]}>
                        <Text style={[styles.waveBadgeText, { color: "#e54848" }]}>URGENT</Text>
                      </View>
                    )}
                    <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>{remaining}a</Text>
                  </View>
                  <Text style={[styles.stormDesc, { marginBottom: 2 }]} numberOfLines={2}>{wb.description}</Text>
                  <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>
                    Pression politique : <Text style={{ color: wb.politicalPressure >= 70 ? "#e54848" : wb.politicalPressure >= 50 ? "#e8864f" : "#e8c44f" }}>{wb.politicalPressure}</Text>
                  </Text>

                  <View style={{ flexDirection: "row", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Protéger la source",
                          `Coût : ${PROTECT_COST_INFLUENCE} Influence\n\nRéduit whistleblowerRisk. ScandalRisk légèrement en hausse à court terme.`,
                          [
                            { text: "Annuler", style: "cancel" },
                            { text: "Protéger", onPress: () => {
                              const r = protectWhistleblower(wb.id);
                              if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                            }},
                          ],
                        );
                      }}
                      style={[styles.waveBadge, { backgroundColor: "#4caf8222", borderWidth: 1, borderColor: "#4caf8244", paddingVertical: 4, paddingHorizontal: 8 }]}
                    >
                      <Text style={[styles.waveBadgeText, { color: "#4caf82" }]}>Protéger — {PROTECT_COST_INFLUENCE} INF</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Ouvrir un audit interne",
                          `Coût : ${AUDIT_COST_INFLUENCE} Influence\n\nAudit formel — réduit legalRisk et auditPressure, renforce la stabilité institutionnelle.`,
                          [
                            { text: "Annuler", style: "cancel" },
                            { text: "Lancer l'audit", onPress: () => {
                              const r = launchWhistleblowerAudit(wb.id);
                              if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                            }},
                          ],
                        );
                      }}
                      style={[styles.waveBadge, { backgroundColor: "#4a9fff22", borderWidth: 1, borderColor: "#4a9fff44", paddingVertical: 4, paddingHorizontal: 8 }]}
                    >
                      <Text style={[styles.waveBadgeText, { color: "#4a9fff" }]}>Audit — {AUDIT_COST_INFLUENCE} INF</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Corriger discrètement",
                          `Coût : ${CORRECT_COST_MONEY} M€\n\nCorrection silencieuse — réduit corruptionExposure et whistleblowerRisk sans exposition publique.`,
                          [
                            { text: "Annuler", style: "cancel" },
                            { text: "Corriger", onPress: () => {
                              const r = correctWhistleblowerQuietly(wb.id);
                              if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                            }},
                          ],
                        );
                      }}
                      style={[styles.waveBadge, { backgroundColor: "#e8c44f22", borderWidth: 1, borderColor: "#e8c44f44", paddingVertical: 4, paddingHorizontal: 8 }]}
                    >
                      <Text style={[styles.waveBadgeText, { color: "#e8c44f" }]}>Corriger — {CORRECT_COST_MONEY} M€</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Autorités de contrôle indépendantes ───────────────────────────────── */}
      {showOversightPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: OVERSIGHT_RISK_COLOR[oversightRiskLevel] + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="gavel" size={12} color={OVERSIGHT_RISK_COLOR[oversightRiskLevel]} />
            <Text style={[styles.waveTitle, { color: OVERSIGHT_RISK_COLOR[oversightRiskLevel] }]}>AUTORITÉS DE CONTRÔLE</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={[styles.waveBadge, { backgroundColor: OVERSIGHT_RISK_COLOR[oversightRiskLevel] + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: OVERSIGHT_RISK_COLOR[oversightRiskLevel] }]}>
                  {OVERSIGHT_RISK_LABEL[oversightRiskLevel]}
                </Text>
              </View>
              {activeOversightInvs.length > 0 && (
                <View style={[styles.waveBadge, { backgroundColor: "#e8864f22" }]}>
                  <Text style={[styles.waveBadgeText, { color: "#e8864f" }]}>
                    {activeOversightInvs.length} ENQUÊTE{activeOversightInvs.length > 1 ? "S" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Grille de confiance des 6 autorités */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {AUTHORITY_IDS.map((id) => {
              const def   = OVERSIGHT_AUTHORITY_DEFS[id];
              const trust = oversightTrustMap[id] ?? 60;
              const color = getAuthorityTrustColor(trust);
              const hasInv = activeOversightInvs.some((i) => i.authorityId === id);
              return (
                <View key={id} style={{ width: "48%", gap: 3, padding: 6, backgroundColor: PALETTE.panelEdge + "33", borderRadius: 4, borderWidth: hasInv ? 1 : 0, borderColor: color + "66" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialCommunityIcons name={def.icon as never} size={10} color={color} />
                    <Text style={[styles.waveBadgeText, { color, flex: 1 }]} numberOfLines={1}>{def.abbreviation}</Text>
                    {hasInv && <View style={[styles.waveBadge, { backgroundColor: "#e8864f22", paddingHorizontal: 4 }]}>
                      <Text style={[styles.waveBadgeText, { color: "#e8864f", fontSize: 8 }]}>ENQUÊTE</Text>
                    </View>}
                  </View>
                  <View style={{ height: 3, backgroundColor: PALETTE.panelEdge, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ width: `${trust}%` as `${number}%`, height: "100%", backgroundColor: color, borderRadius: 2 }} />
                  </View>
                  <Text style={[styles.waveBadgeText, { color: PALETTE.textLow, fontSize: 9 }]} numberOfLines={1}>
                    {getAuthorityTrustLabel(trust)} — {trust}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Investigations actives */}
          {activeOversightInvs.length > 0 && (
            <View style={{ gap: 8, marginTop: 10 }}>
              {activeOversightInvs.map((inv) => {
                const def       = OVERSIGHT_AUTHORITY_DEFS[inv.authorityId];
                const pColor    = getPressureColor(inv.pressure);
                const pLabel    = getPressureLabel(inv.pressure);
                const remaining = inv.expiresAfterActions - state.news.actionCount;
                const isOld     = state.news.actionCount - inv.startedAtAction >= 10;
                const trust     = oversightTrustMap[inv.authorityId] ?? 60;

                return (
                  <View key={inv.id} style={{ gap: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: PALETTE.panelEdge }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <MaterialCommunityIcons name={def.icon as never} size={11} color={pColor} />
                      <Text style={[styles.waveBadgeText, { color: pColor, flex: 1 }]}>{def.abbreviation}</Text>
                      <View style={[styles.waveBadge, { backgroundColor: pColor + "22" }]}>
                        <Text style={[styles.waveBadgeText, { color: pColor }]}>PRESSION {pLabel}</Text>
                      </View>
                      {isOld && (
                        <View style={[styles.waveBadge, { backgroundColor: "#e5484822" }]}>
                          <Text style={[styles.waveBadgeText, { color: "#e54848" }]}>URGENT</Text>
                        </View>
                      )}
                      <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>{remaining}a</Text>
                    </View>
                    <Text style={[styles.stormDesc, { marginBottom: 2 }]} numberOfLines={2}>{inv.trigger}</Text>
                    <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>
                      Confiance : <Text style={{ color: getAuthorityTrustColor(trust) }}>{getAuthorityTrustLabel(trust)}</Text>
                      {trust < 45 && <Text style={{ color: "#e54848" }}>  — Contestation risquée</Text>}
                    </Text>

                    <View style={{ flexDirection: "row", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <Pressable
                        onPress={() => Alert.alert(
                          "Coopérer avec l'autorité",
                          `Coût : ${COOPERATE_COST_INFLUENCE} Influence\n\nRésout l'investigation. Confiance +8, stability +5, scandalRisk -5.`,
                          [
                            { text: "Annuler", style: "cancel" },
                            { text: "Coopérer", onPress: () => {
                              const r = oversightCooperate(inv.id);
                              if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                            }},
                          ],
                        )}
                        style={[styles.waveBadge, { backgroundColor: "#4caf8222", borderWidth: 1, borderColor: "#4caf8244", paddingVertical: 4, paddingHorizontal: 8 }]}
                      >
                        <Text style={[styles.waveBadgeText, { color: "#4caf82" }]}>Coopérer — {COOPERATE_COST_INFLUENCE} INF</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => Alert.alert(
                          "Fournir une justification",
                          `Coût : ${JUSTIFY_COST_INFLUENCE} Influence\n\nRéduit la pression sans clore l'enquête. legalRisk -5.`,
                          [
                            { text: "Annuler", style: "cancel" },
                            { text: "Justifier", onPress: () => {
                              const r = oversightJustify(inv.id);
                              if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                            }},
                          ],
                        )}
                        style={[styles.waveBadge, { backgroundColor: "#4a9fff22", borderWidth: 1, borderColor: "#4a9fff44", paddingVertical: 4, paddingHorizontal: 8 }]}
                      >
                        <Text style={[styles.waveBadgeText, { color: "#4a9fff" }]}>Justifier — {JUSTIFY_COST_INFLUENCE} INF</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => Alert.alert(
                          trust < 45 ? "Contester — RISQUÉ" : "Contester l'autorité",
                          trust < 45
                            ? `Coût : ${CONTEST_COST_INFLUENCE} Influence\n\nLa confiance est basse (${trust}). Contester augmentera la pression et aggravera la situation.`
                            : `Coût : ${CONTEST_COST_INFLUENCE} Influence\n\nChallenge la procédure. Pression -10, mediaMood +2, mais confiance -3.`,
                          [
                            { text: "Annuler", style: "cancel" },
                            { text: trust < 45 ? "Contester quand même" : "Contester", onPress: () => {
                              const r = oversightContest(inv.id);
                              if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                            }},
                          ],
                        )}
                        style={[styles.waveBadge, { backgroundColor: "#e8c44f22", borderWidth: 1, borderColor: "#e8c44f44", paddingVertical: 4, paddingHorizontal: 8 }]}
                      >
                        <Text style={[styles.waveBadgeText, { color: "#e8c44f" }]}>Contester — {CONTEST_COST_INFLUENCE} INF</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── Intégrité des marchés publics ──────────────────────────────────────── */}
      {showProcurPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: procurementInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="handshake-outline" size={12} color={procurementInfo.color} />
            <Text style={[styles.waveTitle, { color: procurementInfo.color }]}>MARCHÉS PUBLICS</Text>
            <View style={[styles.waveBadge, { backgroundColor: procurementInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: procurementInfo.color }]}>
                {procurementInfo.label.toUpperCase()}
              </Text>
            </View>
          </View>
          {/* Barre intégrité */}
          <View style={{ marginTop: 8, marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={[styles.waveBadgeText, { color: PALETTE.textMid }]}>Intégrité des marchés</Text>
              <Text style={[styles.waveBadgeText, { color: procurementInfo.color }]}>{procurement.procurementIntegrity} / 100</Text>
            </View>
            <View style={{ height: 5, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${procurement.procurementIntegrity}%` as `${number}%`, height: "100%", backgroundColor: procurementInfo.color, borderRadius: 3 }} />
            </View>
          </View>
          <Text style={[styles.stormDesc, { marginBottom: 6 }]}>{procurementInfo.message}</Text>
          {/* Indicateurs secondaires */}
          <View style={{ gap: 3 }}>
            {procurement.vendorConcentration >= 45 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Concentration fournisseurs</Text>
                <Text style={[styles.waveBadgeText, { color: procurement.vendorConcentration >= 70 ? "#e54848" : "#e8864f" }]}>{procurement.vendorConcentration}</Text>
              </View>
            )}
            {procurement.conflictOfInterestRisk >= 35 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Risque conflits d'intérêts</Text>
                <Text style={[styles.waveBadgeText, { color: procurement.conflictOfInterestRisk >= 65 ? "#e54848" : "#e8864f" }]}>{procurement.conflictOfInterestRisk}</Text>
              </View>
            )}
            {procurement.deliveryReliability < 55 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Fiabilité de livraison</Text>
                <Text style={[styles.waveBadgeText, { color: procurement.deliveryReliability < 35 ? "#e54848" : "#e8c44f" }]}>{procurement.deliveryReliability}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Conformité de l'État ───────────────────────────────────────────────── */}
      {showCompliancePanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: complianceInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="shield-check-outline" size={12} color={complianceInfo.color} />
            <Text style={[styles.waveTitle, { color: complianceInfo.color }]}>CONFORMITÉ DE L'ÉTAT</Text>
            <View style={[styles.waveBadge, { backgroundColor: complianceInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: complianceInfo.color }]}>
                {complianceInfo.label.toUpperCase()}
              </Text>
            </View>
          </View>
          {/* Barre de score global */}
          <View style={{ marginTop: 8, marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={[styles.waveBadgeText, { color: PALETTE.textMid }]}>Score de conformité</Text>
              <Text style={[styles.waveBadgeText, { color: complianceInfo.color }]}>{compliance.complianceScore} / 100</Text>
            </View>
            <View style={{ height: 5, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${compliance.complianceScore}%` as `${number}%`, height: "100%", backgroundColor: complianceInfo.color, borderRadius: 3 }} />
            </View>
          </View>
          <Text style={[styles.stormDesc, { marginBottom: 6 }]}>{complianceInfo.message}</Text>
          {/* Indicateurs secondaires */}
          <View style={{ gap: 3 }}>
            {compliance.legalRisk >= 40 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Risque juridique</Text>
                <Text style={[styles.waveBadgeText, { color: compliance.legalRisk >= 60 ? "#e54848" : "#e8864f" }]}>{compliance.legalRisk}</Text>
              </View>
            )}
            {compliance.auditPressure >= 40 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Pression d'audit</Text>
                <Text style={[styles.waveBadgeText, { color: compliance.auditPressure >= 65 ? "#e54848" : "#e8864f" }]}>{compliance.auditPressure}</Text>
              </View>
            )}
            {compliance.corruptionExposure >= 35 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Exposition à la corruption</Text>
                <Text style={[styles.waveBadgeText, { color: compliance.corruptionExposure >= 60 ? "#e54848" : "#e8864f" }]}>{compliance.corruptionExposure}</Text>
              </View>
            )}
            {compliance.whistleblowerRisk >= 45 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Risque lanceur d'alerte</Text>
                <Text style={[styles.waveBadgeText, { color: compliance.whistleblowerRisk >= 70 ? "#e54848" : "#e8c44f" }]}>{compliance.whistleblowerRisk}</Text>
              </View>
            )}
            {compliance.emergencyPowersAbuse >= 40 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Dérive pouvoirs d'urgence</Text>
                <Text style={[styles.waveBadgeText, { color: compliance.emergencyPowersAbuse >= 60 ? "#e8864f" : "#e8c44f" }]}>{compliance.emergencyPowersAbuse}</Text>
              </View>
            )}
            {compliance.procurementIntegrity < 55 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Intégrité marchés publics</Text>
                <Text style={[styles.waveBadgeText, { color: compliance.procurementIntegrity < 35 ? "#e54848" : "#e8864f" }]}>{compliance.procurementIntegrity}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Registre des Dérogations d'Urgence ────────────────────────────────── */}
      {showDerogPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: DEROG_RISK_COLOR[derogRiskLevel] + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="file-document-alert-outline" size={12} color={DEROG_RISK_COLOR[derogRiskLevel]} />
            <Text style={[styles.waveTitle, { color: DEROG_RISK_COLOR[derogRiskLevel] }]}>DÉROGATIONS D'URGENCE</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={[styles.waveBadge, { backgroundColor: DEROG_RISK_COLOR[derogRiskLevel] + "22" }]}>
                <Text style={[styles.waveBadgeText, { color: DEROG_RISK_COLOR[derogRiskLevel] }]}>
                  {DEROG_RISK_LABEL[derogRiskLevel]}
                </Text>
              </View>
              {unreviewedDerogs.length > 0 && (
                <View style={[styles.waveBadge, { backgroundColor: "#e8864f22" }]}>
                  <Text style={[styles.waveBadgeText, { color: "#e8864f" }]}>
                    {unreviewedDerogs.length} NON TRAITÉE{unreviewedDerogs.length > 1 ? "S" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ gap: 8, marginTop: 8 }}>
            {activeDerogations.map((d) => {
              const def = DEROGATION_DEFS[d.type];
              const statusColor = d.reviewed ? "#4caf82" : d.ignored ? "#94a3b8" : def.color;
              const statusLabel = d.reviewed ? "AUDITÉ" : d.ignored ? "IGNORÉ" : "EN ATTENTE";
              const remaining  = d.expiresAfterActions - state.news.actionCount;

              return (
                <View key={d.id} style={{ gap: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: PALETTE.panelEdge }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialCommunityIcons name={def.icon as any} size={11} color={statusColor} />
                    <Text style={[styles.waveBadgeText, { color: statusColor, flex: 1 }]}>{def.label.toUpperCase()}</Text>
                    <View style={[styles.waveBadge, { backgroundColor: statusColor + "22" }]}>
                      <Text style={[styles.waveBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>{remaining}a</Text>
                  </View>
                  <Text style={[styles.stormDesc, { marginBottom: 2 }]} numberOfLines={2}>{d.reason}</Text>
                  <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>
                    Risque juridique : <Text style={{ color: d.legalRisk >= 60 ? "#e54848" : d.legalRisk >= 40 ? "#e8864f" : "#e8c44f" }}>{d.legalRisk}</Text>
                    {"  ·  "}Avantage : <Text style={{ color: "#4caf82" }}>{d.benefit.split(".")[0]}</Text>
                  </Text>

                  {!d.reviewed && !d.ignored && (
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Justifier la dérogation",
                            `Coût : ${DEROGATION_JUSTIFY_COST_INFLUENCE} Influence\n\nRéduit le risque juridique de cette dérogation.`,
                            [
                              { text: "Annuler", style: "cancel" },
                              { text: "Justifier", onPress: () => {
                                const r = justifyDerogation(d.id);
                                if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                              }},
                            ],
                          );
                        }}
                        style={[styles.waveBadge, { backgroundColor: "#4a9fff22", borderWidth: 1, borderColor: "#4a9fff44", paddingVertical: 4, paddingHorizontal: 8 }]}
                      >
                        <Text style={[styles.waveBadgeText, { color: "#4a9fff" }]}>Justifier — {DEROGATION_JUSTIFY_COST_INFLUENCE} INF</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Auditer la dérogation",
                            `Coût : ${DEROGATION_AUDIT_COST_MONEY} M€ · ${DEROGATION_AUDIT_COST_INFLUENCE} Influence\n\nAudit complet — marque la dérogation comme conforme, réduit fortement le risque.`,
                            [
                              { text: "Annuler", style: "cancel" },
                              { text: "Auditer", onPress: () => {
                                const r = auditDerogation(d.id);
                                if (!r.success) Alert.alert("Impossible", r.reason ?? "Ressources insuffisantes.", [{ text: "OK" }]);
                              }},
                            ],
                          );
                        }}
                        style={[styles.waveBadge, { backgroundColor: "#4caf8222", borderWidth: 1, borderColor: "#4caf8244", paddingVertical: 4, paddingHorizontal: 8 }]}
                      >
                        <Text style={[styles.waveBadgeText, { color: "#4caf82" }]}>Auditer — {DEROGATION_AUDIT_COST_MONEY} M€</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Ignorer la dérogation ?",
                            "La dérogation reste active mais disparaît de la liste d'action. Le risque juridique persiste jusqu'à expiration.",
                            [
                              { text: "Annuler", style: "cancel" },
                              { text: "Ignorer", style: "destructive", onPress: () => ignoreDerogation(d.id) },
                            ],
                          );
                        }}
                        style={[styles.waveBadge, { backgroundColor: "#94a3b822", borderWidth: 1, borderColor: "#94a3b844", paddingVertical: 4, paddingHorizontal: 8 }]}
                      >
                        <Text style={[styles.waveBadgeText, { color: "#94a3b8" }]}>Ignorer</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* GOUVERNANCE IA GOUVERNEMENTALE */}
      {showAiPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: aiRiskInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="robot-outline" size={12} color={aiRiskInfo.color} />
            <Text style={[styles.waveTitle, { color: aiRiskInfo.color }]}>GOUVERNANCE IA D'ÉTAT</Text>
            <View style={[styles.waveBadge, { backgroundColor: aiRiskInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: aiRiskInfo.color }]}>{aiRiskInfo.label.toUpperCase()}</Text>
            </View>
          </View>

          {/* Barre de risque global */}
          <View style={{ marginTop: 8, marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={[styles.waveBadgeText, { color: PALETTE.textMid }]}>Score de risque algorithmique</Text>
              <Text style={[styles.waveBadgeText, { color: aiRiskInfo.color }]}>{aiRiskScore} / 100</Text>
            </View>
            <View style={{ height: 5, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${aiRiskScore}%` as `${number}%`, height: "100%", backgroundColor: aiRiskInfo.color, borderRadius: 3 }} />
            </View>
          </View>

          <Text style={[styles.stormDesc, { marginBottom: 8 }]}>{aiRiskInfo.description}</Text>

          {/* Indicateurs */}
          <View style={{ gap: 3, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Transparence</Text>
              <Text style={[styles.waveBadgeText, { color: aiState.aiTransparency >= 50 ? "#4caf82" : aiState.aiTransparency >= 30 ? "#e8c44f" : "#e54848" }]}>
                {getAITransparencyLabel(aiState.aiTransparency)} ({aiState.aiTransparency})
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Supervision humaine</Text>
              <Text style={[styles.waveBadgeText, { color: aiState.humanOversight >= 60 ? "#4caf82" : aiState.humanOversight >= 40 ? "#e8c44f" : "#e54848" }]}>
                {getOversightLabel(aiState.humanOversight)} ({aiState.humanOversight})
              </Text>
            </View>
            {aiState.automationAbuseRisk >= 30 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Risque abus auto.</Text>
                <Text style={[styles.waveBadgeText, { color: aiState.automationAbuseRisk >= 60 ? "#e54848" : "#e8864f" }]}>
                  {aiState.automationAbuseRisk}
                </Text>
              </View>
            )}
            {aiState.hiddenErrors > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.waveBadgeText, { color: PALETTE.textLow }]}>Erreurs dissimulées</Text>
                <Text style={[styles.waveBadgeText, { color: "#e54848" }]}>{aiState.hiddenErrors}</Text>
              </View>
            )}
          </View>

          {/* Systèmes actifs */}
          {aiState.activeDeployments.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
              {aiState.activeDeployments.map((dep) => (
                <View key={dep} style={[styles.waveBadge, { backgroundColor: "#4a9fff18" }]}>
                  <Text style={[styles.waveBadgeText, { color: "#4a9fff" }]}>
                    {AI_DEPLOYMENT_LABELS[dep]}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* PROGRAMME ANTI-CORRUPTION */}
      {showAcPanel && !lowLoad && (
        <View style={[styles.waveBlock, { marginHorizontal: hPad, borderColor: acLevelInfo.color + "33" }]}>
          <View style={styles.waveHeader}>
            <MaterialCommunityIcons name="shield-search" size={12} color={acLevelInfo.color} />
            <Text style={[styles.waveTitle, { color: acLevelInfo.color }]}>PROGRAMME ANTI-CORRUPTION</Text>
            <View style={[styles.waveBadge, { backgroundColor: acLevelInfo.color + "22" }]}>
              <Text style={[styles.waveBadgeText, { color: acLevelInfo.color }]}>{acLevelInfo.label.toUpperCase()}</Text>
            </View>
          </View>

          {/* Barre d'efficacité */}
          <View style={{ marginTop: 8, marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={[styles.waveBadgeText, { color: PALETTE.textMid }]}>Efficacité du programme</Text>
              <Text style={[styles.waveBadgeText, { color: acLevelInfo.color }]}>{acLevelInfo.efficiency}%</Text>
            </View>
            <View style={{ height: 5, backgroundColor: PALETTE.panelEdge, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${acLevelInfo.efficiency}%` as `${number}%`, height: "100%", backgroundColor: acLevelInfo.color, borderRadius: 3 }} />
            </View>
          </View>

          <Text style={[styles.stormDesc, { marginBottom: 8 }]}>{acLevelInfo.description}</Text>

          {/* Phase initiale renforcé */}
          {acInitialPhase && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <MaterialCommunityIcons name="alert-outline" size={11} color="#e8c44f" />
              <Text style={[styles.waveBadgeText, { color: "#e8c44f" }]}>
                Phase de révélation initiale — J+{state.mandateDay - acState.launchedAtDay}/15
              </Text>
            </View>
          )}

          {/* Compteurs */}
          {(acState.revealedCount > 0 || acState.allyExposures > 0) && (
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {acState.revealedCount > 0 && (
                <View style={[styles.waveBadge, { backgroundColor: "#e8c44f22" }]}>
                  <Text style={[styles.waveBadgeText, { color: "#e8c44f" }]}>
                    {acState.revealedCount} irrégularité{acState.revealedCount > 1 ? "s" : ""} révélée{acState.revealedCount > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
              {acState.allyExposures > 0 && (
                <View style={[styles.waveBadge, { backgroundColor: "#a78bfa22" }]}>
                  <Text style={[styles.waveBadgeText, { color: "#a78bfa" }]}>
                    {acState.allyExposures} allié{acState.allyExposures > 1 ? "s" : ""} exposé{acState.allyExposures > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Sélecteur de niveau */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(LEVEL_ORDER as AntiCorruptionLevel[]).filter((l) => l !== "absent").map((lvl) => {
              const info    = getLevelInfo(lvl);
              const cost    = UPGRADE_COSTS[lvl];
              const current = acState.level === lvl;
              const canUp   = LEVEL_ORDER.indexOf(lvl) > LEVEL_ORDER.indexOf(acState.level);
              const canDown = LEVEL_ORDER.indexOf(lvl) < LEVEL_ORDER.indexOf(acState.level);
              if (!current && !canUp && !canDown) return null;
              return (
                <Pressable
                  key={lvl}
                  onPress={() => {
                    if (current) return;
                    const msg = canDown
                      ? `Rétrograder vers "${LEVEL_LABELS[lvl]}" ? Cela réduira la crédibilité institutionnelle.`
                      : `Passer au niveau "${LEVEL_LABELS[lvl]}" ? Coût : ${cost?.influence ?? 0} influence${cost?.money ? ` + ${cost.money} budget` : ""}.`;
                    Alert.alert("Programme anti-corruption", msg, [
                      { text: "Annuler", style: "cancel" },
                      { text: "Confirmer", onPress: () => setAntiCorruptionLevel(lvl) },
                    ]);
                  }}
                  style={[
                    styles.waveBadge,
                    {
                      backgroundColor: current ? info.color + "33" : "#ffffff0a",
                      borderWidth: 1,
                      borderColor: current ? info.color : "#ffffff18",
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                    },
                  ]}
                >
                  <Text style={[styles.waveBadgeText, { color: current ? info.color : PALETTE.textMid }]}>
                    {current ? "▶ " : ""}{LEVEL_LABELS[lvl]}
                    {!current && cost && canUp ? ` (${cost.influence}inf${cost.money ? `+${cost.money}€` : ""})` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
    backgroundColor: "transparent",
  },
  link: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 7,
  },
  linkText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: PALETTE.textMid,
    letterSpacing: 1.2,
  },
  linkDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: PALETTE.panelEdge,
    marginVertical: 6,
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
