import type { NewsEvent } from "@/types/strategy";

export const WHISTLEBLOWER_EVENTS: NewsEvent[] = [

  // ── Signal précoce ────────────────────────────────────────────────────────

  {
    id: "whistleblower_signal_interne",
    title: "Signal interne : un informateur hésite à agir",
    source: "Inspection Générale fictive",
    type: "national",
    urgency: "moyenne",
    conditionKey: "whistleblower_alert_pending",
    minActionsGap: 10,
    isInteractive: true,
    description: "L'Inspection Générale fictive a reçu un signalement confidentiel. Un agent interne dispose de documents compromettants et réfléchit à leur transmission. L'Élysée peut encore anticiper avant que la situation ne devienne publique.",
    choices: [
      {
        id: "enquete_rapide_wb",
        label: "Ouvrir une enquête préventive confidentielle",
        consequence: "Enquête discrète lancée. Le risque de fuite est réduit et la conformité institutionnelle renforcée.",
        effects: { influence: -15 },
        hiddenPoliticsEffects: { institutionalStability: 4, scandalRisk: -5, eliteTrust: 2 },
      },
      {
        id: "surveiller_wb",
        label: "Surveiller discrètement sans agir",
        consequence: "Attentisme. Le signal reste actif mais non traité. La pression continue de monter.",
        effects: { intelligence: -10 },
        hiddenPoliticsEffects: { scandalRisk: 3 },
      },
      {
        id: "etouffer_wb",
        label: "Neutraliser le signal — classer sans suite",
        consequence: "Dossier étouffé pour l'instant. Si le signal refait surface, l'opinion sera moins indulgente.",
        effects: {},
        hiddenPoliticsEffects: { scandalRisk: 8, mediaMood: -5, institutionalStability: -3 },
        indicatorEffects: { popularity: -1 },
      },
    ],
  },

  // ── Fuite médiatique ──────────────────────────────────────────────────────

  {
    id: "whistleblower_fuite_media",
    title: "Fuite — un document interne dans la presse",
    source: "Presse d'Investigation",
    type: "national",
    urgency: "forte",
    conditionKey: "whistleblower_media_leak",
    minActionsGap: 12,
    isInteractive: true,
    description: "Un document classifié interne a été transmis à un journal d'investigation. Il révèle des irrégularités dans des décisions récentes. La publication est imminente. L'Élysée doit choisir sa posture avant parution.",
    choices: [
      {
        id: "reconnaitre_enquete_publique",
        label: "Reconnaître et annoncer une enquête publique",
        consequence: "Prise d'initiative. Le récit passe de 'scandale' à 'autocorrection responsable'. Coût politique immédiat, crédibilité à terme.",
        effects: { influence: -25 },
        indicatorEffects: { popularity: -2 },
        hiddenPoliticsEffects: { scandalRisk: -12, institutionalStability: 5, mediaMood: 6, eliteTrust: -2 },
      },
      {
        id: "bloquer_diffusion_wb",
        label: "Tenter de bloquer la diffusion",
        consequence: "Pression exercée sur la presse. Si le blocage échoue, la réaction sera amplifiée.",
        effects: { intelligence: -20 },
        hiddenPoliticsEffects: { mediaMood: -10, scandalRisk: 14, popularFatigue: 5 },
        indicatorEffects: { popularity: -3 },
      },
      {
        id: "designer_responsable_wb",
        label: "Désigner un responsable — sacrifier un intermédiaire",
        consequence: "Un bouc émissaire absorbe le choc politique immédiat. La confiance des élites souffre.",
        effects: { influence: -15 },
        indicatorEffects: { popularity: -1 },
        hiddenPoliticsEffects: { scandalRisk: -4, mediaMood: 2, eliteTrust: -7, institutionalStability: -2 },
      },
    ],
  },

  // ── Escalade vers autorité fictive ────────────────────────────────────────

  {
    id: "whistleblower_autorite_fictive",
    title: "L'alerte transmise à la Haute Autorité fictive",
    source: "Haute Autorité de Transparence fictive",
    type: "national",
    urgency: "forte",
    conditionKey: "whistleblower_escalation_risk",
    minActionsGap: 15,
    isInteractive: true,
    description: "L'informateur a déposé un dossier formel auprès de la Haute Autorité de Transparence fictive. Cette autorité indépendante fictive dispose désormais d'éléments pour ouvrir une procédure formelle. La réponse du gouvernement dans les prochaines heures sera déterminante.",
    choices: [
      {
        id: "cooperer_autorite",
        label: "Coopérer pleinement avec l'autorité",
        consequence: "Coopération totale. L'image institutionnelle est préservée à long terme, malgré un coût politique immédiat.",
        effects: { influence: -30 },
        indicatorEffects: { popularity: -2, cohesion: 2 },
        hiddenPoliticsEffects: { institutionalStability: 8, scandalRisk: -10, mediaMood: 5, eliteTrust: 2 },
      },
      {
        id: "contester_competence",
        label: "Contester la compétence de l'autorité",
        consequence: "Conflit institutionnel ouvert. L'opposition exploite la résistance du gouvernement.",
        effects: {},
        indicatorEffects: { popularity: -3 },
        hiddenPoliticsEffects: { institutionalStability: -6, scandalRisk: 12, mediaMood: -7 },
      },
      {
        id: "negocier_coulisses",
        label: "Négocier un accord confidentiel",
        consequence: "Accord discret. La procédure est suspendue en échange de garanties non publiques.",
        effects: { money: -30, influence: -20 },
        hiddenPoliticsEffects: { scandalRisk: -5, institutionalStability: 2 },
      },
    ],
  },

  // ── Scandale national ─────────────────────────────────────────────────────

  {
    id: "whistleblower_scandale_national",
    title: "ALERTE — Lanceur d'alerte : scandale d'État",
    source: "AFP — ALERTE",
    type: "national",
    urgency: "critique",
    conditionKey: "whistleblower_national_scandal",
    minActionsGap: 20,
    isInteractive: true,
    description: "Plusieurs informateurs coordonnés ont transmis leurs dossiers à la presse et à une autorité fictive simultanément. Le scandale éclate publiquement. L'opposition réclame une commission d'enquête parlementaire. La légitimité de l'exécutif est directement mise en cause.",
    choices: [
      {
        id: "assumer_reformes_wb",
        label: "Assumer et annoncer des réformes immédiates",
        consequence: "Discours de transparence totale. Coût politique immédiat, crédibilité institutionnelle à long terme.",
        effects: { influence: -45 },
        indicatorEffects: { popularity: -4, cohesion: 2 },
        hiddenPoliticsEffects: { scandalRisk: -18, institutionalStability: 7, mediaMood: 5, eliteTrust: -2 },
      },
      {
        id: "bouc_emissaire_wb",
        label: "Sacrifier un ministre — démission immédiate",
        consequence: "Un ministre sacrifié limite les dégâts immédiats. La confiance des élites et la cohésion du cabinet souffrent.",
        effects: { influence: -20 },
        indicatorEffects: { popularity: -2 },
        hiddenPoliticsEffects: { scandalRisk: -8, mediaMood: 2, eliteTrust: -8, institutionalStability: -3 },
      },
      {
        id: "nier_attaquer_wb",
        label: "Nier — contre-attaquer l'opposition",
        consequence: "La défense agressive aggrave l'image. Le scandale s'installe dans la durée.",
        effects: {},
        indicatorEffects: { popularity: -6, cohesion: -4 },
        hiddenPoliticsEffects: { scandalRisk: 18, mediaMood: -12, popularFatigue: 8, institutionalStability: -5 },
      },
    ],
  },

  // ── Bonne gestion — signal positif ────────────────────────────────────────

  {
    id: "whistleblower_gestion_exemplaire",
    title: "Rapport positif — transparence institutionnelle saluée",
    source: "Think Tank Gouvernance fictive",
    type: "national",
    urgency: "faible",
    conditionKey: "whistleblower_exemplary_handling",
    minActionsGap: 20,
    isInteractive: false,
    description: "Un think tank indépendant fictif salue la gestion transparente du gouvernement dans les signalements internes récents. Aucun lanceur d'alerte n'a jugé nécessaire d'alerter la presse. La confiance institutionnelle se renforce discrètement.",
    autoEffects: { influence: 15 },
  },

];
