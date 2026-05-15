/**
 * realTimeEngine — cadence l'avancée du mandateDay depuis l'horloge murale.
 *
 * Ratio de temps : défini dans simulationClock.ts
 *   1 heure réelle = 4 heures jeu
 *   1 jour de mandat = 24 heures jeu = 6 heures réelles (360 minutes réelles)
 *
 * Design : les actions du joueur sont time-neutral ; seul le passage du temps
 * réel fait avancer le mandat. Le moteur plafonne l'accumulation hors-ligne
 * pour éviter les avalanches d'événements au retour du joueur.
 */

import { REAL_MINUTES_PER_MANDATE_DAY } from "@/logic/simulationClock";
import type { StrategyGameState } from "@/types/strategy";

export const REALTIME_CONFIG = {
  /**
   * Minutes réelles par jour de mandat.
   * Source : simulationClock.REAL_MINUTES_PER_MANDATE_DAY
   * Valeur : 360 min = 6 h réelles = 1 jour jeu (24 heures jeu à raison de 4 h jeu / h réelle).
   */
  realMinutesPerMandateDay: REAL_MINUTES_PER_MANDATE_DAY,

  /**
   * Plafond d'accumulation hors-ligne, en minutes réelles.
   * = 1 jour de mandat max par session de rattrapage.
   * Au-delà, le temps écoulé est forfaitairement abandonné.
   */
  maxOfflineMinutes: REAL_MINUTES_PER_MANDATE_DAY, // 360 min = 6 h réelles = 1 jour jeu

  /** Cadence du tick en premier plan (client). */
  tickIntervalMs: 60 * 1000,

  /** Cadence des événements stratégiques (en jours de mandat). */
  pollEveryMandateDays:        10,
  majorCrisisEveryMandateDays: 25,
  bilanEveryMandateDays:       100,

  /**
   * Tolérance aux micro-décalages d'horloge (NTP, corrections légères).
   * En-dessous de ce delta en arrière, on ne flag pas de triche.
   */
  clockSkewToleranceMs: 5 * 60 * 1000, // 5 min
} as const;

export interface RealTimeState {
  /** Timestamp réel du dernier tick réussi. */
  lastTickAt: number;
  /**
   * Minutes réelles accumulées vers le prochain jour de mandat (0..360).
   * Réinitialisé à chaque fois qu'un jour complet est atteint.
   */
  mandateDayProgressMinutes: number;
  /**
   * Plus haut timestamp réel observé — ancre anti-triche.
   * Si l'horloge recule au-delà de la tolérance, aucun progrès n'est accordé.
   */
  lastKnownTime: number;
}

export const DEFAULT_REALTIME_STATE: RealTimeState = {
  lastTickAt:                0,
  mandateDayProgressMinutes: 0,
  lastKnownTime:             0,
};

/** Construit le RealTimeState initial ancré sur l'horloge courante. */
export function initRealTime(now: number): RealTimeState {
  return {
    lastTickAt:                now,
    mandateDayProgressMinutes: 0,
    lastKnownTime:             now,
  };
}

export interface RealTimeAdvance {
  /** Nouveau RealTimeState à persister dans l'état de jeu. */
  realTime: RealTimeState;
  /** Jours de mandat entiers à ajouter à mandateDay ce tick. */
  daysToAdd: number;
  /** Vrai si l'horloge semble avoir été reculée (triche possible). */
  clockTampered: boolean;
}

/**
 * Calcule combien de jours de mandat ajouter en fonction du temps réel écoulé.
 * Plafonne l'accumulation hors-ligne et détecte les manipulations d'horloge.
 *
 * Fonction pure — ne mute pas l'entrée.
 *
 * Formule :
 *   elapsed (min réelles) → progress cumulée → floor(progress / 360) jours
 *   Le reste < 360 min est conservé pour le tick suivant.
 */
