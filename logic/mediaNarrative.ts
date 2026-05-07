/**
 * Module 4 — Moteur déterministe de génération de unes médiatiques.
 *
 * Pipeline :
 *   1. `pickMediaOutlet` — choisit lequel des 4 médias fictifs prend
 *      la parole sur cette décision, via un score d'intérêt
 *      (focus thématique × intensité des effets × scandale × baseline).
 *   2. `composeHeadline` — calcule la TONALITÉ (favorable / critique /
 *      alarmiste / neutre) à partir du bilan des effets pour CE
 *      média, tire un template dans le bon pool, et substitue les
 *      variables `{president}` / `{eventTitle}` / `{gaugeUp}` / etc.
 *   3. `computeMediaImpact` — convertit la tonalité en delta sur
 *      `state.media` et `state.opposition` (modulo l'identité du
 *      média qui parle).
 *
 * Tout est PUR : pas de side-effects, pas d'I/O, pas d'appel IA.
 * La seule source d'aléa est un PRNG seedé sur `(turn, choiceLabel)`
 * — donc les unes sont reproductibles pour un même état + même
 * décision, ce qui rend les tests stables et permet à l'utilisateur
 * de cliquer "régénérer" sans tirer la même phrase deux fois.
 */
import {
  GAUGE_LABELS_FR,
  MEDIA_OUTLETS,
  MEDIA_OUTLET_LIST,
  type MediaOutlet,
  type MediaOutletId,
  type MediaTone,
} from "@/data/medias";
import type {
  AIHeadline,
  Gauges,
  GaugeKey,
  President,
} from "@/types/game";
import type { CrisisEvent, EventChoice } from "@/data/events";

/* ─── PRNG seedé (mulberry32) ─────────────────────────────────────
 * Pseudo-RNG déterministe et léger. On évite `Math.random()` pour
 * que les tests soient reproductibles : même `(turn, choice)` →
 * même tirage. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ─── Bilan des effets d'une décision sur les jauges ──────────── */

interface EffectsSummary {
  /** Somme algébrique des deltas de jauges. */
  totalDelta: number;
  /** Somme des |deltas|. Mesure l'intensité globale. */
  absIntensity: number;
  /** Plus gros mouvement positif et la jauge concernée. */
  bestUp: { gauge: GaugeKey; delta: number } | null;
  /** Plus gros mouvement négatif et la jauge concernée. */
  worstDown: { gauge: GaugeKey; delta: number } | null;
  /** Plus gros mouvement absolu, signé (sert pour `{biggestDelta}`). */
  biggestAbs: number;
  /** Vrai si un scandale a été révélé par cette décision. */
  scandalRevealed: boolean;
}

function summarizeEffects(
  effects: Partial<Gauges>,
  mediaDelta: number,
  oppositionDelta: number,
  scandalRevealed: boolean,
): EffectsSummary {
  let totalDelta = 0;
  let absIntensity = 0;
  let bestUp: EffectsSummary["bestUp"] = null;
  let worstDown: EffectsSummary["worstDown"] = null;
  let biggestAbs = 0;

  for (const [k, v] of Object.entries(effects)) {
    if (typeof v !== "number" || v === 0) continue;
    const delta = v;
    totalDelta += delta;
    absIntensity += Math.abs(delta);
    if (delta > 0 && (!bestUp || delta > bestUp.delta)) {
      bestUp = { gauge: k as GaugeKey, delta };
    }
    if (delta < 0 && (!worstDown || delta < worstDown.delta)) {
      worstDown = { gauge: k as GaugeKey, delta };
    }
    if (Math.abs(delta) > Math.abs(biggestAbs)) biggestAbs = delta;
  }
  // mediaDelta / oppositionDelta participent à l'intensité ressentie
  // mais ne sont pas matérialisés comme "jauges" dans les templates.
  absIntensity += Math.abs(mediaDelta) + Math.abs(oppositionDelta);

  return {
    totalDelta,
    absIntensity,
    bestUp,
    worstDown,
    biggestAbs,
    scandalRevealed,
  };
}

/* ─── 1. Sélection du média qui parle ────────────────────────────── */

interface PickInput {
  event: CrisisEvent | null;
  /** Choix joué — son label participe au seed du tirage. */
  choice: EventChoice;
  effects: Partial<Gauges>;
  mediaDelta: number;
  oppositionDelta: number;
  scandalRevealed: boolean;
  turn: number;
  /**
   * Seed additionnel — incrémenté par l'appelant sur "régénérer"
   * pour obtenir un nouveau tirage sans changer l'état.
   */
  variantSeed?: number;
}

/**
 * Score d'intérêt d'un média pour cette décision : plus le média est
 * sensible aux jauges qui bougent, plus il a de chances de parler.
 * Le baseline garantit que tous les médias ont une voix résiduelle.
 * Le tirage final pondère par ces scores + un peu d'aléa.
 */
