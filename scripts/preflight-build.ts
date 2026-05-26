/**
 * Preflight Build Check — État de Crise
 * Contrôle pré-build avant EAS preview ou production.
 *
 * Usage :
 *   npm run preflight          → mode preview
 *   npm run preflight:prod     → mode production (vérifications renforcées)
 *
 * Ne lance pas de build. Ne supprime pas de fichier. N'affiche pas de secret.
 */

import fs   from "fs";
import path from "path";
import { spawnSync } from "child_process";

// ── Configuration ─────────────────────────────────────────────────────────────

const ROOT    = process.cwd();
const IS_PROD = process.argv.includes("--prod");
const MODE    = IS_PROD ? "production" : "preview";

const REPORT_PATH = path.join(ROOT, "preflight-report.json");

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "ok" | "warn" | "error";

interface Check {
  id:      string;
  label:   string;
  status:  Status;
  detail?: string;
}

const checks: Check[] = [];

function ok  (id: string, label: string, detail?: string) { checks.push({ id, label, status: "ok",    detail }); }
function warn (id: string, label: string, detail?: string) { checks.push({ id, label, status: "warn",  detail }); }
function fail (id: string, label: string, detail?: string) { checks.push({ id, label, status: "error", detail }); }

const ICON: Record<Status, string> = { ok: "✅", warn: "⚠️ ", error: "❌" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const envMerged: Record<string, string> = {
  ...parseEnvFile(path.join(ROOT, ".env")),
  ...parseEnvFile(path.join(ROOT, ".env.local")),
  ...(process.env as Record<string, string>),
};

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      entry.isDirectory() ? walk(full) : (total += fs.statSync(full).size);
    }
  };
  walk(dir);
  return total;
}

