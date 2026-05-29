/**
 * healthStatisticsScandalEvents.ts — Événements du Scandale des Chiffres de Santé.
 *
 * 3 paliers narratifs : incohérences signalées → controverse → scandale déclaré.
 * Chaque événement propose 5 choix avec des conséquences différentes.
 *
 * Aucun vrai exemple historique. Aucune vraie polémique médicale.
 * Aucun conseil politique réel.
 */

import type { NewsEvent } from "@/types/strategy";

export const HEALTH_STATISTICS_SCANDAL_EVENTS: NewsEvent[] = [
  // ── Palier 1 : Incohérences signalées — seuil 35+ ────────────────────────────
  {
    id:          "health_scandal_emerging",
    title:       "Des experts signalent des incohérences dans les données sanitaires officielles",
    source:      "Collectif Indépendant de Veille Statistique",
    type:        "national",
    urgency:     "forte",
    description:
      "Un collectif d'épidémiologistes et de biostatisticiens publie une note technique : plusieurs indicateurs de santé présentent des écarts significatifs avec les données de terrain. La méthodologie de collecte et de codage est remise en question. Le collectif appelle à une révision publique des chiffres. La note circule dans les milieux spécialisés sans avoir encore percé dans l'opinion.",
    isInteractive: true,
    conditionKey:  "health_scandal_emerging",
    minActionsGap: 25,
    choices: [
      {
        id:          "publier_corrections_s1",
        label:       "Publier les données corrigées avec des explications techniques détaillées",
        consequence:
          "La transparence désarme le collectif avant que la polémique ne s'emballe. La crédibilité technique du gouvernement est maintenue. Quelques médias spécialisés saluent la réactivité.",
        effects:               { money: -80 },
        hiddenPoliticsEffects: { scandalRisk: -6, mediaMood: 4, institutionalStability: 3 },
        communicationRegister: "scientifique",
        declarationTheme:      "transparence",
        declarationStance:     "pro",
      },
      {
        id:          "audit_independant_s1",
        label:       "Mandater un groupe d'experts indépendants pour révision complète",
        consequence:
          "La démarche est saluée comme responsable. L'audit prendra du temps mais la posture est défendable. Le risque de scandale immédiat est réduit.",
        effects:               { money: -200, influence: -8 },
        hiddenPoliticsEffects: { scandalRisk: -3, institutionalStability: 4, eliteTrust: 3 },
        queuesDelayedConsequence: {
          id:           "audit_s1_result",
          delayActions: 15,
          effectType:   "hidden_politics",
          payload:      { scandalRisk: -8, mediaMood: 5, institutionalStability: 4 },
        },
        communicationRegister: "institutionnel",
      },
      {
        id:          "probleme_technique_s1",
        label:       "Attribuer les écarts à des erreurs de saisie et à des problèmes techniques ponctuels",
        consequence:
          "L'explication est acceptée à court terme mais fragile. Le collectif prépare une réplique. Les journalistes spécialisés notent la désinvolture. La pression monte discrètement.",
        effects:               {},
        hiddenPoliticsEffects: { scandalRisk: 8, mediaMood: -4, eliteTrust: -3 },
        pathologyDelta:        { minimization: 10, doubleSpeak: 6 },
        communicationRegister: "technocratique",
        declarationTheme:      "transparence",
        declarationStance:     "contre",
      },
      {
        id:          "reporter_s1",
        label:       "Reporter la clarification après un examen approfondi des données",
        consequence:
          "Le délai est annoncé sans calendrier précis. La presse spécialisée interprète le silence. La polémique est suspendue mais non éteinte. Elle reprendra avec plus de force.",
        effects:               {},
        hiddenPoliticsEffects: { scandalRisk: 5, mediaMood: -5 },
        pathologyDelta:        { minimization: 6 },
        queuesDelayedConsequence: {
          id:           "reporter_s1_retour",
          delayActions: 10,
          effectType:   "hidden_politics",
          payload:      { scandalRisk: 12, mediaMood: -8, popularFatigue: 4 },
        },
        communicationRegister: "populaire",
      },
      {
        id:          "reforme_s1",
        label:       "Annoncer une réforme structurelle de la chaîne de collecte des données sanitaires",
        consequence:
          "Une annonce ambitieuse qui retourne la pression en opportunité. Le collectif d'experts reconnaît le sérieux de la démarche. Les milieux institutionnels approuvent.",
        effects:               { money: -350, technology: 5 },
        hiddenPoliticsEffects: { institutionalStability: 6, eliteTrust: 5, scandalRisk: -8, mediaMood: 3 },
        communicationRegister: "institutionnel",
        declarationTheme:      "depenses_publiques",
        declarationStance:     "pro",
      },
    ],
  },

  // ── Palier 2 : Controverse publique — seuil 65+ ───────────────────────────────
  {
    id:          "health_scandal_active",
    title:       "Données sanitaires : la controverse statistique entre dans l'arène publique",
    source:      "Commission Parlementaire de la Santé",
    type:        "national",
    urgency:     "forte",
    description:
      "La commission parlementaire de la santé convoque le gouvernement pour s'expliquer sur les écarts constatés dans les données sanitaires officielles. Plusieurs groupes d'opposition ont saisi la presse nationale. Des chaînes d'information en continu reprennent le dossier. Des lanceurs d'alerte anonymes font circuler des documents internes mettant en cause les méthodes de codage. La crédibilité des chiffres officiels est publiquement contestée.",
    isInteractive: true,
    conditionKey:  "health_scandal_active",
    minActionsGap: 22,
    choices: [
      {
        id:          "publier_corrections_s2",
        label:       "Publication complète et immédiate de l'ensemble des données et méthodes",
        consequence:
          "Le gouvernement prend les devants. La publication est massive et exhaustive. Le choc est rude à court terme mais la démarche de transparence ferme la porte à l'instrumentalisation politique.",
        effects:               { money: -120, influence: -5 },
        indicatorEffects:      { popularity: -2, cohesion: 2 },
        hiddenPoliticsEffects: { scandalRisk: -12, mediaMood: 7, institutionalStability: 5, eliteTrust: 4 },
        communicationRegister: "institutionnel",
        declarationTheme:      "transparence",
        declarationStance:     "pro",
      },
      {
        id:          "conference_presse_s2",
        label:       "Conférence de presse présidentielle pour contextualiser les données",
        consequence:
          "Une prise de parole directe. Le ton est mesuré et les explications sont techniques. La polémique se calme partiellement. L'opposition cherche les failles dans le discours.",
        effects:               { influence: -12 },
        hiddenPoliticsEffects: { scandalRisk: -5, mediaMood: 3, institutionalStability: 3 },
        communicationRegister: "empathique",
        declarationTheme:      "transparence",
        declarationStance:     "pro",
      },
      {
        id:          "probleme_technique_s2",
        label:       "Dénoncer une exploitation politique d'erreurs techniques normales",
        consequence:
          "L'accusation retourne contre l'opposition mais fragilise davantage la crédibilité institutionnelle. La presse perçoit une tentative de diversion. Le conflit s'envenime.",
        effects:               {},
        indicatorEffects:      { cohesion: -2 },
        hiddenPoliticsEffects: { scandalRisk: 15, mediaMood: -10, eliteTrust: -5, institutionalStability: -3 },
        pathologyDelta:        { doubleSpeak: 14, scapegoating: 10, minimization: 6 },
        communicationRegister: "offensif",
        declarationTheme:      "transparence",
        declarationStance:     "contre",
      },
      {
        id:          "laisser_filer_s2",
        label:       "Laisser la polémique s'épuiser sans réaction officielle",
        consequence:
          "Le silence gouvernemental est interprété comme un aveu. La presse comble le vide avec des hypothèses de plus en plus graves. L'opposition occupe l'espace médiatique librement.",
        effects:               {},
        indicatorEffects:      { popularity: -3 },
        hiddenPoliticsEffects: { scandalRisk: 10, popularFatigue: 6, mediaMood: -8, institutionalStability: -2 },
        pathologyDelta:        { minimization: 8, technocraticColdness: 6 },
        communicationRegister: "populaire",
      },
      {
        id:          "reforme_s2",
        label:       "Annoncer une réforme complète du système statistique sanitaire national",
        consequence:
          "Un engagement fort et coûteux. La démarche impose un agenda positif qui dépasse la polémique. Les élites et les experts saluent l'ambition. L'opposition conteste le calendrier.",
        effects:               { money: -600, technology: 8, influence: -15 },
        indicatorEffects:      { economy: -3 },
        hiddenPoliticsEffects: { institutionalStability: 8, eliteTrust: 6, scandalRisk: -12, mediaMood: 5 },
        communicationRegister: "institutionnel",
        declarationTheme:      "depenses_publiques",
        declarationStance:     "pro",
      },
    ],
  },

  // ── Palier 3 : Scandale déclaré — seuil 85+ ──────────────────────────────────
  {
    id:          "health_scandal_crisis",
    title:       "CRISE — Le scandale des données sanitaires éclate : l'État mis en cause",
    source:      "Agence Nationale de Sécurité Sanitaire",
    type:        "national",
    urgency:     "critique",
    description:
      "L'ANSS publie un rapport circonstancié : des écarts systématiques entre les données officielles et les données de terrain sont documentés sur plusieurs périodes. Des notes internes révèlent que des responsables avaient connaissance des anomalies sans les signaler. La presse nationale titre sur un scandale statistique d'État. L'opposition dépose une motion pour la création d'une commission d'enquête. La confiance dans les chiffres officiels de santé est au plus bas. Le gouvernement est en position de crise majeure.",
    isInteractive: true,
    conditionKey:  "health_scandal_crisis",
    minActionsGap: 20,
    choices: [
      {
        id:          "mea_culpa_s3",
        label:       "Mea culpa total : conférence de presse, publication intégrale, annonce de réforme immédiate",
        consequence:
          "Une prise de responsabilité totale et douloureuse. Le choc politique est immédiat mais la démarche coupe court à l'instrumentalisation. La légitimité institutionnelle peut se reconstruire sur des bases assainies.",
        effects:               { money: -250, influence: -20 },
        indicatorEffects:      { popularity: -4, cohesion: 4 },
        hiddenPoliticsEffects: { scandalRisk: -18, mediaMood: 10, institutionalStability: 7, eliteTrust: 4 },
        communicationRegister: "empathique",
        declarationTheme:      "transparence",
        declarationStance:     "pro",
      },
      {
        id:          "enquete_administrative_s3",
        label:       "Demander l'ouverture d'une enquête administrative indépendante",
        consequence:
          "Une réponse institutionnelle qui montre la volonté de faire la lumière sans assumer immédiatement. La durée de l'enquête maintient la pression à un niveau gérable. L'opposition conteste l'indépendance du processus.",
        effects:               { money: -180, influence: -15 },
        indicatorEffects:      { popularity: -2 },
        hiddenPoliticsEffects: { scandalRisk: -8, institutionalStability: 5, mediaMood: 2 },
        queuesDelayedConsequence: {
          id:           "enquete_s3_conclusions",
          delayActions: 18,
          effectType:   "hidden_politics",
          payload:      { scandalRisk: -12, mediaMood: 6, institutionalStability: 5 },
        },
        communicationRegister: "institutionnel",
      },
      {
        id:          "accuser_saboteurs_s3",
        label:       "Accuser des ingérences extérieures dans le système statistique national",
        consequence:
          "L'accusation est rejetée massivement. L'ANSS dément. La presse parle de tentative de diversion. L'opposition demande la démission. Le scandale prend une nouvelle dimension en ajoutant le mensonge d'État à la liste des griefs.",
        effects:               { influence: -10 },
        indicatorEffects:      { popularity: -7, cohesion: -5 },
        hiddenPoliticsEffects: { scandalRisk: 28, mediaMood: -18, eliteTrust: -12, institutionalStability: -6, popularFatigue: 8 },
        pathologyDelta:        { scapegoating: 22, doubleSpeak: 16, minimization: 10 },
        communicationRegister: "offensif",
        declarationTheme:      "transparence",
        declarationStance:     "contre",
      },
      {
        id:          "reporter_s3",
        label:       "Suspendre toute publication complémentaire dans l'attente d'une révision interne",
        consequence:
          "Le silence institutionnel est catastrophique dans ce contexte. La commission parlementaire s'autosaisit. Des sources anonymes font circuler des documents supplémentaires. La crise s'emballe hors de tout contrôle.",
        effects:               {},
        indicatorEffects:      { popularity: -5, cohesion: -3 },
        hiddenPoliticsEffects: { scandalRisk: 20, mediaMood: -14, popularFatigue: 10, institutionalStability: -5 },
        pathologyDelta:        { minimization: 16, doubleSpeak: 12, technocraticColdness: 8 },
        queuesDelayedConsequence: {
          id:           "silence_s3_retour",
          delayActions: 8,
          effectType:   "hidden_politics",
          payload:      { scandalRisk: 22, mediaMood: -16, popularFatigue: 8, institutionalStability: -4 },
        },
        communicationRegister: "technocratique",
        declarationTheme:      "transparence",
        declarationStance:     "contre",
      },
      {
        id:          "reforme_urgence_s3",
        label:       "Réforme d'urgence du système de production et de diffusion des données sanitaires",
        consequence:
          "Un engagement budgétaire massif. La démarche est ambitieuse et reconnue par les experts comme nécessaire. L'opposition critique le coût et le calendrier. À long terme, c'est la voie la plus solide pour reconstruire la crédibilité.",
        effects:               { money: -800, technology: 12, influence: -25 },
        indicatorEffects:      { economy: -4, popularity: -3, cohesion: 2 },
        hiddenPoliticsEffects: { institutionalStability: 10, eliteTrust: 8, scandalRisk: -18, mediaMood: 7 },
        communicationRegister: "institutionnel",
        declarationTheme:      "depenses_publiques",
        declarationStance:     "pro",
      },
    ],
  },
];
