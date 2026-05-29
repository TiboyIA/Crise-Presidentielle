/**
 * Console bac à sable développeur.
 * N'est plus une simulation isolée : utilise useStrategy() et applique les
 * mutations via applySandboxMutation(), qui persiste dans la sauvegarde sandbox.
 * Le mode doit être activé depuis les Paramètres avant d'ouvrir cet écran.
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
  deleteSandboxAll,
  loadSandboxSnapshot,
  saveSandboxSnapshot,
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
  label, onPress, color = PALETTE.textMid, small, icon,
}: {
  label: string; onPress: () => void; color?: string; small?: boolean; icon?: McName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sec.btn, small && sec.btnSmall,
        { borderColor: color + "44", opacity: pressed ? 0.65 : 1 },
      ]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={12} color={color} style={{ marginRight: 2 }} />}
      <Text style={[sec.btnText, { color }, small && sec.btnTextSmall]}>{label}</Text>
    </Pressable>
  );
}

function BtnRow({ children }: { children: React.ReactNode }) {
  return <View style={sec.row}>{children}</View>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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
  { key: "popularity",   label: "Popularité" },
  { key: "economy",      label: "Économie" },
  { key: "security",     label: "Sécurité" },
  { key: "ecology",      label: "Écologie" },
  { key: "cohesion",     label: "Cohésion" },
  { key: "publicBudget", label: "Budget pub." },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DevSandboxScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const ctx     = useStrategy();

  const [hasSnap,   setHasSnap]   = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [log,       setLog]       = useState<string[]>([]);

  useEffect(() => {
    if (!isDevSandboxEnabled()) { router.replace("/"); return; }
    void loadSandboxSnapshot().then((s) => setHasSnap(!!s));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutation via context ───────────────────────────────────────────────────
  const mutate = useCallback(
    (fn: (s: StrategyGameState) => StrategyGameState, label: string) => {
      ctx?.applySandboxMutation(fn);
      setLog((l) => [`[${new Date().toLocaleTimeString()}] ${label}`, ...l.slice(0, 29)]);
    },
    [ctx],
  );

  // ── Snapshot (stocké séparément, pas dans le jeu) ─────────────────────────
  const createSnap = useCallback(() => {
    if (!ctx?.state) return;
    void saveSandboxSnapshot(ctx.state).then(() => {
      setHasSnap(true);
      setLog((l) => ["[SNAP] Snapshot créé", ...l.slice(0, 29)]);
    });
  }, [ctx?.state]);

  const restoreSnap = useCallback(() => {
    void loadSandboxSnapshot().then((s) => {
      if (!s) return;
      ctx?.applySandboxMutation(() => s);
      setLog((l) => ["[SNAP] Snapshot restauré", ...l.slice(0, 29)]);
    });
  }, [ctx]);

  const exportJSON = useCallback(() => {
    if (!ctx?.state) return;
    const s = ctx.state;
    void Share.share({
      message: JSON.stringify(
        { mandateDay: s.mandateDay, resources: s.resources, nationalIndicators: s.nationalIndicators,
          pendingCrises: s.news.pendingIds.length, relations: s.relations.map((r) => r.status) },
        null, 2,
      ),
      title: "Sandbox Diagnostic",
    });
  }, [ctx?.state]);

  const resetSandbox = () => {
    Alert.alert(
      "Réinitialiser le bac à sable ?",
      "Supprime la sauvegarde sandbox et désactive le mode. La partie normale n'est pas affectée.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: () => {
            void ctx?.disableSandboxMode();
            void deleteSandboxAll();
            setLog([]);
            setHasSnap(false);
            router.replace("/settings");
          },
        },
      ],
    );
  };

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!isDevSandboxEnabled()) return null;

  if (!ctx?.isSandboxActive) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <MaterialCommunityIcons name="flask-off-outline" size={40} color="#ff6b35" />
        <Text style={styles.centerTitle}>Mode bac à sable inactif</Text>
        <Text style={styles.centerText}>
          Activez le mode bac à sable dans les Paramètres avant d'ouvrir cette console.
        </Text>
        <Btn label="← Aller aux paramètres" onPress={() => router.push("/settings")} color="#ff6b35" />
      </View>
    );
  }

  if (!ctx.state) return null;

  const res = ctx.state.resources;
  const ind = ctx.state.nationalIndicators;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>CONSOLE DÉVELOPPEUR</Text>
          <Text style={styles.title}>Bac à sable</Text>
        </View>
        <Text style={styles.dayBadge}>Jour {ctx.state.mandateDay}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 56 }]}
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
          <Btn label="+1 action"   onPress={() => mutate((s) => advanceActions(s, 1),   "+1 action")}   small />
          <Btn label="+10 actions" onPress={() => mutate((s) => advanceActions(s, 10),  "+10 actions")} small />
          <Btn label="+1 mois"     onPress={() => mutate((s) => advanceDays(s, 30),     "+30 jours")}   small />
          <Btn label="+6 mois"     onPress={() => mutate((s) => advanceDays(s, 180),    "+180 jours")}  small />
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
              <Text style={sec.resVal}>{Math.round(res[key]).toLocaleString("fr-FR")}</Text>
              <Text style={sec.resDelta}>+1 000</Text>
            </Pressable>
          ))}
        </View>
        <Btn label="Tout au maximum" onPress={() => mutate(maxAllResources, "Ressources → max")} color="#e8a93a" icon="lightning-bolt" />

        {/* ── Indicateurs ── */}
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
        <Btn label="Tout à 100" onPress={() => mutate(maxAllIndicators, "Indicateurs → 100")} color={PALETTE.success} icon="check-all" />

        {/* ── Économie réelle ── */}
        <SecHead label="ÉCONOMIE RÉELLE" />
        {([
          { key: "inflation"        as const, label: "Inflation",          presets: [10, 25, 55, 80] },
          { key: "unemployment"     as const, label: "Chômage",            presets: [10, 25, 50, 75] },
          { key: "purchasingPower"  as const, label: "Pouvoir d'achat",    presets: [20, 45, 65, 90] },
          { key: "investorConfidence" as const, label: "Confiance marchés", presets: [10, 35, 60, 85] },
          { key: "productivity"     as const, label: "Productivité",        presets: [20, 45, 65, 85] },
          { key: "taxPressure"      as const, label: "Pression fiscale",    presets: [20, 42, 65, 80] },
          { key: "fiscalConsent"    as const, label: "Consentement fiscal", presets: [15, 42, 65, 85] },
          { key: "tradeBalance"     as const, label: "Balance commerciale", presets: [-60, -20, 0, 30] },
          { key: "stagflationIndex" as const, label: "Stagflation index",  presets: [0, 20, 50, 80] },
          { key: "centralBankCredibility" as const, label: "Créd. banque centrale", presets: [15, 35, 65, 90] },
          { key: "monetaryTension"  as const, label: "Tension monétaire",   presets: [5, 20, 55, 80] },
          { key: "inequalityIndex"  as const, label: "Inégalités",          presets: [10, 35, 60, 85] },
          { key: "shadowEconomy"    as const, label: "Économie informelle", presets: [10, 30, 55, 75] },
        ] as { key: keyof StrategyGameState; label: string; presets: number[] }[]).map(({ key, label, presets }) => {
          const currentVal = (ctx.state as unknown as Record<string, number | undefined>)[key] ?? 0;
          return (
            <View key={key} style={sec.indRow}>
              <Text style={sec.indLabel}>
                {label}
                <Text style={sec.indVal}> — {Math.round(currentVal)}</Text>
              </Text>
              <View style={sec.indBtns}>
                {presets.map((v) => (
                  <Btn
                    key={v}
                    label={String(v)}
                    small
                    onPress={() => mutate(
                      (s) => ({ ...s, [key]: Math.max(-100, Math.min(100, v)) }),
                      `${label} → ${v}`,
                    )}
                    color={v <= 0 ? PALETTE.danger : v >= 70 ? PALETTE.success : PALETTE.textMid}
                  />
                ))}
              </View>
            </View>
          );
        })}
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <Btn
            label="Cycle: récession"
            small
            onPress={() => mutate(
              (s) => ({ ...s, businessCyclePhase: "recession" as const, cycleMomentum: 15 }),
              "Cycle → récession",
            )}
            color={PALETTE.danger}
          />
          <Btn
            label="Cycle: expansion"
            small
            onPress={() => mutate(
              (s) => ({ ...s, businessCyclePhase: "expansion" as const, cycleMomentum: 72 }),
              "Cycle → expansion",
            )}
            color={PALETTE.success}
          />
          <Btn
            label="Cycle: surchauffe"
            small
            onPress={() => mutate(
              (s) => ({ ...s, businessCyclePhase: "surchauffe" as const, cycleMomentum: 78, inflation: 65 }),
              "Cycle → surchauffe",
            )}
            color={PALETTE.warning}
          />
          <Btn
            label="Stagflation max"
            small
            onPress={() => mutate(
              (s) => ({ ...s, stagflationIndex: 75, inflation: 68, unemployment: 58 }),
              "Stagflation → 75",
            )}
            color="#e8864f"
          />
        </View>

        {/* ── Déblocage ── */}
        <SecHead label="DÉBLOCAGE" />
        <BtnRow>
          <Btn label="Bâtiments max"      onPress={() => mutate(unlockAllBuildings,  "Bâtiments max")}   color="#a78bfa" />
          <Btn label="Timers effacés"     onPress={() => mutate(completeAllTimers,   "Timers → OK")}     color="#a78bfa" />
        </BtnRow>
        <BtnRow>
          <Btn label="Recherches termin." onPress={() => mutate(completeAllResearch, "Recherches → OK")} color="#a78bfa" />
          <Btn label="Unités formées"     onPress={() => mutate(completeAllTraining, "Entraîn. → OK")}  color="#a78bfa" />
        </BtnRow>

        {/* ── Crises ── */}
        <SecHead label="CRISES" />
        <BtnRow>
          <Btn label="Mineure"     onPress={() => mutate((s) => triggerCrisis(s, "faible"),   "Crise faible")}    small color={PALETTE.textMid} />
          <Btn label="Majeure"     onPress={() => mutate((s) => triggerCrisis(s, "forte"),    "Crise forte")}     small color={PALETTE.warning} />
          <Btn label="Critique"    onPress={() => mutate((s) => triggerCrisis(s, "critique"), "Crise critique")}  small color={PALETTE.danger}  />
          <Btn label="Interactive" onPress={() => mutate(triggerInteractiveCrisis,             "Crise interactive")} small color={PALETTE.danger} />
        </BtnRow>
        <Btn label="Vider les crises en attente" onPress={() => mutate(clearPendingCrises, "Crises vidées")} color={PALETTE.textLow} icon="broom" />

        {/* ── Multijoueur ── */}
        <SecHead label="MULTIJOUEUR · TEST" />
        <BtnRow>
          <Btn label="Alliance invite" onPress={() => mutate(simulateAllianceInvitation, "Alliance invite")} small color="#3fbe7a" />
          <Btn label="Alliance active" onPress={() => mutate(simulateActiveAlliance,     "Alliance active")} small color="#3fbe7a" />
        </BtnRow>
        <BtnRow>
          <Btn label="Spy réussi"  onPress={() => mutate((s) => simulateSpyResult(s, "success"), "Spy → OK")}    small color="#4a9fff" />
          <Btn label="Bloqué"      onPress={() => mutate((s) => simulateSpyResult(s, "blocked"), "Spy → bloqué")} small color={PALETTE.warning} />
          <Btn label="Échoué"      onPress={() => mutate((s) => simulateSpyResult(s, "failed"),  "Spy → échoué")} small color={PALETTE.danger}  />
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
              {JSON.stringify({
                mandateDay:         ctx.state.mandateDay,
                resources:          ctx.state.resources,
                nationalIndicators: ctx.state.nationalIndicators,
                pendingCrises:      ctx.state.news.pendingIds.length,
                pendingIds:         ctx.state.news.pendingIds,
                relations:          ctx.state.relations.map((r) => r.status),
              }, null, 2)}
            </Text>
          </View>
        )}

        {log.length > 0 && (
          <>
            <SecHead label="LOG" />
            <View style={styles.logBox}>
              {log.map((l, i) => <Text key={i} style={styles.logLine}>{l}</Text>)}
            </View>
          </>
        )}

        {/* ── Contrôle ── */}
        <SecHead label="CONTRÔLE" />
        <Btn label="Réinitialiser le bac à sable" onPress={resetSandbox} color={PALETTE.danger} icon="delete-outline" />
        <View style={{ height: 6 }} />
        <Btn label="← Retour au jeu" onPress={() => router.replace("/nation")} color={PALETTE.textLow} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#030509" },
  center: { flex: 1, backgroundColor: "#030509", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  centerTitle: { fontFamily: FONT.bold, fontSize: 16, color: "#ff6b35", textAlign: "center" },
  centerText:  { fontFamily: FONT.reg,  fontSize: 13, color: PALETTE.textMid, textAlign: "center", lineHeight: 19 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "rgba(255,107,53,0.06)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ff6b3530",
  },
  kicker:   { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: "#ff6b35" },
  title:    { fontFamily: FONT.bold, fontSize: 18, color: PALETTE.textHigh },
  dayBadge: { fontFamily: FONT.bold, fontSize: 12, color: PALETTE.textLow },

  scroll: { padding: 16, gap: 8 },

  debugBox: { backgroundColor: "#0a0f1a", borderRadius: 6, padding: 10, borderWidth: 1, borderColor: "#4a9fff33", marginBottom: 4 },
  debugText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#4a9fff", lineHeight: 15 },

  logBox: { backgroundColor: "#0a0a0f", borderRadius: 6, padding: 10, gap: 1, borderWidth: 1, borderColor: PALETTE.panelEdge, marginBottom: 4 },
  logLine: { fontFamily: "Inter_400Regular", fontSize: 10, color: PALETTE.textLow, lineHeight: 14 },
});

