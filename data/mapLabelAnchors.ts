import type { CountryId } from "@/types/strategy";

/**
 * Ancre d'un label pays sur la carte SVG (viewBox 0–1000 × 0–507.209).
 *
 * Coordonnées issues du parser SVG Python (bounding-box réelle des paths).
 * PAS de formule équirectangulaire — uniquement des positions calibrées
 * dans le repère natif du SVG.
 *
 * Grands pays (USA, Russie, Canada) : centre visuel ajusté manuellement
 * pour éviter que la bbox couvrant les territoires éloignés (Alaska,
 * Sibérie orientale) ne décale le label hors du territoire principal.
 *
 * dx / dy : décalage écran en pixels, appliqué APRÈS svgToScreen.
 *           Ne grossit PAS avec le zoom.
 *
 * callout : pays trop petits pour centrer le label sur le territoire.
 *   - un point s'affiche à la position SVG (x, y)
 *   - le label est décalé de (dx, dy)
 *   - n'apparaît qu'à zoom ≥ 3.5 (tier 2), même si le pays est tier 1
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
  // visibles dès zoom × 2.0

  france:   { x: 481, y: 108 },  // bbox parser: cx=481.3, cy=108.6
  usa:      { x: 230, y: 148 },  // bbox SVG trop large (Alaska) → centre visuel 48 états
  china:    { x: 735, y: 141 },  // bbox parser: cx=734.7, cy=141.3
  russia:   { x: 680, y: 72  },  // bbox trop étendue → centre visuel Oural/Sibérie ouest
  india:    { x: 696, y: 187 },  // bbox parser: cx=695.9, cy=187.1
  brazil:   { x: 322, y: 298 },  // bbox parser: cx=321.5, cy=298.2
  uk:       { x: 469, y: 81  },  // bbox parser: cx=468.8, cy=81.1

  // ── Tier 2 — puissances secondaires ──────────────────────────────────────
  // visibles dès zoom × 3.5

  germany:      { x: 501, y: 93  },  // bbox parser: cx=501.0, cy=93.5
  turkey:       { x: 565, y: 131 },  // bbox parser: cx=565.1, cy=131.0
  iran:         { x: 615, y: 151 },  // bbox parser: cx=615.2, cy=151.5
  saudi_arabia: { x: 595, y: 177 },  // bbox parser: cx=595.0, cy=177.3
  australia:    { x: 851, y: 354 },  // bbox parser: cx=851.3, cy=354.0
  canada:       { x: 265, y: 72  },  // bbox SVG trop large → centre visuel sud Canada
  nigeria:      { x: 496, y: 225 },  // bbox parser: cx=496.1, cy=224.9
  pakistan:     { x: 656, y: 158 },  // bbox parser: cx=656.3, cy=158.1

  // ── Callout — pays trop petits pour centrer le label ─────────────────────
  // point au centre SVG + label décalé ; uniquement zoom × 3.5+

  japan:       { x: 824, y: 144, dx:  30, dy:  -8, callout: true },  // parser: cx=824.6, cy=144.0
  israel:      { x: 566, y: 155, dx:  26, dy: -12, callout: true },  // parser: cx=565.9, cy=154.8
  south_korea: { x: 807, y: 141, dx:  24, dy:  -6, callout: true },  // parser: cx=806.6, cy=140.6
  north_korea: { x: 799, y: 127, dx:  24, dy: -10, callout: true },  // parser: cx=798.9, cy=126.8
  italy:       { x: 507, y: 122, dx:  20, dy:  14, callout: true },  // parser: cx=506.5, cy=122.0
};
