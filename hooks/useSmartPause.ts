import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { loadSessionData, saveSessionData } from "@/storage/sessionStorage";
import type { SessionData } from "@/storage/sessionStorage";
import type { StrategyGameState, ResourceKey } from "@/types/strategy";
import { NEWS_EVENT_MAP } from "@/data/newsEvents";
import { STRATEGY_RESEARCH } from "@/data/strategyResearch";
import { generateRecommendations } from "@/logic/recommendationEngine";

const PAUSE_THRESHOLD_MS  = 45 * 60 * 1000; // 45 min de jeu continu → suggestion
const PAUSE_COOLDOWN_MS   = 60 * 60 * 1000; // 60 min minimum entre deux suggestions
const RETURN_THRESHOLD_MS = 10 * 60 * 1000; // 10 min d'absence → rapport de retour
const CHECK_INTERVAL_MS   = 60 * 1000;      // vérification toutes les minutes

const INDICATOR_NAMES: Record<string, string> = {
  popularity:   "Popularité",
  economy:      "Économie",
  security:     "Sécurité",
  ecology:      "Écologie",
  cohesion:     "Cohésion",
  publicBudget: "Budget public",
};

export interface ReturnData {
  awayMinutes:    number;
  mandateDay:     number;
  progressItems:  string[];  // En cours (bâtiments, recherche)
  completedItems: string[];  // Terminé (prêt à collecter)
  decisionsItems: string[];  // Décisions en attente
  dangerItems:    string[];  // Situations critiques
  priorityAction: { label: string; route: string } | null;
}

export interface SmartPauseResult {
  showPause:    boolean;
  showReturn:   boolean;
  returnData:   ReturnData | null;
  dismissPause: () => void;
  confirmPause: () => void;
  dismissReturn: () => void;
}

