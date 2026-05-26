/**
 * build-manifest.ts — Snapshot de l'état du projet avant build EAS.
 *
 * Usage :
 *   npm run build:manifest                          → profil preview (défaut)
 *   npm run build:manifest -- --profile production  → profil production
 *   npm run build:manifest -- --profile development → profil development
 *
 * Génère build-manifest.json. Ne lance aucun build. N'expose aucun secret.
 */

import fs   from "fs";
import path from "path";
import { spawnSync } from "child_process";

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = "development" | "preview" | "production";
type CheckStatus = "ok" | "error" | "skipped";
type EnvStatus = "définie" | "absente" | "active" | "inactive";

interface EnvEntry  { status: EnvStatus }
interface CheckEntry { status: CheckStatus; detail?: string }

interface TypecheckResult extends CheckEntry { gameErrors: number }
interface GoldenResult    extends CheckEntry { passed?: number; failed?: number }

interface BuildManifest {
  generatedAt: string;
  profile:     Profile;
  app: {
    name:            string;
    version:         string;
    slug:            string;
    androidPackage:  string;
    iosBundleId:     string;
    versionCode:     number;
    buildNumber:     string;
  };
  git: {
    commit:      string;
    commitFull:  string;
    branch:      string;
    message:     string;
    isDirty:     boolean;
    dirtyFiles:  number;
  };
  runtime: {
    node:         string;
    expoSdk:      string;
    reactNative:  string;
    typescript:   string;
  };
  environment: Record<string, EnvEntry>;
  checks: {
    typecheck:    TypecheckResult;
    goldenTests:  GoldenResult;
  };
}

// ── Configuration ─────────────────────────────────────────────────────────────

const ROOT          = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "build-manifest.json");

// Variables publiques déclarées dans .env.example (ordre canonique)
const PUBLIC_VARS = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_ENABLE_DEV_SANDBOX",
] as const;

const SANDBOX_VAR = "EXPO_PUBLIC_ENABLE_DEV_SANDBOX";

// ── Helpers ───────────────────────────────────────────────────────────────────

function tryExec(cmd: string, args: string[]): string {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "pipe", shell: true });
  return r.stdout?.toString().trim() ?? "";
}

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

function progress(msg: string) { process.stdout.write(`  ⏳  ${msg}...\r`); }
function clearLine()           { process.stdout.write("                                                              \r"); }

function col(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

// ── Profil ────────────────────────────────────────────────────────────────────

const profileArg = process.argv.find((a, i) => a === "--profile" && process.argv[i + 1])
  ? process.argv[process.argv.indexOf("--profile") + 1]
  : undefined;

const VALID_PROFILES: Profile[] = ["development", "preview", "production"];
const profile: Profile = VALID_PROFILES.includes(profileArg as Profile)
  ? (profileArg as Profile)
  : "preview";

// ── 1. App ────────────────────────────────────────────────────────────────────

const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf-8"));
const expo    = appJson.expo ?? {};

const app: BuildManifest["app"] = {
  name:           expo.name           ?? "—",
  version:        expo.version        ?? "—",
  slug:           expo.slug           ?? "—",
  androidPackage: expo.android?.package         ?? "—",
  iosBundleId:    expo.ios?.bundleIdentifier     ?? "—",
  versionCode:    expo.android?.versionCode      ?? 0,
  buildNumber:    expo.ios?.buildNumber          ?? "—",
};

// ── 2. Git ────────────────────────────────────────────────────────────────────

const commitShort = tryExec("git", ["rev-parse", "--short", "HEAD"]) || "inconnu";
const commitFull  = tryExec("git", ["rev-parse", "HEAD"])             || "inconnu";
const branch      = tryExec("git", ["rev-parse", "--abbrev-ref", "HEAD"]) || "inconnu";
const message     = tryExec("git", ["log", "-1", "--format=%s"])      || "—";
const dirtyOutput = tryExec("git", ["status", "--porcelain"]);
const dirtyFiles  = dirtyOutput ? dirtyOutput.split("\n").filter(Boolean).length : 0;

const git: BuildManifest["git"] = {
  commit:     commitShort,
  commitFull,
  branch,
  message,
  isDirty:    dirtyFiles > 0,
  dirtyFiles,
};

// ── 3. Runtime ────────────────────────────────────────────────────────────────

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));

