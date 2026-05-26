/**
 * app/dev-ops.tsx — Tableau de bord OPS développeur.
 *
 * Accessible uniquement si isDevSandboxEnabled() === true (__DEV__ + env var).
 * Affiche l'état système sans modifier le gameplay ni exposer de secrets.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useStrategy } from "@/context/StrategyContext";
import { useAuth } from "@/context/AuthContext";
import { isDevSandboxEnabled } from "@/config/devSandbox";
import { buildDiagnostic, exportDiagnosticJSON } from "@/logic/diagnosticEngine";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

// ── Clés AsyncStorage ─────────────────────────────────────────────────────────

const STRATEGY_KEY = "@strategy_v1";
const SANDBOX_KEY  = "strategy_sandbox_save_v1";

// ── Types internes ────────────────────────────────────────────────────────────

type StatusLevel = "ok" | "warn" | "off" | "info" | "dim";

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const LEVEL_COLOR: Record<StatusLevel, string> = {
  ok:   PALETTE.success,
  warn: PALETTE.warning,
  off:  PALETTE.danger,
  info: PALETTE.info,
  dim:  PALETTE.textLow,
};

// ── Composants internes ───────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <View style={s.secHead}>
      <View style={s.secLine} />
      <Text style={s.secLabel}>{label}</Text>
      <View style={s.secLine} />
    </View>
  );
}

function StatusRow({
  icon, label, value, level,
}: {
  icon: McName;
  label: string;
  value: string;
  level: StatusLevel;
}) {
  const color = LEVEL_COLOR[level];
  return (
    <View style={s.statusRow}>
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text style={s.statusLabel}>{label}</Text>
      <View style={[s.badge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
        <Text style={[s.badgeText, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function CmdBox({ cmd }: { cmd: string }) {
  return (
    <Pressable
      onLongPress={() => void Share.share({ message: cmd })}
      style={s.cmdBox}
      accessibilityHint="Maintenir pour partager"
    >
      <MaterialCommunityIcons name="console-line" size={11} color={PALETTE.info} />
      <Text style={s.cmdText} selectable>{cmd}</Text>
    </Pressable>
  );
}

function ActionBtn({
  icon, label, onPress, color = PALETTE.textMid, disabled,
}: {
  icon: McName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.actionBtn,
        { borderColor: color + "44", opacity: disabled ? 0.35 : pressed ? 0.65 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={15} color={color} />
      <Text style={[s.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function DevOpsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, isSandboxActive } = useStrategy();
  const auth = useAuth();

  const [hasNormalSave,  setHasNormalSave]  = useState<boolean | null>(null);
  const [hasSandboxSave, setHasSandboxSave] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isDevSandboxEnabled()) { router.replace("/"); return; }
    void AsyncStorage.multiGet([STRATEGY_KEY, SANDBOX_KEY]).then(([[, normal], [, sandbox]]) => {
      setHasNormalSave(normal !== null);
      setHasSandboxSave(sandbox !== null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Détection env — jamais exposer les valeurs, juste la présence
  const supabaseOk   = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const rcKey        = Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  const revenueCatOk = Boolean(rcKey);

  const saveLevel = (v: boolean | null): StatusLevel =>
    v === null ? "dim" : v ? "ok" : "off";

  const handleExportDiagnostic = useCallback(() => {
    const diag = buildDiagnostic(state, auth, isSandboxActive);
    void Share.share({ title: "Diagnostic — État de Crise", message: exportDiagnosticJSON(diag) });
  }, [state, auth, isSandboxActive]);

  const handleRunbook = useCallback(() => {
    Alert.alert(
      "Runbook incidents",
      "Ouvrir depuis votre éditeur de code :\n\ndocs/runbook_incidents.md",
      [{ text: "OK" }],
    );
  }, []);

  if (!isDevSandboxEnabled()) return null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={20} color={PALETTE.textMid} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>DÉVELOPPEUR</Text>
          <Text style={s.title}>Tableau de bord OPS</Text>
        </View>
        <View style={s.devChip}>
          <Text style={s.devChipText}>DEV</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Environnement ─────────────────────────────────────────────── */}
        <SectionHead label="ENVIRONNEMENT" />
        <View style={s.card}>
          <StatusRow
            icon="laptop"
            label="Mode Expo"
            value={__DEV__ ? "développement" : "production"}
            level={__DEV__ ? "ok" : "warn"}
          />
          <View style={s.div} />
          <StatusRow
            icon="flask-outline"
            label="Bac à sable"
            value={isSandboxActive ? "actif" : "inactif"}
            level={isSandboxActive ? "ok" : "warn"}
          />
          <View style={s.div} />
          <StatusRow
            icon="database-outline"
            label="Supabase"
            value={supabaseOk ? "configuré" : "non configuré"}
            level={supabaseOk ? "ok" : "off"}
          />
          <View style={s.div} />
          <StatusRow
            icon="cash-multiple"
            label="RevenueCat"
            value={revenueCatOk ? "détecté" : "non configuré"}
            level={revenueCatOk ? "ok" : "warn"}
          />
        </View>

        {/* ── Sauvegarde ────────────────────────────────────────────────── */}
        <SectionHead label="SAUVEGARDE" />
        <View style={s.card}>
          <StatusRow
            icon="content-save-outline"
            label="Partie normale"
            value={
              hasNormalSave === null ? "chargement…"
              : hasNormalSave
                ? (state ? `présente — jour ${state.mandateDay}` : "présente")
                : "absente"
            }
            level={saveLevel(hasNormalSave)}
          />
          <View style={s.div} />
          <StatusRow
            icon="flask-outline"
            label="Sauvegarde sandbox"
            value={hasSandboxSave === null ? "chargement…" : hasSandboxSave ? "présente" : "absente"}
            level={saveLevel(hasSandboxSave)}
          />
        </View>

        {/* ── Outils non disponibles sur mobile ─────────────────────────── */}
        <SectionHead label="OUTILS CLI" />
        <View style={s.card}>

          <View style={s.toolRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={13} color={PALETTE.textLow} />
            <View style={{ flex: 1 }}>
              <Text style={s.toolLabel}>Typecheck</Text>
              <Text style={s.toolNote}>non disponible sur mobile — lancer depuis le terminal</Text>
            </View>
          </View>
          <View style={s.cmdWrap}>
            <CmdBox cmd="pnpm run typecheck" />
          </View>

          <View style={s.div} />

          <View style={s.toolRow}>
            <MaterialCommunityIcons name="folder-open-outline" size={13} color={PALETTE.textLow} />
            <View style={{ flex: 1 }}>
              <Text style={s.toolLabel}>Taille assets</Text>
              <Text style={s.toolNote}>non disponible sur mobile — voir doctor</Text>
            </View>
          </View>
          <View style={s.cmdWrap}>
            <CmdBox cmd="pnpm run doctor" />
          </View>

          <View style={s.div} />

          <View style={s.toolRow}>
            <MaterialCommunityIcons name="file-document-outline" size={13} color={PALETTE.textLow} />
            <View style={{ flex: 1 }}>
              <Text style={s.toolLabel}>Build manifest</Text>
              <Text style={s.toolNote}>non disponible sur mobile — généré par le script</Text>
            </View>
          </View>
          <View style={s.cmdWrap}>
            <CmdBox cmd="pnpm run build:manifest" />
          </View>

        </View>

        {/* ── Commandes rapides ─────────────────────────────────────────── */}
        <SectionHead label="COMMANDES RAPIDES" />
        <View style={s.card}>
          <View style={s.cmdList}>
            <CmdBox cmd="pnpm run doctor" />
            <CmdBox cmd="pnpm run preflight" />
            <CmdBox cmd="pnpm run deps:report" />
            <CmdBox cmd="pnpm run clean" />
            <CmdBox cmd="pnpm run changelog" />
          </View>
        </View>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <SectionHead label="ACTIONS" />
        <View style={s.actionsGrid}>
          <ActionBtn
            icon="console"
            label="Console bac à sable"
            color="#ff6b35"
            onPress={() => router.push("/dev-sandbox" as any)}
            disabled={!isSandboxActive}
          />
          <ActionBtn
            icon="bug-outline"
            label="Exporter diagnostic"
            color={PALETTE.info}
            onPress={handleExportDiagnostic}
          />
          <ActionBtn
            icon="chart-bar"
            label="Stats équilibre"
            color={PALETTE.success}
            onPress={() => router.push("/dev-stats" as any)}
          />
          <ActionBtn
            icon="book-open-outline"
            label="Runbook incidents"
            color={PALETTE.gold}
            onPress={handleRunbook}
          />
        </View>

        {!isSandboxActive && (
          <View style={s.hintBox}>
            <MaterialCommunityIcons name="information-outline" size={12} color={PALETTE.textLow} />
            <Text style={s.hintText}>
              Console bac à sable désactivée. Activez le mode dans les Paramètres pour accéder aux mutations.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.ink },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PALETTE.panelEdge,
  },
  backBtn: { padding: 2 },
  kicker:  { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 3, color: "#ff6b35" },
  title:   { fontFamily: FONT.bold, fontSize: 18, color: PALETTE.textHigh, letterSpacing: 0.3 },
  devChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.pill, backgroundColor: "#ff6b3520", borderWidth: 1, borderColor: "#ff6b3555",
  },
  devChipText: { fontFamily: FONT.bold, fontSize: 9, letterSpacing: 2, color: "#ff6b35" },

  scroll: { padding: 16, gap: 8 },

  secHead:  { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 2 },
  secLine:  { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#ff6b3533" },
  secLabel: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2.5, color: "#ff6b35" },

  card: {
    backgroundColor: PALETTE.panel,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.panelEdge,
    overflow: "hidden",
  },
  div: { height: StyleSheet.hairlineWidth, backgroundColor: PALETTE.panelEdge, marginHorizontal: 12 },

  statusRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  statusLabel: { flex: 1, fontFamily: FONT.reg, fontSize: 12, color: PALETTE.textMid },
  badge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.pill, borderWidth: 1,
  },
  badgeText: { fontFamily: FONT.bold, fontSize: 9, letterSpacing: 0.5 },

  toolRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 14, paddingTop: 11, paddingBottom: 4,
  },
  toolLabel: { fontFamily: FONT.med, fontSize: 11, color: PALETTE.textMid, marginBottom: 1 },
  toolNote:  { fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, fontStyle: "italic" },
  cmdWrap:   { paddingHorizontal: 12, paddingBottom: 10 },

  cmdList: { padding: 10, gap: 6 },
  cmdBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#080c14",
    borderRadius: RADIUS.xs, borderWidth: 1, borderColor: PALETTE.info + "33",
    paddingHorizontal: 10, paddingVertical: 8,
  },
  cmdText: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: PALETTE.info, letterSpacing: 0.4,
  },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flex: 1, minWidth: "45%",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingVertical: 14, paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: RADIUS.md, borderWidth: 1,
  },
  actionLabel: { fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.3 },

  hintBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: PALETTE.panelHi,
    borderRadius: RADIUS.sm, padding: 10, marginTop: 4,
  },
  hintText: { flex: 1, fontFamily: FONT.reg, fontSize: 10, color: PALETTE.textLow, lineHeight: 15 },
});
