/**
 * ─── Module 8 — Moteur d'horloge de mandat (PUR) ────────────────────
 *
 * Gère la conversion mois ↔ « Année / Mois », le tirage des bilans
 * trimestriels/annuels, la programmation du prochain événement, et
 * la sanitization des saves antérieures.
 *
 * 100 % pur et déterministe : aucune lecture de Date.now(), aucun
 * setInterval, aucun accès au state React. La couche d'effets vit
 * dans `GameContext.tsx`.
 *
 * Vocabulaire :
 *   - `month` (1..60) : compteur fictif interne au jeu, jamais
 *     converti en date réelle.
 *   - `year` (1..5) et `monthInYear` (1..12) : dérivés pour
 *     affichage uniquement.
 *   - `decision` : équivaut à un appel `resolveChoice`. Conversion
 *     stable : 1 décision ≈ MONTHS_PER_DECISION mois (= 3).
 */
import type {
  Gauges,
  GameTime,
  MandateReportKind,
  MinorEventEntry,
  EventNotification,
  TimeSpeed,
} from "@/types/game";
import {
  computeGameDayDisplay,
  formatGameDayLabel as _formatGameDayLabel,
  formatGameDayShort as _formatGameDayShort,
  GAME_HOURS_PER_REAL_HOUR,
} from "@/logic/simulationClock";
// NB : on inline volontairement les valeurs neutres ici pour garder ce
// module 100 % pur (aucun import depuis `gameEngine`, qui transite par
// l'alias `@/...` non résolu hors d'Expo). Les vraies jauges initiales
// vivent dans `gameEngine.ts` ; ce fallback ne sert que de garde-fou
// quand `sanitizeGameTime` est appelée sans contexte de jauges (load
// ultra-précoce).
const NEUTRAL_GAUGES_FALLBACK: Gauges = {
  popularity: 50,
  economy: 50,
  budget: 50,
  debt: 30,
  security: 50,
  health: 50,
  ecology: 50,
  cohesion: 50,
  diplomacy: 50,
  regionalStability: 50,
  authority: 50,
};

/** Durée totale d'un mandat (5 ans × 12 mois). */
export const TOTAL_MONTHS = 60;

/** Mois écoulés en moyenne entre deux décisions du joueur. */
export const MONTHS_PER_DECISION = 3;

/** Mois par année. */
export const MONTHS_PER_YEAR = 12;

/**
 * ─── LOT 15 — Cooldown de rythme par sévérité d'événement ──────────
 *
 * Pour éviter le spam de décisions et donner au joueur l'impression
 * d'un mandat qui respire, chaque événement majeur impose un délai
 * minimum (et un maximum cible) avant le suivant. Les mineurs et les
 * notifications sont bien plus rapprochés mais n'interrompent jamais.
 */

/** Délai minimum (en mois fictifs) avant qu'un nouvel événement
 *  majeur puisse s'ouvrir après le précédent. Imposé strictement —
 *  un major candidat est déclassé en minor s'il viole ce cooldown.
 *  LOT 16 — Élargi à 4 mois (au lieu de 2) pour donner au joueur le
 *  temps de consulter ministres/régions/recherches entre 2 décisions. */
export const MIN_MONTHS_BETWEEN_MAJOR = 4;

/** Fenêtre cible (min, max) pour replanifier le prochain tirage
 *  après un événement majeur. Tirage uniforme dans [min, max].
 *  LOT 16 — Élargie à 4-8 mois (au lieu de 2-4) pour un mandat qui
 *  respire vraiment ; un major peut tomber tous les 4 à 8 mois. */
export const MAJOR_DELAY_RANGE: readonly [number, number] = [4, 8];

/** LOT 16 — Cooldown minimum entre deux CRISES RARES (scandales,
 *  guerre hybride, crises diplomatiques). Ces événements à très haut
 *  enjeu doivent être l'exception, pas la routine. */
export const MIN_MONTHS_BETWEEN_RARE = 8;

