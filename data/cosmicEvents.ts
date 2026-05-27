/**
 * data/cosmicEvents.ts — Système Cosmique V2 : 15 événements Journal de Crise.
 *
 * Préfixe : cv_
 * Ces événements complètent les sn_/oc_/ch_ existants avec de nouveaux scénarios.
 *
 * Règles narratives :
 * - Le cosmique est toujours en arrière-plan du pouvoir présidentiel.
 * - Aurora n'offre rien de gratuit — ses choix ont des conditions visibles.
 * - Obscurium est disponible, mais chaque aide crée une dette cachée.
 * - La neutralité est un choix légitime qui renforce la crédibilité humaine.
 * - Aucune bataille spatiale, aucune flotte, aucune carte galactique.
 */

import type { NewsEvent } from "@/types/strategy";

export const COSMIC_V2_EVENTS: NewsEvent[] = [

  // ── 1. Anomalie dans les fréquences ──────────────────────────────────────────
  {
    id:          "cv_signal_anomaly",
    title:       "Anomalie dans les fréquences longues portées",
    source:      "Agence spatiale nationale",
    type:        "diplomatie",
    urgency:     "faible",
    description: "Vos équipes de surveillance signalent une série d'anomalies dans les fréquences de communication longues portées. Les patterns ne correspondent à aucune source terrestre connue. Il peut s'agir d'un artefact naturel — ou d'autre chose.",
    isInteractive: false,
    conditionKey:  "cv_signal_anomaly_ready",
    minActionsGap: 40,
    autoEffects:   { intelligence: 5 },
  },

  // ── 2. La Terre formellement observée ────────────────────────────────────────
  {
    id:          "cv_earth_observed",
    title:       "Le Conseil a officiellement pris note de la Terre",
    source:      "Intelligence cosmique — niveau 1",
    type:        "diplomatie",
    urgency:     "moyenne",
    description: "Vos services de renseignement interceptent un fragment de transmission : la Terre figure désormais dans les registres actifs d'une entité interstellaire. Elle n'agit pas encore. Elle regarde. Ce que vous faites maintenant compte.",
    isInteractive: true,
    conditionKey:  "cv_earth_observed_ready",
    minActionsGap: 50,
    choices: [
      {
        id:          "cv_earth_observed_acknowledge",
        label:       "Renforcer les capacités de surveillance",
        consequence: "Vous consacrez des ressources à comprendre ce qui vous observe. Le Conseil enregistre cette réactivité.",
        effects:     { intelligence: 8, cyberDefense: 5 },
        cosmicEffects: { cosmicCredibilityDelta: 5, councilAttentionDelta: 8 },
      },
      {
        id:          "cv_earth_observed_silence",
        label:       "Garder l'information confidentielle",
        consequence: "Vous choisissez la discrétion. La population n'est pas informée. Le Conseil note l'absence de réaction officielle.",
        effects:     { intelligence: 3 },
        cosmicEffects: { councilAttentionDelta: 3 },
      },
      {
        id:          "cv_earth_observed_publish",
        label:       "Informer l'opinion publique",
        consequence: "La transparence renforce la crédibilité institutionnelle. Le Conseil enregistre un geste rare de la part d'une espèce émergente.",
        effects:     {},
        indicatorEffects: { cohesion: 3 },
        cosmicEffects:    { cosmicCredibilityDelta: 8, councilAttentionDelta: 10 },
      },
    ],
  },

  // ── 3. Canal diplomatique Aurora ─────────────────────────────────────────────
  {
    id:          "cv_aurora_diplomatic_channel",
    title:       "Aurora Prime propose un canal diplomatique discret",
    source:      "Phare d'Aurora — Cité d'Orion",
    type:        "diplomatie",
    urgency:     "moyenne",
    description: "Un message codé arrive via un canal inhabituel : Aurora Prime propose d'établir une ligne de communication directe, non officielle et non tracée. Elle précise qu'il ne s'agit pas d'une alliance — seulement d'une conversation.",
    isInteractive: true,
    conditionKey:  "cv_aurora_diplomatic_channel_ready",
    minActionsGap: 55,
    choices: [
      {
        id:          "cv_aurora_channel_accept",
        label:       "Accepter le canal — condition de transparence",
        consequence: "Vous acceptez, à condition de partager avec Aurora les décisions majeures à venir. Elle note votre engagement envers l'honnêteté.",
        effects:     { intelligence: 10 },
        cosmicEffects: { auroraTrustDelta: 12, auroraSupportDelta: 8, cosmicCredibilityDelta: 5 },
      },
      {
        id:          "cv_aurora_channel_accept_silent",
        label:       "Accepter sans conditions explicites",
        consequence: "Vous ouvrez le canal. Aurora accepte — mais note l'absence de réciprocité dans votre approche.",
        effects:     { intelligence: 6 },
        cosmicEffects: { auroraTrustDelta: 5, auroraSupportDelta: 5 },
      },
      {
        id:          "cv_aurora_channel_decline",
        label:       "Décliner — la Terre ne traite pas de manière non officielle",
        consequence: "Vous refusez par principe. Aurora note cette position de souveraineté — avec respect, mais sans enthousiasme.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 6, auroraTrustDelta: 3 },
        hiddenPoliticsEffects: { institutionalStability: 3 },
      },
    ],
  },

  // ── 4. Contact dans l'ombre d'Obscurium ──────────────────────────────────────
  {
    id:          "cv_obscurium_shadow_contact",
    title:       "Un contact non sollicité dans les marges du Conseil",
    source:      "Source anonyme — Marché des Silences",
    type:        "national",
    urgency:     "forte",
    description: "Un intermédiaire vous contacte via un canal crypté. L'identité est masquée, mais le message est clair : une entité peut vous aider à résoudre plusieurs dossiers sensibles — moyennant une discrétion totale sur l'origine de l'aide.",
    isInteractive: true,
    conditionKey:  "cv_obscurium_shadow_contact_ready",
    minActionsGap: 50,
    choices: [
      {
        id:          "cv_obscurium_shadow_accept",
        label:       "Accepter — les résultats importent plus que la source",
        consequence: "L'aide arrive. Elle est efficace. Son origine restera secrète — jusqu'à ce qu'elle ne le soit plus.",
        effects:     { money: 300, influence: 20 },
        cosmicEffects: { obscuriumDebtDelta: 18, obscuriumInfluenceDelta: 8, moralBalanceDelta: -12 },
        queuesDelayedConsequence: {
          id:                  "cv_obscurium_shadow_cost",
          delayActions:        20,
          effectType:          "hidden_politics",
          payload:             { scandalRisk: 12, eliteTrust: -8 },
        },
      },
      {
        id:          "cv_obscurium_shadow_refuse",
        label:       "Refuser — aucun accord dans l'ombre",
        consequence: "Vous refusez. L'intermédiaire disparaît. Le Conseil note que la Terre a résisté à une approche de déstabilisation.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 8, auroraTrustDelta: 5, moralBalanceDelta: 8 },
      },
    ],
  },

  // ── 5. Cartographie reçue de la Cité ─────────────────────────────────────────
  {
    id:          "cv_orion_cartography",
    title:       "Données partielles de la Cité d'Orion transmises",
    source:      "Archives Stellaires — Cité d'Orion",
    type:        "diplomatie",
    urgency:     "faible",
    description: "Un fragment de données arrive via le Phare d'Aurora : une cartographie partielle de la Cité d'Orion, avec quelques annotations sur les protocols d'accès. Ce n'est pas une invitation — c'est une mise en confiance.",
    isInteractive: false,
    conditionKey:  "cv_orion_cartography_ready",
    minActionsGap: 55,
    autoEffects:   { intelligence: 8, technology: 3 },
  },

  // ── 6. Session d'urgence du Conseil ──────────────────────────────────────────
  {
    id:          "cv_council_emergency_session",
    title:       "Le Conseil convoque une session d'urgence — la Terre est à l'agenda",
    source:      "Dôme des Ambassades — Cité d'Orion",
    type:        "diplomatie",
    urgency:     "forte",
    description: "La session est convoquée en raison des indicateurs préoccupants sur Terre : instabilité institutionnelle, tensions sociales, dettes accumulées. Des espèces membres demandent un examen formel du dossier terrestre. Le vote n'a pas encore eu lieu.",
    isInteractive: true,
    conditionKey:  "cv_council_emergency_session_ready",
    minActionsGap: 60,
    choices: [
      {
        id:          "cv_council_emergency_present",
        label:       "Envoyer un dossier documenté sur les efforts de stabilisation",
        consequence: "Votre transparence rassure une partie du Conseil. Les sceptiques restent sceptiques. La session n'aboutit pas à une sanction.",
        effects:     { influence: 15 },
        cosmicEffects: { cosmicCredibilityDelta: 10, councilAttentionDelta: 5, auroraSupportDelta: 5 },
      },
      {
        id:          "cv_council_emergency_ignore",
        label:       "Ne pas répondre — la Terre ne reconnaît pas la juridiction",
        consequence: "Votre silence est interprété comme de l'arrogance par les uns, de la souveraineté par les autres. Le Conseil reste divisé.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: -8, councilAttentionDelta: 10 },
      },
      {
        id:          "cv_council_emergency_aurora",
        label:       "Demander à Aurora de défendre la Terre devant le Conseil",
        consequence: "Aurora accepte, sous conditions. Elle représente vos efforts. Mais le Conseil note que la Terre ne peut pas encore parler pour elle-même.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 3, auroraSupportDelta: 8, auroraTrustDelta: -5, councilAttentionDelta: -5 },
      },
    ],
  },

  // ── 7. Soutien officiel d'Aurora Prime ───────────────────────────────────────
  {
    id:          "cv_aurora_endorsement",
    title:       "Aurora Prime soutient officiellement la Terre devant le Conseil",
    source:      "Phare d'Aurora — message officiel",
    type:        "diplomatie",
    urgency:     "moyenne",
    description: "Aurora Prime dépose une déclaration de soutien devant le Conseil interstellaire. Elle ne garantit rien, mais son témoignage pèse. D'autres espèces membres prennent note. La Terre est reconnue comme un cas digne d'attention positive.",
    isInteractive: false,
    conditionKey:  "cv_aurora_endorsement_ready",
    minActionsGap: 65,
    autoEffects:   { influence: 12 },
  },

  // ── 8. Une manœuvre d'Obscurium exposée ─────────────────────────────────────
  {
    id:          "cv_obscurium_exposed",
    title:       "Une opération d'Obscurium est mise au jour",
    source:      "Tribunal des Espèces — enquête interne",
    type:        "national",
    urgency:     "forte",
    description: "Le Tribunal révèle qu'Obscurium menait une opération secrète ciblant les institutions terrestres. Des documents circulent. Le Conseil attend votre réaction — la façon dont vous gérez cette révélation en dira long.",
    isInteractive: true,
    conditionKey:  "cv_obscurium_exposed_ready",
    minActionsGap: 60,
    choices: [
      {
        id:          "cv_obscurium_exposed_condemn",
        label:       "Condamner publiquement — et couper tout contact avec Obscurium",
        consequence: "Votre prise de position est ferme. Aurora note cet alignement. Obscurium réduit ses opérations visibles — temporairement.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 12, auroraTrustDelta: 10, obscuriumInfluenceDelta: -8, obscuriumDebtDelta: -5, moralBalanceDelta: 15 },
      },
      {
        id:          "cv_obscurium_exposed_manage",
        label:       "Gérer diplomatiquement sans condamner directement",
        consequence: "Vous évitez l'escalade. Ni Aurora ni Obscurium n'est satisfait. La neutralité a un coût en crédibilité.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 2, councilAttentionDelta: 5 },
      },
    ],
  },

  // ── 9. Deuxième convocation à la Chambre du Seuil ────────────────────────────
  {
    id:          "cv_chambre_second_session",
    title:       "La Chambre du Seuil demande une deuxième audience",
    source:      "Chambre du Seuil — Cité d'Orion",
    type:        "diplomatie",
    urgency:     "moyenne",
    description: "La Chambre observe que votre équilibre moral stagne. Aurora et Obscurium ont tous deux déposé des demandes d'audience. La Chambre vous convoque pour clarifier votre position — ni l'une ni l'autre ne peut attendre indéfiniment.",
    isInteractive: true,
    conditionKey:  "cv_chambre_second_session_ready",
    minActionsGap: 55,
    choices: [
      {
        id:          "cv_chambre_second_aurora",
        label:       "Réaffirmer votre engagement envers les conditions d'Aurora",
        consequence: "Aurora accueille favorablement cette réaffirmation. Obscurium se retire temporairement. Le Conseil note une cohérence dans votre posture.",
        effects:     {},
        cosmicEffects: { auroraTrustDelta: 10, moralBalanceDelta: 12, obscuriumDebtDelta: -3, cosmicCredibilityDelta: 5 },
      },
      {
        id:          "cv_chambre_second_obscurium",
        label:       "Accepter une aide ponctuelle d'Obscurium",
        consequence: "Obscurium fournit les ressources promises. La dette augmente. Aurora note cette décision sans commenter.",
        effects:     { money: 200, influence: 15 },
        cosmicEffects: { obscuriumDebtDelta: 15, moralBalanceDelta: -15, auroraTrustDelta: -8 },
        queuesDelayedConsequence: {
          id:           "cv_chambre_second_cost",
          delayActions: 18,
          effectType:   "hidden_politics",
          payload:      { scandalRisk: 10, institutionalStability: -5 },
        },
      },
      {
        id:          "cv_chambre_second_sovereign",
        label:       "Déclarer votre souveraineté — la Terre décide seule",
        consequence: "Vous refusez les deux forces. La Chambre enregistre cette décision comme un acte rare de souveraineté. Le Conseil en est informé.",
        effects:     {},
        cosmicEffects: { moralBalanceDelta: 18, cosmicCredibilityDelta: 10, auroraTrustDelta: 5, obscuriumDebtDelta: -5 },
      },
    ],
  },

  // ── 10. Vote du Conseil sur l'adhésion provisoire ────────────────────────────
  {
    id:          "cv_council_vote_earth",
    title:       "Le Conseil vote sur le statut provisoire de la Terre",
    source:      "Dôme des Ambassades — session plénière",
    type:        "diplomatie",
    urgency:     "critique",
    description: "Le vote est imminent. Plusieurs espèces ont demandé que la Terre soit classée « espèce sous surveillance renforcée ». D'autres, dont Aurora Prime, plaident pour un statut d'observateur provisoire. Le résultat dépendra en partie de votre crédibilité accumulée.",
    isInteractive: true,
    conditionKey:  "cv_council_vote_earth_ready",
    minActionsGap: 70,
    choices: [
      {
        id:          "cv_council_vote_diplomatic",
        label:       "Présenter un mémoire diplomatique complet",
        consequence: "Votre dossier est bien reçu. La Terre obtient le statut d'observateur provisoire. Aurora Prime vote favorablement.",
        effects:     { influence: 20 },
        cosmicEffects: { cosmicCredibilityDelta: 15, councilAttentionDelta: -10, auroraSupportDelta: 10 },
      },
      {
        id:          "cv_council_vote_silent",
        label:       "Ne pas intervenir dans le processus",
        consequence: "Le vote se tient sans votre participation. Le résultat est ambigu. Le Conseil reste divisé.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: -5, councilAttentionDelta: 5 },
      },
      {
        id:          "cv_council_vote_transparency",
        label:       "Ouvrir les données gouvernementales aux enquêteurs du Tribunal",
        consequence: "Ce geste de transparence maximale dépasse les attentes. Même les espèces sceptiques reconnaissent l'effort. Le statut est accordé à une majorité élargie.",
        effects:     {},
        indicatorEffects: { cohesion: 4 },
        cosmicEffects: { cosmicCredibilityDelta: 20, auroraTrustDelta: 10, councilAttentionDelta: -8, moralBalanceDelta: 10 },
      },
    ],
  },

  // ── 11. Crise à la Cité — la Terre est impliquée ─────────────────────────────
  {
    id:          "cv_orion_crisis",
    title:       "Incident dans la Cité d'Orion — l'ambassade terrestre est compromise",
    source:      "Service diplomatique — Cité d'Orion",
    type:        "diplomatie",
    urgency:     "forte",
    description: "Une crise éclate dans le Couloir Noir de la Cité. Vos contacts locaux sont pris entre deux factions. Des traces d'Obscurium sont retrouvées à proximité de votre délégation non officielle. Le Tribunal prend note de l'incident.",
    isInteractive: true,
    conditionKey:  "cv_orion_crisis_ready",
    minActionsGap: 60,
    choices: [
      {
        id:          "cv_orion_crisis_withdraw",
        label:       "Retirer discrètement vos contacts et couper les liens",
        consequence: "Vous coupez les liens avec le Couloir Noir. Le Tribunal note votre désengagement. La trace Obscurium se réduit.",
        effects:     {},
        cosmicEffects: { obscuriumTraceDelta: -12, orionStandingDelta: 5, cosmicCredibilityDelta: 5 },
      },
      {
        id:          "cv_orion_crisis_defend",
        label:       "Défendre la position de votre délégation devant le Tribunal",
        consequence: "Vous assumez la présence de vos contacts et fournissez des explications. Le Tribunal évalue votre argumentation.",
        effects:     { influence: -10 },
        cosmicEffects: { orionStandingDelta: 8, cosmicCredibilityDelta: 8, obscuriumTraceDelta: -5 },
      },
    ],
  },

  // ── 12. Bilan moral devant la Chambre ────────────────────────────────────────
  {
    id:          "cv_moral_reckoning",
    title:       "La Chambre du Seuil présente le bilan moral de ce mandat",
    source:      "Chambre du Seuil — rapport trimestriel",
    type:        "national",
    urgency:     "forte",
    description: "La Chambre a dressé un bilan de vos interactions avec les forces cosmiques. Le document est détaillé — chaque choix y figure. Aurora Prime et Obscurium ont tous deux déposé leurs commentaires. La Chambre attend votre réponse.",
    isInteractive: true,
    conditionKey:  "cv_moral_reckoning_ready",
    minActionsGap: 65,
    choices: [
      {
        id:          "cv_moral_reckoning_accept",
        label:       "Accepter le bilan et s'engager à corriger les écarts",
        consequence: "Votre reconnaissance est notée. Aurora voit un signal de maturité politique. Obscurium observe en silence.",
        effects:     {},
        indicatorEffects: { cohesion: 3 },
        cosmicEffects: { auroraTrustDelta: 10, moralBalanceDelta: 10, cosmicCredibilityDelta: 8 },
      },
      {
        id:          "cv_moral_reckoning_contest",
        label:       "Contester les données — le rapport est incomplet",
        consequence: "La Chambre prend note de vos objections. Aurora est moins convaincue. Obscurium utilise cette ambiguïté.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: -5, obscuriumInfluenceDelta: 5, auroraTrustDelta: -5 },
      },
      {
        id:          "cv_moral_reckoning_sovereign",
        label:       "Affirmer que ce bilan ne regarde que la Terre",
        consequence: "Cette affirmation de souveraineté tranche le débat. La Chambre enregistre la position. La crédibilité humaine s'en trouve renforcée sur le long terme.",
        effects:     {},
        cosmicEffects: { moralBalanceDelta: 15, cosmicCredibilityDelta: 10, auroraTrustDelta: 3 },
      },
    ],
  },

  // ── 13. Test final d'Aurora ───────────────────────────────────────────────────
  {
    id:          "cv_aurora_final_test",
    title:       "Aurora impose un test de cohérence avant le verdict",
    source:      "Phare d'Aurora — message scellé",
    type:        "diplomatie",
    urgency:     "critique",
    description: "Aurora Prime vous transmet un message : avant que le Conseil rende son verdict, elle souhaite vérifier une chose — que les décisions des six derniers mois reflètent une ligne directrice cohérente. Elle vous demande de la formuler en une déclaration.",
    isInteractive: true,
    conditionKey:  "cv_aurora_final_test_ready",
    minActionsGap: 70,
    choices: [
      {
        id:          "cv_aurora_final_test_stability",
        label:       "La stabilité démocratique comme boussole permanente",
        consequence: "Aurora reconnaît la cohérence de cette ligne. Elle confirme son soutien devant le Conseil.",
        effects:     {},
        cosmicEffects: { auroraTrustDelta: 15, auroraSupportDelta: 12, cosmicCredibilityDelta: 10 },
      },
      {
        id:          "cv_aurora_final_test_sovereignty",
        label:       "La souveraineté de la Terre comme principe non négociable",
        consequence: "Aurora note la clarté de la position. Elle ne l'endosse pas complètement — mais la respecte. Son soutien reste conditionnel.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 8, moralBalanceDelta: 10, auroraTrustDelta: 5 },
      },
    ],
  },

  // ── 14. Révélation sur Obscurium au Conseil ──────────────────────────────────
  {
    id:          "cv_obscurium_revelation",
    title:       "Les activités d'Obscurium sur Terre sont révélées devant le Conseil",
    source:      "Tribunal des Espèces — audience publique",
    type:        "national",
    urgency:     "critique",
    description: "Le Tribunal a compilé des preuves des activités d'Obscurium sur Terre. Le rapport est rendu public devant le Conseil. La nature exacte de vos interactions avec Obscurium va être examinée. C'est un moment décisif pour la crédibilité de la Terre.",
    isInteractive: true,
    conditionKey:  "cv_obscurium_revelation_ready",
    minActionsGap: 75,
    choices: [
      {
        id:          "cv_obscurium_revelation_full_transparency",
        label:       "Divulguer intégralement — y compris vos propres interactions",
        consequence: "Votre transparence totale est un choc pour le Conseil. Aurora Prime défend votre bonne foi. La crédibilité en sort renforcée malgré tout.",
        effects:     {},
        indicatorEffects: { cohesion: -3 },
        hiddenPoliticsEffects: { scandalRisk: 8 },
        cosmicEffects: { cosmicCredibilityDelta: 18, auroraTrustDelta: 15, obscuriumDebtDelta: -10, moralBalanceDelta: 20 },
      },
      {
        id:          "cv_obscurium_revelation_partial",
        label:       "Confirmer les faits du rapport sans entrer dans les détails",
        consequence: "Vous gérez l'information. Le Conseil s'en contente formellement. Aurora est moins convaincue de votre sincérité.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 5, auroraTrustDelta: -5, obscuriumInfluenceDelta: -5 },
      },
    ],
  },

  // ── 15. L'héritage cosmique de ce mandat ─────────────────────────────────────
  {
    id:          "cv_cosmic_legacy",
    title:       "La Chambre du Seuil rend son verdict sur l'héritage cosmique de ce mandat",
    source:      "Chambre du Seuil — bilan de fin de mandat",
    type:        "national",
    urgency:     "critique",
    description: "Le mandat touche à sa fin. La Chambre du Seuil, le Conseil interstellaire et Aurora Prime ont tous transmis leurs évaluations. Ce n'est pas un jugement politique — c'est un témoin. Les générations futures liront ce que vous avez laissé derrière vous dans les archives du Conseil.",
    isInteractive: true,
    conditionKey:  "cv_cosmic_legacy_ready",
    minActionsGap: 80,
    choices: [
      {
        id:          "cv_cosmic_legacy_integrity",
        label:       "Affirmer que la Terre a gouverné selon ses propres valeurs",
        consequence: "La Chambre enregistre : la Terre a maintenu son intégrité dans des circonstances difficiles. Ce témoignage restera dans les Archives Stellaires.",
        effects:     {},
        indicatorEffects: { cohesion: 5, popularity: 3 },
        cosmicEffects: { cosmicCredibilityDelta: 15, auroraTrustDelta: 10, moralBalanceDelta: 15 },
      },
      {
        id:          "cv_cosmic_legacy_pragmatic",
        label:       "Reconnaître les compromis faits dans l'intérêt du pays",
        consequence: "La Chambre note l'honnêteté de l'évaluation. Le Conseil comprend la complexité des choix. L'héritage est ambigu — mais humain.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 8, moralBalanceDelta: 5 },
      },
      {
        id:          "cv_cosmic_legacy_regret",
        label:       "Exprimer des regrets sur certaines décisions cosmiques",
        consequence: "Aurora Prime enregistre ce signe de maturité. Obscurium note que la Terre a pris conscience. C'est peut-être la décision la plus crédible du mandat.",
        effects:     {},
        cosmicEffects: { cosmicCredibilityDelta: 12, auroraTrustDelta: 15, obscuriumDebtDelta: -8, moralBalanceDelta: 18 },
      },
    ],
  },
];
