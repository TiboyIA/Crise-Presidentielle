/**
 * Module 5 — Banque de slogans déterministes pour l'opposition.
 *
 * L'opposition cogne sur les faiblesses du président via des
 * "lignes d'attaque" persistantes (voir `logic/oppositionLines.ts`).
 * Plus une faiblesse PERSISTE, plus l'opposition durcit le ton.
 *
 * Trois tranches de durée :
 *   - "fresh"        (1-2 tours)  — premier coup, ton encore mesuré
 *   - "persistant"   (3-5 tours)  — accusation répétée, montée d'un cran
 *   - "obsessionnel" (6+ tours)   — leitmotiv, accusations frontales
 *
 * Tous les slogans sont en FRANÇAIS, courts (≤120 caractères pour
 * tenir sur 2 lignes mobiles), et NE CITENT JAMAIS de personnages
 * publics réels (Apple Store + diffamation). Ils peuvent contenir :
 *   {turns}  — nombre de tours d'activité de la ligne
 *   {value}  — valeur factuelle de la jauge (passée par le moteur)
 *   {label}  — libellé de la promesse brisée (pour broken_promise)
 */
import type { OppositionAngle, OppositionSeverity } from "@/types/game";

export type AttackDuration = "fresh" | "persistant" | "obsessionnel";

/**
 * Une banque par (angle × durée). On laisse `severity` influencer le
 * choix au moteur — pas dans la data, sinon on explose la table.
 * Au moins 3 slogans par cellule pour la variété, plus pour les
 * angles les plus joués (budget, security, broken_promise, scandals).
 */
type SloganBank = Record<
  OppositionAngle,
  Record<AttackDuration, string[]>
>;

