import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import { useResponsive } from "@/utils/responsive";
import { NewsCard } from "@/components/NewsCard";
import { InteractiveNewsModal } from "@/components/InteractiveNewsModal";
import { Badge, Panel, ScreenHeader, SectionHeader } from "@/components/ui";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { typeIcon, urgencyColor } from "@/logic/newsEngine";
import { computeNationalTension } from "@/logic/tensionEngine";
import { FONT, PALETTE } from "@/constants/uiTokens";
import type { NewsType } from "@/types/strategy";
import { useComfort } from "@/context/ComfortContext";
import { LowLoadBanner } from "@/components/LowLoadBanner";

const URGENCY_SHAPES: Record<string, string> = {
  critique: "▲",
  forte:    "◆",
  moyenne:  "●",
  faible:   "○",
};

const TYPE_FILTERS: { label: string; value: NewsType | "all" }[] = [
  { label: "Tout",       value: "all" },
  { label: "Cyber",      value: "cyber" },
  { label: "Économie",   value: "economie" },
  { label: "Social",     value: "social" },
  { label: "Diplomatie", value: "diplomatie" },
  { label: "Hybride",    value: "guerre_hybride" },
  { label: "Monde",      value: "monde" },
  { label: "National",   value: "national" },
];

export default function JournalDeCriseScreen() {
  const insets = useSafeAreaInsets();
  const { state, resolveInteractiveNews, dismissNews, markNewsRead } = useStrategy();
  const { hPad, width } = useResponsive();

  const { enabled: comfort, fs, pad, lowLoad, reducedInfo, extraConfirm } = useComfort();
  const [filter, setFilter] = useState<NewsType | "all">("all");
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [logExpanded, setLogExpanded] = useState(false);
  const LOG_INITIAL = 5;

  useEffect(() => {
    if (state) markNewsRead();
  }, []);

  const pendingInteractive = useMemo(() => {
    if (!state) return [];
    return state.news.pendingIds
      .map((id) => NEWS_EVENT_MAP[id])
      .filter(Boolean)
      .filter((e) => e.isInteractive);
  }, [state]);

  const filteredLog = useMemo(() => {
    if (!state) return [];
    const log = state.news.log;
    return filter === "all"
      ? [...log].reverse()
      : log.filter((e) => e.type === filter).reverse();
  }, [state, filter]);

  if (!state) return null;
  const { news } = state;

  const activeEvent = activeModal ? NEWS_EVENT_MAP[activeModal] : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Journal de Crise" kicker="DESK PRÉSIDENTIEL" />

      {/* PRIORITÉ — Mode Faible Charge Mentale */}
      {lowLoad && (
        <View style={{ paddingHorizontal: hPad, paddingTop: 8 }}>
          {pendingInteractive.length > 0 ? (
            <LowLoadBanner
              text={`Décision urgente : ${pendingInteractive.length} événement${pendingInteractive.length > 1 ? "s" : ""} en attente de votre arbitrage.`}
              icon="alert-octagon-outline"
              color={PALETTE.danger}
            />
          ) : (
            <LowLoadBanner
              text="Aucune décision urgente — situation sous contrôle."
              icon="check-circle-outline"
              color={PALETTE.success}
            />
          )}
        </View>
      )}

      {/* Breaking news ticker */}
      <View style={[styles.tickerWrap, { paddingHorizontal: hPad }]}>
        <View style={styles.tickerBadge}>
          <Text style={styles.tickerBadgeText}>EN DIRECT</Text>
        </View>
        <Text style={[styles.tickerText, comfort && { fontSize: fs(11), color: PALETTE.textHigh }]}>
          {pendingInteractive.length > 0
            ? `${pendingInteractive.length} décision${pendingInteractive.length > 1 ? "s" : ""} requise${pendingInteractive.length > 1 ? "s" : ""}`
            : `${news.log.length} dépêche${news.log.length > 1 ? "s" : ""} archivée${news.log.length > 1 ? "s" : ""}`}
        </Text>
      </View>

      {/* Pending interactive decisions */}
      {pendingInteractive.length > 0 && (
        <Panel variant="danger" glow={!comfort} style={[styles.urgentPanel, { marginHorizontal: hPad }]}>
          <View style={styles.urgentHeader}>
            <MaterialCommunityIcons name="alert-octagon" size={16} color={PALETTE.danger} />
            <Text style={styles.urgentTitle}>DÉCISIONS PRÉSIDENTIELLES EN ATTENTE</Text>
            <Badge label={`${pendingInteractive.length}`} tone="danger" size="xs" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.urgentScroll}>
            {pendingInteractive.map((event) => {
              const urg = urgencyColor(event.urgency);
              return (
                <Pressable
                  key={event.id}
                  onPress={() => setActiveModal(event.id)}
                  style={({ pressed }) => [
                    styles.urgentChip,
                    { borderColor: urg, backgroundColor: urg + "1c", maxWidth: Math.round(width * 0.62), opacity: pressed ? 0.85 : 1 },
                    comfort && { padding: pad(10), minWidth: 180 },
                  ]}
                >
                  <View style={styles.urgentChipHeader}>
                    <Text style={styles.urgentChipIcon}>{typeIcon(event.type)}</Text>
                    <Text style={[styles.urgentChipUrg, { color: urg }, comfort && { fontSize: fs(9) }]}>{(URGENCY_SHAPES[event.urgency] ?? "") + " " + event.urgency.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.urgentChipTitle, { color: PALETTE.textHigh }, comfort && { fontSize: fs(12), lineHeight: fs(16) }]} numberOfLines={2}>{event.title}</Text>
                  <Text style={[styles.urgentChipCta, { color: urg }, comfort && { fontSize: fs(10), paddingVertical: 2 }]}>Décider →</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Panel>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { paddingHorizontal: hPad }]}
      >
        {TYPE_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: active ? PALETTE.crimson + "33" : "transparent",
                  borderColor: active ? PALETTE.crimson : PALETTE.panelEdge,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? PALETTE.textHigh : PALETTE.textMid }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Log */}
      <ScrollView
        contentContainerStyle={[styles.log, { paddingBottom: insets.bottom + 24, paddingHorizontal: hPad }, comfort && { gap: pad(10) }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredLog.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="archive-outline" size={36} color={PALETTE.textLow} />
            <Text style={styles.emptyTitle}>{news.log.length === 0 ? "Aucune dépêche" : "Aucun résultat"}</Text>
            <Text style={styles.emptyText}>
              {news.log.length === 0
                ? "Engagez des actions stratégiques pour générer de l'actualité."
                : "Aucune actualité dans cette catégorie."}
            </Text>
          </View>
        ) : (
          <>
            <SectionHeader label="Archives" count={`${filteredLog.length}`} />
            {(reducedInfo && !logExpanded ? filteredLog.slice(0, LOG_INITIAL) : filteredLog).map((entry, i) => (
              <NewsCard key={`${entry.eventId}_${entry.timestamp}_${i}`} entry={entry} />
            ))}
            {reducedInfo && filteredLog.length > LOG_INITIAL && (
              <Pressable
                onPress={() => setLogExpanded((v) => !v)}
                style={({ pressed }) => [styles.logMoreBtn, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={styles.logMoreText}>
                  {logExpanded
                    ? "Réduire ↑"
                    : `${filteredLog.length - LOG_INITIAL} article${filteredLog.length - LOG_INITIAL > 1 ? "s" : ""} supplémentaire${filteredLog.length - LOG_INITIAL > 1 ? "s" : ""} ↓`}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <InteractiveNewsModal
        event={activeEvent}
        visible={!!activeModal}
        tension={state ? computeNationalTension(state) : undefined}
        actionCount={news.actionCount}
        clarityContext={state ? {
          hiddenPolitics: state.hiddenPolitics,
          nationalIndicators: state.nationalIndicators,
          governanceDoctrine: state.governanceDoctrine,
          mandateDay: state.mandateDay,
        } : undefined}
        onChoose={(id) => {
          if (!activeModal) return;
          resolveInteractiveNews(activeModal, id);
          setActiveModal(null);
        }}
        onDismiss={() => {
          if (!activeModal) return;
          if (extraConfirm) {
            Alert.alert(
              "Ignorer cet événement",
              "Cet événement sera archivé sans décision prise. Voulez-vous continuer ?",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Ignorer", style: "destructive", onPress: () => { dismissNews(activeModal); setActiveModal(null); } },
              ],
            );
          } else {
            dismissNews(activeModal);
            setActiveModal(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.ink },
  tickerWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, paddingBottom: 6 },
  tickerBadge: { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: PALETTE.danger, borderRadius: 2 },
  tickerBadgeText: { fontSize: 9, fontFamily: FONT.bold, color: "#fff", letterSpacing: 1.5 },
  tickerText: { fontSize: 11, fontFamily: FONT.semi, color: PALETTE.textMid, letterSpacing: 0.5 },

  urgentPanel: { padding: 12, gap: 8, marginTop: 4 },
  urgentHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  urgentTitle: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.danger, letterSpacing: 1.8, flex: 1 },
  urgentScroll: { gap: 8, paddingTop: 4 },
  urgentChip: { borderRadius: 6, padding: 10, gap: 4, borderWidth: 1, minWidth: 160 },
  urgentChipHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  urgentChipIcon: { fontSize: 14 },
  urgentChipUrg: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 1 },
  urgentChipTitle: { fontSize: 12, fontFamily: FONT.semi, lineHeight: 16 },
  urgentChipCta: { fontSize: 10, fontFamily: FONT.bold, letterSpacing: 0.5, marginTop: 2 },

  filters: { paddingVertical: 10, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  filterText: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1 },

  log: { paddingTop: 4, gap: 10 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 13, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1 },
  emptyText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 16, maxWidth: 240 },
  logMoreBtn: { alignItems: "center", paddingVertical: 10 },
  logMoreText: { fontSize: 11, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 0.5 },
});
