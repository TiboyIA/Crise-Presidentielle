import { computeCountryRender } from "@/logic/hotspotEngine";
import type { CountryRenderState, MapLayerId } from "@/logic/hotspotEngine";
import type { RelationStatus } from "@/types/strategy";
import { REGION_COLORS } from "@/data/mapLayers";
import type { ExtMapLayerId } from "@/data/mapLayers";

export type { CountryRenderState };

export function computeCountryRenderExt(
  layerId: ExtMapLayerId,
  isPlayer: boolean,
  countryStats: {
    economy: number;
    military: number;
    cyber: number;
    diplomacy: number;
    basePower: number;
    region: string;
  },
  relationStatus: RelationStatus | undefined,
  threatLevel: number,
): CountryRenderState {
  if (isPlayer) return { fill: "rgba(201,168,76,0.32)", stroke: "#c9a84c", glow: true };
  if (layerId === "continents") {
    const color = REGION_COLORS[countryStats.region] ?? "#7488a3";
    return { fill: color + "2a", stroke: color + "aa" };
  }
  return computeCountryRender(layerId as MapLayerId, isPlayer, countryStats, relationStatus, threatLevel);
}