/** LOT 16 — Fenêtre cible pour replanifier après une crise rare.
 *  Tirage uniforme dans [8, 12] mois → 1 à 2 par an au plus. */
export const RARE_DELAY_RANGE: readonly [number, number] = [8, 12];

/** Fenêtre cible pour replanifier après un événement mineur.
 *  LOT 16 — Élargie à 2-3 mois (au lieu de 1-2) pour éviter le sentiment
 *  de spam de cartes pendant le cooldown majeur. */
export const MINOR_DELAY_RANGE: readonly [number, number] = [2, 3];

/** Délai après une notification : on accepte un nouveau tirage assez
 *  vite (les notifs ne saturent pas l'attention).
 *  LOT 16 — Passé de 1 à 2 mois pour aérer le bandeau d'alertes. */
export const NOTIFICATION_DELAY = 2;

/** Durée de vie max d'une carte mineure dans la queue avant auto-purge.
 *  LOT 16 — Allongée à 6 mois (au lieu de 4) pour qu'une carte mineure
 *  reste consultable sur la durée moyenne entre deux majeurs. */
export const MAX_MINOR_AGE_MONTHS = 6;

/** Durée de vie max d'une notification dans le ticker avant auto-purge. */
export const MAX_NOTIFICATION_AGE_MONTHS = 6;

/** Plafond du nombre de notifications simultanément empilées dans
 *  l'AlertTicker. Au-delà, on évince la plus ancienne. */
export const MAX_NOTIFICATION_QUEUE_SIZE = 5;

/**
 * Sélection déterministe d'un délai dans une fenêtre [min, max]
 * (bornes incluses). Le tirage utilise `Math.random` ; cette fonction
 * est donc PURE-EXCEPT-RNG (acceptée car les tirages d'événements
 * eux-mêmes sont déjà aléatoires).
 */
