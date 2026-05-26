/**
 * data/orionCity.ts — La Cité d'Orion.
 *
 * Hub diplomatique interstellaire suspendu aux frontières de plusieurs galaxies.
 * Données statiques : quartiers, niveaux d'accès, étiquettes narratives.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrionDistrictId =
  | "dome_ambassades"
  | "marche_silences"
  | "archives_stellaires"
  | "tribunal_especes"
  | "couloir_noir"
  | "phare_aurora"
  | "porte_orion";

export type OrionAccessLevel =
  | "inconnu"
  | "observé"
  | "invité"
  | "toléré"
  | "surveillé"
  | "banni";

export interface OrionDistrictDef {
  id:          OrionDistrictId;
  name:        string;
  role:        string;
  description: string;
  icon:        string;
  alignment:   "aurora" | "neutral" | "obscurium" | "judgment";
  observes:    string; // ce que le quartier évalue sur la Terre
}

// ── Quartiers ─────────────────────────────────────────────────────────────────

export const ORION_DISTRICTS: Record<OrionDistrictId, OrionDistrictDef> = {
  dome_ambassades: {
    id:          "dome_ambassades",
    name:        "Le Dôme des Ambassades",
    role:        "Diplomatie cosmique",
    description: "Siège des délégations de mille civilisations. Les votes sur le sort des espèces émergentes s'y tiennent à huis clos. Aurora Prime y maintient une présence permanente.",
    icon:        "bank-outline",
    alignment:   "aurora",
    observes:    "Vos alliances, vos traités, votre capacité à coopérer.",
  },
  marche_silences: {
    id:          "marche_silences",
    name:        "Le Marché des Silences",
    role:        "Renseignement & secrets",
    description: "Ici, rien n'a de prix fixe. L'information se vend contre de l'information. Les pièges sont nombreux — certains vendeurs travaillent pour Obscurium.",
    icon:        "eye-outline",
    alignment:   "neutral",
    observes:    "Vos secrets, vos failles, ce que vous ne savez pas encore.",
  },
  archives_stellaires: {
    id:          "archives_stellaires",
    name:        "Les Archives Stellaires",
    role:        "Savoir ancien & technologie défensive",
    description: "Des siècles de civilisations y ont déposé leurs avertissements. Certains fragments technologiques sont accessibles aux espèces jugées dignes de confiance.",
    icon:        "book-open-variant",
    alignment:   "aurora",
    observes:    "Votre désir de comprendre, votre honnêteté face à l'histoire.",
  },
  tribunal_especes: {
    id:          "tribunal_especes",
    name:        "Le Tribunal des Espèces",
    role:        "Jugement & sanctions cosmiques",
    description: "L'instance qui décide si une espèce représente un danger pour le Conseil. La Terre est sous surveillance active. Les délibérations ne sont jamais publiques.",
    icon:        "gavel",
    alignment:   "judgment",
    observes:    "Tout ce que vous avez fait de votre pouvoir depuis le début du mandat.",
  },
  couloir_noir: {
    id:          "couloir_noir",
    name:        "Le Couloir Noir",
    role:        "Zone liée à Obscurium",
    description: "Une zone que le Dôme préfère ignorer officiellement. Obscurium y propose des solutions rapides. Chaque accord y laisse une trace — que les Archives ne manquent pas d'enregistrer.",
    icon:        "skull-outline",
    alignment:   "obscurium",
    observes:    "Vos tentations, vos raccourcis, ce que vous acceptez en silence.",
  },
  phare_aurora: {
    id:          "phare_aurora",
    name:        "Le Phare d'Aurora",
    role:        "Protection conditionnelle",
    description: "Le consulat d'Aurora Prime dans la Cité. Elle n'aide pas gratuitement — elle aide ceux qui méritent d'être aidés. Les conditions sont strictes et jamais négociables.",
    icon:        "lighthouse-on",
    alignment:   "aurora",
    observes:    "Votre crédibilité, votre cohérence, votre intégrité institutionnelle.",
  },
  porte_orion: {
    id:          "porte_orion",
    name:        "La Porte d'Orion",
    role:        "Arrivée des délégations",
    description: "Point d'entrée et de sortie de la Cité. C'est ici que se forment les premières impressions. Les incidents de passage y sont nombreux et rarement oubliés.",
    icon:        "door-open",
    alignment:   "neutral",
    observes:    "Votre façon d'arriver, ce que vous montrez en premier.",
  },
};

export const ORION_DISTRICT_LIST: OrionDistrictDef[] = Object.values(ORION_DISTRICTS);

// ── Libellés ──────────────────────────────────────────────────────────────────

export const ACCESS_LEVEL_LABELS: Record<OrionAccessLevel, string> = {
  inconnu:   "Non découvert",
  observé:   "Observé à distance",
  invité:    "Invité officieux",
  toléré:    "Toléré sous conditions",
  surveillé: "Sous surveillance active",
  banni:     "Accès révoqué",
};

export const ACCESS_LEVEL_DESCRIPTIONS: Record<OrionAccessLevel, string> = {
  inconnu:   "La Cité d'Orion n'a pas encore été détectée par vos services de renseignement.",
  observé:   "Des signaux cohérents suggèrent une structure d'origine inconnue. Vos équipes observent sans avoir établi de contact.",
  invité:    "Un canal discret a été ouvert. Vous n'êtes pas encore reconnu officiellement, mais vous êtes attendu.",
  toléré:    "Le Dôme vous tolère. C'est moins qu'une invitation, mais plus qu'un rejet. Ne faites rien d'irréversible.",
  surveillé: "Le Tribunal vous surveille activement. Chaque décision est consignée. Vos interlocuteurs pèsent leurs mots.",
  banni:     "L'accès a été révoqué. La raison n'a pas été communiquée. Aurora Prime ne répond plus.",
};

export const ACCESS_LEVEL_COLOR: Record<OrionAccessLevel, string> = {
  inconnu:   "#5a6a82",
  observé:   "#7ec8f7",
  invité:    "#4caf82",
  toléré:    "#e8c44f",
  surveillé: "#e07840",
  banni:     "#d04040",
};
