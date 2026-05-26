/**
 * clean-project.ts — Nettoyage safe du projet.
 *
 * npm run clean        → supprime caches, rapports et logs (safe, sans confirmation)
 * npm run clean:hard   → idem + propose node_modules et lock file résiduel (avec confirmation)
 *
 * Répertoires JAMAIS touchés : app/ data/ logic/ context/ assets/
 */

import fs       from "fs";
import path     from "path";
import readline from "readline";
import { spawnSync } from "child_process";

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT      = process.cwd();
const IS_HARD   = process.argv.includes("--hard");

const PROTECTED = new Set(["app", "data", "logic", "context", "assets"]);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Target {
  rel:     string;        // chemin relatif depuis ROOT
  label:   string;        // description courte
  glob?:   true;          // si vrai : chercher via readdirSync par pattern
  pattern?: RegExp;       // pattern de matching nom de fichier
}

// ── Calcul taille ─────────────────────────────────────────────────────────────

function sizeOf(fullPath: string): number {
  if (!fs.existsSync(fullPath)) return 0;
  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  const walk = (d: string) => {
    try {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else total += fs.statSync(full).size;
      }
    } catch { /* accès refusé — ignorer */ }
  };
  walk(fullPath);
  return total;
}

function fmtBytes(n: number): string {
  if (n === 0)          return "—";
  if (n < 1024)         return `${n} o`;
  if (n < 1_048_576)    return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1_073_741_824) return `${(n / 1_048_576).toFixed(1)} Mo`;
  return `${(n / 1_073_741_824).toFixed(2)} Go`;
}

// ── Suppression ───────────────────────────────────────────────────────────────

function remove(fullPath: string): void {
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(fullPath);
  }
}

// ── Détection gestionnaire de paquets ─────────────────────────────────────────

function detectPM(): "pnpm" | "yarn" | "npm" {
  if (fs.existsSync(path.join(ROOT, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(ROOT, "yarn.lock")))      return "yarn";
  return "npm";
}

// ── Confirmation interactive ──────────────────────────────────────────────────

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === "OUI");
    });
  });
}

// ── Résoudre les cibles glob ──────────────────────────────────────────────────

function resolveTargets(targets: Target[]): { fullPath: string; label: string }[] {
  const resolved: { fullPath: string; label: string }[] = [];

  for (const t of targets) {
    if (t.glob && t.pattern) {
      // Chercher les fichiers correspondant au pattern dans ROOT
      try {
        for (const name of fs.readdirSync(ROOT)) {
          if (t.pattern.test(name)) {
            const full = path.join(ROOT, name);
            // Sécurité absolue : jamais les dossiers protégés
            if (PROTECTED.has(name)) continue;
            resolved.push({ fullPath: full, label: `${t.label} (${name})` });
          }
        }
      } catch { /* ignorer */ }
    } else {
      const full = path.join(ROOT, t.rel);
      // Vérification de sécurité : jamais toucher aux dossiers protégés
      const topLevel = t.rel.split(/[/\\]/)[0] ?? "";
      if (PROTECTED.has(topLevel)) {
        console.error(`  ⛔  Protection : ${t.rel} est dans un répertoire protégé — ignoré.`);
        continue;
      }
      resolved.push({ fullPath: full, label: t.label });
    }
  }

  return resolved;
}

// ═════════════════════════════════════════════════════════════════════════════
// CIBLES SAFE (clean)
// ═════════════════════════════════════════════════════════════════════════════

const SAFE_TARGETS: Target[] = [
  { rel: ".expo",               label: "Cache Metro/Expo" },
  { rel: "dist",                label: "Build web (dist/)" },
  { rel: "web-build",           label: "Build Expo web" },
  { rel: "static-build",        label: "Build statique" },
  { rel: "play-store",          label: "Assets Play Store générés" },
  { rel: "build-manifest.json", label: "Rapport build manifest" },
  { rel: "preflight-report.json", label: "Rapport preflight" },
  // Logs Expo
  { glob: true, rel: "",  label: "Log Expo",        pattern: /^expo-.*\.log$/ },
  // Logs npm/yarn/debug
  { glob: true, rel: "",  label: "Log debug",        pattern: /^(npm-debug|yarn-debug|yarn-error)\..*/ },
  // TypeScript incremental cache
  { glob: true, rel: "",  label: "Cache TypeScript", pattern: /\.tsbuildinfo$/ },
  // Metro health checks
  { glob: true, rel: "",  label: "Metro health",     pattern: /^\.metro-health-check/ },
];

// ═════════════════════════════════════════════════════════════════════════════
// CIBLES HARD (clean:hard, avec confirmation)
// ═════════════════════════════════════════════════════════════════════════════

const pm = detectPM();
const residualLock =
  pm === "pnpm" && fs.existsSync(path.join(ROOT, "package-lock.json")) ? "package-lock.json" :
  pm === "yarn" && fs.existsSync(path.join(ROOT, "package-lock.json")) ? "package-lock.json" :
  pm === "npm"  && fs.existsSync(path.join(ROOT, "pnpm-lock.yaml"))    ? "pnpm-lock.yaml"    :
  null;

