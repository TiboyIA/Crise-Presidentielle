import type { NewsEvent } from "@/types/strategy";

export const WAVE_EVENTS: NewsEvent[] = [
  // ── Alerte de propagation — onde forte détectée ──────────────────────────
  {
    id:          "wave_containment_crisis",
    title:       "Alerte : onde de propagation détectée par la cellule de veille",
    source:      "Cellule Interministérielle de Crise",
    type:        "national",
    urgency:     "forte",
    description: "La cellule de veille signale qu'une crise récente génère des effets de bord sur plusieurs secteurs. Une réponse coordonnée peut limiter la contagion avant qu'elle n'atteigne des systèmes sensibles.",
    isInteractive: true,
    conditionKey:  "wave_active_strong",
    minActionsGap: 5,
    choices: [
      {
        id:          "wave_mobiliser_cellule",
        label:       "Mobiliser la cellule interministérielle",
        consequence: "Une task force déployée sur les secteurs exposés. L'onde perd significativement en intensité.",
        effects:          { money: -700 },
        indicatorEffects: { economy: -2 },
        hiddenPoliticsEffects: { institutionalStability: +3 },
        waveDamping:      35,
      },
      {
        id:          "wave_reponse_ciblee",
        label:       "Réponse ciblée par secteur",
        consequence: "Des équipes sectorielles réduisent partiellement l'onde. Efficace mais limité.",
        effects:          { money: -300 },
        waveDamping:      18,
      },
      {
        id:          "wave_surveillance_passive",
        label:       "Surveillance passive uniquement",
        consequence: "L'onde suit son cours naturel. La cellule monitore sans intervenir.",
        effects:          { money: 0 },
      },
    ],
  },
];
