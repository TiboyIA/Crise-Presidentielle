/**
 * diagnosticEngine.ts — Export diagnostic développeur (DEV uniquement).
 *
 * Collecte des métadonnées d'état lisibles sans exposer de secrets,
 * tokens, emails, clés Supabase ou données personnelles.
 *
 * Ne jamais appeler en production — le bouton d'export est conditionné par
 * isDevSandboxEnabled() dans settings.tsx.
 */

import Constants from "expo-constants";
import type { StrategyGameState } from "@/types/strategy";
import type { AuthState } from "@/context/AuthContext";
import { isDevSandboxEnabled } from "@/config/devSandbox";

// ── Ring buffer des actions sandbox ──────────────────────────────────────────
// Alimenté par logSandboxAction() depuis StrategyContext.applySandboxMutation.

const SANDBOX_LOG_MAX = 20;
const _sandboxLog: string[] = [];

export function logSandboxAction(label: string): void {
  const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.mmm
  _sandboxLog.push(`[${ts}] ${label}`);
  if (_sandboxLog.length > SANDBOX_LOG_MAX) _sandboxLog.shift();
}

export function getSandboxLog(): readonly string[] {
  return _sandboxLog;
}

export function clearSandboxLog(): void {
  _sandboxLog.length = 0;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiagnosticEnv {
  isDev: boolean;
  sandboxEnabled: boolean;
  sandboxActive: boolean;
  supabaseConfigured: boolean;
}

export interface DiagnosticGame {
  countryId: string | null;
  mandateDay: number | null;
  buildingsBuilt: number;
  researchCompleted: number;
  unitsDeployed: number;
  journalEvents: number;
  saveState: "normal" | "sandbox" | "no-save";
  saveVersion: number | null;
}

export interface DiagnosticAuth {
  enabled: boolean;
  linked: boolean;
  providers: string[];
  hasUser: boolean;
}

export interface AppDiagnostic {
  generatedAt: string;
  appVersion: string;
  env: DiagnosticEnv;
  game: DiagnosticGame;
  auth: DiagnosticAuth;
  sandboxLog: string[] | null;
}

// ── Builder ───────────────────────────────────────────────────────────────────

type AuthSnapshot = Pick<AuthState, "isEnabled" | "isLinked" | "linkedProviders" | "user">;

export function buildDiagnostic(
  state: StrategyGameState | null,
  auth: AuthSnapshot,
  isSandboxActive: boolean,
): AppDiagnostic {
  const supabaseConfigured =
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  const game: DiagnosticGame = state
    ? {
        countryId: state.countryId as string,
        mandateDay: state.mandateDay,
        buildingsBuilt: state.buildings.filter((b) => b.level > 0).length,
        researchCompleted: state.strategyResearch?.completed.length ?? 0,
        unitsDeployed: state.playerUnits.length,
        journalEvents: state.news.log.length,
        saveState: isSandboxActive ? "sandbox" : "normal",
        saveVersion: state.version,
      }
    : {
        countryId: null,
        mandateDay: null,
        buildingsBuilt: 0,
        researchCompleted: 0,
        unitsDeployed: 0,
        journalEvents: 0,
        saveState: "no-save",
        saveVersion: null,
      };

  return {
    generatedAt: new Date().toISOString(),
    appVersion: (Constants.expoConfig?.version ?? "0.0.0") as string,
    env: {
      isDev: __DEV__,
      sandboxEnabled: isDevSandboxEnabled(),
      sandboxActive: isSandboxActive,
      supabaseConfigured,
    },
    game,
    auth: {
      enabled: auth.isEnabled,
      linked: auth.isLinked,
      providers: auth.linkedProviders,
      hasUser: auth.user !== null,
    },
    sandboxLog: _sandboxLog.length > 0 ? [..._sandboxLog] : null,
  };
}

export function exportDiagnosticJSON(diagnostic: AppDiagnostic): string {
  return JSON.stringify(diagnostic, null, 2);
}