const HARD_TARGETS: Target[] = [
  { rel: "node_modules", label: `Dépendances installées (réinstaller : ${pm} install)` },
  ...(residualLock ? [{ rel: residualLock, label: `Lock file résiduel ${pm !== "npm" ? "npm" : "pnpm"} (non actif)` }] : []),
];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN (async IIFE — top-level await non supporté en CJS)
// ═════════════════════════════════════════════════════════════════════════════

void (async () => {

const modeLabel = IS_HARD ? "HARD" : "SAFE";

console.log("");
console.log("┌──────────────────────────────────────────────────────┐");
console.log(`│   CLEAN PROJECT — ÉTAT DE CRISE              [${modeLabel.padEnd(5)}] │`);
console.log("└──────────────────────────────────────────────────────┘");
console.log("");
console.log(`  Gestionnaire de paquets détecté : ${pm}`);
console.log(`  Répertoires protégés : ${[...PROTECTED].map(d => d + "/").join("  ")}`);
console.log("");

// ── Résoudre et afficher les cibles safe ──────────────────────────────────────

const safeResolved = resolveTargets(SAFE_TARGETS);
const safeExisting = safeResolved.filter(({ fullPath }) => fs.existsSync(fullPath));

console.log(`  NETTOYAGE SAFE (${safeExisting.length} cible(s) à supprimer)`);
console.log("");

if (safeExisting.length === 0) {
  console.log("  — Rien à nettoyer (tout est déjà propre).");
} else {
  for (const { fullPath, label } of safeExisting) {
    const size = sizeOf(fullPath);
    console.log(`    🗑️   ${label.padEnd(36)} ${fmtBytes(size)}`);
  }
}

// ── Hard — aperçu et confirmation ────────────────────────────────────────────

let hardConfirmed = false;
let hardResolved: { fullPath: string; label: string }[] = [];

if (IS_HARD) {
  hardResolved = resolveTargets(HARD_TARGETS).filter(({ fullPath }) => fs.existsSync(fullPath));

  if (hardResolved.length === 0) {
    console.log("\n  NETTOYAGE APPROFONDI — rien de supplémentaire à supprimer.");
  } else {
    const totalHardBytes = hardResolved.reduce((acc, { fullPath }) => acc + sizeOf(fullPath), 0);

    console.log(`\n  NETTOYAGE APPROFONDI — ${hardResolved.length} cible(s) supplémentaire(s)`);
    console.log("");
    for (const { fullPath, label } of hardResolved) {
      const size = sizeOf(fullPath);
      console.log(`    ⚠️   ${label.padEnd(60)} ${fmtBytes(size)}`);
    }
    console.log(`\n  Total approfondi : ${fmtBytes(totalHardBytes)}`);

    if (hardResolved.some(({ fullPath }) => fullPath.endsWith("node_modules"))) {
      console.log("\n  ⚠️   node_modules sera supprimé — relancer `" + pm + " install` après le clean.");
    }

    console.log("");
    hardConfirmed = await confirm("  Confirmer le nettoyage approfondi ? Taper OUI pour valider : ");

    if (!hardConfirmed) {
      console.log("\n  Annulé — nettoyage approfondi ignoré.");
    }
  }
}

// ── Exécution ─────────────────────────────────────────────────────────────────

console.log("\n  Nettoyage en cours...\n");

let totalFreed = 0;
let totalItems = 0;

// Safe
for (const { fullPath, label } of safeExisting) {
  const size = sizeOf(fullPath);
  try {
    remove(fullPath);
    totalFreed += size;
    totalItems++;
    console.log(`  ✅  ${label.padEnd(40)} ${fmtBytes(size)} libérés`);
  } catch (e) {
    console.log(`  ❌  ${label.padEnd(40)} Erreur : ${String(e).slice(0, 60)}`);
  }
}

// Hard (si confirmé)
if (IS_HARD && hardConfirmed) {
  for (const { fullPath, label } of hardResolved) {
    const size = sizeOf(fullPath);
    try {
      remove(fullPath);
      totalFreed += size;
      totalItems++;
      console.log(`  ✅  ${label.padEnd(40)} ${fmtBytes(size)} libérés`);
    } catch (e) {
      console.log(`  ❌  ${label.padEnd(40)} Erreur : ${String(e).slice(0, 60)}`);
    }
  }
}

// ── Bilan ─────────────────────────────────────────────────────────────────────

console.log("");
console.log(`  Résultat : ${totalItems} élément(s) supprimé(s) · ${fmtBytes(totalFreed)} libérés`);

if (safeExisting.length === 0 && !IS_HARD) {
  console.log("  ✅  Le projet était déjà propre.");
} else if (totalItems > 0) {
  console.log("  ✅  Nettoyage terminé.");
}

if (IS_HARD && hardConfirmed && hardResolved.some(({ fullPath }) => fullPath.endsWith("node_modules"))) {
  console.log(`\n  Prochaine étape : ${pm} install`);
}

console.log("");

})();
