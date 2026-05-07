/**
 * Module 7 — Page « RECHERCHE & DÉVELOPPEMENT ».
 *
 * Route `/research`. Centre de pilotage de l'arbre technologique :
 *  - bandeau RESSOURCES DISPONIBLES (5 chips : Budget National absolu
 *    + Influence/Renseignements/Tech/Énergie 0-100) — depuis LOT 18.2
 *    le tech-tree consomme ces 5 ressources et non plus la jauge budget % ;
 *  - bandeau « RECHERCHE EN COURS » avec barre de progression et
 *    tours restants (rendu uniquement si une recherche est active) ;
 *  - 4 BRANCHES thématiques (Bouclier, Souveraineté, Société, Savoir),
 *    chaque branche affiche son sceau de DOCTRINE si elle est
 *    intégralement débloquée ;
 *  - cards des 10 axes regroupées par branche.
 *
 * Pas d'IA. La page rend uniquement et appelle `startTechResearch(id)`
 * du `GameContext`. Le moteur (logic/techTree.ts) gère toute la
 * faisabilité (budget, doublon, conflit). Un toast court explique
 * un éventuel refus.
 */
import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import {
  BRANCHES,
  DOCTRINES,
  TECH_TREE,
  type BranchDef,
} from "@/data/techTree";
import { DOCTRINE_IMAGES, RESEARCH_IMAGES } from "@/data/researchImages";
import {
  CYBER_SHIELD_INITIAL_USES,
  hasDoctrine,
  researchProgress,
} from "@/logic/techTree";
import type { StartResearchError } from "@/logic/techTree";
import {
  INITIAL_RESOURCES,
  canAfford,
  formatCosts,
} from "@/logic/resources";
import type {
  ResourceCosts,
  Resources,
  TechId,
  TechState,
} from "@/types/game";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import { ResourceBar } from "@/components/ResourceBar";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RESEARCH_HEADER = require("@/assets/images/screens/research_header.png");

const REFUSAL_LABEL: Record<StartResearchError, string> = {
  unknown_tech: "Technologie inconnue",
  already_researched: "Déjà acquise",
  another_in_progress: "Une autre recherche est en cours",
  insufficient_resources: "Ressources insuffisantes",
  no_president: "Aucun président en fonction",
  game_over: "Partie terminée",
};

/**
 * LOT 18.2 — Construit le libellé de toast en cas de refus pour
 * ressources insuffisantes : on ajoute le détail du manque entre
 * parenthèses pour que le joueur sache exactement ce qui bloque.
 */
function refusalLabel(
  reason: StartResearchError,
  missing?: ResourceCosts,
): string {
  const base = REFUSAL_LABEL[reason];
  if (reason !== "insufficient_resources" || !missing) return base;
  const detail = formatCosts(missing);
  return detail ? `${base} — il manque ${detail}` : base;
}

