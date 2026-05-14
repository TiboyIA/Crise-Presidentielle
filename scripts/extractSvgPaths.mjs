import { readFileSync, writeFileSync } from "fs";

const svgPath = process.argv[2];
const outPath = process.argv[3];

const svg = readFileSync(svgPath, "utf8");

// Compute bounding-box centroid from a path's d attribute.
// Extracts all absolute coordinate pairs (comma or space separated),
// then returns the centre of the bounding box.
function bboxCentroid(d) {
  // Match every numeric pair in the path data.
  // SVG coords are either "x,y" or "x y" patterns.
  // We grab all numbers and treat consecutive pairs as x,y.
  const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => parseFloat(m[0]));
  if (nums.length < 2) return null;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // Pairs: [x0,y0, x1,y1, ...] — iterate by 2
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

const result = {};

// SVG World Map structure: <g id="FR"><path ... d="M..."/></g>
const groupRe = /<g\s[^>]*\bid="([A-Z]{2})"[^>]*>([\s\S]*?)<\/g>/g;
const pathDRe = /\bd="([^"]+)"/g;

for (const gm of svg.matchAll(groupRe)) {
  const code = gm[1];
  const inner = gm[2];
  const dParts = [];

  // Collect all coordinate values across every path in the group
  let allNums = [];

  for (const pm of inner.matchAll(pathDRe)) {
    dParts.push(pm[1]);
    const nums = [...pm[1].matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => parseFloat(m[0]));
    allNums = allNums.concat(nums);
  }

  if (dParts.length === 0 || allNums.length < 2) continue;

  // Bounding box across ALL sub-paths of the group
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < allNums.length; i += 2) {
    const x = allNums[i], y = allNums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const cx = parseFloat(((minX + maxX) / 2).toFixed(3));
  const cy = parseFloat(((minY + maxY) / 2).toFixed(3));
  result[code] = { d: dParts.join(" "), cx, cy };
}

const keys = Object.keys(result);
console.log(`Extracted ${keys.length} countries`);

// Print centroids for the 20 game countries
const GAME = ["FR","US","CN","RU","DE","GB","IN","JP","BR","TR","IR","IL","KR","IT","SA","AU","CA","KP","NG","PK"];
console.log("\nGame country centroids (bounding box):");
for (const code of GAME) {
  const e = result[code];
  console.log(`  ${code}: ${e ? `cx=${e.cx}, cy=${e.cy}` : "NOT FOUND"}`);
}

const out = JSON.stringify(result);
console.log(`\nJSON size: ${(out.length / 1024).toFixed(0)} KB`);
writeFileSync(outPath, out);
console.log("Written to", outPath);
