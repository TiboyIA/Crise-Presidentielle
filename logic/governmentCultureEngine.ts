import { clamp } from "@/logic/utils";
import type { GovernmentCultureId, StrategyGameState } from "@/types/strategy";

// ── Définitions ───────────────────────────────────────────────────────────────

export interface GovernmentCultureDef {
  id: GovernmentCultureId;
  name: string;
  icon: string;            // MaterialCommunityIcons
  color: string;
  tagline: string;         // 1 phrase
  benefits: [string, string];
  drawbacks: [string, string];
}

export const GOVERNMENT_CULTURES: Record<GovernmentCultureId, GovernmentCultureDef> = {
  discipline: {
    id: "discipline",
    name: "Discipline",
    icon: "shield-check-outline",
    color: "#4a9fff",
    tagline: "Priorité à l'ordre et à la réactivité opérationnelle.",
    benefits: ["Stabilité institutionnelle +2 / 10j", "Conflits internes moins intenses"],
    drawbacks: ["Fatigue ministérielle +4 / 10j", "Prise d'initiative bridée"],
  },
  innovation: {
    id: "innovation",
    name: "Innovation",
    icon: "lightbulb-outline",
    color: "#a78bfa",
    tagline: "Expérimentation permanente, risque assumé.",
    benefits: ["Technologie +6 / 10j", "Écologie +1 / 10j"],
    drawbacks: ["Risque de scandale +1 / 10j", "Instabilité légère"],
  },
  transparence: {
    id: "transparence",
    name: "Transparence",
    icon: "eye-outline",
    color: "#3fbe7a",
    tagline: "Communication ouverte, responsabilité assumée.",
    benefits: ["Risque de scandale −2 / 10j", "Humeur médias +1 / 10j"],
    drawbacks: ["Lassitude populaire +1 / 10j", "Marges de manœuvre réduites"],
  },
  loyaute: {
    id: "loyaute",
    name: "Loyauté",
    icon: "handshake-outline",
    color: "#c9a84c",
    tagline: "Cohésion interne comme priorité absolue.",
    benefits: ["Confiance élites +1 / 10j", "Risque de scandale −1 / 10j"],
    drawbacks: ["Humeur médias −1 / 10j", "Risque de pensée unique"],
  },
  technocratie: {
    id: "technocratie",
    name: "Technocratie",
    icon: "calculator-outline",
    color: "#22d3ee",
    tagline: "Expertise technique au-dessus du consensus politique.",
    benefits: ["Économie +1, Technologie +8 / 10j", "Décisions mieux fondées"],
    drawbacks: ["Popularité −1 / 10j", "Cohésion plus fragile"],
  },
  urgence_permanente: {
    id: "urgence_permanente",
    name: "Urgence permanente",
    icon: "alarm-light-outline",
    color: "#e54848",
    tagline: "La crise comme mode de fonctionnement normal.",
    benefits: ["Sécurité +1 / 10j", "Mobilisation immédiate"],
    drawbacks: ["Fatigue ministérielle +8 / 10j", "Lassitude populaire +2 / 10j"],
  },
};

export const CULTURE_LIST: GovernmentCultureDef[] = Object.values(GOVERNMENT_CULTURES);

// ── Tick 10 jours ─────────────────────────────────────────────────────────────
//
// Effets cumulatifs, intentionnellement légers : aucune culture n'est
// dominante, chaque bonus s'accompagne d'un coût visible.
// Les deltas sont intentionnellement faibles (±1-2 par 10 jours) pour
// rester sous les variations naturelles des autres systèmes.

export function applyGovernmentCulture(state: StrategyGameState): StrategyGameState {
  const culture = state.governmentCulture;
  if (!culture) return state;

  let hp  = { ...state.hiddenPolitics };
  let ind = { ...state.nationalIndicators };
  let resources = { ...state.resources };
  let ministerFatigue: Record<string, number> = { ...(state.ministerFatigue ?? {}) };

  // Initialiser la fatigue pour les ministres sans entrée existante
  for (const m of state.strategyMinisters) {
    if (ministerFatigue[m.id] === undefined) ministerFatigue[m.id] = 0;
  }

  switch (culture) {
    case "discipline":
      hp.institutionalStability = clamp(hp.institutionalStability + 2);
      for (const id in ministerFatigue) {
        ministerFatigue[id] = Math.min(100, ministerFatigue[id]! + 4);
      }
      break;

    case "innovation":
      resources = { ...resources, technology: Math.min(500, resources.technology + 6) };
      ind.ecology   = clamp(ind.ecology + 1);
      hp.scandalRisk = clamp(hp.scandalRisk + 1);
      break;

    case "transparence":
      hp.scandalRisk    = clamp(hp.scandalRisk - 2);
      hp.mediaMood      = clamp(hp.mediaMood + 1);
      hp.popularFatigue = clamp(hp.popularFatigue + 1);
      break;

    case "loyaute":
      hp.eliteTrust  = clamp(hp.eliteTrust + 1);
      hp.scandalRisk = clamp(hp.scandalRisk - 1);
      hp.mediaMood   = clamp(hp.mediaMood - 1);
      break;

    case "technocratie":
      ind.economy    = clamp(ind.economy + 1);
      ind.popularity = clamp(ind.popularity - 1);
      resources = { ...resources, technology: Math.min(500, resources.technology + 8) };
      break;

    case "urgence_permanente":
      ind.security       = clamp(ind.security + 1);
      hp.popularFatigue  = clamp(hp.popularFatigue + 2);
      for (const id in ministerFatigue) {
        ministerFatigue[id] = Math.min(100, ministerFatigue[id]! + 8);
      }
      break;
  }

  return { ...state, hiddenPolitics: hp, nationalIndicators: ind, resources, ministerFatigue };
}
