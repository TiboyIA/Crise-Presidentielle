import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CrisisEvent,
  EventChoice,
  EVENTS,
  getEventById,
  pickRandomEvent,
} from "@/data/events";
import { useEntitlements } from "@/lib/entitlements";
import { analyzeGameState } from "@/lib/crisisDirector";
import { coerceStrategy } from "@/lib/finalDebate";
import {
  HIDDEN_GAUGE_REVEAL_THRESHOLD,
  INITIAL_GAUGES,
  INITIAL_HIDDEN_GAUGES,
} from "@/logic/gameEngine";
import {
  applyChoice,
  applyHiddenEffects,
  applyMinisterEffects,
  applyPromiseChanges,
  applyRegionEffects,
} from "@/logic/crisisEngine";
import { applyEndOfTurnDrift, revealScandal } from "@/logic/mediaEngine";
import {
  fireDueConsequences,
  scheduleCascadeFromChoice,
} from "@/logic/cascadeEngine";
import { checkGameOver } from "@/logic/endings";
import { clamp } from "@/logic/utils";
import { computeElection, ElectionResult } from "@/logic/electionEngine";
import { computeOppositionReaction } from "@/lib/oppositionReaction";
import { analyzeOppositionWeaknesses } from "@/lib/oppositionAnalysis";
import { tickAttackLines } from "@/logic/oppositionLines";
import {
  tickHostilePower,
  recordEventResolution,
  applyChoiceImpactOnAggression,
  shouldIssueUltimatum,
  ULTIMATUM_EVENT_ID,
  applyCountermeasure,
} from "@/logic/hybridWarfare";
import { GameHistory } from "@/logic/history";
import { validateGauges } from "@/logic/validators";
import { attachDebugToGlobal } from "@/logic/debug";
import type { CountermeasureId } from "@/data/hybridCountermeasures";
import {
  createWarStateForUltimatum,
  startWar as warStart,
  tickWar,
  shouldJudgeWar,
  judgeWar,
  endWar,
  pickWarEvent,
  applyWarChoiceDeltas,
  isWarActive,
  WAR_EVENT_LOOKUP,
} from "@/logic/warEngine";
import { createDefaultHostilePower } from "@/data/hostilePowers";
import { EVENT_ID_TO_VECTOR } from "@/data/hybridVectors";
import { computeSocialCascade } from "@/lib/socialCascade";
import { composeHeadline } from "@/logic/mediaNarrative";
import {
  applyReformResistance,
  computeRegionalProduction,
  pickRegionalCandidate,
} from "@/logic/regionDynamics";
import { buildRegionalScenario, isRegionalScenarioId } from "@/data/regionScenarios";
import {
  applySpecialtyBonus,
  tickMinisterDynamics,
} from "@/logic/ministerDynamics";
import {
  inferDefeatReason,
  recordDefeat,
  recordElection,
} from "@/storage/statsStorage";
import {
  createInitialCabinet,
  createMinister,
  Minister,
  MinisterPosition,
  MinisterSpecialty,
  SPECIALTY_LABELS,
} from "@/data/ministers";
import {
  INITIAL_REGIONS,
  Region,
  RegionGauges,
  isValidLeaning,
} from "@/data/regions";
import { PlayerPromise } from "@/data/promises";
import { deleteGame, loadGame, saveGame } from "@/storage/gameStorage";
import {
  AIHeadline,
  DecisionLogEntry,
  DelayedEvent,
  FinalDebateChoice,
  FinalDebatePack,
  GameState,
  GameTime,
  Gauges,
  HiddenGauges,
  HiddenGaugeKey,
  HiddenScandal,
  MandateReport,
  OppositionAttack,
  President,
  ResourceCosts,
  ScheduledConsequence,
  TechId,
  TechState,
  TimeSpeed,
} from "@/types/game";
import {
  sanitizeTechState,
  startResearch as startTechResearchPure,
  tickResearch,
  type StartResearchError,
} from "@/logic/techTree";
import {
  INITIAL_RESOURCES,
  RESOURCE_KEYS,
  formatSkipSummary,
  regenerateResources,
  sanitizeResources,
  type ResourceDelta,
} from "@/logic/resources";
import {
  applyDoctrineActivationOneShots,
  applyDoctrineModifiersToChoice,
  applyPerTurnDoctrineBonuses,
  buildDoctrineActivationLogEntries,
  buildShieldInterceptionLogEntry,
} from "@/logic/doctrines";
import {
  INITIAL_GAME_TIME,
  MAX_MINOR_AGE_MONTHS,
  MAX_NOTIFICATION_AGE_MONTHS,
  MAX_NOTIFICATION_QUEUE_SIZE,
  MIN_MONTHS_BETWEEN_MAJOR,
  MIN_MONTHS_BETWEEN_RARE,
  TICK_MS_BY_SPEED,
  WEEKS_PER_MONTH,
  TOTAL_MONTHS,
  detectDueReport,
  sanitizeGameTime,
  sanitizeMinorEventQueue,
  sanitizeEventNotifications,
  purgeExpiredQueues,
  scheduleNextEventMonth,
  scheduleNextEventMonthBySeverity,
} from "@/logic/timeEngine";
import { inferEventSeverity } from "@/logic/eventSeverity";
import type { EventSeverity } from "@/logic/eventSeverity";
import type { EventNotification, MinorEventEntry } from "@/types/game";
import { logAutoResumePrevented, logTimeAdvance } from "@/logic/timeGuard";

// Re-export the centralized types so existing imports
// `from "@/context/GameContext"` keep working.
export type {
  AIHeadline,
  CascadeStep,
  DecisionLogEntry,
  DelayedEvent,
  FinalDebateAttack,
  FinalDebateChoice,
  FinalDebateDecision,
  FinalDebatePack,
  FinalDebateStrategy,
  GameState,
  Gauges,
  HiddenGauges,
  HiddenGaugeKey,
  HiddenScandal,
  OppositionAttack,
  OppositionWeakness,
  President,
  ScheduledConsequence,
} from "@/types/game";

/**
 * O(1) lookup for cascade event-kind validation. Built once at module
 * load — cheaper than calling getEventById on every cascade fire.
 */
const VALID_EVENT_IDS: Set<string> = new Set(EVENTS.map((e) => e.id));

const DEFAULT_STATE: GameState = {
  president: null,
  gauges: INITIAL_GAUGES,
  turn: 0,
  maxTurns: 20,
  currentEvent: null,
  log: [],
  seenEventIds: [],
  gameOver: { isOver: false },
  startedAt: null,
  ministers: [],
  regions: INITIAL_REGIONS,
  media: 50,
  opposition: 50,
  promises: [],
  delayedEvents: [],
  scheduledConsequences: [],
  hiddenScandals: [],
  scandalsRevealed: 0,
  electionResult: null,
  electionDebate: null,
  finalDebatePack: null,
  finalDebateChoices: null,
  hiddenGauges: INITIAL_HIDDEN_GAUGES,
  revealedHiddenKeys: [],
  lastRegionalEventTurn: 0,
  // Module 5 — opposition intelligente : aucune ligne d'attaque
  // au démarrage du mandat (tout va bien… pour l'instant).
  attackLines: [],
  // Module 6 — Guerre hybride : « La Division Zéro » est instanciée
  // dès la création de partie ; elle observe et n'agit qu'à partir
  // du tour 2-3 (cooldown + drift). `hybridOps` reste vide, et
  // aucun état de guerre conventionnelle n'existe au démarrage.
  hostilePower: createDefaultHostilePower(),
  hybridOps: [],
  warState: null,
  // Module 7 — Arbre technologique : aucune recherche acquise ni en
  // cours au démarrage du mandat. La R&D coûte du budget (one-shot)
  // et bloque l'accès aux autres projets le temps de la complétion.
  // Module 7.1 — Aucune doctrine active au démarrage ; le bouclier
  // cyber n'est armé qu'au moment du déblocage de Forteresse numérique.
  tech: {
    researched: [],
    inProgress: null,
    activeDoctrines: [],
    cyberShieldUsesRemaining: 0,
  },
  // Module 8 — Horloge de mandat : 60 mois, en pause à l'investiture,
  // premier événement programmé au mois 1 (le joueur appuiera sur
  // play ou sur « Avancer au prochain événement » pour démarrer).
  gameTime: {
    ...INITIAL_GAME_TIME,
    lastSnapshotGauges: { ...INITIAL_GAUGES },
    lastMajorEventMonth: 0,
    lastRareEventMonth: 0,
  },
  // LOT 15 — Files de rythme à 3 niveaux. Vides au démarrage.
  minorEventQueue: [],
  eventNotifications: [],
  // LOT 18 — Ressources stockables. Le président débute avec un
  // budget national modeste (5 000 crédits), une influence
  // politique correcte (50/100), un peu de renseignements (30),
  // un retard technologique (20) et une marge énergétique
  // confortable (60).
  resources: { ...INITIAL_RESOURCES },
};

interface GameContextValue {
  state: GameState;
  loaded: boolean;
  startNewGame: (president: President, promises: PlayerPromise[]) => void;
  drawNextEvent: () => void;
  resolveChoice: (choice: EventChoice) => void;
  resetGame: () => Promise<void>;
  /**
   * Démarre un 2nd mandat avec le même président + cabinet + état du
   * pays après une ré-élection victorieuse. Sans effet si l'état
   * actuel n'est pas une victoire électorale.
   */
  startSecondTerm: () => void;
  replaceMinister: (position: MinisterPosition) => void;
  /**
   * Replaces (or sets) the current event with an externally-built one
   * (e.g. an AI-generated crisis). Refuses if a regular crisis is
   * already on screen or the game is over.
   */
  injectCustomEvent: (event: CrisisEvent) => boolean;
  /**
   * Module IA 3: attach a fictional press headline to a specific log
   * entry (identified by id). No-op if the entry no longer exists or
   * already has a headline.
   */
  attachHeadlineToEntry: (entryId: string, headline: AIHeadline) => void;
  /**
   * Module IA 4: cache the AI-generated opposition debate attacks for
   * the final election screen. No-op if the game is not over or if a
   * cached debate already exists (idempotent — protects against
   * double-billing the AI on screen re-mounts).
   */
  setElectionDebate: (attacks: OppositionAttack[]) => void;
  /**
   * Module IA 5: cache the selected decisions + AI attacks for the
   * interactive final debate. Idempotent — once cached, subsequent
   * calls are ignored so screen remounts cannot re-bill the API.
   */
  setFinalDebatePack: (pack: FinalDebatePack) => void;
  /**
   * Module IA 5: record (or update) the player's strategy choice for
   * one of the debate decisions. Strategy may be changed before the
   * player has answered all decisions; once all are picked the score
   * reveal becomes immutable.
   */
  setFinalDebateChoice: (choice: FinalDebateChoice) => void;
  /**
   * Module 6 — Apply a hybrid-warfare countermeasure (cyber, sanctions,
   * de-escalation, military posture). Adjusts the hostile actor's
   * aggression and the visible/hidden gauges per the spec in
   * `data/hybridCountermeasures.ts`. No-op if the game is over,
   * if there is no current player, if a war is active, or if the
   * id is unknown.
   */
  applyHybridCountermeasure: (id: CountermeasureId) => boolean;
  /**
   * Module 7 + LOT 18.2 — Démarre la recherche `id`. Débite
   * immédiatement le coût en RESSOURCES de la techno
   * (`state.resources`) et place le projet en `tech.inProgress`.
   * Retourne `{ ok: true }` si le projet a démarré, sinon
   * `{ ok: false, reason, missing? }` avec une raison machine-readable
   * (insufficient_resources, another_in_progress, already_researched,
   * unknown_tech, no_president, game_over). En cas de
   * `insufficient_resources`, `missing` détaille le manque par
   * ressource (utilisé pour l'affichage du toast). Aucune mutation
   * si refus.
   */
  startTechResearch: (
    id: TechId,
  ) =>
    | { ok: true }
    | { ok: false; reason: StartResearchError; missing?: ResourceCosts };
  /**
   * Module 8 — Définit la vitesse de l'horloge de mandat. 0 = pause,
   * 1/2/4 = vitesses jouées. Mémorise la dernière vitesse non-zéro
   * pour permettre une reprise auto après un événement ou un bilan.
   */
  setSpeed: (speed: TimeSpeed) => void;
  /**
   * Module 8 — Avance instantanément l'horloge jusqu'au prochain
   * événement (ou au prochain bilan trimestriel/annuel s'il tombe
   * avant). Pas d'effet pendant un événement, un bilan ouvert, ou
   * la fin de partie.
   */
  skipToNextEvent: () => void;
  /**
   * Module 8 — Ferme la modale de bilan (trimestriel ou annuel) en
   * cours, met à jour le snapshot des jauges, et reprend la lecture
   * à la vitesse précédente.
   */
  dismissReport: () => void;
  /**
   * LOT 15 — Résout une carte d'événement MINEUR sur le dashboard.
   * Applique uniquement les effets visibles + media + opposition du
   * choix (pas de cascade, pas de scandale, pas de turn++) et retire
   * la carte de la file. No-op si l'event ou le choix sont inconnus.
   */
  resolveMinorEvent: (eventId: string, choiceId: string) => void;
  /**
   * LOT 15 — Retire une carte mineure sans appliquer aucun effet
   * (le joueur ignore l'événement). Aucun coût narratif.
   */
  dismissMinorEvent: (eventId: string) => void;
  /**
   * LOT 15 — Retire une notification fictive du AlertTicker.
   */
  dismissNotification: (id: string) => void;
  hasSavedGame: boolean;
  /**
   * Chantier 2 — Dev-only debug helpers. Calls are no-ops in
   * production bundles. Mutate gauges, advance turns, or force the
   * final election to ship the player to the end-of-mandate flow.
   */
  __debugPatchGauges: (patch: Partial<GameState["gauges"]>) => void;
  __debugAdvanceTurn: () => void;
  __debugForceElection: () => void;
}