const runtime: BuildManifest["runtime"] = {
  node:        process.version,
  expoSdk:     pkg.devDependencies?.expo        ?? "—",
  reactNative: pkg.devDependencies?.["react-native"] ?? "—",
  typescript:  pkg.devDependencies?.typescript  ?? "—",
};

// ── 4. Environnement ──────────────────────────────────────────────────────────

const envMerged: Record<string, string> = {
  ...parseEnvFile(path.join(ROOT, ".env")),
  ...parseEnvFile(path.join(ROOT, ".env.local")),
  ...(process.env as Record<string, string>),
};

function isVarSet(key: string): boolean {
  const v = envMerged[key];
  return !!v && v !== "" && !v.startsWith("https://VOTRE_") && !v.endsWith("_xxxx");
}

const environment: BuildManifest["environment"] = {};
for (const key of PUBLIC_VARS) {
  if (key === SANDBOX_VAR) {
    const v = envMerged[SANDBOX_VAR];
    environment[key] = { status: (v === "true" || v === "1") ? "active" : "inactive" };
  } else {
    environment[key] = { status: isVarSet(key) ? "définie" : "absente" };
  }
}

// ── 5. TypeScript ─────────────────────────────────────────────────────────────

progress("TypeScript typecheck");

const tcResult = spawnSync("npx", ["tsc", "--noEmit"], { cwd: ROOT, stdio: "pipe", shell: true });
const tcRaw    = (tcResult.stdout?.toString() ?? "") + (tcResult.stderr?.toString() ?? "");
const gameErrors = tcRaw
  .split("\n")
  .filter((l) => l.includes("error TS") && !l.includes("supabase/functions/") && !l.includes("node_modules"))
  .filter(Boolean);

clearLine();

const typecheck: TypecheckResult = gameErrors.length === 0
  ? { status: "ok",    gameErrors: 0 }
  : { status: "error", gameErrors: gameErrors.length, detail: gameErrors[0]?.trim().slice(0, 160) };

// ── 6. Golden tests ───────────────────────────────────────────────────────────

let goldenTests: GoldenResult = { status: "skipped" };

