import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { setAccessToken, registerDevice, syncOnLaunch } from "@/services/SyncService";
import { retryPendingSubmission } from "@/services/RankedService";
import { setEntitlementToken } from "@/lib/entitlements";
import { loginRevenueCat, logoutRevenueCat } from "@/lib/purchases";
import { loadStrategy, saveStrategy } from "@/storage/strategyStorage";
import { migrateSave } from "@/storage/saveMigrations";
import Constants from "expo-constants";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

type SupabaseClient = import("@supabase/supabase-js").SupabaseClient;
type User = import("@supabase/supabase-js").User;

let _client: SupabaseClient | null = null;

// SecureStore has a ~2 KB value limit; Supabase sessions can exceed it.
// Values that fit go to SecureStore (encrypted); larger ones fall back to AsyncStorage.
const SECURE_MAX = 2048;
const authStorage = {
  async getItem(key: string): Promise<string | null> {
    const inAsync = await AsyncStorage.getItem(`__sb_as_${key}`);
    if (inAsync === "1") return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (value.length > SECURE_MAX) {
      await AsyncStorage.setItem(key, value);
      await AsyncStorage.setItem(`__sb_as_${key}`, "1");
    } else {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(`__sb_as_${key}`);
    }
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key).catch(() => null);
    await AsyncStorage.multiRemove([key, `__sb_as_${key}`]);
  },
};

function getClient(): SupabaseClient | null {
  if (!ENABLED) return null;
  if (!_client) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

// ── Context ───────────────────────────────────────────────────────────────────

export interface LinkResult { ok: boolean; error?: string }

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isReady: boolean;
  isEnabled: boolean;
  isLinked: boolean;
  linkedProviders: string[];
  linkWithGoogle: () => Promise<LinkResult>;
  linkWithApple: () => Promise<LinkResult>;
}

const noop = async (): Promise<LinkResult> => ({ ok: false, error: "not-enabled" });

const AuthContext = createContext<AuthState>({
  user: null,
  accessToken: null,
  isReady: false,
  isEnabled: false,
  isLinked: false,
  linkedProviders: [],
  linkWithGoogle: noop,
  linkWithApple: noop,
});

async function onAuthenticated(token: string, userId: string): Promise<void> {
  setAccessToken(token);
  setEntitlementToken(token);
  loginRevenueCat(userId); // fire-and-forget — links RC anonymous ID → Supabase UID

  const appVersion = (Constants.expoConfig?.version ?? "0.0.0") as string;
  registerDevice(token, appVersion); // fire-and-forget
  retryPendingSubmission(token); // retry ranked submit if network was unavailable last time

  // Cloud save sync — restore cloud save if it's newer than local
  const local = await loadStrategy();
  const localSavedAt = local ? (local.state.startedAt ?? 0) : 0;
  const { cloudSaveToRestore } = await syncOnLaunch(token, localSavedAt);
  if (cloudSaveToRestore) {
    // Migrate cloud save before persisting — it may be an older version
    const migrated = migrateSave(cloudSaveToRestore);
    if (migrated) {
      await saveStrategy(migrated.state);
    }
  }
}

function deriveLinked(user: User | null) {
  const identities = user?.identities ?? [];
  const providers = identities.map((i) => i.provider).filter((p) => p !== "anonymous");
  return { isLinked: providers.length > 0, linkedProviders: providers };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isReady: !ENABLED,
    isEnabled: ENABLED,
    isLinked: false,
    linkedProviders: [],
    linkWithGoogle: noop,
    linkWithApple: noop,
  });

  useEffect(() => {
    if (!ENABLED) return;
    const sb = getClient()!;

    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setState((s) => ({ ...s, user: session.user, accessToken: session.access_token, isReady: true, isEnabled: true, ...deriveLinked(session.user) }));
        onAuthenticated(session.access_token, session.user.id);
        return;
      }
      const { data, error } = await sb.auth.signInAnonymously();
      if (!error && data.session) {
        setState((s) => ({ ...s, user: data.session!.user, accessToken: data.session!.access_token, isReady: true, isEnabled: true, ...deriveLinked(data.session!.user) }));
        onAuthenticated(data.session.access_token, data.session.user.id);
      } else {
        setState((s) => ({ ...s, user: null, accessToken: null, isReady: true, isEnabled: true, ...deriveLinked(null) }));
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      setAccessToken(token);
      setEntitlementToken(token);
      if (!token) logoutRevenueCat();
      setState((s) => ({
        ...s,
        user: session?.user ?? null,
        accessToken: token,
        isReady: true,
        isEnabled: true,
        ...deriveLinked(session?.user ?? null),
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function linkWithProvider(provider: "google" | "apple"): Promise<LinkResult> {
    const sb = getClient();
    if (!sb) return { ok: false, error: "not-enabled" };

    // Ensure session is in memory before calling linkIdentity
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { ok: false, error: "no-session" };

    const redirectTo = Linking.createURL("auth/callback");
    type OAuthCreds = import("@supabase/supabase-js").SignInWithOAuthCredentials;
    const creds: OAuthCreds = { provider, options: { redirectTo } };
    const { data, error } = await sb.auth.linkIdentity(creds);
    if (error) {
      // Map Supabase SDK errors to internal codes — never forward error.message to UI
      // (it can contain internal details like "invalid_grant", stack context, etc.).
      const msg = error.message ?? "";
      if (msg.toLowerCase().includes("already")) return { ok: false, error: "identity-already-linked" };
      return { ok: false, error: "oauth-failed" };
    }
    const url = (data as { url?: string })?.url;
    if (!url) return { ok: false, error: "no-url" };

    // Defense in depth: verify the OAuth URL originates from our Supabase project.
    // linkIdentity() returns a Supabase /auth/v1/authorize URL; an unexpected origin
    // would indicate SDK tampering or a misconfigured project.
    const expectedOrigin = SUPABASE_URL.replace(/\/$/, "");
    if (!url.startsWith(expectedOrigin)) {
      return { ok: false, error: "oauth-failed" };
    }

    const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
    if (result.type !== "success") return { ok: false, error: "cancelled" };
    return { ok: true };
  }

  const value: AuthState = {
    ...state,
    linkWithGoogle: () => linkWithProvider("google"),
    linkWithApple: () => linkWithProvider("apple"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
