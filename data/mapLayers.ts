import type { MapLayerDef } from "@/logic/hotspotEngine";

export type ExtMapLayerId =
  | "diplomacy"
  | "threat"
  | "military"
  | "cyber"
  | "economy"
  | "alliances"
  | "commerce"
  | "continents";

export interface ExtMapLayerDef {
  id: ExtMapLayerId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
}

export const EXTENDED_MAP_LAYERS: ExtMapLayerDef[] = [
  { id: "diplomacy",  label: "Diplomatie", shortLabel: "Diplo",   icon: "handshake-outline",     color: "#4a9fff" },
  { id: "threat",     label: "Menaces",    shortLabel: "Menace",  icon: "alert-octagon-outline", color: "#ff3040" },
  { id: "military",   label: "Militaire",  shortLabel: "Mili",    icon: "shield-sword-outline",  color: "#e54848" },
  { id: "cyber",      label: "Cyber",      shortLabel: "Cyber",   icon: "lan-pending",           color: "#a78bfa" },
  { id: "economy",    label: "Économie",   shortLabel: "Éco",     icon: "chart-line",            color: "#3fbe7a" },
  { id: "alliances",  label: "Alliances",  shortLabel: "Alliés",  icon: "handshake",             color: "#52c97a" },
  { id: "commerce",   label: "Commerce",   shortLabel: "Commerce",icon: "ship-wheel",            color: "#e8a93a" },
  { id: "continents", label: "Continents", shortLabel: "Régions", icon: "earth",                 color: "#aeb9d4" },
];

export const REGION_COLORS: Record<string, string> = {
  "Europe":       "#4a9fff",
  "Amériques":    "#3fbe7a",
  "Asie":         "#e8a93a",
  "Moyen-Orient": "#e54848",
  "Afrique":      "#c9a84c",
};
