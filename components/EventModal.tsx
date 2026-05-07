import React, { useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { CrisisEvent, EventChoice } from "@/data/events";
import { ChoiceButton } from "@/components/ChoiceButton";
import { MediaHeadline } from "@/components/MediaHeadline";
import type { HiddenGaugeKey, TechId } from "@/types/game";
import { TECH_TREE, type DoctrineId } from "@/data/techTree";
import { EVENT_CATEGORY_IMAGES } from "@/data/eventCategoryImages";
import {
  CONFIRM_SEAL,
  EVENT_BADGE_ALERT,
} from "@/data/eventBadgeImages";
import {
  buildSavoirSyntheticChoice,
  isSavoirSyntheticChoice,
} from "@/logic/doctrines";

interface Props {
  event: CrisisEvent;
  onResolve: (choice: EventChoice) => void;
  revealedHiddenKeys?: HiddenGaugeKey[];
  /**
   * Module 7 — Liste des technos déjà acquises. Sert à filtrer/afficher
   * les choix marqués `requiresTech`. Optionnel pour rétro-compat ;
   * absence = aucune techno débloquée (les choix `requiresTech` sont
   * masqués).
   */
  researchedTech?: TechId[];
  /**
   * Module 7.1 — Doctrines actives sur le mandat. Sert à injecter le
   * choix synthétique "Consulter les laboratoires" si la doctrine
   * "République savante" est active. Optionnel : absence = aucune
   * doctrine active.
   */
  activeDoctrines?: DoctrineId[];
}

const CATEGORY_LABEL: Record<string, string> = {
  social: "SOCIAL",
  economy: "ÉCONOMIE",
  security: "SÉCURITÉ",
  diplomacy: "DIPLOMATIE",
  ecology: "ÉCOLOGIE",
  scandal: "SCANDALE",
  cyber: "CYBER",
  health: "SANTÉ",
  media: "MÉDIA",
  opposition: "OPPOSITION",
  regional: "RÉGIONAL",
  delayed: "RETOMBÉE",
  energy: "ÉNERGIE",
  agriculture: "AGRICULTURE",
  hybrid_warfare: "GUERRE HYBRIDE",
};

export function EventModal({
  event,
  onResolve,
  revealedHiddenKeys,
  researchedTech,
  activeDoctrines,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState<EventChoice | null>(null);

  // Module 7 — Filtrage déterministe des choix verrouillés par tech.
  // Choix de design : on MASQUE plutôt qu'on grise. Afficher un choix
  // verrouillé ferait souffrir le joueur ("j'aurais pu si seulement…")
  // alors que le but de l'arbre est de récompenser un investissement
  // pré-crise, pas de punir au moment du choix.
  const acquired = researchedTech ?? [];
  const baseChoices = event.choices.filter(
    (c) => !c.requiresTech || acquired.includes(c.requiresTech),
  );

  // Module 7.1 — Doctrine "République savante" : ajoute une option
  // synthétique "Consulter les laboratoires" à TOUTE crise. Apparaît
  // en dernier pour ne pas masquer les choix narratifs principaux.
  // Pas de doublon possible : son ID est `__doctrine_*` (pas de
  // collision avec a/b/c du catalogue).
  const doctrines = activeDoctrines ?? [];
  const visibleChoices = doctrines.includes("doctrine_savoir")
    ? [...baseChoices, buildSavoirSyntheticChoice()]
    : baseChoices;

  const handleSelect = (choice: EventChoice) => {
    // The light impact haptic now fires from ChoiceButton itself, so we
    // skip the selection pulse here to avoid a double tactile event.
    setConfirming(choice);
  };

  const handleConfirm = () => {
    if (!confirming) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
    onResolve(confirming);
    setConfirming(null);
  };

  const categoryImage = EVENT_CATEGORY_IMAGES[event.category];

  return (
    <Modal animationType="fade" transparent visible>
      <View style={[styles.backdrop]}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.primary },
          ]}
        >
          <View style={styles.alertBar}>
            <Image
              source={EVENT_BADGE_ALERT}
              style={styles.alertSeal}
              resizeMode="cover"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={[styles.alertText, { color: colors.primary }]}>
              ALERTE — {CATEGORY_LABEL[event.category] ?? "CRISE"}
            </Text>
          </View>

          {categoryImage ? (
            <View
              style={styles.heroBanner}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Image
                source={categoryImage}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", colors.background]}
                style={styles.heroFade}
                pointerEvents="none"
              />
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.foreground }]}>
              {event.title}
            </Text>

            <MediaHeadline source={event.source} variant="inline" />

            <Text style={[styles.context, { color: colors.cardForeground }]}>
              {event.context}
            </Text>

            <Text style={[styles.decideLabel, { color: colors.mutedForeground }]}>
              VOTRE DÉCISION
            </Text>

            {visibleChoices.map((c) => (
              <View key={c.id}>
                {c.requiresTech ? (
                  <View
                    style={[
                      styles.techBadgeRow,
                      { borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.techBadge, { color: colors.primary }]}>
                      🔬 OPTION DÉBLOQUÉE — {TECH_TREE[c.requiresTech].label.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                {isSavoirSyntheticChoice(c) ? (
                  <View
                    style={[
                      styles.techBadgeRow,
                      { borderColor: "#0891b2" },
                    ]}
                  >
                    <Text style={[styles.techBadge, { color: "#0891b2" }]}>
                      🎓 DOCTRINE — RÉPUBLIQUE SAVANTE
                    </Text>
                  </View>
                ) : null}
                <ChoiceButton
                  choice={c}
                  selected={confirming?.id === c.id}
                  onPress={() => handleSelect(c)}
                  revealedHiddenKeys={revealedHiddenKeys}
                />
              </View>
            ))}
          </ScrollView>

          <Pressable
            disabled={!confirming}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                backgroundColor: confirming ? colors.primary : colors.muted,
                opacity: pressed ? 0.85 : 1,
                marginBottom: Math.max(16, insets.bottom + 12),
              },
            ]}
          >
            <Image
              source={CONFIRM_SEAL}
              style={[
                styles.confirmSeal,
                { opacity: confirming ? 1 : 0.45 },
              ]}
              resizeMode="cover"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text
              style={[
                styles.confirmText,
                {
                  color: confirming
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              VALIDER LA DÉCISION
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "92%",
    borderTopWidth: 2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  alertBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  alertSeal: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  confirmSeal: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  alertText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  heroBanner: {
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: 220,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },
  context: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  decideLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  confirmBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  techBadgeRow: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginTop: 4,
    marginBottom: -2,
  },
  techBadge: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
