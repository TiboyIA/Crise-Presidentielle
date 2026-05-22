// ── Appétence au Risque Présidentielle ───────────────────────────────────────
// Profil actuariel dérivé automatiquement de la doctrine de gouvernance.
// Aucun choix supplémentaire n'est imposé au joueur — c'est une conséquence
// naturelle du style de gouvernance choisi.
//
// Trois effets concrets :
//  1. crisisCostFactor  — moduler le coût résiduel des crises en argent
//  2. poolStressDecayBonus — récupération accélérée ou ralentie du pool de réassurance
//  3. marketSkepticismDrift — évolution périodique de la méfiance des marchés

import type { GovernanceDoctrine } from "@/types/strategy";

export type RiskAppetiteProfile =
  | "prudent"
  | "equilibre"
  | "audacieux"
  | "speculatif"
  | "resilient";

export interface RiskAppetiteDef {
  id:                    RiskAppetiteProfile;
  label:                 string;
  icon:                  string;   // MaterialCommunityIcons name
  color:                 string;
  description:           string;
  // Modificateurs actuariels
  crisisCostFactor:      number;   // sur le coût résiduel (1.0 = neutre, <1 = moins cher, >1 = plus cher)
  poolStressDecayBonus:  number;   // points de stress retirés en plus tous les 10 jours
  marketSkepticismDrift: number;   // delta appliqué au marketSkepticism tous les 10 jours
}

// ── Définitions des profils ───────────────────────────────────────────────────

export const RISK_APPETITE_DEFS: Record<RiskAppetiteProfile, RiskAppetiteDef> = {
  prudent: {
    id:                    "prudent",
    label:                 "Prudent",
    icon:                  "shield-check-outline",
    color:                 "#3fbe7a",
    description:           "Coûts de crise réduits (−5 %), marchés rassurés, pool de réassurance récupère plus vite.",
    crisisCostFactor:      0.95,
    poolStressDecayBonus:  3,
    marketSkepticismDrift: -1,
  },
  equilibre: {
    id:                    "equilibre",
    label:                 "Équilibré",
    icon:                  "scale-balance",
    color:                 "#4a9fff",
    description:           "Profil neutre — aucune exposition particulière, aucun avantage actuariel spécifique.",
    crisisCostFactor:      1.00,
    poolStressDecayBonus:  0,
    marketSkepticismDrift: 0,
  },
  audacieux: {
    id:                    "audacieux",
    label:                 "Audacieux",
    icon:                  "lightning-bolt-outline",
    color:                 "#e8a93a",
    description:           "Exposition aux crises accrue (+10 %), marchés légèrement nerveux (+1/période).",
    crisisCostFactor:      1.10,
    poolStressDecayBonus:  0,
    marketSkepticismDrift: 1,
  },
  speculatif: {
    id:                    "speculatif",
    label:                 "Spéculatif",
    icon:                  "chart-areaspline",
    color:                 "#FF8040",
    description:           "Forte volatilité : pertes extrêmes amplifiées (+20 %), marchés méfiants (+2/période).",
    crisisCostFactor:      1.20,
    poolStressDecayBonus:  0,
    marketSkepticismDrift: 2,
  },
  resilient: {
    id:                    "resilient",
    label:                 "Résilient",
    icon:                  "water-outline",
    color:                 "#6b8cce",
    description:           "Meilleure absorption des catastrophes (−3 %), pool de réassurance renforcé (+6/période).",
    crisisCostFactor:      0.97,
    poolStressDecayBonus:  6,
    marketSkepticismDrift: 0,
  },
};

// ── Correspondance doctrine → profil ─────────────────────────────────────────

const DOCTRINE_TO_PROFILE: Record<GovernanceDoctrine, RiskAppetiteProfile> = {
  democratique:   "equilibre",
  technocratique: "prudent",
  securitaire:    "resilient",
  populiste:      "audacieux",
  autoritaire:    "speculatif",
  souverainiste:  "resilient",
  ecologiste:     "prudent",
  liberal:        "speculatif",
};

export function deriveRiskAppetite(doctrine: GovernanceDoctrine): RiskAppetiteProfile {
  return DOCTRINE_TO_PROFILE[doctrine];
}

export function getRiskAppetiteDef(doctrine: GovernanceDoctrine): RiskAppetiteDef {
  return RISK_APPETITE_DEFS[deriveRiskAppetite(doctrine)];
}
