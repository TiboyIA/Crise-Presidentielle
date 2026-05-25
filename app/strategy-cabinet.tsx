import React, { useState } from "react";
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import {
  STRATEGY_MINISTERS, CABINET_PRIMARY, CABINET_SECONDARY,
  type StrategyMinisterId,
} from "@/data/strategyMinisters";
import {
  getCandidatesForPosition, previewAppointment,
  type MinisterCandidate,
} from "@/logic/successionEngine";
import { getFatigueTier } from "@/logic/ministerBurnoutEngine";
import {
  CONFLICT_DEFS,
  type ConflictResolution,
} from "@/logic/cabinetConflictEngine";
import type { CabinetConflict } from "@/types/strategy";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

// ── Helpers ───────────────────────────────────────────────────────────────────

function delta(a: number, b: number) {
  const d = a - b;
  if (d === 0) return { label: "=", color: PALETTE.textLow };
  return d > 0
    ? { label: `+${d}`, color: PALETTE.success }
    : { label: `${d}`, color: PALETTE.danger };
}

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.statTrack}>
      <View style={[styles.statFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Carte candidat ────────────────────────────────────────────────────────────

function CandidateCard({
  candidate, current, specialtyColor, onAppoint,
}: {
  candidate: MinisterCandidate;
  current: { loyalty: number; competence: number; scandalRisk: number };
  specialtyColor: string;
  onAppoint: () => void;
}) {
  const preview  = previewAppointment(candidate, { id: "", loyalty: current.loyalty, competence: current.competence, scandalRisk: current.scandalRisk });
  const compD    = delta(candidate.competence, current.competence);
  const loyD     = delta(candidate.loyalty,    current.loyalty);
  const costHigh = candidate.politicalCost >= 50;
  const riskHigh = candidate.appointmentRisk >= 50;

  return (
    <View style={[styles.candidateCard, { borderLeftColor: specialtyColor + "66" }]}>
      {/* En-tête candidat */}
      <View style={styles.candidateHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.candidateName}>{candidate.name}</Text>
          <Text style={[styles.candidateDomain, { color: specialtyColor }]}>{candidate.domain}</Text>
        </View>
        <Pressable
          onPress={onAppoint}
          style={({ pressed }) => [styles.appointBtn, { borderColor: specialtyColor + "88", opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="account-check-outline" size={13} color={specialtyColor} />
          <Text style={[styles.appointBtnLabel, { color: specialtyColor }]}>Nommer</Text>
        </Pressable>
      </View>

      {/* Comparaison stats */}
      <View style={styles.candidateStats}>
        <View style={styles.candidateStatRow}>
          <Text style={styles.statKey}>Compétence</Text>
          <View style={styles.statBarWrap}>
            <StatBar value={candidate.competence} color={specialtyColor + "aa"} />
          </View>
          <Text style={styles.statVal}>{candidate.competence}</Text>
          <Text style={[styles.statDelta, { color: compD.color }]}>{compD.label}</Text>
        </View>
        <View style={styles.candidateStatRow}>
          <Text style={styles.statKey}>Loyauté</Text>
          <View style={styles.statBarWrap}>
            <StatBar value={candidate.loyalty} color={PALETTE.gold + "aa"} />
          </View>
          <Text style={styles.statVal}>{candidate.loyalty}</Text>
          <Text style={[styles.statDelta, { color: loyD.color }]}>{loyD.label}</Text>
        </View>
        <View style={styles.candidateStatRow}>
          <Text style={styles.statKey}>Charisme</Text>
          <View style={styles.statBarWrap}>
            <StatBar value={candidate.charisma} color={PALETTE.info + "aa"} />
          </View>
          <Text style={styles.statVal}>{candidate.charisma}</Text>
        </View>
        <View style={styles.candidateStatRow}>
          <Text style={styles.statKey}>Intégrité</Text>
          <View style={styles.statBarWrap}>
            <StatBar value={candidate.integrity} color={PALETTE.success + "aa"} />
          </View>
          <Text style={styles.statVal}>{candidate.integrity}</Text>
        </View>
        <View style={styles.candidateStatRow}>
          <Text style={styles.statKey}>Expérience crises</Text>
          <View style={styles.statBarWrap}>
            <StatBar value={candidate.crisisExperience} color={PALETTE.warning + "aa"} />
          </View>
          <Text style={styles.statVal}>{candidate.crisisExperience}</Text>
        </View>
      </View>

      {/* Badges coût / risque */}
      <View style={styles.candidateBadges}>
        <View style={[styles.costBadge, costHigh && styles.costBadgeHigh]}>
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={9}
            color={costHigh ? PALETTE.warning : PALETTE.textLow}
          />
          <Text style={[styles.badgeText, { color: costHigh ? PALETTE.warning : PALETTE.textLow }]}>
            Coût politique {candidate.politicalCost >= 65 ? "élevé" : candidate.politicalCost >= 40 ? "modéré" : "faible"}
          </Text>
        </View>
        {riskHigh && (
          <View style={[styles.costBadge, styles.riskBadge]}>
            <MaterialCommunityIcons name="alert-outline" size={9} color={PALETTE.danger} />
            <Text style={[styles.badgeText, { color: PALETTE.danger }]}>Risque médiatique</Text>
          </View>
        )}
        {preview.notes.map((n, i) => (
          <Text key={i} style={styles.previewNote}>· {n}</Text>
        ))}
      </View>
    </View>
  );
}

// ── Carte conflit ─────────────────────────────────────────────────────────────

function ConflictCard({
  conflict,
  onArbitrate,
}: {
  conflict: CabinetConflict;
  onArbitrate: (resolution: ConflictResolution) => void;
}) {
  const { state } = useStrategy();
  if (!state) return null;

  const def  = CONFLICT_DEFS[conflict.reason];
  const mA   = state.strategyMinisters.find((m) => m.id === conflict.ministerA);
  const mB   = state.strategyMinisters.find((m) => m.id === conflict.ministerB);
  const defA = STRATEGY_MINISTERS[conflict.ministerA as StrategyMinisterId];
  const defB = STRATEGY_MINISTERS[conflict.ministerB as StrategyMinisterId];
  if (!mA || !mB || !defA || !defB) return null;

  const nameA = mA.name ?? defA.name;
  const nameB = mB.name ?? defB.name;

  const confirmArbitrate = (resolution: ConflictResolution) => {
    const labels: Record<ConflictResolution, string> = {
      support_a:  `Soutenir ${nameA.split(" ")[0]}`,
      support_b:  `Soutenir ${nameB.split(" ")[0]}`,
      compromise: "Imposer un compromis",
    };
    const consequences: Record<ConflictResolution, string> = {
      support_a:  `${nameB.split(" ")[0]} perd 6 points de loyauté. ${nameA.split(" ")[0]} en gagne 4. Risque de scandale +5.`,
      support_b:  `${nameA.split(" ")[0]} perd 6 points de loyauté. ${nameB.split(" ")[0]} en gagne 4. Risque de scandale +5.`,
      compromise: `Les deux gagnent 2 points de loyauté. Stabilité institutionnelle +5.`,
    };
    Alert.alert(
      labels[resolution],
      consequences[resolution],
      [
        { text: "Annuler", style: "cancel" },
        { text: "Confirmer", onPress: () => onArbitrate(resolution) },
      ],
    );
  };

  const intensityColor =
    conflict.intensity > 70 ? PALETTE.danger :
    conflict.intensity > 50 ? PALETTE.warning : def.color;

  return (
    <View style={[styles.conflictCard, { borderLeftColor: def.color }]}>
      {/* En-tête conflit */}
      <View style={styles.conflictHeader}>
        <MaterialCommunityIcons name={def.icon as any} size={13} color={def.color} />
        <Text style={[styles.conflictReason, { color: def.color }]}>{def.label.toUpperCase()}</Text>
        <View style={styles.conflictIntensityWrap}>
          <View style={styles.conflictIntensityTrack}>
            <View style={[styles.conflictIntensityFill, { width: `${conflict.intensity}%`, backgroundColor: intensityColor }]} />
          </View>
          <Text style={[styles.conflictIntensityVal, { color: intensityColor }]}>{conflict.intensity}</Text>
        </View>
      </View>

      {/* Protagonistes */}
      <View style={styles.conflictProtagonists}>
        <View style={[styles.conflictMinister, { borderColor: defA.specialtyColor + "55" }]}>
          <Text style={[styles.conflictMinisterSpec, { color: defA.specialtyColor }]}>{defA.specialty[0]}</Text>
          <Text style={styles.conflictMinisterName} numberOfLines={1}>{nameA.split(" ")[0]}</Text>
        </View>
        <Text style={styles.conflictVs}>vs</Text>
        <View style={[styles.conflictMinister, { borderColor: defB.specialtyColor + "55" }]}>
          <Text style={[styles.conflictMinisterSpec, { color: defB.specialtyColor }]}>{defB.specialty[0]}</Text>
          <Text style={styles.conflictMinisterName} numberOfLines={1}>{nameB.split(" ")[0]}</Text>
        </View>
      </View>

      {/* Motif */}
      <Text style={styles.conflictDescription}>{def.description}</Text>

      {/* Actions d'arbitrage */}
      <View style={styles.conflictActions}>
        <Pressable
          onPress={() => confirmArbitrate("support_a")}
          style={({ pressed }) => [styles.conflictBtn, { borderColor: defA.specialtyColor + "66", opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.conflictBtnText, { color: defA.specialtyColor }]} numberOfLines={1}>
            {nameA.split(" ")[0]} ↑
          </Text>
        </Pressable>
        <Pressable
          onPress={() => confirmArbitrate("compromise")}
          style={({ pressed }) => [styles.conflictBtn, styles.conflictBtnCenter, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="handshake-outline" size={11} color={PALETTE.gold} />
          <Text style={[styles.conflictBtnText, { color: PALETTE.gold }]}>Compromis</Text>
        </Pressable>
        <Pressable
          onPress={() => confirmArbitrate("support_b")}
          style={({ pressed }) => [styles.conflictBtn, { borderColor: defB.specialtyColor + "66", opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.conflictBtnText, { color: defB.specialtyColor }]} numberOfLines={1}>
            {nameB.split(" ")[0]} ↑
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Carte ministre ────────────────────────────────────────────────────────────

function MinisterFullCard({
  ministerId, isExpanded, onToggle, onAppoint, onRest, onDelegate, onFire, fatigueMap,
}: {
  ministerId: StrategyMinisterId;
  isExpanded: boolean;
  onToggle: () => void;
  onAppoint: (c: MinisterCandidate) => void;
  onRest: () => void;
  onDelegate: () => void;
  onFire: () => void;
  fatigueMap: Record<string, number>;
}) {
  const { state } = useStrategy();
  if (!state) return null;
  const def = STRATEGY_MINISTERS[ministerId];
  const m   = state.strategyMinisters.find((x) => x.id === ministerId);
  if (!def || !m) return null;

  const displayName  = m.name ?? def.name;
  const fatigue      = fatigueMap[ministerId] ?? 0;
  const ft           = getFatigueTier(fatigue);
  const loyaltyColor = m.loyalty < 40 ? PALETTE.danger : m.loyalty < 60 ? PALETTE.warning : def.specialtyColor;
  const candidates   = getCandidatesForPosition(ministerId);

  return (
    <View style={[styles.ministerCard, { borderTopColor: def.specialtyColor }]}>
      {/* En-tête */}
      <View style={styles.ministerCardHeader}>
        <View style={[styles.specDot, { backgroundColor: def.specialtyColor + "25", borderColor: def.specialtyColor + "55" }]}>
          <Text style={[styles.specLetter, { color: def.specialtyColor }]}>{def.specialty[0]}</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.ministerTitle}>{def.title}</Text>
          <Text style={[styles.ministerFullName, { color: def.specialtyColor }]}>{displayName}</Text>
        </View>
        <View style={[styles.specialtyBadge, { borderColor: def.specialtyColor + "44", backgroundColor: def.specialtyColor + "14" }]}>
          <Text style={[styles.specialtyText, { color: def.specialtyColor }]}>{def.specialty}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.ministerStats}>
        <View style={styles.statLine}>
          <Text style={styles.statLineKey}>LOYAUTÉ</Text>
          <StatBar value={m.loyalty} color={loyaltyColor} />
          <Text style={[styles.statLineVal, { color: loyaltyColor }]}>{m.loyalty}</Text>
          {m.loyalty < 40
            ? <Text style={[styles.alertTag, { color: PALETTE.danger }]}>CRITIQUE</Text>
            : m.loyalty < 60
            ? <Text style={[styles.alertTag, { color: PALETTE.warning }]}>VIGILANCE</Text>
            : null}
        </View>
        <View style={styles.statLine}>
          <Text style={styles.statLineKey}>COMPÉTENCE</Text>
          <StatBar value={m.competence} color={def.specialtyColor + "cc"} />
          <Text style={[styles.statLineVal, { color: PALETTE.textMid }]}>{m.competence}</Text>
        </View>
        <View style={styles.statLine}>
          <Text style={styles.statLineKey}>RISQUE</Text>
          <StatBar value={m.scandalRisk} color={m.scandalRisk > 40 ? PALETTE.warning : PALETTE.textLow} />
          <Text style={[styles.statLineVal, { color: m.scandalRisk > 40 ? PALETTE.warning : PALETTE.textLow }]}>{m.scandalRisk}</Text>
        </View>
        {fatigue > 0 && (
          <View style={styles.statLine}>
            <Text style={styles.statLineKey}>FATIGUE</Text>
            <StatBar value={fatigue} color={ft.color} />
            <Text style={[styles.statLineVal, { color: ft.color }]}>{ft.label}</Text>
          </View>
        )}
      </View>

      {/* Actions rapides */}
      <View style={styles.ministerActions}>
        {fatigue > 60 && (
          <Pressable onPress={onRest} style={({ pressed }) => [styles.actionChip, { opacity: pressed ? 0.7 : 1 }]}>
            <MaterialCommunityIcons name="sleep" size={11} color={ft.color} />
            <Text style={[styles.actionChipText, { color: ft.color }]}>Repos</Text>
          </Pressable>
        )}
        {fatigue > 60 && (
          <Pressable onPress={onDelegate} style={({ pressed }) => [styles.actionChip, { opacity: pressed ? 0.7 : 1 }]}>
            <MaterialCommunityIcons name="account-arrow-right-outline" size={11} color={PALETTE.textMid} />
            <Text style={[styles.actionChipText, { color: PALETTE.textMid }]}>Déléguer</Text>
          </Pressable>
        )}
        {m.loyalty < 40 && (
          <Pressable onPress={onFire} style={({ pressed }) => [styles.actionChip, styles.actionChipDanger, { opacity: pressed ? 0.7 : 1 }]}>
            <MaterialCommunityIcons name="account-remove-outline" size={11} color={PALETTE.danger} />
            <Text style={[styles.actionChipText, { color: PALETTE.danger }]}>Limoger</Text>
          </Pressable>
        )}
        <Pressable onPress={onToggle} style={({ pressed }) => [styles.actionChip, styles.actionChipToggle, { opacity: pressed ? 0.7 : 1 }]}>
          <MaterialCommunityIcons
            name={isExpanded ? "chevron-up" : "account-switch-outline"}
            size={11}
            color={PALETTE.textMid}
          />
          <Text style={[styles.actionChipText, { color: PALETTE.textMid }]}>
            {isExpanded ? "Masquer" : `${candidates.length} remplaçants`}
          </Text>
        </Pressable>
      </View>

      {/* Panel de succession */}
      {isExpanded && (
        <View style={styles.candidatesPanel}>
          <Text style={styles.candidatesPanelTitle}>PLAN DE SUCCESSION</Text>
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              current={{ loyalty: m.loyalty, competence: m.competence, scandalRisk: m.scandalRisk }}
              specialtyColor={def.specialtyColor}
              onAppoint={() => onAppoint(c)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function StrategyCabinetScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { state, appointMinister, restMinister, delegateMinister, fireMinister, arbitrateConflict } = useStrategy();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!state) return null;

  const fatigueMap = state.ministerFatigue ?? {};

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const confirmAppoint = (ministerId: string, candidate: MinisterCandidate) => {
    const def = STRATEGY_MINISTERS[ministerId as StrategyMinisterId];
    Alert.alert(
      `Nommer ${candidate.name}`,
      `${candidate.name} prend le poste de ${def?.title ?? ministerId}.\n\nCompétence : ${candidate.competence} · Loyauté : ${candidate.loyalty}\n\nCoût politique : ${candidate.politicalCost >= 50 ? "ÉLEVÉ" : "modéré"}`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer la nomination",
          onPress: () => {
            appointMinister(ministerId, candidate);
            setExpandedId(null);
          },
        },
      ],
    );
  };

  const confirmFire = (ministerId: string, name: string) => {
    Alert.alert(
      `Limoger ${name}`,
      "Remplacer ce ministre ? (-5 confiance élites, -3 popularité)",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Limoger", style: "destructive", onPress: () => fireMinister(ministerId) },
      ],
    );
  };

  const allIds = [...CABINET_PRIMARY, ...CABINET_SECONDARY];
  const avgLoyalty    = Math.round(state.strategyMinisters.reduce((s, m) => s + m.loyalty,    0) / state.strategyMinisters.length);
  const avgCompetence = Math.round(state.strategyMinisters.reduce((s, m) => s + m.competence, 0) / state.strategyMinisters.length);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1c1814", "#0a0c14"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.gold} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>GOUVERNEMENT</Text>
          <Text style={styles.headerTitle}>CABINET STRATÉGIQUE</Text>
          <Text style={styles.headerSub}>
            {state.strategyMinisters.length} portefeuilles · loyauté moy. {avgLoyalty} · compétence moy. {avgCompetence}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section conflits — visible uniquement si des tensions existent */}
        {(state.cabinetConflicts ?? []).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              TENSIONS INTERNES · {(state.cabinetConflicts ?? []).length}
            </Text>
            {(state.cabinetConflicts ?? []).map((c) => (
              <ConflictCard
                key={c.id}
                conflict={c}
                onArbitrate={(resolution) => arbitrateConflict(c.id, resolution)}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>CABINET PRINCIPAL</Text>
        {CABINET_PRIMARY.map((id) => (
          <MinisterFullCard
            key={id}
            ministerId={id}
            isExpanded={expandedId === id}
            onToggle={() => toggle(id)}
            onAppoint={(c) => confirmAppoint(id, c)}
            onRest={() => { Alert.alert("Repos accordé", `${STRATEGY_MINISTERS[id]?.title ?? id} prend du recul. Fatigue -25.`, [{ text: "OK", onPress: () => restMinister(id) }]); }}
            onDelegate={() => { Alert.alert("Délégation activée", `Une partie du portefeuille est déléguée. Fatigue -15.`, [{ text: "OK", onPress: () => delegateMinister(id) }]); }}
            onFire={() => { const m = state.strategyMinisters.find(x => x.id === id); confirmFire(id, m?.name ?? STRATEGY_MINISTERS[id]?.name ?? id); }}
            fatigueMap={fatigueMap}
          />
        ))}

        <Text style={styles.sectionLabel}>GOUVERNEMENT ÉTENDU</Text>
        {CABINET_SECONDARY.map((id) => (
          <MinisterFullCard
            key={id}
            ministerId={id}
            isExpanded={expandedId === id}
            onToggle={() => toggle(id)}
            onAppoint={(c) => confirmAppoint(id, c)}
            onRest={() => { Alert.alert("Repos accordé", `${STRATEGY_MINISTERS[id]?.title ?? id} prend du recul. Fatigue -25.`, [{ text: "OK", onPress: () => restMinister(id) }]); }}
            onDelegate={() => { Alert.alert("Délégation activée", `Une partie du portefeuille est déléguée. Fatigue -15.`, [{ text: "OK", onPress: () => delegateMinister(id) }]); }}
            onFire={() => { const m = state.strategyMinisters.find(x => x.id === id); confirmFire(id, m?.name ?? STRATEGY_MINISTERS[id]?.name ?? id); }}
            fatigueMap={fatigueMap}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.gold + "33",
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textHigh, letterSpacing: 3 },
  headerSub: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow },

  scroll: { padding: 14, gap: 8 },
  sectionLabel: {
    fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2.5,
    color: PALETTE.gold, marginTop: 8, marginBottom: 4, marginLeft: 2,
  },

  // ── Carte ministre ──────────────────────────────────────────────────────────
  ministerCard: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    borderTopWidth: 2,
    overflow: "hidden",
    gap: 0,
  },
  ministerCardHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  specDot: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  specLetter: { fontSize: 16, fontFamily: FONT.bold },
  ministerTitle: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.5 },
  ministerFullName: { fontSize: 14, fontFamily: FONT.bold },
  specialtyBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth,
  },
  specialtyText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.5 },

  ministerStats: {
    paddingHorizontal: 14, paddingBottom: 10, gap: 5,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PALETTE.panelEdge,
    paddingTop: 10,
  },
  statLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  statLineKey: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 0.5, width: 78 },
  statTrack: {
    flex: 1, height: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 2, overflow: "hidden",
  },
  statFill: { height: 3, borderRadius: 2 },
  statLineVal: { fontSize: 11, fontFamily: FONT.bold, width: 26, textAlign: "right" },
  alertTag: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 0.5 },

  ministerActions: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PALETTE.panelEdge,
  },
  actionChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
  },
  actionChipDanger: { borderColor: PALETTE.danger + "44" },
  actionChipToggle: { marginLeft: "auto" },
  actionChipText: { fontSize: 9, fontFamily: FONT.bold },

  // ── Panel de succession ─────────────────────────────────────────────────────
  candidatesPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.panelEdge,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  candidatesPanelTitle: {
    fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow,
    letterSpacing: 2, marginBottom: 2,
  },

  // ── Carte candidat ──────────────────────────────────────────────────────────
  candidateCard: {
    backgroundColor: PALETTE.panelHi,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    borderLeftWidth: 2,
    padding: 10, gap: 8,
  },
  candidateHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  candidateName: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh },
  candidateDomain: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.5, marginTop: 1 },
  appointBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: 1,
  },
  appointBtnLabel: { fontSize: 10, fontFamily: FONT.bold },

  candidateStats: { gap: 4 },
  candidateStatRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statKey: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, width: 108 },
  statBarWrap: { flex: 1 },
  statVal: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.textMid, width: 22, textAlign: "right" },
  statDelta: { fontSize: 9, fontFamily: FONT.bold, width: 26, textAlign: "right" },

  candidateBadges: { gap: 4 },
  costBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
  },
  costBadgeHigh: { borderColor: PALETTE.warning + "44" },
  riskBadge: { borderColor: PALETTE.danger + "44" },
  badgeText: { fontSize: 9, fontFamily: FONT.med },
  previewNote: {
    fontSize: 10, fontFamily: FONT.reg,
    color: PALETTE.textMid, lineHeight: 15,
  },

  // ── Carte conflit ───────────────────────────────────────────────────────────
  conflictCard: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    borderLeftWidth: 2,
    padding: 12, gap: 10,
  },
  conflictHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  conflictReason: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 1.5, flex: 1 },
  conflictIntensityWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  conflictIntensityTrack: { width: 48, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  conflictIntensityFill: { height: "100%", borderRadius: 2 },
  conflictIntensityVal: { fontSize: 10, fontFamily: FONT.bold, width: 22, textAlign: "right" },

  conflictProtagonists: { flexDirection: "row", alignItems: "center", gap: 8 },
  conflictMinister: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  conflictMinisterSpec: { fontSize: 14, fontFamily: FONT.bold },
  conflictMinisterName: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh, flex: 1 },
  conflictVs: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textLow, letterSpacing: 1 },

  conflictDescription: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15 },

  conflictActions: { flexDirection: "row", gap: 6 },
  conflictBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 6,
    borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  conflictBtnCenter: { borderColor: PALETTE.gold + "44", backgroundColor: PALETTE.gold + "0a" },
  conflictBtnText: { fontSize: 9, fontFamily: FONT.bold },
});
