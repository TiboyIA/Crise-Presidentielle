import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { ReturnData } from "@/hooks/useSmartPause";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface Props {
  visible: boolean;
  data: ReturnData | null;
  onDismiss: () => void;
}

export function ReturnBriefingModal({ visible, data, onDismiss }: Props) {
  const router = useRouter();

  if (!data) return null;

  const awayText =
    data.awayMinutes >= 60
      ? `${Math.floor(data.awayMinutes / 60)}h${data.awayMinutes % 60 > 0 ? ` ${data.awayMinutes % 60}min` : ""}`
      : `${data.awayMinutes} minute${data.awayMinutes > 1 ? "s" : ""}`;

  const hasContent =
    data.completedItems.length > 0 ||
    data.progressItems.length > 0 ||
    data.decisionsItems.length > 0 ||
    data.dangerItems.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <View style={styles.box}>
          {/* Kicker */}
          <View style={styles.kickerRow}>
            <View style={styles.dot} />
            <Text style={styles.kicker}>RAPPORT D'INTÉRIM</Text>
            <View style={styles.dot} />
          </View>

          {/* Durée + jour */}
          <View style={styles.awayRow}>
            <MaterialCommunityIcons name="clock-outline" size={13} color={PALETTE.textLow} />
            <Text style={styles.awayText}>Absent {awayText}</Text>
            <Text style={styles.awayDot}>·</Text>
            <Text style={styles.awayDay}>Jour {data.mandateDay}</Text>
          </View>

          <View style={styles.divider} />

          {/* Corps du rapport */}
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.intro}>Pendant votre absence :</Text>

            {/* Terminé — le plus actionnable */}
            {data.completedItems.map((item, i) => (
              <BulletRow
                key={`c${i}`}
                icon="check-circle-outline"
                color={PALETTE.success}
                text={item}
              />
            ))}

            {/* Progrès */}
            {data.progressItems.map((item, i) => (
              <BulletRow
                key={`p${i}`}
                icon="trending-up"
                color={PALETTE.info}
                text={item}
              />
            ))}

            {/* Décisions */}
            {data.decisionsItems.map((item, i) => (
              <BulletRow
                key={`d${i}`}
                icon="alert-circle-outline"
                color={PALETTE.warning}
                text={item}
              />
            ))}

            {/* Danger */}
            {data.dangerItems.map((item, i) => (
              <BulletRow
                key={`g${i}`}
                icon="alert-octagon-outline"
                color={PALETTE.danger}
                text={item}
              />
            ))}

            {/* Rien de notable */}
            {!hasContent && (
              <BulletRow
                icon="shield-check-outline"
                color={PALETTE.textLow}
                text="Situation stable — aucun changement notable."
              />
            )}
          </ScrollView>

          {/* Prochaine action conseillée */}
          {data.priorityAction && (
            <>
              <View style={styles.divider} />
              <View style={styles.prioritySection}>
                <Text style={styles.priorityLabel}>PROCHAINE ACTION CONSEILLÉE</Text>
                <Pressable
                  onPress={() => {
                    onDismiss();
                    router.push(data.priorityAction!.route as any);
                  }}
                  style={({ pressed }) => [styles.priorityBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={styles.priorityBtnText} numberOfLines={1}>
                    {data.priorityAction.label}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={13} color={PALETTE.gold} />
                </Pressable>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* CTA principal */}
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.8 : 1 }]}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={15} color={PALETTE.ink} />
            <Text style={styles.ctaText}>REPRENDRE LE COMMANDEMENT</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function BulletRow({ icon, color, text }: { icon: McIconName; color: string; text: string }) {
  return (
    <View style={styles.bullet}>
      <MaterialCommunityIcons name={icon} size={14} color={color} style={styles.bulletIcon} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  box: {
    width: "100%",
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: PALETTE.gold + "88",
    padding: 22,
    gap: 12,
    shadowColor: PALETTE.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },

  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: PALETTE.gold },
  kicker: { fontSize: 10, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },

  awayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  awayText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textMid },
  awayDot:  { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow },
  awayDay:  { fontSize: 12, fontFamily: FONT.semi, color: PALETTE.textMid },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.panelEdge },

  scroll: { maxHeight: 220 },

  intro: {
    fontSize: 12,
    fontFamily: FONT.semi,
    color: PALETTE.textMid,
    marginBottom: 8,
    fontStyle: "italic",
  },

  bullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 7,
  },
  bulletIcon: { marginTop: 1, flexShrink: 0 },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.reg,
    color: PALETTE.textHigh,
    lineHeight: 18,
  },

  prioritySection: { gap: 6 },
  priorityLabel: {
    fontSize: 8,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
    letterSpacing: 1.8,
  },
  priorityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.gold + "44",
    backgroundColor: PALETTE.gold + "0d",
  },
  priorityBtnText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.semi,
    color: PALETTE.gold,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PALETTE.gold,
    paddingVertical: 13,
    borderRadius: RADIUS.sm,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: PALETTE.ink,
    letterSpacing: 1.5,
  },
});
