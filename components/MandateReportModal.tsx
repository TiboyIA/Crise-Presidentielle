import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatGameDayLabel } from "@/logic/timeEngine";
import { INVERTED_GAUGES } from "@/logic/gameEngine";
import type { Gauges, MandateReport } from "@/types/game";

interface Props {
  report: MandateReport | null;
  onDismiss: () => void;
}

const GAUGE_LABELS: Record<keyof Gauges, string> = {
  popularity: "Popularité",
  economy: "Économie",
  budget: "Finances publiques",
  debt: "Dette",
  security: "Sécurité",
  health: "Santé",
  ecology: "Écologie",
  cohesion: "Cohésion",
  diplomacy: "Diplomatie",
  regionalStability: "Stabilité régionale",
  authority: "Autorité",
};

/**
 * Modale compacte qui résume l'évolution des jauges depuis le dernier
 * BILAN ANNUEL (mois 12/24/36/48). Les bilans trimestriels passent
 * par `QuarterReportToast` pour ne pas bloquer le rythme du jeu —
 * cette modale est réservée aux moments forts (1 fois par an).
 *
 * Bouton « Continuer le mandat » : reprend la lecture à la vitesse
 * précédente.
 */
export function MandateReportModal({ report, onDismiss }: Props) {
  const colors = useColors();
  if (!report || report.kind !== "year") return null;

  const isYearly = true;
  const title = isYearly ? "Bilan de saison" : "Bilan intermédiaire";
  const subtitle = formatGameDayLabel(report.month);

  // Calcule les deltas et trie les jauges par |delta| décroissant pour
  // mettre en avant les évolutions marquantes (pas spammer le joueur
  // avec 11 lignes plates si tout est stable).
  const deltas = (Object.keys(GAUGE_LABELS) as Array<keyof Gauges>)
    .map((k) => ({
      key: k,
      label: GAUGE_LABELS[k],
      prev: Math.round(report.prevGauges[k]),
      curr: Math.round(report.gauges[k]),
      delta: Math.round(report.gauges[k] - report.prevGauges[k]),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const headlineDeltas = deltas.slice(0, isYearly ? 11 : 6);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        style={[
          styles.backdrop,
          { backgroundColor: "rgba(0,0,0,0.7)" },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: isYearly ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={[styles.kind, { color: colors.mutedForeground }]}>
            {isYearly ? "FIN DE SAISON" : "BILAN"}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {headlineDeltas.map((d) => {
              const sign = d.delta > 0 ? "+" : "";
              // Pour les jauges inversées (debt), un delta positif est
              // *mauvais* (la dette grimpe). On flip donc la couleur.
              const inverted = INVERTED_GAUGES.has(d.key);
              const goodDirection = inverted ? d.delta < 0 : d.delta > 0;
              const badDirection = inverted ? d.delta > 0 : d.delta < 0;
              const color = goodDirection
                ? colors.success
                : badDirection
                  ? colors.destructive
                  : colors.mutedForeground;
              return (
                <View key={d.key} style={styles.row}>
                  <Text
                    style={[styles.rowLabel, { color: colors.foreground }]}
                  >
                    {d.label}
                  </Text>
                  <Text
                    style={[styles.rowCurr, { color: colors.mutedForeground }]}
                  >
                    {d.prev} → {d.curr}
                  </Text>
                  <Text style={[styles.rowDelta, { color }]}>
                    {sign}
                    {d.delta}
                  </Text>
                </View>
              );
            })}
            {deltas.every((d) => d.delta === 0) && (
              <Text
                style={[styles.empty, { color: colors.mutedForeground }]}
              >
                Aucune évolution majeure depuis le dernier bilan.
              </Text>
            )}
          </ScrollView>

          <Pressable
            onPress={onDismiss}
            accessibilityLabel="Continuer le mandat"
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[styles.ctaLabel, { color: colors.primaryForeground }]}
            >
              Continuer le mandat
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
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: 8,
    borderWidth: 2,
    padding: 20,
  },
  kind: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    marginBottom: 16,
  },
  list: {
    flexGrow: 0,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  rowCurr: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginRight: 10,
  },
  rowDelta: {
    minWidth: 38,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  cta: {
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
  },
  ctaLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
