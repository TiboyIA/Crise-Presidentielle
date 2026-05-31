import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { computeMandateScore } from "@/context/StrategyContext";
import { useAuth } from "@/context/AuthContext";
import { submitRankedRun, hasActiveRun, isRankedIntended, recordEvent as rankRecord } from "@/services/RankedService";
import { getPlayerRank } from "@/logic/botEngine";
import { DOCTRINES } from "@/data/doctrines";
import { REFORMS } from "@/data/reforms";
import { ACHIEVEMENTS } from "@/data/achievements";
import { Panel } from "@/components/ui";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { useResponsive } from "@/utils/responsive";
import type { DecisionTrace, NationalIndicators, PromiseDomain } from "@/types/strategy";
import { computePromiseBilanBonus } from "@/logic/promiseQualityEngine";
import { PROMISE_QUALITY, CLARITY_BADGE_COLOR, CLARITY_BADGE_LABEL } from "@/data/promiseQuality";
import { computeNationalTension, getTensionLevel, getTensionColor } from "@/logic/tensionEngine";
import { computeReputationProfile, getTopDimensions } from "@/logic/reputationVectorEngine";
import { getTopDecisions, getWeightLabel, getDecisionTier, DECISION_TIER_COLOR } from "@/logic/decisionWeightEngine";
import { THEME_LABELS } from "@/logic/contradictionMemoryEngine";
import { computeSolvencyScore } from "@/logic/solvencyEngine";
import { LIABILITY_DEFS, LIABILITY_CATEGORY_LABELS, computeTotalExposure, getLiabilityColor } from "@/logic/longTailLiabilityEngine";
import { getRiskAppetiteDef } from "@/logic/riskAppetiteEngine";
import { DEFAULT_COSMIC_STATE, COSMIC_STAGE_LABELS } from "@/types/cosmic";
import { getMoralBalanceLabel, getMoralBalanceColor, getCosmicCredibilityLabel } from "@/logic/cosmicEngine";
import { computeHealthMandateBilan } from "@/logic/healthMandateReviewEngine";
import { computeAbuseBilan } from "@/logic/abuseOfPowerEngine";
import { computeEconomicOverview } from "@/logic/economyEngine";

const PROMISE_LABELS: Record<PromiseDomain, string> = {
  securite: "Sécurité", economie: "Économie", ecologie: "Écologie",
  souverainete: "Souveraineté", pouvoir_achat: "Pouvoir d'achat",
  innovation: "Innovation", diplomatie: "Diplomatie",
};

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const INDICATOR_META: { key: keyof NationalIndicators; label: string; icon: McIconName; color: string }[] = [
  { key: "popularity",   label: "Popularité",    icon: "account-group",   color: "#c9a84c" },
  { key: "economy",      label: "Économie",       icon: "chart-line",      color: "#3fbe7a" },
  { key: "security",     label: "Sécurité",       icon: "shield-check",    color: "#4a9fff" },
  { key: "ecology",      label: "Écologie",       icon: "leaf",            color: "#52c97a" },
  { key: "cohesion",     label: "Cohésion",       icon: "handshake",       color: "#a78bfa" },
  { key: "publicBudget", label: "Budget Public",  icon: "bank-outline",    color: "#e8a93a" },
];

function getMandateTitle(score: number): { title: string; subtitle: string; color: string } {
  if (score >= 90) return { title: "Visionnaire Historique",   subtitle: "Votre mandat entre dans les livres d'histoire", color: "#FFD56A" };
  if (score >= 80) return { title: "Grand Réformateur",        subtitle: "Un mandat de transformation profonde",          color: "#c9a84c" };
  if (score >= 70) return { title: "Dirigeant Accompli",       subtitle: "Résultats probants sur tous les fronts",        color: "#4a9fff" };
  if (score >= 60) return { title: "Président Compétent",      subtitle: "Gestion solide dans un contexte difficile",     color: "#3fbe7a" };
  if (score >= 50) return { title: "Gestionnaire Prudent",     subtitle: "Stabilité maintenue, ambitions modérées",       color: "#a78bfa" };
  if (score >= 40) return { title: "Président Ordinaire",      subtitle: "Un mandat sans éclat mais sans catastrophe",    color: PALETTE.textMid };
  if (score >= 30) return { title: "Dirigeant Contesté",       subtitle: "Tensions persistantes et bilan mitigé",         color: PALETTE.warning };
  if (score >= 20) return { title: "Président Fragilisé",      subtitle: "Crises successives ont affaibli le mandat",     color: PALETTE.danger };
  if (score >= 10) return { title: "Chef Sous Pression",       subtitle: "Résistance difficile aux crises accumulées",    color: "#ff6040" };
  return               { title: "Présidence Tourmentée",       subtitle: "Mandat marqué par de graves difficultés",       color: "#ff2040" };
}

function getMandateReward(score: number): { money: number; influence: number; points: number } {
  if (score >= 80) return { money: 1000, influence: 100, points: 50 };
  if (score >= 60) return { money: 500,  influence: 50,  points: 25 };
  if (score >= 40) return { money: 200,  influence: 25,  points: 10 };
  return                  { money: 0,    influence: 0,   points: 0  };
}

