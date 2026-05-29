import type { NewsEvent } from "@/types/strategy";

export const MINISTER_CONFLICT_EVENTS: NewsEvent[] = [

  // ── Découverte d'un conflit potentiel ─────────────────────────────────────

  {
    id: "minister_conflict_discovery",
    title: "La presse enquête sur les intérêts d'un membre du cabinet",
    source: "Médias d'Investigation",
    type: "national",
    urgency: "forte",
    conditionKey: "minister_conflict_hidden",
    minActionsGap: 12,
    isInteractive: true,
    description: "Des journalistes ont commencé à enquêter sur les liens d'affaires d'un membre du cabinet. Pour l'instant, l'enquête est en phase exploratoire. Une réaction préventive du gouvernement peut encore changer le cadrage du récit.",
    choices: [
      {
        id: "demander_declaration_volontaire",
        label: "Demander une déclaration publique d'intérêts",
        consequence: "Initiative proactive. La transparence réduit l'appétit d'investigation. Légère perte de confiance des élites.",
        effects: { influence: -15 },
        hiddenPoliticsEffects: { institutionalStability: 5, scandalRisk: -8, mediaMood: 3, eliteTrust: -2 },
        procurementIntegrityDelta: 5,
      },
      {
        id: "surveiller_sans_agir",
        label: "Surveiller discrètement — attendre",
        consequence: "Attentisme. L'enquête se poursuit. Le gouvernement garde sa latitude mais le risque monte.",
        effects: {},
        hiddenPoliticsEffects: { scandalRisk: 4 },
      },
      {
        id: "affirmer_integrite_ministre",
        label: "Affirmer publiquement l'intégrité du ministre",
        consequence: "Défense catégorique. Si des preuves émergent, le boomerang sera d'autant plus violent.",
        effects: { influence: -10 },
        hiddenPoliticsEffects: { scandalRisk: 8, eliteTrust: -4, mediaMood: -3 },
        indicatorEffects: { popularity: -1 },
      },
    ],
  },

  // ── Scandale avéré ───────────────────────────────────────────────────────

  {
    id: "minister_conflict_scandal_eruption",
    title: "SCANDALE — Conflit d'intérêts avéré dans le cabinet",
    source: "AFP — ALERTE",
    type: "national",
    urgency: "critique",
    conditionKey: "minister_conflict_scandal",
    minActionsGap: 18,
    isInteractive: true,
    description: "Un conflit d'intérêts est désormais documenté et public. Des liens entre un ou plusieurs membres du cabinet et des intérêts privés ont été révélés. L'opposition demande des démissions immédiates. La crédibilité du gouvernement est en jeu.",
    choices: [
      {
        id: "enquete_ethique_nationale",
        label: "Assumer et lancer une enquête éthique nationale",
        consequence: "Discours de transparence totale. Coût politique immédiat, crédibilité institutionnelle préservée à long terme.",
        effects: { influence: -40, money: -20 },
        indicatorEffects: { popularity: -3, cohesion: 2 },
        hiddenPoliticsEffects: { scandalRisk: -18, institutionalStability: 8, mediaMood: 5, eliteTrust: -2 },
        procurementIntegrityDelta: 8,
      },
      {
        id: "limoger_implique",
        label: "Limoger le ministre impliqué",
        consequence: "Sacrifice politique. Limite les dégâts immédiats mais fragilise la confiance interne du cabinet.",
        effects: { influence: -20 },
        indicatorEffects: { popularity: -2 },
        hiddenPoliticsEffects: { scandalRisk: -8, mediaMood: 2, eliteTrust: -8, institutionalStability: -3 },
      },
      {
        id: "minimiser_conflit",
        label: "Minimiser — soutenir le ministre sans réserve",
        consequence: "La défense aveugle aggrave la perception. Le scandale s'ancre dans la durée.",
        effects: {},
        indicatorEffects: { popularity: -5, cohesion: -3 },
        hiddenPoliticsEffects: { scandalRisk: 16, mediaMood: -10, popularFatigue: 7, institutionalStability: -5 },
      },
    ],
  },

  // ── Dilemme : ministre loyal mais exposé ─────────────────────────────────

  {
    id: "minister_conflict_loyal_dilemma",
    title: "Dilemme — un ministre loyal est exposé à des soupçons",
    source: "Conseil d'État fictif",
    type: "national",
    urgency: "forte",
    conditionKey: "minister_conflict_loyal_exposed",
    minActionsGap: 15,
    isInteractive: true,
    description: "Un membre loyal du cabinet se retrouve sous pression éthique. Son passé professionnel attire l'attention des organes de contrôle. Sa loyauté envers le gouvernement est indiscutable, mais sa situation objective crée un risque croissant.",
    choices: [
      {
        id: "audit_confidentiel_loyal",
        label: "Demander un audit interne confidentiel",
        consequence: "Processus discret et formel. La loyauté du ministre est préservée, le risque juridique réduit.",
        effects: { influence: -20 },
        hiddenPoliticsEffects: { institutionalStability: 4, scandalRisk: -5 },
      },
      {
        id: "ecarter_temporairement_loyal",
        label: "L'écarter temporairement le temps de clarifier",
        consequence: "Signal de rigueur. La presse salue la décision, mais l'ambiance interne se tend.",
        effects: { influence: -15 },
        hiddenPoliticsEffects: { mediaMood: 4, eliteTrust: -5, institutionalStability: 2 },
        indicatorEffects: { popularity: -1 },
      },
      {
        id: "defendre_sans_reserve_loyal",
        label: "Le défendre sans réserve publiquement",
        consequence: "Solidarité présidentielle affichée. Risque de boomerang si des preuves émergent.",
        effects: { influence: -10 },
        hiddenPoliticsEffects: { scandalRisk: 6, eliteTrust: 2, mediaMood: -3 },
      },
    ],
  },

  // ── Dilemme : ministre compétent mais toxique ─────────────────────────────

  {
    id: "minister_conflict_competent_toxic",
    title: "Décision stratégique — un ministre compétent est soupçonné",
    source: "Haute Autorité fictive",
    type: "national",
    urgency: "forte",
    conditionKey: "minister_conflict_competent_toxic",
    minActionsGap: 15,
    isInteractive: true,
    description: "L'un des membres les plus compétents du cabinet fait l'objet de soupçons éthiques documentés. Le maintenir en poste préserve une expertise précieuse mais engage la responsabilité du gouvernement. Le remplacer sécurise l'image mais fragilise les dossiers en cours.",
    choices: [
      {
        id: "garder_avec_audit",
        label: "Maintenir en poste avec audit éthique imposé",
        consequence: "Pari sur la transparence interne. Le risque persiste mais le ministre reste opérationnel.",
        effects: { influence: -25, money: -15 },
        hiddenPoliticsEffects: { institutionalStability: 3, scandalRisk: -4 },
        indicatorEffects: { economy: 1 },
      },
      {
        id: "remplacer_malgre_perte",
        label: "Remplacer malgré la perte de compétence",
        consequence: "Décision courageuse. Image institutionnelle renforcée, capacité opérationnelle réduite à court terme.",
        effects: { influence: -20 },
        hiddenPoliticsEffects: { scandalRisk: -12, institutionalStability: 6, eliteTrust: 3, mediaMood: 4 },
        indicatorEffects: { economy: -2, popularity: 1 },
      },
      {
        id: "defendre_competence_strategi",
        label: "Défendre en invoquant la nécessité stratégique",
        consequence: "Argument pragmatique. Crédibilité à court terme si les résultats sont là — boomerang sinon.",
        effects: { influence: -10 },
        hiddenPoliticsEffects: { scandalRisk: 5, eliteTrust: -3, mediaMood: -2 },
      },
    ],
  },

  // ── Signal positif : cabinet sain ────────────────────────────────────────

  {
    id: "minister_conflict_bilan_sain",
    title: "Transparence — le cabinet est jugé exemplaire",
    source: "Observatoire de l'Éthique fictif",
    type: "national",
    urgency: "faible",
    conditionKey: "minister_conflict_cleaned_up",
    minActionsGap: 20,
    isInteractive: false,
    description: "L'Observatoire de l'Éthique fictif publie un rapport positif sur la transparence du cabinet. Les déclarations d'intérêts à jour et l'absence de signalements graves renforcent la crédibilité institutionnelle du gouvernement.",
    autoEffects: { influence: 20 },
  },

];
