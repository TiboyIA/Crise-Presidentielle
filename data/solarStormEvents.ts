import type { NewsEvent } from "@/types/strategy";

export const SOLAR_STORM_EVENTS: NewsEvent[] = [

  // ── Tempête faible ────────────────────────────────────────────────────────
  {
    id:          "solar_storm_faible",
    title:       "Tempête solaire détectée — perturbations mineures",
    source:      "Centre National d'Études Spatiales",
    type:        "national",
    urgency:     "faible",
    description: "Une éruption solaire de classe modeste atteint la magnétosphère. Les réseaux HF et les satellites en orbite basse subissent des interférences légères. Aucun risque immédiat pour les infrastructures critiques.",
    isInteractive: true,
    conditionKey:  "solar_storm_faible",
    minActionsGap: 15,
    choices: [
      {
        id:          "solar_faible_proteger_reseau",
        label:       "Renforcer la protection du réseau électrique",
        consequence: "Les équipes techniques appliquent les protections préventives. Le réseau absorbe sans dommage les perturbations magnétiques.",
        effects:          { money: -200 },
        hiddenPoliticsEffects: { institutionalStability: +2 },
      },
      {
        id:          "solar_faible_securiser_hopitaux",
        label:       "Sécuriser les hôpitaux et communications critiques",
        consequence: "Les sites prioritaires sont mis en mode dégradé sécurisé. La population ne ressent aucune interruption de service.",
        effects:          { money: -150 },
        indicatorEffects: { popularity: +2 },
      },
      {
        id:          "solar_faible_minimiser",
        label:       "Maintenir les opérations habituelles",
        consequence: "La perturbation est absorbée passivement. Quelques interférences techniques passent inaperçues.",
        effects:          { money: 0 },
      },
    ],
  },

  // ── Tempête modérée ───────────────────────────────────────────────────────
  {
    id:          "solar_storm_moderee",
    title:       "Tempête solaire modérée — perturbations notables",
    source:      "Centre National d'Études Spatiales",
    type:        "national",
    urgency:     "moyenne",
    description: "Une tempête géomagnétique de classe G2 frappe les systèmes nationaux. La cyberdéfense est dégradée, les liaisons satellitaires perturbées et plusieurs réseaux de communication gouvernementale accusent des délais. Une réponse coordonnée est recommandée.",
    isInteractive: true,
    conditionKey:  "solar_storm_moderee",
    minActionsGap: 12,
    choices: [
      {
        id:          "solar_moderee_proteger_reseau",
        label:       "Protéger le réseau électrique en priorité",
        consequence: "La mise en protection évite les surtensions critiques. La production et la distribution d'énergie restent stables.",
        effects:          { money: -400 },
        hiddenPoliticsEffects: { institutionalStability: +3 },
      },
      {
        id:          "solar_moderee_prioriser_satellites",
        label:       "Prioriser la protection des satellites",
        consequence: "Les satellites vitaux sont réorientés hors des champs d'interférence. Le renseignement est préservé.",
        effects:          { money: -300, intelligence: +15 },
      },
      {
        id:          "solar_moderee_securiser_hopitaux",
        label:       "Sécuriser les hôpitaux et communications critiques",
        consequence: "Les établissements sensibles sont alimentés par des circuits dédiés. Aucune rupture de service pour les citoyens.",
        effects:          { money: -250 },
        indicatorEffects: { popularity: +4 },
      },
      {
        id:          "solar_moderee_minimiser",
        label:       "Minimiser pour éviter toute panique",
        consequence: "La communication officielle minimise l'ampleur de l'événement. La situation passe, mais des équipements non protégés subissent des dommages.",
        effects:          { money: 0 },
        indicatorEffects: { popularity: +1 },
      },
    ],
  },

  // ── Tempête forte ──────────────────────────────────────────────────────────
  {
    id:          "solar_storm_forte",
    title:       "ALERTE : Tempête solaire forte — crise sectorielle",
    source:      "Centre National d'Études Spatiales",
    type:        "national",
    urgency:     "forte",
    description: "Une tempête géomagnétique de classe G4 frappe l'ensemble des systèmes critiques. Communications militaires perturbées, cyberdéfense dégradée, opérations de renseignement compromises. Les opérateurs de réseau signalent des fluctuations d'ampleur anormale.",
    isInteractive: true,
    conditionKey:  "solar_storm_forte",
    minActionsGap: 10,
    choices: [
      {
        id:          "solar_forte_proteger_reseau",
        label:       "Mise en protection d'urgence du réseau électrique",
        consequence: "Les disjoncteurs spatiaux sont activés. La stabilité du réseau est préservée malgré la pression magnétique.",
        effects:          { money: -700 },
        hiddenPoliticsEffects: { institutionalStability: +4 },
      },
      {
        id:          "solar_forte_prioriser_satellites",
        label:       "Basculer les satellites en mode survie",
        consequence: "Les systèmes satellitaires sont mis en configuration protégée. Les liaisons stratégiques de renseignement sont sauvegardées.",
        effects:          { money: -500, intelligence: +25 },
      },
      {
        id:          "solar_forte_securiser_hopitaux",
        label:       "Sécuriser les hôpitaux, services d'urgence et communications gouvernementales",
        consequence: "Les infrastructures critiques pour la vie humaine bénéficient d'une alimentation de secours dédiée. Bon signal de solidarité institutionnelle.",
        effects:          { money: -450 },
        indicatorEffects: { popularity: +6, security: +2 },
      },
      {
        id:          "solar_forte_minimiser",
        label:       "Minimiser publiquement — éviter la panique",
        consequence: "La communication est volontairement prudente. La presse spécialisée commence pourtant à relayer des informations non officielles.",
        effects:          { money: 0 },
        indicatorEffects: { popularity: -2 },
        hiddenPoliticsEffects: { mediaMood: -5 },
      },
      {
        id:          "solar_forte_assistance_internationale",
        label:       "Demander une assistance scientifique internationale",
        consequence: "Des équipes internationales partagent leurs protocoles d'urgence. Le savoir-faire étranger compense la lacune technologique.",
        effects:          { influence: -20 },
        indicatorEffects: { economy: +1 },
        hiddenPoliticsEffects: { institutionalStability: +2 },
      },
    ],
  },

  // ── Tempête extrême ───────────────────────────────────────────────────────
  {
    id:          "solar_storm_extreme",
    title:       "CRISE MAJEURE : Tempête solaire extrême — risque systémique",
    source:      "Centre National d'Études Spatiales / État-Major",
    type:        "national",
    urgency:     "critique",
    description: "Une éruption solaire de classe X-max frappe en plein les systèmes nationaux. Risque de blackout généralisé si le réseau est déjà fragilisé. Les communications militaires sont sévèrement compromises. Décision présidentielle immédiate requise.",
    isInteractive: true,
    conditionKey:  "solar_storm_extreme",
    minActionsGap: 8,
    choices: [
      {
        id:          "solar_extreme_proteger_reseau",
        label:       "Déploiement maximal — protection du réseau électrique national",
        consequence: "Toutes les équipes de crise sont mobilisées. Le réseau national résiste à la tempête. Coût élevé, mais le blackout est évité.",
        effects:          { money: -1200 },
        hiddenPoliticsEffects: { institutionalStability: +6 },
      },
      {
        id:          "solar_extreme_prioriser_satellites",
        label:       "Mise en survie des actifs satellitaires stratégiques",
        consequence: "Les satellites de défense et de renseignement sont sauvés de justesse. La capacité de surveillance nationale est préservée.",
        effects:          { money: -900, intelligence: +35 },
      },
      {
        id:          "solar_extreme_securiser_hopitaux",
        label:       "Sécuriser en priorité les vies humaines et les communications critiques",
        consequence: "Les hôpitaux, les centres d'urgence et les liaisons gouvernementales bénéficient d'une alimentation de crise. Le coût politique est fort, mais la confiance populaire tient.",
        effects:          { money: -800 },
        indicatorEffects: { popularity: +10, security: +4 },
      },
      {
        id:          "solar_extreme_assistance_internationale",
        label:       "Coordination internationale d'urgence",
        consequence: "La mobilisation scientifique internationale permet un partage immédiat des protocoles de survie. La technologie acquise pendant la crise renforce durablement les systèmes.",
        effects:          { influence: -35, technology: +15 },
        hiddenPoliticsEffects: { institutionalStability: +3 },
        indicatorEffects: { economy: +1 },
      },
    ],
  },

];
