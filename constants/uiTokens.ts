// Premium design tokens — used across all strategy game screens to keep
// a coherent "command room / geopolitical strategy" feel.

export const PALETTE = {
  // Surfaces (dark navy → black gradient family)
  void:       "#05070d",
  ink:        "#0a0c14",
  panel:      "#0f131c",
  panelHi:    "#161b27",
  panelEdge:  "#202738",
  // Accents
  gold:       "#c9a84c",
  goldDim:    "#8e7833",
  goldGlow:   "#f0d57a",
  crimson:    "#c0392b",
  crimsonDim: "#7b1e16",
  steel:      "#5a6a82",
  // Status
  success:    "#3fbe7a",
  warning:    "#e8a93a",
  danger:     "#e54848",
  info:       "#4a9fff",
  // Text
  textHigh:   "#f1f3f8",
  textMid:    "#a3adbf",
  textLow:    "#5e6678",
} as const;

// Gradients used across panels, buttons, headers
export const GRADIENTS = {
  panel:        ["#161b27", "#0d1119"] as [string, string],
  panelGold:    ["#1c1814", "#0d1119"] as [string, string],
  panelDanger:  ["#1f1418", "#0d1119"] as [string, string],
  hero:         ["rgba(6,8,16,0.15)", "rgba(6,8,16,0.85)", "#0a0c14"] as [string, string, string],
  heroLight:    ["rgba(6,8,16,0.0)", "rgba(6,8,16,0.65)"] as [string, string],
  primary:      ["#d04030", "#8b0d0d"] as [string, string],
  primaryDim:   ["#3a1d1c", "#220e0e"] as [string, string],
  gold:         ["#dcb858", "#a07f30"] as [string, string],
  success:      ["#3fbe7a", "#1f7448"] as [string, string],
  glassPanel:   ["rgba(22,27,39,0.95)", "rgba(13,17,25,0.95)"] as [string, string],
} as const;

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FONT = {
  reg: "Inter_400Regular",
  med: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

// Ready-made shadow style fragments
export const SHADOW = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: PALETTE.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  glowDanger: {
    shadowColor: PALETTE.crimson,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

// Status color helpers (relation, urgency, etc.)
export const STATUS_COLORS = {
  allied:   "#3fbe7a",
  friendly: "#4ac8ff",
  neutral:  "#7e8a9e",
  rival:    "#f59a3a",
  hostile:  "#e54848",
} as const;

export const URGENCY_COLORS = {
  routine:  "#7e8a9e",
  alert:    "#e8a93a",
  critical: "#e54848",
  decisive: "#c9a84c",
} as const;
