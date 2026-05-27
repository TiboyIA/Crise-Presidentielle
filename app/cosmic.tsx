/**
 * app/cosmic.tsx — Système Cosmique V2.
 *
 * Tableau de bord unifié : Conseil Interstellaire, Cité d'Orion, Chambre du Seuil.
 * Écran narratif — aucune action directe sur le gameplay.
 * Le cosmique reste secondaire au jeu présidentiel.
 */

import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStrategy } from "@/context/StrategyContext";
import { DEFAULT_COSMIC_STATE } from "@/types/cosmic";
import { COSMIC_STAGE_LABELS, COSMIC_STAGE_COLORS, ORION_ACCESS_LABELS, COSMIC_PACT_LABELS } from "@/types/cosmic";
import type { CosmicState, OrionDistrictId } from "@/types/cosmic";
import {
  getMoralBalanceLabel,
  getMoralBalanceColor,
  getAuroraTrustLabel,
  getObscuriumDebtLabel,
  getCosmicCredibilityLabel,
} from "@/logic/cosmicEngine";
import { CosmicOverviewCard } from "@/components/cosmic/CosmicOverviewCard";
import { CosmicEntityCard } from "@/components/cosmic/CosmicEntityCard";
import { OrionDistrictCard } from "@/components/cosmic/OrionDistrictCard";
import { MoralBalanceBar } from "@/components/cosmic/MoralBalanceBar";
import { CosmicSignalCard } from "@/components/cosmic/CosmicSignalCard";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const ORION_DISTRICT_ORDER: OrionDistrictId[] = [
  "porte_orion",
  "marche_silences",
  "couloir_noir",
  "dome_ambassades",
  "phare_aurora",
  "archives_stellaires",
  "tribunal_especes",
  "chambre_seuil",
];

function SectionHeader({ icon, title, color = PALETTE.textMid }: { icon: McName; title: string; color?: string }) {
  return (
    <View style={sh.row}>
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text style={[sh.text, { color }]}>{title}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  text: { fontSize: 10, fontFamily: FONT.bold, letterSpacing: 1.2 },
});

// ── Panneau de section ────────────────────────────────────────────────────────

function Panel({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={[p.card, accent ? { borderColor: accent + "33" } : {}]}>
      {children}
    </View>
  );
}

const p = StyleSheet.create({
  card: { backgroundColor: "#0d1020", borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "#1e2438", padding: 14, gap: 10 },
});

// ── Écran principal ───────────────────────────────────────────────────────────

