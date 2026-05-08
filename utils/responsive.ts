import { useWindowDimensions } from "react-native";

// Baseline screen width used for font/spacing scaling
const BASE_WIDTH = 375;

export const BREAKPOINTS = {
  small: 360,   // compact phones (SE, small Androids)
  medium: 480,  // normal phones
  large: 768,   // large phones / small tablets
  tablet: 1024, // tablets / desktop
} as const;

export type ScreenSize = "small" | "medium" | "large" | "tablet" | "desktop";

function computeSize(width: number): ScreenSize {
  if (width < BREAKPOINTS.small) return "small";
  if (width < BREAKPOINTS.medium) return "medium";
  if (width < BREAKPOINTS.large) return "large";
  if (width < BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

export interface ScreenInfo {
  width: number;
  height: number;
  size: ScreenSize;
  isSmall: boolean;
  isTabletOrLarger: boolean;
  isLandscape: boolean;
  /** Horizontal screen padding */
  hPad: number;
  /** Columns for the main navigation grid */
  navCols: number;
  /** Columns for the resource grid */
  resourceCols: number;
  /** Max content width (centered) for tablet/desktop, undefined on phones */
  maxContentWidth: number | undefined;
  /** Scale a font size relative to 375px baseline */
  sf: (v: number) => number;
  /** Scale a spacing/padding value */
  sp: (v: number) => number;
}

export function useResponsive(): ScreenInfo {
  const { width, height } = useWindowDimensions();
  const size = computeSize(width);
  const isSmall = size === "small";
  const isTabletOrLarger = size === "tablet" || size === "desktop";
  const isLandscape = width > height;

  const wScale = Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.3);
  const hPad = isSmall ? 12 : isTabletOrLarger ? 24 : 16;

  return {
    width,
    height,
    size,
    isSmall,
    isTabletOrLarger,
    isLandscape,
    hPad,
    navCols: isTabletOrLarger ? 3 : 2,
    resourceCols: isSmall ? 2 : isTabletOrLarger ? 4 : 3,
    maxContentWidth: isTabletOrLarger ? 680 : undefined,
    sf: (v) => Math.round(v * wScale),
    sp: (v) => Math.round(v * (isSmall ? 0.85 : isTabletOrLarger ? 1.1 : 1)),
  };
}
