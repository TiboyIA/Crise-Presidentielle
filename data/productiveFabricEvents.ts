/**
 * productiveFabricEvents.ts — Événements MODE DELTA Tissu Productif National.
 *
 * 6 événements :
 *   1. État du tissu productif   — bilan économique général (auto, faible)
 *   2. Crise des PME             — smeHealth critique (interactive, forte)
 *   3. Désertification commerciale — localCommerce en chute (interactive, forte)
 *   4. Dynamique startups        — opportunité innovation (interactive, moyenne)
 *   5. Alerte industrie stratégique — vulnérabilité souveraineté (interactive, critique)
 *   6. Plan champions industriels — groupes fragilisés + déficit commercial (interactive, forte)
 *
 * Aucune microgestion. Aucun nom d'entreprise réel. Aucune simulation financière.
 */

import type { NewsEvent } from "@/types/strategy";

export const PRODUCTIVE_FABRIC_EVENTS: NewsEvent[] = [
  // ── 1. État du tissu productif — bilan précoce ────────────────────────────────
  {
    id:          "fabric_overview",
    title:       "Bilan du tissu productif — signaux préoccupants",
    source:      "Direction Générale des Affaires Économiques",
    type:        "economie",
    urgency:     "faible",
    description: "Le bilan trimestriel fictif du tissu productif identifie des fragilités structurelles. Plusieurs segments — PME, commerce local ou industrie stratégique — affichent des indicateurs en recul. Un diagnostic approfondi permettrait d'orienter les ressources là où l'intervention produit le plus d'effet.",
    isInteractive: false,
    autoEffects:   {},
    conditionKey:  "fabric_overview",
    minActionsGap: 20,
  },

  // ── 2. Crise des PME — fragmentation du tissu local ──────────────────────────
  {
    id:          "sme_crisis",
    title:       "Crise des PME — le tissu productif local se fragmente",
    source:      "Confédération Nationale des Petites et Moyennes Entreprises",
    type:        "economie",
    urgency:     "forte",
    description: "Les indicateurs fictifs des PME nationales signalent un niveau critique. La conjonction de charges élevées, d'une demande locale fragilisée et d'un accès au financement tendu pèse sur les structures les plus vulnérables. Le tissu économique local se fragmente, entraînant une hausse du chômage de proximité et une dégradation de la cohésion territoriale.",
    isInteractive: true,
    conditionKey:  "sme_crisis",
    minActionsGap: 12,
    choices: [
      {
        id:                    "plan_pme_urgence",
        label:                 "Plan PME — soutien d'urgence ciblé",
        consequence:           "Un plan fictif de soutien d'urgence est activé : allégement temporaire des charges, accès facilité au crédit interentreprises, accompagnement des structures en difficulté. Le tissu PME commence à se stabiliser. L'emploi local repart progressivement.",
        effects:               { money: -250 },
        indicatorEffects:      {},
        smeHealthDelta:        16,
        localCommerceDelta:    6,
      },
      {
        id:                    "simplification_administrative",
        label:                 "Simplification administrative accélérée",
        consequence:           "Le gouvernement décide de lever les obstacles bureaucratiques les plus pénalisants pour les petites structures. La simplification fictive réduit les coûts de conformité. Les PME retrouvent de la marge. L'économie informelle perd en attractivité relative.",
        effects:               { money: -120, technology: -10 },
        indicatorEffects:      {},
        smeHealthDelta:        10,
        shadowEconomyDelta:    -5,
        fiscalConsentDelta:    5,
      },
      {
        id:                    "attente_normalisation_marche",
        label:                 "Attendre la normalisation du marché",
        consequence:           "Le gouvernement choisit de ne pas intervenir directement, tablant sur un rééquilibrage naturel. La crise continue de s'approfondir. Le tissu local se dégrade. Le chômage de proximité augmente.",
        effects:               {},
        indicatorEffects:      {},
        queuesDelayedConsequence: {
          id:           "sme_crisis_noaction_delay",
          delayActions: 10,
          effectType:   "indicator_effect",
          payload:      { cohesion: -2, economy: -1 },
        },
      },
    ],
  },

  // ── 3. Désertification commerciale — abandon des territoires ─────────────────
  {
    id:          "local_commerce_desert",
    title:       "Désertification commerciale — les territoires s'estiment abandonnés",
    source:      "Observatoire des Dynamiques Territoriales",
    type:        "social",
    urgency:     "forte",
    description: "Les relevés fictifs de l'Observatoire confirment une désertification du commerce local dans plusieurs bassins de vie. L'érosion du pouvoir d'achat, la concurrence déloyale et le recul de la population active locale ont précipité la fermeture de nombreuses structures de proximité. Le sentiment d'abandon territorial monte. La fatigue populaire s'aggrave.",
    isInteractive: true,
    conditionKey:  "local_commerce_desert",
    minActionsGap: 12,
    choices: [
      {
        id:                    "commande_publique_territoriale",
        label:                 "Commande publique locale et stratégique",
        consequence:           "Le gouvernement oriente une partie de la commande publique fictive vers les acteurs locaux. Les circuits courts sont privilégiés. Le commerce de proximité retrouve un débouché stable. Le tissu territorial se redynamise progressivement.",
        effects:               { money: -180 },
        indicatorEffects:      {},
        localCommerceDelta:    14,
        smeHealthDelta:        7,
      },
      {
        id:                    "soutien_commerce_proximite",
        label:                 "Fonds de soutien au commerce de proximité",
        consequence:           "Un fonds fictif d'aide au commerce local est créé : accompagnement numérique, aides à la transition, accès au foncier commercial. L'effet est réel mais progressif. Le sentiment d'abandon recule.",
        effects:               { money: -150 },
        indicatorEffects:      {},
        localCommerceDelta:    10,
        inequalityIndexDelta:  -4,
      },
      {
        id:                    "dynamique_marche_libre",
        label:                 "Laisser la dynamique du marché opérer",
        consequence:           "Le gouvernement considère que la recomposition commerciale est une évolution structurelle normale. Aucun soutien spécifique n'est apporté. La désertification continue. Le sentiment d'abandon se cristallise en ressentiment durable.",
        effects:               {},
        indicatorEffects:      {},
        queuesDelayedConsequence: {
          id:           "local_desert_backlash",
          delayActions: 8,
          effectType:   "hidden_politics",
          payload:      { popularFatigue: 3 },
        },
      },
    ],
  },

  // ── 4. Dynamique startups — fenêtre d'opportunité innovation ─────────────────
  {
    id:          "startup_momentum",
    title:       "L'écosystème startup accélère — fenêtre d'opportunité",
    source:      "Agence Nationale de l'Innovation et de l'Entrepreneuriat",
    type:        "economie",
    urgency:     "moyenne",
    description: "Les indicateurs fictifs de l'écosystème startup national montrent une dynamique inédite. Les projets innovants se multiplient, attirant l'attention des investisseurs. Cette fenêtre d'opportunité permet de consolider la position nationale sur les technologies de demain — à condition d'apporter un soutien stratégique au bon moment.",
    isInteractive: true,
    conditionKey:  "startup_momentum",
    minActionsGap: 18,
    choices: [
      {
        id:                    "plan_soutien_innovation",
        label:                 "Plan national de soutien à l'innovation",
        consequence:           "Un programme fictif d'ampleur est lancé : accélérateurs publics, fonds d'amorçage, réductions réglementaires ciblées. L'écosystème startup monte en puissance. La productivité nationale bénéficie progressivement des innovations déployées.",
        effects:               { money: -200, technology: -15 },
        indicatorEffects:      {},
        startupEcosystemDelta: 15,
        industrialChampionsDelta: 6,
      },
      {
        id:                    "partenariat_industrie_startup",
        label:                 "Programme de partenariat industrie–startups",
        consequence:           "Le gouvernement facilite les partenariats fictifs entre grands groupes et startups. Les champions industriels accèdent à des innovations prometteuses. Les startups bénéficient d'une mise à l'échelle rapide.",
        effects:               { money: -130 },
        indicatorEffects:      {},
        startupEcosystemDelta: 10,
        industrialChampionsDelta: 8,
      },
      {
        id:                    "capitaliser_sans_intervenir",
        label:                 "Observer et capitaliser — sans intervention directe",
        consequence:           "Le gouvernement laisse la dynamique se développer naturellement, sans injection de ressources publiques. L'écosystème continue sur sa lancée, mais sans accélération notable. Une opportunité de consolidation est manquée.",
        effects:               {},
        indicatorEffects:      {},
        startupEcosystemDelta: 4,
      },
    ],
  },

  // ── 5. Alerte industrie stratégique — vulnérabilité souveraineté ──────────────
  {
    id:          "strategic_industry_alert",
    title:       "Alerte souveraineté industrielle — dépendances critiques identifiées",
    source:      "Haut Comité de la Souveraineté Économique",
    type:        "economie",
    urgency:     "critique",
    description: "Le Haut Comité fictif identifie des vulnérabilités structurelles dans l'industrie stratégique nationale. Des pans entiers de la production critique dépendent de fournisseurs extérieurs, exposant le pays à des risques de rupture en cas de crise internationale. Une intervention de fond s'impose pour préserver la capacité industrielle nationale.",
    isInteractive: true,
    conditionKey:  "strategic_industry_alert",
    minActionsGap: 8,
    choices: [
      {
        id:                    "plan_souverainete_industrielle",
        label:                 "Plan national de souveraineté industrielle",
        consequence:           "Un plan fictif massif est déclenché : réindustrialisation ciblée, réduction des dépendances critiques, investissements dans les filières souveraines. L'industrie stratégique repart. Les champions nationaux bénéficient des synergies.",
        effects:               { money: -350 },
        indicatorEffects:      {},
        strategicIndustryDelta:  20,
        industrialChampionsDelta: 10,
        tradeBalanceDelta:        6,
      },
      {
        id:                    "partenariats_industriels_strategiques",
        label:                 "Partenariats industriels stratégiques",
        consequence:           "Le gouvernement noue des partenariats fictifs avec des alliés industriels pour réduire les dépendances les plus dangereuses. L'approche coopérative est moins coûteuse que la réindustrialisation complète. Les résultats sont progressifs mais crédibles.",
        effects:               { money: -200, influence: -15 },
        indicatorEffects:      {},
        strategicIndustryDelta:  14,
        industrialChampionsDelta: 7,
      },
      {
        id:                    "subventions_maintien_capacites",
        label:                 "Subventions de maintien des capacités existantes",
        consequence:           "Le gouvernement injecte des fonds fictifs pour maintenir les capacités industrielles sans restructuration profonde. L'effet est stabilisateur à court terme. Mais les vulnérabilités structurelles ne sont pas traitées à la racine.",
        effects:               { money: -180 },
        indicatorEffects:      {},
        strategicIndustryDelta: 8,
        queuesDelayedConsequence: {
          id:           "strategic_subvention_dependency",
          delayActions: 12,
          effectType:   "indicator_effect",
          payload:      { publicBudget: -2 },
        },
      },
    ],
  },

  // ── 6. Plan champions industriels — fragilité + déficit commercial ─────────────
  {
    id:          "champions_industrial_plan",
    title:       "Fragilisation des champions industriels — signal d'alarme export",
    source:      "Commissariat Général à la Compétitivité Nationale",
    type:        "economie",
    urgency:     "forte",
    description: "Le Commissariat fictif identifie une conjonction critique : les grands groupes industriels nationaux perdent des parts de marché à l'international tandis que la balance commerciale se dégrade. La perte de compétitivité des champions industriels amplifie le déficit extérieur. Une stratégie d'envergure est nécessaire pour redresser la trajectoire.",
    isInteractive: true,
    conditionKey:  "champions_industrial_plan",
    minActionsGap: 10,
    choices: [
      {
        id:                    "strategie_champions_nationaux",
        label:                 "Stratégie nationale des champions industriels",
        consequence:           "Le gouvernement adopte une politique fictive de soutien aux groupes industriels à fort potentiel export : accès au financement long, simplification réglementaire internationale, soutien diplomatique. Les champions se renforcent. La balance commerciale se redresse.",
        effects:               { money: -280, influence: -20 },
        indicatorEffects:      {},
        industrialChampionsDelta: 16,
        tradeBalanceDelta:        10,
      },
      {
        id:                    "acceleration_exportations",
        label:                 "Programme d'accélération des exportations",
        consequence:           "Un programme fictif d'accompagnement export est lancé : missions commerciales, financement des projets à l'international, réductions de barrières négociées. Les résultats sont immédiats sur la balance commerciale mais plus modestes sur la compétitivité structurelle.",
        effects:               { money: -180, influence: -10 },
        indicatorEffects:      {},
        industrialChampionsDelta: 9,
        tradeBalanceDelta:        14,
      },
      {
        id:                    "priorite_marche_interieur",
        label:                 "Recentrage sur le marché intérieur",
        consequence:           "Le gouvernement choisit de consolider les champions sur le marché national plutôt que de les pousser à l'export. La pression concurrentielle se réduit à court terme. Mais la balance commerciale continue de se dégrader faute de recettes export.",
        effects:               { money: -120 },
        indicatorEffects:      {},
        industrialChampionsDelta: 7,
        queuesDelayedConsequence: {
          id:           "champions_interior_tradeoff",
          delayActions: 10,
          effectType:   "indicator_effect",
          payload:      { economy: -1 },
        },
      },
    ],
  },
];
