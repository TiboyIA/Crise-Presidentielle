import type { BuildingId, StrategyGameState } from "@/types/strategy";

// ── Types publics ─────────────────────────────────────────────────────────────

export type PlayerStyleId =
  | "military"
  | "economic"
  | "cyber"
  | "diplomatic"
  | "research"
  | "crisis_manager"
  | "balanced";

export interface PlayerStyleDef {
  id: PlayerStyleId;
  label: string;   // ex. "Cyberdéfenseur"
  icon: string;    // nom d'icône MaterialCommunityIcons
  color: string;
}

export interface PlayerStyleResult {
  style: PlayerStyleId;
  def: PlayerStyleDef;
  scores: Record<PlayerStyleId, number>; // 0–100 par dimension
  confidence: number;                    // 0–100 — clarté de la classification
}

// ── Définitions de styles ─────────────────────────────────────────────────────

export const PLAYER_STYLES: Record<PlayerStyleId, PlayerStyleDef> = {
  military:       { id: "military",       label: "Stratège Militaire",       icon: "sword-cross",           color: "#e54848" },
  economic:       { id: "economic",       label: "Architecte Économique",    icon: "chart-line",             color: "#3fbe7a" },
  cyber:          { id: "cyber",          label: "Cyberdéfenseur",           icon: "shield-lock-outline",    color: "#4a9fff" },
  diplomatic:     { id: "diplomatic",     label: "Diplomate Chevronné",      icon: "handshake-outline",      color: "#c9a84c" },
  research:       { id: "research",       label: "Visionnaire Technologique", icon: "flask-outline",          color: "#a78bfa" },
  crisis_manager: { id: "crisis_manager", label: "Gestionnaire de Crise",    icon: "alert-decagram-outline", color: "#FF8040" },
  balanced:       { id: "balanced",       label: "Dirigeant Équilibré",      icon: "scale-balance",          color: "#9ca3af" },
};

// ── Seuils ────────────────────────────────────────────────────────────────────

// Données insuffisantes avant ces valeurs → retourner null (pas d'affichage).
const MIN_MANDATE_DAYS = 5;
const MIN_LOG_ENTRIES  = 5;

// Écart minimal entre le 1er et le 2e score pour ne pas classer "balanced".
const BALANCED_GAP_THRESHOLD = 15;
// Score minimum du 1er pour avoir un profil affiché (évite les classements à 0).
const MIN_TOP_SCORE = 25;

// ── Helpers ───────────────────────────────────────────────────────────────────

function bLevel(state: StrategyGameState, id: BuildingId): number {
  return state.buildings.find((b) => b.id === id)?.level ?? 0;
}

// ── Calcul des scores bruts (0–100 par dimension) ────────────────────────────

type CoreStyleId = Exclude<PlayerStyleId, "balanced">;

function computeRawScores(state: StrategyGameState): Record<CoreStyleId, number> {
  const { resources, reforms, news, relations, stats, strategyResearch, playerUnits, mandateDay } = state;
  const research   = strategyResearch ?? { completed: [], inProgress: null };
  const logChoices = news.log.filter((l) => l.choiceId);

  // MILITAIRE ─ investissement défense + unités + réforme sécurité
  const military = Math.min(100, Math.round(
    bLevel(state, "defense_ministry") * 7 +
    bLevel(state, "military_hq")      * 4 +
    Math.min(15, resources.military / 8) +
    Math.min(10, (playerUnits ?? []).reduce((s, u) => s + u.quantity, 0) * 0.3) +
    (reforms.some((r) => r.id === "securite"  && r.applied) ? 10 : 0) +
    Math.min(10, logChoices.filter((l) => l.type === "guerre_hybride").length * 2),
  ));

  // ÉCONOMIQUE ─ ministères économiques + argent + réformes fiscales
  const economic = Math.min(100, Math.round(
    bLevel(state, "economy_ministry") * 7 +
    bLevel(state, "central_bank")     * 4 +
    Math.min(15, resources.money / 25) +
    Math.min(20, reforms.filter((r) => ["fiscal", "industrie"].includes(r.id) && r.applied).length * 10) +
    Math.min(10, logChoices.filter((l) => l.type === "economie").length * 2),
  ));

  // CYBER ─ ministère cyber + ressource + recherches cyber
  const cyber = Math.min(100, Math.round(
    bLevel(state, "cyber_ministry") * 7 +
    Math.min(20, resources.cyberDefense / 5) +
    Math.min(30, research.completed.filter((r) =>
      ["research_cybersec", "research_infowar", "research_satellites"].includes(r),
    ).length * 15) +
    Math.min(15, logChoices.filter((l) => l.type === "cyber").length * 3),
  ));

  // DIPLOMATIQUE ─ diplomatie + influence + alliances + réforme diplomatique
  const diplomatic = Math.min(100, Math.round(
    bLevel(state, "diplomacy_ministry") * 7 +
    Math.min(20, resources.influence / 10) +
    Math.min(20, relations.filter((r) => r.status === "allied" || r.status === "friendly").length * 3) +
    (reforms.some((r) => r.id === "diplomatique" && r.applied) ? 15 : 0) +
    Math.min(10, logChoices.filter((l) => l.type === "diplomatie").length * 2),
  ));

  // RECHERCHE ─ centre de recherche + technologie + arbres complétés
  const research_score = Math.min(100, Math.round(
    bLevel(state, "research_center") * 7 +
    Math.min(20, resources.technology / 5) +
    Math.min(40, research.completed.length * 8) +
    (reforms.some((r) => r.id === "education" && r.applied) ? 10 : 0),
  ));

  // GESTIONNAIRE DE CRISE ─ crises résolues + longévité + taux de succès ops
  const crisis_manager = Math.min(100, Math.round(
    Math.min(60, logChoices.length * 5) +
    Math.min(20, mandateDay) +
    Math.round((stats.operationsWon / Math.max(1, stats.totalOperations)) * 20),
  ));

  return { military, economic, cyber, diplomatic, research: research_score, crisis_manager };
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Calcule le style de jeu dominant du joueur à partir de son état courant.
 * Retourne null si les données sont insuffisantes (trop tôt dans le mandat).
 * Aucune donnée personnelle. Aucun appel réseau. Synchrone.
 */
export function computePlayerStyle(state: StrategyGameState): PlayerStyleResult | null {
  if (state.mandateDay < MIN_MANDATE_DAYS && state.news.log.length < MIN_LOG_ENTRIES) {
    return null;
  }

  const raw     = computeRawScores(state);
  const entries = Object.entries(raw) as [CoreStyleId, number][];
  const sorted  = [...entries].sort((a, b) => b[1] - a[1]);

  const [topId, topScore]   = sorted[0];
  const [,      secondScore] = sorted[1];
  const gap = topScore - secondScore;

  const isBalanced = gap < BALANCED_GAP_THRESHOLD || topScore < MIN_TOP_SCORE;
  const style: PlayerStyleId = isBalanced ? "balanced" : topId;

  // confidence : clarté de classification (haute = profil tranché, basse = équilibré)
  const confidence = isBalanced
    ? Math.max(0, Math.min(100, 100 - gap * 4))
    : Math.min(100, gap * 4);

  const scores: Record<PlayerStyleId, number> = { ...raw, balanced: isBalanced ? confidence : 0 };

  return { style, def: PLAYER_STYLES[style], scores, confidence };
}
