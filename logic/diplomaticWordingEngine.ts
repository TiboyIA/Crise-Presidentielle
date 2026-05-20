import type { DiplomaticWordingId, HiddenPolitics, NationalIndicators } from "@/types/strategy";

export type { DiplomaticWordingId } from "@/types/strategy";

// ── Définitions ────────────────────────────────────────────────────────────────

export interface DiplomaticWordingDef {
  id:                    DiplomaticWordingId;
  label:                 string;
  /** Échelle de dureté : 1 (très doux) → 5 (très agressif). */
  intensity:             1 | 2 | 3 | 4 | 5;
  /** Bonus/malus sur la relation avec le pays concerné par le choix. */
  relationDelta:         number;
  hiddenPoliticsEffects: Partial<HiddenPolitics>;
  indicatorEffects:      Partial<NationalIndicators>;
  /** Probabilité 0-100 qu'une riposte internationale soit déclenchée (DelayedConsequence). */
  riposteProbability:    number;
}

export const DIPLOMATIC_WORDINGS: Record<DiplomaticWordingId, DiplomaticWordingDef> = {
  exprimer_inquietude: {
    id: "exprimer_inquietude",
    label: "Exprimer une inquiétude",
    intensity: 1,
    relationDelta: -2,
    hiddenPoliticsEffects: { regionalTension: 2 },
    indicatorEffects: { popularity: 2 },
    riposteProbability: 5,
  },
  appeler_au_calme: {
    id: "appeler_au_calme",
    label: "Appeler au calme",
    intensity: 1,
    relationDelta: 3,
    hiddenPoliticsEffects: { mediaMood: 4, regionalTension: -3 },
    indicatorEffects: { popularity: 1 },
    riposteProbability: 2,
  },
  condamner_fermement: {
    id: "condamner_fermement",
    label: "Condamner fermement",
    intensity: 3,
    relationDelta: -8,
    hiddenPoliticsEffects: { mediaMood: -2, regionalTension: 6 },
    indicatorEffects: { popularity: 7 },
    riposteProbability: 25,
  },
  accuser_publiquement: {
    id: "accuser_publiquement",
    label: "Accuser publiquement",
    intensity: 5,
    relationDelta: -15,
    hiddenPoliticsEffects: { mediaMood: -5, regionalTension: 10, scandalRisk: 3 },
    indicatorEffects: { popularity: 9 },
    riposteProbability: 45,
  },
  menacer_sanctions: {
    id: "menacer_sanctions",
    label: "Menacer de sanctions",
    intensity: 4,
    relationDelta: -12,
    hiddenPoliticsEffects: { mediaMood: -3, regionalTension: 8 },
    indicatorEffects: { popularity: 5 },
    riposteProbability: 35,
  },
  proposer_mediation: {
    id: "proposer_mediation",
    label: "Proposer une médiation",
    intensity: 2,
    relationDelta: 6,
    hiddenPoliticsEffects: { mediaMood: 5, regionalTension: -5 },
    indicatorEffects: { popularity: 3 },
    riposteProbability: 3,
  },
  garder_silence: {
    id: "garder_silence",
    label: "Garder le silence",
    intensity: 1,
    relationDelta: 0,
    hiddenPoliticsEffects: { mediaMood: -4 },
    indicatorEffects: { popularity: -5 },
    riposteProbability: 0,
  },
};

// ── API publique ───────────────────────────────────────────────────────────────

export function getDiplomaticWording(id: DiplomaticWordingId): DiplomaticWordingDef {
  return DIPLOMATIC_WORDINGS[id];
}

export const WORDING_COLORS: Record<DiplomaticWordingId, string> = {
  exprimer_inquietude:  "#4a9fff",
  appeler_au_calme:     "#3fbe7a",
  condamner_fermement:  "#FF8040",
  accuser_publiquement: "#e54848",
  menacer_sanctions:    "#e8a93a",
  proposer_mediation:   "#52c97a",
  garder_silence:       "#8890a0",
};

export const WORDING_LABELS: Record<DiplomaticWordingId, string> = {
  exprimer_inquietude:  "Inquiétude exprimée",
  appeler_au_calme:     "Appel au calme",
  condamner_fermement:  "Condamnation ferme",
  accuser_publiquement: "Accusation publique",
  menacer_sanctions:    "Menace de sanctions",
  proposer_mediation:   "Médiation proposée",
  garder_silence:       "Silence officiel",
};