function scoreMediaInterest(
  media: MediaOutlet,
  summary: EffectsSummary,
  effects: Partial<Gauges>,
  event: CrisisEvent | null,
): number {
  let score = media.baselineWeight;

  // Bonus thématique : si la décision touche une de ses jauges focus,
  // le média se met sur le pont. La 1re jauge focus pèse plus.
  for (let i = 0; i < media.focusGauges.length; i++) {
    const g = media.focusGauges[i]!;
    const v = effects[g];
    if (typeof v === "number" && v !== 0) {
      const focusWeight = i === 0 ? 3 : 2;
      score += Math.abs(v) * focusWeight * 0.5;
    }
  }

  // Bonus de catégorie (event en lien direct avec la mission éditoriale).
  if (event && media.focusCategories.includes(event.category)) {
    score += 4;
  }

  // Affinité scandale (Réseau Libre adore, Canal République déteste).
  if (summary.scandalRevealed) {
    score += media.scandalAffinity * 3;
  }

  // Plancher pour éviter les scores négatifs (Canal République sur
  // un scandale resterait négatif sinon).
  return Math.max(0.5, score);
}

export function pickMediaOutlet(input: PickInput): MediaOutletId {
  const summary = summarizeEffects(
    input.effects,
    input.mediaDelta,
    input.oppositionDelta,
    input.scandalRevealed,
  );

  const scores: Array<{ id: MediaOutletId; score: number }> = MEDIA_OUTLET_LIST
    .map((m) => ({
      id: m.id,
      score: scoreMediaInterest(m, summary, input.effects, input.event),
    }));

  const total = scores.reduce((s, x) => s + x.score, 0);
  // Seed sur (event, turn, choice, variantSeed) : on veut deux choix
  // différents sur le même évènement à donner des unes différentes,
  // donc `choice.label` doit participer au tirage.
  const seed =
    hashString(input.event?.id ?? "no-event") ^
    hashString(input.choice.label) ^
    (input.turn * 2654435761) ^
    (input.variantSeed ?? 0);
  const rng = makeRng(seed);
  const pick = rng() * total;

  let cumul = 0;
  for (const s of scores) {
    cumul += s.score;
    if (pick <= cumul) return s.id;
  }
  return scores[scores.length - 1]!.id;
}

/* ─── 2. Composition de la une ───────────────────────────────────── */

/**
 * Bilan des effets pour CE média : positif si les jauges qui le
 * concernent montent, négatif sinon. Détermine la tonalité du une.
 */
function focusedBalance(
  media: MediaOutlet,
  effects: Partial<Gauges>,
): number {
  let balance = 0;
  for (let i = 0; i < media.focusGauges.length; i++) {
    const g = media.focusGauges[i]!;
    const v = effects[g];
    if (typeof v === "number") {
      const w = i === 0 ? 1.5 : 1;
      balance += v * w;
    }
  }
  return balance;
}

function pickTone(
  media: MediaOutlet,
  summary: EffectsSummary,
  effects: Partial<Gauges>,
): MediaTone {
  // Réseau Libre → un scandale révélé = tonalité alarmiste, point.
  if (summary.scandalRevealed && media.scandalAffinity > 0) {
    return "alarmiste";
  }
  // Bilan focal réel : somme pondérée des effets sur les jauges
  // qui intéressent ce média. C'est ce qui décide vraiment de la
  // tonalité (Marchés & Pouvoir n'a aucune raison de s'enflammer
  // pour une chute de cohésion sociale, p.ex.).
  const focusedDelta = focusedBalance(media, effects);

  // Pire / meilleur mouvement DANS les jauges focus uniquement.
  let focusedDown = 0;
  let focusedUp = 0;
  for (const g of media.focusGauges) {
    const v = effects[g];
    if (typeof v !== "number") continue;
    if (v < focusedDown) focusedDown = v;
    if (v > focusedUp) focusedUp = v;
  }

  // Cas extrêmes : un point critique sur une jauge cœur déclenche
  // l'alarme même si le bilan global est tiède.
  if (focusedDown <= -6 || focusedDelta <= -8) return "alarmiste";
  if (focusedDown <= -3 || focusedDelta <= -3) return "critique";
  if (focusedUp >= 5 || focusedDelta >= 5) return "favorable";
  if (focusedUp >= 2 || focusedDelta >= 2) return "favorable";

  // Aucun effet sur les jauges focus → retombée sur le solde global,
  // mais en mode tiède (le média parle parce qu'il faut bien parler).
  if (summary.absIntensity < 2) return "neutre";
  if (summary.totalDelta <= -4) return "critique";
  if (summary.totalDelta >= 4) return "favorable";
  return "neutre";
}

interface ComposeInput extends PickInput {
  president: President | null;
  choice: EventChoice;
}

