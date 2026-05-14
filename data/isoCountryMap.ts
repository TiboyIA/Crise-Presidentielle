import type { CountryId } from "@/types/strategy";

// ISO 3166-1 numeric → game CountryId (used by topojson world-atlas)
export const ISO_TO_COUNTRY_ID: Record<number, CountryId> = {
  250: "france",
  840: "usa",
  156: "china",
  643: "russia",
  276: "germany",
  826: "uk",
  356: "india",
  392: "japan",
  76:  "brazil",
  792: "turkey",
  364: "iran",
  376: "israel",
  410: "south_korea",
  380: "italy",
  682: "saudi_arabia",
  36:  "australia",
  124: "canada",
  408: "north_korea",
  566: "nigeria",
  586: "pakistan",
};

export const GAME_ISO_SET = new Set(Object.keys(ISO_TO_COUNTRY_ID).map(Number));

// ISO 3166-1 alpha-2 → game CountryId (used by SVG World Map)
export const ALPHA2_TO_COUNTRY_ID: Record<string, CountryId> = {
  FR: "france",
  US: "usa",
  CN: "china",
  RU: "russia",
  DE: "germany",
  GB: "uk",
  IN: "india",
  JP: "japan",
  BR: "brazil",
  TR: "turkey",
  IR: "iran",
  IL: "israel",
  KR: "south_korea",
  IT: "italy",
  SA: "saudi_arabia",
  AU: "australia",
  CA: "canada",
  KP: "north_korea",
  NG: "nigeria",
  PK: "pakistan",
};

export const GAME_ALPHA2_SET = new Set(Object.keys(ALPHA2_TO_COUNTRY_ID));
