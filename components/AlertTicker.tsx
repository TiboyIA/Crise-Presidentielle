import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Region } from "@/data/regions";
import type { DecisionLogEntry, EventNotification } from "@/types/game";

interface AlertItem {
  kind: "ALERTE" | "FLASH" | "INFO" | "URGENT" | "SCANDALE" | "FRONDE";
  text: string;
}

interface Props {
  regions: Region[];
  log: DecisionLogEntry[];
  /**
   * Module 2 — titre de l'évènement régional en cours (si l'évènement
   * actif est un scénario `rgn_*`). Affiché en tête du ticker avec
   * une étiquette URGENT.
   */
  pendingRegionalTitle?: string | null;
  /**
   * LOT 15 — Notifications fictives (pure couleur narrative) issues
   * du système de rythme. Injectées en TÊTE du marquee, sans aucun
   * effet sur les jauges.
   */
  eventNotifications?: EventNotification[];
}

function buildAlerts(
  regions: Region[],
  log: DecisionLogEntry[],
  pendingRegionalTitle?: string | null,
): AlertItem[] {
  const items: AlertItem[] = [];

  // Module 2 — Une demande régionale prend toujours la tête du ticker.
  if (pendingRegionalTitle) {
    items.push({
      kind: "URGENT",
      text: pendingRegionalTitle.toUpperCase(),
    });
  }

  // Module 3 — On remonte au-dessus du flux régional les évènements
  // ministériels les plus récents (scandales puis frondes), parce que
  // c'est la "Une" politique du tour. On scanne les 6 dernières
  // entrées et on s'appuie UNIQUEMENT sur le discriminateur
  // structuré `ministerEventKind` pour ne pas dépendre du libellé
  // affiché (qui peut être renommé / traduit).
  for (const entry of log.slice(0, 6)) {
    if (entry.ministerEventKind === "scandal_eruption") {
      items.push({
        kind: "SCANDALE",
        text: `${entry.choiceLabel.toUpperCase()} — ${entry.consequence}`,
      });
    } else if (entry.ministerEventKind === "rival_emergence") {
      items.push({
        kind: "FRONDE",
        text: `${entry.choiceLabel.toUpperCase()} — ${entry.consequence}`,
      });
    }
  }

  // Regional tension alerts. We surface high-tension regions first
  // because they're the most "broadcastable" piece of national news.
  const sorted = [...regions].sort((a, b) => b.tension - a.tension);
  for (const r of sorted) {
    if (r.tension >= 65) {
      items.push({
        kind: "ALERTE",
        text: `${r.name.toUpperCase()} — tension régionale ${Math.round(r.tension)}%`,
      });
    } else if (r.tension >= 45) {
      items.push({
        kind: "FLASH",
        text: `${r.name.toUpperCase()} — vigilance ${Math.round(r.tension)}%`,
      });
    }
  }

  // Recent decisions become "INFO" headlines.
  for (const entry of log.slice(0, 4)) {
    items.push({
      kind: "INFO",
      text: `Sem. ${entry.turn} — ${entry.eventTitle}`,
    });
  }

  // Always have something to show, even on a fresh game.
  if (items.length === 0) {
    items.push({
      kind: "INFO",
      text: "Aucune alerte régionale — situation calme sur le territoire",
    });
    items.push({
      kind: "FLASH",
      text: "Salle de crise opérationnelle — en attente de la prochaine décision",
    });
  }

  return items;
}

function AlertTickerImpl({
  regions,
  log,
  pendingRegionalTitle,
  eventNotifications,
}: Props) {
  const colors = useColors();
  const translate = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const items = useMemo(() => {
    const base = buildAlerts(regions, log, pendingRegionalTitle);
    // LOT 15 — Notifications fictives (purement narratives) injectées
    // EN TÊTE du marquee. Elles n'altèrent pas la logique gameplay,
    // elles donnent juste de la couleur au flux d'actualités.
    const notifs = (eventNotifications ?? []).map((n) => ({
      kind: n.kind,
      text: n.text,
    }));
    return [...notifs, ...base];
  }, [regions, log, pendingRegionalTitle, eventNotifications]);

  // Restart the marquee whenever the content or visible width changes
  // so a freshly-mounted ticker always animates from off-screen-right
  // to off-screen-left at a consistent pixel speed.
  useEffect(() => {
    if (contentWidth <= 0 || trackWidth <= 0) return;
    translate.setValue(trackWidth);
    const distance = trackWidth + contentWidth;
    const pxPerSecond = 60;
    const duration = (distance / pxPerSecond) * 1000;
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: -contentWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [contentWidth, trackWidth, translate]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };
  const onContentLayout = (e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  };

  const accessibilitySummary = items
    .slice(0, 3)
    .map((it) => `${it.kind}: ${it.text}`)
    .join(". ");

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Bandeau d'alertes en direct. ${accessibilitySummary}`}
    >
      <View style={[styles.liveBlock, { backgroundColor: colors.danger }]}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>EN DIRECT</Text>
      </View>
      <View
        style={[styles.track, { backgroundColor: colors.danger }]}
        onLayout={onTrackLayout}
      >
        <Animated.View
          style={[
            styles.content,
            { transform: [{ translateX: translate }] },
          ]}
          onLayout={onContentLayout}
        >
          {items.map((it, i) => {
            // Each kind has its own visual signature:
            //  - URGENT (régional)   → jaune sur bordeaux
            //  - SCANDALE (ministre) → rouge vif sur blanc
            //  - FRONDE (ministre)   → orange sur blanc (signal politique
            //    distinct du scandale, qui lui est moral / médiatique)
            //  - autres (ALERTE/FLASH/INFO) → blanc sur rouge (chrome de base).
            let badgeBg = "#fff";
            let badgeFg = colors.danger;
            if (it.kind === "URGENT") {
              badgeBg = "#facc15";
              badgeFg = "#7c2d12";
            } else if (it.kind === "SCANDALE") {
              badgeBg = "#fff";
              badgeFg = "#b91c1c";
            } else if (it.kind === "FRONDE") {
              badgeBg = "#fb923c";
              badgeFg = "#7c2d12";
            }
            return (
              <View key={i} style={styles.item}>
                <View style={[styles.kindBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.kindText, { color: badgeFg }]}>
                    {it.kind}
                  </Text>
                </View>
                <Text style={styles.itemText} numberOfLines={1}>
                  {it.text}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

export const AlertTicker = memo(AlertTickerImpl);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "stretch",
    height: 28,
    width: "100%",
    overflow: "hidden",
  },
  liveBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.25)",
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  liveText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  track: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingLeft: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kindBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  kindText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  itemText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});