interface ComposedHeadline {
  headline: AIHeadline;
  tone: MediaTone;
  /** Effet à appliquer sur la jauge `media`. */
  mediaImpact: number;
  /** Effet à appliquer sur la jauge `opposition`. */
  oppositionImpact: number;
}

function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

/**
 * Snippet court (1 phrase) qui complète la headline. Plutôt que de
 * doubler le pool de templates, on dérive un snippet contextuel à
 * partir du bilan factuel (jauges qui ont bougé). Donne un ton
 * "données" qui contraste bien avec la headline rhétorique.
 */
function buildSnippet(summary: EffectsSummary, tone: MediaTone): string {
  const parts: string[] = [];
  if (summary.bestUp) {
    parts.push(
      `${GAUGE_LABELS_FR[summary.bestUp.gauge]} +${summary.bestUp.delta}`,
    );
  }
  if (summary.worstDown) {
    parts.push(
      `${GAUGE_LABELS_FR[summary.worstDown.gauge]} ${summary.worstDown.delta}`,
    );
  }
  if (parts.length === 0) {
    return tone === "neutre"
      ? "Aucun mouvement notable des indicateurs."
      : "Les indicateurs suivis bougent peu — pour l'instant.";
  }
  return `Bilan immédiat : ${parts.join(", ")}.`;
}

export function composeHeadline(input: ComposeInput): ComposedHeadline {
  const summary = summarizeEffects(
    input.effects,
    input.mediaDelta,
    input.oppositionDelta,
    input.scandalRevealed,
  );
  const mediaId = pickMediaOutlet(input);
  const media = MEDIA_OUTLETS[mediaId];
  const tone = pickTone(media, summary, input.effects);

  // Seed du tirage de template : inclut event.id ET choice.label
  // pour que deux décisions différentes du même tour produisent des
  // unes textuellement différentes même si le même média parle.
  const seed =
    hashString(input.event?.id ?? "no-event") ^
    hashString(input.choice.label) ^
    hashString(media.id) ^
    (input.turn * 1597334677) ^
    ((input.variantSeed ?? 0) * 374761393);
  const rng = makeRng(seed);
  const pool = media.templates[tone];
  const template = pool[Math.floor(rng() * pool.length)] ?? pool[0]!;

  const vars: Record<string, string> = {
    president: input.president?.name ?? "L'Élysée",
    eventTitle: input.event?.title ?? input.choice.label,
    gaugeUp: summary.bestUp
      ? GAUGE_LABELS_FR[summary.bestUp.gauge]
      : "les indicateurs",
    gaugeDown: summary.worstDown
      ? GAUGE_LABELS_FR[summary.worstDown.gauge]
      : "les indicateurs",
    biggestDelta:
      summary.biggestAbs >= 0
        ? `+${summary.biggestAbs}`
        : `${summary.biggestAbs}`,
  };

  const headlineText = fillTemplate(template, vars);
  const snippet = buildSnippet(summary, tone);

  const { mediaImpact, oppositionImpact } = computeMediaImpact(media, tone);

  return {
    headline: {
      outlet: media.name,
      headline: headlineText,
      snippet,
      tone,
      mediaId: media.id,
    },
    tone,
    mediaImpact,
    oppositionImpact,
  };
}

/* ─── 3. Effet d'une une sur les jauges media / opposition ───────── */

/**
 * Une une favorable de Canal République pèse plus lourd qu'un même
 * favorable de Réseau Libre (Canal République est "respectable").
 * Inversement, une attaque de Réseau Libre fait plus mal sur
 * `opposition` (viralité). Tout reste borné : ±5 max par décision.
 */
export function computeMediaImpact(
  media: MediaOutlet,
  tone: MediaTone,
): { mediaImpact: number; oppositionImpact: number } {
  // Multiplicateurs par média (somme cohérente, jamais > ±5).
  const mediaCoef: Record<MediaOutletId, number> = {
    clairon: 1.0,
    marches: 0.8,
    republique: 1.2,
    reseau: 1.4,
  };
  const opCoef: Record<MediaOutletId, number> = {
    clairon: 1.2,
    marches: 0.6,
    republique: 0.8,
    reseau: 1.5,
  };

  let mBase = 0;
  let oBase = 0;
  switch (tone) {
    case "favorable":
      mBase = 2;
      oBase = -1;
      break;
    case "critique":
      mBase = -2;
      oBase = 1;
      break;
    case "alarmiste":
      mBase = -3;
      oBase = 3;
      break;
    case "neutre":
      mBase = 0;
      oBase = 0;
      break;
  }

  const mediaImpact = Math.round(mBase * mediaCoef[media.id]);
  const oppositionImpact = Math.round(oBase * opCoef[media.id]);

  return {
    mediaImpact: clamp(mediaImpact, -5, 5),
    oppositionImpact: clamp(oppositionImpact, -5, 5),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
