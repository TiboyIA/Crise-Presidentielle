import type colors from "@/constants/colors";

export type ThemeId = "obsidienne" | "acier" | "imperial" | "emeraude" | "nuit_absolue";

type ColorPalette = typeof colors.light;

export interface ThemeDef {
  id: ThemeId;
  name: string;
  free: boolean;
  price: string;
  /** Accent color shown as swatch in shop */
  accentSwatch: string;
  /** Background color shown as swatch in shop */
  bgSwatch: string;
  flavorText: string;
  overrides: Partial<ColorPalette>;
}

export const THEMES: ThemeDef[] = [
  {
    id: "obsidienne",
    name: "Obsidienne",
    free: true,
    price: "GRATUIT",
    accentSwatch: "#c0392b",
    bgSwatch: "#0a0c0e",
    flavorText: "Le thème par défaut de la République.",
    overrides: {},
  },
  {
    id: "acier",
    name: "Acier",
    free: false,
    price: "0,99 €",
    accentSwatch: "#2563eb",
    bgSwatch: "#050508",
    flavorText: "Bleu acier, fond quasi noir — rigueur et froideur stratégique.",
    overrides: {
      primary: "#2563eb",
      accent: "#1d4ed8",
      tint: "#2563eb",
      background: "#050508",
      card: "#0c0f1a",
      border: "#1a2040",
      muted: "#0f1525",
    },
  },
  {
    id: "imperial",
    name: "Impérial",
    free: false,
    price: "0,99 €",
    accentSwatch: "#7c3aed",
    bgSwatch: "#080510",
    flavorText: "Violet profond, autorité absolue, faste impérial.",
    overrides: {
      primary: "#7c3aed",
      accent: "#6d28d9",
      tint: "#7c3aed",
      background: "#080510",
      card: "#100c1a",
      border: "#1e1535",
      muted: "#100c1e",
    },
  },
  {
    id: "emeraude",
    name: "Émeraude",
    free: false,
    price: "0,99 €",
    accentSwatch: "#059669",
    bgSwatch: "#050d09",
    flavorText: "Vert émeraude — équilibre, espoir, renouveau.",
    overrides: {
      primary: "#059669",
      accent: "#047857",
      tint: "#059669",
      background: "#050d09",
      card: "#0a1410",
      border: "#132318",
      muted: "#0d1a12",
    },
  },
  {
    id: "nuit_absolue",
    name: "Nuit absolue",
    free: false,
    price: "0,99 €",
    accentSwatch: "#c0392b",
    bgSwatch: "#000000",
    flavorText: "Fond noir pur, contraste maximal — pour les écrans AMOLED.",
    overrides: {
      background: "#000000",
      card: "#0b0b0d",
      border: "#181818",
      muted: "#0f0f0f",
    },
  },
];

export const FREE_THEME_ID: ThemeId = "obsidienne";

export function getTheme(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