function rollDelay(range: readonly [number, number]): number {
  const [lo, hi] = range;
  if (hi <= lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * LOT 15 + LOT 16 — Replanification du prochain `nextEventMonth`
 * selon la sévérité de l'événement qu'on vient de servir/queuer.
 * Garantit qu'on ne déclenche jamais :
 *   • un major avant `MIN_MONTHS_BETWEEN_MAJOR` mois après le précédent
 *   • un rare  avant `MIN_MONTHS_BETWEEN_RARE`  mois après le précédent
 *
 * Le plancher est appliqué a posteriori sur le délai tiré dans la
 * fenêtre, pour qu'un major tiré « trop tôt » glisse au plus tôt
 * possible et pas plus loin qu'il n'aurait dû.
 */
export function scheduleNextEventMonthBySeverity(
  currentMonth: number,
  severity: "rare" | "major" | "minor" | "notification",
  lastMajorEventMonth: number,
  lastRareEventMonth: number = 0,
): number {
  let delay: number;
  switch (severity) {
    case "rare":
      delay = rollDelay(RARE_DELAY_RANGE);
      break;
    case "major":
      delay = rollDelay(MAJOR_DELAY_RANGE);
      break;
    case "minor":
      delay = rollDelay(MINOR_DELAY_RANGE);
      break;
    default:
      delay = NOTIFICATION_DELAY;
  }
  // Plancher 1 — peu importe ce qui vient d'être tiré, le prochain
  // MAJEUR ne peut pas s'ouvrir avant le cooldown depuis le dernier
  // major. Idem pour le RARE avec son propre cooldown plus long.
  const earliestMajorMonth =
    (lastMajorEventMonth || 0) + MIN_MONTHS_BETWEEN_MAJOR;
  const earliestRareMonth =
    (lastRareEventMonth || 0) + MIN_MONTHS_BETWEEN_RARE;
  const target = Math.max(
    currentMonth + delay,
    earliestMajorMonth,
    earliestRareMonth,
  );
  return Math.max(1, Math.min(TOTAL_MONTHS, Math.floor(target)));
}

/**
 * Vitesses possibles : 0=pause / 0.5=lent / 1=normal / 2=x2 / 4=x4.
 * Cette liste sert aux validations (sanitize, UI) et à l'auto-complétion.
 * LOT 17 — Ajout de la vitesse "lente" (0.5) demandée par l'utilisateur.
 */
export const TIME_SPEEDS: readonly TimeSpeed[] = [0, 0.5, 1, 2, 4] as const;
const SPEED_SET: ReadonlySet<TimeSpeed> = new Set(TIME_SPEEDS);

/**
 * LOT 17 — Découpage du mois fictif en SEMAINES pour donner au
 * joueur le ressenti du temps qui passe (au lieu de voir les mois
 * sauter d'un coup). 4 semaines par mois est un compromis : assez
 * fin pour qu'on sente une progression, assez gros pour ne pas
 * exploser le nombre de ticks (ni la batterie).
 */
export const WEEKS_PER_MONTH = 4;

/**
 * Période de tick (ms) pour chaque vitesse jouée — UNE SEMAINE
 * fictive par tick depuis LOT 17 (avant : un mois entier par tick).
 *
 * Cadence par mois (4 semaines) :
 *   - 0.5 (lent)   : 4 × 3000 = 12 000 ms/mois → 12 min pour 60 mois
 *   - 1   (normal) : 4 × 1500 =  6 000 ms/mois →  6 min pour 60 mois
 *   - 2   (rapide) : 4 ×  750 =  3 000 ms/mois →  3 min pour 60 mois
 *   - 4   (très rapide) : 4 × 375 = 1 500 ms/mois → 1.5 min pour 60 mois
 *
 * Calibrage doublé après LOT 18.3 : retour utilisateur indiquant que
 * même x0.5 (6 s/mois) défilait trop vite pour lire confortablement
 * l'horloge et le ticker. Ratios identiques (chaque palier double
 * toujours le précédent), juste plus de respiration globale.
 */
export const TICK_MS_BY_SPEED: Record<Exclude<TimeSpeed, 0>, number> = {
  0.5: 3000,
  1: 1500,
  2: 750,
  4: 375,
};

/**
 * Convertit un mois (1..60) en « Année / MoisDansAnnée » pour
 * affichage. Clamp défensif aux bornes pour ne jamais retourner
 * d'année 0 ou 6.
 */
export function formatMandate(month: number): {
  year: number;
  monthInYear: number;
} {
  const m = Math.max(1, Math.min(TOTAL_MONTHS, Math.floor(month)));
  const year = Math.floor((m - 1) / MONTHS_PER_YEAR) + 1;
  const monthInYear = ((m - 1) % MONTHS_PER_YEAR) + 1;
  return { year, monthInYear };
}

/** Libellé long « Année X — Mois Y du mandat » pour les écrans principaux. */
export function formatMandateLabel(month: number): string {
  const { year, monthInYear } = formatMandate(month);
  return `Année ${year} — Mois ${monthInYear} du mandat`;
}

/** Libellé compact « A1 M3 » pour bandeaux secondaires. */
export function formatMandateShort(month: number): string {
  const { year, monthInYear } = formatMandate(month);
  return `A${year} M${monthInYear}`;
}

/**
 * LOT 17 — Libellé compact incluant la semaine dans le mois :
 * « A1 M3 — Sem 2/4 ». Utilisé par la barre de temps pour
 * matérialiser le défilement intra-mois.
 */
export function formatMandateWithWeek(month: number, week: number): string {
  const safeWeek = Math.max(
    1,
    Math.min(WEEKS_PER_MONTH, Math.floor(week) || 1),
  );
  return `${formatMandateShort(month)} — Sem ${safeWeek}/${WEEKS_PER_MONTH}`;
}

/**
 * Convertit un index de décision interne (`state.turn` 1..20) en
 * mois fictif approximatif. Sert à habiller des éléments historiques
 * (journal, opérations hybrides) qui n'ont stocké que `turn`.
 */
export function turnToMonth(turn: number): number {
  if (!Number.isFinite(turn) || turn <= 0) return 1;
  return Math.max(1, Math.min(TOTAL_MONTHS, Math.floor(turn) * MONTHS_PER_DECISION));
}

/** État initial : mandat au mois 1, semaine 1, pause active,
 *  premier event au mois 1. */
export const INITIAL_GAME_TIME: GameTime = {
  currentMonth: 1,
  weekInMonth: 1,
  speed: 0,
  speedBeforePause: 1,
  nextEventMonth: 1,
  lastReportedQuarter: 0,
  lastReportedYear: 0,
  lastSnapshotGauges: { ...NEUTRAL_GAUGES_FALLBACK },
  pendingReport: null,
};

/**
 * Détermine le type de bilan à déclencher quand on entre dans
 * `month`, ou `null` si aucun bilan n'est dû.
 *
 * Règles (cahier des charges) :
 *   - Bilan annuel sur les mois 12, 24, 36, 48 (pas 60 → élection).
 *   - Bilan trimestriel sur les mois multiples de 3 SAUF multiples
 *     de 12 (qui sont déjà couverts par l'annuel) et SAUF 60.
 *
 * Idempotent : compare au `last*Reported*` pour ne pas re-déclencher
 * un bilan déjà affiché si l'horloge est manipulée.
 */
export function detectDueReport(
  month: number,
  lastReportedQuarter: number,
  lastReportedYear: number,
): MandateReportKind | null {
  if (month <= 0 || month >= TOTAL_MONTHS) return null;
  if (month % MONTHS_PER_YEAR === 0 && month > lastReportedYear) {
    return "year";
  }
  if (
    month % 3 === 0 &&
    month % MONTHS_PER_YEAR !== 0 &&
    month > lastReportedQuarter
  ) {
    return "quarter";
  }
  return null;
}

/** Mois 60 atteint = élection finale immédiate. */
export function shouldTriggerElection(month: number): boolean {
  return month >= TOTAL_MONTHS;
}

/**
 * Borne supérieure du prochain événement après une décision : on
 * ajoute MONTHS_PER_DECISION au mois courant, sans jamais dépasser
 * TOTAL_MONTHS (le mois 60 force l'élection avant tout nouvel event).
 */
export function scheduleNextEventMonth(currentMonth: number): number {
  return Math.max(
    1,
    Math.min(TOTAL_MONTHS, Math.floor(currentMonth) + MONTHS_PER_DECISION),
  );
}

/**
 * Sanitize une valeur potentiellement venue d'une vieille save (ou
 * absente). Garantit que le champ `gameTime` est toujours bien formé
 * après un load — même si l'utilisateur sauvegarde au mauvais moment
 * ou si la version précédente du jeu n'avait pas ce champ du tout.
 */
export function sanitizeGameTime(
  raw: unknown,
  fallbackGauges: Gauges,
): GameTime {
  const fallback: GameTime = {
    ...INITIAL_GAME_TIME,
    lastSnapshotGauges: { ...fallbackGauges },
  };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Partial<GameTime>;

  const currentMonth = clampMonth(r.currentMonth, 1);
  // On force toujours pause au load : l'horloge ne doit pas se remettre
  // à défiler tant que le joueur n'a pas pressé Play. Évite le cas où
  // une save partagée lance immédiatement le ticker en x4 dès l'écran
  // d'accueil. La vitesse précédente est préservée via `speedBeforePause`.
  const speed: TimeSpeed = 0;
  void SPEED_SET;
  const speedBeforePauseRaw = r.speedBeforePause as TimeSpeed | undefined;
  // LOT 17 — On accepte aussi 0.5 (vitesse "lent") en plus de 1/2/4.
  const speedBeforePause: Exclude<TimeSpeed, 0> =
    speedBeforePauseRaw === 0.5 ||
    speedBeforePauseRaw === 1 ||
    speedBeforePauseRaw === 2 ||
    speedBeforePauseRaw === 4
      ? speedBeforePauseRaw
      : 1;
  const nextEventMonth = clampMonth(r.nextEventMonth, currentMonth);
  const lastReportedQuarter = clampReport(r.lastReportedQuarter);
  const lastReportedYear = clampReport(r.lastReportedYear);
  // LOT 15 — Préserver le cooldown majeur entre rechargements. 0 =
  // « aucun majeur joué » (état initial), donc on ne clamp pas en
  // dessous mais on reste borné par TOTAL_MONTHS.
  const lastMajorEventMonth = clampReport(r.lastMajorEventMonth);
  // LOT 16 — Idem pour le cooldown des crises rares.
  const lastRareEventMonth = clampReport(r.lastRareEventMonth);
  // LOT 17 — Sous-compteur de semaine (1..4). Vieille save sans
  // ce champ → reset à 1, pas de tick "fantôme" en cours.
  const weekInMonthRaw = r.weekInMonth;
  const weekInMonth =
    typeof weekInMonthRaw === "number" &&
    Number.isFinite(weekInMonthRaw) &&
    weekInMonthRaw >= 1 &&
    weekInMonthRaw <= WEEKS_PER_MONTH
      ? Math.floor(weekInMonthRaw)
      : 1;
  const lastSnapshotGauges = sanitizeGaugesShape(
    r.lastSnapshotGauges,
    fallbackGauges,
  );
  const pendingReport =
    r.pendingReport &&
    typeof r.pendingReport === "object" &&
    (r.pendingReport.kind === "quarter" || r.pendingReport.kind === "year") &&
    typeof r.pendingReport.month === "number"
      ? {
          kind: r.pendingReport.kind,
          month: clampMonth(r.pendingReport.month, currentMonth),
          prevGauges: sanitizeGaugesShape(
            r.pendingReport.prevGauges,
            fallbackGauges,
          ),
          gauges: sanitizeGaugesShape(r.pendingReport.gauges, fallbackGauges),
        }
      : null;

  return {
    currentMonth,
    weekInMonth,
    speed,
    speedBeforePause,
    nextEventMonth,
    lastReportedQuarter,
    lastReportedYear,
    lastMajorEventMonth,
    lastRareEventMonth,
    lastSnapshotGauges,
    pendingReport,
  };
}

/**
 * LOT 15 — Sanitize la file d'événements MINEURS chargée depuis une
 * save : tolère undefined / non-array / entries malformées, drop les
 * périmées et plafonne à 2 cartes simultanées.
 */
export function sanitizeMinorEventQueue(
  raw: unknown,
  currentMonth: number,
): MinorEventEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: MinorEventEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const it = item as Partial<MinorEventEntry>;
    if (typeof it.eventId !== "string" || it.eventId.length === 0) continue;
    const appearedMonth = clampMonth(it.appearedMonth, currentMonth);
    const expiresMonth = clampMonth(it.expiresMonth, currentMonth);
    if (expiresMonth < currentMonth) continue;
    out.push({ eventId: it.eventId, appearedMonth, expiresMonth });
  }
  return out.slice(0, 2);
}

