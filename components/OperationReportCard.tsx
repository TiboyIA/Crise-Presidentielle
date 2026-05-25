import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { NarrativeClassification, NarrativeOutcome, NarrativeReport } from "@/logic/operationNarrativeEngine";

interface Props {
  report: NarrativeReport;
  onArchive?: () => void;
  onViewOps?: () => void;
}

const CLASSIFICATION_COLORS: Record<NarrativeClassification, string> = {
  "CONFIDENTIEL":  PALETTE.gold,
  "SECRET":        "#e07a35",
  "TRÈS SECRET":   PALETTE.danger,
};

const OUTCOME_META: Record<NarrativeOutcome, {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  color: string;
}> = {
  success: { icon: "check-circle",       label: "SUCCÈS",    color: PALETTE.success },
  blocked: { icon: "shield-off-outline", label: "BLOQUÉE",   color: PALETTE.textLow },
  failure: { icon: "close-circle",       label: "ÉCHEC",     color: PALETTE.danger },
  pending: { icon: "clock-outline",      label: "EN COURS",  color: PALETTE.warning },
};

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function BulletLine({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function OperationReportCard({ report, onArchive, onViewOps }: Props) {
  const classColor = CLASSIFICATION_COLORS[report.classification];
  const outcome    = OUTCOME_META[report.outcome];

  return (
    <View style={[styles.card, { borderTopColor: classColor }]}>
      {/* ── Bandeau classification ───────────────────────────────────────── */}
      <View style={[styles.classBar, { backgroundColor: classColor + "1a" }]}>
        <MaterialCommunityIcons name="lock-outline" size={10} color={classColor} />
        <Text style={[styles.classText, { color: classColor }]}>{report.classification}</Text>
        <View style={styles.classBarSpacer} />
        <View style={[styles.outcomeBadge, { borderColor: outcome.color + "55" }]}>
          <MaterialCommunityIcons name={outcome.icon} size={10} color={outcome.color} />
          <Text style={[styles.outcomeLabel, { color: outcome.color }]}>{outcome.label}</Text>
        </View>
      </View>

      {/* ── Titre ───────────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <Text style={styles.kicker}>RAPPORT D'OPÉRATION</Text>
        <Text style={styles.title} numberOfLines={2}>{report.title}</Text>

        {/* ── Résumé ──────────────────────────────────────────────────── */}
        <Text style={styles.summary}>{report.summary}</Text>

        {/* ── Renseignements ──────────────────────────────────────────── */}
        {report.details.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>RENSEIGNEMENTS</SectionLabel>
            {report.details.map((d, i) => <BulletLine key={i} text={d} />)}
          </View>
        )}

        {/* ── Implications ────────────────────────────────────────────── */}
        {report.consequences.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>IMPLICATIONS</SectionLabel>
            {report.consequences.map((c, i) => <BulletLine key={i} text={c} />)}
          </View>
        )}

        {/* ── Recommandation ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel>RECOMMANDATION</SectionLabel>
          <Text style={styles.recommendation}>{report.recommendation}</Text>
        </View>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {onViewOps && (
            <Pressable
              onPress={onViewOps}
              style={({ pressed }) => [styles.btnSecondary, { opacity: pressed ? 0.7 : 1 }]}
            >
              <MaterialCommunityIcons name="magnify" size={13} color={PALETTE.textMid} />
              <Text style={styles.btnSecondaryText}>Opérations</Text>
            </Pressable>
          )}
          {onArchive && (
            <Pressable
              onPress={onArchive}
              style={({ pressed }) => [styles.btnArchive, { opacity: pressed ? 0.7 : 1 }]}
            >
              <MaterialCommunityIcons name="archive-outline" size={13} color={classColor} />
              <Text style={[styles.btnArchiveText, { color: classColor }]}>Archiver</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    borderTopWidth: 2,
    overflow: "hidden",
  },

  // ── Bandeau classification ──────────────────────────────────────────────────
  classBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  classText: {
    fontSize: 8,
    fontFamily: FONT.bold,
    letterSpacing: 2.5,
  },
  classBarSpacer: { flex: 1 },
  outcomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  outcomeLabel: {
    fontSize: 7,
    fontFamily: FONT.bold,
    letterSpacing: 1.5,
  },

  // ── Corps ───────────────────────────────────────────────────────────────────
  body: {
    padding: 14,
    gap: 10,
  },
  kicker: {
    fontSize: 7,
    fontFamily: FONT.bold,
    letterSpacing: 2,
    color: PALETTE.textLow,
  },
  title: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: PALETTE.textHigh,
    lineHeight: 21,
  },
  summary: {
    fontSize: 12,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    lineHeight: 18,
    fontStyle: "italic",
    paddingVertical: 2,
  },

  // ── Sections ────────────────────────────────────────────────────────────────
  section: {
    gap: 5,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.panelEdge,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: FONT.bold,
    letterSpacing: 2,
    color: PALETTE.textLow,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PALETTE.textLow,
    marginTop: 5,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.reg,
    color: PALETTE.textMid,
    lineHeight: 17,
  },
  recommendation: {
    fontSize: 12,
    fontFamily: FONT.med,
    color: PALETTE.textHigh,
    lineHeight: 17,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.panelEdge,
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
  },
  btnSecondaryText: {
    fontSize: 11,
    fontFamily: FONT.med,
    color: PALETTE.textMid,
  },
  btnArchive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
  },
  btnArchiveText: {
    fontSize: 11,
    fontFamily: FONT.bold,
  },
});