export function computeRealTimeAdvance(
  prev: RealTimeState | undefined,
  now: number,
): RealTimeAdvance {
  // Premier lancement / état manquant : initialise sans accorder de progrès.
  if (!prev || prev.lastTickAt === 0) {
    return {
      realTime:      initRealTime(now),
      daysToAdd:     0,
      clockTampered: false,
    };
  }

  // Anti-triche : horloge reculée au-delà de la tolérance → pas de progrès.
  if (now < prev.lastKnownTime - REALTIME_CONFIG.clockSkewToleranceMs) {
    return {
      realTime:      { ...prev, lastTickAt: now },
      daysToAdd:     0,
      clockTampered: true,
    };
  }

  const elapsedMs      = Math.max(0, now - prev.lastTickAt);
  const elapsedMinutes = elapsedMs / 60_000;

  // Plafond hors-ligne : au plus 1 jour de mandat rattrapé par session.
  const cappedMinutes  = Math.min(elapsedMinutes, REALTIME_CONFIG.maxOfflineMinutes);

  const totalProgress    = prev.mandateDayProgressMinutes + cappedMinutes;
  const daysToAdd        = Math.floor(totalProgress / REALTIME_CONFIG.realMinutesPerMandateDay);
  const remainingProgress = totalProgress - daysToAdd * REALTIME_CONFIG.realMinutesPerMandateDay;

  return {
    realTime: {
      lastTickAt:                now,
      mandateDayProgressMinutes: remainingProgress,
      lastKnownTime:             Math.max(prev.lastKnownTime, now),
    },
    daysToAdd,
    clockTampered: false,
  };
}

// ── Helpers pour l'affichage de l'horloge stratégique ────────────────────────

export interface StrategicClockInfo {
  /** Jour de mandat courant. */
  mandateDay: number;
  /** Progression dans le jour courant (0..1). */
  dayProgress: number;
  /**
   * Minutes réelles restantes avant le prochain jour de mandat.
   * Afficher via formatRealMinutes() → "Xh YYmin".
   */
  minutesUntilNextDay: number;
  /** Jours de mandat restants avant le prochain sondage national. */
  daysUntilPoll: number;
  /** Jours de mandat restants avant la prochaine crise majeure planifiée. */
  daysUntilMajorCrisis: number;
  /** Jours de mandat restants avant le prochain bilan présidentiel (tous les 100). */
  daysUntilBilan: number;
}

/** Calcule toutes les données d'affichage pour l'horloge stratégique. */
export function getStrategicClockInfo(state: StrategyGameState): StrategicClockInfo {
  const rt          = state.realTime ?? DEFAULT_REALTIME_STATE;
  const dayProgress = rt.mandateDayProgressMinutes / REALTIME_CONFIG.realMinutesPerMandateDay;
  const minutesUntilNextDay = Math.max(
    0,
    REALTIME_CONFIG.realMinutesPerMandateDay - rt.mandateDayProgressMinutes,
  );

  // Sondage : tous les 10 jours (jours 10, 20, 30…)
  const lastPollCycle    = Math.floor(state.lastPollShownAt / REALTIME_CONFIG.pollEveryMandateDays);
  const nextPollDay      = (lastPollCycle + 1) * REALTIME_CONFIG.pollEveryMandateDays;
  const daysUntilPoll    = Math.max(0, nextPollDay - state.mandateDay);

  // Crise majeure : tous les 25 jours (modulo)
  const daysSinceLastCrisis  = state.mandateDay % REALTIME_CONFIG.majorCrisisEveryMandateDays;
  const daysUntilMajorCrisis = REALTIME_CONFIG.majorCrisisEveryMandateDays - daysSinceLastCrisis;

  // Bilan présidentiel : prochain multiple de 100 après le dernier bilan
  const lastBilanCycle  = Math.floor(state.lastBilanShownAt / REALTIME_CONFIG.bilanEveryMandateDays);
  const nextBilanDay    = (lastBilanCycle + 1) * REALTIME_CONFIG.bilanEveryMandateDays;
  const daysUntilBilan  = Math.max(0, nextBilanDay - state.mandateDay);

  return {
    mandateDay: state.mandateDay,
    dayProgress,
    minutesUntilNextDay,
    daysUntilPoll,
    daysUntilMajorCrisis,
    daysUntilBilan,
  };
}

/** Formate des minutes réelles en "Xh YYmin" (ou "YYmin" si < 1 h). */
export function formatRealMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}