/**
 * LOT 15 — Sanitize la file de notifications fictives chargée depuis
 * une save : même logique, plafond MAX_NOTIFICATION_QUEUE_SIZE.
 */
export function sanitizeEventNotifications(
  raw: unknown,
  currentMonth: number,
): EventNotification[] {
  if (!Array.isArray(raw)) return [];
  const out: EventNotification[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const it = item as Partial<EventNotification>;
    if (typeof it.id !== "string" || it.id.length === 0) continue;
    if (typeof it.text !== "string" || it.text.length === 0) continue;
    if (it.kind !== "FLASH" && it.kind !== "INFO") continue;
    const createdMonth = clampMonth(it.createdMonth, currentMonth);
    const expiresMonth = clampMonth(it.expiresMonth, currentMonth);
    if (expiresMonth < currentMonth) continue;
    out.push({
      id: it.id,
      kind: it.kind,
      text: it.text,
      createdMonth,
      expiresMonth,
    });
  }
  return out.slice(0, MAX_NOTIFICATION_QUEUE_SIZE);
}

/**
 * LOT 15 — Purge centralisée appelée à CHAQUE avancée d'un mois pour
 * garantir que les cartes / notifications expirées disparaissent
 * automatiquement même sans interaction joueur. Renvoie deux nouvelles
 * références si quelque chose a changé, sinon les références d'origine
 * (no-op pour `setState` en cas d'égalité).
 */
