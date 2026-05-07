export type MinisterPosition =
  | "pm"
  | "interior"
  | "economy"
  | "foreign"
  | "ecology"
  | "defense";

/**
 * Module 3 — Spécialité personnelle d'un·e ministre.
 *
 * Indépendante du portefeuille (un ministre de l'Économie peut être
 * spécialiste "communication", ce qui en fait un excellent porte-voix
 * mais un piètre stratège budgétaire). La spécialité conditionne :
 *  - le BONUS appliqué quand une décision touche son domaine ;
 *  - la couleur de l'étiquette affichée sur la fiche ;
 *  - la "voix" attribuée à ce ministre dans certains scénarios.
 */
export type MinisterSpecialty =
  | "economy"
  | "social"
  | "security"
  | "diplomacy"
  | "ecology"
  | "communication";

export const SPECIALTY_LABELS: Record<MinisterSpecialty, string> = {
  economy: "Économie",
  social: "Social",
  security: "Sécurité",
  diplomacy: "Diplomatie",
  ecology: "Écologie",
  communication: "Communication",
};

export interface Minister {
  position: MinisterPosition;
  positionLabel: string;
  name: string;
  /** 0-100. Combien le ministre te soutient personnellement. */
  loyalty: number;
  /** 0-100. Aptitude à délivrer dans son portefeuille. */
  competence: number;
  /** Nombre de scandales révélés contre ce ministre. */
  scandals: number;
  /**
   * Module 3 — Cote de popularité personnelle dans le grand public.
   * Bouge selon les jauges du portefeuille, les scandales et la
   * gestion des crises. Distinct de `loyalty` (loyauté = envers toi).
   */
  popularity: number;
  /**
   * Module 3 — Risque CACHÉ qu'un scandale éclate spontanément.
   * Augmente quand loyauté basse + ambition haute. Jamais affiché tel
   * quel : seule une étiquette d'alerte qualitative apparaît si > 60.
   */
  scandalRisk: number;
  /**
   * Module 3 — Ambition personnelle (envie de devenir Président).
   * Combinée à popularité haute + loyauté basse, déclenche la fronde
   * (`isRival = true`). Visible mi-couvert sur la fiche.
   */
  ambition: number;
  /** Module 3 — Spécialité personnelle (cf. `MinisterSpecialty`). */
  specialty: MinisterSpecialty;
  /**
   * Module 3 — Marquage permanent : ce ministre s'est ouvertement
   * démarqué du Président. Il alimente l'opposition tant qu'il reste
   * en poste, et apparaît dans les attaques de fin de mandat.
   */
  isRival: boolean;
}

const FIRST_NAMES = [
  "Élise",
  "Jean-Marc",
  "Sophie",
  "Antoine",
  "Lucile",
  "Vincent",
  "Margaux",
  "Bertrand",
  "Camille",
  "Hugo",
  "Aïcha",
  "Maxime",
  "Inès",
  "Pierre",
  "Léa",
  "Florent",
  "Diane",
  "Gabriel",
  "Julie",
  "Mehdi",
];

const LAST_NAMES = [
  "Vasseur",
  "Lemoine",
  "Bertrand",
  "Caron",
  "Dubreuil",
  "Marchand",
  "Roussel",
  "Lambert",
  "Aubry",
  "Faivre",
  "Mercier",
  "Vidal",
  "Garnier",
  "Perrin",
  "Bonnet",
  "Hadjadj",
  "Moreau",
  "Reynaud",
  "Charpentier",
  "Naulleau",
];

export const POSITION_LABELS: Record<MinisterPosition, string> = {
  pm: "Premier·e ministre",
  interior: "Ministre de l'Intérieur",
  economy: "Ministre de l'Économie",
  foreign: "Ministre des Affaires étrangères",
  ecology: "Ministre de la Transition écologique",
  defense: "Ministre des Armées",
};

export const POSITION_ICONS: Record<MinisterPosition, string> = {
  pm: "user",
  interior: "shield",
  economy: "trending-up",
  foreign: "globe",
  ecology: "wind",
  defense: "target",
};

/**
 * Module 3 — Distribution PROBABLE de spécialité par portefeuille.
 * Un ministre du portefeuille `defense` a 50 % de chances d'être un
 * spécialiste "security", mais peut aussi être communication
 * (général·e médiatique) ou diplomacy (diplomatie de défense).
 *
 * Cette diversité permet de produire les contre-exemples annoncés au
 * joueur : "un ministre de l'Économie spécialiste communication peut
 * vendre du vent", "un ministre de la Transition écologique
 * spécialiste économie cherche d'abord les économies budgétaires".
 */
const SPECIALTY_BIAS: Record<MinisterPosition, MinisterSpecialty[]> = {
  // PM = chef de la majorité, biais social/communication.
  pm: ["social", "communication", "communication", "economy", "diplomacy"],
  interior: ["security", "security", "communication", "social"],
  economy: ["economy", "economy", "communication", "social"],
  foreign: ["diplomacy", "diplomacy", "communication", "economy"],
  ecology: ["ecology", "ecology", "social", "economy"],
  defense: ["security", "security", "diplomacy", "communication"],
};

function randomName(): string {
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]!;
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]!;
  return `${fn} ${ln}`;
}

function randomStat(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function pickSpecialty(position: MinisterPosition): MinisterSpecialty {
  const pool = SPECIALTY_BIAS[position];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function createMinister(position: MinisterPosition): Minister {
  // Module 3 — corrélations qui rendent les ministres "vivants" :
  //  - loyauté basse → ambition légèrement plus forte ;
  //  - ambition haute → risque de scandale légèrement plus haut.
  // Le tirage reste large pour garder de la variété entre parties.
  const loyalty = randomStat(45, 80);
  const ambitionFloor = loyalty < 60 ? 35 : 15;
  const ambition = randomStat(ambitionFloor, 75);
  const scandalRiskFloor = ambition > 60 ? 20 : 5;
  return {
    position,
    positionLabel: POSITION_LABELS[position],
    name: randomName(),
    loyalty,
    competence: randomStat(40, 85),
    scandals: 0,
    popularity: randomStat(40, 70),
    scandalRisk: randomStat(scandalRiskFloor, 45),
    ambition,
    specialty: pickSpecialty(position),
    isRival: false,
  };
}

export function createInitialCabinet(): Minister[] {
  return (Object.keys(POSITION_LABELS) as MinisterPosition[]).map((p) =>
    createMinister(p),
  );
}