export const OPPOSITION_SLOGANS: SloganBank = {
  budget: {
    fresh: [
      "« Premier dérapage budgétaire — on s'inquiète déjà pour la suite. »",
      "« La dette monte. L'opposition demande un plan de redressement. »",
      "« Les comptes publics dérapent. Il faut une explication, vite. »",
    ],
    persistant: [
      "« Cela fait {turns} tours qu'on alerte sur la dette. Toujours rien. »",
      "« {turns} tours de laxisme budgétaire — la facture sera lourde. »",
      "« L'État vit à crédit depuis {turns} tours. Qui paiera ? »",
    ],
    obsessionnel: [
      "« {turns} tours d'irresponsabilité budgétaire. C'est un record. »",
      "« La dette explose depuis {turns} tours — et on continue de dépenser. »",
      "« Vous léguerez la facture à vos enfants. {turns} tours de dérive. »",
    ],
  },
  security: {
    fresh: [
      "« La sécurité décroche. Les Français doivent se sentir protégés. »",
      "« Premier signal d'alerte sécuritaire. Réagissez avant qu'il soit tard. »",
      "« L'État renonce à protéger ses citoyens ? On vous regarde. »",
    ],
    persistant: [
      "« {turns} tours d'insécurité croissante. Combien faudra-t-il de victimes ? »",
      "« La sécurité s'effondre depuis {turns} tours. Le pouvoir reste passif. »",
      "« {turns} tours de chaos rampant — et toujours pas de cap. »",
    ],
    obsessionnel: [
      "« {turns} tours sans réponse à la crise sécuritaire. Démission ? »",
      "« Le chaos sécuritaire dure depuis {turns} tours. Vous avez démissionné. »",
      "« {turns} tours d'impuissance face à l'insécurité. C'est insupportable. »",
    ],
  },
  ecology: {
    fresh: [
      "« L'écologie reléguée au second plan. Les engagements climatiques s'effacent. »",
      "« Premier renoncement écologique acté. Les générations futures jugeront. »",
      "« On abandonne le climat ? Premier coup de semonce. »",
    ],
    persistant: [
      "« {turns} tours d'inaction climatique. Le pays se déclasse. »",
      "« {turns} tours sans politique écologique cohérente. Honte. »",
      "« L'écologie sacrifiée depuis {turns} tours. Le climat n'attendra pas. »",
    ],
    obsessionnel: [
      "« {turns} tours de reculs climatiques. Vous brûlez l'avenir. »",
      "« {turns} tours d'inaction face au réchauffement. C'est criminel. »",
      "« Le mandat le plus anti-écologique de l'Histoire — {turns} tours et ça continue. »",
    ],
  },
  cohesion: {
    fresh: [
      "« Le pays se fracture sous votre mandat. Première alerte. »",
      "« La cohésion nationale se fissure. Vous diviser pour régner ? »",
      "« Premier signe de division — il est temps d'arrêter. »",
    ],
    persistant: [
      "« {turns} tours de division. Vous fracturez la France. »",
      "« {turns} tours d'opposition entre les Français. Bilan : zéro pointé. »",
      "« La fracture sociale s'aggrave depuis {turns} tours. Stoppez le carnage. »",
    ],
    obsessionnel: [
      "« {turns} tours de division systémique. Vous laisserez un pays cassé. »",
      "« La France n'a jamais été aussi divisée — {turns} tours de votre fait. »",
      "« {turns} tours à monter les Français les uns contre les autres. C'est votre marque. »",
    ],
  },
  broken_promise: {
    fresh: [
      "« Promesse trahie : « {label} ». Première de la liste, on garde le compte. »",
      "« Vous aviez promis « {label} ». Vous l'avez abandonné. Démission morale. »",
      "« « {label} » — engagement renié. Les électeurs s'en souviendront. »",
    ],
    persistant: [
      "« {turns} tours qu'on vous rappelle votre promesse trahie : « {label} ». »",
      "« « {label} » : promesse jetée à la poubelle depuis {turns} tours. »",
      "« {turns} tours de mensonge sur « {label} ». La parole publique en miettes. »",
    ],
    obsessionnel: [
      "« « {label} » — la trahison qui vous suit depuis {turns} tours. Indélébile. »",
      "« {turns} tours après votre reniement sur « {label} », rien n'a changé. »",
      "« Le symbole de votre mandat : la promesse brisée « {label} ». »",
    ],
  },
  popularity: {
    fresh: [
      "« Premier décrochage dans l'opinion. Le peuple commence à comprendre. »",
      "« La popularité s'effrite. Premier signal du désaveu. »",
      "« Les Français lâchent le pouvoir — premier sondage en chute. »",
    ],
    persistant: [
      "« {turns} tours dans le rouge dans les sondages. Le peuple a tranché. »",
      "« Popularité au plancher depuis {turns} tours. Tirez les conclusions. »",
      "« {turns} tours de rejet populaire. Quand allez-vous l'entendre ? »",
    ],
    obsessionnel: [
      "« {turns} tours de désaveu massif. Vous gouvernez contre le pays. »",
      "« {turns} tours de bunker élyséen. Le peuple n'est plus avec vous. »",
      "« {turns} tours de gouvernement minoritaire dans l'opinion. Démission. »",
    ],
  },
  scandals: {
    fresh: [
      "« Une affaire éclate. Premier scandale d'une longue série ? »",
      "« Scandale révélé. La République mérite mieux. »",
      "« Le voile se déchire — premier scandale, premiers comptes à rendre. »",
    ],
    persistant: [
      "« {turns} tours d'affaires en cascade. La probité publique en lambeaux. »",
      "« Les scandales s'accumulent depuis {turns} tours. Ménage en haut lieu, vite. »",
      "« {turns} tours de République des copains. La justice doit faire son travail. »",
    ],
    obsessionnel: [
      "« {turns} tours d'affaires d'État. Votre mandat est une page noire. »",
      "« {turns} tours de scandales — un record démocratique inquiétant. »",
      "« La République des affaires — votre signature, depuis {turns} tours. »",
    ],
  },
  authority: {
    fresh: [
      "« L'autorité de l'État vacille. Premier signe d'effondrement. »",
      "« Premier coup à l'autorité présidentielle. La verticalité s'efface. »",
      "« L'État perd la main. Premier signal d'alarme institutionnel. »",
    ],
    persistant: [
      "« {turns} tours sans autorité présidentielle. La maison brûle. »",
      "« {turns} tours d'effacement institutionnel. Qui dirige encore ? »",
      "« L'État spectateur depuis {turns} tours. Le vide est dangereux. »",
    ],
    obsessionnel: [
      "« {turns} tours sans capitaine à bord. La République flotte. »",
      "« {turns} tours de présidence évanescente. Démission ? »",
      "« {turns} tours d'autorité fantôme. Le pouvoir est ailleurs. »",
    ],
  },
};

/** Bornes de la classification de durée. Exposé pour les tests. */
export function classifyDuration(turnsActive: number): AttackDuration {
  if (turnsActive >= 6) return "obsessionnel";
  if (turnsActive >= 3) return "persistant";
  return "fresh";
}

/** Libellé court FR de l'angle, pour les badges UI. */
export const ANGLE_LABELS_FR: Record<OppositionAngle, string> = {
  budget: "DÉRIVE BUDGÉTAIRE",
  security: "INSÉCURITÉ",
  ecology: "RECULS ÉCOLOGIQUES",
  cohesion: "DIVISION DU PAYS",
  broken_promise: "PROMESSE TRAHIE",
  popularity: "REJET POPULAIRE",
  scandals: "SCANDALES D'ÉTAT",
  authority: "VACANCE DU POUVOIR",
};

/** Couleur d'accent par sévérité, pour les bandeaux UI. */
export const SEVERITY_COLORS: Record<OppositionSeverity, string> = {
  low: "#a37b1d",
  medium: "#c97a1d",
  high: "#c0392b",
};