export function purgeExpiredQueues(
  minorEventQueue: MinorEventEntry[] | undefined,
  eventNotifications: EventNotification[] | undefined,
  currentMonth: number,
): {
  minorEventQueue: MinorEventEntry[];
  eventNotifications: EventNotification[];
} {
  const minorIn = minorEventQueue ?? [];
  const notifIn = eventNotifications ?? [];
  const minorFiltered = minorIn.filter((m) => m.expiresMonth >= currentMonth);
  const notifFiltered = notifIn.filter((n) => n.expiresMonth >= currentMonth);
  return {
    minorEventQueue:
      minorFiltered.length === minorIn.length ? minorIn : minorFiltered,
    eventNotifications:
      notifFiltered.length === notifIn.length ? notifIn : notifFiltered,
  };
}

// ── Couche de compatibilité Saison / Jour ─────────────────────────────────────
// Ces fonctions exposent le vocabulaire "jour / saison" à partir du
// compteur interne `month` (1..60). Elles délèguent à simulationClock.ts
// et permettent aux composants de migrer progressivement sans dupliquer la
// logique de conversion.

/**
 * Alias de `computeGameDayDisplay` depuis simulationClock.
 * Exposé ici pour que les imports depuis `timeEngine` restent valides
 * pendant la migration.
 */
