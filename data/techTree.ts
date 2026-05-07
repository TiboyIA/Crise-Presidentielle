import type { ResourceCosts, TechId } from "../types/game";

/**
 * Module 7.1 — Branches & Doctrines.
 *
 * Les 10 axes de R&D sont regroupés en 4 branches thématiques.
 * Compléter TOUS les axes d'une branche débloque automatiquement
 * sa DOCTRINE : un bonus passif puissant qui dure jusqu'à la fin
 * du mandat (reset au 2nd mandat). C'est le palier "stratégique"
 * qui récompense la spécialisation au-delà du simple déblocage
 * de choix de crise.
 */
export type BranchId = "shield" | "sovereignty" | "society" | "knowledge";

export type DoctrineId =
  | "doctrine_forteresse"
  | "doctrine_autonomie"
  | "doctrine_resilience"
  | "doctrine_savoir";

export interface BranchDef {
  id: BranchId;
  label: string;
  description: string;
  emoji: string;
  /** Couleur d'accent du sceau / barre de progression de la branche. */
  accentColor: string;
  /** Liste ordonnée des axes appartenant à cette branche. */
  techIds: TechId[];
  /** Doctrine débloquée à 100% de complétion. */
  doctrineId: DoctrineId;
}

export interface DoctrineDef {
  id: DoctrineId;
  branchId: BranchId;
  label: string;
  /** Phrase courte pour le sceau d'activation. */
  headline: string;
  /** Description longue de l'effet pour le journal et le sceau. */
  summary: string;
  accentColor: string;
}

export const BRANCHES: BranchDef[] = [
  {
    id: "shield",
    label: "Bouclier — Défense & Sécurité",
    description:
      "Cyber, drones, antimissile : la souveraineté commence par " +
      "la capacité à se défendre.",
    emoji: "🛡",
    accentColor: "#dc2626",
    techIds: ["cyber_security", "surveillance_drones", "antimissile_shield"],
    doctrineId: "doctrine_forteresse",
  },
  {
    id: "sovereignty",
    label: "Souveraineté — Économie & Énergie",
    description:
      "Réseau, énergie, industrie : reprendre la main sur les " +
      "chaînes critiques de la nation.",
    emoji: "⚙️",
    accentColor: "#f59e0b",
    techIds: ["electric_grid", "sovereign_energy", "strategic_industry"],
    doctrineId: "doctrine_autonomie",
  },
  {
    id: "society",
    label: "Société — Santé & Territoire",
    description:
      "Hôpitaux et agriculture : protéger les corps et nourrir " +
      "le pays, partout.",
    emoji: "🏥",
    accentColor: "#22c55e",
    techIds: ["digital_hospitals", "smart_agriculture"],
    doctrineId: "doctrine_resilience",
  },
  {
    id: "knowledge",
    label: "Savoir — État & Connaissance",
    description:
      "IA d'État et éducation scientifique : penser et décider " +
      "plus vite que la crise.",
    emoji: "🎓",
    accentColor: "#0891b2",
    techIds: ["admin_ai", "science_education"],
    doctrineId: "doctrine_savoir",
  },
];

export const DOCTRINES: Record<DoctrineId, DoctrineDef> = {
  doctrine_forteresse: {
    id: "doctrine_forteresse",
    branchId: "shield",
    label: "Forteresse numérique",
    headline: "Le pays riposte avant même d'être touché.",
    summary:
      "Les 2 prochaines attaques cyber ou hybrides seront " +
      "automatiquement neutralisées par vos systèmes de défense.",
    accentColor: "#dc2626",
  },
  doctrine_autonomie: {
    id: "doctrine_autonomie",
    branchId: "sovereignty",
    label: "Autonomie stratégique",
    headline: "La République ne dépend plus de personne.",
    summary:
      "Les chocs économiques et budgétaires sont réduits de moitié " +
      "et l'État engrange +1 budget à chaque tour, jusqu'à la fin du mandat.",
    accentColor: "#f59e0b",
  },
  doctrine_resilience: {
    id: "doctrine_resilience",
    branchId: "society",
    label: "République résiliente",
    headline: "Les corps et les terres tiennent debout.",
    summary:
      "Bonus immédiat de +2 popularité. Les chocs santé et popularité " +
      "subis seront réduits de moitié jusqu'à la fin du mandat.",
    accentColor: "#22c55e",
  },
  doctrine_savoir: {
    id: "doctrine_savoir",
    branchId: "knowledge",
    label: "République savante",
    headline: "Les laboratoires sont au rendez-vous.",
    summary:
      "Sur chaque crise, une option supplémentaire « Consulter les " +
      "laboratoires » est proposée, et le climat médiatique gagne +1 par tour.",
    accentColor: "#0891b2",
  },
};

