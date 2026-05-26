import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useStrategy } from "@/context/StrategyContext";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { MissionReport, MissionClassification } from "@/types/missionReport";

// ── Constantes visuelles ──────────────────────────────────────────────────────

const CLASS_COLOR: Record<MissionClassification, string> = {
  "TOP SECRET":   "#cc1a1a",
  "SECRET":       "#cc6600",
  "CONFIDENTIEL": "#cc9900",
};

const OUTCOME_COLOR = { success: PALETTE.success, failure: "#cc1a1a" };
const OUTCOME_LABEL = { success: "SUCCÈS", failure: "ÉCHEC" };
const OUTCOME_ICON: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  success: "check-circle",
  failure: "close-circle",
};

// ── Sous-composants ───────────────────────────────────────────────────────────

function ClassBadge({ cls }: { cls: MissionClassification }) {
  return (
    <View style={[styles.classBadge, { borderColor: CLASS_COLOR[cls] }]}>
      <Text style={[styles.classBadgeText, { color: CLASS_COLOR[cls] }]}>{cls}</Text>
    </View>
  );
}

function IntelRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.intelRow}>
      <Text style={styles.intelLabel}>{label}</Text>
      <Text style={[styles.intelValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

// ── Modal détail rapport ──────────────────────────────────────────────────────

function ReportModal({ report, onClose }: { report: MissionReport; onClose: () => void }) {
  const isEnemy = report.perspective === "enemy";
  const insets = useSafeAreaInsets();

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        {/* Header avec flèche retour */}
        <View style={[styles.modalHeader, { borderBottomColor: CLASS_COLOR[report.classification] }]}>
          <Pressable onPress={onClose} hitSlop={14} style={styles.modalBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={PALETTE.textHigh} />
          </Pressable>
          <View style={styles.modalHeaderCenter}>
            <ClassBadge cls={report.classification} />
            <Text style={styles.modalCode}>{report.missionCode}</Text>
          </View>
          {isEnemy && (
            <View style={styles.interceptBadge}>
              <Text style={styles.interceptBadgeText}>INTERCEPTÉ</Text>
            </View>
          )}
        </View>

        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          {/* Titre + statut */}
          <View style={styles.modalTitleRow}>
            <MaterialCommunityIcons
              name={OUTCOME_ICON[report.outcome]}
              size={20}
              color={OUTCOME_COLOR[report.outcome]}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modalOutcome, { color: OUTCOME_COLOR[report.outcome] }]}>
              {isEnemy
                ? (report.outcome === "success" ? "OPÉRATION ADVERSE RÉUSSIE" : "TENTATIVE DÉJOUÉE")
                : OUTCOME_LABEL[report.outcome]}
            </Text>
          </View>

          <Text style={styles.modalTitle}>{report.narrativeTitle}</Text>

          {isEnemy ? (
            <View style={styles.attackerRow}>
              <MaterialCommunityIcons name="flag" size={13} color={PALETTE.warning} />
              <Text style={styles.attackerLabel}>Attaquant : </Text>
              <Text style={styles.attackerName}>{report.attackerCountryName}</Text>
              <Text style={styles.attackerSep}>→</Text>
              <Text style={styles.attackerTarget}>{report.targetCountryName}</Text>
            </View>
          ) : (
            <Text style={styles.modalOpName}>{report.operationName} — {report.targetCountryName}</Text>
          )}

          <Text style={styles.modalMeta}>Jour de mandat {report.mandateDay}</Text>

          <View style={[styles.divider, { backgroundColor: CLASS_COLOR[report.classification] }]} />

          {/* Bloc renseignement */}
          <View style={styles.intelBlock}>
            <Text style={styles.intelHeader}>ANALYSE RENSEIGNEMENT</Text>
            <IntelRow label="Niveau de menace"     value={report.intelligence.threatLevel} />
            <IntelRow label="Probabilité estimée"  value={`${Math.round(report.intelligence.successRate * 100)} %`} />
            <IntelRow label="Météo opérationnelle" value={report.intelligence.weatherLabel} />
            <IntelRow label="Impact météo"         value={report.intelligence.weatherImpact} />
          </View>

          {/* Bloc opératif */}
          <View style={styles.intelBlock}>
            <Text style={styles.intelHeader}>
              {isEnemy ? "DONNÉES OPÉRATIVES ADVERSES" : "DONNÉES OPÉRATIVES"}
            </Text>
            <IntelRow label="Unités engagées"  value={report.operative.unitsLabel} />
            <IntelRow label="Vecteur d'entrée" value={report.operative.entryVector} />
            <IntelRow label="Extraction"       value={report.operative.extractionStatus} />
            <IntelRow label="Couverture"       value={report.operative.coverStatus} />
          </View>

          <View style={[styles.divider, { backgroundColor: CLASS_COLOR[report.classification] }]} />

          {/* 5 sections CIA */}
          <Section title="I — OBJET ET AUTORISATION"          body={report.sections.objectif} />
          <Section title="II — PLANIFICATION OPÉRATIONNELLE"  body={report.sections.planification} />
          <Section title="III — EXÉCUTION ET DÉROULEMENT"     body={report.sections.execution} />
          <Section title="IV — RÉSULTATS ET ÉVALUATION"       body={report.sections.resultats} />
          <Section title="V — RECOMMANDATIONS ET SUITES"      body={report.sections.recommandations} />

          <View style={[styles.divider, { backgroundColor: CLASS_COLOR[report.classification] }]} />

          {/* Bilan ressources */}
          <View style={styles.intelBlock}>
            <Text style={styles.intelHeader}>
              {isEnemy ? "IMPACT SUR LA FRANCE" : "BILAN RESSOURCES"}
            </Text>
            {isEnemy ? (
              Object.entries(report.costPaid).filter(([, v]) => v && v !== 0).length > 0
                ? Object.entries(report.costPaid).filter(([, v]) => v && v !== 0).map(([k, v]) => (
                    <IntelRow
                      key={`ei-${k}`}
                      label={k}
                      value={`${(v as number) > 0 ? "+" : ""}${v}`}
                      valueColor={(v as number) < 0 ? "#cc6666" : PALETTE.success}
                    />
                  ))
                : <Text style={styles.noImpact}>Aucun impact matériel confirmé</Text>
            ) : (
              <>
                {Object.entries(report.costPaid).filter(([, v]) => v && v > 0).map(([k, v]) => (
                  <IntelRow key={`c-${k}`} label={`Coût — ${k}`} value={`−${v}`} valueColor="#cc6666" />
                ))}
                {Object.entries(report.rewardsGained).filter(([, v]) => v && v > 0).map(([k, v]) => (
                  <IntelRow key={`r-${k}`} label={`Gain — ${k}`} value={`+${v}`} valueColor={PALETTE.success} />
                ))}
                <IntelRow label="Points de classement" value={`+${report.rankingPoints}`} valueColor={PALETTE.success} />
              </>
            )}
          </View>

          <Text style={styles.modalFooter}>
            {isEnemy
              ? "Document intercepté — Usage restreint — Direction Générale des Services Extérieurs"
              : "Document classifié — Diffusion restreinte — Direction Générale des Services Extérieurs"}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Carte de rapport (liste) ──────────────────────────────────────────────────

function ReportCard({
  report,
  onOpen,
  onDelete,
}: {
  report: MissionReport;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const isEnemy = report.perspective === "enemy";
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={[styles.cardBar, { backgroundColor: CLASS_COLOR[report.classification] }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <ClassBadge cls={report.classification} />
          <Text style={styles.cardCode}>{report.missionCode}</Text>
          <View style={styles.cardSpacer} />
          <MaterialCommunityIcons
            name={OUTCOME_ICON[report.outcome]}
            size={16}
            color={OUTCOME_COLOR[report.outcome]}
          />
          <Text style={[styles.cardOutcome, { color: OUTCOME_COLOR[report.outcome] }]}>
            {isEnemy
              ? (report.outcome === "success" ? "RÉUSSIE" : "DÉJOUÉE")
              : OUTCOME_LABEL[report.outcome]}
          </Text>
        </View>
        <Text style={styles.cardOpName}>
          {isEnemy ? `${report.attackerCountryName} → ${report.targetCountryName}` : report.operationName}
        </Text>
        <Text style={styles.cardCountry}>
          {isEnemy ? report.operationName : report.targetCountryName} · Jour {report.mandateDay}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={PALETTE.textLow} />
      </Pressable>
    </Pressable>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

type TabId = "player" | "enemy";

export default function MissionReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, deleteMissionReport, clearAllMissionReports, deleteEnemyReport, clearAllEnemyReports } = useStrategy();
  const [tab, setTab]             = useState<TabId>("player");
  const [openReport, setOpenReport] = useState<MissionReport | null>(null);

  const playerReports = state?.missionReports ?? [];
  const enemyReports  = state?.enemyMissionReports ?? [];
  const activeReports = tab === "player" ? playerReports : enemyReports;

  const handleDelete = (id: string) => {
    Alert.alert(
      "Supprimer le rapport",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => tab === "player" ? deleteMissionReport(id) : deleteEnemyReport(id),
        },
      ],
    );
  };

  const handleClearAll = () => {
    const n = activeReports.length;
    if (n === 0) return;
    Alert.alert(
      "Effacer tous les rapports",
      `${n} rapport${n > 1 ? "s" : ""} sera${n > 1 ? "ont" : ""} définitivement supprimé${n > 1 ? "s" : ""}.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Tout effacer",
          style: "destructive",
          onPress: () => tab === "player" ? clearAllMissionReports() : clearAllEnemyReports(),
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textHigh} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>RAPPORTS DE MISSION</Text>
          <Text style={styles.headerSub}>{activeReports.length} dossier{activeReports.length !== 1 ? "s" : ""}</Text>
        </View>
        {activeReports.length > 0 && (
          <Pressable onPress={handleClearAll} hitSlop={12}>
            <MaterialCommunityIcons name="delete-sweep" size={20} color={PALETTE.warning} />
          </Pressable>
        )}
      </View>

      {/* Onglets */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "player" && styles.tabActive]}
          onPress={() => setTab("player")}
        >
          <MaterialCommunityIcons
            name="shield-star"
            size={14}
            color={tab === "player" ? PALETTE.gold : PALETTE.textLow}
          />
          <Text style={[styles.tabLabel, tab === "player" && styles.tabLabelActive]}>
            NOS OPÉRATIONS
          </Text>
          {playerReports.length > 0 && (
            <View style={[styles.tabBadge, tab === "player" && styles.tabBadgeActive]}>
              <Text style={styles.tabBadgeText}>{playerReports.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, tab === "enemy" && styles.tabActive]}
          onPress={() => setTab("enemy")}
        >
          <MaterialCommunityIcons
            name="alert-octagram"
            size={14}
            color={tab === "enemy" ? "#cc1a1a" : PALETTE.textLow}
          />
          <Text style={[styles.tabLabel, tab === "enemy" && { color: "#cc1a1a" }]}>
            ACTIVITÉ ADVERSE
          </Text>
          {enemyReports.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: "#cc1a1a22", borderColor: "#cc1a1a" }]}>
              <Text style={[styles.tabBadgeText, { color: "#cc1a1a" }]}>{enemyReports.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Liste */}
      {activeReports.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name={tab === "player" ? "folder-open-outline" : "shield-check-outline"}
            size={48}
            color={PALETTE.textLow}
          />
          <Text style={styles.emptyText}>
            {tab === "player"
              ? "Aucun rapport de mission archivé"
              : "Aucune opération adverse détectée"}
          </Text>
          <Text style={styles.emptyHint}>
            {tab === "player"
              ? "Les rapports apparaissent après chaque opération lancée."
              : "Les rapports adverses sont générés quand un pays hostile ou rival opère contre vous."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {activeReports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onOpen={() => setOpenReport(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Modal détail */}
      {openReport && (
        <ReportModal report={openReport} onClose={() => setOpenReport(null)} />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080a0c",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  backBtn: { padding: 2 },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: PALETTE.textHigh,
    letterSpacing: 1.5,
  },
  headerSub: {
    fontFamily: FONT.reg,
    fontSize: 12,
    color: PALETTE.textLow,
    marginTop: 1,
  },
  // Onglets
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: PALETTE.gold,
  },
  tabLabel: {
    fontFamily: FONT.semi,
    fontSize: 11,
    color: PALETTE.textLow,
    letterSpacing: 0.8,
  },
  tabLabelActive: {
    color: PALETTE.gold,
  },
  tabBadge: {
    backgroundColor: PALETTE.gold + "22",
    borderWidth: 1,
    borderColor: PALETTE.gold,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: PALETTE.gold + "33",
  },
  tabBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 9,
    color: PALETTE.gold,
  },
  // Liste vide
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: FONT.med,
    fontSize: 15,
    color: PALETTE.textLow,
    textAlign: "center",
  },
  emptyHint: {
    fontFamily: FONT.reg,
    fontSize: 12,
    color: PALETTE.textLow,
    textAlign: "center",
    opacity: 0.6,
  },
  list: {
    padding: 14,
  },
  // Carte rapport
  card: {
    backgroundColor: "#0e1115",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 10,
  },
  cardBar: { width: 4 },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    gap: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardSpacer: { flex: 1 },
  cardCode: {
    fontFamily: FONT.med,
    fontSize: 11,
    color: PALETTE.textLow,
    letterSpacing: 0.8,
  },
  cardOutcome: {
    fontFamily: FONT.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cardOpName: {
    fontFamily: FONT.semi,
    fontSize: 13,
    color: PALETTE.textHigh,
  },
  cardCountry: {
    fontFamily: FONT.reg,
    fontSize: 11,
    color: PALETTE.textLow,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  classBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  classBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  // ── Modal ─────────────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: "#080a0c",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    gap: 12,
  },
  modalBack: {
    padding: 2,
  },
  modalHeaderCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalCode: {
    fontFamily: FONT.med,
    fontSize: 13,
    color: PALETTE.textLow,
    letterSpacing: 1,
  },
  interceptBadge: {
    borderWidth: 1,
    borderColor: "#cc1a1a",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  interceptBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 9,
    color: "#cc1a1a",
    letterSpacing: 1,
  },
  modalScroll: { flex: 1 },
  modalContent: {
    padding: 20,
    paddingBottom: 60,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  modalOutcome: {
    fontFamily: FONT.bold,
    fontSize: 12,
    letterSpacing: 1,
  },
  modalTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: PALETTE.textHigh,
    lineHeight: 24,
  },
  modalOpName: {
    fontFamily: FONT.semi,
    fontSize: 13,
    color: PALETTE.textMid,
    marginTop: 2,
  },
  attackerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  attackerLabel: {
    fontFamily: FONT.med,
    fontSize: 12,
    color: PALETTE.textLow,
  },
  attackerName: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: PALETTE.warning,
  },
  attackerSep: {
    fontFamily: FONT.reg,
    fontSize: 12,
    color: PALETTE.textLow,
    marginHorizontal: 2,
  },
  attackerTarget: {
    fontFamily: FONT.semi,
    fontSize: 13,
    color: PALETTE.textHigh,
  },
  modalMeta: {
    fontFamily: FONT.reg,
    fontSize: 11,
    color: PALETTE.textLow,
    marginTop: 2,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    opacity: 0.35,
    marginVertical: 16,
  },
  intelBlock: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 10,
  },
  intelHeader: {
    fontFamily: FONT.bold,
    fontSize: 10,
    color: PALETTE.textLow,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  intelRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  intelLabel: {
    fontFamily: FONT.med,
    fontSize: 11,
    color: PALETTE.textLow,
    width: 140,
    flexShrink: 0,
  },
  intelValue: {
    fontFamily: FONT.reg,
    fontSize: 11,
    color: PALETTE.textHigh,
    flex: 1,
  },
  noImpact: {
    fontFamily: FONT.reg,
    fontSize: 12,
    color: PALETTE.success,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 10,
    color: PALETTE.textLow,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: FONT.reg,
    fontSize: 13,
    color: PALETTE.textHigh,
    lineHeight: 20,
  },
  modalFooter: {
    fontFamily: FONT.reg,
    fontSize: 10,
    color: PALETTE.textLow,
    opacity: 0.5,
    textAlign: "center",
    marginTop: 20,
    letterSpacing: 0.5,
  },
});
