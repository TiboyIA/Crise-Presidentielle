import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

interface Props {
  visible: boolean;
  onContinue: () => void;
  onPause: () => void;
}

export function SmartPauseModal({ visible, onContinue, onPause }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onContinue}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onContinue} />

        <View style={styles.box}>
          {/* Kicker */}
          <View style={styles.kickerRow}>
            <View style={styles.dot} />
            <Text style={styles.kicker}>PAUSE STRATÉGIQUE</Text>
            <View style={styles.dot} />
          </View>

          {/* Icône */}
          <MaterialCommunityIcons
            name="coffee-outline"
            size={38}
            color={PALETTE.gold}
            style={styles.icon}
          />

          {/* Message */}
          <Text style={styles.title}>Vos ministères continuent de travailler.</Text>
          <Text style={styles.body}>
            Vous jouez depuis un moment. Une courte pause maintient la qualité de vos décisions stratégiques.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [styles.btnSecondary, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.btnSecondaryText}>Continuer</Text>
            </Pressable>
            <Pressable
              onPress={onPause}
              style={({ pressed }) => [styles.btnPrimary, { opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialCommunityIcons name="pause-circle-outline" size={14} color={PALETTE.ink} />
              <Text style={styles.btnPrimaryText}>Faire une pause</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  box: {
    width: "100%",
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: PALETTE.gold,
    padding: 22,
    gap: 12,
    shadowColor: PALETTE.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: PALETTE.gold,
  },
  kicker: {
    fontSize: 10, fontFamily: FONT.bold,
    color: PALETTE.gold, letterSpacing: 3,
  },
  icon: { alignSelf: "center" },
  title: {
    fontSize: 15, fontFamily: FONT.bold,
    color: PALETTE.textHigh, textAlign: "center",
    lineHeight: 21,
  },
  body: {
    fontSize: 13, fontFamily: FONT.reg,
    color: PALETTE.textMid, textAlign: "center",
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.panelEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize: 12, fontFamily: FONT.bold,
    color: PALETTE.textMid, letterSpacing: 0.5,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: PALETTE.gold,
  },
  btnPrimaryText: {
    fontSize: 12, fontFamily: FONT.bold,
    color: PALETTE.ink, letterSpacing: 0.5,
  },
});
