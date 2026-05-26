/**
 * System Doctor — État de Crise
 * Vérifie l'état du projet avant lancement ou build.
 * Usage : npm run doctor
 */

import fs   from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "ok" | "warn" | "error";

interface Check {
  label:   string;
  status:  Status;
  detail?: string;
}

const checks: Check[] = [];

function ok   (label: string, detail?: string) { checks.push({ label, status: "ok",    detail }); }
function warn  (label: string, detail?: string) { checks.push({ label, status: "warn",  detail }); }
function fail  (label: string, detail?: string) { checks.push({ label, status: "error", detail }); }

const ICON: Record<Status, string> = { ok: "✅", warn: "⚠️ ", error: "❌" };

function printCheck(c: Check) {
  const icon   = ICON[c.status];
  const detail = c.detail ? `  →  ${c.detail}` : "";
  console.log(`  ${icon}  ${c.label}${detail}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tryExec(cmd: string): string | null {
  try { return execSync(cmd, { stdio: "pipe" }).toString().trim(); }
  catch { return null; }
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

function fmtBytes(n: number): string {
  if (n < 1024)        return `${n} o`;
  if (n < 1_048_576)   return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1_048_576).toFixed(1)} Mo`;
}

// ── Environnement fusionné (sans exposer les valeurs) ────────────────────────

const envMerged: Record<string, string> = {
  ...parseEnvFile(path.join(ROOT, ".env")),
  ...parseEnvFile(path.join(ROOT, ".env.local")),
  ...(process.env as Record<string, string>),
};

function isEnvSet(key: string): boolean {
  const v = envMerged[key];
  return !!v && v !== "" && !v.startsWith("https://VOTRE_") && !v.endsWith("_xxxx");
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECKS
// ═════════════════════════════════════════════════════════════════════════════

// ── 1. Node.js ────────────────────────────────────────────────────────────────
{
  const version = process.version;
  const major   = parseInt(version.slice(1));
  if (major >= 20)      ok("Node.js",   `${version}`);
  else if (major >= 18) warn("Node.js", `${version} — v20 LTS recommandée`);
  else                  fail("Node.js", `${version} — version trop ancienne (min v18)`);
}

// ── 2. Gestionnaire de paquets ────────────────────────────────────────────────
{
  const pnpm = tryExec("pnpm --version");
  const yarn = tryExec("yarn --version");
  const npm  = tryExec("npm --version");
  if      (pnpm) ok("Gestionnaire de paquets", `pnpm ${pnpm}`);
  else if (yarn) ok("Gestionnaire de paquets", `yarn ${yarn}`);
  else if (npm)  ok("Gestionnaire de paquets", `npm ${npm}`);
  else           fail("Gestionnaire de paquets", "npm / pnpm / yarn introuvable");
}

// ── 3-6. Fichiers racine requis ───────────────────────────────────────────────
for (const file of ["package.json", "app.json", "eas.json", "tsconfig.json"]) {
  if (fs.existsSync(path.join(ROOT, file))) ok(file);
  else fail(file, "Fichier manquant");
}

// ── 7. Fichier .env.local ─────────────────────────────────────────────────────
{
  const hasLocal = fs.existsSync(path.join(ROOT, ".env.local"));
  const hasBase  = fs.existsSync(path.join(ROOT, ".env"));
  if      (hasLocal) ok(".env.local", "Présent");
  else if (hasBase)  warn(".env.local", "Absent — .env détecté (vérifier le chargement Expo)");
  else               warn(".env.local", "Absent — variables d'environnement non chargées");
}

// ── 8. Variables Supabase (bloquantes) ────────────────────────────────────────
for (const key of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"] as const) {
  if (isEnvSet(key)) ok(key, "Définie");
  else               fail(key, "Non définie — connexion Supabase impossible");
}

// ── 9. Sandbox dev ────────────────────────────────────────────────────────────
{
  const v = envMerged["EXPO_PUBLIC_ENABLE_DEV_SANDBOX"];
  if (v === "true" || v === "1") warn("EXPO_PUBLIC_ENABLE_DEV_SANDBOX", "ACTIVE — ne pas déployer en production");
  else                           ok("EXPO_PUBLIC_ENABLE_DEV_SANDBOX",   "Inactive (mode production)");
}

// ── 10-12. Dossiers requis ────────────────────────────────────────────────────
for (const [dir, label] of [["assets", "Dossier assets/"], ["app", "Dossier app/"], ["context", "Dossier context/"]] as const) {
  if (fs.existsSync(path.join(ROOT, dir))) ok(label);
  else fail(label, "Dossier manquant");
}

// ── 13. Script typecheck ──────────────────────────────────────────────────────
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
  if (pkg.scripts?.typecheck) ok("npm run typecheck", `Défini : "${pkg.scripts.typecheck}"`);
  else                         warn("npm run typecheck", "Script absent dans package.json");
}

// ── 14. Taille des assets ─────────────────────────────────────────────────────
{
  const bytes = dirSizeBytes(path.join(ROOT, "assets"));
  const mb    = bytes / 1_048_576;
  if      (mb > 100) fail("Taille assets/",  `${fmtBytes(bytes)} — critique (> 100 Mo)`);
  else if (mb > 50)  warn("Taille assets/",  `${fmtBytes(bytes)} — élevée, vérifier la compression`);
  else               ok("Taille assets/",    fmtBytes(bytes));
}

// ── 15. Erreurs fréquentes ────────────────────────────────────────────────────

// node_modules
if (!fs.existsSync(path.join(ROOT, "node_modules")))
  fail("node_modules", "Absent — lancer : npm install");
else
  ok("node_modules", "Présent");

// expo-router installé
if (!fs.existsSync(path.join(ROOT, "node_modules", "expo-router")))
  fail("expo-router",  "Non installé (npm install)");
else
  ok("expo-router", "Installé");

// tsx disponible (nécessaire pour ce script et les tests)
if (!fs.existsSync(path.join(ROOT, "node_modules", ".bin", "tsx")) &&
    !fs.existsSync(path.join(ROOT, "node_modules", ".bin", "tsx.cmd")))
  warn("tsx", "Non trouvé dans node_modules/.bin");
else
  ok("tsx", "Disponible");

// Cache Expo potentiellement périmé
if (fs.existsSync(path.join(ROOT, ".expo", "packager-info.json")))
  warn("Cache .expo/", "packager-info.json présent — supprimer .expo/ si bugs au démarrage");

// .gitignore protège .env
{
  const gip = path.join(ROOT, ".gitignore");
  if (fs.existsSync(gip)) {
    const gi = fs.readFileSync(gip, "utf-8");
    if (!gi.split("\n").some((l) => l.trim() === ".env" || l.trim() === ".env*"))
      fail(".gitignore", ".env non ignoré — risque d'exposition de secrets");
    else
      ok(".gitignore", ".env protégé");
  } else {
    warn(".gitignore", "Absent");
  }
}

// RevenueCat (avertissement non bloquant)
if (!isEnvSet("EXPO_PUBLIC_REVENUECAT_IOS_KEY") || !isEnvSet("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"))
  warn("RevenueCat keys", "Une ou deux clés absentes — achats in-app désactivés");
else
  ok("RevenueCat keys", "iOS + Android définies");

// ═════════════════════════════════════════════════════════════════════════════
// RAPPORT
// ═════════════════════════════════════════════════════════════════════════════

const errors   = checks.filter((c) => c.status === "error");
const warnings = checks.filter((c) => c.status === "warn");
const oks      = checks.filter((c) => c.status === "ok");

console.log("");
console.log("┌─────────────────────────────────────────────────┐");
console.log("│   SYSTEM DOCTOR — ÉTAT DE CRISE                 │");
console.log("└─────────────────────────────────────────────────┘");
console.log("");

for (const c of checks) printCheck(c);

console.log("");
console.log(`  Résultat : ${oks.length} OK · ${warnings.length} avertissements · ${errors.length} bloquants`);
console.log("");

if (errors.length > 0) {
  console.log("  ❌  Problèmes bloquants détectés — corriger avant de lancer ou builder.");
} else if (warnings.length > 0) {
  console.log("  ⚠️   Projet fonctionnel — avertissements à examiner.");
} else {
  console.log("  ✅  Projet en bonne santé — prêt au lancement.");
}

console.log("");

process.exit(errors.length > 0 ? 1 : 0);
