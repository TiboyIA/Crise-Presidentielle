/**
 * Bac à sable développeur — ACCÈS RESTREINT
 * Visible uniquement si __DEV__ && EXPO_PUBLIC_ENABLE_DEV_SANDBOX === "true".
 * Sauvegarde isolée — n'écrase jamais la partie normale.
 * Aucun score classé ni sync cloud depuis cet écran.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
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

import { useStrategy } from "@/context/StrategyContext";
import { isDevSandboxEnabled } from "@/config/devSandbox";
import {
  deleteSandboxState,
  loadSandboxSnapshot,
  loadSandboxState,
  saveSandboxSnapshot,
  saveSandboxState,
} from "@/storage/sandboxStorage";
import {
  addResource,
  advanceActions,
  advanceDays,
  clearPendingCrises,
  completeAllResearch,
  completeAllTimers,
  completeAllTraining,
  maxAllIndicators,
  maxAllResources,
  setIndicator,
  simulateActiveAlliance,
  simulateAllianceInvitation,
  simulateSpyResult,
  triggerCrisis,
  triggerInteractiveCrisis,
  unlockAllBuildings,
} from "@/logic/sandboxEngine";
import type { StrategyGameState, ResourceKey } from "@/types/strategy";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

// ── Sub-components ────────────────────────────────────────────────────────────

function SecHead({ label }: { label: string }) {
  return (
    <View style={sec.head}>
      <View style={sec.line} />
      <Text style={sec.label}>{label}</Text>
      <View style={sec.line} />
    </View>
  );
}

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function Btn({
  label,
  onPress,
  color = PALETTE.textMid,
  small,
  icon,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  small?: boolean;
  icon?: McName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sec.btn,
        small && sec.btnSmall,
        { borderColor: color + "44", opacity: pressed ? 0.65 : 1 },
      ]}
    >
      {icon && (
        <MaterialCommunityIcons name={icon} size={12} color={color} style={{ marginRight: 2 }} />
      )}
      <Text style={[sec.btnText, { color }, small && sec.btnTextSmall]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BtnRow({ children }: { children: React.ReactNode }) {
  return <View style={sec.row}>{children}</View>;
}

// ── Main screen ───────────────────────────────────────────────────────────────

const RESOURCES: { key: ResourceKey; label: string }[] = [
  { key: "money",        label: "Argent" },
  { key: "influence",    label: "Influence" },
  { key: "energy",       label: "Énergie" },
  { key: "intelligence", label: "Renseignement" },
  { key: "technology",   label: "Technologie" },
  { key: "military",     label: "Militaire" },
  { key: "cyberDefense", label: "Cyberdéf." },
];

type IndKey = keyof StrategyGameState["nationalIndicators"];

const INDICATORS: { key: IndKey; label: string }[] = [
  { key: "popularity",  label: "Popularité" },
  { key: "economy",     label: "Économie" },
  { key: "security",    label: "Sécurité" },
  { key: "ecology",     label: "Écologie" },
  { key: "cohesion",    label: "Cohésion" },
  { key: "publicBudget", label: "Budget pub." },
];

export default function DevSandboxScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { state: liveState } = useStrategy();

  const [sandbox,   setSandbox]   = useState<StrategyGameState | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [hasSnap,   setHasSnap]   = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [log,       setLog]       = useState<string[]>([]);

  // ── Guard ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDevSandboxEnabled()) {
      router.replace("/");
      return;
    }
    void loadSandboxState().then((saved) => {
      if (saved) {
        setSandbox(saved);
      } else if (liveState) {
        const clone = JSON.parse(JSON.stringify(liveState)) as StrategyGameState;
        setSandbox(clone);
        void saveSandboxState(clone);
      }
      setLoading(false);
    });
    void loadSandboxSnapshot().then((s) => setHasSnap(!!s));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutation helper ───────────────────────────────────────────────────────────
  const mutate = useCallback(
    (fn: (s: StrategyGameState) => StrategyGameState, label: string) => {
      setSandbox((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        void saveSandboxState(next);
        setLog((l) => [
          `[${new Date().toLocaleTimeString()}] ${label}`,
          ...l.slice(0, 29),
        ]);
        return next;
      });
    },
    [],
  );

  // ── Snapshot ──────────────────────────────────────────────────────────────────
  const createSnap = useCallback(() => {
    if (!sandbox) return;
    void saveSandboxSnapshot(sandbox).then(() => {
      setHasSnap(true);
      setLog((l) => ["[SNAP] Snapshot créé", ...l.slice(0, 29)]);
    });
  }, [sandbox]);

  const restoreSnap = useCallback(() => {
    void loadSandboxSnapshot().then((s) => {
      if (!s) return;
      setSandbox(s);
      void saveSandboxState(s);
      setLog((l) => ["[SNAP] Snapshot restauré", ...l.slice(0, 29)]);
    });
  }, []);

  // ── Export JSON ───────────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    if (!sandbox) return;
    const payload = JSON.stringify(
      {
        sandboxVersion:     1,
        mandateDay:         sandbox.mandateDay,
        resources:          sandbox.resources,
        nationalIndicators: sandbox.nationalIndicators,
        pendingCrises:      sandbox.news.pendingIds.length,
        relations:          sandbox.relations.map((r) => ({
          status: r.status,
        })),
      },
      null,
      2,
    );
    void Share.share({ message: payload, title: "Sandbox Diagnostic" });
  }, [sandbox]);

  // ── Reset sandbox ──────────────────────────────────────────────────────────────
  const resetSandbox = () => {
    Alert.alert(
      "Réinitialiser le bac à sable ?",
      "Supprime uniquement la sauvegarde sandbox. La partie normale n'est pas touchée.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: () => {
            void deleteSandboxState().then(() => {
              setSandbox(null);
              setLog([]);
              setHasSnap(false);
            });
          },
        },
      ],
    );
  };

  // ── Guards (render) ───────────────────────────────────────────────────────────
  if (!isDevSandboxEnabled()) return null;

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.centerText}>Chargement du bac à sable…</Text>
      </View>
    );
  }

  if (!sandbox) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.centerText}>
          Aucune partie active. Lancez une partie avant d'ouvrir le bac à sable.
        </Text>
        <Btn label="← Retour" onPress={() => router.back()} />
      </View>
    );
  }

  const res = sandbox.resources;
  const ind = sandbox.nationalIndicators;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Watermark permanent */}
      <View style={styles.watermark} pointerEvents="none">
        <Text style={styles.watermarkText}>
          BAC À SABLE DEV — SCORES DÉSACTIVÉS
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>MODE DÉVELOPPEUR</Text>
          <Text style={styles.title}>Bac à sable</Text>
        </View>
        <Text style={styles.dayBadge}>Jour {sandbox.mandateDay}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Snapshot ── */}
        <SecHead label="SNAPSHOT" />
        <BtnRow>
          <Btn label="Créer snapshot" onPress={createSnap} color="#4a9fff" icon="camera-outline" />
          <Btn
            label={hasSnap ? "Restaurer" : "Aucun snapshot"}
            onPress={restoreSnap}
            color={hasSnap ? "#4a9fff" : PALETTE.textLow}
            icon={hasSnap ? "history" : "clock-outline"}
          />
        </BtnRow>

        {/* ── Temps ── */}
        <SecHead label="TEMPS" />
        <BtnRow>
          <Btn label="+1 action"  onPress={() => mutate((s) => advanceActions(s, 1),   "+1 action")}  small />
          <Btn label="+10 actions" onPress={() => mutate((s) => advanceActions(s, 10),  "+10 actions")} small />
          <Btn label="+1 mois"    onPress={() => mutate((s) => advanceDays(s, 30),     "+30 jours")}  small />
          <Btn label="+6 mois"    onPress={() => mutate((s) => advanceDays(s, 180),    "+180 jours")} small />
        </BtnRow>

        {/* ── Ressources ── */}
        <SecHead label="RESSOURCES" />
        <View style={sec.grid}>
          {RESOURCES.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => mutate((s) => addResource(s, key, 1000), `+1 000 ${label}`)}
              style={({ pressed }) => [sec.resCard, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={sec.resLabel}>{label}</Text>
              <Text style={sec.resVal}>
                {Math.round(res[key]).toLocaleString("fr-FR")}
              </Text>
              <Text style={sec.resDelta}>+1 000</Text>
            </Pressable>
          ))}
        </View>
        <Btn
          label="Tout au maximum"
          onPress={() => mutate(maxAllResources, "Ressources → max")}
          color="#e8a93a"
          icon="lightning-bolt"
        />

        {/* ── Indicateurs nationaux ── */}
        <SecHead label="JAUGES NATIONALES" />
        {INDICATORS.map(({ key, label }) => (
          <View key={key} style={sec.indRow}>
            <Text style={sec.indLabel}>
              {label}
              <Text style={sec.indVal}> — {Math.round((ind as unknown as Record<string, number>)[key] ?? 0)}</Text>
            </Text>
            <View style={sec.indBtns}>
              <Btn label="0"   onPress={() => mutate((s) => setIndicator(s, key, 0),   `${label} → 0`)}   small color={PALETTE.danger}  />
              <Btn label="50"  onPress={() => mutate((s) => setIndicator(s, key, 50),  `${label} → 50`)}  small />
              <Btn label="100" onPress={() => mutate((s) => setIndicator(s, key, 100), `${label} → 100`)} small color={PALETTE.success} />
            </View>
          </View>
        ))}
        <Btn
          label="Tout à 100"
          onPress={() => mutate(maxAllIndicators, "Indicateurs → 100")}
          color={PALETTE.success}
          icon="check-all"
        />

        {/* ── Déblocage ── */}
        <SecHead label="DÉBLOCAGE" />
        <BtnRow>
          <Btn label="Bâtiments max"     onPress={() => mutate(unlockAllBuildings,  "Bâtiments max")}    color="#a78bfa" />
          <Btn label="Timers effacés"    onPress={() => mutate(completeAllTimers,   "Timers terminés")}  color="#a78bfa" />
        </BtnRow>
        <BtnRow>
          <Btn label="Recherches termin." onPress={() => mutate(completeAllResearch, "Recherches → OK")}  color="#a78bfa" />
          <Btn label="Unités formées"    onPress={() => mutate(completeAllTraining, "Entraîn. → OK")}   color="#a78bfa" />
        </BtnRow>

        {/* ── Crises ── */}
        <SecHead label="CRISES" />
        <BtnRow>
          <Btn label="Mineure"     onPress={() => mutate((s) => triggerCrisis(s, "faible"),    "Crise faible")}    small color={PALETTE.textMid} />
          <Btn label="Majeure"     onPress={() => mutate((s) => triggerCrisis(s, "forte"),     "Crise forte")}     small color={PALETTE.warning} />
          <Btn label="Critique"    onPress={() => mutate((s) => triggerCrisis(s, "critique"),  "Crise critique")}  small color={PALETTE.danger}  />
          <Btn label="Interactive" onPress={() => mutate(triggerInteractiveCrisis,             "Crise interactive")} small color={PALETTE.danger} />
        </BtnRow>
        <Btn
          label="Vider les crises en attente"
          onPress={() => mutate(clearPendingCrises, "Crises vidées")}
          color={PALETTE.textLow}
          icon="broom"
        />

        {/* ── Multijoueur / Test ── */}
        <SecHead label="MULTIJOUEUR · TEST" />
        <BtnRow>
          <Btn label="Alliance invite" onPress={() => mutate(simulateAllianceInvitation, "Alliance invite simulée")} small color="#3fbe7a" />
          <Btn label="Alliance active" onPress={() => mutate(simulateActiveAlliance,     "Alliance activée")}        small color="#3fbe7a" />
        </BtnRow>
        <BtnRow>
          <Btn label="Espionnage réussi"  onPress={() => mutate((s) => simulateSpyResult(s, "success"), "Spy → réussi")}  small color="#4a9fff" />
          <Btn label="Bloqué"            onPress={() => mutate((s) => simulateSpyResult(s, "blocked"), "Spy → bloqué")}  small color={PALETTE.warning} />
          <Btn label="Échoué"            onPress={() => mutate((s) => simulateSpyResult(s, "failed"),  "Spy → échoué")}  small color={PALETTE.danger}  />
        </BtnRow>

        {/* ── Debug ── */}
        <SecHead label="DEBUG" />
        <BtnRow>
          <Btn
            label={showDebug ? "Masquer état" : "Afficher état"}
            onPress={() => setShowDebug((v) => !v)}
            color="#4a9fff"
            icon={showDebug ? "eye-off-outline" : "eye-outline"}
          />
          <Btn label="Exporter JSON" onPress={exportJSON} color="#4a9fff" icon="export-variant" />
        </BtnRow>

        {showDebug && (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify(
                {
                  mandateDay:         sandbox.mandateDay,
                  resources:          sandbox.resources,
                  nationalIndicators: sandbox.nationalIndicators,
                  pendingCrises:      sandbox.news.pendingIds.length,
                  pendingIds:         sandbox.news.pendingIds,
                  relations:          sandbox.relations.map((r) => r.status),
                  trainingQueue:      sandbox.trainingQueue.length,
                },
                null,
                2,
              )}
            </Text>
          </View>
        )}

        {/* Log des actions */}
        {log.length > 0 && (
          <>
            <SecHead label="LOG" />
            <View style={styles.logBox}>
              {log.map((l, i) => (
                <Text key={i} style={styles.logLine}>{l}</Text>
              ))}
            </View>
          </>
        )}

        {/* ── Contrôle ── */}
        <SecHead label="CONTRÔLE" />
        <Btn
          label="Réinitialiser le bac à sable"
          onPress={resetSandbox}
          color={PALETTE.danger}
          icon="delete-outline"
        />
        <View style={{ height: 6 }} />
        <Btn
          label="← Retour au menu normal"
          onPress={() => router.replace("/")}
          color={PALETTE.textLow}
        />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#030509" },
  center:  { flex: 1, backgroundColor: "#030509", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  centerText: { color: PALETTE.textMid, fontFamily: FONT.reg, fontSize: 14, textAlign: "center", lineHeight: 20 },

  watermark: {
    backgroundColor: "#ff6b35",
    paddingVertical: 5,
    alignItems: "center",
  },
  watermarkText: {
    fontFamily: FONT.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: "#fff",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,107,53,0.06)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ff6b3530",
  },
  kicker: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: "#ff6b35" },
  title:  { fontFamily: FONT.bold, fontSize: 18, color: PALETTE.textHigh },
  dayBadge: { fontFamily: FONT.bold, fontSize: 12, color: PALETTE.textLow },

  scroll: { padding: 16, gap: 8 },

  debugBox: {
    backgroundColor: "#0a0f1a",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#4a9fff33",
    marginBottom: 4,
  },
  debugText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#4a9fff", lineHeight: 15 },

  logBox: {
    backgroundColor: "#0a0a0f",
    borderRadius: 6,
    padding: 10,
    gap: 1,
    borderWidth: 1,
    borderColor: PALETTE.panelEdge,
    marginBottom: 4,
  },
  logLine: { fontFamily: "Inter_400Regular", fontSize: 10, color: PALETTE.textLow, lineHeight: 14 },
});

const sec = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#ff6b3533" },
  label: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: "#ff6b35" },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },

  btn: {
    flex: 1,
    minWidth: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 4,
  },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 8 },
  btnText:  { fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.3, textAlign: "center" },
  btnTextSmall: { fontSize: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  resCard: {
    flex: 1,
    minWidth: 90,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: PALETTE.panelEdge,
    padding: 9,
    alignItems: "center",
    gap: 2,
  },
  resLabel: { fontFamily: FONT.bold, fontSize: 9,  letterSpacing: 0.4, color: PALETTE.textLow },
  resVal:   { fontFamily: FONT.bold, fontSize: 13, color: PALETTE.textHigh },
  resDelta: { fontFamily: FONT.reg,  fontSize: 9,  color: PALETTE.success },

  indRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  indLabel: { flex: 1, fontFamily: FONT.reg, fontSize: 11, color: PALETTE.textMid },
  indVal:   { fontFamily: FONT.bold, color: PALETTE.textHigh },
  indBtns:  { flexDirection: "row", gap: 4 },
});
