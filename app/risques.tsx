import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { INSURANCE_PRODUCT_LIST } from "@/data/insuranceProducts";
import { computeDynamicPremium, getRiskLabel } from "@/logic/insuranceEngine";
import { CAT_BOND_DEF_LIST, computeEffectiveCapital, computeEffectiveCoupon, getMarketLabel } from "@/logic/catBondEngine";
import { computeSolvencyScore, getSolvencyHint } from "@/logic/solvencyEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

export default function RisquesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, buyInsurance, cancelInsurance, emitCatBond } = useStrategy();

  if (!state) return null;

  const policies = state.insurancePolicies ?? [];
  const solvency = computeSolvencyScore(state);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#0a0e18", "#060810"]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backBtn}>← RETOUR</Text>
          </Pressable>
          <Text style={styles.headerTitle}>RISQUES NATIONAUX</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerSub}>
          Souscrivez des assurances pour réduire l'impact financier des crises majeures.
          Les primes augmentent si vous négligez le domaine couvert.
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── SOLVABILITÉ NATIONALE ─── */}
        <View style={[styles.solvencyBanner, { borderColor: solvency.color + "44", backgroundColor: solvency.color + "0d" }]}>
          <View style={styles.solvencyTop}>
            <View style={styles.solvencyLeft}>
              <Text style={styles.solvencyKicker}>SOLVABILITÉ NATIONALE</Text>
              <Text style={[styles.solvencyLabel, { color: solvency.color }]}>{solvency.label}</Text>
            </View>
            <View style={[styles.solvencyScoreBadge, { borderColor: solvency.color + "66", backgroundColor: solvency.color + "18" }]}>
              <Text style={[styles.solvencyScoreNum, { color: solvency.color }]}>{solvency.score}</Text>
              <Text style={[styles.solvencyScoreMax, { color: solvency.color + "99" }]}>/100</Text>
            </View>
          </View>
          <View style={[styles.solvencyTrack, { backgroundColor: solvency.color + "20" }]}>
            <View style={[styles.solvencyFill, { width: `${solvency.score}%`, backgroundColor: solvency.color }]} />
          </View>
          <Text style={styles.solvencyHint}>{getSolvencyHint(solvency.band)}</Text>
          {solvency.premiumMultiplier > 1.0 && (
            <View style={styles.solvencySurcharge}>
              <MaterialCommunityIcons name="alert-outline" size={10} color={solvency.color} />
              <Text style={[styles.solvencySurchargeText, { color: solvency.color }]}>
                Surcoût assurance : +{Math.round((solvency.premiumMultiplier - 1) * 100)}% — solvabilité insuffisante
              </Text>
            </View>
          )}
        </View>

        {INSURANCE_PRODUCT_LIST.map((def) => {
          const policy = policies.find((p) => p.productId === def.id);
          const isActive = policy?.active ?? false;
          const premium = computeDynamicPremium(def.id, state, policy);
          const risk = getRiskLabel(def.id, state);
          const hasMalus = (policy?.claimCount ?? 0) > 0;

          return (
            <View
              key={def.id}
              style={[
                styles.card,
                {
                  borderColor: isActive ? def.color + "55" : PALETTE.panelEdge,
                  backgroundColor: isActive ? def.color + "08" : PALETTE.panelHi,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{def.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: isActive ? def.color : PALETTE.textHigh }]}>
                    {def.name}
                  </Text>
                  <Text style={styles.cardRisk} numberOfLines={2}>{def.coveredRisk}</Text>
                </View>
                {isActive && (
                  <View style={[styles.activeBadge, { borderColor: def.color + "55", backgroundColor: def.color + "1a" }]}>
                    <Text style={[styles.activeBadgeText, { color: def.color }]}>ACTIF</Text>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>COUVERTURE</Text>
                  <Text style={[styles.statVal, { color: def.color }]}>{Math.round(def.coverageRate * 100)}%</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>FRANCHISE</Text>
                  <Text style={styles.statVal}>{def.deductible} M€</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>PLAFOND</Text>
                  <Text style={styles.statVal}>{def.maxPayout} M€</Text>
                </View>
              </View>

              {/* Premium row */}
              <View style={styles.premiumRow}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.premiumLabel}>PRIME D'ACTIVATION</Text>
                  <View style={styles.premiumValueRow}>
                    <Text style={styles.premiumVal}>{premium} M€</Text>
                    {hasMalus && (
                      <View style={styles.malusChip}>
                        <Text style={styles.malusText}>malus ×{policy!.claimCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.riskChip, { borderColor: risk.color + "55", backgroundColor: risk.color + "12" }]}>
                  <Text style={[styles.riskChipText, { color: risk.color }]}>{def.riskLabel.toUpperCase()}</Text>
                  <Text style={[styles.riskChipSub, { color: risk.color }]}>{risk.label}</Text>
                </View>
              </View>

              {/* Action */}
              {isActive ? (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Résilier l'assurance",
                      `Résilier ${def.name} ? Vous ne serez plus couvert en cas de crise liée à ce domaine.`,
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Résilier", style: "destructive", onPress: () => cancelInsurance(def.id) },
                      ],
                    );
                  }}
                  style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.cancelBtnText}>RÉSILIER L'ASSURANCE</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    const r = buyInsurance(def.id);
                    if (!r.success) Alert.alert("Impossible", r.reason ?? "Fonds insuffisants");
                  }}
                  style={({ pressed }) => [
                    styles.buyBtn,
                    { borderColor: def.color + "88", backgroundColor: def.color + "18", opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <MaterialCommunityIcons name="shield-check-outline" size={13} color={def.color} />
                  <Text style={[styles.buyBtnText, { color: def.color }]}>SOUSCRIRE — {premium} M€</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* ─── OBLIGATIONS CATASTROPHE ─── */}
        {(() => {
          const bonds = state.activeCatBonds ?? [];
          const market = state.catBondMarket ?? { totalIssuances: 0, marketSkepticism: 0 };
          const marketStatus = getMarketLabel(market.marketSkepticism);
          return (
            <>
              {/* En-tête section */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="chart-line" size={14} color={PALETTE.gold} />
                  <Text style={styles.sectionTitle}>OBLIGATIONS CATASTROPHE</Text>
                </View>
                <View style={[styles.marketChip, { borderColor: marketStatus.color + "55", backgroundColor: marketStatus.color + "12" }]}>
                  <Text style={[styles.marketChipText, { color: marketStatus.color }]}>{marketStatus.label}</Text>
                </View>
              </View>
              <Text style={styles.sectionDesc}>
                Émettez une obligation pour lever des capitaux auprès des marchés. En cas de crise couverte, le capital absorbe 75% des pertes. Sans crise, vous remboursez le coupon à l'expiration.
              </Text>

              {CAT_BOND_DEF_LIST.map((def) => {
                const activeBond = bonds.find((b) => !b.triggered && b.typeId === def.id);
                const isActive = !!activeBond;
                const effectiveCapital = computeEffectiveCapital(def, market.marketSkepticism);
                const effectiveCoupon = computeEffectiveCoupon(def, market.marketSkepticism);
                const actionsLeft = isActive ? Math.max(0, activeBond.expiresAtAction - state.news.actionCount) : null;

                return (
                  <View
                    key={def.id}
                    style={[
                      styles.bondCard,
                      {
                        borderColor: !def.available
                          ? PALETTE.panelEdge
                          : isActive
                          ? def.color + "55"
                          : PALETTE.panelEdge,
                        backgroundColor: isActive ? def.color + "08" : PALETTE.panelHi,
                        opacity: def.available ? 1 : 0.5,
                      },
                    ]}
                  >
                    <View style={styles.bondHeader}>
                      <Text style={styles.bondIcon}>{def.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.bondTitleRow}>
                          <Text style={[styles.bondName, { color: isActive ? def.color : PALETTE.textHigh }]}>
                            {def.name}
                          </Text>
                          {!def.available && (
                            <View style={styles.lockedChip}>
                              <Text style={styles.lockedText}>V2</Text>
                            </View>
                          )}
                          {isActive && (
                            <View style={[styles.activeBondBadge, { borderColor: def.color + "55", backgroundColor: def.color + "1a" }]}>
                              <Text style={[styles.activeBondText, { color: def.color }]}>
                                ACTIF · {actionsLeft} actions restantes
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.bondRiskLabel}>{def.riskLabel}</Text>
                      </View>
                    </View>

                    <View style={styles.bondStats}>
                      <View style={styles.bondStat}>
                        <Text style={styles.bondStatLabel}>CAPITAL LEVÉ</Text>
                        <Text style={[styles.bondStatVal, { color: "#3fbe7a" }]}>+{effectiveCapital} M€</Text>
                      </View>
                      <View style={styles.bondStatDiv} />
                      <View style={styles.bondStat}>
                        <Text style={styles.bondStatLabel}>COUPON DÛ</Text>
                        <Text style={[styles.bondStatVal, { color: PALETTE.danger }]}>−{effectiveCoupon} M€</Text>
                      </View>
                      <View style={styles.bondStatDiv} />
                      <View style={styles.bondStat}>
                        <Text style={styles.bondStatLabel}>DURÉE</Text>
                        <Text style={styles.bondStatVal}>{def.durationActions} actions</Text>
                      </View>
                    </View>

                    {def.available && !isActive && (
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            `Émettre ${def.name}`,
                            `Vous collectez ${effectiveCapital} M€ immédiatement. En l'absence de crise couverte, vous remboursez ${effectiveCoupon} M€ à l'expiration. La dette nationale augmentera légèrement.`,
                            [
                              { text: "Annuler", style: "cancel" },
                              {
                                text: "Émettre",
                                onPress: () => {
                                  const r = emitCatBond(def.id);
                                  if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur");
                                },
                              },
                            ],
                          );
                        }}
                        style={({ pressed }) => [
                          styles.emitBtn,
                          { borderColor: def.color + "88", backgroundColor: def.color + "18", opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <MaterialCommunityIcons name="bank-outline" size={13} color={def.color} />
                        <Text style={[styles.emitBtnText, { color: def.color }]}>
                          ÉMETTRE — +{effectiveCapital} M€
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}

              {market.totalIssuances > 0 && (
                <View style={styles.marketInfoRow}>
                  <MaterialCommunityIcons name="trending-up" size={11} color={PALETTE.textLow} />
                  <Text style={styles.marketInfoText}>
                    {market.totalIssuances} émission{market.totalIssuances > 1 ? "s" : ""} · Méfiance marchés : {market.marketSkepticism}%
                    {market.marketSkepticism >= 40 ? " — Capital réduit, coupon majoré" : ""}
                  </Text>
                </View>
              )}
            </>
          );
        })()}

        {/* Légende */}
        <View style={styles.legend}>
          <MaterialCommunityIcons name="information-outline" size={12} color={PALETTE.textLow} />
          <Text style={styles.legendText}>
            La franchise est déduite avant remboursement. Le plafond limite le montant remboursé par sinistre.
            Les primes augmentent après chaque sinistre déclaré.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PALETTE.panelEdge },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  backBtn: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  headerTitle: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 2.5 },
  headerSub: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 16 },

  content: { padding: 16, gap: 12 },

  solvencyBanner: { borderRadius: RADIUS.md, borderWidth: 1, padding: 12, gap: 8 },
  solvencyTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  solvencyLeft: { gap: 2 },
  solvencyKicker: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 2 },
  solvencyLabel: { fontSize: 13, fontFamily: FONT.bold },
  solvencyScoreBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "baseline", gap: 2 },
  solvencyScoreNum: { fontSize: 22, fontFamily: FONT.bold },
  solvencyScoreMax: { fontSize: 10, fontFamily: FONT.med },
  solvencyTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  solvencyFill: { height: 4, borderRadius: 2 },
  solvencyHint: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14 },
  solvencySurcharge: { flexDirection: "row", alignItems: "center", gap: 4 },
  solvencySurchargeText: { fontSize: 9, fontFamily: FONT.semi },

  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardIcon: { fontSize: 22, lineHeight: 28 },
  cardName: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3, lineHeight: 17 },
  cardRisk: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 14, marginTop: 2 },
  activeBadge: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  activeBadgeText: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1.5 },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.panelEdge,
    paddingTop: 10,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statLabel: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.2 },
  statVal: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },
  statDivider: { width: 1, height: 28, backgroundColor: PALETTE.panelEdge },

  premiumRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  premiumLabel: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1.2 },
  premiumValueRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  premiumVal: { fontSize: 18, fontFamily: FONT.bold, color: PALETTE.textHigh },
  malusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, backgroundColor: "#e5484818", borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5484844" },
  malusText: { fontSize: 8, fontFamily: FONT.semi, color: "#e54848" },
  riskChip: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, alignItems: "center", gap: 2 },
  riskChipText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 1 },
  riskChipSub: { fontSize: 10, fontFamily: FONT.bold },

  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingVertical: 11,
  },
  buyBtnText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1.5 },

  cancelBtn: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#e5484844",
    backgroundColor: "#e5484810",
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 10, fontFamily: FONT.bold, color: "#e54848", letterSpacing: 1.5 },

  legend: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
  },
  legendText: { flex: 1, fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 14 },

  // ── Cat bonds ──
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  marketChip: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  marketChipText: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 0.8 },
  sectionDesc: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15 },

  bondCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  bondHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bondIcon: { fontSize: 18, lineHeight: 24 },
  bondTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  bondName: { fontSize: 13, fontFamily: FONT.bold, letterSpacing: 0.3 },
  bondRiskLabel: { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textMid, marginTop: 2 },
  lockedChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, backgroundColor: PALETTE.panelEdge },
  lockedText: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.5 },
  activeBondBadge: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  activeBondText: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 0.8 },

  bondStats: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PALETTE.panelEdge, paddingTop: 8 },
  bondStat: { flex: 1, alignItems: "center", gap: 3 },
  bondStatLabel: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },
  bondStatVal: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },
  bondStatDiv: { width: 1, height: 26, backgroundColor: PALETTE.panelEdge },

  emitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingVertical: 10,
  },
  emitBtnText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1.5 },

  marketInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, paddingHorizontal: 4 },
  marketInfoText: { flex: 1, fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, lineHeight: 13 },
});
