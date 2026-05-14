import { readFileSync, writeFileSync } from "fs";

const svgPath = process.argv[2];
const outPath = process.argv[3];

const svg = readFileSync(svgPath, "utf8");

// Extract first absolute M (moveto) coordinate — reliable centroid for the main polygon
function firstMCoord(d) {
  const m = d.match(/^M(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  return null;
}

const result = {};

// SVG World Map structure: <g id="FR"><path ... d="M..."/><path ... d="M..."/></g>
const groupRe = /<g\s[^>]*\bid="([A-Z]{2})"[^>]*>([\s\S]*?)<\/g>/g;
const pathDRe = /\bd="([^"]+)"/g;

for (const gm of svg.matchAll(groupRe)) {
  const code = gm[1];
  const inner = gm[2];
  const dParts = [];
  let cx = null, cy = null;
  for (const pm of inner.matchAll(pathDRe)) {
    dParts.push(pm[1]);
    // Use first M of longest path as centroid
    if (!cx) {
      const pt = firstMCoord(pm[1]);
      if (pt) { cx = pt[0]; cy = pt[1]; }
    }
  }
  if (dParts.length > 0 && cx !== null) {
    result[code] = { d: dParts.join(" "), cx, cy };
  }
}

const keys = Object.keys(result);
console.log(`Extracted ${keys.length} countries`);
console.log("Sample:", keys.slice(0, 20).join(", "));

// Print centroids for the 20 game countries
const GAME = ["FR","US","CN","RU","DE","GB","IN","JP","BR","TR","IR","IL","KR","IT","SA","AU","CA","KP","NG","PK"];
console.log("\nGame country centroids:");
for (const code of GAME) {
  const e = result[code];
  console.log(`  ${code}: ${e ? `cx=${e.cx}, cy=${e.cy}` : "NOT FOUND"}`);
}

const out = JSON.stringify(result);
console.log(`\nJSON size: ${(out.length / 1024).toFixed(0)} KB`);
writeFileSync(outPath, out);
console.log("Written to", outPath);
