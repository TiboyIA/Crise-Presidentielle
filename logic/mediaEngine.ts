import { Minister, MinisterPosition } from "@/data/ministers";
import { Region } from "@/data/regions";
import { Gauges, HiddenGauges, HiddenScandal } from "@/types/game";
import { clamp } from "@/logic/utils";

/**
 * Chantier 1 — drift compétence ministres.
 *
 * Each minister's competence drifts ±1 per turn based on the gauge of
 * the portfolio they own: a healthy portfolio boosts their reputation,
 * a degraded one erodes it. Pure mapping, no randomness.
 */
const PORTFOLIO_GAUGE: Record<MinisterPosition, (g: Gauges) => number> = {
  pm: (g) => g.cohesion,
  interior: (g) => g.security,
  // Economy minister judged on budget health AND debt control.
  economy: (g) => (g.budget + (100 - g.debt)) / 2,
  foreign: (g) => g.diplomacy,
  ecology: (g) => g.ecology,
  defense: (g) => g.security,
};

function competenceDelta(position: MinisterPosition, gauges: Gauges): number {
  const v = PORTFOLIO_GAUGE[position](gauges);
  if (v >= 70) return 1;
  if (v <= 30) return -1;
  return 0;
}

export interface DriftResult {
  gauges: Gauges;
  ministers: Minister[];
  regions: Region[];
  hiddenGauges: HiddenGauges;
}

/**
 * End-of-turn passive drift driven by media, opposition, regional tension,
 * minister competence and hidden meta-gauges. Mutates nothing — returns
 * fresh objects.
 */
export function applyEndOfTurnDrift(
  gauges: Gauges,
  media: number,
  opposition: number,
  ministers: Minister[],
  regions: Region[],
  hidden: HiddenGauges,
): DriftResult {
  const next = { ...gauges };

  if (media < 30) next.popularity = clamp(next.popularity - 2);
  else if (media > 70) next.popularity = clamp(next.popularity + 1);

  if (opposition > 70) next.authority = clamp(next.authority - 2);
  else if (opposition < 30) next.authority = clamp(next.authority + 1);

  const avgRegionalTension =
    regions.reduce((s, r) => s + r.tension, 0) / Math.max(1, regions.length);
  if (avgRegionalTension > 65) {
    next.security = clamp(next.security - 2);
    next.popularity = clamp(next.popularity - 1);
    next.regionalStability = clamp(next.regionalStability - 2);
  } else if (avgRegionalTension < 35) {
    next.regionalStability = clamp(next.regionalStability + 1);
  }

  const avgMinisterCompetence =
    ministers.reduce((s, m) => s + m.competence, 0) /
    Math.max(1, ministers.length);
  if (avgMinisterCompetence < 30) {
    next.economy = clamp(next.economy - 1);
    next.authority = clamp(next.authority - 1);
  }

  // Hidden-gauge driven drift.
  if (hidden.peopleFatigue > 70) {
    next.popularity = clamp(next.popularity - 2);
    next.cohesion = clamp(next.cohesion - 1);
  }
  if (hidden.radicalization > 65) {
    next.security = clamp(next.security - 2);
    next.cohesion = clamp(next.cohesion - 2);
  }
  if (hidden.corruption > 60) {
    next.economy = clamp(next.economy - 1);
    next.authority = clamp(next.authority - 1);
  }
  if (hidden.cyberRisk > 70) {
    next.security = clamp(next.security - 1);
  }
  if (hidden.foreignDependence > 70) {
    next.diplomacy = clamp(next.diplomacy - 1);
    next.authority = clamp(next.authority - 1);
  }
  // Debt is an inverted gauge (high = bad) — high debt drags economy down,
  // and budget pressure pushes debt up.
  if (next.debt > 80) {
    next.economy = clamp(next.economy - 2);
    next.budget = clamp(next.budget - 1);
  }
  if (next.budget < 20) {
    next.debt = clamp(next.debt + 2);
    next.health = clamp(next.health - 1);
  }

  // Module 3 — drift loyauté : un·e ministre TRÈS loyal·e (loyauté >= 70)
  // ne s'érode plus naturellement (pacte solide), tandis qu'un·e
  // ambitieux·se déjà déloyal·e perd 1 par tour. Compétence inchangée.
  // Un·e ministre rallié·e à la fronde (`isRival`) perd 2 loyauté/tour.
  const driftedMinisters = ministers.map((m) => {
    const loyaltyDelta = m.isRival ? -2 : m.loyalty >= 70 ? 0 : -1;
    return {
      ...m,
      loyalty: clamp(m.loyalty + loyaltyDelta),
      competence: clamp(m.competence + competenceDelta(m.position, next)),
    };
  });

  // Region drift: tension keeps its legacy behavior. The 6 v0.3 gauges
  // mean-revert gently toward 50, with tension and security coupled
  // (high tension drags security and socialStability down).
  const driftedRegions = regions.map((r) => {
    const newTension = clamp(r.tension + (r.tension > 50 ? 1 : -1));
    const meanRevert = (v: number, step = 1) =>
      v > 55 ? clamp(v - step) : v < 45 ? clamp(v + step) : v;
    const tensionPressure = newTension > 65 ? -1 : newTension < 30 ? 1 : 0;
    return {
      ...r,
      tension: newTension,
      gauges: {
        economy: meanRevert(r.gauges.economy),
        security: clamp(meanRevert(r.gauges.security) + tensionPressure),
        popularity: meanRevert(r.gauges.popularity),
        ecology: meanRevert(r.gauges.ecology),
        publicHealth: meanRevert(r.gauges.publicHealth),
        socialStability: clamp(
          meanRevert(r.gauges.socialStability) + tensionPressure,
        ),
      },
    };
  });

  // Hidden gauges drift very slowly: opposition power feeds on fatigue,
  // corruption decays slightly without scandal exposure, etc.
  const driftedHidden: HiddenGauges = { ...hidden };
  driftedHidden.oppositionPower = clamp(
    driftedHidden.oppositionPower + (hidden.peopleFatigue > 60 ? 1 : 0),
  );
  driftedHidden.peopleFatigue = clamp(
    driftedHidden.peopleFatigue + (next.popularity < 35 ? 1 : -1),
  );

  return {
    gauges: next,
    ministers: driftedMinisters,
    regions: driftedRegions,
    hiddenGauges: driftedHidden,
  };
}

export interface ScandalRevealResult {
  gauges: Gauges;
  media: number;
  scandalLog?: {
    title: string;
    popularityDamage: number;
    authorityDamage: number;
    mediaDamage: number;
  };
}

/**
 * Reveal a previously-hidden scandal, applying damage to popularity,
 * authority and the media gauge.
 */
export function revealScandal(
  gauges: Gauges,
  media: number,
  scandal: Pick<
    HiddenScandal,
    "title" | "popularityDamage" | "authorityDamage" | "mediaDamage"
  >,
): ScandalRevealResult {
  const next = { ...gauges };
  const popDmg = scandal.popularityDamage;
  const authDmg = scandal.authorityDamage ?? 0;
  const mediaDmg = scandal.mediaDamage ?? 0;
  next.popularity = clamp(next.popularity - popDmg);
  next.authority = clamp(next.authority - authDmg);
  return {
    gauges: next,
    media: clamp(media - mediaDmg),
    scandalLog: {
      title: scandal.title,
      popularityDamage: popDmg,
      authorityDamage: authDmg,
      mediaDamage: mediaDmg,
    },
  };
}
