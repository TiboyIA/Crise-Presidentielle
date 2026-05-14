/**
 * Security event logger.
 *
 * In production: all functions are no-ops — zero overhead, zero data leak.
 * In development: verbose console output with severity levels.
 *
 * Never log PII (player name, device ID, purchase tokens).
 * Log action types, timestamps, and anomaly signals only.
 */

export type SecurityLevel = "info" | "warning" | "suspicious" | "blocked";

export interface SecurityEvent {
  level: SecurityLevel;
  category: string;
  message: string;
  /** Attach only non-PII metadata (action type, count, threshold). */
  meta?: Record<string, string | number | boolean>;
}

const LEVEL_PREFIX: Record<SecurityLevel, string> = {
  info: "ℹ️  [SEC]",
  warning: "⚠️  [SEC]",
  suspicious: "🚨 [SEC]",
  blocked: "🔴 [SEC]",
};

export function securityLog(event: SecurityEvent): void {
  if (!__DEV__) return;
  const { level, category, message, meta } = event;
  const prefix = LEVEL_PREFIX[level];
  if (meta && Object.keys(meta).length > 0) {
    console.warn(`${prefix} [${category}] ${message}`, meta);
  } else {
    console.warn(`${prefix} [${category}] ${message}`);
  }
}

export function securityInfo(category: string, message: string, meta?: SecurityEvent["meta"]): void {
  securityLog({ level: "info", category, message, meta });
}

export function securityWarn(category: string, message: string, meta?: SecurityEvent["meta"]): void {
  securityLog({ level: "warning", category, message, meta });
}

export function securitySuspicious(category: string, message: string, meta?: SecurityEvent["meta"]): void {
  securityLog({ level: "suspicious", category, message, meta });
}

export function securityBlocked(category: string, message: string, meta?: SecurityEvent["meta"]): void {
  securityLog({ level: "blocked", category, message, meta });
}