function fmtMB(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(1)} Mo`;
}

/** Retourne true si le fichier est suivi par git. */
function isTrackedByGit(relPath: string): boolean {
  const r = spawnSync("git", ["ls-files", "--error-unmatch", relPath], {
    cwd: ROOT, stdio: "pipe",
  });
  return r.status === 0;
}

// ── Affichage en cours ────────────────────────────────────────────────────────

function progress(msg: string) {
  process.stdout.write(`  ⏳  ${msg}...\r`);
}

function clearLine() {
  process.stdout.write("                                                        \r");
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 1 — TypeScript (typecheck)
// ═════════════════════════════════════════════════════════════════════════════

progress("TypeScript typecheck");

{
  const r = spawnSync("npx", ["tsc", "--noEmit"], { cwd: ROOT, stdio: "pipe", shell: true });
  const raw = (r.stdout?.toString() ?? "") + (r.stderr?.toString() ?? "");
  // Filtrer les faux-positifs Deno/Supabase et node_modules
  const gameErrors = raw
    .split("\n")
    .filter((l) => l.includes("error TS") && !l.includes("supabase/functions/") && !l.includes("node_modules"))
    .map((l) => l.trim())
    .filter(Boolean);

  clearLine();

  if (gameErrors.length === 0) {
    ok("typecheck", "TypeScript typecheck", "0 erreur dans le code jeu");
  } else {
    fail(
      "typecheck",
      "TypeScript typecheck",
      `${gameErrors.length} erreur(s) — ${gameErrors[0].slice(0, 120)}`,
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 2 — Tests golden (si disponible)
// ═════════════════════════════════════════════════════════════════════════════

{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));

  if (!pkg.scripts?.["test:golden"]) {
    warn("test_golden", "Tests golden", "Script test:golden absent — ignoré");
  } else {
    progress("Tests golden");

    const r = spawnSync("npm", ["run", "test:golden"], { cwd: ROOT, stdio: "pipe", shell: true });
    clearLine();

    if (r.status === 0) {
      ok("test_golden", "Tests golden", "Tous les tests passent");
    } else {
      const out = (r.stdout?.toString() ?? "") + (r.stderr?.toString() ?? "");
      const firstError = out
        .split("\n")
        .find((l) => l.toLowerCase().includes("fail") || l.toLowerCase().includes("error"))
        ?.trim() ?? "Échec — voir logs";
      fail("test_golden", "Tests golden", firstError.slice(0, 120));
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 3 — Assets compressés
// ═════════════════════════════════════════════════════════════════════════════

{
  const bytes = dirSizeBytes(path.join(ROOT, "assets"));
  const mb    = bytes / 1_048_576;

  if (mb > 100) {
    warn(
      "assets_size",
      "Taille assets/",
      `${fmtMB(bytes)} — élevée, lancer : npm run assets:compress`,
    );
  } else if (mb > 50) {
    warn("assets_size", "Taille assets/", `${fmtMB(bytes)} — acceptable mais compressible`);
  } else {
    ok("assets_size", "Taille assets/", fmtMB(bytes));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 4 — Version app.json
// ═════════════════════════════════════════════════════════════════════════════

{
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf-8"));
  const version = appJson?.expo?.version as string | undefined;

  if (!version) {
    fail("app_version", "Version app.json (expo.version)", "Champ absent");
  } else if (!/^\d+\.\d+\.\d+$/.test(version)) {
    warn("app_version", "Version app.json (expo.version)", `"${version}" — format inattendu (attendu x.y.z)`);
  } else {
    ok("app_version", "Version app.json (expo.version)", version);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 5 — Profils EAS
// ═════════════════════════════════════════════════════════════════════════════

{
  const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, "eas.json"), "utf-8"));
  const profiles = Object.keys(easJson?.build ?? {});

  for (const required of ["development", "preview", "production"]) {
    if (profiles.includes(required)) {
      ok(`eas_profile_${required}`, `EAS profil : ${required}`);
    } else {
      fail(`eas_profile_${required}`, `EAS profil : ${required}`, "Profil absent dans eas.json");
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 6 — Sandbox inactive en production
// ═════════════════════════════════════════════════════════════════════════════

{
  const sandbox = envMerged["EXPO_PUBLIC_ENABLE_DEV_SANDBOX"];
  const active  = sandbox === "true" || sandbox === "1";

  if (IS_PROD && active) {
    fail(
      "sandbox",
      "Sandbox dev (production)",
      "EXPO_PUBLIC_ENABLE_DEV_SANDBOX est active — build production bloquée",
    );
  } else if (!IS_PROD && active) {
    warn("sandbox", "Sandbox dev (preview)", "EXPO_PUBLIC_ENABLE_DEV_SANDBOX active — normale en preview");
  } else {
    ok("sandbox", "Sandbox dev", "Inactive");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 7 — Fichiers secrets non trackés dans git
// ═════════════════════════════════════════════════════════════════════════════

// 7a. secrets/google-play-service-account.json
{
  const tracked = isTrackedByGit("secrets/google-play-service-account.json");
  if (tracked) {
    fail("secret_gplay", "secrets/google-play-service-account.json", "Tracké par git — supprimer du suivi");
  } else {
    ok("secret_gplay", "secrets/google-play-service-account.json", "Non tracké ✓");
  }
}

// 7b. .env.local
{
  const tracked = isTrackedByGit(".env.local");
  if (tracked) {
    fail("secret_env_local", ".env.local", "Tracké par git — risque d'exposition de secrets");
  } else {
    ok("secret_env_local", ".env.local", "Non tracké ✓");
  }
}

// 7c. Fichiers .keystore sur disque et dans git
{
  const r = spawnSync("git", ["ls-files", "--", "*.keystore"], { cwd: ROOT, stdio: "pipe" });
  const tracked = r.stdout?.toString().trim() ?? "";
  if (tracked.length > 0) {
    fail("secret_keystore", "Fichiers .keystore", `Tracké : ${tracked.split("\n")[0]}`);
  } else {
    ok("secret_keystore", "Fichiers .keystore", "Aucun tracké dans git ✓");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 8 — Nom d'app et package Android dans app.json
// ═════════════════════════════════════════════════════════════════════════════

{
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf-8"));
  const name    = appJson?.expo?.name as string | undefined;
  const pkg     = appJson?.expo?.android?.package as string | undefined;

  if (!name) {
    fail("app_name", "Nom de l'app (expo.name)", "Champ absent dans app.json");
  } else {
    ok("app_name", "Nom de l'app (expo.name)", `"${name}"`);
  }

  if (!pkg) {
    fail("android_pkg", "Package Android (expo.android.package)", "Champ absent dans app.json");
  } else if (!pkg.includes(".")) {
    warn("android_pkg", "Package Android (expo.android.package)", `"${pkg}" — format inattendu`);
  } else {
    ok("android_pkg", "Package Android (expo.android.package)", pkg);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 9 — Production utilise app-bundle
// ═════════════════════════════════════════════════════════════════════════════

{
  const easJson   = JSON.parse(fs.readFileSync(path.join(ROOT, "eas.json"), "utf-8"));
  const buildType = easJson?.build?.production?.android?.buildType as string | undefined;

  if (!buildType) {
    warn("prod_bundle", "Production Android : app-bundle", "buildType non défini dans eas.json");
  } else if (buildType !== "app-bundle") {
    fail(
      "prod_bundle",
      "Production Android : app-bundle",
      `buildType est "${buildType}" — Play Store exige app-bundle`,
    );
  } else {
    ok("prod_bundle", "Production Android : app-bundle", "app-bundle ✓");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// RAPPORT CONSOLE
// ═════════════════════════════════════════════════════════════════════════════

const errors   = checks.filter((c) => c.status === "error");
const warnings = checks.filter((c) => c.status === "warn");
const oks      = checks.filter((c) => c.status === "ok");
const passed   = errors.length === 0;

const modeLabel = IS_PROD ? "PRODUCTION" : "PREVIEW";

console.log("");
console.log("┌────────────────────────────────────────────────────┐");
console.log(`│   PREFLIGHT BUILD — ÉTAT DE CRISE (${modeLabel.padEnd(10)})  │`);
console.log("└────────────────────────────────────────────────────┘");
console.log("");

for (const c of checks) {
  const icon   = ICON[c.status];
  const detail = c.detail ? `  →  ${c.detail}` : "";
  console.log(`  ${icon}  ${c.label}${detail}`);
}

console.log("");
console.log(`  Résultat : ${oks.length} OK · ${warnings.length} avertissements · ${errors.length} bloquants`);
console.log("");

if (!passed) {
  console.log("  ❌  Build bloquée — corriger les points ci-dessus.");
} else if (warnings.length > 0) {
  console.log("  ⚠️   Preflight OK avec avertissements — build autorisée.");
} else {
  console.log("  ✅  Preflight réussie — build prête.");
}

console.log("");

// ═════════════════════════════════════════════════════════════════════════════
// CHECK 10 — Rapport JSON
// ═════════════════════════════════════════════════════════════════════════════

const report = {
  mode:      MODE,
  timestamp: new Date().toISOString(),
  passed,
  summary:   { ok: oks.length, warnings: warnings.length, errors: errors.length },
  checks:    checks.map(({ id, label, status, detail }) => ({ id, label, status, detail })),
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
console.log(`  Rapport écrit → preflight-report.json`);
console.log("");

process.exit(passed ? 0 : 1);
