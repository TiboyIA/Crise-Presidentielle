import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { NewsCard } from "@/components/NewsCard";
import { InteractiveNewsModal } from "@/components/InteractiveNewsModal";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { typeIcon, urgencyColor } from "@/logic/newsEngine";
import type { NewsType } from "@/types/strategy";

const TYPE_FILTERS: { label: string; value: NewsType | "all" }[] = [
  { label: "Tout", value: "all" },
  { label: "💻 Cyber", value: "cyber" },
  { label: "📊 Économie", value: "economie" },
  { label: "👥 Social", value: "social" },
  { label: "🤝 Diplomatie", value: "diplomatie" },
  { label: "⚠️ Hybride", value: "guerre_hybride" },
  { label: "🌍 Monde", value: "monde" },
  { label: "🏛️ National", value: "national" },
];

export default function JournalDeCriseScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, resolveInteractiveNews, dismissNews, markNewsRead } = useStrategy();
  const { hPad, width } = useResponsive();

  const [filter, setFilter] = useState<NewsType | "all">("all");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  if (!state) return null;

  const { news } = state;

  // Mark all read when screen opens
  React.useEffect(() => {
    markNewsRead();
  }, []);

  const pendingInteractive = news.pendingIds
    .map((id) => NEWS_EVENT_MAP[id])
    .filter(Boolean)
    .filter((e) => e.isInteractive);

  const filteredLog = filter === "all"
    ? [...news.log].reverse()
    : [...news.log].filter((e) => e.type === filter).reverse();

  const activeEvent = activeModal ? NEWS_EVENT_MAP[activeModal] : null;

  const handleChoose = (choiceId: string) => {
    if (!activeModal) return;
    resolveInteractiveNews(activeModal, choiceId);
    setActiveModal(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, paddingHorizontal: hPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.back, { color: colors.foreground }]}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>📰 Journal de Crise</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Pending interactive decisions */}
      {pendingInteractive.length > 0 && (
        <View style={[styles.urgentBanner, { backgroundColor: "#FF304015", borderColor: "#FF3040" }]}>
          <Text style={[styles.urgentTitle, { color: "#FF3040" }]}>
            ⚡ {pendingInteractive.length} décision{pendingInteractive.length > 1 ? "s" : ""} urgente{pendingInteractive.length > 1 ? "s" : ""} en attente
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.urgentScroll}>
            {pendingInteractive.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => setActiveModal(event.id)}
                style={({ pressed }) => [
                  styles.urgentChip,
                  { borderColor: urgencyColor(event.urgency), backgroundColor: urgencyColor(event.urgency) + "18", opacity: pressed ? 0.8 : 1, maxWidth: Math.round(width * 0.58) },
                ]}
              >
                <Text style={styles.urgentChipIcon}>{typeIcon(event.type)}</Text>
                <Text style={[styles.urgentChipText, { color: urgencyColor(event.urgency) }]} numberOfLines={2}>
                  {event.title}
                </Text>
                <Text style={[styles.urgentChipCta, { color: urgencyColor(event.urgency) }]}>Décider →</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { paddingHorizontal: hPad }]}
      >
        {TYPE_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.filterChip, { backgroundColor: filter === f.value ? colors.primary : colors.muted }]}
          >
            <Text style={[styles.filterText, { color: filter === f.value ? "#fff" : colors.foreground }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Log */}
      <ScrollView
        contentContainerStyle={[styles.log, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredLog.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {news.log.length === 0
                ? "Aucune actualité pour le moment.\nLancez des actions stratégiques pour générer des événements."
                : "Aucune actualité dans cette catégorie."}
            </Text>
          </View>
        )}

        {filteredLog.map((entry, i) => (
          <NewsCard
            key={`${entry.eventId}_${entry.timestamp}_${i}`}
            entry={entry}
          />
        ))}
      </ScrollView>

      {/* Interactive modal */}
      <InteractiveNewsModal
        event={activeEvent}
        visible={!!activeModal}
        onChoose={handleChoose}
        onDismiss={() => {
          if (activeModal) dismissNews(activeModal);
          setActiveModal(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 14, fontFamily: "Inter_600SemiBold", width: 60 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  urgentBanner: { borderWidth: 1, borderRadius: 0, paddingVertical: 10, paddingHorizontal: 14, gap: 8 },
  urgentTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  urgentScroll: { gap: 8, paddingRight: 14 },
  urgentChip: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 3,
  },
  urgentChipIcon: { fontSize: 16 },
  urgentChipText: { fontSize: 11, fontFamily: "Inter_700Bold", lineHeight: 14 },
  urgentChipCta: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  filters: { paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  log: { paddingTop: 8, gap: 10 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
