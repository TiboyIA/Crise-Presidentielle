import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { typeIcon, urgencyColor } from "@/logic/newsEngine";
import { NEWS_IMG } from "@/constants/assets";
import { Badge } from "@/components/ui/Badge";
import { FONT, PALETTE, RADIUS, URGENCY_COLORS } from "@/constants/uiTokens";
import { RESOURCE_ICONS } from "@/types/strategy";
import type { MisinterpretationType, NewsLogEntry, ResourceKey } from "@/types/strategy";

interface Props {
  entry: NewsLogEntry;
  onPress?: () => void;
}

export function NewsCard({ entry, onPress }: Props) {
  const urg = urgencyColor(entry.urgency) || URGENCY_COLORS.routine;
  const icon = typeIcon(entry.type);
  const bannerImg = NEWS_IMG[entry.type];

  const effectEntries = (Object.entries(entry.effects) as [ResourceKey, number][]).filter(([, v]) => v !== 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={["#161b27", "#0d1119"]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[styles.card, { borderColor: PALETTE.panelEdge }]}
      >
        {/* Urgency stripe */}
        <View style={[styles.stripe, { backgroundColor: urg }]} />

        {/* Banner */}
        {bannerImg && (
          <View style={styles.bannerWrap}>
            <Image source={bannerImg} style={styles.banner} resizeMode="cover" />
            <LinearGradient colors={["rgba(13,17,25,0.2)", "rgba(13,17,25,0.92)"]} style={StyleSheet.absoluteFill} />
            <View style={styles.bannerTop}>
              <Text style={styles.bannerSource}>{entry.source.toUpperCase()}</Text>
              <Badge label={entry.urgency} tone={mapUrgency(entry.urgency)} size="xs" />
            </View>
            <View style={styles.bannerBottom}>
              <Text style={styles.bannerType}>{icon} {entry.type.replace("_", " ").toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* Body */}
        <View style={styles.body}>
          {!bannerImg && (
            <View style={styles.headerNoImg}>
              <Text style={styles.headerIcon}>{icon}</Text>
              <Text style={styles.source}>{entry.source}</Text>
              <Badge label={entry.urgency} tone={mapUrgency(entry.urgency)} size="xs" />
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>{entry.title}</Text>

          {entry.choiceLabel && (
            <View style={styles.decisionBox}>
              <View style={styles.decisionRow}>
                <View style={styles.decisionTag} />
                <Text style={styles.decisionLabel}>DÉCISION : {entry.choiceLabel}</Text>
              </View>
              {entry.consequence && <Text style={styles.consequence} numberOfLines={2}>{entry.consequence}</Text>}
            </View>
          )}

          {effectEntries.length > 0 && (
            <View style={styles.effectsRow}>
              {effectEntries.map(([key, val]) => (
                <View key={key} style={styles.effectChip}>
                  <Text style={styles.effectIcon}>{RESOURCE_ICONS[key] ?? "•"}</Text>
                  <Text style={[styles.effectText, { color: val > 0 ? PALETTE.success : PALETTE.danger }]}>
                    {val > 0 ? "+" : ""}{val}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {entry.misinterpretedTitle && (
            <View style={[styles.misinterpBox, { borderColor: misinterpColor(entry.misinterpretationType) + "55", backgroundColor: misinterpColor(entry.misinterpretationType) + "12" }]}>
              <Text style={[styles.misinterpKicker, { color: misinterpColor(entry.misinterpretationType) }]}>PRESSE HOSTILE</Text>
              <Text style={[styles.misinterpTitle, { color: misinterpColor(entry.misinterpretationType) }]} numberOfLines={2}>{entry.misinterpretedTitle}</Text>
            </View>
          )}

          {entry.contaminatedThemes && entry.contaminatedThemes.length > 0 && (
            <View style={styles.contaminationBox}>
              <Text style={styles.contaminationKicker}>THÈME TOXIQUE</Text>
              <Text style={styles.contaminationThemes}>{entry.contaminatedThemes.join(" · ")}</Text>
            </View>
          )}

          <Text style={styles.time}>{formatRelativeTime(entry.timestamp)}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function misinterpColor(type?: MisinterpretationType): string {
  switch (type) {
    case "trust_crisis": return PALETTE.danger;
    case "rumor":        return "#e54848";
    case "polemic":      return "#FF8040";
    default:             return "#e8a93a";
  }
}

function mapUrgency(u: string): "neutral" | "warning" | "danger" | "gold" {
  switch (u) {
    case "critical":
    case "danger":   return "danger";
    case "alert":    return "warning";
    case "decisive": return "gold";
    default:         return "neutral";
  }
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

const styles = StyleSheet.create({
  wrap: { borderRadius: RADIUS.md, overflow: "hidden" },
  card: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", position: "relative" },
  stripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, zIndex: 2 },
  bannerWrap: { height: 78, position: "relative", overflow: "hidden" },
  banner: { width: "100%", height: "100%" },
  bannerTop: { position: "absolute", top: 8, left: 12, right: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerSource: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2.5 },
  bannerBottom: { position: "absolute", bottom: 6, left: 12, right: 12 },
  bannerType: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.8 },

  body: { padding: 12, gap: 6 },
  headerNoImg: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerIcon: { fontSize: 16 },
  source: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2, flex: 1 },
  title: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textHigh, lineHeight: 17 },

  decisionBox: { borderRadius: 4, padding: 8, gap: 3, backgroundColor: PALETTE.panelHi, borderLeftWidth: 2, borderLeftColor: PALETTE.gold },
  decisionRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  decisionTag: { width: 5, height: 5, borderRadius: 3, backgroundColor: PALETTE.gold },
  decisionLabel: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 1 },
  consequence: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textMid, lineHeight: 15, marginTop: 2 },

  effectsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  effectChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, backgroundColor: PALETTE.panelHi, borderWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.panelEdge },
  effectIcon: { fontSize: 11 },
  effectText: { fontSize: 11, fontFamily: FONT.bold },

  time: { fontSize: 9, fontFamily: FONT.med, color: PALETTE.textLow, letterSpacing: 0.5, textAlign: "right" },

  misinterpBox: { borderRadius: 4, padding: 8, gap: 3, borderWidth: 1 },
  misinterpKicker: { fontSize: 8, fontFamily: FONT.bold, letterSpacing: 2 },
  misinterpTitle: { fontSize: 11, fontFamily: FONT.semi, lineHeight: 15, fontStyle: "italic" },

  contaminationBox: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e8a93a44", backgroundColor: "#e8a93a0d" },
  contaminationKicker: { fontSize: 7, fontFamily: FONT.bold, color: "#e8a93a", letterSpacing: 1.5 },
  contaminationThemes: { fontSize: 10, fontFamily: FONT.semi, color: "#e8a93a99", flexShrink: 1 },
});