if (pkg.scripts?.["test:golden"]) {
  progress("Tests golden");

  const gr   = spawnSync("npm", ["run", "test:golden"], { cwd: ROOT, stdio: "pipe", shell: true });
  const gOut = (gr.stdout?.toString() ?? "") + (gr.stderr?.toString() ?? "");

  clearLine();

  const passMatch = gOut.match(/# pass (\d+)/);
  const failMatch = gOut.match(/# fail (\d+)/);
  const passed = passMatch ? parseInt(passMatch[1]!) : undefined;
  const failed = failMatch ? parseInt(failMatch[1]!) : undefined;

  if (gr.status === 0) {
    goldenTests = { status: "ok", passed, failed: failed ?? 0 };
  } else {
    const errLine = gOut.split("\n").find((l) => l.includes("not ok"))?.trim();
    goldenTests = { status: "error", passed, failed, detail: errLine?.slice(0, 120) };
  }
}

// ── Assembler le manifest ─────────────────────────────────────────────────────

const manifest: BuildManifest = {
  generatedAt: new Date().toISOString(),
  profile,
  app,
  git,
  runtime,
  environment,
  checks: { typecheck, goldenTests },
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

// ── Rapport console ───────────────────────────────────────────────────────────

const PROFILE_COLOR: Record<Profile, string> = {
  development: "DEV",
  preview:     "PREVIEW",
  production:  "PROD",
};

const ENV_ICON: Record<EnvStatus, string> = {
  "définie":  "✅",
  "absente":  "⚠️ ",
  "active":   "⚠️ ",
  "inactive": "✅",
};

const CHECK_ICON: Record<CheckStatus, string> = {
  ok:      "✅",
  error:   "❌",
  skipped: "—  ",
};

console.log("");
console.log("┌──────────────────────────────────────────────────────┐");
console.log(`│   BUILD MANIFEST — ${col(manifest.app.name, 20)}  [${PROFILE_COLOR[profile]}]  │`);
console.log("└──────────────────────────────────────────────────────┘");

console.log(`\n  ${"APP".padEnd(18)}  ${manifest.app.name} v${manifest.app.version}`);
console.log(`  ${"Slug".padEnd(18)}  ${manifest.app.slug}`);
console.log(`  ${"Android pkg".padEnd(18)}  ${manifest.app.androidPackage}`);
console.log(`  ${"iOS bundle".padEnd(18)}  ${manifest.app.iosBundleId}`);

console.log(`\n  ${"GIT".padEnd(18)}  ${manifest.git.branch}@${manifest.git.commit}${manifest.git.isDirty ? ` ⚠️  (${manifest.git.dirtyFiles} fichier(s) non commité(s))` : " ✅"}`);
console.log(`  ${"Message".padEnd(18)}  ${manifest.git.message.slice(0, 70)}`);

console.log(`\n  ${"Node".padEnd(18)}  ${manifest.runtime.node}`);
console.log(`  ${"Expo SDK".padEnd(18)}  ${manifest.runtime.expoSdk}`);
console.log(`  ${"React Native".padEnd(18)}  ${manifest.runtime.reactNative}`);
console.log(`  ${"TypeScript".padEnd(18)}  ${manifest.runtime.typescript}`);

console.log("\n  VARIABLES D'ENVIRONNEMENT");
for (const [key, entry] of Object.entries(manifest.environment)) {
  const icon  = ENV_ICON[entry.status];
  const label = key.replace("EXPO_PUBLIC_", "").replace(/_/g, " ").toLowerCase();
  console.log(`  ${icon}  ${col(label, 30)}  ${entry.status}`);
}

console.log("\n  VÉRIFICATIONS");
{
  const tc = manifest.checks.typecheck;
  const icon = CHECK_ICON[tc.status];
  const detail = tc.status === "ok"
    ? `0 erreur jeu`
    : `${tc.gameErrors} erreur(s) — ${tc.detail ?? ""}`;
  console.log(`  ${icon}  ${"TypeScript".padEnd(28)}  ${detail}`);
}
{
  const gt   = manifest.checks.goldenTests;
  const icon = CHECK_ICON[gt.status];
  const detail =
    gt.status === "skipped" ? "script absent"
    : gt.status === "ok"    ? `${gt.passed} passés · ${gt.failed ?? 0} échoués`
    :                          `${gt.passed ?? "?"} passés · ${gt.failed ?? "?"} échoués — ${gt.detail ?? ""}`;
  console.log(`  ${icon}  ${"Tests golden".padEnd(28)}  ${detail}`);
}

const sandboxActive = manifest.environment[SANDBOX_VAR]?.status === "active";
if (profile === "production" && sandboxActive) {
  console.log("\n  ❌  ALERTE PRODUCTION : sandbox développeur actif — ne pas builder.");
} else if (sandboxActive) {
  console.log("\n  ⚠️   Sandbox actif — normal en development/preview.");
}

if (manifest.git.isDirty) {
  console.log(`  ⚠️   Dépôt git non propre (${manifest.git.dirtyFiles} fichier(s)) — commiter avant le build.`);
}

console.log(`\n  Manifest écrit → build-manifest.json`);
console.log(`  Généré le ${manifest.generatedAt}`);
console.log("");
