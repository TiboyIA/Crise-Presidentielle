/**
 * types/cosmic.ts — Système Cosmique V2 (état unifié).
 *
 * Remplace les trois états séparés (SpaceNationsState, OrionCityState,
 * MoralNegotiationState) par une seule structure CosmicState.
 *
 * Règles :
 * - Le cosmique est secondaire au jeu présidentiel/géopolitique.
 * - Aucun bonus massif. Effets narratifs et progressifs uniquement.
 * - Aurora ne donne jamais d'aide gratuite.
 * - Obscurium est toujours disponible mais crée de la dette.
 */

// ── Stade de découverte ───────────────────────────────────────────────────────

export type CosmicDiscoveryStage =
  | "hidden"           // Rien détecté — le cosmique est silencieux
  | "signal"           // Premier signal détecté — anomalie inexpliquée
  | "indirect_contact" // Contact indirect confirmé — nature inconnue
  | "orion_discovered" // Cité d'Orion identifiée
  | "council_divided"  // Le Conseil interstellaire est divisé sur la Terre
  | "chambre_access"   // Chambre du Seuil accessible
  | "full_engagement"  // Engagement diplomatique total
  | "surveillance"     // La Terre est sous surveillance active du Tribunal
  | "obscurium_risk";  // Obscurium a infiltré le Conseil — danger immédiat

export const COSMIC_STAGE_LABELS: Record<CosmicDiscoveryStage, string> = {
  hidden:            "Non détecté",
  signal:            "Premier signal",
  indirect_contact:  "Contact indirect",
  orion_discovered:  "Cité d'Orion découverte",
  council_divided:   "Conseil divisé",
  chambre_access:    "Chambre accessible",
  full_engagement:   "Engagement total",
  surveillance:      "Sous surveillance",
  obscurium_risk:    "Infiltration Obscurium",
};

export const COSMIC_STAGE_COLORS: Record<CosmicDiscoveryStage, string> = {
  hidden:            "#3a4050",
  signal:            "#7ec8f7",
  indirect_contact:  "#4a9fff",
  orion_discovered:  "#c8a87e",
  council_divided:   "#e8c44f",
  chambre_access:    "#a78bfa",
  full_engagement:   "#3fbe7a",
  surveillance:      "#e07840",
  obscurium_risk:    "#9b6fd4",
};

// ── Niveau d'accès à la Cité d'Orion ─────────────────────────────────────────

export type OrionAccessLevel =
  | "inconnu"
  | "observé"
  | "invité"
  | "toléré"
  | "surveillé"
  | "banni";

export const ORION_ACCESS_LABELS: Record<OrionAccessLevel, string> = {
  inconnu:   "Non découvert",
  observé:   "Observé à distance",
  invité:    "Invité officieux",
  toléré:    "Toléré sous conditions",
  surveillé: "Sous surveillance active",
  banni:     "Accès révoqué",
};

export const ORION_ACCESS_COLORS: Record<OrionAccessLevel, string> = {
  inconnu:   "#5a6a82",
  observé:   "#7ec8f7",
  invité:    "#4caf82",
  toléré:    "#e8c44f",
  surveillé: "#e07840",
  banni:     "#d04040",
};

// ── Quartiers de la Cité d'Orion (V2 : inclut la Chambre du Seuil) ───────────

export type OrionDistrictId =
  | "porte_orion"
  | "marche_silences"
  | "couloir_noir"
  | "dome_ambassades"
  | "phare_aurora"
  | "archives_stellaires"
  | "tribunal_especes"
  | "chambre_seuil";

// ── Type de pacte ─────────────────────────────────────────────────────────────

export type CosmicPactType = "none" | "aurora" | "obscurium" | "neutral";

export const COSMIC_PACT_LABELS: Record<CosmicPactType, string> = {
  none:      "Aucun pacte actif",
  aurora:    "Pacte en cours — Aurora",
  obscurium: "Engagement en cours — Obscurium",
  neutral:   "Position neutre assumée",
};

// ── État cosmique unifié ──────────────────────────────────────────────────────

export interface CosmicState {
  // Stade de découverte global
  discoveryStage:    CosmicDiscoveryStage;
  firstDiscoveredAt: number;          // mandateDay du premier signal

  // Conseil Interstellaire (anciennement SpaceNationsState)
  cosmicCredibility:  number;         // 0-100 — jugement global
  councilAttention:   number;         // 0-100 — intérêt du Conseil pour la Terre
  auroraSupport:      number;         // 0-100 — soutien d'Aurora Prime
  obscuriumInfluence: number;         // 0-100 — emprise d'Obscurium
  lastCouncilVoteAt:  number;         // mandateDay du dernier vote

  // Cité d'Orion (anciennement OrionCityState)
  orionDiscovered:    boolean;
  orionStanding:      number;         // 0-100 — réputation dans la Cité
  orionAccessLevel:   OrionAccessLevel;
  auroraEmbassyTrust: number;         // 0-100 — confiance du Phare d'Aurora
  obscuriumTrace:     number;         // 0-100 — empreinte Obscurium dans la Cité
  knownDistricts:     OrionDistrictId[];
  lastOrionEventAt:   number;         // mandateDay du dernier événement oc_/cv_

  // Chambre du Seuil (anciennement MoralNegotiationState)
  auroraTrust:           number;      // 0-100 — confiance morale d'Aurora
  obscuriumDebt:         number;      // 0-100 — dette invisible envers Obscurium
  moralBalance:          number;      // -100 à +100 (+100 = alignement Aurora)
  activePact:            CosmicPactType;
  pactExpiresAtAction:   number;      // actionCount absolu d'expiration (0 = aucun)
  auroraConditionBroken: boolean;
  lastNegotiationAt:     number;      // actionCount du dernier événement de négociation
}

export const DEFAULT_COSMIC_STATE: CosmicState = {
  discoveryStage:        "hidden",
  firstDiscoveredAt:     0,
  cosmicCredibility:     20,
  councilAttention:      0,
  auroraSupport:         15,
  obscuriumInfluence:    10,
  lastCouncilVoteAt:     0,
  orionDiscovered:       false,
  orionStanding:         0,
  orionAccessLevel:      "inconnu",
  auroraEmbassyTrust:    10,
  obscuriumTrace:        0,
  knownDistricts:        [],
  lastOrionEventAt:      0,
  auroraTrust:           20,
  obscuriumDebt:         0,
  moralBalance:          0,
  activePact:            "none",
  pactExpiresAtAction:   0,
  auroraConditionBroken: false,
  lastNegotiationAt:     0,
};

// ── Effets cosmiques d'un choix (NewsChoice.cosmicEffects) ───────────────────

export interface CosmicStateEffects {
  cosmicCredibilityDelta?:  number;
  councilAttentionDelta?:   number;
  auroraSupportDelta?:      number;
  obscuriumInfluenceDelta?: number;
  orionStandingDelta?:      number;
  auroraEmbassyTrustDelta?: number;
  obscuriumTraceDelta?:     number;
  auroraTrustDelta?:        number;
  obscuriumDebtDelta?:      number;
  moralBalanceDelta?:       number;
  orionDiscovery?:          boolean;   // révèle la Cité d'Orion
  activatePact?:            CosmicPactType;
  endPact?:                 boolean;
  pactDurationActions?:     number;    // durée en actions (requis si activatePact != none)
  advanceStage?:            boolean;   // passe au stade de découverte suivant
}
