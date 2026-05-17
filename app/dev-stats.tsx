import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { RESOURCE_ICONS, RESOURCE_LABELS } from "@/types/strategy";
import type { ResourceKey } from "@/types/strategy";
import {
  computeEconomyHealth,
  DIAGNOSIS_LABELS,
  DIAGNOSIS_COLORS,
} from "@/logic/economyHealthEngine";
import type { EconomyHealthIndices } from "@/logic/economyHealthEngine";
import {
  computeFunScore,
  FUN_BAND_LABELS,
  FUN_BAND_COLORS,
} from "@/logic/funScoreEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

// Dev-only balance dashboard — gated behind __DEV__.
// Access via ⊞ chart-bar icon in nation.tsx header (DEV builds only).

const RESOURCE_MAX: Record<ResourceKey, number> = {
  money:        5000,
  influence:    300,
  energy:       300,
  intelligence: 200,
  technology:   200,
  military:     200,
  cyberDefense: 200,
};

interface BalanceFlag {
  id: string;
  label: string;
  detail: string;
  severity: "ok" | "warn" | "alert";
}

function flagColor(s: BalanceFlag["severity"]): string {
  if (s === "alert") return PALETTE.danger;
  if (s === "warn")  return PALETTE.warning;
  return PALETTE.success;
}

function flagIcon(s: BalanceFlag["severity"]): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  if (s === "alert") return "close-circle-outline";
  if (s === "warn")  return "alert-outline";
  return "check-circle-outline";
}

function resourceColor(key: ResourceKey, value: number): string {
  const ratio = value / RESOURCE_MAX[key];
  if (ratio >= 0.4) return PALETTE.success;
  if (ratio >= 0.15) return PALETTE.warning;
  return PALETTE.danger;
}

function wallDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

