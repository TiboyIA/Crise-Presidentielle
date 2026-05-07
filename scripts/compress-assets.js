/**
 * Compresse les images PNG du dossier assets/ en place.
 * Réduit drastiquement la taille du bundle Android.
 *
 * Usage :
 *   node scripts/compress-assets.js           — compresse en place
 *   node scripts/compress-assets.js --dry-run — affiche les économies sans modifier
 */

const { Jimp } = require("jimp");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets/images");
const DRY_RUN = process.argv.includes("--dry-run");

// Largeur maximale par type d'image
const MAX_LARGE = 1024; // headers d'écran, illustrations hero
const MAX_DEFAULT = 256; // icônes UI, badges, jauges

// Ces patterns conservent leur taille maximale
const LARGE_PATTERNS = [
  /dashboard_hero/,
  /screens[\\/]/,
  /regions[\\/]/,
  /election[\\/]/,
  /hybrid[\\/]/,
  /splash/,
  /icon\.png$/,
  /dashboard[\\/]section/,
  /dashboard[\\/]dashboard/,
];

function isLarge(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return LARGE_PATTERNS.some((p) => p.test(normalized));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function processFile(filePath) {
  const originalSize = fs.statSync(filePath).size;
  const maxW = isLarge(filePath) ? MAX_LARGE : MAX_DEFAULT;

  const img = await Jimp.read(filePath);
  const w = img.width;

  if (w > maxW) {
    img.resize({ w: maxW });
  }

  const newSize = DRY_RUN
    ? Math.round(originalSize * (w > maxW ? 0.2 : 0.6))
    : await (async () => {
        await img.write(filePath);
        return fs.statSync(filePath).size;
      })();

  return { filePath, originalSize, newSize };
}

const kb = (n) => `${Math.round(n / 1024)}KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;

async function main() {
  const files = walk(ASSETS);
  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Traitement de ${files.length} images…\n`,
  );

  let totalOriginal = 0;
  let totalNew = 0;
  let processed = 0;

  for (const f of files) {
    try {
      const result = await processFile(f);
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      processed++;

      const saving = Math.round(
        (1 - result.newSize / result.originalSize) * 100,
      );
      const rel = path.relative(ASSETS, result.filePath);
      if (saving > 10) {
        console.log(
          `  ${rel}: ${kb(result.originalSize)} → ${kb(result.newSize)} (-${saving}%)`,
        );
      }
    } catch (e) {
      console.warn(`  ⚠ Ignoré : ${path.basename(f)} (${e.message})`);
    }
  }

  const totalSaving = Math.round((1 - totalNew / totalOriginal) * 100);
  console.log(`\n✅ ${processed} images traitées`);
  console.log(
    `   Avant : ${mb(totalOriginal)}  →  Après : ${mb(totalNew)}  (-${totalSaving}%)`,
  );
  if (DRY_RUN) {
    console.log("\n   Lance sans --dry-run pour appliquer les modifications.");
    console.log("   ⚠ Les fichiers originaux seront remplacés. Fais un git commit d'abord.");
  }
}

main().catch((e) => {
  console.error("Erreur :", e.message);
  process.exit(1);
});
