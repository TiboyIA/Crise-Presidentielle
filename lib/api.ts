import Constants from "expo-constants";

interface ExtraConfig {
  apiHost?: string | null;
}

function getExtra(): ExtraConfig {
  const fromExpo = Constants.expoConfig?.extra as ExtraConfig | undefined;
  if (fromExpo) return fromExpo;
  const fromManifest = (Constants as unknown as { manifest2?: { extra?: ExtraConfig } })
    .manifest2?.extra;
  return fromManifest ?? {};
}

export function apiBaseUrl(): string {
  // EXPO_PUBLIC_API_URL is baked into the bundle at build time and works in
  // all environments (native Android/iOS, web, Replit). Set it in EAS Secrets
  // (not in eas.json env block) for production builds.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    const url = fromEnv.replace(/\/$/, "");
    // Enforce HTTPS in production to prevent traffic interception.
    if (!__DEV__ && !url.startsWith("https://")) {
      console.error("[api] Non-HTTPS API URL rejected in production:", url);
      return "";
    }
    return url;
  }
  // Replit fallback: apiHost is injected by app.config.js via REPLIT_DOMAINS.
  const extra = getExtra();
  if (typeof extra.apiHost === "string" && extra.apiHost.length > 0) {
    return `https://${extra.apiHost}`;
  }
  return "";
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