export default function DevStatsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { state } = useStrategy();

  useEffect(() => {
    if (!__DEV__) router.replace("/nation" as any);
  }, [router]);

  if (!__DEV__ || !state) return null;

  // ── Derived session metrics ───────────────────────────────────────────────────
  const wallMs              = Date.now() - state.startedAt;
  const actionCount         = state.news.actionCount;
  const crisisHandled       = state.news.log.filter((e) => e.choiceId).length;
  const totalBuildingLevels = state.buildings.reduce((s, b) => s + b.level, 0);
  const buildingsBuilt      = state.buildings.filter((b) => b.level > 0).length;
  const buildingsUpgrading  = state.buildings.filter((b) => b.upgradeEndTime !== null).length;
  const researchCompleted   = state.strategyResearch?.completed.length ?? 0;
  const researchInProgress  = state.strategyResearch?.inProgress ? 1 : 0;
  const units               = state.playerUnits ?? [];
  const totalUnits          = units.reduce((s, u) => s + u.quantity, 0);
  const queue               = state.trainingQueue ?? [];
  const trainingActive      = queue.filter((e) => e.status === "training").length;
  const trainingReady       = queue.filter((e) => e.status === "completed").length;
  const missionsPending     = state.missions.filter((m) => m.completed).length;
  const missionsActive      = state.missions.filter((m) => !m.completed).length;
  const totalOps            = state.stats.totalOperations;
  const opsWon              = state.stats.operationsWon;
  const opsLost             = totalOps - opsWon;
  const winRatio            = totalOps > 0 ? Math.round((opsWon / totalOps) * 100) : 0;
  const rank                = state.ranking.findIndex((r) => r.id === "player") + 1;
  const actionsPerDay       = state.mandateDay > 0
    ? (actionCount / state.mandateDay).toFixed(1)
    : "—";

  // ── Balance flags ─────────────────────────────────────────────────────────────
  const flags = useMemo<BalanceFlag[]>(() => {
    const out: BalanceFlag[] = [];
    const day = state.mandateDay;

    // 1. Vitesse de progression
    const levelsPerDay = day > 0 ? totalBuildingLevels / day : 0;
    if (day >= 10 && levelsPerDay < 0.5) {
      out.push({ id: "progress", label: "Progression trop lente", detail: `${levelsPerDay.toFixed(1)} niveaux/jour (min attendu : 0.5)`, severity: "alert" });
    } else if (day >= 5 && levelsPerDay < 1.5) {
      out.push({ id: "progress", label: "Progression ralentie", detail: `${levelsPerDay.toFixed(1)} niveaux/jour (optimal : ≥ 1.5)`, severity: "warn" });
    } else if (day >= 5) {
      out.push({ id: "progress", label: "Rythme de progression correct", detail: `${levelsPerDay.toFixed(1)} niveaux/jour`, severity: "ok" });
    }

    // 2. Ressource bloquante
    const lowSecondary = (Object.keys(state.resources) as ResourceKey[])
      .filter((k) => k !== "money" && state.resources[k] < 30);
    const moneyStarved = state.resources.money < 400 && day >= 3;
    if (moneyStarved || lowSecondary.length >= 3) {
      out.push({ id: "resource", label: "Ressource bloquante", detail: moneyStarved ? `Argent : ${state.resources.money}` : `${lowSecondary.length} ressources < 30`, severity: "alert" });
    } else if (lowSecondary.length >= 2 || (state.resources.money < 800 && day >= 5)) {
      out.push({ id: "resource", label: "Ressource tendue", detail: `${lowSecondary.length} ressource(s) secondaire(s) faible(s)`, severity: "warn" });
    }

    // 3. Économie trop généreuse
    if (state.resources.money > 10_000) {
      out.push({ id: "economy", label: "Économie trop généreuse", detail: `Argent : ${state.resources.money} — accumulation suspecte`, severity: "alert" });
    } else if (state.resources.money > 5_000 && day < 20) {
      out.push({ id: "economy", label: "Revenu rapide à surveiller", detail: `${state.resources.money} au jour ${day}`, severity: "warn" });
    }

    // 4. Difficulté élevée
    const pop = state.nationalIndicators.popularity;
    const sec = state.nationalIndicators.security;
    if (pop < 30 || (pop < 40 && sec < 40)) {
      out.push({ id: "difficulty", label: "Difficulté élevée", detail: `Popularité ${pop} / Sécurité ${sec}`, severity: "alert" });
    } else if (pop < 45 || sec < 40) {
      out.push({ id: "difficulty", label: "Pression politique modérée", detail: `Popularité ${pop} / Sécurité ${sec}`, severity: "warn" });
    }

    // 5. Joueur inactif
    const expectedActions = day * 2;
    if (day >= 10 && actionCount < expectedActions * 0.3) {
      out.push({ id: "inactive", label: "Joueur très peu actif", detail: `${actionCount} actions — attendu ≥ ${Math.round(expectedActions * 0.3)}`, severity: "alert" });
    } else if (day >= 10 && actionCount < expectedActions * 0.6) {
      out.push({ id: "inactive", label: "Engagement faible", detail: `${actionCount} actions sur ${day} jours`, severity: "warn" });
    }

    return out;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const econHealth = useMemo(() => computeEconomyHealth(state), [state]);
  const funScore   = useMemo(() => computeFunScore(state), [state]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={PALETTE.textHigh} />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="chart-bar" size={13} color={PALETTE.info} />
          <Text style={styles.headerTitle}>DEV STATS · BALANCE · DEV ONLY</Text>
        </View>
        <View style={{ width: 18 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Lecture seule · Jour {state.mandateDay} · Durée réelle : {wallDuration(wallMs)}
          </Text>
        </View>

        {/* 1. Indicateurs d'équilibrage */}
        <Section label="INDICATEURS D'ÉQUILIBRAGE">
          {flags.length === 0 ? (
            <Row label="Données insuffisantes (trop tôt dans le mandat)" value="—" />
          ) : (
            flags.map((f) => (
              <View key={f.id} style={styles.flagRow}>
                <MaterialCommunityIcons name={flagIcon(f.severity)} size={14} color={flagColor(f.severity)} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[styles.flagLabel, { color: flagColor(f.severity) }]}>{f.label}</Text>
                  <Text style={styles.flagDetail}>{f.detail}</Text>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* 2. Session */}
        <Section label="SESSION">
          <Row label="Durée réelle (depuis création)" value={wallDuration(wallMs)} />
          <Row label="Jour mandat" value={`${state.mandateDay}`} />
          <Row label="Actions totales" value={`${actionCount}`} />
          <Row label="Actions / jour" value={actionsPerDay} />
          <Row label="Crises traitées" value={`${crisisHandled}`} />
          <Row
            label="Conséquences différées en attente"
            value={`${state.delayedConsequences.length}`}
            color={state.delayedConsequences.length > 3 ? PALETTE.danger : state.delayedConsequences.length > 0 ? PALETTE.warning : undefined}
          />
        </Section>

        {/* 3. Bâtiments */}
        <Section label="BÂTIMENTS">
          <Row label="Construits" value={`${buildingsBuilt} / ${state.buildings.length}`} />
          <Row label="Niveaux cumulés" value={`${totalBuildingLevels}`} />
          <Row
            label="En amélioration"
            value={`${buildingsUpgrading}`}
            color={buildingsUpgrading > 0 ? PALETTE.warning : undefined}
          />
        </Section>

        {/* 4. Recherche stratégique */}
        <Section label="RECHERCHE STRATÉGIQUE">
          <Row label="Terminées" value={`${researchCompleted} / 15`} color={researchCompleted === 15 ? PALETTE.success : undefined} />
          <Row label="En cours" value={`${researchInProgress}`} color={researchInProgress > 0 ? PALETTE.warning : undefined} />
        </Section>

        {/* 5. Forces armées */}
        <Section label="FORCES ARMÉES">
          <Row label="Types d'unités déployés" value={`${units.length}`} />
          <Row label="Unités totales" value={`${totalUnits}`} />
          <Row label="En formation" value={`${trainingActive}`} color={trainingActive > 0 ? PALETTE.warning : undefined} />
          <Row label="Prêtes à déployer" value={`${trainingReady}`} color={trainingReady > 0 ? PALETTE.success : undefined} />
          <Row label="Doctrine militaire" value={state.militaryDoctrine} />
        </Section>

        {/* 6. Missions */}
        <Section label="MISSIONS">
          <Row label="Actives" value={`${missionsActive}`} />
          <Row label="Récompenses à réclamer" value={`${missionsPending}`} color={missionsPending > 0 ? PALETTE.warning : undefined} />
        </Section>

        {/* 7. Opérations */}
        <Section label="OPÉRATIONS">
          <Row label="Total lancées" value={`${totalOps}`} />
          <Row label="Réussies" value={`${opsWon}`} color={PALETTE.success} />
          <Row label="Échouées" value={`${opsLost}`} color={opsLost > opsWon ? PALETTE.danger : undefined} />
          <Row
            label="Taux de succès"
            value={totalOps > 0 ? `${winRatio}%` : "—"}
            color={winRatio >= 60 ? PALETTE.success : winRatio >= 40 ? PALETTE.warning : totalOps > 0 ? PALETTE.danger : undefined}
          />
        </Section>

        {/* 8. Ressources actuelles */}
        <Section label="RESSOURCES ACTUELLES">
          {(Object.keys(state.resources) as ResourceKey[]).map((key) => {
            const val   = state.resources[key];
            const color = resourceColor(key, val);
            const pct   = Math.min(100, Math.round((val / RESOURCE_MAX[key]) * 100));
            return (
              <View key={key} style={styles.resourceRow}>
                <Text style={styles.resourceIcon}>{RESOURCE_ICONS[key]}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.resourceTop}>
                    <Text style={styles.rowLabel}>{RESOURCE_LABELS[key]}</Text>
                    <Text style={[styles.rowValue, { color }]}>{val}</Text>
                  </View>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </Section>

        {/* 9. Santé économique */}
        <Section label="SANTÉ ÉCONOMIQUE">
          {/* Diagnostic global */}
          <View style={styles.econDiagRow}>
            <View style={[styles.econDiagBadge, {
              borderColor:       DIAGNOSIS_COLORS[econHealth.diagnosis] + "55",
              backgroundColor:   DIAGNOSIS_COLORS[econHealth.diagnosis] + "18",
            }]}>
              <Text style={[styles.econDiagBadgeText, { color: DIAGNOSIS_COLORS[econHealth.diagnosis] }]}>
                {DIAGNOSIS_LABELS[econHealth.diagnosis].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.econDiagDetail} numberOfLines={2}>{econHealth.detail}</Text>
          </View>

          {/* 6 indices */}
          <EconRow label="Inflation argent"    value={econHealth.indices.moneyInflationIndex}   dir="neutral" />
          <EconRow label="Rareté ressources"   value={econHealth.indices.resourceScarcityIndex} dir="lower" />
          <EconRow label="Poids missions"      value={econHealth.indices.missionRewardPressure} dir="neutral" />
          <EconRow label="ROI bâtiments"       value={econHealth.indices.buildingROI}           dir="higher" />
          <EconRow label="Charge entretien"    value={econHealth.indices.unitUpkeepPressure}    dir="lower" />
          <EconRow label="Accessibilité rech." value={econHealth.indices.researchAffordability} dir="higher" />
        </Section>

        {/* 10. Fun score */}
        <Section label="FUN SCORE (DEV)">
          {/* Score global + bande */}
          <View style={styles.funHeader}>
            <View style={[styles.funScoreBubble, { borderColor: FUN_BAND_COLORS[funScore.band] + "66", backgroundColor: FUN_BAND_COLORS[funScore.band] + "18" }]}>
              <Text style={[styles.funScoreNum, { color: FUN_BAND_COLORS[funScore.band] }]}>{funScore.score}</Text>
              <Text style={styles.funScoreMax}>/100</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.funBandLabel, { color: FUN_BAND_COLORS[funScore.band] }]}>
                {FUN_BAND_LABELS[funScore.band].toUpperCase()}
              </Text>
              <Text style={styles.funNote} numberOfLines={2}>{funScore.note}</Text>
            </View>
          </View>

          {/* 7 facteurs */}
          <FunRow label="Progression"       value={funScore.factors.progression}      max={25} dir="higher" />
          <FunRow label="Récompenses"        value={funScore.factors.recentRewards}    max={20} dir="higher" />
          <FunRow label="Actions dispo."     value={funScore.factors.availableActions} max={20} dir="higher" />
          <FunRow label="Crises actives"     value={funScore.factors.activeCrisis}     max={15} dir="higher" />
          <FunRow label="Momentum missions"  value={funScore.factors.missionMomentum}  max={10} dir="higher" />
          <FunRow label="Variété activités"  value={funScore.factors.activityVariety}  max={10} dir="higher" />
          <FunRow label="Pression attente"   value={funScore.factors.waitPressure}     max={15} dir="lower" />
        </Section>

        {/* 11. Puissance & classement */}
        <Section label="PUISSANCE & CLASSEMENT">
          <Row label="Puissance mondiale" value={`${state.stats.globalPower}`} />
          <Row
            label="Rang"
            value={`${rank} / ${state.ranking.length}`}
            color={rank <= 5 ? PALETTE.success : rank <= 10 ? PALETTE.warning : PALETTE.danger}
          />
          <Row label="Points classement" value={`${state.stats.rankingPoints}`} />
          <Row
            label="Opposition"
            value={`${state.oppositionPower}/100`}
            color={state.oppositionPower >= 65 ? PALETTE.danger : state.oppositionPower <= 30 ? PALETTE.success : PALETTE.warning}
          />
          <Row
            label="Dette nationale"
            value={`${state.nationalDebt}`}
            color={state.nationalDebt > 350 ? PALETTE.danger : state.nationalDebt > 200 ? PALETTE.warning : PALETTE.success}
          />
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

/**
 * dir: "higher" = 100 est bon (vert) / "lower" = 0 est bon (vert) / "neutral" = milieu est bon.
 */
function econIndexColor(value: number, dir: "higher" | "lower" | "neutral"): string {
  if (dir === "higher") {
    if (value >= 60) return PALETTE.success;
    if (value >= 35) return PALETTE.warning;
    return PALETTE.danger;
  }
  if (dir === "lower") {
    if (value <= 30) return PALETTE.success;
    if (value <= 65) return PALETTE.warning;
    return PALETTE.danger;
  }
  // neutral: 20–70 = ok
  if (value >= 20 && value <= 70) return PALETTE.success;
  if (value >= 10 && value <= 85) return PALETTE.warning;
  return PALETTE.danger;
}

function FunRow({
  label,
  value,
  max,
  dir,
}: {
  label: string;
  value: number;
  max: number;
  dir: "higher" | "lower";
}) {
  const pct = Math.round((value / max) * 100);
  const color = dir === "higher"
    ? (pct >= 60 ? PALETTE.success : pct >= 30 ? PALETTE.warning : PALETTE.danger)
    : (pct <= 30 ? PALETTE.success : pct <= 70 ? PALETTE.warning : PALETTE.danger);
  return (
    <View style={styles.econRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.econRowRight}>
        <View style={[styles.econBar, { width: 60 }]}>
          <View style={[styles.econBarFill, { width: `${pct}%` as `${number}%`, backgroundColor: color + "80" }]} />
        </View>
        <Text style={[styles.econValue, { color }]}>{value}<Text style={{ color: PALETTE.textLow, fontSize: 9 }}>/{max}</Text></Text>
      </View>
    </View>
  );
}

function EconRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: number;
  dir: "higher" | "lower" | "neutral";
}) {
  const color = econIndexColor(value, dir);
  return (
    <View style={styles.econRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.econRowRight}>
        <View style={[styles.econBar, { width: 60 }]}>
          <View style={[styles.econBarFill, { width: `${value}%` as `${number}%`, backgroundColor: color + "80" }]} />
        </View>
        <Text style={[styles.econValue, { color }]}>{value}</Text>
      </View>
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
  headerTitle:  { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.info },

  scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },

  banner: {
    padding: 10,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.info + "44",
    borderLeftWidth: 3,
    borderLeftColor: PALETTE.info,
    backgroundColor: PALETTE.info + "0d",
  },
  bannerText: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid },

  section:      { gap: 6 },
  sectionLabel: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.textLow, marginLeft: 2 },
  card: {
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    gap: 8,
  },

  row:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 12, fontFamily: FONT.med, color: PALETTE.textMid, flex: 1 },
  rowValue: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },

  flagRow:   { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  flagLabel: { fontSize: 12, fontFamily: FONT.bold },
  flagDetail: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textLow },

  resourceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  resourceIcon: { fontSize: 14, width: 20, textAlign: "center" },
  resourceTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  bar:     { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },

  funHeader:       { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  funScoreBubble:  { width: 52, height: 52, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  funScoreNum:     { fontSize: 22, fontFamily: FONT.bold, lineHeight: 26 },
  funScoreMax:     { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textLow, marginTop: -2 },
  funBandLabel:    { fontSize: 10, fontFamily: FONT.bold, letterSpacing: 0.8 },
  funNote:         { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textLow, lineHeight: 14 },

  econDiagRow:       { gap: 5 },
  econDiagBadge:     { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1 },
  econDiagBadgeText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.8 },
  econDiagDetail:    { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textLow, lineHeight: 14 },

  econRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  econRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  econBar:      { height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  econBarFill:  { height: "100%", borderRadius: 2 },
  econValue:    { fontSize: 12, fontFamily: FONT.bold, width: 28, textAlign: "right" },
});
