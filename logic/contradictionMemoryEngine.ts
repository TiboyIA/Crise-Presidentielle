import type {
  ContradictionRecord,
  ContradictionTheme,
  HiddenPolitics,
  NationalIndicators,
  PendingDeclaration,
} from "@/types/strategy";

export type { ContradictionRecord, ContradictionTheme, PendingDeclaration } from "@/types/strategy";

const MAX_PENDING = 7;   // rolling window — dernières déclarations par thème
const MAX_HISTORY = 5;   // contradictions les plus graves conservées

// ── Labels ─────────────────────────────────────────────────────────────────────

export const THEME_LABELS: Record<ContradictionTheme, string> = {
  fiscalite:                 "Fiscalité",
  securite:                  "Sécurité",
  ecologie:                  "Écologie",
  transparence:              "Transparence",
  depenses_publiques:        "Dépenses publiques",
  liberte_civile:            "Libertés civiles",
  relations_internationales: "Relations internationales",
};

// ── Détection ─────────────────────────────────────────────────────────────────

/** Retourne la déclaration passée contredite par la nouvelle, ou null si aucune. */
export function detectContradiction(
  incoming: { theme: ContradictionTheme; stance: "pro" | "contre" },
  pendingDeclarations: PendingDeclaration[],
): PendingDeclaration | null {
  const opposing = incoming.stance === "pro" ? "contre" : "pro";
  const candidates = pendingDeclarations.filter(
    (d) => d.theme === incoming.theme && d.stance === opposing,
  );
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

/** Ajoute ou remplace la déclaration sur un thème ; plafonne à MAX_PENDING. */
export function addPendingDeclaration(
  declarations: PendingDeclaration[],
  incoming: PendingDeclaration,
): PendingDeclaration[] {
  const filtered = declarations.filter((d) => d.theme !== incoming.theme);
  const updated = [...filtered, incoming];
  return updated.length > MAX_PENDING ? updated.slice(updated.length - MAX_PENDING) : updated;
}

// ── Risque médiatique ──────────────────────────────────────────────────────────

export function computeContradictionMediaRisk(
  actionsSinceDeclaration: number,
  hiddenPolitics: HiddenPolitics,
): number {
  let risk = 30;
  if (actionsSinceDeclaration < 5)  risk += 25;
  else if (actionsSinceDeclaration < 10) risk += 15;
  else if (actionsSinceDeclaration < 20) risk += 5;
  if (hiddenPolitics.mediaMood < 30) risk += 20;
  else if (hiddenPolitics.mediaMood < 50) risk += 10;
  if (hiddenPolitics.scandalRisk > 60) risk += 15;
  else if (hiddenPolitics.scandalRisk > 40) risk += 7;
  return Math.min(100, risk);
}

// ── Surfacing (résurgence dans le journal) ────────────────────────────────────

/**
 * Retourne la contradiction la plus grave à faire resurgir, ou null.
 * Conditions : mediaRisk > 45, ≥3 actions depuis détection, médias hostiles
 * ou vérification périodique (toutes les 8 actions).
 */
export function shouldSurfaceContradiction(
  history: ContradictionRecord[],
  hiddenPolitics: HiddenPolitics,
  actionCount: number,
): ContradictionRecord | null {
  const candidates = history
    .filter((r) => !r.surfaced && r.mediaRisk > 45 && actionCount - r.currentActionCount >= 3)
    .sort((a, b) => b.mediaRisk - a.mediaRisk);

  if (candidates.length === 0) return null;
  const moodPressure = hiddenPolitics.mediaMood < 40;
  const periodicCheck = actionCount % 8 === 0;
  return moodPressure || periodicCheck ? candidates[0] : null;
}

// ── Effets ─────────────────────────────────────────────────────────────────────

export function computeContradictionEffects(mediaRisk: number): {
  hiddenPoliticsEffects: Partial<HiddenPolitics>;
  indicatorEffects: Partial<NationalIndicators>;
  oppositionPowerDelta: number;
} {
  const sev = mediaRisk >= 75 ? 3 : mediaRisk >= 50 ? 2 : 1;
  return {
    hiddenPoliticsEffects: { scandalRisk: sev * 3, popularFatigue: sev * 2 },
    indicatorEffects: {},
    oppositionPowerDelta: sev * 2,
  };
}

export function computeSurfaceEffects(): {
  hiddenPoliticsEffects: Partial<HiddenPolitics>;
  indicatorEffects: Partial<NationalIndicators>;
} {
  return {
    hiddenPoliticsEffects: { mediaMood: -5, scandalRisk: 5 },
    indicatorEffects: { popularity: -5 },
  };
}

// ── Gestion de l'historique ────────────────────────────────────────────────────

/** Ajoute une contradiction ; conserve les MAX_HISTORY plus graves (par mediaRisk). */
export function addContradictionToHistory(
  history: ContradictionRecord[],
  record: ContradictionRecord,
): ContradictionRecord[] {
  const updated = [...history, record];
  if (updated.length <= MAX_HISTORY) return updated;
  return updated.sort((a, b) => b.mediaRisk - a.mediaRisk).slice(0, MAX_HISTORY);
}

export function markContradictionSurfaced(
  history: ContradictionRecord[],
  id: string,
  actionCount: number,
): ContradictionRecord[] {
  return history.map((r) =>
    r.id === id ? { ...r, surfaced: true, surfacedAtAction: actionCount } : r,
  );
}
