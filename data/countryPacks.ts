import type { CountryId, StrategyResources } from "@/types/strategy";

export type CountryPackId = "grandes_puissances" | "asie_pacifique" | "monde";

export interface CountryPackDef {
  id: CountryPackId;
  title: string;
  price: string;
  countries: CountryId[];
}

export const COUNTRY_PACKS: CountryPackDef[] = [
  {
    id: "grandes_puissances",
    title: "Pack Grandes Puissances",
    price: "4,99 €",
    countries: ["usa", "china", "russia", "uk", "germany"],
  },
  {
    id: "asie_pacifique",
    title: "Pack Asie-Pacifique",
    price: "3,99 €",
    countries: ["japan", "south_korea", "india", "australia", "pakistan"],
  },
  {
    id: "monde",
    title: "Pack Reste du Monde",
    price: "3,99 €",
    countries: ["brazil", "turkey", "iran", "israel", "saudi_arabia", "nigeria", "canada", "italy", "north_korea"],
  },
];

export const FREE_COUNTRIES = new Set<CountryId>(["france"]);

export function isCountryFree(id: CountryId): boolean {
  return FREE_COUNTRIES.has(id);
}

export function getCountryPack(id: CountryId): CountryPackDef | null {
  return COUNTRY_PACKS.find((p) => p.countries.includes(id)) ?? null;
}

/** Small flavour bonuses — reflect each country's profile without breaking balance. */
export const COUNTRY_RESOURCE_BONUS: Partial<Record<CountryId, Partial<StrategyResources>>> = {
  france:      {},
  usa:         { military: 30, intelligence: 20 },
  china:       { money: 300, technology: 15 },
  russia:      { military: 30, cyberDefense: 15 },
  germany:     { money: 200, technology: 10 },
  uk:          { intelligence: 15, influence: 10 },
  india:       { money: 100, military: 10 },
  japan:       { technology: 15, money: 150 },
  brazil:      { energy: 15, influence: 10 },
  turkey:      { military: 10, influence: 10 },
  iran:        { energy: 20, military: 15 },
  israel:      { cyberDefense: 20, intelligence: 15 },
  south_korea: { technology: 15, cyberDefense: 10 },
  italy:       { influence: 10, money: 100 },
  saudi_arabia:{ energy: 30, money: 200 },
  australia:   { energy: 10, intelligence: 10 },
  canada:      { energy: 15, money: 100 },
  north_korea: { military: 20, cyberDefense: 10 },
  nigeria:     { energy: 15, influence: 10 },
  pakistan:    { military: 15, cyberDefense: 10 },
};
