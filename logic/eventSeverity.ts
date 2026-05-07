/**
 * ─── LOT 15 + LOT 16 — Sévérité d'événement & rythme du jeu ─────────
 *
 * QUATRE niveaux de présence narrative pour les événements :
 *
 *   - "rare"         : crise présidentielle EXCEPTIONNELLE (scandale,
 *                      guerre hybride, crise diplomatique). Ouvre
 *                      l'EventModal plein écran, pause auto. Cooldown
 *                      très long (8-12 mois) pour rester un événement
 *                      mémorable et non routinier.
 *   - "major"        : décision présidentielle FORTE mais ordinaire.
 *                      Même UI plein écran, pause auto, mais cooldown
 *                      plus court (4-8 mois).
 *   - "minor"        : actualité tactique. Affiche une petite carte
 *                      sur le dashboard (MinorEventCard), n'arrête
 *                      jamais le temps. Le joueur peut traiter ou
 *                      ignorer (auto-dismiss après quelques secondes).
 *   - "notification" : info pure. Atterrit dans l'AlertTicker, jamais
 *                      d'UI dédiée, jamais de pause.
 *
 * Le champ `severity` est OPTIONNEL sur `CrisisEvent` ; quand il est
 * absent, on l'INFÈRE à partir de l'amplitude des effets, des
 * conséquences cachées, des cascades, et de la catégorie. Cette
 * heuristique est conservatrice : elle préfère sur-classer plutôt
 * que sous-classer pour ne pas casser des scénarios importants
 * conçus avant LOT 15.
 *
 * 100 % pur, déterministe, sans accès au state.
 */
import type { CrisisEvent, EventChoice } from "@/data/events";

export type EventSeverity = "rare" | "major" | "minor" | "notification";

/** LOT 16 — Catégories à très haut enjeu reclassées en RARE
 *  (scandale d'État, guerre hybride, crise diplomatique). Ces
 *  événements gardent leur UI majeure mais subissent un cooldown
 *  de 8-12 mois pour rester l'exception. */
const ALWAYS_RARE_CATEGORIES = new Set([
  "scandal",
  "hybrid_warfare",
  "diplomacy",
]);

/** Préfixes d'event id qui forcent "rare" (cas scriptés à fort
 *  retentissement : guerre conventionnelle, ultimatum). */
const ALWAYS_RARE_ID_PREFIXES = ["ev_war_", "ev_ultimatum"];

/**
 * Pondération brute d'un seul choix : somme des |delta| visibles +
 * pénalités pour les effets cachés et les cascades. Une cascade de
 * 3 conséquences pèse plus qu'un simple ±10 sur popularité.
 */
function scoreChoice(choice: EventChoice): number {
  let score = 0;
  for (const v of Object.values(choice.effects ?? {})) {
    if (typeof v === "number") score += Math.abs(v);
  }
  for (const v of Object.values(choice.hiddenEffects ?? {})) {
    if (typeof v === "number") score += Math.abs(v) * 1.5;
  }
  if (choice.mediaEffect) score += Math.abs(choice.mediaEffect);
  if (choice.oppositionEffect) score += Math.abs(choice.oppositionEffect);
  if (choice.ministerEffects?.length) score += choice.ministerEffects.length * 4;
  if (choice.regionEffects?.length) score += choice.regionEffects.length * 3;
  if (choice.cascade?.length) score += choice.cascade.length * 8;
  if (choice.schedulesEvent) score += 6;
  if (choice.hidesScandal) score += 10;
  if (choice.fulfillsPromise?.length) score += 4;
  if (choice.breaksPromise?.length) score += 5;
  return score;
}

/**
 * Heuristique principale. Renvoie la sévérité explicite du payload,
 * sinon infère depuis le score maximal des choix.
 *
 * Seuils (calibrés pour préserver le gameplay actuel) :
 *   - score ≥ 22 OU catégorie/id critique           → "major"
 *   - 10 ≤ score < 22 ET pas de cascade/hidden lourd → "minor"
 *   - score < 10 ET event sans choix conséquent     → "notification"
 *
 * Garde-fou : si TOUS les choix ont 0 effet (event purement narratif),
 * c'est explicitement une "notification".
 */
export function inferEventSeverity(event: CrisisEvent): EventSeverity {
  // Annotation explicite gagne toujours.
  // Cast pour rester rétrocompatible avec les vieux events sans champ.
  const declared = (event as CrisisEvent & { severity?: EventSeverity })
    .severity;
  if (
    declared === "rare" ||
    declared === "major" ||
    declared === "minor" ||
    declared === "notification"
  ) {
    return declared;
  }

  // Forces narratives — LOT 16 : on classe en RARE les catégories à
  // très haut enjeu (scandale, guerre hybride, diplomatie) au lieu
  // de simple major, pour leur appliquer le cooldown long. ORDRE
  // VOLONTAIRE : la classification "rare" gagne sur "delayed" parce
  // qu'une déclaration de guerre ou un ultimatum reste une crise
  // exceptionnelle même quand elle est servie comme conséquence
  // retardée d'une décision passée — son cooldown 8-12 mois s'applique.
  if (ALWAYS_RARE_CATEGORIES.has(event.category)) return "rare";
  for (const prefix of ALWAYS_RARE_ID_PREFIXES) {
    if (event.id.startsWith(prefix)) return "rare";
  }
  // Les autres conséquences retardées (delayed sans catégorie/prefix
  // rare) sont par défaut majeures : elles sont la sortie d'un piège
  // que le joueur s'est lui-même tendu, donc méritent l'attention
  // pleine — mais avec le cooldown major plus court (4-8 mois).
  if (event.isDelayedConsequence) return "major";

  // Calcul du score maximal sur l'ensemble des choix.
  if (!event.choices || event.choices.length === 0) return "notification";
  let maxScore = 0;
  let totalScore = 0;
  for (const c of event.choices) {
    const s = scoreChoice(c);
    totalScore += s;
    if (s > maxScore) maxScore = s;
  }

  if (maxScore === 0 && totalScore === 0) return "notification";
  if (maxScore >= 22) return "major";
  if (maxScore >= 10) return "minor";
  return "notification";
}
