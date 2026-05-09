// Hotspot engine — derives strategic markers (crisis, cyber, military, etc.)
// from the current StrategyGameState. Hotspots are computed on the fly
// (no persistence) and rendered as markers over the world map.

import type { CountryId, RelationStatus, StrategyGameState } from "@/types/strategy";
import { COUNTRIES } from "@/data/countries";
import { MAP_COUNTRY_SHAPES_BY_ID } from "@/data/mapGeo";

export type HotspotType =
  | "crisis"
  | "cyber"
  | "military"
  | "economy"
  | "diplomacy"
  | "intelligence"
  | "opportunity";

export type HotspotSeverity = "low" | "medium" | "high" | "critical";

export interface MapHotspot {
  id: string;
  countryId: CountryId;
  type: HotspotType;
  title: string;
  description: string;
  severity: HotspotSeverity;
  x: number; // % coord on map
  y: number; // % coord on map
}

const TYPE_ICON_HINT: Record<HotspotType, string> = {
  crisis:       "alert-octagon",
  cyber:        "lan-disconnect",
  military:     "shield-alert",
  economy:      "chart-line-variant",
  diplomacy:    "handshake-outline",
  intelligence: "magnify",
  opportunity:  "star-four-points",
};

export function getHotspotIconName(type: HotspotType): string {
  return TYPE_ICON_HINT[type];
}

export function getHotspotColor(type: HotspotType): string {
  switch (type) {
    case "crisis":       return "#ff3040";
    case "cyber":        return "#a78bfa";
    case "military":     return "#e54848";
    case "economy":      return "#3fbe7a";
    case "diplomacy":    return "#4a9fff";
    case "intelligence": return "#52c97a";
    case "opportunity":  return "#c9a84c";
  }
}

/**
 * Generate hotspots from the current game state.
 * Sources:
 *  - Hostile/rival relations → crisis or military hotspot
 *  - Recent espionage (revealedIntel) → intelligence hotspot
 *  - Top economy countries with friendly status → opportunity hotspot
 *  - Countries with high cyber score and rival/hostile status → cyber threat
 *  - Allied countries → diplomacy reinforcement marker
 */
export function generateHotspots(state: StrategyGameState): MapHotspot[] {
  const hotspots: MapHotspot[] = [];

  for (const rel of state.relations) {
    const country = COUNTRIES[rel.countryId];
    const shape = MAP_COUNTRY_SHAPES_BY_ID[rel.countryId];
    if (!country || !shape) continue;

    // Hostile → crisis (severity scales with threatLevel)
    if (rel.status === "hostile") {
      hotspots.push({
        id: `crisis-${rel.countryId}`,
        countryId: rel.countryId,
        type: "crisis",
        title: `Crise diplomatique : ${country.name}`,
        description: `Score ${rel.score} · menace ${rel.threatLevel}`,
        severity: rel.threatLevel >= 70 ? "critical" : rel.threatLevel >= 50 ? "high" : "medium",
        x: shape.centerX,
        y: shape.centerY - 2,
      });
    }

    // High-cyber rival/hostile → cyber threat
    if ((rel.status === "rival" || rel.status === "hostile") && country.cyber >= 75) {
      hotspots.push({
        id: `cyber-${rel.countryId}`,
        countryId: rel.countryId,
        type: "cyber",
        title: `Cybermenace : ${country.name}`,
        description: `Capacité cyber adverse : ${country.cyber}/100`,
        severity: country.cyber >= 88 ? "high" : "medium",
        x: shape.centerX + 2,
        y: shape.centerY + 1,
      });
    }

    // High-military rival → military threat
    if (rel.status === "rival" && country.military >= 80) {
      hotspots.push({
        id: `mil-${rel.countryId}`,
        countryId: rel.countryId,
        type: "military",
        title: `Activité militaire : ${country.name}`,
        description: `Puissance militaire ${country.military}/100`,
        severity: "medium",
        x: shape.centerX - 2,
        y: shape.centerY + 1,
      });
    }

    // Recent successful espionage → intelligence revealed
    if (rel.revealedIntel) {
      const ageActions = state.news.actionCount - rel.revealedIntel.revealedAtAction;
      if (ageActions <= 50) {
        hotspots.push({
          id: `intel-${rel.countryId}`,
          countryId: rel.countryId,
          type: "intelligence",
          title: `Renseignement : ${country.name}`,
          description: "Données fraîches disponibles",
          severity: ageActions <= 15 ? "high" : "low",
          x: shape.centerX,
          y: shape.centerY + 3,
        });
      }
    }

    // Allied with strong economy → opportunity
    if ((rel.status === "allied" || rel.status === "friendly") && country.economy >= 75) {
      hotspots.push({
        id: `opp-${rel.countryId}`,
        countryId: rel.countryId,
        type: "opportunity",
        title: `Opportunité : ${country.name}`,
        description: `Économie ${country.economy} · partenariat possible`,
        severity: "low",
        x: shape.centerX,
        y: shape.centerY + 2,
      });
    }

    // Allied → diplomacy reinforcement (low severity decoration)
    if (rel.status === "allied") {
      hotspots.push({
        id: `dip-${rel.countryId}`,
        countryId: rel.countryId,
        type: "diplomacy",
        title: `Allié : ${country.name}`,
        description: `Alliance solide · score ${rel.score}`,
        severity: "low",
        x: shape.centerX - 1,
        y: shape.centerY - 2,
      });
    }
  }

  // Cap at 12 hotspots, prioritising critical/high severity
  const severityWeight: Record<HotspotSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  hotspots.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
  return hotspots.slice(0, 12);
}

