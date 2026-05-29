// Identité visuelle par grande section — source unique de vérité.
//
// Chaque section du jeu (salle de crise, météo, santé, défense, économie…)
// possède une couleur d'accent, une icône MaterialCommunityIcons, un dégradé
// de fond cinématique et un kicker. Utilisé par SectionBackdrop, les en-têtes
// et les cartes pour garantir une identité cohérente et immersive.
//
// AUCUN emoji ici — uniquement des noms d'icônes vectorielles professionnelles.

import { PALETTE } from "@/constants/uiTokens";

export type SectionId =
  | "dashboard"
  | "journal"
  | "meteo"
  | "sante"
  | "securite"
  | "economie"
  | "infrastructures"
  | "diplomatie"
  | "cyber"
  | "cabinet"
  | "recherche"
  | "carte";

export interface SectionIdentity {
  /** Libellé long, institutionnel. */
  label: string;
  /** Kicker court en capitales (au-dessus du titre). */
  kicker: string;
  /** Couleur d'accent de la section (hex). */
  accent: string;
  /** Icône MaterialCommunityIcons représentant la section. */
  icon: string;
  /** Dégradé de fond (haut → bas) pour le backdrop cinématique. */
  gradient: [string, string];
  /** Nom de fond photo à générer (cf. prompts) — câblage optionnel. */
  bgAsset?: string;
}

export const SECTION_IDENTITY: Record<SectionId, SectionIdentity> = {
  dashboard: {
    label:    "Tableau de Bord Présidentiel",
    kicker:   "COMMANDEMENT NATIONAL",
    accent:   PALETTE.gold,
    icon:     "view-dashboard-variant-outline",
    gradient: ["#12141d", "#08090f"],
    bgAsset:  "bg_dashboard_presidentiel.webp",
  },
  journal: {
    label:    "Journal de Crise",
    kicker:   "DESK PRÉSIDENTIEL",
    accent:   PALETTE.crimson,
    icon:     "newspaper-variant-outline",
    gradient: ["#181016", "#08090f"],
    bgAsset:  "bg_journal_crise.webp",
  },
  meteo: {
    label:    "Salle Météo Nationale",
    kicker:   "CENTRE DE PRÉVISION",
    accent:   PALETTE.info,
    icon:     "radar",
    gradient: ["#0d1620", "#08090f"],
    bgAsset:  "bg_salle_meteo_nationale.webp",
  },
  sante: {
    label:    "Cellule Santé Publique",
    kicker:   "COORDINATION SANITAIRE",
    accent:   "#2fb8a6",
    icon:     "hospital-box-outline",
    gradient: ["#0c1a18", "#08090f"],
    bgAsset:  "bg_cellule_sante_publique.webp",
  },
  securite: {
    label:    "Conseil de Sécurité",
    kicker:   "ÉTAT-MAJOR & DÉFENSE",
    accent:   "#d24b3c",
    icon:     "shield-star-outline",
    gradient: ["#1a1112", "#08090f"],
    bgAsset:  "bg_conseil_securite.webp",
  },
  economie: {
    label:    "Économie & Finances",
    kicker:   "MINISTÈRE DE L'ÉCONOMIE",
    accent:   PALETTE.gold,
    icon:     "chart-line-variant",
    gradient: ["#171510", "#08090f"],
    bgAsset:  "bg_economie_finances.webp",
  },
  infrastructures: {
    label:    "Infrastructures & Énergie",
    kicker:   "SUPERVISION DES RÉSEAUX",
    accent:   PALETTE.warning,
    icon:     "transmission-tower",
    gradient: ["#17140d", "#08090f"],
    bgAsset:  "bg_infrastructures_energie.webp",
  },
  diplomatie: {
    label:    "Diplomatie & International",
    kicker:   "AFFAIRES ÉTRANGÈRES",
    accent:   "#4ac8ff",
    icon:     "earth",
    gradient: ["#0c1620", "#08090f"],
    bgAsset:  "bg_diplomatie.webp",
  },
  cyber: {
    label:    "Centre de Cyberdéfense",
    kicker:   "SECURITY OPERATIONS CENTER",
    accent:   "#26d0c0",
    icon:     "shield-lock-outline",
    gradient: ["#091a1a", "#08090f"],
    bgAsset:  "bg_cyberdefense.webp",
  },
  cabinet: {
    label:    "Cabinet Ministériel",
    kicker:   "GOUVERNEMENT",
    accent:   PALETTE.steel,
    icon:     "account-group-outline",
    gradient: ["#11141c", "#08090f"],
    bgAsset:  "bg_cabinet.webp",
  },
  recherche: {
    label:    "Recherche & Innovation",
    kicker:   "PROGRAMME STRATÉGIQUE",
    accent:   "#a78bfa",
    icon:     "atom-variant",
    gradient: ["#13101c", "#08090f"],
    bgAsset:  "bg_recherche.webp",
  },
  carte: {
    label:    "Carte Mondiale",
    kicker:   "SITUATION GÉOSTRATÉGIQUE",
    accent:   PALETTE.info,
    icon:     "map-outline",
    gradient: ["#0c131d", "#08090f"],
    bgAsset:  "bg_carte_mondiale.webp",
  },
};

export function getSectionIdentity(id: SectionId): SectionIdentity {
  return SECTION_IDENTITY[id];
}