/** O(1) lookup pour retrouver la branche d'un axe donné. */
const TECH_TO_BRANCH: Map<TechId, BranchId> = new Map(
  BRANCHES.flatMap((b) => b.techIds.map((t) => [t, b.id] as [TechId, BranchId])),
);

export function getBranchOfTech(id: TechId): BranchId {
  const b = TECH_TO_BRANCH.get(id);
  if (!b) {
    throw new Error(`getBranchOfTech: tech "${id}" is not assigned to a branch`);
  }
  return b;
}

export function getBranch(id: BranchId): BranchDef {
  const b = BRANCHES.find((x) => x.id === id);
  if (!b) throw new Error(`getBranch: unknown branch "${id}"`);
  return b;
}

export function getDoctrine(id: DoctrineId): DoctrineDef {
  return DOCTRINES[id];
}

/**
 * Module 7 — Arbre technologique national.
 *
 * 10 axes de R&D, chacun avec :
 *  - costs        : coût en RESSOURCES (LOT 18.2) prélevé en ONE-SHOT
 *                   au démarrage de la recherche. Combinaison de
 *                   budgetNational (crédits absolus), politicalInfluence,
 *                   intelligence, technology, energy. Toutes les clés
 *                   sont optionnelles : ne sont débitées que celles
 *                   présentes et > 0. Les coûts sont calibrés pour
 *                   FORCER des choix : avec les ressources de départ
 *                   (5000/50/30/20/60), on peut lancer 1-2 recherches
 *                   sans attendre la régénération mensuelle (LOT 18.3).
 *  - durationTurns: nombre de tours nécessaires avant que la techno
 *                   soit marquée comme acquise. À l'instant `t` du
 *                   démarrage, `completedTurn = t + durationTurns`.
 *  - unlocksLabel : courte description de ce que la techno débloque
 *                   (affichée sur la carte de la page Recherche).
 *
 * Logique d'attribution des coûts :
 *  - cyber/drones/antimissile (Bouclier) → tech + intelligence dominants
 *  - réseau/énergie/industrie (Souveraineté) → energy + tech dominants
 *  - hôpitaux/agriculture (Société) → influence + tech, dépenses
 *    sociales lourdes en budget
 *  - IA admin / éducation (Savoir) → influence + tech légers
 *  - antimissile et énergie souveraine sont les plus chers (axes
 *    "stratégiques" qui exigent un sacrifice budgétaire majeur).
 *
 * IMPORTANT : ce module ne référence AUCUN pays/personne/organisme
 * étranger réel. Les libellés sont volontairement génériques pour
 * rester conformes Apple/Google.
 */
export interface TechNode {
  id: TechId;
  label: string;
  description: string;
  emoji: string;
  /** Couleur d'accent pour la carte (Tailwind/hex). */
  color: string;
  /** Coût en RESSOURCES débité ONE-SHOT au démarrage (LOT 18.2). */
  costs: ResourceCosts;
  /** Nombre de tours avant complétion. */
  durationTurns: number;
  /** Courte description de l'effet une fois acquise. */
  unlocksLabel: string;
  /** "civil" ou "militaire" — sert au filtre visuel + narratif. */
  branch: "civil" | "military";
}