const sec = StyleSheet.create({
  head:  { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 6 },
  line:  { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#ff6b3533" },
  label: { fontFamily: FONT.bold, fontSize: 8, letterSpacing: 2, color: "#ff6b35" },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },

  btn: {
    flex: 1, minWidth: 80,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 11, paddingHorizontal: 10,
    borderRadius: RADIUS.sm, borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)", gap: 4,
  },
  btnSmall:      { paddingVertical: 7, paddingHorizontal: 8 },
  btnText:       { fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.3, textAlign: "center" },
  btnTextSmall:  { fontSize: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  resCard: {
    flex: 1, minWidth: 90,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.panelEdge,
    padding: 9, alignItems: "center", gap: 2,
  },
  resLabel: { fontFamily: FONT.bold, fontSize: 9, letterSpacing: 0.4, color: PALETTE.textLow },
  resVal:   { fontFamily: FONT.bold, fontSize: 13, color: PALETTE.textHigh },
  resDelta: { fontFamily: FONT.reg,  fontSize: 9,  color: PALETTE.success },

  indRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  indLabel: { flex: 1, fontFamily: FONT.reg,  fontSize: 11, color: PALETTE.textMid },
  indVal:   { fontFamily: FONT.bold },
  indBtns:  { flexDirection: "row", gap: 4 },
});