export default function ResearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, startTechResearch } = useGame();
  const [toast, setToast] = useState<string | null>(null);

  const tech: TechState = state.tech ?? {
    researched: [],
    inProgress: null,
    activeDoctrines: [],
    cyberShieldUsesRemaining: 0,
  };
  const progress = researchProgress(tech, state.turn);
  const currentNode = progress ? TECH_TREE[progress.id] : null;
  // LOT 18.2 — On ne lit plus la jauge budget 0-100 % pour décider
  // d'un projet : on lit le STOCK de ressources. Fallback INITIAL_RESOURCES
  // pour les saves d'avant LOT 18.1 où le champ pouvait manquer.
  const resources: Resources = state.resources ?? INITIAL_RESOURCES;

  function handleStart(id: TechId) {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const result = startTechResearch(id);
    if (!result.ok) {
      setToast(refusalLabel(result.reason, result.missing));
      // LOT 18.2 — Toast plus long quand on détaille le manque,
      // pour que le joueur ait le temps de lire la liste.
      setTimeout(() => setToast(null), 3600);
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
    setToast("Recherche lancée");
    setTimeout(() => setToast(null), 1800);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeroHeader
        source={RESEARCH_HEADER}
        kicker="MODULE 7 — TECH TREE"
        title="Recherche & développement"
        subtitle={`${tech.researched.length}/10 axes acquis · ${tech.activeDoctrines?.length ?? 0}/4 doctrines actives`}
        accent={colors.primary}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* LOT 18.2 — Bandeau RESSOURCES disponibles (5 chips compactes).
            Remplace l'ancien bandeau "BUDGET DISPONIBLE" 0-100 % qui n'est
            plus pertinent : c'est le STOCK qui décide ce qu'on peut lancer. */}
        <View style={styles.resourceBlock}>
          <Text
            style={[styles.resourceKicker, { color: colors.mutedForeground }]}
          >
            RESSOURCES DISPONIBLES
          </Text>
          <ResourceBar resources={resources} />
        </View>

        {/* Bandeau recherche en cours — rendu uniquement si actif. */}
        {progress && currentNode ? (
          <View
            style={[
              styles.progressBanner,
              { backgroundColor: colors.card, borderColor: currentNode.color },
            ]}
          >
            <Text
              style={[styles.progressKicker, { color: currentNode.color }]}
            >
              🔬 RECHERCHE EN COURS
            </Text>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              {currentNode.emoji}  {currentNode.label}
            </Text>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress.ratio * 100)}%`,
                    backgroundColor: currentNode.color,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressMeta,
                { color: colors.mutedForeground },
              ]}
            >
              {progress.turnsLeft === 0
                ? "Complétion au prochain tour"
                : `${progress.turnsLeft} tour${progress.turnsLeft > 1 ? "s" : ""} restant${progress.turnsLeft > 1 ? "s" : ""}`}
            </Text>
          </View>
        ) : null}

        {/* Module 7.1 — 4 branches thématiques. */}
        {BRANCHES.map((branch) => (
          <BranchSection
            key={branch.id}
            branch={branch}
            tech={tech}
            resources={resources}
            colors={colors}
            onStart={handleStart}
          />
        ))}
      </ScrollView>

      {/* Toast bas d'écran — refus ou confirmation. Cache automatique. */}
      {toast ? (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: colors.foreground,
              bottom: insets.bottom + 16,
            },
          ]}
        >
          <Text style={[styles.toastText, { color: colors.background }]}>
            {toast}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Section d'une branche : header (emoji + label + barre X/N), sceau
 * de doctrine si active, puis cards des axes appartenant à la branche.
 */
function BranchSection({
  branch,
  tech,
  resources,
  colors,
  onStart,
}: {
  branch: BranchDef;
  tech: TechState;
  resources: Resources;
  colors: ReturnType<typeof useColors>;
  onStart: (id: TechId) => void;
}) {
  const acquiredInBranch = branch.techIds.filter((t) =>
    tech.researched.includes(t),
  ).length;
  const total = branch.techIds.length;
  const ratio = acquiredInBranch / total;
  const doctrineActive = hasDoctrine(tech, branch.doctrineId);
  const doctrine = DOCTRINES[branch.doctrineId];
  const shieldUses = tech.cyberShieldUsesRemaining ?? 0;

  return (
    <View style={styles.branchBlock}>
      {/* Header de branche */}
      <View
        style={[
          styles.branchHeader,
          { borderColor: branch.accentColor + "55" },
        ]}
      >
        <Text style={styles.branchEmoji}>{branch.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.branchLabel, { color: colors.foreground }]}>
            {branch.label}
          </Text>
          <Text
            style={[styles.branchDescription, { color: colors.mutedForeground }]}
          >
            {branch.description}
          </Text>
        </View>
        <Text
          style={[styles.branchRatio, { color: branch.accentColor }]}
        >
          {acquiredInBranch}/{total}
        </Text>
      </View>

      {/* Barre de progression de branche */}
      <View
        style={[
          styles.branchTrack,
          { backgroundColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.branchFill,
            {
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: branch.accentColor,
            },
          ]}
        />
      </View>

      {/* Sceau de doctrine — apparaît uniquement quand la branche est
          intégralement complétée. */}
      {doctrineActive ? (
        <View
          style={[
            styles.doctrineSeal,
            {
              backgroundColor: colors.card,
              borderColor: doctrine.accentColor,
            },
          ]}
        >
          <Image
            source={DOCTRINE_IMAGES[doctrine.id]}
            style={styles.doctrineEmblem}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.doctrineKicker, { color: doctrine.accentColor }]}
            >
              ⚜ DOCTRINE ACTIVE
            </Text>
            <Text style={[styles.doctrineLabel, { color: colors.foreground }]}>
              {doctrine.label}
            </Text>
            <Text
              style={[
                styles.doctrineHeadline,
                { color: doctrine.accentColor },
              ]}
            >
              {doctrine.headline}
            </Text>
            <Text
              style={[
                styles.doctrineSummary,
                { color: colors.cardForeground },
              ]}
            >
              {doctrine.summary}
            </Text>
            {/* Compteur de bouclier cyber — uniquement Forteresse. */}
            {doctrine.id === "doctrine_forteresse" ? (
              <Text
                style={[styles.doctrineMeta, { color: colors.mutedForeground }]}
              >
                Bouclier cyber : {shieldUses}/{CYBER_SHIELD_INITIAL_USES} interception
                {shieldUses > 1 ? "s" : ""} restante{shieldUses > 1 ? "s" : ""}
                {shieldUses === 0 ? " — épuisé" : ""}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Cards des axes de la branche */}
      {branch.techIds.map((id) => {
        const node = TECH_TREE[id];
        const isAcquired = tech.researched.includes(id);
        const isInProgress = tech.inProgress?.id === id;
        // LOT 18.2 — Check de faisabilité multi-ressources via le helper
        // pur `canAfford(resources, costs)` (logic/resources.ts).
        const affordable = canAfford(resources, node.costs);
        const blockedByOther =
          !!tech.inProgress && tech.inProgress.id !== id;
        const disabled =
          isAcquired || isInProgress || blockedByOther || !affordable;

        // LOT 18.2 — Coûts détaillés sur la carte via formatCosts qui
        // produit l'ordre canonique (Budget → Influence → Renseignements
        // → Tech → Énergie) et formate le budget avec NNBSP.
        const costsLabel = formatCosts(node.costs);
        let statusLabel = `${costsLabel} · ${node.durationTurns} tours`;
        if (isAcquired) statusLabel = "✓ Acquise";
        else if (isInProgress) statusLabel = "⌛ En cours";
        else if (blockedByOther) statusLabel = "Bloquée — autre projet en cours";
        else if (!affordable) statusLabel = `Ressources insuffisantes — coût : ${costsLabel}`;

        return (
          <View
            key={id}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: isAcquired ? node.color : colors.border,
                opacity: isAcquired ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.thumbWrapper}>
                <Image
                  source={RESEARCH_IMAGES[id]}
                  style={styles.cardThumb}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
                <View
                  style={[
                    styles.thumbBadge,
                    { backgroundColor: node.color },
                  ]}
                >
                  <Text style={styles.thumbBadgeEmoji}>{node.emoji}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.cardTitle, { color: colors.foreground }]}
                >
                  {node.label}
                </Text>
                <Text
                  style={[
                    styles.cardBranch,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {node.branch === "military" ? "MILITAIRE" : "CIVIL"}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.cardDescription,
                { color: colors.cardForeground },
              ]}
            >
              {node.description}
            </Text>
            <Text
              style={[
                styles.cardUnlock,
                { color: colors.mutedForeground },
              ]}
            >
              ➜ {node.unlocksLabel}
            </Text>

            <Pressable
              onPress={() => onStart(id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Lancer la recherche ${node.label}`}
              accessibilityState={{ disabled }}
              style={({ pressed }) => [
                styles.cardBtn,
                {
                  backgroundColor: disabled
                    ? colors.muted
                    : node.color,
                  opacity: pressed && !disabled ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.cardBtnText,
                  {
                    color: disabled
                      ? colors.mutedForeground
                      : colors.primaryForeground,
                  },
                ]}
              >
                {statusLabel}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  // LOT 18.2 — Wrapper du bandeau ressources sur l'écran research.
  // Petit kicker au-dessus de la ResourceBar (5 chips) pour bien
  // signaler que c'est ce stock qui décide ce qu'on peut lancer.
  resourceBlock: {
    gap: 6,
  },
  resourceKicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  progressBanner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 8,
  },
  progressKicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  branchBlock: {
    gap: 10,
    marginTop: 10,
  },
  branchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  branchEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  branchLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  branchDescription: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  branchRatio: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  branchTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  branchFill: {
    height: "100%",
  },
  doctrineSeal: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
  },
  doctrineEmblem: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  doctrineKicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  doctrineLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  doctrineHeadline: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    fontStyle: "italic",
    marginTop: 4,
  },
  doctrineSummary: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  doctrineMeta: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  cardThumb: {
    width: "100%",
    height: "100%",
  },
  thumbBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbBadgeEmoji: {
    fontSize: 12,
    lineHeight: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  cardBranch: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  cardUnlock: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  cardBtn: {
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  cardBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  toastText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
