import type { HiddenPolitics, NationalIndicators } from "@/types/strategy";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompressedBriefing {
  situation:      string;
  risque:         string;
  fenetreAction:  string;
  recommandation: string;
}

// ── Briefings statiques — 5 événements réécrits en format compressé ───────────

export const EVENT_BRIEFINGS: Record<string, CompressedBriefing> = {
  cyber_power_grid: {
    situation:      "Le réseau électrique national subit une attaque coordonnée.",
    risque:         "Sans réponse rapide, l'économie ralentit et l'opinion bascule dans la panique.",
    fenetreAction:  "La fenêtre critique est de 48 heures avant propagation totale.",
    recommandation: "Cyberdéfense nationale, riposte diplomatique ou restauration discrète.",
  },
  cyber_banking: {
    situation:      "Une faille zero-day expose des millions de comptes bancaires.",
    risque:         "L'exploitation imminente provoquerait une crise de confiance financière.",
    fenetreAction:  "Les pirates n'ont pas encore agi — chaque heure compte.",
    recommandation: "Correction d'urgence ou gestion discrète pour prévenir la panique.",
  },
  debt_crisis: {
    situation:      "Les marchés obligataires s'emballent face à la dette souveraine.",
    risque:         "Une dégradation de notation rendrait le financement insoutenable.",
    fenetreAction:  "Chaque heure d'inaction amplifie la pression des créanciers.",
    recommandation: "Austérité immédiate, emprunt court terme ou renégociation de la dette.",
  },
  social_unrest: {
    situation:      "Des millions de citoyens bloquent les grandes villes.",
    risque:         "Sans réponse, le mouvement se radicalise et renforce l'opposition.",
    fenetreAction:  "La mobilisation culmine — une semaine avant dispersion ou escalade.",
    recommandation: "Négociation, maintien du cap ou réforme symbolique.",
  },
  heatwave_crisis: {
    situation:      "Une canicule historique paralyse le pays et sature les hôpitaux.",
    risque:         "L'inaction sera perçue comme un échec climatique durable.",
    fenetreAction:  "Le pic thermique dure encore 72 heures — l'arbitrage est immédiat.",
    recommandation: "Plan d'urgence national, aides ciblées ou gestion de la communication.",
  },
};

// ── Axe critique — priorité de détection ─────────────────────────────────────

type CriticalAxis =
  | "pending"
  | "tension"
  | "scandal"
  | "opposition"
  | "media"
  | "popularity"
  | "economy"
  | "security"
  | "ecology"
  | "stable";

function detectCriticalAxis(
  ind: NationalIndicators,
  hp: HiddenPolitics,
  tension: number,
  pendingEvents: number,
  oppositionPower: number,
): CriticalAxis {
  if (pendingEvents > 0)        return "pending";
  if (tension >= 75)            return "tension";
  if (hp.scandalRisk > 70)      return "scandal";
  if (oppositionPower >= 65)    return "opposition";
  if (hp.mediaMood < 25)        return "media";
  if (ind.popularity < 25)      return "popularity";
  if (ind.economy < 25)         return "economy";
  if (ind.security < 25)        return "security";
  if (ind.ecology < 25)         return "ecology";
  return "stable";
}

// ── Briefings dynamiques par axe ─────────────────────────────────────────────

const AXIS_BRIEFINGS: Record<CriticalAxis, CompressedBriefing> = {
  pending: {
    situation:      "Des crises actives attendent votre arbitrage dans le Journal.",
    risque:         "Chaque décision différée amplifie l'instabilité et renforce l'opposition.",
    fenetreAction:  "Immédiat — la presse et les acteurs attendent votre position.",
    recommandation: "Consultez le Journal de Crise et tranchez.",
  },
  tension: {
    situation:      "La tension nationale a atteint un niveau critique.",
    risque:         "Un incident mineur suffit à déclencher une crise ouverte.",
    fenetreAction:  "Le seuil de rupture est proche — l'accumulation est structurelle.",
    recommandation: "Stabilisez la cohésion, relâchez la pression ou anticipez l'escalade.",
  },
  scandal: {
    situation:      "Le risque de scandale dépasse le seuil de tolérance médiatique.",
    risque:         "Une révélation publique effacerait plusieurs semaines de crédibilité.",
    fenetreAction:  "La presse hostile attend une faille — agissez avant qu'elle l'exploite.",
    recommandation: "Renforcez la transparence ou gérez le risque médiatique en amont.",
  },
  opposition: {
    situation:      "L'opposition est en position de force et conteste chaque décision.",
    risque:         "Un vote de défiance ou une crise d'autorité est possible à court terme.",
    fenetreAction:  "La pression institutionnelle monte — reprenez l'initiative.",
    recommandation: "Décision visible et symbolique pour regagner la légitimité.",
  },
  media: {
    situation:      "Le climat médiatique est hostile — chaque annonce est retournée contre vous.",
    risque:         "La narrative publique vous échappe, exposant chaque mesure à la critique.",
    fenetreAction:  "La prochaine crise sera le test — maîtrisez le cadrage maintenant.",
    recommandation: "Changez de registre communicationnel ou pratiquez la transparence.",
  },
  popularity: {
    situation:      "L'indice de popularité est en zone critique.",
    risque:         "Une opinion publique fracturée fragilise l'ensemble du mandat.",
    fenetreAction:  "La tendance est structurelle — une action visible est nécessaire ce cycle.",
    recommandation: "Priorité au dialogue social et aux décisions à forte résonance populaire.",
  },
  economy: {
    situation:      "Les indicateurs économiques montrent une dégradation structurelle.",
    risque:         "Sans stimulus, la spirale négative s'auto-entretient.",
    fenetreAction:  "Le prochain rapport de notation intervient dans les prochains cycles.",
    recommandation: "Stimulus ciblé, réforme budgétaire ou attractivité des investissements.",
  },
  security: {
    situation:      "Le niveau de sécurité nationale est insuffisant.",
    risque:         "Une capacité défensive dégradée expose le territoire à des incidents.",
    fenetreAction:  "L'opportunité de renforcement est ouverte avant la prochaine crise.",
    recommandation: "Investissements militaires, renseignement ou alliances stratégiques.",
  },
  ecology: {
    situation:      "Les indicateurs écologiques sont sous le seuil d'alerte.",
    risque:         "La dégradation environnementale alimentera la prochaine crise sociale.",
    fenetreAction:  "La pression internationale s'intensifie à chaque sommet climatique.",
    recommandation: "Plan climatique d'urgence ou régulation des industries émettrices.",
  },
  stable: {
    situation:      "La situation est globalement stabilisée sur tous les fronts.",
    risque:         "La stabilité peut masquer des tensions si les signaux cachés se dégradent.",
    fenetreAction:  "Ce calme est une fenêtre pour des réformes structurantes.",
    recommandation: "Consolidez les acquis et anticipez les prochaines crises.",
  },
};

// ── API publique ──────────────────────────────────────────────────────────────

export function generateStateBriefing(
  nationalIndicators: NationalIndicators,
  hiddenPolitics: HiddenPolitics,
  pendingEvents: number,
  oppositionPower: number,
  tension: number,
): CompressedBriefing {
  const axis = detectCriticalAxis(nationalIndicators, hiddenPolitics, tension, pendingEvents, oppositionPower);
  return AXIS_BRIEFINGS[axis];
}

export function getEventBriefing(eventId: string): CompressedBriefing | null {
  return EVENT_BRIEFINGS[eventId] ?? null;
}