export { computeGameDayDisplay };

/**
 * Libellé long "Saison X — Jour Y" (remplace `formatMandateLabel`).
 * Le paramètre `month` correspond au `currentMonth` interne (1..60),
 * directement mappé sur le jour de jeu (1:1).
 */
export function formatGameDayLabel(month: number): string {
  return _formatGameDayLabel(month);
}

/**
 * Libellé court "S2 J3" (remplace `formatMandateShort`).
 */
export function formatGameDayShort(month: number): string {
  return _formatGameDayShort(month);
}

/**
 * Libellé court incluant le sous-jour (ancienne semaine).
 * "S1 J3 — Sous-jour 2/4" — gardé pour compatibilité de débogage.
 */
export function formatGameDayWithSubday(month: number, week: number): string {
  const safeWeek = Math.max(1, Math.min(WEEKS_PER_MONTH, Math.floor(week) || 1));
  return `${_formatGameDayShort(month)} — Sous-jour ${safeWeek}/${WEEKS_PER_MONTH}`;
}

/**
 * Conversion tour de décision → jour de jeu (identique à `turnToMonth`,
 * renommé progressivement pour correspondre au nouveau vocabulaire).
 */
export function turnToGameDay(turn: number): number {
  return turnToMonth(turn);
}

/** @internal Ratio exposé pour les composants de débogage. */
export { GAME_HOURS_PER_REAL_HOUR };

function clampMonth(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(TOTAL_MONTHS, Math.floor(value)));
}

function clampReport(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(TOTAL_MONTHS, Math.floor(value)));
}

function sanitizeGaugesShape(value: unknown, fallback: Gauges): Gauges {
  if (!value || typeof value !== "object") return { ...fallback };
  const out: Gauges = { ...fallback };
  for (const k of Object.keys(fallback) as (keyof Gauges)[]) {
    const v = (value as Record<string, unknown>)[k as string];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = Math.max(0, Math.min(100, v));
    }
  }
  return out;
}
