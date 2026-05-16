export type PortraitId =
  | "default"
  | "general"
  | "diplomate"
  | "stratege"
  | "reformateur"
  | "oracle"
  | "populiste";

export interface PortraitDef {
  id: PortraitId;
  name: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  free: boolean;
  price: string;
  flavorText: string;
}

export const PORTRAITS: PortraitDef[] = [
  {
    id: "default",
    name: "Sceau républicain",
    icon: "⚜️",
    bgColor: "#1a0808",
    borderColor: "#c9a84c",
    free: true,
    price: "GRATUIT",
    flavorText: "Le symbole de la République.",
  },
  {
    id: "general",
    name: "Le Général",
    icon: "🎖️",
    bgColor: "#0a1428",
    borderColor: "#4a9fff",
    free: false,
    price: "0,99 €",
    flavorText: "L'autorité forgée sur les champs de bataille.",
  },
  {
    id: "diplomate",
    name: "Le Diplomate",
    icon: "🕊️",
    bgColor: "#0a1f0a",
    borderColor: "#3fbe7a",
    free: false,
    price: "0,99 €",
    flavorText: "La paix s'obtient par la parole, jamais par la force.",
  },
  {
    id: "stratege",
    name: "Le Stratège",
    icon: "♟️",
    bgColor: "#150a28",
    borderColor: "#a78bfa",
    free: false,
    price: "0,99 €",
    flavorText: "Chaque décision, une pièce sur l'échiquier mondial.",
  },
  {
    id: "reformateur",
    name: "Le Réformateur",
    icon: "⚖️",
    bgColor: "#0a0a1f",
    borderColor: "#6b8cce",
    free: false,
    price: "0,99 €",
    flavorText: "La justice et la loi, socle de toute autorité légitime.",
  },
  {
    id: "oracle",
    name: "L'Oracle",
    icon: "🔭",
    bgColor: "#001a1a",
    borderColor: "#26c6da",
    free: false,
    price: "1,49 €",
    flavorText: "Voir l'avenir pour mieux façonner le présent.",
  },
  {
    id: "populiste",
    name: "Le Tribun",
    icon: "🗣️",
    bgColor: "#1a1000",
    borderColor: "#e8a93a",
    free: false,
    price: "0,99 €",
    flavorText: "Le peuple parle, je suis sa voix.",
  },
];

export const FREE_PORTRAIT_ID: PortraitId = "default";

export function getPortrait(id: PortraitId): PortraitDef {
  return PORTRAITS.find((p) => p.id === id) ?? PORTRAITS[0];
}
