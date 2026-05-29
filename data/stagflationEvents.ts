import type { NewsEvent } from "@/types/strategy";

export const STAGFLATION_EVENTS: NewsEvent[] = [
  {
    id:            "stagflation_crisis",
    title:         "Piège stagflationniste — inflation et stagnation simultanées",
    source:        "Conseil économique national — Note d'alerte",
    type:          "economie",
    urgency:       "critique",
    description:
      "L'économie nationale est entrée dans un piège stagflationniste : l'inflation persiste malgré la faiblesse de l'activité et la montée du chômage. Les instruments classiques sont mis en échec — baisser les taux risque d'aggraver l'inflation, les augmenter risque d'enfoncer l'économie. Le gouvernement doit choisir une orientation sans garantie de succès immédiat.",
    isInteractive: true,
    minActionsGap: 30,
    conditionKey:  "stagflation_crisis",
    choices: [
      // ── Choix 1 : Plan énergie ──────────────────────────────────────────────
      {
        id:          "stagflation_plan_energie",
        label:       "Plan énergie — attaquer la racine de l'inflation",
        consequence:
          "Investissement massif dans la sécurisation des approvisionnements et la diversification énergétique. L'instabilité énergétique est le principal amplificateur de l'inflation structurelle. Effets lents mais durables. Coût budgétaire immédiat. Aucun effet visible sur le chômage à court terme.",
        effects:                  { money: -2, energy: 1 },
        fiscalSpendingType:       "energy",
        fiscalSpendingIntensity:  72,
        supplyChainEffects:       { energie: { disruptionRisk: -12, stockLevel: 5 } },
        investorConfidenceDelta:  2,
      },
      // ── Choix 2 : Soutien pouvoir d'achat ciblé ────────────────────────────
      {
        id:          "stagflation_soutien_achat",
        label:       "Soutien ciblé au pouvoir d'achat",
        consequence:
          "Aide directe aux ménages les plus exposés à la hausse des prix. La mesure réduit la détresse sociale immédiate et calme temporairement les tensions. Mais en injectant de la demande dans une économie sous tension, elle risque d'alimenter l'inflation à moyen terme. Aucun effet structurel sur le chômage.",
        effects:                  { money: -2 },
        fiscalSpendingType:       "emergency_aid",
        fiscalSpendingIntensity:  65,
        hiddenPoliticsEffects:    { popularFatigue: -6 },
        indicatorEffects:         { popularity: 3 },
        queuesDelayedConsequence: {
          id:           "stagflation_achat_delayed_inflation",
          delayActions: 4,
          effectType:   "indicator_effect",
          payload:      { economy: -1 },
        },
      },
      // ── Choix 3 : Réforme de la productivité ───────────────────────────────
      {
        id:          "stagflation_reforme_productivite",
        label:       "Réforme structurelle de la productivité",
        consequence:
          "Plan formation professionnelle, soutien aux PME innovantes, simplification réglementaire. La réforme ne produit aucun effet visible à court terme — c'est son principal défaut politique. Elle s'attaque aux causes profondes de la stagnation productive. Le tissu économique se recompose lentement.",
        effects:                  { money: -1, influence: -1 },
        fiscalSpendingType:       "training",
        fiscalSpendingIntensity:  68,
        smeHealthDelta:            4,
        startupEcosystemDelta:     3,
      },
      // ── Choix 4 : Austérité budgétaire ─────────────────────────────────────
      {
        id:          "stagflation_austerite",
        label:       "Austérité budgétaire — discipline fiscale",
        consequence:
          "Réduction des dépenses publiques, gel des embauches, contraction de la demande publique. Les marchés et la banque centrale apprécient le signal de rigueur. Mais la réduction de la demande aggrave le chômage à court terme et amplifie la pression sur les ménages. Aucun effet sur l'inflation d'offre.",
        effects:                   { money: 1 },
        indicatorEffects:          { popularity: -5 },
        hiddenPoliticsEffects:     { popularFatigue: 6, institutionalStability: 3 },
        investorConfidenceDelta:    5,
        centralBankCredibilityDelta: 4,
        monetaryTensionDelta:       -8,
        queuesDelayedConsequence: {
          id:           "stagflation_austerite_delayed_emploi",
          delayActions: 5,
          effectType:   "hidden_politics",
          payload:      { popularFatigue: 4 },
        },
      },
      // ── Choix 5 : Relance massive risquée ──────────────────────────────────
      {
        id:          "stagflation_relance_risquee",
        label:       "Relance massive — pari sur la croissance",
        consequence:
          "Plan de dépenses publiques majeur pour relancer l'activité et l'emploi. Le pari : si la croissance revient, l'inflation finira par se résorber via l'offre. Le risque : alimenter une spirale inflationniste si la demande dépasse les capacités de production. Les marchés restent sceptiques. Aucune garantie.",
        effects:                  { money: -3 },
        fiscalSpendingType:       "industry",
        fiscalSpendingIntensity:  85,
        indicatorEffects:         { popularity: 2 },
        investorConfidenceDelta:  -4,
        monetaryTensionDelta:      8,
        queuesDelayedConsequence: {
          id:           "stagflation_relance_delayed_inflation",
          delayActions: 5,
          effectType:   "hidden_politics",
          payload:      { popularFatigue: 5 },
        },
      },
      // ── Choix 6 : Pacte social temporaire ──────────────────────────────────
      {
        id:          "stagflation_pacte_social",
        label:       "Pacte social temporaire — accord tripartite",
        consequence:
          "Négociation d'urgence entre gouvernement, syndicats et patronat : modération salariale en échange de garanties sur l'emploi et d'engagements sur les prix. La mesure ne règle aucun problème économique fondamental, mais elle réduit la friction sociale et stabilise les anticipations à court terme. Coût politique élevé.",
        effects:                     { influence: -2 },
        hiddenPoliticsEffects:       { popularFatigue: -5, institutionalStability: 3 },
        inequalityIndexDelta:        -6,
        centralBankCredibilityDelta:  2,
        monetaryTensionDelta:        -6,
        indicatorEffects:            { popularity: 3 },
      },
    ],
  },
];