export function useSmartPause(state: StrategyGameState | null): SmartPauseResult {
  const [showPause,  setShowPause]  = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnData, setReturnData] = useState<ReturnData | null>(null);

  const stateRef       = useRef(state);
  const sessionRef     = useRef<SessionData>({ sessionStartedAt: 0, lastPauseSuggestedAt: 0, backgroundAt: null, backgroundResources: null });
  const returnShownRef = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);

  const dismissPause  = useCallback(() => setShowPause(false), []);
  const dismissReturn = useCallback(() => { setShowReturn(false); setReturnData(null); }, []);

  const confirmPause = useCallback(() => {
    const updated: SessionData = {
      ...sessionRef.current,
      sessionStartedAt:     Date.now(),
      lastPauseSuggestedAt: Date.now(),
    };
    sessionRef.current = updated;
    void saveSessionData(updated);
    setShowPause(false);
  }, []);

  useEffect(() => {
    const now = Date.now();

    function buildReturnData(awayMs: number): ReturnData | null {
      const s = stateRef.current;
      if (!s) return null;
      const nowTs = Date.now();

      // ── Ce qui a progressé ───────────────────────────────────────────────
      const progressItems: string[] = [];

      const buildingsInProgress = s.buildings.filter(
        (b) => b.upgradeEndTime !== null && b.upgradeEndTime > nowTs,
      );
      if (buildingsInProgress.length > 0) {
        progressItems.push(
          buildingsInProgress.length === 1
            ? "1 bâtiment en cours d'amélioration"
            : `${buildingsInProgress.length} bâtiments en cours d'amélioration`,
        );
      }

      const research = s.strategyResearch?.inProgress;
      if (research && research.completesAtDay > s.mandateDay) {
        const name = STRATEGY_RESEARCH[research.id]?.name ?? "Recherche";
        progressItems.push(`Recherche en cours : ${name}`);
      }

      // ── Ce qui est terminé ───────────────────────────────────────────────
      const completedItems: string[] = [];

      const buildingsDone = s.buildings.filter(
        (b) => b.upgradeEndTime !== null && b.upgradeEndTime <= nowTs,
      );
      if (buildingsDone.length > 0) {
        completedItems.push(
          buildingsDone.length === 1
            ? "1 amélioration de bâtiment prête"
            : `${buildingsDone.length} améliorations de bâtiments prêtes`,
        );
      }

      if (research && research.completesAtDay <= s.mandateDay) {
        completedItems.push("Recherche terminée — résultats disponibles");
      }

      const pendingMissions = s.missions.filter((m) => m.completed);
      if (pendingMissions.length > 0) {
        completedItems.push(
          pendingMissions.length === 1
            ? "1 récompense de mission à réclamer"
            : `${pendingMissions.length} récompenses à réclamer`,
        );
      }

      const trainingReady = s.trainingQueue.filter((t) => t.status === "completed");
      if (trainingReady.length > 0) {
        completedItems.push(
          trainingReady.length === 1
            ? "1 lot d'unités prêt au déploiement"
            : `${trainingReady.length} lots d'unités prêts`,
        );
      }

      // ── Ce qui demande une décision ──────────────────────────────────────
      const decisionsItems: string[] = [];

      const criticalEvents = s.news.pendingIds.filter((id) => {
        const evt = NEWS_EVENT_MAP[id];
        return evt?.isInteractive && evt?.urgency === "critique";
      });
      if (criticalEvents.length > 0) {
        decisionsItems.push(
          criticalEvents.length === 1
            ? "1 crise critique attend votre décision"
            : `${criticalEvents.length} crises critiques attendent votre décision`,
        );
      }

      const otherEvents = s.news.pendingIds.filter((id) => {
        const evt = NEWS_EVENT_MAP[id];
        return evt?.isInteractive && evt?.urgency !== "critique";
      });
      if (otherEvents.length > 0) {
        decisionsItems.push(
          otherEvents.length === 1
            ? "1 événement attend votre arbitrage"
            : `${otherEvents.length} événements attendent votre arbitrage`,
        );
      }

      // ── Ce qui est dangereux ─────────────────────────────────────────────
      const dangerItems: string[] = [];

      for (const [key, val] of Object.entries(s.nationalIndicators)) {
        const isLow = key === "publicBudget" ? val < -80 : val < 30;
        if (isLow) {
          dangerItems.push(`${INDICATOR_NAMES[key] ?? key} en zone critique`);
          if (dangerItems.length >= 2) break; // cap à 2 items danger
        }
      }

      const hostileCount = s.relations.filter((r) => r.status === "hostile").length;
      if (hostileCount > 0 && dangerItems.length < 2) {
        dangerItems.push(
          hostileCount === 1
            ? "1 relation hostile active"
            : `${hostileCount} relations hostiles actives`,
        );
      }

      // ── Prochaine action conseillée ──────────────────────────────────────
      const recs = generateRecommendations(s);
      const topRec = recs[0] ?? null;
      const priorityAction = topRec
        ? { label: topRec.title, route: topRec.targetRoute }
        : null;

      return {
        awayMinutes:    Math.round(awayMs / 60000),
        mandateDay:     s.mandateDay,
        progressItems:  progressItems.slice(0, 2),
        completedItems: completedItems.slice(0, 2),
        decisionsItems: decisionsItems.slice(0, 2),
        dangerItems:    dangerItems.slice(0, 2),
        priorityAction,
      };
    }

    function showReturnBriefing(awayMs: number) {
      if (returnShownRef.current) return;
      const data = buildReturnData(awayMs);
      if (!data) return;
      returnShownRef.current = true;
      setReturnData(data);
      setShowReturn(true);
    }

    function checkPause() {
      if (!stateRef.current) return;
      const t = Date.now();
      const session = sessionRef.current;
      if (session.sessionStartedAt === 0) return;
      const elapsed  = t - session.sessionStartedAt;
      const cooldown = t - session.lastPauseSuggestedAt;
      if (elapsed >= PAUSE_THRESHOLD_MS && cooldown >= PAUSE_COOLDOWN_MS) {
        setShowPause(true);
        const updated = { ...session, lastPauseSuggestedAt: t };
        sessionRef.current = updated;
        void saveSessionData(updated);
      }
    }

    function handleAppStateChange(nextState: AppStateStatus) {
      const t = Date.now();
      if (nextState === "background" || nextState === "inactive") {
        const resources = stateRef.current
          ? (stateRef.current.resources as unknown as Record<string, number>)
          : null;
        const updated: SessionData = { ...sessionRef.current, backgroundAt: t, backgroundResources: resources };
        sessionRef.current = updated;
        void saveSessionData(updated);
        returnShownRef.current = false;
      } else if (nextState === "active") {
        const session = sessionRef.current;
        if (session.backgroundAt !== null) {
          const awayMs = t - session.backgroundAt;
          sessionRef.current = {
            ...session,
            backgroundAt:        null,
            backgroundResources: null,
            ...(awayMs >= RETURN_THRESHOLD_MS ? { sessionStartedAt: t } : {}),
          };
          void saveSessionData(sessionRef.current);
          if (awayMs >= RETURN_THRESHOLD_MS) {
            setTimeout(() => showReturnBriefing(awayMs), 500);
          }
        }
        checkPause();
      }
    }

    void loadSessionData().then((session) => {
      const hadBackground = session.backgroundAt !== null;
      const awayMs        = hadBackground ? now - session.backgroundAt! : 0;

      sessionRef.current = {
        ...session,
        sessionStartedAt:    now,
        backgroundAt:        null,
        backgroundResources: null,
      };
      void saveSessionData(sessionRef.current);

      if (hadBackground && awayMs >= RETURN_THRESHOLD_MS) {
        setTimeout(() => showReturnBriefing(awayMs), 2000);
      }
    });

    const intervalId = setInterval(checkPause, CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { showPause, showReturn, returnData, dismissPause, confirmPause, dismissReturn };
}
