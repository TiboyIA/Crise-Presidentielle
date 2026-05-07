/**
 * Module 5 — Encart "L'OPPOSITION VOUS ATTAQUE".
 *
 * Affiche les lignes d'attaque persistantes calculées par
 * `logic/oppositionLines.tickAttackLines` dans le contexte de jeu.
 * Pas d'IA, pas d'état local — c'est juste du rendu sur des
 * `OppositionAttackLineState` immuables.
 *
 * Deux modes d'affichage :
 *   - mode="dashboard" : top 2 lignes max, version compacte.
 *   - mode="election"  : toutes les lignes, version "réquisitoire".
 *
 * Si `lines` est vide, le composant ne rend rien (null).
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  ANGLE_LABELS_FR,
  SEVERITY_COLORS,
} from "@/data/oppositionSlogans";
import type { OppositionAttackLineState } from "@/types/game";

interface Props {
  lines: OppositionAttackLineState[];
  mode: "dashboard" | "election";
}

const SEVERITY_LABELS_FR: Record<
  OppositionAttackLineState["severity"],
  string
> = {
  low: "ALERTE",
  medium: "GRAVE",
  high: "CRITIQUE",
};

function turnsLabel(turns: number): string {
  if (turns <= 1) return "ouvert ce mois-ci";
  return `${turns * 3} mois d'affilée`;
}

export function OppositionAttackPanel({ lines, mode }: Props) {
  const colors = useColors();
  if (!lines || lines.length === 0) return null;

  // Dashboard : on cible la pression la plus forte du moment
  // (déjà trié par sévérité décroissante puis durée). Élection :
  // on garde tout pour le réquisitoire.
  const visible = mode === "dashboard" ? lines.slice(0, 2) : lines;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Feather name="alert-triangle" size={13} color={colors.danger} />
        <Text style={[styles.headerLabel, { color: colors.danger }]}>
          {mode === "election"
            ? "RÉQUISITOIRE DE L'OPPOSITION"
            : "L'OPPOSITION VOUS ATTAQUE"}
        </Text>
      </View>
      {mode === "election" ? (
        <Text
          style={[styles.subtitle, { color: colors.mutedForeground }]}
        >
          Vos faiblesses persistantes deviennent les angles d'attaque
          du débat final.
        </Text>
      ) : null}
      {visible.map((line) => {
        const accent = SEVERITY_COLORS[line.severity];
        const angleLabel = ANGLE_LABELS_FR[line.angle];
        return (
          <View
            key={line.id}
            style={[
              styles.line,
              {
                borderLeftColor: accent,
                backgroundColor: colors.muted,
              },
            ]}
          >
            <View style={styles.lineHeader}>
              <Text style={[styles.angleLabel, { color: accent }]}>
                {angleLabel}
              </Text>
              <View
                style={[
                  styles.severityBadge,
                  { borderColor: accent },
                ]}
              >
                <Text
                  style={[styles.severityText, { color: accent }]}
                >
                  {SEVERITY_LABELS_FR[line.severity]}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.slogan, { color: colors.foreground }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {line.slogan}
            </Text>
            <Text
              style={[styles.duration, { color: colors.mutedForeground }]}
            >
              {turnsLabel(line.turnsActive)} · depuis le tour{" "}
              {line.firstTurn}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  line: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  lineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  angleLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  severityBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  severityText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  slogan: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
  },
  duration: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