/** Available map layers — defines what data drives the country fill colors. */
export type MapLayerId =
  | "diplomacy"
  | "threat"
  | "military"
  | "cyber"
  | "economy"
  | "alliances"
  | "commerce"
  | "bases"
  | "hybrid_war";

export interface MapLayerDef {
  id: MapLayerId;
  label: string;
  shortLabel: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
}

export const MAP_LAYERS: MapLayerDef[] = [
  { id: "diplomacy",  label: "Diplomatie",   shortLabel: "Diplo",   icon: "handshake-outline",      color: "#4a9fff" },
  { id: "threat",     label: "Menaces",      shortLabel: "Menaces", icon: "alert-octagon-outline",  color: "#ff3040" },
  { id: "military",   label: "Militaire",    shortLabel: "Mil.",    icon: "shield-sword-outline",   color: "#e54848" },
  { id: "cyber",      label: "Cyber",        shortLabel: "Cyber",   icon: "lan-pending",            color: "#a78bfa" },
  { id: "economy",    label: "Économie",     shortLabel: "Éco.",    icon: "chart-line",             color: "#3fbe7a" },
  { id: "alliances",  label: "Alliances",    shortLabel: "Alliés",  icon: "handshake",              color: "#52c97a" },
  { id: "commerce",   label: "Commerce",     shortLabel: "Commerce",icon: "ship-wheel",             color: "#e8a93a" },
  { id: "bases",      label: "Bases mil.",   shortLabel: "Bases",   icon: "radar",                  color: "#c9a84c" },
  { id: "hybrid_war", label: "Guerre hybride",shortLabel: "Hybride",icon: "virus-outline",          color: "#d46ae8" },
];

const STATUS_COLORS_LAYER: Record<RelationStatus, string> = {
  allied:   "#52c97a",
  friendly: "#4a9fff",
  neutral:  "#7488a3",
  rival:    "#e8a93a",
  hostile:  "#ff3040",
};

export interface CountryRenderState {
  fill: string;
  stroke: string;
  glow?: boolean;
}

/**
 * Compute the fill/stroke for a country given the active map layer and
 * the country's current relation. Pure UI helper.
 */
