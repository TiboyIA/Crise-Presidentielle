import type { EventCategory, EventChoice } from "@/data/events";
import {
  Minister,
  MinisterPosition,
  MinisterSpecialty,
  SPECIALTY_LABELS,
} from "@/data/ministers";
import type { GaugeKey, Gauges } from "@/types/game";
import { clamp } from "@/logic/utils";

/**
 * Module 3 — Ministres vivants.
 *
 * Ce module factorise tout ce qui rend les ministres autonomes :
 *  - dérive de popularité personnelle au fil des tours ;
 *  - dérive du risque caché de scandale ;
 *  - éclatement spontané d'un scandale (en fonction du risque) ;
 *  - émergence d'un frondeur (ambition + popularité + déloyauté) ;
 *  - bonus / malus contextuel selon la spécialité du ministre.
 *
 * Toutes les fonctions sont PURES : elles ne mutent rien et renvoient
 * de nouveaux objets. La consommation se fait dans `GameContext`
 * (boucle `resolveChoice`).
 */

// ─── Mappings ────────────────────────────────────────────────────────

/**
 * Quelles jauges nationales sont du ressort d'une spécialité ?
 * Sert à amplifier (en bien) un effet de choix qui touche le domaine
 * d'expertise d'un·e ministre compétent·e.
 */
const SPECIALTY_GAUGES: Record<MinisterSpecialty, GaugeKey[]> = {
  economy: ["economy", "budget"],
  social: ["cohesion", "health", "popularity"],
  security: ["security", "authority"],
  diplomacy: ["diplomacy"],
  ecology: ["ecology"],
  communication: ["popularity"],
};

/**
 * Quelle catégorie d'évènement appelle quelle spécialité ?
 * Utilisée pour le BONUS contextuel : un évènement "economy" résolu
 * quand un spécialiste "economy" est en poste tire profit de son
 * expertise.
 */
const CATEGORY_TO_SPECIALTY: Partial<Record<EventCategory, MinisterSpecialty>> = {
  economy: "economy",
  agriculture: "economy",
  energy: "economy",
  ecology: "ecology",
  security: "security",
  hybrid_warfare: "security",
  cyber: "security",
  diplomacy: "diplomacy",
  social: "social",
  health: "social",
  media: "communication",
  scandal: "communication",
  opposition: "communication",
};

/**
 * Quelle jauge "porte" un portefeuille ministériel ?
 * Sert à la dérive de popularité personnelle : un ministre dont le
 * portefeuille va bien gagne en popularité, et inversement.
 */
const PORTFOLIO_GAUGE: Record<MinisterPosition, (g: Gauges) => number> = {
  pm: (g) => g.cohesion,
  interior: (g) => g.security,
  economy: (g) => (g.budget + (100 - g.debt)) / 2,
  foreign: (g) => g.diplomacy,
  ecology: (g) => g.ecology,
  defense: (g) => g.security,
};

// ─── Bonus contextuel par spécialité ─────────────────────────────────

export interface SpecialtyBonusResult {
  gauges: Gauges;
  /** Notice à afficher dans le journal si un ministre a "amplifié" la décision. */
  notice: string | null;
}

/**
 * Si la catégorie de l'évènement matche la spécialité d'un·e ministre
 * en poste ET que cette personne est compétente (>= 60), alors la
 * décision est amplifiée : pour CHAQUE jauge positivement affectée
 * dans le domaine d'expertise, on ajoute +1 (max +2 cumulé).
 *
 * Inversement, si AUCUN spécialiste de la catégorie n'est en poste
 * et que la décision touche une jauge clé du domaine, on retire 1
 * (la mise en œuvre se fait à l'aveugle, ce qui se paie un peu).
 *
 * On ne reprend qu'UN ministre par évènement (le plus compétent dans
 * la spécialité visée) pour éviter les empilements.
 */
