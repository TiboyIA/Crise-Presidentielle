import React, { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Minister, SPECIALTY_LABELS } from "@/data/ministers";
import { MINISTER_PORTRAITS } from "@/data/ministerImages";
import { MINISTER_BADGE_IMAGES } from "@/data/cabinetImages";
import { StatBar } from "@/components/StatBar";

interface Props {
  minister: Minister;
  onReplace?: () => void;
}

/** Module 3 — Couleurs d'accent par spécialité (puce visuelle). */
const SPECIALTY_TINT: Record<Minister["specialty"], string> = {
  economy: "#1d4ed8", // bleu
  social: "#be185d", // rose
  security: "#7f1d1d", // bordeaux
  diplomacy: "#0e7490", // sarcelle
  ecology: "#15803d", // vert
  communication: "#a16207", // ambre
};

function MinisterCardImpl({ minister, onReplace }: Props) {
  const colors = useColors();
  const portrait = MINISTER_PORTRAITS[minister.position];
  const specTint = SPECIALTY_TINT[minister.specialty];
  // Module 3 — alerte qualitative : on ne montre JAMAIS la valeur
  // numérique du risque caché (sinon plus rien n'est caché). On
  // affiche un voyant orange uniquement quand le seuil "préoccupant"
  // est franchi (>= 60).
  const showRiskWarning = minister.scandalRisk >= 60 && minister.scandals === 0;
  // Pour l'ambition, on est plus permissif : >= 65 affiche un drapeau
  // discret (information de positionnement, pas de menace immédiate).
  const showAmbitionFlag = minister.ambition >= 65 && !minister.isRival;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: minister.isRival ? colors.danger : colors.border,
          borderWidth: minister.isRival ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.head}>
        <View
          style={[
            styles.portraitBox,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Image source={portrait} style={styles.portrait} resizeMode="cover" />
          {/* The portrait is intentionally over-scaled by ~1.12 inside the
              overflow:hidden box. Some AI-generated portraits ship with a
              faint paper-style margin; clipping a few % off each side hides
              that artifact uniformly without affecting framing. */}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.position, { color: colors.mutedForeground }]}>
            {minister.positionLabel.toUpperCase()}
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {minister.name}
          </Text>
          <View style={styles.tagRow}>
            <View style={[styles.specChip, { backgroundColor: specTint }]}>
              <Text style={styles.specChipText}>
                {SPECIALTY_LABELS[minister.specialty]}
              </Text>
            </View>
            {showAmbitionFlag ? (
              <View
                style={[
                  styles.ambChip,
                  { borderColor: colors.mutedForeground },
                ]}
              >
                <Feather
                  name="trending-up"
                  size={9}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.ambChipText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  AMBITIEUX
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.badgeStack}>
          {minister.isRival ? (
            <View style={[styles.rivalBadge, { backgroundColor: colors.danger }]}>
              <Image
                source={MINISTER_BADGE_IMAGES.rival}
                style={styles.badgeIcon}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.rivalText}>FRONDEUR</Text>
            </View>
          ) : null}
          {showRiskWarning ? (
            <View style={[styles.riskBadge, { backgroundColor: "#f59e0b" }]}>
              <Image
                source={MINISTER_BADGE_IMAGES.risk}
                style={styles.badgeIcon}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.riskText}>RISQUE</Text>
            </View>
          ) : null}
          {minister.scandals > 0 ? (
            <View style={[styles.scandalBadge, { backgroundColor: colors.danger }]}>
              <Image
                source={MINISTER_BADGE_IMAGES.scandal}
                style={styles.badgeIcon}
                resizeMode="cover"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.scandalText}>{minister.scandals}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatBar label="Loyauté" value={minister.loyalty} />
        <StatBar label="Compétence" value={minister.competence} />
        <StatBar label="Popularité" value={minister.popularity} />
      </View>

      {onReplace ? (
        <Pressable
          onPress={onReplace}
          style={({ pressed }) => [
            styles.fireBtn,
            {
              borderColor: colors.danger,
              backgroundColor: pressed ? colors.danger : "transparent",
            },
          ]}
        >
          <Image
            source={MINISTER_BADGE_IMAGES.dismiss}
            style={styles.fireIcon}
            resizeMode="cover"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[styles.fireText, { color: colors.danger }]}>
            Démettre & remplacer
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const MinisterCard = memo(MinisterCardImpl);

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 6,
    gap: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  portraitBox: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  portrait: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.12 }],
  },
  position: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  specChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  specChipText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  ambChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  ambChipText: {
    fontSize: 8.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: 4,
  },
  badgeIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fireIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rivalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 3,
  },
  rivalText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  scandalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 3,
  },
  scandalText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    gap: 8,
  },
  fireBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  fireText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