export function computeCountryRender(
  layerId: MapLayerId,
  isPlayer: boolean,
  countryStats: { economy: number; military: number; cyber: number; diplomacy: number; basePower: number },
  relationStatus: RelationStatus | undefined,
  threatLevel: number,
): CountryRenderState {
  if (isPlayer) {
    return { fill: "rgba(201,168,76,0.32)", stroke: "#c9a84c", glow: true };
  }

  switch (layerId) {
    case "diplomacy": {
      const c = relationStatus ? STATUS_COLORS_LAYER[relationStatus] : "#445566";
      return { fill: c + "33", stroke: c };
    }
    case "alliances": {
      if (relationStatus === "allied")   return { fill: "#52c97a55", stroke: "#52c97a", glow: true };
      if (relationStatus === "friendly") return { fill: "#4a9fff33", stroke: "#4a9fff" };
      return { fill: "#22293508", stroke: "#445566" };
    }
    case "threat": {
      const intensity = Math.min(1, threatLevel / 100);
      const r = Math.round(40 + 215 * intensity);
      const g = Math.round(60 - 40 * intensity);
      const b = Math.round(80 - 50 * intensity);
      const a = 0.18 + 0.5 * intensity;
      return { fill: `rgba(${r},${g},${b},${a})`, stroke: `rgba(${r},${g},${b},0.85)` };
    }
    case "military": {
      const intensity = countryStats.military / 100;
      const a = 0.15 + 0.5 * intensity;
      return { fill: `rgba(229,72,72,${a})`, stroke: `rgba(229,72,72,${0.5 + 0.4 * intensity})` };
    }
    case "cyber": {
      const intensity = countryStats.cyber / 100;
      const a = 0.15 + 0.5 * intensity;
      return { fill: `rgba(167,139,250,${a})`, stroke: `rgba(167,139,250,${0.5 + 0.4 * intensity})` };
    }
    case "economy": {
      const intensity = countryStats.economy / 100;
      const a = 0.15 + 0.5 * intensity;
      return { fill: `rgba(63,190,122,${a})`, stroke: `rgba(63,190,122,${0.5 + 0.4 * intensity})` };
    }
    case "commerce": {
      // Trade routes: allied/friendly + high economy = bright orange
      if (!relationStatus || relationStatus === "hostile") {
        return { fill: "rgba(40,20,10,0.12)", stroke: "rgba(100,60,20,0.4)" };
      }
      const ecoIntensity = countryStats.economy / 100;
      const relBonus = relationStatus === "allied" ? 0.3 : relationStatus === "friendly" ? 0.2 : 0.05;
      const a = relBonus + 0.4 * ecoIntensity;
      return { fill: `rgba(232,169,58,${a})`, stroke: `rgba(232,169,58,${0.5 + 0.3 * ecoIntensity})` };
    }
    case "bases": {
      // Military projection: based on military stat, hostile = red glow
      const milIntensity = countryStats.military / 100;
      if (relationStatus === "hostile" || relationStatus === "rival") {
        return { fill: `rgba(229,72,72,${0.15 + 0.4 * milIntensity})`, stroke: "#e54848", glow: milIntensity > 0.75 };
      }
      if (relationStatus === "allied") {
        return { fill: `rgba(201,168,76,${0.15 + 0.35 * milIntensity})`, stroke: "#c9a84c", glow: milIntensity > 0.8 };
      }
      return { fill: `rgba(120,130,150,${0.1 + 0.2 * milIntensity})`, stroke: "rgba(120,130,150,0.5)" };
    }
    case "hybrid_war": {
      // Hybrid warfare threat: cyber × aggression of rival/hostile countries
      const cyberIntensity = countryStats.cyber / 100;
      if (relationStatus === "hostile") {
        const a = 0.2 + 0.5 * cyberIntensity;
        return { fill: `rgba(212,106,232,${a})`, stroke: `rgba(212,106,232,0.9)`, glow: cyberIntensity > 0.8 };
      }
      if (relationStatus === "rival") {
        const a = 0.1 + 0.35 * cyberIntensity;
        return { fill: `rgba(212,106,232,${a})`, stroke: `rgba(212,106,232,0.6)` };
      }
      return { fill: "rgba(40,20,50,0.08)", stroke: "rgba(100,50,120,0.3)" };
    }
  }
}