export function applySpecialtyBonus(
  gauges: Gauges,
  choice: EventChoice,
  ministers: Minister[],
  category: EventCategory,
): SpecialtyBonusResult {
  const targetSpecialty = CATEGORY_TO_SPECIALTY[category];
  if (!targetSpecialty) {
    return { gauges, notice: null };
  }
  const next: Gauges = { ...gauges };

  // Cherche le spécialiste le plus compétent (et non scandaleux) sur
  // le domaine. Les ministres rongés par les scandales ne savent plus
  // mobiliser leur compétence.
  const specialists = ministers
    .filter((m) => m.specialty === targetSpecialty)
    .sort((a, b) => b.competence - a.competence);

  const expert = specialists.find(
    (m) => m.competence >= 60 && m.scandals === 0,
  );

  if (expert) {
    const targetGauges = SPECIALTY_GAUGES[targetSpecialty];
    let bonusApplied = 0;
    for (const gk of targetGauges) {
      if (bonusApplied >= 2) break;
      const eff = choice.effects[gk];
      if (typeof eff !== "number" || eff <= 0) continue;
      next[gk] = clamp(next[gk] + 1);
      bonusApplied += 1;
    }
    if (bonusApplied > 0) {
      return {
        gauges: next,
        notice: `${expert.name} (${SPECIALTY_LABELS[targetSpecialty]}) amplifie l'effet du dossier (+${bonusApplied}).`,
      };
    }
    return { gauges: next, notice: null };
  }

  // Pas d'expert disponible : pénalité légère sur l'AXE PRINCIPAL du
  // domaine (la première jauge listée), uniquement si l'effet existe
  // et n'est pas déjà nul/négatif (sinon double peine).
  const targets = SPECIALTY_GAUGES[targetSpecialty];
  const mainGauge = targets[0];
  if (mainGauge !== undefined) {
    const eff = choice.effects[mainGauge];
    if (typeof eff === "number" && eff > 0) {
      next[mainGauge] = clamp(next[mainGauge] - 1);
      return {
        gauges: next,
        notice: `Aucun spécialiste ${SPECIALTY_LABELS[targetSpecialty]} en poste : la mise en œuvre patine (-1).`,
      };
    }
  }
  return { gauges: next, notice: null };
}

// ─── Tick de fin de tour ─────────────────────────────────────────────

export type MinisterEventKind = "scandal_eruption" | "rival_emergence";

export interface MinisterTickEvent {
  kind: MinisterEventKind;
  position: MinisterPosition;
  ministerName: string;
  /** Petit texte FR à logger dans le journal et le ticker. */
  label: string;
  /** Effet à appliquer par l'appelant aux jauges nationales. */
  popularityHit: number;
  authorityHit: number;
  cohesionHit: number;
  /** Effet à appliquer par l'appelant à `state.media`. */
  mediaHit: number;
  /** Effet à appliquer par l'appelant à `state.opposition`. */
  oppositionHit: number;
  /** Effet à appliquer par l'appelant à `state.scandalsRevealed` (delta). */
  scandalsRevealedDelta: number;
}

export interface MinisterTickResult {
  ministers: Minister[];
  events: MinisterTickEvent[];
}

/**
 * Pseudo-random utilisé en test : par défaut `Math.random()`.
 * Permet d'injecter un RNG déterministe en test plus tard sans
 * impacter la logique de production.
 */
type Rng = () => number;

/**
 * Tour de moulinette ministres-vivants. À appeler APRÈS la dérive
 * existante (`applyEndOfTurnDrift`) pour partir des stats stabilisées.
 *
 * Garanties :
 *  - Pure : aucun side-effect, aucun appel à `Math.random` injecté.
 *  - Idempotente sur `isRival` : un·e ministre déjà frondeur·euse ne
 *    redéclenche pas un évènement "rival_emergence".
 *  - Cooldown : aucune éruption de scandale et aucune fronde durant
 *    les `silenceTurns` premiers tours (pour ne pas matraquer le
 *    joueur dès le départ — défaut : 3 tours).
 *  - Une seule éruption par tour MAXIMUM, pour limiter le rythme et
 *    laisser le joueur respirer.
 */