export default function CosmicScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { state } = useStrategy();
  const cosmic: CosmicState = state?.cosmicState ?? DEFAULT_COSMIC_STATE;

  const [chambreOpen, setChambreOpen] = useState(false);

  const stageColor = COSMIC_STAGE_COLORS[cosmic.discoveryStage];
  const stageLabel = COSMIC_STAGE_LABELS[cosmic.discoveryStage];

  const cosmicSignals = (state?.news.log ?? []).filter(
    (l) =>
      l.eventId.startsWith("sn_") ||
      l.eventId.startsWith("oc_") ||
      l.eventId.startsWith("ch_") ||
      l.eventId.startsWith("cv_"),
  );
  const lastSignal = cosmicSignals.length > 0 ? cosmicSignals[cosmicSignals.length - 1]?.title ?? null : null;

  const orionAccessLabel  = ORION_ACCESS_LABELS[cosmic.orionAccessLevel];
  const pactLabel         = COSMIC_PACT_LABELS[cosmic.activePact];
  const moralColor        = getMoralBalanceColor(cosmic.moralBalance);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <LinearGradient
        colors={["#07080f", "#0d1020"]}
        style={s.header}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>SYSTÈME COSMIQUE</Text>
          <View style={[s.stagePill, { borderColor: stageColor + "55", backgroundColor: stageColor + "14" }]}>
            <MaterialCommunityIcons name="orbit-variant" size={10} color={stageColor} />
            <Text style={[s.stagePillText, { color: stageColor }]}>{stageLabel}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Section : Vue d'ensemble */}
        <Panel accent="#4a9fff">
          <SectionHeader icon="telescope" title="CONSEIL INTERSTELLAIRE" color="#4a9fff" />
          <CosmicOverviewCard cosmic={cosmic} />
        </Panel>

        {/* Section : Signaux reçus */}
        <Panel>
          <SectionHeader icon="antenna" title="SIGNAUX REÇUS" />
          <CosmicSignalCard
            lastSignal={lastSignal}
            signalCount={cosmicSignals.length}
            discoveredAt={cosmic.firstDiscoveredAt}
          />
        </Panel>

        {/* Section : Forces cosmiques */}
        <Panel accent="#7ec8f7">
          <SectionHeader icon="yin-yang" title="FORCES COSMIQUES" color="#7ec8f7" />
          <CosmicEntityCard
            name="Aurora Prime"
            role="Protecteur conditionnel"
            score={cosmic.auroraSupport}
            scoreLabel="soutien"
            color="#7ec8f7"
            description={getAuroraTrustLabel(cosmic.auroraTrust)}
          />
          <CosmicEntityCard
            name="Obscurium"
            role="Tentateur toxique"
            score={cosmic.obscuriumInfluence}
            scoreLabel="influence"
            color="#9b6fd4"
            description={getObscuriumDebtLabel(cosmic.obscuriumDebt)}
          />
        </Panel>

        {/* Section : Cité d'Orion */}
        <Panel accent="#c8a87e">
          <SectionHeader icon="city-variant-outline" title="CITÉ D'ORION" color="#c8a87e" />

          {!cosmic.orionDiscovered ? (
            <Text style={s.undiscovered}>
              La Cité d'Orion n'a pas encore été détectée. Des signaux du Conseil pourraient en révéler l'existence.
            </Text>
          ) : (
            <>
              <View style={s.orionMeta}>
                <View>
                  <Text style={s.metaLabel}>Réputation</Text>
                  <Text style={[s.metaVal, { color: cosmic.orionStanding >= 50 ? PALETTE.success : cosmic.orionStanding >= 30 ? "#e8c44f" : PALETTE.danger }]}>
                    {cosmic.orionStanding} / 100
                  </Text>
                </View>
                <View>
                  <Text style={s.metaLabel}>Niveau d'accès</Text>
                  <Text style={[s.metaVal, { color: "#c8a87e" }]}>{orionAccessLabel}</Text>
                </View>
              </View>

              <Text style={s.districtTitle}>QUARTIERS CONNUS</Text>
              <View style={s.districtGrid}>
                {ORION_DISTRICT_ORDER.map((id) => (
                  <OrionDistrictCard
                    key={id}
                    districtId={id}
                    known={cosmic.knownDistricts.includes(id)}
                  />
                ))}
              </View>
            </>
          )}
        </Panel>

        {/* Section : Chambre du Seuil */}
        <Panel accent="#a78bfa">
          <Pressable onPress={() => setChambreOpen((v) => !v)} style={s.chambreHeader}>
            <SectionHeader icon="yin-yang" title="CHAMBRE DU SEUIL" color="#a78bfa" />
            <MaterialCommunityIcons
              name={chambreOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={PALETTE.textLow}
            />
          </Pressable>

          {chambreOpen && (
            <>
              <MoralBalanceBar
                balance={cosmic.moralBalance}
                auroraTrust={cosmic.auroraTrust}
                obscuriumDebt={cosmic.obscuriumDebt}
              />

              <View style={s.divider} />

              <View style={s.pactRow}>
                <Text style={s.pactLabel}>Pacte actif</Text>
                <Text style={[s.pactVal, {
                  color: cosmic.activePact === "aurora" ? "#7ec8f7"
                       : cosmic.activePact === "obscurium" ? "#9b6fd4"
                       : cosmic.activePact === "neutral"  ? "#4caf82"
                       : PALETTE.textLow,
                }]}>
                  {pactLabel}
                </Text>
              </View>

              {cosmic.activePact === "aurora" && cosmic.auroraConditionBroken && (
                <View style={s.alertRow}>
                  <MaterialCommunityIcons name="alert" size={12} color={PALETTE.danger} />
                  <Text style={s.alertText}>Les conditions du pacte Aurora ont été violées.</Text>
                </View>
              )}

              <View style={s.auroraMeta}>
                <Text style={[s.auroraTrustText, { color: "#7ec8f7" }]}>
                  {getAuroraTrustLabel(cosmic.auroraTrust)}
                </Text>
                <Text style={[s.obscuriumDebtText, { color: "#9b6fd4" }]}>
                  {getObscuriumDebtLabel(cosmic.obscuriumDebt)}
                </Text>
              </View>
            </>
          )}
        </Panel>

        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#07080f" },
  header:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#141926" },
  backBtn:       { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter:  { flex: 1, alignItems: "center", gap: 4 },
  headerTitle:   { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 1.5 },
  stagePill:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1 },
  stagePillText: { fontSize: 9, fontFamily: FONT.semi, letterSpacing: 0.5 },
  scroll:        { padding: 12, gap: 10 },
  undiscovered:  { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, fontStyle: "italic", lineHeight: 15 },
  orionMeta:     { flexDirection: "row", gap: 24, marginBottom: 8 },
  metaLabel:     { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow, marginBottom: 2 },
  metaVal:       { fontSize: 12, fontFamily: FONT.bold },
  districtTitle: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.8, marginBottom: 6 },
  districtGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chambreHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider:       { height: 1, backgroundColor: "#ffffff0d" },
  pactRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pactLabel:     { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow },
  pactVal:       { fontSize: 10, fontFamily: FONT.semi },
  alertRow:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ff204022", borderRadius: RADIUS.xs, padding: 8 },
  alertText:     { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.danger, flex: 1 },
  auroraMeta:    { gap: 4 },
  auroraTrustText:  { fontSize: 9, fontFamily: FONT.reg },
  obscuriumDebtText: { fontSize: 9, fontFamily: FONT.reg },
});
