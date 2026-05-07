/**
 * Module 6 — Encart « MENACES EXTÉRIEURES » du dashboard.
 *
 * Affiche en compact :
 *   - le niveau de menace global (couleur + label : VIGILANCE,
 *     TENSION, ALERTE, IMMINENCE) ;
 *   - le nom de l'acteur hostile attribué (« La Division Zéro ») ;
 *   - les 1-2 dernières opérations hybrides journalisées ;
 *   - un appel d'action vers la page « Front diplomatique » (route
 *     `/front`) où le joueur peut appliquer des contre-mesures.
 *
 * Pas d'IA, pas d'état local. 100% déterministe à partir de
 * `state.hostilePower` + `state.hybridOps` + `state.warState`.
 *
 * Le composant ne rend rien (null) si :
 *   - aucun acteur hostile n'a été instancié (saves antérieures
 *     non-migrées) OU
 *   - le niveau de menace est "vigilance" ET aucune opération
 *     n'a encore été journalisée — pas de bruit visuel inutile sur
 *     les premiers tours d'un mandat sage.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import {
  computeThreatLevel,
  threatColor,
  threatLabel,
} from "@/logic/hybridWarfare";
import { HYBRID_VECTORS } from "@/data/hybridVectors";
import type { GameState } from "@/types/game";

interface Props {
  state: GameState;
}

export function HybridThreatPanel({ state }: Props) {
  const colors = useColors();
  const router = useRouter();
  const hp = state.hostilePower;
  const ops = state.hybridOps ?? [];
  // Pendant la guerre conventionnelle, le WarBanner prend le relais
  // visuellement — pas la peine de doubler avec ce panel.
  const warActive =
    state.warState?.status === "war" ||
    state.warState?.status === "ultimatum";
  if (!hp) return null;
  if (warActive) return null;
  const level = computeThreatLevel(state);
  if (level === "vigilance" && ops.length === 0) return null;

  const accent = threatColor(level);
  const lastOps = ops.slice(-2).reverse();

  return (
    <Pressable
      onPress={() => router.push("/front")}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Feather name="globe" size={13} color={accent} />
        <Text style={[styles.headerLabel, { color: accent }]}>
          MENACE EXTÉRIEURE — {threatLabel(level)}
        </Text>
        <View style={{ flex: 1 }} />
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.actor, { color: hp.color }]}>{hp.name}</Text>
      <Text style={[styles.aggression, { color: colors.mutedForeground }]}>
        Agressivité estimée : {Math.round(hp.aggression)} / 100
      </Text>
      {lastOps.length > 0 ? (
        <View style={styles.opsBlock}>
          {lastOps.map((op) => {
            const v = HYBRID_VECTORS[op.vector];
            const dot = op.defused
              ? colors.success ?? "#16a34a"
              : op.resolved
                ? colors.danger
                : "#a37b1d";
            return (
              <View key={op.id} style={styles.opLine}>
                <View style={[styles.dot, { backgroundColor: dot }]} />
                <Text
                  style={[
                    styles.opLabel,
                    { color: colors.cardForeground },
                  ]}
                  numberOfLines={1}
                >
                  {v.emoji} {v.label} · T{op.turn}
                  {op.defused
                    ? " · désamorcée"
                    : op.resolved
                      ? " · subie"
                      : " · en cours"}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Aucune opération journalisée pour l'instant.
        </Text>
      )}
      <Text style={[styles.cta, { color: colors.primary }]}>
        Front diplomatique →
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  actor: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  aggression: {
    fontSize: 12,
  },
  opsBlock: {
    marginTop: 4,
    gap: 4,
  },
  opLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  opLabel: {
    fontSize: 12,
    flex: 1,
  },
  empty: {
    fontSize: 12,
    fontStyle: "italic",
  },
  cta: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
});