export function tickMinisterDynamics(
  ministers: Minister[],
  gauges: Gauges,
  turn: number,
  options: { silenceTurns?: number; rng?: Rng } = {},
): MinisterTickResult {
  const silenceTurns = options.silenceTurns ?? 3;
  const rng: Rng = options.rng ?? Math.random;

  const events: MinisterTickEvent[] = [];

  // 1. Dérive de popularité personnelle (basée sur l'état du portefeuille).
  let nextMinisters = ministers.map((m) => {
    const portfolioHealth = PORTFOLIO_GAUGE[m.position](gauges);
    let popDelta = 0;
    if (portfolioHealth >= 70) popDelta += 1;
    else if (portfolioHealth <= 30) popDelta -= 1;
    if (m.scandals > 0) popDelta -= 1;
    if (m.isRival) popDelta -= 1; // rival : malaise public
    return { ...m, popularity: clamp(m.popularity + popDelta) };
  });

  // 2. Dérive du risque caché de scandale.
  //    + ambition haute & loyauté basse → +1 par tour
  //    + popularité très élevée (cible des médias) → +1 par tour si déjà > 50
  //    - chaque tour SANS scandale, petite décrue (-1) pour les loyaux
  nextMinisters = nextMinisters.map((m) => {
    let riskDelta = 0;
    if (m.ambition >= 60 && m.loyalty <= 50) riskDelta += 1;
    if (m.popularity >= 75 && m.scandalRisk > 50) riskDelta += 1;
    if (m.loyalty >= 70 && m.scandals === 0) riskDelta -= 1;
    return { ...m, scandalRisk: clamp(m.scandalRisk + riskDelta) };
  });

  // 3. Émergence d'un frondeur. Conditions :
  //    - pas en poste depuis hier (silenceTurns)
  //    - pas déjà rival
  //    - ambition >= 65, popularité >= 60, loyauté <= 40
  //    Premier candidat éligible seulement (un par tour max).
  if (turn > silenceTurns) {
    const rivalIdx = nextMinisters.findIndex(
      (m) => !m.isRival && m.ambition >= 65 && m.popularity >= 60 && m.loyalty <= 40,
    );
    if (rivalIdx !== -1) {
      const m = nextMinisters[rivalIdx]!;
      nextMinisters = nextMinisters.map((x, i) =>
        i === rivalIdx ? { ...x, isRival: true } : x,
      );
      events.push({
        kind: "rival_emergence",
        position: m.position,
        ministerName: m.name,
        label: `${m.name} (${m.positionLabel}) prend ses distances avec le Président.`,
        popularityHit: 0,
        authorityHit: -3,
        cohesionHit: -3,
        mediaHit: 0,
        oppositionHit: 6,
        scandalsRevealedDelta: 0,
      });
    }
  }

  // 4. Éruption spontanée de scandale. Conditions :
  //    - pas en poste depuis hier (silenceTurns)
  //    - aucune éruption ce tour-ci (max 1)
  //    - on classe les ministres par scandalRisk décroissant
  //    - probabilité = scandalRisk / 1500 (risque 60 → 4 %, 90 → 6 %)
  if (turn > silenceTurns && events.every((e) => e.kind !== "scandal_eruption")) {
    const sorted = nextMinisters
      .map((m, i) => ({ m, i }))
      .sort((a, b) => b.m.scandalRisk - a.m.scandalRisk);
    for (const { m, i } of sorted) {
      if (m.scandalRisk < 40) break;
      const prob = m.scandalRisk / 1500;
      if (rng() < prob) {
        nextMinisters = nextMinisters.map((x, j) =>
          j === i
            ? {
                ...x,
                scandals: x.scandals + 1,
                scandalRisk: clamp(x.scandalRisk - 25),
                popularity: clamp(x.popularity - 8),
              }
            : x,
        );
        events.push({
          kind: "scandal_eruption",
          position: m.position,
          ministerName: m.name,
          label: `Affaire ${m.name} : la presse déterre un dossier compromettant.`,
          popularityHit: -4,
          authorityHit: -2,
          cohesionHit: 0,
          mediaHit: -5,
          oppositionHit: 4,
          scandalsRevealedDelta: 1,
        });
        break;
      }
    }
  }

  return { ministers: nextMinisters, events };
}

/**
 * Pour le débat final : combien de frondeurs sont en poste ?
 * Chaque frondeur ajoute une attaque potentielle dans la rhétorique
 * d'opposition (consommé côté `lib/oppositionAnalysis.ts` plus tard).
 */
export function countRivals(ministers: Minister[]): number {
  return ministers.filter((m) => m.isRival).length;
}
