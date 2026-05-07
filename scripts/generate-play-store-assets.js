/**
 * Génère les assets Play Console à partir des images existantes.
 * Sortie dans play-store/ (ignoré par git).
 *
 * Usage : node scripts/generate-play-store-assets.js
 */

const { Jimp } = require("jimp");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "play-store");

fs.mkdirSync(OUT, { recursive: true });

async function main() {
  console.log("Génération des assets Play Store…\n");

  // 1. Icône haute résolution 512×512
  console.log("→ icon-512.png");
  const icon = await Jimp.read(path.join(ROOT, "assets/images/icon.png"));
  await icon.resize({ w: 512, h: 512 }).write(path.join(OUT, "icon-512.png"));
  console.log("   ✓ play-store/icon-512.png (512×512)\n");

  // 2. Feature graphic 1024×500 (ratio 2.048)
  // Source : dashboard_hero.png (1408×768) — crop centré puis resize
  console.log("→ feature-graphic-1024x500.png");
  const hero = await Jimp.read(
    path.join(ROOT, "assets/images/dashboard/dashboard_hero.png"),
  );
  const srcW = hero.width;
  const srcH = hero.height;
  const targetRatio = 1024 / 500;
  let cropW = srcW;
  let cropH = Math.round(srcW / targetRatio);
  if (cropH > srcH) {
    cropH = srcH;
    cropW = Math.round(srcH * targetRatio);
  }
  const cropX = Math.round((srcW - cropW) / 2);
  const cropY = Math.round((srcH - cropH) / 2);
  await hero
    .crop({ x: cropX, y: cropY, w: cropW, h: cropH })
    .resize({ w: 1024, h: 500 })
    .write(path.join(OUT, "feature-graphic-1024x500.png"));
  console.log("   ✓ play-store/feature-graphic-1024x500.png (1024×500)\n");

  // 3. Screenshots Play Console (paysage 1408×768)
  const screenshotSources = [
    ["dashboard/dashboard_hero.png",  "screenshot-1-dashboard.png"],
    ["screens/front_header.png",      "screenshot-2-front.png"],
    ["screens/game_over_victory.png", "screenshot-3-victoire.png"],
    ["screens/journal_header.png",    "screenshot-4-journal.png"],
    ["screens/regions_header.png",    "screenshot-5-regions.png"],
  ];

  console.log("→ Screenshots (1408×768)");
  for (const [src, dest] of screenshotSources) {
    const srcPath = path.join(ROOT, "assets/images", src);
    if (!fs.existsSync(srcPath)) {
      console.log(`   ⚠ introuvable : ${src}`);
      continue;
    }
    const img = await Jimp.read(srcPath);
    await img.write(path.join(OUT, dest));
    console.log(`   ✓ play-store/${dest}`);
  }

  console.log("\n✅ Assets générés dans play-store/");
  console.log("\nÀ uploader dans Google Play Console :");
  console.log("  • Icône (512×512)            → icon-512.png");
  console.log("  • Bannière (feature graphic) → feature-graphic-1024x500.png");
  console.log("  • Captures d'écran           → screenshot-*.png");
}

main().catch((e) => {
  console.error("Erreur :", e.message);
  process.exit(1);
});
