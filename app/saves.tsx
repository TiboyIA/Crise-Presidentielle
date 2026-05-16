import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrategy } from "@/context/StrategyContext";
import {
  readAllSlotMetas,
  SLOT_NUMBERS,
  type SaveSlotMeta,
  type SlotNumber,
} from "@/storage/saveSlots";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

function formatDate(ms: number): string {
  const d = new Date(ms);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm}/${yyyy} à ${hh}:${min}`;
}

export default function SavesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, saveToSlot, loadFromSlot, deleteSlot } = useStrategy();
  const [metas, setMetas] = useState<(SaveSlotMeta | null)[]>([null, null, null]);
  const [busy, setBusy] = useState<SlotNumber | null>(null);

  const hasSave = state !== null;
  const webTop = Platform.OS === "web" ? 67 : 0;
  const webBottom = Platform.OS === "web" ? 34 : 0;

  const refreshMetas = useCallback(async () => {
    const loaded = await readAllSlotMetas();
    setMetas(loaded);
  }, []);

  useEffect(() => {
    void refreshMetas();
  }, [refreshMetas]);

  const handleSave = useCallback((slot: SlotNumber, meta: SaveSlotMeta | null) => {
    if (!hasSave) return;
    const doSave = async () => {
      setBusy(slot);
      try {
        await saveToSlot(slot);
        await refreshMetas();
      } finally {
        setBusy(null);
      }
    };
    if (meta) {
      const msg = `Emplacement ${slot} contient la partie de ${meta.playerName} (Jour ${meta.mandateDay}).\n\nÉcraser cette sauvegarde ?`;
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.confirm(msg)) void doSave();
        return;
      }
      Alert.alert("Écraser la sauvegarde ?", msg, [
        { text: "Annuler", style: "cancel" },
        { text: "Écraser", style: "destructive", onPress: () => void doSave() },
      ]);
    } else {
      void doSave();
    }
  }, [hasSave, saveToSlot, refreshMetas]);

  const handleLoad = useCallback((slot: SlotNumber, meta: SaveSlotMeta) => {
    const doLoad = async () => {
      setBusy(slot);
      try {
        const ok = await loadFromSlot(slot);
        if (ok) router.replace("/nation");
      } finally {
        setBusy(null);
      }
    };
    const msg = `Charger la partie de ${meta.playerName} (Jour ${meta.mandateDay}) ?${hasSave ? "\n\nVotre progression actuelle sera remplacée. Sauvegardez d'abord si nécessaire." : ""}`;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(msg)) void doLoad();
      return;
    }
    Alert.alert("Charger cette partie ?", msg, [
      { text: "Annuler", style: "cancel" },
      { text: "Charger", onPress: () => void doLoad() },
    ]);
  }, [hasSave, loadFromSlot, router]);

  const handleDelete = useCallback((slot: SlotNumber, meta: SaveSlotMeta) => {
    const doDelete = async () => {
      setBusy(slot);
      try {
        await deleteSlot(slot);
        await refreshMetas();
      } finally {
        setBusy(null);
      }
    };
    const msg = `Supprimer la sauvegarde de ${meta.playerName} (Jour ${meta.mandateDay}) ?\n\nCette action est irréversible.`;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(msg)) void doDelete();
      return;
    }
    Alert.alert("Supprimer ?", msg, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void doDelete() },
    ]);
  }, [deleteSlot, refreshMetas]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <Text style={styles.headerTitle}>SAUVEGARDES</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {!hasSave && (
          <View style={styles.notice}>
            <Feather name="info" size={14} color={PALETTE.textLow} />
            <Text style={styles.noticeText}>
              Aucune partie en cours. Démarrez une partie pour pouvoir sauvegarder.
            </Text>
          </View>
        )}

        {SLOT_NUMBERS.map((slot, i) => {
          const meta = metas[i] ?? null;
          const isBusy = busy === slot;
          return (
            <View key={slot} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.slotBadge}>
                  <Text style={styles.slotBadgeText}>{slot}</Text>
                </View>
                <Text style={styles.slotLabel}>EMPLACEMENT {slot}</Text>
                {meta && (
                  <Pressable
                    onPress={() => handleDelete(slot, meta)}
                    disabled={isBusy}
                    hitSlop={10}
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed || isBusy ? 0.4 : 0.65 }]}
                  >
                    <Feather name="trash-2" size={14} color={PALETTE.crimson} />
                  </Pressable>
                )}
              </View>

              {meta ? (
                <View style={styles.cardBody}>
                  <Text style={styles.saveName}>{meta.playerName}</Text>
                  <View style={styles.saveMeta}>
                    <View style={styles.saveMetaItem}>
                      <Feather name="calendar" size={11} color={PALETTE.textLow} />
                      <Text style={styles.saveMetaText}>Jour {meta.mandateDay}</Text>
                    </View>
                    <View style={styles.saveMetaItem}>
                      <Feather name="clock" size={11} color={PALETTE.textLow} />
                      <Text style={styles.saveMetaText}>{formatDate(meta.savedAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    {hasSave && (
                      <Pressable
                        onPress={() => handleSave(slot, meta)}
                        disabled={isBusy}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          styles.actionBtnSecondary,
                          { opacity: pressed || isBusy ? 0.6 : 1 },
                        ]}
                      >
                        <Feather name="save" size={13} color={PALETTE.textMid} />
                        <Text style={styles.actionBtnSecondaryText}>
                          {isBusy ? "…" : "Écraser"}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => handleLoad(slot, meta)}
                      disabled={isBusy}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.actionBtnPrimary,
                        { opacity: pressed || isBusy ? 0.7 : 1, flex: 1 },
                      ]}
                    >
                      <Feather name="play" size={13} color="#fff" />
                      <Text style={styles.actionBtnPrimaryText}>
                        {isBusy ? "CHARGEMENT…" : "CHARGER"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.cardBody}>
                  <Text style={styles.emptyText}>Emplacement vide</Text>
                  {hasSave && (
                    <Pressable
                      onPress={() => handleSave(slot, null)}
                      disabled={isBusy}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.actionBtnPrimary,
                        { opacity: pressed || isBusy ? 0.7 : 1, marginTop: 4 },
                      ]}
                    >
                      <Feather name="save" size={13} color="#fff" />
                      <Text style={styles.actionBtnPrimaryText}>
                        {isBusy ? "SAUVEGARDE…" : "SAUVEGARDER ICI"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.hint}>
          Les sauvegardes sont stockées localement sur cet appareil.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.void,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: FONT.bold,
    letterSpacing: 3.5,
    color: PALETTE.textMid,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
    lineHeight: 17,
  },
  card: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  slotBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PALETTE.gold + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  slotBadgeText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: PALETTE.gold,
  },
  slotLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 2.5,
    color: PALETTE.textLow,
  },
  deleteBtn: {
    padding: 4,
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  saveName: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  saveMeta: {
    gap: 5,
  },
  saveMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveMetaText: {
    fontSize: 11,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
    fontStyle: "italic",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
  },
  actionBtnPrimary: {
    backgroundColor: PALETTE.crimsonDim,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    letterSpacing: 2,
    color: "#ffffff",
  },
  actionBtnSecondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    letterSpacing: 1.5,
    color: PALETTE.textMid,
  },
  hint: {
    fontSize: 10,
    fontFamily: FONT.reg,
    color: PALETTE.textLow,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 15,
  },
});
