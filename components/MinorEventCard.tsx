import { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getEventById } from "@/data/events";
import { EVENT_CATEGORY_IMAGES } from "@/data/eventCategoryImages";
import { useColors } from "@/hooks/useColors";
import type { MinorEventEntry } from "@/types/game";

interface Props {
  /** Première (et seule visible) carte de la file mineure. */
  entry: MinorEventEntry;
  /** Mois courant — sert à grimer "expire dans X mois". */
  currentMonth: number;
  /** Résout en appliquant le premier choix actif (effets allégés). */
  onResolve: (eventId: string, choiceId: string) => void;
  /** Retire la carte sans appliquer d'effet. */
  onDismiss: (eventId: string) => void;
}

/**
 * LOT 15 — Carte compacte d'événement mineur affichée sous le header
 * du dashboard. Contrairement au `EventModal` qui prend tout l'écran
 * et fige le temps, cette carte :
 *   • ne bloque PAS le défilement du temps,
 *   • propose un choix binaire « Suivre » (premier choix de l'event)
 *     vs « Ignorer » (no-op narratif),
 *   • s'auto-efface au bout de ~30 s pour ne pas pourrir le HUD.
 *
 * Le rendu emprunte la palette painterly du jeu : navy + ambre, fond
 * carte standard avec accent or sur la bordure pour signaler qu'il y
 * a une décision optionnelle en attente.
 */
function MinorEventCardImpl({ entry, currentMonth, onResolve, onDismiss }: Props) {
  const colors = useColors();
  const event = useMemo(() => getEventById(entry.eventId), [entry.eventId]);
  // Animation d'apparition discrète (slide-down + fade) pour ne pas
  // surprendre le joueur — les mineurs sont volontairement calmes.
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  // Auto-dismiss après 30 s : on évite que la file s'engorge si le
  // joueur laisse tourner sans interagir.
  useEffect(() => {
    const handle = setTimeout(() => onDismiss(entry.eventId), 30_000);
    return () => clearTimeout(handle);
  }, [entry.eventId, onDismiss]);

  if (!event) {
    // Catalogue désynchronisé (save legacy) : on demande au parent
    // de retirer la carte fantôme et on ne rend rien.
    return null;
  }

  const firstChoice = event.choices[0];
  const categoryImage = EVENT_CATEGORY_IMAGES[event.category];
  const monthsLeft = Math.max(0, entry.expiresMonth - currentMonth);

  const animatedStyle = {
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.wrap,
        animatedStyle,
        {
          backgroundColor: colors.card,
          borderColor: colors.gold,
        },
      ]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Événement mineur : ${event.title}. Expire dans ${monthsLeft} mois.`}
    >
      {categoryImage ? (
        <Image
          source={categoryImage}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumb, { backgroundColor: colors.muted }]} />
      )}

      <View style={styles.body}>
        <View style={styles.header}>
          <Text
            style={[styles.kind, { color: colors.gold }]}
            numberOfLines={1}
          >
            DOSSIER MINEUR
          </Text>
          <Text
            style={[styles.expiry, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {monthsLeft > 0 ? `Expire dans ${monthsLeft} mois` : "Dernier mois"}
          </Text>
        </View>

        <Text
          style={[styles.title, { color: colors.cardForeground }]}
          numberOfLines={2}
        >
          {event.title}
        </Text>

        <View style={styles.actions}>
          {firstChoice ? (
            <Pressable
              onPress={() => onResolve(entry.eventId, firstChoice.id)}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                {
                  backgroundColor: colors.gold,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Suivre : ${firstChoice.label}`}
            >
              <Text style={[styles.btnText, { color: "#1a1208" }]}>
                Suivre
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => onDismiss(entry.eventId)}
            style={({ pressed }) => [
              styles.btn,
              styles.btnGhost,
              {
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ignorer cet événement mineur"
          >
            <Text
              style={[styles.btnText, { color: colors.mutedForeground }]}
            >
              Ignorer
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export const MinorEventCard = memo(MinorEventCardImpl);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 92,
  },
  thumb: {
    width: 92,
    height: "100%",
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  kind: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  expiry: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 17,
    marginVertical: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  btnPrimary: {},
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  btnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
});