export const TECH_TREE: Record<TechId, TechNode> = {
  cyber_security: {
    id: "cyber_security",
    label: "Cybersécurité nationale",
    description:
      "Renforcement massif des systèmes critiques (hôpitaux, " +
      "réseaux, administration) contre les attaques informatiques.",
    emoji: "🛡",
    color: "#6366f1",
    costs: {
      budgetNational: 250,
      technology: 12,
      intelligence: 10,
    },
    durationTurns: 4,
    unlocksLabel:
      "Débloque une riposte cyber lors des attaques (rançongiciels, " +
      "fuites massives).",
    branch: "civil",
  },
  electric_grid: {
    id: "electric_grid",
    label: "Réseau électrique résilient",
    description:
      "Modernisation du réseau de transport et de distribution : " +
      "redondance, micro-réseaux locaux, anti-effondrement en cascade.",
    emoji: "⚡",
    color: "#f59e0b",
    costs: {
      budgetNational: 450,
      energy: 18,
      technology: 10,
    },
    durationTurns: 5,
    unlocksLabel:
      "Débloque une option « bascule micro-réseaux » lors des " +
      "blackouts ou crises énergétiques.",
    branch: "civil",
  },
  surveillance_drones: {
    id: "surveillance_drones",
    label: "Drones de surveillance",
    description:
      "Flotte de drones civils et militaires pour le renseignement, " +
      "la lutte anti-feu, et la surveillance des frontières.",
    emoji: "🛰",
    color: "#0ea5e9",
    costs: {
      budgetNational: 200,
      intelligence: 14,
      technology: 8,
    },
    durationTurns: 3,
    unlocksLabel:
      "Débloque une option de surveillance ciblée en cas de troubles " +
      "ou de catastrophes.",
    branch: "military",
  },
  smart_agriculture: {
    id: "smart_agriculture",
    label: "Agriculture intelligente",
    description:
      "Capteurs, IA et irrigation de précision pour sécuriser les " +
      "rendements face aux sécheresses et à la pression climatique.",
    emoji: "🌾",
    color: "#22c55e",
    costs: {
      budgetNational: 220,
      technology: 8,
      energy: 6,
    },
    durationTurns: 4,
    unlocksLabel:
      "Débloque une option « plan agro-climatique » lors des crises " +
      "alimentaires ou de sécheresse.",
    branch: "civil",
  },
  admin_ai: {
    id: "admin_ai",
    label: "IA administrative",
    description:
      "Automatisation du back-office d'État (impôts, prestations, " +
      "préfectures) pour libérer du budget et accélérer les décisions.",
    emoji: "🧠",
    color: "#a855f7",
    costs: {
      budgetNational: 180,
      technology: 10,
      politicalInfluence: 6,
    },
    durationTurns: 3,
    unlocksLabel:
      "Débloque une option « guichet unique IA » lors des crises " +
      "sociales ou administratives.",
    branch: "civil",
  },
  digital_hospitals: {
    id: "digital_hospitals",
    label: "Hôpitaux numériques",
    description:
      "Dossier patient unifié, télémédecine, blocs robotisés. " +
      "Réduit la charge sur les urgences saturées.",
    emoji: "🏥",
    color: "#ef4444",
    costs: {
      budgetNational: 380,
      technology: 12,
      politicalInfluence: 8,
    },
    durationTurns: 4,
    unlocksLabel:
      "Débloque une option « bascule télé-soins » lors des crises " +
      "sanitaires ou de saturation hospitalière.",
    branch: "civil",
  },
  sovereign_energy: {
    id: "sovereign_energy",
    label: "Énergie souveraine",
    description:
      "Mix nucléaire nouvelle génération + renouvelables locales " +
      "pour réduire la dépendance aux importations stratégiques.",
    emoji: "🔋",
    color: "#84cc16",
    costs: {
      budgetNational: 700,
      energy: 25,
      technology: 14,
    },
    durationTurns: 6,
    unlocksLabel:
      "Débloque une option « relance autonomie énergétique » et " +
      "réduit la dépendance étrangère.",
    branch: "civil",
  },
  antimissile_shield: {
    id: "antimissile_shield",
    label: "Défense antimissile",
    description:
      "Bouclier multi-couches contre missiles balistiques, drones " +
      "kamikazes et essaims hostiles. Coûteux mais dissuasif.",
    emoji: "🚀",
    color: "#dc2626",
    costs: {
      budgetNational: 800,
      technology: 16,
      intelligence: 12,
      politicalInfluence: 8,
    },
    durationTurns: 5,
    unlocksLabel:
      "Débloque une option d'interception lors des crises militaires " +
      "ou des frappes ennemies.",
    branch: "military",
  },
  science_education: {
    id: "science_education",
    label: "Éducation scientifique",
    description:
      "Investissement massif dans les filières STEM, recherche " +
      "fondamentale, bourses doctorales et chaires d'excellence.",
    emoji: "🎓",
    color: "#0891b2",
    costs: {
      budgetNational: 280,
      politicalInfluence: 10,
      technology: 6,
    },
    durationTurns: 5,
    unlocksLabel:
      "Débloque une option « mobilisation des laboratoires » lors " +
      "des crises sanitaires, technologiques ou industrielles.",
    branch: "civil",
  },
  strategic_industry: {
    id: "strategic_industry",
    label: "Industrie stratégique",
    description:
      "Relocalisation de la production de semi-conducteurs, " +
      "batteries et pharmacie critique. Réduit les ruptures de " +
      "chaîne d'approvisionnement.",
    emoji: "🏭",
    color: "#a16207",
    costs: {
      budgetNational: 550,
      technology: 14,
      energy: 12,
    },
    durationTurns: 5,
    unlocksLabel:
      "Débloque une option « réquisition industrielle » lors des " +
      "ruptures de chaîne ou des crises économiques.",
    branch: "civil",
  },
};

export const TECH_TREE_KEYS: TechId[] = Object.keys(TECH_TREE) as TechId[];

/** Helpers de lookup déterministes. */
export function getTechNode(id: TechId): TechNode {
  return TECH_TREE[id];
}
