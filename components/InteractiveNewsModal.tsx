import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useColors } from "@/hooks/useColors";
import { urgencyColor, typeIcon } from "@/logic/newsEngine";
import { RESOURCE_ICONS, RESOURCE_LABELS } from "@/types/strategy";
import type { NewsEvent, NewsChoice, ResourceKey } from "@/types/strategy";

interface Props {
  event: NewsEvent | null;
  visible: boolean;
  onChoose: (choiceId: string) => void;
  onDismiss: () => void;
}

export function InteractiveNewsModal({ event, visible, onChoose, onDismiss }: Props) {
  const colors = useColors();
  const { height } = useWindowDimensions();
  const [preview, setPreview] = useState<NewsChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!event) return null;

  const urgColor = urgencyColor(event.urgency);
  const icon = typeIcon(event.type);

  const handleChoose = (choice: NewsChoice) => {
    if (!preview || preview.id !== choice.id) {
      setPreview(choice);
      return;
    }
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      setPreview(null);
      onChoose(choice.id);
    }, 600);
  };

  const effectEntries = (choice: NewsChoice) =>
    (Object.entries(choice.effects) as [ResourceKey, number][]).filter(([, v]) => v !== 0);

  const modalMaxHeight = Math.round(height * 0.88);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card, borderColor: urgColor, maxHeight: modalMaxHeight }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.urgencyStripe, { backgroundColor: urgColor }]} />
            <Text style={styles.headerIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.headerMeta}>
                <View style={[styles.urgBadge, { backgroundColor: urgColor + "22" }]}>
                  <Text style={[styles.urgText, { color: urgColor }]}>
                    {event.urgency.toUpperCase()} · {event.type.replace("_", " ").toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.source, { color: colors.mutedForeground }]}>{event.source}</Text>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>{event.title}</Text>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.description, { color: colors.foreground }]}>{event.description}</Text>

            {/* Preview panel */}
            {preview && (
              <View style={[styles.previewPanel, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "44" }]}>
                <Text style={[styles.previewTitle, { color: colors.primary }]}>Conséquence prévue :</Text>
                <Text style={[styles.previewConsequence, { color: colors.foreground }]}>{preview.consequence}</Text>
                <View style={styles.previewEffects}>
                  {effectEntries(preview).map(([key, val]) => (
                    <View key={key} style={[styles.effectChip, { backgroundColor: colors.muted }]}>
                      <Text style={styles.effectIcon}>{RESOURCE_ICONS[key] ?? "📦"}</Text>
                      <Text style={[styles.effectLabel, { color: colors.mutedForeground }]}>{RESOURCE_LABELS[key]}</Text>
                      <Text style={[styles.effectVal, { color: val > 0 ? "#60D080" : "#FF5060" }]}>
                        {val > 0 ? "+" : ""}{val}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.tapConfirm, { color: colors.primary }]}>
                  Appuyez à nouveau pour confirmer →
                </Text>
              </View>
            )}

            {/* Choices */}
            <Text style={[styles.choicesLabel, { color: colors.mutedForeground }]}>VOTRE DÉCISION :</Text>
            {(event.choices ?? []).map((choice) => {
              const isSelected = preview?.id === choice.id;
              const isConfirming = confirmed && isSelected;
              const effects = effectEntries(choice);
              return (
                <Pressable
                  key={choice.id}
                  onPress={() => handleChoose(choice)}
                  style={({ pressed }) => [
                    styles.choiceBtn,
                    {
                      backgroundColor: isConfirming
                        ? colors.primary
                        : isSelected
                        ? colors.primary + "22"
                        : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.choiceLabel, { color: isConfirming ? "#fff" : colors.foreground }]}>
                    {choice.label}
                  </Text>
                  <View style={styles.choiceEffects}>
                    {effects.map(([key, val]) => (
                      <Text key={key} style={[styles.inlineEffect, { color: val > 0 ? "#60D080" : "#FF5060" }]}>
                        {RESOURCE_ICONS[key]}{val > 0 ? "+" : ""}{val}
                      </Text>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", padding: 16 },
  modal: { borderRadius: 14, borderWidth: 2, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 16, paddingLeft: 4, borderBottomWidth: 1 },
  urgencyStripe: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: 4 },
  headerIcon: { fontSize: 24, width: 30, textAlign: "center", marginTop: 2 },
  headerMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 },
  urgBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  urgText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  source: { fontSize: 10, fontFamily: "Inter_400Regular" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 20 },
  body: { padding: 16, gap: 12 },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 12 },
  previewPanel: { borderRadius: 8, borderWidth: 1, padding: 12, gap: 6, marginBottom: 12 },
  previewTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  previewConsequence: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  previewEffects: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  effectChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  effectIcon: { fontSize: 13 },
  effectLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  effectVal: { fontSize: 12, fontFamily: "Inter_700Bold" },
  tapConfirm: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  choicesLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2, marginBottom: 8 },
  choiceBtn: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 8, gap: 5 },
  choiceLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  choiceEffects: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  inlineEffect: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
