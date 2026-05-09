// World map V2 — enriched country shapes in % coords (0-100 of map viewport).
// Each country has an SVG <Path> string (preferred) and a <Polygon> fallback.
// Paths use cubic/quadratic Bézier curves on coastal borders for a more
// credible look without the weight of a full GeoJSON.
//
// Coordinates are still in % so that scaling to mapW × mapH works exactly
// like the legacy mapWorld.ts polygons.

import type { CountryId } from "@/types/strategy";

export interface MapCountryShape {
  id: CountryId;
  countryId: CountryId;
  /** SVG path string in % coords. Preferred over polygons when present. */
  path?: string;
  /** SVG polygon fallback in % coords. Used if path is not provided. */
  polygons?: string[];
  /** Label position in % coords. */
  labelX: number;
  labelY: number;
  /** Logical center for line endpoints (alliances, tensions, hotspots). */
  centerX: number;
  centerY: number;
  /** Bounding box for tap targets and visibility tests. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** 1 (regional) → 5 (global power). Used by hotspots & rendering priority. */
  strategicImportance: 1 | 2 | 3 | 4 | 5;
}

/** Continent landmasses (decorative, behind country shapes). */
export interface ContinentShape {
  id: string;
  path: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────
// All paths are written directly. Each path is in % coordinates and starts
// with M (move-to). Curves use C (cubic) or Q (quadratic) for smooth coasts.

// ─── CONTINENTS (richer than the 5 blobs from mapWorld.ts) ─────────────
export const CONTINENTS_V2: ContinentShape[] = [
  {
    id: "north_america",
    path: "M 2,18 Q 8,14 18,15 L 26,17 Q 30,22 30,30 L 28,42 Q 26,52 22,55 L 14,57 Q 6,55 3,48 L 2,38 Z",
  },
  {
    id: "central_america",
    path: "M 14,55 L 22,55 L 24,58 L 22,62 L 18,62 L 14,58 Z",
  },
  {
    id: "south_america",
    path: "M 18,58 Q 26,55 32,58 L 38,62 Q 40,68 38,76 L 32,84 Q 24,86 18,82 L 16,72 Q 16,64 18,58 Z",
  },
  {
    id: "europe",
    path: "M 36,15 Q 42,13 50,14 L 56,17 Q 58,24 56,30 L 52,36 Q 48,38 42,37 L 38,32 Q 36,24 36,15 Z",
  },
  {
    id: "africa",
    path: "M 40,38 Q 48,36 54,38 L 58,44 Q 60,55 56,66 L 50,76 Q 44,78 40,72 L 38,60 Q 38,48 40,38 Z",
  },
  {
    id: "russia_belt",
    path: "M 46,8 Q 60,6 78,8 L 92,10 Q 94,16 92,22 L 86,26 Q 70,27 56,25 L 48,22 Q 46,16 46,8 Z",
  },
  {
    id: "middle_east",
    path: "M 52,32 Q 58,30 66,32 L 70,38 Q 70,46 66,52 L 60,58 Q 54,58 52,52 L 50,42 Q 50,36 52,32 Z",
  },
  {
    id: "south_asia",
    path: "M 60,38 Q 68,36 74,40 L 78,46 Q 78,56 72,64 L 64,68 Q 58,66 58,58 L 58,46 Q 58,42 60,38 Z",
  },
  {
    id: "east_asia",
    path: "M 64,22 Q 76,20 86,22 L 92,26 Q 92,36 88,44 L 80,50 Q 70,50 64,42 L 62,32 Q 62,26 64,22 Z",
  },
  {
    id: "japan_archipelago",
    path: "M 80,24 Q 84,23 87,26 L 88,32 Q 87,38 83,40 L 80,38 Q 79,30 80,24 Z",
  },
  {
    id: "australia",
    path: "M 72,64 Q 80,62 88,64 L 90,72 Q 86,76 78,76 L 72,72 Z",
  },
];

// ─── COUNTRY SHAPES ────────────────────────────────────────────────────
// Enriched paths with 12-20 segments. Bézier curves used on coasts.
// Each pays existing in countries.ts has its own crafted shape.

export const MAP_COUNTRY_SHAPES: MapCountryShape[] = [
  // FRANCE — hexagon-ish with Brittany/Normandy bump and Mediterranean coast
  {
    id: "france",
    countryId: "france",
    path: "M 40,27 L 43,26 L 47,26 L 49,27 Q 51,29 51,32 L 51,35 Q 50,37 48,38 L 45,38 L 42,38 L 40,36 L 38,33 L 39,30 Z",
    labelX: 44, labelY: 32,
    centerX: 45, centerY: 32,
    bounds: { minX: 38, minY: 26, maxX: 51, maxY: 38 },
    strategicImportance: 5,
  },
  // USA — wide rectangle with Florida hook, Pacific coast curve
  {
    id: "usa",
    countryId: "usa",
    path: "M 4,30 L 8,28 L 14,27 L 22,27 L 26,28 Q 28,32 27,38 L 26,44 L 24,50 L 20,52 Q 14,52 8,50 L 4,46 L 3,40 Q 2,34 4,30 Z",
    labelX: 14, labelY: 38,
    centerX: 14, centerY: 38,
    bounds: { minX: 2, minY: 27, maxX: 28, maxY: 52 },
    strategicImportance: 5,
  },
  // CHINA — broad east Asia mass
  {
    id: "china",
    countryId: "china",
    path: "M 62,26 L 66,25 L 72,24 L 80,24 L 86,25 Q 88,30 87,36 L 86,42 Q 84,46 80,48 L 74,49 L 68,48 Q 64,46 62,42 L 60,36 Q 60,30 62,26 Z",
    labelX: 74, labelY: 36,
    centerX: 74, centerY: 36,
    bounds: { minX: 60, minY: 24, maxX: 88, maxY: 49 },
    strategicImportance: 5,
  },
  // RUSSIA — long horizontal belt
  {
    id: "russia",
    countryId: "russia",
    path: "M 46,10 L 52,9 L 60,9 L 70,9 L 80,10 L 88,11 L 92,13 Q 93,18 92,22 L 88,25 L 78,26 L 68,26 L 60,25 L 54,23 L 50,20 L 46,16 Q 45,13 46,10 Z",
    labelX: 70, labelY: 17,
    centerX: 70, centerY: 17,
    bounds: { minX: 46, minY: 9, maxX: 93, maxY: 26 },
    strategicImportance: 5,
  },
  // GERMANY — central Europe, compact
  {
    id: "germany",
    countryId: "germany",
    path: "M 47,23 L 50,22 L 53,22 L 55,24 L 55,28 L 53,31 L 51,32 L 49,32 L 47,30 L 46,26 Z",
    labelX: 50, labelY: 27,
    centerX: 50, centerY: 27,
    bounds: { minX: 46, minY: 22, maxX: 55, maxY: 32 },
    strategicImportance: 4,
  },
  // UK — island, slightly tilted
  {
    id: "uk",
    countryId: "uk",
    path: "M 39,18 L 42,17 L 44,18 Q 46,21 45,24 L 44,27 L 41,28 L 39,26 L 38,22 Z",
    labelX: 42, labelY: 22,
    centerX: 42, centerY: 22,
    bounds: { minX: 38, minY: 17, maxX: 46, maxY: 28 },
    strategicImportance: 4,
  },
  // INDIA — diamond/triangle south of Himalayas
  {
    id: "india",
    countryId: "india",
    path: "M 63,42 L 67,40 L 72,41 L 75,44 Q 76,50 73,56 L 70,62 L 66,64 L 63,60 L 62,52 Q 61,46 63,42 Z",
    labelX: 68, labelY: 52,
    centerX: 68, centerY: 52,
    bounds: { minX: 61, minY: 40, maxX: 76, maxY: 64 },
    strategicImportance: 4,
  },
  // JAPAN — archipelago, north-south
  {
    id: "japan",
    countryId: "japan",
    path: "M 81,24 L 84,23 L 86,25 L 87,29 Q 87,33 85,36 L 83,38 L 81,37 L 80,33 L 80,28 Z",
    labelX: 83, labelY: 30,
    centerX: 83, centerY: 30,
    bounds: { minX: 80, minY: 23, maxX: 87, maxY: 38 },
    strategicImportance: 4,
  },
  // BRAZIL — large bulge in S. America
  {
    id: "brazil",
    countryId: "brazil",
    path: "M 22,58 L 28,56 L 34,58 L 37,62 Q 39,68 37,74 L 34,80 L 28,82 L 22,80 L 18,74 L 18,66 Q 19,60 22,58 Z",
    labelX: 28, labelY: 68,
    centerX: 28, centerY: 68,
    bounds: { minX: 18, minY: 56, maxX: 39, maxY: 82 },
    strategicImportance: 3,
  },
  // TURKEY — bridge between Europe and Asia
  {
    id: "turkey",
    countryId: "turkey",
    path: "M 52,33 L 57,32 L 62,33 L 65,35 L 65,38 L 63,40 L 58,41 L 53,40 L 51,37 Z",
    labelX: 58, labelY: 37,
    centerX: 58, centerY: 37,
    bounds: { minX: 51, minY: 32, maxX: 65, maxY: 41 },
    strategicImportance: 3,
  },
  // IRAN — persian land
  {
    id: "iran",
    countryId: "iran",
    path: "M 58,38 L 62,37 L 67,38 L 70,41 Q 70,46 68,49 L 64,51 L 60,50 L 57,46 L 56,42 Z",
    labelX: 63, labelY: 43,
    centerX: 63, centerY: 43,
    bounds: { minX: 56, minY: 37, maxX: 70, maxY: 51 },
    strategicImportance: 3,
  },
  // ISRAEL — small coastal sliver
  {
    id: "israel",
    countryId: "israel",
    path: "M 55,41 L 57,40 L 58,43 L 57,46 L 55,46 L 54,43 Z",
    labelX: 56, labelY: 43,
    centerX: 56, centerY: 43,
    bounds: { minX: 54, minY: 40, maxX: 58, maxY: 46 },
    strategicImportance: 3,
  },
  // SOUTH KOREA — peninsula
  {
    id: "south_korea",
    countryId: "south_korea",
    path: "M 77,32 L 80,31 L 82,33 L 81,36 L 78,37 L 76,35 Z",
    labelX: 79, labelY: 34,
    centerX: 79, centerY: 34,
    bounds: { minX: 76, minY: 31, maxX: 82, maxY: 37 },
    strategicImportance: 3,
  },
  // ITALY — boot shape
  {
    id: "italy",
    countryId: "italy",
    path: "M 49,32 L 52,31 L 54,33 L 55,37 Q 55,42 53,46 L 50,46 L 49,42 L 48,38 L 48,34 Z",
    labelX: 51, labelY: 38,
    centerX: 51, centerY: 38,
    bounds: { minX: 48, minY: 31, maxX: 55, maxY: 46 },
    strategicImportance: 3,
  },
  // SAUDI ARABIA — broad arabian peninsula
  {
    id: "saudi_arabia",
    countryId: "saudi_arabia",
    path: "M 54,46 L 60,44 L 65,46 L 67,52 Q 67,58 64,62 L 60,64 L 56,62 L 53,56 L 53,50 Z",
    labelX: 60, labelY: 54,
    centerX: 60, centerY: 54,
    bounds: { minX: 53, minY: 44, maxX: 67, maxY: 64 },
    strategicImportance: 3,
  },
];

// Index by countryId for O(1) lookup
export const MAP_COUNTRY_SHAPES_BY_ID: Partial<Record<CountryId, MapCountryShape>> =
  Object.fromEntries(MAP_COUNTRY_SHAPES.map((s) => [s.countryId, s])) as Partial<Record<CountryId, MapCountryShape>>;
