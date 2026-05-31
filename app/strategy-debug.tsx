import React, { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { BUILDINGS } from "@/data/buildings";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { RESOURCE_ICONS, RESOURCE_LABELS } from "@/types/strategy";
import type { ResourceKey } from "@/types/strategy";
import { DEFAULT_COMPLIANCE_STATE } from "@/logic/complianceEngine";
import { queueNews } from "@/logic/newsEngine";

// Dev-only balancing dashboard — never rendered in prod (__DEV__ gate).
// Access: discrete ⚙ button in nation.tsx header, only visible in __DEV__.

const RESOURCE_MAX: Record<ResourceKey, number> = {
  money:        5000,
  influence:    300,
  energy:       300,
  intelligence: 200,
  technology:   200,
  military:     200,
  cyberDefense: 200,
};

const INDICATOR_LABELS: Record<string, string> = {
  popularity:   "Popularité",
  economy:      "Économie",
  security:     "Sécurité",
  ecology:      "Écologie",
  cohesion:     "Cohésion",
  publicBudget: "Budget public",
};

const HIDDEN_LABELS: Record<string, string> = {
  eliteTrust:              "Confiance élites",
  scandalRisk:             "Risque scandale",
  mediaMood:               "Humeur médias",
  popularFatigue:          "Fatigue populaire",
  regionalTension:         "Tension régionale",
  institutionalStability:  "Stabilité institutionnelle",
};

function resourceColor(key: ResourceKey, value: number): string {
  const ratio = value / RESOURCE_MAX[key];
  if (ratio >= 0.4) return "#3fbe7a";
  if (ratio >= 0.15) return PALETTE.gold;
  return PALETTE.danger;
}

function indicatorColor(key: string, value: number): string {
  if (key === "publicBudget") {
    if (value >= 0) return "#3fbe7a";
    if (value >= -80) return PALETTE.gold;
    return PALETTE.danger;
  }
  if (value >= 55) return "#3fbe7a";
  if (value >= 30) return PALETTE.gold;
  return PALETTE.danger;
}

function hiddenColor(key: string, value: number): string {
  const highIsBad = ["scandalRisk", "popularFatigue", "regionalTension"].includes(key);
  if (highIsBad) {
    if (value >= 65) return PALETTE.danger;
    if (value >= 40) return PALETTE.gold;
    return "#3fbe7a";
  }
  if (value >= 55) return "#3fbe7a";
  if (value >= 35) return PALETTE.gold;
  return PALETTE.danger;
}

export default function StrategyDebugScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, startNewGame, applySandboxMutation, isSandboxActive, enableSandboxMode, disableSandboxMode } = useStrategy();

  useEffect(() => {
    if (!__DEV__) router.replace("/nation");
  }, [router]);

  if (!__DEV__ || !state) return null;

  const handleReset = () => {
    Alert.alert(
      "Réinitialiser la partie",
      `Tout sera effacé (ressources, bâtiments, recherches, opérations). Le nom "${state.playerName}" et la doctrine "${state.governanceDoctrine}" seront conservés. Continuer ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: () => {
            startNewGame(state.playerName, state.governanceDoctrine);
            router.replace("/nation");
          },
        },
      ],
    );
  }

  const rank = state.ranking.findIndex((r) => r.id === "player") + 1;
  const totalOps = state.stats.totalOperations;
  const opsWon = state.stats.operationsWon;
  const opsLost = totalOps - opsWon;
  const winRatio = totalOps > 0 ? Math.round((opsWon / totalOps) * 100) : 0;
  const buildingsUpgrading = state.buildings.filter((b) => b.upgradeEndTime !== null);
  const research = state.strategyResearch;
  const completedCount = research?.completed.length ?? 0;
  const notStartedCount = 15 - completedCount - (research?.inProgress ? 1 : 0);
  const indicatorValues = Object.values(state.nationalIndicators);
  const avgIndicator = Math.round(indicatorValues.reduce((a, b) => a + b, 0) / indicatorValues.length);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={PALETTE.textHigh} />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="bug-outline" size={13} color="#a78bfa" />
          <Text style={styles.headerTitle}>STRATEGY DEBUG · DEV ONLY</Text>
        </View>
        <View style={{ width: 18 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.banner, isSandboxActive && { backgroundColor: "#7c3aed22", borderColor: "#7c3aed55" }]}>
          <Text style={styles.bannerText}>
            {isSandboxActive ? "⚡ SANDBOX ACTIF" : "Lecture seule"} · Jour {state.mandateDay} · Moy. jauges : {avgIndicator}/100
          </Text>
          <Pressable
            onPress={() => isSandboxActive ? disableSandboxMode() : enableSandboxMode()}
            style={({ pressed }) => [sandboxStyles.toggleBtn, isSandboxActive && sandboxStyles.toggleBtnActive, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[sandboxStyles.toggleBtnText, isSandboxActive && sandboxStyles.toggleBtnTextActive]}>
              {isSandboxActive ? "DÉSACTIVER" : "ACTIVER SANDBOX"}
            </Text>
          </Pressable>
        </View>

        {/* Reset */}
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="restore" size={14} color={PALETTE.danger} />
          <Text style={styles.resetBtnText}>Réinitialiser la partie</Text>
        </Pressable>

        {/* 1. Snapshot */}
        <Section label="SNAPSHOT">
          <Row label="Rang mondial" value={`${rank} / ${state.ranking.length}`} color={rank <= 5 ? "#3fbe7a" : rank <= 10 ? PALETTE.gold : PALETTE.danger} />
          <Row label="Puissance mondiale" value={`${state.stats.globalPower}`} />
          <Row label="Jour mandat" value={`${state.mandateDay}`} />
          <Row label="Saison" value={`${state.stats.season}`} />
          <Row label="Doctrine" value={state.governanceDoctrine} />
          <Row label="Opposition" value={`${state.oppositionPower}/100`} color={state.oppositionPower >= 65 ? PALETTE.danger : state.oppositionPower <= 30 ? "#3fbe7a" : PALETTE.gold} />
          <Row label="Dette nationale" value={`${state.nationalDebt}`} color={state.nationalDebt > 350 ? PALETTE.danger : state.nationalDebt > 200 ? PALETTE.gold : "#3fbe7a"} />
        </Section>

        {/* 2. Ressources */}
        <Section label="RESSOURCES ACTUELLES">
          {(Object.keys(state.resources) as ResourceKey[]).map((key) => {
            const val = state.resources[key];
            const color = resourceColor(key, val);
            const barPct = Math.min(100, Math.round((val / RESOURCE_MAX[key]) * 100));
            return (
              <View key={key} style={styles.resourceRow}>
                <Text style={styles.resourceIcon}>{RESOURCE_ICONS[key]}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.resourceTop}>
                    <Text style={styles.rowLabel}>{RESOURCE_LABELS[key]}</Text>
                    <Text style={[styles.rowValue, { color }]}>{val}</Text>
                  </View>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${barPct}%` as `${number}%`, backgroundColor: color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </Section>

        {/* 3. Bâtiments */}
        <Section label="BÂTIMENTS">
          <Row label="Total" value={`${state.buildings.length}`} />
          <Row label="Niveaux cumulés" value={`${state.buildings.reduce((a, b) => a + b.level, 0)}`} />
          <Row
            label="En chantier"
            value={`${buildingsUpgrading.length}`}
            color={buildingsUpgrading.length > 0 ? PALETTE.gold : undefined}
          />
          {buildingsUpgrading.map((b) => (
            <Row
              key={b.id}
              label={`  ↳ ${BUILDINGS[b.id]?.name ?? b.id}`}
              value={`Niv. ${b.level} → ${b.level + 1}`}
              color={PALETTE.gold}
            />
          ))}
        </Section>

        {/* 4. Recherches */}
        <Section label="RECHERCHE STRATÉGIQUE">
          <Row label="Terminées" value={`${completedCount} / 15`} color={completedCount === 15 ? "#3fbe7a" : undefined} />
          <Row
            label="En cours"
            value={research?.inProgress ? (STRATEGY_RESEARCH[research.inProgress.id]?.name ?? research.inProgress.id) : "Aucune"}
            color={research?.inProgress ? PALETTE.gold : undefined}
          />
          <Row label="Non démarrées" value={`${notStartedCount}`} />
        </Section>

        {/* 5. Opérations */}
        <Section label="OPÉRATIONS">
          <Row label="Total lancées" value={`${totalOps}`} />
          <Row label="Réussies" value={`${opsWon}`} color="#3fbe7a" />
          <Row label="Ratées" value={`${opsLost}`} color={opsLost > opsWon ? PALETTE.danger : undefined} />
          <Row
            label="Ratio succès"
            value={totalOps > 0 ? `${winRatio}%` : "—"}
            color={winRatio >= 60 ? "#3fbe7a" : winRatio >= 40 ? PALETTE.gold : PALETTE.danger}
          />
        </Section>

        {/* 6. Journal de Crise */}
        <Section label="JOURNAL DE CRISE">
          <Row label="Événements déclenchés" value={`${state.news.log.length}`} />
          <Row label="Non lus" value={`${state.news.unreadCount}`} color={state.news.unreadCount > 0 ? PALETTE.gold : undefined} />
          <Row label="En attente d'interaction" value={`${state.news.pendingIds.length}`} color={state.news.pendingIds.length > 0 ? PALETTE.gold : undefined} />
          <Row
            label="Conséquences différées"
            value={`${state.delayedConsequences.length}`}
            color={state.delayedConsequences.length > 3 ? PALETTE.danger : state.delayedConsequences.length > 0 ? PALETTE.gold : undefined}
          />
        </Section>

        {/* 7. Jauges nationales */}
        <Section label="JAUGES NATIONALES">
          {(Object.entries(state.nationalIndicators) as [string, number][]).map(([key, val]) => {
            const color = indicatorColor(key, val);
            const barPct = key === "publicBudget"
              ? Math.max(0, Math.min(100, Math.round(((val + 150) / 250) * 100)))
              : Math.max(0, Math.min(100, val));
            return (
              <View key={key} style={styles.indicatorRow}>
                <View style={styles.indicatorTop}>
                  <Text style={styles.rowLabel}>{INDICATOR_LABELS[key] ?? key}</Text>
                  <Text style={[styles.rowValue, { color }]}>{val}</Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${barPct}%` as `${number}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </Section>

        {/* 8. Risques cachés */}
        <Section label="POLITIQUES CACHÉES">
          {(Object.entries(state.hiddenPolitics) as [string, number][]).map(([key, val]) => {
            const color = hiddenColor(key, val);
            return (
              <View key={key} style={styles.indicatorRow}>
                <View style={styles.indicatorTop}>
                  <Text style={styles.rowLabel}>{HIDDEN_LABELS[key] ?? key}</Text>
                  <Text style={[styles.rowValue, { color }]}>{val}</Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${val}%` as `${number}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </Section>

        {/* ── CONFORMITÉ ── */}
        <Section label="CONFORMITÉ DE L'ÉTAT">
          {(() => {
            const cs = state.complianceState ?? DEFAULT_COMPLIANCE_STATE;
            const abuse = state.abuseOfPowerState;
            const ag = state.aiGovernanceState;
            const fields: { key: string; label: string; val: number; step: number;
              setter: (v: number) => void }[] = [
              { key: "complianceScore",      label: "Score conformité",     val: cs.complianceScore,      step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, complianceState: { ...(s.complianceState ?? DEFAULT_COMPLIANCE_STATE), complianceScore: v } })) },
              { key: "legalRisk",            label: "Risque juridique",     val: cs.legalRisk,            step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, complianceState: { ...(s.complianceState ?? DEFAULT_COMPLIANCE_STATE), legalRisk: v } })) },
              { key: "auditPressure",        label: "Pression d'audit",     val: cs.auditPressure,        step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, complianceState: { ...(s.complianceState ?? DEFAULT_COMPLIANCE_STATE), auditPressure: v } })) },
              { key: "corruptionExposure",   label: "Exposition corruption", val: cs.corruptionExposure,  step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, complianceState: { ...(s.complianceState ?? DEFAULT_COMPLIANCE_STATE), corruptionExposure: v } })) },
              { key: "emergencyPowersAbuse", label: "Abus pouvoirs urgence", val: cs.emergencyPowersAbuse, step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, complianceState: { ...(s.complianceState ?? DEFAULT_COMPLIANCE_STATE), emergencyPowersAbuse: v } })) },
              { key: "whistleblowerRisk",    label: "Risque lanceurs",      val: cs.whistleblowerRisk,    step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, complianceState: { ...(s.complianceState ?? DEFAULT_COMPLIANCE_STATE), whistleblowerRisk: v } })) },
              { key: "abuseIndex",           label: "Indice abus pouvoir",  val: abuse?.index ?? 0,       step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, abuseOfPowerState: { ...(s.abuseOfPowerState ?? { index: 5, lastDeriveAt: -999 }), index: v } })) },
              { key: "aiRisk",               label: "Risque IA gouvern.",   val: ag?.algorithmicRisk ?? 0, step: 5,
                setter: (v) => applySandboxMutation((s) => ({ ...s, aiGovernanceState: { ...(s.aiGovernanceState ?? { aiTransparency: 30, humanOversight: 60, algorithmicRisk: 10, publicTrustAI: 55, automationAbuseRisk: 5, lastEventAt: 0, activeDeployments: [], hiddenErrors: 0 }), algorithmicRisk: v } })) },
            ];
            return fields.map(({ key, label, val, step, setter }) => (
              <View key={key} style={sandboxStyles.fieldRow}>
                <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
                <Text style={[styles.rowValue, { width: 32, textAlign: "center" }]}>{val}</Text>
                {isSandboxActive && (
                  <View style={sandboxStyles.stepper}>
                    <Pressable style={sandboxStyles.stepBtn} onPress={() => setter(Math.max(0, val - step))}>
                      <Text style={sandboxStyles.stepBtnText}>−</Text>
                    </Pressable>
                    <Pressable style={sandboxStyles.stepBtn} onPress={() => setter(Math.min(100, val + step))}>
                      <Text style={sandboxStyles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ));
          })()}
        </Section>

        {/* ── ÉVÉNEMENTS CONFORMITÉ ── */}
        <Section label="FORCER ÉVÉNEMENT CONFORMITÉ">
          {isSandboxActive ? (
            <View style={sandboxStyles.eventsGrid}>
              {([
                { id: "abuse_concern_oversight",    label: "Inquiétude contre-pouvoirs",         color: "#e8c44f" },
                { id: "abuse_crisis_institutions",  label: "Crise institutionnelle",             color: "#e8864f" },
                { id: "abuse_derive_du_pouvoir",    label: "Dérive du pouvoir ⚠️",               color: "#e54848" },
                { id: "acep_audit_revelation",      label: "Audit révèle irrégularités",         color: "#4a9fff" },
                { id: "acep_ally_exposure",         label: "Allié exposé (prog. indépendant)",   color: "#a78bfa" },
                { id: "ai_deploy_notification",     label: "Déploiement IA administrative",      color: "#4a9fff" },
                { id: "ai_error_hidden",            label: "Erreur algorithmique détectée",      color: "#e8864f" },
                { id: "ai_crisis_drift",            label: "Dérive algorithmique systémique ⚠️", color: "#e54848" },
                { id: "ai_social_scoring",          label: "Scoring citoyen révélé ⚠️",          color: "#e54848" },
                { id: "oversight_haip_inquiry",     label: "Enquête HAIP",                       color: "#e8c44f" },
                { id: "oversight_all_cleared",      label: "Autorités apaisées",                 color: "#4caf82" },
                { id: "abuse_restored",             label: "Équilibre institutionnel rétabli",   color: "#4caf82" },
              ] as { id: string; label: string; color: string }[]).map(({ id, label, color }) => (
                <Pressable
                  key={id}
                  style={({ pressed }) => [sandboxStyles.eventBtn, { borderColor: color + "55", opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => applySandboxMutation((s) => ({ ...s, news: queueNews(s.news, id) }))}
                >
                  <View style={[sandboxStyles.eventDot, { backgroundColor: color }]} />
                  <Text style={sandboxStyles.eventLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.rowLabel, { fontStyle: "italic", color: PALETTE.textLow }]}>Activez le mode sandbox pour déclencher des événements.</Text>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080c14" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 2, color: "#a78bfa" },

  scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },

  banner: {
    padding: 10,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#a78bfa44",
    borderLeftWidth: 3,
    borderLeftColor: "#a78bfa",
    backgroundColor: "#a78bfa0d",
  },
  bannerText: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid },

  section: { gap: 6 },
  sectionLabel: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.textLow, marginLeft: 2 },
  card: {
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    gap: 8,
  },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 12, fontFamily: FONT.med, color: PALETTE.textMid, flex: 1 },
  rowValue: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },

  resourceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  resourceIcon: { fontSize: 14, width: 20, textAlign: "center" },
  resourceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  indicatorRow: { gap: 5 },
  indicatorTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  bar: { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },

  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.danger + "66",
    backgroundColor: PALETTE.danger + "12",
  },
  resetBtnText: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.danger, letterSpacing: 1 },
});

const sandboxStyles = StyleSheet.create({
  toggleBtn: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#ffffff33",
    backgroundColor: "#ffffff0a", marginLeft: 8,
  },
  toggleBtnActive: { borderColor: "#7c3aed88", backgroundColor: "#7c3aed22" },
  toggleBtnText:       { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },
  toggleBtnTextActive: { color: "#a78bfa" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  stepper: { flexDirection: "row", gap: 4 },
  stepBtn: {
    width: 26, height: 22, borderRadius: RADIUS.xs, alignItems: "center", justifyContent: "center",
    backgroundColor: "#ffffff12", borderWidth: StyleSheet.hairlineWidth, borderColor: "#ffffff22",
  },
  stepBtnText: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textHigh, lineHeight: 18 },
  eventsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  eventBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: RADIUS.xs, borderWidth: 1,
    backgroundColor: "#ffffff08",
  },
  eventDot:   { width: 6, height: 6, borderRadius: 3 },
  eventLabel: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid },
});
