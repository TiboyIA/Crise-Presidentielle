import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import { useAuth } from "@/context/AuthContext";
import {
  fetchChat,
  reportMessage,
  sendChatMessage,
  type ChatMessage,
} from "@/services/ChatService";

const MAX_LENGTH = 200;

const SEND_ERRORS: Record<string, string> = {
  "quota-exceeded":  "Quota atteint — 10 messages max par 24h",
  "cooldown":        "Attends 30 secondes entre deux messages",
  "content-blocked": "Message refusé par le filtre de modération",
  "invalid-length":  "Message trop long (200 caractères max)",
  "unauthorized":    "Connecte-toi pour participer",
};

function MessageBubble({
  msg,
  isOwn,
  reported,
  onReport,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  reported: boolean;
  onReport: () => void;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
      <View style={styles.bubbleRow}>
        <Text style={[styles.bubbleName, isOwn && styles.bubbleNameOwn]} numberOfLines={1}>
          {msg.display_name}
        </Text>
        <Text style={styles.bubbleTime}>{time}</Text>
        {!isOwn && (
          <Pressable
            onPress={onReport}
            hitSlop={12}
            disabled={reported}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : reported ? 0.35 : 1 })}
          >
            <MaterialCommunityIcons
              name={reported ? "flag" : "flag-outline"}
              size={12}
              color={reported ? PALETTE.danger : PALETTE.textLow}
            />
          </Pressable>
        )}
      </View>
      <Text style={styles.bubbleContent}>{msg.content}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth   = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);

  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [season,     setSeason]     = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [input,      setInput]      = useState("");
  const [sending,    setSending]    = useState(false);
  const [sendError,  setSendError]  = useState<string | null>(null);
  const [reported,   setReported]   = useState<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchChat();
      if (!mountedRef.current) return;
      setMessages(data.messages);
      setSeason(data.season);
    } catch {
      // non-fatal
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  }, [loading]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !auth.accessToken || sending) return;
    setSending(true);
    setSendError(null);
    const result = await sendChatMessage(auth.accessToken, text);
    if (!mountedRef.current) return;
    setSending(false);
    if (!result.ok) {
      setSendError(SEND_ERRORS[result.error ?? ""] ?? "Erreur inattendue");
      return;
    }
    setInput("");
    if (result.message) {
      setMessages((prev) => [...prev, result.message!]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const handleReport = async (messageId: string) => {
    if (!auth.accessToken || reported.has(messageId)) return;
    setReported((prev) => new Set(prev).add(messageId));
    await reportMessage(auth.accessToken, messageId);
  };

  const canSend = auth.isLinked && !!auth.accessToken;
  const myId    = auth.user?.id ?? "";
  const charLeft = MAX_LENGTH - input.length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#1c1408", "#0d1119"]} style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>
            {season > 0 ? `SAISON ${season}` : "CANAL DIPLOMATIQUE"}
          </Text>
          <Text style={styles.headerTitle}>FORUM MONDIAL</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <View style={styles.headerRule} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={PALETTE.gold} size="large" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 8 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.gold} />
            }
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="forum-outline" size={40} color={PALETTE.textLow} />
                <Text style={styles.emptyText}>Aucun message cette saison</Text>
                <Text style={styles.emptySubText}>Sois le premier à prendre la parole sur la scène mondiale.</Text>
              </View>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.player_id === myId}
                  reported={reported.has(msg.id)}
                  onReport={() => handleReport(msg.id)}
                />
              ))
            )}
          </ScrollView>
        )}

        {/* Input area */}
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
          {sendError && <Text style={styles.sendError}>{sendError}</Text>}
          {!canSend && auth.isEnabled && (
            <Text style={styles.noticeText}>
              Lie ton compte Google ou Apple pour participer au forum.
            </Text>
          )}
          {canSend && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={(t) => { setInput(t.slice(0, MAX_LENGTH)); setSendError(null); }}
                placeholder="Adresse-toi aux dirigeants mondiaux…"
                placeholderTextColor={PALETTE.textLow}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                maxLength={MAX_LENGTH}
                multiline={false}
              />
              <Text style={[styles.charCount, charLeft < 20 && styles.charCountWarn]}>
                {charLeft}
              </Text>
              <Pressable
                onPress={handleSend}
                disabled={!input.trim() || sending}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { opacity: !input.trim() || sending ? 0.4 : pressed ? 0.7 : 1 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size={16} color="#000" />
                ) : (
                  <MaterialCommunityIcons name="send" size={18} color="#000" />
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06080e" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerKicker: { fontSize: 8, fontFamily: FONT.bold, color: PALETTE.gold, letterSpacing: 3 },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold, color: "#fff", letterSpacing: 4 },
  headerRule: { height: 1, backgroundColor: PALETTE.gold + "33" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 12, gap: 6 },

  emptyWrap: { alignItems: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, fontFamily: FONT.bold, color: PALETTE.textMid, textAlign: "center" },
  emptySubText: { fontSize: 12, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", lineHeight: 18 },

  bubble: {
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    padding: 10,
    gap: 4,
  },
  bubbleOwn: {
    borderColor: PALETTE.gold + "44",
    backgroundColor: "#141a0f",
  },
  bubbleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bubbleName: { flex: 1, fontSize: 11, fontFamily: FONT.bold, color: PALETTE.textMid },
  bubbleNameOwn: { color: PALETTE.gold },
  bubbleTime: { fontSize: 9, fontFamily: FONT.reg, color: PALETTE.textLow },
  bubbleContent: { fontSize: 13, fontFamily: FONT.reg, color: PALETTE.textHigh, lineHeight: 18 },

  inputArea: {
    borderTopWidth: 1,
    borderTopColor: PALETTE.panelEdge,
    backgroundColor: "#06080e",
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  sendError: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.danger, textAlign: "center" },
  noticeText: { fontSize: 11, fontFamily: FONT.reg, color: PALETTE.textLow, textAlign: "center", paddingVertical: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#0d1119",
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.panelEdge,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: FONT.reg,
    color: PALETTE.textHigh,
  },
  charCount: { fontSize: 10, fontFamily: FONT.reg, color: PALETTE.textLow, minWidth: 24, textAlign: "right" },
  charCountWarn: { color: PALETTE.warning },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: PALETTE.gold,
    alignItems: "center", justifyContent: "center",
  },
});
