import type { CountryId } from "@/types/strategy";

/**
 * Ancre d'un label pays sur la carte SVG (viewBox 0–1000 × 0–507.209).
 *
 * Formule équirectangulaire utilisée pour calculer (x, y) :
 *   x = (lon + 180) / 360 × 1000
 *   y = (90  - lat) / 180 × 507.209
 *
 * Les coordonnées visent le centre géographique du territoire,
 * pas la capitale (qui peut être excentrée).
 *
 * dx / dy : décalage supplémentaire en pixels-écran, appliqué APRÈS la
 * projection SVG → écran. Ne grossit pas avec le zoom.
 *
 * callout : pour les pays trop petits pour afficher le nom au centre.
 *   - un point s'affiche à la position SVG (x, y)
 *   - le label est décalé de (dx, dy) à côté
 *   - le label n'apparaît qu'à zoom ≥ 3.5 (tier 2), même si le pays est tier 1
 */
export type LabelAnchor = {
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  callout?: boolean;
};

export const COUNTRY_LABEL_ANCHORS: Partial<Record<CountryId, LabelAnchor>> = {

  // ── Tier 1 — grandes puissances ──────────────────────────────────────────
  // visibles dès zoom × 2.0 ; label au centre géographique du territoire

  france:       { x: 502, y: 122 },   // Massif Central     ~2°E   47°N
  usa:          { x: 229, y: 146 },   // Kansas             ~97°W  38°N
  china:        { x: 786, y: 158 },   // Sichuan / plateau  ~104°E 34°N
  russia:       { x: 694, y:  92 },   // Oural occidental   ~70°E  57°N
  india:        { x: 719, y: 193 },   // Deccan             ~78°E  22°N
  brazil:       { x: 350, y: 283 },   // Mato Grosso        ~53°W  10°S
  uk:           { x: 494, y: 108 },   // Angleterre         ~2°W   52.5°N

  // ── Tier 2 — puissances secondaires ──────────────────────────────────────
  // visibles dès zoom × 3.5

  germany:      { x: 528, y: 111 },   // Allemagne centrale ~10°E  51°N
  turkey:       { x: 597, y: 145 },   // Anatolie           ~35°E  39°N
  iran:         { x: 648, y: 163 },   // plateau iranien    ~53°E  32°N
  saudi_arabia: { x: 625, y: 186 },   // Najd               ~45°E  25°N
  australia:    { x: 860, y: 333 },   // outback            ~132°E 28°S
  canada:       { x: 226, y:  80 },   // Prairies           ~97°W  62°N
  nigeria:      { x: 522, y: 229 },   // plateau de Jos     ~8°E   9°N
  pakistan:     { x: 693, y: 169 },   // Pendjab            ~70°E  30°N

  // ── Callout — pays trop petits pour centrer le label ─────────────────────
  // point au centre + label décalé ; uniquement zoom × 3.5+

  japan:        { x: 882, y: 155, dx:  26, dy: -10, callout: true }, // Honshu → droite
  israel:       { x: 598, y: 166, dx:  30, dy: -16, callout: true },
  south_korea:  { x: 854, y: 150, dx:  26, dy:  -4, callout: true },
  north_korea:  { x: 851, y: 141, dx:  24, dy: -14, callout: true },
  italy:        { x: 533, y: 136, dx:  16, dy:  14, callout: true }, // botte → dessous
};
