/**
 * promiseQuality.ts — Qualité linguistique des promesses de campagne
 *
 * Chaque domaine de promesse reçoit une caractérisation statique :
 *   clarityLevel      — nature rhétorique (floue / mesurable / risquée)
 *   interpretationRisk — probabilité que la promesse soit mal interprétée (0-100)
 *   publicExpectation  — intensité de l'attente populaire (0-100)
 *
 * Ces données sont STATIQUES : elles ne changent pas selon le joueur.
 * L'engine promiseQualityEngine.ts les utilise pour calculer le bonus/malus au Bilan.
 */

import type { PromiseClarityLevel, PromiseDomain } from "@/types/strategy";

export interface PromiseQualityDef {
  domain:             PromiseDomain;
  clarityLevel:       PromiseClarityLevel;
  /** Risque que le public interprète la promesse différemment de ce qui était voulu. */
  interpretationRisk: number;
  /** Intensité de l'attente publique — amplifie bonus ET malus au bilan. */
  publicExpectation:  number;
}

export const PROMISE_QUALITY: Record<PromiseDomain, PromiseQualityDef> = {
  securite: {
    domain:             "securite",
    clarityLevel:       "mesurable",
    interpretationRisk: 40,
    publicExpectation:  75,
  },
  economie: {
    domain:             "economie",
    clarityLevel:       "risquée",
    interpretationRisk: 70,
    publicExpectation:  80,
  },
  ecologie: {
    domain:             "ecologie",
    clarityLevel:       "floue",
    interpretationRisk: 35,
    publicExpectation:  55,
  },
  souverainete: {
    domain:             "souverainete",
    clarityLevel:       "floue",
    interpretationRisk: 45,
    publicExpectation:  60,
  },
  pouvoir_achat: {
    domain:             "pouvoir_achat",
    clarityLevel:       "floue",
    interpretationRisk: 65,
    publicExpectation:  90,
  },
  innovation: {
    domain:             "innovation",
    clarityLevel:       "floue",
    interpretationRisk: 25,
    publicExpectation:  45,
  },
  diplomatie: {
    domain:             "diplomatie",
    clarityLevel:       "mesurable",
    interpretationRisk: 45,
    publicExpectation:  65,
  },
};

export const CLARITY_BADGE_COLOR: Record<PromiseClarityLevel, string> = {
  floue:     "#a78bfa",
  mesurable: "#4a9fff",
  risquée:   "#e8a93a",
};

export const CLARITY_BADGE_LABEL: Record<PromiseClarityLevel, string> = {
  floue:     "FLOUE",
  mesurable: "MESURABLE",
  risquée:   "RISQUÉE",
};