// Stable slice — only contains action functions. Re-renders consumers only
// when a callback reference changes (almost never, thanks to useCallback).
type GameActions = Omit<GameContextValue, "state" | "loaded" | "hasSavedGame">;

// Volatile slice — re-renders consumers on every state tick.
interface GameStateSlice {
  state: GameState;
  loaded: boolean;
  hasSavedGame: boolean;
}

const GameActionsContext = createContext<GameActions | null>(null);
const GameStateContext = createContext<GameStateSlice | null>(null);

let scandalIdCounter = 0;
function newScandalId(): string {
  scandalIdCounter += 1;
  return `${Date.now()}_${scandalIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function newLogId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  // v1.1 — DLC packs (RevenueCat). The provider feeds `pickRandomEvent`
  // via a ref so we don't have to invalidate every callback whenever the
  // user buys/restores a pack.
  const { unlockedPacks } = useEntitlements();
  const unlockedPacksRef = useRef(unlockedPacks);
  useEffect(() => {
    unlockedPacksRef.current = unlockedPacks;
  }, [unlockedPacks]);

  // Phase 2 — Historique des décisions et validation d'état
  const gameHistoryRef = useRef<GameHistory>(new GameHistory());

  // Phase 2 — Attacher les utilitaires de debug en développement
  useEffect(() => {
    if (__DEV__) {
      attachDebugToGlobal();
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await loadGame();
      if (saved && saved.president) {
        const merged: GameState = { ...DEFAULT_STATE, ...saved };
        if (!merged.ministers || merged.ministers.length === 0) {
          merged.ministers = createInitialCabinet();
        } else {
          // Module 3 — hydrate les nouveaux champs (popularity,
          // scandalRisk, ambition, specialty, isRival) sur les sauvegardes
          // d'avant le module ministres-vivants. On régénère un ministre
          // canonique par poste pour les valeurs neuves, en préservant
          // les stats existantes (loyalty/competence/scandals/name).
          //
          // On *valide* aussi les valeurs venues du JSON :
          //   - position doit appartenir au set canonique (sinon on
          //     drop l'entrée — sera complétée par fillMissingPositions
          //     juste après) ;
          //   - les nombres doivent être finis et 0–100, sinon on
          //     retombe sur la valeur fraîchement générée ;
          //   - specialty doit appartenir aux clés de SPECIALTY_LABELS.
          const VALID_POSITIONS = new Set<MinisterPosition>([
            "pm",
            "interior",
            "economy",
            "foreign",
            "ecology",
            "defense",
          ]);
          const VALID_SPECIALTIES = new Set<MinisterSpecialty>(
            Object.keys(SPECIALTY_LABELS) as MinisterSpecialty[],
          );
          const sanitizeStat = (v: unknown, fallback: number): number =>
            typeof v === "number" && Number.isFinite(v)
              ? clamp(v)
              : fallback;
          merged.ministers = merged.ministers
            .filter((m): m is Minister =>
              !!m && VALID_POSITIONS.has(m.position as MinisterPosition),
            )
            .map((m) => {
              const fresh = createMinister(m.position);
              const specialty: MinisterSpecialty = VALID_SPECIALTIES.has(
                m.specialty as MinisterSpecialty,
              )
                ? (m.specialty as MinisterSpecialty)
                : fresh.specialty;
              return {
                position: m.position,
                positionLabel: m.positionLabel ?? fresh.positionLabel,
                name: m.name ?? fresh.name,
                loyalty: sanitizeStat(m.loyalty, fresh.loyalty),
                competence: sanitizeStat(m.competence, fresh.competence),
                scandals:
                  typeof m.scandals === "number" && Number.isFinite(m.scandals)
                    ? Math.max(0, Math.floor(m.scandals))
                    : 0,
                popularity: sanitizeStat(m.popularity, fresh.popularity),
                scandalRisk: sanitizeStat(m.scandalRisk, fresh.scandalRisk),
                ambition: sanitizeStat(m.ambition, fresh.ambition),
                specialty,
                isRival: typeof m.isRival === "boolean" ? m.isRival : false,
              };
            });
          // Sécurité : si tout a été drop (saves très corrompues), on
          // recrée un cabinet canonique plutôt que de laisser le jeu
          // démarrer avec 0 ministre — qui ferait planter
          // PORTFOLIO_GAUGE[m.position] partout.
          if (merged.ministers.length === 0) {
            merged.ministers = createInitialCabinet();
          }
        }
        // Rebuild regions from INITIAL_REGIONS as source of truth: this lets
        // us add/remove canonical regions in future updates without leaving
        // saved games with stale or missing entries. We overlay saved
        // mutable state (tension) on top of canonical metadata.
        const savedRegionsById = new Map<string, Region>(
          (merged.regions ?? []).map((r) => [r.id, r]),
        );
        // Sanitize a saved gauge value: only accept finite numbers and
        // clamp them to 0-100. Anything else (NaN, null, string,
        // missing) falls back to the canonical seeded value.
        const sanitizeGauge = (v: unknown, fallback: number): number =>
          typeof v === "number" && Number.isFinite(v) ? clamp(v) : fallback;
        merged.regions = INITIAL_REGIONS.map((initial) => {
          const saved = savedRegionsById.get(initial.id);
          if (!saved) return { ...initial, gauges: { ...initial.gauges } };
          // Merge per-region gauges from the save when present, otherwise
          // fall back to the canonical seed (handles v3→v4 migration).
          const savedGauges = (saved as { gauges?: Partial<RegionGauges> })
            .gauges;
          const mergedGauges: RegionGauges = {
            economy: sanitizeGauge(savedGauges?.economy, initial.gauges.economy),
            security: sanitizeGauge(
              savedGauges?.security,
              initial.gauges.security,
            ),
            popularity: sanitizeGauge(
              savedGauges?.popularity,
              initial.gauges.popularity,
            ),
            ecology: sanitizeGauge(savedGauges?.ecology, initial.gauges.ecology),
            publicHealth: sanitizeGauge(
              savedGauges?.publicHealth,
              initial.gauges.publicHealth,
            ),
            socialStability: sanitizeGauge(
              savedGauges?.socialStability,
              initial.gauges.socialStability,
            ),
          };
          return {
            ...initial,
            tension:
              typeof saved.tension === "number" && Number.isFinite(saved.tension)
                ? clamp(saved.tension)
                : initial.tension,
            leaning: isValidLeaning(saved.leaning) ? saved.leaning : initial.leaning,
            gauges: mergedGauges,
          };
        });
        if (!Array.isArray(merged.promises)) merged.promises = [];
        if (!Array.isArray(merged.delayedEvents)) merged.delayedEvents = [];
        if (!Array.isArray(merged.scheduledConsequences))
          merged.scheduledConsequences = [];
        if (!Array.isArray(merged.hiddenScandals)) merged.hiddenScandals = [];
        if (typeof merged.media !== "number") merged.media = 50;
        if (typeof merged.opposition !== "number") merged.opposition = 50;
        if (typeof merged.scandalsRevealed !== "number") merged.scandalsRevealed = 0;
        if (merged.electionResult === undefined) merged.electionResult = null;
        if (merged.electionDebate === undefined) merged.electionDebate = null;
        if (merged.finalDebatePack === undefined) merged.finalDebatePack = null;
        if (merged.finalDebateChoices === undefined)
          merged.finalDebateChoices = null;
        // R7 migration — saves antérieures contiennent des stratégies legacy
        // (assume/deny/explain/divert/counter). On les coerce vers les 6
        // nouvelles (calm/aggressive/ironic/factual/emotional/evasive) pour
        // que les écrans n'aient jamais à manipuler d'IDs orphelins.
        if (Array.isArray(merged.finalDebateChoices)) {
          merged.finalDebateChoices = merged.finalDebateChoices.map((c) => ({
            ...c,
            strategy: coerceStrategy(c.strategy),
          }));
        }
        // Normalize gauges: ensure all 11 visible gauges exist on the
        // saved state (older saves only had 6).
        merged.gauges = { ...INITIAL_GAUGES, ...(merged.gauges ?? {}) };
        // Normalize hidden gauges (older saves had none).
        merged.hiddenGauges = {
          ...INITIAL_HIDDEN_GAUGES,
          ...(merged.hiddenGauges ?? {}),
        };
        if (!Array.isArray(merged.revealedHiddenKeys)) merged.revealedHiddenKeys = [];
        // Module 6 — Sanitize les champs ajoutés tardivement pour
        // les saves antérieures (rétro-compat) :
        //  - hostilePower : créer si absent + clamp aggression
        //  - hybridOps : forcer un tableau
        //  - warState : null sinon (pas d'état de guerre repris).
        if (!merged.hostilePower) {
          merged.hostilePower = createDefaultHostilePower();
        } else {
          const a = merged.hostilePower.aggression;
          merged.hostilePower.aggression =
            typeof a === "number" && Number.isFinite(a)
              ? Math.max(0, Math.min(100, a))
              : 30;
          if (!Array.isArray(merged.hostilePower.usedCountermeasures)) {
            merged.hostilePower.usedCountermeasures = [];
          }
        }
        if (!Array.isArray(merged.hybridOps)) merged.hybridOps = [];
        if (merged.warState === undefined) merged.warState = null;
        // Module 7 — Sanitize l'arbre techno (ou le crée s'il manque).
        merged.tech = sanitizeTechState(merged.tech);
        // Module 8 — Sanitize l'horloge de mandat (création si absent
        // pour les saves antérieures à ce module). Force la pause au
        // chargement pour ne pas faire défiler le temps pendant que
        // l'écran de chargement disparaît.
        const restoredTime = sanitizeGameTime(merged.gameTime, merged.gauges);
        merged.gameTime = { ...restoredTime, speed: 0 };
        // LOT 15 — Sanitize les nouvelles files (rétrocompat saves
        // antérieures + protection contre données malformées).
        merged.minorEventQueue = sanitizeMinorEventQueue(
          merged.minorEventQueue,
          restoredTime.currentMonth,
        );
        merged.eventNotifications = sanitizeEventNotifications(
          merged.eventNotifications,
          restoredTime.currentMonth,
        );
        // LOT 18 — Ressources stockables. Re-hydraté à
        // INITIAL_RESOURCES si la save est antérieure au LOT 18,
        // sinon clampé sur les bornes [0, RESOURCE_MAX[k]].
        merged.resources = sanitizeResources(merged.resources);
        setState(merged);
        setHasSavedGame(true);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (state.president) {
      saveGame(state);
      setHasSavedGame(true);
    }
  }, [state, loaded]);

  // ─── Chantier 2 — Persistent telemetry (cross-game stats). ──────
  // Record exactly one stats entry per finished mandate. Reset the
  // dedupe ref when the player starts a new game (president changes
  // or save is wiped).
  const statsRecordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (!state.president) {
      statsRecordedRef.current = null;
      return;
    }
    if (!state.gameOver.isOver) return;
    // Use startedAt as the per-mandate key — unique per call to
    // startNewGame, and resets correctly when a new game begins.
    // The same key is also persisted inside stats storage as
    // `lastRecordedMandateKey`, so reloads of a finished game are
    // skipped at the storage layer too (in-memory ref is just a
    // fast path).
    const key = `${state.president.name}_${state.startedAt ?? 0}`;
    if (statsRecordedRef.current === key) return;
    statsRecordedRef.current = key;
    if (state.gameOver.triggeredElection && state.electionResult) {
      void recordElection({
        reElected: state.electionResult.reElected,
        voteShare: state.electionResult.voteShare,
        strategies: (state.finalDebateChoices ?? []).map((c) => c.strategy),
        turn: state.turn,
        mandateKey: key,
      });
    } else {
      void recordDefeat(
        inferDefeatReason(state.gameOver.reason),
        state.turn,
        key,
      );
    }
  }, [
    loaded,
    state.president,
    state.gameOver.isOver,
    state.gameOver.triggeredElection,
    state.gameOver.reason,
    state.electionResult,
    state.finalDebateChoices,
    state.turn,
    state.startedAt,
  ]);

  const startNewGame = useCallback(
    (president: President, promises: PlayerPromise[]) => {
      const firstEvent = pickRandomEvent([], [], unlockedPacksRef.current);
      setState({
        ...DEFAULT_STATE,
        president,
        promises,
        ministers: createInitialCabinet(),
        regions: INITIAL_REGIONS.map((r) => ({ ...r })),
        currentEvent: firstEvent,
        seenEventIds: [firstEvent.id],
        turn: 1,
        startedAt: Date.now(),
        // Module 8 — Démarre l'horloge au mois 1, en pause auto le
        // temps que le joueur traite la première crise.
        gameTime: {
          ...INITIAL_GAME_TIME,
          lastSnapshotGauges: { ...INITIAL_GAUGES },
        },
        // LOT 18 — Réinitialise les ressources stockables à leurs
        // valeurs de départ pour chaque nouvelle partie.
        resources: { ...INITIAL_RESOURCES },
      });
    },
    [],
  );

  const attachHeadlineToEntry = useCallback(
    (entryId: string, headline: AIHeadline) => {
      setState((prev) => {
        const idx = prev.log.findIndex((e) => e.id === entryId);
        if (idx === -1) return prev;
        if (prev.log[idx]!.aiHeadline) return prev;
        const newLog = prev.log.slice();
        newLog[idx] = { ...newLog[idx]!, aiHeadline: headline };
        return { ...prev, log: newLog };
      });
    },
    [],
  );

  const setElectionDebate = useCallback((attacks: OppositionAttack[]) => {
    setState((prev) => {
      // Only allow caching the debate once an election result exists,
      // and never overwrite an already-cached one.
      if (!prev.electionResult) return prev;
      if (prev.electionDebate && prev.electionDebate.length > 0) return prev;
      if (!Array.isArray(attacks) || attacks.length === 0) return prev;
      return { ...prev, electionDebate: attacks };
    });
  }, []);

  const setFinalDebatePack = useCallback((pack: FinalDebatePack) => {
    setState((prev) => {
      if (!prev.electionResult) return prev;
      if (prev.finalDebatePack) return prev; // idempotent — never overwrite
      if (
        !pack ||
        !Array.isArray(pack.decisions) ||
        pack.decisions.length === 0 ||
        !Array.isArray(pack.attacks)
      ) {
        return prev;
      }
      return { ...prev, finalDebatePack: pack };
    });
  }, []);

  const setFinalDebateChoice = useCallback((choice: FinalDebateChoice) => {
    setState((prev) => {
      if (!prev.electionResult) return prev;
      if (!prev.finalDebatePack) return prev;
      if (!choice || typeof choice.decisionId !== "string") return prev;
      // Validate decisionId exists in the cached pack.
      const known = prev.finalDebatePack.decisions.some(
        (d) => d.decisionId === choice.decisionId,
      );
      if (!known) return prev;
      const existing = prev.finalDebateChoices ?? [];
      // FREEZE the picks once all decisions are answered: the player
      // can rethink as long as they haven't completed the round, but
      // once the score is unveiled we lock everything in.
      const completed =
        existing.length >= prev.finalDebatePack.decisions.length;
      if (completed) return prev;
      const next = existing.filter(
        (c) => c.decisionId !== choice.decisionId,
      );
      next.push({
        decisionId: choice.decisionId,
        strategy: choice.strategy,
        modifier: choice.modifier,
      });
      return { ...prev, finalDebateChoices: next };
    });
  }, []);

  const injectCustomEvent = useCallback((event: CrisisEvent): boolean => {
    let accepted = false;
    setState((prev) => {
      if (prev.gameOver.isOver) return prev;
      if (!prev.president) return prev;
      if (prev.currentEvent) return prev;
      accepted = true;
      return {
        ...prev,
        currentEvent: event,
        seenEventIds: prev.seenEventIds.includes(event.id)
          ? prev.seenEventIds
          : [...prev.seenEventIds, event.id],
      };
    });
    return accepted;
  }, []);

  const drawNextEvent = useCallback(() => {
    setState((prev) => {
      if (prev.gameOver.isOver) return prev;
      if (prev.currentEvent) return prev;
      // Module 6 — Pendant l'état de guerre conventionnelle, le
      // catalogue d'évènements généraux est SUSPENDU. On tire
      // exclusivement dans `WAR_EVENTS` via `pickWarEvent`. Cela
      // donne une cohérence narrative absolue : la Nation ne se
      // soucie plus que de la guerre.
      if (isWarActive(prev) && prev.warState) {
        const warEventId = pickWarEvent(prev.warState, prev.seenEventIds);
        if (warEventId) {
          const we = WAR_EVENT_LOOKUP[warEventId];
          if (we) {
            return {
              ...prev,
              currentEvent: we,
              seenEventIds: prev.seenEventIds.includes(we.id)
                ? prev.seenEventIds
                : [...prev.seenEventIds, we.id],
            };
          }
        }
      }
      // Module 6 — Pendant l'ULTIMATUM, on doit forcer la sortie
      // de `ev_ultimatum` AVANT tout autre delayed event. Sans
      // cette priorisation, un event hybride retardé (ou autre)
      // peut sortir d'abord, créant un état incohérent où le
      // joueur résout un crisis event normal alors que la nation
      // est censée trancher entre capituler / négocier / mobiliser.
      if (prev.warState?.status === "ultimatum") {
        const ultimatumIdx = prev.delayedEvents.findIndex(
          (d) => d.eventId === ULTIMATUM_EVENT_ID,
        );
        if (ultimatumIdx !== -1) {
          const ultimatumDelayed = prev.delayedEvents[ultimatumIdx]!;
          const ev =
            getEventById(ultimatumDelayed.eventId) ??
            WAR_EVENT_LOOKUP[ultimatumDelayed.eventId] ??
            null;
          if (ev) {
            const remainingDelayed = prev.delayedEvents.filter(
              (_, i) => i !== ultimatumIdx,
            );
            return {
              ...prev,
              currentEvent: ev,
              delayedEvents: remainingDelayed,
              seenEventIds: prev.seenEventIds.includes(ev.id)
                ? prev.seenEventIds
                : [...prev.seenEventIds, ev.id],
            };
          }
        }
      }
      const dueIdx = prev.delayedEvents.findIndex(
        (d) => d.triggerTurn <= prev.turn,
      );
      if (dueIdx !== -1) {
        const dueDelayed = prev.delayedEvents[dueIdx]!;
        const ev =
          getEventById(dueDelayed.eventId) ??
          WAR_EVENT_LOOKUP[dueDelayed.eventId] ??
          null;
        if (ev) {
          const remainingDelayed = prev.delayedEvents.filter(
            (_, i) => i !== dueIdx,
          );
          return {
            ...prev,
            currentEvent: ev,
            delayedEvents: remainingDelayed,
            seenEventIds: prev.seenEventIds.includes(ev.id)
              ? prev.seenEventIds
              : [...prev.seenEventIds, ev.id],
          };
        }
      }
      // ─── Module 2 — Scénario régional ──────────────────────────────
      // Avant le tirage du catalogue, on tente d'insérer un évènement
      // régional ciblé sur une région en stress. Conditions :
      //  - on n'est pas tout au début (turn >= 2)
      //  - cooldown de 2 tours depuis le dernier évènement régional
      //  - probabilité 35% pour rester un évènement "spécial"
      //  - une région doit être éligible (tension/jauges dégradées)
      const lastRegional = prev.lastRegionalEventTurn ?? 0;
      const cooldownOk = prev.turn - lastRegional >= 2;
      if (prev.turn >= 2 && cooldownOk && Math.random() < 0.35) {
        // Évite de réutiliser la même région deux fois d'affilée :
        // on regarde les ids régionaux déjà vus pour les exclure.
        const validRegionIds = new Set(prev.regions.map((r) => r.id));
        const recentRegionalIds = new Set<typeof prev.regions[number]["id"]>();
        // On regarde les 3 derniers évènements régionaux pour exclure
        // leurs régions du candidat (évite de matraquer la même).
        let regionalSeen = 0;
        for (const id of prev.seenEventIds.slice().reverse()) {
          if (regionalSeen >= 3) break;
          if (!isRegionalScenarioId(id)) continue;
          // id format: rgn_<kind>_<regionId>_t<turn>
          const parts = id.split("_");
          if (parts.length >= 4) {
            const regionId = parts.slice(2, parts.length - 1).join("_");
            if (validRegionIds.has(regionId as typeof prev.regions[number]["id"])) {
              recentRegionalIds.add(
                regionId as typeof prev.regions[number]["id"],
              );
            }
          }
          regionalSeen += 1;
        }
        const candidate = pickRegionalCandidate(prev.regions, recentRegionalIds);
        if (candidate) {
          const ev = buildRegionalScenario(
            candidate.region,
            prev.turn,
            candidate.kind,
          );
          if (ev) {
            return {
              ...prev,
              currentEvent: ev,
              seenEventIds: [...prev.seenEventIds, ev.id],
              lastRegionalEventTurn: prev.turn,
            };
          }
        }
      }
      // Module IA 2: bias the catalog draw toward the categories the
      // crisis director currently flags. Falls through to a uniform
      // pick when no signal is active or the biased pool is empty.
      const profile = analyzeGameState(prev);
      const candidate = pickRandomEvent(
        prev.seenEventIds,
        profile.preferredCategories,
        unlockedPacksRef.current,
      );

      // ─── LOT 15 + LOT 16 — Branchement par sévérité + cooldowns ──
      // On infère la sévérité du candidat (sauf annotation explicite),
      // puis on applique deux DOWNGRADES en cascade pour respecter
      // les deux cooldowns indépendants :
      //   • rare  trop rapproché → déclassé en major (UI inchangée,
      //     mais on consomme le cooldown major au lieu du rare)
      //   • major trop rapproché → déclassé en minor (carte légère
      //     non bloquante, le temps continue)
      // Les conséquences scriptées (delayedConsequence, war, ultimatum)
      // gardent leur sévérité initiale, donc bypass possible si le
      // catalogue les laisse passer ; mais la fenêtre rare 8-12 mois
      // les espace naturellement.
      const currentMonth = prev.gameTime?.currentMonth ?? 1;
      const lastMajor = prev.gameTime?.lastMajorEventMonth ?? 0;
      const lastRare = prev.gameTime?.lastRareEventMonth ?? 0;
      const monthsSinceMajor = currentMonth - lastMajor;
      const monthsSinceRare = currentMonth - lastRare;

      let severity: EventSeverity = inferEventSeverity(candidate);
      if (
        severity === "rare" &&
        lastRare > 0 &&
        monthsSinceRare < MIN_MONTHS_BETWEEN_RARE
      ) {
        // Trop tôt pour une nouvelle crise rare : on déclasse en major
        // (l'UI reste plein écran, mais on respecte le rythme rare).
        severity = "major";
      }
      if (
        severity === "major" &&
        lastMajor > 0 &&
        monthsSinceMajor < MIN_MONTHS_BETWEEN_MAJOR
      ) {
        // Trop tôt pour un nouveau majeur : on déclasse en mineur
        // (la carte rapide gardera l'attention sans bloquer le mandat).
        severity = "minor";
      }

      // RARE et MAJOR partagent l'UI plein écran. La distinction sert
      // uniquement à choisir la fenêtre de replanification (8-12 vs
      // 4-8 mois) et à savoir quel cooldown poser à la résolution.
      if (severity === "rare" || severity === "major") {
        return {
          ...prev,
          currentEvent: candidate,
          seenEventIds: prev.seenEventIds.includes(candidate.id)
            ? prev.seenEventIds
            : [...prev.seenEventIds, candidate.id],
          // `lastMajorEventMonth` / `lastRareEventMonth` seront posés
          // par `resolveChoice` quand le joueur tranche ; ici on ne
          // fait que présenter l'event et planifier le prochain tirage
          // avec la fenêtre adaptée à la sévérité réelle.
          gameTime: prev.gameTime
            ? {
                ...prev.gameTime,
                nextEventMonth: scheduleNextEventMonthBySeverity(
                  currentMonth,
                  severity,
                  currentMonth,
                  severity === "rare" ? currentMonth : lastRare,
                ),
              }
            : prev.gameTime,
        };
      }

      if (severity === "minor") {
        const newMinor: MinorEventEntry = {
          eventId: candidate.id,
          appearedMonth: currentMonth,
          expiresMonth: Math.min(
            TOTAL_MONTHS,
            currentMonth + MAX_MINOR_AGE_MONTHS,
          ),
        };
        // Purge expirées + dédup par eventId, plafond 2 cartes simultanées.
        const existingMinor = (prev.minorEventQueue ?? []).filter(
          (m) =>
            m.expiresMonth >= currentMonth && m.eventId !== candidate.id,
        );
        return {
          ...prev,
          seenEventIds: prev.seenEventIds.includes(candidate.id)
            ? prev.seenEventIds
            : [...prev.seenEventIds, candidate.id],
          minorEventQueue: [newMinor, ...existingMinor].slice(0, 2),
          gameTime: prev.gameTime
            ? {
                ...prev.gameTime,
                nextEventMonth: scheduleNextEventMonthBySeverity(
                  currentMonth,
                  "minor",
                  lastMajor,
                  lastRare,
                ),
              }
            : prev.gameTime,
        };
      }

      // severity === "notification" → uniquement dans le ticker.
      const notif: EventNotification = {
        id: `notif_${candidate.id}_${currentMonth}_${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        kind: "FLASH",
        text: candidate.title,
        createdMonth: currentMonth,
        expiresMonth: Math.min(
          TOTAL_MONTHS,
          currentMonth + MAX_NOTIFICATION_AGE_MONTHS,
        ),
      };
      const existingNotifs = (prev.eventNotifications ?? []).filter(
        (n) => n.expiresMonth >= currentMonth,
      );
      return {
        ...prev,
        seenEventIds: prev.seenEventIds.includes(candidate.id)
          ? prev.seenEventIds
          : [...prev.seenEventIds, candidate.id],
        eventNotifications: [notif, ...existingNotifs].slice(
          0,
          MAX_NOTIFICATION_QUEUE_SIZE,
        ),
        gameTime: prev.gameTime
          ? {
              ...prev.gameTime,
              nextEventMonth: scheduleNextEventMonthBySeverity(
                currentMonth,
                "notification",
                lastMajor,
                lastRare,
              ),
            }
          : prev.gameTime,
      };
    });
  }, []);

  const replaceMinister = useCallback((position: MinisterPosition) => {
    setState((prev) => {
      if (!prev.president) return prev;
      const fresh = createMinister(position);
      return {
        ...prev,
        ministers: prev.ministers.map((m) =>
          m.position === position ? fresh : m,
        ),
        gauges: {
          ...prev.gauges,
          authority: clamp(prev.gauges.authority - 5),
        },
        opposition: clamp(prev.opposition + 4),
      };
    });
  }, []);

  const resolveChoice = useCallback((choice: EventChoice) => {
    setState((prev) => {
      if (!prev.currentEvent) return prev;

      // ─── Module 7.1 — Doctrines : transformation des effets ──────
      // Avant TOUTE application, les doctrines actives peuvent :
      //  - annuler les effets négatifs si bouclier cyber + attaque
      //    cyber/hybride (Forteresse numérique),
      //  - diviser par 2 les chocs économiques/budgétaires (Autonomie),
      //  - diviser par 2 les chocs santé/popularité (Résilience).
      // On ne touche PAS aux autres champs (label, consequence,
      // schedulesEvent, hidesScandal, mediaEffect…) : seulement les
      // numériques `effects` et `hiddenEffects`.
      const techForDoctrines = prev.tech ?? {
        researched: [],
        inProgress: null,
        activeDoctrines: [],
        cyberShieldUsesRemaining: 0,
      };
      const doctrineMod = applyDoctrineModifiersToChoice(
        choice,
        prev.currentEvent,
        techForDoctrines,
      );
      const effectiveChoice: EventChoice = {
        ...choice,
        effects: doctrineMod.effects,
        hiddenEffects: doctrineMod.hiddenEffects,
      };

      let newGauges = applyChoice(prev.gauges, effectiveChoice);

      // Phase 2 — Validation des jauges après application du choix
      newGauges = validateGauges(newGauges);

      // ─── Module 3 — Bonus / malus de spécialité ministérielle ─────
      // Si la catégorie de l'évènement matche la spécialité d'un·e
      // ministre compétent·e en poste, sa décision est amplifiée ;
      // si personne ne maîtrise le sujet, la mise en œuvre patine.
      // On applique sur l'équipe AVANT que `applyMinisterEffects`
      // n'éventuellement vire un ministre — c'est l'équipe qui a
      // géré la crise qui a "amplifié", pas la nouvelle.
      const specialtyResult = applySpecialtyBonus(
        newGauges,
        effectiveChoice,
        prev.ministers,
        prev.currentEvent.category,
      );
      newGauges = specialtyResult.gauges;

      let newHiddenGauges = applyHiddenEffects(
        prev.hiddenGauges,
        effectiveChoice,
      );
      let newMinisters = applyMinisterEffects(prev.ministers, effectiveChoice);
      let newRegions = applyRegionEffects(prev.regions, effectiveChoice);

      // ─── Module 2 — Résistance régionale aux réformes ────────────
      // Si le choix est une réforme, les régions politiquement
      // opposées et déjà tendues s'y opposent : pénalité
      // popularité/autorité, tension régionale en hausse.
      const reformResistance = applyReformResistance(
        effectiveChoice,
        newGauges,
        newRegions,
      );
      newGauges = reformResistance.gauges;
      newRegions = reformResistance.regions;

      let newMedia = clamp(prev.media + (choice.mediaEffect ?? 0));
      let newOpposition = clamp(
        prev.opposition + (choice.oppositionEffect ?? 0),
      );

      // Track explicit reveal from the choice now; the auto-reveal
      // threshold check is run after end-of-turn drift below so that
      // a hidden gauge crossing >= HIDDEN_GAUGE_REVEAL_THRESHOLD via
      // drift is also revealed this turn.
      const revealedSet = new Set<HiddenGaugeKey>(prev.revealedHiddenKeys);
      if (choice.revealsHiddenGauge) {
        revealedSet.add(choice.revealsHiddenGauge);
      }

      const promiseResult = applyPromiseChanges(
        prev.promises,
        choice,
        prev.turn,
      );
      let newPromises = promiseResult.promises;

      // Promise side-effects on popularity & media
      if (promiseResult.fulfilled.length > 0) {
        const f = promiseResult.fulfilled.length;
        newGauges.popularity = clamp(newGauges.popularity + 4 * f);
        newMedia = clamp(newMedia + 5 * f);
      }
      if (promiseResult.broken.length > 0) {
        const b = promiseResult.broken.length;
        newGauges.popularity = clamp(newGauges.popularity - 7 * b);
        newMedia = clamp(newMedia - 6 * b);
        newOpposition = clamp(newOpposition + 4 * b);
      }

      // ─── Chantier 1 — Opposition réactive ───────────────────────────
      // Compute the opposition's stance on this specific decision and
      // apply its small opposition/media deltas BEFORE drift, so the
      // climate seen by drift already reflects the political reaction.
      const reaction = computeOppositionReaction(
        { opposition: newOpposition, hiddenGauges: newHiddenGauges },
        {
          effects: effectiveChoice.effects,
          promisesFulfilled: promiseResult.fulfilled.map((p) => p.tag),
          promisesBroken: promiseResult.broken.map((p) => p.tag),
          isDelayedConsequence: prev.currentEvent.isDelayedConsequence,
        },
      );
      newOpposition = clamp(newOpposition + reaction.oppositionDelta);
      newMedia = clamp(newMedia + reaction.mediaDelta);

      const newDelayed: DelayedEvent[] = [...prev.delayedEvents];
      if (choice.schedulesEvent) {
        newDelayed.push({
          eventId: choice.schedulesEvent.eventId,
          triggerTurn: prev.turn + choice.schedulesEvent.delay,
        });
      }

      // ─── Crises en cascade ─────────────────────────────────────────
      // Schedule any chained consequences this choice carries. They
      // are recorded with absolute trigger turns so the dashboard's
      // "CONSÉQUENCES À VENIR" panel can display the brewing trap.
      let newScheduled: ScheduledConsequence[] = scheduleCascadeFromChoice(
        prev.scheduledConsequences,
        choice,
        prev.turn,
        prev.currentEvent.title,
      );

      // ─── Chantier 1 — Cascades sociales ────────────────────────────
      // Detect social tipping points (popularity collapse, cohésion
      // brisée, motion de censure…) and schedule the matching cascade
      // event for next turn. Dedup on eventId so the same cascade
      // can't queue twice in a row.
      const prevAvgRegionTension =
        prev.regions.reduce((s, r) => s + r.tension, 0) /
        Math.max(1, prev.regions.length);
      const newAvgRegionTension =
        newRegions.reduce((s, r) => s + r.tension, 0) /
        Math.max(1, newRegions.length);
      const scheduledIds = new Set<string>(newDelayed.map((d) => d.eventId));
      const cascade = computeSocialCascade({
        prevPopularity: prev.gauges.popularity,
        newPopularity: newGauges.popularity,
        newCohesion: newGauges.cohesion,
        prevAvgRegionTension,
        newAvgRegionTension,
        promisesBrokenCount: promiseResult.broken.length,
        turn: prev.turn,
        alreadyScheduled: scheduledIds,
      });
      for (const e of cascade.newDelayedEvents) {
        newDelayed.push(e);
      }

      const newHiddenScandals: HiddenScandal[] = [...prev.hiddenScandals];
      if (choice.hidesScandal) {
        newHiddenScandals.push({
          id: newScandalId(),
          title: choice.hidesScandal.title,
          popularityDamage: choice.hidesScandal.popularityDamage,
          authorityDamage: choice.hidesScandal.authorityDamage ?? 0,
          mediaDamage: choice.hidesScandal.mediaDamage ?? 0,
          revealAt: prev.turn + choice.hidesScandal.revealIn,
        });
      }

      // Si une réforme a été contestée par les régions OU si un
      // spécialiste ministériel a amplifié/raté la mise en œuvre, on
      // enrichit la conséquence avec les notices (visible dans le
      // journal). Ordre : amplification → résistance régionale.
      const noticeParts = [
        choice.consequence,
        specialtyResult.notice,
        reformResistance.notice,
      ].filter((s): s is string => typeof s === "string" && s.length > 0);
      const consequenceText = noticeParts.join(" ");

      const decisionEntry: DecisionLogEntry = {
        id: newLogId(),
        turn: prev.turn,
        eventTitle: prev.currentEvent.title,
        choiceLabel: choice.label,
        consequence: consequenceText,
        effects: effectiveChoice.effects,
        timestamp: Date.now(),
        promisesFulfilled: promiseResult.fulfilled.map((p) => p.tag),
        promisesBroken: promiseResult.broken.map((p) => p.tag),
        isDelayedConsequence: prev.currentEvent.isDelayedConsequence,
        oppositionReaction: reaction,
      };

      const newTurn = prev.turn + 1;

      // ─── Crises en cascade — fire any step due on the new turn ─────
      // Runs BEFORE scandal reveal & end-of-turn drift so cascade
      // gauge moves can themselves trigger drift / scandal effects
      // (e.g. a cascade step that pushes budget < 20 raises debt
      // through the existing drift rule). Returns fresh log entries
      // attributed to the originating decision.
      const cascadeFire = fireDueConsequences({
        scheduled: newScheduled,
        currentTurn: newTurn,
        gauges: newGauges,
        hiddenGauges: newHiddenGauges,
        media: newMedia,
        opposition: newOpposition,
        delayedEvents: newDelayed,
        // Validate cascade event-kind step IDs against the catalog
        // so a typo or stale seed can never poison the queue.
        validEventIds: VALID_EVENT_IDS,
      });
      newScheduled = cascadeFire.scheduled;
      newGauges = cascadeFire.gauges;
      newHiddenGauges = cascadeFire.hiddenGauges;
      newMedia = cascadeFire.media;
      newOpposition = cascadeFire.opposition;
      // newDelayed is replaced because cascade "event" steps push
      // into the same array.
      const newDelayedAfterCascade = cascadeFire.delayedEvents;

      // Reveal scandals due this turn
      const dueScandals = newHiddenScandals.filter((s) => s.revealAt <= newTurn);
      const remainingScandals = newHiddenScandals.filter(
        (s) => s.revealAt > newTurn,
      );
      const scandalLogEntries: DecisionLogEntry[] = [];
      let scandalsRevealedDelta = 0;
      for (const s of dueScandals) {
        const result = revealScandal(newGauges, newMedia, s);
        newGauges = result.gauges;
        newMedia = result.media;
        scandalsRevealedDelta += 1;
        scandalLogEntries.push({
          id: newLogId(),
          turn: newTurn,
          eventTitle: "📰 Scandale révélé",
          choiceLabel: s.title,
          consequence: `La presse révèle l'affaire. Popularité -${s.popularityDamage}, Médias -${s.mediaDamage ?? 0}.`,
          effects: {
            popularity: -s.popularityDamage,
            authority: -(s.authorityDamage ?? 0),
          },
          timestamp: Date.now(),
          scandalRevealed: s.title,
        });
      }

      // ─── Module 2 — Production budgétaire régionale ──────────────
      // Chaque tour, les régions injectent (ou retirent) du budget
      // selon leur santé. Calculée AVANT le drift pour que le drift
      // sur "budget < 20" tienne compte des recettes du tour.
      const regionalProduction = computeRegionalProduction(newRegions);
      if (regionalProduction.totalDelta !== 0) {
        newGauges = {
          ...newGauges,
          budget: clamp(newGauges.budget + regionalProduction.totalDelta),
        };
      }

      // End-of-turn drift
      const drift = applyEndOfTurnDrift(
        newGauges,
        newMedia,
        newOpposition,
        newMinisters,
        newRegions,
        newHiddenGauges,
      );
      newGauges = drift.gauges;
      newMinisters = drift.ministers;
      newRegions = drift.regions;
      newHiddenGauges = drift.hiddenGauges;

      // ─── Module 3 — Tick ministres-vivants ───────────────────────
      // Après la dérive nationale stabilisée, on lance le tick
      // ministériel : dérive de popularité personnelle, montée du
      // risque caché de scandale, éclatement éventuel d'un scandale
      // (1 max/tour) et émergence éventuelle d'un frondeur. Les
      // évènements retournés alimentent le journal et adressent leurs
      // dégâts aux jauges nationales / médias / opposition.
      const ministerTick = tickMinisterDynamics(
        newMinisters,
        newGauges,
        newTurn,
      );
      newMinisters = ministerTick.ministers;
      const ministerLogEntries: DecisionLogEntry[] = [];
      let ministerScandalDelta = 0;
      for (const evt of ministerTick.events) {
        newGauges = {
          ...newGauges,
          popularity: clamp(newGauges.popularity + evt.popularityHit),
          authority: clamp(newGauges.authority + evt.authorityHit),
          cohesion: clamp(newGauges.cohesion + evt.cohesionHit),
        };
        newMedia = clamp(newMedia + evt.mediaHit);
        newOpposition = clamp(newOpposition + evt.oppositionHit);
        ministerScandalDelta += evt.scandalsRevealedDelta;
        const eventTitle =
          evt.kind === "scandal_eruption"
            ? "📰 Scandale ministériel"
            : "⚠ Fronde au gouvernement";
        const effects: Partial<typeof newGauges> = {};
        if (evt.popularityHit !== 0) effects.popularity = evt.popularityHit;
        if (evt.authorityHit !== 0) effects.authority = evt.authorityHit;
        if (evt.cohesionHit !== 0) effects.cohesion = evt.cohesionHit;
        ministerLogEntries.push({
          id: newLogId(),
          turn: newTurn,
          eventTitle,
          choiceLabel: evt.ministerName,
          consequence: evt.label,
          effects,
          timestamp: Date.now(),
          // Discriminator structuré pour l'AlertTicker — évite tout
          // couplage par chaîne de caractères ("Scandale ministériel"…).
          ministerEventKind: evt.kind,
          // On flag "scandalRevealed" pour que la presse puisse en faire
          // ses choux gras (cohérent avec l'existant).
          ...(evt.kind === "scandal_eruption"
            ? { scandalRevealed: evt.label }
            : {}),
        });
      }

      // Auto-reveal any hidden gauge that has crossed the critical
      // threshold, including those pushed there by end-of-turn drift.
      for (const k of Object.keys(newHiddenGauges) as HiddenGaugeKey[]) {
        if (newHiddenGauges[k] >= HIDDEN_GAUGE_REVEAL_THRESHOLD) {
          revealedSet.add(k);
        }
      }
      const newRevealedHiddenKeys = Array.from(revealedSet);

      const newScandalsRevealedTotal =
        prev.scandalsRevealed + scandalsRevealedDelta + ministerScandalDelta;

      // ─── Module 4 — Une médiatique déterministe ─────────────────────
      // Une fois TOUT le tour consolidé (effets directs + cascade +
      // scandales révélés + tick ministériel + drift), on choisit
      // lequel des 4 médias fictifs prend la parole sur cette
      // décision et on compose sa une (templates, pas d'IA). On
      // applique son impact sur les jauges `media` / `opposition`
      // AVANT le calcul d'élection pour qu'une couverture cinglante
      // pèse réellement sur la ré-élection.
      const composed = composeHeadline({
        event: prev.currentEvent,
        choice: effectiveChoice,
        effects: effectiveChoice.effects,
        mediaDelta: newMedia - prev.media,
        oppositionDelta: newOpposition - prev.opposition,
        scandalRevealed:
          scandalsRevealedDelta + ministerScandalDelta > 0 ||
          !!choice.revealsHiddenGauge,
        turn: prev.turn,
        president: prev.president,
      });
      newMedia = clamp(newMedia + composed.mediaImpact);
      newOpposition = clamp(newOpposition + composed.oppositionImpact);
      const decisionEntryWithHeadline: DecisionLogEntry = {
        ...decisionEntry,
        aiHeadline: composed.headline,
      };

      // Phase 2 — Enregistrer la décision dans l'historique
      gameHistoryRef.current.addEntry({
        turn: prev.turn,
        eventTitle: prev.currentEvent.title,
        choiceLabel: choice.label,
        effects: effectiveChoice.effects,
        timestamp: Date.now(),
        consequence: consequenceText,
        promisesFulfilled: promiseResult.fulfilled.map((p) => p.tag),
        promisesBroken: promiseResult.broken.map((p) => p.tag),
        isDelayedConsequence: prev.currentEvent.isDelayedConsequence,
      });

      // ─── Module 7.1 — Tick R&D + bonus doctrines (déplacé en haut) ─
      // On applique tickResearch + activation one-shots + bonus
      // par-tour AVANT checkGameOver / computeElection, afin que les
      // bonus de doctrine puissent influencer la fin de mandat ou le
      // résultat d'une élection déclenchée le même tour. Sans ça, par
      // exemple, la République résiliente débloquée pile au tour de
      // l'effondrement de popularité ne pourrait jamais sauver la
      // partie — son +2 popu serait appliqué après le verdict.
      const tickResult = tickResearch(
        prev.tech ?? {
          researched: [],
          inProgress: null,
          activeDoctrines: [],
          cyberShieldUsesRemaining: 0,
        },
        newTurn,
      );
      let nextTech: TechState = tickResult.tech;
      // Bouclier consommé pendant ce choix → on rafraîchit le compteur
      // sur l'état tech qu'on persistera. On le fait APRÈS tickResearch
      // pour ne pas écraser une activation toute fraîche (initialisée
      // à CYBER_SHIELD_INITIAL_USES).
      if (
        doctrineMod.interceptedByShield &&
        // ne pas écraser si la doctrine vient juste d'être armée
        !tickResult.activatedDoctrines.includes("doctrine_forteresse")
      ) {
        nextTech = {
          ...nextTech,
          cyberShieldUsesRemaining: doctrineMod.shieldUsesRemainingAfter,
        };
      }
      const oneShot = applyDoctrineActivationOneShots(
        newGauges,
        tickResult.activatedDoctrines,
      );
      newGauges = oneShot.gauges;
      const doctrineLogEntries = buildDoctrineActivationLogEntries(
        tickResult.activatedDoctrines,
        newTurn,
      );
      const shieldLogEntries: DecisionLogEntry[] =
        doctrineMod.interceptedByShield
          ? [
              buildShieldInterceptionLogEntry(
                prev.currentEvent,
                newTurn,
                nextTech.cyberShieldUsesRemaining ?? 0,
              ),
            ]
          : [];
      // Bonus passifs par tour (Savoir : +1 médias). On les applique
      // toujours — y compris si la partie se termine ce tour — pour
      // que la doctrine reste cohérente avec sa promesse "permanent".
      const perTurn = applyPerTurnDoctrineBonuses(
        nextTech,
        newGauges,
        newMedia,
      );
      newGauges = perTurn.gauges;
      newMedia = perTurn.media;

      let gameOver = checkGameOver(
        newGauges,
        newTurn,
        prev.maxTurns,
        newMinisters,
      );

      // ─── Module 5 — Tick des lignes d'attaque de l'opposition ───────
      // On évalue les faiblesses sur l'ÉTAT FINAL du tour (jauges
      // après drift et tick ministériel, promesses à jour, scandales
      // révélés cumulés) puis on fusionne avec la liste précédente.
      // 100% pur : `analyzeOppositionWeaknesses` ne mute pas son
      // input, et `tickAttackLines` retourne un nouveau tableau.
      const previewStateForOpposition: GameState = {
        ...prev,
        turn: newTurn,
        gauges: newGauges,
        promises: newPromises,
        scandalsRevealed: newScandalsRevealedTotal,
        // Inutile pour l'analyse mais on l'aligne pour cohérence si
        // un jour la fonction lit l'opposition (currently no-op).
        opposition: newOpposition,
      };
      const newWeaknesses = analyzeOppositionWeaknesses(
        previewStateForOpposition,
      );
      const newAttackLines = tickAttackLines(
        prev.attackLines,
        newWeaknesses,
        newTurn,
      );

      // ─── Module 6 — Tick guerre hybride / guerre conventionnelle ───
      //
      // Trois branches mutuellement exclusives selon le contexte :
      //  A) Le joueur vient de répondre à un évènement de guerre
      //     (event in WAR_EVENT_LOOKUP) — on applique les deltas
      //     mini-jauges, on avance `warTurn`, et on vérifie si
      //     un verdict est dû ou si une trêve a été acceptée.
      //  B) Le joueur vient de répondre à l'ULTIMATUM — on traite
      //     les 3 issues : capitulation / négociation / mobilisation.
      //  C) Tour ordinaire — on tick l'acteur hostile, on enregistre
      //     éventuellement la résolution d'une op, on ajuste son
      //     agressivité en fonction du choix joueur, et on prépare
      //     un ultimatum si le seuil est franchi.
      let nextHostilePower = prev.hostilePower
        ? { ...prev.hostilePower, doctrine: { ...prev.hostilePower.doctrine } }
        : createDefaultHostilePower();
      let nextHybridOps = (prev.hybridOps ?? []).slice();
      let nextWarState = prev.warState ? { ...prev.warState } : null;
      let nextDelayedFromWar: DelayedEvent[] = [];
      let warForcedGameOver: typeof gameOver | null = null;
      const resolvedEventId = prev.currentEvent.id;
      const isWarEvent = !!WAR_EVENT_LOOKUP[resolvedEventId];

      if (resolvedEventId === ULTIMATUM_EVENT_ID) {
        // ── Branche B : réponse à l'ultimatum ──────────────────────
        if (choice.id === "a") {
          // Capitulation → game over diplomatique immédiat.
          warForcedGameOver = {
            isOver: true,
            victory: false,
            title: "Capitulation",
            reason:
              "Face à l'ultimatum de la Division Zéro, vous avez " +
              "cédé. Le pays a évité la guerre — au prix d'une " +
              "humiliation historique.",
          };
          nextWarState = nextWarState
            ? { ...nextWarState, status: "peace", outcome: null }
            : null;
        } else if (choice.id === "b") {
          // Négociation : pas d'entrée en guerre, on calme l'acteur
          // et on ferme l'état "ultimatum".
          nextHostilePower = {
            ...nextHostilePower,
            aggression: clamp(nextHostilePower.aggression - 25),
          };
          nextWarState = null;
        } else if (choice.id === "c") {
          // Mobilisation : on entre en guerre. Le `createWarStateForUltimatum`
          // a déjà été posé au tour précédent (voir branche C ultimatum) ;
          // on bascule juste son status vers "war".
          if (!nextWarState) {
            nextWarState = createWarStateForUltimatum(prev.turn);
          }
          nextWarState = warStart(nextWarState);
        }
      } else if (isWarEvent && nextWarState) {
        // ── Branche A : événement de guerre conventionnelle ────────
        nextWarState = applyWarChoiceDeltas(
          nextWarState,
          resolvedEventId,
          choice.id,
        );
        // Trêve acceptée — fin de guerre directe sans verdict scoring.
        if (
          resolvedEventId === "ev_war_truce_offer" &&
          choice.id === "a"
        ) {
          nextWarState = endWar(nextWarState, "truce");
          warForcedGameOver = {
            isOver: true,
            victory: false,
            title: "Trêve signée",
            reason:
              "La République et la Division Zéro signent une trêve. " +
              "Pas de vainqueur, pas de vaincu — un statu quo coûteux.",
          };
        } else {
          // Tick passif puis verdict si on a atteint maxWarTurns.
          nextWarState = tickWar(nextWarState);
          if (shouldJudgeWar(nextWarState)) {
            const outcome = judgeWar(nextWarState);
            nextWarState = endWar(nextWarState, outcome);
            warForcedGameOver = {
              isOver: true,
              victory: outcome === "victory",
              title:
                outcome === "victory"
                  ? "VICTOIRE militaire"
                  : outcome === "defeat"
                    ? "DÉFAITE militaire"
                    : "Trêve par épuisement",
              reason:
                outcome === "victory"
                  ? "Vos forces ont brisé l'offensive de la Division Zéro. La République triomphe."
                  : outcome === "defeat"
                    ? "Effondrement militaire. La Division Zéro impose ses conditions."
                    : "Les deux camps épuisés acceptent un cessez-le-feu de fait.",
            };
          }
        }
      } else {
        // ── Branche C : tour ordinaire (pas en guerre) ─────────────
        // 1) Si l'event résolu était une op hybride, on la marque.
        //    "defused" = le joueur n'a PAS aggravé sa situation
        //    (cohésion, sécurité, autorité ne baissent pas trop).
        if (resolvedEventId in EVENT_ID_TO_VECTOR) {
          const dCohesion = effectiveChoice.effects.cohesion ?? 0;
          const dSec = effectiveChoice.effects.security ?? 0;
          // Une attaque interceptée par le bouclier compte toujours
          // comme « désamorcée » côté guerre hybride : pas de dégâts,
          // pas de bénéfice agressif pour l'acteur.
          const defused =
            doctrineMod.interceptedByShield ||
            (dCohesion >= -3 && dSec >= -3);
          nextHybridOps = recordEventResolution(
            nextHybridOps,
            resolvedEventId,
            defused,
          );
        }
        // 2) Impact du choix sur l'agressivité de l'acteur.
        nextHostilePower = applyChoiceImpactOnAggression(
          nextHostilePower,
          effectiveChoice.effects,
          effectiveChoice.hiddenEffects ?? {},
        );
        // 3) Tick de l'acteur : peut décider d'orchestrer une op.
        const tick = tickHostilePower(
          nextHostilePower,
          nextHybridOps,
          newGauges,
          newHiddenGauges,
          newTurn,
          prev.seenEventIds,
          false, // pas en guerre
        );
        nextHostilePower = tick.hostilePower;
        nextHybridOps = tick.hybridOps;
        if (tick.injectEventId) {
          nextDelayedFromWar.push({
            eventId: tick.injectEventId,
            triggerTurn: newTurn + 1,
          });
        }
        // 4) Seuil d'ultimatum atteint → on poste l'event d'ultimatum
        //    pour le tour suivant et on passe le warState à "ultimatum".
        if (
          tick.ultimatumNeeded &&
          (!nextWarState || nextWarState.status === "peace")
        ) {
          nextWarState = createWarStateForUltimatum(newTurn);
          nextDelayedFromWar.push({
            eventId: ULTIMATUM_EVENT_ID,
            triggerTurn: newTurn + 1,
          });
        }
      }

      let electionResult: ElectionResult | null = prev.electionResult;
      if (gameOver.triggeredElection) {
        electionResult = computeElection(
          newGauges,
          newPromises,
          newMedia,
          newOpposition,
          newScandalsRevealedTotal,
          newRegions,
        );
        gameOver = {
          isOver: true,
          victory: electionResult.reElected,
          title: electionResult.headline,
          reason: electionResult.summary,
          triggeredElection: true,
        };
      }

      // (Module 7.1 — tickResearch + doctrines : déplacé plus haut,
      // juste avant `checkGameOver`, pour que les bonus puissent
      // influencer la fin de mandat ou le résultat d'une élection.)

      // Module 6 — Si la guerre/ultimatum a forcé un game over,
      // il OVERRIDE le game over standard (jauges/élection) et
      // l'electionResult est neutralisé : on ne joue pas une
      // élection au lendemain d'une capitulation ou d'une défaite.
      //
      // De plus : tant qu'une guerre conventionnelle est ACTIVE
      // (status === "war" ou "ultimatum") sans verdict de guerre,
      // on SUSPEND le game over standard (jauges effondrées, fin de
      // mandat, etc.). Sans cela, atteindre `maxTurns` au milieu
      // d'une guerre déclencherait une élection présidentielle au
      // lendemain d'une bataille — aberration narrative. Le moteur
      // de guerre garantit qu'un verdict tombera dans ≤ maxWarTurns
      // tours, donc cette suspension est bornée et sûre.
      const warOngoing =
        nextWarState != null &&
        (nextWarState.status === "war" ||
          nextWarState.status === "ultimatum") &&
        warForcedGameOver === null;
      const finalGameOver =
        warForcedGameOver ?? (warOngoing ? { isOver: false } : gameOver);
      const finalElectionResult =
        warForcedGameOver || warOngoing ? null : electionResult;

      // ─── Module 8 — Reprogrammation de l'horloge ──────────────────
      // La décision est instantanée (currentMonth ne bouge pas), mais
      // on programme le prochain événement à +MONTHS_PER_DECISION.
      // UX : après une décision, le temps reste en PAUSE (speed=0).
      // Le joueur doit appuyer explicitement sur Play pour reprendre.
      // Raison : l'auto-reprise était perçue comme "chaque toucher fait
      // avancer le temps" — expérience très inconfortable.
      // Convergence horloge / moteur : quand l'élection finale est
      // déclenchée par `state.turn === maxTurns` (côté moteur), on
      // pousse l'horloge fictive sur le mois 60 pour que les écrans
      // d'élection / game-over affichent un mandat complet.
      const isElectionEnd =
        finalGameOver.isOver && finalGameOver.triggeredElection === true;
      // LOT 15 + LOT 16 — Une décision résolue était forcément un
      // événement plein écran (rare ou major). On ré-infère sa
      // sévérité depuis l'event courant pour savoir quel cooldown
      // poser :
      //   • rare  → on enregistre lastRareEventMonth ET
      //             lastMajorEventMonth (le cooldown rare est
      //             plus long, mais il englobe aussi un major)
      //   • major → on enregistre uniquement lastMajorEventMonth
      // Puis on replanifie nextEventMonth avec la fenêtre adaptée.
      const resolvedSeverity = inferEventSeverity(prev.currentEvent);
      const wasRare = resolvedSeverity === "rare";
      const resolveMonth = isElectionEnd
        ? TOTAL_MONTHS
        : prev.gameTime?.currentMonth ?? 1;
      const newLastRare = wasRare
        ? resolveMonth
        : prev.gameTime?.lastRareEventMonth ?? 0;
      const nextGameTime: GameTime | undefined = prev.gameTime
        ? {
            ...prev.gameTime,
            currentMonth: resolveMonth,
            lastMajorEventMonth: resolveMonth,
            lastRareEventMonth: newLastRare,
            nextEventMonth: scheduleNextEventMonthBySeverity(
              resolveMonth,
              wasRare ? "rare" : "major",
              resolveMonth,
              newLastRare,
            ),
            // Toujours pause après une décision — l'auto-resume a été supprimé
            // pour éviter que chaque choix soit perçu comme "le temps avance".
            speed: 0,
          }
        : prev.gameTime;

      return {
        ...prev,
        gauges: newGauges,
        hiddenGauges: newHiddenGauges,
        revealedHiddenKeys: newRevealedHiddenKeys,
        ministers: newMinisters,
        regions: newRegions,
        media: newMedia,
        opposition: newOpposition,
        promises: newPromises,
        delayedEvents: [...newDelayedAfterCascade, ...nextDelayedFromWar],
        scheduledConsequences: newScheduled,
        hiddenScandals: remainingScandals,
        scandalsRevealed: newScandalsRevealedTotal,
        attackLines: newAttackLines,
        tech: nextTech,
        // Module 6 — propagation des nouveaux champs.
        hostilePower: nextHostilePower,
        hybridOps: nextHybridOps,
        warState: nextWarState,
        log: [
          // Module 7.1 — Doctrine activée : entrée la plus marquante
          // du tour. Apparaît tout en haut, avant la presse et les
          // évènements ministériels.
          ...doctrineLogEntries.reverse(),
          // Module 7.1 — Interception cyber : juste sous l'activation
          // de doctrine éventuelle, au-dessus du compte-rendu de la
          // crise (qui aura été neutralisée).
          ...shieldLogEntries.reverse(),
          // Module 3 — les évènements ministériels (fronde / scandale)
          // apparaissent EN HAUT du journal, devant les conséquences
          // techniques, parce qu'ils sont la "Une" du tour côté médias.
          ...ministerLogEntries.reverse(),
          // Cascade log entries appear ABOVE the decision they were
          // attributed to so the journal reads top-down: "Conséquence
          // de votre choix — voici la décision d'origine".
          ...cascadeFire.logEntries.reverse(),
          ...scandalLogEntries.reverse(),
          decisionEntryWithHeadline,
          ...prev.log,
        ],
        currentEvent: null,
        turn: newTurn,
        gameOver: finalGameOver,
        electionResult: finalElectionResult,
        gameTime: nextGameTime,
      };
    });
  }, []);

  const resetGame = useCallback(async () => {
    await deleteGame();
    setState(DEFAULT_STATE);
    setHasSavedGame(false);
  }, []);

  // ─── Module 8 — Actions de l'horloge de mandat ─────────────────────
  // `setSpeed` change la vitesse en mémorisant la dernière vitesse
  // non-zéro choisie ; `dismissReport` ferme une modale de bilan et
  // remet à zéro la baseline des jauges ; `skipToNextEvent` saute
  // jusqu'au prochain événement / bilan / élection sans laisser
  // défiler le ticker.
  const setSpeed = useCallback((speed: TimeSpeed) => {
    setState((prev) => {
      if (!prev.president || prev.gameOver.isOver) return prev;
      if (!prev.gameTime) return prev;
      // Refuse de relancer la lecture si un événement est ouvert ou
      // un bilan ANNUEL est en attente — ces deux modales DOIVENT
      // être résolues avant que l'horloge reprenne. Les bilans
      // trimestriels (toast non bloquant) ne bloquent JAMAIS le
      // ticker : ils se ferment d'eux-mêmes après quelques secondes.
      const blockingReport =
        prev.gameTime.pendingReport?.kind === "year"
          ? prev.gameTime.pendingReport
          : null;
      if (speed !== 0 && (prev.currentEvent || blockingReport)) {
        return prev;
      }
      if (__DEV__ && speed > 0) {
        console.log("[TIME_ADVANCE] explicit_play — setSpeed →", speed);
      }
      const speedBeforePause: Exclude<TimeSpeed, 0> =
        speed === 0 ? prev.gameTime.speedBeforePause : speed;
      return {
        ...prev,
        gameTime: { ...prev.gameTime, speed, speedBeforePause },
      };
    });
  }, []);

  const dismissReport = useCallback(() => {
    setState((prev) => {
      if (!prev.gameTime || !prev.gameTime.pendingReport) return prev;
      return {
        ...prev,
        gameTime: {
          ...prev.gameTime,
          pendingReport: null,
          // Snapshot reset : le prochain bilan comparera les jauges
          // par rapport au moment où le joueur a fermé celui-ci.
          lastSnapshotGauges: { ...prev.gauges },
          // Toujours pause après fermeture d'un bilan — l'auto-resume a été
          // supprimé. Le joueur reprend manuellement via Play.
          speed: 0,
        },
      };
    });
  }, []);

  // ─── LOT 15 — Actions sur la file MINEURS / NOTIFICATIONS ─────────
  // Les mineurs n'incrémentent pas `turn` et ne déclenchent ni
  // cascade, ni scandale, ni résistance régionale. C'est volontaire :
  // un mineur DOIT rester rapide et léger sinon il devient majeur.
  // Effets appliqués : `effects` visibles + `mediaEffect` +
  // `oppositionEffect`. Tout le reste du payload est ignoré.
  const resolveMinorEvent = useCallback(
    (eventId: string, choiceId: string) => {
      setState((prev) => {
        const queue = prev.minorEventQueue ?? [];
        const idx = queue.findIndex((m) => m.eventId === eventId);
        if (idx === -1) return prev;
        const event = getEventById(eventId);
        if (!event) {
          // Catalogue désynchronisé : juste retirer la carte fantôme.
          return {
            ...prev,
            minorEventQueue: queue.filter((_, i) => i !== idx),
          };
        }
        const choice = event.choices.find((c) => c.id === choiceId);
        if (!choice) return prev;
        const lightChoice: EventChoice = {
          ...choice,
          // On NEUTRALISE explicitement les payloads qui transformeraient
          // un mineur en majeur déguisé.
          hiddenEffects: undefined,
          cascade: undefined,
          hidesScandal: undefined,
          schedulesEvent: undefined,
          ministerEffects: undefined,
          regionEffects: undefined,
        };
        const newGauges = applyChoice(prev.gauges, lightChoice);
        const newMedia = clamp(prev.media + (choice.mediaEffect ?? 0));
        const newOpposition = clamp(
          prev.opposition + (choice.oppositionEffect ?? 0),
        );
        const logEntry: DecisionLogEntry = {
          id: newLogId(),
          turn: prev.turn,
          eventTitle: `${event.title} (mineur)`,
          choiceLabel: choice.label,
          consequence: choice.consequence,
          effects: choice.effects,
          timestamp: Date.now(),
        };
        return {
          ...prev,
          gauges: newGauges,
          media: newMedia,
          opposition: newOpposition,
          log: [logEntry, ...prev.log],
          minorEventQueue: queue.filter((_, i) => i !== idx),
        };
      });
    },
    [],
  );

  const dismissMinorEvent = useCallback((eventId: string) => {
    setState((prev) => ({
      ...prev,
      minorEventQueue: (prev.minorEventQueue ?? []).filter(
        (m) => m.eventId !== eventId,
      ),
    }));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      eventNotifications: (prev.eventNotifications ?? []).filter(
        (n) => n.id !== id,
      ),
    }));
  }, []);

  // Ticker silencieux d'un mois (utilisé par l'interval ET par skip).
  // Garantit l'invariant : un seul mois écoulé par appel, avec checks
  // élection > bilan > avancement simple. Le tirage d'événement est
  // délégué au useEffect "draw on currentMonth >= nextEventMonth"
  // pour rester en dehors du setState (évite les double-render).
  const advanceOneMonth = useCallback(() => {
    setState((prev) => {
      if (!prev.president || prev.gameOver.isOver) return prev;
      if (prev.currentEvent) return prev;
      // Seul un bilan ANNUEL bloque le ticker (modale bloquante).
      // Le bilan trimestriel (toast non bloquant) laisse défiler.
      if (!prev.gameTime || prev.gameTime.pendingReport?.kind === "year") {
        return prev;
      }
      if (prev.gameTime.speed === 0) return prev;
      // LOT 17 — Le ticker bat désormais à la SEMAINE (4 semaines
      // par mois). On n'incrémente le mois que quand la 4e semaine
      // est terminée ; jusque-là, on bouge juste `weekInMonth` pour
      // animer la barre de temps. L'event scheduler, lui, reste
      // basé sur `currentMonth` entier (rien d'autre ne change).
      const currentWeek = prev.gameTime.weekInMonth ?? 1;
      if (currentWeek < WEEKS_PER_MONTH) {
        return {
          ...prev,
          gameTime: {
            ...prev.gameTime,
            weekInMonth: currentWeek + 1,
          },
        };
      }
      // 4e semaine atteinte → on bascule au mois suivant et on
      // remet le sous-compteur à 1.
      logTimeAdvance(
        "explicit_play",
        prev.gameTime.currentMonth,
        Math.min(TOTAL_MONTHS, prev.gameTime.currentMonth + 1),
        "advanceOneMonth/setInterval",
      );
      const nextMonth = Math.min(
        TOTAL_MONTHS,
        prev.gameTime.currentMonth + 1,
      );
      // LOT 15 — Purge centralisée des files expirées à chaque tick
      // de mois. Garantit que les cartes mineures et notifications
      // disparaissent même si le joueur n'interagit pas.
      const purged = purgeExpiredQueues(
        prev.minorEventQueue,
        prev.eventNotifications,
        nextMonth,
      );

      // LOT 18.3 — Régénération mensuelle des 5 ressources +
      // notification dans le ticker. Pure : `regen.nextResources`
      // est déjà clampé [0, RESOURCE_MAX], `regen.summary` est
      // déjà formaté FR (NNBSP sur Budget). Appliquée sur LES TROIS
      // branches (élection finale, bilan trim/annuel, avancement
      // simple) pour garantir la parité skipToNextEvent ↔ N appels
      // d'advanceOneMonth — sinon le mois 60 jetterait silencieusement
      // une dernière régénération.
      const currentResources = prev.resources ?? INITIAL_RESOURCES;
      const regen = regenerateResources(
        currentResources,
        prev.gauges,
        prev.hiddenGauges,
      );
      const regenNotif: EventNotification = {
        id: `notif_regen_${nextMonth}`,
        kind: "INFO",
        text: regen.summary,
        createdMonth: nextMonth,
        // Volontairement court (2 mois) : c'est une info périodique,
        // elle laisse la place à la prochaine. Évite l'empilement.
        expiresMonth: nextMonth + 2,
      };
      const eventNotificationsWithRegen = [
        regenNotif,
        ...purged.eventNotifications,
      ].slice(0, MAX_NOTIFICATION_QUEUE_SIZE);

      // 1) Élection finale au mois 60 (priorité absolue).
      if (nextMonth >= TOTAL_MONTHS) {
        const electionResult = computeElection(
          prev.gauges,
          prev.promises,
          prev.media,
          prev.opposition,
          prev.scandalsRevealed,
          prev.regions,
        );
        return {
          ...prev,
          electionResult,
          gameOver: {
            isOver: true,
            victory: electionResult.reElected,
            title: electionResult.headline,
            reason: electionResult.summary,
            triggeredElection: true,
          },
          turn: prev.maxTurns,
          gameTime: {
            ...prev.gameTime,
            currentMonth: TOTAL_MONTHS,
            weekInMonth: 1,
            speed: 0,
          },
          minorEventQueue: purged.minorEventQueue,
          // LOT 18.3 — Parité advanceOneMonth ↔ skipToNextEvent : la
          // dernière régénération (mois 59→60) est appliquée même sur
          // l'élection finale, sinon avancer mois par mois jusqu'au
          // mois 60 perdrait ce dernier delta.
          eventNotifications: eventNotificationsWithRegen,
          resources: regen.nextResources,
        };
      }
      // 2) Bilan trimestriel ou annuel dû à ce mois ?
      const reportKind = detectDueReport(
        nextMonth,
        prev.gameTime.lastReportedQuarter,
        prev.gameTime.lastReportedYear,
      );
      if (reportKind) {
        const pendingReport: MandateReport = {
          kind: reportKind,
          month: nextMonth,
          prevGauges: { ...prev.gameTime.lastSnapshotGauges },
          gauges: { ...prev.gauges },
        };
        // Bilan annuel = modale bloquante → speed=0 (auto-pause).
        // Bilan trimestriel = toast non bloquant → speed inchangée
        // (le ticker continue, le toast se ferme tout seul après
        // ~4 s côté UI). Évite la popup-spam tous les 3 mois.
        const isBlockingReport = reportKind === "year";
        return {
          ...prev,
          gameTime: {
            ...prev.gameTime,
            currentMonth: nextMonth,
            weekInMonth: 1,
            speed: isBlockingReport ? 0 : prev.gameTime.speed,
            pendingReport,
            lastReportedQuarter:
              reportKind === "quarter"
                ? nextMonth
                : prev.gameTime.lastReportedQuarter,
            lastReportedYear:
              reportKind === "year"
                ? nextMonth
                : prev.gameTime.lastReportedYear,
          },
          minorEventQueue: purged.minorEventQueue,
          eventNotifications: eventNotificationsWithRegen,
          // LOT 18.3 — Régénération mensuelle même quand un bilan
          // tombe ce mois (les recettes/dépenses ne s'arrêtent pas).
          resources: regen.nextResources,
        };
      }
      // 3) Avancement simple (event tiré par useEffect dédié).
      return {
        ...prev,
        gameTime: {
          ...prev.gameTime,
          currentMonth: nextMonth,
          weekInMonth: 1,
        },
        minorEventQueue: purged.minorEventQueue,
        eventNotifications: eventNotificationsWithRegen,
        // LOT 18.3 — Régénération mensuelle des 5 ressources.
        resources: regen.nextResources,
      };
    });
  }, []);

  const skipToNextEvent = useCallback(() => {
    setState((prev) => {
      if (!prev.president || prev.gameOver.isOver) return prev;
      if (prev.currentEvent) return prev;
      // Bilan annuel ouvert → on attend la fermeture. Bilan
      // trimestriel (toast) → on peut sauter par-dessus (le toast
      // sera supplanté par celui du nouveau bilan ou par l'event).
      if (!prev.gameTime || prev.gameTime.pendingReport?.kind === "year") {
        return prev;
      }
      let m = prev.gameTime.currentMonth;
      const skipStartMonth = m;
      let lastQ = prev.gameTime.lastReportedQuarter;
      let lastY = prev.gameTime.lastReportedYear;
      let pendingReport: MandateReport | null =
        prev.gameTime.pendingReport ?? null;
      // LOT 18.3 — Pendant le skip, les jauges restent inchangées
      // mais les RESSOURCES doivent quand même avancer mois par mois
      // (recettes/dépenses ne s'arrêtent pas pendant un fast-forward).
      // On compose les régens via la boucle ; les clamps [0, MAX]
      // s'appliquent à chaque pas, donc si le delta est positif on
      // sature naturellement à RESOURCE_MAX au bout de quelques mois.
      const startMonth = prev.gameTime.currentMonth;
      const startResources = prev.resources ?? INITIAL_RESOURCES;
      let runningResources = startResources;
      // LOT 18.3 — Helper local : construit la liste de notifications
      // avec UNE notif synthétique de skip cumulé (kind INFO, expires
      // +2 mois). Appelé aux 3 returns (year report, élection finale,
      // sortie nominale) pour garantir la parité avec advanceOneMonth
      // appelé N fois — sinon les régens accumulées dans la boucle
      // seraient jetées par le `...prev` du return.
      const buildSkipNotifs = (
        endMonth: number,
      ): ReadonlyArray<EventNotification> => {
        // Purge des notifs expirées au mois cible — équivalence avec
        // advanceOneMonth qui purge à chaque tick (sinon un long skip
        // garderait des notifs expirées plusieurs mois auparavant).
        const purgedNotifs = purgeExpiredQueues(
          prev.minorEventQueue,
          prev.eventNotifications,
          endMonth,
        ).eventNotifications;
        const monthsSkipped = endMonth - startMonth;
        if (monthsSkipped <= 0) return purgedNotifs;
        const totalDelta: ResourceDelta = {};
        for (const key of RESOURCE_KEYS) {
          const d = runningResources[key] - startResources[key];
          if (d !== 0) totalDelta[key] = d;
        }
        const skipNotif: EventNotification = {
          id: `notif_skip_${endMonth}`,
          kind: "INFO",
          text: formatSkipSummary(monthsSkipped, totalDelta),
          createdMonth: endMonth,
          expiresMonth: endMonth + 2,
        };
        return [skipNotif, ...purgedNotifs].slice(
          0,
          MAX_NOTIFICATION_QUEUE_SIZE,
        );
      };
      // Boucle bornée par TOTAL_MONTHS (sécurité, ne devrait jamais
      // tourner > 60 fois). On stoppe au prochain bilan ANNUEL ou au
      // prochain événement — un bilan trimestriel rencontré en route
      // est juste posé en toast non bloquant et on continue à sauter.
      while (m < prev.gameTime.nextEventMonth && m < TOTAL_MONTHS) {
        const next = m + 1;
        // Régen mensuelle (jauges stables pendant le skip).
        runningResources = regenerateResources(
          runningResources,
          prev.gauges,
          prev.hiddenGauges,
        ).nextResources;
        const kind = detectDueReport(next, lastQ, lastY);
        if (kind === "year") {
          const yearReport: MandateReport = {
            kind,
            month: next,
            prevGauges: { ...prev.gameTime.lastSnapshotGauges },
            gauges: { ...prev.gauges },
          };
          return {
            ...prev,
            gameTime: {
              ...prev.gameTime,
              currentMonth: next,
              weekInMonth: 1,
              speed: 0,
              pendingReport: yearReport,
              lastReportedQuarter: lastQ,
              lastReportedYear: next,
            },
            // LOT 18.3 — Régens cumulées jusqu'au mois du bilan annuel
            // + UNE notif synthétique de skip (pas N notifs mensuelles).
            resources: runningResources,
            eventNotifications: [...buildSkipNotifs(next)],
          };
        }
        if (kind === "quarter") {
          // On pose le toast trimestriel mais on continue à sauter.
          pendingReport = {
            kind,
            month: next,
            prevGauges: { ...prev.gameTime.lastSnapshotGauges },
            gauges: { ...prev.gauges },
          };
          lastQ = next;
        }
        m = next;
      }
      // Mois 60 → élection finale immédiate.
      if (m >= TOTAL_MONTHS) {
        const electionResult = computeElection(
          prev.gauges,
          prev.promises,
          prev.media,
          prev.opposition,
          prev.scandalsRevealed,
          prev.regions,
        );
        return {
          ...prev,
          electionResult,
          gameOver: {
            isOver: true,
            victory: electionResult.reElected,
            title: electionResult.headline,
            reason: electionResult.summary,
            triggeredElection: true,
          },
          turn: prev.maxTurns,
          gameTime: {
            ...prev.gameTime,
            currentMonth: TOTAL_MONTHS,
            weekInMonth: 1,
            speed: 0,
          },
          // LOT 18.3 — Parité avec advanceOneMonth(N fois) : les
          // régens cumulées par la boucle ci-dessus doivent être
          // appliquées même quand le skip atteint l'élection finale,
          // sinon `...prev` jette tout le travail accumulé.
          resources: runningResources,
          eventNotifications: [...buildSkipNotifs(m)],
        };
      }
      // Sinon, on est arrivé sur nextEventMonth : speed=0 (pause auto)
      // et le useEffect "draw" déclenchera le tirage juste après.
      // Un éventuel toast trimestriel collecté est conservé pour
      // s'afficher en parallèle de l'EventModal qui suit.
      logTimeAdvance("explicit_skip", skipStartMonth, m, "skipToNextEvent");
      return {
        ...prev,
        gameTime: {
          ...prev.gameTime,
          currentMonth: m,
          weekInMonth: 1,
          speed: 0,
          pendingReport,
          lastReportedQuarter: lastQ,
          lastReportedYear: lastY,
        },
        // LOT 18.3 — Régens cumulées sur tout le saut + UNE notif
        // synthétique unique (évite empilement de N notifs identiques).
        resources: runningResources,
        eventNotifications: [...buildSkipNotifs(m)],
      };
    });
  }, []);

  // ─── Module 8 — Tick d'horloge piloté par speed ────────────────────
  // Un seul setInterval actif à la fois ; recalculé quand speed change
  // (ou quand un event/bilan apparaît, ce qui clear l'interval).
  useEffect(() => {
    if (!loaded) return;
    if (!state.president) return;
    if (state.gameOver.isOver) return;
    if (state.currentEvent) return;
    if (!state.gameTime) return;
    // Seul un bilan ANNUEL gèle le ticker. Le toast trimestriel ne
    // bloque rien : c'est un simple feedback visuel non interactif.
    if (state.gameTime.pendingReport?.kind === "year") return;
    if (state.gameTime.speed === 0) return;
    const ms = TICK_MS_BY_SPEED[state.gameTime.speed];
    const id = setInterval(() => advanceOneMonth(), ms);
    return () => clearInterval(id);
  }, [
    loaded,
    state.president,
    state.gameOver.isOver,
    state.currentEvent,
    state.gameTime?.speed,
    state.gameTime?.pendingReport,
    advanceOneMonth,
  ]);

  // ─── Module 8 — Tirage d'événement quand l'horloge atteint la date ──
  // Quand `currentMonth >= nextEventMonth`, on déclenche `drawNextEvent`
  // qui placera un event sur l'écran ; un useEffect séparé met alors
  // l'horloge en pause auto (voir ci-dessous).
  useEffect(() => {
    if (!loaded) return;
    if (!state.president) return;
    if (state.gameOver.isOver) return;
    if (state.currentEvent) return;
    if (!state.gameTime) return;
    // Idem : seul un bilan annuel diffère le tirage.
    if (state.gameTime.pendingReport?.kind === "year") return;
    if (state.gameTime.currentMonth >= state.gameTime.nextEventMonth) {
      drawNextEvent();
    }
  }, [
    loaded,
    state.president,
    state.gameOver.isOver,
    state.currentEvent,
    state.gameTime?.currentMonth,
    state.gameTime?.nextEventMonth,
    state.gameTime?.pendingReport,
    drawNextEvent,
  ]);

  // ─── Module 8 — Pause auto sur événement majeur ───────────────────
  // Tout `currentEvent` (catalogue, hybride, régional, scénario IA,
  // ultimatum, war event…) est traité comme « majeur » : l'horloge se
  // met en pause pour laisser le joueur décider sans pression.
  useEffect(() => {
    if (!state.currentEvent) return;
    if (!state.gameTime) return;
    if (state.gameTime.speed === 0) return;
    setState((prev) =>
      prev.gameTime
        ? { ...prev, gameTime: { ...prev.gameTime, speed: 0 } }
        : prev,
    );
  }, [state.currentEvent, state.gameTime?.speed]);

  // Module 6 — Application d'une contre-mesure hybride. Pas autorisée
  // pendant la guerre conventionnelle (c'est trop tard pour la diplo
  // & le cyber civil) ni en game-over.
  const applyHybridCountermeasure = useCallback(
    (id: CountermeasureId): boolean => {
      let accepted = false;
      setState((prev) => {
        if (!prev.president) return prev;
        if (prev.gameOver.isOver) return prev;
        if (
          prev.warState &&
          (prev.warState.status === "war" ||
            prev.warState.status === "ultimatum")
        ) {
          return prev;
        }
        const result = applyCountermeasure(prev.hostilePower, id);
        if (!result) return prev;
        const e = result.effects;
        const he = result.hiddenEffects;
        const newGauges: Gauges = {
          popularity: clamp(prev.gauges.popularity + (e.popularity ?? 0)),
          authority: clamp(prev.gauges.authority + (e.authority ?? 0)),
          economy: clamp(prev.gauges.economy + (e.economy ?? 0)),
          security: clamp(prev.gauges.security + (e.security ?? 0)),
          ecology: clamp(prev.gauges.ecology + (e.ecology ?? 0)),
          health: clamp(prev.gauges.health + (e.health ?? 0)),
          diplomacy: clamp(prev.gauges.diplomacy + (e.diplomacy ?? 0)),
          cohesion: clamp(prev.gauges.cohesion + (e.cohesion ?? 0)),
          budget: clamp(prev.gauges.budget + (e.budget ?? 0)),
          debt: clamp(prev.gauges.debt + (e.debt ?? 0)),
          regionalStability: clamp(
            prev.gauges.regionalStability + (e.regionalStability ?? 0),
          ),
        };
        const newHidden: HiddenGauges = {
          scandalRisk: clamp(
            prev.hiddenGauges.scandalRisk + (he.scandalRisk ?? 0),
          ),
          peopleFatigue: clamp(
            prev.hiddenGauges.peopleFatigue + (he.peopleFatigue ?? 0),
          ),
          radicalization: clamp(
            prev.hiddenGauges.radicalization + (he.radicalization ?? 0),
          ),
          cyberRisk: clamp(prev.hiddenGauges.cyberRisk + (he.cyberRisk ?? 0)),
          foreignDependence: clamp(
            prev.hiddenGauges.foreignDependence + (he.foreignDependence ?? 0),
          ),
          corruption: clamp(
            prev.hiddenGauges.corruption + (he.corruption ?? 0),
          ),
          oppositionPower: clamp(
            prev.hiddenGauges.oppositionPower + (he.oppositionPower ?? 0),
          ),
        };
        accepted = true;
        return {
          ...prev,
          hostilePower: result.hostilePower,
          gauges: newGauges,
          hiddenGauges: newHidden,
        };
      });
      return accepted;
    },
    [],
  );

  /**
   * Module 7 — Démarre la recherche d'une techno. Tout le calcul de
   * faisabilité est délégué à `startResearch` (logic/techTree.ts) qui
   * est pur ; ici on se contente d'appliquer atomiquement le débit
   * RESSOURCES (LOT 18.2) + la mise en `tech.inProgress`. Refus
   * silencieux exposé au caller via `{ ok: false, reason, missing? }`
   * pour qu'il puisse afficher un toast détaillé.
   *
   * Effet de bord unique : `state.resources` est remplacé par le
   * snapshot `nextResources` calculé par le moteur pur (jauge
   * `budget` 0-100 % NON touchée — c'est désormais la finance
   * publique structurelle, indépendante du cash on hand).
   */
  const startTechResearch = useCallback(
    (
      id: TechId,
    ):
      | { ok: true }
      | { ok: false; reason: StartResearchError; missing?: ResourceCosts } => {
      let outcome:
        | { ok: true }
        | {
            ok: false;
            reason: StartResearchError;
            missing?: ResourceCosts;
          } = {
        ok: false,
        reason: "no_president",
      };
      setState((prev) => {
        const result = startTechResearchPure(prev, id, prev.turn);
        if (!result.ok) {
          outcome = {
            ok: false,
            reason: result.reason,
            missing: result.missing,
          };
          return prev;
        }
        outcome = { ok: true };
        return {
          ...prev,
          tech: result.nextTech,
          resources: result.nextResources,
        };
      });
      return outcome;
    },
    [],
  );

  /**
   * Continuation après ré-élection — démarre un 2nd mandat avec le
   * MÊME personnage (président, cabinet, état du pays) sans repasser
   * par l'écran de création.
   *
   * Politique de continuité :
   *   - On garde le « monde » : président, ministres (avec leurs
   *     stats actuelles : loyauté, compétence, popularité, scandales),
   *     régions (tensions/jauges), jauges nationales, hiddenGauges.
   *   - On garde le climat : `media` et `opposition` restent au niveau
   *     atteint (pas de "honeymoon" artificiel).
   *   - On RÉINITIALISE les mécaniques en cours : currentEvent,
   *     scandales cachés, cascades, conséquences différées, débats,
   *     gameOver / electionResult, seenEventIds (pour relancer le
   *     pool d'évènements), revealedHiddenKeys (les "secrets" se
   *     re-cachent), `lastRegionalEventTurn`.
   *   - `turn` repart à 1, `scandalsRevealed` à 0.
   *   - Les promesses passent toutes au statut "pending" pour être
   *     ré-évaluées sur ce nouveau mandat.
   *   - Le journal est repris à zéro avec une entrée d'ouverture
   *     "🏛 Investiture du 2nd mandat" pour marquer le passage.
   *   - Refuse silencieusement si l'état actuel n'est pas une
   *     ré-élection (sécurité — le bouton est de toute façon caché).
   */
  const startSecondTerm = useCallback(() => {
    setState((prev) => {
      if (
        !prev.president ||
        !prev.gameOver.isOver ||
        !prev.gameOver.triggeredElection ||
        !prev.electionResult?.reElected
      ) {
        return prev;
      }
      const firstEvent = pickRandomEvent([], [], unlockedPacksRef.current);
      const reopeningEntry: DecisionLogEntry = {
        id: `entry-${Date.now()}-2nd`,
        turn: 0,
        eventTitle: "🏛 Investiture — 2nd mandat",
        choiceLabel: prev.president.name,
        consequence: `Ré-élu·e avec ${Math.round(
          prev.electionResult.voteShare,
        )}% des suffrages, ${prev.president.name} prête à nouveau serment. Un nouveau cycle commence — les mêmes ministres, le même pays, mais l'horloge politique repart à zéro.`,
        effects: {},
        timestamp: Date.now(),
      };
      return {
        ...prev,
        // Mécaniques de tour réinitialisées
        turn: 1,
        currentEvent: firstEvent,
        seenEventIds: [firstEvent.id],
        gameOver: { isOver: false },
        electionResult: null,
        electionDebate: null,
        finalDebatePack: null,
        finalDebateChoices: null,
        delayedEvents: [],
        scheduledConsequences: [],
        hiddenScandals: [],
        scandalsRevealed: 0,
        revealedHiddenKeys: [],
        lastRegionalEventTurn: 0,
        // Module 5 — l'opposition repart la bouche cousue : nouveau
        // mandat, nouvelles batailles. Les anciennes lignes d'attaque
        // ne sont plus pertinentes (les jauges seront ré-évaluées au
        // 1er tour du 2nd mandat).
        attackLines: [],
        // Module 6 — Réinitialisation Guerre hybride : la Division
        // Zéro réobserve depuis zéro (aggression à 30), aucune op
        // active, pas de guerre en cours. La paix règne — pour
        // l'instant.
        hostilePower: createDefaultHostilePower(),
        hybridOps: [],
        warState: null,
        // Module 7 — Reset complet de l'arbre techno au 2nd mandat :
        // c'est un nouveau mandat, le pays repart à zéro côté R&D
        // (cohérent avec le reset des promesses, attack lines, etc.).
        // Module 7.1 — Les doctrines tombent aussi : pas d'effet
        // permanent qui traverserait deux mandats.
        tech: {
          researched: [],
          inProgress: null,
          activeDoctrines: [],
          cyberShieldUsesRemaining: 0,
        },
        // Module 8 — Reset de l'horloge : le 2nd mandat redémarre
        // au mois 1, en pause, sans bilan en attente. Les jauges
        // courantes deviennent le snapshot de référence pour le
        // 1er bilan trimestriel du nouveau cycle.
        gameTime: {
          ...INITIAL_GAME_TIME,
          lastSnapshotGauges: { ...prev.gauges },
        },
        // Journal : on repart d'une page neuve avec l'entrée d'investiture
        log: [reopeningEntry],
        // Promesses : on les remet en "pending" pour évaluer sur le 2nd mandat
        promises: prev.promises.map((p) => ({ ...p, status: "pending" })),
        // Horloge globale du nouveau mandat
        startedAt: Date.now(),
        // Le « monde » reste : président, ministers, regions, gauges,
        // hiddenGauges, media, opposition — déjà conservés par `...prev`.
      };
    });
  }, []);

  // ─── Chantier 2 — Dev-only debug helpers. ───────────────────────
  // Each helper compiles down to a no-op in production via the
  // `__DEV__` guard, so the implementation never ships to players.
  const __debugPatchGauges = useCallback(
    (patch: Partial<GameState["gauges"]>) => {
      if (!__DEV__) return;
      setState((prev) => {
        if (!prev.president || prev.gameOver.isOver) return prev;
        const merged = { ...prev.gauges };
        for (const [k, v] of Object.entries(patch)) {
          if (typeof v === "number") {
            (merged as Record<string, number>)[k] = clamp(v, 0, 100);
          }
        }
        return { ...prev, gauges: merged };
      });
    },
    [],
  );
  const __debugAdvanceTurn = useCallback(() => {
    if (!__DEV__) return;
    setState((prev) => {
      if (!prev.president || prev.gameOver.isOver) return prev;
      const newTurn = prev.turn + 1;
      let gameOver = checkGameOver(
        prev.gauges,
        newTurn,
        prev.maxTurns,
        prev.ministers,
      );
      let electionResult = prev.electionResult;
      if (gameOver.triggeredElection) {
        electionResult = computeElection(
          prev.gauges,
          prev.promises,
          prev.media,
          prev.opposition,
          prev.scandalsRevealed,
        );
        gameOver = {
          isOver: true,
          victory: electionResult.reElected,
          title: electionResult.headline,
          reason: electionResult.summary,
          triggeredElection: true,
        };
      }
      return { ...prev, turn: newTurn, gameOver, electionResult };
    });
  }, []);
  const __debugForceElection = useCallback(() => {
    if (!__DEV__) return;
    setState((prev) => {
      if (!prev.president || prev.gameOver.isOver) return prev;
      const electionResult = computeElection(
        prev.gauges,
        prev.promises,
        prev.media,
        prev.opposition,
        prev.scandalsRevealed,
      );
      return {
        ...prev,
        turn: prev.maxTurns,
        electionResult,
        gameOver: {
          isOver: true,
          victory: electionResult.reElected,
          title: electionResult.headline,
          reason: electionResult.summary,
          triggeredElection: true,
        },
      };
    });
  }, []);

  const stateValue = useMemo<GameStateSlice>(
    () => ({ state, loaded, hasSavedGame }),
    [state, loaded, hasSavedGame],
  );

  const actionsValue = useMemo<GameActions>(
    () => ({
      startNewGame,
      drawNextEvent,
      resolveChoice,
      resetGame,
      startSecondTerm,
      replaceMinister,
      injectCustomEvent,
      attachHeadlineToEntry,
      setElectionDebate,
      setFinalDebatePack,
      setFinalDebateChoice,
      applyHybridCountermeasure,
      startTechResearch,
      setSpeed,
      skipToNextEvent,
      dismissReport,
      resolveMinorEvent,
      dismissMinorEvent,
      dismissNotification,
      __debugPatchGauges,
      __debugAdvanceTurn,
      __debugForceElection,
    }),
    [
      startNewGame,
      drawNextEvent,
      resolveChoice,
      resetGame,
      startSecondTerm,
      replaceMinister,
      injectCustomEvent,
      attachHeadlineToEntry,
      setElectionDebate,
      setFinalDebatePack,
      setFinalDebateChoice,
      applyHybridCountermeasure,
      startTechResearch,
      setSpeed,
      skipToNextEvent,
      dismissReport,
      resolveMinorEvent,
      dismissMinorEvent,
      dismissNotification,
      __debugPatchGauges,
      __debugAdvanceTurn,
      __debugForceElection,
    ],
  );

  return (
    <GameActionsContext.Provider value={actionsValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
      </GameStateContext.Provider>
    </GameActionsContext.Provider>
  );
}

/** Full game context — backward-compatible, re-renders on every state tick. */
export function useGame(): GameContextValue {
  const s = useContext(GameStateContext);
  const a = useContext(GameActionsContext);
  if (!s || !a) throw new Error("useGame must be used within GameProvider");
  return { ...s, ...a };
}

/** Only action callbacks — stable references, almost never causes a re-render. */
export function useGameActions(): GameActions {
  const ctx = useContext(GameActionsContext);
  if (!ctx) throw new Error("useGameActions must be used within GameProvider");
  return ctx;
}

/** Only volatile state — use when you don't need to call any action. */
export function useGameState(): GameStateSlice {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error("useGameState must be used within GameProvider");
  return ctx;
}
