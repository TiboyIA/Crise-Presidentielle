import type { NewsEvent } from "@/types/strategy";

export const BREAKPOINT_EVENTS: NewsEvent[] = [

  // ── 1. Réseau électrique ────────────────────────────────────────────────────
  {
    id: "breakpoint_grid_collapse",
    title: "Rupture du réseau — Défaillance systémique nationale",
    source: "Agence Nationale de l'Énergie",
    type: "national",
    urgency: "critique",
    description: "Le réseau électrique a atteint son seuil critique. Plusieurs régions tombent hors ligne simultanément. La cascade de défaillances s'accélère : hôpitaux, transports, communications.",
    isInteractive: true,
    conditionKey: "breakpoint_grid_rupture",
    minActionsGap: 20,
    choices: [
      {
        id: "bp_grid_emergency_plan",
        label: "Plan d'urgence national réseau",
        consequence: "L'État mobilise des ressources massives. Le réseau se stabilise progressivement mais la facture est lourde.",
        effects: { money: -800, energy: 150, technology: 5 },
        indicatorEffects: { economy: -2 },
        hiddenPoliticsEffects: { institutionalStability: 3 },
      },
      {
        id: "bp_grid_regional_delegation",
        label: "Déléguer la gestion aux régions",
        consequence: "Les collectivités locales prennent le relais. Résultats inégaux selon les territoires.",
        effects: { money: -300, energy: 60 },
        indicatorEffects: { cohesion: -2, economy: -1 },
      },
      {
        id: "bp_grid_rationing",
        label: "Instaurer un rationnement d'urgence",
        consequence: "Le rationnement stabilise la situation mais génère un mécontentement profond.",
        effects: { energy: 40 },
        indicatorEffects: { popularity: -5, economy: -3 },
        hiddenPoliticsEffects: { popularFatigue: 8 },
      },
    ],
  },

  // ── 2. Confiance publique ───────────────────────────────────────────────────
  {
    id: "breakpoint_trust_collapse",
    title: "Rupture de confiance — Mouvement populaire spontané",
    source: "Observatoire Social National",
    type: "social",
    urgency: "critique",
    description: "La défiance citoyenne a atteint un point de rupture. Des manifestations spontanées éclatent dans plusieurs villes. Le lien entre gouvernement et population se délite.",
    isInteractive: true,
    conditionKey: "breakpoint_trust_rupture",
    minActionsGap: 20,
    choices: [
      {
        id: "bp_trust_grand_dialogue",
        label: "Grand dialogue national",
        consequence: "Le gouvernement tend la main. Certains manifestants entrent dans un processus de consultation. La tension baisse graduellement.",
        effects: { money: -400, influence: -20 },
        indicatorEffects: { popularity: 6, cohesion: 4 },
        hiddenPoliticsEffects: { popularFatigue: -8, mediaMood: 5 },
      },
      {
        id: "bp_trust_security_response",
        label: "Maintien de l'ordre renforcé",
        consequence: "L'ordre est maintenu mais la fracture sociale s'élargit. Les médias amplifient les tensions.",
        effects: { military: 10, money: -200 },
        indicatorEffects: { security: 4, popularity: -5, cohesion: -3 },
        hiddenPoliticsEffects: { scandalRisk: 10 },
      },
      {
        id: "bp_trust_reform_signal",
        label: "Annoncer une réforme symbolique",
        consequence: "L'annonce calme provisoirement les esprits mais les attentes sont désormais élevées.",
        effects: { influence: -15 },
        indicatorEffects: { popularity: 3 },
        hiddenPoliticsEffects: { mediaMood: 6, popularFatigue: -5 },
      },
    ],
  },

  // ── 3. Infrastructures ──────────────────────────────────────────────────────
  {
    id: "breakpoint_infra_collapse",
    title: "Rupture infrastructurelle — Série de défaillances critiques",
    source: "Inspection Générale des Infrastructures",
    type: "national",
    urgency: "critique",
    description: "L'usure accumulée des infrastructures a franchi le seuil de rupture. Ponts, canalisations, réseaux de chaleur : les défaillances se multiplient plus vite que la maintenance ne peut les absorber.",
    isInteractive: true,
    conditionKey: "breakpoint_infra_rupture",
    minActionsGap: 20,
    choices: [
      {
        id: "bp_infra_emergency_invest",
        label: "Programme d'investissement d'urgence",
        consequence: "Des milliards sont injectés dans les infrastructures critiques. La rénovation massive prend le relais.",
        effects: { money: -1200, technology: 10 },
        indicatorEffects: { economy: -2, ecology: 2 },
        wearReduction: 20,
        hiddenPoliticsEffects: { institutionalStability: 5 },
      },
      {
        id: "bp_infra_triage",
        label: "Triage — Prioriser les infrastructures vitales",
        consequence: "Seuls les systèmes critiques sont maintenus. Les zones périphériques sont temporairement abandonnées.",
        effects: { money: -500, energy: -80 },
        indicatorEffects: { cohesion: -3 },
        wearReduction: 8,
      },
      {
        id: "bp_infra_eu_plan",
        label: "Demander un plan européen de réhabilitation",
        consequence: "L'Union Européenne débloque des fonds en échange d'engagements sur les réformes structurelles.",
        effects: { money: 400, influence: -20 },
        indicatorEffects: { economy: 1 },
        wearReduction: 12,
      },
    ],
  },

  // ── 4. Cyberdéfense ─────────────────────────────────────────────────────────
  {
    id: "breakpoint_cyber_breach",
    title: "Rupture cybersécurité — Brèche systémique détectée",
    source: "Centre National Cybersécurité",
    type: "cyber",
    urgency: "critique",
    description: "La cyberdéfense nationale a atteint un niveau de fragilité critique. Des acteurs hostiles exploitent les failles : réseaux gouvernementaux, systèmes bancaires et communications stratégiques sont compromis.",
    isInteractive: true,
    conditionKey: "breakpoint_cyber_rupture",
    minActionsGap: 20,
    choices: [
      {
        id: "bp_cyber_lockdown",
        label: "Confinement numérique d'urgence",
        consequence: "Les systèmes sensibles sont isolés. La brèche est contenue mais l'administration fonctionne au ralenti.",
        effects: { cyberDefense: 25, intelligence: -15, money: -600 },
        thermalReduction: 8,
      },
      {
        id: "bp_cyber_ally_support",
        label: "Appel à l'aide des alliés technologiques",
        consequence: "Des experts alliés déploient des contre-mesures. Le coût politique est notable mais efficace.",
        effects: { cyberDefense: 18, intelligence: 10, influence: -25 },
      },
      {
        id: "bp_cyber_offensive",
        label: "Lancer une contre-offensive cyber",
        consequence: "L'attaque est contrée par la force. Risque diplomatique élevé mais signal dissuasif envoyé.",
        effects: { cyberDefense: 12, intelligence: 5, military: -10 },
        indicatorEffects: { security: 4 },
        hiddenPoliticsEffects: { eliteTrust: -5 },
      },
    ],
  },

  // ── 5. Finances publiques ───────────────────────────────────────────────────
  {
    id: "breakpoint_finance_crisis",
    title: "Rupture budgétaire — Crise de solvabilité imminente",
    source: "Cour des Comptes Nationale",
    type: "economie",
    urgency: "critique",
    description: "La dette et le déficit ont atteint des niveaux intenables. Les marchés financiers réagissent : les taux d'emprunt s'envolent. La capacité de l'État à financer ses engagements est remise en question.",
    isInteractive: true,
    conditionKey: "breakpoint_finance_rupture",
    minActionsGap: 20,
    choices: [
      {
        id: "bp_finance_austerity",
        label: "Plan d'austérité structurel",
        consequence: "Le gouvernement engage un plan de rigueur douloureux. Les marchés se calment mais la popularité chute.",
        effects: { money: 800 },
        indicatorEffects: { economy: 4, popularity: -8, publicBudget: 5 },
        hiddenPoliticsEffects: { eliteTrust: 5, popularFatigue: 10 },
      },
      {
        id: "bp_finance_eu_bailout",
        label: "Demander un soutien financier européen",
        consequence: "L'Europe accorde un prêt conditionnel. La souveraineté budgétaire est temporairement encadrée.",
        effects: { money: 1200, influence: -30 },
        indicatorEffects: { economy: 2, publicBudget: 3 },
      },
      {
        id: "bp_finance_sovereign_bond",
        label: "Émission obligataire d'urgence",
        consequence: "L'État emprunte sur les marchés à des taux élevés. Court terme stabilisé, dette alourdie.",
        effects: { money: 600 },
        indicatorEffects: { economy: 1, publicBudget: 1 },
        hiddenPoliticsEffects: { institutionalStability: -3 },
      },
    ],
  },

];
