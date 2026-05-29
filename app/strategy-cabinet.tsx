import React, { useMemo, useState } from "react";
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
import {
  evaluateCabinetPerformance, summarizeCabinetHealth,
  RATING_INFO, type MinisterPerformanceReport,
} from "@/logic/ministerPerformanceReview";
import {
  TRAINING_PROGRAMS, TRAINING_LIST,
  type TrainingId,
} from "@/data/trainingPrograms";
import { getMinisterTraining } from "@/logic/trainingEngine";
import {
  GOVERNMENT_CULTURES, CULTURE_LIST,
  type GovernmentCultureDef,
} from "@/logic/governmentCultureEngine";
import {
  getTalentDrainTier,
} from "@/logic/publicTalentDrainEngine";
import {
  getConflictBandInfo, getDisclosureStatusColor,
  DECLARATION_COST_INFLUENCE, ETHICS_AUDIT_COST_INFLUENCE,
  SUSPEND_COST_INFLUENCE, DEFEND_COST_INFLUENCE,
} from "@/logic/conflictOfInterestEngine";
import {
  canActivateStaffing, STAFFING_COST_INFLUENCE, STAFFING_OUTCOMES, STAFFING_COOLDOWN_ACTIONS,
} from "@/logic/crisisStaffingEngine";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import type { GovernmentCultureId } from "@/types/strategy";
import type { CabinetConflict } from "@/types/strategy";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

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
  const {
    state, startMinisterTraining,
    requestMinisterDeclaration, launchMinisterEthicsAudit,
    suspendMinisterForConflict, defendMinisterPublicly,
  } = useStrategy();
  const [trainingExpanded, setTrainingExpanded] = useState(false);
  if (!state) return null;
  const def = STRATEGY_MINISTERS[ministerId];
  const m   = state.strategyMinisters.find((x) => x.id === ministerId);
  if (!def || !m) return null;

  const displayName   = m.name ?? def.name;
  const fatigue       = fatigueMap[ministerId] ?? 0;
  const ft            = getFatigueTier(fatigue);
  const loyaltyColor  = m.loyalty < 40 ? PALETTE.danger : m.loyalty < 60 ? PALETTE.warning : def.specialtyColor;
  const candidates    = getCandidatesForPosition(ministerId);
  const activeTraining = getMinisterTraining(state, ministerId);
  const trainingProgress = activeTraining
    ? Math.min(1, (state.news.actionCount - activeTraining.startedAtAction) /
        (activeTraining.completesAtAction - activeTraining.startedAtAction))
    : null;
  const remainingActions = activeTraining
    ? Math.max(0, activeTraining.completesAtAction - state.news.actionCount)
    : null;
  const trainingProgram = activeTraining ? TRAINING_PROGRAMS[activeTraining.programId as TrainingId] : null;

  const confirmStartTraining = (programId: TrainingId) => {
    const prog = TRAINING_PROGRAMS[programId];
    if (!prog) return;
    const costLabel = prog.costMoney
      ? `${prog.costMoney} M€`
      : prog.costInfluence
      ? `${prog.costInfluence} influence`
      : "Gratuit";
    const effectLines = [
      prog.effect.competenceDelta ? `Compétence +${prog.effect.competenceDelta}` : null,
      prog.effect.loyaltyDelta    ? `Loyauté +${prog.effect.loyaltyDelta}`    : null,
      prog.effect.scandalRiskDelta ? `Risque scandale ${prog.effect.scandalRiskDelta}` : null,
    ].filter(Boolean).join(" · ");
    Alert.alert(
      `Former : ${prog.name}`,
      `${prog.description}\n\nCoût : ${costLabel}  ·  Durée : ${prog.durationActions} actions\nEffet : ${effectLines}\nFatigue immédiate : +${prog.fatigueCost}`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Lancer la formation",
          onPress: () => {
            const result = startMinisterTraining!(ministerId, programId);
            if (!result.success) Alert.alert("Impossible", result.reason ?? "Erreur.");
            else setTrainingExpanded(false);
          },
        },
      ],
    );
  };

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
        {activeTraining && trainingProgram && trainingProgress !== null && (
          <View style={styles.statLine}>
            <Text style={[styles.statLineKey, { color: PALETTE.info }]}>FORMATION</Text>
            <StatBar value={Math.round(trainingProgress * 100)} color={PALETTE.info} />
            <Text style={[styles.statLineVal, { color: PALETTE.info, fontSize: 9 }]}>
              -{remainingActions}
            </Text>
          </View>
        )}
      </View>

      {/* ── Conflits d'intérêts ────────────────────────────────────────────── */}
      {(() => {
        const profile = state.ministerConflicts?.[ministerId];
        if (!profile || profile.overallRisk < 25) return null;
        const band = getConflictBandInfo(profile.overallRisk);
        const statusColor = getDisclosureStatusColor(profile.disclosureStatus);
        const canDeclare  = profile.disclosureStatus === "non déclaré";
        const canAudit    = profile.disclosureStatus !== "audité";
        const canSuspend  = !profile.suspended && profile.overallRisk >= 45;
        const canDefend   = profile.overallRisk >= 35;

        return (
          <View style={styles.coiBlock}>
            <View style={styles.coiHeader}>
              <MaterialCommunityIcons name={band.icon as any} size={11} color={band.color} />
              <Text style={[styles.coiTitle, { color: band.color }]}>CONFLIT D'INTÉRÊTS</Text>
              <View style={[styles.coiBadge, { backgroundColor: band.color + "22" }]}>
                <Text style={[styles.coiBadgeText, { color: band.color }]}>{band.label}</Text>
              </View>
              <View style={[styles.coiBadge, { backgroundColor: statusColor + "22" }]}>
                <Text style={[styles.coiBadgeText, { color: statusColor }]}>{profile.disclosureStatus.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.coiBarRow}>
              <Text style={styles.coiBarLabel}>EXPOSITION</Text>
              <View style={styles.coiTrack}>
                <View style={[styles.coiFill, { width: `${profile.overallRisk}%` as `${number}%`, backgroundColor: band.color }]} />
              </View>
              <Text style={[styles.coiBarVal, { color: band.color }]}>{profile.overallRisk}</Text>
            </View>

            {profile.suspended && (
              <Text style={[styles.coiSuspendedNote, { color: "#e8c44f" }]}>
                Écarté — réintégration dans {Math.max(0, profile.suspendedUntilAction - state.news.actionCount)} actions
              </Text>
            )}

            <View style={styles.coiActions}>
              {canDeclare && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Demander une déclaration d'intérêts",
                      `Coût : ${DECLARATION_COST_INFLUENCE} Influence\n\nLe ministre déclare formellement ses intérêts. Réduit le risque et passe au statut "déclaré".`,
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Demander", onPress: () => {
                          const r = requestMinisterDeclaration(ministerId);
                          if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur.");
                        }},
                      ],
                    );
                  }}
                  style={({ pressed }) => [styles.coiBtn, styles.coiBtnBlue, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.coiBtnText, { color: "#4a9fff" }]}>Déclaration — {DECLARATION_COST_INFLUENCE} INF</Text>
                </Pressable>
              )}
              {canAudit && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Lancer un audit éthique",
                      `Coût : ${ETHICS_AUDIT_COST_INFLUENCE} Influence\n\nAudit complet des conflits d'intérêts. Réduit fortement le risque, passe au statut "audité".`,
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Lancer l'audit", onPress: () => {
                          const r = launchMinisterEthicsAudit(ministerId);
                          if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur.");
                        }},
                      ],
                    );
                  }}
                  style={({ pressed }) => [styles.coiBtn, styles.coiBtnGreen, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.coiBtnText, { color: "#4caf82" }]}>Audit — {ETHICS_AUDIT_COST_INFLUENCE} INF</Text>
                </Pressable>
              )}
              {canSuspend && !profile.suspended && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Écarter temporairement",
                      `Coût : ${SUSPEND_COST_INFLUENCE} Influence\n\nLe ministre est mis à l'écart pour 15 actions. Réduit le risque de scandale immédiat.`,
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Écarter", style: "destructive", onPress: () => {
                          const r = suspendMinisterForConflict(ministerId);
                          if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur.");
                        }},
                      ],
                    );
                  }}
                  style={({ pressed }) => [styles.coiBtn, styles.coiBtnOrange, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.coiBtnText, { color: "#e8864f" }]}>Écarter — {SUSPEND_COST_INFLUENCE} INF</Text>
                </Pressable>
              )}
              {canDefend && !profile.defended && (
                <Pressable
                  onPress={() => {
                    const highRisk = profile.overallRisk >= 60;
                    Alert.alert(
                      "Défendre publiquement",
                      `Coût : ${DEFEND_COST_INFLUENCE} Influence\n\n${highRisk ? "Risque élevé — une défense publique peut se retourner si des preuves émergent." : "Défense présidentielle claire. Réduit les pressions médiatiques à court terme."}`,
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Défendre", onPress: () => {
                          const r = defendMinisterPublicly(ministerId);
                          if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur.");
                        }},
                      ],
                    );
                  }}
                  style={({ pressed }) => [styles.coiBtn, styles.coiBtnGold, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.coiBtnText, { color: PALETTE.gold }]}>Défendre — {DEFEND_COST_INFLUENCE} INF</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })()}

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
        {!activeTraining && (
          <Pressable
            onPress={() => setTrainingExpanded((v) => !v)}
            style={({ pressed }) => [styles.actionChip, styles.actionChipTraining, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="school-outline" size={11} color={PALETTE.info} />
            <Text style={[styles.actionChipText, { color: PALETTE.info }]}>
              {trainingExpanded ? "Masquer" : "Former"}
            </Text>
          </Pressable>
        )}
        {activeTraining && trainingProgram && (
          <View style={[styles.actionChip, styles.actionChipTrainingActive]}>
            <MaterialCommunityIcons name="school-outline" size={11} color={PALETTE.info} />
            <Text style={[styles.actionChipText, { color: PALETTE.info }]} numberOfLines={1}>
              {trainingProgram.name}
            </Text>
          </View>
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

      {/* Panel de formation */}
      {trainingExpanded && !activeTraining && (
        <View style={styles.trainingPanel}>
          <Text style={styles.trainingPanelTitle}>PROGRAMMES DE FORMATION</Text>
          {TRAINING_LIST.map((prog) => {
            const costIconName: McIconName | null = prog.costMoney
              ? "cash-multiple"
              : prog.costInfluence
              ? "bullhorn-outline"
              : null;
            const costLabel = prog.costMoney
              ? `${prog.costMoney}`
              : prog.costInfluence
              ? `${prog.costInfluence}`
              : "Gratuit";
            const effectBits = [
              prog.effect.competenceDelta  ? `Compétence +${prog.effect.competenceDelta}` : null,
              prog.effect.loyaltyDelta     ? `Loyauté +${prog.effect.loyaltyDelta}`       : null,
              prog.effect.scandalRiskDelta ? `Risque ${prog.effect.scandalRiskDelta}`     : null,
            ].filter(Boolean);
            return (
              <View key={prog.id} style={styles.trainingCard}>
                <View style={styles.trainingCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trainingCardName}>{prog.name}</Text>
                    <Text style={styles.trainingCardDesc} numberOfLines={1}>{prog.description}</Text>
                  </View>
                  <Pressable
                    onPress={() => confirmStartTraining(prog.id)}
                    style={({ pressed }) => [styles.trainingLaunchBtn, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.trainingLaunchText}>Lancer</Text>
                  </Pressable>
                </View>
                <View style={styles.trainingCardMeta}>
                  <Text style={styles.trainingMetaChip}>
                    {costIconName ? <MaterialCommunityIcons name={costIconName} size={10} color={PALETTE.gold} /> : null}
                    {costIconName ? " " : ""}{costLabel}
                  </Text>
                  <Text style={styles.trainingMetaChip}>{prog.durationActions} actions</Text>
                  {effectBits.map((e, i) => (
                    <Text key={i} style={[styles.trainingMetaChip, { color: PALETTE.success }]}>{e}</Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

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

// ── Ligne de bilan ministériel ────────────────────────────────────────────────

function PerformanceRow({ report }: { report: MinisterPerformanceReport }) {
  const def = STRATEGY_MINISTERS[report.ministerId as StrategyMinisterId];
  if (!def) return null;
  const displayName = def.name.split(" ")[0]; // prénom uniquement
  return (
    <View style={styles.perfRow}>
      <Text style={styles.perfName} numberOfLines={1}>{displayName}</Text>
      <View style={[styles.perfBadge, { backgroundColor: report.color + "22", borderColor: report.color + "55" }]}>
        <Text style={[styles.perfBadgeText, { color: report.color }]}>{report.label}</Text>
      </View>
      <Text style={styles.perfSummary} numberOfLines={1}>{report.summary}</Text>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function StrategyCabinetScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const {
    state,
    appointMinister, restMinister, delegateMinister, fireMinister,
    arbitrateConflict, setGovernmentCulture,
    planModernisationRH, reconnaissancePublique, stabilisationCabinet,
    activateCrisisStaffing,
  } = useStrategy();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bilanExpanded, setBilanExpanded] = useState(false);
  const [cultureExpanded, setCultureExpanded] = useState(false);

  if (!state) return null;

  const fatigueMap = state.ministerFatigue ?? {};

  const performanceReports = useMemo(
    () => evaluateCabinetPerformance(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.strategyMinisters, state.ministerFatigue, state.cabinetConflicts, state.nationalIndicators],
  );
  const cabinetHealth = useMemo(
    () => summarizeCabinetHealth(performanceReports),
    [performanceReports],
  );
  const warningCount = cabinetHealth.countByRating.fragile + cabinetHealth.replacementCount;

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

        {/* Cellule de crise interministérielle — visible uniquement si crise critique active */}
        {(() => {
          const criticalPending = state.news.pendingIds.filter(
            (id) => NEWS_EVENT_MAP[id]?.urgency === "critique",
          );
          if (criticalPending.length === 0) return null;

          const check        = canActivateStaffing(state);
          const lastAt       = state.lastStaffingAt ?? -99;
          const cooldownLeft = STAFFING_COOLDOWN_ACTIONS - (state.news.actionCount - lastAt);
          const onCooldown   = cooldownLeft > 0;
          const useCount     = state.staffingUseCount ?? 0;

          const handleActivate = () => {
            if (!check.ok) {
              Alert.alert("Cellule indisponible", check.reason ?? "Conditions non remplies.");
              return;
            }
            Alert.alert(
              "Activer la cellule de crise",
              `${criticalPending.length} crise${criticalPending.length > 1 ? "s" : ""} critique${criticalPending.length > 1 ? "s" : ""} en cours.\n\nLes ministres les plus compétents disponibles seront mobilisés immédiatement.\n\nCoût : ${STAFFING_COST_INFLUENCE} influence\n${useCount >= 2 ? "Usages répétés — risque de saturation accru." : ""}`,
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Activer",
                  onPress: () => {
                    const { result, failReason } = activateCrisisStaffing();
                    if (!result) {
                      Alert.alert("Échec", failReason ?? "Activation impossible.");
                      return;
                    }
                    const def = STAFFING_OUTCOMES[result.outcome];
                    Alert.alert(
                      def.label,
                      `${def.description}\n\nMobilisés : ${result.mobilizedIds.length} ministre${result.mobilizedIds.length > 1 ? "s" : ""}`,
                    );
                  },
                },
              ],
            );
          };

          return (
            <View style={[styles.staffingBlock, onCooldown && styles.staffingBlockDim]}>
              <View style={styles.staffingHeader}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={13}
                  color={check.ok ? "#e54848" : PALETTE.textLow}
                />
                <Text style={[styles.staffingTitle, !check.ok && { color: PALETTE.textLow }]}>
                  CELLULE DE CRISE
                </Text>
                <View style={styles.staffingBadge}>
                  <Text style={styles.staffingBadgeText}>
                    {criticalPending.length} critique{criticalPending.length > 1 ? "s" : ""}
                  </Text>
                </View>
                {useCount > 0 && (
                  <Text style={styles.staffingUse}>×{useCount}</Text>
                )}
              </View>
              <Text style={styles.staffingDesc} numberOfLines={2}>
                {check.ok
                  ? `Mobiliser les ministres disponibles pour absorber partiellement l'impact. Coût : ${STAFFING_COST_INFLUENCE} influence`
                  : check.reason}
              </Text>
              <Pressable
                onPress={handleActivate}
                disabled={!check.ok}
                style={({ pressed }) => [
                  styles.staffingBtn,
                  check.ok && { borderColor: "#e5484899", backgroundColor: "#e548481a" },
                  { opacity: pressed ? 0.7 : check.ok ? 1 : 0.45 },
                ]}
              >
                <Text style={[styles.staffingBtnText, check.ok && { color: "#e54848" }]}>
                  {onCooldown ? `Disponible dans ${cooldownLeft} action${cooldownLeft > 1 ? "s" : ""}` : "Activer la cellule"}
                </Text>
              </Pressable>
            </View>
          );
        })()}

        {/* Culture de gouvernement — sélecteur compact collapsible */}
        {(() => {
          const currentCulture = state.governmentCulture
            ? GOVERNMENT_CULTURES[state.governmentCulture]
            : null;
          return (
            <>
              <Pressable
                onPress={() => setCultureExpanded((v) => !v)}
                style={({ pressed }) => [styles.cultureHeader, { opacity: pressed ? 0.8 : 1 }]}
              >
                <MaterialCommunityIcons
                  name={currentCulture ? (currentCulture.icon as any) : "office-building-cog-outline"}
                  size={13}
                  color={currentCulture?.color ?? PALETTE.textLow}
                />
                <Text style={styles.cultureHeaderTitle}>CULTURE</Text>
                <Text style={[styles.cultureHeaderCurrent, { color: currentCulture?.color ?? PALETTE.textLow }]}>
                  {currentCulture?.name ?? "Aucune"}
                </Text>
                <MaterialCommunityIcons
                  name={cultureExpanded ? "chevron-up" : "chevron-down"}
                  size={13}
                  color={PALETTE.textLow}
                />
              </Pressable>
              {cultureExpanded && (
                <View style={styles.culturePanel}>
                  {CULTURE_LIST.map((def) => {
                    const isActive = state.governmentCulture === def.id;
                    return (
                      <Pressable
                        key={def.id}
                        onPress={() => {
                          if (!isActive) {
                            Alert.alert(
                              `Adopter : ${def.name}`,
                              `${def.tagline}\n\nAVANTAGES\n+ ${def.benefits[0]}\n+ ${def.benefits[1]}\n\nINCONVÉNIENTS\n− ${def.drawbacks[0]}\n− ${def.drawbacks[1]}`,
                              [
                                { text: "Annuler", style: "cancel" },
                                { text: "Confirmer", onPress: () => { setGovernmentCulture(def.id); setCultureExpanded(false); } },
                              ],
                            );
                          } else {
                            Alert.alert(
                              `Retirer la culture ${def.name}`,
                              "Le gouvernement fonctionnera sans culture définie.",
                              [
                                { text: "Annuler", style: "cancel" },
                                { text: "Retirer", style: "destructive", onPress: () => setGovernmentCulture(null) },
                              ],
                            );
                          }
                        }}
                        style={({ pressed }) => [
                          styles.cultureOption,
                          isActive && { borderColor: def.color + "66", backgroundColor: def.color + "0d" },
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <View style={[styles.cultureDot, { backgroundColor: def.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cultureOptionName, isActive && { color: def.color }]}>{def.name}</Text>
                          <Text style={styles.cultureOptionTagline} numberOfLines={1}>{def.tagline}</Text>
                        </View>
                        {isActive && (
                          <MaterialCommunityIcons name="check-circle" size={14} color={def.color} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          );
        })()}

        {/* Fuite des talents — indicateur discret + 3 leviers */}
        {(() => {
          const score = state.talentDrainScore ?? 15;
          const tier  = getTalentDrainTier(score);
          return (
            <View style={styles.drainBlock}>
              <View style={styles.drainRow}>
                <MaterialCommunityIcons name="account-arrow-right-outline" size={13} color={tier.color} />
                <Text style={styles.drainLabel}>FUITE DES TALENTS</Text>
                <View style={[styles.drainBadge, { backgroundColor: tier.color + "22", borderColor: tier.color + "55" }]}>
                  <Text style={[styles.drainBadgeText, { color: tier.color }]}>{tier.label} · {score}</Text>
                </View>
              </View>
              <View style={styles.drainActions}>
                <Pressable
                  style={({ pressed }) => [styles.drainBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => {
                    Alert.alert(
                      "Plan de modernisation RH",
                      "Restructuration des conditions de travail et des parcours de carrière.\n\nCoût : 200M€ + 30 influence\nEffet : Fuite −25 · Moral admin. +8",
                      [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: "Lancer le plan",
                          onPress: () => {
                            const r = planModernisationRH();
                            if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur");
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.drainBtnText}>Plan RH</Text>
                  <Text style={styles.drainBtnCost}>
                    200 M€ + 30 <MaterialCommunityIcons name="bullhorn-outline" size={10} color={PALETTE.textMid} />
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.drainBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => {
                    Alert.alert(
                      "Reconnaissance publique",
                      "Discours de valorisation du service public. Signal fort, effet immédiat.\n\nCoût : 40 influence\nEffet : Fuite −12 · Moral admin. +6",
                      [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: "Prononcer le discours",
                          onPress: () => {
                            const r = reconnaissancePublique();
                            if (!r.success) Alert.alert("Impossible", r.reason ?? "Erreur");
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.drainBtnText}>Reconnaissance</Text>
                  <Text style={styles.drainBtnCost}>
                    40 <MaterialCommunityIcons name="bullhorn-outline" size={10} color={PALETTE.textMid} />
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.drainBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => {
                    const adminMorale = state.administrationMorale ?? 60;
                    const reduction   = adminMorale >= 50 ? 15 : 8;
                    Alert.alert(
                      "Stabilisation du cabinet",
                      `Mesures internes de cohésion et de soutien aux équipes.\n\nSans coût direct.\nEffet : Fuite −${reduction}`,
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Confirmer", onPress: () => stabilisationCabinet() },
                      ],
                    );
                  }}
                >
                  <Text style={styles.drainBtnText}>Stabilisation</Text>
                  <Text style={styles.drainBtnCost}>Gratuit</Text>
                </Pressable>
              </View>
            </View>
          );
        })()}

        {/* Bilan périodique — toujours visible, contenu collapsible */}
        <Pressable
          onPress={() => setBilanExpanded((v) => !v)}
          style={({ pressed }) => [styles.bilanHeader, { opacity: pressed ? 0.8 : 1 }]}
        >
          <MaterialCommunityIcons name="clipboard-text-outline" size={13} color={PALETTE.gold} />
          <Text style={styles.bilanHeaderTitle}>BILAN PÉRIODIQUE</Text>
          <Text style={styles.bilanHeaderSub}>
            {warningCount > 0
              ? `${warningCount} ministres à surveiller`
              : `Cabinet en bonne santé · moy. ${cabinetHealth.avgScore}`}
          </Text>
          <MaterialCommunityIcons
            name={bilanExpanded ? "chevron-up" : "chevron-down"}
            size={13}
            color={warningCount > 0 ? PALETTE.warning : PALETTE.textLow}
          />
        </Pressable>
        {bilanExpanded && (
          <View style={styles.bilanPanel}>
            {performanceReports.map((r) => (
              <PerformanceRow key={r.ministerId} report={r} />
            ))}
          </View>
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

  // ── Culture de gouvernement ─────────────────────────────────────────────────
  cultureHeader: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
  },
  cultureHeaderTitle: {
    fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.textLow,
  },
  cultureHeaderCurrent: {
    flex: 1, fontSize: 11, fontFamily: FONT.bold,
  },
  culturePanel: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    overflow: "hidden",
    marginTop: 1,
  },
  cultureOption: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  cultureDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  cultureOptionName: {
    fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh,
  },
  cultureOptionTagline: {
    fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1,
  },

  // ── Bilan périodique ────────────────────────────────────────────────────────
  bilanHeader: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.gold + "33",
    marginBottom: 0,
  },
  bilanHeaderTitle: {
    fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.gold,
  },
  bilanHeaderSub: {
    flex: 1, fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow,
  },
  bilanPanel: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    overflow: "hidden",
    marginTop: 1, marginBottom: 4,
  },
  perfRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.panelEdge,
  },
  perfName: {
    fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textHigh, width: 66,
  },
  perfBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth,
    minWidth: 70, alignItems: "center",
  },
  perfBadgeText: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 0.5 },
  perfSummary: {
    flex: 1, fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textMid,
  },

  // ── Cellule de crise ─────────────────────────────────────────────────────────
  staffingBlock: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5484844",
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4, gap: 7,
  },
  staffingBlockDim: {
    borderColor: PALETTE.panelEdge,
  },
  staffingHeader: {
    flexDirection: "row", alignItems: "center", gap: 7,
  },
  staffingTitle: {
    fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2, color: "#e54848",
    flex: 1,
  },
  staffingBadge: {
    backgroundColor: "#e548481a", borderRadius: RADIUS.pill,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5484844",
  },
  staffingBadgeText: {
    fontSize: 8, fontFamily: FONT.bold, color: "#e54848",
  },
  staffingUse: {
    fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow,
  },
  staffingDesc: {
    fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textMid,
  },
  staffingBtn: {
    borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    paddingVertical: 8, alignItems: "center",
  },
  staffingBtnText: {
    fontSize: 10, fontFamily: FONT.semi, color: PALETTE.textLow,
  },

  // ── Fuite des talents ────────────────────────────────────────────────────────
  drainBlock: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4, gap: 8,
  },
  drainRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
  },
  drainLabel: {
    fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2, color: PALETTE.textLow,
    flex: 1,
  },
  drainBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth,
  },
  drainBadgeText: {
    fontSize: 9, fontFamily: FONT.bold,
  },
  drainActions: {
    flexDirection: "row", gap: 6,
  },
  drainBtn: {
    flex: 1, backgroundColor: PALETTE.panelHi,
    borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    paddingVertical: 7, paddingHorizontal: 6,
    alignItems: "center", gap: 2,
  },
  drainBtnText: {
    fontSize: 9, fontFamily: FONT.semi, color: PALETTE.textHigh,
  },
  drainBtnCost: {
    fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow,
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

  // ── Conflits d'intérêts ─────────────────────────────────────────────────────
  coiBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.panelEdge,
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
    backgroundColor: "rgba(232,134,79,0.04)",
  },
  coiHeader: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  coiTitle:  { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 2, flex: 1 },
  coiBadge:  { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  coiBadgeText: { fontSize: 7, fontFamily: FONT.bold, letterSpacing: 1 },
  coiBarRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  coiBarLabel: { fontSize: 7, fontFamily: FONT.bold, color: PALETTE.textLow, width: 62, letterSpacing: 1 },
  coiTrack:  { flex: 1, height: 3, borderRadius: 2, backgroundColor: PALETTE.panelEdge },
  coiFill:   { height: 3, borderRadius: 2 },
  coiBarVal: { fontSize: 9, fontFamily: FONT.bold, width: 24, textAlign: "right" },
  coiSuspendedNote: { fontSize: 9, fontFamily: FONT.reg },
  coiActions: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  coiBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    borderWidth: 1, alignItems: "center",
  },
  coiBtnBlue:   { backgroundColor: "#4a9fff18", borderColor: "#4a9fff44" },
  coiBtnGreen:  { backgroundColor: "#4caf8218", borderColor: "#4caf8244" },
  coiBtnOrange: { backgroundColor: "#e8864f18", borderColor: "#e8864f44" },
  coiBtnGold:   { backgroundColor: "#c9a84c18", borderColor: "#c9a84c44" },
  coiBtnText:   { fontSize: 9, fontFamily: FONT.bold },
  actionChipTraining: { borderColor: PALETTE.info + "44" },
  actionChipTrainingActive: { borderColor: PALETTE.info + "44", backgroundColor: PALETTE.info + "11", maxWidth: 160 },
  actionChipText: { fontSize: 9, fontFamily: FONT.bold },

  // ── Panel de formation ──────────────────────────────────────────────────────
  trainingPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.panelEdge,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    backgroundColor: "rgba(74,159,255,0.04)",
  },
  trainingPanelTitle: {
    fontSize: 7, fontFamily: FONT.bold, color: PALETTE.info,
    letterSpacing: 2, marginBottom: 2,
  },
  trainingCard: {
    backgroundColor: PALETTE.panelHi,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.info + "33",
    padding: 10, gap: 6,
  },
  trainingCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  trainingCardName: { fontSize: 12, fontFamily: FONT.bold, color: PALETTE.textHigh },
  trainingCardDesc: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow, marginTop: 1 },
  trainingLaunchBtn: {
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.info + "66",
  },
  trainingLaunchText: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.info },
  trainingCardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  trainingMetaChip: {
    fontSize: 8, fontFamily: FONT.med, color: PALETTE.textLow,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },

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
