import type { NewsEvent } from "@/types/strategy";

export const GRID_EVENTS: NewsEvent[] = [

  // ── Crise critique : oscillations de fréquence ───────────────────────────
  {
    id:          "grid_freq_instability",
    title:       "Oscillations de fréquence sur le réseau national",
    source:      "Réseau de Transport d'Électricité",
    type:        "economie",
    urgency:     "critique",
    description: "Des capteurs sur les lignes haute tension enregistrent des variations anormales de fréquence. Les sous-stations signalent des pics inhabituels. Sans arbitrage immédiat, un effondrement en cascade reste possible.",
    isInteractive: true,
    conditionKey:  "grid_critical",
    minActionsGap: 15,
    choices: [
      {
        id:          "grid_delestage_preventif",
        label:       "Délestage préventif ciblé",
        consequence: "Coupures tournantes dans quatre régions. L'économie souffre à court terme, mais le réseau est stabilisé.",
        effects:          { money: -900, energy: -35 },
        indicatorEffects: { economy: -4, cohesion: -5 },
        inertiaEffects:   { infrastructure: 8 },
      },
      {
        id:          "grid_maintenir_puissance",
        label:       "Maintenir la pleine puissance",
        consequence: "Le réseau tient pour l'instant — mais chaque heure accroît le risque de blackout généralisé.",
        effects:          { money: -300, energy: +15 },
        indicatorEffects: { popularity: -5, security: -3, economy: -2 },
      },
    ],
  },

  // ── Tension réseau : alerte délestage régional ───────────────────────────
  {
    id:          "grid_load_shedding",
    title:       "Alerte réseau : tension sur les lignes haute tension",
    source:      "Ministère de l'Énergie",
    type:        "economie",
    urgency:     "forte",
    description: "Le gestionnaire du réseau signale une consommation proche des capacités maximales. Sans arbitrage, des régions pourraient être coupées sans préavis au prochain pic de demande.",
    isInteractive: true,
    conditionKey:  "grid_tension",
    minActionsGap: 20,
    choices: [
      {
        id:          "grid_delestage_tournant",
        label:       "Plan de délestage tournant",
        consequence: "Coupures organisées par roulement. Protestations locales, mais le réseau passe la crise.",
        effects:          { money: -500 },
        indicatorEffects: { cohesion: -5, economy: -3, popularity: -3 },
        inertiaEffects:   { infrastructure: 5 },
      },
      {
        id:          "grid_reserve_energetique",
        label:       "Mobiliser les réserves énergétiques",
        consequence: "Les stocks d'urgence absorbent la pointe. Coûteux, mais aucune coupure visible.",
        effects:          { money: -700, energy: -50 },
        indicatorEffects: { popularity: +3, economy: -2 },
      },
      {
        id:          "grid_appel_reduction",
        label:       "Appel à la sobriété volontaire",
        consequence: "Message de réduction diffusé. Résultats inégaux — certains ménages répondent, d'autres ignorent l'appel.",
        effects:          { money: -80 },
        indicatorEffects: { cohesion: +3, economy: -2, ecology: +2 },
      },
    ],
  },

  // ── Opportunité : audit de résilience et modernisation ───────────────────
  {
    id:          "grid_resilience_audit",
    title:       "Rapport d'audit : modernisation du réseau recommandée",
    source:      "Autorité de Sûreté Énergétique",
    type:        "economie",
    urgency:     "moyenne",
    description: "Un audit indépendant identifie des infrastructures vieillissantes et une exposition croissante aux incidents cyber et climatiques. Trois orientations sont proposées.",
    isInteractive: true,
    conditionKey:  "grid_stable_opportunity",
    minActionsGap: 30,
    choices: [
      {
        id:          "grid_modernisation_complete",
        label:       "Programme de modernisation complet",
        consequence: "Investissement lourd, retour à long terme. Le réseau gagnera progressivement en robustesse.",
        effects:          { money: -1500, technology: +18 },
        indicatorEffects: { economy: -3 },
        inertiaEffects:   { infrastructure: 14, energie: 10 },
      },
      {
        id:          "grid_partenariat_prive",
        label:       "Partenariat public-privé ciblé",
        consequence: "Coûts partagés, modernisation partielle. Moins de risque, moins de gain.",
        effects:          { money: -600, technology: +7, influence: -12 },
        inertiaEffects:   { infrastructure: 7 },
      },
      {
        id:          "grid_reporter",
        label:       "Reporter à la prochaine loi de finances",
        consequence: "Le statu quo est maintenu. Le rapport sera probablement classé sans suite.",
        effects:          { money: 0 },
        indicatorEffects: { economy: +1 },
      },
    ],
  },
];
