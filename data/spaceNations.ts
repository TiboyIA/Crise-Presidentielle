/**
 * data/spaceNations.ts — Les 7 nations de l'assemblée interstellaire.
 *
 * Ces entités observent l'humanité depuis les marges connues.
 * Elles n'interviennent jamais directement dans le gameplay : leurs positions
 * se reflètent dans des événements rares du Journal de Crise.
 */

export type SpaceNationId =
  | "aurora_prime"
  | "veyrion"
  | "solmeria"
  | "kharon_nox"
  | "elyndra"
  | "orionis"
  | "noctyra";

export type NationAlignment =
  | "protector"
  | "scientific"
  | "diplomatic"
  | "suspicious"
  | "moral"
  | "defensive"
  | "ambiguous";

export type NationDisposition =
  | "favorable"
  | "bienveillant"
  | "neutre"
  | "sceptique"
  | "hostile"
  | "infiltré";

export interface SpaceNationDef {
  id:          SpaceNationId;
  name:        string;
  icon:        string;    // MaterialCommunityIcons
  color:       string;
  alignment:   NationAlignment;
  role:        string;    // Titre court du rôle
  description: string;
  observes:    string;    // Ce qu'elle observe dans les décisions terrestres
  warnedBy:    string;    // Ce qui la rend hostile
  linkedTo:    string;    // Sphère d'influence narrative (ex: "Auroria")
}

export const SPACE_NATIONS: Record<SpaceNationId, SpaceNationDef> = {

  aurora_prime: {
    id:          "aurora_prime",
    name:        "Aurora Prime",
    icon:        "star-circle-outline",
    color:       "#7ec8f7",
    alignment:   "protector",
    role:        "Protectrice de l'humanité",
    description: "La nation fondatrice d'Auroria. Elle défend le droit de l'humanité à l'autodétermination et surveille chaque signe de progrès ou de régression.",
    observes:    "Stabilité institutionnelle, cohésion sociale, transparence des décisions",
    warnedBy:    "Corruption, mensonges d'État, autoritarisme répété",
    linkedTo:    "Auroria",
  },

  veyrion: {
    id:          "veyrion",
    name:        "Veyrion",
    icon:        "atom-variant",
    color:       "#a3d977",
    alignment:   "scientific",
    role:        "Observatrice scientifique",
    description: "Civilisation d'ingénieurs froids. Elle juge l'humanité uniquement sur ses résultats : efficacité des réformes, investissement technologique, gestion des ressources.",
    observes:    "Niveau de recherche, efficacité économique, cohérence des décisions",
    warnedBy:    "Gaspillage de ressources, populisme sans résultat, dette incontrôlée",
    linkedTo:    "Auroria",
  },

  solmeria: {
    id:          "solmeria",
    name:        "Solméria",
    icon:        "handshake-outline",
    color:       "#f7c948",
    alignment:   "diplomatic",
    role:        "Diplomate galactique",
    description: "Nation fondée sur le dialogue entre civilisations. Juge l'humanité sur sa capacité à construire la paix, à nouer des alliances durables et à résoudre les conflits sans violence.",
    observes:    "Relations internationales, alliances, résolution diplomatique des crises",
    warnedBy:    "Guerres inutiles, isolationnisme extrême, provocations répétées",
    linkedTo:    "Auroria",
  },

  kharon_nox: {
    id:          "kharon_nox",
    name:        "Kharon-Nox",
    icon:        "shield-alert-outline",
    color:       "#f47b6c",
    alignment:   "suspicious",
    role:        "Juge des risques de guerre",
    description: "Méfiant par nature, Kharon-Nox surveille les capacités militaires terrestres. Elle tolère la défense, mais considère la militarisation excessive comme une menace galactique.",
    observes:    "Niveau militaire, opérations cyber, doctrines de guerre, tensions régionales",
    warnedBy:    "Militarisation excessive, attaques cyber offensives, provocations armées",
    linkedTo:    "Conseil",
  },

  elyndra: {
    id:          "elyndra",
    name:        "Elyndra",
    icon:        "scale-balance",
    color:       "#c9a84c",
    alignment:   "moral",
    role:        "Gardienne de la mémoire morale",
    description: "Civilisation qui mesure la valeur d'un gouvernement aux promesses tenues et à la protection des plus vulnérables. Elle conserve l'historique de chaque décision.",
    observes:    "Promesses de campagne, protection des civils, cohésion sociale",
    warnedBy:    "Promesses rompues systématiquement, scandales étouffés, populisme cynique",
    linkedTo:    "Auroria",
  },

  orionis: {
    id:          "orionis",
    name:        "Orionis",
    icon:        "sword-cross",
    color:       "#9b6fd4",
    alignment:   "defensive",
    role:        "Force de défense galactique",
    description: "N'intervient que contre une menace majeure ou en réponse à une infiltration active d'Obscurium. En temps normal, reste silencieux et observe depuis la périphérie.",
    observes:    "Présence active d'Obscurium, effondrement institutionnel, menace systémique",
    warnedBy:    "Obscurium en phase avancée, corruption totale des institutions",
    linkedTo:    "Auroria",
  },

  noctyra: {
    id:          "noctyra",
    name:        "Noctyra",
    icon:        "eye-outline",
    color:       "#8899bb",
    alignment:   "ambiguous",
    role:        "Officiellement neutre",
    description: "Se présente comme arbitre impartial du Conseil. En réalité, pousse subtilement vers le chaos, les décisions faciles et les fractures sociales. Son influence est rarement directe.",
    observes:    "Points de fracture sociale, fatigue populaire, décisions autoritaires",
    warnedBy:    "Cohésion haute, transparence, institutions solides — ce qu'elle cherche à éroder",
    linkedTo:    "Obscurium (secret)",
  },

} as const;

export const SPACE_NATION_LIST: SpaceNationDef[] = Object.values(SPACE_NATIONS);

export const DISCOVERY_STAGE_LABELS: Record<string, string> = {
  hidden:               "Aucun signal détecté",
  signal:               "Signal non identifié capté",
  indirect_contact:     "Contact indirect établi",
  council_divided:      "Conseil divisé sur l'humanité",
  limited_assistance:   "Assistance conditionnelle d'Aurora",
  surveillance:         "Mise sous surveillance du Conseil",
  obscurium_infiltration: "Infiltration d'Obscurium détectée",
};