export default function MandateReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, startNewMandate } = useStrategy();
  const { isLandscape, hPad } = useResponsive();
  const auth = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [rankedScore, setRankedScore] = useState<number | null>(null);
  const [rankedRejected, setRankedRejected] = useState(false);
  const [offlineRanked, setOfflineRanked] = useState(false);

  useEffect(() => {
    if (!isRankedIntended()) return;
    hasActiveRun().then((active) => { if (!active) setOfflineRanked(true); });
  }, []);

  if (!state) return null;

  const ind = state.nationalIndicators;
  const score = computeMandateScore(ind, state.campaignPromises);
  const mandate = getMandateTitle(score);
  const reward = getMandateReward(score);
  const playerRank = getPlayerRank(state.ranking);
  const bilanNumber = Math.floor(state.mandateDay / 100);
  const oppositionPower = state.oppositionPower ?? 35;
  const oppositionColor = oppositionPower >= 65 ? PALETTE.danger : oppositionPower >= 40 ? PALETTE.warning : PALETTE.success;
  const contradictions = (state.contradictionHistory ?? []).filter((c) => c.mediaRisk > 40);
  const allTraces = (state.publicMemory?.traces ?? []) as DecisionTrace[];
  const negativeTraces = allTraces.filter((t) => t.politicalImpact < 0);
  const positiveTraces = allTraces.filter((t) => t.politicalImpact > 0);
  const mandateTension = computeNationalTension(state);
  const mandateTensionLevel = getTensionLevel(mandateTension);
  const mandateTensionColor = getTensionColor(mandateTensionLevel);
  const solvency      = computeSolvencyScore(state);
  const reputation    = computeReputationProfile(state);
  const topDims       = getTopDimensions(reputation.vector, 3);
  const topDecisions  = getTopDecisions(
    state.news.log,
    allTraces,
    state.campaignPromises ?? { selected: [], progress: {}, status: {} },
    5,
  );
  const healthBilan    = computeHealthMandateBilan(state);
  const economyBilan   = computeEconomicOverview(state);

  const handleNewMandate = async () => {
    // Submit ranked run if active
    if (auth.accessToken && (await hasActiveRun())) {
      setSubmitting(true);
      // Enregistrer un résumé vérifiable juste avant soumission.
      // Le serveur croise ces chiffres avec le journal pour détecter les incohérences.
      await rankRecord("ranked_score_hint", "final_state", state.mandateDay, undefined, {
        globalPower:         state.stats.globalPower,
        rankingPoints:       state.stats.rankingPoints,
        totalBuildingLevels: state.buildings.reduce((s, b) => s + b.level, 0),
        researchCount:       (state.strategyResearch?.completed ?? []).length,
        totalOperations:     state.stats.totalOperations,
        operationsWon:       state.stats.operationsWon,
        publicBudget:        ind.publicBudget,
        mandateDay:          state.mandateDay,
      });
      const result = await submitRankedRun(
        auth.accessToken,
        {
          popularity:    ind.popularity,
          economy:       ind.economy,
          security:      ind.security,
          ecology:       ind.ecology,
          cohesion:      ind.cohesion,
          globalPower:   state.stats.globalPower,
          rankingPoints: state.stats.rankingPoints,
          publicBudget:  ind.publicBudget,
        },
        state.mandateDay,
      );
      setSubmitting(false);
      if (result.ok && result.score != null) {
        setRankedScore(result.score);
        return; // Show score first — player taps again to proceed
      }
      if (!result.ok && result.reason !== "network-unavailable") {
        // Rejet serveur (run invalide, ban, version…) — afficher sans bloquer
        setRankedRejected(true);
      }
    }
    startNewMandate();
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Gold header */}
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="close" size={20} color={PALETTE.textMid} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerKicker}>PRÉSIDENCE · RAPPORT OFFICIEL</Text>
            <Text style={styles.headerTitle}>BILAN DE MANDAT N°{bilanNumber}</Text>
            <Text style={styles.headerSub}>Jours {state.lastBilanShownAt + 1} – {state.mandateDay}</Text>
          </View>
        </View>
        <View style={styles.headerRule} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SCORE GLOBAL — always full width */}
        <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.scoreCard}>
          <Text style={styles.scoreKicker}>SCORE DU MANDAT</Text>
          <Text style={[styles.scoreNum, { color: mandate.color }]}>{score}</Text>
          <Text style={styles.scoreMax}>/&nbsp;100</Text>
          <View style={styles.scoreDivider} />
          <Text style={[styles.mandateTitle, { color: mandate.color }]}>{mandate.title}</Text>
          <Text style={styles.mandateSub}>{mandate.subtitle}</Text>

          {/* Score bar */}
          <View style={styles.scoreTrack}>
            <LinearGradient
              colors={score >= 60 ? [PALETTE.success, PALETTE.gold] : score >= 40 ? [PALETTE.warning, "#c9a84c"] : [PALETTE.danger, PALETTE.warning]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.scoreFill, { width: `${score}%` }]}
            />
          </View>
        </LinearGradient>

        {/* OFFLINE RANKED BANNER */}
        {offlineRanked && (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons name="wifi-off" size={14} color={PALETTE.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineBannerTitle}>Partie hors ligne</Text>
              <Text style={styles.offlineBannerSub}>
                Cette partie a été jouée sans connexion. Elle est enregistrée dans votre progression, mais non éligible au classement mondial.
              </Text>
            </View>
          </View>
        )}

        {/* RANKED REJECTED BANNER */}
        {rankedRejected && (
          <View style={[styles.offlineBanner, { borderColor: PALETTE.danger + "55", backgroundColor: PALETTE.danger + "0d" }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={PALETTE.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.offlineBannerTitle, { color: PALETTE.danger }]}>Score non homologué</Text>
              <Text style={styles.offlineBannerSub}>
                Le serveur n'a pas validé cette run. La partie est enregistrée dans votre progression locale.
              </Text>
            </View>
          </View>
        )}

        {/* Panel grid — 2-col in landscape */}
        <View style={[styles.panelGrid, isLandscape && styles.panelGridLandscape]}>

        {/* INDICATEURS DÉTAILLÉS */}
        <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="gauge" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>ÉTAT DES INDICATEURS NATIONAUX</Text>
          </View>
          {INDICATOR_META.map(({ key, label, icon, color }) => {
            const val = ind[key] as number;
            const pct = key === "publicBudget"
              ? Math.max(0, (val + 150) / 250)
              : Math.max(0, val / 100);
            const isLow = key === "publicBudget" ? val < -80 : val < 30;
            const displayVal = key === "publicBudget"
              ? (val >= 0 ? `+${val}` : `${val}`)
              : `${val}%`;
            return (
              <View key={key} style={styles.indicatorRow}>
                <MaterialCommunityIcons name={icon} size={14} color={isLow ? PALETTE.danger : color} style={{ width: 18 }} />
                <Text style={styles.indicatorLabel}>{label}</Text>
                <View style={styles.indicatorTrack}>
                  <View style={[styles.indicatorFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: isLow ? PALETTE.danger : color }]} />
                </View>
                <Text style={[styles.indicatorVal, isLow && { color: PALETTE.danger }]}>{displayVal}</Text>
              </View>
            );
          })}
        </Panel>

        {/* STATISTIQUES CLÉS */}
        <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trophy-outline" size={14} color={PALETTE.gold} />
            <Text style={styles.sectionTitle}>STATISTIQUES DU MANDAT</Text>
          </View>
          <View style={styles.statsGrid}>
            {[
              { label: "Puissance mondiale",  value: state.stats.globalPower,                   icon: "earth" as McIconName,             color: PALETTE.gold },
              { label: "Points de classement", value: state.stats.rankingPoints,                  icon: "star-outline" as McIconName,      color: "#a78bfa" },
              { label: "Rang mondial",         value: `#${playerRank}`,                           icon: "podium" as McIconName,            color: "#4a9fff" },
              { label: "Opérations lancées",   value: state.stats.totalOperations,                icon: "sword-cross" as McIconName,       color: PALETTE.crimson },
              { label: "Taux de succès",        value: state.stats.totalOperations > 0 ? `${Math.round((state.stats.operationsWon / state.stats.totalOperations) * 100)}%` : "N/A", icon: "check-circle-outline" as McIconName, color: PALETTE.success },
              { label: "Niveau président",      value: `Niv. ${state.stats.presidentLevel}`,      icon: "account-star" as McIconName,      color: PALETTE.warning },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <MaterialCommunityIcons name={stat.icon} size={18} color={stat.color} />
                <Text style={[styles.statVal, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Panel>

        {/* SOLVABILITÉ NATIONALE */}
        <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bank-outline" size={14} color={solvency.color} />
            <Text style={[styles.sectionTitle, { color: solvency.color }]}>SOLVABILITÉ NATIONALE</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.solvencyScore, { color: solvency.color }]}>{solvency.score}<Text style={styles.solvencyScoreMax}>/100</Text></Text>
          </View>
          <View style={styles.solvencyTrack}>
            <View style={[styles.solvencyFill, { width: `${solvency.score}%`, backgroundColor: solvency.color }]} />
          </View>
          <Text style={[styles.solvencyLabel, { color: solvency.color }]}>{solvency.label}</Text>
          <View style={styles.solvencyGrid}>
            {([
              { label: "Budget",   val: solvency.breakdown.budget,      max: 20 },
              { label: "Dette",    val: solvency.breakdown.debt,         max: 20 },
              { label: "Réserves",  val: solvency.breakdown.reserves,    max: 10 },
              { label: "Sécurité", val: solvency.breakdown.stability,    max: 12 },
              { label: "Cohésion", val: solvency.breakdown.cohesion,     max: 8  },
              { label: "Cyber",    val: solvency.breakdown.cyberDefense, max: 10 },
              { label: "Énergie",  val: solvency.breakdown.energy,       max: 5  },
              { label: "Assurance",val: solvency.breakdown.insurance,    max: 8  },
              { label: "Marchés",  val: solvency.breakdown.marketRisk,   max: 7  },
            ] as { label: string; val: number; max: number }[]).map(({ label, val, max }) => {
              const pct = val / max;
              const barColor = pct >= 0.7 ? "#3fbe7a" : pct >= 0.4 ? "#e8a93a" : "#e54848";
              return (
                <View key={label} style={styles.solvencyItem}>
                  <Text style={styles.solvencyItemLabel}>{label}</Text>
                  <View style={styles.solvencyItemTrack}>
                    <View style={[styles.solvencyItemFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.solvencyItemVal, { color: barColor }]}>{val}/{max}</Text>
                </View>
              );
            })}
          </View>
        </Panel>

        {/* DOCTRINE & RÉFORMES DU MANDAT */}
        {(() => {
          const doctrine = DOCTRINES[state.governanceDoctrine];
          const completedReforms = state.reforms.filter((r) => r.applied);
          const promises = state.campaignPromises;
          return (
            <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="crown-outline" size={14} color={PALETTE.gold} />
                <Text style={styles.sectionTitle}>DOCTRINE & BILAN POLITIQUE</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                <MaterialCommunityIcons name={doctrine.icon as any} size={18} color={doctrine.color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: FONT.bold, color: doctrine.color }}>{doctrine.name}</Text>
                  <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 2 }}>{doctrine.slogan}</Text>
                </View>
              </View>
              {(() => {
                const appetite = getRiskAppetiteDef(state.governanceDoctrine);
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: RADIUS.xs, backgroundColor: appetite.color + "14", borderWidth: 1, borderColor: appetite.color + "40", marginTop: 2 }}>
                    <MaterialCommunityIcons name={appetite.icon as any} size={14} color={appetite.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontFamily: FONT.bold, color: appetite.color }}>Appétence : {appetite.label}</Text>
                      <Text style={{ fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 }}>{appetite.description}</Text>
                    </View>
                  </View>
                );
              })()}
              {completedReforms.length > 0 && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2, marginTop: 4 }}>RÉFORMES ACCOMPLIES</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {completedReforms.map((r) => {
                      const def = REFORMS[r.id];
                      return (
                        <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.xs, backgroundColor: "rgba(63,190,122,0.12)", borderWidth: 1, borderColor: "#3fbe7a44" }}>
                          <MaterialCommunityIcons name={def.icon as any} size={10} color="#3fbe7a" />
                          <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: "#3fbe7a" }}>{def.name}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              {promises.selected.length > 0 && (() => {
                const promiseBilan = computePromiseBilanBonus(promises);
                return (
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2, marginTop: 4 }}>PROMESSES DE CAMPAGNE</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                      {promises.selected.map((domain) => {
                        const status   = promises.status[domain] ?? "en cours";
                        const quality  = PROMISE_QUALITY[domain];
                        const bilanItem = promiseBilan.breakdown.find((b) => b.domain === domain);
                        const statusColor = status === "tenue" ? "#3fbe7a" : status === "trahie" ? PALETTE.danger : status === "partielle" ? PALETTE.warning : "#4a9fff";
                        const clarityColor = CLARITY_BADGE_COLOR[quality.clarityLevel];
                        return (
                          <View key={domain} style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: statusColor + "44", backgroundColor: statusColor + "11", gap: 2 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                              <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: statusColor }}>{PROMISE_LABELS[domain]}</Text>
                              <Text style={{ fontSize: 7, fontFamily: FONT.bold, color: clarityColor, letterSpacing: 0.8 }}>{CLARITY_BADGE_LABEL[quality.clarityLevel]}</Text>
                            </View>
                            {bilanItem && bilanItem.bonus !== 0 && (
                              <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: bilanItem.bonus > 0 ? "#3fbe7a" : PALETTE.danger }}>
                                {bilanItem.bonus > 0 ? "+" : ""}{bilanItem.bonus} pts
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    {promiseBilan.total !== 0 && (
                      <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: promiseBilan.total > 0 ? "#3fbe7a" : PALETTE.danger, marginTop: 2 }}>
                        Impact promesses : {promiseBilan.total > 0 ? "+" : ""}{promiseBilan.total} pts au bilan
                      </Text>
                    )}
                  </View>
                );
              })()}
            </Panel>
          );
        })()}

        {/* PROFIL DE RÉPUTATION */}
        <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-star-outline" size={14} color={reputation.titleColor} />
            <Text style={[styles.sectionTitle, { color: reputation.titleColor }]}>PROFIL DU DIRIGEANT</Text>
          </View>
          <Text style={[styles.repTitle, { color: reputation.titleColor }]}>{reputation.title}</Text>
          <Text style={styles.repSubtitle}>{reputation.subtitle}</Text>
          <View style={styles.repBars}>
            {topDims.map(({ dim, value, meta }) => (
              <View key={dim} style={styles.repBar}>
                <MaterialCommunityIcons name={meta.icon as any} size={10} color={meta.color} />
                <Text style={[styles.repBarLabel, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                <View style={styles.repBarTrack}>
                  <View style={[styles.repBarFill, { width: `${value}%`, backgroundColor: meta.color }]} />
                </View>
                <Text style={[styles.repBarVal, { color: meta.color }]}>{value}</Text>
              </View>
            ))}
          </View>
        </Panel>

        {/* BILAN OPPOSITION */}
        <Panel variant={oppositionPower >= 65 ? "danger" : undefined} style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-multiple-remove" size={14} color={oppositionColor} />
            <Text style={[styles.sectionTitle, { color: oppositionColor }]}>BILAN OPPOSITION</Text>
          </View>
          <View style={styles.indicatorRow}>
            <MaterialCommunityIcons name="sword-cross" size={14} color={oppositionColor} style={{ width: 18 }} />
            <Text style={styles.indicatorLabel}>Force oppos.</Text>
            <View style={styles.indicatorTrack}>
              <View style={[styles.indicatorFill, { width: `${oppositionPower}%`, backgroundColor: oppositionColor }]} />
            </View>
            <Text style={[styles.indicatorVal, { color: oppositionColor }]}>{oppositionPower}</Text>
          </View>
          <View style={styles.traceStats}>
            <View style={styles.traceStatCell}>
              <Text style={[styles.traceStatNum, { color: PALETTE.danger }]}>{negativeTraces.length}</Text>
              <Text style={styles.traceStatLabel}>Décisions contestées</Text>
            </View>
            <View style={styles.traceStatCell}>
              <Text style={[styles.traceStatNum, { color: PALETTE.success }]}>{positiveTraces.length}</Text>
              <Text style={styles.traceStatLabel}>Décisions saluées</Text>
            </View>
            <View style={styles.traceStatCell}>
              <Text style={[styles.traceStatNum, { color: PALETTE.gold }]}>{allTraces.length}</Text>
              <Text style={styles.traceStatLabel}>Traces mémorielles</Text>
            </View>
          </View>
        </Panel>

        {/* CONTRADICTIONS DE DISCOURS */}
        {contradictions.length > 0 && (
          <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="repeat-variant" size={14} color="#c44b4b" />
              <Text style={[styles.sectionTitle, { color: "#c44b4b" }]}>CONTRADICTIONS DE DISCOURS</Text>
              <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid }}>{contradictions.length}</Text>
            </View>
            {contradictions.map((c) => (
              <View key={c.id} style={styles.contradictionRow}>
                <View style={[styles.contradictionDot, { backgroundColor: c.mediaRisk >= 75 ? PALETTE.danger : c.mediaRisk >= 50 ? PALETTE.warning : "#c44b4b" }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.contradictionTheme}>{THEME_LABELS[c.theme].toUpperCase()}</Text>
                  <Text style={styles.contradictionStmt} numberOfLines={1}>« {c.pastStatement} »</Text>
                  <Text style={styles.contradictionStmt} numberOfLines={1}>→ « {c.currentStatement} »</Text>
                </View>
                <Text style={[styles.contradictionRisk, { color: c.mediaRisk >= 75 ? PALETTE.danger : c.mediaRisk >= 50 ? PALETTE.warning : "#c44b4b" }]}>{c.mediaRisk}%</Text>
              </View>
            ))}
          </Panel>
        )}

        {/* MÉMOIRE DU PEUPLE */}
        {negativeTraces.length > 0 && (
          <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={14} color="#a78bfa" />
              <Text style={[styles.sectionTitle, { color: "#a78bfa" }]}>MÉMOIRE DU PEUPLE</Text>
            </View>
            {negativeTraces.slice(-5).reverse().map((trace) => (
              <View key={trace.id} style={styles.memTraceRow}>
                <View style={[styles.memorySeverityDot, {
                  backgroundColor: trace.severity === "critical" ? PALETTE.danger
                    : trace.severity === "high" ? PALETTE.warning
                    : "#a78bfa",
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memTraceTitle}>{trace.title}</Text>
                  <Text style={styles.memTraceDesc} numberOfLines={1}>{trace.description}</Text>
                </View>
                <Text style={styles.memTraceImpact}>{trace.politicalImpact}</Text>
              </View>
            ))}
          </Panel>
        )}

        {/* DÉCISIONS STRATÉGIQUES — top 3-5 décisions par poids */}
        {topDecisions.length > 0 && (
          <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chess-queen" size={14} color="#a78bfa" />
              <Text style={[styles.sectionTitle, { color: "#a78bfa" }]}>DÉCISIONS STRATÉGIQUES</Text>
              <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid }}>{topDecisions.length}</Text>
            </View>
            {topDecisions.map((d) => {
              const tier = getDecisionTier(d.weight);
              const color = DECISION_TIER_COLOR[tier];
              return (
                <View key={`${d.entry.eventId}_${d.entry.timestamp}`} style={styles.decisionRow}>
                  {/* Poids */}
                  <View style={[styles.decisionWeight, { borderColor: color + "55", backgroundColor: color + "18" }]}>
                    <Text style={[styles.decisionWeightNum, { color }]}>{d.weight}</Text>
                  </View>
                  {/* Contenu */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.decisionTitle} numberOfLines={1}>{d.entry.title}</Text>
                    {d.entry.choiceLabel && (
                      <Text style={styles.decisionChoice} numberOfLines={1}>→ {d.entry.choiceLabel}</Text>
                    )}
                    <Text style={[styles.decisionLabel, { color }]}>{getWeightLabel(d)}</Text>
                  </View>
                </View>
              );
            })}
          </Panel>
        )}

        {/* TENSION NATIONALE — note de bilan si tension ≥ 70 en fin de mandat */}
        {mandateTension >= 70 && (
          <Panel variant={mandateTensionLevel === "explosive" ? "danger" : undefined} style={[styles.section, isLandscape && styles.sectionLandscape]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color={mandateTensionColor} />
              <Text style={[styles.sectionTitle, { color: mandateTensionColor }]}>BILAN — TENSION NATIONALE</Text>
            </View>
            <Text style={{ fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 }}>
              {mandateTensionLevel === "explosive"
                ? `Ce mandat s'achève dans une situation de tension extrême (${mandateTension}/100). L'accumulation des crises, des scandales et de la fatigue populaire laisse le pays au bord du point de rupture.`
                : `La fin de ce mandat est marquée par une tension nationale élevée (${mandateTension}/100), reflet de pressions persistantes sur la cohésion, la confiance et les institutions.`}
            </Text>
          </Panel>
        )}

        {/* PASSIFS LONGUE TRAÎNE — uniquement si au moins un passif actif */}
        {(state.longTailLiabilities ?? []).length > 0 && (() => {
          const liabilities = state.longTailLiabilities!;
          const totalExposure = computeTotalExposure(liabilities, state.news.actionCount);
          return (
            <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="clock-alert-outline" size={14} color="#e54848" />
                <Text style={[styles.sectionTitle, { color: "#e54848" }]}>PASSIFS LONGUE TRAÎNE</Text>
                <View style={{ flex: 1 }} />
                {totalExposure > 0 && (
                  <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: "#e54848", letterSpacing: 1 }}>
                    {totalExposure} M€/période
                  </Text>
                )}
              </View>
              <View style={{ gap: 8, marginTop: 4 }}>
                {liabilities.map((l) => {
                  const def = LIABILITY_DEFS[l.defId];
                  const color = getLiabilityColor(l.defId);
                  const active = state.news.actionCount >= l.triggerAfterActions;
                  const growthPct = Math.round(((l.annualCost - l.initialCost) / l.initialCost) * 100);
                  return (
                    <View key={l.id} style={{ gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
                        <Text style={{ fontSize: 10, fontFamily: FONT.bold, color, flex: 1 }}>{def.label}</Text>
                        <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 }}>
                          {LIABILITY_CATEGORY_LABELS[l.category].toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14 }} numberOfLines={2}>
                        {l.description}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: active ? "#e54848" : PALETTE.textLow }}>
                          {active ? `${l.annualCost} M€/période` : "Dormant"}
                        </Text>
                        {growthPct > 0 && (
                          <Text style={{ fontSize: 8, fontFamily: FONT.reg, color: "#e54848" }}>
                            +{growthPct}% vs. initial
                          </Text>
                        )}
                        <Text style={{ fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow }}>
                          · Réforme : {def.reducedByReform}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5484833" }}>
                <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 14 }}>
                  Ces passifs grèvent le budget tous les 10 jours. Une réforme ciblée les liquide définitivement.
                </Text>
              </View>
            </Panel>
          );
        })()}

        {/* ACHIEVEMENTS */}
        {state.achievements.length > 0 && (
          <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="medal-outline" size={14} color={PALETTE.gold} />
              <Text style={styles.sectionTitle}>DISTINCTIONS OBTENUES</Text>
              <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid }}>{state.achievements.length}</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {state.achievements.map((id) => {
                const def = ACHIEVEMENTS[id];
                if (!def) return null;
                return (
                  <View
                    key={id}
                    style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.xs, backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: PALETTE.gold + "44" }}
                  >
                    <Text style={{ fontSize: 12 }}>{def.icon}</Text>
                    <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: PALETTE.gold }}>{def.title}</Text>
                  </View>
                );
              })}
            </View>
          </Panel>
        )}

        {/* BILAN ÉCONOMIQUE DE MANDAT */}
        <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chart-line" size={14} color={economyBilan.globalColor} />
            <Text style={[styles.sectionTitle, { color: economyBilan.globalColor }]}>BILAN ÉCONOMIQUE DE MANDAT</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: economyBilan.globalColor }}>{economyBilan.globalScore}/100</Text>
          </View>

          {/* Barre de score global */}
          <View style={{ height: 4, backgroundColor: "#ffffff14", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
            <View style={{ height: "100%", width: `${economyBilan.globalScore}%`, backgroundColor: economyBilan.globalColor, borderRadius: 2 }} />
          </View>

          {/* Verdict global + cycle */}
          <View style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.sm, backgroundColor: economyBilan.globalColor + "15", borderWidth: 1, borderColor: economyBilan.globalColor + "33", marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: FONT.bold, color: economyBilan.globalColor, marginBottom: 2 }}>{economyBilan.globalLabel}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: economyBilan.cycleColor + "22" }}>
                <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: economyBilan.cycleColor }}>{economyBilan.cycleLabel.toUpperCase()}</Text>
              </View>
              {economyBilan.stagflationRisk !== "none" && (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "#e8864f22" }}>
                  <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: "#e8864f" }}>
                    {economyBilan.stagflationRisk === "severe" ? "STAGFLATION SÉVÈRE" : economyBilan.stagflationRisk === "confirmed" ? "STAGFLATION AVÉRÉE" : "PRESSIONS STAGFL."}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Alertes actives */}
          {economyBilan.activeAlerts.length > 0 && (
            <View style={{ gap: 3, marginBottom: 8 }}>
              {economyBilan.activeAlerts.map((alert) => (
                <View key={alert} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#e54848" }} />
                  <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: "#e54848" }}>{alert}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Indicateurs clés */}
          <View style={{ gap: 5 }}>
            {economyBilan.indicators.map((ind) => (
              <View key={ind.key} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: ind.color }} />
                <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, flex: 1 }}>{ind.label}</Text>
                <Text style={{ fontSize: 10, fontFamily: FONT.bold, color: ind.color }}>{ind.bandLabel}</Text>
              </View>
            ))}
          </View>
        </Panel>

        {/* BILAN SANITAIRE DE MANDAT */}
        <Panel style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="hospital-box-outline" size={14} color={healthBilan.verdictColor} />
            <Text style={[styles.sectionTitle, { color: healthBilan.verdictColor }]}>BILAN SANITAIRE DE MANDAT</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: healthBilan.verdictColor }}>{healthBilan.score}/100</Text>
          </View>

          {/* Jauge score sanitaire */}
          <View style={{ height: 4, backgroundColor: "#ffffff14", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
            <View style={{ height: "100%", width: `${healthBilan.score}%`, backgroundColor: healthBilan.verdictColor, borderRadius: 2 }} />
          </View>

          {/* Verdict */}
          <View style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.sm, backgroundColor: healthBilan.verdictColor + "15", borderWidth: 1, borderColor: healthBilan.verdictColor + "33", marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: FONT.bold, color: healthBilan.verdictColor, marginBottom: 2 }}>{healthBilan.verdictTitle}</Text>
            <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 13 }}>{healthBilan.verdictSubtitle}</Text>
          </View>

          {/* Métriques */}
          <View style={{ gap: 6 }}>
            {healthBilan.metrics.map((m) => (
              <View key={m.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, flex: 1 }}>{m.label}</Text>
                <Text style={{ fontSize: 10, fontFamily: FONT.bold, color: m.color }}>{m.value}</Text>
              </View>
            ))}
          </View>
        </Panel>

        </View>{/* /panelGrid */}

        {/* VERDICT COSMIQUE */}
        {(() => {
          const cosmic = state.cosmicState ?? DEFAULT_COSMIC_STATE;
          const hasCosmicActivity = cosmic.discoveryStage !== "hidden" || state.news.log.some((l) =>
            l.eventId.startsWith("sn_") || l.eventId.startsWith("oc_") || l.eventId.startsWith("ch_") || l.eventId.startsWith("cv_"),
          );
          if (!hasCosmicActivity) return null;

          const stageLabel   = COSMIC_STAGE_LABELS[cosmic.discoveryStage];
          const credLabel    = getCosmicCredibilityLabel(cosmic.cosmicCredibility);
          const moralLabel   = getMoralBalanceLabel(cosmic.moralBalance);
          const moralColor   = getMoralBalanceColor(cosmic.moralBalance);
          const stageReached = cosmic.discoveryStage !== "hidden";

          return (
            <Panel style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="orbit-variant" size={14} color="#a78bfa" />
                <Text style={styles.sectionTitle}>VERDICT COSMIQUE</Text>
              </View>

              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow }}>Stade atteint</Text>
                  <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: "#a78bfa" }}>{stageLabel}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow }}>Crédibilité cosmique</Text>
                  <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: "#4a9fff" }}>{credLabel} ({cosmic.cosmicCredibility})</Text>
                </View>
                {cosmic.orionDiscovered && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow }}>Réputation Cité d'Orion</Text>
                    <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: "#c8a87e" }}>{cosmic.orionStanding} / 100</Text>
                  </View>
                )}
                {cosmic.lastNegotiationAt > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow }}>Équilibre moral</Text>
                    <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: moralColor }}>{moralLabel}</Text>
                  </View>
                )}
                {cosmic.activePact !== "none" && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow }}>Pacte en fin de mandat</Text>
                    <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: cosmic.activePact === "aurora" ? "#7ec8f7" : "#9b6fd4" }}>
                      {cosmic.activePact === "aurora" ? "Pacte Aurora" : "Engagement Obscurium"}
                    </Text>
                  </View>
                )}
                <View style={{ marginTop: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#a78bfa22" }}>
                  <Text style={{ fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 13, fontStyle: "italic" }}>
                    {cosmic.moralBalance >= 40
                      ? "La Chambre du Seuil a enregistré ce mandat comme un exemple de crédibilité humaine."
                      : cosmic.moralBalance <= -40
                      ? "Obscurium a laissé une empreinte durable sur ce mandat. Les Archives stellaires en gardent trace."
                      : cosmic.cosmicCredibility >= 60
                      ? "Le Conseil interstellaire a maintenu un regard bienveillant sur la Terre durant ce mandat."
                      : "Le Conseil a observé. Son jugement définitif reste dans les délibérations scellées du Tribunal."}
                  </Text>
                </View>
              </View>
            </Panel>
          );
        })()}

        {/* ABUS DE POUVOIR */}
        {(() => {
          const abuseBilan = computeAbuseBilan(state);
          if (abuseBilan.level === "stable" && abuseBilan.index < 15) return null;
          return (
            <Panel style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="gavel" size={14} color={abuseBilan.color} />
                <Text style={[styles.sectionTitle, { color: abuseBilan.color }]}>BILAN DÉMOCRATIQUE</Text>
                <View style={{ marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: abuseBilan.color + "22" }}>
                  <Text style={{ fontSize: 9, fontFamily: FONT.semi, color: abuseBilan.color }}>{abuseBilan.label.toUpperCase()}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow }}>Indice d'abus</Text>
                <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#ffffff18" }}>
                  <View style={{ width: `${abuseBilan.index}%` as `${number}%`, height: 4, borderRadius: 2, backgroundColor: abuseBilan.color }} />
                </View>
                <Text style={{ fontSize: 12, fontFamily: FONT.bold, color: abuseBilan.color }}>{abuseBilan.index}</Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 }}>{abuseBilan.bilanText}</Text>
              {abuseBilan.scorePenalty < 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={12} color={PALETTE.danger} />
                  <Text style={{ fontSize: 10, fontFamily: FONT.semi, color: PALETTE.danger }}>
                    Malus bilan : {abuseBilan.scorePenalty} pts
                  </Text>
                </View>
              )}
            </Panel>
          );
        })()}

        {/* RÉCOMPENSES */}
        {(reward.money > 0 || reward.influence > 0 || reward.points > 0) && (
          <Panel variant="gold" glow style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="gift-outline" size={14} color={PALETTE.gold} />
              <Text style={styles.sectionTitle}>RÉCOMPENSES DE MANDAT</Text>
            </View>
            <View style={styles.rewardsRow}>
              {reward.money > 0 && (
                <View style={styles.rewardChip}>
                  <Text style={styles.rewardIcon}>💰</Text>
                  <Text style={styles.rewardVal}>+{reward.money}</Text>
                </View>
              )}
              {reward.influence > 0 && (
                <View style={styles.rewardChip}>
                  <Text style={styles.rewardIcon}>🎭</Text>
                  <Text style={styles.rewardVal}>+{reward.influence}</Text>
                </View>
              )}
              {reward.points > 0 && (
                <View style={styles.rewardChip}>
                  <MaterialCommunityIcons name="star" size={14} color={PALETTE.gold} />
                  <Text style={styles.rewardVal}>+{reward.points} pts</Text>
                </View>
              )}
            </View>
          </Panel>
        )}

        {/* RANKED SCORE */}
        {rankedScore != null && (
          <View style={styles.rankedResult}>
            <Text style={styles.rankedResultLabel}>SCORE CLASSÉ SOUMIS</Text>
            <Text style={styles.rankedResultScore}>{rankedScore.toLocaleString()}</Text>
            <Text style={styles.rankedResultSub}>Inscrit au classement mondial</Text>
          </View>
        )}

        {/* ACTION */}
        <Pressable
          onPress={rankedScore != null ? () => { startNewMandate(); router.back(); } : handleNewMandate}
          disabled={submitting}
          style={({ pressed }) => [styles.newMandateBtn, { opacity: pressed || submitting ? 0.75 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
        >
          <LinearGradient colors={["#dcb858", "#a07f30"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newMandateInner}>
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <View style={styles.mandateRule} />
                <Text style={styles.newMandateText}>
                  {rankedScore != null ? "CONTINUER" : "ENTAMER UN NOUVEAU MANDAT"}
                </Text>
                <View style={styles.mandateRule} />
              </>
            )}
          </LinearGradient>
        </Pressable>
        <Text style={styles.newMandateHint}>La progression, les ressources et le rang sont conservés.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: { paddingHorizontal: 20, paddingBottom: 14, paddingTop: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.goldDim, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  headerSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, letterSpacing: 1 },
  headerRule: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.gold + "44" },

  content: { paddingTop: 14, gap: 10 },

  scoreCard: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.gold + "44", padding: 20, alignItems: "center", gap: 4 },
  scoreKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.goldDim, letterSpacing: 3, marginBottom: 6 },
  scoreNum: { fontSize: 72, fontFamily: FONT.bold, lineHeight: 76 },
  scoreMax: { fontSize: 14, fontFamily: FONT.med, color: PALETTE.textLow, marginTop: -4 },
  scoreDivider: { width: 60, height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.gold + "55", marginVertical: 10 },
  mandateTitle: { fontSize: 18, fontFamily: FONT.bold, letterSpacing: 0.5, textAlign: "center" },
  mandateSub: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, textAlign: "center", lineHeight: 16 },
  scoreTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden", marginTop: 14 },
  scoreFill: { height: "100%", borderRadius: 3 },

  section: { padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },

  indicatorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  indicatorLabel: { fontSize: 11, fontFamily: FONT.med, color: PALETTE.textMid, width: 84 },
  indicatorTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  indicatorFill: { height: "100%", borderRadius: 3 },
  indicatorVal: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textHigh, width: 38, textAlign: "right" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { width: "30%", flexGrow: 1, alignItems: "center", gap: 4, paddingVertical: 10, borderRadius: RADIUS.sm, backgroundColor: PALETTE.panelHi, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },
  statVal: { fontSize: 15, fontFamily: FONT.bold },
  statLabel: { fontSize: 8, fontFamily: FONT.med, color: PALETTE.textLow, letterSpacing: 0.5, textAlign: "center" },

  rewardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rewardChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: PALETTE.gold + "55" },
  rewardIcon: { fontSize: 16 },
  rewardVal: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.gold },

  offlineBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.warning + "55", backgroundColor: PALETTE.warning + "0d" },
  offlineBannerTitle: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.warning, letterSpacing: 0.5 },
  offlineBannerSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, marginTop: 2, lineHeight: 15 },

  rankedResult: { alignItems: "center", gap: 4, paddingVertical: 16, paddingHorizontal: 20, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.gold + "55", backgroundColor: PALETTE.gold + "0d", marginBottom: 8 },
  rankedResultLabel: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  rankedResultScore: { fontSize: 40, fontFamily: FONT.bold, color: PALETTE.gold },
  rankedResultSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid },

  newMandateBtn: { borderRadius: RADIUS.sm, overflow: "hidden", marginTop: 8 },
  newMandateInner: { paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 12 },
  newMandateText: { fontSize: 12, fontFamily: FONT.bold, color: "#fff", letterSpacing: 3 },
  mandateRule: { width: 16, height: 1, backgroundColor: "rgba(255,255,255,0.4)" },
  newMandateHint: { textAlign: "center", fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, letterSpacing: 0.3 },

  panelGrid: { gap: 10 },
  panelGridLandscape: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sectionLandscape: { flexBasis: "48%", flexGrow: 1 },

  traceStats: { flexDirection: "row", gap: 8 },
  traceStatCell: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 8, borderRadius: RADIUS.xs, backgroundColor: PALETTE.panelHi, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },
  traceStatNum: { fontSize: 18, fontFamily: FONT.bold },
  traceStatLabel: { fontSize: 7, fontFamily: FONT.med, color: PALETTE.textLow, letterSpacing: 0.5, textAlign: "center" },

  decisionRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  decisionWeight:    { width: 38, height: 38, borderRadius: RADIUS.xs, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  decisionWeightNum: { fontSize: 14, fontFamily: FONT.bold },
  decisionTitle:     { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh, lineHeight: 15 },
  decisionChoice:    { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14, marginTop: 1 },
  decisionLabel:     { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 0.8, marginTop: 2 },

  repTitle:    { fontSize: 15, fontFamily: FONT.bold, letterSpacing: 0.3 },
  repSubtitle: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15, marginBottom: 4 },
  repBars:     { gap: 5 },
  repBar:      { flexDirection: "row", alignItems: "center", gap: 6 },
  repBarLabel: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1, width: 80 },
  repBarTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  repBarFill:  { height: "100%", borderRadius: 2 },
  repBarVal:   { fontSize: 10, fontFamily: FONT.bold, width: 28, textAlign: "right" },

  memTraceRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  memorySeverityDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
  memTraceTitle: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.textHigh },
  memTraceDesc: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 13 },
  memTraceImpact: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.danger, minWidth: 24, textAlign: "right" },

  contradictionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  contradictionDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
  contradictionTheme: { fontSize: 8, fontFamily: FONT.bold, color: "#c44b4b", letterSpacing: 1.5 },
  contradictionStmt: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 13, fontStyle: "italic" },
  contradictionRisk: { fontSize: 11, fontFamily: FONT.bold, minWidth: 32, textAlign: "right" },

  // Solvabilité
  solvencyScore:     { fontSize: 16, fontFamily: FONT.bold },
  solvencyScoreMax:  { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textLow },
  solvencyTrack:     { height: 5, borderRadius: 3, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  solvencyFill:      { height: "100%", borderRadius: 3 },
  solvencyLabel:     { fontSize: 11, fontFamily: FONT.semi },
  solvencyGrid:      { gap: 5 },
  solvencyItem:      { flexDirection: "row", alignItems: "center", gap: 6 },
  solvencyItemLabel: { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textMid, width: 60 },
  solvencyItemTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: PALETTE.panelEdge, overflow: "hidden" },
  solvencyItemFill:  { height: "100%", borderRadius: 2 },
  solvencyItemVal:   { fontSize: 9, fontFamily: FONT.bold, width: 30, textAlign: "right" },
});
