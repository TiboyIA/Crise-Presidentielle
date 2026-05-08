import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { typeIcon, urgencyColor } from "@/logic/newsEngine";
import { NEWS_IMG } from "@/constants/assets";
import { Badge } from "@/components/ui/Badge";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { RESOURCE_ICONS, RESOURCE_LABELS } from "@/types/strategy";
import type { NewsChoice, NewsEvent, ResourceKey } from "@/types/strategy";

interface Props {
  event: NewsEvent | null;
  visible: boolean;
  onChoose: (choiceId: string) => void;
  onDismiss: () => void;
}

export function InteractiveNewsModal({ event, visible, onChoose, onDismiss }: Props) {
  const { height } = useWindowDimensions();
  const [preview, setPreview] = useState<NewsChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Reset preview state when modal closes/reopens
  useEffect(() => {
    if (!visible) {
      setPreview(null);
      setConfirmed(false);
    }
  }, [visible]);

  if (!event) return null;

  const urg = urgencyColor(event.urgency);
  const banner = NEWS_IMG[event.type];

  const handleChoose = (choice: NewsChoice) => {
    if (!preview || preview.id !== choice.id) {
      setPreview(choice);
      return;
    }
    setConfirmed(true);
    setTimeout(() => {
      onChoose(choice.id);
    }, 350);
  };

  const effectEntries = (choice: NewsChoice) =>
    (Object.entries(choice.effects) as [ResourceKey, number][]).filter(([, v]) => v !== 0);

  const modalMaxHeight = Math.round(height * 0.9);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={[styles.modalCard, { maxHeight: modalMaxHeight }]} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={["#1a1f2c", "#0a0d14"]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[styles.modalInner, { borderColor: urg }]}
          >
            {/* Banner */}
            <View style={styles.banner}>
              {banner && <Image source={banner} style={styles.bannerImg} resizeMode="cover" />}
              <LinearGradient colors={["rgba(13,17,25,0.05)", "rgba(13,17,25,0.95)"]} style={StyleSheet.absoluteFill} />
              <View style={[styles.urgencyStripe, { backgroundColor: urg }]} />

              <View style={styles.bannerHeader}>
                <View style={styles.bannerSourceWrap}>
                  <Text style={styles.bannerKicker}>BREAKING · {event.source.toUpperCase()}</Text>
                  <Text style={styles.bannerType}>{typeIcon(event.type)} {event.type.replace("_", " ").toUpperCase()}</Text>
                </View>
                <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.65)" />
                </Pressable>
              </View>

              <View style={styles.bannerBottom}>
                <Badge label={event.urgency} tone={mapUrgency(event.urgency)} size="md" />
                <Text style={styles.bannerTitle} numberOfLines={3}>{event.title}</Text>
              </View>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.description}>{event.description}</Text>

              {/* Preview consequence */}
              {preview && (
                <View style={[styles.previewPanel, { borderColor: PALETTE.gold + "55" }]}>
                  <Text style={styles.previewKicker}>CONSÉQUENCE PRÉVUE</Text>
                  <Text style={styles.previewConsequence}>{preview.consequence}</Text>
                  {effectEntries(preview).length > 0 && (
                    <View style={styles.previewEffects}>
                      {effectEntries(preview).map(([key, val]) => (
                        <View key={key} style={styles.effectChip}>
                          <Text style={styles.effectIcon}>{RESOURCE_ICONS[key] ?? "•"}</Text>
                          <Text style={styles.effectLabel}>{RESOURCE_LABELS[key]}</Text>
                          <Text style={[styles.effectVal, { color: val > 0 ? PALETTE.success : PALETTE.danger }]}>
                            {val > 0 ? "+" : ""}{val}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.confirmHint}>
                    <MaterialCommunityIcons name="gesture-tap" size={12} color={PALETTE.gold} />
                    <Text style={styles.confirmHintText}>Toucher à nouveau pour confirmer</Text>
                  </View>
                </View>
              )}

              {/* Choices */}
              <Text style={styles.choicesKicker}>VOTRE DÉCISION</Text>
              {(event.choices ?? []).map((choice, idx) => {
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
                        backgroundColor: isConfirming ? PALETTE.crimson : isSelected ? PALETTE.crimson + "1c" : "rgba(20,25,38,0.6)",
                        borderColor: isSelected ? PALETTE.crimson : PALETTE.panelEdge,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={styles.choiceTopRow}>
                      <Text style={[styles.choiceNum, { color: isSelected ? PALETTE.crimson : PALETTE.gold }]}>{String(idx + 1).padStart(2, "0")}</Text>
                      <Text style={[styles.choiceLabel, { color: isConfirming ? "#fff" : PALETTE.textHigh }]}>{choice.label}</Text>
                    </View>
                    {effects.length > 0 && (
                      <View style={styles.inlineEffects}>
                        {effects.map(([key, val]) => (
                          <Text key={key} style={[styles.inlineEffectText, { color: val > 0 ? PALETTE.success : PALETTE.danger }]}>
                            {RESOURCE_ICONS[key] ?? ""}{val > 0 ? "+" : ""}{val}
                          </Text>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "center", padding: 16 },
  modalCard: { borderRadius: RADIUS.lg, overflow: "hidden" },
  modalInner: { borderRadius: RADIUS.lg, borderWidth: 1.5, overflow: "hidden" },

  banner: { height: 120, position: "relative", overflow: "hidden" },
  bannerImg: { width: "100%", height: "100%" },
  urgencyStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  bannerHeader: { position: "absolute", top: 10, left: 14, right: 10, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  bannerSourceWrap: { gap: 2 },
  bannerKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2.5 },
  bannerType: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 1.5 },
  closeBtn: { padding: 4 },
  bannerBottom: { position: "absolute", bottom: 8, left: 14, right: 14, gap: 4 },
  bannerTitle: { fontSize: 16, fontFamily: FONT.bold, color: PALETTE.textHigh, lineHeight: 20 },

  body: { padding: 16 },
  description: { fontSize: 13, fontFamily: FONT.reg, color: PALETTE.textHigh, lineHeight: 19, marginBottom: 12 },

  previewPanel: { borderRadius: RADIUS.sm, borderWidth: 1, padding: 12, gap: 8, marginBottom: 14, backgroundColor: PALETTE.gold + "0c" },
  previewKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 2 },
  previewConsequence: { fontSize: 13, fontFamily: FONT.med, color: PALETTE.textHigh, lineHeight: 18 },
  previewEffects: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  effectChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4, backgroundColor: PALETTE.panelHi },
  effectIcon: { fontSize: 12 },
  effectLabel: { fontSize: 10, fontFamily: FONT.med, color: PALETTE.textMid },
  effectVal: { fontSize: 12, fontFamily: FONT.bold },
  confirmHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  confirmHintText: { fontSize: 10, fontFamily: FONT.semi, color: PALETTE.gold, letterSpacing: 0.5 },

  choicesKicker: { fontSize: 9, fontFamily: FONT.bold, color: PALETTE.textMid, letterSpacing: 2, marginBottom: 8 },
  choiceBtn: { borderRadius: RADIUS.sm, borderWidth: 1, padding: 12, marginBottom: 8, gap: 5 },
  choiceTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  choiceNum: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1, marginTop: 1 },
  choiceLabel: { flex: 1, fontSize: 13, fontFamily: FONT.semi, lineHeight: 18 },
  inlineEffects: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginLeft: 26 },
  inlineEffectText: { fontSize: 11, fontFamily: FONT.bold },
});
