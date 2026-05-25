import { clamp } from "@/logic/utils";
import { CANDIDATE_POOL, type MinisterCandidate } from "@/data/candidatePool";
import type { StrategyMinisterId } from "@/data/strategyMinisters";
import type { StrategyGameState, StrategyMinister } from "@/types/strategy";

// ── Types publics ─────────────────────────────────────────────────────────────

export type { MinisterCandidate };

export interface AppointmentPreview {
  eliteTrustDelta:  number;
  mediaMoodDelta:   number;
  popularityDelta:  number;
  scandalRiskDelta: number;
  notes: string[];
}

// ── Requête de candidats ──────────────────────────────────────────────────────

export function getCandidatesForPosition(
  ministerId: StrategyMinisterId,
): MinisterCandidate[] {
  return CANDIDATE_POOL[ministerId] ?? [];
}

// ── Prévisualisation des effets ───────────────────────────────────────────────

export function previewAppointment(
  candidate: MinisterCandidate,
  current: StrategyMinister,
): AppointmentPreview {
  const notes: string[] = [];

  // Coût politique → confiance des élites (max -7)
  const eliteTrustDelta = -Math.min(7, Math.round(candidate.politicalCost / 14));
  if (eliteTrustDelta <= -5) notes.push("Nomination controversée auprès des cercles dirigeants.");
  else if (eliteTrustDelta <= -3) notes.push("Légère réserve des élites sur cette nomination.");

  // Charisme → humeur médiatique
  const mediaMoodDelta =
    candidate.charisma >= 72 ?  3 :
    candidate.charisma <  45 ? -3 : 0;
  if (mediaMoodDelta > 0) notes.push(`${candidate.name} bénéficie d'une couverture médiatique favorable.`);

  // Intégrité → risque de scandale
  const scandalRiskDelta =
    candidate.integrity >= 72 ? -6 :
    candidate.integrity <  45 ?  8 : 0;
  if (scandalRiskDelta > 0) notes.push("Profil sensible — antécédents pouvant alimenter des enquêtes.");

  // Compétence relative → popularité
  const compDelta = candidate.competence - current.competence;
  const popularityDelta =
    compDelta >= 15 ?  2 :
    compDelta <= -15 ? -2 : 0;
  if (popularityDelta > 0)  notes.push("Nomination saluée — profil nettement supérieur.");
  if (popularityDelta < 0)  notes.push("Nomination discutée — l'opinion juge le profil moins solide.");

  // Risque de nomination → avertissement
  if (candidate.appointmentRisk >= 62) {
    notes.push(`Risque médiatique élevé — des révélations post-nomination sont possibles.`);
  }

  return { eliteTrustDelta, mediaMoodDelta, popularityDelta, scandalRiskDelta, notes };
}

// ── Application de la succession ─────────────────────────────────────────────

export function applySuccession(
  state: StrategyGameState,
  ministerId: string,
  candidate: MinisterCandidate,
): StrategyGameState {
  const current = state.strategyMinisters.find((m) => m.id === ministerId);
  if (!current) return state;

  const preview = previewAppointment(candidate, current);

  // Dériver le scandalRisk du candidat à partir de son intégrité
  const derivedScandalRisk = Math.max(5, Math.round((100 - candidate.integrity) / 4));

  // Remplacer le ministre
  const strategyMinisters: StrategyMinister[] = state.strategyMinisters.map((m) =>
    m.id === ministerId
      ? {
          id: ministerId,
          name: candidate.name,
          loyalty: candidate.loyalty,
          competence: candidate.competence,
          scandalRisk: derivedScandalRisk,
        }
      : m,
  );

  // Effets sur la politique cachée
  const hiddenPolitics = {
    ...state.hiddenPolitics,
    eliteTrust:  clamp(state.hiddenPolitics.eliteTrust  + preview.eliteTrustDelta),
    mediaMood:   clamp(state.hiddenPolitics.mediaMood   + preview.mediaMoodDelta),
    scandalRisk: clamp(state.hiddenPolitics.scandalRisk + preview.scandalRiskDelta),
  };

  // Effet sur la popularité nationale
  const nationalIndicators = {
    ...state.nationalIndicators,
    popularity: clamp(state.nationalIndicators.popularity + preview.popularityDelta),
  };

  // Fatigue initiale du nouveau ministre (légère pression de départ)
  const ministerFatigue: Record<string, number> = {
    ...(state.ministerFatigue ?? {}),
    [ministerId]: 20,
  };

  return {
    ...state,
    strategyMinisters,
    hiddenPolitics,
    nationalIndicators,
    ministerFatigue,
  };
}
